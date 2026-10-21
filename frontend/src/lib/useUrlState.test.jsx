import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { renderRoute } from "../test/render";
import useUrlState from "./useUrlState";

function Probe() {
  const [{ q: query, sort }, setParam] = useUrlState({ q: "", sort: "code" });
  const { search } = useLocation();
  return (
    <>
      <label htmlFor="q">Query</label>
      <input id="q" value={query} onChange={(e) => setParam("q", e.target.value)} />
      <button type="button" onClick={() => setParam("sort", sort === "code" ? "move" : "code")}>
        Sort: {sort}
      </button>
      <p data-testid="search">{search}</p>
      <Link to="/">Reset</Link>
      <Link to="/?q=eur">Preset</Link>
      <Link to="/?q=a">Letter a</Link>
    </>
  );
}

const setup = (url = "/") => {
  renderRoute(<Probe />, { url });
  return userEvent.setup();
};

const search = () => screen.getByTestId("search").textContent;

describe("useUrlState", () => {
  it("starts from the URL", () => {
    setup("/?q=usd&sort=move");
    expect(screen.getByLabelText("Query")).toHaveValue("usd");
    expect(screen.getByRole("button")).toHaveTextContent("Sort: move");
  });

  it("writes every typed character to the URL", async () => {
    const user = setup();
    await user.type(screen.getByLabelText("Query"), "swiss franc");
    expect(screen.getByLabelText("Query")).toHaveValue("swiss franc");
    await waitFor(() => expect(search()).toBe("?q=swiss+franc"));
  });

  it("drops the param for the fallback value and keeps the others", async () => {
    const user = setup("/?q=usd");
    await user.click(screen.getByRole("button"));
    await waitFor(() => expect(search()).toBe("?q=usd&sort=move"));
    await user.click(screen.getByRole("button"));
    await waitFor(() => expect(search()).toBe("?q=usd"));
    await user.clear(screen.getByLabelText("Query"));
    await waitFor(() => expect(search()).toBe(""));
  });

  it("keeps both params when they change in the same tick", async () => {
    setup();
    // Two updates before the router can re-render: neither may drop the other.
    act(() => {
      fireEvent.change(screen.getByLabelText("Query"), { target: { value: "usd" } });
      fireEvent.click(screen.getByRole("button"));
    });
    await waitFor(() => expect(search()).toBe("?q=usd&sort=move"));
    expect(screen.getByLabelText("Query")).toHaveValue("usd");
  });

  it("follows a link that clears the URL instead of writing the old value back", async () => {
    const user = setup("/?q=usd&sort=move");
    await user.click(screen.getByRole("link", { name: "Reset" }));
    expect(screen.getByLabelText("Query")).toHaveValue("");
    expect(screen.getByRole("button")).toHaveTextContent("Sort: code");
    // Give any write-back a chance to happen before checking it didn't.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(search()).toBe("");
  });

  it("still adopts a link after writes that cancelled out", async () => {
    const user = setup();
    // Type "a" and delete it before the router renders: the URL ends unchanged.
    act(() => {
      fireEvent.change(screen.getByLabelText("Query"), { target: { value: "a" } });
      fireEvent.change(screen.getByLabelText("Query"), { target: { value: "" } });
    });
    await waitFor(() => expect(search()).toBe(""));
    // A real navigation to ?q=a must not be mistaken for the old "a" write.
    await user.click(screen.getByRole("link", { name: "Letter a" }));
    expect(screen.getByLabelText("Query")).toHaveValue("a");
    expect(search()).toBe("?q=a");
  });

  it("adopts a value set by a link", async () => {
    const user = setup("/?q=usd");
    await user.click(screen.getByRole("link", { name: "Preset" }));
    expect(screen.getByLabelText("Query")).toHaveValue("eur");
    expect(search()).toBe("?q=eur");
  });
});
