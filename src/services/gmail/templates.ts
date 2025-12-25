export const PROVIDER_TEMPLATES = [
  {
    name: "DBS PayLah!",
    description: "DBS digital wallet",
    icon: "dbs-paylah.png", // or text/emoji
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
    name: "YouTrip",
    description: "Multi-currency wallet",
    icon: "youtrip.png",
    defaultConfig: {
      gmailQuery: `subject:online purchases "noreply@you.co"`,
      bodyStartMarker: "Time (UTC+8)",
      bodyEndMarker: "full transaction history",
      merchantRegex: "^(.+)\\s+[A-Z]{3}\\s+[\\d,.]+$",
      amountRegex: "^.+\\s+([A-Z]{3})\\s+([\\d,.]+)$",
      merchantGroupIndex: 1,
      currencyGroupIndex: 1, // Group 1 in amountRegex captures currency
      amountGroupIndex: 2,
    },
  },
];
