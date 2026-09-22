-- Sample catalogue for Casa di Stefano.
-- Run after supabase/schema.sql in the Supabase SQL editor.
insert into public.products (
  name, slug, product_type, origin, region, producer, variety, process, roast_level,
  tasting_notes, description, roasted_date, price_150g, price_400g_original,
  price_400g, stock_quantity, active, featured, todays_roast, discovery_tags, display_order
) values
  ('또미 블렌딩', 'tomi-blend', 'blend', 'Brazil / Colombia', 'Minas Gerais / Huila', null, 'Catuai / Castillo', 'Natural / Washed', 'Medium',
   '밀크 초콜릿, 구운 아몬드, 흑설탕', '매일 편하게 마실 수 있도록 단맛과 고소함의 균형을 맞춘 하우스 블렌드입니다.', current_date, 13000, 35000, 29000, 24, true, true, true, array['nutty-comforting','morning-boost','easy-brewing','for-gifting'], 1),
  ('에티오피아 구지', 'ethiopia-guji', 'single-origin', 'Ethiopia', 'Guji', null, 'Heirloom', 'Natural', 'Light',
   '블루베리, 자스민, 홍차', '맑은 질감과 화사한 향, 길게 남는 베리의 단맛이 인상적인 에티오피아입니다.', current_date, 13000, 35000, 29000, 18, true, true, false, array['bright-fruity','something-special','for-gifting'], 2),
  ('케냐 키리냐가', 'kenya-kirinyaga', 'single-origin', 'Kenya', 'Kirinyaga', null, 'SL28 / SL34', 'Washed', 'Light-Medium',
   '블랙커런트, 자몽, 흑설탕', '선명한 산미와 깊은 단맛이 함께 느껴지는 케냐 워시드 커피입니다.', current_date, 13000, 35000, 29000, 15, true, false, false, array['bright-fruity','morning-boost'], 3),
  ('콜롬비아 핑크 버번', 'colombia-pink-bourbon', 'single-origin', 'Colombia', 'Huila', null, 'Pink Bourbon', 'Washed', 'Light',
   '복숭아, 캐러멜, 라임', '부드러운 과일 향과 깨끗한 피니시를 가진 섬세한 싱글 오리진입니다.', current_date, 13000, 35000, 29000, 12, true, false, false, array['bright-fruity','something-special'], 4),
  ('콜롬비아 디카페인', 'colombia-decaf', 'decaf', 'Colombia', 'Huila', null, 'Castillo', 'Sugar Cane', 'Medium',
   '다크 초콜릿, 캐러멜, 오렌지', '카페인 부담 없이 단정한 단맛을 즐길 수 있는 디카페인 커피입니다.', current_date, 13000, 35000, 29000, 16, true, false, false, array['decaf','nutty-comforting','easy-brewing'], 5),
  ('드립백 셀렉션', 'drip-bag-selection', 'blend', 'Casa Selection', null, null, null, 'Medium',
   '초콜릿, 아몬드, 캐러멜', '도구 없이 한 잔씩 간편하게 내리는 드립백 셀렉션입니다.', current_date, 13000, 35000, 29000, 20, true, false, false, array['easy-brewing','for-gifting'], 6)
on conflict (slug) do update set
  name = excluded.name,
  product_type = excluded.product_type,
  price_150g = excluded.price_150g,
  price_400g_original = excluded.price_400g_original,
  price_400g = excluded.price_400g,
  stock_quantity = excluded.stock_quantity,
  active = excluded.active,
  featured = excluded.featured,
  todays_roast = excluded.todays_roast,
  discovery_tags = excluded.discovery_tags,
  display_order = excluded.display_order,
  updated_at = now();
