begin;
create table public.everstory_stories (
 owner_id text not null, character_id text not null, language text not null,
 consent_version text not null default '2026-10-27', summary text not null default '', state jsonb not null default '{}',
 version integer not null default 0, lock_id uuid, lock_until timestamptz,
 updated_at timestamptz not null default now(), primary key(owner_id,character_id,language)
);
create index everstory_stories_retention on public.everstory_stories(updated_at);
create table public.everstory_turns (
 owner_id text not null, character_id text not null, language text not null,
 request_id uuid not null, action text not null, scene text not null,
 choices jsonb not null, version integer not null, created_at timestamptz not null default now(),
 primary key(owner_id,request_id),
 foreign key(owner_id,character_id,language) references public.everstory_stories on delete cascade
);
create index everstory_turns_history on public.everstory_turns(owner_id,character_id,language,version desc);
create table public.everstory_limits (key text primary key, used integer not null, expires_at timestamptz not null);
create table public.everstory_waitlist (
 email text primary key check(email=lower(email) and length(email)<=254),
 language text not null, consent_version text not null, created_at timestamptz not null default now()
);
grant select,insert,update,delete on public.everstory_stories,public.everstory_turns,public.everstory_limits,public.everstory_waitlist to service_role;
alter table public.everstory_stories enable row level security;
alter table public.everstory_turns enable row level security;
alter table public.everstory_limits enable row level security;
alter table public.everstory_waitlist enable row level security;
revoke all on public.everstory_stories,public.everstory_turns,public.everstory_limits,public.everstory_waitlist from anon,authenticated;

-- Server-only atomic counter. Failed upstream calls count as attempts.
create function public.everstory_limit(p_key text,p_max integer,p_seconds integer) returns boolean
language plpgsql security invoker set search_path=public as $$
declare n integer;
begin
 insert into everstory_limits(key,used,expires_at) values(p_key,1,now()+make_interval(secs=>p_seconds))
 on conflict(key) do update set used=case when everstory_limits.expires_at<=now() then 1 else everstory_limits.used+1 end,
 expires_at=case when everstory_limits.expires_at<=now() then now()+make_interval(secs=>p_seconds) else everstory_limits.expires_at end
 returning used into n;
 return n<=p_max;
end $$;
create function public.everstory_begin(p_owner text,p_character text,p_language text,p_request uuid,p_action text,p_ip text,p_version integer) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare s everstory_stories; t everstory_turns;
begin
 -- Bound retention at every active request. For inactive data, schedule cleanup below.
 delete from everstory_stories where updated_at<now()-interval '90 days';
 delete from everstory_limits where expires_at<now()-interval '1 day';
 insert into everstory_stories(owner_id,character_id,language) values(p_owner,p_character,p_language) on conflict do nothing;
 select * into s from everstory_stories where owner_id=p_owner and character_id=p_character and language=p_language for update;
 select * into t from everstory_turns where owner_id=p_owner and request_id=p_request;
 if found then
   if t.character_id<>p_character or t.language<>p_language or t.action<>p_action then return jsonb_build_object('error','request_conflict'); end if;
   return jsonb_build_object('cached',to_jsonb(t));
 end if;
 if s.version<>p_version then return jsonb_build_object('error','stale_version'); end if;
 if s.lock_until>now() then return jsonb_build_object('error','story_busy'); end if;
 if not everstory_limit('story:user:minute:'||p_owner,6,60) or not everstory_limit('story:user:day:'||p_owner,30,86400)
 or not everstory_limit('story:ip:day:'||p_ip,60,86400) or not everstory_limit('story:global:day',500,86400) then
 return jsonb_build_object('error','rate_limited'); end if;
 update everstory_stories set lock_id=p_request,lock_until=now()+interval '90 seconds' where owner_id=p_owner and character_id=p_character and language=p_language;
 return jsonb_build_object('story',to_jsonb(s),'recent',(select coalesce(jsonb_agg(x order by x.version),'[]'::jsonb) from (select action,scene,version from everstory_turns where owner_id=p_owner and character_id=p_character and language=p_language order by version desc limit 12)x));
end $$;
create function public.everstory_finish(p_owner text,p_character text,p_language text,p_request uuid,p_action text,p_scene text,p_choices jsonb,p_summary text,p_state jsonb) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare s everstory_stories; t everstory_turns;
begin
 select * into s from everstory_stories where owner_id=p_owner and character_id=p_character and language=p_language for update;
 if not found or s.lock_id is distinct from p_request or s.lock_until<now() then return jsonb_build_object('error','stale_version'); end if;
 insert into everstory_turns(owner_id,character_id,language,request_id,action,scene,choices,version) values(p_owner,p_character,p_language,p_request,p_action,p_scene,p_choices,s.version+1) returning * into t;
 update everstory_stories set summary=p_summary,state=p_state,version=s.version+1,lock_id=null,lock_until=null,updated_at=now() where owner_id=p_owner and character_id=p_character and language=p_language;
 return to_jsonb(t);
end $$;
create function public.everstory_unlock(p_owner text,p_request uuid) returns void
language sql security invoker set search_path=public as $$update everstory_stories set lock_id=null,lock_until=null where owner_id=p_owner and lock_id=p_request$$;
revoke all on function public.everstory_limit(text,integer,integer),public.everstory_begin(text,text,text,uuid,text,text,integer),public.everstory_finish(text,text,text,uuid,text,text,jsonb,text,jsonb),public.everstory_unlock(text,uuid) from public,anon,authenticated;
grant execute on function public.everstory_limit(text,integer,integer),public.everstory_begin(text,text,text,uuid,text,text,integer),public.everstory_finish(text,text,text,uuid,text,text,jsonb,text,jsonb),public.everstory_unlock(text,uuid) to service_role;
-- Schedule with Supabase cron after enabling pg_cron. Do not silently enable an extension.
-- select cron.schedule('everstory-retention','17 3 * * *', $cron$
-- delete from public.everstory_stories where updated_at<now()-interval '90 days';
-- delete from public.everstory_waitlist where created_at<now()-interval '1 year';
-- delete from public.everstory_limits where expires_at<now()-interval '1 day';
-- $cron$);
commit;
