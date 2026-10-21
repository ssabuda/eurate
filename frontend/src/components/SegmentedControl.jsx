import styles from "./SegmentedControl.module.css";

/** A row of toggle buttons where exactly one option is pressed. */
export default function SegmentedControl({ label, options, value, onChange }) {
  return (
    <div role="group" aria-label={label} className={styles.group}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          className={option.value === value ? `${styles.option} ${styles.on}` : styles.option}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
