package app.lovable.imane_safety

import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Register the EmergencySmsPlugin
        registerPlugin(EmergencySmsPlugin::class.java)
    }
}