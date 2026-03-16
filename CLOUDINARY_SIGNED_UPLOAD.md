# 🔐 Cloudinary Signed Upload - Documentação

## 📋 Visão Geral

Este projeto implementa **upload seguro de imagens** para o Cloudinary usando **assinatura gerada no backend**. Isso evita expor o `API_SECRET` no frontend e previne uploads não autorizados.

## 🏗️ Arquitetura

```
┌─────────────┐      1. Solicita assinatura     ┌──────────────────┐
│   React     │ ─────────────────────────────> │  Signature       │
│  Frontend   │                                  │  Service (3001)  │
└─────────────┘                                  └──────────────────┘
       │                                                  │
       │                                                  │ 2. Gera assinatura
       │                                                  │    SHA1(params + secret)
       │                                                  │
       │         3. Retorna assinatura                   │
       │ <─────────────────────────────────────────────┘
       │
       │         4. Upload com assinatura
       │ ─────────────────────────────────────────────>
       │                                          ┌──────────────────┐
       │                                          │   Cloudinary     │
       │         5. Retorna URL da imagem         │   API            │
       │ <───────────────────────────────────────│                  │
       │                                          └──────────────────┘
```

## 📁 Estrutura de Arquivos

```
NewCatalogo/
├── cloudinary-service/          # Micro-serviço Node.js
│   ├── package.json
│   ├── server.js               # Endpoint de assinatura
│   ├── Dockerfile
│   └── .env.example
│
├── src/
│   ├── hooks/
│   │   └── useCloudinaryUpload.js    # Hook com progresso
│   ├── components/
│   │   └── ImageUpload.jsx           # Componente de exemplo
│   └── lib/
│       └── upload.ts                 # Função uploadFile atualizada
│
├── docker-compose.yml          # Inclui serviço de assinatura
└── .env                        # Credenciais do Cloudinary
```

## 🚀 Como Usar

### 1️⃣ Configurar Credenciais

Preencha o `.env` com suas credenciais do Cloudinary:

```env
# Cloud Name (obrigatório)
VITE_CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_CLOUD_NAME=seu_cloud_name

# API Key e Secret (para signed upload)
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=seu_api_secret

# Upload Preset (fallback para unsigned)
VITE_CLOUDINARY_UPLOAD_PRESET=seu_preset

# URL do serviço de assinatura
VITE_CLOUDINARY_SIGNATURE_URL=http://localhost:3001
```

### 2️⃣ Iniciar o Serviço de Assinatura

**Opção A: Com Docker (recomendado)**

```bash
# Subir todos os serviços incluindo cloudinary-signature
sudo docker compose up -d

# Verificar logs
sudo docker compose logs -f cloudinary-signature
```

**Opção B: Localmente (desenvolvimento)**

```bash
cd cloudinary-service
npm install
npm start
```

O serviço estará disponível em `http://localhost:3001`

### 3️⃣ Usar no Frontend

**Opção 1: Hook com progresso (recomendado para novos componentes)**

```jsx
import { useCloudinaryUpload } from '@/hooks/useCloudinaryUpload';

function MyComponent() {
  const { upload, progress, isUploading, error } = useCloudinaryUpload();

  const handleUpload = async (file) => {
    try {
      const result = await upload(file, 'products');
      console.log('URL:', result.secure_url);
      console.log('Public ID:', result.public_id);
      console.log('Dimensões:', result.width, 'x', result.height);
    } catch (err) {
      console.error('Erro:', err.message);
    }
  };

  return (
    <div>
      <input type="file" onChange={(e) => handleUpload(e.target.files[0])} />
      {isUploading && <p>Progresso: {progress}%</p>}
      {error && <p>Erro: {error}</p>}
    </div>
  );
}
```

**Opção 2: Função uploadFile (compatível com código existente)**

```jsx
import { uploadFile } from '@/lib/upload';

async function handleUpload(file) {
  try {
    const url = await uploadFile(file, 'products');
    console.log('URL:', url);
  } catch (err) {
    console.error('Erro:', err.message);
  }
}
```

**Opção 3: Componente pronto ImageUpload**

