// public/config_balkony.js
// Konfiguračný súbor – všetky systémové skladby pre balkóny.
// TENTO SÚBOR ZATIAĽ NIE JE NAPOJENÝ NA KALKULAČKU.
// V ďalšom kroku z neho začneme čítať v calc_balkony.js.

(function () {
  // 3 výškové kategórie
  const HEIGHTS = {
    LOW: {
      id: "LOW",
      label: "Nízka výška konštrukcie",
      // orientačne – využijeme neskôr pri otázke v kroku 2
      minMm: 40,
      maxMm: 70,
    },
    MEDIUM: {
      id: "MEDIUM",
      label: "Stredná výška konštrukcie",
      minMm: 70,
      maxMm: 110,
    },
    HIGH: {
      id: "HIGH",
      label: "Vyššia výška konštrukcie (BEKOTEC-DRAIN)",
      minMm: 110,
      maxMm: 160,
    },
  };

  // 3 typy odtoku vody
  const DRAIN_TYPES = {
    EDGE_FREE: {
      id: "EDGE_FREE",
      label: "Voda steká cez voľnú hranu",
    },
    EDGE_GUTTER: {
      id: "EDGE_GUTTER",
      label: "Voda tečie do žľabu pri hrane",
    },
    FLOOR_DRAIN: {
      id: "FLOOR_DRAIN",
      label: "Voda odteká do vpustu v podlahe",
    },
  };

  /**
   * BALCONY_SYSTEMS
   * – 9 variant (3 výšky × 3 typy odtoku)
   *
   * Poznámka k množstvám:
   * - membraneUnit: "m²" alebo "ks"
   * - membranePerM2: koeficient na výpočet kusov z plochy
   *   (napr. BEKOTEC má 1,08 m² / ks).
   *   Zatiaľ je to len orientačné – logiku dopočítame v calc_balkony.js.
   */

  const BALCONY_SYSTEMS = [
    // -----------------------------
    // 1) NÍZKA VÝŠKA – DITRA
    // -----------------------------

    // 1.1 Nízka výška, voda cez voľnú hranu
    {
      id: "LOW_EDGE_FREE",
      heightCategory: HEIGHTS.LOW.id,
      drainType: DRAIN_TYPES.EDGE_FREE.id,

      uiTitle: "Základná skladba balkóna – nízka výška, voľná hrana",
      uiSubtitle: "Schlüter®-DITRA + ukončovací profil BARA-RT (bez žľabu)",

      description:
        "Riešenie pre balkóny s obmedzenou stavebnou výškou, kde voda steká voľne cez hranu bez žľabu. " +
        "Hydroizolácia a separácia pomocou rohože Schlüter®-DITRA, ukončenie hrany profilom BARA-RT.",

      membrane: {
        code: "DITRA",
        name: "Schlüter®-DITRA",
        unit: "m²",
        // 1 m² rohože na 1 m² plochy – orientačne
        perM2: 1,
      },

      edgeProfile: {
        code: "BARA-RT",
        name: "Schlüter®-BARA-RT",
        unit: "bm",
        perBm: 1,
      },

      gutterProfile: null,
      gutterChannel: null,

      floorDrain: null,

      usesBekotec: false,
      notes:
        "Vhodné pre rekonštrukcie s malou výškou. Lepidlo (Mapei / Sopro) počítame orientačne podľa plochy.",
    },

    // 1.2 Nízka výška, voda do žľabu pri hrane
    {
      id: "LOW_EDGE_GUTTER",
      heightCategory: HEIGHTS.LOW.id,
      drainType: DRAIN_TYPES.EDGE_GUTTER.id,

      uiTitle: "Nízka výška – žľab pri hrane balkóna",
      uiSubtitle:
        "Schlüter®-DITRA + profil BARA-RTKE / BARA-RTK + žľab BARIN",

      description:
        "Riešenie pre balkóny s malou výškou, kde je potrebné odviesť vodu do žľabu pri hrane. " +
        "Na ukončenie hrany a uloženie žľabu sa používajú profily BARA-RTKE alebo BARA-RTK, " +
        "odtok zabezpečuje hliníkový žľab Schlüter®-BARIN.",

      membrane: {
        code: "DITRA",
        name: "Schlüter®-DITRA",
        unit: "m²",
        perM2: 1,
      },

      edgeProfile: {
        code: "BARA-RTKE",
        name: "Schlüter®-BARA-RTKE / BARA-RTK",
        unit: "bm",
        perBm: 1,
      },

      gutterProfile: {
        code: "BARIN",
        name: "Schlüter®-BARIN – odkvapový žľab",
        unit: "bm",
        perBm: 1,
      },

      gutterChannel: null,
      floorDrain: null,

      usesBekotec: false,
      notes:
        "Žľab a príslušenstvo (rohy, koncovky) sa vyberú podľa dĺžky hrany a tvaru balkóna.",
    },

    // 1.3 Nízka výška, voda do vpustu v podlahe
    {
      id: "LOW_FLOOR_DRAIN",
      heightCategory: HEIGHTS.LOW.id,
      drainType: DRAIN_TYPES.FLOOR_DRAIN.id,

      uiTitle: "Nízka výška – podlahová vpusť",
      uiSubtitle: "Schlüter®-DITRA + vpusť KERDI-DRAIN",

      description:
        "Variant pre nízku stavebnú výšku, kde je voda odvádzaná do podlahovej vpuste. " +
        "Hydroizoláciu a separáciu zabezpečuje rohož Schlüter®-DITRA, v mieste odtoku " +
        "je napojenie na vpusť Schlüter®-KERDI-DRAIN.",

      membrane: {
        code: "DITRA",
        name: "Schlüter®-DITRA",
        unit: "m²",
        perM2: 1,
      },

      edgeProfile: {
        code: "BARA-RT",
        name: "Schlüter®-BARA-RT (alebo podobný nízky profil)",
        unit: "bm",
        perBm: 1,
      },

      gutterProfile: null,
      gutterChannel: null,

      floorDrain: {
        code: "KERDI-DRAIN",
        name: "Schlüter®-KERDI-DRAIN – podlahová vpusť",
        unit: "ks",
        perPiece: 1,
      },

      usesBekotec: false,
      notes:
        "Počet vpustí obvykle 1 ks, vo výnimočných prípadoch viac – ručne upraviteľné pri tvorbe PDF.",
    },

    // -----------------------------
    // 2) STREDNÁ VÝŠKA – DITRA-DRAIN (to, čo už dnes používaš)
    // -----------------------------

    // 2.1 Stredná výška, voda cez voľnú hranu
    {
      id: "MEDIUM_EDGE_FREE",
      heightCategory: HEIGHTS.MEDIUM.id,
      drainType: DRAIN_TYPES.EDGE_FREE.id,

      uiTitle: "Základná skladba balkóna – stredná výška, voľná hrana",
      uiSubtitle:
        "Schlüter®-DITRA-DRAIN 4/8 + ukončovací profil BARA-RT",

      description:
        "Štandardná skladba pre balkóny so strednou stavebnou výškou, kde voda steká cez voľnú hranu. " +
        "Drenáž a separácia pomocou rohože Schlüter®-DITRA-DRAIN, ukončenie hrany profilom BARA-RT.",

      membrane: {
        code: "DITRA-DRAIN",
        name: "Schlüter®-DITRA-DRAIN 4 / 8",
        unit: "m²",
        perM2: 1,
      },

      edgeProfile: {
        code: "BARA-RT",
        name: "Schlüter®-BARA-RT",
        unit: "bm",
        perBm: 1,
      },

      gutterProfile: null,
      gutterChannel: null,
      floorDrain: null,

      usesBekotec: false,
      notes:
        "Toto je v podstate skladba, ktorú už kalkulačka používa ako 'základnú skladbu balkóna'.",
    },

    // 2.2 Stredná výška, voda do žľabu pri hrane
    {
      id: "MEDIUM_EDGE_GUTTER",
      heightCategory: HEIGHTS.MEDIUM.id,
      drainType: DRAIN_TYPES.EDGE_GUTTER.id,

      uiTitle: "Stredná výška – žľab pri hrane balkóna",
      uiSubtitle:
        "Schlüter®-DITRA-DRAIN 4/8 + profily BARA-RTKE / BARA-RTK + žľab BARIN",

      description:
        "Riešenie pre balkóny so strednou výškou, kde je požadovaný odtok vody do žľabu pri hrane. " +
        "Kombinácia drenážnej rohože DITRA-DRAIN a okapových profilov BARA-RTKE / BARA-RTK " +
        "so žľabom Schlüter®-BARIN.",

      membrane: {
        code: "DITRA-DRAIN",
        name: "Schlüter®-DITRA-DRAIN 4 / 8",
        unit: "m²",
        perM2: 1,
      },

      edgeProfile: {
        code: "BARA-RTKE",
        name: "Schlüter®-BARA-RTKE / BARA-RTK",
        unit: "bm",
        perBm: 1,
      },

      gutterProfile: {
        code: "BARIN",
        name: "Schlüter®-BARIN – odkvapový žľab",
        unit: "bm",
        perBm: 1,
      },

      gutterChannel: null,
      floorDrain: null,

      usesBekotec: false,
      notes:
        "Žľab BARIN sa kombinuje s profilmi BARA-RTK / RTKE – podľa detailov z katalógu balkóny.",
    },

    // 2.3 Stredná výška, voda do vpustu v podlahe
    {
      id: "MEDIUM_FLOOR_DRAIN",
      heightCategory: HEIGHTS.MEDIUM.id,
      drainType: DRAIN_TYPES.FLOOR_DRAIN.id,

      uiTitle: "Stredná výška – podlahová vpusť",
      uiSubtitle: "Schlüter®-DITRA-DRAIN + KERDI-DRAIN",

      description:
        "Variant pre balkón so strednou výškou, kde sa voda odvádza do podlahovej vpuste. " +
        "Drenážnu a separačnú funkciu zabezpečuje DITRA-DRAIN, v mieste odtoku je napojenie " +
        "na vpusť Schlüter®-KERDI-DRAIN.",

      membrane: {
        code: "DITRA-DRAIN",
        name: "Schlüter®-DITRA-DRAIN 4 / 8",
        unit: "m²",
        perM2: 1,
      },

      edgeProfile: {
        code: "BARA-RT",
        name: "Schlüter®-BARA-RT (alebo podobný balkónový profil)",
        unit: "bm",
        perBm: 1,
      },

      gutterProfile: null,
      gutterChannel: null,

      floorDrain: {
        code: "KERDI-DRAIN",
        name: "Schlüter®-KERDI-DRAIN – podlahová vpusť",
        unit: "ks",
        perPiece: 1,
      },

      usesBekotec: false,
      notes:
        "Jednoduchý a univerzálny variant – vhodný aj pre väčšie plochy.",
    },

    // -----------------------------
    // 3) VYŠŠIA VÝŠKA – BEKOTEC-DRAIN
    // -----------------------------

    // 3.1 BEKOTEC-DRAIN, voda cez voľnú hranu
    {
      id: "HIGH_EDGE_FREE",
      heightCategory: HEIGHTS.HIGH.id,
      drainType: DRAIN_TYPES.EDGE_FREE.id,

      uiTitle: "BEKOTEC-DRAIN – voľná hrana balkóna",
      uiSubtitle:
        "Schlüter®-BEKOTEC-DRAIN + plošná drenáž TROBA-PLUS + BARA-RKL / RT",

      description:
        "Systém pre vyššie skladby, kde sa používa potěrová doska Schlüter®-BEKOTEC-DRAIN nad drenážou TROBA-PLUS. " +
        "Voda je odvádzaná dutinami systému BEKOTEC a voľne steká cez ukončovací profil BARA-RKL / BARA-RT.",

      membrane: {
        code: "BEKOTEC-DRAIN",
        name: "Schlüter®-BEKOTEC-DRAIN (dosky EN 23 FD)",
        unit: "ks",
        // 1 ks ≈ 1,08 m² užitnej plochy (z technického listu)
        perM2: 1 / 1.08,
      },

      edgeProfile: {
        code: "BARA-RKL",
        name: "Schlüter®-BARA-RKL (alebo BARA-RT pre voľnú hranu)",
        unit: "bm",
        perBm: 1,
      },

      gutterProfile: null,
      gutterChannel: null,
      floorDrain: null,

      usesBekotec: true,
      notes:
        "Počet dosiek BEKOTEC-DRAIN budeme počítať ako zaokrúhlenie nahor podľa plochy (ks).",
    },

    // 3.2 BEKOTEC-DRAIN, voda do žľabu pri hrane
    {
      id: "HIGH_EDGE_GUTTER",
      heightCategory: HEIGHTS.HIGH.id,
      drainType: DRAIN_TYPES.EDGE_GUTTER.id,

      uiTitle: "BEKOTEC-DRAIN – žľab pri hrane",
      uiSubtitle:
        "Schlüter®-BEKOTEC-DRAIN + profily BARA-RKLT / BARA-RKLE + žľab BARIN",

      description:
        "Variant pre vyššiu konštrukčnú výšku s použitím systému BEKOTEC-DRAIN a žľabu pri hrane. " +
        "Ukončovacie profily rady BARA-RKL / RKLT umožňujú uloženie žľabu Schlüter®-BARIN pri okraji balkóna.",

      membrane: {
        code: "BEKOTEC-DRAIN",
        name: "Schlüter®-BEKOTEC-DRAIN (dosky EN 23 FD)",
        unit: "ks",
        perM2: 1 / 1.08,
      },

      edgeProfile: {
        code: "BARA-RKLT",
        name: "Schlüter®-BARA-RKLT / RKL",
        unit: "bm",
        perBm: 1,
      },

      gutterProfile: {
        code: "BARIN",
        name: "Schlüter®-BARIN – odkvapový žľab",
        unit: "bm",
        perBm: 1,
      },

      gutterChannel: null,
      floorDrain: null,

      usesBekotec: true,
      notes:
        "Rohy, koncovky a závesy žľabu budeme dopĺňať v PDF podľa konkrétneho tvaru balkóna.",
    },

    // 3.3 BEKOTEC-DRAIN, voda do vpustu v podlahe
    {
      id: "HIGH_FLOOR_DRAIN",
      heightCategory: HEIGHTS.HIGH.id,
      drainType: DRAIN_TYPES.FLOOR_DRAIN.id,

      uiTitle: "BEKOTEC-DRAIN – podlahová vpusť",
      uiSubtitle:
        "Schlüter®-BEKOTEC-DRAIN + kontaktná drenáž DITRA-DRAIN + KERDI-DRAIN",

      description:
        "Najvyššia skladba pre balkóny s väčšou výškou: systém BEKOTEC-DRAIN ako nosná a drenážna vrstva, " +
        "nad ním kontaktná drenáž Schlüter®-DITRA-DRAIN a napojenie na podlahovú vpusť KERDI-DRAIN.",

      membrane: {
        code: "BEKOTEC-DRAIN",
        name: "Schlüter®-BEKOTEC-DRAIN (dosky EN 23 FD)",
        unit: "ks",
        perM2: 1 / 1.08,
      },

      // okraj môžeme riešiť rovnakým profilom, v praxi napr. BARA-RKL / RT
      edgeProfile: {
        code: "BARA-RKL",
        name: "Schlüter®-BARA-RKL / BARA-RT",
        unit: "bm",
        perBm: 1,
      },

      gutterProfile: null,
      gutterChannel: null,

      floorDrain: {
        code: "KERDI-DRAIN",
        name: "Schlüter®-KERDI-DRAIN – podlahová vpusť",
        unit: "ks",
        perPiece: 1,
      },

      usesBekotec: true,
      notes:
        "Pri tejto skladbe môže byť nad BEKOTEC-DRAIN ešte kontaktná drenážna rohož DITRA-DRAIN " +
        "– tú si v kalkulačke ukážeme v riadku 'Drenážna / separačná rohož'.",
    },
  ];

  // sprístupníme do global scope pre kalkulačku
  window.BALCONY_HEIGHTS = HEIGHTS;
  window.BALCONY_DRAIN_TYPES = DRAIN_TYPES;
  window.BALCONY_SYSTEMS = BALCONY_SYSTEMS;
})();
