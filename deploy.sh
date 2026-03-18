#!/bin/bash

# ============================================================
# Script de Deploy para Produção - New Catálogo
# Deploy 100% via Docker (sem necessidade de Node/NPM local)
# Uso: ./deploy.sh [--rebuild]
# ============================================================

set -e  # Para execução se houver erro

echo "🚀 Iniciando deploy para produção..."
echo ""

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar argumentos
REBUILD=false
if [ "$1" == "--rebuild" ]; then
    REBUILD=true
    echo -e "${YELLOW}🔄 Modo rebuild ativado (sem cache)${NC}"
fi

# 1. Verificar se está no diretório correto
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ Erro: Execute este script na raiz do projeto!${NC}"
    exit 1
fi

# 2. Verificar se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Erro: Docker não está rodando!${NC}"
    exit 1
fi

# 3. Verificar se arquivo .env existe
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Erro: Arquivo .env não encontrado!${NC}"
    echo "Copie .env.example para .env e configure as variáveis."
    exit 1
fi

# 4. Parar containers antigos (se existirem)
echo -e "${BLUE}� Parando containers antigos...${NC}"
docker compose down 2>/dev/null || true

# 5. Build da imagem do frontend via Docker
echo -e "${BLUE}� Buildando frontend via Docker...${NC}"
if [ "$REBUILD" = true ]; then
    echo "   (Sem usar cache - build completo)"
    docker compose build --no-cache frontend
else
    docker compose build frontend
fi

# 6. Iniciar todos os containers
echo -e "${BLUE}� Iniciando containers...${NC}"
docker compose up -d

# 7. Aguardar containers iniciarem
echo -e "${BLUE}⏳ Aguardando containers iniciarem...${NC}"
sleep 5

# 8. Verificar status dos containers
echo ""
echo -e "${BLUE}� Status dos containers:${NC}"
docker compose ps

# 9. Verificar saúde dos serviços
echo ""
echo -e "${BLUE}🏥 Verificando saúde dos serviços...${NC}"

# Verificar PostgreSQL
if docker compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PostgreSQL: OK${NC}"
else
    echo -e "${RED}❌ PostgreSQL: FALHOU${NC}"
fi

# Verificar PostgREST
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|404"; then
    echo -e "${GREEN}✅ PostgREST: OK${NC}"
else
    echo -e "${YELLOW}⚠️  PostgREST: Verificar logs${NC}"
fi

# Verificar R2 Service
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health | grep -q "200"; then
    echo -e "${GREEN}✅ R2 Service: OK${NC}"
else
    echo -e "${YELLOW}⚠️  R2 Service: Verificar logs${NC}"
fi

# Verificar Frontend (Nginx)
sleep 2
if curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "200"; then
    echo -e "${GREEN}✅ Frontend (Nginx): OK${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend: Verificar logs${NC}"
fi

# 10. Mostrar informações finais
echo ""
echo -e "${GREEN}✨ Deploy concluído com sucesso!${NC}"
echo ""
echo "📍 URLs disponíveis:"
echo "   - Frontend: http://localhost"
echo "   - API (PostgREST): http://localhost:3000"
echo "   - R2 Service: http://localhost:3001"
echo "   - PostgreSQL: localhost:5432"
echo ""
echo "📝 Comandos úteis:"
echo "   - Ver logs: docker compose logs -f [serviço]"
echo "   - Ver logs frontend: docker compose logs -f frontend"
echo "   - Parar containers: docker compose down"
echo "   - Reiniciar: docker compose restart"
echo "   - Rebuild completo: ./deploy.sh --rebuild"
echo ""
echo -e "${BLUE}💡 Observações:${NC}"
echo "   - O build do frontend é feito dentro do Docker"
echo "   - Não é necessário ter Node/NPM instalado localmente"
echo "   - Para desenvolvimento local: docker compose up -d postgres postgrest r2-service"
echo ""
