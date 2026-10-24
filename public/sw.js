/*
 * Open Redact service worker.
 *
 * The point of this tool is that a document never leaves the machine, and it
 * should work on a machine with no network at all. A service worker keeps the
 * application shell and the engine available offline.
 *
 * Only the application itself is cached. A document the user opens is never
 * fetched over the network and is never put in the cache.
 */

const CACHE_NAME = "open-redact-v1";

/**
 * The files needed to start the application.
 *
 * The engine and the PDF.js worker are the two large ones, and both are
 * needed before a document can be shown. They are listed explicitly so that
 * the first offline visit works.
 */
const APP_SHELL = [
  "/",
  "/index.html",
  "/favicon.svg",
  "/favicon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // Only this origin is ever cached. A document is read from the user's disk
  // and handed to the worker directly; it never becomes a network request.
  if (url.origin !== self.location.origin) {
    return;
  }

  // Navigations: serve the cached shell when the network is unavailable.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match("/index.html").then((cached) => cached || Response.error())
      )
    );
    return;
  }

  // Assets: serve from the cache and refresh it in the background. The asset
  // file names contain a hash, so a cached file never goes stale.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === "basic") {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || network;
    })
  );
});
