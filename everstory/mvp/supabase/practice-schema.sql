-- Additive schema: practice never changes the keys or rows of existing stories.
begin;
create table public.everstory_practice_stories (
 owner_id text not null, language text not null check(language in ('en','ko')),
 support_language text not null check(support_language in ('en','ko') and support_language<>language),
 level text not null default 'easy' check(level in ('easy','standard')),
 settings_version integer not null default 0,
 summary text not null default '', state jsonb not null default '{}', version integer not null default 0,
 lock_id uuid, lock_until timestamptz, updated_at timestamptz not null default now(),
 primary key(owner_id,language)
);
create index everstory_practice_retention on public.everstory_practice_stories(updated_at);
create table public.everstory_practice_turns (
 owner_id text not null, language text not null, request_id uuid not null,
 action text not null, scene text not null, choices jsonb not null, visual text not null,
 level text not null, settings_version integer not null, version integer not null,
 created_at timestamptz not null default now(), primary key(owner_id,request_id),
 unique(owner_id,language,version),
 foreign key(owner_id,language) references public.everstory_practice_stories on delete cascade
);
create table public.everstory_practice_help (
 owner_id text not null, language text not null, cache_key text not null, fingerprint text not null,
 result jsonb, lock_id uuid, lock_until timestamptz, expires_at timestamptz not null,
 primary key(owner_id,cache_key), foreign key(owner_id,language) references public.everstory_practice_stories on delete cascade
);
create index everstory_practice_help_retention on public.everstory_practice_help(expires_at);
alter table public.everstory_practice_stories enable row level security;
alter table public.everstory_practice_turns enable row level security;
alter table public.everstory_practice_help enable row level security;
revoke all on public.everstory_practice_stories,public.everstory_practice_turns,public.everstory_practice_help from public,anon,authenticated;
grant select,insert,update,delete on public.everstory_practice_stories,public.everstory_practice_turns,public.everstory_practice_help to service_role;

create function public.everstory_practice_settings(p_owner text,p_language text,p_level text,p_version integer,p_settings integer) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare s everstory_practice_stories;
begin
 if p_language not in ('en','ko') or p_level not in ('easy','standard') then return jsonb_build_object('error','invalid_submission'); end if;
 insert into everstory_practice_stories(owner_id,language,support_language) values(p_owner,p_language,case p_language when 'en' then 'ko' else 'en' end) on conflict do nothing;
 select * into s from everstory_practice_stories where owner_id=p_owner and language=p_language for update;
 if s.lock_until>now() then return jsonb_build_object('error','story_busy'); end if;
 if s.version<>p_version or s.settings_version<>p_settings then return jsonb_build_object('error','stale_version'); end if;
 update everstory_practice_stories set level=p_level,settings_version=settings_version+1,updated_at=now() where owner_id=p_owner and language=p_language returning * into s;
 return jsonb_build_object('story',to_jsonb(s));
end $$;

create function public.everstory_practice_begin(p_owner text,p_language text,p_request uuid,p_action text,p_ip text,p_version integer,p_settings integer) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare s everstory_practice_stories; t everstory_practice_turns;
begin
 delete from everstory_practice_stories where updated_at<now()-interval '90 days';
 select * into s from everstory_practice_stories where owner_id=p_owner and language=p_language for update;
 if not found then return jsonb_build_object('error','settings_required'); end if;
 select * into t from everstory_practice_turns where owner_id=p_owner and request_id=p_request;
 if found then
  if t.language<>p_language or t.action<>p_action or t.settings_version<>p_settings then return jsonb_build_object('error','request_conflict'); end if;
  return jsonb_build_object('cached',to_jsonb(t));
 end if;
 if s.version<>p_version or s.settings_version<>p_settings then return jsonb_build_object('error','stale_version'); end if;
 if s.lock_until>now() then return jsonb_build_object('error','story_busy'); end if;
 if not everstory_limit('story:user:minute:'||p_owner,6,60) or not everstory_limit('story:user:day:'||p_owner,30,86400)
 or not everstory_limit('story:ip:day:'||p_ip,60,86400) or not everstory_limit('story:global:day',500,86400) then return jsonb_build_object('error','rate_limited'); end if;
 update everstory_practice_stories set lock_id=p_request,lock_until=now()+interval '90 seconds' where owner_id=p_owner and language=p_language;
 return jsonb_build_object('story',to_jsonb(s),'recent',(select coalesce(jsonb_agg(x order by x.version),'[]'::jsonb) from (select action,scene,version from everstory_practice_turns where owner_id=p_owner and language=p_language order by version desc limit 12)x));
end $$;

