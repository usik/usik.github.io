begin;
create table public.everstory_visits (
 day date not null, visitor_hash text not null check(length(visitor_hash)=64),
 path text not null check(length(path)<=100), event text not null check(event in ('pageview','character_select')),
 source text not null default 'direct' check(length(source)<=40), referrer_host text not null default '' check(length(referrer_host)<=120),
 is_operator boolean not null default false, pageviews integer not null default 1 check(pageviews>0),
 first_seen timestamptz not null default now(), last_seen timestamptz not null default now(),
 primary key(day,visitor_hash,path,event)
);
alter table public.everstory_visits enable row level security;
revoke all on public.everstory_visits from public,anon,authenticated;
grant select,insert,update,delete on public.everstory_visits to service_role;
create or replace function public.everstory_visit(p_day date,p_visitor text,p_path text,p_event text,p_source text,p_referrer text,p_operator boolean) returns boolean
language plpgsql security invoker set search_path=public as $$
declare operator_visit boolean;
begin
 operator_visit := p_operator or exists(select 1 from everstory_visits where day=p_day and visitor_hash=p_visitor and is_operator);
 insert into everstory_visits(day,visitor_hash,path,event,source,referrer_host,is_operator)
 values(p_day,p_visitor,p_path,p_event,p_source,p_referrer,operator_visit)
 on conflict(day,visitor_hash,path,event) do update set pageviews=least(everstory_visits.pageviews+1,1000),last_seen=now(),is_operator=everstory_visits.is_operator or excluded.is_operator;
 -- Reclassify this day's earlier anonymous views when the operator signs in.
 if p_operator then update everstory_visits set is_operator=true where day=p_day and visitor_hash=p_visitor; end if;
 return true;
end $$;
revoke all on function public.everstory_visit(date,text,text,text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.everstory_visit(date,text,text,text,text,text,boolean) to service_role;
commit;
