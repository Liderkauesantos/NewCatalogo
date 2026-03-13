# NewCatálogo — Escopo Técnico Completo
> Projeto multi-tenant de catálogo de produtos com pedidos via WhatsApp.
> Backend: PostgreSQL 15 + PostgREST. Sem dependência de Supabase cloud.
> Auth via JWT gerado 100% dentro do PostgreSQL (pgcrypto nativo, sem extensões extras).

---

## 1. Stack Técnica

| Camada         | Tecnologia                                        |
|----------------|---------------------------------------------------|
| Frontend       | React + Vite (export do Lovable)                  |
| API            | PostgREST v12 (instância única)                   |
| Banco          | PostgreSQL 15 — banco `new_catalogo`              |
| Auth           | JWT via funções SQL + pgcrypto (nativo pg15)      |
| Reverse Proxy  | Nginx (roteamento por path `/slug`)               |
| Infra          | Docker Compose (servidor único)                   |

---

## 2. Estrutura de Pastas do Projeto

```
newcatalogo/
├── docker-compose.yml
├── .env
├── Dockerfile.postgres        # não necessário — usa postgres:15 oficial
├── sql/
│   ├── 01-extensions.sql      # pgcrypto
│   ├── 02-jwt.sql             # funções JWT puras (sem pgjwt extension)
│   ├── 03-master-schema.sql   # schema master: tenants, users, login
│   └── 04-roles.sql           # roles PostgreSQL para o PostgREST
├── nginx/
│   └── nginx.conf
└── frontend/
    └── dist/                  # build do React
```

---

## 3. Banco de Dados — Arquitetura

```
banco: new_catalogo
│
├── schema: master              ← controle central (tenants, usuários, auth)
│   ├── tenants
│   ├── tenant_users
│   ├── login()
│   ├── set_tenant_schema()     ← pre-request do PostgREST
│   └── create_tenant_schema()  ← onboarding de novo cliente
│
├── schema: casarossi           ← cliente 1
│   ├── brand_settings
│   ├── categories
│   ├── products
│   ├── product_images
│   └── orders
│
├── schema: castor              ← cliente 2
│   └── (mesma estrutura)
│
└── schema: {slug}              ← N clientes
    └── (mesma estrutura)
```

**Fluxo de roteamento:**
```
URL: www.newcatalogo.com.br/casarossi/produtos
        ↓
Nginx: serve o SPA React (index.html)
        ↓
React: extrai slug "casarossi" do window.location.pathname
        ↓
API request: GET /api/products
  Headers:
    Authorization:  Bearer <jwt_token>
    Accept-Profile: casarossi         ← PostgREST seleciona o schema
        ↓
PostgREST: chama master.set_tenant_schema() antes da query
        ↓
PostgreSQL: SET search_path = casarossi, master, public
        ↓
Query executa isolada no schema do cliente
```

---

## 4. SQL Completo

### 01-extensions.sql

```sql
-- Extensão nativa do postgres:15, nenhuma instalação extra necessária
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

---

### 02-jwt.sql
> Implementação JWT pura em SQL usando apenas pgcrypto.
> Equivalente 100% ao pgjwt mas sem necessidade de compilar extensão.

```sql
CREATE SCHEMA IF NOT EXISTS jwt;

-- Encode Base64 URL-safe (padrão JWT)
CREATE OR REPLACE FUNCTION jwt.url_encode(data BYTEA)
RETURNS TEXT LANGUAGE SQL IMMUTABLE AS $$
  SELECT translate(encode(data, 'base64'), E'+/=\n', '-_');
$$;

-- Assinatura HMAC (suporta HS256, HS384, HS512)
CREATE OR REPLACE FUNCTION jwt.algorithm_sign(
    signables TEXT,
    secret    TEXT,
    algorithm TEXT DEFAULT 'HS256'
)
RETURNS TEXT LANGUAGE SQL IMMUTABLE AS $$
  SELECT jwt.url_encode(
    public.hmac(
      signables,
      secret,
      CASE algorithm
        WHEN 'HS256' THEN 'sha256'
        WHEN 'HS384' THEN 'sha384'
        WHEN 'HS512' THEN 'sha512'
        ELSE RAISE_EXCEPTION('Algoritmo JWT não suportado: ' || algorithm)
      END
    )
  );
