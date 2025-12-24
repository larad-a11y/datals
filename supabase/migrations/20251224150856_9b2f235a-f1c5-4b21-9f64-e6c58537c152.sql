-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create tunnels table
CREATE TABLE public.tunnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('webinar', 'vsl', 'challenge')),
  date DATE,
  end_date DATE,
  month TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  ad_budget DECIMAL(10,2) DEFAULT 0,
  calls_generated INTEGER DEFAULT 0,
  calls_closed INTEGER DEFAULT 0,
  average_price DECIMAL(10,2) DEFAULT 0,
  collected_amount DECIMAL(10,2) DEFAULT 0,
  registrations INTEGER DEFAULT 0,
  attendees INTEGER DEFAULT 0,
  challenge_days JSONB DEFAULT '[]',
  calls_booked INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tunnels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tunnels" ON public.tunnels
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tunnels" ON public.tunnels
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tunnels" ON public.tunnels
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tunnels" ON public.tunnels
  FOR DELETE USING (auth.uid() = user_id);

-- Create sales table
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tunnel_id UUID REFERENCES public.tunnels(id) ON DELETE CASCADE,
  client_name TEXT,
  closer_id TEXT,
  sale_date DATE NOT NULL,
  offer_id TEXT,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cb', 'virement')),
  base_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  number_of_payments INTEGER DEFAULT 1,
  amount_collected DECIMAL(10,2) DEFAULT 0,
  payment_history JSONB DEFAULT '[]',
  next_payment_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sales" ON public.sales
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sales" ON public.sales
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sales" ON public.sales
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sales" ON public.sales
  FOR DELETE USING (auth.uid() = user_id);

-- Create user_charges table for charges configuration
CREATE TABLE public.user_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  associate_percent DECIMAL(5,2) DEFAULT 15,
  closers_percent DECIMAL(5,2) DEFAULT 17.5,
  agency_percent DECIMAL(5,2) DEFAULT 20,
  agency_threshold DECIMAL(10,2) DEFAULT 130000,
  payment_processor_percent DECIMAL(5,2) DEFAULT 4,
  tax_percent DECIMAL(5,2) DEFAULT 20,
  closers JSONB DEFAULT '[]',
  installment_plans JSONB DEFAULT '[{"id":"1x","name":"1x (comptant)","payments":1,"markupPercent":0},{"id":"2x","name":"2x","payments":2,"markupPercent":5},{"id":"3x","name":"3x","payments":3,"markupPercent":10},{"id":"4x","name":"4x","payments":4,"markupPercent":15},{"id":"5x","name":"5x","payments":5,"markupPercent":20},{"id":"6x","name":"6x","payments":6,"markupPercent":25}]',
  offers JSONB DEFAULT '[]',
  advertising DECIMAL(10,2) DEFAULT 0,
  marketing DECIMAL(10,2) DEFAULT 0,
  software DECIMAL(10,2) DEFAULT 0,
  other_costs DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own charges" ON public.user_charges
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own charges" ON public.user_charges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own charges" ON public.user_charges
  FOR UPDATE USING (auth.uid() = user_id);

-- Create salaries table
CREATE TABLE public.salaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  gross_salary DECIMAL(10,2) NOT NULL,
  employer_charges DECIMAL(10,2) DEFAULT 0,
  total_cost DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.salaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own salaries" ON public.salaries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own salaries" ON public.salaries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own salaries" ON public.salaries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own salaries" ON public.salaries
  FOR DELETE USING (auth.uid() = user_id);

-- Create coaching_expenses table
CREATE TABLE public.coaching_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  month TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.coaching_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own coaching expenses" ON public.coaching_expenses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own coaching expenses" ON public.coaching_expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own coaching expenses" ON public.coaching_expenses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own coaching expenses" ON public.coaching_expenses
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.email);
  
  -- Create default charges for new user
  INSERT INTO public.user_charges (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tunnels_updated_at BEFORE UPDATE ON public.tunnels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_charges_updated_at BEFORE UPDATE ON public.user_charges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_salaries_updated_at BEFORE UPDATE ON public.salaries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coaching_expenses_updated_at BEFORE UPDATE ON public.coaching_expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();