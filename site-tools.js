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
  window.chsTrackLead=function(parameters){if(enable()){const details=parameters||{};window.gtag('event','generate_lead',details);window.gtag('event','enquiry_submitted',details)}};
  if(hasConsent())enable();
  document.addEventListener('click',event=>{
    const link=event.target.closest('a,button');if(!link)return;
    const href=link.getAttribute('href')||'';
    if(href.includes('Cave-Homes-Spain.apk')){const details={file_name:'Cave-Homes-Spain.apk',link_url:href,link_location:link.closest('.advertise-options')?'advertise_menu':'floating_button'};window.chsTrack('file_download',details);window.chsTrack('android_app_download',details)}
    else if(href.startsWith('mailto:'))window.chsTrack('contact_click',{contact_method:'email',page_path:location.pathname});
    else if(href.startsWith('tel:'))window.chsTrack('contact_click',{contact_method:'telephone',page_path:location.pathname});
    if(href.includes('service=estate-agent'))window.chsTrack('estate_agent_enquiry_start',{page_path:location.pathname});
    if(href.includes('list-your-property.html'))window.chsTrack('property_listing_start',{page_path:location.pathname});
    if(href.includes('advertise-holiday-stay.html')||link.id==='menuAdvertiseRental'||link.id==='v14AdvertiseRental'||link.id==='showForm')window.chsTrack('holiday_rental_submission_start',{page_path:location.pathname});
  });
})();

/* Lightweight live weather for village guides. Loaded only on recognised guide pages. */
(function(){
  const places={
    'news-and-advice.html':['Baza',37.4907,-2.7726],
    'baza.html':['Baza',37.4907,-2.7726],'benamaurel.html':['Benamaurel',37.6086,-2.7027],
    'caniles.html':['Caniles',37.4367,-2.7248],'castillejar.html':['Castilléjar',37.7167,-2.6333],
    'castril.html':['Castril',37.7958,-2.7804],'cortes-de-baza.html':['Cortes de Baza',37.6556,-2.7717],
    'cuevas-de-luna.html':['Cuevas de Luna',37.626,-2.718],'cuevas-del-campo.html':['Cuevas del Campo',37.6077,-2.9292],
    'cullar.html':['Cúllar',37.5832,-2.5761],'freila.html':['Freila',37.5295,-2.9087],
    'galera.html':['Galera',37.7425,-2.5513],'guadix.html':['Guadix',37.2993,-3.1392],
    'huescar.html':['Huéscar',37.8110,-2.5412],'orce.html':['Orce',37.7212,-2.4775],
    'zujar.html':['Zújar',37.5423,-2.8411],'san-marcos.html':['San Marcos',37.62,-2.71],
    'huerta-real.html':['Huerta Real',37.64,-2.73]
  };
  const file=location.pathname.split('/').pop()||'index.html',place=places[file];
  if(!place)return;
  const hero=document.querySelector('main .hero, main section.hero');
  if(!hero)return;
  const style=document.createElement('style');
  style.textContent='.chs-weather{display:grid;grid-template-columns:1fr auto;align-items:center;gap:18px;margin:0 0 24px;padding:18px 20px;border:1px solid #d7cdbf;border-radius:16px;background:#fff;box-shadow:0 8px 24px rgba(31,48,40,.07)}.chs-weather small,.chs-weather strong{display:block}.chs-weather small{color:#5f6963;font-weight:700}.chs-weather strong{font:700 1.25rem Georgia,serif;color:#214b3a}.chs-weather-now{font-size:1.45rem;font-weight:900;color:#ad5535;text-align:right}.chs-weather-now small{font-size:.76rem;font-weight:700}@media(max-width:480px){.chs-weather{grid-template-columns:1fr}.chs-weather-now{text-align:left}}';
  document.head.appendChild(style);
  const box=document.createElement('aside');box.className='chs-weather';box.setAttribute('aria-live','polite');
  box.innerHTML='<div><small>LOCAL WEATHER</small><strong>'+place[0]+' today</strong></div><div class="chs-weather-now">Loading…</div>';
  hero.insertAdjacentElement('afterend',box);
  const code={0:'Clear',1:'Mainly clear',2:'Partly cloudy',3:'Cloudy',45:'Fog',48:'Fog',51:'Light drizzle',53:'Drizzle',55:'Heavy drizzle',61:'Light rain',63:'Rain',65:'Heavy rain',71:'Light snow',73:'Snow',75:'Heavy snow',80:'Rain showers',81:'Rain showers',82:'Heavy showers',95:'Thunderstorms'};
  fetch('https://api.open-meteo.com/v1/forecast?latitude='+place[1]+'&longitude='+place[2]+'&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=Europe%2FMadrid&forecast_days=1')
    .then(r=>{if(!r.ok)throw new Error();return r.json()}).then(data=>{const current=data.current||{},daily=data.daily||{},temp=Math.round(current.temperature_2m),high=Math.round((daily.temperature_2m_max||[])[0]),low=Math.round((daily.temperature_2m_min||[])[0]),condition=code[current.weather_code]||'Current conditions';box.querySelector('.chs-weather-now').innerHTML=temp+'°C <small>'+condition+' · High '+high+'° · Low '+low+'°</small>'})
    .catch(()=>{box.querySelector('.chs-weather-now').innerHTML='<small>Forecast temporarily unavailable</small>'});
})();
