/**
 * Upload de imagens para o Cloudinary
 * 
 * Suporta dois modos:
 * 1. SIGNED UPLOAD (recomendado): Usa assinatura do backend para maior segurança
 * 2. UNSIGNED UPLOAD (fallback): Usa upload preset sem assinatura
 * 
 * Para usar signed upload, configure:
 * - VITE_CLOUDINARY_SIGNATURE_URL no .env
 * - Execute o serviço cloudinary-service
 */

const SIGNATURE_SERVICE_URL = import.meta.env.VITE_CLOUDINARY_SIGNATURE_URL;
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

/**
 * Obtém assinatura do backend
 */
async function getSignature(folder: string) {
  if (!SIGNATURE_SERVICE_URL) {
    return null; // Fallback para unsigned upload
  }

  try {
    const response = await fetch(
      `${SIGNATURE_SERVICE_URL}/api/cloudinary/signature?folder=${encodeURIComponent(folder)}`
    );

    if (!response.ok) {
      console.warn('Erro ao obter assinatura, usando unsigned upload');
      return null;
    }

    return await response.json();
  } catch (error) {
    console.warn('Serviço de assinatura indisponível, usando unsigned upload');
    return null;
  }
}

/**
 * Upload com assinatura (signed)
 */
async function uploadSigned(file: File, folder: string, signatureData: any): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', signatureData.apiKey);
  formData.append('timestamp', signatureData.timestamp.toString());
  formData.append('signature', signatureData.signature);
  formData.append('folder', folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/image/upload`,
    { method: 'POST', body: formData }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error?.message || 'Erro ao enviar imagem para o Cloudinary.');
  }

  const data = await response.json();
  return data.secure_url;
}

/**
 * Upload sem assinatura (unsigned) - fallback
 */
async function uploadUnsigned(file: File, folder: string): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      'Cloudinary não configurado. Defina VITE_CLOUDINARY_CLOUD_NAME e VITE_CLOUDINARY_UPLOAD_PRESET no .env'
    );
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error?.message || 'Erro ao enviar imagem para o Cloudinary.');
  }

  const data = await response.json();
  return data.secure_url;
}

/**
 * Upload a file to Cloudinary.
 * Tenta usar signed upload primeiro, fallback para unsigned se necessário.
 * Returns the secure URL of the uploaded image.
 *
 * @param file - The file to upload
 * @param folder - Cloudinary folder to organize uploads (e.g. 'product-images', 'banners')
 */
export async function uploadFile(file: File, folder: string = 'uploads'): Promise<string> {
  // Validar tipo de arquivo
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Tipo de arquivo não permitido. Use: JPG, PNG, WebP, SVG ou GIF.');
  }

  // Validar tamanho (máx 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('Arquivo muito grande. Tamanho máximo: 10MB.');
  }

  // Capturar slug do tenant da URL ou localStorage
  const pathParts = window.location.pathname.split('/').filter(p => p);
  const slug = pathParts[0] || localStorage.getItem('nc_tenant_slug') || 'global';
  const fullFolder = `newcatalogo/${slug}/${folder}`;

  // Tentar signed upload primeiro
  const signatureData = await getSignature(fullFolder);

  if (signatureData) {
    console.log('✅ Usando signed upload (seguro)');
    return uploadSigned(file, fullFolder, signatureData);
  } else {
    console.log('⚠️ Usando unsigned upload (fallback)');
    return uploadUnsigned(file, fullFolder);
  }
}
