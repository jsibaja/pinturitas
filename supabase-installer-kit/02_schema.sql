-- ============================================================================
-- Pinturitas · 02 · Esquema (tablas)
-- Ejecutar DESPUÉS de 01_extensions_types.sql
-- ============================================================================

create table if not exists public.profiles (
  id uuid not null,
  email text,
  display_name text,
  country text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint profiles_pkey primary key (id),
  constraint profiles_id_fkey foreign key (id) references auth.users(id) on delete cascade
);

create table if not exists public.user_roles (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  role app_role not null default 'user'::app_role,
  created_at timestamp with time zone not null default now(),
  constraint user_roles_pkey primary key (id),
  constraint user_roles_user_id_role_key unique (user_id, role),
  constraint user_roles_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade
);

create table if not exists public.user_settings (
  user_id uuid not null,
  theme text not null default 'system'::text,
  sound_enabled boolean not null default true,
  music_enabled boolean not null default true,
  daily_reminder_time time without time zone,
  notifications_enabled boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint user_settings_pkey primary key (user_id),
  constraint user_settings_user_id_fkey foreign key (user_id) references profiles(id) on delete cascade
);

create table if not exists public.children (
  id uuid not null default gen_random_uuid(),
  parent_id uuid not null,
  name text not null,
  avatar_key text,
  birth_year integer,
  theme_color text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint children_pkey primary key (id),
  constraint children_parent_id_fkey foreign key (parent_id) references profiles(id) on delete cascade
);

-- ---------- catálogo de contenido ----------

create table if not exists public.worlds (
  id uuid not null default gen_random_uuid(),
  slug text not null,
  name_es text not null,
  name_en text not null,
  sort_order integer not null default 0,
  cover_image_path text,
  color_hex text,
  icon_key text,
  is_free boolean not null default false,
  created_at timestamp with time zone not null default now(),
  constraint worlds_pkey primary key (id),
  constraint worlds_slug_key unique (slug)
);

create table if not exists public.drawings (
  id uuid not null default gen_random_uuid(),
  world_id uuid not null,
  slug text not null,
  name_es text not null,
  name_en text not null,
  phonetic_es text,
  article_en text,
  plural_en text,
  sample_sentence_en text,
  sample_sentence_es text,
  fun_fact_es text,
  line_art_path text,
  preview_image_path text,
  audio_path text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  regions jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint drawings_pkey primary key (id),
  constraint drawings_world_id_slug_key unique (world_id, slug),
  constraint drawings_world_id_fkey foreign key (world_id) references worlds(id) on delete cascade
);

create table if not exists public.palette_colors (
  id uuid not null default gen_random_uuid(),
  hex text not null,
  name_es text not null,
  name_en text not null,
  phonetic_es text,
  sort_order integer not null default 0,
  constraint palette_colors_pkey primary key (id)
);

create table if not exists public.achievements (
  id uuid not null default gen_random_uuid(),
  code text not null,
  name_es text not null,
  description_es text,
  icon_path text,
  rule jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  constraint achievements_pkey primary key (id),
  constraint achievements_code_key unique (code)
);

create table if not exists public.plans (
  id uuid not null default gen_random_uuid(),
  code text not null,
  name text not null,
  price_usd numeric(10,2) not null,
  billing_interval text not null,
  months integer not null,
  is_best_value boolean not null default false,
  hotmart_offer_code text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  constraint plans_pkey primary key (id),
  constraint plans_code_key unique (code)
);

-- ---------- suscripciones y pagos ----------

create table if not exists public.subscriptions (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  plan_id uuid not null,
  status subscription_status not null default 'pendiente'::subscription_status,
  started_at timestamp with time zone,
  renews_at timestamp with time zone,
  canceled_at timestamp with time zone,
  external_reference text,
  hotmart_offer_code text,
  hotmart_subscriber_code text,
  raw_payload jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint subscriptions_pkey primary key (id),
  constraint subscriptions_plan_id_fkey foreign key (plan_id) references plans(id),
  constraint subscriptions_user_id_fkey foreign key (user_id) references profiles(id) on delete cascade
);

