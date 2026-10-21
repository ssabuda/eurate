import { useQuery } from "@tanstack/react-query";

import { buildRecords, latestFixing, percentChange, withDailyChange } from "../lib/rates";
import { getLowestPrice, getNewest, getRates, getTopPrice } from "./client";

// Large enough for the full history of one currency (~7,000 fixings since 1999).
const FULL_HISTORY_LIMIT = 10000;

export const useNewest = () =>
  useQuery({ queryKey: ["newest"], queryFn: getNewest });

const usePreviousFixing = (newestDate) =>
  useQuery({
    queryKey: ["previous-fixing", newestDate],
    enabled: Boolean(newestDate),
    // Two steps instead of a date window, so a gap in imported data of any
    // length still finds the previous fixing: rates come newest first, so the
    // first row before today names its date.
    queryFn: async () => {
      const before = await getRates({ dateLt: newestDate, limit: 1 });
      const date = before.results[0]?.date;
      if (!date) return latestFixing([]);
      const page = await getRates({ date, limit: 1000 });
      return latestFixing(page.results);
    },
  });

/**
 * Today's rates with day-on-day change.
 * `previousDate` is null when there is no earlier fixing in the database.
 */
export const useTodayRates = () => {
  const newest = useNewest();
  const date = newest.data?.results[0]?.date ?? null;
  const previous = usePreviousFixing(date);

  const isLoading = newest.isPending || (Boolean(date) && previous.isPending);
  const error = newest.error ?? previous.error;
  const rates =
    newest.data && !isLoading
      ? withDailyChange(newest.data.results, previous.data?.byCurrency ?? new Map())
      : [];

  return {
    rates,
    date,
    previousDate: previous.data?.date ?? null,
    isLoading,
    error,
    refetch: () => {
      newest.refetch();
      // `refetch` ignores `enabled`; without a newest date there is nothing to look before.
      if (date) previous.refetch();
    },
  };
};

/** Latest rate of one currency and its change since the fixing before. */
export const useLatestRate = (currency) =>
  useQuery({
    queryKey: ["latest-rate", currency],
    enabled: Boolean(currency),
    // Keeps the page mounted while switching currency; callers check
    // `isPlaceholderData` before showing it as the new currency's.
    placeholderData: (previous) => previous,
    queryFn: async () => {
      const [latest, previous] = (await getRates({ currency, limit: 2 })).results;
      if (!latest) return null;
      return {
        ...latest,
        change: previous ? percentChange(previous.rate, latest.rate) : null,
      };
    },
  });

/** Record high and low of one currency, or null when it has no rates. */
export const useCurrencyRecord = (currency) =>
  useQuery({
    queryKey: ["record", currency],
    enabled: Boolean(currency),
    queryFn: async () => {
      const [highs, lows] = await Promise.all([getTopPrice(currency), getLowestPrice(currency)]);
      const high = highs.results[0];
      const low = lows.results[0];
      return high && low ? { high, low } : null;
    },
  });

/** History of one currency, oldest first, from `dateGte` (all when null). */
export const useHistory = (currency, dateGte) =>
  useQuery({
    queryKey: ["history", currency, dateGte],
    enabled: Boolean(currency),
    // Another range of the same currency may stand in while loading;
    // another currency's history never does.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === currency ? previous : undefined,
    queryFn: async () => {
      const page = await getRates({ currency, dateGte, limit: FULL_HISTORY_LIMIT });
      return [...page.results].reverse();
    },
  });

/**
 * One page of daily fixings, newest first. Fetches one extra row so the
 * last row on the page still gets its day change.
 */
export const useFixingsPage = (currency, { pageSize, page, dateLte }) =>
  useQuery({
    queryKey: ["fixings", currency, pageSize, page, dateLte],
    enabled: Boolean(currency),
    placeholderData: (previous) => previous,
    queryFn: () =>
      getRates({ currency, dateLte, limit: pageSize + 1, offset: page * pageSize }),
  });

export const useRecords = () => {
  const newest = useNewest();
  const highs = useQuery({ queryKey: ["topprice"], queryFn: () => getTopPrice() });
  const lows = useQuery({ queryKey: ["lowestprice"], queryFn: () => getLowestPrice() });

  const queries = [newest, highs, lows];
  const isLoading = queries.some((q) => q.isPending);
  const error = queries.find((q) => q.error)?.error ?? null;
  const records = queries.every((q) => q.data)
    ? buildRecords(newest.data.results, highs.data.results, lows.data.results)
    : [];

  return {
    records,
    date: newest.data?.results[0]?.date ?? null,
    isLoading,
    error,
    refetch: () => queries.forEach((q) => q.refetch()),
  };
};
