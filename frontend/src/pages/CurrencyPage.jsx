import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";

import { useCurrencyRecord, useHistory, useLatestRate, useNewest } from "../api/hooks";
import ChangeChip from "../components/ChangeChip";
import FixingsTable from "../components/FixingsTable";
import HistoryChart from "../components/HistoryChart";
import QueryState from "../components/QueryState";
import SegmentedControl from "../components/SegmentedControl";
import StatTile, { StatGrid } from "../components/StatTile";
import { currencyName } from "../lib/currencies";
import { addDays, formatDate, formatLongDate, formatPercent, formatRate } from "../lib/format";
import { percentChange } from "../lib/rates";
import useUrlState from "../lib/useUrlState";
import ui from "../styles/ui.module.css";
import styles from "./CurrencyPage.module.css";

const RANGES = [
  { value: "1m", label: "1M", days: 30, text: "one month" },
  { value: "3m", label: "3M", days: 91, text: "three months" },
  { value: "1y", label: "1Y", days: 365, text: "one year" },
  { value: "5y", label: "5Y", days: 1826, text: "five years" },
  { value: "all", label: "All", days: null, text: "all stored data" },
];
const DEFAULT_RANGE = "3m";

const currencyPath = (code, search) => `/currency/${code}${search}`;

export default function CurrencyPage() {
  const { code: rawCode } = useParams();
  const code = rawCode.toUpperCase();
  const navigate = useNavigate();
  const { search } = useLocation();

  const [{ range: rangeParam }, setParam] = useUrlState({ range: DEFAULT_RANGE });
  const range = RANGES.find((r) => r.value === rangeParam) ?? RANGES.find((r) => r.value === DEFAULT_RANGE);

  const newest = useNewest();
  const newestDate = newest.data?.results[0]?.date ?? null;

  // A currency exists when it has any stored rate, not only when it is in
  // today's fixing: the ECB has dropped some (HRK, CYP, …) that still have history.
  // While switching currency the previous one's data is kept as a placeholder,
  // so the page (and the picker the user is on) stays in place; it is never
  // shown as the new currency's.
  const latest = useLatestRate(code);
  const known = Boolean(latest.data);
  const current = latest.isPlaceholderData ? null : latest.data;
  const discontinued = Boolean(current) && newestDate !== null && current.date < newestDate;

  const codes = newest.data?.results.map((r) => r.currency) ?? [];
  if (known && !codes.includes(code)) codes.push(code);
  codes.sort();

  // Ranges end at the currency's own latest fixing, so a discontinued
  // currency still shows its last months instead of an empty chart.
  const dateGte = range.days && current ? addDays(current.date, -range.days) : null;
  const history = useHistory(current ? code : null, dateGte);
  const { data: record } = useCurrencyRecord(current ? code : null);

  if (rawCode !== code) {
    return <Navigate to={currencyPath(code, search)} replace />;
  }

  // The chart may show the previous range (dimmed) while a new one loads,
  // but the period tiles only ever describe the range they are labelled with.
  const series = history.data ?? [];
  const period = history.isPlaceholderData ? [] : series;
  const values = period.map((d) => d.rate);

  const pickCurrency = (next) => navigate(currencyPath(next, search));

  return (
    <QueryState
      isLoading={newest.isPending || (latest.isPending && !known)}
      error={newest.error ?? latest.error}
      onRetry={() => {
        newest.refetch();
        latest.refetch();
      }}
      empty={!known}
      emptyMessage={
        <>
          No rates for “{code}”. <Link to="/">See all currencies</Link>
        </>
      }
    >
      {known && (
        <>
          <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
            <Link to="/">Today's rates</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{code}</span>
          </nav>

          <section className={styles.summary}>
            <div className={styles.heading}>
              <div className={styles.titleRow}>
                <span className={styles.pair}>EUR/{code}</span>
                <h1 className={styles.title}>{currencyName(code)}</h1>
              </div>
              {current ? (
                <>
                  <div className={styles.rateRow}>
                    <span className={styles.rate}>{formatRate(current.rate)}</span>
                    <ChangeChip value={current.change} suffix="vs previous fixing" size="lg" />
                  </div>
                  <p className={ui.hint}>
                    1 EUR in {code} · fixing of {formatLongDate(current.date)}
                    {discontinued && " · no longer published by the ECB"}
                  </p>
                </>
              ) : (
                <p role="status" className={ui.hint}>
                  Loading {code}…
                </p>
              )}
            </div>
            <div className={ui.field}>
              <label htmlFor="currency" className={ui.label}>
                Currency
              </label>
              <select id="currency" value={code} onChange={(e) => pickCurrency(e.target.value)} className={`${ui.select} ${styles.picker}`}>
                {codes.map((c) => (
                  <option key={c} value={c}>
                    {c} — {currencyName(c)}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className={`${ui.card} ${styles.chartCard}`} aria-labelledby="history-title">
            <div className={styles.chartHead}>
              <h2 id="history-title" className={ui.cardTitle}>
                Rate history
              </h2>
              <SegmentedControl
                label="Time range"
                options={RANGES}
                value={range.value}
                onChange={(value) => setParam("range", value)}
              />
            </div>
            <QueryState isLoading={history.isPending} error={history.error} onRetry={history.refetch}>
              <div className={history.isFetching ? styles.refreshing : undefined}>
                <HistoryChart
                  data={series}
                  label={
                    period.length > 1
                      ? `EUR/${code} over ${range.text}, from ${formatRate(period[0].rate)} to ${formatRate(period[period.length - 1].rate)}`
                      : `EUR/${code}`
                  }
                />
              </div>
            </QueryState>
          </section>

          <StatGrid>
            <StatTile
              label={`Change over ${range.text}`}
              value={period.length > 1 ? formatPercent(percentChange(period[0].rate, period[period.length - 1].rate)) : "–"}
              detail={period.length > 1 ? `since ${formatDate(period[0].date)}` : null}
            />
            <StatTile
              label="Range in period"
              value={values.length ? `${formatRate(Math.min(...values))} – ${formatRate(Math.max(...values))}` : "–"}
            />
            <StatTile
              label="Highest on record"
              value={record ? formatRate(record.high.rate) : "–"}
              detail={record && formatDate(record.high.date)}
            />
            <StatTile
              label="Lowest on record"
              value={record ? formatRate(record.low.rate) : "–"}
              detail={record && formatDate(record.low.date)}
            />
          </StatGrid>

          <FixingsTable key={code} currency={code} />
        </>
      )}
    </QueryState>
  );
}
