# Email templates
Various emails templates to normalise and parse transaction data from payment providers

## System templates (`templates.ts`)
- DBS PayLah
- YouTrip
  
## Encode
```js
`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent("subject:(Fwd: Transaction Alerts) 'paylah.alert@dbs.com'")}`
```

## Gmail email structure
- `id`: The unique message ID ("19b1c0f197fdcbc0")
- `threadId`: The thread this message belongs to
- `labelIds`: Gmail labels (e.g., "INBOX", "UNREAD")
- `internalDate`: Timestamp (milliseconds since epoch)
- `snippet`: Short preview of the message
- `payload`:
  - `headers`: Array of objects with name and value (e.g., From, To, Subject, Date)
  - `mimeType`: e.g., "multipart/alternative"
  - `parts`: Array of parts (each may have its own mimeType, body, etc.)
  - `body`: May contain the message body (often empty if parts exist)

### Gmail forwarding
- Manually forward will include forwarding address
- Auto-forward shows original sender and recipient
  
### Data encoding
#### Base64
- Encode binary data into ASCII characters for text-based systems like emails and URLs
- Binary data like images or files can be converted to Base64 and included as plain text
- 64 characters
  - Uppercase letters (A-Z), lowercase letters (a-z), digits (0-9), +, /, =
  
#### Base64URL
- Gmail uses this
- +, / replaced with -, _ respectively
- = omitted
> Avoid characters that have special meanings in URL
- Safe for URLs and JSON transport
- 
```js
function base64UrlEncode(str) {
    return btoa(str)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

function base64UrlDecode(str) {
    str = str
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    while (str.length % 4) {
        str += '=';
    }
    return atob(str);
}

const originalString = 'Hello World!';
const encoded = base64UrlEncode(originalString);
const decoded = base64UrlDecode(encoded);

console.log('Original:', originalString); // Hello World!
console.log('Encoded:', encoded); // SGVsbG8gV29ybGQh
console.log('Decoded:', decoded); // Hello World!
```

## Detect
- Add to q parameters
  - Add "Fwd: " to start of subject
  - Add merchant email to body keyword

## Parsing

### Date
- Extracted from email headers
```js
const headers = paylahEmail.payload.headers;
```

### Body
- Some email body is nested several layers deep e.g. Revolut
  - Payload
    - Part 0: multipart/alternative
      - Part 0.0: text/plain
      - Part 0.1: text/html
    - Part 1: image/png
- Recursive function to check several layers
Raw email body (Base64URL) --> Decode email w/ atob --> Normalize email --> Extract vendor-specific info

#### Amount
```js
// Matches literal string "SGD" with optional (0 or 1) whitespace character \s? e.g. SGD12.34 or SGD 12.34
// Capture group () matches one or more of any digit \d, comma and dot
const amountMatch = normalizedBody.match(/(SGD)\s?([\d,.]+)/);
const amount = amountMatch
  ? parseFloat(amountMatch[2].replace(",", "")) // Removes comma from thousands
  : null;
// amountMatch[0] === "SGD 23.50"
// amountMatch[2] === "23.50"
```

#### Currency
```js
const currency = amountMatch?.[1];
```

#### PayLah
```js
"subject:(Fwd: Transaction Alerts) 'paylah.alert@dbs.com'"
```

##### Merchants
extract from `To: ...`
```js
const merchantMatch = normalizedBody.match(/^to:\s*([a-z0-9 .&()-]+)$/im);
```
- `^` matches start of line and `$` matches end of line because of `m` flag
- `i` case-insensitive matching
- `/s*` matches 0 or more whitespace characters
- capture group `([a-z0-9 .&()-]+)` allows merchant names, numbers and business suffixes
- does not match forwarding email with `<>` or `@`
  
#### YouTrip

## Custom templates
- User to paste full email body & transaction block

### Email body

### Transaction block

#### `generateAutoConfigs(transactionBlock)`
Infers:
- merchant name
- amount
- currency
- regex patterns (`merchantRegex`, `amountRegex`) that can later be stored and reused to extract the same info from similar transactions
- hints if it fails

#### `escapeRegExp`
- Special regex syntax like `.` or `$` should be escaped and treated as literal strings

#### Normalise transaction block
- Splits the text into lines
- Removes extra spaces
- Removes empty lines
  
#### Merchant heuristic
- Matches keywords like `Merchant`, `Paid to`, `purchase on`, `payment to` then capture whatever comes after the merchant name
- Falls back to first line as merchant

#### Amount heuristic
- Matches currency: S$, SGD, $, numbers with commas and optional decimals (up to 2)
- E.g. Amount: S$12.50, Total 25.00, Paid $9
- If amount match succeeds, extracts currency and removes commas from numbers
  - Currency is standardised based on currency map
  - Unknown currency display as ?

#### Hints
- Tips for user to paste correct transaction block