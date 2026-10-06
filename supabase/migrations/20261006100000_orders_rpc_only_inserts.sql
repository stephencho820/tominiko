begin;

-- Orders must be priced and validated through the SECURITY DEFINER checkout RPC.
-- Keep existing SELECT policies and the admin UPDATE policy unchanged.
drop policy if exists "guests and users create orders" on public.orders;
drop policy if exists "order creators add items" on public.order_items;

-- Defense in depth: deny direct REST inserts even if another INSERT policy appears.
revoke insert on table public.orders, public.order_items from public, anon, authenticated;

-- The function owner retains table access; callers need only EXECUTE.
grant execute on function public.create_pending_order(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,jsonb) to anon, authenticated;

-- Payment service-role RPC permissions are intentionally unchanged.
commit;
