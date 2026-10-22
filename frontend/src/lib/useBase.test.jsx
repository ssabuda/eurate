import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { renderRoute } from "../test/render";
import useBase, { withBase } from "./useBase";

function Probe() {
  const [base, setBase] = useBase();
  const { search } = useLocation();
  return (
    <>
      <p data-testid="base">{base}</p>
      <p data-testid="search">{search}</p>
      <button type="button" onClick={() => setBase("PLN")}>
        PLN
      </button>
      <button type="button" onClick={() => setBase("EUR")}>
        EUR
      </button>
    </>
  );
}

const setup = (url = "/") => {
  renderRoute(<Probe />, { url });
  return userEvent.setup();
};

const base = () => screen.getByTestId("base").textContent;
const search = () => screen.getByTestId("search").textContent;

describe("useBase", () => {
  it("defaults to the euro", () => {
    setup();
    expect(base()).toBe("EUR");
  });

  it("reads the URL, in any case", () => {
    setup("/?base=pln");
    expect(base()).toBe("PLN");
  });

  it("falls back to the last picked base", () => {
    localStorage.setItem("eurate.base", "USD");
    setup();
    expect(base()).toBe("USD");
  });

  it("prefers the URL over the last picked base", () => {
    localStorage.setItem("eurate.base", "USD");
    setup("/?base=PLN");
    expect(base()).toBe("PLN");
  });

  it("writes the base to the URL, keeps other params and remembers it", async () => {
    const user = setup("/?q=usd");
    await user.click(screen.getByRole("button", { name: "PLN" }));
    expect(base()).toBe("PLN");
    expect(search()).toBe("?q=usd&base=PLN");
    expect(localStorage.getItem("eurate.base")).toBe("PLN");
  });

  it("writes the euro to the URL too, so a copied link is unambiguous", async () => {
    const user = setup("/?q=usd&base=PLN");
    await user.click(screen.getByRole("button", { name: "EUR" }));
    expect(base()).toBe("EUR");
    expect(search()).toBe("?q=usd&base=EUR");
    expect(localStorage.getItem("eurate.base")).toBe("EUR");
  });
});

describe("withBase", () => {
  it("adds the base to a path, the euro included", () => {
    expect(withBase("/records", "PLN")).toBe("/records?base=PLN");
    expect(withBase("/records", "EUR")).toBe("/records?base=EUR");
  });
});
