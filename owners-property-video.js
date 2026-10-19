(function () {
  'use strict';
  const bucket = 'property-videos', maxBytes = 50 * 1024 * 1024;
  const base = 'https://lesgzlhvrlxgtfuocadq.supabase.co/storage/v1/object/public/'+bucket+'/';
  let original = '', generation = 0, upload, previewUrl;
  const field = id => document.getElementById(id);
  function fileType(file) {
    const extension = /\.(mp4|webm)$/i.exec(file.name || '')?.[1].toLowerCase();
    if (!extension || (file.type && file.type !== 'video/'+extension)) throw Error('Please choose an MP4 or WebM video.');
    if (!file.size || file.size > maxBytes) throw Error('Please choose a video smaller than 50 MB, or use a video link.');
    return 'video/'+extension;
  }
  function validate() {
    const file = field('propertyVideoFile').files[0], text = field('propertyVideoUrl').value.trim();
    if (file && text) throw Error('Choose either a video file or a video link, not both.');
    if (file) fileType(file);
    const parsed = text ? window.CHSPropertyVideo.parse(text) : null;
    if (text && !parsed) throw Error('Use an HTTPS YouTube, Vimeo, MP4 or WebM video link.');
    return {file,url:parsed?.url || null,original,token:generation};
  }
  function preview() {
    if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
    const target = field('ownerVideoPreview'); target.replaceChildren();
    const file = field('propertyVideoFile').files[0];
    if (file) {
      try { fileType(file); } catch (error) { field('ownerVideoStatus').textContent = error.message; return; }
      const player = document.createElement('video'); previewUrl = URL.createObjectURL(file); player.src = previewUrl; player.controls = true; player.playsInline = true; player.preload = 'metadata'; target.appendChild(player);
    } else window.CHSPropertyVideo.mount(target,{video_url:field('propertyVideoUrl').value},'en');
  }
  function load(url = '') {
    generation++; if (upload) { upload.ownerCancel?.(); upload.abort().catch(() => {}); upload = null; }
    original = url || ''; field('propertyVideoFile').value = ''; field('propertyVideoUrl').value = original;
    field('ownerVideoStatus').textContent = ''; field('ownerVideoProgress').hidden = true; preview();
  }
  function ownedPath(url, userId) {
    if (!url || !url.startsWith(base)) return null;
    const path = url.slice(base.length); return path.startsWith(userId+'/') && /^[a-zA-Z0-9_./-]+$/.test(path) && !path.includes('..') ? path : null;
  }
  async function remove(db, url) {
    const {data} = await db.auth.getSession(); const userId = data.session?.user?.id;
    const path = userId && ownedPath(url,userId); if (!path) return;
    const references = await db.from('properties').select('id').eq('video_url',url).limit(1);
    if (references.error) throw references.error;
    if (references.data?.length) return;
    const result = await db.storage.from(bucket).remove([path]); if (result.error) throw result.error;
  }
  async function prepare(db, selected) {
    if (selected.token !== generation) throw Error("The property changed. Please save it again.");
    const {data,error} = await db.auth.getSession(); if (error || !data.session) throw Error('Please sign in again before saving the video.');
    const session = data.session;
    let url = selected.url, createdPath;
    if (selected.file) {
      if (!window.tus?.Upload) throw Error('The video uploader could not load. Please reopen the app and try again.');
      const type = fileType(selected.file), path = session.user.id+'/'+crypto.randomUUID()+'.'+type.split('/')[1];
      const progress = field('ownerVideoProgress'), status = field('ownerVideoStatus'); progress.hidden = false; progress.value = 0; status.textContent = 'Uploading video… 0%';
      await new Promise((resolve,reject) => {
        const current = new window.tus.Upload(selected.file,{
          endpoint:'https://lesgzlhvrlxgtfuocadq.storage.supabase.co/storage/v1/upload/resumable',
          headers:{authorization:'Bearer '+session.access_token},
          chunkSize:6*1024*1024, retryDelays:[0,3000,5000,10000], uploadDataDuringCreation:true, removeFingerprintOnSuccess:true,
          metadata:{bucketName:bucket,objectName:path,contentType:type,cacheControl:'3600'},
          onProgress(sent,total){if (selected.token !== generation) return; const percent = Math.round(sent/total*100); progress.value = percent; status.textContent = 'Uploading video… '+percent+'%';},
          onError(){if (upload === current) upload = null; reject(Error('The video could not upload. Check your connection, keep the app open and try saving again.'));},
          onSuccess(){if (upload === current) upload = null; resolve();}
        });
        upload = current; current.start();
        // Aborting an upload does not invoke tus onError; invalidate this save explicitly.
        current.ownerCancel = () => reject(Error('Video upload cancelled. Please save the property again.'));
      });
      createdPath = path; url = db.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    }
    const rollback = async () => { if (createdPath) await db.storage.from(bucket).remove([createdPath]); };
    if (selected.token !== generation) { await rollback(); throw Error('The property changed while the video was uploading. Please save it again.'); }
    field('ownerVideoProgress').hidden = true;
    return {url, rollback, commit:async () => { if (selected.original && selected.original !== url) { try { await remove(db,selected.original); } catch (_) {} } }};
  }
  function init() {
    field('propertyVideoFile').addEventListener('change',() => { if (field('propertyVideoFile').files.length) field('propertyVideoUrl').value = ''; field('ownerVideoStatus').textContent = ''; preview(); });
    field('propertyVideoUrl').addEventListener('change',() => { if (field('propertyVideoUrl').value.trim()) field('propertyVideoFile').value = ''; field('ownerVideoStatus').textContent = ''; preview(); });
    field('removePropertyVideo').onclick = () => { load(); field('ownerVideoStatus').textContent = 'Video removed from the form. Save the property to apply this change.'; };
  }
  window.CHSOwnerVideo = {init,load,validate,prepare,remove,fileType,ownedPath};
})();
