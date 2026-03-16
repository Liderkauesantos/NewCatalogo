import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import { AdminLayout } from "./components/admin/AdminLayout";

const Login = lazy(() => import("./pages/admin/Login"));
const AdminSetup = lazy(() => import("./pages/admin/AdminSetup"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminProdutos = lazy(() => import("./pages/admin/AdminProdutos"));
const AdminCarrossel = lazy(() => import("./pages/admin/AdminCarrossel"));
const AdminPedidos = lazy(() => import("./pages/admin/AdminPedidos"));
const AdminPagamentos = lazy(() => import("./pages/admin/AdminPagamentos"));
const AdminWhatsapp = lazy(() => import("./pages/admin/AdminWhatsapp"));
const AdminMarca = lazy(() => import("./pages/admin/AdminMarca"));
const Install = lazy(() => import("./pages/Install"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
              <Routes>
                {/* Rota raiz — landing page com lista de tenants */}
                <Route path="/" element={<Landing />} />

                {/* Rotas com slug do tenant: /:slug/... */}
                <Route path="/:slug">
                  {/* Catálogo público */}
                  <Route index element={<Index />} />

                  {/* Login e setup admin */}
                  <Route path="admin/login" element={<Login />} />
                  <Route path="admin/setup" element={<AdminSetup />} />

                  {/* Painel admin com layout e sidebar */}
                  <Route path="admin" element={<AdminLayout />}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="produtos" element={<AdminProdutos />} />
                    <Route path="carrossel" element={<AdminCarrossel />} />
                    <Route path="pedidos" element={<AdminPedidos />} />
                    <Route path="pagamentos" element={<AdminPagamentos />} />
                    <Route path="whatsapp" element={<AdminWhatsapp />} />
                    <Route path="marca" element={<AdminMarca />} />
                  </Route>
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
