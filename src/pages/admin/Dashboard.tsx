import { useState } from "react";
import { Package, Plus, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { ProductTable } from "@/components/admin/ProductTable";
import { ProductForm } from "@/components/admin/ProductForm";
import { useAllProducts } from "@/hooks/useProducts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [showNewProduct, setShowNewProduct] = useState(false);
  const { data: products = [], isLoading } = useAllProducts();

  const outOfStock = products.filter((p) => p.stock_quantity === 0).length;

  return (
    <AdminGuard>
      <div className="min-h-screen bg-muted">
        {/* Header Admin */}
        <header className="bg-primary shadow-md">
          <div className="container mx-auto flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <Package className="h-6 w-6 text-primary-foreground" />
              <span className="font-extrabold text-primary-foreground text-lg">Admin do Catálogo</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-primary-foreground/70 hidden sm:block">{user?.email}</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary-foreground hover:bg-primary-foreground/20 gap-1.5 rounded-xl"
                onClick={signOut}
              >
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
              <p className="text-sm text-muted-foreground">Total de produtos</p>
              <p className="text-3xl font-extrabold text-foreground">{products.length}</p>
            </div>
            <div className={`bg-card rounded-2xl p-4 border shadow-sm ${outOfStock > 0 ? "border-destructive/40" : "border-border"}`}>
              <p className="text-sm text-muted-foreground">Sem estoque</p>
              <p className={`text-3xl font-extrabold ${outOfStock > 0 ? "text-destructive" : "text-foreground"}`}>
                {outOfStock}
              </p>
            </div>
            <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
              <p className="text-sm text-muted-foreground">Ativos</p>
              <p className="text-3xl font-extrabold text-primary">
                {products.filter((p) => p.is_active && p.stock_quantity > 0).length}
              </p>
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-lg">Produtos</h2>
                {outOfStock > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {outOfStock} sem estoque
                  </Badge>
                )}
              </div>
              <Button
                className="rounded-xl gap-1.5 font-bold"
                onClick={() => setShowNewProduct(true)}
              >
                <Plus className="h-4 w-4" />
                Novo Produto
              </Button>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-10">
                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <ProductTable products={products} />
            )}
          </div>
        </main>

        {/* New Product Dialog */}
        <Dialog open={showNewProduct} onOpenChange={setShowNewProduct}>
          <DialogContent className="max-w-lg rounded-2xl">
            <DialogHeader>
              <DialogTitle>Novo Produto</DialogTitle>
            </DialogHeader>
            <ProductForm
              onSuccess={() => setShowNewProduct(false)}
              onCancel={() => setShowNewProduct(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </AdminGuard>
  );
}
