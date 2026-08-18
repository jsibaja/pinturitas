-- ============================================================================
-- Pinturitas · 04 · Seguridad a nivel de fila (RLS) y privilegios
-- Ejecutar DESPUÉS de 03_functions_triggers.sql
--
-- Principios:
--  · RLS habilitado en TODAS las tablas, sin excepción.
--  · El catálogo (mundos, láminas, colores, planes, logros) es de solo lectura
--    para usuarios autenticados; se escribe únicamente con service_role.
--  · La actividad de cada niño se filtra con owns_child().
--  · La administración usa is_admin() para ver y can_manage_user() para
--    escribir (solo sobre cuentas de rango inferior).
--
-- OJO: RLS filtra filas, pero el privilegio de tabla es aparte. Sin los GRANT
-- de abajo, el panel falla con "permission denied" aunque la política permita.
-- ============================================================================

-- Este archivo define el juego COMPLETO de políticas, así que para poder
-- re-ejecutarlo se retiran primero las que hubiera (Postgres no admite
-- "create policy if not exists"). Ojo: también retira políticas propias que
-- hayas añadido a mano en el esquema public.
do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public'
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

alter table public.profiles          enable row level security;
alter table public.user_roles        enable row level security;
alter table public.user_settings     enable row level security;
alter table public.children          enable row level security;
alter table public.worlds            enable row level security;
alter table public.drawings          enable row level security;
alter table public.palette_colors    enable row level security;
alter table public.achievements      enable row level security;
alter table public.plans             enable row level security;
alter table public.subscriptions     enable row level security;
alter table public.payment_events    enable row level security;
alter table public.email_log         enable row level security;
alter table public.artworks          enable row level security;
alter table public.vocab_progress    enable row level security;
alter table public.favorites         enable row level security;
alter table public.game_sessions     enable row level security;
alter table public.child_achievements enable row level security;
alter table public.daily_activity    enable row level security;
alter table public.parent_notes      enable row level security;

grant usage on schema public to authenticated;
grant select on public.worlds, public.drawings, public.palette_colors,
                public.achievements, public.plans to authenticated;
grant select, insert, update, delete on
  public.children, public.user_settings, public.artworks, public.vocab_progress,
  public.favorites, public.game_sessions, public.child_achievements,
  public.daily_activity, public.parent_notes to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.subscriptions to authenticated;
grant select, insert, update, delete on public.user_roles to authenticated;

grant execute on function public.owns_child(uuid) to authenticated;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.is_admin(uuid) to authenticated;
grant execute on function public.user_rank(uuid) to authenticated;
grant execute on function public.can_manage_user(uuid) to authenticated;
grant execute on function public.has_active_subscription(uuid) to authenticated;

-- Las operaciones de cuenta solo para autenticados (dentro validan el rol).
revoke all on function public.admin_create_user(text,text,text,text,public.app_role,public.subscription_status) from public, anon;
revoke all on function public.admin_delete_user(uuid) from public, anon;
revoke all on function public.admin_update_email(uuid,text) from public, anon;
revoke all on function public.admin_update_password(uuid,text) from public, anon;
grant execute on function public.admin_create_user(text,text,text,text,public.app_role,public.subscription_status) to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;
grant execute on function public.admin_update_email(uuid,text) to authenticated;
grant execute on function public.admin_update_password(uuid,text) to authenticated;

-- ---------- catálogo: solo lectura ----------
create policy worlds_read_authenticated on public.worlds
  for select to authenticated using (true);
-- Las láminas son el producto: solo se entregan a quien tiene la suscripción
-- activa (los administradores siempre pasan). El (select ...) hace que la
-- comprobación se evalúe una vez por consulta y no una vez por fila.
create policy drawings_read_subscribed on public.drawings
  for select to authenticated
  using ((select public.has_active_subscription(auth.uid())));
create policy palette_colors_read_authenticated on public.palette_colors
  for select to authenticated using (true);
create policy achievements_read_authenticated on public.achievements
  for select to authenticated using (true);
create policy plans_read_authenticated on public.plans
  for select to authenticated using (true);

-- ---------- perfil ----------
create policy profiles_select_own on public.profiles
  for select to authenticated using (auth.uid() = id);
create policy profiles_update_own on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy profiles_select_admin on public.profiles
  for select to authenticated using (public.is_admin());
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.can_manage_user(id)) with check (public.can_manage_user(id));

-- ---------- roles ----------
create policy user_roles_select_own on public.user_roles
  for select to authenticated using (auth.uid() = user_id);
create policy user_roles_select_admin on public.user_roles
  for select to authenticated using (public.is_admin());
create policy user_roles_insert_admin on public.user_roles
  for insert to authenticated
  with check (public.can_manage_user(user_id)
              and (role <> 'owner' or public.has_role(auth.uid(),'owner')));
create policy user_roles_update_admin on public.user_roles
  for update to authenticated
  using (public.can_manage_user(user_id))
  with check (public.can_manage_user(user_id)
              and (role <> 'owner' or public.has_role(auth.uid(),'owner')));
