package com.cavehomesspain.owners;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private WebView webView;
    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        setContentView(webView);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        webView.setWebViewClient(new WebViewClient() {
            private boolean internal(WebView view, String url) {
                if (url != null && (url.startsWith("https://cavehomesspain.com/") || url.startsWith("https://www.cavehomesspain.com/"))) {
                    view.loadUrl(url);
                    return true;
                }
                return false;
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return internal(view, request.getUrl().toString());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return internal(view, url);
            }
        });
        webView.setWebChromeClient(new WebChromeClient());
        webView.loadUrl("https://cavehomesspain.com/admin.html");
    }
    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }
}
