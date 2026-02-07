-- Create storage bucket for ML models
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'plant-models',
  'plant-models',
  false,
  52428800, -- 50MB limit
  ARRAY['application/octet-stream', 'application/x-hdf', 'application/x-tensorflow', 'application/json']
);

-- Allow authenticated users to upload models
CREATE POLICY "Authenticated users can upload models"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'plant-models');

-- Allow authenticated users to read their own models
CREATE POLICY "Users can read their own models"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'plant-models');

-- Allow authenticated users to delete their own models
CREATE POLICY "Users can delete their own models"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'plant-models');

-- Create table to track uploaded models
CREATE TABLE public.plant_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  model_path TEXT NOT NULL,
  model_type TEXT NOT NULL, -- 'tensorflow', 'onnx', 'pytorch'
  plant_types TEXT[] NOT NULL,
  accuracy DECIMAL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plant_models ENABLE ROW LEVEL SECURITY;

-- Users can view their own models
CREATE POLICY "Users can view their own models"
ON public.plant_models
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own models
CREATE POLICY "Users can insert their own models"
ON public.plant_models
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own models
CREATE POLICY "Users can update their own models"
ON public.plant_models
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can delete their own models
CREATE POLICY "Users can delete their own models"
ON public.plant_models
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_plant_models_updated_at
BEFORE UPDATE ON public.plant_models
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();