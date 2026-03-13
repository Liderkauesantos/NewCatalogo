-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TIPOS ENUM
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'user');
    END IF;
END $$;

-- 3. SEQUENCES
CREATE SEQUENCE IF NOT EXISTS orders_order_number_seq
START WITH 1
INCREMENT BY 1;

-- 4. FUNÇÕES GLOBAIS
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. TABELAS (ESTRUTURA ATÔMICA)

-- Configurações da Marca
CREATE TABLE IF NOT EXISTS public.brand_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name text NOT NULL DEFAULT 'Minha Empresa',
    logo_url text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Categorias
CREATE TABLE IF NOT EXISTS public.categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Produtos
CREATE TABLE IF NOT EXISTS public.products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    code text NOT NULL,
    description text,
    price numeric NOT NULL DEFAULT 0,
    stock_quantity integer NOT NULL DEFAULT 0,
    category_id uuid,
    image_url text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL
);

-- Imagens Adicionais
CREATE TABLE IF NOT EXISTS public.product_images (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL,
    image_url text NOT NULL,
    display_order integer NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE
);

-- Pedidos
CREATE TABLE IF NOT EXISTS public.orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number integer NOT NULL DEFAULT nextval('orders_order_number_seq'),
    customer_name text NOT NULL,
    company_name text NOT NULL,
    items jsonb NOT NULL DEFAULT '[]'::jsonb,
    total numeric NOT NULL DEFAULT 0,
    whatsapp_number text,
    payment_method text,
    status text NOT NULL DEFAULT 'pending',
    notes text,
    created_at timestamptz DEFAULT now()
);

-- Gestão de Acessos (Para controle via sua API)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    role app_role NOT NULL,
    CONSTRAINT unique_user_role UNIQUE (user_id, role)
);

-- 6. TRIGGERS (AUTOMAÇÃO DE DATAS)
DO $$
BEGIN
    -- Trigger para brand_settings
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_update_brand_settings') THEN
        CREATE TRIGGER tr_update_brand_settings BEFORE UPDATE ON public.brand_settings
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    -- Trigger para products
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_update_products') THEN
        CREATE TRIGGER tr_update_products BEFORE UPDATE ON public.products
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;