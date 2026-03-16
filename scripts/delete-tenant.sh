#!/bin/bash

# ============================================================
# Script para Deletar um Tenant
# ============================================================
# Uso: ./scripts/delete-tenant.sh
# 
# ATENÇÃO: Esta operação é IRREVERSÍVEL!
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${RED}╔════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║   ⚠️  DELETAR TENANT (IRREVERSÍVEL)           ║${NC}"
echo -e "${RED}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Verificar se Docker está rodando
if ! docker compose ps | grep -q "postgres.*Up"; then
    echo -e "${RED}❌ Erro: Docker Compose não está rodando${NC}"
    exit 1
fi

# Listar tenants disponíveis
echo -e "${BLUE}📋 Tenants disponíveis:${NC}"
echo ""
sudo docker exec newcatalogo-postgres-1 psql -U postgres -d new_catalogo -tAc "
SELECT slug || ' - ' || display_name FROM master.tenants ORDER BY slug;
"
echo ""

# Solicitar slug
read -p "Digite o slug do tenant a deletar: " SLUG

if [ -z "$SLUG" ]; then
    echo -e "${RED}❌ Slug não pode ser vazio${NC}"
    exit 1
fi

# Verificar se existe
EXISTS=$(sudo docker exec newcatalogo-postgres-1 psql -U postgres -d new_catalogo -tAc \
    "SELECT COUNT(*) FROM master.tenants WHERE slug = '$SLUG'")

if [ "$EXISTS" -eq 0 ]; then
    echo -e "${RED}❌ Tenant '$SLUG' não encontrado${NC}"
    exit 1
fi

# Confirmação dupla
echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════${NC}"
echo -e "${RED}⚠️  ATENÇÃO: Esta operação é IRREVERSÍVEL!${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════${NC}"
echo -e "Você está prestes a deletar o tenant: ${RED}$SLUG${NC}"
echo -e "Isso irá remover:"
echo -e "  - Schema do banco de dados"
echo -e "  - Todos os produtos, categorias, pedidos"
echo -e "  - Usuários admin"
echo -e "  - Configurações da marca"
echo -e "${YELLOW}═══════════════════════════════════════════════${NC}"
echo ""

read -p "Digite 'DELETAR' para confirmar: " CONFIRM
if [ "$CONFIRM" != "DELETAR" ]; then
    echo -e "${GREEN}✅ Operação cancelada${NC}"
    exit 0
fi

read -p "Tem certeza ABSOLUTA? (s/N): " CONFIRM2
if [[ ! "$CONFIRM2" =~ ^[sS]$ ]]; then
    echo -e "${GREEN}✅ Operação cancelada${NC}"
    exit 0
fi

# Deletar tenant
echo ""
echo -e "${BLUE}🗑️  Deletando tenant...${NC}"

TEMP_SQL="/tmp/delete-tenant-$SLUG.sql"

cat > "$TEMP_SQL" <<EOF
BEGIN;

-- Deletar schema (CASCADE remove todas as tabelas)
DROP SCHEMA IF EXISTS $SLUG CASCADE;

-- Deletar registro do tenant (CASCADE remove usuários)
DELETE FROM master.tenants WHERE slug = '$SLUG';

COMMIT;

DO \$\$
BEGIN
    RAISE NOTICE '✅ Tenant % deletado com sucesso', '$SLUG';
END \$\$;
EOF

if sudo docker exec -i newcatalogo-postgres-1 psql -U postgres -d new_catalogo < "$TEMP_SQL"; then
    echo -e "${GREEN}✅ Tenant deletado com sucesso${NC}"
else
    echo -e "${RED}❌ Erro ao deletar tenant${NC}"
    rm -f "$TEMP_SQL"
    exit 1
fi

rm -f "$TEMP_SQL"

# Recarregar PostgREST
echo -e "${BLUE}🔄 Recarregando PostgREST...${NC}"
POSTGREST_CONTAINER=$(sudo docker ps -qf "name=postgrest")
if [ -n "$POSTGREST_CONTAINER" ]; then
    sudo docker kill --signal=SIGUSR1 "$POSTGREST_CONTAINER" > /dev/null 2>&1
    echo -e "${GREEN}✅ PostgREST recarregado${NC}"
fi

echo ""
echo -e "${GREEN}✅ Tenant '$SLUG' foi completamente removido${NC}"
echo ""
