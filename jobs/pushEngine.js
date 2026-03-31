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

// ======= jednoduché vtipy =======
const JOKES = [
  "Majster: Prečo si prišiel neskoro? Pomocník: Čakal som, kým sa káva sama zamieša.",
  "Kutil bez vodováhy je ako ryba bez vody.",
  "Dnes sa nič nepokazilo… ešte si nezačal.",
  "Majster nikdy nemešká. Len prichádza v inom časovom profile.",
  "Keď niečo nejde… použi väčšie kladivo."
];

function randomJoke() {
  return JOKES[Math.floor(Math.random() * JOKES.length)];
}

// ======= send to all =======
async function broadcast(title, body, url = "/", type = "general") {
  const subs = await PushSubscription.find().lean();

  const payload = JSON.stringify({ title, body, url, type });

  for (const s of subs) {
    try {
      await webpush.sendNotification(s.sub, payload);
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await PushSubscription.deleteOne({ endpoint: s.endpoint });
      }
    }
  }
}

// ======= ranný vtip =======
async function runMorning() {
  if (!shouldSendMorningJoke()) return;

  console.log("☀️ sending morning joke");

  await broadcast(
    "Lištobook ráno",
    randomJoke(),
    "/timeline.html",
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
    "Lištobook večer",
    body,
    "/timeline.html"
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
    const now = nowSK();
    const h = now.getHours();
    const m = now.getMinutes();

    if (h === 7 && m === 0) {
      await runMorning();
    }

    if (h === 19 && m === 0) {
      await runEvening();
    }

    if (h === 0 && m === 0) {
      await runMidnightSpecial();
    }

  }, 60000);
}

module.exports = startPushEngine;