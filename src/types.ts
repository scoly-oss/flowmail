export interface GmailMessage {
  id: string
  threadId: string
  labelIds: string[]
  snippet: string
  payload: GmailPayload
  internalDate: string
  sizeEstimate: number
}

export interface GmailPayload {
  mimeType: string
  headers: GmailHeader[]
  body: GmailBody
  parts?: GmailPart[]
}

export interface GmailHeader {
  name: string
  value: string
}

export interface GmailBody {
  size: number
  data?: string
}

export interface GmailPart {
  mimeType: string
  headers: GmailHeader[]
  body: GmailBody
  parts?: GmailPart[]
}

export interface GmailThread {
  id: string
  historyId: string
  messages: GmailMessage[]
}

export interface GmailLabel {
  id: string
  name: string
  type: string
  messagesTotal?: number
  messagesUnread?: number
}

export interface EmailSummary {
  id: string
  threadId: string
  from: string
  fromEmail: string
  to: string
  subject: string
  snippet: string
  date: Date
  isUnread: boolean
  isStarred: boolean
  labels: string[]
  hasAttachments: boolean
}

export interface EmailDetail extends EmailSummary {
  body: string
  cc: string
  bcc: string
  replyTo: string
}

export interface ComposeData {
  to: string
  cc: string
  bcc: string
  subject: string
  body: string
  replyTo?: string
  threadId?: string
}

export type View = 'inbox' | 'reader' | 'compose' | 'search'
export type Label = 'INBOX' | 'SENT' | 'DRAFT' | 'TRASH' | 'SPAM' | 'STARRED' | 'IMPORTANT' | 'UNREAD'
