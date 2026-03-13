-- ============================================================
-- SEED: Onboarding do primeiro tenant de demonstração
-- Execute após o docker compose estar rodando:
--   docker compose exec postgres psql -U postgres -d new_catalogo -f /seed/06-seed-demo.sql
-- Ou monte este arquivo como volume e rode manualmente.
-- ============================================================

-- PASSO 1: Registrar o tenant no master
INSERT INTO master.tenants (slug, display_name, db_schema, whatsapp, logo_url, primary_color)
VALUES (
    'demo',
    'Loja Demo',
    'demo',
    '5511999999999',
    NULL,
    '#2563eb'
) ON CONFLICT (slug) DO NOTHING;

-- PASSO 2: Criar schema e tabelas do cliente
SELECT master.create_tenant_schema('demo');

-- PASSO 3: Popular brand_settings do schema com dados do tenant
INSERT INTO demo.brand_settings (company_name, logo_url, whatsapp, primary_color)
SELECT display_name, logo_url, whatsapp, primary_color
FROM master.tenants WHERE slug = 'demo'
ON CONFLICT DO NOTHING;

-- PASSO 4: Criar usuário admin do cliente
-- Email: admin@demo.com / Senha: admin123
INSERT INTO master.tenant_users (tenant_id, email, password_hash, role)
SELECT
    id,
    'admin@demo.com',
    crypt('admin123', gen_salt('bf')),
    'admin'
FROM master.tenants WHERE slug = 'demo'
ON CONFLICT (tenant_id, email) DO NOTHING;

-- PASSO 5: Dados iniciais de exemplo

-- Categorias
INSERT INTO demo.categories (name, sort_order) VALUES
    ('Eletrônicos', 1),
    ('Acessórios', 2),
    ('Vestuário', 3)
ON CONFLICT DO NOTHING;

-- Métodos de pagamento
INSERT INTO demo.payment_methods (name, is_active, display_order) VALUES
    ('Pix', TRUE, 1),
    ('Dinheiro', TRUE, 2),
    ('Cartão de Crédito', TRUE, 3),
    ('Cartão de Débito', TRUE, 4)
ON CONFLICT DO NOTHING;

-- WhatsApp
INSERT INTO demo.whatsapp_settings (phone_number, label, is_active) VALUES
    ('5511999999999', 'Principal', TRUE)
ON CONFLICT DO NOTHING;

-- Carousel
INSERT INTO demo.carousel_slides (title, subtitle, cta_text, bg_gradient, display_order, is_active) VALUES
    ('Bem-vindo à Loja Demo', 'Confira nossos produtos', 'Ver Catálogo', 'from-blue-600 via-blue-500 to-cyan-400', 1, TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Após executar, recarregue o PostgREST para reconhecer o novo schema:
--   docker kill --signal=SIGUSR1 $(docker ps -qf "name=postgrest")
-- ============================================================
