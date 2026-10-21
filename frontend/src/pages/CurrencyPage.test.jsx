import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { addDays } from "../lib/format";
import { mockApi, renderRoute, requestsTo } from "../test/render";
import CurrencyPage from "./CurrencyPage";

const NEWEST_DATE = "2026-10-21";

const NEWEST = [
  { currency: "USD", date: NEWEST_DATE, rate: "1.1234" },
  { currency: "PLN", date: NEWEST_DATE, rate: "4.2450" },
];

// 15 USD fixings from 7 to 21 Oct, rising by 0.001 a day up to today's 1.1234.
const USD_HISTORY = Array.from({ length: 15 }, (_, i) => ({
  currency: "USD",
  date: addDays("2026-10-07", i),
  rate: (1.1094 + i * 0.001).toFixed(4),
})).reverse();

const PLN_HISTORY = [
  { currency: "PLN", date: NEWEST_DATE, rate: "4.2450" },
  { currency: "PLN", date: "2026-10-20", rate: "4.2400" },
];

// Croatia adopted the euro, so HRK history stops at the end of 2022.
const HRK_HISTORY = [
  { currency: "HRK", date: "2022-12-30", rate: "7.5365" },
  { currency: "HRK", date: "2022-12-29", rate: "7.5360" },
];

const HISTORY = [...USD_HISTORY, ...PLN_HISTORY, ...HRK_HISTORY];

const HIGHS = [
  { currency: "USD", date: "2026-08-21", rate: "1.1699" },
  { currency: "PLN", date: "2026-09-01", rate: "4.3000" },
];

const LOWS = [
  { currency: "USD", date: "2026-10-07", rate: "1.1094" },
  { currency: "PLN", date: "2026-08-01", rate: "4.2000" },
];

/** Answers `rates/` the way DRF would: filters, newest first, limit/offset. */
const rates = (params) => {
  const rows = HISTORY.filter(
    (r) =>
      r.currency === params.get("currency") &&
      (!params.get("date__gte") || r.date >= params.get("date__gte")) &&
      (!params.get("date__lte") || r.date <= params.get("date__lte")),
  );
  const offset = Number(params.get("offset") ?? 0);
  const limit = Number(params.get("limit") ?? 100);
  return { results: rows.slice(offset, offset + limit), count: rows.length };
};

const byCurrency = (rows) => (params) =>
  rows.filter((r) => !params.get("currency") || r.currency === params.get("currency"));

const setup = (url = "/currency/USD") => {
  const fetch = mockApi({
    newest: NEWEST,
    rates,
    topprice: byCurrency(HIGHS),
    lowestprice: byCurrency(LOWS),
  });
  renderRoute(<CurrencyPage />, { path: "/currency/:code", url });
  return { fetch, user: userEvent.setup() };
};

const historyRequests = (fetch) =>
  requestsTo(fetch, "rates").filter((p) => p.get("limit") === "10000");

const fixingsTable = () => screen.getByRole("table");

const fixingDates = () =>
  within(fixingsTable())
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[0].textContent);

