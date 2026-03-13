import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Package, LogIn } from "lucide-react";
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
  const { login } = useAuth();

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
                className="rounded-xl"
              />
            </div>
            <Button type="submit" className="w-full rounded-xl h-11 font-bold gap-2" disabled={loading}>
              {loading ? (
                <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
