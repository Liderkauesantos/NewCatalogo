import { useState, useMemo, useRef } from "react";
import { Header } from "@/components/catalog/Header";
import { HeroCarousel } from "@/components/catalog/HeroCarousel";
import { SearchBar } from "@/components/catalog/SearchBar";
import { CategoryFilter } from "@/components/catalog/CategoryFilter";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { CartSheet } from "@/components/cart/CartSheet";
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import logo from "@/assets/logo.png";

const Index = () => {
  const [cartOpen, setCartOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const catalogRef = useRef<HTMLDivElement>(null);

  const { data: products = [], isLoading } = useProducts();
  const { data: categories = [] } = useCategories();
  const { data: brand } = useBrandSettings();

  const filtered = useMemo(() => {
    let result = products;
    if (selectedCategory) result = result.filter((p) => p.category_id === selectedCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
    }
    return result;
  }, [products, search, selectedCategory]);

  const scrollToCatalog = () => {
    catalogRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onCartClick={() => setCartOpen(true)} />

      <main className="container mx-auto px-4 py-6 space-y-8 max-w-7xl">
        {/* Hero carrossel */}
        <HeroCarousel onCtaClick={scrollToCatalog} />

        {/* Seção do catálogo */}
        <div ref={catalogRef} className="space-y-5">
          {/* Título da seção */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-foreground">Nossos Produtos</h2>
              <p className="text-sm text-muted-foreground">
                {isLoading
                  ? "Carregando..."
                  : `${filtered.length} produto${filtered.length !== 1 ? "s" : ""} disponível${filtered.length !== 1 ? "s" : ""}`}
              </p>
            </div>
            <div className="w-full sm:max-w-xs">
              <SearchBar value={search} onChange={setSearch} />
            </div>
          </div>

          {/* Filtros */}
          <CategoryFilter categories={categories} selected={selectedCategory} onSelect={setSelectedCategory} />

          {/* Grid */}
          <ProductGrid products={filtered} isLoading={isLoading} />
        </div>
      </main>

      {/* Footer simples */}
      <footer className="mt-16 border-t border-border bg-card">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-2">
            <img src={brand?.logo_url || logo} alt={brand?.company_name || "Logo"} className="h-50 w-auto" />
          </div>
          <p className="mt-1">© {new Date().getFullYear()} {brand?.company_name || ""} — Todos os direitos reservados</p>
        </div>
      </footer>

      <CartSheet open={cartOpen} onOpenChange={setCartOpen} />
    </div>
  );
};

export default Index;
