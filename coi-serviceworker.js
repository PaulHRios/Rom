/*
 * coi-serviceworker: agrega las cabeceras COOP/COEP que GitHub Pages no puede
 * enviar, para habilitar SharedArrayBuffer (necesario para el núcleo de PSP).
 * El mismo archivo funciona como service worker y como script de página.
 */
if (typeof window === 'undefined') {
  // ---- Modo service worker ----
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
  self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') return;
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 0) return response;
          const headers = new Headers(response.headers);
          headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
          headers.set('Cross-Origin-Opener-Policy', 'same-origin');
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers,
          });
        })
        .catch(() => new Response(null, { status: 504, statusText: 'Gateway Timeout' }))
    );
  });
} else {
  // ---- Modo script de página: registra el SW y recarga una vez ----
  (() => {
    if (window.crossOriginIsolated || !('serviceWorker' in navigator)) return;
    const swUrl = document.currentScript ? document.currentScript.src : 'coi-serviceworker.js';
    navigator.serviceWorker.register(swUrl).then((registration) => {
      const reloadOnce = () => {
        if (!sessionStorage.getItem('coiReloaded')) {
          sessionStorage.setItem('coiReloaded', '1');
          location.reload();
        }
      };
      if (registration.active && !navigator.serviceWorker.controller) {
        reloadOnce();
      } else if (registration.installing || registration.waiting) {
        navigator.serviceWorker.addEventListener('controllerchange', reloadOnce, { once: true });
      }
    }).catch(() => { /* sin SW seguirá funcionando todo excepto PSP */ });
  })();
}
