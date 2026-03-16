# 📚 Guia Completo de Deploy em Produção - New Catálogo

Este documento contém o passo a passo completo para colocar o New Catálogo em produção em um servidor VPS.

---

## 📋 Pré-requisitos

Antes de começar, você precisa ter:

- ✅ Um servidor VPS (Ubuntu 20.04+ ou Debian 11+)
- ✅ Acesso SSH ao servidor (root ou sudo)
- ✅ Um domínio apontando para o IP do servidor (opcional, mas recomendado)
- ✅ Pelo menos 2GB de RAM e 20GB de disco

---

## 🚀 Passo 1: Preparar o Servidor

### 1.1. Conectar ao servidor via SSH

```bash
ssh root@SEU_IP_DO_SERVIDOR
# ou
ssh usuario@SEU_IP_DO_SERVIDOR
```

### 1.2. Atualizar o sistema

```bash
sudo apt update
sudo apt upgrade -y
```

### 1.3. Instalar dependências necessárias

```bash
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
```

### 1.4. Configurar firewall (UFW)

```bash
# Permitir SSH, HTTP e HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

---

## 📦 Passo 2: Clonar o Projeto

### 2.1. Criar diretório para aplicações

```bash
sudo mkdir -p /var/www
cd /var/www
```

### 2.2. Clonar o repositório

```bash
# Se usar Git
sudo git clone https://github.com/SEU_USUARIO/NewCatalogo.git
cd NewCatalogo

