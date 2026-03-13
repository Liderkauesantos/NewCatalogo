import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

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
      const { data } = await api.get('/payment_methods', {
        params: { is_active: 'eq.true', order: 'display_order' },
      });
      return (data ?? []) as PaymentMethod[];
    },
  });
}

export function useAllPaymentMethods() {
  return useQuery({
    queryKey: ["payment_methods", "all"],
    queryFn: async () => {
      const { data } = await api.get('/payment_methods', {
        params: { order: 'display_order' },
      });
      return (data ?? []) as PaymentMethod[];
    },
  });
}

export function useCreatePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pm: { name: string; display_order?: number }) => {
      const { data } = await api.post('/payment_methods', pm, {
        headers: { Prefer: 'return=representation' },
      });
      return Array.isArray(data) ? data[0] : data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payment_methods"] }),
  });
}

export function useUpdatePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; is_active?: boolean; display_order?: number }) => {
      const { data } = await api.patch(`/payment_methods?id=eq.${id}`, updates, {
        headers: { Prefer: 'return=representation' },
      });
      return Array.isArray(data) ? data[0] : data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payment_methods"] }),
  });
}

export function useDeletePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/payment_methods?id=eq.${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payment_methods"] }),
  });
}
