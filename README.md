# New Catálogo

Sistema multi-tenant de catálogo digital de produtos com painel administrativo completo.

---

## 📋 Visão Geral

**New Catálogo** é uma plataforma SaaS que permite criar e gerenciar catálogos digitais de produtos para múltiplos clientes (tenants). Cada tenant tem seu próprio banco de dados isolado, identidade visual personalizada e URL exclusiva.

**Exemplo de uso:**
- `newcatalogo.com/` → Landing page institucional
- `newcatalogo.com/casarossi/` → Catálogo público da Casa Rossi
- `newcatalogo.com/casarossi/admin/` → Painel administrativo

---

## 🏗️ Arquitetura

### **Backend**
- **PostgreSQL 15** - Banco de dados com multi-schema (1 schema por tenant)
- **PostgREST v12** - API REST automática sobre PostgreSQL
- **JWT** - Autenticação via funções SQL (pgcrypto)
- **Nginx** - Reverse proxy e servidor de arquivos estáticos

### **Frontend**
- **React 18** + **TypeScript** - Interface do usuário
- **Vite** - Build tool e dev server
- **TanStack Query** - Gerenciamento de estado e cache
- **shadcn/ui** - Componentes UI (Radix UI + Tailwind)
- **React Router** - Roteamento com suporte a multi-tenant

### **Serviços**
- **r2-service** - Microserviço Node.js para upload de imagens no Cloudflare R2
  - Compressão automática de imagens
  - Validações específicas por contexto
  - Upload, delete e presigned URLs

### **Infraestrutura**
- **Docker Compose** - Orquestração de containers
- **Cloudflare R2** - Armazenamento de imagens (S3-compatible)

---

## 🗂️ Estrutura do Projeto

```
NewCatalogo/
├── src/                      # Frontend React
│   ├── components/           # Componentes reutilizáveis
│   ├── pages/                # Páginas (Landing, Index, Admin)
│   ├── contexts/             # AuthContext, CartContext
│   ├── hooks/                # Custom hooks
│   └── lib/                  # Utils (api.ts, upload.ts)
│
├── sql/                      # Scripts SQL de inicialização
│   ├── 01-extensions.sql     # Extensões (pgcrypto, uuid)
│   ├── 02-jwt.sql            # Funções JWT
│   ├── 03-master-schema.sql  # Schema master (tenants, users)
│   ├── 04-roles.sql          # Roles e permissões
│   └── 06-seed-demo.sql      # Dados de exemplo
│
├── r2-service/               # Microserviço de upload
│   ├── server.js             # Express + AWS SDK v3
│   └── Dockerfile            # Container do serviço
│
├── scripts/                  # Scripts de gerenciamento
│   ├── create-tenant.sh      # Criar novo tenant
│   ├── delete-tenant.sh      # Deletar tenant
│   ├── backup-tenant.sh      # Backup de tenant
│   └── tenant-manager.sh     # CLI interativo
│
├── nginx/                    # Configuração Nginx
├── docker-compose.yml        # Orquestração de serviços
└── deploy.sh                 # Script de deploy
```

---

## 🔄 Fluxo de Funcionamento

### **1. Multi-Tenancy**

Cada tenant (cliente) possui:
- **Schema isolado** no PostgreSQL (`casarossi`, `demo`, etc.)
- **Slug único** na URL (`/casarossi/`, `/lojateste/`)
- **Identidade visual** própria (logo, cores)
- **Usuários admin** independentes

**Isolamento:**
```sql
-- Função que define o schema correto antes de cada request
CREATE FUNCTION master.set_tenant_schema()
-- PostgREST chama automaticamente via PGRST_DB_PRE_REQUEST
```

### **2. Autenticação**

**Login:**
```
1. Frontend → POST /rpc/login {email, password}
2. PostgreSQL valida credenciais (bcrypt)
3. Retorna JWT com claims: {user_id, tenant_id, role}
4. Frontend armazena token no localStorage (por tenant)
5. Requests subsequentes incluem: Authorization: Bearer <token>
```

**Autorização:**
- JWT validado pelo PostgREST
- Schema definido automaticamente pelo tenant_id no token
- RLS (Row Level Security) opcional por tabela

### **3. Upload de Imagens**

**Fluxo:**
```
1. Frontend seleciona imagem
2. Compressão automática (Canvas API):
   - Logos: 800x800px, 85% quality, max 2MB
   - Banners: 1920x1080px, 80% quality, max 5MB
   - Produtos: 1200x1200px, 82% quality, max 3MB
3. Upload para r2-service via FormData
4. r2-service → Cloudflare R2 (AWS SDK v3)
5. Retorna URL pública: https://pub-xxx.r2.dev/...
```

### **4. Catálogo Público**

**Rota:** `/:slug/`

```
1. Usuário acessa /casarossi/
2. Frontend extrai slug da URL
3. API request com header: Accept-Profile: casarossi
4. PostgREST consulta schema casarossi
5. Retorna: produtos, categorias, carrossel, marca
6. Renderiza catálogo personalizado
```

