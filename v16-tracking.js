(function(){
  'use strict';
  const allowed=new Set(['property_view','property_enquiry_start','property_enquiry_submitted','buyer_request_submitted','renovation_compare']);
  const seen=new Set();
  window.chsWebsiteEvent=function(eventName,details={}){
    if(!allowed.has(eventName)||['/admin.html','/property-care-staff.html'].includes(location.pathname))return;
    try{
      if(localStorage.getItem('caveHomesAnalyticsConsent')!=='accepted')return;
      const id=/^[a-f0-9-]{36}$/i.test(details.property_id||'')?details.property_id:null;
      const path=id?'/property/'+id:location.pathname;
      const key=eventName+':'+path;
      const startKey='chsEnquiryStart:'+path;if(eventName==='property_enquiry_start'&&Date.now()-Number(sessionStorage.getItem(startKey)||0)<300000)return;
      if(['property_view','property_enquiry_start','renovation_compare'].includes(eventName)&&seen.has(key))return;
      let session=sessionStorage.getItem('chsWebsiteSession');
      if(!session){session=crypto.randomUUID();sessionStorage.setItem('chsWebsiteSession',session)}
      let referrer=null;try{referrer=document.referrer?new URL(document.referrer).hostname:null}catch(_){}
      const width=window.innerWidth||screen.width;
      const payload={event_name:eventName,session_id:session,page_path:path.slice(0,180),page_title:String(details.property_title||document.title).slice(0,160),device_type:width<600?'mobile':width<1000?'tablet':'desktop',referrer_host:referrer?referrer.slice(0,120):null};
      seen.add(key);if(eventName==='property_enquiry_start')sessionStorage.setItem(startKey,String(Date.now()));
      fetch('https://lesgzlhvrlxgtfuocadq.supabase.co/rest/v1/website_events',{method:'POST',headers:{apikey:'sb_publishable_pPS6fORJPGFcGBIUPcxOxQ_1g4vazyg','Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(payload),keepalive:true}).then(r=>{if(!r.ok)seen.delete(key)}).catch(()=>seen.delete(key));
    }catch(_){}
  };
})();
