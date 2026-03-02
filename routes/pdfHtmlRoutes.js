// routes/pdfHtmlRoutes.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const puppeteer = require("puppeteer");
const { PDFDocument } = require("pdf-lib");

// ✅ mailer (posielanie originál PDF + tech listy)
const mailer = require("../utils/mailer");

const router = express.Router();

function safeText(v) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function escapeHtml(s = "") {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

function formatNumSk(n, digits = 1) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "–";
  return Number(n).toFixed(digits).replace(".", ",");
}

function isoDateTimeSk() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function applyTemplate(html, vars, baseHref) {
  let out = html;

  // zoradíme kľúče od NAJDLHŠÍCH po najkratšie
  const keys = Object.keys(vars).sort((a, b) => b.length - a.length);

  for (const k of keys) {
    const v = vars[k];
    const token = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, "g");
    out = out.replace(token, safeText(v));
  }

  if (!/<base\s/i.test(out)) {
    out = out.replace(/<head([^>]*)>/i, `<head$1><base href="${baseHref}">`);
  } else {
    out = out.replace(/<base[^>]*href="[^"]*"[^>]*>/i, `<base href="${baseHref}">`);
  }

  return out;
}

function toAbsPublicUrl(baseOrigin, maybePath) {
  if (!maybePath) return "";
  let p = String(maybePath).trim();
  if (!p) return "";
  if (/^https?:\/\//i.test(p)) return p;
  if (p.startsWith("img/")) p = "/" + p;
  if (!p.startsWith("/")) p = "/" + p;
  return baseOrigin.replace(/\/$/, "") + p;
}

const PAGE = {
  INTRO: "pdf_balkon_intro.html",
  SUMMARY: "pdf_balkon_page2.html",
  LAYER_LOW: "pdf_balkon_page3.html",
  ADHESIVE: "pdf_balkon_page4.html",
  WATERPROOF: "pdf_balkon_page5.html",
  EDGE: "pdf_balkon_page6.html",
  EDGE_COMPONENTS: "pdf_balkon_page7.html",
  RECAP: "pdf_balkon_page8.html",
  BARIN_1: "pdf_balkon_page9.html",
  BARIN_2: "pdf_balkon_page10.html",
  RECAP_BARIN: "pdf_balkon_page11.html",
  BARIN_NEW: "pdf_balkon_page_barin.html",
  KERDI: "pdf_balkon_page6_kerdi.html",
  KERDI_DRAIN: "pdf_balkon_page7_kerdi_drain.html",
};

function resolvePlan(payload) {
  console.log("CALC DEBUG:", payload.calc);

  const heightId = safeText(payload?.calc?.heightId).toLowerCase();
  const drainId = safeText(payload?.calc?.drainId).toLowerCase();
  // NORMALIZÁCIA typu odvodnenia (oddelené od názvov systémov)
  const drainType =
    drainId.includes("internal") ? "internal" :
    drainId.includes("gutter") || drainId.includes("ryn") ? "gutter" :
    "free";

  const tileMaxSide =
    Number(payload?.calc?.tileMaxSideCm) ||
    Number(payload?.calc?.tileLongestSideCm) ||
    Number(payload?.calc?.tileSizeCm) ||
    0;

  const useDitraDrain = false;

  const isLow = heightId === "low";
  const isMedium = heightId === "medium";
  const isHigh = heightId === "high";
  const isInternal = drainType === "internal";
  const isGutter = drainType === "gutter";
  const isFree = drainType === "free";

  // ⭐ klasická DITRA
  if (isLow && isFree) {
    return {
      pages: [
        PAGE.INTRO,
        PAGE.SUMMARY,
        PAGE.LAYER_LOW,
        PAGE.ADHESIVE,
        PAGE.WATERPROOF,
        PAGE.EDGE,
        PAGE.RECAP,
      ],
      variant: { heightId, drainId, useDitraDrain }
    };
  }

  // ⭐ LOW + INTERNAL DRAIN (odtok v strede)
  if (isLow && isInternal) {
    return {
      pages: [
        PAGE.INTRO,
        PAGE.SUMMARY,
        PAGE.LAYER_LOW,
        PAGE.ADHESIVE,
        PAGE.WATERPROOF,
        PAGE.KERDI,
        PAGE.KERDI_DRAIN,
        PAGE.RECAP,
      ],
      variant: { heightId, drainId, useDitraDrain }
    };
  }

  // ⭐⭐ MEDIUM + INTERNAL DRAIN (KERDI-DRAIN)
  if (isMedium && isInternal) {
    return {
      pages: [
        PAGE.INTRO,
        PAGE.SUMMARY,
        "pdf_balkon_page3_ditra_drain.html",
        "pdf_balkon_page4_smart_adhesive.html",
        PAGE.WATERPROOF,
        PAGE.KERDI,
        PAGE.KERDI_DRAIN,
        "pdf_balkon_page8_system.html"
      ],
      variant: { heightId, drainId, useDitraDrain }
    };
  }

  // ⭐⭐ MEDIUM + BARIN (žľab pri hrane)
if (isMedium && isGutter) {
  return {
    pages: [
      PAGE.INTRO,
      PAGE.SUMMARY,
      "pdf_balkon_page3_ditra_drain.html",
      "pdf_balkon_page4_smart_adhesive.html",
      PAGE.WATERPROOF,
      "pdf_balkon_page6_bara_rtke.html",
      PAGE.BARIN_1,
      PAGE.BARIN_2,
      PAGE.RECAP_BARIN
    ],
    variant: { heightId, drainId, useDitraDrain }
  };
}
// ⭐⭐⭐ HIGH + INTERNAL DRAIN (KERDI-DRAIN – nová skladba)
if (isHigh && isInternal) {
  return {
    pages: [
      PAGE.INTRO,
      PAGE.SUMMARY,
      "pdf_balkon_troba_plus.html",
      PAGE.ADHESIVE,
      "pdf_balkon_page3_ditra_drain.html",
      PAGE.KERDI,
      PAGE.KERDI_DRAIN,
      PAGE.RECAP
    ],
    variant: { heightId, drainId, useDitraDrain }
  };
}
  // ⭐⭐⭐ HIGH – TROBA + BEKOTEC (vysoká skladba)
  if (isHigh) {
    return {
      pages: [
        PAGE.INTRO,
        PAGE.SUMMARY,
        "pdf_balkon_troba_plus.html",
        "pdf_balkon_bekotec_drain.html",
        PAGE.ADHESIVE,
        PAGE.BARIN_2,
        PAGE.RECAP
      ],
      variant: { heightId, drainId, useDitraDrain }
    };
  }

  // ⭐⭐ DITRA-DRAIN
  if (isMedium) {
    return {
      pages: [
        "pdf_balkon_intro.html",
        "pdf_balkon_page2.html",
        "pdf_balkon_page3_ditra_drain.html",
        "pdf_balkon_page4_smart_adhesive.html",
        "pdf_balkon_page5.html",
        "pdf_balkon_page6_bara_rake.html",
        "pdf_balkon_page7_bara_rake_components.html",
        "pdf_balkon_page8.html",
      ],
      variant: { heightId, drainId, useDitraDrain }
    };
  }

// gutter variant
if (isLow && isGutter) {
  const page6File = useDitraDrain
    ? "pdf_balkon_page6_bara_rake.html"
    : "pdf_balkon_page6_bara_rtk.html";

  return {
    pages: [
      PAGE.INTRO,
      PAGE.SUMMARY,
      PAGE.LAYER_LOW,
      PAGE.ADHESIVE,
      PAGE.WATERPROOF,
      page6File,
      PAGE.BARIN_NEW,
      PAGE.RECAP_BARIN
    ],
    variant: { heightId, drainId, useDitraDrain }
  };
}

  // fallback
  return {
    pages: [
      "pdf_balkon_intro.html",
      "pdf_balkon_page2.html",
      "pdf_balkon_page3.html",
      "pdf_balkon_page4.html",
    ],
    variant: { heightId, drainId, useDitraDrain }
  };
}

function pickNumber(obj, keys) {
  for (const k of keys) {
    const v = obj?.[k];
    const n = Number(v);
    if (v !== null && v !== undefined && !Number.isNaN(n)) return n;
  }
  return null;
}

function ceilPositive(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return null;
  if (x <= 0) return 0;
  return Math.ceil(x);
}

/**
 * Page 5 logic (server)
 */
function buildPage5Consumption(calc) {
  const perimeterFull =
    pickNumber(calc, ["perimeterFull"]) ??
    pickNumber(calc, ["perimeter_total", "perimeterTotal"]) ??
    pickNumber(calc, ["perimeter"]);

  const dims = calc?.dims || calc?.dimsRaw || {};

  const A =
    pickNumber(calc, ["a", "A", "lengthA", "lenA", "length", "longSide", "sideA"]) ??
    pickNumber(dims, ["A", "a", "sideA"]);

  const B =
    pickNumber(calc, ["b", "B", "widthB", "lenB", "width", "shortSide", "sideB"]) ??
    pickNumber(dims, ["B", "b", "sideB"]);

  const widthForJoints = B;
  const joints =
    widthForJoints != null
      ? Math.max(0, ceilPositive(widthForJoints / 1.0) - 1)
      : null;

  const kebaEdge = perimeterFull != null ? perimeterFull : null;
  const kebaJoints = joints != null && A != null ? joints * A : 0;
  const kebaTotal = kebaEdge != null ? kebaEdge + kebaJoints : null;

  const collEdgeKg = perimeterFull != null ? perimeterFull * 0.35 : null;
  const collJointsKg = joints != null && A != null ? joints * A * 0.36 : 0;
  const collTotalKg = collEdgeKg != null ? collEdgeKg + collJointsKg : null;

  const PACK_L = 4.25;
  const PACK_S = 1.85;

  let packsText = "–";
  if (collTotalKg != null) {
    const big = Math.ceil(collTotalKg / PACK_L);
    const rem = collTotalKg - big * PACK_L;

    if (collTotalKg <= PACK_L) {
      packsText = `1× 4,25 kg (alebo 1× 1,85 kg pri menšej spotrebe)`;
    } else {
      if (rem > 0.3) {
        if (rem <= PACK_S) {
          packsText = `${big}× 4,25 kg + 1× 1,85 kg`;
        } else {
          packsText = `${big + 1}× 4,25 kg`;
        }
      } else {
        packsText = `${big}× 4,25 kg`;
      }
    }
  }

  const ditraJointsText =
    joints == null
      ? "–"
      : joints === 0
        ? "0 (šírka do 1,0 m)"
        : `${joints} (šírka nad 1,0 m)`;

  const kebaEdgeText = kebaEdge != null ? `${formatNumSk(kebaEdge, 1)} m` : "–";
  const kebaJointsText =
    joints != null && A != null
      ? joints === 0
        ? "0,0 m"
        : `${formatNumSk(kebaJoints, 1)} m (≈ ${joints}× ${formatNumSk(A, 1)} m)`
      : "0,0 m";

  const kebaMetersText = kebaTotal != null ? `${formatNumSk(kebaTotal, 1)} m` : "–";
  const collConsumptionText = collTotalKg != null ? `≈ ${formatNumSk(collTotalKg, 2)} kg` : "–";

  return {
    ditraJointsText,
    kebaEdgeText,
    kebaJointsText,
    kebaMetersText,
    collConsumptionText,
    collPacksText: packsText,
  };
}

// ---------------------------------------------------------------------------
// ✅ Page 6/7: BARA-RT / BARA-RW helpery
// ---------------------------------------------------------------------------
function normalizeRtVariantFromText(recoTextRaw) {
  const t = safeText(recoTextRaw).toUpperCase().replace(/\s+/g, " ").trim();
  if (t.includes("RT12/65")) return "RT12/65";
  if (t.includes("RT12/15") || t.includes("RT12/16")) return "RT12/15";
  if (t.includes("RT9/60")) return "RT9/60";
  if (t.includes("RT20/50")) return "RT20/50";
  if (t.includes("RT25/40")) return "RT25/40";
  if (t.includes("RT30/35")) return "RT30/35";
  return "";
}

function buildBaraVars(calc, perimeterProfiles, profilePieces) {
  const tileMm = pickNumber(calc, ["tileThicknessMm"]) ?? null;
  const family = safeText(calc?.baraFamily).toUpperCase();
  const recoText = safeText(calc?.baraRecommendationText);
  const rwOptionsText = safeText(calc?.baraRwOptionsText);

  const tileThicknessText = tileMm != null ? `${Math.round(tileMm)} mm` : "–";
  const colorBaseText = "základná (bez RAL)";

  const pcs = Number.isFinite(Number(profilePieces)) ? Number(profilePieces) : null;
  const connectorsQty = pcs != null ? Math.max(0, pcs - 1) : null;
  const cornersQty = perimeterProfiles != null && perimeterProfiles > 0 ? 2 : 0;

  const rtVariant = normalizeRtVariantFromText(recoText) || "RT";
  const rtCornerCode = rtVariant && rtVariant !== "RT" ? `E90${rtVariant}` : "E90RT…";
  const rtConnectorCode = rtVariant && rtVariant !== "RT" ? `V/${rtVariant}` : "V/RT…";

  const rwCornerCode = "E90/RW…";
  const rwConnectorCode = "V/RW…";

  const baraProfileTypeText = family === "RW" ? "BARA-RW (alternatíva)" : "BARA-RT";

  // ---------------------------------------------------------------------------
  // ✅ RAKE logika pre DITRA-DRAIN
  // ---------------------------------------------------------------------------
  let rakeCornersText = "";
  let rakeInnerCornersText = "";
  let rakeConnectorsText = "";
  let rakeHeightChoiceText = "";

  if (family === "RAKE") {
    const tileMm = pickNumber(calc, ["tileThicknessMm"]) ?? 0;

    // Výška RAKE podľa hrúbky dlažby
    if (tileMm <= 10) rakeHeightChoiceText = "BARA RAKE 10 mm";
    else if (tileMm <= 15) rakeHeightChoiceText = "BARA RAKE 15 mm";
    else if (tileMm <= 18) rakeHeightChoiceText = "BARA RAKE 18 mm";
    else if (tileMm <= 20) rakeHeightChoiceText = "BARA RAKE 21 mm";
    else {
      rakeHeightChoiceText =
        "BARA RAKE je určený pre dlažby do max. 20 mm. Pre hrubšiu dlažbu odporúčame riešenie na terčoch.";
      rakeCornersText = "—";
      rakeInnerCornersText = "—";
      rakeConnectorsText = "—";
    }

    // Ak je dlažba v norme, rátame komponenty
    if (tileMm <= 20) {
      const pcs = Number.isFinite(Number(profilePieces)) ? Number(profilePieces) : 0;

      // jednoduchá logika: 2 vonkajšie rohy, žiadne vnútorné (pre väčšinu tvarov)
      const corners = 2;
      const innerCorners = 0;
      const connectors = Math.max(0, pcs - 1 - corners - innerCorners);

      rakeCornersText = `${corners} ks`;
      rakeInnerCornersText = `${innerCorners} ks`;
      rakeConnectorsText = `${connectors} ks`;
    }
  }

  let baraHeightChoiceText = "–";
  let baraHeightNoteText = "";
  if (family === "RT") {
    baraHeightChoiceText = recoText ? recoText : "BARA-RT (podľa hrúbky dlažby)";
    baraHeightNoteText =
      "RT: horné číslo profilu kryje a chráni hranu dlažby; spodné číslo je len prekrytie betónu (dekor).";
  } else if (family === "RW") {
    baraHeightChoiceText =
      "BARA-RW (odporúčané pri dlažbách nad 30 mm alebo ako alternatíva)";
    baraHeightNoteText =
      "RW je dekoračný profil – rieši len spodné prekrytie betónu (odkvapový „jazyk“). Krytie dlažby sa pri RW nepočíta.";
  } else {
    baraHeightChoiceText = recoText ? recoText : "–";
  }

  const rtProfilePiecesText = family === "RT" ? (pcs != null ? `${pcs} ks` : "–") : "–";
  const rtCornersText = family === "RT" ? `${cornersQty} ks` : "–";
  const rtConnectorsText =
    family === "RT" ? (connectorsQty != null ? `${connectorsQty} ks` : "–") : "–";
  const rtColorCode = family === "RT" ? colorBaseText : "–";

  const rwLengthText = perimeterProfiles != null ? `${formatNumSk(perimeterProfiles, 1)} m` : "–";
  const rwProfilePiecesText = family === "RW" ? (pcs != null ? `${pcs} ks` : "–") : "–";
  const rwCornerCodeAndQty = family === "RW" ? `${rwCornerCode} (${cornersQty} ks)` : "–";
  const rwConnectorCodeAndQty =
    family === "RW"
      ? `${rwConnectorCode} (${connectorsQty != null ? connectorsQty : 0} ks)`
      : "–";
  const rwColorCode = family === "RW" ? colorBaseText : "–";

  const rwOptionsLine =
    family === "RW" && rwOptionsText
      ? rwOptionsText
      : family === "RW"
        ? "Možnosti RW spodok (mm): 15, 25, 30, 45, 55, 75, 95, 120, 150"
        : "";

  const rtCodeShortText = family === "RT" ? (rtVariant || "RT…") : "–";
  const rtCornerCodeText = family === "RT" ? rtCornerCode : "–";
  const rtConnectorCodeText = family === "RT" ? rtConnectorCode : "–";

  return {
    tileThicknessText,
    baraFamilyText: family || "–",
    baraRecommendationText: recoText || "–",
    baraRwOptionsText: rwOptionsLine,
    baraProfileTypeText,
    baraHeightChoiceText,
    baraHeightNoteText,
    rtProfilePiecesText,
    rtCornersText,
    rtConnectorsText,
    rtColorCode,
    rtCodeShortText,
    rtCornerCodeText,
    rtConnectorCodeText,
    rwLengthText,
    rwProfilePiecesText,
    rwCornerCodeAndQty,
    rwConnectorCodeAndQty,
    rwColorCode,

    // 👇 RAKE
    rakeCornersText,
    rakeInnerCornersText,
    rakeConnectorsText,
    rakeHeightChoiceText,
  };
}

// ---------------------------------------------------------------------------
// ✅ Server fallback – SVG náčrt (nezmenené)
// ---------------------------------------------------------------------------
function buildShapeSketchSvg(calc) {
  const shapeKey = safeText(calc?.shapeKey || "").toLowerCase();
  const dims = calc?.dims || calc?.dimsRaw || {};
  const wall = calc?.wallSides || calc?.wallSidesRaw || {};

  const A = pickNumber(dims, ["A", "a", "sideA"]) ?? null;
  const B = pickNumber(dims, ["B", "b", "sideB"]) ?? null;
  const C = pickNumber(dims, ["C", "c", "sideC"]) ?? null;
  const D = pickNumber(dims, ["D", "d", "sideD"]) ?? null;
  const E = pickNumber(dims, ["E", "e", "sideE"]) ?? null;
  const F = pickNumber(dims, ["F", "f", "sideF"]) ?? null;

  const isWall = (k) => !!wall?.[k];

  const bubble = (x, y, text, dashed = false) => `
    <g>
      <circle cx="${x}" cy="${y}" r="14" fill="#0b1f50" />
      <circle cx="${x}" cy="${y}" r="14" fill="none" stroke="#ffffff" stroke-width="1.5" ${
    dashed ? 'stroke-dasharray="3 3"' : ""
  }/>
      <text x="${x}" y="${y + 4}" text-anchor="middle" font-size="12" fill="#ffffff" font-family="Arial" font-weight="700">${text}</text>
    </g>
  `;

  const edge = (x1, y1, x2, y2, dashed) => `
    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
      stroke="#111827" stroke-width="4" stroke-linecap="round"
      ${dashed ? 'stroke-dasharray="8 6" stroke="#6b7280"' : ""}/>
  `;

  const W = 420, H = 240;

  if (shapeKey === "square") {
    const label = A != null ? formatNumSk(A, 1) : "A";
    const wallTop = isWall("A");

    const x1 = 90, y1 = 40, x2 = 330, y2 = 200;

    return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" height="100%">
    <rect x="0" y="0" width="${W}" height="${H}" fill="transparent"/>
    ${edge(x1, y1, x2, y1, wallTop)}
    ${edge(x2, y1, x2, y2, false)}
    ${edge(x2, y2, x1, y2, false)}
    ${edge(x1, y2, x1, y1, false)}
    ${bubble((x1 + x2) / 2, y1 - 10, label, wallTop)}
    ${bubble(x2 + 18, (y1 + y2) / 2, label, false)}
    ${bubble((x1 + x2) / 2, y2 + 18, label, false)}
    ${bubble(x1 - 18, (y1 + y2) / 2, label, false)}

    <text x="10" y="${H - 20}" font-size="10" fill="#6b7280" font-family="Arial">
      ● čísla = zadané rozmery (m)
    </text>
    <text x="10" y="${H - 8}" font-size="10" fill="#6b7280" font-family="Arial">
      — čiarkovane = strana pri stene / napojení
    </text>
  </svg>`;
  }

  if (shapeKey === "rectangle") {
    const labelA = A != null ? formatNumSk(A, 1) : "A";
    const labelB = B != null ? formatNumSk(B, 1) : "B";
    const wallA = isWall("A");
    const wallB = isWall("B");

    const x1 = 70, y1 = 45, x2 = 350, y2 = 195;

    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" height="100%">
  <rect x="0" y="0" width="${W}" height="${H}" fill="transparent"/>
  ${edge(x1, y1, x2, y1, wallA)}
  ${edge(x2, y1, x2, y2, false)}
  ${edge(x2, y2, x1, y2, false)}
  ${edge(x1, y2, x1, y1, wallB)}
  ${bubble((x1 + x2) / 2, y1 - 10, labelA, wallA)}
  ${bubble(x2 + 18, (y1 + y2) / 2, labelB, false)}
  ${bubble((x1 + x2) / 2, y2 + 18, labelA, false)}
  ${bubble(x1 - 18, (y1 + y2) / 2, labelB, wallB)}
</svg>`;
  }

  if (shapeKey === "l-shape") {
    const lA = A != null ? formatNumSk(A, 1) : "A";
    const lB = B != null ? formatNumSk(B, 1) : "B";
    const lC = C != null ? formatNumSk(C, 1) : "C";
    const lD = D != null ? formatNumSk(D, 1) : "D";
    const lE = E != null ? formatNumSk(E, 1) : "E";
    const lF = F != null ? formatNumSk(F, 1) : "F";

    const p1 = [90, 45];
    const p2 = [330, 45];
    const p3 = [330, 110];
    const p4 = [230, 110];
    const p5 = [230, 195];
    const p6 = [90, 195];

    const seg = (a, b, key) => edge(a[0], a[1], b[0], b[1], isWall(key));

    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" height="100%">
  <rect x="0" y="0" width="${W}" height="${H}" fill="transparent"/>
  ${seg(p1, p2, "A")}
  ${seg(p2, p3, "B")}
  ${seg(p3, p4, "C")}
  ${seg(p4, p5, "D")}
  ${seg(p5, p6, "E")}
  ${seg(p6, p1, "F")}

  ${bubble((p1[0] + p2[0]) / 2, p1[1] - 10, lA, isWall("A"))}
  ${bubble(p2[0] + 18, (p2[1] + p3[1]) / 2, lB, isWall("B"))}
  ${bubble((p3[0] + p4[0]) / 2, p3[1] - 10, lC, isWall("C"))}
  ${bubble(p4[0] + 18, (p4[1] + p5[1]) / 2, lD, isWall("D"))}
  ${bubble((p5[0] + p6[0]) / 2, p5[1] + 18, lE, isWall("E"))}
  ${bubble(p6[0] - 18, (p6[1] + p1[1]) / 2, lF, isWall("F"))}
</svg>`;
  }

  return "";
}

function buildVars(payload, pageNo, totalPages, baseOrigin) {
  console.log("DEBUG CALC:", payload.calc);
  const calc = payload?.calc || {};
  const bom = payload?.bom || {};
  const pdfMeta = payload?.pdfMeta || {};
  const ownerEmail = safeText(payload?.meta?.email || "");

  const customerLabel =
    safeText(pdfMeta?.customerLabel) ||
    safeText(calc?.customerName) ||
    safeText(calc?.customerLabel) ||
    "Zákazník";

  const customerEmailForPdf = pdfMeta?.showEmailInPdf
    ? safeText(pdfMeta?.customerEmail) || ownerEmail
    : "";

  const pdfCode = safeText(payload?.meta?.pdfCode) || `LC-${Date.now()}`;

  const area = calc?.area;

  const perimeterProfiles =
    pickNumber(calc, ["perimeterProfiles"]) ??
    pickNumber(calc, ["perimeter_profiles", "perimeterProfiles"]) ??
    pickNumber(calc, ["perimeter"]);

  const perimeterFull =
    pickNumber(calc, ["perimeterFull"]) ??
    pickNumber(calc, ["perimeter_total", "perimeterTotal"]) ??
    pickNumber(calc, ["perimeter"]);

  const shapeLabel = safeText(calc?.shapeLabel || "–");
  const heightLabel = safeText(calc?.heightLabel || "–");
  const drainLabel = safeText(calc?.drainLabel || "–");

  const areaText = area != null ? `${formatNumSk(area, 1)} m²` : "–";
  const perimeterText = perimeterProfiles != null ? `${formatNumSk(perimeterProfiles, 1)} bm` : "–";

  const ditraAreaText =
    bom?.membraneArea != null
      ? `${formatNumSk(bom.membraneArea, 1)} m²`
      : area != null
        ? `${formatNumSk(area, 1)} m²`
        : "–";

  const adhesiveBagsText = bom?.adhesiveBags != null ? `${safeText(bom.adhesiveBags)} ks` : "–";

  const adhesiveConsumptionText =
    bom?.adhesiveBags != null && area != null && area > 0
      ? `≈ ${formatNumSk((bom.adhesiveBags * 25) / area, 1)} kg/m²`
      : "–";

  const edgeLengthText = perimeterProfiles != null ? `${formatNumSk(perimeterProfiles, 1)} m` : "–";
  const edgeProfilePiecesText = bom?.profilesCount != null ? `${safeText(bom.profilesCount)} ks` : "–";

  let shapeSketchSvg = safeText(calc?.shapeSketchSvg || "");
  if (!shapeSketchSvg) {
    shapeSketchSvg = buildShapeSketchSvg(calc);
  }

  const heightId = safeText(calc?.heightId || "").toLowerCase();
  const drainId = safeText(calc?.drainId || "").toLowerCase();

  // ------------------------------------------------------------
// TECHNICKÁ POZNÁMKA PODĽA VÝŠKY A FORMÁTU DLAŽBY
// ------------------------------------------------------------
const tileSizeCm = Number(calc?.tileSizeCm || 0);
let formatNoteText = "";

if (heightId === "low") {
  if (tileSizeCm > 30) {
    formatNoteText =
      "Pri väčších formátoch dlažby (nad 30 × 30 cm) odporúčame zvážiť skladbu s drenážnou vrstvou. Väčšie formáty v exteriéri zvyšujú napätie vplyvom teplotných zmien.";
  } else {
    formatNoteText =
      "Pri bežných formátoch dlažby (do cca 30 × 30 cm) je táto skladba plne vyhovujúca pre exteriérové použitie.";
  }
}

if (heightId === "medium") {
  formatNoteText =
    "Táto skladba obsahuje drenážnu vrstvu, ktorá znižuje napätie spôsobené teplotnými zmenami. Je vhodná aj pre väčšie formáty dlažby v exteriéri.";
}

if (heightId === "high") {
  formatNoteText =
    "Systém BEKOTEC-DRAIN predstavuje konštrukčne robustné riešenie vhodné aj pre väčšie formáty dlažby a vyššie mechanické zaťaženie.";
}
// ------------------------------------------------------------
// ĽUDSKÝ POPIS SKLADBY (STRANA 2)
// ------------------------------------------------------------
const humanSummaryText = `
<p>
Vybrali ste si balkón v tvare <strong>${shapeLabel}</strong>
s plochou <strong>${areaText}</strong>
a obvodom pre ukončovacie lišty <strong>${perimeterText}</strong>.
</p>

<p>
Zvolená je <strong>${heightLabel}</strong>,
pričom voda bude odvádzaná <strong>${drainLabel}</strong>.
</p>

<p>
Odporúčaným riešením je systém
<strong>„${safeText(calc?.systemTitle || "")}“</strong>,
ktorý je navrhnutý pre tento typ konštrukcie a zabezpečuje
ochranu hrany dlažby aj kontrolovaný odtok vody.
</p>

<p>
${formatNoteText}
</p>
`;

  const tileMaxSide =
    Number(calc?.tileMaxSideCm) ||
    Number(calc?.tileLongestSideCm) ||
    Number(calc?.tileSizeCm) ||
    0;

  const useDitraDrain = tileMaxSide > 30;

  // ✅ BARIN – zvod / výška balkóna od zeme (pripravíme pre templaty)
  const barinHasDownpipe = !!calc?.barinHasDownpipe;
  const barinHeightCmNum =
    pickNumber(calc, ["barinHeightCm", "barinHeightFromGroundCm", "balconyHeightCm"]) ??
    null;

  const isGutter =
    drainId === "edge-gutter" ||
    drainId.includes("gutter") ||
    drainId.includes("ryn");

  const barinDownpipeHeightText =
    isGutter && barinHasDownpipe && barinHeightCmNum != null && barinHeightCmNum > 0
      ? `${formatNumSk(barinHeightCmNum, 0)} cm`
      : "";

  const barinDownpipeNoteText =
    isGutter && barinHasDownpipe && barinHeightCmNum != null && barinHeightCmNum > 0
      ? "Pri žľabe Schlüter®-BARIN je potrebné doobjednať zvod (dodáva sa typicky v dĺžkach 2,50 m a 1,00 m). Zvod sa objednáva vo farbe profilu BARA a vo farbe systému BARIN; farba nemá vplyv na cenu a určuje sa pri objednávke."
      : "";

  let cutawayImage = "";
  if (heightId === "low" && drainId === "edge-free") {
    cutawayImage = useDitraDrain
      ? "/img/systems/balkon-edge-free.png"
      : "/img/systems/balkon-low-edge-free.png";
  }
  else if (heightId === "low" && drainId === "edge-gutter") {
    cutawayImage = useDitraDrain
      ? "/img/systems/balkon-edge-gutter.png"
      : "/img/systems/balkon-low-edge-gutter.png";
  }
  else if (heightId === "low" && drainId === "internal-drain") cutawayImage = "/img/systems/balkon-low-internal-drain.png";
  else if (heightId === "medium" && drainId === "edge-free") cutawayImage = "/img/systems/balkon-edge-free.png";
  else if (heightId === "medium" && drainId === "edge-gutter") cutawayImage = "/img/systems/balkon-edge-gutter.png";
  else if (heightId === "medium" && drainId === "internal-drain") cutawayImage = "/img/systems/balkon-internal-drain.png";
  else if (heightId === "high" && drainId === "edge-gutter") cutawayImage = "/img/systems/balkon-high-edge-gutter.png";
  else if (heightId === "high" && drainId === "internal-drain") cutawayImage = "/img/systems/balkon-high-internal-drain.png";

  const fromCalcPreview = safeText(calc?.previewSrc);
  if (fromCalcPreview) {
    cutawayImage = fromCalcPreview.startsWith("/")
      ? fromCalcPreview
      : fromCalcPreview.startsWith("img/")
        ? "/" + fromCalcPreview
        : fromCalcPreview;
  }

  const systemCutawayImageAbs = cutawayImage ? toAbsPublicUrl(baseOrigin, cutawayImage) : "";

  const page5 = buildPage5Consumption({
    ...calc,
    perimeterFull,
    dims: calc?.dims || calc?.dimsRaw
  });

  const profilePiecesNum = bom?.profilesCount != null ? Number(bom.profilesCount) : null;

  // ✅ DITRA vs DITRA-DRAIN pre stranu 8 (rekapitulácia)
  if (useDitraDrain && !calc.baraFamily) {
    calc.baraFamily = "RAKE";
    calc.baraRecommendationText = "BARA-RAKE odkvapový profil pre systém DITRA-DRAIN";
  }

  // prepíš texty pre rekapituláciu
  let systemTitleOverride = safeText(calc?.systemTitle || "");
  let systemShortNoteOverride = safeText(calc?.systemShortNote || "");

  // ✅ SMART TEXT PRE REKAPITULÁCIU (strana 8)
  const baraFamily = safeText(calc?.baraFamily || "").toUpperCase();

  if (baraFamily === "RT") {
    systemShortNoteOverride +=
      " Ukončenie hrany je riešené profilom BARA-RT, ktorý chráni hranu dlažby a zabezpečuje kontrolovaný odtok vody.";
  }

  if (baraFamily === "RW") {
    systemShortNoteOverride +=
      " Ukončenie hrany je riešené profilom BARA-RW, ktorý slúži ako estetické prekrytie betónovej hrany.";
  }

  if (drainId.includes("gutter") || drainId.includes("ryn")) {
    systemShortNoteOverride +=
      " Odvod vody je riešený žľabovým systémom BARIN pri hrane balkóna.";
  }

  if (useDitraDrain) {
    systemTitleOverride = "Schlüter® DITRA-DRAIN + KERDI 200";
    systemShortNoteOverride =
      "Použitá drenážna rohož DITRA-DRAIN 8 s podkladovou hydroizoláciou KERDI 200. Odvodnenie prebieha pod dlažbou, nie po povrchu.";
  }

  // ✅ STRANA 4 – spotreba lepidla
  const areaM2 = Number(calc?.area) || 0;

  let adhesiveLayerCount = 2; // základ: rohož + hydro
  if (useDitraDrain) adhesiveLayerCount = 3; // DITRA-DRAIN má o vrstvu viac

  const adhesiveLayersText =
    adhesiveLayerCount === 2
      ? "Lepidlo sa používa na lepenie separačnej rohože a hydroizolačnej vrstvy."
      : "Pri systéme DITRA-DRAIN sa lepidlo používa na lepenie drenážnej rohože, separačnej rohože a hydroizolačnej vrstvy.";

  const baraVars = buildBaraVars(calc, perimeterProfiles, profilePiecesNum);
  const adhesiveTotalKg = (areaM2 * adhesiveLayerCount * 1.4).toFixed(1);
  const adhesiveBags25kg = Math.ceil(adhesiveTotalKg / 25);

  // 🔁 spätná kompatibilita pre staré HTML šablóny
  return {
    customerName: customerLabel,
    customerEmail: customerEmailForPdf,
    createdAt: isoDateTimeSk(),
    constructionType: shapeLabel,
    systemTitle: systemTitleOverride,
    systemShortNote: systemShortNoteOverride,
    totalPages,
    pageNo,

    ...page5,
    ...baraVars,

    // ✅ nové BARIN premenné pre templaty
    barinDownpipeHeightText,
    barinDownpipeNoteText,
    barinHasDownpipe,
    barinHeightCm: barinHeightCmNum,

    pdfCode,
    customerLabel,
    customerEmailForPdf,

    areaText,
    perimeterText,
    ditraAreaText,
    adhesiveBagsText,
    adhesiveConsumptionText,

    edgeLengthText,
    edgeProfilePiecesText,

    shapeLabel,
    heightLabel,
    drainLabel,

    shapeSketchSvg,
    systemCutawayImageAbs,

    adhesiveLayersText,
    adhesiveTotalKg,
    adhesiveBags25kg,
    formatNoteText,
    humanSummaryText,
  };
}

async function htmlToPdfBuffer(browser, html) {
  const page = await browser.newPage();

  await page.setViewport({
    width: 1240,
    height: 1754,
    deviceScaleFactor: 1,
  });

  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.emulateMediaType("print");

  const pdf = await page.pdf({
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
  });

  await page.close();
  return pdf;
}

async function mergePdfBuffers(buffers) {
  const outDoc = await PDFDocument.create();
  for (const buf of buffers) {
    const src = await PDFDocument.load(buf);
    const pages = await outDoc.copyPages(src, src.getPageIndices());
    pages.forEach((p) => outDoc.addPage(p));
  }
  const merged = await outDoc.save();
  return Buffer.from(merged);
}

function cleanPath(p) {
  return (p || "").toString().trim();
}

function findChromeExecutable() {
  const envPath = cleanPath(process.env.PUPPETEER_EXECUTABLE_PATH);
  if (envPath) {
    const ok = fs.existsSync(envPath);
    console.log("[PDF] env PUPPETEER_EXECUTABLE_PATH:", JSON.stringify(envPath), "exists:", ok);
    if (ok) return envPath;
  }

  try {
    const p = cleanPath(puppeteer.executablePath());
    const ok = p ? fs.existsSync(p) : false;
    console.log("[PDF] puppeteer.executablePath():", JSON.stringify(p), "exists:", ok);
    if (p && ok) return p;
  } catch (e) {
    console.log("[PDF] puppeteer.executablePath() error:", e?.message || e);
  }

  return "";
}

async function buildMergedPdfFromPayload(req, payload) {
  // 🔵 TEST UNIFIED TEMPLATE
const testFile = "pdf_balkon_unified.html";
const filePath = path.join(process.cwd(), "public", testFile);

const raw = fs.readFileSync(filePath, "utf8");

const vars = buildVars(payload, 1, 2, `${req.protocol}://${req.get("host")}`);

const html = applyTemplate(raw, vars, `${req.protocol}://${req.get("host")}/`);

const chromePath = findChromeExecutable();
const browser = await puppeteer.launch({
  headless: "new",
  executablePath: chromePath || undefined,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

try {
  const pdfBuffer = await htmlToPdfBuffer(browser, html);
  return pdfBuffer;
} finally {
  await browser.close();
}
  const plan = resolvePlan(payload);
  if (!plan || !Array.isArray(plan.pages)) {
    throw new Error("PDF PLAN ERROR: plan.pages nie je pole");
  }
  const totalPages = plan.pages.length;
  const baseOrigin = `${req.protocol}://${req.get("host")}`;

  const htmlPages = plan.pages.map((fileName, idx) => {
    const filePath = path.join(process.cwd(), "public", fileName);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Chýba HTML stránka: ${filePath}`);
    }

    const raw = fs.readFileSync(filePath, "utf8");
    const vars = buildVars(payload, idx + 1, totalPages, baseOrigin);

    if (!payload.meta) payload.meta = {};
    payload.meta.pdfCode = vars.pdfCode;

    const baseHref = `${baseOrigin}/`;
    return applyTemplate(raw, vars, baseHref);
  });

  const chromePath = findChromeExecutable();
  console.log("[PDF] chromePath used:", chromePath ? JSON.stringify(chromePath) : "(empty)");

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      executablePath: chromePath || undefined,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  } catch (launchErr) {
    console.error("[PDF] puppeteer launch error:", launchErr);
    throw new Error("Chyba pri generovaní PDF: nepodarilo sa spustiť Chromium/Chrome na Renderi.");
  }

  try {
    const pdfBuffers = [];
    for (const html of htmlPages) {
      const buf = await htmlToPdfBuffer(browser, html);
      pdfBuffers.push(buf);
    }
    return await mergePdfBuffers(pdfBuffers);
  } finally {
    await browser.close();
  }
}

function buildAdminOfferSummaryHtml({ payload, to, customerName }) {
  const calc = payload?.calc || {};
  const bom = payload?.bom || {};

  const area = calc?.area != null ? `${formatNumSk(calc.area, 1)} m²` : "–";
  const per = calc?.perimeter != null ? `${formatNumSk(calc.perimeter, 1)} bm` : "–";

  const system = safeText(calc?.systemTitle || "–");
  const shape = safeText(calc?.shapeLabel || "–");
  const type = safeText(calc?.typeLabel || "–");
  const height = safeText(calc?.heightLabel || "–");
  const drain = safeText(calc?.drainLabel || "–");

  const ditra = bom?.membraneArea != null ? `${formatNumSk(bom.membraneArea, 1)} m²` : area;
  const profiles = bom?.profilesCount != null ? `${safeText(bom.profilesCount)} ks` : "–";
  const adhesive = bom?.adhesiveBags != null ? `${safeText(bom.adhesiveBags)} ks` : "–";

  const baraText = safeText(calc?.baraRecommendationText || "–");
  const tileMm = calc?.tileThicknessMm != null ? `${safeText(calc.tileThicknessMm)} mm` : "–";

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5">
      <h2 style="margin:0 0 10px">Lištobook – NOVÁ žiadosť o cenovú ponuku (balkón)</h2>
      <p style="margin:0 0 8px">Zákazník: <strong>${escapeHtml(customerName)}</strong></p>
      <p style="margin:0 0 14px">E-mail: <strong>${escapeHtml(to)}</strong></p>

      <div style="background:#f4f6fb;border:1px solid #d7deef;border-radius:10px;padding:12px">
        <p style="margin:0 0 8px"><strong>Typ:</strong> ${escapeHtml(type)}</p>
        <p style="margin:0 0 8px"><strong>Tvar:</strong> ${escapeHtml(shape)}</p>
        <p style="margin:0 0 8px"><strong>Výška:</strong> ${escapeHtml(height)}</p>
        <p style="margin:0 0 8px"><strong>Odtok:</strong> ${escapeHtml(drain)}</p>
        <p style="margin:0 0 8px"><strong>Systém:</strong> ${escapeHtml(system)}</p>
        <hr style="border:none;border-top:1px solid #d7deef;margin:10px 0"/>
        <p style="margin:0 0 6px"><strong>Plocha:</strong> ${escapeHtml(area)}</p>
        <p style="margin:0 0 6px"><strong>Obvod pre profily:</strong> ${escapeHtml(per)}</p>
        <p style="margin:0 0 6px"><strong>DITRA (m²):</strong> ${escapeHtml(ditra)}</p>
        <p style="margin:0 0 6px"><strong>Profily (ks):</strong> ${escapeHtml(profiles)}</p>
        <p style="margin:0 0 6px"><strong>Lepidlo (vrecia):</strong> ${escapeHtml(adhesive)}</p>
        <hr style="border:none;border-top:1px solid #d7deef;margin:10px 0"/>
        <p style="margin:0 0 6px"><strong>Dlažba:</strong> ${escapeHtml(tileMm)}</p>
        <p style="margin:0"><strong>BARA odporúčanie:</strong> ${escapeHtml(baraText)}</p>
      </div>

      <p style="margin:12px 0 0;color:#334155">
        Admin notifikácia je bez príloh (PDF dostal zákazník).
      </p>
    </div>
  `;
}

/**
 * ✅ DOWNLOAD originál PDF
 * POST /api/pdf/balkon-final-html
 */
router.post("/balkon-final-html", async (req, res) => {
  try {
    const payload = req.body?.payload;
    if (!payload) return res.status(400).json({ message: "Chýba payload." });

    const merged = await buildMergedPdfFromPayload(req, payload);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="balkon-final.pdf"');
    return res.status(200).send(merged);
  } catch (e) {
    console.error("balkon-final-html error:", e);
    return res.status(500).json({ message: e.message || "PDF chyba" });
  }
});

/**
 * ✅ SEND e-mailom: originál PDF + technické listy
 * (TLAČIDLO 2) – len zákazník, žiadna admin kópia
 * POST /api/pdf/balkon-final-html-send
 */
router.post("/balkon-final-html-send", async (req, res) => {
  try {
    const payload = req.body?.payload;
    if (!payload) return res.status(400).json({ message: "Chýba payload." });

    const calc = payload?.calc || {};
    const pdfMeta = payload?.pdfMeta || {};
    const ownerEmail = safeText(payload?.meta?.email || "");

    const to =
      safeText(pdfMeta?.customerEmail) ||
      safeText(calc?.customerEmail) ||
      ownerEmail;

    if (!to) {
      return res.status(400).json({
        message: "Chýba e-mail príjemcu (payload.pdfMeta.customerEmail alebo payload.meta.email).",
      });
    }

    const customerName =
      safeText(pdfMeta?.customerLabel) ||
      safeText(calc?.customerName) ||
      safeText(calc?.customerLabel) ||
      "Zákazník";

    const merged = await buildMergedPdfFromPayload(req, payload);

    if (typeof mailer.sendBalconyOfferCustomerEmail === "function") {
      await mailer.sendBalconyOfferCustomerEmail({
        to,
        pdfBuffer: merged,
        pdfFilename: "balkon-final.pdf",
        customerName,
        variant: resolvePlan(payload).variant,
      });
    } else if (typeof mailer.sendBalconyDocsEmail === "function") {
      await mailer.sendBalconyDocsEmail({
        to,
        pdfBuffer: merged,
        pdfFilename: "balkon-final.pdf",
        customerName,
        variant: resolvePlan(payload).variant,
      });
    } else if (typeof mailer.sendPdfEmail === "function") {
      await mailer.sendPdfEmail({
        to,
        subject: "Lištobook – Vaša kalkulácia (PDF)",
        html: `<p>Dobrý deň ${escapeHtml(customerName)}, v prílohe je PDF.</p>`,
        pdfBuffer: merged,
        filename: "balkon-final.pdf",
      });
    } else {
      throw new Error("Mailer nemá žiadnu použiteľnú funkciu (sendBalconyOfferCustomerEmail/sendBalconyDocsEmail/sendPdfEmail).");
    }

    return res.status(200).json({ ok: true, message: "PDF odoslané e-mailom.", to });
  } catch (e) {
    console.error("balkon-final-html-send error:", e);
    return res.status(500).json({ message: e.message || "E-mail/PDF chyba" });
  }
});

/**
 * ✅ OFFER (TLAČIDLO 3):
 * - zákazník dostane PDF + tech listy + text “ponuka”
 * - admin dostane notifikáciu BEZ príloh
 * POST /api/pdf/balkon-final-html-offer
 */
router.post("/balkon-final-html-offer", async (req, res) => {
  try {
    const payload = req.body?.payload;
    if (!payload) return res.status(400).json({ message: "Chýba payload." });

    const calc = payload?.calc || {};
    const pdfMeta = payload?.pdfMeta || {};
    const ownerEmail = safeText(payload?.meta?.email || "");

    const to =
      safeText(pdfMeta?.customerEmail) ||
      safeText(calc?.customerEmail) ||
      ownerEmail;

    if (!to) {
      return res.status(400).json({ message: "Chýba e-mail príjemcu." });
    }

    const customerName =
      safeText(pdfMeta?.customerLabel) ||
      safeText(calc?.customerName) ||
      "Zákazník";

    const merged = await buildMergedPdfFromPayload(req, payload);

    // ✅ zákazník dostane PDF + offer text
    await mailer.sendBalconyOfferCustomerEmail({
      purpose: "offer",
      to,
      pdfBuffer: merged,
      pdfFilename: "balkon-final.pdf",
      customerName,
      variant: {
        heightId: calc?.heightId,
        drainId: calc?.drainId,
        useDitraDrain: Number(calc?.tileSizeCm || 0) > 30
      },
    });

    // ✅ admin dostane TEN ISTÝ PDF ako zákazník (bez tech listov)
    const adminHtml = buildAdminOfferSummaryHtml({ payload, to, customerName });

    await mailer.sendPdfEmail({
      to: "bratislava@listovecentrum.sk",
      subject: `Žiadosť o cenovú ponuku – balkón – ${to}`,
      html: adminHtml,
      pdfBuffer: merged,
      filename: "balkon-final.pdf",
    });

    return res.status(200).json({
      ok: true,
      message: "Ponuka bola odoslaná zákazníkovi aj adminovi.",
      to
    });

  } catch (e) {
    console.error("balkon-final-html-offer error:", e);
    return res.status(500).json({ message: e.message || "E-mail/PDF chyba" });
  }
});

module.exports = router;
