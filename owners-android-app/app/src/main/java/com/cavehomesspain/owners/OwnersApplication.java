package com.cavehomesspain.owners;

import android.app.Application;

import com.onesignal.Continue;
import com.onesignal.OneSignal;

public class OwnersApplication extends Application {
    private static final String ONESIGNAL_APP_ID = "2bc7a85b-fae2-48d4-9df6-271e781c0aab";

    @Override
    public void onCreate() {
        super.onCreate();

        OneSignal.initWithContext(this, ONESIGNAL_APP_ID);
        OneSignal.getUser().addTag("app", "cave-homes-owner");
        OneSignal.getNotifications().requestPermission(false, Continue.none());
    }
}
