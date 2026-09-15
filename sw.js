const CACHE_VERSION = '2.1.5'; // Subimos la versión para forzar la actualización en celulares
const CACHE_NAME = `stereo-revelacion-v${CACHE_VERSION}`;

// URLs para cachear
const urlsToCache = [
  './',
  './index.html',
  './historial.html', 
  './manifest.json',
  './AppIcons/android/android-launchericon-48-48.png',
  './AppIcons/android/android-launchericon-72-72.png',
  './AppIcons/android/android-launchericon-96-96.png',
  './AppIcons/android/android-launchericon-144-144.png',
  './AppIcons/android/android-launchericon-192-192.png',
  './AppIcons/android/android-launchericon-512-512.png',
  './AppIcons/ios/120.png',
  './AppIcons/ios/152.png',
  './AppIcons/ios/167.png',
  './AppIcons/ios/180.png',
  'https://code.jquery.com/jquery-3.2.1.min.js',
  'https://extassisnetwork.com/player/Luna/luna.js',
  './images/face-150x150.png',
  './images/whstsapp-150x150.png',
  './images/yt-150x150.png',
  './images/pagina-150x150.png',
  './images/logo-radio.png',
  './images/023/05/logoSRR.png',
  './images/logo-radio_Live.png'
];

// URLs que NUNCA deben ser cacheadas
const neverCacheUrls = [
  'cast6.my-control-panel.com',
  'radiostreaming.pro',
  ':8330',
  ':7201',
  '/stream',
  'shoutcast',
  'icecast',
  '/played.html',
  '/api/',
  'php',
  'ajax',
  'corsproxy.io',
  'cors-anywhere.herokuapp.com',
  'codetabs.com',
  'allorigins.win',
  'itunes.apple.com'
];

// 1. INSTALACIÓN DEL SERVICE WORKER
self.addEventListener('install', function(event) {
  console.log(`[SW] Instalando Service Worker v${CACHE_VERSION}...`);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log(`[SW] Cache abierto: ${CACHE_NAME}`);
        return cache.addAll(urlsToCache.filter(url => {
          return !neverCacheUrls.some(blocked => url.includes(blocked));
        }));
      })
      .then(function() {
        console.log('[SW] Recursos cacheados exitosamente');
        return self.skipWaiting();
      })
      .catch(function(error) {
        console.error('[SW] Error durante instalación:', error);
      })
  );
});

// 2. ACTIVACIÓN DEL SERVICE WORKER
self.addEventListener('activate', function(event) {
  console.log('[SW] Activando Service Worker...');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      console.log('[SW] Service Worker activado exitosamente');
      return self.clients.claim();
    })
  );
});

// Funciones auxiliares
function isNavigationRequest(request) {
  return request.mode === 'navigate' || 
         (request.method === 'GET' && request.headers.get('accept').includes('text/html'));
}

function shouldCache(url) {
  return !neverCacheUrls.some(blocked => url.includes(blocked));
}

