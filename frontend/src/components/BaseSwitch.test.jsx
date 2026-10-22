import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { mockApi, renderRoute, requestsTo } from "../test/render";
import BaseSwitch from "./BaseSwitch";

const NEWEST = {
  EUR: [
    { currency: "USD", date: "2026-10-21", rate: "1.1234" },
    { currency: "PLN", date: "2026-10-21", rate: "4.2450" },
  ],
  PLN: [
    { currency: "USD", date: "2026-10-21", rate: "3.7787" },
    { currency: "EUR", date: "2026-10-21", rate: "4.2450" },
  ],
};

/** Answers `newest/` per base; an unknown base is a 400, as from the API. */
const newest = (params) =>
  NEWEST[params.get("base") ?? "EUR"] ??
  Response.json({ base: "No rates stored." }, { status: 400 });

function Search() {
  return <p data-testid="search">{useLocation().search}</p>;
}

const setup = (url = "/?base=EUR") => {
  const fetch = mockApi({ newest });
  renderRoute(
    <>
      <BaseSwitch />
      <Search />
    </>,
    { url },
  );
  return { fetch, user: userEvent.setup() };
};

const search = () => screen.getByTestId("search").textContent;

const optionCodes = () => screen.getAllByRole("option").map((option) => option.value);

describe("BaseSwitch", () => {
  it("offers the euro and every currency quoted against the base", async () => {
    setup();
    await waitFor(() => expect(optionCodes()).toEqual(["EUR", "PLN", "USD"]));
    expect(screen.getByRole("option", { name: "PLN — Polish zloty" })).toBeInTheDocument();
    expect(screen.getByLabelText("Base")).toHaveValue("EUR");
  });

  it("lists the same currencies against another base, with no extra request", async () => {
    const { fetch } = setup("/?base=PLN");
    await waitFor(() => expect(optionCodes()).toEqual(["EUR", "PLN", "USD"]));
    expect(requestsTo(fetch, "newest").map((p) => p.get("base"))).toEqual(["PLN"]);
  });

  it("switches the base in the URL", async () => {
    const { user } = setup("/?q=us&base=EUR");
    await waitFor(() => expect(optionCodes()).toContain("PLN"));
    await user.selectOptions(screen.getByLabelText("Base"), "PLN");
    expect(screen.getByLabelText("Base")).toHaveValue("PLN");
    expect(search()).toBe("?q=us&base=PLN");
  });

  it("falls back to the euro for a base the API doesn't know", async () => {
    setup("/?base=XYZ");
    await waitFor(() => expect(search()).toBe("?base=EUR"));
    expect(screen.getByLabelText("Base")).toHaveValue("EUR");
  });

  it("still offers the euro while the list is unavailable", () => {
    mockApi({ newest: () => new Promise(() => {}) });
    renderRoute(<BaseSwitch />, { url: "/?base=PLN" });
    expect(optionCodes()).toEqual(["EUR", "PLN"]);
  });

  it("writes a remembered base to a bare URL", async () => {
    localStorage.setItem("eurate.base", "PLN");
    setup("/");
    await waitFor(() => expect(search()).toBe("?base=PLN"));
  });

  it("writes the euro to a bare URL when nothing is remembered", async () => {
    setup("/");
    await waitFor(() => expect(search()).toBe("?base=EUR"));
  });
});
