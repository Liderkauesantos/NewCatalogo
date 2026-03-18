# ============================================================
# Dockerfile Multi-Stage para Frontend React + Vite
# Build: docker build -t newcatalogo-frontend .
# Run: docker run -p 80:80 newcatalogo-frontend
# ============================================================

# ============================================================
# Stage 1: Build
# ============================================================
FROM node:20-alpine AS builder

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package.json package-lock.json* bun.lock* ./

# Instalar dependências
# Usa npm ci para instalação mais rápida e determinística em produção
RUN if [ -f package-lock.json ]; then npm ci; \
    elif [ -f bun.lock ]; then npm install -g bun && bun install; \
    else npm install; fi

# Copiar código fonte
COPY . .

# Build da aplicação
# O Vite vai gerar os arquivos otimizados em /app/dist
RUN npm run build

# ============================================================
# Stage 2: Production
# ============================================================
FROM nginx:alpine

# Metadados
LABEL maintainer="New Standard"
LABEL description="NewCatalogo - Frontend React PWA"
LABEL version="1.0.0"

# Copiar arquivos buildados do stage anterior
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuração customizada do Nginx (se necessário)
# COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Expor porta 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Comando para iniciar o Nginx
CMD ["nginx", "-g", "daemon off;"]
