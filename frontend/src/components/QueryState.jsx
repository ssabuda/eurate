import ui from "../styles/ui.module.css";
import styles from "./QueryState.module.css";

/** Loading, error and empty states shared by every page. */
export default function QueryState({ isLoading, error, onRetry, empty, emptyMessage, children }) {
  if (error) {
    return (
      <div role="alert" className={styles.box}>
        <p>Could not load rates: {error.message}</p>
        {onRetry && (
          <button type="button" className={ui.button} onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    );
  }
  if (isLoading) {
    return (
      <div role="status" className={styles.box}>
        Loading rates…
      </div>
    );
  }
  if (empty) {
    return <div className={styles.box}>{emptyMessage}</div>;
  }
  return children;
}
