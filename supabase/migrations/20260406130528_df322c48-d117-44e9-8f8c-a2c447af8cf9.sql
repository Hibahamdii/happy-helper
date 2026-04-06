
-- Add new agronomic fields to parcels
ALTER TABLE public.parcels ADD COLUMN IF NOT EXISTS season text DEFAULT 'spring';
ALTER TABLE public.parcels ADD COLUMN IF NOT EXISTS growth_stage text DEFAULT 'vegetative';
ALTER TABLE public.parcels ADD COLUMN IF NOT EXISTS water_source text DEFAULT 'drip';

-- Create alerts table
CREATE TABLE public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  parcel_id uuid REFERENCES public.parcels(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alerts" ON public.alerts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own alerts" ON public.alerts FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own alerts" ON public.alerts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own alerts" ON public.alerts FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all alerts" ON public.alerts FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Create irrigation_schedules table
CREATE TABLE public.irrigation_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id uuid NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL,
  start_time time NOT NULL DEFAULT '06:00',
  duration_minutes integer NOT NULL DEFAULT 30,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.irrigation_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage schedules" ON public.irrigation_schedules FOR ALL TO authenticated
  USING (parcel_id IN (SELECT id FROM parcels WHERE owner_id = auth.uid()));
CREATE POLICY "Admins can view all schedules" ON public.irrigation_schedules FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
