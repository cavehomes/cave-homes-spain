/* Shared features initialise once even if a page includes this script twice. */
(function(){
  if(window.__chsSiteToolsLoaded)return;
  window.__chsSiteToolsLoaded=true;
/* Load the shared translation engine wherever the common site tools are loaded. */
(function(){
  if(document.querySelector('script[src="/site-i18n.js"]'))return;
  const script=document.createElement('script');
  script.src='/site-i18n.js?v=20261014-language-fix';
  script.defer=true;
  document.head.appendChild(script);
})();

(function(){
  const measurementId='G-E1EN0E3688';
  const hasConsent=()=>localStorage.getItem('caveHomesAnalyticsConsent')==='accepted';
  function recordWebsitePageView(){
    if(window.__websitePageViewRecorded||location.pathname==='/admin.html'||location.pathname==='/property-care-staff.html')return;
    window.__websitePageViewRecorded=true;
    let sessionId=sessionStorage.getItem('chsWebsiteSession');
    if(!sessionId){sessionId=crypto.randomUUID();sessionStorage.setItem('chsWebsiteSession',sessionId)}
    let referrerHost=null;
    try{referrerHost=document.referrer?new URL(document.referrer).hostname:null}catch(_){}
    const width=Math.max(window.innerWidth||0,screen.width||0);
    const deviceType=width<600?'mobile':width<1000?'tablet':'desktop';
    fetch('https://lesgzlhvrlxgtfuocadq.supabase.co/rest/v1/website_events',{
      method:'POST',
      headers:{
        apikey:'sb_publishable_pPS6fORJPGFcGBIUPcxOxQ_1g4vazyg',
        'Content-Type':'application/json',
        Prefer:'return=minimal'
      },
      body:JSON.stringify({
        event_name:'page_view',
        session_id:sessionId,
        page_path:location.pathname.slice(0,180),
        page_title:document.title.slice(0,160)||null,
        device_type:deviceType,
        referrer_host:referrerHost?referrerHost.slice(0,120):null
      }),
      keepalive:true
    }).catch(()=>{});
  }
  function enable(){
    if(!hasConsent())return false;
    if(typeof window.enableAnalytics==='function')window.enableAnalytics();
    else{
      window.dataLayer=window.dataLayer||[];
      window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};
      if(!window.__analyticsLoaded){
        window.__analyticsLoaded=true;
        const script=document.createElement('script');
        script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+measurementId;
        document.head.appendChild(script);window.gtag('js',new Date());window.gtag('config',measurementId);
      }
    }
    recordWebsitePageView();
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
  if(!hero||document.querySelector('.chs-weather'))return;
  const style=document.createElement('style');
  style.textContent='.chs-weather{display:grid;grid-template-columns:1fr auto;align-items:center;gap:18px;margin:0 0 24px;padding:18px 20px;border:1px solid #d7cdbf;border-radius:16px;background:#fff;box-shadow:0 8px 24px rgba(31,48,40,.07)}.chs-weather small,.chs-weather strong{display:block}.chs-weather small{color:#5f6963;font-weight:700}.chs-weather strong{font:700 1.25rem Georgia,serif;color:#214b3a}.chs-weather-now{font-size:1.45rem;font-weight:900;color:#ad5535;text-align:right}.chs-weather-now small{font-size:.76rem;font-weight:700}@media(max-width:480px){.chs-weather{grid-template-columns:1fr}.chs-weather-now{text-align:left}}';
  document.head.appendChild(style);
  const box=document.createElement('aside');box.className='chs-weather';box.setAttribute('aria-live','polite');box.setAttribute('aria-label','Current weather in '+place[0]);
  box.innerHTML='<div><small>LOCAL WEATHER</small><strong>'+place[0]+' today</strong></div><div class="chs-weather-now">Loading…</div>';
  hero.insertAdjacentElement('afterend',box);
  const code={0:'Clear',1:'Mainly clear',2:'Partly cloudy',3:'Cloudy',45:'Fog',48:'Fog',51:'Light drizzle',53:'Drizzle',55:'Heavy drizzle',61:'Light rain',63:'Rain',65:'Heavy rain',71:'Light snow',73:'Snow',75:'Heavy snow',80:'Rain showers',81:'Rain showers',82:'Heavy showers',95:'Thunderstorms'};
  fetch('https://api.open-meteo.com/v1/forecast?latitude='+place[1]+'&longitude='+place[2]+'&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=Europe%2FMadrid&forecast_days=1')
    .then(r=>{if(!r.ok)throw new Error();return r.json()}).then(data=>{const current=data.current||{},daily=data.daily||{},temp=Math.round(current.temperature_2m),high=Math.round((daily.temperature_2m_max||[])[0]),low=Math.round((daily.temperature_2m_min||[])[0]),condition=code[current.weather_code]||'Current conditions';box.querySelector('.chs-weather-now').innerHTML=temp+'°C <small>'+condition+' · High '+high+'° · Low '+low+'°</small>'})
    .catch(()=>{box.querySelector('.chs-weather-now').innerHTML='<small>Forecast temporarily unavailable</small>'});
})();


/* Compact homepage weather. Loads after the main content and caches for 30 minutes. */
(function(){
  const file=location.pathname.split('/').pop()||'index.html';
  if(file!=='index.html')return;
  const hero=document.querySelector('main .hero');
  if(!hero)return;
  const style=document.createElement('style');
  style.textContent='.chs-home-weather{order:2;display:flex;align-items:center;justify-content:center;gap:9px;width:min(720px,calc(100% - 28px));min-height:46px;margin:12px auto;padding:10px 16px;border:1px solid #d7cdbf;border-radius:999px;background:#fff;color:#214b3a;box-shadow:0 5px 16px rgba(31,48,40,.07);font-size:.94rem}.chs-home-weather strong{font-family:Georgia,serif}.chs-home-weather-icon{display:grid;place-items:center;flex:0 0 34px;width:34px;height:34px;border-radius:50%;background:#fff0c2;font-size:1.25rem;line-height:1;visibility:visible;opacity:1}.chs-home-weather-temp{color:#ad5535;font-size:1.08rem;font-weight:900}.chs-home-weather-detail{color:#5f6963;font-weight:700}@media(max-width:560px){.chs-home-weather{display:grid;grid-template-columns:auto auto auto;grid-template-areas:"icon title temp" "detail detail detail";justify-content:center;column-gap:7px;row-gap:3px;width:calc(100% - 56px);min-height:58px;margin:14px auto 22px;padding:9px 14px;border-radius:16px;white-space:normal;font-size:.86rem}.chs-home-weather-icon{grid-area:icon;width:30px;height:30px;flex-basis:30px;font-size:1.1rem}.chs-home-weather strong{grid-area:title;white-space:nowrap}.chs-home-weather-temp{grid-area:temp;font-size:1rem;white-space:nowrap}.chs-home-weather-detail{grid-area:detail;min-width:0;text-align:center;white-space:nowrap;font-size:.75rem;line-height:1.2}#propertySearch{display:none!important}}';
  document.head.appendChild(style);
  const bar=document.createElement('aside');
  bar.className='chs-home-weather';
  bar.setAttribute('aria-label','Current weather in Baza');
  bar.innerHTML='<span class="chs-home-weather-icon" aria-hidden="true">☀️</span><strong>Baza today</strong><span class="chs-home-weather-temp">Loading…</span><span class="chs-home-weather-detail"></span>';
  hero.insertAdjacentElement('afterend',bar);
  const conditions={0:'Clear',1:'Mainly clear',2:'Partly cloudy',3:'Cloudy',45:'Fog',48:'Fog',51:'Light drizzle',53:'Drizzle',55:'Heavy drizzle',61:'Light rain',63:'Rain',65:'Heavy rain',71:'Light snow',73:'Snow',75:'Heavy snow',80:'Rain showers',81:'Rain showers',82:'Heavy showers',95:'Thunderstorms'};
  const render=data=>{
    const current=data.current||{},daily=data.daily||{};
    bar.querySelector('.chs-home-weather-temp').textContent=Math.round(current.temperature_2m)+'°C';
    const condition=conditions[current.weather_code]||'Current conditions',high=Math.round((daily.temperature_2m_max||[])[0]),low=Math.round((daily.temperature_2m_min||[])[0]);
    bar.querySelector('.chs-home-weather-detail').textContent=window.matchMedia('(max-width:560px)').matches?condition+' · '+high+'° / '+low+'°':condition+' · High '+high+'° · Low '+low+'°';
  };
  const start=()=>{
    try{
      const cached=JSON.parse(sessionStorage.getItem('chsBazaWeatherV1')||'null');
      if(cached&&Date.now()-cached.saved<1800000){render(cached.data);return}
    }catch(_){}
    fetch('https://api.open-meteo.com/v1/forecast?latitude=37.4907&longitude=-2.7726&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=Europe%2FMadrid&forecast_days=1')
      .then(response=>{if(!response.ok)throw new Error();return response.json()})
      .then(data=>{try{sessionStorage.setItem('chsBazaWeatherV1',JSON.stringify({saved:Date.now(),data}))}catch(_){}render(data)})
      .catch(()=>{bar.querySelector('.chs-home-weather-temp').textContent='—';bar.querySelector('.chs-home-weather-detail').textContent='Forecast unavailable'});
  };
  if('requestIdleCallback' in window)requestIdleCallback(start,{timeout:1800});else setTimeout(start,300);
})();
/* Optional full-page Google translation for editorial pages; no API key required. */
(function(){
 if(document.getElementById('chs-automatic-translate'))return;
 function init(){
  if(document.getElementById('chs-automatic-translate'))return;
  var bar=document.createElement('div');bar.id='chs-automatic-translate';
  bar.style.cssText='display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:10px 18px;background:#fffaf2;border-bottom:1px solid #ded8cd;color:#253c31;font:14px Arial,sans-serif';
  var label=document.createElement('label');label.textContent='Translate this page';label.htmlFor='chs-translate-language';
  var select=document.createElement('select');select.id='chs-translate-language';select.setAttribute('aria-label','Translate the whole page');select.style.cssText='min-width:0;max-width:100%;flex:1 1 150px;padding:8px 10px;border:1px solid #9baba0;border-radius:8px;background:white;color:#253c31';
  [['','Choose language'],['en','English'],['es','Español'],['de','Deutsch'],['fr','Français'],['nl','Nederlands']].forEach(function(item){var opt=document.createElement('option');opt.value=item[0];opt.textContent=item[1];select.appendChild(opt)});
  select.addEventListener('change',function(){var lang=select.value;if(!lang)return;var url=new URL(location.href);url.searchParams.delete('lang');if(lang==='en'){location.href=url.href;return}location.href='https://translate.google.com/translate?sl=en&tl='+encodeURIComponent(lang)+'&u='+encodeURIComponent(url.href)});
  bar.appendChild(label);bar.appendChild(select);var header=document.querySelector('header');if(header)header.insertAdjacentElement('afterend',bar);else document.body.insertBefore(bar,document.body.firstChild);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

/* Shared Explore drawer for secondary public pages. Homepage retains its original drawer. */
(function(){
 if(location.pathname==='/'||location.pathname==='/index.html'||/\/(admin|owners)(\.html|\/|$)/i.test(location.pathname))return;
 function init(){
  if(document.getElementById('chs-shared-explore'))return;
  var css=document.createElement('style');
  css.textContent='#chs-explore-trigger{position:static;flex:0 0 auto;margin-left:auto;display:flex;align-items:center;gap:8px;border:1px solid #d4d9d0;border-radius:30px;background:#244a3a;color:white;padding:10px 15px;font:700 14px Arial,sans-serif;box-shadow:0 4px 16px #0002}#chs-explore-shade{display:none;position:fixed;inset:0;background:#0e1b15a8;z-index:10003}#chs-explore-shade.open{display:block}#chs-shared-explore{position:fixed;top:0;bottom:0;right:0;width:min(88vw,390px);z-index:10004;background:#fffaf2;transform:translateX(110%);transition:transform .2s ease;box-shadow:-12px 0 30px #0002;overflow:auto}#chs-shared-explore.open{transform:translateX(0)}#chs-shared-explore .chs-drawer-head{background:#204637;color:white;padding:30px 24px 24px;display:flex;justify-content:space-between;align-items:center}#chs-shared-explore .chs-drawer-head small{display:block;color:#e9c8a9;letter-spacing:.14em;font-weight:800}#chs-shared-explore .chs-drawer-head strong{display:block;font:700 26px Georgia,serif;margin-top:9px}#chs-shared-explore .chs-close{background:#ffffff15;color:white;border:1px solid #ffffff80;border-radius:50%;width:54px;height:54px;font-size:34px}#chs-shared-explore .chs-links{padding:22px 18px 60px}#chs-shared-explore .chs-links a{display:flex;align-items:center;gap:15px;padding:15px 12px;color:#234436;text-decoration:none;font:700 16px Arial,sans-serif;border-radius:10px}#chs-shared-explore .chs-links a:focus-visible,#chs-shared-explore .chs-links a:hover{background:#e8eee7}#chs-shared-explore .chs-links a span{display:grid;place-items:center;background:#e7ede7;width:42px;height:42px;border-radius:12px;flex:none}#chs-shared-explore .chs-links a b{margin-left:auto;color:#b65e3d}@media(max-width:560px){#chs-automatic-translate>label{flex-basis:100%}#chs-translate-language{flex:1 1 130px}}';
  document.head.appendChild(css);
  var trigger=document.createElement('button');trigger.id='chs-explore-trigger';trigger.type='button';trigger.textContent='☰ Explore';trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls','chs-shared-explore');
  var shade=document.createElement('div');shade.id='chs-explore-shade';
  var drawer=document.createElement('nav');drawer.id='chs-shared-explore';drawer.setAttribute('aria-label','Explore Cave Homes Spain');drawer.innerHTML='<div class="chs-drawer-head"><div><small>EXPLORE</small><strong>Cave Homes Spain</strong></div><button class="chs-close" type="button" aria-label="Close menu">×</button></div><div class="chs-links"></div>';
  var links=[['🔎','Property Search','/property-search.html'],['🤝','Tell us what you’re looking for','/tell-us-what-you-are-looking-for.html'],['🔑','Sell','/list-your-property.html'],['🔑','Property Management','/property-management.html'],['🛡️','Property Watch & Care','/property-watch.html'],['🤝','Viewing & Local Support','/buyer-assistance.html'],['🏡','Holiday Rentals','/holiday-stays.html'],['🗺️','Village Guides','/property-guides.html'],['📰','News & Advice','/news-and-advice.html'],['📝','Blog','/blog.html'],['🛠️','Need Help Renovating a Cave?','/cave-renovations.html'],['✉️','Contact','/contact.html'],['ℹ️','About Us','/about-us.html'],['❓','FAQs','/faqs.html'],['🏠','Home','/']];
  links.forEach(function(item){var a=document.createElement('a');a.href=item[2];var icon=document.createElement('span');icon.textContent=item[0];a.appendChild(icon);a.appendChild(document.createTextNode(item[1]));var arrow=document.createElement('b');arrow.textContent='›';a.appendChild(arrow);drawer.querySelector('.chs-links').appendChild(a)});
  function set(open){drawer.classList.toggle('open',open);shade.classList.toggle('open',open);trigger.setAttribute('aria-expanded',String(open));document.body.style.overflow=open?'hidden':'';if(open)drawer.querySelector('.chs-close').focus()}
  trigger.addEventListener('click',function(){set(!drawer.classList.contains('open'))});shade.addEventListener('click',function(){set(false)});drawer.querySelector('.chs-close').addEventListener('click',function(){set(false)});document.addEventListener('keydown',function(e){if(e.key==='Escape')set(false)});
  var toolbar=document.getElementById('chs-automatic-translate');
  if(toolbar)toolbar.appendChild(trigger);
  else{var row=document.createElement('div');row.style.cssText='display:flex;justify-content:flex-end;padding:10px 18px';row.appendChild(trigger);var header=document.querySelector('header');if(header)header.insertAdjacentElement('afterend',row);else document.body.insertBefore(row,document.body.firstChild)}
  document.body.appendChild(shade);document.body.appendChild(drawer);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

})();
