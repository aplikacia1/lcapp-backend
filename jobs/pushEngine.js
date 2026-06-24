const webpush = require("web-push");
const PushSubscription = require("../models/PushSubscription");
const User = require("../models/User");
const Rating = require("../models/rating");
const Product = require("../models/product");

const {
  nowSK,
  shouldSendMorningJoke,
  shouldSendEveningStats,
  getSpecialMidnight
} = require("../utils/timeBrain");
let lastRun = {
  morning: null,
  evening: null,
  midnight: null
};

// ======= jednoduché vtipy =======
const JOKES = [
"Pri rezaní veľkoformátovej dlažby vždy podopri celý formát.",
"Dilatácia nie je chyba. Je to ochrana pred budúcou chybou.",
"Pred lepením skontroluj rovinnosť podkladu.",
"Hydroizolácia patrí pod dlažbu, nie až po reklamácii.",
"Pri balkónoch je správne odvodnenie rovnako dôležité ako samotná dlažba.",
"Dvakrát skontrolovaná výška profilu je lacnejšia ako prerábka.",
"DITRA oddeľuje pohyby podkladu od dlažby.",
"Pri vonkajších plochách mysli na dilatačné škáry už pri návrhu.",
"Správne pripravený podklad rozhoduje o životnosti celej realizácie.",
"Nie každý profil je vhodný do exteriéru.",
"Pri odvodňovacích žľaboch kontroluj spád ešte pred lepením.",
"Lepidlo nenahrádza nerovný podklad.",
"Čistý podklad zlepšuje priľnavosť materiálov.",
"Pri veľkých formátoch používaj buttering-floating metódu.",
"Voda si vždy nájde cestu. Navrhni jej ju vopred.",
"Pri terasách je detail okraja rovnako dôležitý ako stred plochy.",
"Dlažba bez dilatácie môže vyzerať dobre len do prvého problému.",
"Pred montážou si vždy over hrúbku finálnej skladby.",
"Správny profil chráni hranu dlažby pred poškodením.",
"Exteriér odpúšťa menej chýb ako interiér.",
"Odvodnenie rieš ešte pred výberom dlažby.",
"Pri schodoch mysli na bezpečnosť aj po daždi.",
"Lepšie je venovať hodinu príprave ako deň opravám.",
"Kerdi páska chráni kritické spoje pred prenikaním vody.",
"Pri balkónoch je každý detail dôležitý.",
"Pred začatím montáže si priprav všetok potrebný materiál.",
"Správna penetrácia zvyšuje spoľahlivosť systému.",
"Technický list často vyrieši problém skôr ako reklamácia.",
"Pri rezaní používaj vhodný kotúč pre daný materiál.",
"Dobre navrhnutý detail býva takmer neviditeľný.",
"Pri pokládke kontroluj rovinu priebežne, nie až na konci.",
"Kvalitný systém je silný len tak, ako jeho najslabší detail.",
"Schody musia byť bezpečné za sucha aj za mokra.",
"Správne odvodnenie predlžuje životnosť celej konštrukcie.",
"Pri montáži sa riaď odporúčaním výrobcu systému.",
"Dlažba je viditeľná. Podklad rozhoduje.",
"Každý milimeter sa pri veľkých plochách násobí.",
"Správna skladba vrstiev je základ funkčnej realizácie.",
"Pri exteriéri počítaj s mrazom už počas návrhu.",
"Kvalitná príprava skracuje čas montáže."
];

let lastIndex = -1;

function randomJoke() {
  let i;
  do {
    i = Math.floor(Math.random() * JOKES.length);
  } while (i === lastIndex);

  lastIndex = i;
  return JOKES[i];
}

// ======= send to all =======
async function broadcast(title, body, url = "/", type = "general") {
  try {
    const subs = await PushSubscription.find().lean();

    const payload = JSON.stringify({
  title: title,
  body: body,
  data: {
    url: url,
    type: type
  }
});

    for (const s of subs) {
      try {
        await webpush.sendNotification(s.sub, payload);
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await PushSubscription.deleteOne({ endpoint: s.endpoint });
        } else {
          console.error("❌ PUSH ERROR:", err);
        }
      }
    }
    // ===== ANDROID BROADCAST =====
try {
  const PushToken = require("../models/PushToken");
  const admin = require("firebase-admin");

  const tokens = await PushToken.find().lean();
  const tokenList = tokens.map(t => t.token);

  if (tokenList.length) {
    await admin.messaging().sendEachForMulticast({
      tokens: tokenList,
      notification: {
        title: title,
        body: body
      },
      data: {
        url: url,
        type: type
      }
    });

    console.log("📲 ANDROID BROADCAST sent:", tokenList.length);
  } else {
    console.log("⚠️ No Android tokens");
  }

} catch (err) {
  console.error("❌ Android broadcast error:", err);
}
  } catch (err) {
    console.error("❌ BROADCAST ERROR:", err);
  }
}

