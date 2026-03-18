# 📚 Guia de Deploy - New Catálogo

Guia objetivo para implantar o New Catálogo em servidor de produção.

---

## 📋 Requisitos

- ✅ Servidor Ubuntu 20.04+ ou Debian 11+
- ✅ Acesso SSH (root ou sudo)
- ✅ Mínimo: 2GB RAM, 20GB disco
- ✅ Domínio (opcional)

---

## 🎯 Escolha sua Opção de Deploy

### **Opção 1: Docker (Recomendado)** ✅
- Mais fácil de configurar
- Isolamento completo
- Fácil de atualizar
- **Use esta opção se possível**

### **Opção 2: PostgreSQL Local**
- Usa PostgreSQL já instalado no servidor
- Mais controle sobre o banco
- Requer mais configuração manual

---

## � OPÇÃO 1: Deploy com Docker (Recomendado)

### **1. Preparar Servidor**

```bash
# Conectar via SSH
ssh usuario@SEU_IP_DO_SERVIDOR

# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Instalar Docker Compose
sudo apt install docker-compose -y

# Instalar Git e Node.js
sudo apt install git curl -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs -y

# Verificar instalações
docker --version
docker-compose --version
node --version
npm --version

# Configurar firewall
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### **2. Clonar Projeto**

```bash
# Criar diretório
sudo mkdir -p /var/www
cd /var/www

# Clonar repositório
sudo git clone https://github.com/SEU_USUARIO/NewCatalogo.git
cd NewCatalogo

# Ajustar permissões
sudo chown -R $USER:$USER /var/www/NewCatalogo
```

### **3. Configurar Variáveis de Ambiente**

```bash
# Copiar template
cp .env.docker .env

# Gerar senhas seguras
POSTGRES_PASS=$(openssl rand -base64 32)
AUTH_PASS=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)

# Configurar .env automaticamente
sed -i "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$POSTGRES_PASS/" .env
sed -i "s/AUTHENTICATOR_PASSWORD=.*/AUTHENTICATOR_PASSWORD=$AUTH_PASS/" .env
sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env

# Configurar credenciais do Cloudflare R2
nano .env
```

**Edite manualmente no .env:**
```env
# Cloudflare R2 (obrigatório para upload de imagens)
R2_ACCOUNT_ID=seu_account_id
R2_ACCESS_KEY_ID=sua_access_key
R2_SECRET_ACCESS_KEY=sua_secret_key
R2_BUCKET_NAME=newcatalogo
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
VITE_R2_SERVICE_URL=http://localhost:3001
```

**⚠️ IMPORTANTE:** Guarde as senhas geradas em local seguro!

### **4. Build e Deploy**

```bash
# Instalar dependências
npm install

# Build do frontend
npm run build

