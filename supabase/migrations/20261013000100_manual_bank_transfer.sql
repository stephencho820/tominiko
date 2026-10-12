begin;
create table if not exists public.manual_transfer_settings (
 id boolean primary key default true check(id),
 bank_name text not null,
 account_number text not null,
 account_holder text not null
);
alter table public.manual_transfer_settings enable row level security;
revoke all on public.manual_transfer_settings from anon,authenticated;
grant select on public.manual_transfer_settings to service_role;
create or replace function public.confirm_manual_transfer(p_order_id uuid)
returns text language plpgsql security definer set search_path=public as $$
declare o public.orders%rowtype; v_result text;
begin
 if not private.is_admin() then raise exception 'forbidden'; end if;
 select * into o from public.orders where id=p_order_id for update;
 if not found then return 'not_found'; end if;
 if o.payment_method <> 'BANK_TRANSFER' then return 'invalid_method'; end if;
 if o.payment_status='paid' then return 'already_paid'; end if;
 if o.payment_status<>'pending' or o.order_status='cancelled' then return 'invalid_status'; end if;
 if o.order_source='tasting_room' then
   v_result:=public.finalize_tasting_room_order(o.id,'manual-transfer:'||o.id::text,o.total,'BANK_TRANSFER',now());
 else
   v_result:=public.finalize_paid_order(o.id,'manual-transfer:'||o.id::text,o.total,'BANK_TRANSFER',now());
 end if;
 return v_result;
end $$;
revoke all on function public.confirm_manual_transfer(uuid) from public,anon,authenticated;
grant execute on function public.confirm_manual_transfer(uuid) to authenticated;
commit;