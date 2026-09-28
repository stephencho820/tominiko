alter table public.page_settings add column if not exists hero_media jsonb;
alter table public.page_settings add column if not exists promotions jsonb not null default '[]'::jsonb;

update public.page_settings
set hero_media = '{"url":"/images/home-hero.svg","type":"image","active":true,"overlay":true}'::jsonb,
    promotions = '[{"id":"default-tasting-room","placement":"tasting-room","image":"/images/tasting-room-banner.svg","hyperlink":"/tasting-room","active":true,"sortOrder":0,"alt":"Casa di Stefano Tasting Room"},{"id":"default-our-story","placement":"our-story","image":"/images/our-story-banner.svg","hyperlink":"/our-story","active":true,"sortOrder":1,"alt":"The story and philosophy of Casa di Stefano"}]'::jsonb
where slug = 'home' and hero_media is null;
