'use strict';

(() => {
  const $ = (sel) => document.querySelector(sel);

  const gameList = $('#game-list');
  const addDialog = $('#add-dialog');
  const cheatsDialog = $('#cheats-dialog');
  const romFileInput = $('#rom-file');
  const backupFileInput = $('#backup-file');
  const biosFileInput = $('#bios-file');

  let pendingFile = null;     // archivo ROM elegido, en espera de confirmación
  let cheatsRom = null;       // juego cuyo diálogo de trucos está abierto
  let biosConsoleId = null;   // consola a la que se asignará el BIOS elegido

  function fmtSize(bytes) {
    if (bytes >= 1024 * 1024 * 1024) return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
    if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    return Math.max(1, Math.round(bytes / 1024)) + ' KB';
  }

  // ---- Persistencia y uso de almacenamiento ----
  async function updateStorageInfo() {
    if (!navigator.storage || !navigator.storage.estimate) return;
    try {
      const { usage, quota } = await navigator.storage.estimate();
      $('#storage-info').textContent =
        `Almacenamiento usado: ${fmtSize(usage || 0)} de ~${fmtSize(quota || 0)} disponibles en este dispositivo`;
    } catch (e) { /* opcional */ }
  }

  async function requestPersistence() {
    if (navigator.storage && navigator.storage.persist) {
      try { await navigator.storage.persist(); } catch (e) { /* opcional */ }
    }
  }

  // ---- Aviso de instalación (iOS) ----
  function setupBanner() {
    const banner = $('#install-banner');
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    if (isIos && !standalone && !localStorage.getItem('bannerDismissed')) {
      banner.classList.remove('hidden');
    }
    $('#dismiss-banner').addEventListener('click', () => {
      banner.classList.add('hidden');
      localStorage.setItem('bannerDismissed', '1');
    });
  }

  // ---- Lista de juegos ----
  async function renderGames() {
    const roms = await RomDB.allRoms();
    gameList.innerHTML = '';
    if (!roms.length) {
      gameList.innerHTML = '<p class="empty-msg">Aún no hay juegos. Toca <strong>＋ Agregar juego</strong> ' +
        'y elige un archivo ROM desde la app Archivos (iCloud, descargas, etc.).</p>';
      return;
    }
    roms.sort((a, b) => a.name.localeCompare(b.name));
    for (const rom of roms) {
      const consoleInfo = consoleById(rom.console);
      const card = document.createElement('div');
      card.className = 'game-card';
      card.innerHTML = `
        <div class="game-info">
          <span class="game-name"></span>
          <span class="game-meta"></span>
        </div>
        <div class="game-buttons">
          <button class="btn primary play-btn">▶ Jugar</button>
          <button class="btn cheats-btn">🧩 Trucos</button>
          <button class="btn danger delete-btn">🗑</button>
        </div>`;
      card.querySelector('.game-name').textContent = rom.name;
      card.querySelector('.game-meta').textContent =
        `${consoleInfo ? consoleInfo.name : rom.console} · ${fmtSize(rom.size)}`;
      card.querySelector('.play-btn').addEventListener('click', () => {
        location.href = 'player.html?id=' + rom.id;
      });
      card.querySelector('.cheats-btn').addEventListener('click', () => openCheats(rom));
      card.querySelector('.delete-btn').addEventListener('click', async () => {
        if (confirm(`¿Borrar "${rom.name}"? (Las partidas guardadas no se borran.)`)) {
          await RomDB.deleteRom(rom.id);
          renderGames();
          updateStorageInfo();
        }
      });
      gameList.appendChild(card);
    }
  }

  // ---- Agregar juego ----
  function setupAddGame() {
    // Sin atributo "accept": en iOS limitaría qué archivos se pueden elegir
    // en la app Archivos, y las ROMs usan extensiones poco comunes.
    const consoleSelect = $('#add-console');
    consoleSelect.innerHTML = CONSOLES
      .map((c) => `<option value="${c.id}">${c.name}</option>`)
      .join('');

    $('#add-game').addEventListener('click', () => {
      requestPersistence();
      romFileInput.value = '';
      romFileInput.click();
    });

    romFileInput.addEventListener('change', () => {
      const file = romFileInput.files[0];
      if (!file) return;
      pendingFile = file;
      $('#add-name').value = file.name.replace(/\.[^.]+$/, '');
      const guess = guessConsole(file.name);
      if (guess) consoleSelect.value = guess.id;
      $('#add-file-info').textContent = `Archivo: ${file.name} (${fmtSize(file.size)})`;
      addDialog.showModal();
    });

    $('#add-cancel').addEventListener('click', () => addDialog.close());

    $('#add-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!pendingFile) return addDialog.close();
      const btn = $('#add-confirm');
      btn.disabled = true;
      btn.textContent = 'Guardando…';
      try {
        await RomDB.addRom({
          name: $('#add-name').value.trim() || pendingFile.name,
          console: consoleSelect.value,
          fileName: pendingFile.name,
          size: pendingFile.size,
          addedAt: Date.now(),
          data: pendingFile,
        });
        addDialog.close();
        renderGames();
        updateStorageInfo();
      } catch (err) {
        alert('No se pudo guardar el juego: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Guardar';
        pendingFile = null;
      }
    });
  }

  // ---- Trucos ----
  async function openCheats(rom) {
    cheatsRom = rom;
    $('#cheats-title').textContent = 'Trucos — ' + rom.name;

    const curatedDiv = $('#cheats-curated');
    const groups = curatedCheatGroups(rom.console, rom.name);
    if (groups.length) {
      curatedDiv.innerHTML = groups.map((g) => `
        <div class="cheat-group">
          <h4>${g.title} <span class="tag">incluidos</span></h4>
          ${g.cheats.map(([name, code]) =>
            `<div class="cheat-row"><span>${name}</span><code>${code}</code></div>`).join('')}
        </div>`).join('');
    } else {
      curatedDiv.innerHTML = '<p class="hint">No hay trucos incluidos para este juego ' +
        '(se detectan por el nombre). Agrega los tuyos abajo.</p>';
    }

    await renderCustomCheats();
    cheatsDialog.showModal();
  }

  async function renderCustomCheats() {
    const list = await RomDB.getCheats(cheatsRom.id);
    const div = $('#cheats-custom');
    if (!list.length) {
      div.innerHTML = '<p class="hint">Sin trucos personalizados todavía.</p>';
      return;
    }
    div.innerHTML = '';
    list.forEach(([name, code], i) => {
      const row = document.createElement('div');
      row.className = 'cheat-row';
      row.innerHTML = `<span></span><code></code><button class="btn danger small">✕</button>`;
      row.querySelector('span').textContent = name;
      row.querySelector('code').textContent = code;
      row.querySelector('button').addEventListener('click', async () => {
        list.splice(i, 1);
        await RomDB.setCheats(cheatsRom.id, list);
        renderCustomCheats();
      });
      div.appendChild(row);
    });
  }

  function setupCheatsDialog() {
    $('#cheat-add-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = $('#cheat-name').value.trim();
      const code = $('#cheat-code').value.trim();
      if (!name || !code || !cheatsRom) return;
      const list = await RomDB.getCheats(cheatsRom.id);
      list.push([name, code]);
      await RomDB.setCheats(cheatsRom.id, list);
      $('#cheat-name').value = '';
      $('#cheat-code').value = '';
      renderCustomCheats();
    });
    $('#cheats-close').addEventListener('click', () => cheatsDialog.close());
  }

  // ---- Respaldos ----
  function setupBackup() {
    $('#export-saves').addEventListener('click', async () => {
      const btn = $('#export-saves');
      btn.disabled = true;
      btn.textContent = 'Creando respaldo…';
      try {
        const blob = await RomDB.exportBackup();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'respaldo-partidas-' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 60000);
      } catch (e) {
        alert('No se pudo crear el respaldo: ' + e.message);
      } finally {
        btn.disabled = false;
        btn.textContent = '⬇️ Exportar partidas (respaldo)';
      }
    });

    $('#import-saves').addEventListener('click', () => {
      backupFileInput.value = '';
      backupFileInput.click();
    });

    backupFileInput.addEventListener('change', async () => {
      const file = backupFileInput.files[0];
      if (!file) return;
      if (!confirm('Esto reemplazará las partidas guardadas actuales con las del respaldo. ¿Continuar?')) return;
      try {
        const n = await RomDB.importBackup(await file.text());
        alert(`Respaldo restaurado (${n} base(s) de datos). Tus partidas están de vuelta.`);
        renderGames();
        updateStorageInfo();
      } catch (e) {
        alert('No se pudo restaurar: ' + e.message);
      }
    });
  }

  // ---- BIOS ----
  async function renderBios() {
    const container = $('#bios-list');
    container.innerHTML = '';
    for (const c of CONSOLES.filter((c) => c.needsBios)) {
      const entry = await RomDB.getBios(c.id);
      const row = document.createElement('div');
      row.className = 'bios-row';
      const status = entry
        ? `<span class="tag ok">✓ ${entry.name}</span>`
        : '<span class="tag warn">falta BIOS</span>';
      row.innerHTML = `<span>${c.name}</span> ${status}
        <button class="btn small bios-set">${entry ? 'Cambiar' : 'Agregar BIOS'}</button>
        ${entry ? '<button class="btn danger small bios-del">✕</button>' : ''}`;
      row.querySelector('.bios-set').addEventListener('click', () => {
        biosConsoleId = c.id;
        biosFileInput.value = '';
        biosFileInput.click();
      });
      const del = row.querySelector('.bios-del');
      if (del) del.addEventListener('click', async () => {
        await RomDB.deleteBios(c.id);
        renderBios();
      });
      container.appendChild(row);
    }
  }

  function setupBios() {
    biosFileInput.addEventListener('change', async () => {
      const file = biosFileInput.files[0];
      if (!file || !biosConsoleId) return;
      await RomDB.setBios(biosConsoleId, file.name, file);
      biosConsoleId = null;
      renderBios();
    });
  }

  // ---- Inicio ----
  setupBanner();
  setupAddGame();
  setupCheatsDialog();
  setupBackup();
  setupBios();
  requestPersistence();
  renderGames();
  renderBios();
  updateStorageInfo();
})();
