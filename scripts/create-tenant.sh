#!/bin/bash

# ============================================================
# Script de Onboarding de Novo Cliente/Tenant
# ============================================================
# Uso: ./scripts/create-tenant.sh
# 
# Este script cria um novo tenant de forma interativa:
# - Registra no master.tenants
# - Cria schema e tabelas
# - Cria usuário admin
# - Popula dados iniciais
# - Recarrega PostgREST
# ============================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   🚀 Onboarding de Novo Cliente/Tenant        ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo ""

# Verificar se Docker está rodando
if ! docker compose ps | grep -q "postgres.*Up"; then
    echo -e "${RED}❌ Erro: Docker Compose não está rodando${NC}"
    echo -e "${YELLOW}Execute: sudo docker compose up -d${NC}"
    exit 1
fi

# ============================================================
# Coletar informações do tenant
# ============================================================

echo -e "${GREEN}📝 Informações do Cliente${NC}"
echo ""

# Slug (identificador único)
while true; do
    read -p "Slug do tenant (ex: casarossi, lojatech): " SLUG
    SLUG=$(echo "$SLUG" | tr '[:upper:]' '[:lower:]' | tr -d ' ')
    
    if [[ ! "$SLUG" =~ ^[a-z0-9_-]+$ ]]; then
        echo -e "${RED}❌ Slug inválido. Use apenas letras minúsculas, números, - ou _${NC}"
        continue
    fi
    
    # Verificar se já existe
    EXISTS=$(sudo docker exec newcatalogo-postgres-1 psql -U postgres -d new_catalogo -tAc \
        "SELECT COUNT(*) FROM master.tenants WHERE slug = '$SLUG'")
    
    if [ "$EXISTS" -gt 0 ]; then
        echo -e "${RED}❌ Tenant '$SLUG' já existe!${NC}"
        continue
    fi
    
    break
done

# Nome de exibição
read -p "Nome da empresa (ex: Casa Rossi): " DISPLAY_NAME

# WhatsApp
while true; do
    read -p "WhatsApp (ex: 5511999999999): " WHATSAPP
    WHATSAPP=$(echo "$WHATSAPP" | tr -d ' ()-')
    
    if [[ "$WHATSAPP" =~ ^[0-9]{10,15}$ ]]; then
        break
    else
        echo -e "${RED}❌ WhatsApp inválido. Digite apenas números (10-15 dígitos)${NC}"
    fi
done

