-- ============================================================
-- MULTI-TENANCY DINÂMICO SEM RESTART DE CONTAINER
-- ============================================================
-- Este arquivo implementa schemas dinâmicos usando JWT claims
-- e db-pre-request do PostgREST.
--
-- IMPORTANTE: Substitui a necessidade de listar schemas fixos
-- no PGRST_DB_SCHEMAS do docker-compose.yml
-- ============================================================

-- ----------------------------------------------------------
-- FUNÇÃO: set_tenant()
-- Chamada automaticamente pelo PostgREST antes de cada request
-- Define o search_path baseado no JWT claim 'tenant'
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION set_tenant()
RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
    v_tenant TEXT;
    v_role TEXT;
BEGIN
    -- Tentar extrair tenant do JWT
    BEGIN
        v_tenant := current_setting('request.jwt.claims', TRUE)::JSON->>'tenant';
        v_role := current_setting('request.jwt.claims', TRUE)::JSON->>'role';
    EXCEPTION WHEN OTHERS THEN
        v_tenant := NULL;
        v_role := NULL;
    END;

    -- Se tenant está presente no JWT, definir search_path
    IF v_tenant IS NOT NULL AND v_tenant <> '' THEN
        -- Validar nome do schema (segurança contra SQL injection)
        IF v_tenant !~ '^[a-z][a-z0-9_]*$' THEN
            RAISE EXCEPTION 'Nome de tenant inválido: %', v_tenant
                USING ERRCODE = '42602';
        END IF;

        -- Verificar se schema existe
        IF NOT EXISTS (
            SELECT 1 FROM pg_namespace WHERE nspname = v_tenant
        ) THEN
            RAISE EXCEPTION 'Schema do tenant não existe: %', v_tenant
                USING ERRCODE = '3F000';
        END IF;

        -- Definir search_path dinamicamente (SEGURO contra SQL injection)
        EXECUTE format('SET LOCAL search_path TO %I, master, public', v_tenant);
        
        RAISE DEBUG 'Search path definido para tenant: %', v_tenant;
    ELSE
        -- Sem tenant no JWT: usar apenas master e public (landing page)
        SET LOCAL search_path TO master, public;
        RAISE DEBUG 'Nenhum tenant no JWT, usando master schema';
    END IF;
END;
$$;

-- Comentário da função
COMMENT ON FUNCTION set_tenant() IS 
'Define dinamicamente o search_path baseado no JWT claim "tenant". 
Chamada automaticamente pelo PostgREST via db-pre-request.';

-- ----------------------------------------------------------
-- FUNÇÃO: master.provision_tenant()
-- Cria um novo tenant completo de forma atômica
-- Inclui: schema, tabelas, grants, dados iniciais
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION master.provision_tenant(
    p_slug            TEXT,
    p_display_name    TEXT,
    p_whatsapp        TEXT,
    p_primary_color   TEXT DEFAULT '#2563eb',
    p_admin_email     TEXT DEFAULT NULL,
    p_admin_password  TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

COMMENT ON FUNCTION master.provision_tenant IS 
'Provisiona um novo tenant completo: schema, tabelas, dados iniciais e admin user.
Notifica PostgREST automaticamente via pg_notify para recarregar schema cache.';

-- ----------------------------------------------------------
-- FUNÇÃO: master.grant_tenant_permissions()
-- Aplica grants necessários em um schema de tenant
-- Chamada automaticamente por provision_tenant()
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION master.grant_tenant_permissions(p_schema TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

COMMENT ON FUNCTION master.grant_tenant_permissions IS 
'Aplica grants necessários em um schema de tenant para as roles do PostgREST.';

-- ----------------------------------------------------------
-- ATUALIZAR FUNÇÃO DE LOGIN
-- Incluir claim 'tenant' no JWT (em vez de 'tenant_schema')
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION master.login(p_email TEXT, p_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
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

COMMENT ON FUNCTION master.login IS 
'Autentica usuário e retorna JWT com claim "tenant" para multi-tenancy dinâmico.';

-- ----------------------------------------------------------
-- GRANTS
-- ----------------------------------------------------------
GRANT EXECUTE ON FUNCTION set_tenant() TO anon, authenticated, admin, viewer;
GRANT EXECUTE ON FUNCTION master.provision_tenant TO admin;
GRANT EXECUTE ON FUNCTION master.grant_tenant_permissions TO admin;

-- ----------------------------------------------------------
-- APLICAR GRANTS EM SCHEMAS EXISTENTES
-- ----------------------------------------------------------
DO $$
DECLARE
    v_schema TEXT;
BEGIN
    FOR v_schema IN 
        SELECT nspname 
        FROM pg_namespace 
        WHERE nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast', 'public', 'jwt', 'master')
        AND nspname NOT LIKE 'pg_%'
    LOOP
        RAISE NOTICE 'Aplicando grants no schema: %', v_schema;
        PERFORM master.grant_tenant_permissions(v_schema);
    END LOOP;
END $$;

-- ----------------------------------------------------------
-- MENSAGEM DE SUCESSO
-- ----------------------------------------------------------
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║  ✅ MULTI-TENANCY DINÂMICO CONFIGURADO COM SUCESSO!      ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Inserção manual:';
    RAISE NOTICE '  SELECT master.provision_tenant(''novoloja'', ''Nova Loja'', ''5511999999999'');';
    RAISE NOTICE '';
END $$;
