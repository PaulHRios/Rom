'use strict';

// Arranca EmulatorJS con el juego pedido en ?id=N
(async () => {
  const msgEl = document.getElementById('player-msg');
  const showMsg = (html) => {
    msgEl.innerHTML = html;
    msgEl.classList.remove('hidden');
  };

  const id = Number(new URLSearchParams(location.search).get('id'));
  if (!id) return showMsg('Juego no especificado. <a href="index.html">Volver</a>');

  let rom;
  try {
    rom = await RomDB.getRom(id);
  } catch (e) {
    return showMsg('Error al leer la biblioteca: ' + e.message + ' <a href="index.html">Volver</a>');
  }
  if (!rom) return showMsg('No se encontró el juego. <a href="index.html">Volver a la biblioteca</a>');

  document.getElementById('player-title').textContent = rom.name;
  document.title = rom.name + ' — Mi Consola Retro';

  const consoleInfo = consoleById(rom.console);

  // Trucos: incluidos + personalizados. Se activan en el menú del juego
  // (⚙️ → Cheats), cada uno con su interruptor.
  const cheats = curatedCheatsFlat(rom.console, rom.name)
    .concat(await RomDB.getCheats(id));

  // BIOS (PS1)
  let biosUrl = null;
  if (consoleInfo && consoleInfo.needsBios) {
    const bios = await RomDB.getBios(rom.console);
    if (bios) {
      biosUrl = URL.createObjectURL(bios.data);
    } else {
      return showMsg('Este juego de PS1 necesita un archivo BIOS. ' +
        'Agrégalo en la sección BIOS de la <a href="index.html">biblioteca</a>.');
    }
  }

  // CDN oficial: envía las cabeceras CORS/CORP necesarias para funcionar
  // con el aislamiento (COEP) que requiere el núcleo de PSP.
  const CDN = 'https://cdn.emulatorjs.org/stable/data/';

  // Aviso para juegos muy grandes: Safari en iPhone/iPad limita la memoria
  // por pestaña y una ISO enorme puede cerrarla ("A problem repeatedly
  // occurred"). Mejor avisar antes de intentar.
  if (rom.size > 500 * 1024 * 1024) {
    const mb = Math.round(rom.size / 1024 / 1024);
    const ok = confirm(
      `Este juego pesa ${mb} MB. En iPhone/iPad el navegador puede quedarse ` +
      'sin memoria con archivos tan grandes y cerrar la página.\n\n' +
      'Consejo: convierte la ISO a formato .cso (comprimido) con PPSSPP o ' +
      'maxcso en una PC; suele reducir el tamaño a la mitad.\n\n' +
      '¿Intentar de todos modos?'
    );
    if (!ok) {
      location.href = 'index.html';
      return;
    }
  }

  window.EJS_player = '#game';
  window.EJS_core = consoleInfo ? consoleInfo.core : rom.console;
  window.EJS_gameName = rom.name; // mantiene estable el nombre de las partidas guardadas
  window.EJS_gameId = rom.id;
  // Se pasa el archivo directamente (no una URL blob): así EmulatorJS lo lee
  // sin hacer una copia extra de todo el juego en memoria.
  window.EJS_gameUrl = rom.data;
  // Sin caché interna de ROMs: el juego ya vive en la biblioteca local y
  // cachearlo duplicaría su tamaño en memoria y en disco.
  window.EJS_CacheLimit = 0;
  window.EJS_pathtodata = CDN;
  window.EJS_language = 'es-ES';
  window.EJS_startOnLoaded = true;
  window.EJS_backgroundColor = '#000000';
  window.EJS_cheats = cheats;
  if (biosUrl) window.EJS_biosUrl = biosUrl;
  // PSP necesita hilos (SharedArrayBuffer). El service worker coi-serviceworker
  // habilita el aislamiento necesario en GitHub Pages.
  window.EJS_threads = rom.console === 'psp' && window.crossOriginIsolated === true;
  window.EJS_defaultOptions = { 'save-state-location': 'browser' };

  if (rom.console === 'psp' && !window.crossOriginIsolated) {
    showMsg('Preparando soporte PSP… si el juego no carga, recarga la página una vez.');
    setTimeout(() => msgEl.classList.add('hidden'), 6000);
  }

  const script = document.createElement('script');
  script.src = CDN + 'loader.js';
  script.crossOrigin = 'anonymous';
  script.onerror = () => showMsg('No se pudo descargar el emulador. Revisa tu conexión a internet y recarga.');
  document.body.appendChild(script);

  // Red de seguridad para las partidas: vuelca el archivo de guardado del
  // juego (SRAM/memory card) al almacenamiento del navegador periódicamente
  // y al salir de la página.
  function flushSaves() {
    try {
      const em = window.EJS_emulator;
      if (em && em.gameManager && typeof em.gameManager.saveSaveFiles === 'function') {
        em.gameManager.saveSaveFiles();
      }
    } catch (e) { /* mejor esfuerzo */ }
  }
  setInterval(flushSaves, 60 * 1000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushSaves();
  });
  window.addEventListener('pagehide', flushSaves);
})();
