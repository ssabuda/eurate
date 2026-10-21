const API_ROOT = "/api/v1";

/**
 * @typedef {{ currency: string, date: string, rate: number }} Rate
 * @typedef {{ count: number, results: Rate[] }} RatePage
 */

const toRate = (row) => ({
  currency: row.currency,
  date: row.date,
  rate: Number(row.rate),
});

/** @returns {Promise<RatePage>} */
async function getList(endpoint, params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  }
  const response = await fetch(`${API_ROOT}/${endpoint}/?${query}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Request to ${endpoint} failed (${response.status})`);
  }
  const data = await response.json();
  return { count: data.count, results: data.results.map(toRate) };
}

// The ECB publishes ~30 currencies, so 200 always fits one page.
const ALL_CURRENCIES = 200;

export const getNewest = () => getList("newest", { limit: ALL_CURRENCIES });

/** Record highs, one per currency (or only `currency`'s). */
export const getTopPrice = (currency) =>
  getList("topprice", { currency, limit: ALL_CURRENCIES });

/** Record lows, one per currency (or only `currency`'s). */
export const getLowestPrice = (currency) =>
  getList("lowestprice", { currency, limit: ALL_CURRENCIES });

/**
 * Rates ordered newest first.
 * @param {{ currency?: string, date?: string, dateLt?: string, dateGte?: string,
 *           dateLte?: string, limit?: number, offset?: number }} filters
 */
export const getRates = ({
  currency,
  date,
  dateLt,
  dateGte,
  dateLte,
  limit,
  offset,
} = {}) =>
  getList("rates", {
    currency,
    date,
    date__lt: dateLt,
    date__gte: dateGte,
    date__lte: dateLte,
    limit,
    offset,
  });
