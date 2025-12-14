# Email templates
Various emails templates to normalise and parse transaction data from merchants

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
  
## Parsing
- Add "Fwd: " to start of subject
- Add merchant email to body keyword
  
## Paylah
```js
"subject:(Fwd: Transaction Alerts) 'paylah.alert@dbs.com'"
```

## YouTrip