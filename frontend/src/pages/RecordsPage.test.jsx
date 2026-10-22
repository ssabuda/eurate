import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { mockApi, renderRoute, requestsTo } from "../test/render";
import RecordsPage from "./RecordsPage";

const NEWEST = [
  { currency: "USD", date: "2026-10-21", rate: "1.1234" },
  { currency: "PLN", date: "2026-10-21", rate: "4.2450" },
  { currency: "JPY", date: "2026-10-21", rate: "170.0000" },
];

const HIGHS = [
  { currency: "USD", date: "2008-07-15", rate: "1.5990" },
  { currency: "PLN", date: "2022-03-01", rate: "4.9647" },
  { currency: "JPY", date: "2026-09-01", rate: "175.0000" },
];

const LOWS = [
  { currency: "USD", date: "2000-10-26", rate: "0.8252" },
  { currency: "PLN", date: "2008-07-29", rate: "3.2028" },
  { currency: "JPY", date: "2026-10-21", rate: "170.0000" },
];

// Positions in the record range: USD 39%, PLN 59%, JPY 0% (at its record low).

const setup = (url = "/records", api = {}) => {
  mockApi({ newest: NEWEST, topprice: HIGHS, lowestprice: LOWS, ...api });
  renderRoute(<RecordsPage />, { path: "/records", url });
  return userEvent.setup();
};

const tableCodes = () =>
  within(screen.getByRole("table"))
    .getAllByRole("link")
    .map((link) => link.textContent.slice(0, 3));

const rowOf = (code) => screen.getByRole("link", { name: new RegExp(code) }).closest("tr");

const tile = (label) => screen.getByText(label).parentElement;

describe("RecordsPage", () => {
  it("lists record low, record high and today's rate for every currency", async () => {
    setup();
    await screen.findByRole("table");
    expect(tableCodes()).toEqual(["JPY", "PLN", "USD"]);

    const usd = rowOf("USD");
    expect(usd).toHaveTextContent("0.8252");
    expect(usd).toHaveTextContent("26 Oct 2000");
    expect(usd).toHaveTextContent("1.5990");
    expect(usd).toHaveTextContent("15 Jul 2008");
    expect(usd).toHaveTextContent("1.1234");
    expect(usd).toHaveTextContent("39% of range");
    expect(within(usd).getByRole("img")).toHaveAccessibleName("Today at 39% between record low and record high");
  });

  it("links every currency to its history", async () => {
    setup();
    expect(await screen.findByRole("link", { name: /PLN/ })).toHaveAttribute("href", "/currency/PLN?base=EUR");
  });

  it("highlights the currencies closest to their record high and low", async () => {
    setup();
    await screen.findByRole("table");
    expect(tile("Closest to its record high")).toHaveTextContent("PLN");
    expect(tile("Closest to its record high")).toHaveTextContent("at 59% of its range");
    expect(tile("Closest to its record low")).toHaveTextContent("JPY");
    expect(tile("Closest to its record low")).toHaveTextContent("at 0% of its range");
  });

  it("counts records set in the last 90 days", async () => {
    setup();
    await screen.findByRole("table");
    // Only JPY's high (1 Sep) and low (21 Oct) are recent.
    expect(tile("Records set in the last 90 days")).toHaveTextContent("2");
  });

  it("counts a high and low set on the same day once", async () => {
    // A currency that never moved: its high and low are the same fixing.
    const flat = { currency: "BGN", date: "2026-10-01", rate: "1.9558" };
    setup("/records", {
      newest: [...NEWEST, { ...flat, date: "2026-10-21" }],
      topprice: [...HIGHS, flat],
      lowestprice: [...LOWS, flat],
    });
    await screen.findByRole("table");
    expect(tile("Records set in the last 90 days")).toHaveTextContent("3");
  });

  it("sorts by position in the record range", async () => {
    const user = setup();
    await screen.findByRole("table");

    await user.selectOptions(screen.getByLabelText("Sort by"), "high");
    expect(tableCodes()).toEqual(["PLN", "USD", "JPY"]);

    await user.selectOptions(screen.getByLabelText("Sort by"), "low");
    expect(tableCodes()).toEqual(["JPY", "USD", "PLN"]);
  });

  it("restores search and sorting from the URL", async () => {
    setup("/records?sort=high&q=p");
    await screen.findByRole("table");
    expect(screen.getByLabelText("Sort by")).toHaveValue("high");
    expect(screen.getByLabelText("Search")).toHaveValue("p");
    expect(tableCodes()).toEqual(["PLN", "JPY"]);
  });

  it("ignores a sort param that is not a known sort", async () => {
    setup("/records?sort=__proto__");
    await screen.findByRole("table");
    expect(screen.getByLabelText("Sort by")).toHaveValue("code");
    expect(tableCodes()).toEqual(["JPY", "PLN", "USD"]);
  });

  it("filters by code or name", async () => {
    const user = setup();
    await user.type(await screen.findByLabelText("Search"), "zloty");
    expect(tableCodes()).toEqual(["PLN"]);
    expect(screen.getByRole("heading", { name: "1 currency" })).toBeInTheDocument();
  });

  it("says when nothing matches", async () => {
    setup("/records?q=xyz");
    expect(await screen.findByText("No currency matches “xyz”.")).toBeInTheDocument();
  });

  it("explains how to import data when the database is empty", async () => {
    setup("/records", { newest: [], topprice: [], lowestprice: [] });
    expect(await screen.findByText(/No rates yet/)).toBeInTheDocument();
  });

  it("shows records against another base", async () => {
    const fetch = mockApi({ newest: NEWEST, topprice: HIGHS, lowestprice: LOWS });
    renderRoute(<RecordsPage />, { path: "/records", url: "/records?base=PLN" });
    expect(
      screen.getByRole("heading", { name: "Where is the Polish zloty today, against its history?" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/highest and lowest price in Polish zloty/)).toBeInTheDocument();
    await screen.findByRole("table");
    expect(screen.getByText(/costs more Polish zloty than ever stored/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /USD/ })).toHaveAttribute("href", "/currency/USD?base=PLN");
    for (const endpoint of ["newest", "topprice", "lowestprice"]) {
      for (const params of requestsTo(fetch, endpoint)) {
        expect(params.get("base")).toBe("PLN");
      }
    }
  });
});
