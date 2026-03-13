import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Product, useCreateProduct, useUpdateProduct } from "@/hooks/useProducts";
import { useProductImages, useCreateProductImage, useDeleteProductImage } from "@/hooks/useProductImages";
import { useCategories, useCreateCategory } from "@/hooks/useCategories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, X, Image as ImageIcon } from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  code: z.string().min(1, "Código obrigatório"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Preço inválido"),
  stock_quantity: z.coerce.number().int().min(0, "Estoque inválido"),
  category_id: z.string().optional(),
  is_active: z.boolean().default(true),
});

type FormData = z.infer<typeof schema>;

interface ImageItem {
  id?: string; // DB id for existing images
  url: string;
  isNew?: boolean;
}

interface ProductFormProps {
  product?: Product;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const { toast } = useToast();
  const { data: categories = [] } = useCategories();
  const { data: existingImages = [] } = useProductImages(product?.id);
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const createCategory = useCreateCategory();
  const createProductImage = useCreateProductImage();
  const deleteProductImage = useDeleteProductImage();

  // Initialize images from product data
  useEffect(() => {
    const imgs: ImageItem[] = [];
    if (product?.image_url) {
      imgs.push({ url: product.image_url });
    }
    existingImages.forEach((img) => {
      imgs.push({ id: img.id, url: img.image_url });
    });
    if (imgs.length > 0) setImages(imgs);
  }, [product, existingImages]);

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: product?.name ?? "",
      code: product?.code ?? "",
      description: product?.description ?? "",
      price: product?.price ?? 0,
      stock_quantity: product?.stock_quantity ?? 0,
      category_id: product?.category_id ?? undefined,
      is_active: product?.is_active ?? true,
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const newImages: ImageItem[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
        if (error) throw error;
        const { data } = supabase.storage.from("product-images").getPublicUrl(path);
        newImages.push({ url: data.publicUrl, isNew: true });
      }
      setImages((prev) => [...prev, ...newImages]);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro no upload", description: err.message });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveImage = (index: number) => {
    const img = images[index];
    if (img.id) {
      setRemovedImageIds((prev) => [...prev, img.id!]);
    }
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    const cat = await createCategory.mutateAsync(newCategory.trim());
    setValue("category_id", cat.id);
    setNewCategory("");
  };

  const onSubmit = async (data: FormData) => {
    try {
      const primaryImageUrl = images.length > 0 ? images[0].url : null;
      const payload = {
        ...data,
        description: data.description || null,
        category_id: data.category_id || null,
        image_url: primaryImageUrl,
      };

      let productId = product?.id;

      if (product) {
        await updateProduct.mutateAsync({ id: product.id, ...payload });
      } else {
        const created = await createProduct.mutateAsync(payload as any);
        productId = created.id;
      }

      // Delete removed images
      for (const imgId of removedImageIds) {
        await deleteProductImage.mutateAsync({ id: imgId, product_id: productId! });
      }

      // Save additional images (index > 0) that are new
      const additionalImages = images.slice(1);
      for (let i = 0; i < additionalImages.length; i++) {
        const img = additionalImages[i];
        if (img.isNew) {
          await createProductImage.mutateAsync({
            product_id: productId!,
            image_url: img.url,
            display_order: i,
          });
        }
      }

      toast({ title: product ? "Produto atualizado!" : "Produto criado!" });
      onSuccess();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Nome *</Label>
          <Input {...register("name")} className="rounded-xl" />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Código *</Label>
          <Input {...register("code")} className="rounded-xl" />
          {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Descrição</Label>
        <Textarea {...register("description")} rows={2} className="rounded-xl resize-none" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Preço (R$) *</Label>
          <Input type="number" step="0.01" {...register("price")} className="rounded-xl" />
          {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Estoque *</Label>
          <Input type="number" {...register("stock_quantity")} className="rounded-xl" />
          {errors.stock_quantity && <p className="text-xs text-destructive">{errors.stock_quantity.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Categoria</Label>
        <div className="flex gap-2">
          <Select value={watch("category_id")} onValueChange={(v) => setValue("category_id", v)}>
            <SelectTrigger className="rounded-xl flex-1">
              <SelectValue placeholder="Selecionar..." />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Nova..."
            className="rounded-xl w-28"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCategory())}
          />
          <Button type="button" variant="outline" size="sm" onClick={handleAddCategory} className="rounded-xl px-2">
            +
          </Button>
        </div>
      </div>

      {/* Upload de imagens */}
      <div className="space-y-1.5">
        <Label>Fotos do produto</Label>
        
        {/* Grid de previews */}
        {images.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {images.map((img, index) => (
              <div key={`${img.url}-${index}`} className="relative group aspect-square rounded-xl border border-border overflow-hidden">
                <img src={img.url} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                {index === 0 && (
                  <span className="absolute bottom-1 left-1 text-[9px] font-bold uppercase bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                    Principal
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <label className="flex items-center gap-2 border-2 border-dashed border-border rounded-xl p-3 cursor-pointer hover:border-primary transition-colors">
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Upload className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm text-muted-foreground">
            {uploading ? "Enviando..." : "Clique para enviar fotos (múltiplas)"}
          </span>
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
        </label>
        <p className="text-[10px] text-muted-foreground">A primeira foto será a imagem principal do produto.</p>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 rounded-xl">
          Cancelar
        </Button>
        <Button type="submit" className="flex-1 rounded-xl" disabled={isSubmitting || uploading}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
          {product ? "Salvar" : "Criar Produto"}
        </Button>
      </div>
    </form>
  );
}
