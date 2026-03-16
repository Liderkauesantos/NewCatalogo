#!/bin/bash

# ============================================================
# Script para Backup de um Tenant
# ============================================================
# Uso: ./scripts/backup-tenant.sh [slug]
# 
# Cria backup completo de um tenant específico ou todos
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
mkdir -p "$BACKUP_DIR"

# Verificar se Docker está rodando
if ! docker compose ps | grep -q "postgres.*Up"; then
    echo -e "${RED}❌ Erro: Docker Compose não está rodando${NC}"
    exit 1
fi

# Função para fazer backup de um tenant
backup_tenant() {
    local SLUG=$1
    local TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    local BACKUP_FILE="$BACKUP_DIR/${SLUG}_${TIMESTAMP}.sql"
    
    echo -e "${BLUE}📦 Fazendo backup do tenant: $SLUG${NC}"
    
    # Backup do schema do tenant + registro no master
    sudo docker exec newcatalogo-postgres-1 pg_dump -U postgres -d new_catalogo \
        --schema="$SLUG" \
        --schema-only > "$BACKUP_FILE.schema"
    
    sudo docker exec newcatalogo-postgres-1 pg_dump -U postgres -d new_catalogo \
        --schema="$SLUG" \
        --data-only >> "$BACKUP_FILE.data"
    
    # Backup do registro no master.tenants e master.tenant_users
    sudo docker exec newcatalogo-postgres-1 psql -U postgres -d new_catalogo -c "
        COPY (
            SELECT 'INSERT INTO master.tenants (id, slug, display_name, db_schema, whatsapp, logo_url, primary_color, secondary_color, active) VALUES (' ||
                   quote_literal(id::text) || '::uuid, ' ||
                   quote_literal(slug) || ', ' ||
                   quote_literal(display_name) || ', ' ||
                   quote_literal(db_schema) || ', ' ||
                   quote_literal(whatsapp) || ', ' ||
                   COALESCE(quote_literal(logo_url), 'NULL') || ', ' ||
                   quote_literal(primary_color) || ', ' ||
                   quote_literal(secondary_color) || ', ' ||
                   active || ');'
            FROM master.tenants WHERE slug = '$SLUG'
        ) TO STDOUT;
    " > "$BACKUP_FILE.master"
    
    sudo docker exec newcatalogo-postgres-1 psql -U postgres -d new_catalogo -c "
        COPY (
            SELECT 'INSERT INTO master.tenant_users (id, tenant_id, email, password_hash, role, active) VALUES (' ||
                   quote_literal(u.id::text) || '::uuid, ' ||
                   quote_literal(u.tenant_id::text) || '::uuid, ' ||
                   quote_literal(u.email) || ', ' ||
                   quote_literal(u.password_hash) || ', ' ||
                   quote_literal(u.role) || ', ' ||
                   u.active || ');'
            FROM master.tenant_users u
            JOIN master.tenants t ON u.tenant_id = t.id
            WHERE t.slug = '$SLUG'
        ) TO STDOUT;
    " >> "$BACKUP_FILE.master"
    
    # Combinar tudo em um único arquivo
    cat "$BACKUP_FILE.schema" "$BACKUP_FILE.master" "$BACKUP_FILE.data" > "$BACKUP_FILE"
    rm -f "$BACKUP_FILE.schema" "$BACKUP_FILE.master" "$BACKUP_FILE.data"
    
    # Comprimir
    gzip "$BACKUP_FILE"
    
    echo -e "${GREEN}✅ Backup salvo: $BACKUP_FILE.gz${NC}"
    echo -e "   Tamanho: $(du -h "$BACKUP_FILE.gz" | cut -f1)"
}

# Se passou slug como argumento
if [ -n "$1" ]; then
    backup_tenant "$1"
else
    # Listar tenants e perguntar qual fazer backup
    echo -e "${BLUE}📋 Tenants disponíveis:${NC}"
    echo ""
    
    TENANTS=$(sudo docker exec newcatalogo-postgres-1 psql -U postgres -d new_catalogo -tAc \
        "SELECT slug FROM master.tenants ORDER BY slug;")
    
    echo "$TENANTS"
    echo ""
    echo -e "${YELLOW}Opções:${NC}"
    echo "  - Digite o slug de um tenant específico"
    echo "  - Digite 'all' para backup de todos"
    echo ""
    
    read -p "Escolha: " CHOICE
    
    if [ "$CHOICE" = "all" ]; then
        for SLUG in $TENANTS; do
            backup_tenant "$SLUG"
        done
    else
        backup_tenant "$CHOICE"
    fi
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ Backup concluído!                        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📁 Backups salvos em: $BACKUP_DIR/${NC}"
ls -lh "$BACKUP_DIR"
echo ""
