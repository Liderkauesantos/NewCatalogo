import { useState } from "react";
import { ShoppingCart, Package, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Product } from "@/hooks/useProducts";
import { CartProduct, useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  const outOfStock = product.stock_quantity === 0;

  // Build all images array: main image + additional images
  const allImages: string[] = [];
  if (product.image_url) allImages.push(product.image_url);
  if (product.product_images?.length) {
    const sorted = [...product.product_images].sort((a, b) => a.display_order - b.display_order);
    sorted.forEach((img) => {
      if (!allImages.includes(img.image_url)) allImages.push(img.image_url);
    });
  }

  const [currentIndex, setCurrentIndex] = useState(0);
  const hasMultiple = allImages.length > 1;

  const goTo = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(idx);
  };

  const handleAdd = () => {
    if (outOfStock) return;
    const cartProduct: CartProduct = {
      id: product.id,
      name: product.name,
      code: product.code,
      price: product.price,
      image_url: product.image_url,
    };
    addItem(cartProduct);
    toast.success(`"${product.name}" adicionado ao carrinho`);
  };

  return (
    <div
      className={cn(
        "group bg-card rounded-2xl border border-border overflow-hidden flex flex-col transition-all duration-200",
        "hover:shadow-[0_8px_30px_-8px_hsl(var(--primary)/0.25)] hover:-translate-y-1 hover:border-primary/30",
        outOfStock && "opacity-75"
      )}
    >
      {/* Image carousel */}
      <div className="relative aspect-square bg-muted overflow-hidden">
        {allImages.length > 0 ? (
          <>
            <div
              className="flex h-full transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {allImages.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`${product.name} - ${i + 1}`}
                  className="w-full h-full object-cover shrink-0"
                  loading="lazy"
                />
              ))}
            </div>

            {/* Navigation arrows */}
            {hasMultiple && (
              <>
                <button
                  onClick={(e) => goTo(currentIndex > 0 ? currentIndex - 1 : allImages.length - 1, e)}
                  className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-card/80 backdrop-blur-sm border border-border/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronLeft className="h-3.5 w-3.5 text-foreground" />
                </button>
                <button
                  onClick={(e) => goTo(currentIndex < allImages.length - 1 ? currentIndex + 1 : 0, e)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-card/80 backdrop-blur-sm border border-border/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronRight className="h-3.5 w-3.5 text-foreground" />
                </button>
              </>
            )}

            {/* Dot indicators */}
            {hasMultiple && (
              <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
                {allImages.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => goTo(i, e)}
                    className={cn(
                      "w-1.5 h-1.5 rounded-full transition-all",
                      i === currentIndex
                        ? "bg-primary w-3"
                        : "bg-card/70 backdrop-blur-sm"
                    )}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <Package className="h-12 w-12 text-muted-foreground/20" />
          </div>
        )}

        {/* Badge categoria */}
        {product.categories?.name && (
          <div className="absolute top-2 left-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-card/90 backdrop-blur-sm text-muted-foreground px-2 py-0.5 rounded-md border border-border/50">
              {product.categories.name}
            </span>
          </div>
        )}

        {outOfStock && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex items-center justify-center">
            <span className="bg-muted text-muted-foreground text-xs font-bold px-3 py-1.5 rounded-full border border-border">
              Indisponível
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-3 flex-1">
        <div className="flex-1">
          <p className="text-[10px] font-mono text-muted-foreground tracking-wide">COD. {product.code}</p>
          <h3 className="font-semibold text-sm leading-snug line-clamp-2 text-foreground mt-0.5">
            {product.name}
          </h3>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
          <div>
            <p className="text-[10px] text-muted-foreground">Preço unit.</p>
            <p className="text-base font-extrabold text-primary leading-none">
              {product.price.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={outOfStock}
            className="rounded-xl h-9 px-3 gap-1.5 text-xs font-bold shadow-sm"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Adicionar</span>
            <span className="sm:hidden">+</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
