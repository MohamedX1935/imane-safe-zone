-- Create alerts table for emergency tracking
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name TEXT NOT NULL DEFAULT 'Imane',
  emergency_number TEXT NOT NULL,
  emergency_email TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_at TIMESTAMPTZ NOT NULL,
  interval_seconds INTEGER NOT NULL DEFAULT 300, -- 5 minutes
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'stopped', 'done')),
  last_sent TIMESTAMPTZ,
  total_sent INTEGER DEFAULT 0,
  max_sends INTEGER DEFAULT 36, -- 2 hours / 5 minutes
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  accuracy DECIMAL(10, 2),
  location_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (emergency app)
CREATE POLICY "Emergency alerts are publicly accessible" 
ON public.alerts 
FOR ALL
USING (true)
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_alerts_updated_at
    BEFORE UPDATE ON public.alerts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for efficient querying
CREATE INDEX idx_alerts_status_last_sent ON public.alerts(status, last_sent) WHERE status = 'active';