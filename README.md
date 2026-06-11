# 🎮 Mi Consola Retro

Emulador personal multi-consola que corre en el navegador (iPhone, iPad o PC),
pensado para jugar con un control de PS5 por Bluetooth. Funciona como página
web estática en GitHub Pages — no necesita servidor.

## Consolas soportadas

| Consola | Formatos | Notas |
|---|---|---|
| Game Boy / Game Boy Color | `.gb` `.gbc` | ✅ Perfecto en iPhone |
| Game Boy Advance | `.gba` | ✅ Perfecto en iPhone |
| Nintendo (NES) | `.nes` | ✅ Perfecto en iPhone |
| Super Nintendo (SNES) | `.sfc` `.smc` | ✅ Perfecto (aquí va Yoshi's Island) |
| Nintendo 64 | `.n64` `.z64` `.v64` | ✅ Bien en iPhone 15 |
| PlayStation 1 | `.cue/.bin` `.chd` `.pbp` | ✅ Necesita tu archivo BIOS |
| PSP | `.iso` `.cso` | ⚠️ Funciona, exigente; juegos 2D/medios van mejor |
| **PlayStation 2** | — | ❌ **No es posible en un navegador** (ver abajo) |

### ¿Por qué no PS2?

No existe ningún emulador de PS2 que funcione en un navegador web (y menos en
un iPhone): la PS2 necesita demasiada potencia y los emuladores como PCSX2 o
AetherSX2 son aplicaciones nativas de PC/Android. Además, una ISO de PS2 pesa
varios GB y GitHub Pages no admite archivos de más de 100 MB.

**Para jugar San Andreas en tu iPhone hay una salida mejor:** GTA San Andreas
tiene **versión nativa para iOS en el App Store** (también incluida con la
suscripción de Netflix como "GTA: San Andreas – The Definitive Edition").
Soporta tu control de PS5 perfectamente. Need for Speed Hot Pursuit 2 y FIFA
también existen en PS1, que sí funciona aquí.

## Cómo publicarlo (una sola vez)

1. Entra a **Settings → Pages** de este repositorio.
2. En **Source** elige **GitHub Actions**.
3. Ejecuta el workflow "Publicar en GitHub Pages" (pestaña **Actions**) o haz
   cualquier push a la rama configurada.
4. Tu emulador quedará en `https://<tu-usuario>.github.io/<repo>/`.

## Cómo usarlo en iPhone/iPad

1. Abre la página en Safari.
2. **Muy importante:** toca el botón compartir → **"Añadir a pantalla de
   inicio"** y juega siempre desde ese ícono. Así iOS trata la app como
   instalada y **no borra tus partidas** por inactividad.
3. Toca **＋ Agregar juego** y elige el archivo ROM desde la app Archivos.
4. Toca **▶ Jugar**. Listo.

### ¿De dónde salen los juegos?

Este repositorio **no incluye ROMs** (son material con copyright y no se
pueden redistribuir; además no cabrían en GitHub Pages). Crea copias de
respaldo de los cartuchos/discos que ya posees y agrégalas con el botón
**＋ Agregar juego**. Los juegos quedan guardados **en tu dispositivo**
(no se suben a ningún lado), así que solo los agregas una vez.

## Control de PS5 (DualSense)

1. Mantén presionados **PS + Create** hasta que la barra de luz parpadee.
2. En el iPhone/iPad: **Ajustes → Bluetooth → DualSense Wireless Controller**.
3. Dentro del juego funciona automáticamente. Si quieres cambiar botones:
   menú del emulador → **Control Settings**.

## Trucos 🧩

- Cada juego tiene un botón **Trucos** en la biblioteca: ahí ves los trucos
  incluidos y puedes agregar códigos GameShark / Game Genie / Action Replay
  (los encuentras en gamehacking.org).
- Dentro del juego: menú ⚙️ → **Cheats** → activa cada truco con su
  interruptor. Ahí puedes encender *toditos* los que quieras.
- Vienen trucos precargados para Pokémon Rojo/Azul, Pokémon Rojo Fuego/Verde
  Hoja, Super Mario 64 y Super Mario Bros. Agrega más en `js/cheats.js` o
  desde la propia app.

## Tus partidas están seguras 💾

- Las partidas (saves del juego y estados guardados) se guardan en el
  almacenamiento del navegador de tu dispositivo, y la app pide al sistema
  almacenamiento **persistente**.
- El emulador además vuelca el guardado a disco cada 60 segundos y al salir.
- Usa **Guardar estado** en el menú del juego (⚙️) antes de cerrar.
- **Respaldo de verdad:** botón **⬇️ Exportar partidas** en la biblioteca
  descarga un archivo con TODAS tus partidas. Guárdalo en iCloud/Archivos de
  vez en cuando. Si algo pasa, **⬆️ Importar respaldo** lo restaura todo.
  Si vas a jugar 80 horas, exporta el respaldo cada par de sesiones.

## Espacio en GitHub Pages

- GitHub Pages permite ~**1 GB** de sitio publicado, archivos de máximo
  **100 MB** y ~100 GB de tráfico al mes.
- Esta app solo pesa unos KB porque **las ROMs no se suben a GitHub**: se
  guardan en tu dispositivo. O sea, tu límite real es el espacio libre de tu
  iPhone/iPad, no el de GitHub.

## BIOS de PS1

Los juegos de PS1 necesitan el BIOS de tu consola (ej. `scph5501.bin`).
Agrégalo una vez en la sección **BIOS** de la biblioteca y queda guardado.

---

*Solo para uso personal con copias de juegos que posees. El emulador usa
[EmulatorJS](https://emulatorjs.org) (licencia GPL-3.0), cargado desde CDN.*