```jsx
import ImageUpload from '@/components/ImageUpload';

function MyPage() {
  const handleUploadComplete = (result) => {
    console.log('Upload completo:', result);
    // Salvar URL no banco, etc
  };

  return (
    <ImageUpload 
      folder="products" 
      onUploadComplete={handleUploadComplete} 
    />
  );
}
```

## 🔄 Fallback Automático

O sistema possui **fallback automático**:

1. **Tenta signed upload primeiro** (se `VITE_CLOUDINARY_SIGNATURE_URL` estiver configurado)
2. **Fallback para unsigned upload** (se o serviço de assinatura estiver indisponível)

Isso garante que o upload sempre funcione, mesmo se o serviço de assinatura estiver offline.

## 🔒 Segurança

### ✅ Vantagens do Signed Upload

- **API Secret nunca vai para o frontend**
- **Previne uploads não autorizados**
- **Controle total sobre parâmetros de upload**
- **Pode adicionar validações customizadas no backend**

### ⚠️ Unsigned Upload (fallback)

- Requer criar um **Upload Preset** no Cloudinary
- Menos seguro (qualquer um com o preset pode fazer upload)
- Útil como fallback ou para prototipagem rápida

## 🧪 Testar a Implementação

### 1. Testar o serviço de assinatura

```bash
curl http://localhost:3001/api/cloudinary/signature?folder=test
```

Resposta esperada:
```json
{
  "cloudName": "seu_cloud_name",
  "apiKey": "sua_api_key",
  "timestamp": 1234567890,
  "signature": "abc123...",
  "folder": "test"
}
```

### 2. Testar upload no frontend

Acesse a aplicação e tente fazer upload de uma imagem. Verifique o console:

- ✅ `Usando signed upload (seguro)` - Funcionando corretamente
- ⚠️ `Usando unsigned upload (fallback)` - Serviço de assinatura indisponível

## 📊 Monitoramento

### Logs do serviço de assinatura

```bash
# Docker
sudo docker compose logs -f cloudinary-signature

# Local
# Os logs aparecem no terminal onde você executou npm start
```

### Health Check

```bash
curl http://localhost:3001/health
```

## 🐛 Troubleshooting

### Erro: "Serviço de assinatura indisponível"

**Causa:** O serviço não está rodando ou a URL está incorreta

**Solução:**
1. Verifique se o serviço está rodando: `sudo docker compose ps`
2. Verifique a URL no `.env`: `VITE_CLOUDINARY_SIGNATURE_URL=http://localhost:3001`
3. Teste o endpoint: `curl http://localhost:3001/health`

### Erro: "Invalid Signature"

**Causa:** Credenciais incorretas ou parâmetros diferentes entre assinatura e upload

**Solução:**
1. Verifique se `CLOUDINARY_API_KEY` e `CLOUDINARY_API_SECRET` estão corretos
2. Reinicie o serviço após alterar credenciais: `sudo docker compose restart cloudinary-signature`

### Erro: "CORS"

**Causa:** O serviço de assinatura não permite requisições do frontend

**Solução:** O serviço já está configurado com CORS habilitado. Se o erro persistir, verifique se está acessando pela URL correta.

## 🚀 Deploy em Produção

### 1. Atualizar variáveis de ambiente

```env
# Produção
VITE_CLOUDINARY_SIGNATURE_URL=https://seu-dominio.com/cloudinary-signature
```

### 2. Configurar proxy no Nginx (opcional)

Adicione ao `nginx.conf`:

```nginx
location /cloudinary-signature/ {
    proxy_pass http://cloudinary-signature:3001/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

Então use:
```env
VITE_CLOUDINARY_SIGNATURE_URL=/cloudinary-signature
```

### 3. Subir os serviços

```bash
sudo docker compose up -d --build
```

## 📝 Notas Importantes

1. **Nunca commite o `.env`** com credenciais reais
2. **Use variáveis de ambiente** em produção (não hardcode)
3. **Monitore o uso** do Cloudinary para evitar custos inesperados
4. **Configure limites** de tamanho e tipo de arquivo conforme necessário
5. **Implemente rate limiting** no serviço de assinatura se necessário

## 🔗 Referências

- [Cloudinary Upload API](https://cloudinary.com/documentation/image_upload_api_reference)
- [Signed Upload](https://cloudinary.com/documentation/upload_images#signed_upload)
- [Upload Presets](https://cloudinary.com/documentation/upload_presets)
