import { useState } from "react";
import {
  useAllPaymentMethods,
  useCreatePaymentMethod,
  useUpdatePaymentMethod,
  useDeletePaymentMethod,
  PaymentMethod,
} from "@/hooks/usePaymentMethods";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, CreditCard } from "lucide-react";

export default function AdminPagamentos() {
  const { data: methods = [], isLoading } = useAllPaymentMethods();
  const createMethod = useCreatePaymentMethod();
  const updateMethod = useUpdatePaymentMethod();
  const deleteMethod = useDeletePaymentMethod();
  const { toast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<PaymentMethod | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [name, setName] = useState("");

  const openNew = () => { setEditItem(null); setName(""); setShowForm(true); };
  const openEdit = (pm: PaymentMethod) => { setEditItem(pm); setName(pm.name); setShowForm(true); };

  const handleSave = async () => {
    if (!name.trim()) return;
    if (editItem) {
      await updateMethod.mutateAsync({ id: editItem.id, name: name.trim() });
      toast({ title: "Forma de pagamento atualizada!" });
    } else {
      await createMethod.mutateAsync({ name: name.trim(), display_order: methods.length });
      toast({ title: "Forma de pagamento criada!" });
    }
    setShowForm(false);
  };

  const handleToggle = async (pm: PaymentMethod) => {
    await updateMethod.mutateAsync({ id: pm.id, is_active: !pm.is_active });
    toast({ title: pm.is_active ? "Desativada" : "Ativada" });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteMethod.mutateAsync(deleteId);
    setDeleteId(null);
    toast({ title: "Forma de pagamento excluída!" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Formas de Pagamento</h1>
          <p className="text-sm text-muted-foreground mt-1">{methods.length} cadastrada{methods.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={openNew} className="rounded-xl gap-2">
          <Plus className="h-4 w-4" /> Nova Forma
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : methods.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border flex flex-col items-center justify-center py-20 text-center">
          <CreditCard className="h-12 w-12 text-muted-foreground/20 mb-4" />
          <p className="font-semibold text-muted-foreground">Nenhuma forma cadastrada</p>
          <p className="text-sm text-muted-foreground/60">Adicione formas de pagamento para seus clientes</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="divide-y divide-border">
            {methods.map((pm) => (
              <div key={pm.id} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-4.5 w-4.5 text-muted-foreground" />
                  <span className={`font-medium ${pm.is_active ? "text-foreground" : "text-muted-foreground line-through"}`}>
                    {pm.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={pm.is_active} onCheckedChange={() => handleToggle(pm)} />
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={() => openEdit(pm)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-destructive hover:text-destructive" onClick={() => setDeleteId(pm.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editItem ? "Editar" : "Nova"} Forma de Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              placeholder='Ex: Pix, Boleto, Cartão...'
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl"
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)} className="rounded-xl">Cancelar</Button>
              <Button onClick={handleSave} disabled={!name.trim()} className="rounded-xl">Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir forma de pagamento?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl bg-destructive hover:bg-destructive/90" onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
