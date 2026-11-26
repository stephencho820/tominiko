create table public.text_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 150),
  summary text not null check (char_length(btrim(summary)) between 1 and 240),
  body text not null check (char_length(btrim(body)) between 1 and 50000),
  published_at timestamptz,
  updated_at timestamptz not null default now()
);

create index text_posts_published_idx on public.text_posts (published_at desc, id)
  where published_at is not null;

alter table public.text_posts enable row level security;

grant select on public.text_posts to anon, authenticated;
grant insert, update on public.text_posts to authenticated;

create policy "Anyone can read published texts" on public.text_posts
  for select to anon, authenticated using (published_at is not null);

create policy "Admins can read drafts" on public.text_posts
  for select to authenticated using ((select private.is_admin()));

create policy "Admins can create texts" on public.text_posts
  for insert to authenticated with check ((select private.is_admin()));

create policy "Admins can update texts" on public.text_posts
  for update to authenticated using ((select private.is_admin()))
  with check ((select private.is_admin()));
