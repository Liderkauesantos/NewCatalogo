--
-- PostgreSQL database dump
--

\restrict vwhgiV1AbcA61c0KRe6t3E3kCIhg7o3IkcxUsH35LMddg8XuQjlDWegX8wgVZGy

-- Dumped from database version 15.17
-- Dumped by pg_dump version 15.17

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: demo; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA demo;


ALTER SCHEMA demo OWNER TO postgres;

--
-- Name: jwt; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA jwt;


ALTER SCHEMA jwt OWNER TO postgres;

--
-- Name: master; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA master;


ALTER SCHEMA master OWNER TO postgres;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: demo; Owner: postgres
--

CREATE FUNCTION demo.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
        BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
        $$;


ALTER FUNCTION demo.set_updated_at() OWNER TO postgres;

--
-- Name: algorithm_sign(text, text, text); Type: FUNCTION; Schema: jwt; Owner: postgres
--

CREATE FUNCTION jwt.algorithm_sign(signables text, secret text, algorithm text DEFAULT 'HS256'::text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT jwt.url_encode(
    public.hmac(
      signables,
      secret,
      CASE algorithm
        WHEN 'HS256' THEN 'sha256'
        WHEN 'HS384' THEN 'sha384'
        WHEN 'HS512' THEN 'sha512'
        ELSE 'sha256'
      END
    )
  );
$$;


ALTER FUNCTION jwt.algorithm_sign(signables text, secret text, algorithm text) OWNER TO postgres;

--
-- Name: sign(json, text, text); Type: FUNCTION; Schema: jwt; Owner: postgres
--

CREATE FUNCTION jwt.sign(payload json, secret text, algorithm text DEFAULT 'HS256'::text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
  WITH
    header    AS (
      SELECT jwt.url_encode(
        convert_to('{"alg":"' || algorithm || '","typ":"JWT"}', 'utf8')
      ) AS val
    ),
    payload_b64 AS (
      SELECT jwt.url_encode(convert_to(payload::TEXT, 'utf8')) AS val
    ),
    signable AS (
      SELECT (SELECT val FROM header) || '.' || (SELECT val FROM payload_b64) AS val
    )
  SELECT
    (SELECT val FROM signable)
    || '.' ||
    jwt.algorithm_sign((SELECT val FROM signable), secret, algorithm);
$$;


ALTER FUNCTION jwt.sign(payload json, secret text, algorithm text) OWNER TO postgres;

--
-- Name: url_encode(bytea); Type: FUNCTION; Schema: jwt; Owner: postgres
--

CREATE FUNCTION jwt.url_encode(data bytea) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT translate(encode(data, 'base64'), E'+/=\n', '-_');
$$;


ALTER FUNCTION jwt.url_encode(data bytea) OWNER TO postgres;

--
-- Name: verify(text, text, text); Type: FUNCTION; Schema: jwt; Owner: postgres
--

CREATE FUNCTION jwt.verify(token text, secret text, algorithm text DEFAULT 'HS256'::text) RETURNS TABLE(header json, payload json, valid boolean)
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT
    convert_from(
      decode(
        regexp_replace(split_part(token, '.', 1), '-', '+', 'g') || '==',
        'base64'
      ), 'utf8'
    )::JSON AS header,
    convert_from(
      decode(
        regexp_replace(split_part(token, '.', 2), '-', '+', 'g') || '==',
        'base64'
      ), 'utf8'
    )::JSON AS payload,
    split_part(token, '.', 3) = jwt.algorithm_sign(
      split_part(token, '.', 1) || '.' || split_part(token, '.', 2),
      secret, algorithm
    ) AS valid;
$$;


ALTER FUNCTION jwt.verify(token text, secret text, algorithm text) OWNER TO postgres;

--
-- Name: create_admin(text, text); Type: FUNCTION; Schema: master; Owner: postgres
--

CREATE FUNCTION master.create_admin(p_email text, p_password text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_tenant_schema TEXT;
    v_tenant_id     UUID;
    v_claims        JSON;
BEGIN
    -- Obtém o tenant_id do JWT (usuário já autenticado)
    -- Ou, se chamado por anon, usa o Accept-Profile header
    BEGIN
        v_claims := current_setting('request.jwt.claims', TRUE)::JSON;
        v_tenant_id := (v_claims->>'tenant_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_tenant_id := NULL;
    END;

    -- Se não tiver JWT, tenta pelo header Accept-Profile (primeiro setup)
    IF v_tenant_id IS NULL THEN
        BEGIN
            v_tenant_schema := current_setting('request.header.accept-profile', TRUE);
            SELECT id INTO v_tenant_id FROM master.tenants WHERE db_schema = v_tenant_schema;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;

    IF v_tenant_id IS NULL THEN
        RETURN json_build_object('success', FALSE, 'error', 'Tenant não identificado');
    END IF;

    -- Verifica se já existe admin
    IF EXISTS (SELECT 1 FROM master.tenant_users WHERE tenant_id = v_tenant_id AND role = 'admin') THEN
        RETURN json_build_object('success', FALSE, 'error', 'Já existe um administrador para este tenant');
    END IF;

    INSERT INTO master.tenant_users (tenant_id, email, password_hash, role)
    VALUES (v_tenant_id, p_email, crypt(p_password, gen_salt('bf')), 'admin');

    RETURN json_build_object('success', TRUE);
END;
$$;


ALTER FUNCTION master.create_admin(p_email text, p_password text) OWNER TO postgres;

--
-- Name: create_tenant_schema(text); Type: FUNCTION; Schema: master; Owner: postgres
--

CREATE FUNCTION master.create_tenant_schema(p_schema text) RETURNS void
    LANGUAGE plpgsql
    AS $_$
BEGIN
    IF p_schema !~ '^[a-z][a-z0-9_]*$' THEN
        RAISE EXCEPTION 'Nome de schema inválido: %', p_schema;
    END IF;

    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', p_schema);

    -- Função de updated_at local ao schema
    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.set_updated_at()
        RETURNS TRIGGER LANGUAGE plpgsql AS $t$
        BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
        $t$', p_schema);

    -- brand_settings
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.brand_settings (
            id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            company_name    TEXT        NOT NULL DEFAULT ''Minha Empresa'',
            logo_url        TEXT,
            whatsapp        TEXT        NOT NULL DEFAULT '''',
            primary_color   TEXT        NOT NULL DEFAULT ''#000000'',
            secondary_color TEXT        NOT NULL DEFAULT ''#ffffff'',
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )', p_schema);

    -- categories
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.categories (
            id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            name       TEXT        NOT NULL,
            sort_order INTEGER     NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )', p_schema);

    -- products
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.products (
            id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            name           TEXT        NOT NULL,
            code           TEXT        NOT NULL,
            description    TEXT,
            price          NUMERIC     NOT NULL DEFAULT 0 CHECK (price >= 0),
            stock_quantity INTEGER     NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
            category_id    UUID        REFERENCES %I.categories(id) ON DELETE SET NULL,
            image_url      TEXT,
            is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
            created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )', p_schema, p_schema);

    -- product_images
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.product_images (
            id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            product_id    UUID        NOT NULL REFERENCES %I.products(id) ON DELETE CASCADE,
            image_url     TEXT        NOT NULL,
            display_order INTEGER     NOT NULL DEFAULT 0,
            created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )', p_schema, p_schema);

    -- sequence de pedidos isolada por cliente
    EXECUTE format('CREATE SEQUENCE IF NOT EXISTS %I.orders_seq START 1', p_schema);

    -- orders
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.orders (
            id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            order_number    INTEGER     NOT NULL DEFAULT nextval(''%I.orders_seq''),
            customer_name   TEXT        NOT NULL,
            company_name    TEXT        NOT NULL DEFAULT '''',
            items           JSONB       NOT NULL DEFAULT ''[]''::jsonb,
            total           NUMERIC     NOT NULL DEFAULT 0 CHECK (total >= 0),
            whatsapp_number TEXT,
            payment_method  TEXT,
            status          TEXT        NOT NULL DEFAULT ''pending''
                                        CHECK (status IN (''pending'', ''confirmed'', ''cancelled'')),
            notes           TEXT,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )', p_schema, p_schema);

    -- carousel_slides
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.carousel_slides (
            id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            title         TEXT        NOT NULL,
            subtitle      TEXT,
            cta_text      TEXT,
            image_url     TEXT,
            bg_gradient   TEXT,
            display_order INTEGER     NOT NULL DEFAULT 0,
            is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
            created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )', p_schema);

    -- payment_methods
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.payment_methods (
            id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            name          TEXT        NOT NULL,
            is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
            display_order INTEGER     NOT NULL DEFAULT 0,
            created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )', p_schema);

    -- whatsapp_settings
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.whatsapp_settings (
            id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            phone_number TEXT        NOT NULL,
            label        TEXT,
            is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
            created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )', p_schema);

    -- ========== Triggers de updated_at ==========
    EXECUTE format('
        CREATE TRIGGER trg_brand_updated_at
          BEFORE UPDATE ON %I.brand_settings
          FOR EACH ROW EXECUTE FUNCTION %I.set_updated_at()', p_schema, p_schema);

    EXECUTE format('
        CREATE TRIGGER trg_products_updated_at
          BEFORE UPDATE ON %I.products
          FOR EACH ROW EXECUTE FUNCTION %I.set_updated_at()', p_schema, p_schema);

    EXECUTE format('
        CREATE TRIGGER trg_carousel_updated_at
          BEFORE UPDATE ON %I.carousel_slides
          FOR EACH ROW EXECUTE FUNCTION %I.set_updated_at()', p_schema, p_schema);

    -- ========== Índices de performance ==========
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_products_category  ON %I.products(category_id)', p_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_products_active    ON %I.products(is_active)', p_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_products_code      ON %I.products(code)', p_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_orders_status      ON %I.orders(status)', p_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_orders_created     ON %I.orders(created_at DESC)', p_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_img_product        ON %I.product_images(product_id)', p_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_carousel_order     ON %I.carousel_slides(display_order)', p_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_payment_order      ON %I.payment_methods(display_order)', p_schema);

    -- ========== Grants para roles do PostgREST ==========
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO anon, authenticated, admin, viewer', p_schema);
    EXECUTE format('GRANT SELECT ON ALL TABLES IN SCHEMA %I TO anon', p_schema);
    EXECUTE format('GRANT ALL    ON ALL TABLES IN SCHEMA %I TO admin', p_schema);
    EXECUTE format('GRANT SELECT ON ALL TABLES IN SCHEMA %I TO viewer', p_schema);
    EXECUTE format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA %I TO admin', p_schema);
    EXECUTE format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA %I TO anon', p_schema);

    RAISE NOTICE '✔ Schema "%" criado com sucesso.', p_schema;
END;
$_$;


ALTER FUNCTION master.create_tenant_schema(p_schema text) OWNER TO postgres;

--
-- Name: grant_tenant_permissions(text); Type: FUNCTION; Schema: master; Owner: postgres
--

CREATE FUNCTION master.grant_tenant_permissions(p_schema text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $_$
BEGIN
    -- Validar schema
    IF p_schema !~ '^[a-z][a-z0-9_]*$' THEN
        RAISE EXCEPTION 'Nome de schema inválido: %', p_schema;
    END IF;

    -- USAGE no schema
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO anon, authenticated, admin, viewer', p_schema);

    -- SELECT para todos (catálogo público)
    EXECUTE format('GRANT SELECT ON ALL TABLES IN SCHEMA %I TO anon, authenticated, admin, viewer', p_schema);

    -- INSERT, UPDATE, DELETE apenas para admin
    EXECUTE format('GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA %I TO admin', p_schema);

    -- Sequences (para orders_seq, etc)
    EXECUTE format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA %I TO admin', p_schema);

    -- Garantir que futuras tabelas herdem as permissões
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT SELECT ON TABLES TO anon, authenticated, admin, viewer', p_schema);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT INSERT, UPDATE, DELETE ON TABLES TO admin', p_schema);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT USAGE, SELECT ON SEQUENCES TO admin', p_schema);

    RAISE NOTICE 'Permissões aplicadas no schema: %', p_schema;
END;
$_$;


ALTER FUNCTION master.grant_tenant_permissions(p_schema text) OWNER TO postgres;

--
-- Name: FUNCTION grant_tenant_permissions(p_schema text); Type: COMMENT; Schema: master; Owner: postgres
--

COMMENT ON FUNCTION master.grant_tenant_permissions(p_schema text) IS 'Aplica grants necessários em um schema de tenant para as roles do PostgREST.';


--
-- Name: login(text, text); Type: FUNCTION; Schema: master; Owner: postgres
--

CREATE FUNCTION master.login(p_email text, p_password text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_user    master.tenant_users%ROWTYPE;
    v_tenant  master.tenants%ROWTYPE;
    v_secret  TEXT;
    v_token   TEXT;
BEGIN
    -- Buscar usuário
    SELECT * INTO v_user
    FROM master.tenant_users
    WHERE email = p_email AND active = TRUE;

    IF NOT FOUND OR v_user.password_hash <> crypt(p_password, v_user.password_hash) THEN
        RAISE EXCEPTION 'Credenciais inválidas'
            USING ERRCODE = '28P01', HINT = 'Email ou senha incorretos';
    END IF;

    -- Buscar tenant
    SELECT * INTO v_tenant
    FROM master.tenants
    WHERE id = v_user.tenant_id AND active = TRUE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Tenant inativo ou inexistente'
            USING ERRCODE = '28000';
    END IF;

    -- Obter JWT secret
    v_secret := current_setting('app.jwt_secret');

    -- Gerar JWT com claim 'tenant' (IMPORTANTE!)
    v_token := jwt.sign(
        json_build_object(
            'role',     v_user.role,
            'tenant',   v_tenant.db_schema,  -- Claim usado por set_tenant()
            'user_id',  v_user.id,
            'tenant_id', v_tenant.id,
            'exp',      extract(epoch FROM NOW() + interval '8 hours')::integer
        ),
        v_secret
    );

    -- Retornar token e informações do tenant
    RETURN json_build_object(
        'token',         v_token,
        'user_id',       v_user.id,
        'tenant_id',     v_tenant.id,
        'tenant_slug',   v_tenant.slug,
        'display_name',  v_tenant.display_name,
        'logo_url',      v_tenant.logo_url,
        'primary_color', v_tenant.primary_color,
        'role',          v_user.role
    );
END;
$$;


ALTER FUNCTION master.login(p_email text, p_password text) OWNER TO postgres;

--
-- Name: FUNCTION login(p_email text, p_password text); Type: COMMENT; Schema: master; Owner: postgres
--

COMMENT ON FUNCTION master.login(p_email text, p_password text) IS 'Autentica usuário e retorna JWT com claim "tenant" para multi-tenancy dinâmico.';


--
-- Name: provision_tenant(text, text, text, text, text, text); Type: FUNCTION; Schema: master; Owner: postgres
--

CREATE FUNCTION master.provision_tenant(p_slug text, p_display_name text, p_whatsapp text, p_primary_color text DEFAULT '#2563eb'::text, p_admin_email text DEFAULT NULL::text, p_admin_password text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $_$
DECLARE
    v_tenant_id UUID;
    v_schema TEXT;
    v_result JSON;
BEGIN
    -- Validar slug
    IF p_slug !~ '^[a-z][a-z0-9_-]*$' THEN
        RAISE EXCEPTION 'Slug inválido: %. Use apenas letras minúsculas, números, - ou _', p_slug
            USING ERRCODE = '22023';
    END IF;

    -- Verificar se já existe
    IF EXISTS (SELECT 1 FROM master.tenants WHERE slug = p_slug) THEN
        RAISE EXCEPTION 'Tenant com slug "%" já existe', p_slug
            USING ERRCODE = '23505';
    END IF;

    -- Schema = slug (normalizado)
    v_schema := p_slug;

    -- PASSO 1: Registrar tenant no master
    INSERT INTO master.tenants (slug, display_name, db_schema, whatsapp, primary_color)
    VALUES (p_slug, p_display_name, v_schema, p_whatsapp, p_primary_color)
    RETURNING id INTO v_tenant_id;

    -- PASSO 2: Criar schema e tabelas
    PERFORM master.create_tenant_schema(v_schema);

    -- PASSO 3: Aplicar grants automaticamente
    PERFORM master.grant_tenant_permissions(v_schema);

    -- PASSO 4: Popular brand_settings
    EXECUTE format('
        INSERT INTO %I.brand_settings (company_name, whatsapp, primary_color)
        VALUES ($1, $2, $3)
    ', v_schema) USING p_display_name, p_whatsapp, p_primary_color;

    -- PASSO 5: Dados iniciais
    EXECUTE format('
        INSERT INTO %I.categories (name, sort_order) VALUES
            (''Eletrônicos'', 1),
            (''Acessórios'', 2),
            (''Vestuário'', 3),
            (''Casa e Decoração'', 4),
            (''Esportes'', 5)
    ', v_schema);

    EXECUTE format('
        INSERT INTO %I.payment_methods (name, is_active, display_order) VALUES
            (''Pix'', TRUE, 1),
            (''Dinheiro'', TRUE, 2),
            (''Cartão de Crédito'', TRUE, 3),
            (''Cartão de Débito'', TRUE, 4)
    ', v_schema);

    EXECUTE format('
        INSERT INTO %I.whatsapp_settings (phone_number, label, is_active) VALUES
            ($1, ''Principal'', TRUE)
    ', v_schema) USING p_whatsapp;

    EXECUTE format('
        INSERT INTO %I.carousel_slides (title, subtitle, cta_text, bg_gradient, display_order, is_active) VALUES
            (''Bem-vindo à '' || $1, ''Confira nossos produtos'', ''Ver Catálogo'', 
             ''from-blue-600 via-blue-500 to-cyan-400'', 1, TRUE)
    ', v_schema) USING p_display_name;

    -- PASSO 6: Criar admin user (se fornecido)
    IF p_admin_email IS NOT NULL AND p_admin_password IS NOT NULL THEN
        INSERT INTO master.tenant_users (tenant_id, email, password_hash, role)
        VALUES (
            v_tenant_id,
            p_admin_email,
            crypt(p_admin_password, gen_salt('bf')),
            'admin'
        );
    END IF;

    -- PASSO 7: Notificar PostgREST para recarregar schema cache
    PERFORM pg_notify('pgrst', 'reload schema');

    -- Retornar informações do tenant criado
    v_result := json_build_object(
        'success', TRUE,
        'tenant_id', v_tenant_id,
        'slug', p_slug,
        'schema', v_schema,
        'display_name', p_display_name,
        'admin_created', (p_admin_email IS NOT NULL),
        'message', 'Tenant criado com sucesso! Acesse: /' || p_slug || '/'
    );

    RAISE NOTICE 'Tenant % criado com sucesso!', p_slug;
    
    RETURN v_result;
END;
$_$;


ALTER FUNCTION master.provision_tenant(p_slug text, p_display_name text, p_whatsapp text, p_primary_color text, p_admin_email text, p_admin_password text) OWNER TO postgres;

--
-- Name: FUNCTION provision_tenant(p_slug text, p_display_name text, p_whatsapp text, p_primary_color text, p_admin_email text, p_admin_password text); Type: COMMENT; Schema: master; Owner: postgres
--

COMMENT ON FUNCTION master.provision_tenant(p_slug text, p_display_name text, p_whatsapp text, p_primary_color text, p_admin_email text, p_admin_password text) IS 'Provisiona um novo tenant completo: schema, tabelas, dados iniciais e admin user.
Notifica PostgREST automaticamente via pg_notify para recarregar schema cache.';


--
-- Name: run_migration_all_tenants(text); Type: FUNCTION; Schema: master; Owner: postgres
--

CREATE FUNCTION master.run_migration_all_tenants(p_sql_template text) RETURNS TABLE(schema_name text, success boolean, error_msg text)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_tenant  RECORD;
    v_sql     TEXT;
BEGIN
    FOR v_tenant IN SELECT db_schema FROM master.tenants WHERE active = TRUE LOOP
        BEGIN
            v_sql := replace(p_sql_template, '{schema}', v_tenant.db_schema);
            EXECUTE v_sql;
            schema_name := v_tenant.db_schema;
            success     := TRUE;
            error_msg   := NULL;
            RETURN NEXT;
        EXCEPTION WHEN OTHERS THEN
            schema_name := v_tenant.db_schema;
            success     := FALSE;
            error_msg   := SQLERRM;
            RETURN NEXT;
        END;
    END LOOP;
END;
$$;


ALTER FUNCTION master.run_migration_all_tenants(p_sql_template text) OWNER TO postgres;

--
-- Name: set_tenant_schema(); Type: FUNCTION; Schema: master; Owner: postgres
--

CREATE FUNCTION master.set_tenant_schema() RETURNS void
    LANGUAGE plpgsql
    AS $_$
DECLARE
    v_schema TEXT;
    v_claims JSON;
BEGIN
    BEGIN
        v_claims := current_setting('request.jwt.claims', TRUE)::JSON;
        v_schema := v_claims->>'tenant_schema';
    EXCEPTION WHEN OTHERS THEN
        v_schema := NULL;
    END;

    IF v_schema IS NOT NULL AND v_schema <> '' AND v_schema ~ '^[a-z][a-z0-9_]*$' THEN
        EXECUTE 'SET LOCAL search_path TO '
            || quote_ident(v_schema) || ', master, public';
    END IF;
END;
$_$;


ALTER FUNCTION master.set_tenant_schema() OWNER TO postgres;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: master; Owner: postgres
--

CREATE FUNCTION master.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;


ALTER FUNCTION master.set_updated_at() OWNER TO postgres;

--
-- Name: set_tenant(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_tenant() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $_$
DECLARE
    v_tenant TEXT;
    v_profile TEXT;
BEGIN
    -- Método 1: Tentar extrair tenant do JWT (requests autenticados)
    BEGIN
        v_tenant := current_setting('request.jwt.claims', TRUE)::JSON->>'tenant';
    EXCEPTION WHEN OTHERS THEN
        v_tenant := NULL;
    END;

    -- Método 2: Se não tem JWT, usar Accept-Profile header (catálogo público)
    IF v_tenant IS NULL OR v_tenant = '' THEN
        BEGIN
            v_profile := current_setting('request.headers', TRUE)::JSON->>'accept-profile';
            IF v_profile IS NOT NULL AND v_profile <> '' AND v_profile <> 'master' THEN
                v_tenant := v_profile;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_tenant := NULL;
        END;
    END IF;

    -- Se tenant foi identificado, definir search_path
    IF v_tenant IS NOT NULL AND v_tenant <> '' THEN
        -- Validar nome do schema (segurança)
        IF v_tenant !~ '^[a-z][a-z0-9_]*$' THEN
            RAISE EXCEPTION 'Nome de tenant inválido: %', v_tenant
                USING ERRCODE = '42602';
        END IF;

        -- Verificar se schema existe
        IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = v_tenant) THEN
            RAISE EXCEPTION 'Schema do tenant não existe: %', v_tenant
                USING ERRCODE = '3F000';
        END IF;

        -- Definir search_path dinamicamente
        EXECUTE format('SET LOCAL search_path TO %I, master, public', v_tenant);
    ELSE
        -- Sem tenant: usar master e public (landing page)
        SET LOCAL search_path TO master, public;
    END IF;
END;
$_$;


ALTER FUNCTION public.set_tenant() OWNER TO postgres;

--
-- Name: FUNCTION set_tenant(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.set_tenant() IS 'Define dinamicamente o search_path baseado no JWT claim "tenant". 
Chamada automaticamente pelo PostgREST via db-pre-request.';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: brand_settings; Type: TABLE; Schema: demo; Owner: postgres
--

CREATE TABLE demo.brand_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_name text DEFAULT 'Minha Empresa'::text NOT NULL,
    logo_url text,
    whatsapp text DEFAULT ''::text NOT NULL,
    primary_color text DEFAULT '#000000'::text NOT NULL,
    secondary_color text DEFAULT '#ffffff'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE demo.brand_settings OWNER TO postgres;

--
-- Name: carousel_slides; Type: TABLE; Schema: demo; Owner: postgres
--

CREATE TABLE demo.carousel_slides (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    subtitle text,
    cta_text text,
    image_url text,
    bg_gradient text,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE demo.carousel_slides OWNER TO postgres;

--
-- Name: categories; Type: TABLE; Schema: demo; Owner: postgres
--

CREATE TABLE demo.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE demo.categories OWNER TO postgres;

--
-- Name: orders_seq; Type: SEQUENCE; Schema: demo; Owner: postgres
--

CREATE SEQUENCE demo.orders_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE demo.orders_seq OWNER TO postgres;

--
-- Name: orders; Type: TABLE; Schema: demo; Owner: postgres
--

CREATE TABLE demo.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_number integer DEFAULT nextval('demo.orders_seq'::regclass) NOT NULL,
    customer_name text NOT NULL,
    company_name text DEFAULT ''::text NOT NULL,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    total numeric DEFAULT 0 NOT NULL,
    whatsapp_number text,
    payment_method text,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'cancelled'::text]))),
    CONSTRAINT orders_total_check CHECK ((total >= (0)::numeric))
);


ALTER TABLE demo.orders OWNER TO postgres;

--
-- Name: payment_methods; Type: TABLE; Schema: demo; Owner: postgres
--

CREATE TABLE demo.payment_methods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE demo.payment_methods OWNER TO postgres;

--
-- Name: product_images; Type: TABLE; Schema: demo; Owner: postgres
--

CREATE TABLE demo.product_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    image_url text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE demo.product_images OWNER TO postgres;

--
-- Name: products; Type: TABLE; Schema: demo; Owner: postgres
--

CREATE TABLE demo.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    description text,
    price numeric DEFAULT 0 NOT NULL,
    stock_quantity integer DEFAULT 0 NOT NULL,
    category_id uuid,
    image_url text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT products_price_check CHECK ((price >= (0)::numeric)),
    CONSTRAINT products_stock_quantity_check CHECK ((stock_quantity >= 0))
);


ALTER TABLE demo.products OWNER TO postgres;

--
-- Name: whatsapp_settings; Type: TABLE; Schema: demo; Owner: postgres
--

CREATE TABLE demo.whatsapp_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    phone_number text NOT NULL,
    label text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE demo.whatsapp_settings OWNER TO postgres;

--
-- Name: tenant_users; Type: TABLE; Schema: master; Owner: postgres
--

CREATE TABLE master.tenant_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    role text DEFAULT 'admin'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tenant_users_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'viewer'::text])))
);


ALTER TABLE master.tenant_users OWNER TO postgres;

--
-- Name: tenants; Type: TABLE; Schema: master; Owner: postgres
--

CREATE TABLE master.tenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    display_name text NOT NULL,
    db_schema text NOT NULL,
    whatsapp text NOT NULL,
    logo_url text,
    primary_color text DEFAULT '#000000'::text NOT NULL,
    secondary_color text DEFAULT '#ffffff'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE master.tenants OWNER TO postgres;

--
-- Data for Name: brand_settings; Type: TABLE DATA; Schema: demo; Owner: postgres
--

COPY demo.brand_settings (id, company_name, logo_url, whatsapp, primary_color, secondary_color, created_at, updated_at) FROM stdin;
2af933c5-a185-469a-89b5-3bbc9e924ccb	Loja Demo	\N	5511999999999	#2563eb	#ffffff	2026-03-16 18:31:33.208632+00	2026-03-16 18:31:33.208632+00
\.


--
-- Data for Name: carousel_slides; Type: TABLE DATA; Schema: demo; Owner: postgres
--

COPY demo.carousel_slides (id, title, subtitle, cta_text, image_url, bg_gradient, display_order, is_active, created_at, updated_at) FROM stdin;
7c458ad9-6fa3-498a-9741-07a88e918249	Bem-vindo à Loja Demo	Confira nossos produtos	Ver Catálogo	\N	from-blue-600 via-blue-500 to-cyan-400	1	t	2026-03-16 18:31:33.22371+00	2026-03-16 18:31:33.22371+00
15f5a218-cf1b-4164-9d5e-113a08c2d2c9	Guerra do Vietnã	Devs no Vietnã	Boom	https://pub-86116ea264a24fd193d4c779daa34706.r2.dev/newcatalogo/demo/banners/1773833503935-115366.jpg	from-red-600 via-red-500 to-orange-400	99	t	2026-03-18 11:31:47.164182+00	2026-03-18 11:31:47.164182+00
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: demo; Owner: postgres
--

COPY demo.categories (id, name, sort_order, created_at) FROM stdin;
44520c69-5268-4720-a821-e4e63f937f2b	Eletrônicos	1	2026-03-16 18:31:33.218105+00
fe5f9916-817f-496a-b03f-873b2ea13524	Acessórios	2	2026-03-16 18:31:33.218105+00
9b836660-7e20-42b9-8a15-75bbc8ac02a0	Vestuário	3	2026-03-16 18:31:33.218105+00
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: demo; Owner: postgres
--

COPY demo.orders (id, order_number, customer_name, company_name, items, total, whatsapp_number, payment_method, status, notes, created_at) FROM stdin;
\.


--
-- Data for Name: payment_methods; Type: TABLE DATA; Schema: demo; Owner: postgres
--

COPY demo.payment_methods (id, name, is_active, display_order, created_at) FROM stdin;
1b75265e-78a3-471c-bbf5-6b6f1685203f	Pix	t	1	2026-03-16 18:31:33.220524+00
21aa80c9-5717-44c0-b79b-c737c651e0a8	Dinheiro	t	2	2026-03-16 18:31:33.220524+00
4090e52f-8e44-4ba7-86c5-73de53124553	Cartão de Crédito	t	3	2026-03-16 18:31:33.220524+00
f814be19-42a7-4fb5-82a7-b5a45ee0cc36	Cartão de Débito	t	4	2026-03-16 18:31:33.220524+00
\.


--
-- Data for Name: product_images; Type: TABLE DATA; Schema: demo; Owner: postgres
--

COPY demo.product_images (id, product_id, image_url, display_order, created_at) FROM stdin;
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: demo; Owner: postgres
--

COPY demo.products (id, name, code, description, price, stock_quantity, category_id, image_url, is_active, created_at, updated_at) FROM stdin;
5ce027fc-fedd-4d9f-9efe-8ebb9d373a9a	abc	123	aaa	50	10	44520c69-5268-4720-a821-e4e63f937f2b	https://pub-86116ea264a24fd193d4c779daa34706.r2.dev/newcatalogo/demo/product-images/1773771434036-Gemini_Generated_Image_nyp2pvnyp2pvnyp2.png	t	2026-03-17 18:17:18.963811+00	2026-03-17 18:17:18.963811+00
46df166c-b8d0-4263-a582-07e5736376d2	Produto teste 2	228465	teste	50	5	fe5f9916-817f-496a-b03f-873b2ea13524	https://pub-86116ea264a24fd193d4c779daa34706.r2.dev/newcatalogo/demo/product-images/1773773657315-outros_Raphael.jpg	t	2026-03-17 18:54:20.00649+00	2026-03-17 18:54:20.00649+00
\.


--
-- Data for Name: whatsapp_settings; Type: TABLE DATA; Schema: demo; Owner: postgres
--

COPY demo.whatsapp_settings (id, phone_number, label, is_active, created_at) FROM stdin;
2c81c9e2-363f-4f32-9bf7-f579c460baad	5511999999999	Principal	t	2026-03-16 18:31:33.221946+00
\.


--
-- Data for Name: tenant_users; Type: TABLE DATA; Schema: master; Owner: postgres
--

COPY master.tenant_users (id, tenant_id, email, password_hash, role, active, created_at, updated_at) FROM stdin;
afbc829f-ec93-4098-b2f5-35701f241a9d	5ff834eb-9769-4039-a83c-07609e73da27	admin@demo.com	$2a$06$8OivmkZPnrkTn1J9d.zSm.dme4qUmVJyWPxih/rDOgA8.X5MQjHs6	admin	t	2026-03-16 18:31:33.211081+00	2026-03-16 18:31:33.211081+00
\.


--
-- Data for Name: tenants; Type: TABLE DATA; Schema: master; Owner: postgres
--

COPY master.tenants (id, slug, display_name, db_schema, whatsapp, logo_url, primary_color, secondary_color, active, created_at, updated_at) FROM stdin;
5ff834eb-9769-4039-a83c-07609e73da27	demo	Loja Demo	demo	5511999999999	\N	#2563eb	#ffffff	t	2026-03-16 18:31:33.081933+00	2026-03-16 18:31:33.081933+00
\.


--
-- Name: orders_seq; Type: SEQUENCE SET; Schema: demo; Owner: postgres
--

SELECT pg_catalog.setval('demo.orders_seq', 1, false);


--
-- Name: brand_settings brand_settings_pkey; Type: CONSTRAINT; Schema: demo; Owner: postgres
--

ALTER TABLE ONLY demo.brand_settings
    ADD CONSTRAINT brand_settings_pkey PRIMARY KEY (id);


--
-- Name: carousel_slides carousel_slides_pkey; Type: CONSTRAINT; Schema: demo; Owner: postgres
--

ALTER TABLE ONLY demo.carousel_slides
    ADD CONSTRAINT carousel_slides_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: demo; Owner: postgres
--

ALTER TABLE ONLY demo.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: demo; Owner: postgres
--

ALTER TABLE ONLY demo.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: payment_methods payment_methods_pkey; Type: CONSTRAINT; Schema: demo; Owner: postgres
--

ALTER TABLE ONLY demo.payment_methods
    ADD CONSTRAINT payment_methods_pkey PRIMARY KEY (id);


--
-- Name: product_images product_images_pkey; Type: CONSTRAINT; Schema: demo; Owner: postgres
--

ALTER TABLE ONLY demo.product_images
    ADD CONSTRAINT product_images_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: demo; Owner: postgres
--

ALTER TABLE ONLY demo.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_settings whatsapp_settings_pkey; Type: CONSTRAINT; Schema: demo; Owner: postgres
--

ALTER TABLE ONLY demo.whatsapp_settings
    ADD CONSTRAINT whatsapp_settings_pkey PRIMARY KEY (id);


--
-- Name: tenant_users tenant_users_pkey; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.tenant_users
    ADD CONSTRAINT tenant_users_pkey PRIMARY KEY (id);


--
-- Name: tenant_users tenant_users_tenant_id_email_key; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.tenant_users
    ADD CONSTRAINT tenant_users_tenant_id_email_key UNIQUE (tenant_id, email);


--
-- Name: tenants tenants_db_schema_key; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.tenants
    ADD CONSTRAINT tenants_db_schema_key UNIQUE (db_schema);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_slug_key; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.tenants
    ADD CONSTRAINT tenants_slug_key UNIQUE (slug);


--
-- Name: idx_carousel_order; Type: INDEX; Schema: demo; Owner: postgres
--

CREATE INDEX idx_carousel_order ON demo.carousel_slides USING btree (display_order);


--
-- Name: idx_img_product; Type: INDEX; Schema: demo; Owner: postgres
--

CREATE INDEX idx_img_product ON demo.product_images USING btree (product_id);


--
-- Name: idx_orders_created; Type: INDEX; Schema: demo; Owner: postgres
--

CREATE INDEX idx_orders_created ON demo.orders USING btree (created_at DESC);


--
-- Name: idx_orders_status; Type: INDEX; Schema: demo; Owner: postgres
--

CREATE INDEX idx_orders_status ON demo.orders USING btree (status);


--
-- Name: idx_payment_order; Type: INDEX; Schema: demo; Owner: postgres
--

CREATE INDEX idx_payment_order ON demo.payment_methods USING btree (display_order);


--
-- Name: idx_products_active; Type: INDEX; Schema: demo; Owner: postgres
--

CREATE INDEX idx_products_active ON demo.products USING btree (is_active);


--
-- Name: idx_products_category; Type: INDEX; Schema: demo; Owner: postgres
--

CREATE INDEX idx_products_category ON demo.products USING btree (category_id);


--
-- Name: idx_products_code; Type: INDEX; Schema: demo; Owner: postgres
--

CREATE INDEX idx_products_code ON demo.products USING btree (code);


--
-- Name: brand_settings trg_brand_updated_at; Type: TRIGGER; Schema: demo; Owner: postgres
--

CREATE TRIGGER trg_brand_updated_at BEFORE UPDATE ON demo.brand_settings FOR EACH ROW EXECUTE FUNCTION demo.set_updated_at();


--
-- Name: carousel_slides trg_carousel_updated_at; Type: TRIGGER; Schema: demo; Owner: postgres
--

CREATE TRIGGER trg_carousel_updated_at BEFORE UPDATE ON demo.carousel_slides FOR EACH ROW EXECUTE FUNCTION demo.set_updated_at();


--
-- Name: products trg_products_updated_at; Type: TRIGGER; Schema: demo; Owner: postgres
--

CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON demo.products FOR EACH ROW EXECUTE FUNCTION demo.set_updated_at();


--
-- Name: tenant_users trg_tenant_users_updated_at; Type: TRIGGER; Schema: master; Owner: postgres
--

CREATE TRIGGER trg_tenant_users_updated_at BEFORE UPDATE ON master.tenant_users FOR EACH ROW EXECUTE FUNCTION master.set_updated_at();


--
-- Name: tenants trg_tenants_updated_at; Type: TRIGGER; Schema: master; Owner: postgres
--

CREATE TRIGGER trg_tenants_updated_at BEFORE UPDATE ON master.tenants FOR EACH ROW EXECUTE FUNCTION master.set_updated_at();


--
-- Name: product_images product_images_product_id_fkey; Type: FK CONSTRAINT; Schema: demo; Owner: postgres
--

ALTER TABLE ONLY demo.product_images
    ADD CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES demo.products(id) ON DELETE CASCADE;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: demo; Owner: postgres
--

ALTER TABLE ONLY demo.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES demo.categories(id) ON DELETE SET NULL;


--
-- Name: tenant_users tenant_users_tenant_id_fkey; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.tenant_users
    ADD CONSTRAINT tenant_users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES master.tenants(id) ON DELETE CASCADE;


--
-- Name: SCHEMA demo; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA demo TO anon;
GRANT USAGE ON SCHEMA demo TO authenticated;
GRANT USAGE ON SCHEMA demo TO admin;
GRANT USAGE ON SCHEMA demo TO viewer;


--
-- Name: SCHEMA jwt; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA jwt TO anon;
GRANT USAGE ON SCHEMA jwt TO authenticated;
GRANT USAGE ON SCHEMA jwt TO admin;
GRANT USAGE ON SCHEMA jwt TO viewer;


--
-- Name: SCHEMA master; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA master TO anon;
GRANT USAGE ON SCHEMA master TO authenticated;
GRANT USAGE ON SCHEMA master TO admin;
GRANT USAGE ON SCHEMA master TO viewer;


--
-- Name: FUNCTION create_admin(p_email text, p_password text); Type: ACL; Schema: master; Owner: postgres
--

GRANT ALL ON FUNCTION master.create_admin(p_email text, p_password text) TO anon;
GRANT ALL ON FUNCTION master.create_admin(p_email text, p_password text) TO admin;


--
-- Name: FUNCTION create_tenant_schema(p_schema text); Type: ACL; Schema: master; Owner: postgres
--

GRANT ALL ON FUNCTION master.create_tenant_schema(p_schema text) TO admin;


--
-- Name: FUNCTION grant_tenant_permissions(p_schema text); Type: ACL; Schema: master; Owner: postgres
--

GRANT ALL ON FUNCTION master.grant_tenant_permissions(p_schema text) TO admin;


--
-- Name: FUNCTION login(p_email text, p_password text); Type: ACL; Schema: master; Owner: postgres
--

GRANT ALL ON FUNCTION master.login(p_email text, p_password text) TO anon;


--
-- Name: FUNCTION provision_tenant(p_slug text, p_display_name text, p_whatsapp text, p_primary_color text, p_admin_email text, p_admin_password text); Type: ACL; Schema: master; Owner: postgres
--

GRANT ALL ON FUNCTION master.provision_tenant(p_slug text, p_display_name text, p_whatsapp text, p_primary_color text, p_admin_email text, p_admin_password text) TO admin;


--
-- Name: FUNCTION set_tenant_schema(); Type: ACL; Schema: master; Owner: postgres
--

GRANT ALL ON FUNCTION master.set_tenant_schema() TO anon;
GRANT ALL ON FUNCTION master.set_tenant_schema() TO authenticated;
GRANT ALL ON FUNCTION master.set_tenant_schema() TO admin;
GRANT ALL ON FUNCTION master.set_tenant_schema() TO viewer;


--
-- Name: FUNCTION set_tenant(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.set_tenant() TO anon;
GRANT ALL ON FUNCTION public.set_tenant() TO authenticated;
GRANT ALL ON FUNCTION public.set_tenant() TO admin;
GRANT ALL ON FUNCTION public.set_tenant() TO viewer;


--
-- Name: TABLE brand_settings; Type: ACL; Schema: demo; Owner: postgres
--

GRANT SELECT ON TABLE demo.brand_settings TO anon;
GRANT ALL ON TABLE demo.brand_settings TO admin;
GRANT SELECT ON TABLE demo.brand_settings TO viewer;
GRANT SELECT ON TABLE demo.brand_settings TO authenticated;


--
-- Name: TABLE carousel_slides; Type: ACL; Schema: demo; Owner: postgres
--

GRANT SELECT ON TABLE demo.carousel_slides TO anon;
GRANT ALL ON TABLE demo.carousel_slides TO admin;
GRANT SELECT ON TABLE demo.carousel_slides TO viewer;
GRANT SELECT ON TABLE demo.carousel_slides TO authenticated;


--
-- Name: TABLE categories; Type: ACL; Schema: demo; Owner: postgres
--

GRANT SELECT ON TABLE demo.categories TO anon;
GRANT ALL ON TABLE demo.categories TO admin;
GRANT SELECT ON TABLE demo.categories TO viewer;
GRANT SELECT ON TABLE demo.categories TO authenticated;


--
-- Name: SEQUENCE orders_seq; Type: ACL; Schema: demo; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE demo.orders_seq TO admin;
GRANT SELECT,USAGE ON SEQUENCE demo.orders_seq TO anon;


--
-- Name: TABLE orders; Type: ACL; Schema: demo; Owner: postgres
--

GRANT SELECT ON TABLE demo.orders TO anon;
GRANT ALL ON TABLE demo.orders TO admin;
GRANT SELECT ON TABLE demo.orders TO viewer;
GRANT SELECT ON TABLE demo.orders TO authenticated;


--
-- Name: TABLE payment_methods; Type: ACL; Schema: demo; Owner: postgres
--

GRANT SELECT ON TABLE demo.payment_methods TO anon;
GRANT ALL ON TABLE demo.payment_methods TO admin;
GRANT SELECT ON TABLE demo.payment_methods TO viewer;
GRANT SELECT ON TABLE demo.payment_methods TO authenticated;


--
-- Name: TABLE product_images; Type: ACL; Schema: demo; Owner: postgres
--

GRANT SELECT ON TABLE demo.product_images TO anon;
GRANT ALL ON TABLE demo.product_images TO admin;
GRANT SELECT ON TABLE demo.product_images TO viewer;
GRANT SELECT ON TABLE demo.product_images TO authenticated;


--
-- Name: TABLE products; Type: ACL; Schema: demo; Owner: postgres
--

GRANT SELECT ON TABLE demo.products TO anon;
GRANT ALL ON TABLE demo.products TO admin;
GRANT SELECT ON TABLE demo.products TO viewer;
GRANT SELECT ON TABLE demo.products TO authenticated;


--
-- Name: TABLE whatsapp_settings; Type: ACL; Schema: demo; Owner: postgres
--

GRANT SELECT ON TABLE demo.whatsapp_settings TO anon;
GRANT ALL ON TABLE demo.whatsapp_settings TO admin;
GRANT SELECT ON TABLE demo.whatsapp_settings TO viewer;
GRANT SELECT ON TABLE demo.whatsapp_settings TO authenticated;


--
-- Name: TABLE tenant_users; Type: ACL; Schema: master; Owner: postgres
--

GRANT SELECT ON TABLE master.tenant_users TO admin;


--
-- Name: TABLE tenants; Type: ACL; Schema: master; Owner: postgres
--

GRANT SELECT ON TABLE master.tenants TO anon;
GRANT SELECT ON TABLE master.tenants TO authenticated;
GRANT SELECT ON TABLE master.tenants TO admin;
GRANT SELECT ON TABLE master.tenants TO viewer;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: demo; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA demo GRANT SELECT,USAGE ON SEQUENCES  TO admin;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: demo; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA demo GRANT SELECT ON TABLES  TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA demo GRANT SELECT ON TABLES  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA demo GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES  TO admin;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA demo GRANT SELECT ON TABLES  TO viewer;


--
-- PostgreSQL database dump complete
--

\unrestrict vwhgiV1AbcA61c0KRe6t3E3kCIhg7o3IkcxUsH35LMddg8XuQjlDWegX8wgVZGy

