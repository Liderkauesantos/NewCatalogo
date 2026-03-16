import { useAllProducts } from "@/hooks/useProducts";
import { useOrders } from "@/hooks/useOrders";
import { useAllCarouselSlides } from "@/hooks/useCarouselSlides";
import { Package, ShoppingBag, Images, TrendingUp, AlertTriangle } from "lucide-react";
import { Link, useParams } from "react-router-dom";

export default function AdminDashboard() {
  const { data: products = [] } = useAllProducts();
  const { data: orders = [] } = useOrders();
  const { data: slides = [] } = useAllCarouselSlides();
  const { slug } = useParams();

  const outOfStock = products.filter((p) => p.stock_quantity === 0).length;
  const activeProducts = products.filter((p) => p.is_active).length;
  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const totalRevenue = orders.reduce((s, o) => s + Number(o.total), 0);

  const stats = [
    {
      label: "Produtos cadastrados",
      value: products.length,
      sub: `${activeProducts} ativos`,
      icon: Package,
      color: "text-primary",
      bg: "bg-primary/10",
      to: `/${slug}/admin/produtos`,
    },
    {
      label: "Pedidos recebidos",
      value: orders.length,
      sub: `${pendingOrders} pendentes`,
      icon: ShoppingBag,
      color: "text-blue-600",
      bg: "bg-blue-50",
      to: `/${slug}/admin/pedidos`,
    },
    {
      label: "Slides do carrossel",
      value: slides.length,
      sub: `${slides.filter((s) => s.is_active).length} ativos`,
      icon: Images,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      to: `/${slug}/admin/carrossel`,
    },
    {
      label: "Faturamento total",
      value: totalRevenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      sub: "todos os pedidos",
      icon: TrendingUp,
      color: "text-violet-600",
      bg: "bg-violet-50",
      to: `/${slug}/admin/pedidos`,
    },
  ];

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Visão geral do seu catálogo</p>
      </div>

      {/* Alerta sem estoque */}
      {outOfStock > 0 && (
        <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/30 rounded-2xl px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <p className="text-sm text-destructive font-medium">
            {outOfStock} produto{outOfStock > 1 ? "s" : ""} sem estoque —{" "}
            <Link to={`/${slug}/admin/produtos`} className="underline font-bold">verificar</Link>
          </p>
        </div>
      )}

      {/* Cards de stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            to={s.to}
            className="bg-card rounded-2xl border border-border p-5 flex items-start gap-4 hover:shadow-md hover:border-primary/30 transition-all group"
          >
            <div className={`${s.bg} rounded-xl p-3 shrink-0`}>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-extrabold text-foreground mt-0.5 leading-none">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Últimos pedidos */}
      {orders.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-foreground">Últimos Pedidos</h2>
            <Link to={`/${slug}/admin/pedidos`} className="text-sm text-primary font-medium hover:underline">
              Ver todos →
            </Link>
          </div>
          <div className="space-y-2">
            {orders.slice(0, 5).map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between px-4 py-3 bg-muted rounded-xl text-sm"
              >
                <div>
                  <p className="font-semibold text-foreground">{order.customer_name}</p>
                  <p className="text-muted-foreground text-xs">{order.company_name}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">
                    {Number(order.total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
