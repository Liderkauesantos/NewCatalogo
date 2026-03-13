import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BrandSettings {
  id: string;
  company_name: string;
  logo_url: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export function useBrandSettings() {
  return useQuery({
    queryKey: ["brand-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_settings")
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data as BrandSettings;
    },
  });
}

export function useUpdateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vals: { id: string; company_name?: string; logo_url?: string | null }) => {
      const { id, ...rest } = vals;
      const { error } = await supabase
        .from("brand_settings")
        .update(rest)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand-settings"] });
    },
  });
}
