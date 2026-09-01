const CACHE = 'locket-v2'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => {
      const base = new URL('./', self.location).pathname
      return cache.addAll([base, `${base}index.html`, `${base}manifest.webmanifest`])
    }),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetched = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(event.request, copy))
          }
          return response
        })
        .catch(() => cached)
      return cached || fetched
    }),
  )
})

self.addEventListener('push', (event) => {
  let title = 'Locket'
  let body = 'A birthday is coming up.'
  try {
    const payload = event.data ? event.data.json() : null
    if (payload?.title) title = payload.title
    if (payload?.body) body = payload.body
  } catch {
    if (event.data) body = event.data.text()
  }
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: './icon-192.png',
      badge: './icon-192.png',
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(self.clients.openWindow('./'))
})
