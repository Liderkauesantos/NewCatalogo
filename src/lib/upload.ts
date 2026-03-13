import api from '@/lib/api';

/**
 * Upload a file via the API.
 * Expects a POST /rpc/upload endpoint that accepts multipart/form-data
 * and returns { url: string }.
 *
 * Fallback: if the endpoint doesn't exist yet, converts to base64 data URL.
 * Replace this with your actual storage solution (MinIO, S3, local volume, etc.)
 */
export async function uploadFile(file: File, folder: string = 'uploads'): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const { data } = await api.post('/rpc/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return data.url;
  } catch {
    // Fallback: convert to object URL for local preview
    // In production, implement a proper storage endpoint
    return URL.createObjectURL(file);
  }
}
