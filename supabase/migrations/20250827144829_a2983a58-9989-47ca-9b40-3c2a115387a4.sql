-- Enable required extensions for CRON jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create CRON job to run alert-scheduler every 5 minutes
SELECT cron.schedule(
  'alert-scheduler-job',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
        url:='https://abtflxgmjclxszrzaydz.supabase.co/functions/v1/alert-scheduler',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFidGZseGdtamNseHN6cnpheWR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyOTU1OTEsImV4cCI6MjA3MTg3MTU5MX0.VqQoKenb5M13yvVwjXAY_AX1_OeG-HLQHrKSWPy5h7Q"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- Add columns to track latest GPS position for each alert
ALTER TABLE alerts 
ADD COLUMN IF NOT EXISTS last_latitude numeric,
ADD COLUMN IF NOT EXISTS last_longitude numeric, 
ADD COLUMN IF NOT EXISTS last_accuracy numeric;