describe("CurrencyPage", () => {
  it("shows the currency, today's rate and the change since the previous fixing", async () => {
    setup();
    expect(await screen.findByRole("heading", { level: 1, name: "US dollar" })).toBeInTheDocument();
    expect(screen.getByText("EUR/USD")).toBeInTheDocument();
    // The change waits for the second request (the previous fixing).
    expect(await screen.findByText("+0.09% vs previous fixing")).toBeInTheDocument();
    expect(screen.getByText(/fixing of 21 October 2026/)).toBeInTheDocument();
  });

  it("asks the API only for this currency's data", async () => {
    const { fetch } = setup();
    await screen.findByText("+0.09% vs previous fixing");
    await screen.findByText("1.1699");
    for (const endpoint of ["topprice", "lowestprice", "rates"]) {
      for (const params of requestsTo(fetch, endpoint)) {
        expect(params.get("currency")).toBe("USD");
      }
    }
  });

  it("shows the record high and low of the currency", async () => {
    setup();
    const high = (await screen.findByText("Highest on record")).parentElement;
    await waitFor(() => expect(high).toHaveTextContent("1.1699"));
    expect(high).toHaveTextContent("21 Aug 2026");
    const low = screen.getByText("Lowest on record").parentElement;
    expect(low).toHaveTextContent("1.1094");
    expect(low).toHaveTextContent("7 Oct 2026");
  });

  it("loads three months of history by default and summarises the period", async () => {
    const { fetch } = setup();
    expect(await screen.findByRole("img", { name: /EUR\/USD over three months/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "3M" })).toHaveAttribute("aria-pressed", "true");
    expect(historyRequests(fetch)[0].get("date__gte")).toBe("2026-07-22");

    const change = screen.getByText("Change over three months").parentElement;
    expect(change).toHaveTextContent("+1.26%");
    expect(change).toHaveTextContent("since 7 Oct 2026");
    expect(screen.getByText("Range in period").parentElement).toHaveTextContent("1.1094 – 1.1234");
  });

  it("switches the chart range", async () => {
    const { fetch, user } = setup();
    await screen.findByRole("img", { name: /three months/ });

    await user.click(screen.getByRole("button", { name: "1Y" }));
    expect(screen.getByRole("button", { name: "1Y" })).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => expect(historyRequests(fetch).at(-1).get("date__gte")).toBe("2025-10-21"));

    await user.click(screen.getByRole("button", { name: "All" }));
    await waitFor(() => expect(historyRequests(fetch).at(-1).has("date__gte")).toBe(false));
    expect(await screen.findByRole("img", { name: /over all stored data/ })).toBeInTheDocument();
  });

  it("restores the range from the URL", async () => {
    const { fetch } = setup("/currency/USD?range=1m");
    expect(await screen.findByRole("img", { name: /one month/ })).toBeInTheDocument();
    expect(historyRequests(fetch)[0].get("date__gte")).toBe("2026-09-21");
  });

  it("pages through daily fixings with the day change on every row", async () => {
    const { user } = setup();
    expect(await screen.findByText("1–10 of 15 fixings")).toBeInTheDocument();
    expect(fixingDates()[0]).toBe("21 Oct 2026");
    expect(screen.getByRole("button", { name: "Newer" })).toBeDisabled();

    // The last row on the page still has a change, computed from the 11th fixing.
    const rows = within(fixingsTable()).getAllByRole("row");
    expect(rows.at(-1)).toHaveTextContent("12 Oct 2026");
    expect(rows.at(-1)).toHaveTextContent("+0.09%");

    await user.click(screen.getByRole("button", { name: "Older" }));
    expect(await screen.findByText("11–15 of 15 fixings")).toBeInTheDocument();
    expect(fixingDates()).toEqual(["11 Oct 2026", "10 Oct 2026", "9 Oct 2026", "8 Oct 2026", "7 Oct 2026"]);
    expect(screen.getByRole("button", { name: "Older" })).toBeDisabled();
  });

  it("shows fixings up to a chosen date and back to the latest", async () => {
    const { fetch, user } = setup();
    await screen.findByText("1–10 of 15 fixings");

    // user-event can't type into <input type="date"> in jsdom; set it directly.
    fireEvent.change(screen.getByLabelText("Show fixings up to"), {
      target: { value: "2026-10-10" },
    });
    await waitFor(() => expect(fixingDates()[0]).toBe("10 Oct 2026"));
    expect(requestsTo(fetch, "rates").at(-1).get("date__lte")).toBe("2026-10-10");
    expect(screen.getByText("1–4 of 4 fixings")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Latest" }));
    await waitFor(() => expect(fixingDates()[0]).toBe("21 Oct 2026"));
  });

  it("switches currency from the picker", async () => {
    const { user } = setup();
    await screen.findByRole("heading", { level: 1, name: "US dollar" });
    await user.selectOptions(screen.getByLabelText("Currency"), "PLN");
    expect(await screen.findByRole("heading", { level: 1, name: "Polish zloty" })).toBeInTheDocument();
    expect(screen.getByText("EUR/PLN")).toBeInTheDocument();
    expect((await screen.findAllByText("4.2450")).length).toBeGreaterThan(0);
  });

  it("keeps the picker in place and never shows the old currency's data while switching", async () => {
    const { user } = setup();
    await screen.findByText("+0.09% vs previous fixing");
    await screen.findByText("1–10 of 15 fixings");
    const picker = screen.getByLabelText("Currency");

    await user.selectOptions(picker, "PLN");
    // Same element: the page was not swapped for a full-page loading state.
    expect(screen.getByLabelText("Currency")).toBe(picker);
    expect(screen.queryByText("1.1234")).not.toBeInTheDocument();
    expect(screen.getByText("Change over three months").parentElement).not.toHaveTextContent("+1.26%");
  });

  it("does not describe one range with another range's data while loading", async () => {
    // Hold the 5Y history back so the loading state can be observed.
    let release;
    const held = new Promise((resolve) => (release = resolve));
    mockApi({
      newest: NEWEST,
      rates: async (params) => {
        if (params.get("limit") === "10000" && params.get("date__gte") === addDays("2026-10-21", -1826)) {
          await held;
        }
        return rates(params);
      },
      topprice: byCurrency(HIGHS),
      lowestprice: byCurrency(LOWS),
    });
    renderRoute(<CurrencyPage />, { path: "/currency/:code", url: "/currency/USD" });
    const user = userEvent.setup();

    const change = (await screen.findByText("Change over three months")).parentElement;
    await waitFor(() => expect(change).toHaveTextContent("+1.26%"));

    await user.click(screen.getByRole("button", { name: "5Y" }));
    // The 3M figure must not appear under the 5Y label.
    const fiveYears = screen.getByText("Change over five years").parentElement;
    expect(fiveYears).toHaveTextContent("–");
    expect(fiveYears).not.toHaveTextContent("+1.26%");

    release();
    await waitFor(() => expect(fiveYears).toHaveTextContent("+1.26%"));
  });

  it("accepts a lower-case code in the URL", async () => {
    setup("/currency/usd");
    expect(await screen.findByRole("heading", { level: 1, name: "US dollar" })).toBeInTheDocument();
  });

  it("shows a currency the ECB no longer publishes, ending at its last fixing", async () => {
    const { fetch } = setup("/currency/HRK");
    expect(await screen.findByRole("heading", { level: 1, name: "Croatian kuna" })).toBeInTheDocument();
    expect(screen.getByText(/fixing of 30 December 2022 · no longer published by the ECB/)).toBeInTheDocument();
    expect(screen.getByLabelText("Currency")).toHaveValue("HRK");
    await waitFor(() => expect(historyRequests(fetch)[0].get("date__gte")).toBe("2022-09-30"));
  });

  it("says when the currency is unknown", async () => {
    setup("/currency/XYZ");
    expect(await screen.findByText(/No rates for “XYZ”/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See all currencies" })).toHaveAttribute("href", "/");
  });
});