// 👇 SEM PRESNE VLOŽ

async function sendPush(email, body) {

  // ===== PWA =====
  const subs = await PushSubscription.find({ email }).lean();

  const payload = JSON.stringify({
  title: "Lištobook",
  body: body,
  data: {
    url: "https://listobook.sk/messages.html?next=/messages.html",
    type: "message"
  }
});

  for (const s of subs) {
    try {
      await webpush.sendNotification(s.sub, payload);
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await PushSubscription.deleteOne({ endpoint: s.endpoint });
      }
    }
  }

  // ===== ANDROID (🔥 toto je to čo ti chýba) =====
  try {
    const PushToken = require("../models/PushToken");

    const tokens = await PushToken.find({ email });

    const tokenList = tokens.map(t => t.token);

    if (tokenList.length) {
      const admin = require("firebase-admin");

      await admin.messaging().sendEachForMulticast({
        tokens: tokenList,
        notification: {
          title: "Lištobook",
          body: body
        },
        data: {
          url: "https://listobook.sk/messages.html?next=/messages.html",
          type: "message"
        }
      });

      console.log("✅ ANDROID PUSH sent to:", email);
    } else {
      console.log("⚠️ No Android tokens for:", email);
    }

  } catch (err) {
    console.error("❌ Android PUSH error:", err);
  }
}

// ======= ranný tip =======
async function runMorning() {
  if (!shouldSendMorningJoke()) return;

  console.log("☀️ sending tip na dnes");

  const joke = randomJoke();

  await broadcast(
    joke,
    "",
    `/tip.html?text=${encodeURIComponent(joke)}`,
    "morning"
  );
}

// ======= večerná štatistika =======
async function runEvening() {
  if (!shouldSendEveningStats()) return;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const newUsersToday = await User.countDocuments({
    createdAt: { $gte: startOfToday }
  });

  const newRatingsToday = await Rating.countDocuments({
    createdAt: { $gte: startOfToday }
  });

  const newProductsToday = await Product.countDocuments({
    createdAt: { $gte: startOfToday }
  });

  // 👉 ak je všetko 0, nič neposielame
  if (newUsersToday === 0 && newRatingsToday === 0 && newProductsToday === 0) {
    console.log("🌙 evening skipped – no activity");
    return;
  }

  console.log("🌙 sending evening stats");

  const parts = [];
  if (newUsersToday > 0) {
    parts.push(`${newUsersToday} nových používateľov`);
  }
  if (newRatingsToday > 0) {
    parts.push(`${newRatingsToday} nových hodnotení`);
  }
  if (newProductsToday > 0) {
    parts.push(`${newProductsToday} nových produktov`);
  }

  const body = `Dnes pribudlo: ${parts.join(", ")}`;

  await broadcast(
  "🌙 Dnešná štatistika",
  body,
  `/stats.html?text=${encodeURIComponent(body)}`,
  "evening"
);
}

// ======= špeciálne polnoci =======
async function runMidnightSpecial() {
  const special = getSpecialMidnight();
  if (!special) return;

  if (special === "silvester") {
    await broadcast("🎆 Šťastný nový rok", "Nech sa vám darí!", "/");
  }

  if (special === "vianoce") {
    await broadcast("🎄 Veselé Vianoce", "Lištobook vám želá pokojné sviatky.", "/");
  }
}

// ======= engine loop =======
function startPushEngine() {
  console.log("🚀 Push engine started");

  setInterval(async () => {
    try {
      const now = nowSK();
      const h = now.getHours();
      const m = now.getMinutes();

      const today = now.toLocaleDateString("sv-SE");

// ☀️ RÁNO
if (h === 7 && m === 0 && lastRun.morning !== today) {
  lastRun.morning = today;
  await runMorning();
}

// 🌙 VEČER
if (h === 19 && m === 0 && lastRun.evening !== today) {
  lastRun.evening = today;
  await runEvening();
}

// 🎆 POLNOC
if (h === 0 && m === 0 && lastRun.midnight !== today) {
  lastRun.midnight = today;
  await runMidnightSpecial();
}

    } catch (err) {
      console.error("❌ PUSH ENGINE ERROR:", err);
    }
  }, 60000);
}
module.exports = {
  startPushEngine,
  sendPush
};