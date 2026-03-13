import { useState } from "react";
import { ShoppingBag, ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { CartItem } from "./CartItem";
import { OrderForm } from "./OrderForm";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface CartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CartSheet({ open, onOpenChange }: CartSheetProps) {
  const { items, totalPrice, totalItems } = useCart();
  const [showOrderForm, setShowOrderForm] = useState(false);

  const handleClose = () => {
    setShowOrderForm(false);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="flex flex-col w-full sm:max-w-md p-0">
        <SheetHeader className="px-4 py-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Carrinho{totalItems > 0 && <span className="text-muted-foreground font-normal text-sm">({totalItems} {totalItems === 1 ? "item" : "itens"})</span>}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4">
          {showOrderForm ? (
            <div className="py-4">
              <OrderForm onBack={() => setShowOrderForm(false)} />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <ShoppingCart className="h-16 w-16 text-muted-foreground/20 mb-4" />
              <p className="font-semibold text-muted-foreground">Carrinho vazio</p>
              <p className="text-sm text-muted-foreground/60">Adicione produtos ao carrinho</p>
            </div>
          ) : (
            <div className="py-2">
              {items.map((item) => (
                <CartItem key={item.product.id} item={item} />
              ))}
            </div>
          )}
        </div>

        {!showOrderForm && items.length > 0 && (
          <div className="px-4 pb-4 pt-2 border-t border-border">
            <Separator className="mb-3" />
            <div className="flex justify-between items-center mb-4">
              <span className="font-semibold">Total</span>
              <span className="text-xl font-extrabold text-primary">
                {totalPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </div>
            <Button
              className="w-full rounded-xl font-bold text-base h-12"
              onClick={() => setShowOrderForm(true)}
            >
              Finalizar Pedido
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
