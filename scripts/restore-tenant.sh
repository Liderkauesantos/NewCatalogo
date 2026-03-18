#!/bin/bash

# ============================================================
# Script para Restaurar Backup de um Tenant
# ============================================================
# Uso: ./scripts/restore-tenant.sh
# 
# Restaura um tenant a partir de um backup
# ============================================================

set -e

# Obter diretório do script e do projeto
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

BACKUP_DIR="$PROJECT_DIR/backups"

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║    📥 Restaurar Backup de Tenant               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Verificar se Docker está rodando
if ! docker compose ps | grep -q "postgres.*Up"; then
    echo -e "${RED}❌ Erro: Docker Compose não está rodando${NC}"
    exit 1
fi

# Verificar se existe pasta de backups
if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A $BACKUP_DIR 2>/dev/null)" ]; then
    echo -e "${RED}❌ Nenhum backup encontrado em $BACKUP_DIR${NC}"
    exit 1
fi

# Listar backups disponíveis
echo -e "${BLUE}📋 Backups disponíveis:${NC}"
echo ""
ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null || {
    echo -e "${RED}❌ Nenhum backup encontrado${NC}"
    exit 1
}
echo ""

# Solicitar arquivo de backup
read -p "Digite o nome do arquivo de backup (sem .gz): " BACKUP_FILE

if [ ! -f "$BACKUP_DIR/$BACKUP_FILE.gz" ]; then
    echo -e "${RED}❌ Arquivo não encontrado: $BACKUP_DIR/$BACKUP_FILE.gz${NC}"
    exit 1
fi

# Extrair slug do nome do arquivo
SLUG=$(echo "$BACKUP_FILE" | cut -d'_' -f1)

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════${NC}"
echo -e "Tenant a restaurar: ${GREEN}$SLUG${NC}"
echo -e "Arquivo: ${GREEN}$BACKUP_FILE.gz${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════${NC}"
echo ""

# Verificar se tenant já existe
EXISTS=$(sudo docker exec newcatalogo-postgres-1 psql -U postgres -d new_catalogo -tAc \
    "SELECT COUNT(*) FROM master.tenants WHERE slug = '$SLUG'" 2>/dev/null || echo "0")

if [ "$EXISTS" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Tenant '$SLUG' já existe!${NC}"
    read -p "Deseja sobrescrever? (s/N): " OVERWRITE
    
    if [[ ! "$OVERWRITE" =~ ^[sS]$ ]]; then
        echo -e "${GREEN}✅ Operação cancelada${NC}"
        exit 0
    fi
    
    # Deletar tenant existente
    echo -e "${BLUE}🗑️  Removendo tenant existente...${NC}"
    sudo docker exec newcatalogo-postgres-1 psql -U postgres -d new_catalogo -c \
        "DROP SCHEMA IF EXISTS $SLUG CASCADE; DELETE FROM master.tenants WHERE slug = '$SLUG';" > /dev/null
fi

# Descompactar backup
echo -e "${BLUE}📦 Descompactando backup...${NC}"
gunzip -c "$BACKUP_DIR/$BACKUP_FILE.gz" > "/tmp/$BACKUP_FILE"

# Restaurar
echo -e "${BLUE}📥 Restaurando tenant...${NC}"

if sudo docker exec -i newcatalogo-postgres-1 psql -U postgres -d new_catalogo < "/tmp/$BACKUP_FILE"; then
    echo -e "${GREEN}✅ Tenant restaurado com sucesso!${NC}"
else
    echo -e "${RED}❌ Erro ao restaurar tenant${NC}"
    rm -f "/tmp/$BACKUP_FILE"
    exit 1
fi

# Limpar arquivo temporário
rm -f "/tmp/$BACKUP_FILE"

# Recarregar PostgREST
echo -e "${BLUE}🔄 Recarregando PostgREST...${NC}"
POSTGREST_CONTAINER=$(sudo docker ps -qf "name=postgrest")
if [ -n "$POSTGREST_CONTAINER" ]; then
    sudo docker kill --signal=SIGUSR1 "$POSTGREST_CONTAINER" > /dev/null 2>&1
    echo -e "${GREEN}✅ PostgREST recarregado${NC}"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ Restauração concluída!                   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}🌐 Acesse: ${GREEN}http://localhost:8080/$SLUG${NC}"
echo ""
