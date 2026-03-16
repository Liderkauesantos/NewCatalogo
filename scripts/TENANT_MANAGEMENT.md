# 🏢 Gerenciamento de Tenants - Guia Completo

## 📋 Visão Geral

Este guia explica como gerenciar clientes/tenants no sistema NewCatálogo. Cada tenant é um cliente independente com seu próprio catálogo, produtos, usuários e configurações.

## 🚀 Início Rápido

### Recriar Tenant Demo (após perder dados)

Se você perdeu os dados do container, execute:

```bash
chmod +x scripts/*.sh
./scripts/recreate-demo.sh
```

Isso recria o tenant `demo` com:
- **URL**: http://localhost:8080/demo
- **Admin**: http://localhost:8080/demo/admin
- **Email**: admin@demo.com
- **Senha**: admin123

### Menu Interativo (Recomendado)

Para acessar todas as funcionalidades através de um menu:

```bash
./scripts/tenant-manager.sh
```

## 📚 Scripts Disponíveis

### 1. 🆕 Criar Novo Tenant

**Script**: `./scripts/create-tenant.sh`

Cria um novo cliente de forma interativa. Solicita:
- Slug (identificador único, ex: `casarossi`)
- Nome da empresa
- WhatsApp
- Cor primária
- Email e senha do admin

**Exemplo de uso:**
```bash
./scripts/create-tenant.sh
```

**O que é criado:**
- ✅ Registro no `master.tenants`
- ✅ Schema PostgreSQL dedicado
- ✅ Todas as tabelas (products, categories, orders, etc)
- ✅ Usuário admin
- ✅ Dados iniciais (categorias, métodos de pagamento, etc)
- ✅ Configurações da marca

### 2. 📋 Listar Tenants

**Script**: `./scripts/list-tenants.sh`

Lista todos os tenants cadastrados com informações:
- Slug
- Nome da empresa
- WhatsApp
- Status (ativo/inativo)
- Data de criação

**Exemplo de uso:**
```bash
./scripts/list-tenants.sh
```

### 3. 🔄 Recriar Tenant Demo

**Script**: `./scripts/recreate-demo.sh`

Recria o tenant de demonstração. Útil para:
- Recuperar dados após perda de container
- Resetar ambiente de testes
- Criar ambiente de demonstração

**Exemplo de uso:**
```bash
./scripts/recreate-demo.sh
```

### 4. 📦 Backup de Tenant

**Script**: `./scripts/backup-tenant.sh [slug]`

Cria backup completo de um tenant, incluindo:
- Schema e estrutura das tabelas
- Todos os dados (produtos, pedidos, etc)
- Usuários e configurações
- Registro no master

**Exemplos de uso:**
```bash
# Backup de um tenant específico
./scripts/backup-tenant.sh casarossi

# Menu interativo para escolher tenant
./scripts/backup-tenant.sh
```

**Onde são salvos:**
- Pasta: `backups/`
- Formato: `{slug}_{timestamp}.sql.gz`
- Exemplo: `casarossi_20260316_153045.sql.gz`

### 5. 📥 Restaurar Backup

**Script**: `./scripts/restore-tenant.sh`

Restaura um tenant a partir de um backup.

**Exemplo de uso:**
```bash
./scripts/restore-tenant.sh
```

**Opções:**
- Se o tenant já existir, pergunta se deseja sobrescrever
- Restaura todos os dados exatamente como estavam no backup

### 6. 🗑️ Deletar Tenant

**Script**: `./scripts/delete-tenant.sh`

Deleta completamente um tenant. **OPERAÇÃO IRREVERSÍVEL!**

**O que é deletado:**
- ❌ Schema do banco de dados
- ❌ Todos os produtos, categorias, pedidos
- ❌ Usuários admin
- ❌ Configurações da marca
- ❌ Registro no master

**Exemplo de uso:**
```bash
./scripts/delete-tenant.sh
```

**Proteções:**
- Confirmação dupla
- Requer digitar "DELETAR" para confirmar

## 🔧 Operações Manuais

### Criar Tenant Manualmente (SQL)

Se preferir criar via SQL direto:

```sql
BEGIN;

-- 1. Registrar tenant
INSERT INTO master.tenants (slug, display_name, db_schema, whatsapp, primary_color)
VALUES ('meutenant', 'Minha Loja', 'meutenant', '5511999999999', '#2563eb');

-- 2. Criar schema e tabelas
SELECT master.create_tenant_schema('meutenant');

-- 3. Popular brand_settings
INSERT INTO meutenant.brand_settings (company_name, whatsapp, primary_color)
SELECT display_name, whatsapp, primary_color
FROM master.tenants WHERE slug = 'meutenant';

-- 4. Criar admin
INSERT INTO master.tenant_users (tenant_id, email, password_hash, role)
SELECT id, 'admin@meutenant.com', crypt('senha123', gen_salt('bf')), 'admin'
FROM master.tenants WHERE slug = 'meutenant';

COMMIT;
```

### Recarregar PostgREST

Após criar/deletar tenants, recarregue o PostgREST:

```bash
sudo docker kill --signal=SIGUSR1 $(sudo docker ps -qf "name=postgrest")
```

Ou use o script:
```bash
./scripts/tenant-manager.sh
# Opção 8: Recarregar PostgREST
```

### Verificar Schemas Existentes

