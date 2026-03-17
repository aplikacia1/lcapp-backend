// utils/timeBrain.js

// Slovenský čas
function nowSK() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Bratislava" })
  );
}

function isWeekend(date) {
  const d = date.getDay();
  return d === 0 || d === 6;
}

function isFriday(date) {
  return date.getDay() === 5;
}

function isSilvester(date) {
  return date.getDate() === 31 && date.getMonth() === 11;
}

function isNewYear(date) {
  return date.getDate() === 1 && date.getMonth() === 0;
}

function isChristmas(date) {
  const d = date.getDate();
  const m = date.getMonth();

  return (
    (d === 24 && m === 11) ||
    (d === 25 && m === 11) ||
    (d === 26 && m === 11)
  );
}

// jednoduchý výpočet Veľkej noci (gregoriánsky)
function getEaster(year) {
  const f = Math.floor,
    G = year % 19,
    C = f(year / 100),
    H =
      (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) %
      30,
    I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11)),
    J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7,
    L = I - J,
    month = 3 + f((L + 40) / 44),
    day = L + 28 - 31 * f(month / 4);

  return new Date(year, month - 1, day);
}

function isEaster(date) {
  const easter = getEaster(date.getFullYear());

  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);

  const easterMonday = new Date(easter);
  easterMonday.setDate(easter.getDate() + 1);

  return (
    sameDay(date, goodFriday) ||
    sameDay(date, easter) ||
    sameDay(date, easterMonday)
  );
}

function sameDay(a, b) {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

function shouldSendMorningJoke(adminClosed = false) {
  const now = nowSK();

  if (adminClosed) return false;

  if (isSilvester(now)) return false; // ráno nie
  if (isNewYear(now)) return false;

  if (isWeekend(now)) return false;
  if (isChristmas(now)) return false;
  if (isEaster(now)) return false;

  return true;
}

function shouldSendEveningStats(adminClosed = false) {
  const now = nowSK();

  if (adminClosed) return false;

  if (isWeekend(now)) return false;
  if (isFriday(now)) return false;

  if (isChristmas(now)) return false;
  if (isEaster(now)) return false;
  if (isNewYear(now)) return false;
  if (isSilvester(now)) return false;

  return true;
}

function isSpecialMidnight() {
  const now = nowSK();

  if (isSilvester(now)) return "silvester";
  if (isChristmas(now)) return "vianoce";

  return null;
}

module.exports = {
  nowSK,
  shouldSendMorningJoke,
  shouldSendEveningStats,
  isSpecialMidnight
};