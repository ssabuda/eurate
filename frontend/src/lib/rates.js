import { currencyName } from "./currencies";

export const percentChange = (from, to) =>
  from ? ((to - from) / from) * 100 : null;

/** The rows of the most recent date among `rates`, keyed by currency. */
export const latestFixing = (rates) => {
  if (!rates.length) return { date: null, byCurrency: new Map() };
  const date = rates.reduce((max, r) => (r.date > max ? r.date : max), rates[0].date);
  const byCurrency = new Map(
    rates.filter((r) => r.date === date).map((r) => [r.currency, r.rate]),
  );
  return { date, byCurrency };
};

/** Today's rates with the change against the previous fixing. */
export const withDailyChange = (newest, previous) =>
  newest.map((r) => {
    const prev = previous.get(r.currency);
    return {
      code: r.currency,
      name: currencyName(r.currency),
      date: r.date,
      rate: r.rate,
      change: prev === undefined ? null : percentChange(prev, r.rate),
    };
  });

export const sortRates = (rows, sort) =>
  sort === "move"
    ? [...rows].sort((a, b) => Math.abs(b.change ?? 0) - Math.abs(a.change ?? 0))
    : [...rows].sort((a, b) => a.code.localeCompare(b.code));

export const matchesQuery = (row, query) => {
  const q = query.trim().toLowerCase();
  return !q || row.code.toLowerCase().includes(q) || row.name.toLowerCase().includes(q);
};

/** Where `now` sits between `low` and `high`, from 0 to 1. */
export const rangePosition = (now, low, high) => {
  if (high <= low) return 0.5;
  return Math.min(1, Math.max(0, (now - low) / (high - low)));
};

/** Joins today's rates with the record highs and lows per currency. */
export const buildRecords = (newest, highs, lows) => {
  const highBy = new Map(highs.map((r) => [r.currency, r]));
  const lowBy = new Map(lows.map((r) => [r.currency, r]));
  return newest
    .filter((r) => highBy.has(r.currency) && lowBy.has(r.currency))
    .map((r) => {
      const high = highBy.get(r.currency);
      const low = lowBy.get(r.currency);
      return {
        code: r.currency,
        name: currencyName(r.currency),
        rate: r.rate,
        high,
        low,
        position: rangePosition(r.rate, low.rate, high.rate),
      };
    });
};
