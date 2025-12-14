export interface GmailBody {
  size: number;
  data?: string;
}

export interface GmailPart {
  mimeType: string;
  body: GmailBody;
  parts?: GmailPart[];
}

export interface GmailPayload {
  headers: { name: string; value: string }[];
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
