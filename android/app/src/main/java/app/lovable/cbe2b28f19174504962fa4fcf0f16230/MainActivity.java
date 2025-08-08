package app.lovable.cbe2b28f19174504962fa4fcf0f16230;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.capacitor.camera.CameraPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CameraPlugin.class);
        super.onCreate(savedInstanceState);
    }
}