# Ou fazer upload manual via SCP/SFTP
```

### 2.3. Dar permissões corretas

```bash
sudo chown -R $USER:$USER /var/www/NewCatalogo
```

---

## 🔐 Passo 3: Configurar Variáveis de Ambiente

### 3.1. Criar arquivo .env

```bash
cd /var/www/NewCatalogo
cp .env.docker .env
nano .env
```

### 3.2. Gerar senhas seguras

```bash
# Gerar senhas aleatórias fortes
openssl rand -base64 32  # Para POSTGRES_PASSWORD
openssl rand -base64 32  # Para AUTHENTICATOR_PASSWORD
openssl rand -base64 32  # Para JWT_SECRET
```

### 3.3. Editar o arquivo .env

```env
# Banco de dados
POSTGRES_PASSWORD=COLE_SENHA_GERADA_1_AQUI
AUTHENTICATOR_PASSWORD=COLE_SENHA_GERADA_2_AQUI
JWT_SECRET=COLE_SENHA_GERADA_3_AQUI
```

**⚠️ IMPORTANTE:** Guarde essas senhas em um local seguro (gerenciador de senhas)!

---

## 🏗️ Passo 4: Build e Deploy

### 4.1. Instalar dependências do Node.js

```bash
npm install
```

### 4.2. Fazer build do frontend

```bash
npm run build
```

### 4.3. Preparar arquivos para o Nginx

```bash
mkdir -p frontend/dist
cp -r dist/* frontend/dist/
```

### 4.4. Copiar assets públicos

```bash
cp public/* frontend/dist/
```

### 4.5. Subir os containers Docker

```bash
sudo docker compose up -d
```

### 4.6. Verificar se tudo está rodando

```bash
sudo docker compose ps
```

Você deve ver 3 containers rodando:
- `newcatalogo-postgres-1`
- `newcatalogo-postgrest-1`
- `newcatalogo-nginx-1`

---

## 🌐 Passo 5: Configurar Domínio (Opcional)

### 5.1. Apontar domínio para o servidor

No painel do seu provedor de domínio (Registro.br, GoDaddy, etc.):

```
Tipo: A
Nome: @
Valor: SEU_IP_DO_SERVIDOR
TTL: 3600

Tipo: A
Nome: www
Valor: SEU_IP_DO_SERVIDOR
TTL: 3600
```

### 5.2. Aguardar propagação DNS (pode levar até 48h)

```bash
# Verificar se o DNS propagou
nslookup seudominio.com.br
```

---

## 🔒 Passo 6: Configurar SSL/HTTPS (Recomendado)

### 6.1. Instalar Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 6.2. Atualizar configuração do Nginx

Edite o arquivo `nginx/nginx.conf` e adicione seu domínio:

```bash
nano nginx/nginx.conf
```

Adicione na linha `server_name`:

```nginx
server_name seudominio.com.br www.seudominio.com.br;
```

### 6.3. Reiniciar Nginx

```bash
sudo docker compose restart nginx
```

### 6.4. Gerar certificado SSL

```bash
# Parar o Nginx temporariamente
sudo docker compose stop nginx

# Gerar certificado
sudo certbot certonly --standalone -d seudominio.com.br -d www.seudominio.com.br

# Reiniciar Nginx
sudo docker compose start nginx
```

### 6.5. Configurar renovação automática

```bash
# Testar renovação
sudo certbot renew --dry-run

# Adicionar ao cron para renovação automática
sudo crontab -e
```

Adicione esta linha:

```cron
0 3 * * * certbot renew --quiet --post-hook "docker compose -f /var/www/NewCatalogo/docker-compose.yml restart nginx"
```

---

## 🎯 Passo 7: Testar a Aplicação

### 7.1. Acessar via navegador

```
http://SEU_IP_OU_DOMINIO
```

Você deve ver a landing page do New Catálogo.

### 7.2. Testar login admin

```
http://SEU_IP_OU_DOMINIO/demo/admin/login

Email: admin@demo.com
Senha: admin123
```

### 7.3. Verificar logs (se houver problemas)

```bash
# Ver logs de todos os containers
sudo docker compose logs -f

# Ver logs apenas do Nginx
sudo docker compose logs -f nginx

# Ver logs apenas do PostgREST
sudo docker compose logs -f postgrest

# Ver logs apenas do PostgreSQL
sudo docker compose logs -f postgres
```

---

## 🔄 Passo 8: Atualizar a Aplicação

Quando você fizer alterações no código e quiser atualizar a produção:

### 8.1. Método Rápido (usando o script)

```bash
cd /var/www/NewCatalogo
./deploy.sh
```

### 8.2. Método Manual

```bash
cd /var/www/NewCatalogo

# Atualizar código
git pull

# Instalar novas dependências (se houver)
npm install

# Rebuild frontend
npm run build

# Atualizar arquivos do Nginx
rm -rf frontend/dist
mkdir -p frontend/dist
cp -r dist/* frontend/dist/
cp public/* frontend/dist/

# Reiniciar containers
sudo docker compose restart
```

---

## 🛡️ Passo 9: Segurança e Manutenção

### 9.1. Backup do banco de dados

```bash
# Criar backup
sudo docker exec newcatalogo-postgres-1 pg_dump -U postgres new_catalogo > backup_$(date +%Y%m%d).sql

# Restaurar backup
sudo docker exec -i newcatalogo-postgres-1 psql -U postgres new_catalogo < backup_20240316.sql
```

### 9.2. Configurar backup automático

```bash
# Criar script de backup
sudo nano /usr/local/bin/backup-catalogo.sh
```

Conteúdo do script:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/newcatalogo"
mkdir -p $BACKUP_DIR
docker exec newcatalogo-postgres-1 pg_dump -U postgres new_catalogo > $BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql
# Manter apenas últimos 7 dias
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
```

Tornar executável e adicionar ao cron:

```bash
sudo chmod +x /usr/local/bin/backup-catalogo.sh
sudo crontab -e
```

Adicionar:

```cron
0 2 * * * /usr/local/bin/backup-catalogo.sh
```

### 9.3. Monitoramento

```bash
# Ver uso de recursos
docker stats

# Ver espaço em disco
df -h

# Ver memória
free -h
```

---

## 📝 Comandos Úteis

### Docker Compose

```bash
# Ver status dos containers
sudo docker compose ps

# Ver logs
sudo docker compose logs -f

# Parar todos os containers
sudo docker compose down

# Iniciar containers
sudo docker compose up -d

# Reiniciar um container específico
sudo docker compose restart nginx

# Reconstruir containers (após mudanças no docker-compose.yml)
sudo docker compose up -d --build
```

### Banco de Dados

```bash
# Acessar PostgreSQL
sudo docker exec -it newcatalogo-postgres-1 psql -U postgres -d new_catalogo

# Listar schemas
\dn

# Listar tabelas de um schema
\dt master.*
\dt demo.*

# Sair do psql
\q
```

### Nginx

```bash
# Testar configuração
sudo docker exec newcatalogo-nginx-1 nginx -t

# Recarregar configuração
sudo docker compose restart nginx
```

---

## 🆘 Solução de Problemas

### Problema: Containers não iniciam

```bash
# Ver logs detalhados
sudo docker compose logs

# Verificar se portas estão em uso
sudo netstat -tulpn | grep -E '80|443|3000|5432'

# Parar e remover tudo
sudo docker compose down -v
sudo docker compose up -d
```

### Problema: Erro 502 Bad Gateway

```bash
# Verificar se PostgREST está rodando
sudo docker compose ps postgrest

# Ver logs do PostgREST
sudo docker compose logs postgrest

# Reiniciar PostgREST
sudo docker compose restart postgrest
```

### Problema: Banco de dados não conecta

```bash
# Verificar se PostgreSQL está rodando
sudo docker compose ps postgres

# Ver logs do PostgreSQL
sudo docker compose logs postgres

# Verificar variáveis de ambiente
cat .env
```

### Problema: Arquivos estáticos não carregam

```bash
# Verificar se arquivos estão no lugar certo
ls -la frontend/dist/

# Rebuild e redeploy
./deploy.sh
```

---

## 📊 Checklist de Deploy

- [ ] Servidor VPS configurado
- [ ] Docker e Docker Compose instalados
- [ ] Firewall configurado (portas 22, 80, 443)
- [ ] Projeto clonado em `/var/www/NewCatalogo`
- [ ] Arquivo `.env` criado com senhas fortes
- [ ] Dependências instaladas (`npm install`)
- [ ] Frontend compilado (`npm run build`)
- [ ] Containers Docker rodando (`docker compose up -d`)
- [ ] Aplicação acessível via navegador
- [ ] Domínio configurado (opcional)
- [ ] SSL/HTTPS configurado (recomendado)
- [ ] Backup automático configurado
- [ ] Monitoramento configurado

---

## 🎓 Dicas Importantes

1. **Sempre faça backup** antes de atualizar
2. **Use senhas fortes** no arquivo `.env`
3. **Configure SSL/HTTPS** para segurança
4. **Monitore os logs** regularmente
5. **Mantenha o sistema atualizado** (`apt update && apt upgrade`)
6. **Use o script `deploy.sh`** para facilitar atualizações
7. **Documente mudanças** que você fizer

---

## 📞 Suporte

Se tiver problemas:

1. Verifique os logs: `sudo docker compose logs -f`
2. Consulte este documento
3. Entre em contato com o suporte da New Standard

---

**Última atualização:** Março 2026  
**Versão:** 1.0  
**Autor:** New Standard
