/**
 * Cloudflare R2 Upload Service
 * 
 * Microserviço Express para upload de arquivos no Cloudflare R2 (S3-compatible).
 * Usa AWS SDK v3 para comunicação com R2.
 */

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Configurar multer para upload em memória
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

// Validar variáveis de ambiente
const requiredEnvVars = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Variáveis de ambiente faltando:', missingVars.join(', '));
  process.exit(1);
}

// Configurar cliente S3 para R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME;
const PUBLIC_URL = process.env.R2_PUBLIC_URL || `https://pub-${process.env.R2_ACCOUNT_ID}.r2.dev`;

/**
 * Endpoint: POST /api/upload
 * 
 * Faz upload de um arquivo para o R2
 * Form data: file, folder (opcional)
 */
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const folder = req.body.folder || 'uploads';
    const fileName = `${Date.now()}-${req.file.originalname}`;
    const key = `${folder}/${fileName}`;

    // Upload para R2
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    });

    await s3Client.send(command);

    // Retornar URL pública
    const url = `${PUBLIC_URL}/${key}`;

    console.log(`✅ Upload realizado: ${key}`);
    res.json({ 
      success: true, 
      url,
      key 
    });

  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao fazer upload do arquivo' 
    });
  }
});

/**
 * Endpoint: POST /api/delete
 * 
 * Deleta um arquivo do R2
 * Body: { key: string } ou { url: string }
 */
app.post('/api/delete', async (req, res) => {
  try {
    let key = req.body.key;

    // Se recebeu URL ao invés de key, extrair a key
    if (!key && req.body.url) {
      const url = new URL(req.body.url);
      key = url.pathname.substring(1); // Remove a barra inicial
    }

    if (!key) {
      return res.status(400).json({ error: 'key ou url é obrigatório' });
    }

    // Deletar do R2
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);

    console.log(`✅ Arquivo deletado: ${key}`);
    res.json({ 
      success: true,
      message: 'Arquivo deletado com sucesso' 
    });

  } catch (error) {
    console.error('Erro ao deletar:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao deletar arquivo' 
    });
  }
});

/**
 * Endpoint: GET /api/presigned-url
 * 
 * Gera URL pré-assinada para upload direto do frontend
 * Query params: folder, fileName
 */
app.get('/api/presigned-url', async (req, res) => {
  try {
    const folder = req.query.folder || 'uploads';
    const fileName = req.query.fileName || `${Date.now()}-file`;
    const key = `${folder}/${fileName}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    // Gerar URL pré-assinada válida por 5 minutos
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    res.json({
      success: true,
      uploadUrl: signedUrl,
      key,
      publicUrl: `${PUBLIC_URL}/${key}`
    });

  } catch (error) {
    console.error('Erro ao gerar URL pré-assinada:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao gerar URL de upload' 
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'r2-upload-service',
    bucket: BUCKET_NAME 
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 R2 Upload Service rodando na porta ${PORT}`);
  console.log(`📦 Bucket: ${BUCKET_NAME}`);
  console.log(`🌐 Public URL: ${PUBLIC_URL}`);
});
