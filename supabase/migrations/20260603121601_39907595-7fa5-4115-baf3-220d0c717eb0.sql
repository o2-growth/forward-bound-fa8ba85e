
-- 4 novos analistas
DO $$
DECLARE
  rec RECORD;
  new_id uuid;
BEGIN
  FOR rec IN
    SELECT * FROM (VALUES
      ('eric.silveira@o2inc.com.br','Eric Alves da Silveira','Eduardo Milani Pedrolo','TSNfAfC2MP&zqW'),
      ('pedro.pimenta@o2inc.com.br','Pedro Oppermann Michelucci Pimenta','Eduardo Milani Pedrolo','QL5zF1G8kvMD&!'),
      ('eduarda.nery@o2inc.com.br','Maria Eduarda Nery Reckziegel','Everton Bisinella','hCAqX*6UDbJ$5Z'),
      ('raissa.daros@o2inc.com.br','Raissa Bonamigo Daros','Mariana Luz da Silva','yIgVpD!j8ENGTB')
    ) AS t(email, full_name, cfo_name, pwd)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = rec.email) THEN
      new_id := gen_random_uuid();
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000', new_id, 'authenticated', 'authenticated',
        rec.email, crypt(rec.pwd, gen_salt('bf')),
        now(), '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', rec.full_name),
        now(), now(), '', '', '', ''
      );
      INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
      VALUES (gen_random_uuid(), new_id, jsonb_build_object('sub', new_id::text, 'email', rec.email), 'email', new_id::text, now(), now(), now());

      INSERT INTO public.profiles (id, email, full_name) VALUES (new_id, rec.email, rec.full_name)
        ON CONFLICT (id) DO NOTHING;
      INSERT INTO public.user_roles (user_id, role) VALUES (new_id, 'cfo')
        ON CONFLICT DO NOTHING;
      INSERT INTO public.cfo_user_mapping (user_id, cfo_name) VALUES (new_id, rec.cfo_name);
    END IF;
  END LOOP;
END $$;

-- Reset de senha dos 13 analistas
UPDATE auth.users SET encrypted_password = crypt(v.pwd, gen_salt('bf')), updated_at = now()
FROM (VALUES
  ('pedro.fuzer@o2inc.com.br','f#yzz&0aLuyBB1'),
  ('tainara.konzen@o2inc.com.br','gB3M2#djlEClqP'),
  ('sergio.piva@o2inc.com.br','WjUDO8D&JdCA4S'),
  ('felipe.brenner@o2inc.com.br','%2ay6lGo9bhK&@'),
  ('anderson.mendes@o2inc.com.br','KWQ1*65U6Tq7Tz'),
  ('humberto.behs@o2inc.com.br','4@2T7nxwq$B4Yz'),
  ('pamela.quadros@o2inc.com.br','EJDpdAOq@c9P6X'),
  ('matheus.besnos@o2inc.com.br','&SWZeq4Ejs5hJH'),
  ('roberta.costa@o2inc.com.br','kQjjHp3o5XpE*o'),
  ('eric.silveira@o2inc.com.br','TSNfAfC2MP&zqW'),
  ('pedro.pimenta@o2inc.com.br','QL5zF1G8kvMD&!'),
  ('eduarda.nery@o2inc.com.br','hCAqX*6UDbJ$5Z'),
  ('raissa.daros@o2inc.com.br','yIgVpD!j8ENGTB')
) AS v(email, pwd)
WHERE auth.users.email = v.email;
