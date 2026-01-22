-- Add Klarna columns to sales table
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS klarna_amount numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cb_amount numeric DEFAULT NULL;

-- Add Klarna configuration to user_charges table
ALTER TABLE public.user_charges 
ADD COLUMN IF NOT EXISTS klarna_percent numeric DEFAULT 8,
ADD COLUMN IF NOT EXISTS klarna_max_amount numeric DEFAULT 1500;