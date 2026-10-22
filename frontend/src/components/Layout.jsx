import { Link, NavLink, Outlet, useMatch } from "react-router-dom";

import { defaultCurrency } from "../lib/currencies";
import useBase, { withBase } from "../lib/useBase";
import BaseSwitch from "./BaseSwitch";
import styles from "./Layout.module.css";

const navClass = ({ isActive }) => (isActive ? `${styles.navLink} ${styles.active}` : styles.navLink);

export default function Layout() {
  // "History" stays highlighted for every currency, not only the default one.
  const onCurrency = Boolean(useMatch("/currency/*"));
  const [base] = useBase();

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to={withBase("/", base)} className={styles.brand}>
            <span className={styles.logo} aria-hidden="true">€</span>
            <span className={styles.wordmark}>eurate</span>
          </Link>
          <nav aria-label="Main" className={styles.nav}>
            <NavLink to={withBase("/", base)} end className={navClass}>
              Today's rates
            </NavLink>
            <NavLink
              to={withBase(`/currency/${defaultCurrency(base)}`, base)}
              className={() => navClass({ isActive: onCurrency })}
              aria-current={onCurrency ? "page" : undefined}
            >
              History
            </NavLink>
            <NavLink to={withBase("/records", base)} className={navClass}>
              Records
            </NavLink>
          </nav>
          <BaseSwitch />
        </div>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span>Eurate · Source: European Central Bank euro foreign exchange reference rates</span>
          <span>Rates are for information only and are not trading rates.</span>
        </div>
      </footer>
    </div>
  );
}
