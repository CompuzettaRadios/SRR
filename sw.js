const CACHE_VERSION = '2.1.0';
const CACHE_NAME = `stereo-revelacion-v${CACHE_VERSION}`;

// URLs para cachear - organizadas por prioridad
const urlsToCache = [
  './',
  './index.html',
  './historial.html',
  './manifest.json',
  'https://code.jquery.com/jquery-3.2.1.min.js',
  'https://extassisnetwork.com/player/Luna/luna.js',
  'https://stereorevelacionradio.com/wp-content/uploads/2023/05/face-150x150.png',
  'https://stereorevelacionradio.com/wp-content/uploads/2023/05/whstsapp-150x150.png',
  'https://stereorevelacionradio.com/wp-content/uploads/2023/05/yt-150x150.png',
  'https://stereorevelacionradio.com/wp-content/uploads/2023/05/pagina-150x150.png',
  'https://stereorevelacionradio.com/wp-content/uploads/2022/12/logo-radio.png',
  'https://stereorevelacionradio.com/wp-content/uploads/2023/05/logoSRR.png',
  'https://stereorevelacionradio.com/wp-content/uploads/2025/08/logo-radio_Live.png'
];

// URLs que NUNCA deben ser cacheadas
const neverCacheUrls = [
  // Streams de audio
  'cast6.my-control-panel.com',
  '/stream',
  'shoutcast',
  'icecast',
  // APIs dinámicas
  '/played.html',
  '/api/',
  'php',
  'ajax',
  // Proxies CORS
  'corsproxy.io',
  'cors-anywhere.herokuapp.com',
  'codetabs.com',
  'allorigins.win',
  // APIs externas
  'itunes.apple.com'
];

// INSTALACIÓN DEL SERVICE WORKER
self.addEventListener('install', function(event) {
  console.log(`[SW] Instalando Service Worker v${CACHE_VERSION}...`);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log(`[SW] Cache abierto: ${CACHE_NAME}`);
        return cache.addAll(urlsToCache.filter(url => {
          // Solo cachear URLs que no estén en la lista negra
          return !neverCacheUrls.some(blocked => url.includes(blocked));
        }));
      })
      .then(function() {
        console.log('[SW] Recursos cacheados exitosamente');
        // Forzar activación inmediata
        return self.skipWaiting();
      })
      .catch(function(error) {
        console.error('[SW] Error durante instalación:', error);
      })
  );
});

// ACTIVACIÓN DEL SERVICE WORKER
self.addEventListener('activate', function(event) {
  console.log(`[SW] Activando Service Worker v${CACHE_VERSION}...`);
  
  event.waitUntil(
    Promise.all([
      // Limpiar caches antiguos
      caches.keys().then(function(cacheNames) {
        return Promise.all(
          cacheNames.map(function(cacheName) {
            if (cacheName.startsWith('stereo-revelacion-') && cacheName !== CACHE_NAME) {
              console.
