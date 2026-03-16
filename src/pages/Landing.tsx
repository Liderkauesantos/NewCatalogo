import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package, ExternalLink } from "lucide-react";
import api from "@/lib/api";

interface Tenant {
  id: string;
  slug: string;
  display_name: string;
  logo_url: string | null;
  primary_color: string;
  active: boolean;
}

export default function Landing() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const { data } = await api.get('/tenants?active=eq.true&select=id,slug,display_name,logo_url,primary_color');
        setTenants(data);
      } catch (error) {
        console.error('Erro ao carregar tenants:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTenants();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <img 
              src="/src/assets/logo_newstandard_principal_dark.svg" 
              alt="New Standard" 
              className="h-16"
            />
          </div>
          <h1 className="text-5xl font-extrabold text-foreground mb-4">
            New Catálogo
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Acesse nossos catálogos de parceiros abaixo
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Tenants Grid */}
        {!loading && tenants.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {tenants.map((tenant) => (
              <Link
                key={tenant.id}
                to={`/${tenant.slug}`}
                className="group bg-card rounded-2xl border border-border p-6 hover:shadow-xl hover:border-primary/50 transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="flex items-start gap-4">
                  {tenant.logo_url ? (
                    <div className="h-14 w-14 rounded-xl overflow-hidden flex items-center justify-center bg-muted shrink-0">
                      <img 
                        src={tenant.logo_url} 
                        alt={tenant.display_name} 
                        className="h-full w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div 
                      className="h-14 w-14 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${tenant.primary_color}20` }}
                    >
                      <Package 
                        className="h-7 w-7" 
                        style={{ color: tenant.primary_color }}
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-foreground mb-1 truncate">
                      {tenant.display_name}
                    </h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      /{tenant.slug}
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && tenants.length === 0 && (
          <div className="text-center py-20">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">
              Nenhum catálogo disponível
            </h3>
            <p className="text-muted-foreground">
              Aguarde enquanto nossos parceiros configuram seus catálogos.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-16 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} New Standard. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
