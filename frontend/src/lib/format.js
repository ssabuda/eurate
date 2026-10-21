const LOCALE = "en-GB";

const number = (value, digits) =>
  value.toLocaleString(LOCALE, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

/** Rates are stored with 4 decimals; large values read better with 2. */
export const rateDigits = (rate) => (rate >= 50 ? 2 : 4);

// Tiny rates (e.g. 1 IDR in EUR) would round to 0.0001 at 4 decimals,
// so they keep 4 significant digits instead.
const TINY_RATE = 0.01;

export const formatRate = (rate) =>
  rate !== 0 && Math.abs(rate) < TINY_RATE
    ? rate.toLocaleString(LOCALE, {
        minimumSignificantDigits: 4,
        maximumSignificantDigits: 4,
      })
    : number(rate, rateDigits(rate));

export const formatAmount = (value) => number(value, 2);

export const formatPercent = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "–";
  // `|| 0` turns -0 into 0, so tiny losses don't render as "-0.00%".
  const rounded = Math.round(value * 100) / 100 || 0;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${number(rounded, 2)}%`;
};

const toUtcDate = (isoDate) => new Date(`${isoDate}T00:00:00Z`);

export const formatDate = (isoDate) =>
  toUtcDate(isoDate).toLocaleDateString(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

export const formatLongDate = (isoDate) =>
  toUtcDate(isoDate).toLocaleDateString(LOCALE, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

export const formatCount = (count, singular, plural) =>
  `${count.toLocaleString(LOCALE)} ${count === 1 ? singular : plural}`;

/** Shifts an ISO date (YYYY-MM-DD) by whole days, in UTC. */
export const addDays = (isoDate, days) => {
  const date = toUtcDate(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};
