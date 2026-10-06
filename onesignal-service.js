(() => {
  'use strict';
  const APP_ID='2bc7a85b-fae2-48d4-9df6-271e781c0aab';
  let sdk=null,ready=false,failed=false,ownerId=null,identity=Promise.resolve(),setupError='';
  const isWebView=/; wv\)|\bwv\b/.test(navigator.userAgent);
  function render(){
    const home=document.getElementById('homeView');if(!home)return;
    let panel=document.getElementById('ownerNotifications');
    if(!panel){panel=document.createElement('section');panel.id='ownerNotifications';panel.className='card';panel.style.cssText='margin-top:16px;padding:18px;border:1px solid #ded8cd';panel.innerHTML='<h3 style="margin:0 0 8px">Phone notifications</h3><p id="ownerNotificationStatus" role="status" aria-live="polite"></p><button class="btn" type="button" id="enableOwnerNotifications">Enable notifications</button><p id="ownerNotificationHelp" style="margin-bottom:0;font-size:.9rem"></p>';home.appendChild(panel);document.getElementById('enableOwnerNotifications').onclick=enable;}
    const status=document.getElementById('ownerNotificationStatus'),button=document.getElementById('enableOwnerNotifications'),help=document.getElementById('ownerNotificationHelp');
    const blocked=typeof Notification!=='undefined'&&Notification.permission==='denied';
    const subscribed=ready&&sdk.Notifications.permission&&sdk.User.PushSubscription.optedIn&&sdk.User.PushSubscription.id;
    button.hidden=!!subscribed||isWebView;button.disabled=!ready||blocked;
    if(isWebView){status.textContent='This downloaded app uses Android notification settings.';help.textContent='On your phone, open Settings → Apps → Cave Homes Spain Owners → Notifications and allow notifications. For browser alerts, open cavehomesspain.com/admin.html in Chrome and enable notifications there.';}
    else if(subscribed){status.textContent='Notifications enabled on this device.';help.textContent='New enquiries can alert you while the Owners app is closed. Delivery also depends on your phone and browser notification settings.';}
    else if(blocked){status.textContent='Notifications are blocked on this device.';help.textContent='In Chrome, open this site’s permissions and allow Notifications, then reopen the Owners app. Also check Settings → Apps → Chrome → Notifications on your phone.';}
    else if(failed){const wrongDomain=setupError.includes('Can only be used on:');status.textContent=wrongDomain?'Notification service is configured for the old website address.':'Notification setup could not connect.';help.textContent=wrongDomain?'The OneSignal website setting must be corrected to https://cavehomesspain.com. Your phone permission is not the cause, and enquiries are still saved in the inbox.':'Open the Owners app in Chrome, check your connection and reload. Your enquiries are still saved in the inbox.';}
    else if(!ready){status.textContent='Checking notification registration…';help.textContent='If this stays here, open the Owners app in Chrome and reload.';}
    else{status.textContent='This device is not subscribed to enquiry alerts.';help.textContent='Tap Enable notifications, then choose Allow when your phone asks. Keep Chrome notifications enabled in your phone settings.';}
    if(ready&&!sdk.Notifications.isPushSupported()){button.hidden=true;status.textContent='This browser does not support push notifications.';help.textContent='Open cavehomesspain.com/admin.html in Chrome on your Android phone to enable enquiry alerts.';}
  }
  async function enable(){
    if(!ready)return render();
    const button=document.getElementById('enableOwnerNotifications');button.disabled=true;
    try{await sdk.Notifications.requestPermission();if(sdk.Notifications.permission){await sdk.User.PushSubscription.optIn();await identity;await sdk.User.addTag('app','cave-homes-owner');}}
    catch(_){failed=true;}finally{render();}
  }
  function withSdk(callback){window.OneSignalDeferred=window.OneSignalDeferred||[];window.OneSignalDeferred.push(async OneSignal=>{try{await initialized;await callback(OneSignal);render();}catch(error){failed=true;console.error('Owners notification registration:',String(error?.message||error));render();}});}
  let resolveReady;const initialized=new Promise(resolve=>resolveReady=resolve);
  window.CaveHomesNotifications={
    initialize(){return initialized},
    login(id){if(!id)return;ownerId=id;withSdk(async OneSignal=>{identity=(async()=>{await OneSignal.login(id);await OneSignal.User.addTag('app','cave-homes-owner')})();await identity;});},
    logout(){ownerId=null;withSdk(OneSignal=>OneSignal.logout());},
    addEmail(email){if(email)withSdk(async OneSignal=>{await identity;await OneSignal.User.addEmail(email)});},
    addSms(phone){if(phone)withSdk(async OneSignal=>{await identity;await OneSignal.User.addSms(phone)});},
    addTag(key,value){if(key&&value)withSdk(async OneSignal=>{await identity;await OneSignal.User.addTag(key,value)});},
    requestPermission:enable
  };
  window.OneSignalDeferred=window.OneSignalDeferred||[];
  window.OneSignalDeferred.push(async OneSignal=>{
    sdk=OneSignal;
    try{
      await OneSignal.init({appId:APP_ID,safari_web_id:'web.onesignal.auto.11512f5d-61af-48e1-99c6-cc09fe5cc2c2',notifyButton:{enable:false},autoResubscribe:true,serviceWorkerPath:'push/onesignal/OneSignalSDKWorker.js',serviceWorkerParam:{scope:'/push/onesignal/'}});
      ready=true;resolveReady();
      OneSignal.User.PushSubscription.addEventListener('change',()=>{if(ownerId)OneSignal.User.addTag('app','cave-homes-owner').catch(()=>{});render()});
      OneSignal.Notifications.addEventListener('permissionChange',render);
    }catch(error){failed=true;setupError=String(error?.message||error);console.error('Owners notification initialization:',setupError);resolveReady();}
    render();
  });
  const observer=new MutationObserver(()=>{if(document.getElementById('homeView')&&!document.getElementById('ownerNotifications'))render()});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',render);
})();
