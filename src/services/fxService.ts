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

const cache = new Map<string, FxRatesCache>();

const toFxDate = (isoDate: string) => isoDate.split("T")[0]; // "2026-05-27T12:34:56.000Z" -> "2026-05-27"

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

export const convertToSGD = async (
  amount: number,
  currency: string,
  dateIso: string,
  rangeFrom?: string,
  rangeTo?: string
) => {
  // Skip FX for SGD
  if (currency === "SGD") {
    return { baseAmount: round2(amount), fxRate: 1, fxDate: toFxDate(dateIso) };
  }

  // Set baseAmount 0 and skip FX for unknown currency
  if (currency === "?") {
    return { baseAmount: 0, fxRate: null, fxDate: toFxDate(dateIso) };
  }

  const { rate, fxDate } = await getRateForDate(
    dateIso,
    currency,
    "SGD",
    rangeFrom,
    rangeTo
  );

  return { baseAmount: round2(amount * rate), fxRate: rate, fxDate };
};

const round2 = (n: number) => Math.round(n * 100) / 100;
