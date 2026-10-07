create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

select cron.schedule(
  'weekly-active-product-roast-date',
  '0 10 * * 2',
  $$
    update public.products
    set roasted_date = (now() at time zone 'Asia/Seoul')::date,
        updated_at = now()
    where active = true
      and status = 'active';
  $$
);
