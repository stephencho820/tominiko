update public.page_settings
set hero_media = coalesce(hero_media, '{}'::jsonb) || '{"active":true,"overlay":true}'::jsonb,
    promotions = coalesce((
      select jsonb_agg(item || jsonb_build_object('placement', 'tasting-room'))
      from jsonb_array_elements(promotions) item
      where item->>'placement' is null or item->>'placement' = 'tasting-room'
    ), '[{"id":"default-tasting-room","placement":"tasting-room","image":"/images/tasting-room-banner.svg","hyperlink":"/tasting-room","active":true,"sortOrder":0,"alt":"Casa di Stefano Tasting Room"}]'::jsonb)
    || '[{"id":"default-our-story","placement":"our-story","image":"/images/our-story-banner.svg","hyperlink":"/our-story","active":true,"sortOrder":1,"alt":"The story and philosophy of Casa di Stefano"}]'::jsonb
where slug = 'home'
  and not exists (
    select 1 from jsonb_array_elements(promotions) item
    where item->>'placement' = 'our-story'
  );
