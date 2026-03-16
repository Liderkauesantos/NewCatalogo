#!/bin/bash

# ============================================================
# Atualizar Schemas do PostgREST
# ============================================================
# Detecta todos os schemas de tenants e atualiza o PostgREST
# ============================================================

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🔄 Atualizando schemas do PostgREST...${NC}"

# Verificar se Docker está rodando
if ! docker compose ps | grep -q "postgres.*Up"; then
    echo -e "${RED}❌ Erro: Docker Compose não está rodando${NC}"
    exit 1
fi

# Obter lista de schemas (excluindo system schemas)
SCHEMAS=$(sudo docker exec newcatalogo-postgres-1 psql -U postgres -d new_catalogo -tAc "
    SELECT string_agg(nspname, ',' ORDER BY nspname)
    FROM pg_namespace
    WHERE nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast', 'public', 'jwt')
    AND nspname NOT LIKE 'pg_%';
")

if [ -z "$SCHEMAS" ]; then
    echo -e "${YELLOW}⚠️  Nenhum schema encontrado${NC}"
    exit 1
fi

echo -e "${GREEN}📋 Schemas encontrados: $SCHEMAS${NC}"

# Detectar diretório do projeto
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Atualizar docker-compose.yml
echo -e "${BLUE}📝 Atualizando docker-compose.yml...${NC}"

# Fazer backup
cp "$PROJECT_DIR/docker-compose.yml" "$PROJECT_DIR/docker-compose.yml.bak"

# Atualizar linha PGRST_DB_SCHEMAS
sed -i "s|PGRST_DB_SCHEMAS:.*|PGRST_DB_SCHEMAS: $SCHEMAS|" "$PROJECT_DIR/docker-compose.yml"

echo -e "${GREEN}✅ docker-compose.yml atualizado${NC}"

# Reiniciar PostgREST (down + up para recarregar variáveis de ambiente)
echo -e "${BLUE}🔄 Reiniciando PostgREST...${NC}"

# Mudar para o diretório do projeto para docker compose funcionar
cd "$PROJECT_DIR"

# Down e up para recarregar env vars
sudo docker compose down postgrest > /dev/null 2>&1
sudo docker compose up -d postgrest > /dev/null 2>&1

echo -e "${GREEN}✅ PostgREST reiniciado com schemas: $SCHEMAS${NC}"
echo ""
