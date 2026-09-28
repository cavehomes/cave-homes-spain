const CACHE = "cave-homes-v15-community-moderation",
  FILES = [
    "/",
    "/index.html",
    "/community.html",
    "/property-search.html",
    "/admin.html",
    "/property-care-staff.html",
    "/owners-manifest.webmanifest",
    "/property-care-manifest.webmanifest",
    "/app/app-icon-192.png",
    "/app/app-icon-512.png",
  ];
self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (e) => {
  if (e.request.method === "GET")
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
