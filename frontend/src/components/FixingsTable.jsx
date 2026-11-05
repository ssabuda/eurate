import { useEffect, useId, useRef, useState } from "react";

import { useFixingsPage } from "../api/hooks";
import { rateUnit } from "../lib/currencies";
import { formatCount, formatDate, formatRate } from "../lib/format";
import { percentChange } from "../lib/rates";
import ui from "../styles/ui.module.css";
import ChangeChip from "./ChangeChip";
import QueryState from "./QueryState";
import styles from "./FixingsTable.module.css";

const PAGE_SIZE = 10;
const APPLY_DELAY_MS = 300;
const MIN_YEAR = 1000;
const MAX_YEAR = 9999;

/** Paginated daily fixings of one currency against `base`, newest first. */
export default function FixingsTable({ currency, base }) {
  const id = useId();
  const [page, setPage] = useState(0);
  const [draft, setDraft] = useState("");
  const [dateLte, setDateLte] = useState("");
  const [invalid, setInvalid] = useState(false);
  // A half-typed date reports "" as its value, so only a remount can clear it.
  const [inputKey, setInputKey] = useState(0);
  const applyTimer = useRef();
  const dateField = useRef();
  const { data, isPending, isPlaceholderData, error, refetch } = useFixingsPage(base, currency, {
    pageSize: PAGE_SIZE,
    page,
    dateLte,
  });

  useEffect(() => () => clearTimeout(applyTimer.current), []);

  // "Latest" removes itself and the old field, so hand focus to the new field.
  useEffect(() => {
    if (inputKey > 0) dateField.current.focus();
  }, [inputKey]);

  const results = data?.results ?? [];
  const rows = results.slice(0, PAGE_SIZE).map((r, i) => ({
    ...r,
    change: results[i + 1] ? percentChange(results[i + 1].rate, r.rate) : null,
  }));
  const count = data?.count ?? 0;
  const first = page * PAGE_SIZE + 1;
  const last = Math.min(count, (page + 1) * PAGE_SIZE);

  const applyDate = (value) => {
    if (value === dateLte) return;
    setDateLte(value);
    setPage(0);
  };

  const changeDate = ({ target: { value, validity } }) => {
    clearTimeout(applyTimer.current);
    setDraft(value);
    setInvalid(false);
    // Still being edited: keep the applied filter until the date is complete.
    if (!validity.valid) return;
    applyTimer.current = setTimeout(() => applyDate(value), APPLY_DELAY_MS);
  };

  // Complain only once the field is left: a year passes through 0002 while
  // being typed. Clearing segment by segment fires no change event, so an empty
  // field is applied here too.
  const leaveDate = ({ target: { value, validity } }) => {
    setInvalid(!validity.valid);
    if (!validity.valid) return;
    clearTimeout(applyTimer.current);
    applyDate(value);
  };

  const goToPage = (next) => {
    if (!isPlaceholderData) setPage(next);
  };

  const showLatest = () => {
    clearTimeout(applyTimer.current);
    setDraft("");
    setInvalid(false);
    setInputKey((key) => key + 1);
    applyDate("");
  };

  return (
    <section className={`${ui.card} ${styles.table}`} aria-labelledby={`${id}-title`}>
      <div className={styles.head}>
        <h2 id={`${id}-title`} className={ui.cardTitle}>
          Daily fixings
        </h2>
        {invalid && (
          <p id={`${id}-date-error`} role="alert" className={styles.error}>
            Enter a full date with a year between {MIN_YEAR} and {MAX_YEAR}. The table has not changed.
          </p>
        )}
        <div className={styles.jump}>
          <div className={ui.field}>
            <label htmlFor={`${id}-date`} className={ui.label}>
              Show fixings up to
            </label>
            <input
              key={inputKey}
              ref={dateField}
              id={`${id}-date`}
              type="date"
              min={`${MIN_YEAR}-01-01`}
              max={`${MAX_YEAR}-12-31`}
              value={draft}
              onChange={changeDate}
              onFocus={() => setInvalid(false)}
              onBlur={leaveDate}
              aria-invalid={invalid}
              aria-describedby={invalid ? `${id}-date-error` : undefined}
              className={`${ui.input} ${styles.date}`}
            />
          </div>
          {(dateLte || invalid) && (
            <button type="button" className={ui.button} onClick={showLatest}>
              Latest
            </button>
          )}
        </div>
      </div>

      <QueryState
        isLoading={isPending || (isPlaceholderData && rows.length === 0)}
        error={error}
        onRetry={refetch}
        empty={rows.length === 0}
        emptyMessage="No fixings on or before this date."
      >
        <div
          className={`${styles.scroll} ${isPlaceholderData ? styles.stale : ""}`}
          aria-busy={isPlaceholderData}
        >
          <table>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col" className={styles.num}>Rate ({rateUnit(base, currency)})</th>
                <th scope="col" className={styles.num}>Day change</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.date}>
                  <td>{formatDate(r.date)}</td>
                  <td className={`${styles.num} ${ui.mono}`}>{formatRate(r.rate)}</td>
                  <td className={styles.num}>
                    <ChangeChip value={r.change} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={styles.pager}>
          <span className={ui.hint}>
            {isPlaceholderData ? "Loading…" : `${first}–${last} of ${formatCount(count, "fixing", "fixings")}`}
          </span>
          <div className={styles.pagerButtons}>
            <button
              type="button"
              className={ui.button}
              disabled={page === 0}
              aria-disabled={isPlaceholderData}
              onClick={() => goToPage(page - 1)}
            >
              Newer
            </button>
            <button
              type="button"
              className={ui.button}
              disabled={last >= count}
              aria-disabled={isPlaceholderData}
              onClick={() => goToPage(page + 1)}
            >
              Older
            </button>
          </div>
        </div>
      </QueryState>
    </section>
  );
}
