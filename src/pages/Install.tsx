import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Share, Plus, Smartphone, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <CardTitle className="text-2xl">App Instalado!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              O Catálogo já está instalado no seu dispositivo.
            </p>
            <Button onClick={() => navigate("/")} className="w-full">
              Ir para o Catálogo
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <Smartphone className="mx-auto h-16 w-16 text-primary mb-4" />
          <CardTitle className="text-2xl">Instalar Catálogo</CardTitle>
          <p className="text-muted-foreground mt-2">
            Adicione o catálogo à tela inicial do seu celular para acesso rápido!
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {deferredPrompt ? (
            <Button onClick={handleInstall} className="w-full" size="lg">
              <Download className="mr-2 h-5 w-5" />
              Instalar App
            </Button>
          ) : isIOS ? (
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Como instalar no iPhone/iPad:</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">1</div>
                  <p className="text-muted-foreground pt-1">
                    Toque no ícone <Share className="inline h-4 w-4" /> <strong>Compartilhar</strong> na barra do Safari
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">2</div>
                  <p className="text-muted-foreground pt-1">
                    Role para baixo e toque em <Plus className="inline h-4 w-4" /> <strong>Adicionar à Tela Início</strong>
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">3</div>
                  <p className="text-muted-foreground pt-1">
                    Toque em <strong>Adicionar</strong> para confirmar
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Como instalar:</h3>
              <p className="text-muted-foreground">
                Abra o menu do navegador (⋮) e toque em <strong>"Instalar app"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
              </p>
            </div>
          )}

          <Button variant="outline" onClick={() => navigate("/")} className="w-full">
            Voltar ao Catálogo
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Install;
