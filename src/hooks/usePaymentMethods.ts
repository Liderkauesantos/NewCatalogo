import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PaymentMethod {
  id: string;
  name: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: ["payment_methods", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_methods" as any)
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as PaymentMethod[];
    },
  });
}

export function useAllPaymentMethods() {
  return useQuery({
    queryKey: ["payment_methods", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_methods" as any)
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as PaymentMethod[];
    },
  });
}

export function useCreatePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pm: { name: string; display_order?: number }) => {
      const { data, error } = await supabase
        .from("payment_methods" as any)
        .insert(pm)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payment_methods"] }),
  });
}

export function useUpdatePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; is_active?: boolean; display_order?: number }) => {
      const { data, error } = await supabase
        .from("payment_methods" as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payment_methods"] }),
  });
}

export function useDeletePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payment_methods" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payment_methods"] }),
  });
}