create function public.everstory_practice_finish(p_owner text,p_language text,p_request uuid,p_action text,p_scene text,p_choices jsonb,p_summary text,p_state jsonb) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare s everstory_practice_stories; t everstory_practice_turns;
begin
 select * into s from everstory_practice_stories where owner_id=p_owner and language=p_language for update;
 if not found or s.lock_id is distinct from p_request or s.lock_until<now() then return jsonb_build_object('error','stale_version'); end if;
 insert into everstory_practice_turns(owner_id,language,request_id,action,scene,choices,visual,level,settings_version,version)
 values(p_owner,p_language,p_request,p_action,p_scene,p_choices,p_state->>'visual',s.level,s.settings_version,s.version+1) returning * into t;
 update everstory_practice_stories set summary=p_summary,state=p_state,version=s.version+1,lock_id=null,lock_until=null,updated_at=now() where owner_id=p_owner and language=p_language;
 return to_jsonb(t);
end $$;

create function public.everstory_practice_unlock(p_owner text,p_request uuid) returns void
language sql security invoker set search_path=public as $$update everstory_practice_stories set lock_id=null,lock_until=null where owner_id=p_owner and lock_id=p_request$$;

create function public.everstory_help_begin(p_owner text,p_language text,p_key text,p_fingerprint text,p_request uuid,p_ip text,p_seconds integer) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare h everstory_practice_help;
begin
 delete from everstory_practice_help where expires_at<now();
 insert into everstory_practice_help(owner_id,language,cache_key,fingerprint,expires_at)
 values(p_owner,p_language,p_key,p_fingerprint,now()+make_interval(secs=>p_seconds)) on conflict do nothing;
 select * into h from everstory_practice_help where owner_id=p_owner and cache_key=p_key for update;
 if h.fingerprint<>p_fingerprint or h.language<>p_language then return jsonb_build_object('error','request_conflict'); end if;
 if h.result is not null then return jsonb_build_object('cached',h.result); end if;
 if h.lock_until>now() then return jsonb_build_object('error','story_busy'); end if;
 if not everstory_limit('story:user:minute:'||p_owner,6,60) or not everstory_limit('story:user:day:'||p_owner,30,86400)
 or not everstory_limit('story:ip:day:'||p_ip,60,86400) or not everstory_limit('story:global:day',500,86400) then return jsonb_build_object('error','rate_limited'); end if;
 update everstory_practice_help set lock_id=p_request,lock_until=now()+interval '90 seconds' where owner_id=p_owner and cache_key=p_key;
 return jsonb_build_object('ok',true);
end $$;
create function public.everstory_help_finish(p_owner text,p_key text,p_request uuid,p_result jsonb) returns jsonb
language plpgsql security invoker set search_path=public as $$
begin
 update everstory_practice_help set result=p_result,lock_id=null,lock_until=null where owner_id=p_owner and cache_key=p_key and lock_id=p_request and lock_until>now() and expires_at>now();
 if not found then return jsonb_build_object('error','stale_version'); end if;
 return jsonb_build_object('result',p_result);
end $$;
create function public.everstory_help_unlock(p_owner text,p_key text,p_request uuid) returns void
language sql security invoker set search_path=public as $$update everstory_practice_help set lock_id=null,lock_until=null where owner_id=p_owner and cache_key=p_key and lock_id=p_request$$;

revoke all on function public.everstory_practice_settings(text,text,text,integer,integer),public.everstory_practice_begin(text,text,uuid,text,text,integer,integer),public.everstory_practice_finish(text,text,uuid,text,text,jsonb,text,jsonb),public.everstory_practice_unlock(text,uuid),public.everstory_help_begin(text,text,text,text,uuid,text,integer),public.everstory_help_finish(text,text,uuid,jsonb),public.everstory_help_unlock(text,text,uuid) from public,anon,authenticated;
grant execute on function public.everstory_practice_settings(text,text,text,integer,integer),public.everstory_practice_begin(text,text,uuid,text,text,integer,integer),public.everstory_practice_finish(text,text,uuid,text,text,jsonb,text,jsonb),public.everstory_practice_unlock(text,uuid),public.everstory_help_begin(text,text,text,text,uuid,text,integer),public.everstory_help_finish(text,text,uuid,jsonb),public.everstory_help_unlock(text,text,uuid) to service_role;
commit;

-- After applying this additive schema, extend the existing daily cleanup (already enabled).
-- select cron.alter_job(job_id := (select jobid from cron.job where jobname='everstory-retention'),
-- command := 'delete from public.everstory_stories where updated_at < now()-interval ''90 days''; delete from public.everstory_waitlist where created_at < now()-interval ''1 year''; delete from public.everstory_limits where expires_at < now()-interval ''1 day''; delete from public.everstory_practice_stories where updated_at < now()-interval ''90 days''; delete from public.everstory_practice_help where expires_at < now();');
