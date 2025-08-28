const CACHE_NAME = 'notes-app-v1';
const urlsToCache = [
  '/',
  '/notes',
  '/api/notes',
  '/_next/static/css/',
  '/_next/static/js/',
  '/manifest.json'
];

const API_CACHE_NAME = 'api-cache-v1';
const API_URLS = ['/api/notes', '/api/auth'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method === 'GET') {
    if (url.pathname.startsWith('/api/notes')) {
      event.respondWith(
        fetch(request)
          .then((response) => {
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(API_CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            return caches.match(request).then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              return new Response(
                JSON.stringify({ error: 'Offline - cached data not available' }),
                {
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: { 'Content-Type': 'application/json' }
                }
              );
            });
          })
      );
    } else {
      event.respondWith(
        caches.match(request)
          .then((response) => {
            if (response) {
              return response;
            }
            return fetch(request);
          })
      );
    }
  } else if (['POST', 'PUT', 'DELETE'].includes(request.method) && url.pathname.startsWith('/api/notes')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            caches.delete(API_CACHE_NAME);
          }
          return response;
        })
        .catch((error) => {
          console.log('API request failed, storing for sync:', request.method, request.url);
          return storeOfflineRequest(request);
        })
    );
  }
});

async function storeOfflineRequest(request) {
  const offlineRequests = JSON.parse(localStorage.getItem('offlineRequests') || '[]');
  
  const requestData = {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: request.method !== 'GET' ? await request.text() : null,
    timestamp: Date.now()
  };
  
  offlineRequests.push(requestData);
  localStorage.setItem('offlineRequests', JSON.stringify(offlineRequests));
  
  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'Request stored for sync when online',
      offline: true 
    }),
    {
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});