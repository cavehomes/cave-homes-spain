(function () {
  'use strict';
  let offers = new Map(), links = new Map(), generation = 0, dialog, current, busy = false, ready = false;
  const field = id => dialog.querySelector('#' + id);
  const stamp = value => new Date(value).toLocaleString('en-GB', { timeZone: 'Europe/Madrid', dateStyle: 'medium', timeStyle: 'short' });
  const complete = row => row.quote_saved_at && row.quote_service && row.quote_scope && row.quoted_price !== null;
  async function load(db) {
    const version = generation;
    const result = await db.from('viewing_quote_offers').select('enquiry_id,token_hash,snapshot,issued_at,expires_at,revoked_at,accepted_at,accepted_name,quote_saved_at');
    if (version !== generation) return;
    if (result.error) { ready = false; throw result.error; }
    offers = new Map((result.data || []).map(o => [String(o.enquiry_id), o]));
    ready = true;
  }
  function reset() { generation++; offers.clear(); links.clear(); ready = false; current = null; if (dialog?.open) dialog.close(); }
  function create() {
    if (dialog) return;
    dialog = document.createElement('dialog'); dialog.className = 'followup-dialog'; dialog.id = 'quoteLinkDialog'; dialog.setAttribute('aria-labelledby', 'quoteLinkTitle');
    dialog.innerHTML = '<div class="inquiry-reader-head"><h2 id="quoteLinkTitle">Customer quote link</h2><button id="quoteLinkClose" class="inquiry-reader-close" type="button" aria-label="Close customer quote link">×</button></div><p id="quoteLinkBuyer"></p><p>Share a private page where your customer can review and accept the saved quote. No message is sent automatically. Acceptance does not confirm property access or the final booking.</p><p id="quoteLinkSummary" style="white-space:pre-wrap"></p><p id="quoteLinkHistory"></p><label><input id="quoteLinkReviewed" type="checkbox"> I have checked the saved service, included work, price, dates and access arrangements.</label><div class="followup-save"><button class="btn green" id="quoteLinkCreate" type="button">Create customer link</button><button class="secondary" id="quoteLinkRevoke" type="button">Withdraw link</button></div><div id="quoteLinkOutput" hidden><label for="quoteLinkURL">Private link — share only with this customer</label><input id="quoteLinkURL" readonly style="width:100%;margin:10px 0"><button class="secondary" id="quoteLinkCopy" type="button">Copy link</button><button class="secondary" id="quoteLinkSent" type="button">Mark link sent</button></div><p id="quoteLinkStatus" role="status" aria-live="polite"></p>';
    document.body.appendChild(dialog);
    field('quoteLinkClose').onclick = () => { if (!busy) dialog.close(); };
    dialog.addEventListener('cancel', e => { if (busy) e.preventDefault(); });
    dialog.addEventListener('close', () => { current?.trigger?.focus?.(); current = null; field('quoteLinkURL').value = ''; });
    field('quoteLinkReviewed').onchange = update;
    field('quoteLinkCreate').onclick = issue;
    field('quoteLinkRevoke').onclick = revoke;
    field('quoteLinkSent').onclick = markSent;
    field('quoteLinkCopy').onclick = async () => {
      try { await navigator.clipboard.writeText(field('quoteLinkURL').value); field('quoteLinkStatus').textContent = 'Copied. Paste it into your message to the customer, then mark it sent.'; }
      catch (_) { field('quoteLinkURL').focus(); field('quoteLinkURL').select(); field('quoteLinkStatus').textContent = 'Link selected. Use Copy, then paste it into your message.'; }
    };
  }
  function update() {
    if (!current) return;
    const offer = offers.get(String(current.q.id)), row = current.row;
    const locked = ['quote_accepted','booked','completed'].includes(row.stage) || !!offer?.accepted_at;
    const matching = offer && offer.quote_saved_at === row.quote_saved_at && Number(offer.snapshot?.price) === Number(row.quoted_price);
    const active = offer && matching && !offer.revoked_at && new Date(offer.expires_at) > new Date();
    field('quoteLinkCreate').disabled = busy || !ready || locked || !complete(row) || !field('quoteLinkReviewed').checked;
    field('quoteLinkCreate').textContent = offer ? 'Replace customer link' : 'Create customer link';
    field('quoteLinkRevoke').disabled = busy || !offer || !!offer.revoked_at;
    field('quoteLinkClose').disabled = busy;
    field('quoteLinkReviewed').disabled = busy || locked;
    const shown = offer?.accepted_at ? offer.snapshot : {service:row.quote_service,scope:row.quote_scope,price:row.quoted_price,dates:row.quote_dates,access:row.quote_access};
    field('quoteLinkSummary').textContent = shown.service + '\n\n' + shown.scope + '\n\nTotal: ' + new Intl.NumberFormat('en-GB', {style:'currency',currency:'EUR'}).format(Number(shown.price)) + '\nDates: ' + (shown.dates || 'To be agreed') + '\nAccess: ' + (shown.access || 'To be agreed');
    field('quoteLinkHistory').textContent = offer?.accepted_at ? 'Accepted by ' + offer.accepted_name + ' on ' + stamp(offer.accepted_at) + '. These are the terms accepted by the customer. Review the booking and confirm final arrangements.' : offer?.revoked_at ? 'The previous link was withdrawn.' : offer && !matching ? 'The saved quote has changed. Create a replacement link before sharing it.' : offer ? 'Link expires ' + stamp(offer.expires_at) + '. Replacing it immediately disables the previous link.' : 'Links expire after 14 days. A reminder to follow up will be added to your tracker.';
    const saved = links.get(String(current.q.id));
    const show = active && !locked && saved?.hash === offer.token_hash;
    field('quoteLinkOutput').hidden = !show;
    field('quoteLinkURL').value = show ? saved.url : '';
    field('quoteLinkCopy').disabled = busy || !show;
    field('quoteLinkSent').disabled = busy || !show || row.stage === 'quote_sent';
  }
  async function refresh() {
    const state = current;
    const {data,error} = await state.db.from('enquiry_followups').select('*').eq('enquiry_id',state.q.id).single();
    if (error) throw error;
    if (state !== current || state.generation !== generation) return;
    state.row = data; await load(state.db); await state.refresh();
  }
  async function open(q,row,db,refreshRows,trigger) {
    if (!complete(row)) return;
    create(); current = {q,row:{...row},db,refresh:refreshRows,trigger,generation};
    field('quoteLinkBuyer').textContent = (q.name || 'Customer') + ' · ' + (q.email || '');
    field('quoteLinkReviewed').checked = false; field('quoteLinkStatus').textContent = '';
    update(); dialog.showModal();
    try { await refresh(); if (current) update(); }
    catch (_) { field('quoteLinkStatus').textContent = 'Could not refresh the saved quote. Close and reopen to try again.'; field('quoteLinkCreate').disabled = true; }
  }
  async function run(action) {
    if (busy || !current) return;
    const state = current; busy = true; update();
    try { await action(state); }
    catch (error) { if (current === state) field('quoteLinkStatus').textContent = error.code === '40001' ? 'This quote changed in another session. Close and reopen it before creating a link.' : 'Could not update the quote link. Check your connection, then close and reopen to see the latest state.'; }
    finally { busy = false; if (current === state) update(); }
  }
  async function issue() {
    if (field('quoteLinkCreate').disabled) return;
    if (offers.has(String(current.q.id)) && !confirm('Replace this customer link? The previous link will stop working immediately.')) return;
    await run(async state => {
      const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2,'0')).join('');
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
      const hash = Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
      const result = await state.db.rpc('issue_viewing_quote',{p_enquiry_id:state.q.id,p_token_hash:hash,p_expected_updated_at:state.row.updated_at});
      if (result.error) throw result.error;
      if (state.generation !== generation || current !== state) return;
      links.set(String(state.q.id),{hash,url:'https://cavehomesspain.com/viewing-quote.html#'+token});
      await refresh();
      field('quoteLinkStatus').textContent = 'Private link ready. Copy it and send it yourself. Prices and private notes are not published on the website. Save this link in your customer conversation; a reopened session can create a replacement.';
    });
  }
  async function revoke() {
    if (field('quoteLinkRevoke').disabled || !confirm('Withdraw this quote link? The customer will no longer be able to open or accept it. Saved acceptance records are kept.')) return;
    await run(async state => {
      const result = await state.db.from('viewing_quote_offers').update({revoked_at:new Date().toISOString()}).eq('enquiry_id',state.q.id).select('enquiry_id').single();
      if (result.error) throw result.error;
      links.delete(String(state.q.id)); await refresh(); field('quoteLinkStatus').textContent = 'Link withdrawn. Any recorded acceptance remains in your tracker.';
    });
  }
  async function markSent() {
    if (field('quoteLinkSent').disabled) return;
    await run(async state => {
      const result = await state.db.from('enquiry_followups').update({stage:'quote_sent',updated_at:new Date().toISOString()}).eq('enquiry_id',state.q.id).eq('updated_at',state.row.updated_at).select('enquiry_id').maybeSingle();
      if (result.error) throw result.error;
      if (!result.data) throw {code:'40001'};
      await refresh(); field('quoteLinkStatus').textContent = 'Marked Quote sent. Follow-ups due appear in the Owners app.';
    });
  }
  function decorate(card,q,row,db,refreshRows,available) {
    const actions = card.querySelector('.inquiry-actions'); if (!actions) return;
    const offer = offers.get(String(q.id));
    if (offer?.accepted_at) { const note = document.createElement('p'); note.className='followup-summary'; note.textContent='Customer accepted: '+offer.accepted_name+' · '+stamp(offer.accepted_at); actions.before(note); }
    const button = document.createElement('button'); button.type='button'; button.className='secondary quote-link-edit'; button.textContent=offer?.accepted_at?'View acceptance':'Customer quote link'; button.disabled=!available||!ready||!complete(row); button.onclick=()=>open(q,row,db,refreshRows,button); actions.appendChild(button);
  }
  window.CHSQuoteLinks = {load,reset,open,decorate};
})();
