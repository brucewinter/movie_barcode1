package app.lovable.cbe2b28f19174504962fa4fcf0f16230;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;

public class MainActivity extends Activity {
    private WebView webView;
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Create a simple WebView to load the Capacitor app
        webView = new WebView(this);
        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setAllowFileAccessFromFileURLs(true);
        webSettings.setAllowUniversalAccessFromFileURLs(true);
        
        webView.setWebViewClient(new WebViewClient());
        setContentView(webView);
        
        // Load the app from the Lovable preview URL since we can't load local files easily
        webView.loadUrl("https://cbe2b28f-1917-4504-962f-a4fcf0f16230.lovableproject.com?forceHideBadge=true");
    }
    
    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}