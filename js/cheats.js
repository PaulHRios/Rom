'use strict';

// Base de trucos incluida. Cada entrada se asocia a un juego por consola +
// patrón sobre el nombre. Los códigos con varias partes se unen con "+"
// (formato que entiende RetroArch/EmulatorJS).
//
// Puedes agregar más juegos aquí, o desde la app con el botón "Trucos" de
// cada juego (esos se guardan en el dispositivo).
const CHEAT_DB = [
  {
    console: 'gb',
    match: /pok[eé]?mon.*(red|blue|rojo|azul)/i,
    title: 'Pokémon Rojo / Azul (GameShark)',
    cheats: [
      ['Caramelo Raro infinito (1er espacio de la mochila)', '01287CD5'],
      ['Master Ball infinita (1er espacio de la mochila)', '01017CD5'],
      ['Atravesar paredes', '010138CD'],
      ['Dinero máximo', '019946D3+019947D3+019948D3'],
    ],
  },
  {
    console: 'gba',
    match: /(fire ?red|leaf ?green|rojo ?fuego|verde ?hoja)/i,
    title: 'Pokémon Rojo Fuego / Verde Hoja v1.0 (GameShark)',
    cheats: [
      ['Caramelos Raros (revisa el espacio 1 del PC de objetos)', '82025840 0044'],
      ['Master Balls (revisa el espacio 1 del PC de objetos)', '82025840 0001'],
    ],
  },
  {
    console: 'n64',
    match: /super ?mario ?64/i,
    title: 'Super Mario 64 NTSC-USA (GameShark)',
    cheats: [
      ['99 vidas', '8033B21D 0063'],
      ['Energía infinita', '8133B21E 08FF'],
    ],
  },
  {
    console: 'nes',
    match: /super ?mario ?bros/i,
    title: 'Super Mario Bros. (Game Genie)',
    cheats: [
      ['Vidas infinitas', 'SXIOPO'],
    ],
  },
];

// Devuelve los grupos de trucos incluidos que aplican a un juego.
function curatedCheatGroups(consoleId, gameName) {
  return CHEAT_DB.filter((g) => g.console === consoleId && g.match.test(gameName));
}

// Lista plana [nombre, código] para pasarle a EmulatorJS (EJS_cheats).
function curatedCheatsFlat(consoleId, gameName) {
  return curatedCheatGroups(consoleId, gameName).flatMap((g) => g.cheats);
}
