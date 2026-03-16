#!/bin/bash

# ============================================================
# Script para Listar Todos os Tenants
# ============================================================
# Uso: ./scripts/list-tenants.sh
# ============================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}📋 Listando tenants cadastrados...${NC}"
echo ""

# Verificar se Docker está rodando
if ! docker compose ps | grep -q "postgres.*Up"; then
    echo -e "${RED}❌ Erro: Docker Compose não está rodando${NC}"
    exit 1
fi

# Listar tenants
sudo docker exec newcatalogo-postgres-1 psql -U postgres -d new_catalogo -c "
SELECT 
    slug AS \"Slug\",
    display_name AS \"Nome\",
    whatsapp AS \"WhatsApp\",
    CASE WHEN active THEN '✅ Ativo' ELSE '❌ Inativo' END AS \"Status\",
    to_char(created_at, 'DD/MM/YYYY HH24:MI') AS \"Criado em\"
FROM master.tenants
ORDER BY created_at DESC;
"

echo ""
echo -e "${YELLOW}💡 Para acessar um tenant:${NC}"
echo -e "   http://localhost:8080/{slug}"
echo ""
