#!/bin/bash

# ============================================================
# Script de Criação de Tenant - MULTI-TENANCY DINÂMICO
# ============================================================
# Uso: ./scripts/create-tenant-dynamic.sh
# 
# NOVO: Não precisa mais reiniciar containers!
# Usa master.provision_tenant() + NOTIFY pgrst
# ============================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   🚀 Criar Novo Tenant (Multi-Tenancy Dinâmico)          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
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

# Slug
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
# Criar tenant usando master.provision_tenant()
# ============================================================

echo ""
echo -e "${BLUE}🔨 Criando tenant...${NC}"

# Escapar aspas simples nos parâmetros
DISPLAY_NAME_ESC=$(echo "$DISPLAY_NAME" | sed "s/'/''/g")
ADMIN_PASSWORD_ESC=$(echo "$ADMIN_PASSWORD" | sed "s/'/''/g")

# Executar função SQL
RESULT=$(sudo docker exec newcatalogo-postgres-1 psql -U postgres -d new_catalogo -tAc "
SELECT master.provision_tenant(
    '$SLUG',
    '$DISPLAY_NAME_ESC',
    '$WHATSAPP',
    '$PRIMARY_COLOR',
    '$ADMIN_EMAIL',
    '$ADMIN_PASSWORD_ESC'
);
")

# Verificar resultado
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Tenant criado com sucesso!${NC}"
    echo ""
    echo -e "${BLUE}📊 Resultado:${NC}"
    echo "$RESULT" | python3 -m json.tool 2>/dev/null || echo "$RESULT"
else
    echo -e "${RED}❌ Erro ao criar tenant${NC}"
    exit 1
fi

# ============================================================
# Atualizar PGRST_DB_SCHEMAS e recarregar PostgREST
# ============================================================

echo ""
echo -e "${BLUE}🔄 Atualizando schemas do PostgREST...${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/update-schemas-postgrest.sh" ]; then
    "$SCRIPT_DIR/update-schemas-postgrest.sh"
else
    echo -e "${YELLOW}⚠️  Script update-schemas-postgrest.sh não encontrado${NC}"
    echo -e "${YELLOW}Execute manualmente: ./scripts/update-schemas-postgrest.sh${NC}"
fi

# ============================================================
# Resumo final
# ============================================================

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ Tenant criado com sucesso!                          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📋 Informações de Acesso:${NC}"
echo ""
echo -e "  🌐 URL do Catálogo:"
echo -e "     ${GREEN}http://localhost/$SLUG${NC}"
echo ""
echo -e "  🔐 Painel Admin:"
echo -e "     ${GREEN}http://localhost/$SLUG/admin${NC}"
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
echo -e "${GREEN}✨ Tenant disponível IMEDIATAMENTE (sem restart!)${NC}"
echo ""
