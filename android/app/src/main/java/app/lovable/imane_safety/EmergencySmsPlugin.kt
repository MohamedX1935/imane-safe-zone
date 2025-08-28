package app.lovable.imane_safety

import android.Manifest
import android.content.pm.PackageManager
import android.telephony.SmsManager
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.getcapacitor.*
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "EmergencySmsPlugin")
class EmergencySmsPlugin : Plugin() {
    
    companion object {
        private const val REQUEST_SMS_PERMISSIONS = 100
    }
    
    @PluginMethod
    fun checkPermissions(call: PluginCall) {
        val hasPermissions = ContextCompat.checkSelfPermission(
            context, Manifest.permission.SEND_SMS
        ) == PackageManager.PERMISSION_GRANTED
        
        val ret = JSObject()
        ret.put("hasPermissions", hasPermissions)
        call.resolve(ret)
    }
    
    @PluginMethod
    fun requestPermissions(call: PluginCall) {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED) {
            val ret = JSObject()
            ret.put("granted", true)
            call.resolve(ret)
            return
        }
        
        // Store call for later use in permission callback
        bridge.saveCall(call)
        
        ActivityCompat.requestPermissions(
            activity,
            arrayOf(Manifest.permission.SEND_SMS),
            REQUEST_SMS_PERMISSIONS
        )
    }
    
    @PluginMethod
    fun sendSms(call: PluginCall) {
        val phoneNumber = call.getString("phoneNumber") ?: run {
            call.reject("phoneNumber is required")
            return
        }
        
        val message = call.getString("message") ?: run {
            call.reject("message is required")
            return
        }
        
        // Check permissions
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) {
            call.reject("SMS permission not granted")
            return
        }
        
        try {
            val smsManager = SmsManager.getDefault()
            
            // For long messages, divide into multiple parts
            val parts = smsManager.divideMessage(message)
            
            if (parts.size == 1) {
                smsManager.sendTextMessage(phoneNumber, null, message, null, null)
            } else {
                smsManager.sendMultipartTextMessage(phoneNumber, null, parts, null, null)
            }
            
            call.resolve()
        } catch (e: Exception) {
            call.reject("Failed to send SMS: ${e.message}")
        }
    }
    
    @PluginMethod
    fun scheduleEmergencySms(call: PluginCall) {
        val alertId = call.getString("alertId") ?: run {
            call.reject("alertId is required")
            return
        }
        
        val phoneNumber = call.getString("phoneNumber") ?: run {
            call.reject("phoneNumber is required")
            return
        }
        
        val message = call.getString("message") ?: run {
            call.reject("message is required")
            return
        }
        
        val intervalSeconds = call.getInt("intervalSeconds", 300) ?: 300
        val endAtIso = call.getString("endAtIso") ?: run {
            call.reject("endAtIso is required")
            return
        }
        
        // Check permissions
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) {
            call.reject("SMS permission not granted")
            return
        }
        
        try {
            EmergencySmsService.startService(context, alertId, phoneNumber, message, intervalSeconds, endAtIso)
            call.resolve()
        } catch (e: Exception) {
            call.reject("Failed to schedule emergency SMS: ${e.message}")
        }
    }
    
    @PluginMethod
    fun cancelScheduledSms(call: PluginCall) {
        val alertId = call.getString("alertId") ?: run {
            call.reject("alertId is required")
            return
        }
        
        try {
            EmergencySmsService.stopService(context, alertId)
            call.resolve()
        } catch (e: Exception) {
            call.reject("Failed to cancel scheduled SMS: ${e.message}")
        }
    }
    
    @PluginMethod
    fun getScheduleStatus(call: PluginCall) {
        val alertId = call.getString("alertId") ?: run {
            call.reject("alertId is required")
            return
        }
        
        // Check if service is running and has matching alert
        val prefs = context.getSharedPreferences("emergency_sms_prefs", android.content.Context.MODE_PRIVATE)
        val savedAlertId = prefs.getString("alertId", null)
        val endAtIso = prefs.getString("endAtIso", null)
        
        val ret = JSObject()
        if (savedAlertId == alertId && endAtIso != null) {
            try {
                val endTime = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US)
                    .parse(endAtIso)?.time ?: 0L
                
                val isActive = System.currentTimeMillis() < endTime
                ret.put("active", isActive)
                
                if (isActive) {
                    ret.put("nextSend", endAtIso) // Simplified - could calculate actual next send time
                }
            } catch (e: Exception) {
                ret.put("active", false)
            }
        } else {
            ret.put("active", false)
        }
        
        call.resolve(ret)
    }
    
    override fun handleOnActivityResult(requestCode: Int, resultCode: Int, data: android.content.Intent?) {
        super.handleOnActivityResult(requestCode, resultCode, data)
        
        if (requestCode == REQUEST_SMS_PERMISSIONS) {
            val call = bridge.getSavedCall()
            if (call != null) {
                val granted = ContextCompat.checkSelfPermission(
                    context, Manifest.permission.SEND_SMS
                ) == PackageManager.PERMISSION_GRANTED
                
                val ret = JSObject()
                ret.put("granted", granted)
                call.resolve(ret)
                bridge.releaseCall(call)
            }
        }
    }
}