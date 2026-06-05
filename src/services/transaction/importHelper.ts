import { db } from "../../../db/client";
import { transactions, type NewTransaction } from "../../../db/schema";
import { getGeneralWalletId } from "../../../db/seed";
import { convertToSGD } from "../fxService";

export type ImportTransactionInput = {
  date: string; // YYYY-MM-DD
  merchant: string;
  amount: number;
  currency: string;
  type: "income" | "expense";
};

type ImportOptions = {
  source?: string;
  category?: string;
  walletId?: number;
  chunkSize?: number;
};

const toIsoDate = (dateOnly: string) => {
  const [year, month, day] = dateOnly.split("-").map(Number);

  if (!year || !month || !day) {
    throw new Error(`Invalid date: ${dateOnly}`);
  }

  // Noon avoids timezone shift when converting to ISO
  return new Date(year, month - 1, day, 12, 0, 0).toISOString();
};

const makeImportEmailId = (row: ImportTransactionInput, index: number) =>
  `csv_${row.date}_${row.merchant}_${row.amount}_${row.currency}_${index}`
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_");

const normalizeRow = async (
  row: ImportTransactionInput,
  index: number,
  walletId: number,
  source: string,
  category: string
): Promise<NewTransaction> => {
  const isoDate = toIsoDate(row.date);

  const { baseAmount, fxRate, fxDate } = await convertToSGD(
    row.amount,
    row.currency,
    isoDate
  );

  return {
    emailId: makeImportEmailId(row, index),
    providerId: null,
    walletId,
    merchant: row.merchant.trim(),
    amount: row.amount,
    currency: row.currency.trim().toUpperCase(),
    date: isoDate,
    baseCurrency: "SGD",
    baseAmount,
    fxRate,
    fxDate,
    category,
    source,
    type: row.type,
    notes: null,
  };
};

const splitCsvLine = (line: string) => {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map((value) => value.trim());
};

const parseCsvText = (csvText: string): ImportTransactionInput[] => {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  const headers = splitCsvLine(lines[0]).map((header) => header.toLowerCase());

  const requiredHeaders = ["date", "merchant", "amount", "currency", "type"];
  for (const header of requiredHeaders) {
    if (!headers.includes(header)) {
      throw new Error(`Missing CSV header: ${header}`);
    }
  }

  return lines.slice(1).map((line, index) => {
    const values = splitCsvLine(line);
    const row: Record<string, string> = {};

    headers.forEach((header, headerIndex) => {
      row[header] = values[headerIndex] ?? "";
    });

    const amount = Number(row.amount);

    if (Number.isNaN(amount)) {
      throw new Error(`Invalid amount on CSV row ${index + 2}`);
    }

    if (row.type !== "income" && row.type !== "expense") {
      throw new Error(`Invalid type on CSV row ${index + 2}`);
    }

    return {
      date: row.date,
      merchant: row.merchant,
      amount,
      currency: row.currency,
      type: row.type,
    };
  });
};

const importRows = async (
  rows: ImportTransactionInput[],
  options: ImportOptions = {}
) => {
  if (!Array.isArray(rows)) {
    throw new Error("Input must be an array of transactions");
  }

  const walletId = options.walletId ?? (await getGeneralWalletId());
  const source = options.source ?? "CSV Import";
  const category = options.category ?? "Uncategorized";
  const chunkSize = options.chunkSize ?? 100;

  const normalized: NewTransaction[] = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];

    if (
      !row ||
      typeof row.date !== "string" ||
      typeof row.merchant !== "string" ||
      typeof row.amount !== "number" ||
      typeof row.currency !== "string" ||
      (row.type !== "income" && row.type !== "expense")
    ) {
      throw new Error(`Invalid transaction at index ${index}`);
    }

    normalized.push(await normalizeRow(row, index, walletId, source, category));
  }

  await db.transaction(async (tx) => {
    for (let i = 0; i < normalized.length; i += chunkSize) {
      const chunk = normalized.slice(i, i + chunkSize);
      await tx.insert(transactions).values(chunk).onConflictDoNothing();
    }
  });

  return {
    imported: normalized.length,
  };
};

export const importTransactionsFromJson = async (
  rows: ImportTransactionInput[],
  options: ImportOptions = {}
) => {
  return importRows(rows, {
    ...options,
    source: options.source ?? "JSON Import",
  });
};

export const importTransactionsFromCsv = async (
  csvText: string,
  options: ImportOptions = {}
) => {
  const rows = parseCsvText(csvText);
  return importRows(rows, {
    ...options,
    source: options.source ?? "CSV Import",
  });
};
