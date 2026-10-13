(function () {
  'use strict';
  const bucket = 'viewing-reports', photoTypes = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  const ids = ['reportClient','reportProperty','reportVisitDate','reportScope','reportCoverage','reportPropertyNotes','reportAccessNotes','reportAreaNotes','reportQuestions','reportSummary','reportVideo'];
  const columns = ['client_name','property_label','visit_date','scope','coverage_notes','property_notes','access_notes','area_notes','questions','summary','video_url'];
  let heads = new Map(), available = false, generation = 0, dialog, form, state, busy = false, returnFocus;
  const field = id => dialog.querySelector('#' + id);
  const today = () => { const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()); return ['year','month','day'].map(key => parts.find(part => part.type === key).value).join('-'); };
  async function load(db) {
    const token = generation;
    try { const result = await db.from('viewing_reports').select('id,enquiry_id,status'); if (token !== generation) return; if (result.error) throw result.error; heads = new Map((result.data || []).map(row => [String(row.enquiry_id),row])); available = true; }
    catch (_) { if (token === generation) available = false; }
  }
  function controls() {
    if (!state) return;
    ids.forEach(id => { field(id).disabled = busy; });
    ['reportSave','reportReady','reportClose'].forEach(id => { field(id).disabled = busy; });
    field('reportPreview').disabled = busy || !state.report?.id || state.dirty;
    field('reportPhotoFiles').disabled = busy || !state.report?.id;
    field('reportPhotoUpload').disabled = busy || !state.report?.id;
    field('reportState').textContent = state.report?.status === 'ready' ? 'Ready for your review and sharing' : 'Private draft';
    field('reportGallery').querySelectorAll('input,button').forEach(el => { el.disabled = busy; });
  }
  function setBusy(value) { busy = value; controls(); }
  function createDialog() {
    if (dialog) return;
    dialog = document.createElement('dialog'); dialog.id = 'viewingReportDialog'; dialog.className = 'followup-dialog report-editor'; dialog.setAttribute('aria-labelledby','reportEditorTitle');
    dialog.innerHTML = '<div class="inquiry-reader-head"><h2 id="reportEditorTitle">Create viewing report</h2><button id="reportClose" type="button" class="inquiry-reader-close" aria-label="Close report">×</button></div><p id="reportEnquiry"></p><strong id="reportState" class="report-state">Private draft</strong><p class="followup-private">Everything you enter in this report appears in its buyer preview and printed copy. Your private follow-up notes and quoted price are not imported.</p><form id="viewingReportForm"><div class="followup-fields"><div class="field"><label for="reportClient">Client name shown on report</label><input id="reportClient" maxlength="120"></div><div class="field"><label for="reportProperty">Property or area</label><input id="reportProperty" maxlength="500"></div><div class="field"><label for="reportVisitDate">Date of visit</label><input id="reportVisitDate" type="date"></div><div class="field"><label for="reportScope">Visit type</label><select id="reportScope"><option value="">Choose the visit type</option><option value="full">Property interior, exterior and area</option><option value="exterior">Exterior and area only</option><option value="area">Area visit only</option></select></div><div class="field followup-notes"><label for="reportCoverage">What you saw and any areas not accessed</label><textarea id="reportCoverage" rows="3" maxlength="8000" placeholder="Record the agreed access, areas visited and anything you could not see."></textarea></div><div class="field followup-notes"><label for="reportPropertyNotes">Property observations</label><textarea id="reportPropertyNotes" rows="4" maxlength="8000"></textarea></div><div class="field followup-notes"><label for="reportAccessNotes">Access and parking observations</label><textarea id="reportAccessNotes" rows="3" maxlength="8000"></textarea></div><div class="field followup-notes"><label for="reportAreaNotes">Area and nearby amenities</label><textarea id="reportAreaNotes" rows="3" maxlength="8000"></textarea></div><div class="field followup-notes"><label for="reportQuestions">Unanswered questions and suggested follow-up</label><textarea id="reportQuestions" rows="3" maxlength="8000"></textarea></div><div class="field followup-notes"><label for="reportSummary">Summary for the buyer</label><textarea id="reportSummary" rows="4" maxlength="8000"></textarea></div><div class="field followup-notes"><label for="reportVideo">Video-tour link (optional)</label><input id="reportVideo" type="url" maxlength="1500" placeholder="https://"><small>Use a link that your buyer has permission to open.</small></div></div><div class="followup-save"><button id="reportSave" class="btn green" type="submit">Save draft</button><button id="reportReady" class="secondary" type="button">Mark report ready</button><button id="reportPreview" class="secondary" type="button" disabled>Preview / print report</button><p id="reportStatus" role="status" aria-live="polite"></p></div></form><section class="report-photo-section"><h3>Report photographs</h3><p class="followup-private">Save a draft first, then add up to 20 photographs. JPEG, PNG or WebP, up to 8 MB each. Photographs are saved privately.</p><input id="reportPhotoFiles" type="file" accept="image/jpeg,image/png,image/webp" multiple aria-label="Choose report photographs" disabled><button id="reportPhotoUpload" class="secondary" type="button" disabled>Add photographs</button><p id="reportPhotoStatus" role="status" aria-live="polite"></p><div id="reportGallery" class="report-photo-grid"></div></section>';
    document.body.appendChild(dialog); form = field('viewingReportForm');
    field('reportClose').onclick = () => { if (!busy) dialog.close(); };
    dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
    dialog.addEventListener('close', () => { state = null; returnFocus?.focus?.(); });
    form.addEventListener('input', () => { if (!state) return; state.dirty = true; field('reportStatus').textContent = 'Changes are not saved yet.'; controls(); });
    form.addEventListener('submit', event => { event.preventDefault(); return save('draft'); });
    field('reportReady').onclick = () => save('ready');
    field('reportPreview').onclick = () => { if (!state?.report?.id || state.dirty || busy) return; location.href = '/viewing-report.html?id=' + encodeURIComponent(state.report.id); };
    field('reportPhotoUpload').onclick = uploadPhotos;
  }
  function defaultScope(q) { const service = String(q.subject || ''); return /exterior/i.test(service) ? 'exterior' : /full property/i.test(service) ? 'full' : /area-orientation/i.test(service) ? 'area' : ''; }
  async function open(q, db, refresh, trigger) {
    createDialog(); const current = { q, db, refresh, generation, report: null, photos: [], dirty: false }; state = current; returnFocus = trigger;
    ids.forEach(id => { field(id).value = ''; }); field('reportClient').value = String(q.name || '').slice(0,120); field('reportProperty').value = String(q.property_title || '').slice(0,500); field('reportScope').value = defaultScope(q);
    field('reportEnquiry').textContent = (q.name || 'Enquirer') + ' · ' + (q.subject || 'Viewing'); field('reportStatus').textContent = 'Loading report…'; field('reportPhotoStatus').textContent = ''; field('reportGallery').replaceChildren(); dialog.showModal(); setBusy(true);
    try {
      const result = await db.from('viewing_reports').select('*').eq('enquiry_id',q.id).maybeSingle();
      if (result.error) throw result.error; if (current.generation !== generation || state !== current) return;
      current.report = result.data;
      if (result.data) { ids.forEach((id,i) => { field(id).value = result.data[columns[i]] || ''; }); await loadPhotos(current); }
      if (state !== current) return;
      field('reportStatus').textContent = result.data ? 'Saved report loaded.' : 'Start with a private draft. Record observations from the actual visit.';
    } catch (_) { if (state === current) field('reportStatus').textContent = 'Could not load this report. Close and reopen it to try again.'; }
    finally { setBusy(false); if (state === current) field('reportProperty').focus(); }
  }
  function values(status) {
    const data = Object.fromEntries(ids.map((id,i) => [columns[i],field(id).value.trim()])); data.visit_date ||= null; data.status = status; data.updated_at = new Date().toISOString(); return data;
  }
  function valid(data) {
    if (!['','full','exterior','area'].includes(data.scope)) return false;
    if (data.client_name.length>120 || data.property_label.length>500 || data.video_url.length>1500 || columns.slice(4,10).some(key=>data[key].length>8000)) return false;
    if (data.video_url) { try { const url = new URL(data.video_url); if (url.protocol !== 'https:') return false; } catch (_) { return false; } }
    if (data.status==='ready' && (!data.property_label || !data.visit_date || data.visit_date>today() || !data.scope || !data.coverage_notes || !data.summary)) return false;
    return true;
  }
  async function write(current, data) {
    let result;
    if (current.report) result = await current.db.from('viewing_reports').update(data).eq('id',current.report.id).eq('updated_at',current.report.updated_at).select('*').maybeSingle();
    else result = await current.db.from('viewing_reports').insert({enquiry_id:current.q.id,...data}).select('*').single();
    if (result.error) throw result.error; if (!result.data) throw {code:'CONFLICT'};
    if (current.generation !== generation || state !== current) return false;
    current.report = result.data; heads.set(String(current.q.id),result.data); return true;
  }
  async function showFailure(error,current) {
    if (error.code==='CONFLICT' || error.code==='23505') await current.refresh();
    if (current.generation === generation && state===current) field('reportStatus').textContent = error.code==='CONFLICT' || error.code==='23505' ? 'This report changed in another session. Your entries are still here; copy anything you need before closing and reopening.' : 'Could not save the report. Your entries are still here. Check your connection and admin access, then try again.';
  }
  async function save(status) {
    if (busy || !state || !form.reportValidity()) return; const current=state,data=values(status);
    if (!valid(data)) { field('reportStatus').textContent = status==='ready' ? 'To mark ready, enter the property or area, an actual visit date, visit type, coverage notes and buyer summary. Use an HTTPS video link.' : 'Please check the report fields and use an HTTPS video link.'; return; }
    setBusy(true); field('reportStatus').textContent='Saving report…';
    try { if (!await write(current,data)) return; current.dirty=false; await current.refresh(); if (state!==current || current.generation!==generation) return; field('reportStatus').textContent=status==='ready' ? 'Report marked ready. Preview it, then print or save a PDF to share with your buyer.' : 'Draft saved privately. You can now add photographs or preview the report.'; }
    catch (error) { await showFailure(error,current); } finally { setBusy(false); }
  }
  async function markDraft(current) { if (current.report.status==='ready') return write(current,{status:'draft',updated_at:new Date().toISOString()}); return true; }
  async function loadPhotos(current) {
    const result=await current.db.from('viewing_report_photos').select('*').eq('report_id',current.report.id).order('sort_order'); if (result.error) throw result.error;
    if (current.generation!==generation || state!==current) return;
    current.photos=result.data || []; const gallery=field('reportGallery'); gallery.replaceChildren();
    for (const photo of current.photos) {
      const card=document.createElement('div'); card.className='report-photo-card';
      const img=document.createElement('img'); img.alt=photo.caption || 'Report photograph'; img.loading='lazy';
      const signed=await current.db.storage.from(bucket).createSignedUrl(photo.storage_path,900); if (state!==current || current.generation!==generation) return;
      if (!signed.error && signed.data?.signedUrl) img.src=signed.data.signedUrl; else img.alt='Photograph unavailable. Reopen the report to refresh it.';
      const label=document.createElement('label'); label.textContent='Photograph caption'; const input=document.createElement('input'); input.type='text'; input.maxLength=250; input.value=photo.caption || ''; input.disabled=busy; label.appendChild(input);
      const caption=document.createElement('button'); caption.type='button'; caption.className='secondary'; caption.textContent='Save caption'; caption.disabled=busy;
      caption.onclick=async()=>{ if (busy || state!==current) return; setBusy(true); try { if(!await markDraft(current))return; const value=input.value.trim(); if(value.length>250)throw Error('Caption too long'); const result=await current.db.from('viewing_report_photos').update({caption:value}).eq('id',photo.id).select('id').maybeSingle(); if(result.error)throw result.error; if(!result.data)throw Error('Photo unavailable'); photo.caption=value; img.alt=value || 'Report photograph'; if(state===current)field('reportPhotoStatus').textContent='Caption saved. Review the report before marking it ready.'; await current.refresh(); }catch(error){await showFailure(error,current);}finally{setBusy(false);}};
      const remove=document.createElement('button'); remove.type='button'; remove.className='delete'; remove.textContent='Remove photograph'; remove.disabled=busy;
      remove.onclick=async()=>{if(busy || state!==current || !confirm('Remove this photograph from the report?'))return;setBusy(true);try{if(!await markDraft(current))return;const storage=await current.db.storage.from(bucket).remove([photo.storage_path]);if(storage.error)throw storage.error;const record=await current.db.from('viewing_report_photos').delete().eq('id',photo.id).select('id').maybeSingle();if(record.error)throw record.error;if(!record.data)throw Error('Photo unavailable');await loadPhotos(current);if(state===current)field('reportPhotoStatus').textContent='Photograph removed.';await current.refresh();}catch(error){await showFailure(error,current);}finally{setBusy(false);}};
      card.appendChild(img);card.appendChild(label);card.appendChild(caption);card.appendChild(remove);gallery.appendChild(card);
    }
    controls();
  }
  async function uploadPhotos() {
    if(busy || !state?.report?.id)return;const current=state,files=[...field('reportPhotoFiles').files];if(!files.length){field('reportPhotoStatus').textContent='Choose at least one photograph.';return;}
    if(current.photos.length+files.length>20){field('reportPhotoStatus').textContent='Each report can have up to 20 photographs. Choose fewer or remove an existing photograph.';return;}
    if(files.some(file=>!photoTypes[file.type] || file.size>8388608 || file.size===0)){field('reportPhotoStatus').textContent='Use JPEG, PNG or WebP photographs up to 8 MB each.';return;}
    setBusy(true);let added=0;
    try {
      if(!await markDraft(current))return;
      for(const file of files){if(state!==current || current.generation!==generation)return;const used=new Set(current.photos.map(p=>p.sort_order));let slot=0;while(used.has(slot))slot++;const path=current.report.id+'/'+crypto.randomUUID()+'.'+photoTypes[file.type];field('reportPhotoStatus').textContent='Adding photograph '+(added+1)+' of '+files.length+'…';const upload=await current.db.storage.from(bucket).upload(path,file,{contentType:file.type,upsert:false});if(upload.error)throw upload.error;
        let record=await current.db.from('viewing_report_photos').insert({report_id:current.report.id,storage_path:path,sort_order:slot,caption:''}).select('*').single();
        if(record.error){const check=await current.db.from('viewing_report_photos').select('*').eq('storage_path',path).maybeSingle();if(!check.error && check.data)record=check;else{if(!check.error)await current.db.storage.from(bucket).remove([path]);throw record.error;}}current.photos.push(record.data);added++;
      }
      if(state!==current || current.generation!==generation)return;field('reportPhotoFiles').value='';await loadPhotos(current);field('reportPhotoStatus').textContent=added+(added===1?' photograph added privately.':' photographs added privately.');await current.refresh();
    }catch(error){if(state===current){field('reportPhotoFiles').value='';try{await loadPhotos(current);}catch(_){}field('reportPhotoStatus').textContent=added ? added+' photograph(s) added. Choose only the remaining photographs to retry.' : 'Could not add photographs. Please try again.';if(error.code==='CONFLICT')await showFailure(error,current);}}finally{setBusy(false);}
  }
  function decorate(card,q,followup,db,refresh) {
    const existing=heads.get(String(q.id));if(!existing && !['booked','completed'].includes(followup.stage))return;
    const actions=card.querySelector('.inquiry-actions');if(!actions)return;
    const button=document.createElement('button');button.type='button';button.className='secondary viewing-report-edit';button.textContent=existing ? 'Edit viewing report' : 'Create viewing report';button.disabled=!available;button.onclick=()=>open(q,db,refresh,button);actions.appendChild(button);
    if(existing){const status=document.createElement('span');status.className='report-state';status.textContent=existing.status==='ready'?'Report ready':'Report draft';actions.appendChild(status);}
  }
  function reset() {generation++;heads.clear();available=false;state=null;if(dialog?.open)dialog.close();if(form)form.querySelectorAll('input,textarea,select').forEach(el=>{el.value='';});if(dialog){field('reportGallery').replaceChildren();field('reportPhotoFiles').value='';field('reportPhotoStatus').textContent='';field('reportEnquiry').textContent='';field('reportStatus').textContent='';}}
  window.CHSOwnerReports={load,decorate,reset};
})();
