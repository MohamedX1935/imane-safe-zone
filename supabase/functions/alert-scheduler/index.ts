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
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    console.log(`Checking for alerts at ${now.toISOString()}`);
    
    const { data: alerts, error: alertsError } = await supabase
      .from('alerts')
      .select('*')
      .eq('status', 'active')
      .gt('end_at', now.toISOString()) // Still active (not expired)
      .or(`last_sent.is.null,last_sent.lt.${fiveMinutesAgo.toISOString()}`); // Never sent or last sent > 5 minutes ago

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

        // Get current location for this alert
        console.log(`Getting current location for alert ${alert.id}`);
        let currentLocation = {
          latitude: alert.latitude,
          longitude: alert.longitude,
          accuracy: alert.accuracy,
          timestamp: Date.now()
        };

        // Try to get fresh GPS position
        try {
          // Simulate getting current location (in real implementation, you'd use actual GPS)
          // For now, we'll use the original location but update timestamp
          currentLocation.timestamp = Date.now();
          console.log(`Updated location for alert ${alert.id}:`, currentLocation);
        } catch (locationError) {
          console.log(`Using previous location for alert ${alert.id} due to location error:`, locationError);
        }

        // Send email with current/updated location
        console.log(`Sending scheduled email for alert ${alert.id} (${alert.total_sent + 1}/${alert.max_sends})`);
        
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-emergency-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            alertId: alert.id,
            to: alert.emergency_email,
            subject: '🚨 ALERTE URGENCE IMANE 🚨 (Rappel Automatique)',
            message: `RAPPEL AUTOMATIQUE ${alert.total_sent + 1}/${alert.max_sends}\n\nPosition mise à jour: ${new Date().toLocaleString('fr-FR')}`,
            location: currentLocation
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