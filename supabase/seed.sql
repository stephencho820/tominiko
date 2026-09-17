-- Sample catalogue for Casa di Stefano.
-- Run after supabase/schema.sql in the Supabase SQL editor.
insert into public.products (
  name, slug, origin, region, producer, variety, process, roast_level,
  tasting_notes, description, roasted_date, price_150g, price_150g_original,
  price_300g, stock_quantity, active, featured, todays_roast, display_order
) values
  ('또미 블랜딩', 'tomi-blend', 'Brazil / Colombia', 'Minas Gerais / Huila', null, 'Catuai / Castillo', 'Natural / Washed', 'Medium',
   '밀크 초콜릿, 구운 아몬드, 흑설탕', '매일 편하게 마실 수 있도록 단맛과 고소함의 균형을 맞춘 하우스 블렌드입니다.', current_date, 13000, 20000, 24000, 24, true, true, true, 1),
  ('에티오피아 구지', 'ethiopia-guji', 'Ethiopia', 'Guji', null, 'Heirloom', 'Natural', 'Light',
   '블루베리, 자스민, 홍차', '맑은 질감과 화사한 향, 길게 남는 베리의 단맛이 인상적인 에티오피아입니다.', current_date, 13000, 20000, 24000, 18, true, true, false, 2),
  ('케냐 키리냐가', 'kenya-kirinyaga', 'Kenya', 'Kirinyaga', null, 'SL28 / SL34', 'Washed', 'Light-Medium',
   '블랙커런트, 자몽, 흑설탕', '선명한 산미와 깊은 단맛이 함께 느껴지는 케냐 워시드 커피입니다.', current_date, 13000, 20000, 24000, 15, true, false, false, 3),
  ('콜롬비아 핑크 버번', 'colombia-pink-bourbon', 'Colombia', 'Huila', null, 'Pink Bourbon', 'Washed', 'Light',
   '복숭아, 캐러멜, 라임', '부드러운 과일 향과 깨끗한 피니시를 가진 섬세한 싱글 오리진입니다.', current_date, 13000, 20000, 24000, 12, true, false, false, 4)
on conflict (slug) do update set
  name = excluded.name,
  price_150g = excluded.price_150g,
  price_150g_original = excluded.price_150g_original,
  price_300g = excluded.price_300g,
  stock_quantity = excluded.stock_quantity,
  active = excluded.active,
  featured = excluded.featured,
  todays_roast = excluded.todays_roast,
  display_order = excluded.display_order,
  updated_at = now();
