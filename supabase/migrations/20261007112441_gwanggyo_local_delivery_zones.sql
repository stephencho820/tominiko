insert into public.local_delivery_zones (name, zone_type, zone_value, enabled)
values
  ('광교 · 이의동','district','이의동',true),
  ('광교 · 하동','district','하동',true),
  ('광교 · 원천동','district','원천동',true),
  ('광교 · 상현동','district','상현동',true),
  ('서광교 · 연무동','district','연무동',true),
  ('서광교 · 우만동','district','우만동',true),
  ('광교 · 웰빙타운로','address_keyword','웰빙타운로',true),
  ('광교 · 센트럴타운로','address_keyword','센트럴타운로',true),
  ('광교 · 센트럴파크로','address_keyword','센트럴파크로',true),
  ('광교 · 에듀타운로','address_keyword','에듀타운로',true),
  ('광교 · 광교중앙로','address_keyword','광교중앙로',true),
  ('광교 · 도청로','address_keyword','도청로',true),
  ('광교 · 법조로','address_keyword','법조로',true),
  ('광교 · 광교산로','address_keyword','광교산로',true),
  ('광교 · 광교로','address_keyword','광교로',true)
on conflict (zone_type, zone_value)
do update set enabled=true, name=excluded.name;
