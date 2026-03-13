import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  display_order: number;
  created_at: string;
}

export function useProductImages(productId: string | undefined) {
  return useQuery({
    queryKey: ["product-images", productId],
    queryFn: async () => {
      if (!productId) return [];
      const { data } = await api.get('/product_images', {
        params: { product_id: `eq.${productId}`, order: 'display_order' },
      });
      return (data ?? []) as ProductImage[];
    },
    enabled: !!productId,
  });
}

export function useCreateProductImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (image: { product_id: string; image_url: string; display_order: number }) => {
      const { data } = await api.post('/product_images', image, {
        headers: { Prefer: 'return=representation' },
      });
      return Array.isArray(data) ? data[0] : data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["product-images", vars.product_id] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["all-products"] });
    },
  });
}

export function useDeleteProductImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, product_id }: { id: string; product_id: string }) => {
      await api.delete(`/product_images?id=eq.${id}`);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["product-images", vars.product_id] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["all-products"] });
    },
  });
}