# Cor primária
read -p "Cor primária (hex, ex: #2563eb) [#2563eb]: " PRIMARY_COLOR
PRIMARY_COLOR=${PRIMARY_COLOR:-#2563eb}

# Email do admin
while true; do
    read -p "Email do admin (ex: admin@$SLUG.com): " ADMIN_EMAIL
    
    if [[ "$ADMIN_EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        break
    else
        echo -e "${RED}❌ Email inválido${NC}"
    fi
done

# Senha do admin
while true; do
    read -sp "Senha do admin (mín. 6 caracteres): " ADMIN_PASSWORD
    echo ""
    
    if [ ${#ADMIN_PASSWORD} -lt 6 ]; then
        echo -e "${RED}❌ Senha muito curta. Mínimo 6 caracteres${NC}"
        continue
    fi
    
    read -sp "Confirme a senha: " ADMIN_PASSWORD_CONFIRM
    echo ""
    
    if [ "$ADMIN_PASSWORD" != "$ADMIN_PASSWORD_CONFIRM" ]; then
        echo -e "${RED}❌ Senhas não conferem${NC}"
        continue
    fi
    
    break
done

# ============================================================
# Confirmação
# ============================================================

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Confirme os dados:${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════${NC}"
echo -e "Slug:          ${GREEN}$SLUG${NC}"
echo -e "Empresa:       ${GREEN}$DISPLAY_NAME${NC}"
echo -e "WhatsApp:      ${GREEN}$WHATSAPP${NC}"
echo -e "Cor Primária:  ${GREEN}$PRIMARY_COLOR${NC}"
echo -e "Admin Email:   ${GREEN}$ADMIN_EMAIL${NC}"
echo -e "Admin Senha:   ${GREEN}********${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════${NC}"
echo ""

read -p "Confirma a criação? (s/N): " CONFIRM
if [[ ! "$CONFIRM" =~ ^[sS]$ ]]; then
    echo -e "${RED}❌ Operação cancelada${NC}"
    exit 0
fi

# ============================================================
# Criar SQL temporário
# ============================================================

echo ""
echo -e "${BLUE}🔨 Criando tenant...${NC}"

TEMP_SQL="/tmp/create-tenant-$SLUG.sql"

cat > "$TEMP_SQL" <<EOF
-- ============================================================
-- Onboarding do tenant: $SLUG
-- Gerado automaticamente em $(date)
-- ============================================================

BEGIN;

-- PASSO 1: Registrar tenant no master
INSERT INTO master.tenants (slug, display_name, db_schema, whatsapp, logo_url, primary_color)
VALUES (
    '$SLUG',
    '$DISPLAY_NAME',
    '$SLUG',
    '$WHATSAPP',
    NULL,
    '$PRIMARY_COLOR'
);

-- PASSO 2: Criar schema e tabelas do cliente
SELECT master.create_tenant_schema('$SLUG');

-- PASSO 3: Popular brand_settings
INSERT INTO $SLUG.brand_settings (company_name, logo_url, whatsapp, primary_color)
SELECT display_name, logo_url, whatsapp, primary_color
FROM master.tenants WHERE slug = '$SLUG';

-- PASSO 4: Criar usuário admin
INSERT INTO master.tenant_users (tenant_id, email, password_hash, role)
SELECT
    id,
    '$ADMIN_EMAIL',
    crypt('$ADMIN_PASSWORD', gen_salt('bf')),
    'admin'
FROM master.tenants WHERE slug = '$SLUG';

-- PASSO 5: Dados iniciais

-- Categorias padrão
INSERT INTO $SLUG.categories (name, sort_order) VALUES
    ('Eletrônicos', 1),
    ('Acessórios', 2),
    ('Vestuário', 3),
    ('Casa e Decoração', 4),
    ('Esportes', 5);

-- Métodos de pagamento
INSERT INTO $SLUG.payment_methods (name, is_active, display_order) VALUES
    ('Pix', TRUE, 1),
    ('Dinheiro', TRUE, 2),
    ('Cartão de Crédito', TRUE, 3),
    ('Cartão de Débito', TRUE, 4);

-- WhatsApp
INSERT INTO $SLUG.whatsapp_settings (phone_number, label, is_active) VALUES
    ('$WHATSAPP', 'Principal', TRUE);

-- Carousel inicial
INSERT INTO $SLUG.carousel_slides (title, subtitle, cta_text, bg_gradient, display_order, is_active) VALUES
    ('Bem-vindo à $DISPLAY_NAME', 'Confira nossos produtos', 'Ver Catálogo', 'from-blue-600 via-blue-500 to-cyan-400', 1, TRUE);

COMMIT;

-- Mensagem de sucesso
DO \$\$
BEGIN
    RAISE NOTICE '✅ Tenant % criado com sucesso!', '$SLUG';
    RAISE NOTICE '📧 Admin: %', '$ADMIN_EMAIL';
    RAISE NOTICE '🔗 URL: http://localhost:8080/%', '$SLUG';
END \$\$;
EOF

# ============================================================
# Executar SQL
# ============================================================

echo -e "${BLUE}📊 Executando SQL...${NC}"

if sudo docker exec -i newcatalogo-postgres-1 psql -U postgres -d new_catalogo < "$TEMP_SQL"; then
    echo -e "${GREEN}✅ Tenant criado com sucesso!${NC}"
else
    echo -e "${RED}❌ Erro ao criar tenant${NC}"
    rm -f "$TEMP_SQL"
    exit 1
fi

# Limpar arquivo temporário
rm -f "$TEMP_SQL"

# ============================================================
# Atualizar schemas do PostgREST
# ============================================================

echo -e "${BLUE}🔄 Atualizando schemas do PostgREST...${NC}"

# Obter diretório do script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Executar script de atualização de schemas
if [ -f "$SCRIPT_DIR/update-postgrest-schemas.sh" ]; then
    "$SCRIPT_DIR/update-postgrest-schemas.sh"
else
    # Fallback: apenas recarregar
    POSTGREST_CONTAINER=$(sudo docker ps -qf "name=postgrest")
    if [ -n "$POSTGREST_CONTAINER" ]; then
        sudo docker kill --signal=SIGUSR1 "$POSTGREST_CONTAINER" > /dev/null 2>&1
        echo -e "${GREEN}✅ PostgREST recarregado${NC}"
    fi
fi

# ============================================================
# Resumo final
# ============================================================

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ Tenant criado com sucesso!               ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📋 Informações de Acesso:${NC}"
echo ""
echo -e "  🌐 URL do Catálogo:"
echo -e "     ${GREEN}http://localhost:8080/$SLUG${NC}"
echo ""
echo -e "  🔐 Painel Admin:"
echo -e "     ${GREEN}http://localhost:8080/$SLUG/admin${NC}"
echo ""
echo -e "  📧 Email: ${GREEN}$ADMIN_EMAIL${NC}"
echo -e "  🔑 Senha: ${GREEN}$ADMIN_PASSWORD${NC}"
echo ""
echo -e "${YELLOW}💡 Próximos passos:${NC}"
echo -e "  1. Acesse o painel admin"
echo -e "  2. Configure a logo da empresa"
echo -e "  3. Adicione produtos"
echo -e "  4. Personalize o catálogo"
echo ""
