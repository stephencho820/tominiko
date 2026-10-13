-- Casa di Stefano loyalty: logged-in orders only.
-- 2% earned on completed, paid orders, with a single atomic grant per order.
-- Refunds/cancellations reverse previously granted points; balances cannot be negative.
create table if not exists public.loyalty_accounts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 balance integer not null default 0 check (balance >= 0),
 lifetime_earned integer not null default 0 check (lifetime_earned >= 0),
 updated_at timestamptz not null default now()
);
create table if not exists public.loyalty_transactions (
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 order_id uuid references public.orders(id) on delete set null,
 kind text not null check(kind in ('earn','reverse','adjust')),
 points integer not null check(points <> 0),
 note text not null default '',
 created_at timestamptz not null default now()
);
create unique index if not exists loyalty_once_per_order_kind on public.loyalty_transactions(order_id,kind) where order_id is not null and kind in ('earn','reverse');
create index if not exists loyalty_user_history on public.loyalty_transactions(user_id,created_at desc);
alter table public.loyalty_accounts enable row level security;
alter table public.loyalty_transactions enable row level security;
revoke all on public.loyalty_accounts from anon,authenticated;
revoke all on public.loyalty_transactions from anon,authenticated;
grant select on public.loyalty_accounts to authenticated;
grant select on public.loyalty_transactions to authenticated;
drop policy if exists "members see own loyalty balance" on public.loyalty_accounts;
create policy "members see own loyalty balance" on public.loyalty_accounts for select to authenticated using (user_id=auth.uid());
drop policy if exists "members see own loyalty history" on public.loyalty_transactions;
create policy "members see own loyalty history" on public.loyalty_transactions for select to authenticated using (user_id=auth.uid());

create or replace function public.loyalty_sync_order() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_points integer; v_applied integer; v_balance integer;
begin
 if new.user_id is null then return new; end if;
 -- Earn only when the order is paid AND completed. Do not grant on pending or failed payments.
 if new.payment_status='paid' and new.order_status='completed' then
   v_points:=floor(greatest(0,new.total)*0.02)::integer;
   if v_points>0 then
     insert into public.loyalty_accounts(user_id) values(new.user_id) on conflict do nothing;
     insert into public.loyalty_transactions(user_id,order_id,kind,points,note)
       values(new.user_id,new.id,'earn',v_points,'완료 주문 2% 적립')
       on conflict do nothing returning points into v_applied;
     if v_applied is not null then
       update public.loyalty_accounts set balance=balance+v_points,lifetime_earned=lifetime_earned+v_points,updated_at=now()
       where user_id=new.user_id;
     end if;
   end if;
 end if;
 -- A completed order subsequently cancelled/refunded: reverse at most once.
 if new.payment_status in ('refunded','cancelled') or new.order_status='cancelled' then
   select points into v_points from public.loyalty_transactions where order_id=new.id and kind='earn';
   if v_points is not null then
     insert into public.loyalty_accounts(user_id) values(new.user_id) on conflict do nothing;
     select balance into v_balance from public.loyalty_accounts where user_id=new.user_id for update;
     -- If points have already been spent, preserve the balance and record the debt for manual resolution.
     -- Phase 1 has no redemption, so normally balance always covers this reversal.
     if v_balance>=v_points then
       insert into public.loyalty_transactions(user_id,order_id,kind,points,note)
         values(new.user_id,new.id,'reverse',-v_points,'취소·환불 적립 회수')
         on conflict do nothing returning points into v_applied;
       if v_applied is not null then
         update public.loyalty_accounts set balance=balance-v_points,updated_at=now() where user_id=new.user_id;
       end if;
     end if;
   end if;
 end if;
 return new;
end $$;
revoke all on function public.loyalty_sync_order() from public,anon,authenticated;
drop trigger if exists loyalty_order_change on public.orders;
create trigger loyalty_order_change after insert or update of payment_status,order_status on public.orders
for each row execute function public.loyalty_sync_order();
