import { describe, expect, it } from "vitest";

import {
  buildRecords,
  latestFixing,
  matchesQuery,
  percentChange,
  rangePosition,
  sortRates,
  withDailyChange,
} from "./rates";

const rate = (currency, date, value) => ({ currency, date, rate: value });

describe("latestFixing", () => {
  it("keeps only the most recent date", () => {
    const { date, byCurrency } = latestFixing([
      rate("USD", "2026-10-19", 1.1),
      rate("USD", "2026-10-20", 1.2),
      rate("PLN", "2026-10-20", 4.2),
    ]);
    expect(date).toBe("2026-10-20");
    expect([...byCurrency]).toEqual([
      ["USD", 1.2],
      ["PLN", 4.2],
    ]);
  });

  it("handles an empty list", () => {
    expect(latestFixing([]).date).toBeNull();
  });
});

describe("withDailyChange", () => {
  it("computes the change against the previous fixing", () => {
    const [usd, pln] = withDailyChange(
      [rate("USD", "2026-10-21", 1.1), rate("PLN", "2026-10-21", 4.2)],
      new Map([["USD", 1.0]]),
    );
    expect(usd).toMatchObject({ code: "USD", name: "US dollar" });
    expect(usd.change).toBeCloseTo(10);
    expect(pln.change).toBeNull();
  });
});

describe("sorting and search", () => {
  const rows = [
    { code: "USD", name: "US dollar", change: 0.1 },
    { code: "JPY", name: "Japanese yen", change: -0.5 },
    { code: "AUD", name: "Australian dollar", change: null },
  ];

  it("sorts by code", () => {
    expect(sortRates(rows, "code").map((r) => r.code)).toEqual(["AUD", "JPY", "USD"]);
  });

  it("sorts by the size of the move, either direction", () => {
    expect(sortRates(rows, "move").map((r) => r.code)).toEqual(["JPY", "USD", "AUD"]);
  });

  it("matches code or name, ignoring case", () => {
    expect(rows.filter((r) => matchesQuery(r, "dollar")).map((r) => r.code)).toEqual(["USD", "AUD"]);
    expect(rows.filter((r) => matchesQuery(r, " jpy ")).map((r) => r.code)).toEqual(["JPY"]);
  });
});

describe("rangePosition", () => {
  it("places the rate between low and high", () => {
    expect(rangePosition(1.5, 1, 2)).toBe(0.5);
  });

  it("clamps values outside the range", () => {
    expect(rangePosition(3, 1, 2)).toBe(1);
    expect(rangePosition(0, 1, 2)).toBe(0);
  });

  it("centres when low equals high", () => {
    expect(rangePosition(1, 1, 1)).toBe(0.5);
  });
});

describe("buildRecords", () => {
  it("joins today's rate with record high and low", () => {
    const [usd] = buildRecords(
      [rate("USD", "2026-10-21", 1.2), rate("XXX", "2026-10-21", 1)],
      [rate("USD", "2008-07-15", 1.6)],
      [rate("USD", "2000-10-26", 0.8)],
    );
    expect(usd.code).toBe("USD");
    expect(usd.high.date).toBe("2008-07-15");
    expect(usd.position).toBeCloseTo(0.5);
  });

  it("skips currencies without records", () => {
    expect(buildRecords([rate("XXX", "2026-10-21", 1)], [], [])).toEqual([]);
  });
});

it("percentChange guards against a zero base", () => {
  expect(percentChange(0, 1)).toBeNull();
});
