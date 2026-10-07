begin;

-- Orders are created only by the Next.js server route using the service-role
-- client. Browsers must not be able to invoke this SECURITY DEFINER RPC.
revoke execute on function public.create_pending_order(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,jsonb)
  from public, anon, authenticated;
grant execute on function public.create_pending_order(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,jsonb)
  to service_role;

commit;
