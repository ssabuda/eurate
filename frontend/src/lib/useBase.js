import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

import { BASE_CURRENCY } from "./currencies";

const STORAGE_KEY = "eurate.base";

// Storage may be unavailable (private mode, blocked site data); the base then
// lives in the URL only.
const readStored = () => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const store = (base) => {
  try {
    localStorage.setItem(STORAGE_KEY, base);
  } catch {
    // Nothing to remember it in.
  }
};

/** Adds `?base=` to an app path, so a copied link shows the same rates. */
export const withBase = (path, base) => `${path}?base=${encodeURIComponent(base)}`;

/**
 * The currency rates are shown against: `?base=` in the URL, else the one
 * last picked (localStorage, read only when the URL has none), else the euro.
 * The base is written to the URL even for the euro: a bare link would
 * otherwise open in whatever base its reader last picked. Writes keep the
 * page's other params and replace the history entry.
 */
export default function useBase() {
  const [params, setParams] = useSearchParams();
  const base = (params.get("base") || readStored() || BASE_CURRENCY).toUpperCase();

  const setBase = useCallback(
    (next) => {
      store(next);
      setParams(
        (current) => {
          const updated = new URLSearchParams(current);
          updated.set("base", next);
          return updated;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  return [base, setBase];
}
