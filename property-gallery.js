(function () {
  'use strict';
  const main = document.querySelector('main[data-property-id]');
  if (!main) return;
  const copy = {
    en: ['View full-screen photos', 'Close photos', 'Previous photo', 'Next photo', 'Photo', 'Zoom in', 'Zoom out', 'Swipe to browse · Tap zoom for details'],
    es: ['Ver fotos a pantalla completa', 'Cerrar fotos', 'Foto anterior', 'Foto siguiente', 'Foto', 'Ampliar', 'Reducir', 'Desliza para ver fotos · Amplía para ver detalles'],
    'fr-BE': ['Voir les photos en plein écran', 'Fermer les photos', 'Photo précédente', 'Photo suivante', 'Photo', 'Agrandir', 'Réduire', 'Balayez pour parcourir · Agrandissez pour voir les détails'],
    de: ['Fotos im Vollbild ansehen', 'Fotos schließen', 'Vorheriges Foto', 'Nächstes Foto', 'Foto', 'Vergrößern', 'Verkleinern', 'Zum Blättern wischen · Für Details vergrößern'],
    nl: ['Foto’s op volledig scherm', 'Foto’s sluiten', 'Vorige foto', 'Volgende foto', 'Foto', 'Inzoomen', 'Uitzoomen', 'Veeg om te bladeren · Zoom in voor details']
  };
  let dialog, images = [], index = 0, zoomed = false, opener, oldOverflow, gesture;
  const words = () => copy[document.documentElement.lang] || copy.en;
  function create() {
    if (dialog) return;
    dialog = document.createElement('dialog'); dialog.className = 'property-photo-dialog'; dialog.id = 'propertyPhotoDialog'; dialog.setAttribute('aria-labelledby','photoViewerTitle');
    dialog.innerHTML = '<header class="photo-viewer-head"><h2 id="photoViewerTitle"></h2><button type="button" id="photoViewerClose"></button></header><div class="photo-viewer-stage" id="photoViewerStage"><img id="photoViewerImage" alt=""></div><div class="photo-viewer-controls"><button type="button" id="photoViewerPrev">←</button><span id="photoViewerCount" role="status" aria-live="polite"></span><button type="button" id="photoViewerNext">→</button><button type="button" id="photoViewerZoom"></button></div><p class="photo-viewer-hint" id="photoViewerHint"></p>';
    document.body.appendChild(dialog);
    dialog.querySelector('#photoViewerClose').onclick = () => dialog.close();
    dialog.querySelector('#photoViewerPrev').onclick = () => move(-1);
    dialog.querySelector('#photoViewerNext').onclick = () => move(1);
    dialog.querySelector('#photoViewerZoom').onclick = () => { zoomed = !zoomed; update(); };
    dialog.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); move(event.key === 'ArrowLeft' ? -1 : 1); }
    });
    dialog.addEventListener('close', () => {
      document.body.style.overflow = oldOverflow;
      zoomed = false; gesture = null;
      const thumb = main.querySelector('[data-photo="' + index + '"]');
      if (thumb) thumb.click();
      opener?.focus?.();
    });
    const stage = dialog.querySelector('#photoViewerStage');
    stage.addEventListener('touchstart', event => { gesture = !zoomed && event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null; }, { passive: true });
    stage.addEventListener('touchmove', event => { if (event.touches.length !== 1) gesture = null; }, { passive: true });
    stage.addEventListener('touchcancel', () => { gesture = null; });
    stage.addEventListener('touchend', event => {
      if (!gesture || zoomed || !event.changedTouches.length || event.touches.length) { gesture = null; return; }
      const dx = event.changedTouches[0].clientX - gesture.x, dy = event.changedTouches[0].clientY - gesture.y;
      gesture = null;
      if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) * 1.5) move(dx < 0 ? 1 : -1);
    }, { passive: true });
  }
  function move(delta) {
    const next = Math.max(0, Math.min(images.length - 1, index + delta));
    if (next === index) return;
    index = next; zoomed = false; update();
  }
  function update() {
    const w = words(), image = dialog.querySelector('#photoViewerImage'), stage = dialog.querySelector('#photoViewerStage');
    image.src = images[index]; image.alt = (main.querySelector('h1')?.textContent || 'Cave Homes Spain') + ' · ' + w[4] + ' ' + (index + 1);
    stage.classList.toggle('zoomed', zoomed); stage.scrollTop = 0; stage.scrollLeft = 0;
    dialog.querySelector('#photoViewerCount').textContent = w[4] + ' ' + (index + 1) + ' / ' + images.length;
    dialog.querySelector('#photoViewerPrev').disabled = index === 0;
    dialog.querySelector('#photoViewerNext').disabled = index === images.length - 1;
    dialog.querySelector('#photoViewerZoom').textContent = zoomed ? w[6] : w[5];
    dialog.querySelector('#photoViewerZoom').setAttribute('aria-pressed', String(zoomed));
  }
  function open(trigger) {
    const current = main.querySelector('#v16Photo'); if (!current) return;
    images = [...main.querySelectorAll('.property-thumbs img')].map(img => img.src).filter(Boolean);
    if (!images.length) images = [current.src];
    index = Math.max(0, images.indexOf(current.src));
    create(); opener = trigger; zoomed = false;
    const w = words();
    dialog.querySelector('#photoViewerTitle').textContent = main.querySelector('h1')?.textContent || 'Cave Homes Spain';
    dialog.querySelector('#photoViewerClose').textContent = w[1] + ' ×';
    dialog.querySelector('#photoViewerPrev').setAttribute('aria-label', w[2]);
    dialog.querySelector('#photoViewerNext').setAttribute('aria-label', w[3]);
    dialog.querySelector('#photoViewerHint').textContent = w[7];
    update(); oldOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    dialog.showModal(); dialog.querySelector('#photoViewerClose').focus();
    window.chsWebsiteEvent?.('property_gallery_open', { property_id: main.dataset.propertyId });
  }
  function enhance() {
    const stage = main.querySelector('.v16-photo-stage'); if (!stage || stage.querySelector('.open-photo-viewer')) return;
    const button = document.createElement('button'); button.type = 'button'; button.className = 'open-photo-viewer'; button.textContent = words()[0]; button.onclick = () => open(button); stage.appendChild(button);
    const image = stage.querySelector('#v16Photo'); if (image) { image.classList.add('photo-expandable'); image.onclick = () => open(button); }
  }
  new MutationObserver(enhance).observe(main, { childList: true, subtree: true });
  enhance();
})();
