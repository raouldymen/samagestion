const SHELL_CACHE = "samagestion-shell-v2";
const PAGE_CACHE = "samagestion-pages-v1";
const APP_SHELL = [
  "/login",
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== SHELL_CACHE && key !== PAGE_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response.ok && response.type === "basic") {
            const cache = await caches.open(PAGE_CACHE);
            await cache.put(request, response.clone());
          }
          return response;
        })
        .catch(async () => (
          (await caches.match(request)) ||
          (await caches.match("/offline.html")) ||
          (await caches.match("/login"))
        )),
    );
    return;
  }

  if (["script", "style", "font", "image", "worker"].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then(async (cached) => {
        const update = fetch(request)
          .then(async (response) => {
            if (response.ok) {
              const cache = await caches.open(SHELL_CACHE);
              await cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => cached);
        return cached || update;
      }),
    );
  }
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "CLEAR_PRIVATE_PAGES") {
    event.waitUntil(caches.delete(PAGE_CACHE));
  }
});