// 3. INTERCEPCIÓN DE REQUESTS (AQUÍ ESTÁ LA CORRECCIÓN)
self.addEventListener('fetch', function(event) {
  const request = event.request;

  // REGLA CLAVE: Si la petición es a un servidor externo (SonicPanel, iTunes, etc.), la dejamos pasar limpia sin interceptar
  if (!request.url.startsWith(self.location.origin)) {
    return; 
  }

  // Solo manejar requests GET locales
  if (request.method !== 'GET') {
    return;
  }

  // No interceptar recursos no cacheables
  if (!shouldCache(request.url)) {
    event.respondWith(fetch(request));
    return;
  }

  // Manejo de historial.html
  if (request.url.includes('historial.html')) {
    event.respondWith(
      caches.match(request)
        .then(function(cachedResponse) {
          if (cachedResponse) return cachedResponse;

          return fetch(request).then(function(response) {
            if (response && response.status === 200) {
              caches.open(CACHE_NAME).then(function(cache) {
                cache.put(request, response.clone());
              });
              return response;
            }
            throw new Error('No se pudo cargar historial.html');
          });
        })
        .catch(function() {
          return new Response(
            `<!DOCTYPE html>
            <html>
            <head>
              <title>Historial - Error</title>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #1a0d2e; color: #fff; }
                h1 { color: #FFE000; }
              </style>
            </head>
            <body>
              <h1>🎵 Historial Musical</h1>
              <p>No se pudo cargar el historial en este momento.</p>
              <button onclick="window.location.reload()">Intentar de nuevo</button>
            </body>
            </html>`,
            { status: 200, headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // Manejo de navegación principal
  if (isNavigationRequest(request)) {
    if (request.url === self.location.origin + '/' || 
        request.url === self.location.origin + '/index.html' ||
        request.url.endsWith('/')) {
      
      event.respondWith(
        caches.match('./index.html')
          .then(function(cachedResponse) {
            if (cachedResponse) return cachedResponse;

            return fetch('./index.html').then(function(response) {
              if (response && response.status === 200) {
                caches.open(CACHE_NAME).then(function(cache) {
                  cache.put('./index.html', response.clone());
                });
                return response;
              }
              throw new Error('No se pudo cargar index.html');
            });
          })
          .catch(function() {
            return new Response(
              `<!DOCTYPE html>
              <html>
              <head>
                <title>STEREO REVELACIÓN RADIO - Offline</title>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                  body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #1a0d2e; color: #fff; }
                  h1 { color: #FFE000; }
                </style>
              </head>
              <body>
                <h1>STEREO REVELACIÓN RADIO</h1>
                <p>No hay conexión a internet.</p>
                <button onclick="window.location.reload()">Intentar de nuevo</button>
              </body>
              </html>`,
              { status: 200, headers: { 'Content-Type': 'text/html' } }
            );
          })
      );
      return;
    }
  }

  // Manejo general con estrategia Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then(function(response) {
      return response || fetch(request).then(function(networkResponse) {
        if (networkResponse && networkResponse.status === 200) {
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(request, networkResponse.clone());
          });
        }
        return networkResponse;
      });
    })
  );
});
// Manejar otros recursos (CSS, JS, imágenes)
  event.respondWith(
    caches.match(request)
      .then(function(cachedResponse) {
        if (cachedResponse) {
          console.log('[SW] Sirviendo desde cache:', request.url);
          return cachedResponse;
        }

        console.log('[SW] Fetching desde red:', request.url);
        return fetch(request).then(function(response) {
          // Verificar si es una respuesta válida
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clonar respuesta para cache
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(request, responseToCache);
          });

          return response;
        }).catch(function(error) {
          console.error('[SW] Error en fetch:', error);
          
          // Para recursos estáticos, intentar servir desde cache
          return caches.match(request).then(function(fallback) {
            return fallback || new Response('Recurso no disponible offline', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
        });
      })
  );
});

// Manejo de notificaciones push
self.addEventListener('push', function(event) {
  console.log('[SW] Push recibido:', event);
  
  let title = 'STEREO REVELACIÓN RADIO';
  let body = 'Nueva notificación de la radio';
  let icon = './images/logoSRR.png';
  let badge = './images/logoSRR.png';
  let data = {};

  if (event.data) {
    try {
      const payload = event.data.json();
      title = payload.title || title;
      body = payload.body || body;
      icon = payload.icon || icon;
      badge = payload.badge || badge;
      data = payload.data || {};
    } catch (e) {
      body = event.data.text() || body;
    }
  }

  const options = {
    body: body,
    icon: icon,
    badge: badge,
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
      ...data
    },
    actions: [
      {
        action: 'open',
        title: 'Abrir Radio',
        icon: icon
      },
      {
        action: 'close',
        title: 'Cerrar',
        icon: icon
      }
    ],
    requireInteraction: false,
    tag: 'stereo-revelacion-notification'
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Manejo de clicks en notificaciones
self.addEventListener('notificationclick', function(event) {
  console.log('[SW] Notificación clickeada:', event);
  event.notification.close();
  
  const action = event.action;
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {
      if (action === 'open' || !action) {
        // Buscar ventana existente
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Abrir nueva ventana
        if (clients.openWindow) {
          return clients.openWindow('./');
        }
      }
      
      return Promise.resolve();
    })
  );
});

// Manejo de cierre de notificaciones
self.addEventListener('notificationclose', function(event) {
  console.log('[SW] Notificación cerrada:', event);
});

// Manejo de errores
self.addEventListener('error', function(event) {
  console.error('[SW] Error:', event.error);
});

self.addEventListener('unhandledrejection', function(event) {
  console.error('[SW] Promise rechazada:', event.reason);
  event.preventDefault();
});
