import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Store, ArrowRight, Sparkles } from "lucide-react";
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <img
              src="/logo_newstandard_principal_dark.svg"
              alt="New Standard"
              className="h-10"
            />
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-medium">Catálogos Digitais</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 mb-6 leading-tight">
            New Catálogo
          </h1>
          <p className="text-xl text-slate-600 mb-8">
            Acesse nossos catálogos de parceiros abaixo
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium">
            <Store className="h-4 w-4" />
            {loading ? 'Carregando...' : `${tenants.length} ${tenants.length === 1 ? 'catálogo disponível' : 'catálogos disponíveis'}`}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Tenants Grid */}
        {!loading && tenants.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mb-12">
            {tenants.map((tenant) => (
              <Link
                key={tenant.id}
                to={`/${tenant.slug}`}
                className="group relative bg-white rounded-2xl border-2 border-slate-200 p-6 hover:border-primary hover:shadow-2xl transition-all duration-300 overflow-hidden"
              >
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="relative flex items-center gap-4">
                  {/* Logo/Icon */}
                  {tenant.logo_url ? (
                    <div className="h-16 w-16 rounded-xl overflow-hidden flex items-center justify-center bg-slate-100 shrink-0 border border-slate-200">
                      <img
                        src={tenant.logo_url}
                        alt={tenant.display_name}
                        className="h-full w-full object-contain p-2"
                      />
                    </div>
                  ) : (
                    <div
                      className="h-16 w-16 rounded-xl flex items-center justify-center shrink-0 border-2"
                      style={{
                        backgroundColor: `${tenant.primary_color}15`,
                        borderColor: `${tenant.primary_color}30`
                      }}
                    >
                      <Store
                        className="h-8 w-8"
                        style={{ color: tenant.primary_color }}
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-slate-900 mb-1 truncate group-hover:text-primary transition-colors">
                      {tenant.display_name}
                    </h3>
                    <p className="text-sm text-slate-500 font-mono">
                      /{tenant.slug}
                    </p>
                  </div>

                  {/* Arrow icon */}
                  <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && tenants.length === 0 && (
          <div className="text-center py-20 max-w-md mx-auto">
            <div className="bg-slate-100 rounded-full h-24 w-24 flex items-center justify-center mx-auto mb-6">
              <Store className="h-12 w-12 text-slate-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3">
              Nenhum catálogo disponível
            </h3>
            <p className="text-slate-600">
              Aguarde enquanto nossos parceiros configuram seus catálogos.
            </p>
          </div>
        )}
      </main>

      {/* Footer - Fixed at bottom */}
      <footer className="border-t border-slate-200 bg-white mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img
                src="/logo.ico"
                alt="New Standard Icon"
                className="h-6 w-6"
              />
              <p className="text-sm text-slate-600">
                &copy; {new Date().getFullYear()} <span className="font-semibold text-slate-900">New Standard</span>. Todos os direitos reservados.
              </p>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <a href="https://newstandard.com.br/quem-somos/" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Sobre</a>
              <a href="mailto:contato@newstandard.com.br" className="hover:text-primary transition-colors">Suporte</a>
              <a href="https://api.whatsapp.com/send?phone=5516997509117" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Contato</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