$$;

-- Geração do token JWT completo
CREATE OR REPLACE FUNCTION jwt.sign(
    payload   JSON,
    secret    TEXT,
    algorithm TEXT DEFAULT 'HS256'
)
RETURNS TEXT LANGUAGE SQL IMMUTABLE AS $$
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

-- Verificação / decode do token JWT (para validação manual se necessário)
CREATE OR REPLACE FUNCTION jwt.verify(
    token  TEXT,
    secret TEXT,
    algorithm TEXT DEFAULT 'HS256'
)
RETURNS TABLE(header JSON, payload JSON, valid BOOLEAN) LANGUAGE SQL IMMUTABLE AS $$
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
```

---

### 03-master-schema.sql

```sql
-- ============================================================
-- SCHEMA MASTER — Controle central de tenants e autenticação
-- ============================================================
CREATE SCHEMA IF NOT EXISTS master;

-- ----------------------------------------------------------
-- Tabela de clientes (tenants)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS master.tenants (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            TEXT        UNIQUE NOT NULL,         -- "casarossi" (usado na URL e no schema PG)
    display_name    TEXT        NOT NULL,                -- "Casa Rossi" (exibido no frontend)
    db_schema       TEXT        UNIQUE NOT NULL,         -- nome do schema PostgreSQL
    whatsapp        TEXT        NOT NULL,                -- ex: "5516999990000" (destino dos pedidos)
    logo_url        TEXT,
    primary_color   TEXT        NOT NULL DEFAULT '#000000',
    secondary_color TEXT        NOT NULL DEFAULT '#ffffff',
    active          BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------
-- Tabela de usuários (substitui Supabase Auth / GoTrue)
-- Senha armazenada com bcrypt via pgcrypto
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS master.tenant_users (
    id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID    NOT NULL REFERENCES master.tenants(id) ON DELETE CASCADE,
    email         TEXT    NOT NULL,
    password_hash TEXT    NOT NULL,   -- crypt('senha', gen_salt('bf'))
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
-- Retorno:  { token, tenant_slug, display_name, role }
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION master.login(p_email TEXT, p_password TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user    master.tenant_users%ROWTYPE;
    v_tenant  master.tenants%ROWTYPE;
    v_secret  TEXT;
    v_token   TEXT;
BEGIN
    -- Busca usuário ativo
    SELECT * INTO v_user
    FROM master.tenant_users
    WHERE email = p_email AND active = TRUE;

    -- Valida credenciais com bcrypt
    IF NOT FOUND OR v_user.password_hash <> crypt(p_password, v_user.password_hash) THEN
        RAISE EXCEPTION 'Credenciais inválidas'
            USING ERRCODE = '28P01', HINT = 'Email ou senha incorretos';
    END IF;

    -- Busca tenant ativo
    SELECT * INTO v_tenant
    FROM master.tenants
    WHERE id = v_user.tenant_id AND active = TRUE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Tenant inativo ou inexistente'
            USING ERRCODE = '28000';
    END IF;

    -- Lê JWT secret configurado na sessão do PostgREST
    v_secret := current_setting('app.jwt_secret');

    -- Gera JWT com claims que identificam o tenant e o usuário
    v_token := jwt.sign(
        json_build_object(
            'role',          v_user.role,          -- role do PostgREST (mapeado via db-pre-request)
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
-- Executada pelo PostgREST ANTES de cada request autenticado
-- Configurar no postgrest.conf: db-pre-request = master.set_tenant_schema
-- Seta o search_path para o schema do tenant identificado no JWT
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

    -- Só aplica search_path se tiver um schema válido no JWT
    IF v_schema IS NOT NULL AND v_schema <> '' AND v_schema ~ '^[a-z][a-z0-9_]*$' THEN
        EXECUTE 'SET LOCAL search_path TO '
            || quote_ident(v_schema) || ', master, public';
    END IF;
END;
$$;

-- ----------------------------------------------------------
-- FUNÇÃO: master.create_tenant_schema()
-- Cria toda a estrutura de tabelas para um novo cliente
-- Uso: SELECT master.create_tenant_schema('casarossi');
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION master.create_tenant_schema(p_schema TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    -- Valida nome do schema (só letras, números e underline)
    IF p_schema !~ '^[a-z][a-z0-9_]*$' THEN
        RAISE EXCEPTION 'Nome de schema inválido: %', p_schema;
    END IF;

    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', p_schema);

    -- Função de updated_at local ao schema
    EXECUTE format('
        CREATE OR REPLACE FUNCTION %I.set_updated_at()
        RETURNS TRIGGER LANGUAGE plpgsql AS $$
        BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
        $$', p_schema);

    -- brand_settings: customizações visuais do cliente
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

    -- sequence de pedidos isolada por cliente (cada um começa do #1)
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

    -- Triggers de updated_at
    EXECUTE format('
        CREATE TRIGGER trg_brand_updated_at
          BEFORE UPDATE ON %I.brand_settings
          FOR EACH ROW EXECUTE FUNCTION %I.set_updated_at()', p_schema, p_schema);

    EXECUTE format('
        CREATE TRIGGER trg_products_updated_at
          BEFORE UPDATE ON %I.products
          FOR EACH ROW EXECUTE FUNCTION %I.set_updated_at()', p_schema, p_schema);

    -- Índices de performance
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_products_category  ON %I.products(category_id)', p_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_products_active    ON %I.products(is_active)', p_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_products_code      ON %I.products(code)', p_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_orders_status      ON %I.orders(status)', p_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_orders_created     ON %I.orders(created_at DESC)', p_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_img_product        ON %I.product_images(product_id)', p_schema);

    RAISE NOTICE '✔ Schema "%" criado com sucesso.', p_schema;
END;
$$;

-- ----------------------------------------------------------
-- FUNÇÃO: master.run_migration_all_tenants()
-- Executa um DDL em TODOS os schemas de clientes ativos
-- Útil para migrations futuras (ex: nova coluna em products)
-- Uso: SELECT master.run_migration_all_tenants(
--        'ALTER TABLE {schema}.products ADD COLUMN IF NOT EXISTS weight NUMERIC DEFAULT 0'
--      );
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
```

---

### 04-roles.sql
> Roles de acesso que o PostgREST usa internamente.

```sql
-- Role anônimo (requests sem token — acesso ao catálogo público)
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
END $$;

-- Role autenticado (requests com JWT válido)
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END $$;

-- Role do PostgREST (conexão com o banco)
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD '${AUTHENTICATOR_PASSWORD}';
  END IF;
END $$;

GRANT anon          TO authenticator;
GRANT authenticated TO authenticator;
GRANT admin         TO authenticator;
GRANT viewer        TO authenticator;

-- Permissões base no schema master
GRANT USAGE ON SCHEMA master TO anon, authenticated;
GRANT EXECUTE ON FUNCTION master.login(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION master.set_tenant_schema() TO anon, authenticated;

-- Permissão de leitura de brand_settings sem autenticação (para carregar logo/cores na tela de login)
-- (Será complementada por RLS policies no schema de cada tenant)
```

---

## 5. Docker Compose

```yaml
# docker-compose.yml
version: "3.9"

services:

  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB:       new_catalogo
      POSTGRES_USER:     postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./sql/01-extensions.sql:/docker-entrypoint-initdb.d/01-extensions.sql
      - ./sql/02-jwt.sql:/docker-entrypoint-initdb.d/02-jwt.sql
      - ./sql/03-master-schema.sql:/docker-entrypoint-initdb.d/03-master-schema.sql
      - ./sql/04-roles.sql:/docker-entrypoint-initdb.d/04-roles.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d new_catalogo"]
      interval: 10s
      timeout: 5s
      retries: 5

  postgrest:
    image: postgrest/postgrest:v12.0.2
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      PGRST_DB_URI:             postgres://authenticator:${AUTHENTICATOR_PASSWORD}@postgres:5432/new_catalogo
      PGRST_DB_SCHEMAS:         master
      PGRST_DB_ANON_ROLE:       anon
      PGRST_DB_PRE_REQUEST:     master.set_tenant_schema
      PGRST_JWT_SECRET:         ${JWT_SECRET}
      PGRST_DB_EXTRA_SEARCH_PATH: master,public
      PGRST_SERVER_CORS_ALLOWED_ORIGINS: "https://newcatalogo.com.br"
      PGRST_OPENAPI_MODE:       ignore-privileges
    expose:
      - "3000"

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    depends_on:
      - postgrest
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf
      - ./frontend/dist:/usr/share/nginx/html
    ports:
      - "80:80"
      - "443:443"

volumes:
  pgdata:
```

---

## 6. .env (template)

```env
POSTGRES_PASSWORD=troque_esta_senha
AUTHENTICATOR_PASSWORD=troque_esta_senha_tb
JWT_SECRET=chave_jwt_minimo_32_caracteres_aqui
```

---

## 7. Nginx

```nginx
# nginx/nginx.conf
server {
    listen 80;
    server_name newcatalogo.com.br www.newcatalogo.com.br;

    # Redireciona tudo para HTTPS (quando tiver SSL)
    # return 301 https://$host$request_uri;

    # Proxy para o PostgREST
    location /api/ {
        proxy_pass         http://postgrest:3000/;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    # SPA React — qualquer rota (incluindo /casarossi, /castor etc.) cai no index.html
    location / {
        root       /usr/share/nginx/html;
        index      index.html;
        try_files  $uri $uri/ /index.html;
    }
}
```

---

## 8. Adaptações no Frontend (React)

```typescript
// src/hooks/useTenant.ts
// Lê o slug do path: www.site.com/casarossi → "casarossi"
export function useTenant(): string {
  const slug = window.location.pathname.split('/')[1];
  return slug ?? '';
}

// src/lib/api.ts
// Toda request inclui o slug no header Accept-Profile (PostgREST usa isso para selecionar schema)
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nc_token');
  const slug  = window.location.pathname.split('/')[1];

  if (token) {
    config.headers['Authorization']  = `Bearer ${token}`;
  }
  if (slug) {
    config.headers['Accept-Profile']  = slug;  // GET/SELECT → schema do tenant
    config.headers['Content-Profile'] = slug;  // POST/PATCH → schema do tenant
  }

  return config;
});

export default api;

// src/hooks/useLogin.ts
export async function loginTenant(email: string, password: string) {
  const { data } = await api.post('/rpc/login', {
    p_email: email,
    p_password: password,
  });

  localStorage.setItem('nc_token',        data.token);
  localStorage.setItem('nc_tenant_slug',  data.tenant_slug);
  localStorage.setItem('nc_display_name', data.display_name);
  localStorage.setItem('nc_logo_url',     data.logo_url);
  localStorage.setItem('nc_primary_color',data.primary_color);

  return data;
}
```

---

## 9. Onboarding de Novo Cliente

```sql
-- PASSO 1: Registrar o tenant no master
INSERT INTO master.tenants (slug, display_name, db_schema, whatsapp, logo_url, primary_color)
VALUES (
    'casarossi',
    'Casa Rossi',
    'casarossi',
    '5516999990000',
    'https://storage.newcatalogo.com.br/casarossi/logo.png',
    '#c0392b'
);

-- PASSO 2: Criar schema e tabelas do cliente
SELECT master.create_tenant_schema('casarossi');

-- PASSO 3: Popular brand_settings do schema com dados do tenant
INSERT INTO casarossi.brand_settings (company_name, logo_url, whatsapp, primary_color)
SELECT display_name, logo_url, whatsapp, primary_color
FROM master.tenants WHERE slug = 'casarossi';

-- PASSO 4: Criar usuário admin do cliente
INSERT INTO master.tenant_users (tenant_id, email, password_hash, role)
SELECT
    id,
    'admin@casarossi.com.br',
    crypt('senha_inicial_123', gen_salt('bf')),
    'admin'
FROM master.tenants WHERE slug = 'casarossi';

-- PASSO 5: Recarregar PostgREST para reconhecer o novo schema
-- No terminal do servidor:
-- docker kill --signal=SIGUSR1 $(docker ps -qf "name=postgrest")
```

---

## 10. Exemplo de Migration Futura

```sql
-- Adicionar coluna "weight" em products de TODOS os clientes de uma vez
SELECT * FROM master.run_migration_all_tenants(
  'ALTER TABLE {schema}.products ADD COLUMN IF NOT EXISTS weight NUMERIC DEFAULT 0'
);

-- Retorna linha por linha:
-- schema_name | success | error_msg
-- casarossi   | true    | null
-- castor      | true    | null
```

---

## 11. Checklist de Tarefas (Windsurf)

### Infraestrutura
- [ ] Criar repositório e estrutura de pastas
- [ ] Criar `.env` com variáveis de ambiente
- [ ] Criar `docker-compose.yml`
- [ ] Criar arquivos SQL na pasta `sql/` (01 a 04)
- [ ] Subir containers: `docker compose up -d`
- [ ] Verificar logs: `docker compose logs -f`

### Banco de Dados
- [ ] Confirmar criação do schema `master` e funções
- [ ] Rodar onboarding do primeiro cliente (Casa Rossi como piloto)
- [ ] Testar `SELECT master.login('email', 'senha')` direto no psql/DBeaver
- [ ] Validar que o JWT retornado contém os claims corretos

### Frontend
- [ ] Exportar projeto do Lovable
- [ ] Criar `src/hooks/useTenant.ts`
- [ ] Criar/adaptar `src/lib/api.ts` com interceptor
- [ ] Substituir todas as chamadas do Supabase Client por axios + PostgREST
- [ ] Adaptar tela de login para chamar `/rpc/login`
- [ ] Testar roteamento `/casarossi` → catálogo correto
- [ ] Build: `npm run build` → copiar `dist/` para `frontend/dist/`

### Nginx / Infra
- [ ] Criar `nginx/nginx.conf`
- [ ] Testar acesso via `http://localhost/casarossi`
- [ ] Configurar domínio DNS apontando para o servidor
- [ ] Instalar SSL com Certbot (Let's Encrypt)
- [ ] Descomentar redirect HTTP → HTTPS no nginx.conf

### Pós-deploy
- [ ] Criar script CLI de onboarding de novo cliente (automatiza os 5 passos do item 9)
- [ ] Documentar processo de backup do volume `pgdata`
- [ ] Configurar monitoramento básico (uptime check)
- [ ] Testar reload do PostgREST ao adicionar novo tenant (SIGUSR1)

---

## 12. Pontos de Atenção

| # | Ponto | Ação |
|---|-------|------|
| 1 | PostgREST precisa de reload (SIGUSR1) ao cadastrar novo cliente | Automatizar no script de onboarding |
| 2 | JWT secret deve ter mínimo 32 chars e ser gerado aleatoriamente | `openssl rand -base64 32` |
| 3 | `PGRST_SERVER_CORS_ALLOWED_ORIGINS` deve listar o domínio real em produção | Ajustar no `.env` |
| 4 | Senha inicial do cliente deve ser trocada no primeiro acesso | Implementar flag `must_change_password` em `tenant_users` |
| 5 | `brand_settings` e `master.tenants` terão dados duplicados | Definir `brand_settings` como fonte de verdade visual pós-onboarding |
| 6 | Images/logos dos clientes precisam de storage | Usar volume Docker local ou S3/MinIO (recomendado MinIO self-hosted) |
