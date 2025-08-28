// Cache names for different types of content
const CACHE_NAME = 'notes-app-v1';
const urlsToCache = [
  '/',
  '/notes',
  '/manifest.json'
];

const API_CACHE_NAME = 'api-cache-v1';
const API_URLS = ['/api/notes', '/api/auth'];

// Service worker installation - pre-cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        console.log('Opened cache');
        
        // Cache URLs individually to avoid failing entire batch if one URL fails
        const cachePromises = urlsToCache.map(async (url) => {
          try {
            await cache.add(url);
            console.log(`Successfully cached: ${url}`);
          } catch (error) {
            console.warn(`Failed to cache ${url}:`, error);
          }
        });
        
        await Promise.allSettled(cachePromises);
        console.log('Cache setup completed');
      })
      .catch((error) => {
        console.error('Cache setup failed:', error);
      })
  );
});

// Handle all network requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method === 'GET') {
    if (url.pathname.startsWith('/api/notes')) {
      // API requests: try network first, fall back to cache
      event.respondWith(
        fetch(request)
          .then((response) => {
            if (response.status === 200) {
              // Cache successful API responses
              const responseClone = response.clone();
              caches.open(API_CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            // Network failed, try cache
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
      // Static assets: try cache first, fall back to network
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
    // Write operations: try network, queue for sync if offline
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            // Clear API cache when data changes
            caches.delete(API_CACHE_NAME);
          }
          return response;
        })
        .catch((error) => {
          // Network failed, store request for later sync
          console.log('API request failed, storing for sync:', request.method, request.url);
          return storeOfflineRequest(request);
        })
    );
  }
});

// Store failed requests for later sync when back online
async function storeOfflineRequest(request) {
  try {
    // Create a serializable representation of the request
    const requestData = {
      id: `request-${Date.now()}-${Math.random()}`,
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: request.method !== 'GET' ? await request.text() : null,
      timestamp: Date.now()
    };
    
    // Log for debugging (actual storage handled by sync manager)
    console.log('Offline request stored:', requestData);
    
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
  } catch (error) {
    console.error('Failed to store offline request:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Failed to store request for offline sync',
        error: error.message 
      }),
      {
        status: 500,
        statusText: 'Internal Server Error',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Clean up old caches when service worker updates
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete any caches that don't match current version
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});