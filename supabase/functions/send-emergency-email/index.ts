import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import nodemailer from "npm:nodemailer@6.9.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  alertId: string;
  to: string;
  subject: string;
  message: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { alertId, to, subject, message, location }: EmailRequest = await req.json();

    console.log(`Sending emergency email for alert ${alertId} to ${to}`);

    // Get Gmail credentials from Supabase secrets
    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailPass = Deno.env.get("GMAIL_PASS");

    if (!gmailUser || !gmailPass) {
      throw new Error("Gmail credentials not configured");
    }

    // Prepare email content
    const htmlMessage = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${subject}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .location { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .maps-link { display: inline-block; background: #1f2937; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .urgent { color: #dc2626; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚨 ALERTE URGENCE IMANE 🚨</h1>
            </div>
            <div class="content">
              <p class="urgent">CECI EST UN MESSAGE D'URGENCE AUTOMATIQUE</p>
              
              <div class="location">
                <h3>📍 Position GPS</h3>
                <p><strong>Latitude:</strong> ${location.latitude.toFixed(6)}</p>
                <p><strong>Longitude:</strong> ${location.longitude.toFixed(6)}</p>
                <p><strong>Précision:</strong> ${location.accuracy.toFixed(0)}m</p>
                <p><strong>Heure:</strong> ${new Date(location.timestamp).toLocaleString('fr-FR')}</p>
                
                <a href="https://maps.google.com/?q=${location.latitude},${location.longitude}" 
                   class="maps-link" target="_blank">
                  🗺️ Ouvrir dans Google Maps
                </a>
              </div>
              
              <p>Ce message a été envoyé automatiquement par l'application ImaneSafety.</p>
              <p>Si cette alerte continue, de nouveaux messages seront envoyés toutes les 5 minutes pendant 2 heures.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Configure Gmail SMTP transporter
    const transporter = nodemailer.createTransporter({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailPass
      }
    });

    console.log("SMTP transporter configured for:", gmailUser);

    // Prepare email data
    const emailData = {
      from: `"ImaneSafety" <${gmailUser}>`,
      to: to,
      subject: subject,
      html: htmlMessage,
      text: message
    };

    console.log("Sending email with data:", {
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      textLength: emailData.text.length,
      htmlLength: emailData.html.length
    });

    // Send the actual email
    const emailResult = await transporter.sendMail(emailData);
    
    console.log("Email sent successfully:", {
      messageId: emailResult.messageId,
      response: emailResult.response,
      alertId
    });

    console.log(`Emergency email sent successfully for alert ${alertId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Emergency email sent successfully",
        alertId 
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
    console.error("Error in send-emergency-email function:", error);
    
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