import { NavLink, useLocation, Link, useParams } from "react-router-dom";
import { LayoutDashboard, Package, Images, ShoppingBag, CreditCard, MessageCircle, Palette, LogOut, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import { cn } from "@/lib/utils";

const navItemsDef = [
  { title: "Dashboard", path: "admin", icon: LayoutDashboard, exact: true },
  { title: "Produtos", path: "admin/produtos", icon: Package, exact: false },
  { title: "Carrossel", path: "admin/carrossel", icon: Images, exact: false },
  { title: "Pedidos", path: "admin/pedidos", icon: ShoppingBag, exact: false },
  { title: "Pagamentos", path: "admin/pagamentos", icon: CreditCard, exact: false },
  { title: "WhatsApp", path: "admin/whatsapp", icon: MessageCircle, exact: false },
  { title: "Marca", path: "admin/marca", icon: Palette, exact: false },
];

export function AdminSidebar() {
  const { signOut, user } = useAuth();
  const { data: brand } = useBrandSettings();
  const location = useLocation();
  const { slug } = useParams();
  const base = `/${slug ?? ''}`;

  const navItems = navItemsDef.map((item) => ({
    ...item,
    url: `${base}/${item.path}`,
  }));

  const isActive = (url: string, exact: boolean) =>
    exact ? location.pathname === url : location.pathname.startsWith(url);

  return (
    <aside className="w-60 shrink-0 bg-card border-r border-border flex flex-col min-h-screen">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
        {brand?.logo_url ? (
          <div className="h-9 w-9 rounded-xl overflow-hidden flex items-center justify-center bg-muted shrink-0">
            <img src={brand.logo_url} alt="Logo" className="h-full w-full object-contain" />
          </div>
        ) : (
          <div className="bg-primary rounded-xl p-2 shrink-0">
            <Package className="h-5 w-5 text-primary-foreground" />
          </div>
        )}
        <div>
          <p className="font-extrabold text-foreground text-base leading-none">{brand?.company_name || "Admin"}</p>
          <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Painel Admin</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.url, item.exact);
          return (
            <NavLink
              key={item.url}
              to={item.url}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" />
              {item.title}
            </NavLink>
          );
        })}
      </nav>

      {/* User + logout */}
      <div className="px-3 py-4 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-muted mb-2">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-xs font-bold text-primary uppercase">
              {user?.display_name?.[0] ?? "A"}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{user?.display_name}</p>
            <p className="text-[10px] text-muted-foreground">Administrador</p>
          </div>
        </div>
        <Link
          to={base}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all mb-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Ver catálogo
        </Link>
        <button
          onClick={signOut}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}
