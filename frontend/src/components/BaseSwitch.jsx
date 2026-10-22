import { useEffect, useId } from "react";
import { useSearchParams } from "react-router-dom";

import { useNewest } from "../api/hooks";
import { BASE_CURRENCY, currencyName, quotesPrice } from "../lib/currencies";
import useBase from "../lib/useBase";
import styles from "./BaseSwitch.module.css";

/** The euro first, then the base and the currencies quoted against it, A–Z. */
const baseCodes = (base, rows) => {
  const codes = new Set([base, ...rows.map((r) => r.currency)]);
  codes.delete(BASE_CURRENCY);
  return [BASE_CURRENCY, ...[...codes].sort()];
};

/**
 * Picks the currency every page shows rates against. A native select, so
 * keyboard, screen readers and the phone's own picker work as usual; it is
 * laid transparent over the pill, which shows only the code.
 */
export default function BaseSwitch() {
  const id = useId();
  const [base, setBase] = useBase();
  const [params] = useSearchParams();
  // The page asks for the same newest rates, so this is no extra request.
  const { data, error } = useNewest(base);
  // Without a list (still loading, or the request failed) the euro is still
  // offered, so the base can always be switched back.
  const codes = baseCodes(base, data?.results ?? []);
  const unknown = error?.status === 400;
  const inUrl = params.has("base");

  useEffect(() => {
    // The API knows which bases exist: an unknown one (a mistyped link, a
    // stale remembered base) falls back to the euro. A base taken from
    // storage is written to the URL, so links copied from the address bar
    // show what is on screen.
    if (unknown) setBase(BASE_CURRENCY);
    else if (!inUrl) setBase(base);
  }, [unknown, inUrl, base, setBase]);

  return (
    <div className={styles.switch}>
      <label htmlFor={id} className={styles.label}>
        Base
      </label>
      <span className={quotesPrice(base) ? `${styles.pill} ${styles.derived}` : styles.pill}>
        <span className={styles.code} aria-hidden="true">
          {base}
        </span>
        <svg className={styles.chevron} viewBox="0 0 12 12" aria-hidden="true">
          <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <select id={id} value={base} onChange={(e) => setBase(e.target.value)} className={styles.select}>
          {codes.map((c) => (
            <option key={c} value={c}>
              {c} — {currencyName(c)}
            </option>
          ))}
        </select>
      </span>
    </div>
  );
}
