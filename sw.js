const CACHE_NAME = 'stereo-revelacion-v1.4';
const urlsToCache = [
  '/SRR/',
  '/SRR/index.html',
  '/SRR/manifest.json',
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
  console.log('Service Worker instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Cache abierto:', CACHE_NAME);
        return cache.addAll(urlsToCache);
      })
      .then(function() {
        console.log('Todos los recursos fueron cacheados');
        return self.skipWaiting(); // Fuerza la activación inmediata
      })
      .catch(function(error) {
        console.error('Error durante la instalación:', error);
      })
  );
});

// Activación del Service Worker
self.addEventListener('activate', function(event) {
  console.log('Service Worker activando...');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      console.log('Service Worker activado');
      return self.clients.claim(); // Toma control de todas las páginas
    })
  );
});

// Intercepción de requests
self.addEventListener('fetch', function(event) {
  // Solo manejar requests GET
  if (event.request.method !== 'GET') {
    return;
  }

  // No cachear el stream de audio y recursos dinámicos
  if (event.request.url.includes('cast6.my-control-panel.com') || 
      event.request.url.includes('/stream')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Cache hit - return response
        if (response) {
          console.log('Sirviendo desde cache:', event.request.url);
          return response;
        }

// Si es la ruta principal y no está en cache, buscar index.html
if (event.request.url === self.location.origin + '/SRR/' || 
    event.request.url.endsWith('/SRR/') || 
    event.request.url === self.location.origin + '/') {
          return caches.match('/index.html').then(function(indexResponse) {
            if (indexResponse) {
              return indexResponse;
            }
            // Si no hay index.html en cache, intentar fetch
            return fetch('/index.html').then(function(fetchResponse) {
              if (fetchResponse && fetchResponse.status === 200) {
                // Cachear para futuras requests
                caches.open(CACHE_NAME).then(function(cache) {
                  cache.put('/', fetchResponse.clone());
                  cache.put('/index.html', fetchResponse.clone());
                });
                return fetchResponse;
              }
              throw new Error('No se pudo cargar index.html');
            });
          });
        }

        console.log('Fetching desde red:', event.request.url);
        return fetch(event.request).then(
          function(response) {
            // Check if we received a valid response
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            var responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        ).catch(function(error) {
          console.error('Error en fetch:', error);
          
          // Para la página principal, devolver desde cache
          if (event.request.url === self.location.origin + '/' || 
              event.request.url.endsWith('/')) {
            return caches.match('/index.html').then(function(cachedResponse) {
              return cachedResponse || caches.match('/');
            });
          }
          
          // Retornar una respuesta offline si está disponible
          return caches.match('/offline.html').then(function(fallback) {
            return fallback || new Response('Contenido no disponible offline', {
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
  console.log('Push recibido:', event);
  
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
    requireInteraction: true,
    tag: 'stereo-revelacion-notification'
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Manejo de clicks en notificaciones
self.addEventListener('notificationclick', function(event) {
  console.log('Notificación clickeada:', event);
  event.notification.close();
  
  const action = event.action;
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {
      // Si se hace click en "Abrir Radio" o en la notificación misma
      if (action === 'open' || !action) {
        // Buscar si ya hay una ventana abierta
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Si no hay ventana abierta, abrir una nueva
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      }
      
      // Si se hace click en "Cerrar", no hacer nada (la notificación ya se cerró)
      return Promise.resolve();
    })
  );
});

// Manejo de cierre de notificaciones
self.addEventListener('notificationclose', function(event) {
  console.log('Notificación cerrada:', event);
  // Aquí puedes agregar analytics o tracking si es necesario
});

// Manejo de sincronización en segundo plano (opcional)
self.addEventListener('sync', function(event) {
  console.log('Background sync:', event);
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Aquí puedes agregar lógica para sincronizar datos cuando se recupere la conexión
      console.log('Sincronización en segundo plano ejecutada')
    );
  }
});

// Manejo de errores
self.addEventListener('error', function(event) {
  console.error('Error en Service Worker:', event.error);
});

// Manejo de errores no capturados
self.addEventListener('unhandledrejection', function(event) {
  console.error('Promise rechazada no manejada en Service Worker:', event.reason);
  event.preventDefault();
});
