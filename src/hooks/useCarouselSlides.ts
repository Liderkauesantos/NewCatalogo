import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
      const { data, error } = await supabase
        .from("carousel_slides")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return data as CarouselSlide[];
    },
  });
}

export function useAllCarouselSlides() {
  return useQuery({
    queryKey: ["carousel-slides-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("carousel_slides")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return data as CarouselSlide[];
    },
  });
}

export function useCreateSlide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (slide: Omit<CarouselSlide, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase.from("carousel_slides").insert(slide).select().single();
      if (error) throw error;
      return data;
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
      const { data, error } = await supabase
        .from("carousel_slides")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
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
      const { error } = await supabase.from("carousel_slides").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["carousel-slides"] });
      qc.invalidateQueries({ queryKey: ["carousel-slides-all"] });
    },
  });
}
