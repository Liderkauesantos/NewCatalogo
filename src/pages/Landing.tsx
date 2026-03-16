import { Store, Sparkles, Zap, Shield, Palette, MessageCircle, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Landing() {
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
            <Button
              onClick={() => window.open('https://api.whatsapp.com/send?phone=5516997509117&text=Olá! Gostaria de contratar o New Catálogo', '_blank')}
              className="bg-primary hover:bg-primary/90"
            >
              Contratar Agora
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            <span>Solução completa para catálogos digitais</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 mb-6 leading-tight">
            New Catálogo
          </h1>

          <p className="text-xl md:text-2xl text-slate-600 mb-8 leading-relaxed">
            Transforme seu negócio com uma plataforma moderna de <span className="text-primary font-semibold">catálogo digital</span> e exposição de produtos online
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => window.open('https://api.whatsapp.com/send?phone=5516997509117&text=Olá! Gostaria de saber mais sobre o New Catálogo', '_blank')}
              className="bg-primary hover:bg-primary/90 text-lg px-8"
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              Fale Conosco
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => window.open('https://newstandard.com.br/quem-somos/', '_blank')}
              className="text-lg px-8"
            >
              Sobre a New Standard
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Por que escolher o New Catálogo?
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Uma solução completa desenvolvida pela New Standard para impulsionar suas vendas online
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Feature 1 */}
            <div className="bg-gradient-to-br from-blue-50 to-white p-8 rounded-2xl border border-blue-100 hover:shadow-xl transition-shadow">
              <div className="bg-blue-500 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
                <Store className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">
                Catálogo Completo
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Exponha seus produtos de forma profissional com imagens, descrições, categorias e preços organizados
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gradient-to-br from-purple-50 to-white p-8 rounded-2xl border border-purple-100 hover:shadow-xl transition-shadow">
              <div className="bg-purple-500 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
                <Zap className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">
                Rápido e Responsivo
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Interface moderna que funciona perfeitamente em celulares, tablets e computadores
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gradient-to-br from-green-50 to-white p-8 rounded-2xl border border-green-100 hover:shadow-xl transition-shadow">
              <div className="bg-green-500 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
                <MessageCircle className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">
                Integração WhatsApp
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Seus clientes podem fazer pedidos diretamente pelo WhatsApp com apenas um clique
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-gradient-to-br from-orange-50 to-white p-8 rounded-2xl border border-orange-100 hover:shadow-xl transition-shadow">
              <div className="bg-orange-500 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
                <Palette className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">
                Personalização Total
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Customize cores, logo, banners e informações da sua marca para refletir sua identidade
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-gradient-to-br from-red-50 to-white p-8 rounded-2xl border border-red-100 hover:shadow-xl transition-shadow">
              <div className="bg-red-500 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">
                Seguro e Confiável
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Infraestrutura robusta com backup automático e proteção de dados dos seus clientes
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-gradient-to-br from-cyan-50 to-white p-8 rounded-2xl border border-cyan-100 hover:shadow-xl transition-shadow">
              <div className="bg-cyan-500 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
                <Sparkles className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">
                Painel Administrativo
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Gerencie produtos, pedidos, categorias e configurações de forma simples e intuitiva
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-primary to-primary/80 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center text-white">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Pronto para digitalizar seu catálogo?
            </h2>
            <p className="text-xl mb-8 text-white/90">
              Entre em contato conosco e descubra como o New Catálogo pode transformar a forma como você vende online
            </p>
            <Button
              size="lg"
              onClick={() => window.open('https://api.whatsapp.com/send?phone=5516997509117&text=Olá! Quero contratar o New Catálogo para meu negócio', '_blank')}
              className="bg-white text-primary hover:bg-white/90 text-lg px-8"
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              Solicitar Demonstração
            </Button>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <img
                src="/logo_newstandard_principal_dark.svg"
                alt="New Standard"
                className="h-12 mx-auto mb-6"
              />
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                Desenvolvido pela New Standard
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                A New Standard é uma empresa especializada em soluções digitais inovadoras.
                O New Catálogo é nossa plataforma completa para empresas que desejam ter presença
                online profissional, moderna e eficiente para exposição e venda de produtos.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div className="bg-white p-6 rounded-xl border border-slate-200">
                <div className="text-4xl font-bold text-primary mb-2">5+</div>
                <div className="text-slate-600">Anos de experiência</div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200">
                <div className="text-4xl font-bold text-primary mb-2">100%</div>
                <div className="text-slate-600">Suporte nacional</div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200">
                <div className="text-4xl font-bold text-primary mb-2">24/7</div>
                <div className="text-slate-600">Disponibilidade</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-slate-900 mb-6">
              Entre em Contato
            </h2>
            <p className="text-xl text-slate-600 mb-12">
              Nossa equipe está pronta para atender você e apresentar a melhor solução para seu negócio
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <a
                href="https://api.whatsapp.com/send?phone=5516997509117"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-slate-200 hover:border-primary hover:shadow-lg transition-all"
              >
                <div className="bg-green-500 w-12 h-12 rounded-full flex items-center justify-center">
                  <Phone className="h-6 w-6 text-white" />
                </div>
                <div className="font-semibold text-slate-900">WhatsApp</div>
                <div className="text-sm text-slate-600">(16) 99750-9117</div>
              </a>

              <a
                href="mailto:contato@newstandard.com.br"
                className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-slate-200 hover:border-primary hover:shadow-lg transition-all"
              >
                <div className="bg-blue-500 w-12 h-12 rounded-full flex items-center justify-center">
                  <Mail className="h-6 w-6 text-white" />
                </div>
                <div className="font-semibold text-slate-900">E-mail</div>
                <div className="text-sm text-slate-600">contato@newstandard.com.br</div>
              </a>

              <a
                href="https://newstandard.com.br/quem-somos/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-slate-200 hover:border-primary hover:shadow-lg transition-all"
              >
                <div className="bg-purple-500 w-12 h-12 rounded-full flex items-center justify-center">
                  <Store className="h-6 w-6 text-white" />
                </div>
                <div className="font-semibold text-slate-900">Website</div>
                <div className="text-sm text-slate-600">newstandard.com.br</div>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
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
