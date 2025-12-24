-- Ajouter les champs pour gérer les impayés
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS is_defaulted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS defaulted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS last_payment_update timestamp with time zone DEFAULT now();

-- Créer une fonction pour mettre à jour last_payment_update quand amount_collected change
CREATE OR REPLACE FUNCTION public.update_last_payment_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.amount_collected IS DISTINCT FROM NEW.amount_collected THEN
    NEW.last_payment_update = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Créer le trigger
DROP TRIGGER IF EXISTS update_sales_last_payment ON public.sales;
CREATE TRIGGER update_sales_last_payment
BEFORE UPDATE ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.update_last_payment_update();