
-- Tabela de slides do carrossel
create table public.carousel_slides (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  cta_text text default 'Ver Catálogo',
  image_url text,
  bg_gradient text default 'from-orange-500 via-orange-400 to-amber-300',
  display_order integer not null default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.carousel_slides enable row level security;

create policy "Public can view active slides" on public.carousel_slides
  for select using (is_active = true);

create policy "Admins manage slides" on public.carousel_slides
  for all using (public.has_role(auth.uid(), 'admin'));

-- Tabela de pedidos
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  company_name text not null,
  items jsonb not null default '[]'::jsonb,
  total numeric(10,2) not null default 0,
  whatsapp_number text default '5516997764714',
  status text not null default 'pending',
  notes text,
  created_at timestamptz default now()
);

alter table public.orders enable row level security;

-- Pedidos: qualquer pessoa pode inserir (público manda pedido sem conta)
create policy "Anyone can create orders" on public.orders
  for insert with check (true);

-- Somente admins podem ver e gerenciar pedidos
create policy "Admins can view all orders" on public.orders
  for select using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update orders" on public.orders
  for update using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete orders" on public.orders
  for delete using (public.has_role(auth.uid(), 'admin'));

-- Trigger updated_at para slides
create trigger update_carousel_slides_updated_at
  before update on public.carousel_slides
  for each row execute function public.update_updated_at_column();

-- Slides padrão para começar
insert into public.carousel_slides (title, subtitle, cta_text, bg_gradient, display_order) values
  ('Produtos de Qualidade IPI', 'As melhores soluções para o seu negócio com entrega rápida e garantida.', 'Ver Catálogo', 'from-orange-500 via-orange-400 to-amber-300', 0),
  ('Novidades na Linha Zanardi', 'Confira os produtos mais recentes com preços especiais para revendedores.', 'Ver Novidades', 'from-blue-600 via-blue-500 to-cyan-400', 1),
  ('Faça Seu Pedido pelo WhatsApp', 'Monte seu carrinho e envie o pedido diretamente pelo WhatsApp. Rápido e fácil.', 'Montar Pedido', 'from-emerald-600 via-emerald-500 to-teal-400', 2);
