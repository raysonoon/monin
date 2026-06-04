// fxService.ts (new file, e.g., src/services/fxService.ts)
type FxRateRow = {
  date: string; // YYYY-MM-DD
  base: string; // e.g. "SGD"
  quote: string; // e.g. "USD"
  rate: number;
};

type FxRatesCache = {
  key: string;
  base: string;
  quote: string;
  from: string;
  to: string;
  ratesByDate: Record<string, number>; // { "YYYY-MM-DD": rate }
};

type ConvertResult = {
  amount: number;
  fxRate: number | null;
  fxDate: string;
};

const cache = new Map<string, FxRatesCache>();

const toFxDate = (isoDate: string) => isoDate.split("T")[0]; // "2026-05-27T12:34:56.000Z" -> "2026-05-27"

const round2 = (n: number) => Math.round(n * 100) / 100;

const buildKey = (base: string, quote: string, from: string, to: string) =>
  `${base}->${quote}:${from}:${to}`;

export const getFxRates = async (
  base: string,
  quote: string,
  from: string,
  to: string
): Promise<FxRatesCache> => {
  const key = buildKey(base, quote, from, to);
  const cached = cache.get(key);
  if (cached) return cached;

  const url =
    `https://api.frankfurter.dev/v2/rates` +
    `?base=${encodeURIComponent(base)}` +
    `&quotes=${encodeURIComponent(quote)}` +
    `&from=${encodeURIComponent(from)}` +
    `&to=${encodeURIComponent(to)}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`FX request failed: ${res.status}`);
  }

  const data = (await res.json()) as FxRateRow[];

  const ratesByDate: Record<string, number> = {};
  for (const row of data) {
    ratesByDate[row.date] = row.rate;
  }

  const entry: FxRatesCache = {
    key,
    base,
    quote,
    from,
    to,
    ratesByDate,
  };

  cache.set(key, entry);
  return entry;
};

export const getRateForDate = async (
  dateIso: string,
  base: string,
  quote: string,
  from?: string,
  to?: string
) => {
  // Skip lookup if base == quote
  if (base === quote) {
    return { rate: 1, fxDate: toFxDate(dateIso) };
  }

  const fxDate = toFxDate(dateIso);
  const rangeFrom = from ?? fxDate;
  const rangeTo = to ?? fxDate;

  const { ratesByDate } = await getFxRates(base, quote, rangeFrom, rangeTo);
  const rate = ratesByDate[fxDate];

  if (!rate) {
    throw new Error(`No rate for ${base}->${quote} on ${fxDate}`);
  }

  return { rate, fxDate };
};

export const convertCurrency = async (
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  dateIso: string,
  rangeFrom?: string,
  rangeTo?: string
): Promise<ConvertResult> => {
  const fxDate = toFxDate(dateIso);

  if (
    !fromCurrency ||
    !toCurrency ||
    fromCurrency === "?" ||
    toCurrency === "?"
  ) {
    return { amount: 0, fxRate: null, fxDate };
  }

  if (fromCurrency === toCurrency) {
    return { amount: round2(amount), fxRate: 1, fxDate };
  }

  const { rate, fxDate: resolvedFxDate } = await getRateForDate(
    dateIso,
    fromCurrency,
    toCurrency,
    rangeFrom,
    rangeTo
  );

  return {
    amount: round2(amount * rate),
    fxRate: rate,
    fxDate: resolvedFxDate,
  };
};

export const convertToSGD = async (
  amount: number,
  currency: string,
  dateIso: string,
  rangeFrom?: string,
  rangeTo?: string
) => {
  const result = await convertCurrency(
    amount,
    currency,
    "SGD",
    dateIso,
    rangeFrom,
    rangeTo
  );

  return {
    baseAmount: result.amount,
    fxRate: result.fxRate,
    fxDate: result.fxDate,
  };
};

export const convertToWalletCurrency = async (
  amount: number,
  currency: string,
  walletCurrency: string,
  dateIso: string,
  rangeFrom?: string,
  rangeTo?: string
) => {
  const result = await convertCurrency(
    amount,
    currency,
    walletCurrency,
    dateIso,
    rangeFrom,
    rangeTo
  );

  return {
    walletAmount: result.amount,
    fxRate: result.fxRate,
    fxDate: result.fxDate,
  };
};
