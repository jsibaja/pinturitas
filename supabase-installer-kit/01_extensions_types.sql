-- ============================================================================
-- Pinturitas · 01 · Extensiones y tipos
-- Primer archivo a ejecutar.
-- ============================================================================

-- pgcrypto: hash de contraseñas (bcrypt) para el alta de cuentas desde el panel.
create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;

do $$ begin
  create type public.app_role as enum ('owner','admin','user');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.subscription_status as enum ('pendiente','activa','vencida','cancelada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.vocab_status as enum ('nueva','aprendiendo','dominada');
exception when duplicate_object then null; end $$;
