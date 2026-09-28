update public.page_settings
set hero_media = coalesce(hero_media, '{}'::jsonb)
      || jsonb_build_object(
        'mobileUrl', coalesce(hero_media->>'mobileUrl', ''),
        'mobileType', coalesce(hero_media->>'mobileType', 'image')
      ),
    promotions = coalesce((
      select jsonb_agg(item || jsonb_build_object('mobileImage', coalesce(item->>'mobileImage', '')) order by (item->>'sortOrder')::int)
      from jsonb_array_elements(promotions) item
    ), '[]'::jsonb)
where slug = 'home';
