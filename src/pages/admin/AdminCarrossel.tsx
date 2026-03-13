import { useState } from "react";
import { Plus, Pencil, Trash2, Eye, EyeOff, GripVertical, Upload, Loader2 } from "lucide-react";
import { useAllCarouselSlides, useCreateSlide, useUpdateSlide, useDeleteSlide, CarouselSlide } from "@/hooks/useCarouselSlides";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { uploadFile } from "@/lib/upload";
import { cn } from "@/lib/utils";

const GRADIENTS = [
  { label: "Laranja (padrão)", value: "from-orange-500 via-orange-400 to-amber-300" },
  { label: "Azul", value: "from-blue-600 via-blue-500 to-cyan-400" },
  { label: "Verde", value: "from-emerald-600 via-emerald-500 to-teal-400" },
  { label: "Roxo", value: "from-purple-600 via-purple-500 to-pink-400" },
  { label: "Vermelho", value: "from-red-600 via-red-500 to-orange-400" },
  { label: "Escuro", value: "from-gray-900 via-gray-800 to-gray-700" },
];

function SlideForm({
  slide,
  onSuccess,
  onCancel,
}: {
  slide?: CarouselSlide;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(slide?.title ?? "");
  const [subtitle, setSubtitle] = useState(slide?.subtitle ?? "");
  const [ctaText, setCtaText] = useState(slide?.cta_text ?? "Ver Catálogo");
  const [gradient, setGradient] = useState(slide?.bg_gradient ?? GRADIENTS[0].value);
  const [imageUrl, setImageUrl] = useState(slide?.image_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const createSlide = useCreateSlide();
  const updateSlide = useUpdateSlide();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file, 'banners');
      setImageUrl(url);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro no upload", description: err.message });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title,
        subtitle: subtitle || null,
        cta_text: ctaText || "Ver Catálogo",
        bg_gradient: gradient,
        image_url: imageUrl || null,
        display_order: slide?.display_order ?? 99,
        is_active: slide?.is_active ?? true,
      };
      if (slide) {
        await updateSlide.mutateAsync({ id: slide.id, ...payload });
        toast({ title: "Slide atualizado!" });
      } else {
        await createSlide.mutateAsync(payload);
        toast({ title: "Slide criado!" });
      }
      onSuccess();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div className={cn("h-32 rounded-xl bg-gradient-to-r flex items-center overflow-hidden relative", gradient)}
        style={imageUrl ? { backgroundImage: `url(${imageUrl})`, backgroundSize: "cover" } : undefined}
      >
        {imageUrl && <div className="absolute inset-0 bg-black/40" />}
        <div className="relative z-10 px-5">
          <p className="font-extrabold text-white text-lg leading-tight">{title || "Título do banner"}</p>
          <p className="text-white/80 text-xs mt-1">{subtitle || "Subtítulo do banner"}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Título *</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl" placeholder="Ex: Novidades da semana" />
      </div>

      <div className="space-y-1.5">
        <Label>Subtítulo</Label>
        <Textarea value={subtitle} onChange={(e) => setSubtitle(e.target.value)} rows={2} className="rounded-xl resize-none" placeholder="Descrição do banner..." />
      </div>

      <div className="space-y-1.5">
        <Label>Texto do botão</Label>
        <Input value={ctaText} onChange={(e) => setCtaText(e.target.value)} className="rounded-xl" placeholder="Ver Catálogo" />
      </div>

      <div className="space-y-1.5">
        <Label>Cor de fundo</Label>
        <Select value={gradient} onValueChange={setGradient}>
          <SelectTrigger className="rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GRADIENTS.map((g) => (
              <SelectItem key={g.value} value={g.value}>
                <div className="flex items-center gap-2">
                  <div className={cn("h-4 w-10 rounded bg-gradient-to-r", g.value)} />
                  {g.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Imagem de fundo (opcional)</Label>
        <div className="flex items-center gap-3">
          {imageUrl && (
            <img src={imageUrl} alt="preview" className="w-16 h-12 object-cover rounded-lg border border-border" />
          )}
          <label className="flex-1 flex items-center gap-2 border-2 border-dashed border-border rounded-xl p-3 cursor-pointer hover:border-primary transition-colors">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <Upload className="h-4 w-4 text-muted-foreground" />}
            <span className="text-sm text-muted-foreground">{uploading ? "Enviando..." : "Clique para enviar imagem"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>
          {imageUrl && (
            <Button variant="ghost" size="sm" onClick={() => setImageUrl("")} className="text-destructive rounded-lg">
              Remover
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} className="flex-1 rounded-xl">Cancelar</Button>
        <Button onClick={handleSave} disabled={saving || uploading || !title.trim()} className="flex-1 rounded-xl">
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
          {slide ? "Salvar" : "Criar Slide"}
        </Button>
      </div>
    </div>
  );
}

export default function AdminCarrossel() {
  const { data: slides = [], isLoading } = useAllCarouselSlides();
  const [editSlide, setEditSlide] = useState<CarouselSlide | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const updateSlide = useUpdateSlide();
  const deleteSlide = useDeleteSlide();
  const { toast } = useToast();

  const toggleActive = async (slide: CarouselSlide) => {
    await updateSlide.mutateAsync({ id: slide.id, is_active: !slide.is_active });
    toast({ title: slide.is_active ? "Slide desativado" : "Slide ativado" });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteSlide.mutateAsync(deleteId);
    setDeleteId(null);
    toast({ title: "Slide excluído!" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Carrossel</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie os banners do carrossel principal</p>
        </div>
        <Button className="rounded-xl gap-2 font-bold" onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4" />
          Novo Slide
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {slides.map((slide, idx) => (
            <div key={slide.id} className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="flex items-stretch gap-0">
                {/* Preview mini */}
                <div
                  className={cn("w-32 shrink-0 bg-gradient-to-r flex items-center justify-center", slide.bg_gradient ?? "")}
                  style={slide.image_url ? { backgroundImage: `url(${slide.image_url})`, backgroundSize: "cover" } : undefined}
                >
                  <span className="text-white/60 text-xs font-bold">#{idx + 1}</span>
                </div>

                {/* Info */}
                <div className="flex-1 p-4 flex items-center gap-4 min-w-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-foreground truncate">{slide.title}</p>
                      <Badge className={slide.is_active ? "bg-primary text-primary-foreground text-[10px]" : "bg-muted text-muted-foreground text-[10px]"}>
                        {slide.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">{slide.subtitle}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Botão: "{slide.cta_text}"</p>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={() => toggleActive(slide)} title={slide.is_active ? "Desativar" : "Ativar"}>
                      {slide.is_active ? <Eye className="h-4 w-4 text-primary" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={() => setEditSlide(slide)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-destructive hover:text-destructive" onClick={() => setDeleteId(slide.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {slides.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              Nenhum slide cadastrado. Crie o primeiro!
            </div>
          )}
        </div>
      )}

      {/* Dialog novo */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader><DialogTitle>Novo Slide</DialogTitle></DialogHeader>
          <SlideForm onSuccess={() => setShowNew(false)} onCancel={() => setShowNew(false)} />
        </DialogContent>
      </Dialog>

      {/* Dialog editar */}
      <Dialog open={!!editSlide} onOpenChange={() => setEditSlide(null)}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader><DialogTitle>Editar Slide</DialogTitle></DialogHeader>
          {editSlide && (
            <SlideForm slide={editSlide} onSuccess={() => setEditSlide(null)} onCancel={() => setEditSlide(null)} />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir slide?</AlertDialogTitle>
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
