-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'farmer');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- get_user_role function
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::TEXT FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Parcels table
CREATE TABLE public.parcels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  location_lat DOUBLE PRECISION NOT NULL,
  location_lng DOUBLE PRECISION NOT NULL,
  area_hectares DOUBLE PRECISION NOT NULL DEFAULT 1,
  crop_type TEXT NOT NULL DEFAULT 'wheat',
  soil_type TEXT DEFAULT 'loam',
  image_url TEXT DEFAULT '',
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sensors table
CREATE TABLE public.sensors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID REFERENCES public.parcels(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('humidity', 'temperature', 'rain')),
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Pumps table
CREATE TABLE public.pumps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID REFERENCES public.parcels(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Pompe principale',
  flow_rate_lph DOUBLE PRECISION NOT NULL DEFAULT 1000,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sensor readings table
CREATE TABLE public.sensor_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sensor_id UUID REFERENCES public.sensors(id) ON DELETE CASCADE NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

-- Irrigation logs table
CREATE TABLE public.irrigation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID REFERENCES public.parcels(id) ON DELETE CASCADE NOT NULL,
  duration_minutes DOUBLE PRECISION NOT NULL,
  water_volume_liters DOUBLE PRECISION NOT NULL,
  decision_type TEXT NOT NULL CHECK (decision_type IN ('automatic', 'manual', 'scheduled')),
  notes TEXT DEFAULT '',
  executed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pumps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.irrigation_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Parcels policies
CREATE POLICY "Farmers can view own parcels" ON public.parcels FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Farmers can insert own parcels" ON public.parcels FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Farmers can update own parcels" ON public.parcels FOR UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Farmers can delete own parcels" ON public.parcels FOR DELETE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Admins can view all parcels" ON public.parcels FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Sensors policies
CREATE POLICY "Owners can manage sensors" ON public.sensors FOR ALL TO authenticated USING (
  parcel_id IN (SELECT id FROM public.parcels WHERE owner_id = auth.uid())
);
CREATE POLICY "Admins can view all sensors" ON public.sensors FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Pumps policies
CREATE POLICY "Owners can manage pumps" ON public.pumps FOR ALL TO authenticated USING (
  parcel_id IN (SELECT id FROM public.parcels WHERE owner_id = auth.uid())
);
CREATE POLICY "Admins can view all pumps" ON public.pumps FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Sensor readings policies
CREATE POLICY "Owners can manage readings" ON public.sensor_readings FOR ALL TO authenticated USING (
  sensor_id IN (SELECT s.id FROM public.sensors s JOIN public.parcels p ON s.parcel_id = p.id WHERE p.owner_id = auth.uid())
);
CREATE POLICY "Admins can view all readings" ON public.sensor_readings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Irrigation logs policies
CREATE POLICY "Owners can manage irrigation logs" ON public.irrigation_logs FOR ALL TO authenticated USING (
  parcel_id IN (SELECT id FROM public.parcels WHERE owner_id = auth.uid())
);
CREATE POLICY "Admins can view all irrigation logs" ON public.irrigation_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_parcels_updated_at
  BEFORE UPDATE ON public.parcels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();