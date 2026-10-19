(function () {
  'use strict';
  const limit = 50 * 1024 * 1024;
  const propertyTypes = {'Cave Home':['cave home','casa cueva'],House:['house','casa'],Finca:['finca','finca'],Cortijo:['cortijo','cortijo'],Apartment:['apartment','apartamento'],Land:['plot of land','terreno']};
  const clean = (text, length = 150) => String(text || '').replace(/\\n/g,'\n').replace(/\s+/g,' ').trim().slice(0,length);
  const publicLink = home => 'https://cavehomesspain.com/?home='+encodeURIComponent(home.id);
  const canAdvertise = home => !!home.published && !['sold','withdrawn','rejected'].includes(home.status);
  function caption(home, language = 'both') {
    const type = propertyTypes[home.property_type] || ['property','propiedad'];
    const town = clean(home.town,100), province = clean(home.province,80), title = clean(home.title,150);
    const reserved = home.status === 'reserved' || /\breserved\b/i.test(title);
    const price = home.price != null && Number.isFinite(Number(home.price)) ? new Intl.NumberFormat('en-GB',{style:'currency',currency:'EUR',minimumFractionDigits:Number.isInteger(Number(home.price))?0:2,maximumFractionDigits:2}).format(Number(home.price)) : null;
    const esPrice = home.price != null && Number.isFinite(Number(home.price)) ? new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',minimumFractionDigits:Number.isInteger(Number(home.price))?0:2,maximumFractionDigits:2}).format(Number(home.price)) : null;
    const build = es => {
      const lines = [(es?'🇪🇸 ':'🇬🇧 ')+(es?'DESCUBRE ESTA PROPIEDAD':'DISCOVER YOUR NEXT CHAPTER'), '🏡 '+(es ? type[1].charAt(0).toUpperCase()+type[1].slice(1) : title || type[0]), '📍 '+[town,province].filter(Boolean).join(', ')];
      if (price) lines.push('💶 '+(es?esPrice:price));
      if (reserved) lines.push(es?'RESERVADO — consulta por propiedades similares.':'RESERVED — ask us about similar properties.');
      if (home.property_type !== 'Land' && Number(home.bedrooms)>0) lines.push('🛏 '+home.bedrooms+(es?' dormitorios':' bedrooms'));
      if (home.property_type !== 'Land' && home.total_rooms != null && Number(home.total_rooms)>0) lines.push('🏠 '+home.total_rooms+(es?' habitaciones en total':' rooms in total'));
      if (Number(home.floor_area_m2)>0) lines.push((es?'Superficie construida: ':'Floor area: ')+home.floor_area_m2+' m²');
      if (Number(home.plot_area_m2)>0) lines.push((es?'Terreno: ':'Land: ')+home.plot_area_m2+' m²');
      lines.push('',reserved?(es?'Contacta con Cave Homes Spain para descubrir otras opciones.':'Message Cave Homes Spain to explore other options.'):(es?'📩 Contacta con Cave Homes Spain para más información o para concertar una visita.':'📩 Message Cave Homes Spain for details or to arrange a viewing.'));
      return lines.join('\n');
    };
    const parts = language === 'en' ? [build(false)] : language === 'es' ? [build(true)] : [build(false),build(true)];
    if (home.published) parts.push(publicLink(home));
    parts.push('#CaveHomesSpain #CasaCueva #Granada #SpanishProperty #InlandSpain');
    return parts.join('\n\n');
  }
  function mediaType(file) {
    const byExtension = {jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',mp4:'video/mp4',webm:'video/webm'};
    const extension = /\.([a-z0-9]+)$/i.exec(file.name || '')?.[1].toLowerCase();
    const type = file.type || byExtension[extension];
    if (!['image/jpeg','image/png','image/webp','video/mp4','video/webm'].includes(type) || !file.size) throw Error('Choose JPG, PNG or WebP photos, or an MP4/WebM video.');
    return type;
  }
  function validateFiles(files) {
    if (!files.length || files.length>10) throw Error('Choose up to 10 photos, or one video.');
    const types=files.map(mediaType), videos=types.filter(type=>type.startsWith('video/')).length;
    if (videos && files.length !== 1) throw Error('Choose one video on its own, or choose photos only.');
    if (files.reduce((total,file)=>total+file.size,0)>limit) throw Error('Keep the selected files under 50 MB in total.');
    return files;
  }
  function safeUrl(value) { try { const u=new URL(value); return u.protocol==='https:' && !u.username && !u.password ? u.href : ''; } catch (_) { return ''; } }
  let dialog, current, readyFiles=[], downloads=[], drafts={}, generation=0, controller, returnFocus, busy=false, sharing=false;
  const field=id=>dialog.querySelector('#'+id);
  const status=text=>{field('socialStatus').textContent=text;};
  function release() { controller?.abort(); controller=null; downloads.forEach(url=>URL.revokeObjectURL(url));downloads=[];readyFiles=[]; }
  function invalidate() { generation++;release();field('socialDownloads').replaceChildren();update(); }
  function reset() { generation++;release();current=null;drafts={};busy=false;sharing=false;if(dialog){field('socialCaption').value='';field('socialProperty').textContent='';field('socialLocalFiles').value='';field('socialPhotos').replaceChildren();field('socialSourceLinks').replaceChildren();field('socialDownloads').replaceChildren();status('');if(dialog.open)dialog.close();} }
  function update() {
    if (!current) return;
    const allowed=canAdvertise(current);
    let supported=false; try { supported=!!navigator.share && !!navigator.canShare?.({files:readyFiles}) && readyFiles.length>0; } catch (_) {}
    field('socialShare').disabled=!allowed || !supported || busy || sharing;
    field('socialPrepare').disabled=!allowed || busy;
    field('socialCount').textContent=field('socialCaption').value.length+' characters';
  }
  async function copyCaption() {
    const text=field('socialCaption').value;
    try { await navigator.clipboard.writeText(text);status('Caption copied. Paste it into Instagram after choosing your photos or video.'); }
    catch (_) { field('socialCaption').focus();field('socialCaption').select();status('The caption is selected. Press and hold, then tap Copy.'); }
  }
  function share() {
    if (!current || !readyFiles.length || field('socialShare').disabled) return;
    // Keep this call inside the original tap: fetching media here would lose browser activation.
    sharing=true;update();
    let operation;
    try { operation=navigator.share({files:readyFiles}); }
    catch (error) { sharing=false;update();status('Sharing is unavailable here. Download the media below and open Instagram.');return; }
    const token=generation;
    Promise.resolve(operation).then(()=>{
      if(token===generation)status('Media handed to your phone’s sharing app. Finish the post in Instagram, paste the caption and select Share to Facebook.');
    }).catch(error=>{if(token===generation)status(error.name==='AbortError'?'Sharing cancelled. Your caption and media are still ready.':'Could not share these files. Download them below, then add them in Instagram.');})
      .finally(()=>{if(token===generation){sharing=false;update();}});
  }
  function showDownloads(files) {
    const target=field('socialDownloads');target.replaceChildren();
    files.forEach((file,index)=>{
      const link=document.createElement('a'),url=URL.createObjectURL(file);downloads.push(url);link.href=url;link.download=file.name;link.textContent=files.length===1?'Download photo / video':'Download photo '+(index+1);target.appendChild(link);
    });
  }
  async function downloadSource(url,index,signal) {
    const response=await fetch(url,{signal,credentials:'omit'});if(!response.ok)throw Error('Media unavailable');
    if(Number(response.headers.get('content-length'))>limit)throw Error('File too large');
    const blob=await response.blob();const type=blob.type.split(';')[0].toLowerCase();
    const extension={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4','video/webm':'webm'}[type];
    if(!extension || !blob.size || blob.size>limit)throw Error('Unsupported media');
    return new File([blob],'cave-homes-spain-'+clean(current.id,8)+'-'+(index+1)+'.'+extension,{type});
  }
  async function prepare() {
    if(!current || !canAdvertise(current) || busy)return;
    invalidate();const token=generation;busy=true;update();status('Preparing your photos or video…');
    try {
      let files;
      const mode=field('socialMediaMode').value;
      if(mode==='phone')files=[...field('socialLocalFiles').files];
      else {
        const sources=mode==='video'?[window.CHSPropertyVideo?.parse(current.video_url)].filter(v=>v?.kind==='file').map(v=>v.url):[...field('socialPhotos').querySelectorAll('button[aria-pressed="true"]')].map(button=>button.dataset.source);
        if(!sources.length)throw Error(mode==='video'?'For a linked YouTube/Vimeo video, choose the original video from your phone to create an Instagram post.':'Choose at least one photo.');
        controller=new AbortController();const requestController=controller;const timeout=setTimeout(()=>requestController.abort(),20000);
        let results;try {results=await Promise.allSettled(sources.map((url,i)=>downloadSource(url,i,controller.signal)));} finally {clearTimeout(timeout);}
        if(token!==generation)return;
        if(results.some(result=>result.status==='rejected'))throw Error('One or more listing files could not be prepared. Use an “Open original” link to save the file to your phone, then choose “From my phone”.');
        files=results.map(result=>result.value);
      }
      validateFiles(files);if(token!==generation)return;readyFiles=files;showDownloads(files);
      let supported=false;try{supported=!!navigator.share && !!navigator.canShare?.({files});}catch(_){}
      status(supported?'Media ready. Copy your caption, then tap Share media and choose Instagram.':'Media ready to download below. Add it in Instagram and paste your copied caption.');
    } catch(error) {if(token===generation)status(error.message || 'Could not prepare the media. Choose it from your phone instead.');}
    finally {if(token===generation){busy=false;update();}}
  }
  function modes() {
    invalidate();busy=false;
    const mode=field('socialMediaMode').value;
    field('socialPhotos').hidden=mode!=='photos';field('socialPhoneChoice').hidden=mode!=='phone';
    field('socialSourceLinks').hidden=mode==='phone';
    status(mode==='phone'?'Choose up to 10 photos, or one video, then tap Prepare media.':'Choose your media, then tap Prepare media.');update();
  }
  function create() {
    if(dialog)return;dialog=document.createElement('dialog');dialog.id='ownerSocialDialog';dialog.className='owner-social-dialog';dialog.setAttribute('aria-labelledby','socialTitle');
    dialog.innerHTML='<div class="owner-social-head"><h2 id="socialTitle">Create social post</h2><button type="button" id="socialClose" aria-label="Close social post">×</button></div><p id="socialProperty"></p><p class="owner-social-instructions">Copy the caption, share the media and choose Instagram. Paste the caption there and use Instagram’s <strong>Share to Facebook</strong> option before publishing. You finish publishing inside Instagram.</p><p id="socialDraftWarning" class="owner-social-warning" hidden>Private or unavailable property: you can prepare the wording here. Publish the listing before sharing it.</p><label for="socialLanguage">Caption language</label><select id="socialLanguage"><option value="both">English + Español</option><option value="en">English</option><option value="es">Español</option></select><label for="socialCaption">Caption — edit before copying</label><textarea id="socialCaption" rows="12" maxlength="2200"></textarea><div class="owner-social-caption-actions"><small id="socialCount"></small><button id="socialCopy" type="button">1. Copy caption</button><button id="socialRegenerate" type="button">Reset caption</button></div><label for="socialMediaMode">Photos or video</label><select id="socialMediaMode"><option value="photos">Listing photos</option><option value="video">Listing video</option><option value="phone">From my phone</option></select><div id="socialPhotos" class="owner-social-photos"></div><div id="socialPhoneChoice" hidden><label for="socialLocalFiles">Choose up to 10 photos or one video (50 MB total)</label><input id="socialLocalFiles" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,.jpg,.jpeg,.png,.webp,.mp4,.webm" multiple><small>MP4 is the best choice for an Instagram video.</small></div><div id="socialSourceLinks" class="owner-social-sources"></div><div class="owner-social-buttons"><button id="socialPrepare" type="button">2. Prepare media</button><button id="socialShare" type="button" disabled>3. Share media →</button></div><p id="socialStatus" role="status" aria-live="polite"></p><div id="socialDownloads" class="owner-social-downloads"></div><p class="owner-social-tip">If Instagram does not appear in your phone’s share menu, download the media and add it in Instagram. Your caption is copied separately because receiving apps may omit it.</p><a class="owner-social-instagram" href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer">Open Instagram ↗</a>';
    document.body.appendChild(dialog);
    field('socialClose').onclick=()=>dialog.close();
    dialog.addEventListener('close',()=>{reset();returnFocus?.focus?.();});
    field('socialCopy').onclick=copyCaption;field('socialPrepare').onclick=prepare;field('socialShare').onclick=share;
    field('socialCaption').oninput=()=>{drafts[field('socialLanguage').value]=field('socialCaption').value;update();};
    field('socialLanguage').onchange=()=>{field('socialCaption').value=drafts[field('socialLanguage').value]??caption(current,field('socialLanguage').value);update();};
    field('socialRegenerate').onclick=()=>{const lang=field('socialLanguage').value;drafts[lang]=caption(current,lang);field('socialCaption').value=drafts[lang];update();};
    field('socialMediaMode').onchange=modes;
    field('socialLocalFiles').onchange=()=>{invalidate();busy=false;status('Files chosen. Tap Prepare media to check them, then share.');update();};
  }
  function open(home,trigger) {
    create();reset();current={...home};returnFocus=trigger;field('socialProperty').textContent=clean(home.title)+' · '+[home.town,home.province].filter(Boolean).join(', ');
    field('socialLanguage').value='both';field('socialCaption').value=caption(home);field('socialDraftWarning').hidden=canAdvertise(home);
    field('socialLocalFiles').value='';field('socialPhotos').replaceChildren();field('socialSourceLinks').replaceChildren();
    const sources=[...new Set([home.main_image_url,...(home.image_urls || [])].map(safeUrl).filter(Boolean))];
    sources.forEach((url,index)=>{
      const button=document.createElement('button');button.type='button';button.dataset.source=url;button.className='owner-social-photo';button.setAttribute('aria-label','Select photo '+(index+1));button.setAttribute('aria-pressed',String(index===0));
      const image=document.createElement('img');image.src=url;image.alt='Property photo '+(index+1);image.loading='lazy';button.appendChild(image);
      button.onclick=()=>{
        const selected=button.getAttribute('aria-pressed')==='true';
        if(!selected && field('socialPhotos').querySelectorAll('button[aria-pressed="true"]').length>=10){status('Choose up to 10 photos.');return;}
        button.setAttribute('aria-pressed',String(!selected));invalidate();busy=false;status('Selection changed. Tap Prepare media again.');update();
      };field('socialPhotos').appendChild(button);
      const link=document.createElement('a');link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Open original photo '+(index+1);field('socialSourceLinks').appendChild(link);
    });
    const video=window.CHSPropertyVideo?.parse(home.video_url);
    if(video){const link=document.createElement('a');link.href=video.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Open original video';field('socialSourceLinks').appendChild(link);}
    field('socialMediaMode').querySelector('option[value="photos"]').disabled=!sources.length;
    field('socialMediaMode').querySelector('option[value="video"]').disabled=!video;
    field('socialMediaMode').value=sources.length?'photos':video?.kind==='file'?'video':'phone';
    modes();dialog.showModal();field('socialCaption').focus();
  }
  window.CHSOwnerSocial={open,reset,caption,validateFiles,canAdvertise};
})();
