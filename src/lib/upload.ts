/**
 * Upload de imagens para o Cloudflare R2
 * 
 * Usa o microserviço r2-service para fazer upload de arquivos
 * no Cloudflare R2 (S3-compatible storage)
 * 
 * Inclui:
 * - Compressão automática de imagens
 * - Redimensionamento inteligente
 * - Validações específicas por contexto
 * - Conversão para formatos otimizados
 */

const R2_SERVICE_URL = import.meta.env.VITE_R2_SERVICE_URL || 'http://localhost:3001';

/**
 * Configurações de limites por tipo de imagem
 */
const IMAGE_LIMITS = {
  'brand-assets': {
    maxSize: 2 * 1024 * 1024, // 2MB para logos
    maxWidth: 800,
    maxHeight: 800,
    quality: 0.85,
    description: 'Logo da marca'
  },
  'banners': {
    maxSize: 5 * 1024 * 1024, // 5MB para banners
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.80,
    description: 'Banner do carrossel'
  },
  'product-images': {
    maxSize: 3 * 1024 * 1024, // 3MB para produtos
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.82,
    description: 'Imagem de produto'
  },
  'uploads': {
    maxSize: 5 * 1024 * 1024, // 5MB genérico
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.80,
    description: 'Imagem'
  }
};

type ImageFolder = keyof typeof IMAGE_LIMITS;

/**
 * Extrai a key de uma URL do R2
 * Exemplo: https://pub-xxx.r2.dev/newcatalogo/demo/products/image.jpg
 * Retorna: newcatalogo/demo/products/image.jpg
 */
function extractKeyFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    // Remove a barra inicial do pathname
    return urlObj.pathname.substring(1);
  } catch {
    return null;
  }
}

/**
 * Comprime e otimiza uma imagem usando Canvas API
 */
async function compressImage(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number
): Promise<File> {
  return new Promise((resolve, reject) => {
    // SVG não precisa de compressão
    if (file.type === 'image/svg+xml') {
      resolve(file);
      return;
    }

    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));

    img.onload = () => {
      try {
        // Calcular dimensões mantendo aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }

        // Criar canvas e desenhar imagem redimensionada
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Erro ao criar contexto do canvas'));
          return;
        }

        // Melhorar qualidade do redimensionamento
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Converter para Blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Erro ao comprimir imagem'));
              return;
            }

            // Criar novo File a partir do Blob
            const compressedFile = new File(
              [blob],
              file.name.replace(/\.[^.]+$/, '.jpg'), // Converter para JPG
              { type: 'image/jpeg' }
            );

            console.log(`🗜️ Compressão: ${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB`);
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Erro ao carregar imagem'));

    reader.readAsDataURL(file);
  });
}

/**
 * Upload de arquivo para o R2
 */
async function uploadToR2(file: File, folder: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const response = await fetch(
    `${R2_SERVICE_URL}/api/upload`,
    { method: 'POST', body: formData }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error || 'Erro ao enviar arquivo para o R2.');
  }

  const data = await response.json();
  return data.url;
}

/**
 * Deleta um arquivo do R2
 */
async function deleteFromR2(url: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${R2_SERVICE_URL}/api/delete`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      }
    );

    if (!response.ok) {
      console.warn('Erro ao deletar arquivo do R2');
      return false;
    }

    const result = await response.json();
    console.log('✅ Arquivo deletado do R2');
    return result.success;
  } catch (error) {
    console.warn('Erro ao deletar arquivo:', error);
    return false;
  }
}

/**
 * Upload a file to Cloudflare R2 with automatic compression and optimization.
 * Returns the public URL of the uploaded file.
 *
 * @param file - The file to upload
 * @param folder - R2 folder to organize uploads (e.g. 'product-images', 'banners')
 * @param skipCompression - Skip compression (useful for already optimized images)
 */
export async function uploadFile(
  file: File,
  folder: string = 'uploads',
  skipCompression: boolean = false
): Promise<string> {
  // Validar tipo de arquivo
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Tipo de arquivo não permitido. Use: JPG, PNG, WebP, SVG ou GIF.');
  }

  // Obter configurações específicas para o tipo de imagem
  const limits = IMAGE_LIMITS[folder as ImageFolder] || IMAGE_LIMITS.uploads;

  // Validar tamanho inicial
  if (file.size > limits.maxSize) {
    const maxSizeMB = (limits.maxSize / (1024 * 1024)).toFixed(1);
    throw new Error(
      `${limits.description} muito grande. Tamanho máximo: ${maxSizeMB}MB.\n` +
      `Tamanho atual: ${(file.size / (1024 * 1024)).toFixed(1)}MB`
    );
  }

  let processedFile = file;

  // Comprimir imagem se necessário (exceto SVG)
  if (!skipCompression && file.type !== 'image/svg+xml') {
    try {
      console.log(`🔄 Otimizando ${limits.description}...`);
      processedFile = await compressImage(
        file,
        limits.maxWidth,
        limits.maxHeight,
        limits.quality
      );

      // Verificar se compressão foi efetiva
      if (processedFile.size > limits.maxSize) {
        const maxSizeMB = (limits.maxSize / (1024 * 1024)).toFixed(1);
        throw new Error(
          `Mesmo após compressão, a imagem ainda está muito grande.\n` +
          `Tamanho máximo: ${maxSizeMB}MB\n` +
          `Tamanho após compressão: ${(processedFile.size / (1024 * 1024)).toFixed(1)}MB\n` +
          `Tente usar uma imagem menor ou com menos detalhes.`
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro ao otimizar imagem. Tente novamente.');
    }
  }

  // Capturar slug do tenant da URL
  const pathParts = window.location.pathname.split('/').filter(p => p);
  const slug = pathParts[0] || 'global';
  const fullFolder = `newcatalogo/${slug}/${folder}`;

  console.log('📤 Fazendo upload para R2...');
  return uploadToR2(processedFile, fullFolder);
}

/**
 * Substitui uma imagem existente por uma nova
 * Deleta a imagem antiga do R2 antes de fazer upload da nova
 * 
 * @param file - Novo arquivo para upload
 * @param oldImageUrl - URL da imagem antiga a ser deletada
 * @param folder - Pasta no R2
 * @returns URL da nova imagem
 */
export async function replaceFile(
  file: File,
  oldImageUrl: string | null,
  folder: string = 'uploads'
): Promise<string> {
  // Se existe imagem antiga, deletar primeiro
  if (oldImageUrl) {
    await deleteFromR2(oldImageUrl);
  }

  // Fazer upload da nova imagem
  return uploadFile(file, folder);
}

/**
 * Deleta uma imagem do R2 (exportada para uso direto)
 */
export async function deleteFile(url: string): Promise<boolean> {
  return deleteFromR2(url);
}
