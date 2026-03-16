const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

/**
 * Upload a file to Cloudinary.
 * Uses unsigned upload preset (configured in Cloudinary dashboard).
 * Returns the secure URL of the uploaded image.
 *
 * @param file - The file to upload
 * @param folder - Cloudinary folder to organize uploads (e.g. 'product-images', 'banners')
 */
export async function uploadFile(file: File, folder: string = 'uploads'): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      'Cloudinary não configurado. Defina VITE_CLOUDINARY_CLOUD_NAME e VITE_CLOUDINARY_UPLOAD_PRESET no .env'
    );
  }

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

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', `newcatalogo/${slug}/${folder}`);

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
