import { Link } from "react-router-dom";

import { useRecords } from "../api/hooks";
import QueryState from "../components/QueryState";
import StatTile, { StatGrid } from "../components/StatTile";
import { addDays, formatCount, formatDate, formatRate } from "../lib/format";
import { matchesQuery } from "../lib/rates";
import useUrlState from "../lib/useUrlState";
import ui from "../styles/ui.module.css";
import styles from "./RecordsPage.module.css";

const RECENT_DAYS = 90;

const byCode = (a, b) => a.code.localeCompare(b.code);

// Ties (e.g. several currencies at 0%) fall back to the code, so the tiles
// and the sorted table always agree on which currency comes first.
const SORTS = {
  code: byCode,
  high: (a, b) => b.position - a.position || byCode(a, b),
  low: (a, b) => a.position - b.position || byCode(a, b),
};

const percent = (position) => `${Math.round(position * 100)}%`;

/**
 * Counts record highs and lows set within `days` of the newest fixing.
 * A high and low on the same day (a currency that never moved) is one record.
 */
const countRecent = (records, newestDate, days) => {
  const since = addDays(newestDate, -days);
  return records.reduce((sum, r) => {
    const dates = new Set([r.high.date, r.low.date]);
    return sum + [...dates].filter((date) => date >= since).length;
  }, 0);
};

export default function RecordsPage() {
  const { records, date, isLoading, error, refetch } = useRecords();
  const [{ q: query, sort: sortParam }, setParam] = useUrlState({ q: "", sort: "code" });
  // hasOwn, not `SORTS[x]`: ?sort=__proto__ must not reach Array.sort.
  const sort = Object.hasOwn(SORTS, sortParam) ? sortParam : "code";

  const rows = records.filter((r) => matchesQuery(r, query)).sort(SORTS[sort]);
  const nearHigh = [...records].sort(SORTS.high)[0];
  const nearLow = [...records].sort(SORTS.low)[0];

  return (
    <>
      <section className={styles.intro}>
        <p className={ui.eyebrow}>Records</p>
        <h1 className={styles.title}>Where is the euro today, against its history?</h1>
        <p className={ui.lead}>
          The strongest and weakest euro fixing stored for every currency, and where today's rate
          sits between them.
        </p>
      </section>

      <QueryState
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        empty={records.length === 0}
        emptyMessage="No rates yet. Import the full history with: docker compose run --rm web python manage.py run_ecb_import --historic"
      >
        <StatGrid>
          <StatTile label="Closest to its record high" value={nearHigh?.code} detail={nearHigh && `at ${percent(nearHigh.position)} of its range`} />
          <StatTile label="Closest to its record low" value={nearLow?.code} detail={nearLow && `at ${percent(nearLow.position)} of its range`} />
          <StatTile
            label={`Records set in the last ${RECENT_DAYS} days`}
            value={date ? countRecent(records, date, RECENT_DAYS) : "–"}
            detail="highs or lows"
          />
        </StatGrid>

        <section className={`${ui.card} ${styles.tableCard}`} aria-labelledby="records-title">
          <div className={styles.head}>
            <h2 id="records-title" className={ui.cardTitle}>
              {formatCount(rows.length, "currency", "currencies")}
            </h2>
            <div className={styles.controls}>
              <div className={ui.field}>
                <label htmlFor="records-search" className={ui.label}>
                  Search
                </label>
                <input
                  id="records-search"
                  type="search"
                  placeholder="Code or name"
                  value={query}
                  onChange={(e) => setParam("q", e.target.value)}
                  className={`${ui.input} ${styles.search}`}
                />
              </div>
              <div className={ui.field}>
                <label htmlFor="records-sort" className={ui.label}>
                  Sort by
                </label>
                <select
                  id="records-sort"
                  value={sort}
                  onChange={(e) => setParam("sort", e.target.value)}
                  className={ui.select}
                >
                  <option value="code">Currency code</option>
                  <option value="high">Closest to high</option>
                  <option value="low">Closest to low</option>
                </select>
              </div>
            </div>
          </div>

          {rows.length === 0 ? (
            <p className={styles.noMatch}>No currency matches “{query}”.</p>
          ) : (
            <div className={styles.scroll}>
              <table>
                <thead>
                  <tr>
                    <th scope="col">Currency</th>
                    <th scope="col" className={styles.num}>Record low</th>
                    <th scope="col" className={styles.barCol}>Today vs. history (low → high)</th>
                    <th scope="col">Record high</th>
                    <th scope="col" className={styles.num}>Today</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.code}>
                      <td>
                        <Link to={`/currency/${r.code}`} className={styles.currency}>
                          <span className={styles.code}>{r.code}</span>
                          <span className={styles.name}>{r.name}</span>
                        </Link>
                      </td>
                      <td className={styles.num}>
                        <div className={ui.mono}>{formatRate(r.low.rate)}</div>
                        <div className={styles.date}>{formatDate(r.low.date)}</div>
                      </td>
                      <td>
                        <RangeBar position={r.position} />
                      </td>
                      <td>
                        <div className={ui.mono}>{formatRate(r.high.rate)}</div>
                        <div className={styles.date}>{formatDate(r.high.date)}</div>
                      </td>
                      <td className={styles.num}>
                        <div className={`${ui.mono} ${styles.today}`}>{formatRate(r.rate)}</div>
                        <div className={styles.date}>{percent(r.position)} of range</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className={styles.footnote}>
            A position near 100% means one euro buys more of that currency than ever stored — the
            euro is historically strong against it.
          </p>
        </section>
      </QueryState>
    </>
  );
}

function RangeBar({ position }) {
  const tone = position > 0.8 ? styles.markHigh : position < 0.2 ? styles.markLow : styles.markMid;
  return (
    <div role="img" aria-label={`Today at ${percent(position)} between record low and record high`} className={styles.track}>
      <span className={`${styles.mark} ${tone}`} style={{ left: `${position * 100}%` }} />
    </div>
  );
}
