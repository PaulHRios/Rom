'use strict';

// Consolas soportadas. "core" es el nombre que entiende EmulatorJS.
const CONSOLES = [
  { id: 'gb',   name: 'Game Boy / Game Boy Color', core: 'gb',   exts: ['gb', 'gbc', 'dmg', 'sgb'] },
  { id: 'gba',  name: 'Game Boy Advance',          core: 'gba',  exts: ['gba'] },
  { id: 'nes',  name: 'Nintendo (NES)',            core: 'nes',  exts: ['nes', 'fds', 'unf'] },
  { id: 'snes', name: 'Super Nintendo (SNES)',     core: 'snes', exts: ['sfc', 'smc'] },
  { id: 'n64',  name: 'Nintendo 64',               core: 'n64',  exts: ['n64', 'z64', 'v64', 'ndd'] },
  { id: 'psx',  name: 'PlayStation 1',             core: 'psx',  exts: ['cue', 'bin', 'img', 'chd', 'pbp'], needsBios: true },
  { id: 'psp',  name: 'PSP',                       core: 'psp',  exts: ['iso', 'cso'] },
];

function consoleById(id) {
  return CONSOLES.find((c) => c.id === id) || null;
}

// Adivina la consola a partir de la extensión del archivo.
function guessConsole(filename) {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  if (ext === 'zip') return null; // el usuario elige
  return CONSOLES.find((c) => c.exts.includes(ext)) || null;
}
