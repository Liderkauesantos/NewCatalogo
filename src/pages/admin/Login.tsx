import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Package, LogIn, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { slug } = useParams();
  const { toast } = useToast();
  const { login, user, isAdmin, isLoading } = useAuth();

  // Se já está autenticado como admin, redireciona para o dashboard
  useEffect(() => {
    if (!isLoading && user && isAdmin) {
      navigate(`/${slug ?? ''}/admin`, { replace: true });
    }
  }, [user, isAdmin, isLoading, navigate, slug]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const authUser = await login(email, password);

      if (authUser.role !== 'admin') {
        toast({
          variant: "destructive",
          title: "Acesso não autorizado",
          description: "Sua conta não tem permissão de administrador.",
        });
        return;
      }

      navigate(`/${slug ?? ''}/admin`, { replace: true });
    } catch (error: any) {
      const msg = error?.response?.data?.message || error.message || "Verifique suas credenciais.";
      toast({
        variant: "destructive",
        title: "Erro ao entrar",
        description: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-sm shadow-lg rounded-2xl">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-3">
            <div className="bg-primary rounded-2xl p-3">
              <Package className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-extrabold">Admin do Catálogo</CardTitle>
          <CardDescription>Entre com suas credenciais de administrador</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@catalogo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="rounded-xl"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl h-11 font-medium gap-2"
                asChild
              >
                <Link to={`/${slug ?? ''}`}>
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Link>
              </Button>
              <Button type="submit" className="flex-1 rounded-xl h-11 font-bold gap-2" disabled={loading}>
                {loading ? (
                  <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                Entrar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
