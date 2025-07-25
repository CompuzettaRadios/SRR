const CACHE_NAME = 'stereo-revelacion-v2.0';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  'https://code.jquery.com/jquery-3.2.1.min.js',
  'https://extassisnetwork.com/player/Luna/luna.js',
  'https://stereorevelacionradio.com/wp-content/uploads/2023/05/face-150x150.png',
  'https://stereorevelacionradio.com/wp-content/uploads/2023/05/whstsapp-150x150.png',
  'https://stereorevelacionradio.com/wp-content/uploads/2023/05/yt-150x150.png',
  'https://stereorevelacionradio.com/wp-content/uploads/2023/05/pagina-150x150.png',
  'https://stereorevelacionradio.com/wp-content/uploads/2022/12/logo-radio.png',
  'https://stereorevelacionradio.com/wp-content/uploads/2023/05/logoSRR.png'
];

// Instalación del Service Worker
self.addEventListener('install', function(event) {
  console.log('[SW] Instalando Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('[SW] Cache abierto:', CACHE_NAME);
        return cache.addAll(urlsToCache);
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

// Activación del Service Worker
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

// Función para determinar si es una request de navegación
function isNavigationRequest(request) {
  return request.mode === 'navigate' || 
         (request.method === 'GET' && request.headers.get('accept').includes('text/html'));
}

// Función para determinar si debe ser cacheado
function shouldCache(url) {
  // No cachear streams de audio
  if (url.includes('cast6.my-control-panel.com') || 
      url.includes('/stream') ||
      url.includes('shoutcast') ||
      url.includes('icecast')) {
    return false;
  }
  
  // No cachear APIs dinámicas
  if (url.includes('/api/') || 
      url.includes('php') ||
      url.includes('ajax')) {
    return false;
  }
  
  return true;
}

// Intercepción de requests
self.addEventListener('fetch', function(event) {
  const request = event.request;
  const url = new URL(request.url);
  
  console.log('[SW] Interceptando:', request.url);
  
  // Solo manejar requests GET
  if (request.method !== 'GET') {
    console.log('[SW] Request no GET, pasando directo');
    return;
  }

  // No interceptar streams de audio y recursos dinámicos
  if (!shouldCache(request.url)) {
    console.log('[SW] Recurso no cacheable, pasando directo:', request.url);
    event.respondWith(fetch(request));
    return;
  }

  // Manejar requests de navegación (páginas HTML)
  if (isNavigationRequest(request)) {
    console.log('[SW] Request de navegación detectada');
    event.respondWith(
      caches.match('./index.html')
        .then(function(cachedResponse) {
          if (cachedResponse) {
            console.log('[SW] Sirviendo index.html desde cache');
            return cachedResponse;
          }
          
          console.log('[SW] Fetching index.html desde red');
          return fetch('./index.html').then(function(response) {
            if (response && response.status === 200) {
              // Cachear para futuras requests
              caches.open(CACHE_NAME).then(function(cache) {
                cache.put('./index.html', response.clone());
              });
              return response;
            }
            throw new Error('No se pudo cargar index.html');
          });
        })
        .catch(function(error) {
          console.error('[SW] Error cargando página:', error);
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
              <p>No hay conexión a internet. La aplicación se cargará cuando se restablezca la conexión.</p>
              <button onclick="window.location.reload()">Intentar de nuevo</button>
            </body>
            </html>`,
            {
              status: 200,
              statusText: 'OK',
              headers: { 'Content-Type': 'text/html' }
            }
          );
        })
    );
    return;
  }

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
  let icon = 'https://stereorevelacionradio.com/wp-content/uploads/2023/05/logoSRR.png';
  let badge = 'https://stereorevelacionradio.com/wp-content/uploads/2023/05/logoSRR.png';
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
