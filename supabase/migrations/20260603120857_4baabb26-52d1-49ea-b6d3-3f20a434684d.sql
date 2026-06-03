
ALTER TABLE public.cfo_user_mapping DROP CONSTRAINT IF EXISTS cfo_user_mapping_cfo_name_key;

DO $$
DECLARE
  v_user_id uuid;
  rec record;
BEGIN
  FOR rec IN
    SELECT * FROM (VALUES
      ('pedro.fuzer@o2inc.com.br',     'Pedro Fuzer Garcia',              'Oliveira'),
      ('tainara.konzen@o2inc.com.br',  'Tainara Sofia Konzen',            'Douglas Schossler'),
      ('sergio.piva@o2inc.com.br',     'Sergio Pereira Piva Junior',      'Eduardo Milani Pedrolo'),
      ('felipe.brenner@o2inc.com.br',  'Felipe Vargas Brenner',           'Eduardo Milani Pedrolo'),
      ('anderson.mendes@o2inc.com.br', 'Anderson Felizardo Mendes',       'Everton Bisinella'),
      ('humberto.behs@o2inc.com.br',   'Humberto de Azevedo Behs',        'Gustavo Cochlar'),
      ('pamela.quadros@o2inc.com.br',  'Pamela Luiza dos Santos Quadros', 'Eduardo D''Agostini'),
      ('matheus.besnos@o2inc.com.br',  'Matheus da Silva Besnos',         'Eduardo D''Agostini'),
      ('roberta.costa@o2inc.com.br',   'Roberta Costa Curta Lirio',       'Mariana Luz da Silva')
    ) AS t(email, full_name, cfo_name)
  LOOP
    SELECT id INTO v_user_id FROM auth.users WHERE email = rec.email;

    IF v_user_id IS NULL THEN
      v_user_id := gen_random_uuid();
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, email_change,
        email_change_token_new, recovery_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        v_user_id, 'authenticated', 'authenticated', rec.email,
        crypt('Alterar@01', gen_salt('bf')), now(),
        jsonb_build_object('provider','email','providers', jsonb_build_array('email')),
        jsonb_build_object('full_name', rec.full_name),
        now(), now(), '', '', '', ''
      );

      INSERT INTO auth.identities (
        id, user_id, identity_data, provider, provider_id,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), v_user_id,
        jsonb_build_object('sub', v_user_id::text, 'email', rec.email),
        'email', rec.email, now(), now(), now()
      );
    END IF;

    INSERT INTO public.profiles (id, email, full_name)
    VALUES (v_user_id, rec.email, rec.full_name)
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email;

    DELETE FROM public.user_roles WHERE user_id = v_user_id AND role = 'admin';
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'cfo')
    ON CONFLICT (user_id, role) DO NOTHING;

    DELETE FROM public.cfo_user_mapping WHERE user_id = v_user_id;
    INSERT INTO public.cfo_user_mapping (user_id, cfo_name)
    VALUES (v_user_id, rec.cfo_name);
  END LOOP;
END $$;
