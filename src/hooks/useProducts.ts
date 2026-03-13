import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export interface ProductImage {
  id: string;
  image_url: string;
  display_order: number;
}

export interface Product {
  id: string;
  name: string;
  code: string;
  description: string | null;
  price: number;
  stock_quantity: number;
  image_url: string | null;
  category_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  categories?: { name: string } | null;
  product_images?: ProductImage[];
}

async function fetchProductsWithRelations(params: Record<string, string> = {}): Promise<Product[]> {
  const { data: products } = await api.get('/products', {
    params: { order: 'name', ...params },
  });
  if (!Array.isArray(products)) return [];

  const ids = products.map((p: any) => p.id);
  if (ids.length === 0) return [];

  const [catRes, imgRes] = await Promise.all([
    api.get('/categories'),
    api.get('/product_images', {
      params: { product_id: `in.(${ids.join(',')})`, order: 'display_order' },
    }),
  ]);

  const catMap = new Map((catRes.data ?? []).map((c: any) => [c.id, c]));

  return products.map((p: any) => ({
    ...p,
    categories: catMap.get(p.category_id) ? { name: (catMap.get(p.category_id) as any).name } : null,
    product_images: (imgRes.data ?? []).filter((img: any) => img.product_id === p.id),
  }));
}

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: () => fetchProductsWithRelations({ is_active: 'eq.true' }),
  });
}

export function useAllProducts() {
  return useQuery({
    queryKey: ["all-products"],
    queryFn: () => fetchProductsWithRelations(),
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (product: Omit<Product, "id" | "created_at" | "updated_at" | "categories" | "product_images">) => {
      const { data } = await api.post('/products', product, {
        headers: { Prefer: 'return=representation' },
      });
      return Array.isArray(data) ? data[0] : data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["all-products"] });
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Product> & { id: string }) => {
      const { categories, product_images, ...cleanUpdates } = updates as any;
      const { data } = await api.patch(`/products?id=eq.${id}`, cleanUpdates, {
        headers: { Prefer: 'return=representation' },
      });
      return Array.isArray(data) ? data[0] : data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["all-products"] });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/products?id=eq.${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["all-products"] });
    },
  });
}
