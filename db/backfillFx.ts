import { db } from "./client";
import { transactions } from "./schema";
import { and, isNull, ne, eq } from "drizzle-orm";
import { getFxRates } from "../src/services/fxService";

const toFxDate = (isoDate: string) => isoDate.split("T")[0];

const round2 = (n: number) => Math.round(n * 100) / 100;

export const backfillFx = async () => {
  // Grab all non-SGD rows missing baseAmount
  const rows = await db
    .select()
    .from(transactions)
    .where(
      and(ne(transactions.currency, "SGD"), isNull(transactions.baseAmount))
    );

  if (rows.length === 0) {
    console.log("No rows to backfill.");
    return;
  }

  // Group by currency
  const byCurrency: Record<string, typeof rows> = {};
  for (const row of rows) {
    if (!byCurrency[row.currency]) byCurrency[row.currency] = [];
    byCurrency[row.currency].push(row);
  }

  for (const currency of Object.keys(byCurrency)) {
    const list = byCurrency[currency];

    const dates = list.map((t) => toFxDate(t.date));
    const minDate = dates.reduce((a, b) => (a < b ? a : b));
    const maxDate = dates.reduce((a, b) => (a > b ? a : b));

    const { ratesByDate } = await getFxRates(currency, "SGD", minDate, maxDate);

    for (const t of list) {
      const fxDate = toFxDate(t.date);
      const rate = ratesByDate[fxDate];
      if (!rate) {
        console.warn(
          `No rate for ${currency} on ${fxDate}, skipping id=${t.id}`
        );
        continue;
      }

      const baseAmount = round2(t.amount * rate);

      await db
        .update(transactions)
        .set({
          baseCurrency: "SGD",
          baseAmount,
          fxRate: rate,
          fxDate,
        })
        .where(eq(transactions.id, t.id));
    }
  }

  console.log("Backfill complete.");
};
