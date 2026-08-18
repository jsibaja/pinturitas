-- ============================================================================
-- Pinturitas · 03 · Funciones y disparadores
-- Ejecutar DESPUÉS de 02_schema.sql
-- ============================================================================

-- ---------- utilidades ----------

create or replace function public.update_updated_at_column()
returns trigger language plpgsql set search_path to 'public' as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$;

-- Al registrarse un usuario se crean su perfil y sus ajustes.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path to 'public' as $fn$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));

  insert into public.user_settings (user_id) values (new.id);
  return new;
end;
$fn$;

-- ---------- permisos ----------

-- ¿El niño pertenece a quien llama? Se usa en el RLS de toda la actividad.
create or replace function public.owns_child(_child_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $fn$
  select exists (
    select 1 from public.children where id = _child_id and parent_id = auth.uid()
  );
$fn$;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$fn$;

create or replace function public.is_admin(_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role in ('owner','admin')
  );
$fn$;

-- Jerarquía: owner(3) > admin(2) > usuario(1)
create or replace function public.user_rank(_user_id uuid) returns int
language sql stable security definer set search_path = public as $fn$
  select case
    when public.has_role(_user_id, 'owner') then 3
    when public.has_role(_user_id, 'admin') then 2
    else 1
  end;
$fn$;

-- Solo se gestiona a alguien de rango ESTRICTAMENTE inferior, y nunca a uno
-- mismo: así un administrador no puede desactivarse ni eliminarse (si se va,
-- nadie quedaría con acceso).
create or replace function public.can_manage_user(_target uuid) returns boolean
language sql stable security definer set search_path = public as $fn$
  select public.is_admin(auth.uid())
     and _target is distinct from auth.uid()
     and public.user_rank(auth.uid()) > public.user_rank(_target);
$fn$;

-- Acceso a la app. Los administradores entran siempre (no pueden gestionar su
-- propia suscripción, así que de otro modo podrían quedarse fuera).
create or replace function public.has_active_subscription(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $fn$
  select public.is_admin(_user_id)
      or exists (
        select 1 from public.subscriptions
        where user_id = _user_id
          and status = 'activa'
          and (renews_at is null or renews_at > now())
      );
$fn$;

-- ---------- operaciones de cuenta del panel de administración ----------
-- Se ejecutan dentro de la base con privilegios elevados, pero lo primero que
-- hacen es comprobar el rol de quien llama. El navegador nunca maneja claves.

create or replace function public.admin_create_user(
  _email text,
  _password text,
  _display_name text default null,
  _plan_code text default null,
  _role public.app_role default 'user',
  _status public.subscription_status default 'activa'
) returns uuid
language plpgsql security definer set search_path = public, auth, extensions as $fn$
declare
  new_id uuid := gen_random_uuid();
  plan_row public.plans%rowtype;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'No tienes permisos de administrador';
  end if;
  if _role = 'owner' and not public.has_role(auth.uid(), 'owner') then
    raise exception 'Solo un owner puede crear otro owner';
  end if;
  if _password is null or length(_password) < 6 then
    raise exception 'La contraseña debe tener al menos 6 caracteres';
  end if;
  if _email is null or position('@' in _email) = 0 then
    raise exception 'Correo no válido';
  end if;
  if exists (select 1 from auth.users where email = lower(_email)) then
    raise exception 'Ya existe una cuenta con ese correo';
  end if;

  -- El plan se resuelve ANTES de crear nada: sin suscripción no hay acceso a
  -- las láminas, así que un código inexistente se avisa en vez de dejar una
  -- cuenta muda. Sin código, se usa el primer plan activo.
  if _plan_code is not null then
    select * into plan_row from public.plans where code = _plan_code;
    if not found then
      raise exception 'Plan no válido: %', _plan_code;
    end if;
  else
    select * into plan_row from public.plans where is_active order by sort_order limit 1;
    if not found then
      raise exception 'No hay ningún plan activo al que asignar la cuenta';
    end if;
  end if;

  -- IMPORTANTE: las columnas de token van como cadena vacía, NO NULL. El
  -- servicio de autenticación las lee como texto y con NULL el login falla
  -- con "Database error querying schema".
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000', new_id, 'authenticated', 'authenticated',
    lower(_email), extensions.crypt(_password, extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('display_name', coalesce(nullif(_display_name,''), split_part(_email,'@',1))),
    '', '', '', '', '', '', '', ''
  );

  -- Sin fila en auth.identities no se puede iniciar sesión con correo.
  insert into auth.identities (provider_id, user_id, identity_data, provider,
                               last_sign_in_at, created_at, updated_at)
  values (new_id::text, new_id,
    jsonb_build_object('sub', new_id::text, 'email', lower(_email),
                       'email_verified', true, 'phone_verified', false),
    'email', now(), now(), now());

  if _role <> 'user' then
    insert into public.user_roles (user_id, role) values (new_id, _role)
    on conflict (user_id, role) do nothing;
  end if;

  insert into public.subscriptions (user_id, plan_id, status, started_at, renews_at)
  values (new_id, plan_row.id, _status, now(),
          now() + make_interval(months => coalesce(plan_row.months, 1)));

  return new_id;
end $fn$;

create or replace function public.admin_delete_user(_user_id uuid) returns void
language plpgsql security definer set search_path = public, auth as $fn$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'No tienes permisos de administrador';
  end if;
  if _user_id = auth.uid() then
    raise exception 'No puedes eliminar tu propia cuenta';
  end if;
  if not public.can_manage_user(_user_id) then
    raise exception 'Solo puedes eliminar cuentas de rango inferior al tuyo';
  end if;
  delete from auth.users where id = _user_id;  -- el resto cae en cascada
end $fn$;

create or replace function public.admin_update_email(_user_id uuid, _email text) returns void
language plpgsql security definer set search_path = public, auth as $fn$
begin
  if not public.can_manage_user(_user_id) then
    raise exception 'Solo puedes editar cuentas de rango inferior al tuyo';
  end if;
  if _email is null or position('@' in _email) = 0 then
    raise exception 'Correo no válido';
  end if;
  if exists (select 1 from auth.users where email = lower(_email) and id <> _user_id) then
    raise exception 'Ya existe una cuenta con ese correo';
  end if;

  update auth.users
     set email = lower(_email), email_confirmed_at = now(), updated_at = now()
   where id = _user_id;
  -- OJO: auth.identities.email es columna generada; solo se toca identity_data.
  update auth.identities
     set identity_data = identity_data || jsonb_build_object('email', lower(_email)),
         updated_at = now()
   where user_id = _user_id and provider = 'email';
  update public.profiles set email = lower(_email) where id = _user_id;
end $fn$;

create or replace function public.admin_update_password(_user_id uuid, _password text) returns void
language plpgsql security definer set search_path = public, auth, extensions as $fn$
begin
  if not public.can_manage_user(_user_id) then
    raise exception 'Solo puedes editar cuentas de rango inferior al tuyo';
  end if;
  if _password is null or length(_password) < 6 then
    raise exception 'La contraseña debe tener al menos 6 caracteres';
  end if;
  update auth.users
     set encrypted_password = extensions.crypt(_password, extensions.gen_salt('bf')),
         updated_at = now()
   where id = _user_id;
end $fn$;

-- ---------- disparadores ----------

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.update_updated_at_column();

drop trigger if exists trg_children_updated_at on public.children;
create trigger trg_children_updated_at before update on public.children
  for each row execute function public.update_updated_at_column();

drop trigger if exists trg_user_settings_updated_at on public.user_settings;
create trigger trg_user_settings_updated_at before update on public.user_settings
  for each row execute function public.update_updated_at_column();

drop trigger if exists trg_drawings_updated_at on public.drawings;
create trigger trg_drawings_updated_at before update on public.drawings
  for each row execute function public.update_updated_at_column();

drop trigger if exists trg_artworks_updated_at on public.artworks;
create trigger trg_artworks_updated_at before update on public.artworks
  for each row execute function public.update_updated_at_column();

drop trigger if exists trg_subscriptions_updated_at on public.subscriptions;
create trigger trg_subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.update_updated_at_column();

drop trigger if exists trg_parent_notes_updated_at on public.parent_notes;
create trigger trg_parent_notes_updated_at before update on public.parent_notes
  for each row execute function public.update_updated_at_column();
