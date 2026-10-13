(function () {
  'use strict';
  const db=window.supabase.createClient('https://lesgzlhvrlxgtfuocadq.supabase.co','sb_publishable_pPS6fORJPGFcGBIUPcxOxQ_1g4vazyg');
  const message=document.getElementById('reportMessage'),content=document.getElementById('viewingReportContent'),print=document.getElementById('printViewingReport');
  let generation=0,images=[],allSigned=false;
  const element=(tag,text,className)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;};
  const videoUrl=value=>{try{const url=new URL(value);return url.protocol==='https:'?url.href:'';}catch(_){return '';}};
  function clear(text){generation++;content.replaceChildren();content.hidden=true;print.disabled=true;images=[];allSigned=false;message.hidden=false;message.textContent=text;}
  function section(title,text,className){if(!String(text||'').trim())return;const block=element('section',undefined,'report-section '+(className||''));block.appendChild(element('h2',title));block.appendChild(element('p',text));content.appendChild(block);}
  function meta(label,value){const block=element('div');block.appendChild(element('dt',label));block.appendChild(element('dd',value));return block;}
  async function load(){
    const token=generation,id=new URLSearchParams(location.search).get('id');
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id||'')){clear('This report link is incomplete. Open the report from your owners app.');return;}
    try{
      const session=await db.auth.getSession();if(session.error)throw session.error;if(!session.data.session){clear('Sign in to your owners app, then open this report again.');return;}
      const reportResult=await db.from('viewing_reports').select('*').eq('id',id).maybeSingle();if(reportResult.error)throw reportResult.error;if(!reportResult.data){clear('This report is unavailable for your account. Open it from the owners app after signing in as admin.');return;}
      const photosResult=await db.from('viewing_report_photos').select('*').eq('report_id',id).order('sort_order');if(photosResult.error)throw photosResult.error;
      const report=reportResult.data,photos=photosResult.data||[];if(token!==generation)return;
      content.replaceChildren();images=[];allSigned=true;
      content.appendChild(element('div',report.status==='ready'?'Cave Homes Spain · Viewing report':'DRAFT — NOT READY FOR CLIENT DELIVERY','print-label'));
      const header=element('header',undefined,'report-head');header.appendChild(element('div','Cave Homes Spain','brand'));header.appendChild(element('p',report.status==='ready'?'Viewing report':'Private draft','status-label'));header.appendChild(element('h1',report.property_label || 'Property and area viewing report'));content.appendChild(header);
      if(report.status!=='ready')content.appendChild(element('p','DRAFT — This report is still being prepared and has not been marked ready.','draft-notice'));
      const details=element('dl',undefined,'report-meta');details.appendChild(meta('Client',report.client_name || 'Not recorded'));details.appendChild(meta('Visit date',report.visit_date?new Date(report.visit_date+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}):'Not recorded'));details.appendChild(meta('Visit type',({full:'Property interior, exterior and area',exterior:'Exterior and area only',area:'Area visit only'})[report.scope] || 'Not selected'));content.appendChild(details);
      section('Summary for the buyer',report.summary,'summary');section('Visit coverage and areas not accessed',report.coverage_notes);section('Property observations',report.property_notes);section('Access and parking',report.access_notes);section('Area and nearby amenities',report.area_notes);section('Unanswered questions and follow-up',report.questions);
      const video=videoUrl(report.video_url);if(video){const block=element('section',undefined,'report-section');block.appendChild(element('h2','Video tour'));const link=element('a','Open the agreed video-tour link','video-link');link.href=video;link.target='_blank';link.rel='noopener noreferrer';block.appendChild(link);block.appendChild(element('p',video));content.appendChild(block);}
      if(photos.length){const block=element('section',undefined,'report-section');block.appendChild(element('h2','Visit photographs'));const grid=element('div',undefined,'photos');block.appendChild(grid);content.appendChild(block);
        for(const photo of photos){const figure=element('figure',undefined,'photo-card'),frame=element('div',undefined,'photo-frame'),img=element('img',undefined,'report-image');img.alt=photo.caption || 'Visit photograph';img.decoding='async';const signed=await db.storage.from('viewing-reports').createSignedUrl(photo.storage_path,900);if(token!==generation)return;if(signed.error || !signed.data?.signedUrl){allSigned=false;img.alt='Photograph unavailable. Reload this report to try again.';}else{img.src=signed.data.signedUrl;images.push(img);}frame.appendChild(img);const watermark=element('img',undefined,'watermark');watermark.src='/chs-watermark.png';watermark.alt='Cave Homes Spain';frame.appendChild(watermark);figure.appendChild(frame);figure.appendChild(element('figcaption',photo.caption || 'Visit photograph'));grid.appendChild(figure);}
      }else section('Visit photographs','No photographs have been added to this report.');
      content.appendChild(element('footer','Cave Homes Spain · Practical viewing support. This report records the visit and observations described above; it does not replace an independent survey, valuation or legal advice.','report-footer'));
      if(token!==generation)return;content.hidden=false;print.disabled=!allSigned;message.hidden=allSigned;message.textContent=allSigned?'':'Some photographs could not be loaded. Reload the report before printing.';
    }catch(_){if(token===generation)clear('Could not load your private report. Check your connection and admin sign-in, then reload.');}
  }
  print.onclick=async()=>{if(print.disabled)return;try{await Promise.all(images.map(img=>img.decode()));window.print();}catch(_){message.hidden=false;message.textContent='A photograph could not be loaded. Reload the report before printing.';}};
  db.auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT')clear('You have signed out. Sign in to the owners app to view this private report.');});
  load();
})();
