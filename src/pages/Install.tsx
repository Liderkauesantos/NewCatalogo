import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Share, Plus, Smartphone, Monitor, CheckCircle, Chrome, Apple } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "desktop" | "mobile" | "ios";

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<Platform>("mobile");
  const navigate = useNavigate();

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isIOSDevice) {
      setPlatform("ios");
    } else if (isMobileDevice) {
      setPlatform("mobile");
    } else {
      setPlatform("desktop");
    }

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
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Monitor className="h-12 w-12 text-primary" />
            <Smartphone className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-3xl">Instalar Catálogo</CardTitle>
          <CardDescription className="text-base mt-2">
            Instale o aplicativo no seu dispositivo para acesso rápido e offline
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {deferredPrompt ? (
            <div className="space-y-4">
              <Button onClick={handleInstall} className="w-full" size="lg">
                <Download className="mr-2 h-5 w-5" />
                Instalar App Agora
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Clique no botão acima para instalar o aplicativo diretamente
              </p>
            </div>
          ) : (
            <Tabs defaultValue={platform} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="desktop" className="gap-2">
                  <Monitor className="h-4 w-4" />
                  <span className="hidden sm:inline">Desktop</span>
                </TabsTrigger>
                <TabsTrigger value="mobile" className="gap-2">
                  <Smartphone className="h-4 w-4" />
                  <span className="hidden sm:inline">Android</span>
                </TabsTrigger>
                <TabsTrigger value="ios" className="gap-2">
                  <Apple className="h-4 w-4" />
                  <span className="hidden sm:inline">iOS</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="desktop" className="space-y-4 mt-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                    <Chrome className="h-6 w-6 text-primary shrink-0 mt-1" />
                    <div className="space-y-2">
                      <h3 className="font-semibold text-foreground">Chrome / Edge / Brave</h3>
                      <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                        <li>Clique no ícone <strong>⋮</strong> (três pontos) no canto superior direito</li>
                        <li>Selecione <strong>"Instalar Catálogo"</strong> ou <strong>"Instalar app"</strong></li>
                        <li>Confirme a instalação na janela que aparecer</li>
                        <li>O app será adicionado à sua área de trabalho e menu iniciar</li>
                      </ol>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-2">
                      💡 Atalho de teclado
                    </h4>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      No Chrome/Edge: Pressione <kbd className="px-2 py-1 bg-white dark:bg-gray-800 rounded border">Ctrl</kbd> + <kbd className="px-2 py-1 bg-white dark:bg-gray-800 rounded border">Shift</kbd> + <kbd className="px-2 py-1 bg-white dark:bg-gray-800 rounded border">A</kbd>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Benefícios da instalação Desktop:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Acesso rápido sem abrir o navegador</li>
                      <li>Janela dedicada sem barras de navegação</li>
                      <li>Funciona offline após primeira visita</li>
                      <li>Atalhos de teclado personalizados</li>
                      <li>Integração com sistema operacional</li>
                    </ul>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="mobile" className="space-y-4 mt-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">1</div>
                    <div className="pt-1">
                      <p className="font-medium text-foreground mb-1">Abra o menu do navegador</p>
                      <p className="text-sm text-muted-foreground">
                        Toque no ícone <strong>⋮</strong> (três pontos) no canto superior direito
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">2</div>
                    <div className="pt-1">
                      <p className="font-medium text-foreground mb-1">Selecione instalar</p>
                      <p className="text-sm text-muted-foreground">
                        Toque em <strong>"Instalar app"</strong>, <strong>"Adicionar à tela inicial"</strong> ou <strong>"Instalar Catálogo"</strong>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">3</div>
                    <div className="pt-1">
                      <p className="font-medium text-foreground mb-1">Confirme a instalação</p>
                      <p className="text-sm text-muted-foreground">
                        Toque em <strong>"Instalar"</strong> ou <strong>"Adicionar"</strong> para confirmar
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg mt-4">
                    <h4 className="font-semibold text-sm text-green-900 dark:text-green-100 mb-2">
                      ✨ Recursos Mobile
                    </h4>
                    <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
                      <li>• Ícone na tela inicial</li>
                      <li>• Funciona offline</li>
                      <li>• Tela cheia sem navegador</li>
                      <li>• Atualizações automáticas</li>
                    </ul>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="ios" className="space-y-4 mt-6">
                <div className="space-y-4">
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm text-yellow-900 dark:text-yellow-100">
                      <strong>Importante:</strong> Use o navegador Safari para instalar no iOS
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">1</div>
                    <div className="pt-1">
                      <p className="font-medium text-foreground mb-1">Abra o menu compartilhar</p>
                      <p className="text-sm text-muted-foreground">
                        Toque no ícone <Share className="inline h-4 w-4" /> <strong>Compartilhar</strong> na barra inferior do Safari
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">2</div>
                    <div className="pt-1">
                      <p className="font-medium text-foreground mb-1">Adicionar à tela inicial</p>
                      <p className="text-sm text-muted-foreground">
                        Role para baixo e toque em <Plus className="inline h-4 w-4" /> <strong>"Adicionar à Tela Início"</strong>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">3</div>
                    <div className="pt-1">
                      <p className="font-medium text-foreground mb-1">Confirme</p>
                      <p className="text-sm text-muted-foreground">
                        Toque em <strong>"Adicionar"</strong> no canto superior direito
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg mt-4">
                    <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-2">
                      🍎 Compatível com iPad
                    </h4>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      O mesmo processo funciona no iPad. O app se adapta automaticamente ao tamanho da tela.
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}

          <div className="pt-4 border-t">
            <Button variant="outline" onClick={() => navigate("/")} className="w-full">
              Voltar ao Catálogo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Install;
