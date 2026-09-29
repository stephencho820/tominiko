-- Reuse the existing multi-value discovery_tags column for SHOP filtering.
-- Preserve all existing discovery tags while backfilling the five curated SHOP tags.
update public.products set discovery_tags = array_append(discovery_tags, '고소하고 편안한')
where (category = 'comfortable' or 'nutty-comforting' = any(discovery_tags))
  and not ('고소하고 편안한' = any(discovery_tags));

update public.products set discovery_tags = array_append(discovery_tags, '화사하고 산뜻한')
where (category = 'bright' or 'bright-fruity' = any(discovery_tags))
  and not ('화사하고 산뜻한' = any(discovery_tags));

update public.products set discovery_tags = array_append(discovery_tags, '디카페인')
where (category = 'decaf' or product_type = 'decaf' or 'decaf' = any(discovery_tags))
  and not ('디카페인' = any(discovery_tags));

update public.products set discovery_tags = array_append(discovery_tags, '블렌드')
where (category = 'blend' or product_type = 'blend')
  and not ('블렌드' = any(discovery_tags));

update public.products set discovery_tags = array_append(discovery_tags, '특별한 날')
where (category = 'special' or 'something-special' = any(discovery_tags))
  and not ('특별한 날' = any(discovery_tags));
