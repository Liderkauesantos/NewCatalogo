import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export interface CarouselSlide {
  id: string;
  title: string;
  subtitle: string | null;
  cta_text: string | null;
  image_url: string | null;
  bg_gradient: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useCarouselSlides() {
  return useQuery({
    queryKey: ["carousel-slides"],
    queryFn: async () => {
      const { data } = await api.get('/carousel_slides', {
        params: { order: 'display_order' },
      });
      return (data ?? []) as CarouselSlide[];
    },
  });
}

export function useAllCarouselSlides() {
  return useQuery({
    queryKey: ["carousel-slides-all"],
    queryFn: async () => {
      const { data } = await api.get('/carousel_slides', {
        params: { order: 'display_order' },
      });
      return (data ?? []) as CarouselSlide[];
    },
  });
}

export function useCreateSlide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (slide: Omit<CarouselSlide, "id" | "created_at" | "updated_at">) => {
      const { data } = await api.post('/carousel_slides', slide, {
        headers: { Prefer: 'return=representation' },
      });
      return Array.isArray(data) ? data[0] : data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["carousel-slides"] });
      qc.invalidateQueries({ queryKey: ["carousel-slides-all"] });
    },
  });
}

export function useUpdateSlide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CarouselSlide> & { id: string }) => {
      const { data } = await api.patch(`/carousel_slides?id=eq.${id}`, updates, {
        headers: { Prefer: 'return=representation' },
      });
      return Array.isArray(data) ? data[0] : data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["carousel-slides"] });
      qc.invalidateQueries({ queryKey: ["carousel-slides-all"] });
    },
  });
}

export function useDeleteSlide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/carousel_slides?id=eq.${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["carousel-slides"] });
      qc.invalidateQueries({ queryKey: ["carousel-slides-all"] });
    },
  });
}
