/**
 * Hook para upload de imagens no Cloudinary com assinatura segura
 * 
 * Fluxo:
 * 1. Solicita assinatura do backend
 * 2. Faz upload direto para o Cloudinary usando XMLHttpRequest
 * 3. Retorna progresso e resultado do upload
 * 
 * @example
 * const { upload, progress, isUploading, error } = useCloudinaryUpload();
 * 
 * const handleUpload = async (file) => {
 *   const result = await upload(file, 'products');
 *   console.log('URL:', result.secure_url);
 * };
 */

import { useState, useCallback } from 'react';

const SIGNATURE_SERVICE_URL = import.meta.env.VITE_CLOUDINARY_SIGNATURE_URL || 'http://localhost:3001';

export function useCloudinaryUpload() {
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Solicita assinatura do backend
   */
  const getSignature = async (folder) => {
    const response = await fetch(
      `${SIGNATURE_SERVICE_URL}/api/cloudinary/signature?folder=${encodeURIComponent(folder)}`
    );

    if (!response.ok) {
      throw new Error('Erro ao obter assinatura do servidor');
    }

    return response.json();
  };

  /**
   * Faz upload usando XMLHttpRequest para ter controle do progresso
   */
  const uploadToCloudinary = (file, signatureData) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();

      // Adicionar dados do arquivo e assinatura
      formData.append('file', file);
      formData.append('api_key', signatureData.apiKey);
      formData.append('timestamp', signatureData.timestamp);
      formData.append('signature', signatureData.signature);
      formData.append('folder', signatureData.folder);

      // Monitorar progresso
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setProgress(percentComplete);
        }
      });

      // Sucesso
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (err) {
            reject(new Error('Erro ao processar resposta do Cloudinary'));
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error?.error?.message || 'Erro no upload'));
          } catch {
            reject(new Error(`Erro no upload: ${xhr.status}`));
          }
        }
      });

      // Erro de rede
      xhr.addEventListener('error', () => {
        reject(new Error('Erro de rede ao fazer upload'));
      });

      // Timeout
      xhr.addEventListener('timeout', () => {
        reject(new Error('Timeout no upload'));
      });

      // Enviar requisição
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/image/upload`);
      xhr.timeout = 60000; // 60 segundos
      xhr.send(formData);
    });
  };

  /**
   * Função principal de upload
   * 
   * @param {File} file - Arquivo a ser enviado
   * @param {string} folder - Pasta no Cloudinary (ex: 'products', 'banners')
   * @returns {Promise<Object>} Resposta do Cloudinary com secure_url, public_id, etc
   */
  const upload = useCallback(async (file, folder = 'uploads') => {
    // Validações
    if (!file) {
      throw new Error('Nenhum arquivo selecionado');
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Tipo de arquivo não permitido. Use: JPG, PNG, WebP, SVG ou GIF');
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('Arquivo muito grande. Tamanho máximo: 10MB');
    }

    // Capturar slug do tenant da URL ou localStorage
    const pathParts = window.location.pathname.split('/').filter(p => p);
    const slug = pathParts[0] || localStorage.getItem('nc_tenant_slug') || 'global';
    const fullFolder = `newcatalogo/${slug}/${folder}`;

    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      // 1. Obter assinatura do backend
      const signatureData = await getSignature(fullFolder);

      // 2. Fazer upload para o Cloudinary
      const result = await uploadToCloudinary(file, signatureData);

      setProgress(100);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, []);

  /**
   * Reseta o estado do hook
   */
  const reset = useCallback(() => {
    setProgress(0);
    setIsUploading(false);
    setError(null);
  }, []);

  return {
    upload,
    progress,
    isUploading,
    error,
    reset
  };
}
