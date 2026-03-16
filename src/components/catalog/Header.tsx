import { ShoppingBag, Package, Lock, Download } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import { Badge } from "@/components/ui/badge";
import { Link, useParams } from "react-router-dom";
import { useState, useEffect } from "react";

interface HeaderProps {
  onCartClick: () => void;
}

export function Header({ onCartClick }: HeaderProps) {
  const { totalItems } = useCart();
  const { data: brand } = useBrandSettings();
  const { slug } = useParams();
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-card border-b border-border shadow-sm">
      <div className="container mx-auto flex items-center justify-between px-4 h-16">
        {/* Logo */}
        <div className="flex items-center gap-3">
          {brand?.logo_url ? (
            <img src={brand.logo_url} alt={brand.company_name} className="h-9 w-9 rounded-xl object-contain" />
          ) : (
            <div className="bg-primary rounded-xl p-2">
              <Package className="h-5 w-5 text-primary-foreground" />
            </div>
          )}
          <div>
            <span className="text-xl font-extrabold text-foreground tracking-tight">{brand?.company_name || "Catálogo"}</span>
            <span className="hidden sm:inline text-xs text-muted-foreground font-medium ml-2 uppercase tracking-widest">CATÁLOGO</span>
          </div>
        </div>

        {/* Nav e carrinho */}
        <div className="flex items-center gap-3">
          {!isInstalled && (
            <Link
              to={`/${slug}/install`}
              className="flex items-center gap-1.5 px-3 py-2 text-muted-foreground hover:text-foreground rounded-xl text-sm font-medium hover:bg-muted transition-all"
              title="Instalar app">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Instalar</span>
            </Link>
          )}
          <Link
            to={`/${slug}/admin/login`}
            className="flex items-center gap-1.5 px-3 py-2 text-muted-foreground hover:text-foreground rounded-xl text-sm font-medium hover:bg-muted transition-all"
            title="Área administrativa">
            <Lock className="h-4 w-4" />
            <span className="hidden sm:inline">Admin</span>
          </Link>
          <button
            onClick={onCartClick}
            className="relative flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all shadow-sm">
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Carrinho</span>
            {totalItems > 0 &&
              <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-destructive text-destructive-foreground text-xs font-bold border-2 border-card rounded-full">
                {totalItems > 99 ? "99+" : totalItems}
              </Badge>
            }
          </button>
        </div>
      </div>
    </header>
  );
}