```bash
sudo docker exec newcatalogo-postgres-1 psql -U postgres -d new_catalogo -c "\dn"
```

### Ver Usuários de um Tenant

```bash
sudo docker exec newcatalogo-postgres-1 psql -U postgres -d new_catalogo -c "
SELECT u.email, u.role, u.active
FROM master.tenant_users u
JOIN master.tenants t ON u.tenant_id = t.id
WHERE t.slug = 'demo';
"
```

## 📁 Estrutura de Arquivos

```
NewCatalogo/
├── scripts/
│   ├── tenant-manager.sh       # Menu principal (recomendado)
│   ├── create-tenant.sh        # Criar novo tenant
│   ├── list-tenants.sh         # Listar tenants
│   ├── recreate-demo.sh        # Recriar demo
│   ├── backup-tenant.sh        # Fazer backup
│   ├── restore-tenant.sh       # Restaurar backup
│   └── delete-tenant.sh        # Deletar tenant
├── backups/                    # Backups salvos aqui
└── sql/
    └── 06-seed-demo.sql        # Seed do tenant demo
```

## 🔒 Boas Práticas

### 1. Sempre Faça Backup Antes de Deletar

```bash
# Backup antes de deletar
./scripts/backup-tenant.sh casarossi

# Depois pode deletar com segurança
./scripts/delete-tenant.sh
```

### 2. Backups Regulares

Configure backups automáticos com cron:

```bash
# Editar crontab
crontab -e

# Adicionar linha para backup diário às 2h da manhã
0 2 * * * cd /caminho/para/NewCatalogo && ./scripts/backup-tenant.sh all
```

### 3. Nomear Tenants Corretamente

**Bom:**
- `casarossi`
- `loja-tech`
- `mercado_central`

**Ruim:**
- `Casa Rossi` (espaços)
- `Loja@Tech` (caracteres especiais)
- `123loja` (começar com número)

### 4. Senhas Fortes

Use senhas fortes para admins de produção:
- Mínimo 12 caracteres
- Letras maiúsculas e minúsculas
- Números e símbolos

### 5. Testar em Demo Primeiro

Sempre teste mudanças no tenant `demo` antes de aplicar em produção.

## 🐛 Troubleshooting

### Erro: "Tenant já existe"

**Solução 1**: Use outro slug
```bash
./scripts/create-tenant.sh
# Digite um slug diferente
```

**Solução 2**: Delete o tenant existente
```bash
./scripts/delete-tenant.sh
# Depois crie novamente
```

### Erro: "Docker Compose não está rodando"

```bash
sudo docker compose up -d
```

### Erro: "PostgREST não reconhece novo schema"

```bash
# Recarregar PostgREST
sudo docker kill --signal=SIGUSR1 $(sudo docker ps -qf "name=postgrest")

# Ou reiniciar completamente
sudo docker compose restart postgrest
```

### Perdi todos os dados do container

```bash
# Se tinha backup
./scripts/restore-tenant.sh

# Se não tinha backup, recrie o demo
./scripts/recreate-demo.sh

# Ou crie novos tenants
./scripts/create-tenant.sh
```

### Erro: "Permission denied"

```bash
# Dar permissão de execução aos scripts
chmod +x scripts/*.sh
```

## 📊 Monitoramento

### Ver Quantidade de Produtos por Tenant

```bash
sudo docker exec newcatalogo-postgres-1 psql -U postgres -d new_catalogo -c "
SELECT 
    t.slug,
    t.display_name,
    (SELECT COUNT(*) FROM demo.products) as total_produtos
FROM master.tenants t
WHERE t.slug = 'demo';
"
```

### Ver Espaço Usado por Tenant

```bash
sudo docker exec newcatalogo-postgres-1 psql -U postgres -d new_catalogo -c "
SELECT 
    schemaname,
    pg_size_pretty(sum(pg_total_relation_size(schemaname||'.'||tablename))::bigint) as size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'master', 'jwt', 'public')
GROUP BY schemaname
ORDER BY sum(pg_total_relation_size(schemaname||'.'||tablename)) DESC;
"
```

## 🎯 Casos de Uso Comuns

### Caso 1: Novo Cliente

```bash
# 1. Criar tenant
./scripts/create-tenant.sh

# 2. Fazer backup inicial
./scripts/backup-tenant.sh novocliente

# 3. Acessar e configurar
# http://localhost:8080/novocliente/admin
```

### Caso 2: Migrar Dados de Produção para Desenvolvimento

```bash
# 1. Fazer backup em produção
./scripts/backup-tenant.sh cliente

# 2. Copiar arquivo de backup para desenvolvimento
scp backups/cliente_*.sql.gz dev-server:/path/to/NewCatalogo/backups/

# 3. Restaurar em desenvolvimento
./scripts/restore-tenant.sh
```

### Caso 3: Resetar Ambiente de Testes

```bash
# Deletar e recriar
./scripts/delete-tenant.sh  # Escolher 'demo'
./scripts/recreate-demo.sh
```

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs do Docker:
   ```bash
   sudo docker compose logs -f postgres
   sudo docker compose logs -f postgrest
   ```

2. Verifique se o tenant existe:
   ```bash
   ./scripts/list-tenants.sh
   ```

3. Tente recarregar o PostgREST:
   ```bash
   sudo docker kill --signal=SIGUSR1 $(sudo docker ps -qf "name=postgrest")
   ```

---

**Última atualização**: 16/03/2026
