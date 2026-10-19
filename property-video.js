(function () {
  'use strict';
  function parse(value) {
    if (typeof value !== 'string' || !value.trim() || value.length > 2048) return null;
    let url; try { url = new URL(value.trim()); } catch (_) { return null; }
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase(), path = url.pathname.split('/').filter(Boolean);
    let id;
    if (['youtube.com','www.youtube.com','m.youtube.com','youtube-nocookie.com','www.youtube-nocookie.com','youtu.be','www.youtu.be'].includes(host)) {
      id = host.endsWith('youtu.be') ? path[0] : ['embed','shorts','live'].includes(path[0]) ? path[1] : url.searchParams.get('v');
      return /^[\w-]{11}$/.test(id || '') ? {kind:'youtube',url:url.href,embed:'https://www.youtube-nocookie.com/embed/'+id} : null;
    }
    if (['vimeo.com','www.vimeo.com','player.vimeo.com'].includes(host)) {
      id = path[0] === 'video' ? path[1] : path[0];
      const hash = url.searchParams.get('h') || (path[0] !== 'video' ? path[1] : '');
      if (!/^\d{5,12}$/.test(id || '') || (hash && !/^[a-zA-Z0-9]{6,32}$/.test(hash))) return null;
      return {kind:'vimeo',url:url.href,embed:'https://player.vimeo.com/video/'+id+(hash?'?h='+encodeURIComponent(hash):'')};
    }
    if (/\.(mp4|webm)$/i.test(url.pathname)) return {kind:'file',url:url.href};
    return null;
  }
  const translations = {
    en:['Property video','Watch video','Open video separately','This video could not be played here. Try opening it separately.'],
    es:['Vídeo de la propiedad','Ver vídeo','Abrir vídeo por separado','No se ha podido reproducir el vídeo aquí. Prueba a abrirlo por separado.'],
    fr:['Vidéo du bien','Voir la vidéo','Ouvrir la vidéo séparément','Cette vidéo ne peut pas être lue ici. Essayez de l’ouvrir séparément.'],
    de:['Immobilienvideo','Video ansehen','Video separat öffnen','Dieses Video konnte hier nicht abgespielt werden. Öffnen Sie es separat.'],
    nl:['Woningvideo','Video bekijken','Video apart openen','Deze video kan hier niet worden afgespeeld. Probeer deze apart te openen.']
  };
  function mount(container, home, language) {
    if (!container) return;
    stop(container); container.replaceChildren();
    const video = parse(home?.video_url); container.hidden = !video; if (!video) return;
    if (!document.getElementById('propertyVideoStyles')) {
      const css = document.createElement('link'); css.id = 'propertyVideoStyles'; css.rel = 'stylesheet'; css.href = '/property-video.css?v=20261019'; document.head.appendChild(css);
    }
    const words = translations[(language || document.documentElement.lang || 'en').slice(0,2)] || translations.en;
    const section = document.createElement('section'); section.className = 'property-video';
    const heading = document.createElement('h2'); heading.textContent = words[0]; section.appendChild(heading);
    const stage = document.createElement('div'); stage.className = 'property-video-stage'; section.appendChild(stage);
    const poster = (() => { try { const u = new URL(home.main_image_url); return /^https?:$/.test(u.protocol) ? u.href : ''; } catch (_) { return ''; } })();
    const error = document.createElement('p'); error.className = 'property-video-error'; error.hidden = true; error.textContent = words[3];
    const track = () => window.chsWebsiteEvent?.('property_video_play',{property_id:home.id});
    if (video.kind === 'file') {
      const player = document.createElement('video'); player.controls = true; player.playsInline = true; player.preload = 'none'; player.src = video.url;
      if (poster) player.poster = poster;
      player.setAttribute('aria-label',words[0]+': '+(home.title || 'Cave Homes Spain'));
      player.addEventListener('play',track,{once:true}); player.addEventListener('error',() => { error.hidden = false; }); stage.appendChild(player);
    } else {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'property-video-play';
      if (poster) { const image = document.createElement('img'); image.src = poster; image.alt = ''; image.loading = 'lazy'; button.appendChild(image); }
      const label = document.createElement('span'); label.textContent = '▶ '+words[1]; button.appendChild(label);
      button.onclick = () => {
        const iframe = document.createElement('iframe'); const embed = new URL(video.embed); embed.searchParams.set('autoplay','1');
        iframe.src = embed.href; iframe.title = words[0]+': '+(home.title || 'Cave Homes Spain'); iframe.allow = 'autoplay; fullscreen; picture-in-picture'; iframe.allowFullscreen = true; iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        stage.replaceChildren(iframe); track();
      }; stage.appendChild(button);
    }
    section.appendChild(error);
    const link = document.createElement('a'); link.href = video.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = words[2]+' ↗'; section.appendChild(link); container.appendChild(section);
  }
  function stop(container) {
    container?.querySelectorAll('video').forEach(video => { video.pause(); video.removeAttribute('src'); video.load(); });
    container?.querySelectorAll('iframe').forEach(frame => frame.removeAttribute('src'));
  }
  window.CHSPropertyVideo = {parse,mount,stop};
})();
