
ALTER TABLE public.sales ADD COLUMN refunded_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN refund_history jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.sales ADD COLUMN is_fully_refunded boolean NOT NULL DEFAULT false;
