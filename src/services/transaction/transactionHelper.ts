import { Transaction, Category } from "../../../db/schema";

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

  // 1. Initialize the map with every month set to 0
  const map: Record<
    string,
    { month: string; income: number; expense: number }
  > = {};
  months.forEach((m) => {
    map[m] = { month: m, income: 0, expense: 0 };
  });

  // 2. Fill in actual data
  transactions.forEach((t) => {
    const date = new Date(t.date);
    const monthName = months[date.getMonth()];

    if (monthName && map[monthName]) {
      if (t.type === "income") map[monthName].income += t.amount;
      else map[monthName].expense += t.amount;
    }
  });

  // 3. Return as a sorted array
  return months.map((m) => map[m]);
};

export const getCategorySpending = (
  transactions: Transaction[],
  categories: Category[]
) => {
  // 1. Create the color lookup map
  const colorMap = categories.reduce(
    (acc, cat) => {
      acc[cat.name] = cat.color;
      return acc;
    },
    {} as Record<string, string>
  );

  const totals: Record<string, number> = {};

  transactions
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      totals[t.category] = (totals[t.category] || 0) + t.amount;
    });

  // 2. Map totals to objects including the dynamic color
  return Object.entries(totals).map(([name, amount]) => ({
    name,
    amount,
    color: colorMap[name] || "#6B7280", // Fallback to grey if category missing
  }));
};
