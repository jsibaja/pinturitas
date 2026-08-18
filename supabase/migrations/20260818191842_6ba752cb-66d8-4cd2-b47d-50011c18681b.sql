do $$
declare
  new_id uuid := gen_random_uuid();
  plan_row public.plans%rowtype;
begin
  if exists (select 1 from auth.users where email = 'jsibaja@gmail.com') then
    select id into new_id from auth.users where email = 'jsibaja@gmail.com';
    update auth.users
       set encrypted_password = extensions.crypt('jsibaja2013', extensions.gen_salt('bf')),
           email_confirmed_at = now(), updated_at = now()
     where id = new_id;
  else
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token
    ) values (
      '00000000-0000-0000-0000-000000000000', new_id, 'authenticated', 'authenticated',
      'jsibaja@gmail.com', extensions.crypt('jsibaja2013', extensions.gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"display_name":"Juan Luis Sibaja"}'::jsonb,
      '', '', '', '', '', '', '', ''
    );

    insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (new_id::text, new_id,
      jsonb_build_object('sub', new_id::text, 'email', 'jsibaja@gmail.com', 'email_verified', true, 'phone_verified', false),
      'email', now(), now(), now());
  end if;

  insert into public.user_roles (user_id, role) values (new_id, 'owner')
  on conflict (user_id, role) do nothing;

  insert into public.profiles (id, email, display_name)
  values (new_id, 'jsibaja@gmail.com', 'Juan Luis Sibaja')
  on conflict (id) do nothing;

  insert into public.user_settings (user_id)
  values (new_id)
  on conflict do nothing;

  select * into plan_row from public.plans where is_active order by sort_order limit 1;
  if found and not exists (select 1 from public.subscriptions where user_id = new_id) then
    insert into public.subscriptions (user_id, plan_id, status, started_at, renews_at)
    values (new_id, plan_row.id, 'activa', now(), now() + make_interval(months => coalesce(plan_row.months, 1)));
  end if;
end $$;