/*
 * Funeral Academy — service worker.
 *
 * Design constraint that shapes every decision below: this worker must not be
 * able to break the platform. An LMS serves authenticated, multi-tenant,
 * per-user content; a service worker that guesses wrong about what is cacheable
 * can serve one learner's page to another, or pin a stale build forever.
 *
 * So the rules are deliberately narrow:
 *
 *   1. ONLY same-origin GET requests are ever touched. Everything else —
 *      POST/PUT/DELETE, cross-origin, range requests — falls straight through
 *      to the network untouched.
 *   2. Anything that carries identity or state is NEVER cached: /api/*, /auth/*,
 *      /admin/*, /monitoring (Sentry tunnel), /ingest/* (PostHog).
 *   3. Navigations are network-first. The network answer always wins; the cache
 *      exists only so a dropped connection shows the offline page instead of the
 *      browser's dinosaur.
 *   4. Static build output (/_next/static/*) is immutable by contract, so it is
 *      cache-first. This is the only place the cache is preferred.
 *
 * Precache is limited to the offline page and the icons it needs. We do not
 * precache the app shell: Next.js App Router HTML is per-route and per-tenant,
 * and guessing a shell would serve the wrong org.
 */

const VERSION = 'fa-v1'
const PRECACHE = `${VERSION}-precache`
const RUNTIME = `${VERSION}-runtime`
const OFFLINE_URL = '/offline.html'

// Kept tiny on purpose: a failed precache entry aborts the whole install, so
// every URL here must be guaranteed to exist as a static file.
const PRECACHE_URLS = [OFFLINE_URL, '/icons/icon-192.png']

// Runtime cache ceiling. Without a bound, a learner browsing a large catalogue
// can push a phone into storage-pressure eviction, which drops the precache too.
const RUNTIME_MAX_ENTRIES = 60

/** Paths that must always hit the network, never the cache. */
function isNeverCacheable(url) {
  const p = url.pathname
  return (
    p.startsWith('/api/') ||
    p.startsWith('/auth/') ||
    p.startsWith('/admin/') ||
    p.startsWith('/ingest/') ||
    p.startsWith('/monitoring') ||
    // Embedded/iframe surfaces are framed by third parties and by SCORM
    // packages; caching them creates confusing cross-context staleness.
    p.startsWith('/embed/') ||
    p.startsWith('/board/') ||
    // The runtime config carries the deployment's env; a stale copy points the
    // whole client at the wrong API host.
    p === '/runtime-config.js'
  )
}

/** Immutable, content-hashed build output. */
function isImmutableAsset(url) {
  return url.pathname.startsWith('/_next/static/')
}

/** Our own static brand assets — safe to serve stale, cheap to revalidate. */
function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/icons/') ||
    /\.(?:png|jpe?g|svg|webp|avif|ico|woff2?)$/i.test(url.pathname)
  )
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  // Cache keys are insertion-ordered, so the oldest entries are at the front.
  for (let i = 0; i < keys.length - maxEntries; i++) {
    await cache.delete(keys[i])
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      // Take over as soon as the new worker is ready rather than waiting for
      // every tab to close. Paired with clients.claim() below and the
      // version-scoped cache names, this keeps a deploy from serving a mix of
      // old and new build output.
      .then(() => self.skipWaiting())
      .catch(() => {
        // Never let a precache miss block activation — an app that installs no
        // worker is strictly better than one stuck on a failed install.
        return self.skipWaiting()
      })
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(
        names
          .filter((n) => !n.startsWith(VERSION))
          .map((n) => caches.delete(n))
      )
      // Enable navigation preload where supported: the browser starts the
      // navigation request in parallel with worker startup, removing the
      // worker's boot latency from first paint.
      if (self.registration.navigationPreload) {
        try {
          await self.registration.navigationPreload.enable()
        } catch {
          /* not fatal */
        }
      }
      await self.clients.claim()
    })()
  )
})

/**
 * Escape hatch. If a worker ever ships broken, the page can post
 * { type: 'CLEAR_CACHES' } or { type: 'UNREGISTER' } to recover without
 * requiring users to clear site data by hand.
 */
self.addEventListener('message', (event) => {
  const type = event.data && event.data.type
  if (type === 'SKIP_WAITING') {
    self.skipWaiting()
  } else if (type === 'CLEAR_CACHES') {
    event.waitUntil(caches.keys().then((ks) => Promise.all(ks.map((k) => caches.delete(k)))))
  } else if (type === 'UNREGISTER') {
    event.waitUntil(
      caches
        .keys()
        .then((ks) => Promise.all(ks.map((k) => caches.delete(k))))
        .then(() => self.registration.unregister())
    )
  }
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') return

  let url
  try {
    url = new URL(request.url)
  } catch {
    return
  }

  if (url.origin !== self.location.origin) return
  if (isNeverCacheable(url)) return

  // --- Navigations: network-first, offline page as the floor ---------------
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const preload = await event.preloadResponse
          if (preload) return preload
          return await fetch(request)
        } catch {
          // Offline. Prefer a cached copy of this exact page if the learner has
          // opened it before, otherwise show the branded offline page.
          const cached = await caches.match(request)
          if (cached) return cached
          const offline = await caches.match(OFFLINE_URL)
          if (offline) return offline
          return new Response('', { status: 504, statusText: 'Offline' })
        }
      })()
    )
    return
  }

  // --- Immutable build output: cache-first ---------------------------------
  if (isImmutableAsset(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request)
        if (cached) return cached
        const response = await fetch(request)
        if (response && response.status === 200) {
          const cache = await caches.open(RUNTIME)
          cache.put(request, response.clone())
        }
        return response
      })()
    )
    return
  }

  // --- Brand/static assets: stale-while-revalidate -------------------------
  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request)
        const network = fetch(request)
          .then(async (response) => {
            // `response.ok` excludes opaque and error responses, so a 404 never
            // gets cached as if it were the asset.
            if (response && response.ok) {
              const cache = await caches.open(RUNTIME)
              await cache.put(request, response.clone())
              trimCache(RUNTIME, RUNTIME_MAX_ENTRIES)
            }
            return response
          })
          .catch(() => cached)
        return cached || network
      })()
    )
  }

  // Everything else falls through to the network with no worker involvement.
})
