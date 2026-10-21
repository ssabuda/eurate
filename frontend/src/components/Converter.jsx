import { useId, useState } from "react";

import { DEFAULT_CURRENCY } from "../lib/currencies";
import { formatAmount, formatRate } from "../lib/format";
import ui from "../styles/ui.module.css";
import styles from "./Converter.module.css";

export default function Converter({ rates }) {
  const id = useId();
  const [amount, setAmount] = useState("100");
  const [code, setCode] = useState(DEFAULT_CURRENCY);

  const target = rates.find((r) => r.code === code) ?? rates[0];
  const euros = Number(amount);
  // Empty counts as 0; anything else that isn't a non-negative number is flagged.
  const invalid = amount.trim() !== "" && !(Number.isFinite(euros) && euros >= 0);

  return (
    <form className={`${ui.card} ${styles.converter}`} onSubmit={(e) => e.preventDefault()}>
      <h2 className={ui.cardTitle}>Converter</h2>
      <div className={ui.field}>
        <label htmlFor={`${id}-amount`} className={ui.label}>
          Amount in EUR
        </label>
        <input
          id={`${id}-amount`}
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-invalid={invalid}
          aria-describedby={invalid ? `${id}-error` : undefined}
          className={`${ui.input} ${styles.amount}`}
        />
        {invalid && (
          <p id={`${id}-error`} className={styles.error}>
            Enter an amount of 0 or more.
          </p>
        )}
      </div>
      <div className={ui.field}>
        <label htmlFor={`${id}-currency`} className={ui.label}>
          Convert to
        </label>
        <select
          id={`${id}-currency`}
          value={target.code}
          onChange={(e) => setCode(e.target.value)}
          className={ui.select}
        >
          {rates.map((r) => (
            <option key={r.code} value={r.code}>
              {r.code} — {r.name}
            </option>
          ))}
        </select>
      </div>
      <output htmlFor={`${id}-amount ${id}-currency`} className={styles.result} aria-live="polite">
        {!invalid && (
          <>
            <span className={styles.resultLabel}>{formatAmount(euros)} EUR =</span>
            <span className={styles.resultValue}>
              {formatAmount(euros * target.rate)} <span className={styles.resultCode}>{target.code}</span>
            </span>
          </>
        )}
        <span className={styles.resultLabel}>
          Rate {formatRate(target.rate)} · 1 {target.code} = {formatRate(1 / target.rate)} EUR
        </span>
      </output>
    </form>
  );
}
