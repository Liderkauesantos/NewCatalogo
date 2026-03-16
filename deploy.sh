#!/bin/bash

# Script de Deploy para Produção - New Catálogo
# Uso: ./deploy.sh

set -e  # Para execução se houver erro

echo "🚀 Iniciando deploy para produção..."
echo ""

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script na raiz do projeto!"
    exit 1
fi

# 2. Verificar se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    echo "❌ Erro: Docker não está rodando!"
    exit 1
fi

# 3. Instalar dependências (se necessário)
echo -e "${BLUE}📦 Verificando dependências...${NC}"
if [ ! -d "node_modules" ]; then
    echo "Instalando dependências..."
    npm install
fi

# 4. Build do frontend
echo -e "${BLUE}🔨 Compilando frontend...${NC}"
npm run build

# 5. Limpar e copiar arquivos para o Nginx
echo -e "${BLUE}📁 Preparando arquivos para produção...${NC}"
rm -rf frontend/dist
mkdir -p frontend/dist
cp -r dist/* frontend/dist/

# 6. Copiar assets públicos
echo -e "${BLUE}🖼️  Copiando assets...${NC}"
if [ -d "public" ]; then
    cp -r public/* frontend/dist/ 2>/dev/null || true
fi

# 7. Verificar se containers estão rodando
echo -e "${BLUE}🐳 Verificando containers Docker...${NC}"
if ! docker compose ps | grep -q "Up"; then
    echo -e "${YELLOW}⚠️  Containers não estão rodando. Iniciando...${NC}"
    docker compose up -d
    echo "Aguardando containers iniciarem..."
    sleep 5
else
    # Reiniciar apenas o Nginx
    echo -e "${BLUE}🔄 Reiniciando Nginx...${NC}"
    docker compose restart nginx
fi

# 8. Verificar status dos containers
echo ""
echo -e "${BLUE}📊 Status dos containers:${NC}"
docker compose ps

# 9. Verificar se o Nginx está respondendo
echo ""
echo -e "${BLUE}🔍 Testando servidor...${NC}"
sleep 2
if curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "200"; then
    echo -e "${GREEN}✅ Servidor está respondendo corretamente!${NC}"
else
    echo -e "${YELLOW}⚠️  Servidor pode não estar respondendo. Verifique os logs.${NC}"
fi

# 10. Mostrar informações finais
echo ""
echo -e "${GREEN}✨ Deploy concluído com sucesso!${NC}"
echo ""
echo "📍 URLs disponíveis:"
echo "   - Produção (Nginx): http://localhost"
echo "   - API (PostgREST): http://localhost:3000"
echo "   - Banco (PostgreSQL): localhost:5432"
echo ""
echo "📝 Comandos úteis:"
echo "   - Ver logs: docker compose logs -f"
echo "   - Parar containers: docker compose down"
echo "   - Reiniciar: docker compose restart"
echo ""
echo -e "${BLUE}💡 Dica: Para desenvolvimento, use 'npm run dev'${NC}"
