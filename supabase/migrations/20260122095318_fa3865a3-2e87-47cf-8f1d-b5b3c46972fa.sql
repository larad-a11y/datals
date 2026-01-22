-- Add traffic_source column to sales table
ALTER TABLE public.sales 
ADD COLUMN traffic_source TEXT NOT NULL DEFAULT 'ads' 
CHECK (traffic_source IN ('ads', 'organic'));