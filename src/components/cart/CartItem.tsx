import { useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import { CartItem as CartItemType } from "@/contexts/CartContext";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";

interface CartItemProps {
  item: CartItemType;
}

export function CartItem({ item }: CartItemProps) {
  const { removeItem, updateQuantity } = useCart();
  const { product, quantity } = item;

  return (
    <div className="flex gap-3 py-3 border-b border-border last:border-0">
      {/* Imagem */}
      <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted flex-shrink-0">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-6 w-6 text-muted-foreground/30" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm leading-tight line-clamp-2">{product.name}</p>
        <p className="text-[11px] text-muted-foreground font-mono">#{product.code}</p>
        <p className="text-primary font-bold text-sm mt-0.5">
          {(product.price * quantity).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </p>

        {/* Controles de quantidade */}
        <div className="flex items-center gap-1 mt-1.5">
          <Button
            size="icon"
            variant="outline"
            className="h-6 w-6 rounded-lg"
            onClick={() => updateQuantity(product.id, quantity - 1)}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-6 text-center text-sm font-bold">{quantity}</span>
          <Button
            size="icon"
            variant="outline"
            className="h-6 w-6 rounded-lg"
            onClick={() => updateQuantity(product.id, quantity + 1)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Remover */}
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
        onClick={() => removeItem(product.id)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
