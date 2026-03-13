import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
      const { data, error } = await supabase
        .from("whatsapp_settings" as any)
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as WhatsappSetting[];
    },
  });
}

export function useActiveWhatsappNumber() {
  return useQuery({
    queryKey: ["whatsapp-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_settings" as any)
        .select("phone_number")
        .eq("is_active", true)
        .limit(1)
        .single();
      if (error) throw error;
      return (data as any)?.phone_number as string;
    },
  });
}

export function useCreateWhatsappNumber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vals: { phone_number: string; label: string }) => {
      const { error } = await supabase
        .from("whatsapp_settings" as any)
        .insert(vals as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp-settings"] }),
  });
}

export function useUpdateWhatsappNumber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...vals }: { id: string; phone_number?: string; label?: string; is_active?: boolean }) => {
      const { error } = await supabase
        .from("whatsapp_settings" as any)
        .update(vals as any)
        .eq("id", id);
      if (error) throw error;
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
      const { error } = await supabase
        .from("whatsapp_settings" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp-settings"] }),
  });
}
