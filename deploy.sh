#!/bin/bash
# ============================================================
# deploy.sh — Build do frontend e deploy nos containers Docker
# Uso: ./deploy.sh
# ============================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "📦 Instalando dependências..."
npm ci --silent

echo "🔨 Gerando build de produção..."
npm run build

echo "📁 Copiando dist/ para frontend/dist/..."
rm -rf frontend/dist
mkdir -p frontend/dist
cp -r dist/* frontend/dist/

echo "🐳 Reiniciando nginx para servir o novo build..."
docker compose restart nginx 2>/dev/null || echo "⚠️  Docker não está rodando. Suba com: docker compose up -d"

echo ""
echo "✅ Deploy concluído!"
echo "   Acesse: http://localhost/demo"
