package app.lovable.imane_safety

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class BootReceiver : BroadcastReceiver() {
    
    companion object {
        private const val TAG = "BootReceiver"
        private const val PREFS_NAME = "emergency_sms_prefs"
    }
    
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED -> {
                Log.d(TAG, "Boot completed or package replaced")
                restoreEmergencyService(context)
            }
        }
    }
    
    private fun restoreEmergencyService(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        
        val alertId = prefs.getString("alertId", null)
        val phoneNumber = prefs.getString("phoneNumber", null)
        val message = prefs.getString("message", null)
        val intervalSeconds = prefs.getInt("intervalSeconds", 0)
        val endAtIso = prefs.getString("endAtIso", null)
        val startTime = prefs.getLong("startTime", 0)
        
        // Check if we have a valid emergency alert to restore
        if (alertId != null && phoneNumber != null && message != null && endAtIso != null && startTime > 0) {
            // Parse end time to check if alert is still valid
            try {
                val endTime = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US)
                    .parse(endAtIso)?.time ?: 0L
                
                if (System.currentTimeMillis() < endTime) {
                    Log.d(TAG, "Restoring emergency SMS service for alert: $alertId")
                    EmergencySmsService.startService(context, alertId, phoneNumber, message, intervalSeconds, endAtIso)
                } else {
                    Log.d(TAG, "Emergency alert expired, clearing saved data")
                    prefs.edit().clear().apply()
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error parsing end time, clearing saved data", e)
                prefs.edit().clear().apply()
            }
        }
    }
}