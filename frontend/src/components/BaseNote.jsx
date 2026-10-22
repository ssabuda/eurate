import { currencyName, quotesPrice } from "../lib/currencies";
import styles from "./BaseNote.module.css";

/** Says rates are prices derived from ECB fixings, not published by it, when the base isn't the euro. */
export default function BaseNote({ base }) {
  if (!quotesPrice(base)) return null;
  return (
    <p className={styles.note}>
      Prices in {currencyName(base)} · cross rates derived from ECB euro fixings
    </p>
  );
}
