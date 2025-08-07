package app.lovable.cbe2b28f19174504962fa4fcf0f16230;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Disable any automatic plugin registration that might access NFC
        // Register only essential plugins manually if needed
    }
}