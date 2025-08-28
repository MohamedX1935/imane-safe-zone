import { Capacitor } from '@capacitor/core';

export interface SMSOptions {
  to: string;
  message: string;
}

export interface SMSResult {
  success: boolean;
  error?: string;
}

export interface ScheduleSMSOptions {
  alertId: string;
  to: string;
  message: string;
  intervalSeconds: number;
  endAtIso: string;
}

/**
 * Native SMS implementation for Android using Capacitor SMS plugin
 * Provides real SMS functionality with permissions, scheduling, and cancellation
 */
export class NativeSMS {
  private static isNative = Capacitor.isNativePlatform();
  private static isAndroid = Capacitor.getPlatform() === 'android';

  /**
   * Check if SMS permissions are granted
   */
  static async checkSmsPermissions(): Promise<boolean> {
    if (!this.isNative || !this.isAndroid) {
      console.log('SMS permissions not available on web platform');
      return false;
    }

    try {
      // For @byteowls/capacitor-sms, we need to check Android permissions directly
      if (window.EmergencySmsPlugin) {
        const result = await window.EmergencySmsPlugin.checkPermissions();
        return result.hasPermissions;
      }
      
      // Fallback: assume no permissions if plugin not available
      return false;
    } catch (error) {
      console.error('Error checking SMS permissions:', error);
      return false;
    }
  }

  /**
   * Request SMS permissions from user
   */
  static async requestSmsPermissions(): Promise<boolean> {
    if (!this.isNative || !this.isAndroid) {
      console.log('SMS permissions request not available on web platform');
      return false;
    }

    try {
      if (window.EmergencySmsPlugin) {
        const result = await window.EmergencySmsPlugin.requestPermissions();
        return result.granted;
      }
      
      // Fallback: try to use Capacitor SMS plugin permission request
      const hasPermission = await this.checkSmsPermissions();
      return hasPermission;
    } catch (error) {
      console.error('Error requesting SMS permissions:', error);
      return false;
    }
  }

  /**
   * Send a single SMS message
   */
  static async sendSms(options: SMSOptions): Promise<SMSResult> {
    if (!this.isNative || !this.isAndroid) {
      console.log('SMS not available on web, simulating send');
      return { success: true };
    }

    try {
      // Check permissions first
      const hasPermission = await this.checkSmsPermissions();
      if (!hasPermission) {
        const granted = await this.requestSmsPermissions();
        if (!granted) {
          return { success: false, error: 'SMS permission denied by user' };
        }
      }

      // Use @byteowls/capacitor-sms plugin via native bridge
      if (window.EmergencySmsPlugin) {
        // Use our custom plugin for better integration
        await window.EmergencySmsPlugin.sendSms({
          phoneNumber: options.to,
          message: options.message
        });
      } else {
        // Fallback to direct SMS manager if available
        throw new Error('SMS plugin not available');
      }

      console.log('SMS sent successfully to:', options.to);
      return { success: true };

    } catch (error: any) {
      console.error('Error sending SMS:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to send SMS' 
      };
    }
  }

  /**
   * Schedule periodic SMS sending using native Android WorkManager
   */
  static async scheduleLocalSms(options: ScheduleSMSOptions): Promise<void> {
    if (!this.isNative || !this.isAndroid) {
      console.log('SMS scheduling not available on web platform');
      return;
    }

    try {
      // Check permissions first
      const hasPermission = await this.checkSmsPermissions();
      if (!hasPermission) {
        throw new Error('SMS permissions required for scheduling');
      }

      if (window.EmergencySmsPlugin) {
        await window.EmergencySmsPlugin.scheduleEmergencySms({
          alertId: options.alertId,
          phoneNumber: options.to,
          message: options.message,
          intervalSeconds: options.intervalSeconds,
          endAtIso: options.endAtIso
        });
        
        console.log('Emergency SMS scheduled for alert:', options.alertId);
      } else {
        throw new Error('Emergency SMS plugin not available');
      }
    } catch (error: any) {
      console.error('Error scheduling SMS:', error);
      throw error;
    }
  }

  /**
   * Cancel scheduled SMS by alert ID
   */
  static async cancelScheduledSms(alertId: string): Promise<void> {
    if (!this.isNative || !this.isAndroid) {
      console.log('SMS cancellation not available on web platform');
      return;
    }

    try {
      if (window.EmergencySmsPlugin) {
        await window.EmergencySmsPlugin.cancelScheduledSms({ alertId });
        console.log('Cancelled scheduled SMS for alert:', alertId);
      } else {
        console.warn('Emergency SMS plugin not available for cancellation');
      }
    } catch (error) {
      console.error('Error cancelling scheduled SMS:', error);
      throw error;
    }
  }

  /**
   * Get status of scheduled SMS
   */
  static async getScheduledSmsStatus(alertId: string): Promise<{ active: boolean; nextSend?: string }> {
    if (!this.isNative || !this.isAndroid) {
      return { active: false };
    }

    try {
      if (window.EmergencySmsPlugin) {
        const result = await window.EmergencySmsPlugin.getScheduleStatus({ alertId });
        return result;
      }
      return { active: false };
    } catch (error) {
      console.error('Error getting SMS schedule status:', error);
      return { active: false };
    }
  }
}

// Type definitions for native Android plugin
declare global {
  interface Window {
    EmergencySmsPlugin?: {
      checkPermissions: () => Promise<{ hasPermissions: boolean }>;
      requestPermissions: () => Promise<{ granted: boolean }>;
      scheduleEmergencySms: (options: {
        alertId: string;
        phoneNumber: string;
        message: string;
        intervalSeconds: number;
        endAtIso: string;
      }) => Promise<void>;
      cancelScheduledSms: (options: { alertId: string }) => Promise<void>;
      getScheduleStatus: (options: { alertId: string }) => Promise<{ active: boolean; nextSend?: string }>;
      sendSms: (options: { phoneNumber: string; message: string }) => Promise<void>;
    };
  }
}

// Export convenience functions
export const checkSmsPermissions = NativeSMS.checkSmsPermissions;
export const requestSmsPermissions = NativeSMS.requestSmsPermissions;
export const sendSms = NativeSMS.sendSms;
export const scheduleLocalSms = NativeSMS.scheduleLocalSms;
export const cancelScheduledSms = NativeSMS.cancelScheduledSms;
export const getScheduledSmsStatus = NativeSMS.getScheduledSmsStatus;