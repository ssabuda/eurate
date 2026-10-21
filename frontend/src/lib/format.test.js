import { describe, expect, it } from "vitest";

import {
  addDays,
  formatCount,
  formatDate,
  formatLongDate,
  formatPercent,
  formatRate,
} from "./format";

describe("formatRate", () => {
  it("keeps 4 decimals for small rates", () => {
    expect(formatRate(1.1234)).toBe("1.1234");
  });

  it("uses 2 decimals and grouping for large rates", () => {
    expect(formatRate(19310.5)).toBe("19,310.50");
  });

  it("keeps significant digits for tiny rates such as an inverse", () => {
    expect(formatRate(1 / 17000)).toBe("0.00005882");
    expect(formatRate(1 / 1600)).toBe("0.0006250");
  });
});

describe("formatPercent", () => {
  it("adds a plus sign to gains", () => {
    expect(formatPercent(0.214)).toBe("+0.21%");
  });

  it("keeps the minus sign for losses", () => {
    expect(formatPercent(-0.58)).toBe("-0.58%");
  });

  it("shows no sign for values that round to zero", () => {
    expect(formatPercent(-0.001)).toBe("0.00%");
  });

  it("shows a dash when the change is unknown", () => {
    expect(formatPercent(null)).toBe("–");
  });
});

describe("formatCount", () => {
  it("picks singular or plural and groups thousands", () => {
    expect(formatCount(1, "currency", "currencies")).toBe("1 currency");
    expect(formatCount(0, "currency", "currencies")).toBe("0 currencies");
    expect(formatCount(6412, "fixing", "fixings")).toBe("6,412 fixings");
  });
});

describe("dates", () => {
  it("formats ISO dates without shifting the day", () => {
    expect(formatDate("2026-10-21")).toBe("21 Oct 2026");
    expect(formatLongDate("2026-10-21")).toBe("21 October 2026");
  });

  it("adds and subtracts days across months", () => {
    expect(addDays("2026-10-01", -1)).toBe("2026-09-30");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});
