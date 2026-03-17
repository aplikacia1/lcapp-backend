// backend/utils/timeBrain.js

// 🇸🇰 Slovenské fixné sviatky
const FIXED_HOLIDAYS = [
  "01-01",
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

// 🐣 Výpočet Veľkej noci (algoritmus)
function getEasterDate(year) {
  const f = Math.floor;
  const G = year % 19;
  const C = f(year / 100);
  const H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30;
  const I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11));
  const J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7;
  const L = I - J;
  const month = 3 + f((L + 40) / 44);
  const day = L + 28 - 31 * f(month / 4);
  return new Date(year, month - 1, day);
}

// 🐣 Pohyblivé sviatky SR
function getEasterHolidays(year) {
  const easter = getEasterDate(year);

  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);

  const easterMonday = new Date(easter);
  easterMonday.setDate(easter.getDate() + 1);

  return [goodFriday, easterMonday];
}

// 📅 helper
function formatDateMMDD(date) {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${mm}-${dd}`;
}

// 🧠 core objekt
const timeBrain = {

  now() {
    return new Date();
  },

  isWeekend() {
    const d = this.now().getDay();
    return d === 0 || d === 6;
  },

  isFixedHoliday() {
    const today = formatDateMMDD(this.now());
    return FIXED_HOLIDAYS.includes(today);
  },

  isEasterHoliday() {
    const year = this.now().getFullYear();
    const easterDays = getEasterHolidays(year);

    return easterDays.some(d =>
      d.toDateString() === this.now().toDateString()
    );
  },

  isHoliday() {
    return this.isFixedHoliday() || this.isEasterHoliday();
  },

  isWorkingDay() {
    return !this.isWeekend() && !this.isHoliday();
  },

  isWorkingHours() {
    const h = this.now().getHours();
    return h >= 8 && h < 17;
  },

  isWorkingMorning() {
    const h = this.now().getHours();
    return this.isWorkingDay() && h >= 6 && h < 10;
  },

  isEvening() {
    const h = this.now().getHours();
    return h >= 18 && h < 22;
  }

};

module.exports = timeBrain;