-- Add closer_stats JSONB column to tunnels table
ALTER TABLE public.tunnels 
ADD COLUMN IF NOT EXISTS closer_stats jsonb DEFAULT '[]'::jsonb;