export function parseDDMMYYYYToISO(dateStr: string): string {
  // Example input: "27/01/2026 14:30:45"
  const [datePart, timePart] = dateStr.split(" ");
  const [day, month, year] = datePart.split("/").map(Number);
  const [hour, minute, second] = timePart.split(":").map(Number);

  // Months are 0-indexed in JS Date
  const dateObj = new Date(year, month - 1, day, hour, minute, second);
  return dateObj.toISOString();
}
