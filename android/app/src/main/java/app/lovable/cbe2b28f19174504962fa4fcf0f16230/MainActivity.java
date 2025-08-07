package app.lovable.cbe2b28f19174504962fa4fcf0f16230;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import android.os.Bundle;
import java.util.ArrayList;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }
    
    @Override
    protected void init(Bundle savedInstanceState) {
        // Initialize bridge with no plugins to prevent automatic NFC plugin loading
        getBridge();
    }
}