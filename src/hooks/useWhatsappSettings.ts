import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export interface WhatsappSetting {
  id: string;
  phone_number: string;
  label: string | null;
  is_active: boolean | null;
  created_at: string | null;
}

export function useWhatsappSettings() {
  return useQuery({
    queryKey: ["whatsapp-settings"],
    queryFn: async () => {
      const { data } = await api.get('/whatsapp_settings', {
        params: { order: 'created_at' },
      });
      return (data ?? []) as WhatsappSetting[];
    },
  });
}

export function useActiveWhatsappNumber() {
  return useQuery({
    queryKey: ["whatsapp-active"],
    queryFn: async () => {
      const { data } = await api.get('/whatsapp_settings', {
        params: { is_active: 'eq.true', select: 'phone_number', limit: 1 },
        headers: { Accept: 'application/vnd.pgrst.object+json' },
      });
      return data?.phone_number as string;
    },
  });
}

export function useCreateWhatsappNumber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vals: { phone_number: string; label: string }) => {
      await api.post('/whatsapp_settings', vals);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp-settings"] }),
  });
}

export function useUpdateWhatsappNumber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...vals }: { id: string; phone_number?: string; label?: string; is_active?: boolean }) => {
      await api.patch(`/whatsapp_settings?id=eq.${id}`, vals);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-settings"] });
      qc.invalidateQueries({ queryKey: ["whatsapp-active"] });
    },
  });
}

export function useDeleteWhatsappNumber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/whatsapp_settings?id=eq.${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp-settings"] }),
  });
}
