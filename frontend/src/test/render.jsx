import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";

/**
 * Stubs `fetch` with canned DRF responses keyed by endpoint name
 * (`newest`, `rates`, `topprice`, `lowestprice`). A function value receives
 * the request's URLSearchParams and returns the result rows, or
 * `{ results, count }` when the total differs from the page (pagination),
 * or a `Response` for an error; it may return a promise to hold a response back.
 */
export const mockApi = (routes) =>
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = new URL(input, "http://localhost");
    const endpoint = url.pathname.split("/").filter(Boolean).pop();
    const route = routes[endpoint];
    if (route === undefined) return new Response("Not found", { status: 404 });
    const data = typeof route === "function" ? await route(url.searchParams) : route;
    if (data instanceof Response) return data;
    const { results, count } = Array.isArray(data) ? { results: data, count: data.length } : data;
    return Response.json({ count, next: null, previous: null, results });
  });

/** Query strings of every `fetch` call to one endpoint, in call order. */
export const requestsTo = (fetchMock, endpoint) =>
  fetchMock.mock.calls
    .map(([input]) => new URL(input, "http://localhost"))
    .filter((url) => url.pathname.endsWith(`/${endpoint}/`))
    .map((url) => url.searchParams);

export const renderRoute = (element, { path = "/", url = "/" } = {}) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path={path} element={element} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};
