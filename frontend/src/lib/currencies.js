// Currencies published in the ECB euro foreign exchange reference rates.
const NAMES = {
  AUD: "Australian dollar",
  BGN: "Bulgarian lev",
  BRL: "Brazilian real",
  CAD: "Canadian dollar",
  CHF: "Swiss franc",
  CNY: "Chinese yuan renminbi",
  CYP: "Cypriot pound",
  CZK: "Czech koruna",
  DKK: "Danish krone",
  EEK: "Estonian kroon",
  EUR: "Euro",
  GBP: "Pound sterling",
  HKD: "Hong Kong dollar",
  HRK: "Croatian kuna",
  HUF: "Hungarian forint",
  IDR: "Indonesian rupiah",
  ILS: "Israeli shekel",
  INR: "Indian rupee",
  ISK: "Icelandic krona",
  JPY: "Japanese yen",
  KRW: "South Korean won",
  LTL: "Lithuanian litas",
  LVL: "Latvian lats",
  MTL: "Maltese lira",
  MXN: "Mexican peso",
  MYR: "Malaysian ringgit",
  NOK: "Norwegian krone",
  NZD: "New Zealand dollar",
  PHP: "Philippine peso",
  PLN: "Polish zloty",
  ROL: "Romanian leu (old)",
  RON: "Romanian leu",
  RUB: "Russian rouble",
  SEK: "Swedish krona",
  SGD: "Singapore dollar",
  SIT: "Slovenian tolar",
  SKK: "Slovak koruna",
  THB: "Thai baht",
  TRL: "Turkish lira (old)",
  TRY: "Turkish lira",
  USD: "US dollar",
  ZAR: "South African rand",
};

export const currencyName = (code) => NAMES[code] ?? code;

export const DEFAULT_CURRENCY = "USD";

// ECB rates are quoted against the euro; any other base is a cross rate.
export const BASE_CURRENCY = "EUR";

/**
 * Against the euro, rates read as the ECB publishes them (1 EUR = 1.12 USD);
 * against any other base, as the price of the currency in it (1 USD = 3.90 PLN).
 */
export const quotesPrice = (base) => base !== BASE_CURRENCY;

/** The pair as markets write it: X/Y is the price of one X in Y. */
export const pairOf = (base, code) => (quotesPrice(base) ? `${code}/${base}` : `${base}/${code}`);

/** What one rate of `code` means, e.g. "1 EUR in USD" or "1 USD in PLN". */
export const rateUnit = (base, code) =>
  quotesPrice(base) ? `1 ${code} in ${base}` : `1 ${base} in ${code}`;

/** The base as it reads mid-sentence: "one euro buys", "one Polish zloty buys". */
export const baseName = (base) => (base === BASE_CURRENCY ? "euro" : currencyName(base));

/** The currency History opens on: never the base itself, which has no rates against itself. */
export const defaultCurrency = (base) => (base === DEFAULT_CURRENCY ? BASE_CURRENCY : DEFAULT_CURRENCY);
