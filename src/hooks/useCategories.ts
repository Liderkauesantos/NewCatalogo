import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export interface Category {
  id: string;
  name: string;
  created_at: string;
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await api.get('/categories', { params: { order: 'name' } });
      return (data ?? []) as Category[];
    },
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data } = await api.post('/categories', { name }, {
        headers: { Prefer: 'return=representation' },
      });
      return Array.isArray(data) ? data[0] : data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}
