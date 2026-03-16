/**
 * Cloudinary Signature Service
 * 
 * Micro-serviço Express para gerar assinaturas seguras do Cloudinary.
 * Mantém o API_SECRET no backend, expondo apenas a assinatura gerada.
 */

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Validar variáveis de ambiente
const requiredEnvVars = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Variáveis de ambiente faltando:', missingVars.join(', '));
  process.exit(1);
}

/**
 * Gera assinatura SHA1 para upload do Cloudinary
 * 
 * @param {Object} params - Parâmetros para assinar (ex: folder, timestamp)
 * @param {string} apiSecret - API Secret do Cloudinary
 * @returns {string} Assinatura SHA1 em hexadecimal
 */
function generateSignature(params, apiSecret) {
  // Ordenar parâmetros alfabeticamente
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');

  // Gerar HMAC SHA1
  return crypto
    .createHash('sha1')
    .update(sortedParams + apiSecret)
    .digest('hex');
}

/**
 * Endpoint: GET /api/cloudinary/signature
 * 
 * Gera assinatura para upload seguro no Cloudinary.
 * Query params opcionais:
 *   - folder: pasta no Cloudinary (padrão: 'uploads')
 */
app.get('/api/cloudinary/signature', (req, res) => {
  try {
    const folder = req.query.folder || 'uploads';
    const timestamp = Math.round(Date.now() / 1000);

    // Parâmetros que serão assinados
    const paramsToSign = {
      folder,
      timestamp
    };

    // Gerar assinatura
    const signature = generateSignature(paramsToSign, process.env.CLOUDINARY_API_SECRET);

    // Retornar dados necessários para o frontend
    res.json({
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      timestamp,
      signature,
      folder
    });
  } catch (error) {
    console.error('Erro ao gerar assinatura:', error);
    res.status(500).json({ error: 'Erro ao gerar assinatura' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'cloudinary-signature' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Cloudinary Signature Service rodando na porta ${PORT}`);
  console.log(`📝 Cloud Name: ${process.env.CLOUDINARY_CLOUD_NAME}`);
  console.log(`🔑 API Key: ${process.env.CLOUDINARY_API_KEY}`);
});
