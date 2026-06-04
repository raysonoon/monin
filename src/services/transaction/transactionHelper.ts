import { Transaction, Category, Wallet } from "../../../db/schema";

const toDate = (value: string) => new Date(value);

export const getMonthlyCashFlow = (transactions: Transaction[]) => {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  // Initialize map with every month set to 0
  const map: Record<
    string,
    { month: string; income: number; expense: number }
  > = {};
  months.forEach((m) => {
    map[m] = { month: m, income: 0, expense: 0 };
  });

  // Fill in actual data
  transactions.forEach((t) => {
    const date = new Date(t.date);
    const monthName = months[date.getMonth()];

    if (monthName && map[monthName]) {
      if (t.type === "income") map[monthName].income += t.baseAmount;
      else map[monthName].expense += t.baseAmount;
    }
  });

  // Return as a sorted array
  return months.map((m) => map[m]);
};

export const getCategorySpending = (
  transactions: Transaction[],
  colorMap: Record<string, string>
) => {
  const totals: Record<string, number> = {};

  transactions
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      totals[t.category] = (totals[t.category] || 0) + t.baseAmount;
    });

  return Object.entries(totals).map(([name, amount]) => ({
    name,
    amount,
    color: colorMap[name] || "#6B7280",
  }));
};

export const getCategoryColorMap = (
  categories: Category[]
): Record<string, string> => {
  return categories.reduce(
    (acc, cat) => {
      acc[cat.name] = cat.color;
      return acc;
    },
    {} as Record<string, string>
  );
};

export const getWalletSummary = (
  transactions: Transaction[],
  wallet: Wallet
) => {
  const openingDate = toDate(wallet.openingBalanceDate);
  const walletTransactions = transactions.filter(
    (t) => toDate(t.date) >= openingDate
  );

  const income = walletTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => {
      return sum + (t.currency === wallet.currency ? t.amount : t.baseAmount);
    }, 0);

  const expense = walletTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => {
      return sum + (t.currency === wallet.currency ? t.amount : t.baseAmount);
    }, 0);

  const balance = wallet.openingBalance + income - expense;

  return {
    currency: wallet.currency,
    openingBalance: wallet.openingBalance,
    income,
    expense,
    balance,
  };
};
