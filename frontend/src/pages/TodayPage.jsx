import { Link } from "react-router-dom";

import { useTodayRates } from "../api/hooks";
import BaseNote from "../components/BaseNote";
import ChangeChip from "../components/ChangeChip";
import Converter from "../components/Converter";
import QueryState from "../components/QueryState";
import SegmentedControl from "../components/SegmentedControl";
import { baseName, quotesPrice } from "../lib/currencies";
import { capitalize, formatCount, formatDate, formatLongDate, formatRate } from "../lib/format";
import { matchesQuery, sortRates } from "../lib/rates";
import useBase, { withBase } from "../lib/useBase";
import useUrlState from "../lib/useUrlState";
import ui from "../styles/ui.module.css";
import styles from "./TodayPage.module.css";

const SORTS = [
  { value: "code", label: "A–Z" },
  { value: "move", label: "Biggest move" },
];

export default function TodayPage() {
  const [base] = useBase();
  const name = baseName(base);
  const { rates, date, previousDate, isLoading, error, refetch } = useTodayRates(base);
  const [{ q: query, sort: sortParam }, setParam] = useUrlState({ q: "", sort: "code" });
  const sort = sortParam === "move" ? "move" : "code";

  const shown = sortRates(rates.filter((r) => matchesQuery(r, query)), sort);

  return (
    <QueryState
      isLoading={isLoading}
      error={error}
      onRetry={refetch}
      empty={rates.length === 0}
      emptyMessage="No rates yet. Import them with: docker compose run --rm web python manage.py run_ecb_import"
    >
      <section className={styles.hero}>
        <div className={styles.intro}>
          <p className={ui.eyebrow}>ECB reference rates</p>
          <h1 className={styles.title}>
            {capitalize(name)} exchange rates for {date && formatLongDate(date)}
          </h1>
          <p className={ui.lead}>
            {quotesPrice(base)
              ? `Every value is the price of one unit of a currency in ${name}.`
              : `Every value shows how much of a currency one ${name} buys.`}{" "}
            Change is compared with the previous ECB fixing.
          </p>
          <BaseNote base={base} />
          <ul className={styles.facts}>
            <li>{quotesPrice(base) ? `Prices in ${base}` : `1 ${base} = base`}</li>
            <li>{formatCount(rates.length, "currency", "currencies")}</li>
            {previousDate && <li>Previous fixing: {formatDate(previousDate)}</li>}
          </ul>
        </div>
        <Converter key={base} rates={rates} base={base} />
      </section>

      <section className={styles.listSection} aria-labelledby="all-currencies">
        <div className={styles.toolbar}>
          <div>
            <h2 id="all-currencies" className={ui.sectionTitle}>
              All currencies
            </h2>
            <p className={ui.hint} aria-live="polite">
              {shown.length === rates.length
                ? `Showing all ${formatCount(rates.length, "currency", "currencies")}`
                : `Showing ${shown.length} of ${rates.length}`}
            </p>
          </div>
          <div className={styles.controls}>
            <div className={ui.field}>
              <label htmlFor="search" className={ui.label}>
                Search
              </label>
              <input
                id="search"
                type="search"
                placeholder="Code or name, e.g. USD"
                value={query}
                onChange={(e) => setParam("q", e.target.value)}
                className={`${ui.input} ${styles.search}`}
              />
            </div>
            <div className={ui.field}>
              <span className={ui.label} aria-hidden="true">
                Sort
              </span>
              <SegmentedControl
                label="Sort"
                options={SORTS}
                value={sort}
                onChange={(value) => setParam("sort", value)}
              />
            </div>
          </div>
        </div>

        {shown.length === 0 ? (
          <p className={styles.noMatch}>No currency matches “{query}”.</p>
        ) : (
          <ul className={styles.grid} aria-label="Currencies">
            {shown.map((r) => (
              <li key={r.code}>
                <Link to={withBase(`/currency/${r.code}`, base)} className={styles.card}>
                  <span className={styles.cardHead}>
                    <span className={styles.code}>{r.code}</span>
                    <span className={styles.name}>{r.name}</span>
                  </span>
                  <span className={styles.rate}>{formatRate(r.rate)}</span>
                  <ChangeChip value={r.change} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </QueryState>
  );
}
