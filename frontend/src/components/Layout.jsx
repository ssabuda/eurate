import { Link, NavLink, Outlet, useMatch } from "react-router-dom";

import { DEFAULT_CURRENCY } from "../lib/currencies";
import styles from "./Layout.module.css";

const navClass = ({ isActive }) => (isActive ? `${styles.navLink} ${styles.active}` : styles.navLink);

export default function Layout() {
  // "History" stays highlighted for every currency, not only the default one.
  const onCurrency = Boolean(useMatch("/currency/*"));

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.brand}>
            <span className={styles.logo} aria-hidden="true">€</span>
            <span className={styles.wordmark}>eurate</span>
          </Link>
          <nav aria-label="Main" className={styles.nav}>
            <NavLink to="/" end className={navClass}>
              Today's rates
            </NavLink>
            <NavLink
              to={`/currency/${DEFAULT_CURRENCY}`}
              className={() => navClass({ isActive: onCurrency })}
              aria-current={onCurrency ? "page" : undefined}
            >
              History
            </NavLink>
            <NavLink to="/records" className={navClass}>
              Records
            </NavLink>
          </nav>
          <p className={styles.source}>Source: European Central Bank reference rates</p>
        </div>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span>Eurate · Euro foreign exchange reference rates</span>
          <span>Rates are for information only and are not trading rates.</span>
        </div>
      </footer>
    </div>
  );
}
