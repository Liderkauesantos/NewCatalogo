#!/bin/bash

# ============================================================
# Tenant Manager - Menu Principal
# ============================================================
# Gerenciador centralizado de tenants
# ============================================================

set -e

# Detectar diretório do script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

clear

while true; do
    echo -e "${CYAN}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║         🏢 Gerenciador de Tenants              ║${NC}"
    echo -e "${CYAN}║         NewCatálogo - Multi-Tenant             ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}📋 Operações Disponíveis:${NC}"
    echo ""
    echo -e "  ${BLUE}1)${NC} 🆕 Criar novo tenant"
    echo -e "  ${BLUE}2)${NC} 📋 Listar todos os tenants"
    echo -e "  ${BLUE}3)${NC} 🔄 Recriar tenant demo"
    echo -e "  ${BLUE}4)${NC} 📦 Fazer backup de tenant"
    echo -e "  ${BLUE}5)${NC} 📥 Restaurar backup"
    echo -e "  ${BLUE}6)${NC} 🗑️  Deletar tenant"
    echo -e "  ${BLUE}7)${NC} 🔍 Ver informações de um tenant"
    echo -e "  ${BLUE}8)${NC} 🔄 Recarregar PostgREST"
    echo -e "  ${BLUE}0)${NC} ❌ Sair"
    echo ""
    read -p "Escolha uma opção: " OPTION
    echo ""

    case $OPTION in
        1)
            "$SCRIPT_DIR/create-tenant.sh"
            ;;
        2)
            "$SCRIPT_DIR/list-tenants.sh"
            ;;
        3)
            "$SCRIPT_DIR/recreate-demo.sh"
            ;;
        4)
            "$SCRIPT_DIR/backup-tenant.sh"
            ;;
        5)
            "$SCRIPT_DIR/restore-tenant.sh"
            ;;
        6)
            "$SCRIPT_DIR/delete-tenant.sh"
            ;;
        7)
            read -p "Digite o slug do tenant: " SLUG
            sudo docker exec newcatalogo-postgres-1 psql -U postgres -d new_catalogo -c "
                SELECT 
                    t.slug AS \"Slug\",
                    t.display_name AS \"Nome\",
                    t.whatsapp AS \"WhatsApp\",
                    t.primary_color AS \"Cor Primária\",
                    CASE WHEN t.active THEN '✅ Ativo' ELSE '❌ Inativo' END AS \"Status\",
                    to_char(t.created_at, 'DD/MM/YYYY HH24:MI') AS \"Criado em\",
                    COUNT(u.id) AS \"Nº Usuários\"
                FROM master.tenants t
                LEFT JOIN master.tenant_users u ON u.tenant_id = t.id
                WHERE t.slug = '$SLUG'
                GROUP BY t.id;
            "
            echo ""
            sudo docker exec newcatalogo-postgres-1 psql -U postgres -d new_catalogo -c "
                SELECT 
                    u.email AS \"Email\",
                    u.role AS \"Função\",
                    CASE WHEN u.active THEN '✅' ELSE '❌' END AS \"Ativo\"
                FROM master.tenant_users u
                JOIN master.tenants t ON u.tenant_id = t.id
                WHERE t.slug = '$SLUG';
            "
            ;;
        8)
            echo -e "${BLUE}🔄 Recarregando PostgREST...${NC}"
            POSTGREST_CONTAINER=$(sudo docker ps -qf "name=postgrest")
            if [ -n "$POSTGREST_CONTAINER" ]; then
                sudo docker kill --signal=SIGUSR1 "$POSTGREST_CONTAINER" > /dev/null 2>&1
                echo -e "${GREEN}✅ PostgREST recarregado${NC}"
            else
                echo -e "${RED}❌ PostgREST não encontrado${NC}"
            fi
            ;;
        0)
            echo -e "${GREEN}👋 Até logo!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Opção inválida${NC}"
            ;;
    esac
    
    echo ""
    read -p "Pressione ENTER para continuar..."
    clear
done
