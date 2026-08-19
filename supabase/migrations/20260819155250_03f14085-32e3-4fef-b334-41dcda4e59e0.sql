update auth.users
   set encrypted_password = extensions.crypt('5jotas2013', extensions.gen_salt('bf')),
       updated_at = now()
 where email = 'jsibaja@gmail.com';