create policy user_roles_delete_admin on public.user_roles
  for delete to authenticated using (public.can_manage_user(user_id));

-- ---------- ajustes ----------
create policy user_settings_select_own on public.user_settings
  for select to authenticated using (auth.uid() = user_id);
create policy user_settings_insert_own on public.user_settings
  for insert to authenticated with check (auth.uid() = user_id);
create policy user_settings_update_own on public.user_settings
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy user_settings_delete_own on public.user_settings
  for delete to authenticated using (auth.uid() = user_id);

-- ---------- niños (máximo 4 por cuenta, aplicado aquí) ----------
create policy children_select_own on public.children
  for select to authenticated using (auth.uid() = parent_id);
create policy children_insert_own on public.children
  for insert to authenticated
  with check (auth.uid() = parent_id
              and (select count(*) from public.children c where c.parent_id = auth.uid()) < 4);
create policy children_update_own on public.children
  for update to authenticated using (auth.uid() = parent_id) with check (auth.uid() = parent_id);
create policy children_delete_own on public.children
  for delete to authenticated using (auth.uid() = parent_id);

-- ---------- suscripciones ----------
create policy subscriptions_select_own on public.subscriptions
  for select to authenticated using (auth.uid() = user_id);
create policy subscriptions_select_admin on public.subscriptions
  for select to authenticated using (public.is_admin());
create policy subscriptions_insert_admin on public.subscriptions
  for insert to authenticated with check (public.can_manage_user(user_id));
create policy subscriptions_update_admin on public.subscriptions
  for update to authenticated
  using (public.can_manage_user(user_id)) with check (public.can_manage_user(user_id));
create policy subscriptions_delete_admin on public.subscriptions
  for delete to authenticated using (public.can_manage_user(user_id));

-- ---------- pagos y correos: nadie desde el cliente ----------
create policy payment_events_deny_all on public.payment_events
  for all to authenticated using (false) with check (false);
create policy email_log_deny_all on public.email_log
  for all to authenticated using (false) with check (false);

-- ---------- actividad por niño ----------
create policy artworks_select_own on public.artworks
  for select to authenticated using (public.owns_child(child_id));
create policy artworks_insert_own on public.artworks
  for insert to authenticated with check (public.owns_child(child_id));
create policy artworks_update_own on public.artworks
  for update to authenticated using (public.owns_child(child_id)) with check (public.owns_child(child_id));
create policy artworks_delete_own on public.artworks
  for delete to authenticated using (public.owns_child(child_id));

create policy vocab_select_own on public.vocab_progress
  for select to authenticated using (public.owns_child(child_id));
create policy vocab_insert_own on public.vocab_progress
  for insert to authenticated with check (public.owns_child(child_id));
create policy vocab_update_own on public.vocab_progress
  for update to authenticated using (public.owns_child(child_id)) with check (public.owns_child(child_id));
create policy vocab_delete_own on public.vocab_progress
  for delete to authenticated using (public.owns_child(child_id));

create policy favorites_select_own on public.favorites
  for select to authenticated using (public.owns_child(child_id));
create policy favorites_insert_own on public.favorites
  for insert to authenticated with check (public.owns_child(child_id));
create policy favorites_delete_own on public.favorites
  for delete to authenticated using (public.owns_child(child_id));

create policy game_sessions_select_own on public.game_sessions
  for select to authenticated using (public.owns_child(child_id));
create policy game_sessions_insert_own on public.game_sessions
  for insert to authenticated with check (public.owns_child(child_id));

create policy child_achievements_select_own on public.child_achievements
  for select to authenticated using (public.owns_child(child_id));
create policy child_achievements_insert_own on public.child_achievements
  for insert to authenticated with check (public.owns_child(child_id));

create policy daily_activity_select_own on public.daily_activity
  for select to authenticated using (public.owns_child(child_id));
create policy daily_activity_insert_own on public.daily_activity
  for insert to authenticated with check (public.owns_child(child_id));
create policy daily_activity_update_own on public.daily_activity
  for update to authenticated using (public.owns_child(child_id)) with check (public.owns_child(child_id));

create policy parent_notes_select_own on public.parent_notes
  for select to authenticated using (public.owns_child(child_id));
create policy parent_notes_insert_own on public.parent_notes
  for insert to authenticated with check (public.owns_child(child_id));
create policy parent_notes_update_own on public.parent_notes
  for update to authenticated using (public.owns_child(child_id)) with check (public.owns_child(child_id));
create policy parent_notes_delete_own on public.parent_notes
  for delete to authenticated using (public.owns_child(child_id));

-- ---------- avisos en vivo ----------
-- La app escucha los cambios de la suscripción del propio usuario para que
-- activar o desactivar desde el panel surta efecto sin refrescar la página.
-- REPLICA IDENTITY FULL hace que los avisos de UPDATE/DELETE lleven la fila
-- completa; sin eso, el filtro por user_id no tiene con qué trabajar.
alter table public.subscriptions replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public' and tablename = 'subscriptions'
  ) then
    alter publication supabase_realtime add table public.subscriptions;
  end if;
end $$;
