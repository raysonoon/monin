export const PROVIDER_TEMPLATES = [
  {
    name: "DBS PayLah!",
    description: "DBS digital wallet",
    icon: "dbs-paylah.png", // or text/emoji
    type: "expense",
    defaultConfig: {
      gmailQuery: `subject:(Transaction Alerts) "paylah.alert@dbs.com"`,
      bodyStartMarker: "Transaction Ref:",
      bodyEndMarker: "To view your transactions",
      merchantRegex: "^to:\\s*([a-z0-9 .&()-]+)$",
      amountRegex: "(SGD)\\s?([\\d,.]+)",
      merchantGroupIndex: 1,
      amountGroupIndex: 2,
    },
  },
  {
    name: "DBS (incoming transfer)",
    description: "PayNow, FAST, etc",
    icon: "📨",
    type: "income",
    defaultConfig: {
      gmailQuery: `subject:(digibank Alerts - You've received a transfer) "ibanking.alert@dbs.com"`,
      bodyStartMarker: "Transaction Ref:",
      bodyEndMarker: "Thank you for banking with us",
      merchantRegex: "\\*?\\s*From\\s*:\\s*\\*?\\s*([^\\n]+)",
      amountRegex: "You have received\\s+(SGD)\\s+([\\d,.]+)\\s+via",
      merchantGroupIndex: 1,
      currencyGroupIndex: 1,
      amountGroupIndex: 2,
    },
  },
  {
    name: "YouTrip",
    description: "Multi-currency wallet",
    icon: "youtrip.png",
    type: "expense",
    defaultConfig: {
      gmailQuery: `subject:online purchases "noreply@you.co"`,
      bodyStartMarker: "Time (UTC+8)",
      bodyEndMarker: "full transaction history",
      merchantRegex: "^(.+)(?=[A-Z]{3}\\s+[\\d,.]+)",
      amountRegex: "([A-Z]{3})\\s+([\\d,.]+)",
      merchantGroupIndex: 1,
      currencyGroupIndex: 1, // Group 1 in amountRegex captures currency
      amountGroupIndex: 2,
    },
  },
];
