const CACHE_NAME = 'stereo-revelacion-v1.1';
const urlsToCache = [
  '/',
  '/manifest.json',
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
        // Cachear recursos uno por uno para manejar errores individualmente
        return Promise.allSettled(
          urlsToCache.map(url => 
            cache.add(url).catch(error => {
              console.warn('No se pudo cachear:', url, error);
              return null;
            })
          )
        );
      })
      .then(function() {
        console.log('Proceso de cacheado completado');
        return self.skipWaiting();
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
      return self.clients.claim();
    })
  );
});

// Intercepción de requests
self.addEventListener('fetch', function(event) {
  const request = event.request;
  const url = new URL(request.url);
  
  // No cachear el stream de audio, APIs dinámicas y métodos no-GET
  if (url.hostname.includes('cast6.my-control-panel.com') || 
      url.pathname.includes('/stream') ||
      url.hostname.includes('extassisnetwork.com') ||
      url.hostname.includes('code.jquery.com') ||
      request.method !== 'GET' ||
      url.protocol !== 'https:' && url.protocol !== 'http:') {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then(function(response) {
        if (response) {
          console.log('Sirviendo desde cache:', request.url);
          return response;
        }

        console.log('Fetching desde red:', request.url);
        return fetch(request).then(
          function(response) {
            // Verificar respuesta válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Solo cachear respuestas exitosas de recursos estáticos
            if (url.pathname.includes('.png') || 
                url.pathname.includes('.jpg') || 
                url.pathname.includes('.ico') ||
                url.pathname.includes('manifest.json') ||
                url.pathname === '/') {
              
              const responseToCache = response.clone();
              
              caches.open(CACHE_NAME)
                .then(function(cache) {
                  cache.put(request, responseToCache);
                })
                .catch(function(error) {
                  console.warn('Error al cachear:', request.url, error);
                });
            }

            return response;
          }
        ).catch(function(error) {
          console.error('Error en fetch:', request.url, error);
          
          // Fallback para páginas HTML
          if (request.headers.get('accept').includes('text/html')) {
            return new Response(`
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="UTF-8">
                <title>Sin conexión - STEREO REVELACIÓN RADIO</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                  body {
                    font-family: Arial, sans-serif;
                    text-align: center;
                    padding: 50px;
                    background: linear-gradient(135deg, #1a0d2e 0%, #2d1b69 100%);
                    color: white;
                    margin: 0;
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                  }
                  h1 { color: #FFE000; }
                  .retry-btn {
                    background: #FFE000;
                    color: #000;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 25px;
                    cursor: pointer;
                    margin-top: 20px;
                    font-weight: bold;
                  }
                </style>
              </head>
              <body>
                <h1>🎵 STEREO REVELACIÓN RADIO</h1>
                <p>No hay conexión a internet</p>
                <p>Verifica tu conexión e intenta nuevamente</p>
                <button class="retry-btn" onclick="window.location.reload()">
                  Reintentar
                </button>
              </body>
              </html>
            `, {
              status: 200,
              statusText: 'OK',
              headers: {
                'Content-Type': 'text/html; charset=utf-8'
              }
            });
          }
          
          // Para otros recursos, devolver error
          return new Response('Recurso no disponible offline', {
            status: 503,
            statusText: 'Service Unavailable'
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
      primaryKey: Date.now(),
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
        title: 'Cerrar'
      }
    ],
    requireInteraction: false, // Cambiado a false para mejor UX
    tag: 'stereo-revelacion-notification',
    renotify: true
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
  
  if (action === 'close') {
    return; // Solo cerrar la notificación
  }
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {
      // Buscar ventana existente
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Abrir nueva ventana si no existe
      if (clients.openWindow) {
        return clients.openWindow(self.location.origin);
      }
    }).catch(function(error) {
      console.error('Error al manejar click de notificación:', error);
    })
  );
});

// Manejo de cierre de notificaciones
self.addEventListener('notificationclose', function(event) {
  console.log('Notificación cerrada:', event.notification.tag);
});

// Manejo de sincronización en segundo plano
self.addEventListener('sync', function(event) {
  console.log('Background sync:', event.tag);
  if (event.tag === 'background-sync') {
    event.waitUntil(
      Promise.resolve().then(() => {
        console.log('Sincronización en segundo plano ejecutada');
        // Aquí puedes agregar lógica de sincronización
      })
    );
  }
});

// Manejo de errores
self.addEventListener('error', function(event) {
  console.error('Error en Service Worker:', event.error);
});

// Manejo de promesas rechazadas
self.addEventListener('unhandledrejection', function(event) {
  console.error('Promise rechazada no manejada en Service Worker:', event.reason);
  event.preventDefault();
});

// Mensaje desde el cliente principal
self.addEventListener('message', function(event) {
  console.log('Mensaje recibido en SW:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Responder al cliente si es necesario
  if (event.ports && event.ports[0]) {
    event.ports[0].postMessage({
      type: 'SW_RESPONSE',
      message: 'Mensaje recibido correctamente'
    });
  }
});
