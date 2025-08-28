package app.lovable.imane_safety

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.telephony.SmsManager
import android.util.Log
import androidx.core.app.NotificationCompat
import java.text.SimpleDateFormat
import java.util.*

class EmergencySmsService : Service() {
    
    companion object {
        private const val TAG = "EmergencySmsService"
        private const val CHANNEL_ID = "emergency_sms_channel"
        private const val NOTIFICATION_ID = 1001
        private const val PREFS_NAME = "emergency_sms_prefs"
        
        fun startService(context: Context, alertId: String, phoneNumber: String, message: String, intervalSeconds: Int, endAtIso: String) {
            val intent = Intent(context, EmergencySmsService::class.java).apply {
                putExtra("alertId", alertId)
                putExtra("phoneNumber", phoneNumber)
                putExtra("message", message)
                putExtra("intervalSeconds", intervalSeconds)
                putExtra("endAtIso", endAtIso)
                action = "START_EMERGENCY_SMS"
            }
            context.startForegroundService(intent)
        }
        
        fun stopService(context: Context, alertId: String) {
            val intent = Intent(context, EmergencySmsService::class.java).apply {
                putExtra("alertId", alertId)
                action = "STOP_EMERGENCY_SMS"
            }
            context.startService(intent)
        }
    }
    
    private val handler = Handler(Looper.getMainLooper())
    private var smsRunnable: Runnable? = null
    private lateinit var prefs: SharedPreferences
    private var currentAlertId: String? = null
    
    override fun onCreate() {
        super.onCreate()
        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        createNotificationChannel()
        Log.d(TAG, "EmergencySmsService created")
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            "START_EMERGENCY_SMS" -> {
                val alertId = intent.getStringExtra("alertId") ?: return START_NOT_STICKY
                val phoneNumber = intent.getStringExtra("phoneNumber") ?: return START_NOT_STICKY
                val message = intent.getStringExtra("message") ?: return START_NOT_STICKY
                val intervalSeconds = intent.getIntExtra("intervalSeconds", 300)
                val endAtIso = intent.getStringExtra("endAtIso") ?: return START_NOT_STICKY
                
                startEmergencySms(alertId, phoneNumber, message, intervalSeconds, endAtIso)
            }
            "STOP_EMERGENCY_SMS" -> {
                val alertId = intent.getStringExtra("alertId")
                stopEmergencySms(alertId)
            }
        }
        return START_STICKY
    }
    
    private fun startEmergencySms(alertId: String, phoneNumber: String, message: String, intervalSeconds: Int, endAtIso: String) {
        currentAlertId = alertId
        
        // Save alert data to SharedPreferences for persistence across reboots
        with(prefs.edit()) {
            putString("alertId", alertId)
            putString("phoneNumber", phoneNumber)
            putString("message", message)
            putInt("intervalSeconds", intervalSeconds)
            putString("endAtIso", endAtIso)
            putLong("startTime", System.currentTimeMillis())
            apply()
        }
        
        startForeground(NOTIFICATION_ID, createNotification("Emergency SMS active"))
        
        scheduleNextSms(phoneNumber, message, intervalSeconds, endAtIso)
        Log.d(TAG, "Started emergency SMS for alert: $alertId")
    }
    
    private fun scheduleNextSms(phoneNumber: String, message: String, intervalSeconds: Int, endAtIso: String) {
        // Parse end time
        val endTime = try {
            SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).parse(endAtIso)?.time ?: 0L
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing end time: $endAtIso", e)
            return
        }
        
        // Check if we should continue sending
        if (System.currentTimeMillis() >= endTime) {
            Log.d(TAG, "Emergency SMS period ended")
            stopSelf()
            return
        }
        
        smsRunnable = Runnable {
            sendSms(phoneNumber, message)
            scheduleNextSms(phoneNumber, message, intervalSeconds, endAtIso)
        }
        
        handler.postDelayed(smsRunnable!!, intervalSeconds * 1000L)
    }
    
    private fun sendSms(phoneNumber: String, message: String) {
        try {
            val smsManager = SmsManager.getDefault()
            
            // For long messages, divide into multiple parts
            val parts = smsManager.divideMessage(message)
            
            if (parts.size == 1) {
                smsManager.sendTextMessage(phoneNumber, null, message, null, null)
            } else {
                smsManager.sendMultipartTextMessage(phoneNumber, null, parts, null, null)
            }
            
            Log.d(TAG, "SMS sent to $phoneNumber")
            
            // Update notification
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.notify(NOTIFICATION_ID, createNotification("Last SMS sent: ${SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())}"))
            
        } catch (e: Exception) {
            Log.e(TAG, "Error sending SMS to $phoneNumber", e)
        }
    }
    
    private fun stopEmergencySms(alertId: String?) {
        // If specific alertId provided, only stop if it matches current alert
        if (alertId != null && alertId != currentAlertId) {
            Log.d(TAG, "Alert ID mismatch, not stopping: $alertId vs $currentAlertId")
            return
        }
        
        smsRunnable?.let { handler.removeCallbacks(it) }
        
        // Clear saved data
        with(prefs.edit()) {
            clear()
            apply()
        }
        
        currentAlertId = null
        Log.d(TAG, "Stopped emergency SMS for alert: $alertId")
        stopSelf()
    }
    
    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Emergency SMS",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Emergency SMS sending service"
            setShowBadge(false)
        }
        
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.createNotificationChannel(channel)
    }
    
    private fun createNotification(contentText: String): Notification {
        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("ImaneSafety - Emergency Active")
            .setContentText(contentText)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }
    
    override fun onBind(intent: Intent?): IBinder? = null
    
    override fun onDestroy() {
        super.onDestroy()
        smsRunnable?.let { handler.removeCallbacks(it) }
        Log.d(TAG, "EmergencySmsService destroyed")
    }
}