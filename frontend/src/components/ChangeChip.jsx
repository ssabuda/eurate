import { formatPercent } from "../lib/format";
import styles from "./ChangeChip.module.css";

const ARROWS = {
  up: "M6 10V2M2.5 5.5 6 2l3.5 3.5",
  down: "M6 2v8M2.5 6.5 6 10l3.5-3.5",
};

/** A signed percentage with an arrow, so direction never relies on color alone. */
export default function ChangeChip({ value, suffix, size = "md" }) {
  const direction = value > 0 ? "up" : value < 0 ? "down" : "flat";
  const shown = value === null ? null : Math.round(value * 100) / 100;
  const tone = shown === 0 ? "flat" : direction;

  return (
    <span className={`${styles.chip} ${styles[tone]} ${styles[size]}`}>
      {tone !== "flat" && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d={ARROWS[tone]} />
        </svg>
      )}
      <span>
        {formatPercent(value)}
        {suffix && ` ${suffix}`}
      </span>
    </span>
  );
}
