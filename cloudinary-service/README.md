# Cloudinary Signature Service

Micro-serviço Node.js Express para gerar assinaturas seguras do Cloudinary.

## 🚀 Início Rápido

### Instalação

```bash
npm install
```

### Configuração

Copie `.env.example` para `.env` e preencha com suas credenciais:

```bash
cp .env.example .env
```

Edite o `.env`:
```env
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=seu_api_secret
PORT=3001
```

### Executar

```bash
# Produção
npm start

# Desenvolvimento (com watch)
npm run dev
```

## 📡 Endpoints

### GET /api/cloudinary/signature

Gera assinatura para upload seguro.

**Query Parameters:**
- `folder` (opcional): Pasta no Cloudinary (padrão: 'uploads')

**Resposta:**
```json
{
  "cloudName": "seu_cloud_name",
  "apiKey": "sua_api_key",
  "timestamp": 1234567890,
  "signature": "abc123...",
  "folder": "uploads"
}
```

### GET /health

Health check do serviço.

**Resposta:**
```json
{
  "status": "ok",
  "service": "cloudinary-signature"
}
```

## 🐳 Docker

```bash
# Build
docker build -t cloudinary-signature .

# Run
docker run -p 3001:3001 \
  -e CLOUDINARY_CLOUD_NAME=seu_cloud_name \
  -e CLOUDINARY_API_KEY=sua_api_key \
  -e CLOUDINARY_API_SECRET=seu_api_secret \
  cloudinary-signature
```

## 🔒 Segurança

- O `API_SECRET` nunca é exposto ao frontend
- A assinatura é gerada usando SHA1
- CORS habilitado para permitir requisições do frontend
