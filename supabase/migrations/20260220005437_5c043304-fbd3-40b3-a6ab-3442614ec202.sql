
-- Fix RLS policies for products table to allow admin INSERT
DROP POLICY IF EXISTS "Admins manage products" ON public.products;

CREATE POLICY "Admins can select products"
ON public.products FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert products"
ON public.products FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update products"
ON public.products FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete products"
ON public.products FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix categories table as well
DROP POLICY IF EXISTS "Admins manage categories" ON public.categories;

CREATE POLICY "Admins can insert categories"
ON public.categories FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update categories"
ON public.categories FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete categories"
ON public.categories FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix carousel_slides table as well
DROP POLICY IF EXISTS "Admins manage slides" ON public.carousel_slides;

CREATE POLICY "Admins can insert slides"
ON public.carousel_slides FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update slides"
ON public.carousel_slides FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete slides"
ON public.carousel_slides FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
