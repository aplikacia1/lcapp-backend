// public/js/config_barin.js
// BARIN konfigurácia (oddelené od config_balkony.js)
// Cieľ: mať na jednom mieste kódy prvkov + pravidlá pre výpočet.
// ZATIAĽ sa to nikde nepoužíva (len to načítame do stránky).
// Fix: DN60 (Schlüter BARIN).

(function () {
  const BARIN = {
    dn: 60,

    // ==========================================================
    // BARIN-SR (žľabový systém – "rýna")
    // ==========================================================
    sr: {
      // Rovné žľaby (dĺžky v metroch)
      straight: {
        L250: { code: "BSR4 R 250 ...*", label: "BARIN-set žľab 2,50 m" },
        L150: { code: "BSR4 R 150 ...*", label: "BARIN-set žľab 1,50 m" },
      },

      // Koncovky (2 ks v balení) – v praxi rátame ako “set”
      endCaps: {
        code: "BSR4 E 2 ...*",
        label: "BARIN-set koncovky (2 ks)",
      },

      // Roh 90° bez zvodu (štandard)
      corner90: {
        code: "BSR4 EWG 90 ...*",
        label: "BARIN-set roh 90°",
      },

      // Roh 90° so zvodom – strana ľavá/pravá
      // (DN60 fix; výrobca uvádza DN 60 v kóde)
      corner90DownLeft: {
        code: "BSR4 E90 L DN 60 ...*",
        label: "BARIN-set roh 90° s odtokom vľavo (DN60)",
      },
      corner90DownRight: {
        code: "BSR4 E90 R DN 60 ...*",
        label: "BARIN-set roh 90° s odtokom vpravo (DN60)",
      },

      // Voliteľne: 135° (do budúcna)
      corner135: {
        code: "BSR4 EWG 135 ...*",
        label: "BARIN-set roh 135°",
      },
      corner135DownLeft: {
        code: "BSR4 E135 L DN 60 ...*",
        label: "BARIN-set roh 135° s odtokom vľavo (DN60)",
      },
      corner135DownRight: {
        code: "BSR4 E135 R DN 60 ...*",
        label: "BARIN-set roh 135° s odtokom vpravo (DN60)",
      },

      // Kotlík / hrdlo (ak sa bude riešiť napojenie)
      // zatiaľ len placeholder – doplníme neskôr, keď rozhodneme “ako presne”
      drainPot: {
        code: "BSR4 A DN 60 ...*",
        label: "BARIN-set žľabový kotlík (DN60)",
      },
    },

    // ==========================================================
    // BARIN-R (zvodové potrubie a tvarovky) – fix DN60
    // ==========================================================
    r: {
      pipe: {
        L100: { code: "BR 100 DN 60 ...*", label: "Svodové potrubie 1,00 m (DN60)" },
        L250: { code: "BR 250 DN 60 ...*", label: "Svodové potrubie 2,50 m (DN60)" },
      },
      elbows: {
        DEG40: { code: "BR B40 DN 60 ...*", label: "Oblúk 40° (DN60)" },
        DEG72: { code: "BR B72 DN 60 ...*", label: "Oblúk 72° (DN60)" },
        DEG85: { code: "BR B85 DN 60 ...*", label: "Oblúk 85° (DN60)" },
      },
      branch72: {
        code: "BR AZ DN 60 ...*",
        label: "Odbočka 72° (DN60)",
      },
      inlet: {
        code: "BR AM DN 60 ...*",
        label: "Nasávací hrdo (DN60)",
      },
      clamps: {
        SET100: { code: "BR RS100 DN 60 ...*", label: "Potrubní objímky-set (skrutka 100 mm)" },
        SET200: { code: "BR RS200 DN 60 ...*", label: "Potrubní objímky-set (skrutka 200 mm)" },
        SCREW200: { code: "BR SS 200", label: "Skrutka 200 mm" },
      },
    },
  };

  // Export do window (aby to vedel čítať PDF generátor / calc skript neskôr)
  window.BARIN_CONFIG = BARIN;
})();