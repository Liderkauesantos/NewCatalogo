import { useState } from "react";
import { MessageCircle, User, Building2, CreditCard } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useCreateOrder } from "@/hooks/useOrders";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { useActiveWhatsappNumber } from "@/hooks/useWhatsappSettings";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface OrderFormProps {
  onBack: () => void;
}

export function OrderForm({ onBack }: OrderFormProps) {
  const { items, totalPrice, clearCart } = useCart();
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [sending, setSending] = useState(false);
  const createOrder = useCreateOrder();
  const { data: paymentMethods = [] } = usePaymentMethods();
  const { data: activeWhatsapp } = useActiveWhatsappNumber();
  const { data: brand } = useBrandSettings();
  const whatsappNumber = activeWhatsapp || "5516997764714";

  const handleSend = async () => {
    if (!name.trim() || !company.trim() || !paymentMethod) return;
    setSending(true);

    let orderNumber: number | null = null;
    try {
      const result = await createOrder.mutateAsync({
        customer_name: name,
        company_name: company,
        items: items.map((i) => ({
          product_id: i.product.id,
          name: i.product.name,
          code: i.product.code,
          quantity: i.quantity,
          price: i.product.price,
        })),
        total: totalPrice,
        whatsapp_number: whatsappNumber,
        status: "pending",
        notes: null,
        payment_method: paymentMethod,
      });
      orderNumber = result?.order_number ?? null;
    } catch {
      // Seguir mesmo se salvar falhar
    }

    const itemLines = items
      .map((item) => {
        const subtotal = (item.product.price * item.quantity).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        });
        return `• ${item.product.name} (cod: ${item.product.code}) — ${item.quantity}x — ${subtotal}`;
      })
      .join("\n");

    const total = totalPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    const orderLabel = orderNumber ? `\n🔢 Pedido Nº: ${orderNumber}` : "";
    const brandName = brand?.company_name || "Catálogo";
    const message = `*Pedido — ${brandName}*${orderLabel}\n👤 Cliente: ${name}\n🏢 Empresa: ${company}\n💳 Pagamento: ${paymentMethod}\n\n📦 Itens:\n${itemLines}\n\n💰 *Total: ${total}*`;
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${whatsappNumber}?text=${encoded}`, "_blank");
    clearCart();
    setSending(false);
  };

  const canSend = name.trim() && company.trim() && paymentMethod;

  return (
    <div className="flex flex-col gap-4 p-1">
      <div>
        <h3 className="font-bold text-base mb-1">Finalizar Pedido</h3>
        <p className="text-sm text-muted-foreground">
          Preencha seus dados para enviar o pedido pelo WhatsApp.
        </p>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="flex items-center gap-1.5 text-sm">
            <User className="h-3.5 w-3.5" /> Nome completo
          </Label>
          <Input
            id="name"
            placeholder="João Silva"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-xl"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="company" className="flex items-center gap-1.5 text-sm">
            <Building2 className="h-3.5 w-3.5" /> Nome da empresa
          </Label>
          <Input
            id="company"
            placeholder="ABC Comércio Ltda"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="rounded-xl"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="payment" className="flex items-center gap-1.5 text-sm">
            <CreditCard className="h-3.5 w-3.5" /> Forma de pagamento
          </Label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {paymentMethods.map((pm) => (
                <SelectItem key={pm.id} value={pm.name}>{pm.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl bg-muted p-3 text-sm">
        <p className="font-semibold mb-1">
          {items.length} {items.length === 1 ? "item" : "itens"} no pedido
        </p>
        <p className="text-primary font-extrabold text-lg">
          {totalPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </p>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} className="flex-1 rounded-xl">
          Voltar
        </Button>
        <Button
          onClick={handleSend}
          disabled={!canSend || sending}
          className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 border-0"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp 📲
        </Button>
      </div>
    </div>
  );
}
