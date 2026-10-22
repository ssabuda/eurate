import { useId, useState } from "react";

import { useFixingsPage } from "../api/hooks";
import { rateUnit } from "../lib/currencies";
import { formatCount, formatDate, formatRate } from "../lib/format";
import { percentChange } from "../lib/rates";
import ui from "../styles/ui.module.css";
import ChangeChip from "./ChangeChip";
import QueryState from "./QueryState";
import styles from "./FixingsTable.module.css";

const PAGE_SIZE = 10;

/** Paginated daily fixings of one currency against `base`, newest first. */
export default function FixingsTable({ currency, base }) {
  const id = useId();
  const [page, setPage] = useState(0);
  const [dateLte, setDateLte] = useState("");
  const { data, isPending, error, refetch } = useFixingsPage(base, currency, {
    pageSize: PAGE_SIZE,
    page,
    dateLte,
  });

  const results = data?.results ?? [];
  const rows = results.slice(0, PAGE_SIZE).map((r, i) => ({
    ...r,
    change: results[i + 1] ? percentChange(results[i + 1].rate, r.rate) : null,
  }));
  const count = data?.count ?? 0;
  const first = page * PAGE_SIZE + 1;
  const last = Math.min(count, (page + 1) * PAGE_SIZE);

  const jumpTo = (value) => {
    setDateLte(value);
    setPage(0);
  };

  return (
    <section className={`${ui.card} ${styles.table}`} aria-labelledby={`${id}-title`}>
      <div className={styles.head}>
        <h2 id={`${id}-title`} className={ui.cardTitle}>
          Daily fixings
        </h2>
        <div className={styles.jump}>
          <div className={ui.field}>
            <label htmlFor={`${id}-date`} className={ui.label}>
              Show fixings up to
            </label>
            <input
              id={`${id}-date`}
              type="date"
              value={dateLte}
              onChange={(e) => jumpTo(e.target.value)}
              className={ui.input}
            />
          </div>
          {dateLte && (
            <button type="button" className={ui.button} onClick={() => jumpTo("")}>
              Latest
            </button>
          )}
        </div>
      </div>

      <QueryState
        isLoading={isPending}
        error={error}
        onRetry={refetch}
        empty={rows.length === 0}
        emptyMessage="No fixings on or before this date."
      >
        <div className={styles.scroll}>
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
            {first}–{last} of {formatCount(count, "fixing", "fixings")}
          </span>
          <div className={styles.pagerButtons}>
            <button type="button" className={ui.button} disabled={page === 0} onClick={() => setPage(page - 1)}>
              Newer
            </button>
            <button type="button" className={ui.button} disabled={last >= count} onClick={() => setPage(page + 1)}>
              Older
            </button>
          </div>
        </div>
      </QueryState>
    </section>
  );
}
