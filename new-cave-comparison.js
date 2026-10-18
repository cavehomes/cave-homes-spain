(function () {
  'use strict';
  const propertyId = '6e2a0e07-ceb7-4f23-91cf-c78f8c5fdffc';
  const original = 'https://lesgzlhvrlxgtfuocadq.supabase.co/storage/v1/object/public/property-images/e92670c1-d0f3-4d20-a7e6-bcebb225f902.jpg';
  const concept = '/ai-concepts/cave-renovation-benamaurel-6e2a0e07.webp';
  const standalone = location.pathname === '/property/cave-for-renovation-project-benamaurel-6e2a0e07.html';
  const image = standalone ? document.querySelector('main > img') : document.getElementById('galleryMain');
  if (!image) return;
  const labels = {
    en: ['Current photo', 'AI renovation concept', 'Slide to compare the current cave with an AI renovation concept'],
    es: ['Foto actual', 'Concepto de reforma con IA', 'Desliza para comparar la cueva actual con un concepto de reforma con IA'],
    'fr-BE': ['Photo actuelle', 'Projet de rénovation par IA', 'Comparer la grotte actuelle au projet de rénovation par IA'],
    de: ['Aktuelles Foto', 'KI-Renovierungsidee', 'Aktuelle Höhle mit der KI-Renovierungsidee vergleichen'],
    nl: ['Huidige foto', 'AI-renovatieconcept', 'Vergelijk de huidige grot met het AI-renovatieconcept']
  };
  const style = document.createElement('style');
  style.textContent = '.chs-cave-photo{position:relative}.chs-cave-photo>img{display:block}.chs-cave-layer{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:1;clip-path:inset(0 0 0 var(--chs-split,100%))}.chs-cave-layer img{display:block!important;width:100%!important;height:100%!important;max-height:none!important;object-fit:cover!important;border-radius:inherit!important;margin:0!important}.chs-cave-control{position:absolute;inset:0;z-index:5;pointer-events:none}.chs-cave-control input{position:absolute;left:5%;bottom:45px;width:90%;height:36px;margin:0;padding:0 12px;border:1px solid #fff;border-radius:999px;background:#fffe;accent-color:#315d43;pointer-events:auto;touch-action:pan-x;cursor:ew-resize}.chs-cave-control input:focus-visible{outline:3px solid #ad5535;outline-offset:3px}.chs-cave-labels{position:absolute;left:12px;right:12px;bottom:88px;display:flex;justify-content:space-between;gap:8px}.chs-cave-labels span{background:#16392ce8;color:#fff;border-radius:999px;padding:6px 10px;font:700 12px/1.2 Arial,sans-serif}.chs-cave-control[hidden],.chs-cave-layer[hidden]{display:none!important}';
  document.head.appendChild(style);
  let stage = image.parentElement;
  if (standalone) {
    const wrapper = document.createElement('div');
    wrapper.className = 'chs-cave-photo';
    wrapper.style.margin = image.style.margin;
    wrapper.style.borderRadius = image.style.borderRadius;
    wrapper.style.overflow = 'hidden';
    image.style.margin = '0';
    image.replaceWith(wrapper);
    wrapper.appendChild(image);
    stage = wrapper;
  }
  const layer = document.createElement('div');
  layer.className = 'chs-cave-layer';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = '<img src="' + concept + '" alt="" loading="lazy" decoding="async">';
  const controls = document.createElement('div');
  controls.className = 'chs-cave-control';
  controls.innerHTML = '<div class="chs-cave-labels"><span></span><span></span></div><input type="range" min="0" max="100" value="100">';
  const range = controls.querySelector('input');
  range.oninput = () => stage.style.setProperty('--chs-split', range.value + '%');
  ['click', 'touchstart', 'touchend'].forEach(name => range.addEventListener(name, event => event.stopPropagation()));
  stage.append(layer, controls);
  function update() {
    const show = image.src === original && (standalone || window.CHSActiveHome?.id === propertyId);
    layer.hidden = controls.hidden = !show;
    range.value = '100';
    stage.style.setProperty('--chs-split', '100%');
    const words = labels[document.documentElement.lang] || labels.en;
    controls.querySelectorAll('span').forEach((span, i) => span.textContent = words[i]);
    range.setAttribute('aria-label', words[2]);
  }
  const observer = new MutationObserver(update);
  observer.observe(image, { attributes: true, attributeFilter: ['src'] });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  const modal = document.getElementById('propertyModal');
  if (modal) observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
  update();
})();
