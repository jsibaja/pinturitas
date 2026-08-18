-- ============================================================================
-- Pinturitas · 07 · Primer administrador (owner)
-- Ejecutar AL FINAL, cuando ya exista al menos una cuenta registrada.
--
-- El panel de administración vive en /admin y solo lo ven los roles
-- owner/admin. Sin este paso nadie tendría acceso.
-- ============================================================================

-- OPCIÓN A (recomendada): nombra owner a una cuenta concreta por su correo.
-- Cambia el correo por el tuyo antes de ejecutar.
insert into public.user_roles (user_id, role)
select id, 'owner'::public.app_role
from auth.users
where email = 'cambia-esto@tu-dominio.com'
on conflict (user_id, role) do nothing;

-- OPCIÓN B: nombra owner a la primera cuenta creada (útil al clonar el
-- proyecto). Descomenta si prefieres esta.
-- insert into public.user_roles (user_id, role)
-- select id, 'owner'::public.app_role from auth.users order by created_at limit 1
-- on conflict (user_id, role) do nothing;

-- Comprobación: debe devolver tu correo con el rol owner.
select u.email, r.role::text as rol
from public.user_roles r join auth.users u on u.id = r.user_id
order by r.created_at;
