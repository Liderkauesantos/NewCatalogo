import { useState, useEffect } from "react";
import { Palette, Upload, Loader2, Save } from "lucide-react";
import { useBrandSettings, useUpdateBrand } from "@/hooks/useBrandSettings";
import { uploadFile } from "@/lib/upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function AdminMarca() {
  const { data: brand, isLoading } = useBrandSettings();
  const updateBrand = useUpdateBrand();
  const { toast } = useToast();

  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (brand) {
      setCompanyName(brand.company_name);
      setLogoUrl(brand.logo_url);
    }
  }, [brand]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file, 'brand-assets');
      setLogoUrl(url);
    } catch (err: any) {
      toast({ title: "Erro ao enviar logo", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!brand) return;
    try {
      await updateBrand.mutateAsync({ id: brand.id, company_name: companyName, logo_url: logoUrl });
      toast({ title: "Marca atualizada com sucesso!" });
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
          <Palette className="h-6 w-6 text-primary" />
          Marca / White Label
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Personalize o nome e logo da sua empresa no catálogo.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configurações da Marca</CardTitle>
          <CardDescription>Essas informações aparecerão no cabeçalho, rodapé e painel administrativo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="companyName">Nome da empresa</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Nome da sua empresa"
              className="max-w-md rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label>Logo da empresa</Label>
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <div className="h-20 w-20 rounded-xl border border-border flex items-center justify-center bg-muted overflow-hidden">
                  <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                </div>
              ) : (
                <div className="h-20 w-20 rounded-xl border border-dashed border-border flex items-center justify-center bg-muted">
                  <Palette className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div>
                <Button variant="outline" className="rounded-xl gap-2" asChild disabled={uploading}>
                  <label className="cursor-pointer">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {uploading ? "Enviando..." : "Enviar logo"}
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </label>
                </Button>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG ou SVG. Recomendado: 200x200px</p>
              </div>
            </div>
            {logoUrl && (
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setLogoUrl(null)}>
                Remover logo
              </Button>
            )}
          </div>

          <Button onClick={handleSave} disabled={updateBrand.isPending || !companyName.trim()} className="rounded-xl gap-2">
            <Save className="h-4 w-4" />
            Salvar alterações
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
