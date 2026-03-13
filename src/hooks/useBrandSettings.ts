import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

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
      const { data } = await api.get('/brand_settings', {
        params: { limit: 1 },
        headers: { Accept: 'application/vnd.pgrst.object+json' },
      });
      return data as BrandSettings;
    },
  });
}

export function useUpdateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vals: { id: string; company_name?: string; logo_url?: string | null }) => {
      const { id, ...rest } = vals;
      await api.patch(`/brand_settings?id=eq.${id}`, rest);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand-settings"] });
    },
  });
}
