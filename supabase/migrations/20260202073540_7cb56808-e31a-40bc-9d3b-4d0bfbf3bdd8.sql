-- Add separate columns for Ads and Organic registrations
ALTER TABLE public.tunnels 
ADD COLUMN IF NOT EXISTS registrations_ads integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS registrations_organic integer DEFAULT 0;

-- Migrate existing registrations data to registrations_ads (assuming all were from ads)
UPDATE public.tunnels 
SET registrations_ads = registrations 
WHERE registrations IS NOT NULL AND registrations > 0;