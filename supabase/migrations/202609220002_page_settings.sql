create table if not exists public.page_settings (
  slug text primary key,
  texts jsonb not null default '{}'::jsonb,
  images jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.page_settings enable row level security;
create policy "page settings are public" on public.page_settings for select using (true);
create policy "admins manage page settings" on public.page_settings for all using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public) values ('page-images', 'page-images', true) on conflict (id) do nothing;
create policy "public page images" on storage.objects for select using (bucket_id = 'page-images');
create policy "admins upload page images" on storage.objects for insert with check (bucket_id = 'page-images' and public.is_admin());
create policy "admins update page images" on storage.objects for update using (bucket_id = 'page-images' and public.is_admin());
create policy "admins delete page images" on storage.objects for delete using (bucket_id = 'page-images' and public.is_admin());