# Preparar arquivos para Nginx
mkdir -p frontend/dist
cp -r dist/* frontend/dist/
cp public/* frontend/dist/

# Subir containers Docker
sudo docker compose up -d

# Verificar status
sudo docker compose ps
```

**Containers esperados:**
- ✅ `newcatalogo-postgres-1` (PostgreSQL)
- ✅ `newcatalogo-postgrest-1` (API REST)
- ✅ `newcatalogo-r2-service-1` (Upload de imagens)
- ✅ `newcatalogo-nginx-1` (Servidor web)

### **5. Testar Instalação**

```bash
# Testar API
curl http://localhost:3000/
# Deve retornar: OpenAPI spec

# Testar R2 Service
curl http://localhost:3001/health
# Deve retornar: {"status":"ok"}

# Acessar no navegador
http://SEU_IP_DO_SERVIDOR
# Deve mostrar landing page
```

### **6. Criar Primeiro Tenant**

```bash
# Executar script interativo
./scripts/create-tenant-dynamic.sh
```

**Informações solicitadas:**
- Slug: `demo` (URL será: /demo/)
- Nome: `Loja Demo`
- WhatsApp: `5511999999999`
- Cor primária: `#2563eb`
- Email admin: `admin@demo.com`
- Senha: `admin123` (troque em produção!)

**O script faz automaticamente:**
1. Cria schema no PostgreSQL
2. Cria tabelas do tenant
3. Aplica permissões
4. Popula dados iniciais
5. Cria usuário admin
6. Atualiza PostgREST (~1s downtime)

**Testar tenant criado:**
```bash
# Acessar catálogo público
http://SEU_IP/demo/

# Acessar painel admin
http://SEU_IP/demo/admin/login
Email: admin@demo.com
Senha: admin123
```

---

## 🌐 Configurar Domínio (Opcional)

**Configurar DNS:**
```
Tipo: A | Nome: @ | Valor: SEU_IP | TTL: 3600
Tipo: A | Nome: www | Valor: SEU_IP | TTL: 3600
```

**Verificar propagação:**
```bash
nslookup seudominio.com.br
```

---

## 🔒 Configurar SSL/HTTPS (Recomendado)

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Editar nginx.conf
nano nginx/nginx.conf
# Adicionar: server_name seudominio.com.br www.seudominio.com.br;

# Reiniciar Nginx
sudo docker compose restart nginx

# Gerar certificado
sudo docker compose stop nginx
sudo certbot certonly --standalone -d seudominio.com.br -d www.seudominio.com.br
sudo docker compose start nginx

# Renovação automática
sudo crontab -e
# Adicionar: 0 3 * * * certbot renew --quiet --post-hook "docker compose -f /var/www/NewCatalogo/docker-compose.yml restart nginx"
```


---

## 🔄 Atualizar Aplicação

```bash
cd /var/www/NewCatalogo

# Método rápido
./deploy.sh

# Ou manual
git pull
npm install
npm run build
rm -rf frontend/dist && mkdir -p frontend/dist
cp -r dist/* frontend/dist/
cp public/* frontend/dist/
sudo docker compose restart
```

---

## � Backup e Manutenção

### **Backup Manual**
```bash
# Criar backup
sudo docker exec newcatalogo-postgres-1 pg_dump -U postgres new_catalogo > backup_$(date +%Y%m%d).sql

# Restaurar backup
sudo docker exec -i newcatalogo-postgres-1 psql -U postgres new_catalogo < backup_20240316.sql
```

### **Backup Automático**
```bash
# Criar script
sudo nano /usr/local/bin/backup-catalogo.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/newcatalogo"
mkdir -p $BACKUP_DIR
docker exec newcatalogo-postgres-1 pg_dump -U postgres new_catalogo > $BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
```

```bash
# Tornar executável
sudo chmod +x /usr/local/bin/backup-catalogo.sh

# Agendar (todo dia às 2h)
sudo crontab -e
# Adicionar: 0 2 * * * /usr/local/bin/backup-catalogo.sh
```

### **Monitoramento**
```bash
docker stats              # Uso de recursos
df -h                     # Espaço em disco
free -h                   # Memória
sudo docker compose logs -f  # Logs em tempo real
```

---

## �️ OPÇÃO 2: Deploy com PostgreSQL Local

**Use se já tem PostgreSQL instalado no servidor.**

### **1. Preparar Servidor**

```bash
# Instalar PostgreSQL (se não tiver)
sudo apt install postgresql postgresql-contrib -y

# Instalar Node.js e Nginx
sudo apt install git curl nginx -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs -y
```

### **2. Configurar PostgreSQL**

```bash
# Criar banco e usuário
sudo -u postgres psql << EOF
CREATE DATABASE new_catalogo;
CREATE USER authenticator WITH PASSWORD 'SENHA_FORTE_AQUI';
GRANT ALL PRIVILEGES ON DATABASE new_catalogo TO authenticator;
\q
EOF

# Executar scripts SQL
cd /var/www/NewCatalogo
sudo -u postgres psql -d new_catalogo < sql/01-extensions.sql
sudo -u postgres psql -d new_catalogo < sql/02-jwt.sql
sudo -u postgres psql -d new_catalogo < sql/03-master-schema.sql
sudo -u postgres psql -d new_catalogo < sql/04-roles.sql
sudo -u postgres psql -d new_catalogo < sql/07-dynamic-multitenancy.sql
```

### **3. Instalar PostgREST**

```bash
# Baixar PostgREST
wget https://github.com/PostgREST/postgrest/releases/download/v12.0.2/postgrest-v12.0.2-linux-static-x64.tar.xz
tar -xf postgrest-v12.0.2-linux-static-x64.tar.xz
sudo mv postgrest /usr/local/bin/
sudo chmod +x /usr/local/bin/postgrest

# Criar arquivo de configuração
sudo nano /etc/postgrest.conf
```

```conf
db-uri = "postgres://authenticator:SENHA@localhost:5432/new_catalogo"
db-schemas = "public,master"
db-anon-role = "anon"
db-pre-request = "set_tenant"
jwt-secret = "SEU_JWT_SECRET_AQUI"
server-port = 3000
```

```bash
# Criar serviço systemd
sudo nano /etc/systemd/system/postgrest.service
```

```ini
[Unit]
Description=PostgREST API
After=postgresql.service

[Service]
ExecStart=/usr/local/bin/postgrest /etc/postgrest.conf
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# Iniciar PostgREST
sudo systemctl daemon-reload
sudo systemctl enable postgrest
sudo systemctl start postgrest
sudo systemctl status postgrest
```

### **4. Configurar Nginx**

```bash
sudo nano /etc/nginx/sites-available/newcatalogo
```

```nginx
server {
    listen 80;
    server_name seudominio.com.br;

    # API
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_set_header Host $host;
    }

    # Frontend
    location / {
        root /var/www/NewCatalogo/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
# Ativar site
sudo ln -s /etc/nginx/sites-available/newcatalogo /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### **5. Build Frontend e Criar Tenant**

```bash
cd /var/www/NewCatalogo
npm install
npm run build

# Criar primeiro tenant
./scripts/create-tenant-dynamic.sh
```

---

## 📝 Comandos Úteis

### **Docker (Opção 1)**
```bash
sudo docker compose ps              # Status
sudo docker compose logs -f         # Logs
sudo docker compose down            # Parar
sudo docker compose up -d           # Iniciar
sudo docker compose restart nginx   # Reiniciar específico
```

### **PostgreSQL**
```bash
# Docker
sudo docker exec -it newcatalogo-postgres-1 psql -U postgres -d new_catalogo

# Local
sudo -u postgres psql -d new_catalogo

# Comandos SQL
\dn                    # Listar schemas
\dt master.*           # Tabelas do master
\dt demo.*             # Tabelas do tenant demo
\q                     # Sair
```

### **Criar Novos Tenants**
```bash
# Interativo
./scripts/create-tenant-dynamic.sh

# Via SQL direto
sudo docker exec -it newcatalogo-postgres-1 psql -U postgres -d new_catalogo
SELECT master.provision_tenant('novoloja', 'Nova Loja', '5511999999999', '#2563eb', 'admin@novoloja.com', 'senha123');
```

### **Logs**
```bash
# Docker
sudo docker compose logs -f postgres
sudo docker compose logs -f postgrest
sudo docker compose logs -f nginx

# Local
sudo journalctl -u postgrest -f
sudo tail -f /var/log/nginx/error.log
```

---

## 🆘 Solução de Problemas

### **Erro 406 (Not Acceptable)**
```bash
# Causa: Schema não está em PGRST_DB_SCHEMAS
# Solução:
./scripts/update-schemas-postgrest.sh
```

### **Containers não iniciam**
```bash
sudo docker compose logs
sudo netstat -tulpn | grep -E '80|443|3000|5432'
sudo docker compose down -v
sudo docker compose up -d
```

### **Erro 502 Bad Gateway**
```bash
sudo docker compose ps postgrest
sudo docker compose logs postgrest
sudo docker compose restart postgrest
```

### **Banco não conecta**
```bash
sudo docker compose ps postgres
sudo docker compose logs postgres
cat .env  # Verificar credenciais
```

### **Arquivos estáticos não carregam**
```bash
ls -la frontend/dist/
./deploy.sh  # Rebuild completo
```

### **Upload de imagens não funciona**
```bash
# Verificar R2 Service
curl http://localhost:3001/health

# Verificar credenciais R2 no .env
cat .env | grep R2_

# Ver logs
sudo docker compose logs r2-service
```

---

## � Resumo Rápido

### **Deploy Docker (5 minutos)**
```bash
# 1. Preparar
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com | sh
sudo apt install docker-compose git nodejs npm -y

# 2. Clonar
cd /var/www
sudo git clone https://github.com/SEU_USUARIO/NewCatalogo.git
cd NewCatalogo

# 3. Configurar
cp .env.docker .env
nano .env  # Configurar R2

# 4. Deploy
npm install && npm run build
mkdir -p frontend/dist && cp -r dist/* frontend/dist/
sudo docker compose up -d

# 5. Criar tenant
./scripts/create-tenant-dynamic.sh
```

### **Gerenciar Tenants**
```bash
# Criar novo
./scripts/create-tenant-dynamic.sh

# Listar existentes
sudo docker exec -it newcatalogo-postgres-1 psql -U postgres -d new_catalogo -c "SELECT slug, display_name FROM master.tenants;"

# Atualizar schemas do PostgREST
./scripts/update-schemas-postgrest.sh
```

---