create table if not exists public.payment_events (
  id uuid not null default gen_random_uuid(),
  subscription_id uuid,
  provider text not null,
  event_type text not null,
  external_id text not null,
  payload jsonb not null,
  received_at timestamp with time zone not null default now(),
  constraint payment_events_pkey primary key (id),
  constraint payment_events_external_id_key unique (external_id),
  constraint payment_events_subscription_id_fkey foreign key (subscription_id) references subscriptions(id) on delete set null
);

create table if not exists public.email_log (
  id uuid not null default gen_random_uuid(),
  user_id uuid,
  template_code text not null,
  to_email text not null,
  status text not null,
  provider_message_id text,
  sent_at timestamp with time zone not null default now(),
  error text,
  constraint email_log_pkey primary key (id),
  constraint email_log_user_id_fkey foreign key (user_id) references profiles(id) on delete set null
);

-- ---------- actividad por niño ----------

create table if not exists public.artworks (
  id uuid not null default gen_random_uuid(),
  child_id uuid not null,
  drawing_id uuid not null,
  canvas_state jsonb not null default '{}'::jsonb,
  thumbnail_path text,
  is_completed boolean not null default false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint artworks_pkey primary key (id),
  constraint artworks_child_id_drawing_id_key unique (child_id, drawing_id),
  constraint artworks_child_id_fkey foreign key (child_id) references children(id) on delete cascade,
  constraint artworks_drawing_id_fkey foreign key (drawing_id) references drawings(id) on delete cascade
);

create table if not exists public.vocab_progress (
  id uuid not null default gen_random_uuid(),
  child_id uuid not null,
  drawing_id uuid not null,
  status vocab_status not null default 'nueva'::vocab_status,
  srs_box integer not null default 0,
  next_review_at timestamp with time zone,
  correct_count integer not null default 0,
  wrong_count integer not null default 0,
  last_seen_at timestamp with time zone,
  constraint vocab_progress_pkey primary key (id),
  constraint vocab_progress_child_id_drawing_id_key unique (child_id, drawing_id),
  constraint vocab_progress_child_id_fkey foreign key (child_id) references children(id) on delete cascade,
  constraint vocab_progress_drawing_id_fkey foreign key (drawing_id) references drawings(id) on delete cascade
);

create table if not exists public.favorites (
  child_id uuid not null,
  drawing_id uuid not null,
  created_at timestamp with time zone not null default now(),
  constraint favorites_pkey primary key (child_id, drawing_id),
  constraint favorites_child_id_fkey foreign key (child_id) references children(id) on delete cascade,
  constraint favorites_drawing_id_fkey foreign key (drawing_id) references drawings(id) on delete cascade
);

create table if not exists public.game_sessions (
  id uuid not null default gen_random_uuid(),
  child_id uuid not null,
  game_type text not null,
  score integer not null default 0,
  correct_count integer not null default 0,
  wrong_count integer not null default 0,
  duration_seconds integer not null default 0,
  played_at timestamp with time zone not null default now(),
  constraint game_sessions_pkey primary key (id),
  constraint game_sessions_child_id_fkey foreign key (child_id) references children(id) on delete cascade
);

create table if not exists public.child_achievements (
  child_id uuid not null,
  achievement_id uuid not null,
  unlocked_at timestamp with time zone not null default now(),
  constraint child_achievements_pkey primary key (child_id, achievement_id),
  constraint child_achievements_achievement_id_fkey foreign key (achievement_id) references achievements(id) on delete cascade,
  constraint child_achievements_child_id_fkey foreign key (child_id) references children(id) on delete cascade
);

create table if not exists public.daily_activity (
  id uuid not null default gen_random_uuid(),
  child_id uuid not null,
  activity_date date not null,
  minutes integer not null default 0,
  drawings_colored integer not null default 0,
  words_reviewed integer not null default 0,
  constraint daily_activity_pkey primary key (id),
  constraint daily_activity_child_id_activity_date_key unique (child_id, activity_date),
  constraint daily_activity_child_id_fkey foreign key (child_id) references children(id) on delete cascade
);

create table if not exists public.parent_notes (
  id uuid not null default gen_random_uuid(),
  child_id uuid not null,
  drawing_id uuid,
  body text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint parent_notes_pkey primary key (id),
  constraint parent_notes_child_id_fkey foreign key (child_id) references children(id) on delete cascade,
  constraint parent_notes_drawing_id_fkey foreign key (drawing_id) references drawings(id) on delete set null
);
