import { useState } from "react";
import { Product, useUpdateProduct, useDeleteProduct } from "@/hooks/useProducts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProductForm } from "./ProductForm";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Package, Check } from "lucide-react";

interface ProductTableProps {
  products: Product[];
}

export function ProductTable({ products }: ProductTableProps) {
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [stockEdits, setStockEdits] = useState<Record<string, string>>({});
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const { toast } = useToast();

  const handleStockSave = async (product: Product) => {
    const val = parseInt(stockEdits[product.id] ?? "");
    if (isNaN(val) || val < 0) return;
    await updateProduct.mutateAsync({ id: product.id, stock_quantity: val });
    setStockEdits((prev) => { const n = { ...prev }; delete n[product.id]; return n; });
    toast({ title: "Estoque atualizado!" });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteProduct.mutateAsync(deleteId);
    setDeleteId(null);
    toast({ title: "Produto excluído!" });
  };

  return (
    <>
      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12">Foto</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Estoque</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Nenhum produto cadastrado
                </TableCell>
              </TableRow>
            )}
            {products.map((p) => (
              <TableRow
                key={p.id}
                className={p.stock_quantity === 0 ? "bg-destructive/5" : undefined}
              >
                <TableCell>
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-10 h-10 object-cover rounded-lg" />
                  ) : (
                    <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                      <Package className="h-4 w-4 text-muted-foreground/40" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs">{p.code}</TableCell>
                <TableCell className="font-medium max-w-[160px] truncate">{p.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {p.categories?.name ?? "—"}
                </TableCell>
                <TableCell className="font-semibold">
                  {p.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      className="w-16 h-7 text-xs rounded-lg px-2"
                      value={stockEdits[p.id] ?? p.stock_quantity}
                      onChange={(e) => setStockEdits((prev) => ({ ...prev, [p.id]: e.target.value }))}
                    />
                    {stockEdits[p.id] !== undefined && (
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleStockSave(p)}>
                        <Check className="h-3 w-3 text-primary" />
                      </Button>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {p.stock_quantity === 0 ? (
                    <Badge variant="destructive" className="text-xs">Sem estoque</Badge>
                  ) : p.is_active ? (
                    <Badge className="text-xs bg-primary">Ativo</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Inativo</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditProduct(p)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(p.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editProduct} onOpenChange={() => setEditProduct(null)}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Editar Produto</DialogTitle>
          </DialogHeader>
          {editProduct && (
            <ProductForm
              product={editProduct}
              onSuccess={() => setEditProduct(null)}
              onCancel={() => setEditProduct(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. O produto será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl bg-destructive hover:bg-destructive/90" onClick={handleDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
