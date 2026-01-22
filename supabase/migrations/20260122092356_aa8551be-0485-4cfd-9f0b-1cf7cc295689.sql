-- Create data_backups table for disaster recovery
CREATE TABLE public.data_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  backup_date timestamp with time zone DEFAULT now(),
  backup_type text NOT NULL DEFAULT 'auto',
  month text NOT NULL,
  tunnels_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  sales_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  charges_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  salaries_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  coaching_expenses_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Create indexes for fast lookup
CREATE INDEX idx_data_backups_user_id ON public.data_backups(user_id);
CREATE INDEX idx_data_backups_month ON public.data_backups(month);
CREATE INDEX idx_data_backups_date ON public.data_backups(backup_date DESC);

-- Enable RLS
ALTER TABLE public.data_backups ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own backups"
ON public.data_backups
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own backups"
ON public.data_backups
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own backups"
ON public.data_backups
FOR DELETE
USING (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE public.data_backups IS 'Monthly snapshots of user data for disaster recovery';