# R2 Upload Service

Microserviço Node.js/Express para upload de arquivos no Cloudflare R2.

## Funcionalidades

- ✅ Upload de arquivos para R2 (S3-compatible)
- ✅ Deleção de arquivos
- ✅ Geração de URLs pré-assinadas
- ✅ Suporte a CORS
- ✅ Validação de tamanho (10MB max)

## Instalação

```bash
npm install
```

## Configuração

Crie um arquivo `.env` baseado no `.env.example`:

```env
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=newcatalogo
R2_PUBLIC_URL=https://pub-your_account_id.r2.dev
PORT=3001
```

## Uso

### Desenvolvimento

```bash
npm start
```

### Docker

```bash
docker build -t r2-service .
docker run -p 3001:3001 --env-file .env r2-service
```

## Endpoints

### POST /api/upload

Upload de arquivo.

**Request:**
- Content-Type: multipart/form-data
- Body: `file` (arquivo), `folder` (pasta opcional)

**Response:**
```json
{
  "success": true,
  "url": "https://pub-xxx.r2.dev/folder/file.jpg",
  "key": "folder/file.jpg"
}
```

### POST /api/delete

Deleção de arquivo.

**Request:**
```json
{
  "url": "https://pub-xxx.r2.dev/folder/file.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Arquivo deletado com sucesso"
}
```

### GET /api/presigned-url

Gera URL pré-assinada para upload direto.

**Query params:**
- `folder`: pasta de destino
- `fileName`: nome do arquivo

**Response:**
```json
{
  "success": true,
  "uploadUrl": "https://...",
  "key": "folder/file.jpg",
  "publicUrl": "https://pub-xxx.r2.dev/folder/file.jpg"
}
```

### GET /health

Health check do serviço.

**Response:**
```json
{
  "status": "ok",
  "service": "r2-upload-service",
  "bucket": "newcatalogo"
}
```

## Dependências

- `express`: Framework web
- `cors`: Middleware CORS
- `multer`: Upload de arquivos
- `@aws-sdk/client-s3`: Cliente S3 para R2
- `@aws-sdk/s3-request-presigner`: Geração de URLs pré-assinadas
- `dotenv`: Variáveis de ambiente

## Segurança

- API Keys nunca são expostas ao frontend
- Validação de tamanho de arquivo (10MB max)
- CORS configurado
- Credenciais via variáveis de ambiente
