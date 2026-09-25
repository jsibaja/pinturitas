-- ============================================================================
-- Pinturitas · 08 · Crear cuenta Administrador con Suscripción Vitalicia
-- Úsalo para crear tu cuenta o desbloquear acceso total sin pasar por pasarela
-- ============================================================================

do $$
declare
  target_email text := 'jsibaja@gmail.com';
  default_pass text := 'Pinturitas2025!'; -- Contraseña inicial
  target_id uuid;
  plan_rec record;
begin
  -- 1. Obtener o crear el usuario en auth.users
  select id into target_id from auth.users where email = lower(target_email);

  if target_id is null then
    target_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      target_id,
      'authenticated',
      'authenticated',
      lower(target_email),
      extensions.crypt(default_pass, extensions.gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('display_name', 'Administrador'),
      '', '', '', '', '', '', '', ''
    );

    insert into auth.identities (
      provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      target_id::text,
      target_id,
      jsonb_build_object('sub', target_id::text, 'email', lower(target_email), 'email_verified', true, 'phone_verified', false),
      'email',
      now(), now(), now()
    );
  else
    -- Si ya existe, confirmamos el email
    update auth.users
    set email_confirmed_at = coalesce(email_confirmed_at, now())
    where id = target_id;
  end if;

  -- 2. Asegurar perfil y settings
  insert into public.profiles (id, email, display_name)
  values (target_id, lower(target_email), 'Administrador')
  on conflict (id) do update set display_name = 'Administrador';

  insert into public.user_settings (user_id)
  values (target_id)
  on conflict (user_id) do nothing;

  -- 3. Asignar rol de OWNER (máximo rango)
  insert into public.user_roles (user_id, role)
  values (target_id, 'owner'::public.app_role)
  on conflict (user_id, role) do nothing;

  -- 4. Asignar suscripción Anual/Vitalicia (100 años) para evitar pantalla de pago
  select id into plan_rec from public.plans where code = 'premium' limit 1;
  if plan_rec.id is null then
    select id into plan_rec from public.plans limit 1;
  end if;

  if plan_rec.id is not null then
    delete from public.subscriptions where user_id = target_id;
    insert into public.subscriptions (user_id, plan_id, status, started_at, renews_at)
    values (target_id, plan_rec.id, 'activa', now(), now() + interval '100 years');
  end if;

  -- 5. Crear un perfil de niño por defecto para empezar a pintar ya
  if not exists (select 1 from public.children where parent_id = target_id) then
    insert into public.children (parent_id, name, avatar_key, birth_year)
    values (target_id, 'Mi Pequeño Artista', 'lion', 2020);
  end if;

  raise notice '¡Usuario configurado con éxito! ID: %', target_id;
end $$;
