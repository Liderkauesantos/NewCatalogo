import { useState } from "react";
import { useOrders, useUpdateOrderStatus, useDeleteOrder, Order } from "@/hooks/useOrders";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Eye, Trash2, MessageCircle, Package, CheckCircle2, Clock } from "lucide-react";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-amber-100 text-amber-700 border-amber-200" },
  confirmed: { label: "Confirmado", className: "bg-blue-100 text-blue-700 border-blue-200" },
  delivered: { label: "Entregue", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  cancelled: { label: "Cancelado", className: "bg-red-100 text-red-700 border-red-200" },
};

function OrderDetail({ order }: { order: Order }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-muted rounded-xl p-3 col-span-2">
          <p className="text-xs text-muted-foreground">Nº do Pedido</p>
          <p className="font-extrabold text-primary text-xl mt-0.5">#{order.order_number}</p>
        </div>
        <div className="bg-muted rounded-xl p-3">
          <p className="text-xs text-muted-foreground">Cliente</p>
          <p className="font-semibold text-foreground mt-0.5">{order.customer_name}</p>
        </div>
        <div className="bg-muted rounded-xl p-3">
          <p className="text-xs text-muted-foreground">Empresa</p>
          <p className="font-semibold text-foreground mt-0.5">{order.company_name}</p>
        </div>
        <div className="bg-muted rounded-xl p-3">
          <p className="text-xs text-muted-foreground">Data</p>
          <p className="font-semibold text-foreground mt-0.5">
            {new Date(order.created_at).toLocaleString("pt-BR")}
          </p>
        </div>
        <div className="bg-muted rounded-xl p-3">
          <p className="text-xs text-muted-foreground">Status</p>
          <Badge className={`mt-0.5 text-xs border ${STATUS_MAP[order.status]?.className ?? ""}`}>
            {STATUS_MAP[order.status]?.label ?? order.status}
          </Badge>
        </div>
        {order.payment_method && (
          <div className="bg-muted rounded-xl p-3 col-span-2">
            <p className="text-xs text-muted-foreground">Forma de Pagamento</p>
            <p className="font-semibold text-foreground mt-0.5">{order.payment_method}</p>
          </div>
        )}
      </div>

      <div>
        <p className="text-sm font-bold text-foreground mb-2">Itens do Pedido</p>
        <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-muted rounded-lg flex items-center justify-center">
                  <Package className="h-4 w-4 text-muted-foreground/50" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">#{item.code} × {item.quantity}</p>
                </div>
              </div>
              <p className="font-bold text-primary text-sm">
                {(item.price * item.quantity).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between bg-primary/10 rounded-xl px-4 py-3">
        <p className="font-bold text-foreground">Total do Pedido</p>
        <p className="text-xl font-extrabold text-primary">
          {Number(order.total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </p>
      </div>

      <a
        href={`https://wa.me/${order.whatsapp_number ?? "5516997764714"}?text=${encodeURIComponent(
          `Olá ${order.customer_name}! Seu pedido #${order.order_number} da ${order.company_name} foi confirmado.`
        )}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-colors"
      >
        <MessageCircle className="h-4 w-4" />
        Contatar pelo WhatsApp
      </a>
    </div>
  );
}

export default function AdminPedidos() {
  const { data: orders = [], isLoading } = useOrders();
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const updateStatus = useUpdateOrderStatus();
  const deleteOrder = useDeleteOrder();
  const { toast } = useToast();

  const handleStatusChange = async (id: string, status: string) => {
    await updateStatus.mutateAsync({ id, status });
    toast({ title: "Status atualizado!" });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteOrder.mutateAsync(deleteId);
    setDeleteId(null);
    toast({ title: "Pedido excluído!" });
  };

  const pendingTotal = orders
    .filter((o) => o.status === "pending")
    .reduce((s, o) => s + Number(o.total), 0);

  const totalRevenue = orders.reduce((s, o) => s + Number(o.total), 0);

  return (
    <div className="space-y-6">
      {/* Totalizador de Pendentes */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center">
          <Clock className="h-6 w-6 text-amber-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-amber-700">Total em Pedidos Pendentes</p>
          <p className="text-2xl font-extrabold text-amber-800">
            {pendingTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Histórico de Pedidos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {orders.length} pedido{orders.length !== 1 ? "s" : ""} • Total:{" "}
            <span className="font-bold text-primary">
              {totalRevenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border flex flex-col items-center justify-center py-20 text-center">
          <MessageCircle className="h-12 w-12 text-muted-foreground/20 mb-4" />
          <p className="font-semibold text-muted-foreground">Nenhum pedido ainda</p>
          <p className="text-sm text-muted-foreground/60">Os pedidos enviados pelo catálogo aparecerão aqui</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Nº</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Cliente</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden sm:table-cell">Empresa</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden sm:table-cell">Itens</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Total</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">Data</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-extrabold text-primary text-base">#{order.order_number}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{order.customer_name}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{order.company_name}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                      {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                    </td>
                    <td className="px-4 py-3 font-bold text-primary">
                      {Number(order.total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </td>
                    <td className="px-4 py-3">
                      <Select value={order.status} onValueChange={(v) => handleStatusChange(order.id, v)}>
                        <SelectTrigger className={`h-7 text-xs rounded-lg border w-28 ${STATUS_MAP[order.status]?.className ?? ""}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_MAP).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">
                      {new Date(order.created_at).toLocaleString("pt-BR", {
                        day: "2-digit", month: "2-digit", year: "2-digit",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {order.status !== "delivered" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            title="Marcar como Entregue"
                            onClick={() => handleStatusChange(order.id, "delivered")}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => setViewOrder(order)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-destructive hover:text-destructive" onClick={() => setDeleteId(order.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detalhe do pedido */}
      <Dialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)}>
        <DialogContent className="max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Pedido</DialogTitle>
          </DialogHeader>
          {viewOrder && <OrderDetail order={viewOrder} />}
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pedido?</AlertDialogTitle>
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
