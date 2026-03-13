-- ============================================================
-- Roles de acesso que o PostgREST usa internamente
-- ============================================================

-- Role anônimo (requests sem token — catálogo público)
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
END $$;

-- Role autenticado genérico
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END $$;

-- Role admin (JWT claim role = 'admin')
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'admin') THEN
    CREATE ROLE admin NOLOGIN;
  END IF;
END $$;

-- Role viewer (JWT claim role = 'viewer')
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'viewer') THEN
    CREATE ROLE viewer NOLOGIN;
  END IF;
END $$;

-- Role do PostgREST (conexão com o banco)
-- A senha é injetada pelo entrypoint via variável de ambiente
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'WILL_BE_SET_BY_INIT';
  END IF;
END $$;

-- authenticator pode "virar" qualquer uma das roles abaixo
GRANT anon          TO authenticator;
GRANT authenticated TO authenticator;
GRANT admin         TO authenticator;
GRANT viewer        TO authenticator;

-- ============================================================
-- Permissões no schema master
-- ============================================================
GRANT USAGE ON SCHEMA master TO anon, authenticated, admin, viewer;

-- Qualquer role pode chamar login (anon faz login)
GRANT EXECUTE ON FUNCTION master.login(TEXT, TEXT)           TO anon;
GRANT EXECUTE ON FUNCTION master.set_tenant_schema()         TO anon, authenticated, admin, viewer;
GRANT EXECUTE ON FUNCTION master.create_tenant_schema(TEXT)  TO admin;
GRANT EXECUTE ON FUNCTION master.create_admin(TEXT, TEXT)     TO anon, admin;

-- Leitura de tenants (necessário para set_tenant_schema)
GRANT SELECT ON master.tenants      TO anon, authenticated, admin, viewer;
GRANT SELECT ON master.tenant_users TO admin;

-- ============================================================
-- Permissões no schema jwt (funções internas)
-- ============================================================
GRANT USAGE ON SCHEMA jwt TO anon, authenticated, admin, viewer;
