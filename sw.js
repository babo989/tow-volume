// Offline cache for Tow Volume. Bump VERSION whenever any file below changes
// so phones drop the old copy.
const VERSION = "v1";
const CACHE = "tow-volume-" + VERSION;
const FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(FILES.map(f => new Request(f, {cache: "reload"}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("tow-volume-") && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Serve from cache straight away (works with no signal), and refresh the
// cached copy in the background when the network is reachable.
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  const isPage = req.mode === "navigate";
  e.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(isPage ? "./index.html" : req, {ignoreSearch: true});
    const fresh = fetch(req).then(res => {
      if (res.ok) cache.put(isPage ? "./index.html" : req, res.clone());
      return res;
    }).catch(() => null);
    if (cached) { e.waitUntil(fresh); return cached; }
    return (await fresh) || new Response("Offline", {status: 503, statusText: "Offline"});
  }));
});
