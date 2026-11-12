-- Five-tier CASA membership. Existing VIP/PRIVATE assignments become Gold.
-- Legacy values stay valid temporarily for backwards-compatible rolling deployments.
ALTER TABLE public.vip_customers
  DROP CONSTRAINT IF EXISTS vip_customers_tier_check;

ALTER TABLE public.vip_customers
  ADD CONSTRAINT vip_customers_tier_check
  CHECK (tier IN ('vip', 'private', 'bronze', 'silver', 'gold', 'zero_black'));

UPDATE public.vip_customers
SET tier = 'gold'
WHERE tier IN ('vip', 'private');
