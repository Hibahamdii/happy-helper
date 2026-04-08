DELETE FROM public.user_roles a
USING public.user_roles b
WHERE a.user_id = b.user_id
  AND a.id < b.id;

CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_id_unique_idx
ON public.user_roles (user_id);

CREATE OR REPLACE FUNCTION public.assign_current_user_role(_role public.app_role)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_role public.app_role;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT role INTO existing_role
  FROM public.user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF existing_role IS NOT NULL THEN
    RETURN existing_role::text;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), _role);

  RETURN _role::text;
END;
$$;

INSERT INTO public.user_roles (user_id, role)
SELECT
  p.user_id,
  CASE
    WHEN lower(trim(coalesce(p.full_name, ''))) IN ('admin', 'administrateur') THEN 'admin'::public.app_role
    ELSE 'farmer'::public.app_role
  END
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1
  FROM public.user_roles ur
  WHERE ur.user_id = p.user_id
);