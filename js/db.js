'use strict';

// Almacenamiento local: ROMs, trucos personalizados y BIOS viven en IndexedDB
// dentro del dispositivo. También incluye exportar/importar respaldos de las
// partidas guardadas (los datos que escribe EmulatorJS).
const RomDB = (() => {
  const NAME = 'rom-library';
  const VERSION = 1;
  let dbPromise = null;

  function open() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(NAME, VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('roms')) {
            db.createObjectStore('roms', { keyPath: 'id', autoIncrement: true });
          }
          if (!db.objectStoreNames.contains('cheats')) {
            db.createObjectStore('cheats', { keyPath: 'romId' });
          }
          if (!db.objectStoreNames.contains('bios')) {
            db.createObjectStore('bios', { keyPath: 'console' });
          }
        };
        req.onsuccess = () => {
          // Si otra pestaña/restauración necesita borrar la BD, soltamos la conexión.
          req.result.onversionchange = () => req.result.close();
          resolve(req.result);
        };
        req.onerror = () => reject(req.error);
      });
    }
    return dbPromise;
  }

  function tx(storeName, mode, fn) {
    return open().then((db) => new Promise((resolve, reject) => {
      const t = db.transaction(storeName, mode);
      const request = fn(t.objectStore(storeName));
      t.oncomplete = () => resolve(request ? request.result : undefined);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    }));
  }

  // ---- ROMs ----
  const addRom = (rom) => tx('roms', 'readwrite', (s) => s.add(rom));
  const getRom = (id) => tx('roms', 'readonly', (s) => s.get(id));
  const allRoms = () => tx('roms', 'readonly', (s) => s.getAll());
  const deleteRom = async (id) => {
    await tx('roms', 'readwrite', (s) => s.delete(id));
    await tx('cheats', 'readwrite', (s) => s.delete(id));
  };

  // ---- Trucos personalizados ----
  const getCheats = (romId) =>
    tx('cheats', 'readonly', (s) => s.get(romId)).then((r) => (r ? r.list : []));
  const setCheats = (romId, list) =>
    tx('cheats', 'readwrite', (s) => s.put({ romId, list }));

  // ---- BIOS ----
  const getBios = (consoleId) => tx('bios', 'readonly', (s) => s.get(consoleId));
  const setBios = (consoleId, name, data) =>
    tx('bios', 'readwrite', (s) => s.put({ console: consoleId, name, data }));
  const deleteBios = (consoleId) => tx('bios', 'readwrite', (s) => s.delete(consoleId));

  // =====================  Respaldo de partidas  =====================
  // Exporta a JSON todas las bases de datos donde EmulatorJS guarda partidas
  // (estados y archivos de guardado) más los trucos y BIOS de esta app.
  // No incluye las ROMs (son grandes y puedes volver a agregarlas).

  const SKIP_DBS = ['EmulatorJS-core', 'EmulatorJS-roms', 'EmulatorJS-bios'];
  const FALLBACK_DBS = ['/data/saves', 'EmulatorJS-states', NAME];

  function bytesToB64(bytes) {
    let str = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      str += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
    }
    return btoa(str);
  }

  function b64ToBytes(b64) {
    const str = atob(b64);
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
    return bytes;
  }

  async function encodeValue(v) {
    if (v === null || v === undefined || typeof v !== 'object') return v;
    if (v instanceof ArrayBuffer) return { __t: 'ab', v: bytesToB64(new Uint8Array(v)) };
    if (ArrayBuffer.isView(v)) {
      return {
        __t: 'ta',
        n: v.constructor.name,
        v: bytesToB64(new Uint8Array(v.buffer, v.byteOffset, v.byteLength)),
      };
    }
    if (v instanceof Blob) {
      const buf = new Uint8Array(await v.arrayBuffer());
      return { __t: 'blob', mime: v.type, v: bytesToB64(buf) };
    }
    if (v instanceof Date) return { __t: 'date', v: v.getTime() };
    if (Array.isArray(v)) {
      const out = [];
      for (const item of v) out.push(await encodeValue(item));
      return { __t: 'arr', v: out };
    }
    const out = {};
    for (const k of Object.keys(v)) out[k] = await encodeValue(v[k]);
    return { __t: 'obj', v: out };
  }

  function decodeValue(v) {
    if (v === null || v === undefined || typeof v !== 'object') return v;
    switch (v.__t) {
      case 'ab': return b64ToBytes(v.v).buffer;
      case 'ta': {
        const bytes = b64ToBytes(v.v);
        const Ctor = self[v.n] || Uint8Array;
        return new Ctor(bytes.buffer, 0, bytes.byteLength / (Ctor.BYTES_PER_ELEMENT || 1));
      }
      case 'blob': return new Blob([b64ToBytes(v.v)], { type: v.mime || '' });
      case 'date': return new Date(v.v);
      case 'arr': return v.v.map(decodeValue);
      case 'obj': {
        const out = {};
        for (const k of Object.keys(v.v)) out[k] = decodeValue(v.v[k]);
        return out;
      }
      default: return v;
    }
  }

  function openRaw(name, version, onUpgrade) {
    return new Promise((resolve, reject) => {
      const req = version ? indexedDB.open(name, version) : indexedDB.open(name);
      if (onUpgrade) req.onupgradeneeded = () => onUpgrade(req);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('Base de datos bloqueada: ' + name));
    });
  }

  async function dumpDatabase(name) {
    const db = await openRaw(name);
    try {
      const storeNames = Array.from(db.objectStoreNames);
      const stores = [];
      for (const storeName of storeNames) {
        if (name === NAME && storeName === 'roms') continue; // ROMs fuera del respaldo
        const t = db.transaction(storeName, 'readonly');
        const os = t.objectStore(storeName);
        const meta = { name: storeName, keyPath: os.keyPath, autoIncrement: os.autoIncrement };
        const entries = await new Promise((resolve, reject) => {
          const list = [];
          const cursorReq = os.openCursor();
          cursorReq.onsuccess = async () => {
            const cursor = cursorReq.result;
            if (!cursor) return resolve(list);
            list.push([cursor.key, cursor.value]);
            cursor.continue();
          };
          cursorReq.onerror = () => reject(cursorReq.error);
        });
        const encoded = [];
        for (const [k, v] of entries) {
          encoded.push([await encodeValue(k), await encodeValue(v)]);
        }
        stores.push({ ...meta, entries: encoded });
      }
      return { name, version: db.version, stores };
    } finally {
      db.close();
    }
  }

  async function exportBackup() {
    let names;
    if (indexedDB.databases) {
      names = (await indexedDB.databases())
        .map((d) => d.name)
        .filter((n) => n && !SKIP_DBS.includes(n));
    } else {
      names = FALLBACK_DBS;
    }
    const dbs = [];
    for (const name of names) {
      try {
        dbs.push(await dumpDatabase(name));
      } catch (e) {
        console.warn('No se pudo respaldar', name, e);
      }
    }
    const payload = { format: 'retro-backup-v1', date: new Date().toISOString(), dbs };
    return new Blob([JSON.stringify(payload)], { type: 'application/json' });
  }

  async function restoreIntoOwnDb(dump) {
    for (const store of dump.stores) {
      if (!['cheats', 'bios'].includes(store.name)) continue;
      await tx(store.name, 'readwrite', (s) => {
        s.clear();
        for (const [k, v] of store.entries) {
          const value = decodeValue(v);
          if (store.keyPath) s.put(value);
          else s.put(value, decodeValue(k));
        }
        return null;
      });
    }
  }

  async function restoreDatabase(dump) {
    if (dump.name === NAME) return restoreIntoOwnDb(dump);
    await new Promise((resolve) => {
      const req = indexedDB.deleteDatabase(dump.name);
      req.onsuccess = req.onerror = req.onblocked = () => resolve();
    });
    const db = await openRaw(dump.name, dump.version || 1, (req) => {
      for (const store of dump.stores) {
        if (!req.result.objectStoreNames.contains(store.name)) {
          req.result.createObjectStore(store.name, {
            keyPath: store.keyPath || undefined,
            autoIncrement: !!store.autoIncrement,
          });
        }
      }
    });
    try {
      for (const store of dump.stores) {
        await new Promise((resolve, reject) => {
          const t = db.transaction(store.name, 'readwrite');
          const os = t.objectStore(store.name);
          for (const [k, v] of store.entries) {
            const value = decodeValue(v);
            if (store.keyPath) os.put(value);
            else os.put(value, decodeValue(k));
          }
          t.oncomplete = () => resolve();
          t.onerror = () => reject(t.error);
        });
      }
    } finally {
      db.close();
    }
  }

  async function importBackup(jsonText) {
    const payload = JSON.parse(jsonText);
    if (payload.format !== 'retro-backup-v1') {
      throw new Error('Este archivo no es un respaldo válido.');
    }
    for (const dump of payload.dbs) {
      await restoreDatabase(dump);
    }
    return payload.dbs.length;
  }

  return {
    addRom, getRom, allRoms, deleteRom,
    getCheats, setCheats,
    getBios, setBios, deleteBios,
    exportBackup, importBackup,
  };
})();
