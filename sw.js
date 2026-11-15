// StreakForge service worker: cache-first shell, network fallback.
const CACHE = "streakforge-v2";
const SHELL = ["./","./index.html","./login.html","./register.html","./privacy.html","./about.html","./config.js","./styles.css","./app.js","./bank.js","./manifest.json","./icon.svg"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
});
