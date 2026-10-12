begin;
update public.products
set sales_channels = array['online','tasting_room']::text[]
where status in ('active','sold-out') and not ('tasting_room'=any(sales_channels));
commit;
