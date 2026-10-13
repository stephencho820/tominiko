create table if not exists public.loyalty_memberships (
 user_id uuid primary key references auth.users(id) on delete cascade,
 tier text not null default 'standard' check (tier in ('standard','vip')),
 assigned_at timestamptz,
 assigned_by uuid
);
alter table public.loyalty_memberships enable row level security;
revoke all on public.loyalty_memberships from anon,authenticated;
grant select on public.loyalty_memberships to authenticated;
create policy "own membership" on public.loyalty_memberships for select to authenticated using (user_id=auth.uid());
create or replace function public.admin_set_loyalty_tier(p_user_id uuid,p_tier text)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then raise exception 'Forbidden'; end if;
 if p_tier not in ('standard','vip') then raise exception 'Invalid tier'; end if;
 insert into public.loyalty_memberships(user_id,tier,assigned_at,assigned_by) values(p_user_id,p_tier,now(),auth.uid())
 on conflict(user_id) do update set tier=excluded.tier,assigned_at=excluded.assigned_at,assigned_by=excluded.assigned_by;
end $$;
revoke all on function public.admin_set_loyalty_tier(uuid,text) from public,anon;
grant execute on function public.admin_set_loyalty_tier(uuid,text) to authenticated;
create or replace function public.admin_adjust_loyalty_points(p_user_id uuid,p_points integer,p_reason text)
returns void language plpgsql security definer set search_path=public as $$
declare v_balance integer;
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then raise exception 'Forbidden'; end if;
 if p_points is null or p_points=0 or abs(p_points)>100000 or length(trim(coalesce(p_reason,'')))<5 then raise exception 'Invalid adjustment'; end if;
 insert into public.loyalty_accounts(user_id) values(p_user_id) on conflict do nothing;
 select balance into v_balance from public.loyalty_accounts where user_id=p_user_id for update;
 if v_balance+p_points<0 then raise exception 'Insufficient points'; end if;
 insert into public.loyalty_transactions(user_id,kind,points,note) values(p_user_id,'adjust',p_points,left(trim(p_reason),200));
 update public.loyalty_accounts set balance=balance+p_points,lifetime_earned=lifetime_earned+greatest(p_points,0),updated_at=now() where user_id=p_user_id;
end $$;
revoke all on function public.admin_adjust_loyalty_points(uuid,integer,text) from public,anon;
grant execute on function public.admin_adjust_loyalty_points(uuid,integer,text) to authenticated;
