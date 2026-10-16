(function () {
  'use strict';
  let dialog, form, state, busy = false, generation = 0, returnFocus;
  const field = id => dialog.querySelector('#' + id);
  const money = value => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' }).format(Number(value));
  const serviceName = q => String(q.subject || '').replace(/^(?:Buyer Assistance|Property Viewing & Local Support|Viewing & Local Support)(?:\s*[—–-]|\s+enquiry|\s+request)\s*/i, '').slice(0, 250) || 'Property Viewing & Local Support';
  function suggestedScope(service) {
    if (/exterior/i.test(service)) return 'A narrated video tour of the property exterior and neighbourhood from publicly accessible places, with photographs and a factual follow-up summary. Interior access is not included.';
    if (/full property/i.test(service)) return 'A narrated video tour of the property interior, exterior, access and surrounding area, with photographs and a factual follow-up summary. Interior access is subject to permission from the owner or agent.';
    if (/area-orientation/i.test(service)) return 'A local-area visit covering the agreed villages, amenities, access routes and everyday practicalities.';
    if (/viewing trip/i.test(service)) return 'Help organising the property viewings and village visits requested in your enquiry. Specific appointments, access and any additional services will be agreed before booking.';
    return '';
  }
  function proposedDates(q) {
    const text = String(q.message || ''), start = text.match(/^Arrival:\s*(.+)$/m)?.[1], end = text.match(/^Departure:\s*(.+)$/m)?.[1], preferred = text.match(/^Preferred date:\s*(.+)$/m)?.[1];
    return (start || end ? [start, end].filter(Boolean).join(' to ') : preferred || '').slice(0, 250);
  }
  function values() { return { service: field('quoteService').value.trim(), scope: field('quoteScope').value.trim(), priceText: field('quotePrice').value.trim(), dates: field('quoteDates').value.trim(), access: field('quoteAccess').value.trim() }; }
  function body(data, q) {
    const price = data.priceText === '' ? 'To be agreed' : money(data.priceText);
    return 'Hello ' + (q.name || 'there') + ',\n\nThank you for your enquiry. Here is your proposed quote from Cave Homes Spain.\n\nSERVICE\n' + data.service + (q.property_title ? '\n\nPROPERTY OR AREA\n' + q.property_title : '') + '\n\nWHAT IS INCLUDED\n' + data.scope + '\n\nTOTAL QUOTED PRICE\n' + price + '\n\nPROPOSED DATES\n' + (data.dates || 'To be agreed') + '\n\nACCESS AND APPOINTMENTS\n' + (data.access || 'To be agreed with the owner or agent before booking') + '\n\nPlease reply if you would like to proceed or discuss any changes. A booking is confirmed once access, dates and arrangements have been agreed.\n\nKind regards,\nPaul\nCave Homes Spain\nhttps://cavehomesspain.com';
  }
  const emailValid = q => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(q.email || '').trim());
  function updateButtons() {
    const saved = !!state?.saved && !state.dirty;
    field('quoteEmail').disabled = busy || !saved || !emailValid(state?.q || {});
    field('quoteSent').disabled = busy || !saved || ['quote_accepted', 'booked', 'completed'].includes(state?.previous?.stage);
    field('quoteCustomerLink').disabled = busy || !saved || !window.CHSQuoteLinks;
    field('quoteSave').disabled = busy || ['quote_accepted','booked','completed'].includes(state?.previous?.stage); field('quoteClose').disabled = busy;
    ['quoteService','quoteScope','quotePrice','quoteDates','quoteAccess'].forEach(id => { field(id).disabled = busy || ['quote_accepted','booked','completed'].includes(state?.previous?.stage); });
  }
  function preview() { if (!state) return; field('quotePreview').value = body(values(), state.q); updateButtons(); }
  function createDialog() {
    if (dialog) return;
    dialog = document.createElement('dialog'); dialog.id = 'quoteDialog'; dialog.className = 'followup-dialog'; dialog.setAttribute('aria-labelledby', 'quoteTitle');
    dialog.innerHTML = '<div class="inquiry-reader-head"><h2 id="quoteTitle">Create a quote</h2><button id="quoteClose" class="inquiry-reader-close" type="button" aria-label="Close quote">×</button></div><p id="quoteBuyer"></p><p class="followup-private">Save this draft privately, review it, then open it in your email app. Mark Quote sent only after you have sent it.</p><form id="quoteForm"><div class="followup-fields"><div class="field followup-notes"><label for="quoteService">Service *</label><input id="quoteService" required maxlength="250"></div><div class="field followup-notes"><label for="quoteScope">What is included *</label><textarea id="quoteScope" rows="5" required maxlength="5000"></textarea><small>Edit the suggested wording to match exactly what you are offering.</small></div><div class="field"><label for="quotePrice">Total quoted price (€) *</label><input id="quotePrice" type="number" min="0" max="99999999.99" step="0.01" inputmode="decimal" required></div><div class="field"><label for="quoteDates">Proposed dates</label><input id="quoteDates" maxlength="250" placeholder="Dates or a date range"></div><div class="field followup-notes"><label for="quoteAccess">Access and appointment arrangements</label><textarea id="quoteAccess" rows="3" maxlength="2500"></textarea></div><div class="field followup-notes"><label for="quotePreview">Email draft preview</label><textarea id="quotePreview" class="quote-preview" rows="12" readonly></textarea><small>Your private follow-up notes are not included in this email.</small></div></div><div class="followup-save"><button id="quoteSave" class="btn green" type="submit">Save quote draft</button><button id="quoteEmail" class="secondary" type="button" disabled>Open email draft</button><button id="quoteCustomerLink" class="secondary" type="button" disabled>Customer quote link</button><button id="quoteSent" class="secondary" type="button" disabled>Mark Quote sent</button><p id="quoteStatus" role="status" aria-live="polite"></p></div></form>';
    document.body.appendChild(dialog); form = field('quoteForm');
    field('quoteClose').onclick = () => { if (!busy) dialog.close(); };
    dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
    dialog.addEventListener('close', () => { state = null; returnFocus?.focus?.(); });
    form.addEventListener('input', event => { if (!state || event.target === field('quotePreview')) return; state.dirty = true; field('quoteStatus').textContent = 'Changes are not saved yet.'; preview(); });
    form.addEventListener('submit', saveDraft);
    field('quoteEmail').onclick = () => {
      if (!state?.saved || state.dirty || busy || !emailValid(state.q)) return;
      const subject = ('Cave Homes Spain — quote for ' + values().service).replace(/[\r\n]/g, ' ');
      location.href = 'mailto:' + encodeURIComponent(state.q.email.trim()) + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body(values(), state.q));
      field('quoteStatus').textContent = 'Email draft opened. Review and send it in your email app, then return here to mark Quote sent.';
    };
    field('quoteSent').onclick = markSent;
    field('quoteCustomerLink').onclick = () => { if (!state?.saved || state.dirty || busy) return; const saved = state, trigger = returnFocus; dialog.close(); window.CHSQuoteLinks?.open(saved.q,saved.previous,saved.db,saved.refresh,trigger); };
  }
  function open(q, record, db, refresh, trigger) {
    createDialog();
    state = { q, previous: record.updated_at ? { ...record } : null, db, refresh, generation, dirty: false, saved: !!(record.quote_saved_at && record.quote_service && record.quote_scope && record.quoted_price !== null) };
    returnFocus = trigger;
    field('quoteTitle').textContent = record.quote_saved_at ? 'Review your quote' : 'Create a quote';
    field('quoteBuyer').textContent = (q.name || 'Enquirer') + ' · ' + (q.email || 'No email address supplied');
    field('quoteService').value = record.quote_service || serviceName(q);
    field('quoteScope').value = record.quote_scope || suggestedScope(serviceName(q));
    field('quotePrice').value = record.quoted_price ?? '';
    field('quoteDates').value = record.quote_dates || proposedDates(q);
    field('quoteAccess').value = record.quote_access || 'Access and appointment times to be agreed with the owner or agent before booking.';
    field('quoteStatus').textContent = state.saved ? (emailValid(q) ? 'Saved draft ready to review.' : 'Saved draft. This enquiry has no usable email address; you can copy the preview to contact the customer.') : '';
    preview(); dialog.showModal(); field('quoteService').focus();
  }
  async function persist(current, payload) {
    let result;
    if (current.previous) result = await current.db.from('enquiry_followups').update(payload).eq('enquiry_id', current.q.id).eq('updated_at', current.previous.updated_at).select('*').maybeSingle();
    else result = await current.db.from('enquiry_followups').insert({ enquiry_id: current.q.id, stage: ['contacted', 'replied'].includes(current.q.status) ? 'contacted' : 'new', ...payload }).select('*').single();
    if (result.error) throw result.error;
    if (!result.data) throw { code: 'CONFLICT' };
    if (current.generation !== generation) return false;
    current.previous = result.data; await current.refresh(); return current.generation === generation;
  }
  async function failure(error, current) {
    if (error.code === 'CONFLICT' || error.code === '23505') await current.refresh();
    if (current.generation === generation) field('quoteStatus').textContent = error.code === 'CONFLICT' || error.code === '23505' ? 'This enquiry changed in another session. Your draft is still here; copy anything you need before closing and reopening to load the latest details.' : 'Could not save the quote. Your draft is still here. Check your connection and admin access, then try again.';
  }
  async function saveDraft(event) {
    event.preventDefault(); if (!state || busy || ['quote_accepted','booked','completed'].includes(state.previous?.stage) || !form.reportValidity()) return;
    const data = values(), price = Number(data.priceText);
    if (!data.service || !data.scope || data.priceText === '' || !Number.isFinite(price) || price < 0 || price > 99999999.99 || data.service.length > 250 || data.scope.length > 5000 || data.dates.length > 250 || data.access.length > 2500) { field('quoteStatus').textContent = 'Please check the service, included work and total price.'; return; }
    busy = true; updateButtons(); field('quoteStatus').textContent = 'Saving draft…'; const current = state;
    try {
      const time = new Date().toISOString();
      if (!await persist(current, { quote_service: data.service, quote_scope: data.scope, quoted_price: price, quote_dates: data.dates, quote_access: data.access, quote_saved_at: time, updated_at: time })) return;
      current.saved = true; current.dirty = false; field('quotePrice').value = current.previous.quoted_price;
      field('quoteStatus').textContent = emailValid(current.q) ? 'Quote saved privately. Review the preview, then open the email draft.' : 'Quote saved privately. No usable email address was supplied; you can copy the preview to contact the customer.';
    } catch (error) { await failure(error, current); }
    finally { busy = false; if (state) preview(); }
  }
  async function markSent() {
    if (!state?.saved || state.dirty || busy || ['quote_accepted', 'booked', 'completed'].includes(state.previous?.stage)) return;
    busy = true; updateButtons(); field('quoteStatus').textContent = 'Updating booking stage…'; const current = state;
    try {
      if (!await persist(current, { stage: 'quote_sent', updated_at: new Date().toISOString() })) return;
      field('quoteStatus').textContent = 'Marked Quote sent. Your booking tracker has been updated.';
    } catch (error) { await failure(error, current); }
    finally { busy = false; if (state) updateButtons(); }
  }
  function reset() {
    generation++; state = null;
    if (dialog?.open) dialog.close();
    if (form) form.querySelectorAll('input,textarea').forEach(input => { input.value = ''; });
    if (dialog) { field('quoteBuyer').textContent = ''; field('quoteStatus').textContent = ''; }
  }
  window.CHSOwnerQuotes = { open, reset };
})();

