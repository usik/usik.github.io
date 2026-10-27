begin;
alter table public.everstory_turns add column visual text not null default 'neutral'
 check (visual in ('neutral','warm','tense','vulnerable','resolute'));
create or replace function public.everstory_finish(p_owner text,p_character text,p_language text,p_request uuid,p_action text,p_scene text,p_choices jsonb,p_summary text,p_state jsonb) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare s everstory_stories; t everstory_turns;
begin
 select * into s from everstory_stories where owner_id=p_owner and character_id=p_character and language=p_language for update;
 if not found or s.lock_id is distinct from p_request or s.lock_until<now() then return jsonb_build_object('error','stale_version'); end if;
 insert into everstory_turns(owner_id,character_id,language,request_id,action,scene,choices,visual,version) values(p_owner,p_character,p_language,p_request,p_action,p_scene,p_choices,coalesce(p_state->>'visual','neutral'),s.version+1) returning * into t;
 update everstory_stories set summary=p_summary,state=p_state,version=s.version+1,lock_id=null,lock_until=null,updated_at=now() where owner_id=p_owner and character_id=p_character and language=p_language;
 return to_jsonb(t);
end $$;
commit;
