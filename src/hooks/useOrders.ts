import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export interface OrderItem {
  product_id: string;
  name: string;
  code: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  order_number: number;
  customer_name: string;
  company_name: string;
  items: OrderItem[];
  total: number;
  whatsapp_number: string | null;
  status: string;
  notes: string | null;
  payment_method: string | null;
  created_at: string;
}

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data } = await api.get('/orders', {
        params: { order: 'created_at.desc' },
      });
      return ((data ?? []) as any[]).map((o) => ({
        ...o,
        items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items,
      })) as Order[];
    },
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (order: Omit<Order, "id" | "created_at" | "order_number">) => {
      const { data } = await api.post('/orders', order, {
        headers: { Prefer: 'return=representation' },
      });
      return Array.isArray(data) ? data[0] : data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data } = await api.patch(`/orders?id=eq.${id}`, { status }, {
        headers: { Prefer: 'return=representation' },
      });
      return Array.isArray(data) ? data[0] : data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });
}

export function useDeleteOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/orders?id=eq.${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });
}
