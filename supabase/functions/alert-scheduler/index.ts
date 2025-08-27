import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Alert scheduler running...");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get all active alerts that need to be sent
    const now = new Date();
    const { data: alerts, error: alertsError } = await supabase
      .from('alerts')
      .select('*')
      .eq('status', 'active')
      .lt('end_at', now.toISOString()) // Not expired
      .or(`last_sent.is.null,last_sent.lt.${new Date(now.getTime() - 5 * 60 * 1000).toISOString()}`); // Never sent or last sent > 5 minutes ago

    if (alertsError) {
      throw new Error(`Failed to fetch alerts: ${alertsError.message}`);
    }

    console.log(`Found ${alerts?.length || 0} alerts to process`);

    let processedCount = 0;
    let errorCount = 0;

    for (const alert of alerts || []) {
      try {
        // Check if alert has reached max sends
        if (alert.total_sent >= alert.max_sends) {
          console.log(`Alert ${alert.id} has reached max sends, marking as done`);
          await supabase
            .from('alerts')
            .update({ status: 'done' })
            .eq('id', alert.id);
          continue;
        }

        // Check if alert has expired
        if (new Date(alert.end_at) <= now) {
          console.log(`Alert ${alert.id} has expired, marking as done`);
          await supabase
            .from('alerts')
            .update({ status: 'done' })
            .eq('id', alert.id);
          continue;
        }

        // Send email
        console.log(`Sending scheduled email for alert ${alert.id}`);
        
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-emergency-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            alertId: alert.id,
            to: alert.emergency_email,
            subject: '🚨 ALERTE URGENCE IMANE 🚨 (Rappel)',
            message: `RAPPEL AUTOMATIQUE - Alerte envoyée ${alert.total_sent + 1}/${alert.max_sends}`,
            location: {
              latitude: alert.latitude,
              longitude: alert.longitude,
              accuracy: alert.accuracy,
              timestamp: new Date(alert.location_timestamp).getTime()
            }
          })
        });

        if (!emailResponse.ok) {
          throw new Error(`Email service error: ${emailResponse.statusText}`);
        }

        // Update alert
        await supabase
          .from('alerts')
          .update({
            last_sent: now.toISOString(),
            total_sent: alert.total_sent + 1
          })
          .eq('id', alert.id);

        processedCount++;
        console.log(`Alert ${alert.id} processed successfully`);

      } catch (error) {
        console.error(`Error processing alert ${alert.id}:`, error);
        errorCount++;
      }
    }

    console.log(`Scheduler completed: ${processedCount} alerts processed, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        processedCount,
        errorCount,
        timestamp: now.toISOString()
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error("Error in alert-scheduler function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);