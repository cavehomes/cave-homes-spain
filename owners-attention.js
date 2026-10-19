(function () {
  'use strict';
  const closed = new Set(['completed', 'cancelled', 'canceled', 'rejected', 'sold', 'withdrawn']);
  const support = q => /^(?:Buyer Assistance|Property Viewing & Local Support|Viewing & Local Support)(?:\s*[—–-]|\s+enquiry|\s+request)/i.test(String(q.subject || ''));
  const day = date => {
    const parts = new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Madrid', year:'numeric', month:'2-digit', day:'2-digit'}).formatToParts(date);
    return ['year','month','day'].map(key => parts.find(part => part.type === key).value).join('-');
  };
  function enquiryView(q) {
    const message = String(q.message || '');
    if (message.startsWith('PROPERTY_MATCH:')) return 'buyerRequests';
    if (/^(?:PROPERTY|RENTAL|BUSINESS)_APPLICATION:/.test(message)) return 'approvals';
    try { if (JSON.parse(message)?.submission_type === 'long_term_rental') return 'approvals'; } catch (_) {}
    return support(q) ? 'buyer' : 'inquiries';
  }
  function listingIssues(p) {
    const missing = [];
    if (!String(p.title || '').trim()) missing.push('title');
    if (!String(p.town || '').trim()) missing.push('town');
    if (!String(p.description || '').trim()) missing.push('description');
    if (p.price == null || !Number.isFinite(Number(p.price))) missing.push('price');
    if (!p.main_image_url && !p.image_urls?.length) missing.push('photo');
    return missing;
  }
  function build(data, now = new Date()) {
    const today = day(now), end = new Date(today + 'T12:00:00Z'); end.setUTCDate(end.getUTCDate() + 7);
    const through = end.toISOString().slice(0,10), enquiries = data.enquiries || [], followups = data.followups || [];
    const byId = new Map(enquiries.map(q => [String(q.id), q]));
    const inquiryItem = (q, detail) => ({id:q.id, view:enquiryView(q), title:q.name || q.buyer_name || q.property_title || 'Website enquiry', detail:detail || q.subject || q.property_title || 'New message', kind:'enquiry'});
    const unread = enquiries.filter(q => q.status === 'new' && enquiryView(q) !== 'approvals')
      .sort((a,b) => String(b.created_at || '').localeCompare(String(a.created_at || ''))).map(q => inquiryItem(q));
    const due = followups.filter(r => r.stage !== 'completed' && r.follow_up_date && r.follow_up_date <= today && byId.has(String(r.enquiry_id)) && !closed.has(byId.get(String(r.enquiry_id)).status) && support(byId.get(String(r.enquiry_id))))
      .sort((a,b) => a.follow_up_date.localeCompare(b.follow_up_date))
      .map(r => inquiryItem(byId.get(String(r.enquiry_id)), (r.follow_up_date < today ? 'Overdue · ' : 'Due today · ') + r.follow_up_date));
    const jobs = [];
    followups.forEach(r => {
      const q = byId.get(String(r.enquiry_id)), date = r.booking_details?.date;
      if (!q || !support(q) || closed.has(q.status) || r.stage !== 'booked' || !r.booking_confirmed_at || !/^\d{4}-\d{2}-\d{2}$/.test(date || '') || date > through) return;
      jobs.push({...inquiryItem(q), kind:'booking', sort:date + 'T' + (r.booking_details.time || '00:00'), detail:(date < today ? 'Visit overdue · ' : 'Confirmed visit · ') + date + (r.booking_details.time ? ' at ' + r.booking_details.time + ' (Spain)' : '')});
    });
    (data.care || []).forEach(job => {
      if (closed.has(job.status) || !job.scheduled_for || !Number.isFinite(Date.parse(job.scheduled_for))) return;
      const date = day(new Date(job.scheduled_for)); if (date > through) return;
      const time = new Date(job.scheduled_for).toLocaleTimeString('en-GB', {timeZone:'Europe/Madrid', hour:'2-digit',minute:'2-digit'});
      jobs.push({id:job.id, view:'care', kind:'care', title:job.title || 'Property Care job', sort:date + 'T' + time, detail:(date < today ? 'Overdue · ' : job.priority === 'urgent' ? 'Urgent · ' : 'Property Care · ') + date + ' at ' + time + ' (Spain)'});
    });
    jobs.sort((a,b) => a.sort.localeCompare(b.sort));
    const listings = (data.properties || []).filter(p => !closed.has(p.status) && p.status !== 'reserved').flatMap(p => {
      const missing = listingIssues(p); if (p.published && !missing.length) return [];
      return [{id:p.id, view:p.published ? 'live' : 'drafts', kind:'property', title:p.title || 'Untitled property', detail:(!p.published ? 'Private draft' : 'Live listing') + (missing.length ? ' · Missing ' + missing.join(', ') : ' · Ready to review'), sort:missing.length ? 0 : 1}];
    }).sort((a,b) => a.sort - b.sort || a.title.localeCompare(b.title));
    return [
      {key:'messages', title:'New enquiries', hint:'Property, viewing and buyer search messages', items:unread, unavailable:data.enquiries === null, empty:'No unread enquiries.'},
      {key:'followups', title:'Follow-ups due', hint:'Viewing & Local Support · today or overdue', items:due, unavailable:data.enquiries === null || data.followups === null, empty:'No follow-ups due.'},
      {key:'jobs', title:'Visits & jobs', hint:'Overdue and the next 7 days · Spain time', items:jobs, unavailable:data.care === null && (data.followups === null || data.enquiries === null), partial:data.care === null || data.followups === null || data.enquiries === null, empty:'No scheduled work in the next 7 days.'},
      {key:'listings', title:'Listings to finish', hint:'Private drafts and missing listing details', items:listings, unavailable:data.properties === null, empty:'No unfinished listings.'}
    ];
  }
  let options, panel, grid, status, refreshButton, userId = null, generation = 0, pending = null, timer, loadedAt = 0, dirty = true;
  function visible() { return panel && !panel.closest('#homeView').classList.contains('hidden') && document.visibilityState !== 'hidden'; }
  function render(groups) {
    grid.replaceChildren();
    groups.forEach(group => {
      const article = document.createElement('article'); article.className = 'owner-attention-card'; article.dataset.group = group.key;
      const heading = document.createElement('h3'); heading.textContent = group.title;
      const count = document.createElement('strong'); count.className = 'owner-attention-count'; count.textContent = group.unavailable || (group.partial && !group.items.length) ? '—' : String(group.items.length) + (group.partial ? '+' : ''); heading.appendChild(count);
      const hint = document.createElement('p'); hint.className = 'owner-attention-hint'; hint.textContent = group.hint;
      article.append(heading, hint);
      if (group.unavailable || group.partial) { const warning = document.createElement('p'); warning.className = 'owner-attention-warning'; warning.textContent = group.unavailable ? 'Could not load this list. Tap Refresh to try again.' : 'Some jobs could not be loaded. Tap Refresh to check the full list.'; article.appendChild(warning); }
      if (!group.unavailable && group.items.length) {
        const list = document.createElement('ul');
        group.items.forEach((item, index) => {
          const row = document.createElement('li'); row.hidden = index >= 3;
          const button = document.createElement('button'); button.type = 'button'; button.className = 'owner-attention-item';
          const title = document.createElement('b'); title.textContent = item.title;
          const detail = document.createElement('span'); detail.textContent = item.detail;
          button.append(title, detail); button.onclick = async () => {
            button.disabled = true;
            try { await options.open(item); }
            catch (_) { status.textContent = 'This item could not be opened. Refresh and try again.'; }
            finally { button.disabled = false; }
          }; row.appendChild(button); list.appendChild(row);
        }); article.appendChild(list);
        if (group.items.length > 3) {
          const more = document.createElement('button'); more.type = 'button'; more.className = 'owner-attention-more'; more.textContent = 'Show all ' + group.items.length;
          let expanded = false; more.onclick = () => { expanded = !expanded; [...list.children].forEach((row,i) => { row.hidden = !expanded && i >= 3; }); more.textContent = expanded ? 'Show fewer' : 'Show all ' + group.items.length; };
          article.appendChild(more);
        }
      } else if (!group.unavailable && !group.partial) { const empty = document.createElement('p'); empty.className = 'owner-attention-empty'; empty.textContent = group.empty; article.appendChild(empty); }
      grid.appendChild(article);
    });
  }
  async function refresh(force = false) {
    if (!options || !userId || !visible() || pending) return;
    if (!force && !dirty && Date.now() - loadedAt < 30000) return;
    const token = generation; dirty = false;
    refreshButton.disabled = true; panel.setAttribute('aria-busy','true'); status.textContent = 'Checking what needs attention…';
    const request = (async () => {
      const queries = [
        () => options.db.from('enquiries').select('id,name,buyer_name,subject,property_title,message,status,created_at'),
        () => options.db.from('enquiry_followups').select('enquiry_id,stage,follow_up_date,booking_details,booking_confirmed_at'),
        () => options.db.from('care_jobs').select('id,title,scheduled_for,priority,status'),
        () => options.db.from('properties').select('id,title,town,description,price,main_image_url,image_urls,published,status')
      ];
      const results = await Promise.allSettled(queries.map(query => Promise.resolve().then(query)));
      if (token !== generation || !userId) return;
      const data = {};
      ['enquiries','followups','care','properties'].forEach((key,i) => { const r = results[i]; data[key] = r.status === 'fulfilled' && !r.value.error && Array.isArray(r.value.data) ? r.value.data : null; });
      render(build(data)); loadedAt = Date.now();
      const failed = Object.values(data).some(value => value === null);
      status.textContent = failed ? 'Some information could not be loaded. Refresh to try again.' : 'Updated ' + new Date().toLocaleTimeString('en-GB', {timeZone:'Europe/Madrid',hour:'2-digit',minute:'2-digit'}) + ' · Spain time';
    })();
    pending = request;
    try { await request; }
    finally {
      if (pending === request) pending = null;
      if (token === generation) { refreshButton.disabled = false; panel.setAttribute('aria-busy','false'); if (dirty) changed(); }
    }
  }
  function changed() { dirty = true; clearTimeout(timer); timer = setTimeout(() => refresh(), 250); }
  function session(id) {
    if (id === userId) return;
    userId = id; generation++; pending = null; loadedAt = 0; dirty = true; clearTimeout(timer);
    grid?.replaceChildren(); if (status) status.textContent = id ? 'Checking what needs attention…' : '';
    if (refreshButton) refreshButton.disabled = false;
    panel?.setAttribute('aria-busy','false');
    if (id) refresh();
  }
  function init(config) {
    if (options) return; options = config;
    const home = document.getElementById('homeView'); if (!home) return;
    panel = document.createElement('section'); panel.className = 'owner-attention'; panel.id = 'ownerAttention'; panel.setAttribute('aria-labelledby','ownerAttentionTitle');
    panel.innerHTML = '<div class="owner-attention-header"><div><h2 id="ownerAttentionTitle">Needs your attention</h2><p>A quick look at what to do next.</p></div><button type="button" class="owner-attention-refresh">Refresh</button></div><p class="owner-attention-status" role="status" aria-live="polite">Sign in to see your tasks.</p><div class="owner-attention-grid"></div>';
    home.prepend(panel); grid = panel.querySelector('.owner-attention-grid'); status = panel.querySelector('.owner-attention-status'); refreshButton = panel.querySelector('.owner-attention-refresh'); refreshButton.onclick = () => refresh(true);
    window.addEventListener('focus', () => refresh());
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refresh(); });
  }
  window.CHSOwnerAttention = {init, session, refresh, changed, build};
})();
