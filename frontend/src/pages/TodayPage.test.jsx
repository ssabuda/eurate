import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { mockApi, renderRoute, requestsTo } from "../test/render";
import TodayPage from "./TodayPage";

const NEWEST = [
  { currency: "PLN", date: "2026-10-21", rate: "4.2000" },
  { currency: "USD", date: "2026-10-21", rate: "1.1000" },
  { currency: "JPY", date: "2026-10-21", rate: "170.0000" },
];

const PREVIOUS = [
  { currency: "PLN", date: "2026-10-20", rate: "4.2000" },
  { currency: "USD", date: "2026-10-20", rate: "1.0000" },
  { currency: "JPY", date: "2026-10-20", rate: "171.0000" },
  { currency: "USD", date: "2026-10-17", rate: "0.9000" },
];

const setup = (url = "/") => {
  const fetch = mockApi({ newest: NEWEST, rates: PREVIOUS });
  renderRoute(<TodayPage />, { url });
  return { fetch, user: userEvent.setup() };
};

const cardCodes = () =>
  within(screen.getByRole("list", { name: "Currencies" }))
    .getAllByRole("link")
    .map((link) => link.textContent.slice(0, 3));

describe("TodayPage", () => {
  it("shows the newest fixing date and every currency", async () => {
    setup();
    expect(await screen.findByRole("heading", { name: /21 October 2026/ })).toBeInTheDocument();
    expect(screen.getByText("Previous fixing: 20 Oct 2026")).toBeInTheDocument();
    expect(cardCodes()).toEqual(["JPY", "PLN", "USD"]);
  });

  it("finds the previous fixing date first, then loads that day", async () => {
    const { fetch } = setup();
    await screen.findByText("Previous fixing: 20 Oct 2026");
    const [find, load] = requestsTo(fetch, "rates");
    expect(find.get("date__lt")).toBe("2026-10-21");
    expect(find.get("limit")).toBe("1");
    expect(load.get("date")).toBe("2026-10-20");
  });

  it("finds the previous fixing across a long gap in the data", async () => {
    const old = [{ currency: "USD", date: "2026-08-03", rate: "1.0000" }];
    mockApi({ newest: NEWEST, rates: old });
    renderRoute(<TodayPage />);
    expect(await screen.findByText("Previous fixing: 3 Aug 2026")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /USD/ })).toHaveTextContent("+10.00%");
  });

  it("shows the day change from the latest previous fixing", async () => {
    setup();
    const usd = await screen.findByRole("link", { name: /USD/ });
    expect(usd).toHaveTextContent("+10.00%");
    expect(usd).toHaveAttribute("href", "/currency/USD?base=EUR");
  });

  it("filters by search and sorts by biggest move", async () => {
    const { user } = setup();
    await user.type(await screen.findByLabelText("Search"), "dollar");
    expect(cardCodes()).toEqual(["USD"]);
    expect(screen.getByText("Showing 1 of 3")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Search"));
    await user.click(screen.getByRole("button", { name: "Biggest move" }));
    expect(cardCodes()).toEqual(["USD", "JPY", "PLN"]);
  });

  it("says when nothing matches", async () => {
    setup("/?q=zzz");
    expect(await screen.findByText("No currency matches “zzz”.")).toBeInTheDocument();
  });

  it("converts euros with the selected currency", async () => {
    const { user } = setup();
    const amount = await screen.findByLabelText("Amount in EUR");
    await user.clear(amount);
    await user.type(amount, "250");
    await user.selectOptions(screen.getByLabelText("Convert to"), "PLN");
    expect(screen.getByRole("status")).toHaveTextContent("1,050.00 PLN");
  });

  it("flags a negative amount instead of converting it", async () => {
    const { user } = setup();
    const amount = await screen.findByLabelText("Amount in EUR");
    await user.clear(amount);
    await user.type(amount, "-50");
    expect(amount).toHaveAttribute("aria-invalid", "true");
    expect(amount).toHaveAccessibleDescription("Enter an amount of 0 or more.");
    expect(screen.getByRole("status")).not.toHaveTextContent("EUR =");
  });

  it("shows an error with a retry button when the API fails", async () => {
    mockApi({});
    renderRoute(<TodayPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load rates");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("shows rates against another base", async () => {
    const { fetch, user } = setup("/?base=PLN");
    expect(
      await screen.findByRole("heading", { name: /Polish zloty exchange rates for 21 October 2026/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Prices in Polish zloty · cross rates derived/)).toBeInTheDocument();
    expect(screen.getByText(/price of one unit of a currency in Polish zloty/)).toBeInTheDocument();
    expect(screen.getByText("Prices in PLN")).toBeInTheDocument();
    for (const endpoint of ["newest", "rates"]) {
      for (const params of requestsTo(fetch, endpoint)) {
        expect(params.get("base")).toBe("PLN");
      }
    }
    expect(screen.getByRole("link", { name: /USD/ })).toHaveAttribute("href", "/currency/USD?base=PLN");

    // Prices in PLN convert the currency into zloty.
    await user.selectOptions(screen.getByLabelText("Currency"), "USD");
    const amount = screen.getByLabelText("Amount in USD");
    await user.clear(amount);
    await user.type(amount, "10");
    expect(screen.getByRole("status")).toHaveTextContent("10.00 USD =11.00 PLN");
    expect(screen.getByRole("status")).toHaveTextContent("1 PLN = 0.9091 USD");
  });

  it("says nothing about cross rates for the euro", async () => {
    setup();
    await screen.findByRole("heading", { name: /Euro exchange rates/ });
    expect(screen.queryByText(/cross rates derived/)).not.toBeInTheDocument();
  });
});
