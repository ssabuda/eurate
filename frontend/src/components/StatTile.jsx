import styles from "./StatTile.module.css";

export default function StatTile({ label, value, detail }) {
  return (
    <div className={styles.tile}>
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>{value}</div>
      {detail && <div className={styles.detail}>{detail}</div>}
    </div>
  );
}

export function StatGrid({ children }) {
  return <section className={styles.grid}>{children}</section>;
}
