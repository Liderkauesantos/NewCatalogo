
-- Migration 1: Enum + Tabela user_roles + função has_role
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer
set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- Migration 2: Categorias e Produtos
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  description text,
  price numeric(10,2) not null default 0,
  stock_quantity integer not null default 0,
  image_url text,
  category_id uuid references public.categories(id),
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.categories enable row level security;
alter table public.products enable row level security;

create policy "Public can view categories" on public.categories for select using (true);
create policy "Public can view active products" on public.products for select using (is_active = true);
create policy "Admins manage categories" on public.categories for all using (public.has_role(auth.uid(), 'admin'));
create policy "Admins manage products" on public.products for all using (public.has_role(auth.uid(), 'admin'));

-- Migration 3: Storage bucket para fotos
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true);

create policy "Public can view product images" on storage.objects for select using (bucket_id = 'product-images');
create policy "Admins can upload product images" on storage.objects for insert with check (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
create policy "Admins can update product images" on storage.objects for update using (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
create policy "Admins can delete product images" on storage.objects for delete using (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

-- Migration 4: RLS na user_roles
create policy "Users can view own roles" on public.user_roles for select using (auth.uid() = user_id);
create policy "Admins can manage roles" on public.user_roles for all using (public.has_role(auth.uid(), 'admin'));

-- Trigger para updated_at nos produtos
create or replace function public.update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_products_updated_at
  before update on public.products
  for each row execute function public.update_updated_at_column();
