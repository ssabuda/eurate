import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

  describe("date filter", () => {
    const APPLY_DELAY_MS = 300;

    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    const dateInput = () => screen.getByLabelText("Show fixings up to");
    const enter = (value) => fireEvent.change(dateInput(), { target: { value } });
    const applyDelay = () => act(() => vi.advanceTimersByTimeAsync(APPLY_DELAY_MS));
    const requestedDates = (fetch) =>
      requestsTo(fetch, "rates")
        .map((params) => params.get("date__lte"))
        .filter(Boolean);

    /** A half-typed date: browsers report "" with an invalid `validity`. */
    const withPartialDate = (action) => {
      const input = dateInput();
      Object.defineProperty(input, "validity", { configurable: true, value: { valid: false } });
      action(input);
      delete input.validity;
    };
    const enterPartial = () =>
      withPartialDate((input) => fireEvent.change(input, { target: { value: "" } }));

    const applyFilter = async () => {
      enter("2026-10-10");
      await applyDelay();
      await screen.findByText("1–4 of 4 fixings");
    };

    it("requests only the final date of a burst of edits", async () => {
      const { fetch } = setup();
      await screen.findByText("1–10 of 15 fixings");

      for (const value of ["0002-10-10", "0020-10-10", "0202-10-10", "2026-10-01", "2026-10-10"]) {
        enter(value);
        expect(dateInput()).toHaveValue(value);
      }
      expect(requestedDates(fetch)).toEqual([]);

      await applyDelay();
      await screen.findByText("1–4 of 4 fixings");
      expect(requestedDates(fetch)).toEqual(["2026-10-10"]);
    });

    it.each(["0500-01-01", "20261-10-10"])("explains why %s is not applied", async (value) => {
      const { fetch } = setup();
      await screen.findByText("1–10 of 15 fixings");

      enter(value);
      await applyDelay();
      // No message while typing: a year passes through 0002 on its way to 2026.
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();

      fireEvent.blur(dateInput());
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Enter a full date with a year between 1000 and 9999. The table has not changed.",
      );
      expect(dateInput()).toBeInvalid();
      expect(requestedDates(fetch)).toEqual([]);
      expect(fixingDates()[0]).toBe("21 Oct 2026");
      // The message steps aside while the date is being corrected.
      fireEvent.focus(dateInput());
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      fireEvent.blur(dateInput());
      expect(screen.getByRole("button", { name: "Latest" })).toBeInTheDocument();

      enter("2026-10-10");
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      await applyDelay();
      await screen.findByText("1–4 of 4 fixings");
    });

    it("keeps the filter and page while a date is partly edited, and drops them on a real clear", async () => {
      const { fetch } = setup();
      await screen.findByText("1–10 of 15 fixings");
      enter("2026-10-20");
      await applyDelay();
      await screen.findByText("1–10 of 14 fixings");
      fireEvent.click(screen.getByRole("button", { name: "Older" }));
      await screen.findByText("11–14 of 14 fixings");
      const requests = requestsTo(fetch, "rates").length;

      enterPartial();
      await applyDelay();

      expect(screen.getByText("11–14 of 14 fixings")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Latest" })).toBeInTheDocument();
      expect(requestsTo(fetch, "rates")).toHaveLength(requests);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();

      withPartialDate((input) => fireEvent.blur(input));
      expect(screen.getByRole("alert")).toBeInTheDocument();

      enter("2026-10-20");
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      enter("");
      await applyDelay();
      await screen.findByText("1–10 of 15 fixings");
      expect(screen.queryByRole("button", { name: "Latest" })).not.toBeInTheDocument();
    });

    it("shows Latest only for an applied filter, and it cancels a pending edit", async () => {
      const { fetch } = setup();
      await screen.findByText("1–10 of 15 fixings");

      enter("2026-10-10");
      expect(screen.queryByRole("button", { name: "Latest" })).not.toBeInTheDocument();
      await applyDelay();
      await screen.findByText("1–4 of 4 fixings");

      enter("2026-10-09");
      fireEvent.click(screen.getByRole("button", { name: "Latest" }));
      await applyDelay();

      await screen.findByText("1–10 of 15 fixings");
      expect(dateInput()).toHaveValue("");
      expect(requestedDates(fetch)).toEqual(["2026-10-10"]);
    });

    it("clears an invalid date with Latest", async () => {
      setup();
      await screen.findByText("1–10 of 15 fixings");
      await applyFilter();

      enter("0500-01-01");
      await applyDelay();
      fireEvent.blur(dateInput());
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(fixingDates()[0]).toBe("10 Oct 2026");

      fireEvent.click(screen.getByRole("button", { name: "Latest" }));
      await screen.findByText("1–10 of 15 fixings");
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(dateInput()).toHaveFocus();
    });

    it("drops the filter when the date was cleared one segment at a time", async () => {
      setup();
      await screen.findByText("1–10 of 15 fixings");
      await applyFilter();

      enterPartial();
      await applyDelay();
      expect(fixingDates()[0]).toBe("10 Oct 2026");

      // The last segment fires no change event: only leaving the field reveals it.
      fireEvent.blur(dateInput());

      await screen.findByText("1–10 of 15 fixings");
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Latest" })).not.toBeInTheDocument();
    });

    it("stays on the page when the same date is entered again", async () => {
      setup();
      await screen.findByText("1–10 of 15 fixings");
      enter("2026-10-20");
      await applyDelay();
      await screen.findByText("1–10 of 14 fixings");
      fireEvent.click(screen.getByRole("button", { name: "Older" }));
      await screen.findByText("11–14 of 14 fixings");

      enterPartial();
      enter("2026-10-20");
      await applyDelay();
      fireEvent.blur(dateInput());

      expect(screen.getByText("11–14 of 14 fixings")).toBeInTheDocument();
    });

    it("applies a pending date straight away when the field is left", async () => {
      const { fetch } = setup();
      await screen.findByText("1–10 of 15 fixings");

      enter("2026-10-10");
      fireEvent.blur(dateInput());
      await screen.findByText("1–4 of 4 fixings");
      await applyDelay();

      expect(requestedDates(fetch)).toEqual(["2026-10-10"]);
    });
  });

  it("marks fixings as stale and blocks paging until the next page arrives", async () => {
    let release;
    const held = new Promise((resolve) => (release = resolve));
    mockApi({
      newest: NEWEST,
      rates: async (params) => {
        if (params.get("offset") === "10") await held;
        return rates(params);
      },
      topprice: byCurrency(HIGHS),
      lowestprice: byCurrency(LOWS),
    });
    renderRoute(<CurrencyPage />, { path: "/currency/:code", url: "/currency/USD" });
    const user = userEvent.setup();
    await screen.findByText("1–10 of 15 fixings");
    const table = screen.getByRole("table").parentElement;

    await user.click(screen.getByRole("button", { name: "Older" }));

    expect(table).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByText(/of 15 fixings/)).not.toBeInTheDocument();
    const older = screen.getByRole("button", { name: "Older" });
    // Still focusable, so a keyboard user keeps their place, but inert.
    expect(older).toHaveFocus();
    expect(older).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Newer" })).toHaveAttribute("aria-disabled", "true");
    await user.click(screen.getByRole("button", { name: "Newer" }));

    release();
    await screen.findByText("11–15 of 15 fixings");
    expect(table).toHaveAttribute("aria-busy", "false");
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
    expect(screen.getByRole("link", { name: "See all currencies" })).toHaveAttribute("href", "/?base=EUR");
  });

  it("shows the pair against another base", async () => {
    const { fetch } = setup("/currency/USD?base=PLN");
    expect(await screen.findByText("USD/PLN")).toBeInTheDocument();
    expect(screen.getByText(/1 USD in PLN/)).toBeInTheDocument();
    expect(await screen.findByRole("img", { name: /USD\/PLN over three months/ })).toBeInTheDocument();
    expect(await screen.findByRole("columnheader", { name: "Rate (1 USD in PLN)" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Today's rates" })).toHaveAttribute("href", "/?base=PLN");
    for (const endpoint of ["newest", "rates", "topprice", "lowestprice"]) {
      for (const params of requestsTo(fetch, endpoint)) {
        expect(params.get("base")).toBe("PLN");
      }
    }
  });

  it("opens the default currency instead of the base itself", async () => {
    setup("/currency/PLN?base=PLN");
    expect(await screen.findByRole("heading", { level: 1, name: "US dollar" })).toBeInTheDocument();
    expect(screen.getByText("USD/PLN")).toBeInTheDocument();
  });

  it("opens the euro instead of the dollar when the dollar is the base", async () => {
    mockApi({
      newest: NEWEST,
      rates: (params) =>
        params.get("currency") === "EUR" ? [{ currency: "EUR", date: NEWEST_DATE, rate: "1.1234" }] : [],
      topprice: [],
      lowestprice: [],
    });
    renderRoute(<CurrencyPage />, { path: "/currency/:code", url: "/currency/USD?base=USD" });
    expect(await screen.findByRole("heading", { level: 1, name: "Euro" })).toBeInTheDocument();
    expect(screen.getByText("EUR/USD")).toBeInTheDocument();
  });
});
