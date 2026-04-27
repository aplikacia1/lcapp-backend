const webpush = require("web-push");
const PushSubscription = require("../models/PushSubscription");
const User = require("../models/User");
const Rating = require("../models/rating");
const Product = require("../models/product");

const {
  nowSK,
  shouldSendMorningJoke,
  shouldSendEveningStats,
  isSpecialMidnight
} = require("../utils/timeBrain");
let lastRun = {
  morning: null,
  evening: null,
  midnight: null
};

// ======= jednoduché vtipy =======
const JOKES = [
  "Tip na dnes: Ak to nefunguje, zober väčšie kladivo.",
  "Tip na dnes: Keď to drží, nechaj to tak.",
  "Tip na dnes: Dvakrát meraj. Potom aj tak ešte raz.",
  "Tip na dnes: Keď niečo nesedí, chyba nie je v materiáli… väčšinou.",
  "Tip na dnes: Ráno nezačínaj prácou. Začni kávou.",
  "Tip na dnes: Keď to ide hladko, priprav sa na problém.",
  "Tip na dnes: Najlepšie riešenie je to, ktoré funguje.",
  "Tip na dnes: Ak si si istý, skontroluj to ešte raz.",
  "Tip na dnes: Každá chyba je skúsenosť. Niekedy drahá.",
  "Tip na dnes: Keď nevieš čo ďalej, zastav sa. A premysli.",
  "Tip na dnes: Náradie si váž. Ono si pamätá.",
  "Tip na dnes: Čo sa dá spraviť jednoducho, nerob zložito.",
  "Tip na dnes: Keď to nejde silou, ide to väčšou silou.",
  "Tip na dnes: Aj malá odchýlka je veľký problém.",
  "Tip na dnes: Poriadok na stole = pokoj v hlave.",
  "Tip na dnes: Najprv rozmýšľaj, potom rež.",
  "Tip na dnes: Keď to vyzerá dobre, ešte to nemusí byť dobre.",
  "Tip na dnes: Lepšie pomaly a presne ako rýchlo a zle.",
  "Tip na dnes: Každý problém má riešenie. Len ho treba nájsť.",
  "Tip na dnes: Keď niečo nesedí, nesedí to.",
  "Tip na dnes: Najväčšie chyby vznikajú z malých detailov.",
  "Tip na dnes: Dobrý začiatok je polovica práce.",
  "Tip na dnes: Keď sa ponáhľaš, spravíš to dvakrát.",
  "Tip na dnes: Aj rovná stena vie prekvapiť.",
  "Tip na dnes: Kto sa nepýta, robí podľa seba.",
  "Tip na dnes: Keď to nepasuje, niečo si prehliadol.",
  "Tip na dnes: Lepšie opraviť hneď ako neskôr.",
  "Tip na dnes: Každý materiál má svoju náladu.",
  "Tip na dnes: Dnes sprav aspoň jednu vec poriadne.",
  "Tip na dnes: Aj improvizácia má svoje pravidlá."
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

    const payload = JSON.stringify({ title, body, url, type });

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
        title,
        body
      },
      data: {
        url,
        type
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
    body,
    url: "/timeline.html",
    type: "comment"
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
          body
        },
        data: {
          url: "/timeline.html",
          type: "comment"
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

// ======= ranný vtip =======
async function runMorning() {
  if (!shouldSendMorningJoke()) return;

  console.log("☀️ sending tip na dnes");

  const joke = randomJoke();

await broadcast(
  "☀️ Tip na dnes",
  joke,
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
  const special = isSpecialMidnight();
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
if (h === 7 && m < 5 && lastRun.morning !== today) {
  lastRun.morning = today;
  await runMorning();
}

// 🌙 VEČER
if (h === 19 && m < 5 && lastRun.evening !== today) {
  lastRun.evening = today;
  await runEvening();
}

// 🎆 POLNOC
if (h === 0 && m < 5 && lastRun.midnight !== today) {
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