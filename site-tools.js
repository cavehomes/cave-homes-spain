(function(){
  const measurementId='G-E1EN0E3688';
  const hasConsent=()=>localStorage.getItem('caveHomesAnalyticsConsent')==='accepted';
  function enable(){
    if(!hasConsent())return false;
    if(typeof window.enableAnalytics==='function'){window.enableAnalytics();return true;}
    window.dataLayer=window.dataLayer||[];
    window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};
    if(!window.__analyticsLoaded){
      window.__analyticsLoaded=true;
      const script=document.createElement('script');
      script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+measurementId;
      document.head.appendChild(script);window.gtag('js',new Date());window.gtag('config',measurementId);
    }
    return true;
  }
  window.chsTrack=function(eventName,parameters){if(enable())window.gtag('event',eventName,parameters||{})};
  if(hasConsent())enable();
  document.addEventListener('click',event=>{
    const link=event.target.closest('a,button');if(!link)return;
    const href=link.getAttribute('href')||'';
    if(href.includes('Cave-Homes-Spain.apk'))window.chsTrack('android_app_download',{link_url:href,link_location:link.closest('.advertise-options')?'advertise_menu':'floating_button'});
    else if(href.startsWith('mailto:'))window.chsTrack('contact_click',{contact_method:'email',page_path:location.pathname});
    else if(href.startsWith('tel:'))window.chsTrack('contact_click',{contact_method:'telephone',page_path:location.pathname});
    if(href.includes('service=estate-agent'))window.chsTrack('estate_agent_enquiry_start',{page_path:location.pathname});
    if(href.includes('list-your-property.html'))window.chsTrack('property_listing_start',{page_path:location.pathname});
    if(href.includes('advertise-holiday-stay.html')||link.id==='menuAdvertiseRental'||link.id==='v14AdvertiseRental'||link.id==='showForm')window.chsTrack('holiday_rental_submission_start',{page_path:location.pathname});
    if(link.id==='modalEnquire'||link.id==='stickyEnquire')window.chsTrack('property_enquiry_start',{property_title:(window.activeHome&&window.activeHome.title)||document.getElementById('modalTitle')?.textContent||'Property'});
  });
})();
