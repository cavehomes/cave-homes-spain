(() => {
  const APP_ID = '2bc7a85b-fae2-48d4-9df6-271e781c0aab';
  let initialized = false;
  let sdk = null;

  function withOneSignal(callback) {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async OneSignal => {
      sdk = OneSignal;
      await callback(OneSignal);
    });
  }

  function showVerificationDialog() {
    if (document.getElementById('onesignalVerificationDialog')) return;

    const overlay = document.createElement('div');
    overlay.id = 'onesignalVerificationDialog';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'onesignalDialogTitle');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;display:grid;place-items:center;padding:20px;background:rgba(16,29,24,.72)';

    const panel = document.createElement('div');
    panel.style.cssText = 'width:min(430px,100%);padding:28px;border-radius:20px;background:#fff;color:#203129;box-shadow:0 24px 70px rgba(0,0,0,.3);font-family:system-ui,-apple-system,sans-serif';
    panel.innerHTML = '<h2 id="onesignalDialogTitle" style="margin:0 0 12px;font:700 27px/1.15 Georgia,serif">Your OneSignal SDK integration is complete!</h2><p style="margin:0 0 22px;color:#5f6c66;line-height:1.55">You can now send Push Notifications &amp; In-App Messages through OneSignal. Tap below to enable push notifications.</p><button id="onesignalDialogConfirm" type="button" style="width:100%;min-height:50px;border:0;border-radius:999px;background:#b85f3b;color:#fff;font:700 16px system-ui,-apple-system,sans-serif">Got it</button>';

    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    const button = document.getElementById('onesignalDialogConfirm');
    button.focus();
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        await sdk.Notifications.requestPermission();
      } finally {
        overlay.remove();
      }
    }, { once: true });
  }

  function observeSubscription(OneSignal) {
    const reportRegistration = () => {
      const id = OneSignal.User.PushSubscription.id;
      if (id) console.info('OneSignal push subscription registered:', id);
    };
    OneSignal.User.PushSubscription.addEventListener('change', reportRegistration);
    reportRegistration();
  }

  async function initialize() {
    if (initialized) return;
    initialized = true;
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async OneSignal => {
      sdk = OneSignal;
      await OneSignal.init({
        appId: APP_ID,
        safari_web_id: 'web.onesignal.auto.11512f5d-61af-48e1-99c6-cc09fe5cc2c2',
        notifyButton: { enable: true },
        serviceWorkerPath: 'push/onesignal/OneSignalSDKWorker.js',
        serviceWorkerParam: { scope: '/push/onesignal/' }
      });
      observeSubscription(OneSignal);
      showVerificationDialog();
    });
  }

  window.CaveHomesNotifications = {
    initialize,
    login(externalId) {
      if (externalId) withOneSignal(OneSignal => OneSignal.login(externalId));
    },
    logout() {
      withOneSignal(OneSignal => OneSignal.logout());
    },
    addEmail(email) {
      if (email) withOneSignal(OneSignal => OneSignal.User.addEmail(email));
    },
    addSms(phone) {
      if (phone) withOneSignal(OneSignal => OneSignal.User.addSms(phone));
    },
    addTag(key, value) {
      if (key && value) withOneSignal(OneSignal => OneSignal.User.addTag(key, value));
    },
    requestPermission() {
      withOneSignal(OneSignal => OneSignal.Notifications.requestPermission());
    }
  };

  initialize().catch(error => console.error('OneSignal initialization failed:', error));
})();
