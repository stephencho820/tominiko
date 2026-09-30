-- Admin-managed road/jibun address keywords for exceptional local-delivery areas.
-- This is intentionally configuration-driven; no neighbourhood name is hard-coded.
alter table public.local_delivery_zones drop constraint if exists local_delivery_zones_zone_type_check;
alter table public.local_delivery_zones add constraint local_delivery_zones_zone_type_check
  check(zone_type in ('postal_prefix','postal_range','district','address_keyword'));

create or replace function public.local_delivery_eligible(p_zonecode text,p_bname text,p_road text,p_jibun text) returns boolean
language sql stable security definer set search_path=public as $$
 select coalesce((select local_delivery_enabled from delivery_settings where id=true),true) and exists(
 select 1 from local_delivery_zones z where z.enabled and (
  (z.zone_type='postal_prefix' and regexp_replace(coalesce(p_zonecode,''),'\D','','g') like regexp_replace(z.zone_value,'\D','','g')||'%') or
  (z.zone_type='postal_range' and regexp_replace(coalesce(p_zonecode,''),'\D','','g')::integer between split_part(z.zone_value,'-',1)::integer and split_part(z.zone_value,'-',2)::integer) or
  (z.zone_type='district' and z.zone_value=p_bname) or
  (z.zone_type='address_keyword' and char_length(trim(z.zone_value))>=2 and
    (strpos(lower(regexp_replace(coalesce(p_road,''),'\s+',' ','g')),lower(regexp_replace(trim(z.zone_value),'\s+',' ','g')))>0 or
     strpos(lower(regexp_replace(coalesce(p_jibun,''),'\s+',' ','g')),lower(regexp_replace(trim(z.zone_value),'\s+',' ','g')))>0))
 )); $$;
