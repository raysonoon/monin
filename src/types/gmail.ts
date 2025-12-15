interface GmailBody {
  size: number;
  data?: string;
}

interface GmailPart {
  mimeType: string;
  body: GmailBody;
  parts?: GmailPart[];
}

export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailPayload {
  headers: GmailHeader[];
  mimeType: string;
  body: GmailBody;
  parts?: GmailPart[];
}

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  internalDate?: string;
  payload: GmailPayload;
  snippet?: string;
  sizeEstimate?: number;
}

export interface GmailMessagesList {
  messages?: GmailMessage[];
  resultSizeEstimate: number;
}
