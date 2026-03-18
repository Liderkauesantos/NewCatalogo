#!/bin/bash

# ============================================================
# Atualizar PGRST_DB_SCHEMAS dinamicamente
# ============================================================
# Detecta schemas e atualiza docker-compose.yml
# Usa NOTIFY pgrst para recarregar sem restart completo
# ============================================================

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${BLUE}🔄 Atualizando schemas do PostgREST...${NC}"

# Obter lista de schemas
SCHEMAS=$(sudo docker exec newcatalogo-postgres-1 psql -U postgres -d new_catalogo -tAc "
    SELECT string_agg(nspname, ',' ORDER BY nspname)
    FROM pg_namespace
    WHERE nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast', 'jwt')
    AND nspname NOT LIKE 'pg_%';
")

if [ -z "$SCHEMAS" ]; then
    echo -e "${RED}❌ Nenhum schema encontrado${NC}"
    exit 1
fi

echo -e "${GREEN}📋 Schemas: $SCHEMAS${NC}"

# Detectar diretório do projeto
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Atualizar docker-compose.yml
sed -i "s|PGRST_DB_SCHEMAS:.*|PGRST_DB_SCHEMAS: $SCHEMAS|" "$PROJECT_DIR/docker-compose.yml"

echo -e "${GREEN}✅ docker-compose.yml atualizado${NC}"

# Recarregar PostgREST (down + up para aplicar env vars)
echo -e "${BLUE}� Recarregando PostgREST...${NC}"

cd "$PROJECT_DIR"
sudo docker compose down postgrest > /dev/null 2>&1
sudo docker compose up -d postgrest > /dev/null 2>&1

echo -e "${GREEN}✅ PostgREST recarregado com novos schemas!${NC}"
