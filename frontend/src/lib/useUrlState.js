import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";

/**
 * Page state mirrored into URL search params, so a link restores it.
 * `defaults` maps each param to its default; a value equal to its default
 * is left out of the URL.
 *
 * All params of a page go through one hook and are written together:
 * `setSearchParams` hands its updater the params of the last render, so two
 * separate writers (say search and sort) changed before the router re-renders
 * would overwrite each other.
 *
 * Values live in React state and are written after render: the router renders
 * in a transition, so binding an input straight to the URL drops characters
 * typed faster than it re-renders. Writes use `replace` (no history entries).
 *
 * URL changes made elsewhere (a nav link to the bare path, back/forward) are
 * adopted. They are told apart from echoes of this hook's own writes by the
 * queue of written states not yet seen back in the URL: when typing fast,
 * several writes can be in flight before the first one renders.
 */
export default function useUrlState(defaults) {
  const [params, setParams] = useSearchParams();
  // Every navigation, including one that leaves the search unchanged (e.g. a
  // write followed by its undo, rendered together), gets a new key.
  const { key: locationKey } = useLocation();
  const keys = Object.keys(defaults);
  const fromUrl = Object.fromEntries(keys.map((key) => [key, params.get(key) ?? defaults[key]]));
  const urlKey = JSON.stringify(fromUrl);

  const [state, setState] = useState(fromUrl);
  const stateKey = JSON.stringify(state);
  const pending = useRef([]);

  // After each navigation, adopt the URL unless it is an echo of one of our
  // own writes. Running on the location key (not only on a changed search)
  // also drains writes that netted out to the same URL, so a stale entry
  // can't later swallow a genuine back/forward to that value.
  useEffect(() => {
    const echo = pending.current.lastIndexOf(urlKey);
    if (echo >= 0) {
      pending.current.splice(0, echo + 1);
      return;
    }
    pending.current = [];
    setState(JSON.parse(urlKey));
  }, [urlKey, locationKey]);

  // Write local changes to the URL. Keyed on the state only: a URL change
  // alone must not trigger a write back.
  useEffect(() => {
    if (stateKey === urlKey && pending.current.length === 0) return;
    pending.current.push(stateKey);
    const values = JSON.parse(stateKey);
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const key of keys) {
          const value = values[key];
          if (!value || value === defaults[key]) next.delete(key);
          else next.set(key, value);
        }
        return next;
      },
      { replace: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateKey]);

  const set = useCallback((key, value) => setState((current) => ({ ...current, [key]: value })), []);

  return [state, set];
}
