import { Transaction } from "../../db/schema";

export type ParsedTransaction = Omit<
  Transaction,
  "baseCurrency" | "baseAmount" | "fxRate" | "fxDate"
>;
