/* ============================================================
   JK & Associates service worker — hand-written, no Workbox.

   NETWORK-FIRST FOR EVERYTHING, and that is the whole design.

   The sister platform's worker serves assets stale-while-revalidate,
   which is right there and wrong here. Vite fingerprints its filenames,
   so a cache hit for index-BIhidpao.js is always the file that name
   meant; a new build produces a new name and the old entry is simply
   never asked for again.

   This site has no build step. assets/css/jk.css is that path forever.
   Cache it and serve it first, and a returning visitor after a deploy
   gets yesterday's stylesheet with today's markup — or worse,
   yesterday's common.js against today's data.js, which is a broken page
   rather than an ugly one. There is no hash to invalidate, so the cache
   would have no way to know it is wrong.

   So the network is always asked first, and the cache exists only for
   when the network cannot answer. Online visitors get exactly what a
   visitor with no worker would get, which also means the worst case for
   shipping this is that it does nothing. Offline visitors get what they
   have already seen.

   What that costs: no cache-first speed win. What it buys: this cannot
   serve a stale page to somebody who is online, which on a site with no
   fingerprinting is the failure that would matter and the one nobody
   would report — they would just see a broken page and leave.

   Navigations that miss fall back to offline.html rather than to the
   home page. This is a multi-page site with no client router, so a
   cached '/' served for /tools/cask-calculator.html would silently show
   the wrong document. Saying "you are offline and this page is not
   saved" is worth more than showing the right site and the wrong page.
   ============================================================ */

const VERSION = 'jk-v1';
const CACHE = `${VERSION}-runtime`;

/* The minimum that makes an offline visit coherent: somewhere to land,
   and the styling to make it legible. Everything else is cached as it
   is visited, because precaching 28 pages on install spends a new
   visitor's bandwidth on documents they may never open. */
const SHELL = [
  '/',
  '/offline.html',
  '/assets/css/jk.css',
  '/assets/img/jk-badge.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      /* Individually, not addAll: that is atomic, so one 404 discards
         the whole precache and the worker installs with nothing. */
      .then((cache) => Promise.all(SHELL.map((url) => cache.add(url).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  /* Cross-origin is not handled. The CSP says this site makes no
     external requests, so anything here is either a bug or a browser
     extension; passing it through untouched keeps it visible rather
     than absorbing it into a cache. */
  if (url.origin !== self.location.origin) return;

  event.respondWith(networkFirst(request, request.mode === 'navigate'));
});

async function networkFirst(request, isNavigation) {
  const cache = await caches.open(CACHE);
  const url = new URL(request.url);
  /* Keyed on origin+pathname so each page caches as itself. Keying
     navigations on the request would let a query string — ?partner=x —
     mint a separate entry for the same document, and the first visitor
     with a partner link would fill the cache with duplicates. */
  const key = isNavigation ? url.origin + url.pathname : request;

  try {
    const fresh = await fetch(request);
    /* Only complete, same-origin successes. A 206 or an opaque error
       stored here would be served for the life of the cache. */
    if (fresh && fresh.status === 200 && fresh.type === 'basic') {
      cache.put(key, fresh.clone());
    }
    return fresh;
  } catch {
    const hit = await cache.match(key);
    if (hit) return hit;
    if (isNavigation) return (await cache.match('/offline.html')) || Response.error();
    return Response.error();
  }
}
