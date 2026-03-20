// utils/timeBrain.js

// 🇸🇰 Slovenský čas (server môže byť v USA)
function nowSK() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Bratislava" })
  );
}

// 🇸🇰 FIXNÉ ŠTÁTNE SVIATKY SR
const FIXED_HOLIDAYS = [
  "01-01", // Nový rok
  "01-06",
  "05-01",
  "05-08",
  "07-05",
  "08-29",
  "09-01",
  "09-15",
  "11-01",
  "11-17",
  "12-24",
  "12-25",
  "12-26"
];

function formatMMDD(date) {
  return `${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

// 🐣 Veľká noc výpočet
function getEaster(year) {
  const f = Math.floor,
    G = year % 19,
    C = f(year / 100),
    H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30,
    I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11)),
    J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7,
    L = I - J,
    month = 3 + f((L + 40) / 44),
    day = L + 28 - 31 * f(month / 4);

  return new Date(year, month - 1, day);
}

function isEasterHoliday(date) {
  const easter = getEaster(date.getFullYear());

  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);

  const easterMonday = new Date(easter);
  easterMonday.setDate(easter.getDate() + 1);

  return sameDay(date, goodFriday) ||
         sameDay(date, easter) ||
         sameDay(date, easterMonday);
}

function sameDay(a,b){
  return a.getDate()===b.getDate()
    && a.getMonth()===b.getMonth()
    && a.getFullYear()===b.getFullYear();
}

// 📅 základné stavy
function isWeekend(date){
  const d = date.getDay();
  return d===0 || d===6;
}

function isFriday(date){
  return date.getDay()===5;
}

function isFixedHoliday(date){
  return FIXED_HOLIDAYS.includes(formatMMDD(date));
}

function isHoliday(date){
  return isWeekend(date) || isFixedHoliday(date) || isEasterHoliday(date);
}

// 🎄 špeciálne dni
function isChristmas(date){
  return formatMMDD(date) === "12-24";
}

function isSilvester(date){
  return formatMMDD(date) === "12-31";
}

function isNewYear(date){
  return formatMMDD(date) === "01-01";
}

// 🌅 ranný vtip
function shouldSendMorningJoke(adminClosed=false){
  const now = nowSK();

  if(adminClosed) return false;
  if(isHoliday(now)) return false;
  if(isChristmas(now)) return false;
  if(isNewYear(now)) return false;
  if(isSilvester(now)) return false;

  return true;
}

// 🌙 večerná štatistika
function shouldSendEveningStats(adminClosed=false){
  const now = nowSK();

  if(adminClosed) return false;
  if(isHoliday(now)) return false;
  if(isFriday(now)) return false;
  if(isChristmas(now)) return false;
  if(isNewYear(now)) return false;
  if(isSilvester(now)) return false;

  return true;
}

// 🎆 špeciálne polnočné režimy
function getSpecialMidnight(){
  const now = nowSK();

  if(isSilvester(now)) return "silvester";
  return null;
}

// 🎄 špeciálne večerné režimy
function getSpecialEvening(){
  const now = nowSK();

  if(isChristmas(now)) return "vianoce";
  return null;
}

module.exports = {
  nowSK,
  shouldSendMorningJoke,
  shouldSendEveningStats,
  getSpecialMidnight,
  getSpecialEvening
};