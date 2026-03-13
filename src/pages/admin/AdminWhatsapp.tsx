import { useState } from "react";
import { MessageCircle, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import {
  useWhatsappSettings,
  useCreateWhatsappNumber,
  useUpdateWhatsappNumber,
  useDeleteWhatsappNumber,
  type WhatsappSetting,
} from "@/hooks/useWhatsappSettings";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AdminWhatsapp() {
  const { data: numbers = [], isLoading } = useWhatsappSettings();
  const createNumber = useCreateWhatsappNumber();
  const updateNumber = useUpdateWhatsappNumber();
  const deleteNumber = useDeleteWhatsappNumber();
  const { toast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<WhatsappSetting | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [label, setLabel] = useState("");

  const openNew = () => {
    setEditItem(null);
    setPhone("");
    setLabel("Principal");
    setShowForm(true);
  };

  const openEdit = (item: WhatsappSetting) => {
    setEditItem(item);
    setPhone(item.phone_number);
    setLabel(item.label ?? "");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!phone.trim()) return;
    try {
      if (editItem) {
        await updateNumber.mutateAsync({ id: editItem.id, phone_number: phone.trim(), label: label.trim() });
        toast({ title: "Número atualizado" });
      } else {
        await createNumber.mutateAsync({ phone_number: phone.trim(), label: label.trim() || "Principal" });
        toast({ title: "Número cadastrado" });
      }
      setShowForm(false);
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const handleToggle = async (item: WhatsappSetting) => {
    await updateNumber.mutateAsync({ id: item.id, is_active: !item.is_active });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteNumber.mutateAsync(deleteId);
      toast({ title: "Número excluído" });
    } catch {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
    setDeleteId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">WhatsApp</h1>
          <p className="text-sm text-muted-foreground">Gerencie os números de WhatsApp para recebimento de pedidos.</p>
        </div>
        <Button onClick={openNew} className="rounded-xl gap-2">
          <Plus className="h-4 w-4" /> Novo Número
        </Button>
      </div>

      {numbers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <MessageCircle className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium text-foreground">Nenhum número cadastrado</p>
            <p className="text-sm text-muted-foreground">Adicione um número de WhatsApp para receber pedidos.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {numbers.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-center justify-between py-4 px-5">
                <div className="flex items-center gap-3">
                  <MessageCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">{item.phone_number}</p>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={!!item.is_active} onCheckedChange={() => handleToggle(item)} />
                  <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(item.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? "Editar Número" : "Novo Número"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Número (com DDI)</Label>
              <Input placeholder="5516999999999" value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label>Label</Label>
              <Input placeholder="Principal" value={label} onChange={(e) => setLabel(e.target.value)} className="rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!phone.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir número?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
