/**
 * Componente de exemplo para upload de imagens com Cloudinary
 * 
 * Demonstra:
 * - Seleção de arquivo
 * - Barra de progresso
 * - Preview da imagem
 * - Tratamento de erros
 */

import { useState } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { useCloudinaryUpload } from '@/hooks/useCloudinaryUpload';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

export default function ImageUpload({ folder = 'uploads', onUploadComplete }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [imageData, setImageData] = useState(null);
  const { upload, progress, isUploading, error } = useCloudinaryUpload();
  const { toast } = useToast();

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Fazer upload
      const result = await upload(file, folder);

      // Salvar dados da imagem
      setImageUrl(result.secure_url);
      setImageData({
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format
      });

      // Notificar sucesso
      toast({
        title: 'Upload concluído!',
        description: 'Imagem enviada com sucesso.'
      });

      // Callback opcional
      if (onUploadComplete) {
        onUploadComplete(result);
      }
    } catch (err) {
      toast({
        title: 'Erro no upload',
        description: err.message,
        variant: 'destructive'
      });
    }
  };

  const handleRemove = () => {
    setImageUrl(null);
    setImageData(null);
  };

  return (
    <Card>
      <CardContent className="p-6">
        {!imageUrl ? (
          <div className="space-y-4">
            {/* Área de upload */}
            <label
              htmlFor="image-upload"
              className={`
                flex flex-col items-center justify-center
                w-full h-64 border-2 border-dashed rounded-lg
                cursor-pointer transition-colors
                ${isUploading ? 'border-primary bg-primary/5' : 'border-border hover:border-primary hover:bg-accent'}
              `}
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {isUploading ? (
                  <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                ) : (
                  <Upload className="w-12 h-12 text-muted-foreground mb-4" />
                )}
                <p className="mb-2 text-sm text-muted-foreground">
                  <span className="font-semibold">Clique para enviar</span> ou arraste e solte
                </p>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, WebP, SVG ou GIF (máx. 10MB)
                </p>
              </div>
              <input
                id="image-upload"
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={isUploading}
              />
            </label>

            {/* Barra de progresso */}
            {isUploading && (
              <div className="space-y-2">
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-center text-muted-foreground">
                  Enviando... {progress}%
                </p>
              </div>
            )}

            {/* Erro */}
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Preview da imagem */}
            <div className="relative">
              <img
                src={imageUrl}
                alt="Upload"
                className="w-full h-64 object-cover rounded-lg"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={handleRemove}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Informações da imagem */}
            {imageData && (
              <div className="p-4 bg-muted rounded-lg space-y-1 text-sm">
                <p className="font-semibold">Informações:</p>
                <p className="text-muted-foreground">
                  Dimensões: {imageData.width} × {imageData.height}px
                </p>
                <p className="text-muted-foreground">
                  Formato: {imageData.format?.toUpperCase()}
                </p>
                <p className="text-muted-foreground truncate">
                  Public ID: {imageData.publicId}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
