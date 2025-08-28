import { supabase } from '@/integrations/supabase/client';
import { GeolocationService, LocationData } from './geolocation';
import { NativeSMS } from '../native/sms';

export interface Alert {
  id: string;
  user_name: string;
  emergency_number: string;
  emergency_email: string;
  start_at: string;
  end_at: string;
  interval_seconds: number;
  status: 'active' | 'stopped' | 'done';
  last_sent?: string;
  total_sent: number;
  max_sends: number;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  location_timestamp?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAlertRequest {
  emergencyNumber: string;
  emergencyEmail: string;
  location: LocationData;
}

export class AlertService {
  private static readonly EMERGENCY_NUMBER = '+212712695714';
  private static readonly EMERGENCY_EMAIL = 'mohammedelalaoui532@gmail.com';
  private static readonly STOP_CODE = 'imane15mohamed';
  private static readonly ALERT_DURATION_HOURS = 2;
  private static readonly INTERVAL_MINUTES = 5;

  static async createAlert(location: LocationData): Promise<Alert> {
    const startAt = new Date();
    const endAt = new Date(startAt.getTime() + this.ALERT_DURATION_HOURS * 60 * 60 * 1000);

    const alertData = {
      user_name: 'Imane',
      emergency_number: this.EMERGENCY_NUMBER,
      emergency_email: this.EMERGENCY_EMAIL,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      interval_seconds: this.INTERVAL_MINUTES * 60,
      status: 'active' as const,
      max_sends: 36, // 2 hours / 5 minutes
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      location_timestamp: new Date(location.timestamp).toISOString()
    };

    const { data, error } = await supabase
      .from('alerts')
      .insert(alertData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create alert: ${error.message}`);
    }

    return data as Alert;
  }

  static async sendImmediateAlert(alertId: string, location: LocationData): Promise<void> {
    const message = GeolocationService.formatLocationMessage(location);

    // Send SMS via native plugin
    try {
      const smsResult = await NativeSMS.sendSms({
        to: this.EMERGENCY_NUMBER,
        message: message
      });
      
      if (!smsResult.success) {
        console.error('SMS failed:', smsResult.error);
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
    }

    // Send email via Edge Function
    try {
      const { error } = await supabase.functions.invoke('send-emergency-email', {
        body: {
          alertId,
          to: this.EMERGENCY_EMAIL,
          subject: '🚨 ALERTE URGENCE IMANE 🚨',
          message: message.replace(/\n/g, '<br>'),
          location
        }
      });

      if (error) {
        console.error('Email failed:', error);
      }
    } catch (error) {
      console.error('Error sending email:', error);
    }

    // Schedule local SMS backup (native Android scheduling)
    try {
      console.log('Scheduling local SMS backup...');
      const alert = await this.getAlert(alertId);
      if (alert) {
        await NativeSMS.scheduleLocalSms({
          alertId,
          to: this.EMERGENCY_NUMBER,
          message,
          intervalSeconds: alert.interval_seconds,
          endAtIso: alert.end_at
        });
        console.log('Local SMS backup scheduled');
      }
    } catch (smsScheduleError) {
      console.warn('Failed to schedule local SMS backup:', smsScheduleError);
      // Don't throw - this is a backup feature
    }

    // Update alert last_sent and total_sent
    await supabase
      .from('alerts')
      .update({
        last_sent: new Date().toISOString(),
        total_sent: 1
      })
      .eq('id', alertId);
  }

  static async stopAlert(alertId: string, stopCode: string): Promise<boolean> {
    if (stopCode !== this.STOP_CODE) {
      throw new Error('Code d\'arrêt incorrect');
    }

    const { error } = await supabase
      .from('alerts')
      .update({ status: 'stopped' })
      .eq('id', alertId);

    if (error) {
      throw new Error(`Failed to stop alert: ${error.message}`);
    }

    // Cancel native SMS scheduling
    try {
      await NativeSMS.cancelScheduledSms(alertId);
    } catch (error) {
      console.error('Error cancelling native SMS:', error);
    }

    return true;
  }

  static async getActiveAlert(): Promise<Alert | null> {
    const { data, error } = await supabase
      .from('alerts')
      .select()
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching active alert:', error);
      return null;
    }

    return data as Alert | null;
  }

  static async getAlert(alertId: string): Promise<Alert | null> {
    const { data, error } = await supabase
      .from('alerts')
      .select()
      .eq('id', alertId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching alert:', error);
      return null;
    }

    return data as Alert | null;
  }

  static calculateNextSend(alert: Alert): Date | null {
    if (!alert.last_sent) return null;
    
    const lastSent = new Date(alert.last_sent);
    const nextSend = new Date(lastSent.getTime() + alert.interval_seconds * 1000);
    const endTime = new Date(alert.end_at);
    
    return nextSend <= endTime ? nextSend : null;
  }

  static getRemainingAlerts(alert: Alert): number {
    return Math.max(0, alert.max_sends - alert.total_sent);
  }
}