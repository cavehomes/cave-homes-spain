(function () {
  'use strict';
  let dialog, form, state, busy = false, generation = 0, returnFocus;
  const field = id => dialog.querySelector('#' + id);
  const fields = ['Language','Service','Scope','Date','Time','Location','Meeting','Price','Access','Contact','Notes'];
  const labels = {
    en: ['Hello','Your booking with Cave Homes Spain is confirmed.','Service','What is included','Date and time (Spain)','Property or area','Meeting point','Agreed total price','Access arrangements','Contact on the day','Additional arrangements','Please reply to acknowledge these details, or contact us if anything needs changing.','Interior access confirmed with the owner or agent.','Exterior and local area only; no interior access.'],
    es: ['Hola','Su reserva con Cave Homes Spain está confirmada.','Servicio','Qué incluye','Fecha y hora (España)','Propiedad o zona','Punto de encuentro','Precio total acordado','Condiciones de acceso','Contacto el día de la visita','Otros detalles acordados','Por favor, responda para confirmar estos detalles o contacte con nosotros si necesita algún cambio.','Acceso al interior confirmado con el propietario o agente.','Solo exterior y zona local; sin acceso al interior.'],
    fr: ['Bonjour','Votre réservation avec Cave Homes Spain est confirmée.','Service','Prestations incluses','Date et heure (Espagne)','Bien ou secteur','Lieu de rendez-vous','Prix total convenu','Accès au bien','Contact le jour de la visite','Autres dispositions','Merci de confirmer ces détails par retour de message ou de nous contacter pour toute modification.','Accès intérieur confirmé avec le propriétaire ou l’agent.','Extérieur et environs uniquement ; aucun accès intérieur.'],
    de: ['Hallo','Ihre Buchung bei Cave Homes Spain ist bestätigt.','Leistung','Enthaltene Leistungen','Datum und Uhrzeit (Spanien)','Immobilie oder Gegend','Treffpunkt','Vereinbarter Gesamtpreis','Zugang zur Immobilie','Kontakt am Besuchstag','Weitere Vereinbarungen','Bitte bestätigen Sie diese Angaben per Nachricht oder kontaktieren Sie uns, wenn Änderungen nötig sind.','Innenbesichtigung mit dem Eigentümer oder Makler bestätigt.','Nur Außenansicht und Umgebung; kein Zugang zum Inneren.'],
    nl: ['Hallo','Uw boeking bij Cave Homes Spain is bevestigd.','Dienst','Wat is inbegrepen','Datum en tijd (Spanje)','Woning of omgeving','Ontmoetingspunt','Afgesproken totaalprijs','Toegang tot de woning','Contact op de dag zelf','Aanvullende afspraken','Bevestig deze gegevens met een antwoord of neem contact met ons op als er iets moet veranderen.','Toegang tot het interieur bevestigd met de eigenaar of makelaar.','Alleen buitenkant en omgeving; geen toegang tot het interieur.']
  };
  const locales = { en: 'en-GB', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', nl: 'nl-NL' };
  function values() {
    const data = {};
    fields.forEach(name => { data[name.toLowerCase()] = field('booking' + name).value.trim(); });
    return data;
  }
  function valid(data) {
    const price = Number(data.price);
    return !!labels[data.language] && data.service && data.scope && data.location && data.meeting && data.contact && /^\d{4}-\d{2}-\d{2}$/.test(data.date) && /^\d{2}:\d{2}$/.test(data.time) && data.price !== '' && Number.isFinite(price) && price >= 0 && price <= 99999999.99 && ['interior', 'exterior', 'area'].includes(data.access) && fields.every(name => data[name.toLowerCase()].length <= (['Scope','Notes'].includes(name) ? 2500 : 500));
  }
  function body(data, q) {
    const l = labels[data.language] || labels.en, locale = locales[data.language] || locales.en;
    const date = /^\d{4}-\d{2}-\d{2}$/.test(data.date) ? new Date(data.date + 'T12:00:00Z').toLocaleDateString(locale, { timeZone: 'Europe/Madrid', day: 'numeric', month: 'long', year: 'numeric' }) : '—';
    const price = data.price === '' ? '—' : new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(Number(data.price));
    let access = data.access === 'interior' ? l[12] : data.access === 'exterior' ? l[13] : data.scope;
    const parts = [l[0] + ' ' + (q.name || '') + ',', l[1], l[2] + ': ' + data.service, l[3] + ': ' + data.scope, l[4] + ': ' + date + ', ' + (data.time || '—') + ' (Europe/Madrid)', l[5] + ': ' + data.location, l[6] + ': ' + data.meeting, l[7] + ': ' + price, l[8] + ': ' + access, l[9] + ': ' + data.contact];
    if (data.notes) parts.push(l[10] + ': ' + data.notes);
    parts.push(l[11], 'Paul\nCave Homes Spain\nhttps://cavehomesspain.com');
    return parts.join('\n\n');
  }
  function update() {
    if (!state) return;
    field('bookingPreview').value = body(values(), state.q);
    const saved = state.saved && !state.dirty;
    field('bookingSave').disabled = busy;
    field('bookingConfirm').disabled = busy || !saved || !field('bookingAgreed').checked;
    field('bookingCopy').disabled = busy || !saved || !state.previous?.booking_confirmed_at;
    field('bookingClose').disabled = busy;
    fields.forEach(name => { field('booking' + name).disabled = busy; });
    field('bookingAgreed').disabled = busy;
  }
  function createDialog() {
    if (dialog) return;
    dialog = document.createElement('dialog'); dialog.id = 'bookingDialog'; dialog.className = 'followup-dialog'; dialog.setAttribute('aria-labelledby', 'bookingTitle');
    dialog.innerHTML = `<div class="inquiry-reader-head"><h2 id="bookingTitle">Booking confirmation</h2><button id="bookingClose" class="inquiry-reader-close" type="button" aria-label="Close booking confirmation">×</button></div><p id="bookingBuyer"></p><p class="followup-private">Save privately, check the arrangements, then confirm the booking and copy the message into WhatsApp. Nothing is sent automatically.</p><form id="bookingForm"><div class="followup-fields">
      <div class="field"><label for="bookingLanguage">Message language</label><select id="bookingLanguage"><option value="en">English</option><option value="es">Español</option><option value="fr">Français</option><option value="de">Deutsch</option><option value="nl">Nederlands</option></select><small>Translate the service and your own wording into the selected language before sharing.</small></div>
      <div class="field"><label for="bookingService">Agreed service *</label><input id="bookingService" required maxlength="500"></div>
      <div class="field followup-notes"><label for="bookingScope">What is included *</label><textarea id="bookingScope" rows="3" required maxlength="2500"></textarea></div>
      <div class="field"><label for="bookingDate">Visit date *</label><input id="bookingDate" type="date" required></div>
      <div class="field"><label for="bookingTime">Time in Spain *</label><input id="bookingTime" type="time" required><small>Local Spain time (Europe/Madrid).</small></div>
      <div class="field followup-notes"><label for="bookingLocation">Property address or area *</label><textarea id="bookingLocation" rows="2" required maxlength="500"></textarea></div>
      <div class="field followup-notes"><label for="bookingMeeting">Meeting point or video delivery arrangements *</label><textarea id="bookingMeeting" rows="2" required maxlength="500"></textarea></div>
      <div class="field"><label for="bookingPrice">Agreed total price (€) *</label><input id="bookingPrice" type="number" min="0" max="99999999.99" step="0.01" inputmode="decimal" required></div>
      <div class="field"><label for="bookingAccess">Agreed access *</label><select id="bookingAccess" required><option value="">Choose access arrangements</option><option value="interior">Interior access confirmed</option><option value="exterior">Exterior and area only</option><option value="area">Area visit / coordination — see included work</option></select><small>Only select interior access after permission is confirmed.</small></div>
      <div class="field followup-notes"><label for="bookingContact">Contact on the day *</label><input id="bookingContact" required maxlength="500" placeholder="Name and phone / WhatsApp"></div>
      <div class="field followup-notes"><label for="bookingNotes">Additional arrangements for the customer</label><textarea id="bookingNotes" rows="2" maxlength="2500"></textarea><small>Private follow-up notes are never added to this message.</small></div>
      <div class="field followup-notes"><label for="bookingPreview">Customer message preview</label><textarea id="bookingPreview" class="quote-preview" rows="14" readonly></textarea></div>
      </div><label><input id="bookingAgreed" type="checkbox"> The customer has agreed the service, total price, date and access arrangements.</label><div class="followup-save"><button id="bookingSave" class="btn green" type="submit">Save draft</button><button id="bookingConfirm" class="secondary" type="button" disabled>Confirm booking</button><button id="bookingCopy" class="secondary" type="button" disabled>Copy for WhatsApp</button><p id="bookingStatus" role="status" aria-live="polite"></p></div></form>`;
    document.body.appendChild(dialog); form = field('bookingForm');
    field('bookingClose').onclick = () => { if (!busy) dialog.close(); };
    dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
    dialog.addEventListener('close', () => { state = null; returnFocus?.focus?.(); });
    form.addEventListener('input', event => {
      if (!state || event.target === field('bookingPreview')) return;
      if (event.target !== field('bookingAgreed')) { state.dirty = true; field('bookingAgreed').checked = false; field('bookingStatus').textContent = 'Changes are not saved. Save and confirm the updated arrangements before sharing.'; }
      update();
    });
    form.addEventListener('submit', saveDraft);
    field('bookingConfirm').onclick = confirmBooking;
    field('bookingCopy').onclick = copyMessage;
  }
  function open(q, record, db, refresh, trigger) {
    createDialog();
    state = { q, previous: record.updated_at ? { ...record } : null, db, refresh, generation, dirty: false, saved: !!record.booking_saved_at };
    returnFocus = trigger;
    const data = { language: 'en', service: record.quote_service || 'Property Viewing & Local Support', scope: record.quote_scope || '', price: record.quoted_price ?? '', location: q.property_title || '', contact: '', ...record.booking_details };
    fields.forEach(name => { field('booking' + name).value = data[name.toLowerCase()] ?? ''; });
    field('bookingBuyer').textContent = (q.name || 'Enquirer') + ' · ' + (q.email || '');
    field('bookingAgreed').checked = !!record.booking_confirmed_at;
    field('bookingStatus').textContent = record.booking_confirmed_at ? 'Confirmed booking ready to review and copy.' : record.booking_saved_at ? 'Saved draft. Confirm the agreed arrangements before sharing.' : '';
    update(); dialog.showModal(); field('bookingService').focus();
  }
  async function persist(current, payload) {
    let result;
    if (current.previous) result = await current.db.from('enquiry_followups').update(payload).eq('enquiry_id', current.q.id).eq('updated_at', current.previous.updated_at).select('*').maybeSingle();
    else result = await current.db.from('enquiry_followups').insert({ enquiry_id: current.q.id, stage: ['contacted','replied'].includes(current.q.status) ? 'contacted' : 'new', ...payload }).select('*').single();
    if (result.error) throw result.error;
    if (!result.data) throw { code: 'CONFLICT' };
    if (current.generation !== generation) return false;
    current.previous = result.data;
    await current.refresh();
    return current.generation === generation;
  }
  async function failure(error, current) {
    if (error.code === 'CONFLICT' || error.code === '23505') await current.refresh();
    if (current.generation === generation && state === current) field('bookingStatus').textContent = ['CONFLICT','23505'].includes(error.code) ? 'This enquiry changed in another session. Your draft is still here; copy any edits you need, then close and reopen to load the latest details.' : 'Could not save. Your entries are still here. Check your connection and admin access, then try again.';
  }
  async function saveDraft(event) {
    event.preventDefault(); if (!state || busy || !form.reportValidity()) return;
    const data = values(); if (!valid(data)) { field('bookingStatus').textContent = 'Please check the required booking details and price.'; return; }
    const current = state; busy = true; update(); field('bookingStatus').textContent = 'Saving private draft…';
    try {
      const time = new Date().toISOString();
      if (!await persist(current, { booking_details: data, booking_saved_at: time, booking_confirmed_at: null, updated_at: time })) return;
      current.saved = true; current.dirty = false; field('bookingAgreed').checked = false;
      field('bookingStatus').textContent = 'Draft saved privately. Check the preview, tick the agreement box and confirm the booking.';
    } catch (error) { await failure(error, current); }
    finally { busy = false; if (state) update(); }
  }
  async function confirmBooking() {
    if (!state?.saved || state.dirty || busy || !field('bookingAgreed').checked || !valid(values())) return;
    const current = state; busy = true; update(); field('bookingStatus').textContent = 'Confirming booking…';
    try {
      const time = new Date().toISOString();
      if (!await persist(current, { stage: current.previous.stage === 'completed' ? 'completed' : 'booked', booking_confirmed_at: time, updated_at: time })) return;
      field('bookingStatus').textContent = 'Booking confirmed and tracker updated. Review the message, then copy it into WhatsApp.';
    } catch (error) { await failure(error, current); }
    finally { busy = false; if (state) update(); }
  }
  async function copyMessage() {
    if (!state?.saved || state.dirty || busy || !state.previous?.booking_confirmed_at) return;
    const current = state, text = body(values(), current.q);
    try {
      await navigator.clipboard.writeText(text);
      if (state === current) field('bookingStatus').textContent = 'Copied. Open WhatsApp and paste into the customer’s chat.';
    } catch (_) {
      if (state !== current) return;
      field('bookingPreview').focus(); field('bookingPreview').select();
      field('bookingStatus').textContent = 'Automatic copy is unavailable. The message is selected; use Copy, then paste into WhatsApp.';
    }
  }
  function decorate(card, q, record, db, refresh, available) {
    const actions = card.querySelector('.inquiry-actions'); if (!actions) return;
    const button = document.createElement('button'); button.type = 'button'; button.className = 'secondary booking-edit'; button.textContent = record.booking_saved_at ? 'Review booking' : 'Booking confirmation'; button.disabled = !available;
    button.onclick = () => { if (available) open(q, record, db, refresh, button); };
    actions.appendChild(button);
  }
  function reset() {
    generation++; state = null;
    if (dialog?.open) dialog.close();
    if (form) form.querySelectorAll('input,textarea').forEach(input => { input.value = ''; input.checked = false; });
    if (dialog) { field('bookingBuyer').textContent = ''; field('bookingStatus').textContent = ''; }
  }
  window.CHSOwnerBookings = { open, decorate, reset };
})();
