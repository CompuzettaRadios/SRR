// REEMPLAZA estas funciones en tu sw.js:

// Función para determinar si es una request de navegación
function isNavigationRequest(request) {
  return request.mode === 'navigate' || 
         (request.method === 'GET' && request.headers.get('accept').includes('text/html'));
}

// MODIFICAR el evento 'fetch' en sw.js (línea ~108):
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

  // NUEVA LÓGICA: Permitir historial.html específicamente
  if (request.url.includes('historial.html')) {
    console.log('[SW] Request de historial.html detectada');
    event.respondWith(
      caches.match(request)
        .then(function(cachedResponse) {
          if (cachedResponse) {
            console.log('[SW] Sirviendo historial.html desde cache');
            return cachedResponse;
          }
          
          console.log('[SW] Fetching historial.html desde red');
          return fetch(request).then(function(response) {
            if (response && response.status === 200) {
              // Cachear historial.html
              caches.open(CACHE_NAME).then(function(cache) {
                cache.put(request, response.clone());
              });
              return response;
            }
            throw new Error('No se pudo cargar historial.html');
          });
        })
        .catch(function(error) {
          console.error('[SW] Error cargando historial.html:', error);
          // Retornar respuesta de error específica para historial
          return new Response(
            `<!DOCTYPE html>
            <html>
            <head>
              <title>Historial - Error</title>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  text-align: center; 
                  padding: 50px; 
                  background: linear-gradient(135deg, #1a0d2e 0%, #2d1b69 30%, #16213e 70%, #0f1419 100%); 
                  color: #fff; 
                }
                h1 { color: #FFE000; }
              </style>
            </head>
            <body>
              <h1>🎵 Historial Musical</h1>
              <p>No se pudo cargar el historial en este momento.</p>
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

  // Manejar otras requests de navegación (solo para rutas principales)
  if (isNavigationRequest(request)) {
    console.log('[SW] Request de navegación detectada');
    
    // Solo redirigir a index.html si es una navegación a la raíz
    if (request.url === self.location.origin + '/' || 
        request.url === self.location.origin + '/index.html' ||
        request.url.endsWith('/')) {
      
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
  }

  // Resto del código permanece igual...
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
