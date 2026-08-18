-- ============================================================================
-- Pinturitas · 05 · Datos base: planes, paleta y los 33 mundos
-- Ejecutar DESPUÉS de 04_rls_policies.sql
-- Es idempotente: se puede volver a ejecutar sin duplicar.
-- ============================================================================

-- ---------- planes (los dos activos dan acceso completo; cambia la facturación)
insert into public.plans (code, name, price_usd, billing_interval, months, is_best_value, sort_order, is_active) values
  ('basico','Mensual',4.99,'mensual',1,false,1,true),
  ('premium','Anual',29.99,'anual',12,true,2,true),
  ('pro','Pro Semestral',9.00,'semestral',6,false,2,false)
on conflict (code) do update set
  name = excluded.name, price_usd = excluded.price_usd,
  billing_interval = excluded.billing_interval, months = excluded.months,
  is_best_value = excluded.is_best_value, sort_order = excluded.sort_order,
  is_active = excluded.is_active;

-- ---------- paleta: 24 colores con nombre y pronunciación ----------
delete from public.palette_colors;
insert into public.palette_colors (hex, name_es, name_en, phonetic_es, sort_order) values
  ('#E63946','rojo','Red','red',1),
  ('#F97316','naranja','Orange','Ó-ranch',2),
  ('#FCD34D','amarillo','Yellow','YÉ-lou',3),
  ('#EAB308','dorado','Gold','góuld',4),
  ('#22C55E','verde','Green','griin',5),
  ('#166534','verde oscuro','Dark Green','dark griin',6),
  ('#A3E635','verde limón','Lime','láim',7),
  ('#14B8A6','turquesa','Turquoise','TÉR-koiz',8),
  ('#38BDF8','celeste','Light Blue','láit blu',9),
  ('#2563EB','azul','Blue','blu',10),
  ('#1E3A8A','azul marino','Navy','NÉI-vi',11),
  ('#7C3AED','morado','Purple','PÉR-pol',12),
  ('#C084FC','violeta','Violet','VÁI-o-let',13),
  ('#F472B6','rosado','Pink','pink',14),
  ('#DB2777','fucsia','Magenta','ma-LLÉN-ta',15),
  ('#92531F','café','Brown','braun',16),
  ('#FFD9B3','piel clara','Peach','piich',17),
  ('#E0A16E','piel','Tan','tan',18),
  ('#8D5524','piel morena','Sienna','si-É-na',19),
  ('#EAD9B0','beige','Beige','beish',20),
  ('#111111','negro','Black','blak',21),
  ('#6B7280','gris oscuro','Dark Grey','dark grei',22),
  ('#CBD5E1','gris','Grey','grei',23),
  ('#FFFFFF','blanco','White','wáit',24);

-- ---------- los 33 mundos ----------
insert into public.worlds (slug, name_es, name_en, sort_order, cover_image_path, color_hex, is_free) values
  ('pets','Mis Mascotas','Pets',1,'covers/pets.png','#FF7A3D',false),
  ('farm','La Granja','Farm Animals',2,'covers/farm.png','#FFC43D',false),
  ('wild','Animales Salvajes','Wild Animals',3,'covers/wild.png','#17B8B0',false),
  ('forest','El Bosque','Forest Animals',4,'covers/forest.png','#43AA8B',false),
  ('ocean','El Océano','Ocean Animals',5,'covers/ocean.png','#1D4ED8',false),
  ('flying','Los que Vuelan','Animals That Fly',6,'covers/flying.png','#7C3AED',false),
  ('bugs','Bichitos','Bugs & Small Creatures',7,'covers/bugs.png','#E63946',false),
  ('dinosaurs','Dinosaurios','Dinosaurs',8,'covers/dinosaurs.png','#6BAE5A',false),
  ('vehicles','Vehículos','Vehicles',9,'covers/vehicles.png','#3B82F6',false),
  ('space','El Espacio','Space',10,'covers/space.png','#4C3A8C',false),
  ('princesses-castle','Princesas y Castillos','Princesses & Castles',11,'covers/princesses-castle.png','#E86AA6',false),
  ('food','Comida Rica','Yummy Food',12,'covers/food.png','#F2842B',false),
  ('fruits','Frutas','Fruits',13,'covers/fruits.png','#DC2626',false),
  ('vegetables','Verduras','Vegetables',14,'covers/vegetables.png','#16A34A',false),
  ('sports','Deportes','Sports',15,'covers/sports.png','#17B8B0',false),
  ('jobs','Profesiones','Jobs',16,'covers/jobs.png','#E2453C',false),
  ('instruments','Instrumentos','Instruments',17,'covers/instruments.png','#B45309',false),
  ('beach','La Playa','The Beach',18,'covers/beach.png','#38BDF8',false),
  ('holidays','Fiestas','Holidays',19,'covers/holidays.png','#DC2626',false),
  ('family','La Familia','Family',20,'covers/family.png','#EC4899',false),
  ('body','El Cuerpo','The Body',21,'covers/body.png','#F97316',false),
  ('clothes','La Ropa','Clothes',22,'covers/clothes.png','#2563EB',false),
  ('colors','Colores','Colors',23,'covers/colors.png','#E11D74',false),
  ('shapes','Formas','Shapes',24,'covers/shapes.png','#0891B2',false),
  ('numbers','Números','Numbers',25,'covers/numbers.png','#7C3AED',false),
  ('home','La Casa','Home',26,'covers/home.png','#0EA5A0',false),
  ('kitchen','La Cocina','The Kitchen',27,'covers/kitchen.png','#EA580C',false),
  ('toys','Juguetes','Toys',28,'covers/toys.png','#DB2777',false),
  ('school','La Escuela','School',29,'covers/school.png','#2563EB',false),
  ('nature','Naturaleza','Nature',30,'covers/nature.png','#15803D',false),
  ('weather','El Clima','Weather',31,'covers/weather.png','#0284C7',false),
  ('city','En la Ciudad','In the City',32,'covers/city.png','#64748B',false),
  ('tools','Herramientas','Tools',33,'covers/tools.png','#B45309',false)
on conflict (slug) do update set
  name_es = excluded.name_es, name_en = excluded.name_en,
  sort_order = excluded.sort_order, cover_image_path = excluded.cover_image_path,
  color_hex = excluded.color_hex, is_free = excluded.is_free;
