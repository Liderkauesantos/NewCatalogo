#!/bin/bash

# ============================================================
# Script para Recriar Tenant Demo
# ============================================================
# Uso: ./scripts/recreate-demo.sh
# 
# Recria o tenant demo com dados de exemplo.
# Útil após perder dados do container.
# ============================================================

# Obter diretório do script e do projeto
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔄 Recriando tenant demo...${NC}"

# Verificar se Docker está rodando
if ! docker compose ps | grep -q "postgres.*Up"; then
    echo -e "${RED}❌ Erro: Docker Compose não está rodando${NC}"
    echo -e "Execute: sudo docker compose up -d"
    exit 1
fi

# Executar seed do demo
echo -e "${BLUE}📊 Executando seed...${NC}"

if sudo docker exec -i newcatalogo-postgres-1 psql -U postgres -d new_catalogo < "$PROJECT_DIR/sql/06-seed-demo.sql"; then
    echo -e "${GREEN}✅ Tenant demo recriado com sucesso!${NC}"
else
    echo -e "${RED}❌ Erro ao recriar tenant demo${NC}"
    exit 1
fi

# Recarregar PostgREST
echo -e "${BLUE}🔄 Recarregando PostgREST...${NC}"
POSTGREST_CONTAINER=$(sudo docker ps -qf "name=postgrest")
if [ -n "$POSTGREST_CONTAINER" ]; then
    sudo docker kill --signal=SIGUSR1 "$POSTGREST_CONTAINER" > /dev/null 2>&1
    echo -e "${GREEN}✅ PostgREST recarregado${NC}"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ Tenant demo recriado!                    ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📋 Credenciais de Acesso:${NC}"
echo ""
echo -e "  🌐 URL: ${GREEN}http://localhost:8080/demo${NC}"
echo -e "  🔐 Admin: ${GREEN}http://localhost:8080/demo/admin${NC}"
echo -e "  📧 Email: ${GREEN}admin@demo.com${NC}"
echo -e "  🔑 Senha: ${GREEN}admin123${NC}"
echo ""
