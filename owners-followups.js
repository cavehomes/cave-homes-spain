(function () {
  'use strict';
  const stages = [['new', 'New'], ['contacted', 'Contacted'], ['quote_sent', 'Quote sent'], ['booked', 'Booked'], ['completed', 'Completed']];
  let records = new Map(), available = false, loadError = '', generation = 0, dialog, editor, editing, busy = false, returnFocus;
  const support = q => /^(?:Buyer Assistance|Property Viewing & Local Support|Viewing & Local Support)(?:\s*[—–-]|\s+enquiry|\s+request)/i.test(String(q.subject || ''));
  const today = () => {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    return ['year', 'month', 'day'].map(key => parts.find(part => part.type === key).value).join('-');
  };
  const get = q => records.get(String(q.id)) || { enquiry_id: q.id, stage: ['contacted', 'replied'].includes(q.status) ? 'contacted' : 'new', quoted_price: null, follow_up_date: null, notes: '' };
  const isDue = q => { const record = get(q); return record.stage !== 'completed' && !!record.follow_up_date && record.follow_up_date <= today(); };
  const dateLabel = value => new Date(value + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const money = value => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' }).format(Number(value));
  async function load(db) {
    const token = generation;
    try {
      const result = await db.from('enquiry_followups').select('*');
      if (token !== generation) return;
      if (result.error) throw result.error;
      records = new Map((result.data || []).map(row => [String(row.enquiry_id), row]));
      available = true; loadError = '';
    } catch (_) { if (token === generation) { available = false; loadError = 'Private follow-up details could not be loaded. Refresh to try again.'; } }
  }
  function reset() { generation++; records.clear(); available = false; loadError = ''; if (dialog?.open) dialog.close(); editing = null; }
  function matches(q, stage, followup) { return (!stage || stage === 'all' || get(q).stage === stage) && (followup !== 'due' || isDue(q)); }
  function compare(a, b) {
    const due = Number(isDue(b)) - Number(isDue(a));
    if (due) return due;
    if (isDue(a) && isDue(b)) { const dates = get(a).follow_up_date.localeCompare(get(b).follow_up_date); if (dates) return dates; }
    return Number(get(b).stage === 'new') - Number(get(a).stage === 'new') || Date.parse(b.created_at) - Date.parse(a.created_at);
  }
  function summary(rows) {
    const target = document.getElementById('assistancePipeline'), warning = document.getElementById('assistanceFollowupWarning');
    if (warning) { warning.hidden = !loadError; warning.textContent = loadError; }
    if (!target) return;
    target.replaceChildren();
    if (!available) return;
    for (const [key, label] of stages) { const item = document.createElement('span'); item.className = 'followup-count'; item.textContent = label + ': ' + rows.filter(q => get(q).stage === key).length; target.appendChild(item); }
    const due = document.createElement('strong'); due.className = 'followup-due-count'; due.textContent = 'Follow-ups due: ' + rows.filter(isDue).length; target.appendChild(due);
  }
  function makeEditor() {
    if (dialog) return;
    dialog = document.createElement('dialog'); dialog.id = 'followupDialog'; dialog.className = 'followup-dialog'; dialog.setAttribute('aria-labelledby', 'followupTitle');
    dialog.innerHTML = '<div class="inquiry-reader-head"><h2 id="followupTitle">Manage follow-up</h2><button type="button" class="inquiry-reader-close" id="followupClose" aria-label="Close follow-up">×</button></div><p id="followupBuyer"></p><p class="followup-private">Private admin details. These are not shown on the website or sent to the buyer.</p><form id="followupForm"><div class="followup-fields"><div class="field"><label for="followupStage">Booking stage</label><select id="followupStage" name="stage">' + stages.map(([key, label]) => '<option value="' + key + '">' + label + '</option>').join('') + '</select></div><div class="field"><label for="followupPrice">Quoted price (€)</label><input id="followupPrice" name="price" type="number" min="0" max="99999999.99" step="0.01" inputmode="decimal"><small>Leave blank if no quote has been agreed.</small></div><div class="field"><label for="followupDate">Next follow-up date</label><input id="followupDate" name="date" type="date"><small>Clear the date when no follow-up is needed.</small></div><div class="field followup-notes"><label for="followupNotes">Private notes</label><textarea id="followupNotes" name="notes" rows="5" maxlength="5000"></textarea></div></div><div class="followup-save"><button class="btn green" type="submit" id="followupSave">Save follow-up</button><p id="followupStatus" role="status" aria-live="polite"></p></div></form>';
    document.body.appendChild(dialog); editor = dialog.querySelector('#followupForm');
    dialog.querySelector('#followupClose').onclick = () => { if (!busy) dialog.close(); };
    dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
    dialog.addEventListener('close', () => { editing = null; returnFocus?.focus?.(); });
    editor.addEventListener('submit', save);
  }
  function open(q, db, refresh, trigger) {
    if (!available || !support(q)) return;
    makeEditor(); const row = get(q);
    editing = { id: q.id, previous: records.has(String(q.id)) ? { ...row } : null, db, refresh, generation };
    returnFocus = trigger;
    dialog.querySelector('#followupBuyer').textContent = (q.name || 'Enquirer') + ' · ' + (q.subject || 'Viewing support');
    dialog.querySelector('#followupStage').value = row.stage;
    dialog.querySelector('#followupPrice').value = row.quoted_price ?? '';
    dialog.querySelector('#followupDate').value = row.follow_up_date || '';
    dialog.querySelector('#followupNotes').value = row.notes || '';
    dialog.querySelector('#followupStatus').textContent = '';
    dialog.showModal(); dialog.querySelector('#followupStage').focus();
  }
  async function save(event) {
    event.preventDefault(); if (busy || !editing || !editor.reportValidity()) return;
    const state = editing, status = dialog.querySelector('#followupStatus'), button = dialog.querySelector('#followupSave');
    const stage = dialog.querySelector('#followupStage').value, priceText = dialog.querySelector('#followupPrice').value.trim(), date = dialog.querySelector('#followupDate').value, notes = dialog.querySelector('#followupNotes').value.trim();
    const price = priceText === '' ? null : Number(priceText);
    if (!stages.some(([key]) => key === stage) || (price !== null && (!Number.isFinite(price) || price < 0 || price > 99999999.99)) || notes.length > 5000 || (date && !/^\d{4}-\d{2}-\d{2}$/.test(date))) { status.textContent = 'Please check the stage, price, date and notes.'; return; }
    busy = true; button.disabled = true; dialog.querySelector('#followupClose').disabled = true; status.textContent = 'Saving…';
    try {
      const payload = { enquiry_id: state.id, stage, quoted_price: price, follow_up_date: date || null, notes, updated_at: new Date().toISOString() };
      let result;
      if (state.previous) result = await state.db.from('enquiry_followups').update(payload).eq('enquiry_id', state.id).eq('updated_at', state.previous.updated_at).select('*').maybeSingle();
      else result = await state.db.from('enquiry_followups').insert(payload).select('*').single();
      if (result.error) throw result.error;
      if (!result.data) throw { code: 'CONFLICT' };
      if (state.generation !== generation) return;
      records.set(String(state.id), result.data);
      dialog.close(); await state.refresh();
    } catch (error) {
      if (error.code === 'CONFLICT' || error.code === '23505') await load(state.db);
      if (state.generation === generation) status.textContent = error.code === 'CONFLICT' || error.code === '23505' ? 'This enquiry changed in another session. Close and reopen the follow-up to load the latest details.' : 'Could not save follow-up. Your entries are still here. Check your connection and admin access, then try again.';
    } finally { busy = false; button.disabled = false; dialog.querySelector('#followupClose').disabled = false; }
  }
  function decorate(card, q, db, refresh) {
    if (!support(q)) return;
    const actions = card.querySelector('.inquiry-actions'); if (!actions) return;
    if (available) {
      const row = get(q), line = document.createElement('div'); line.className = 'followup-summary';
      const badge = document.createElement('strong'); badge.textContent = stages.find(([key]) => key === row.stage)?.[1] || 'New'; line.appendChild(badge);
      if (row.quoted_price !== null) { const price = document.createElement('span'); price.textContent = 'Quote: ' + money(row.quoted_price); line.appendChild(price); }
      if (row.follow_up_date) { const date = document.createElement('span'); date.textContent = (isDue(q) ? (row.follow_up_date < today() ? 'Overdue: ' : 'Due today: ') : 'Follow up: ') + dateLabel(row.follow_up_date); if (isDue(q)) date.className = 'followup-overdue'; line.appendChild(date); }
      actions.before(line);
    }
    const quoteButton = document.createElement('button'); quoteButton.type = 'button'; quoteButton.className = 'secondary quote-edit'; quoteButton.textContent = get(q).quote_saved_at ? 'Review quote' : 'Create a quote'; quoteButton.disabled = !available || !window.CHSOwnerQuotes; quoteButton.onclick = () => { if (available) window.CHSOwnerQuotes?.open(q, get(q), db, refresh, quoteButton); }; actions.appendChild(quoteButton);
    const button = document.createElement('button'); button.type = 'button'; button.className = 'secondary followup-edit'; button.textContent = 'Manage follow-up'; button.disabled = !available; button.onclick = () => open(q, db, refresh, button); actions.appendChild(button);
  }
  window.CHSOwnerFollowups = { load, reset, get, isDue, matches, compare, summary, decorate };
})();
