-- ============================================================
-- SCHEMA MASTER — Controle central de tenants e autenticação
-- ============================================================
CREATE SCHEMA IF NOT EXISTS master;

-- ----------------------------------------------------------
-- Tabela de clientes (tenants)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS master.tenants (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            TEXT        UNIQUE NOT NULL,
    display_name    TEXT        NOT NULL,
    db_schema       TEXT        UNIQUE NOT NULL,
    whatsapp        TEXT        NOT NULL,
    logo_url        TEXT,
    primary_color   TEXT        NOT NULL DEFAULT '#000000',
    secondary_color TEXT        NOT NULL DEFAULT '#ffffff',
    active          BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- Tabela de usuários (substitui Supabase Auth)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS master.tenant_users (
    id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID    NOT NULL REFERENCES master.tenants(id) ON DELETE CASCADE,
    email         TEXT    NOT NULL,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL DEFAULT 'admin'
                          CHECK (role IN ('admin', 'viewer')),
    active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, email)
);

-- ----------------------------------------------------------
-- Triggers de updated_at
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION master.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON master.tenants
  FOR EACH ROW EXECUTE FUNCTION master.set_updated_at();

CREATE TRIGGER trg_tenant_users_updated_at
  BEFORE UPDATE ON master.tenant_users
  FOR EACH ROW EXECUTE FUNCTION master.set_updated_at();

-- ----------------------------------------------------------
-- FUNÇÃO: master.login()
-- Endpoint: POST /api/rpc/login
-- Body:     { "p_email": "...", "p_password": "..." }
-- Retorno:  { token, tenant_slug, display_name, role, ... }
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION master.login(p_email TEXT, p_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user    master.tenant_users%ROWTYPE;
    v_tenant  master.tenants%ROWTYPE;
    v_secret  TEXT;
    v_token   TEXT;
BEGIN
    SELECT * INTO v_user
    FROM master.tenant_users
    WHERE email = p_email AND active = TRUE;

    IF NOT FOUND OR v_user.password_hash <> crypt(p_password, v_user.password_hash) THEN
        RAISE EXCEPTION 'Credenciais inválidas'
            USING ERRCODE = '28P01', HINT = 'Email ou senha incorretos';
    END IF;

    SELECT * INTO v_tenant
    FROM master.tenants
    WHERE id = v_user.tenant_id AND active = TRUE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Tenant inativo ou inexistente'
            USING ERRCODE = '28000';
    END IF;

    v_secret := current_setting('app.jwt_secret');

    v_token := jwt.sign(
        json_build_object(
            'role',          v_user.role,
            'tenant_slug',   v_tenant.slug,
            'tenant_schema', v_tenant.db_schema,
            'user_id',       v_user.id,
            'tenant_id',     v_tenant.id,
            'exp',           extract(epoch FROM NOW() + interval '8 hours')::integer
        ),
        v_secret
    );

    RETURN json_build_object(
        'token',        v_token,
        'tenant_slug',  v_tenant.slug,
        'display_name', v_tenant.display_name,
        'logo_url',     v_tenant.logo_url,
        'primary_color',v_tenant.primary_color,
        'role',         v_user.role
    );
END;
$$;

-- ----------------------------------------------------------
-- FUNÇÃO: master.set_tenant_schema()
-- PostgREST pre-request: seta search_path do tenant via JWT
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION master.set_tenant_schema()
RETURNS VOID LANGUAGE plpgsql AS $$
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
$$;

-- ----------------------------------------------------------
-- FUNÇÃO: master.create_tenant_schema()
-- Cria toda a estrutura de tabelas para um novo cliente
-- Inclui TODAS as tabelas usadas pelo frontend:
--   brand_settings, categories, products, product_images,
--   orders, carousel_slides, payment_methods, whatsapp_settings
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION master.create_tenant_schema(p_schema TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
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
$$;

-- ----------------------------------------------------------
-- FUNÇÃO: master.run_migration_all_tenants()
-- Executa um DDL em TODOS os schemas de clientes ativos
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION master.run_migration_all_tenants(p_sql_template TEXT)
RETURNS TABLE(schema_name TEXT, success BOOLEAN, error_msg TEXT)
LANGUAGE plpgsql AS $$
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

-- ----------------------------------------------------------
-- FUNÇÃO: master.create_admin()
-- Endpoint: POST /api/rpc/create_admin
-- Cria um admin para o tenant (usado pela tela AdminSetup)
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION master.create_admin(p_email TEXT, p_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
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