### **5. Painel Admin**

**Rota:** `/:slug/admin/*`

```
1. Login obrigatório (/casarossi/admin/login)
2. JWT armazenado por tenant
3. Sidebar com navegação:
   - Dashboard (estatísticas)
   - Produtos (CRUD)
   - Carrossel (banners)
   - Pedidos (gerenciamento)
   - Pagamentos (métodos)
   - WhatsApp (configurações)
   - Marca (identidade visual)
```

---

## 🚀 Instalação e Deploy

### **Desenvolvimento Local**

```bash
# 1. Clonar repositório
git clone <repo-url>
cd NewCatalogo

# 2. Instalar dependências do frontend
npm install

# 3. Instalar dependências do r2-service
cd r2-service && npm install && cd ..

# 4. Configurar variáveis de ambiente
cp .env.docker .env
# Editar .env com credenciais reais

# 5. Subir containers
sudo docker compose up -d

# 6. Verificar serviços
curl http://localhost:3000/  # PostgREST
curl http://localhost:3001/health  # R2 Service

# 7. Iniciar frontend
npm run dev
# Acessa: http://localhost:5173/demo/
```

### **Produção**

```bash
# 1. Build do frontend
npm run build

# 2. Deploy
./deploy.sh

# 3. Containers em produção
sudo docker compose up -d
```

---

## 🛠️ Scripts de Gerenciamento

### **Criar Tenant**

```bash
./scripts/create-tenant.sh
# Interativo: solicita slug, nome, whatsapp, cores
# Cria: schema, tabelas, admin user
```

### **Deletar Tenant**

```bash
./scripts/delete-tenant.sh casarossi
# Remove schema e dados do master
```

### **Backup/Restore**

```bash
# Backup
./scripts/backup-tenant.sh casarossi

# Restore
./scripts/restore-tenant.sh casarossi backup.sql
```

### **CLI Interativo**

```bash
./scripts/tenant-manager.sh
# Menu: criar, listar, deletar, backup, restore
```

---

## 📊 Banco de Dados

### **Schema Master**

Controla todos os tenants:

```sql
master.tenants          -- Clientes (slug, nome, cores, logo)
master.tenant_users     -- Usuários admin por tenant
```

### **Schema por Tenant**

Cada tenant tem suas próprias tabelas:

```sql
{slug}.brand_settings   -- Identidade visual
{slug}.categories       -- Categorias de produtos
{slug}.products         -- Produtos
{slug}.product_images   -- Imagens de produtos
{slug}.carousel_slides  -- Banners do carrossel
{slug}.orders           -- Pedidos
{slug}.payment_methods  -- Métodos de pagamento
{slug}.whatsapp_settings -- Configurações WhatsApp
```

---

## 🔧 Tecnologias

### **Frontend**
- React 18, TypeScript, Vite
- TanStack Query (cache e estado)
- React Router (multi-tenant routing)
- shadcn/ui (Radix UI + Tailwind CSS)
- Axios (HTTP client)
- React Hook Form + Zod (formulários)

### **Backend**
- PostgreSQL 15 (multi-schema)
- PostgREST v12 (API REST automática)
- pgcrypto (hash de senhas, JWT)
- Nginx (reverse proxy)

### **DevOps**
- Docker + Docker Compose
- Cloudflare R2 (storage)
- Shell scripts (automação)

---

## 📝 Variáveis de Ambiente

```env
# PostgreSQL
POSTGRES_PASSWORD=xxx
AUTHENTICATOR_PASSWORD=xxx
JWT_SECRET=xxx

# Cloudflare R2
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=newcatalogo
R2_PUBLIC_URL=https://pub-xxx.r2.dev
VITE_R2_SERVICE_URL=http://localhost:3001
```

---

## 🎯 Funcionalidades

### **Catálogo Público**
- ✅ Listagem de produtos com filtros
- ✅ Categorias
- ✅ Carrossel de banners
- ✅ Carrinho de compras
- ✅ Finalização via WhatsApp
- ✅ Identidade visual personalizada

### **Painel Admin**
- ✅ Dashboard com estatísticas
- ✅ CRUD de produtos (múltiplas imagens)
- ✅ Gerenciamento de categorias
- ✅ Carrossel de banners
- ✅ Pedidos (status, histórico)
- ✅ Métodos de pagamento
- ✅ Configurações de marca
- ✅ Integração WhatsApp

### **Sistema**
- ✅ Multi-tenancy com isolamento total
- ✅ Autenticação JWT
- ✅ Upload otimizado de imagens
- ✅ Compressão automática
- ✅ Backup/restore por tenant
- ✅ Scripts de automação

---

## 📚 Documentação Adicional

- `DEPLOY.md` - Guia completo de deploy
- `scripts/TENANT_MANAGEMENT.md` - Gerenciamento de tenants
- `r2-service/README.md` - Documentação do serviço de upload

---

**Desenvolvido pela New Standard** 🚀
