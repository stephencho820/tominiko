begin;

-- Server-only payment lifecycle RPCs. These are called exclusively with the
-- service-role client from Next.js API routes.
revoke execute on function public.finalize_paid_order(uuid,text,integer,text,timestamptz) from public, anon, authenticated;
revoke execute on function public.record_payment_failure(uuid,text,text,boolean) from public, anon, authenticated;
revoke execute on function public.record_payment_refund(uuid,text) from public, anon, authenticated;

grant execute on function public.finalize_paid_order(uuid,text,integer,text,timestamptz) to service_role;
grant execute on function public.record_payment_failure(uuid,text,text,boolean) to service_role;
grant execute on function public.record_payment_refund(uuid,text) to service_role;

-- Trigger/helper functions are not public API endpoints.
revoke execute on function public.enforce_size_inventory() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.refresh_product_review_summary() from public, anon, authenticated;
revoke execute on function public.serialize_product_inventory_writes() from public, anon, authenticated;
revoke execute on function public.local_delivery_eligible(text,text,text,text) from public, anon, authenticated;

-- Future functions should not become browser-callable by default.
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon, authenticated;

commit;
