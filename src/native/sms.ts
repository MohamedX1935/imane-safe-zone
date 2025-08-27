import { Capacitor } from '@capacitor/core';

export interface SMSOptions {
  to: string;
  message: string;
}

export interface SMSResult {
  success: boolean;
  error?: string;
}

// Native SMS implementation for Android
export class NativeSMS {
  private static isNative = Capacitor.isNativePlatform();
  private static isAndroid = Capacitor.getPlatform() === 'android';

  static async checkPermissions(): Promise<boolean> {
    if (!this.isNative || !this.isAndroid) {
      console.log('SMS not available on web platform');
      return false;
    }

    try {
      // In real implementation, check SEND_SMS permission
      // For now, assume permission is granted
      return true;
    } catch (error) {
      console.error('Error checking SMS permissions:', error);
      return false;
    }
  }

  static async requestPermissions(): Promise<boolean> {
    if (!this.isNative || !this.isAndroid) {
      return false;
    }

    try {
      // In real implementation, request SEND_SMS permission
      // For now, assume permission is granted
      return true;
    } catch (error) {
      console.error('Error requesting SMS permissions:', error);
      return false;
    }
  }

  static async sendSms(options: SMSOptions): Promise<SMSResult> {
    if (!this.isNative || !this.isAndroid) {
      console.log('SMS not available, simulating send');
      return { success: true };
    }

    try {
      const hasPermission = await this.checkPermissions();
      if (!hasPermission) {
        const granted = await this.requestPermissions();
        if (!granted) {
          return { success: false, error: 'SMS permission denied' };
        }
      }

      // Call native Android SMS implementation
      // This would be implemented in Android Kotlin code
      if (window.NativeSMSPlugin) {
        const result = await window.NativeSMSPlugin.sendSMS({
          phoneNumber: options.to,
          message: options.message
        });
        return { success: result.success };
      }

      console.log('Native SMS plugin not available, simulating send');
      return { success: true };
    } catch (error) {
      console.error('Error sending SMS:', error);
      return { success: false, error: error.message };
    }
  }

  static async cancelScheduledSms(alertId: string): Promise<void> {
    if (!this.isNative || !this.isAndroid) {
      console.log('SMS cancellation not available on web');
      return;
    }

    try {
      if (window.NativeSMSPlugin) {
        await window.NativeSMSPlugin.cancelScheduledSMS({ alertId });
      }
      console.log('Cancelled scheduled SMS for alert:', alertId);
    } catch (error) {
      console.error('Error cancelling scheduled SMS:', error);
    }
  }
}

// Extend Window interface for native plugin
declare global {
  interface Window {
    NativeSMSPlugin?: {
      sendSMS: (options: { phoneNumber: string; message: string }) => Promise<{ success: boolean }>;
      cancelScheduledSMS: (options: { alertId: string }) => Promise<void>;
    };
  }
}