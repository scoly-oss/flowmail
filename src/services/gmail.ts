import { getToken } from './auth'
import type { GmailMessage, GmailThread, GmailLabel, GmailPart, EmailSummary, EmailDetail } from '../types'

const API = 'https://gmail.googleapis.com/gmail/v1/users/me'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  if (!token) throw new Error('Not authenticated')

  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!res.ok) {
    if (res.status === 401) {
      sessionStorage.removeItem('flowmail_token')
      window.location.reload()
    }
    throw new Error(`Gmail API error: ${res.status}`)
  }

  return res.json()
}

function getHeader(message: GmailMessage, name: string): string {
  const header = message.payload?.headers?.find(
    (h) => h.name.toLowerCase() === name.toLowerCase()
  )
  return header?.value || ''
}

function parseFrom(from: string): { name: string; email: string } {
  const match = from.match(/^(.+?)\s*<(.+?)>$/)
  if (match) return { name: match[1].replace(/"/g, ''), email: match[2] }
  return { name: from, email: from }
}

function decodeBody(body?: string): string {
  if (!body) return ''
  try {
    return decodeURIComponent(
      atob(body.replace(/-/g, '+').replace(/_/g, '/'))
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
  } catch {
    return atob(body.replace(/-/g, '+').replace(/_/g, '/'))
  }
}

function extractBody(message: GmailMessage): string {
  const payload = message.payload
  if (!payload) return ''

  if (payload.body?.data) {
    return decodeBody(payload.body.data)
  }

  if (payload.parts) {
    const htmlPart = findPart(payload.parts, 'text/html')
    if (htmlPart?.body?.data) return decodeBody(htmlPart.body.data)

    const textPart = findPart(payload.parts, 'text/plain')
    if (textPart?.body?.data) {
      const text = decodeBody(textPart.body.data)
      return text.replace(/\n/g, '<br>')
    }
  }

  return message.snippet || ''
}

function findPart(parts: GmailPart[] | undefined, mimeType: string): GmailPart | undefined {
  if (!parts) return undefined
  for (const part of parts) {
    if (part.mimeType === mimeType) return part
    if (part.parts) {
      const found = findPart(part.parts, mimeType)
      if (found) return found
    }
  }
  return undefined
}

function hasAttachments(message: GmailMessage): boolean {
  const check = (parts?: GmailPart[]): boolean => {
    if (!parts) return false
    return parts.some(
      (p) => (p.body?.size || 0) > 0 && p.mimeType !== 'text/plain' && p.mimeType !== 'text/html' && !p.mimeType.startsWith('multipart/')
      || check(p.parts)
    )
  }
  return check(message.payload?.parts)
}

function messageToSummary(message: GmailMessage): EmailSummary {
  const from = parseFrom(getHeader(message, 'From'))
  return {
    id: message.id,
    threadId: message.threadId,
    from: from.name,
    fromEmail: from.email,
    to: getHeader(message, 'To'),
    subject: getHeader(message, 'Subject') || '(sans objet)',
    snippet: message.snippet,
    date: new Date(parseInt(message.internalDate)),
    isUnread: message.labelIds?.includes('UNREAD') || false,
    isStarred: message.labelIds?.includes('STARRED') || false,
    labels: message.labelIds || [],
    hasAttachments: hasAttachments(message),
  }
}

function messageToDetail(message: GmailMessage): EmailDetail {
  const summary = messageToSummary(message)
  return {
    ...summary,
    body: extractBody(message),
    cc: getHeader(message, 'Cc'),
    bcc: getHeader(message, 'Bcc'),
    replyTo: getHeader(message, 'Reply-To') || summary.fromEmail,
  }
}

export async function listMessages(
  label: string = 'INBOX',
  query: string = '',
  maxResults: number = 50
): Promise<EmailSummary[]> {
  const params = new URLSearchParams({
    maxResults: String(maxResults),
    labelIds: label,
  })
  if (query) params.set('q', query)

  const data = await request<{ messages?: { id: string }[] }>(
    `/messages?${params}`
  )

  if (!data.messages?.length) return []

  const messages = await Promise.all(
    data.messages.map((m) =>
      request<GmailMessage>(`/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`)
    )
  )

  return messages.map(messageToSummary)
}

export async function getMessage(id: string): Promise<EmailDetail> {
  const message = await request<GmailMessage>(`/messages/${id}?format=full`)
  return messageToDetail(message)
}

export async function getThread(threadId: string): Promise<EmailDetail[]> {
  const thread = await request<GmailThread>(`/threads/${threadId}?format=full`)
  return thread.messages.map(messageToDetail)
}

export async function archiveMessage(id: string): Promise<void> {
  await request(`/messages/${id}/modify`, {
    method: 'POST',
    body: JSON.stringify({
      removeLabelIds: ['INBOX'],
    }),
  })
}

export async function trashMessage(id: string): Promise<void> {
  await request(`/messages/${id}/trash`, { method: 'POST' })
}

export async function markAsRead(id: string): Promise<void> {
  await request(`/messages/${id}/modify`, {
    method: 'POST',
    body: JSON.stringify({
      removeLabelIds: ['UNREAD'],
    }),
  })
}

export async function markAsUnread(id: string): Promise<void> {
  await request(`/messages/${id}/modify`, {
    method: 'POST',
    body: JSON.stringify({
      addLabelIds: ['UNREAD'],
    }),
  })
}

export async function toggleStar(id: string, starred: boolean): Promise<void> {
  await request(`/messages/${id}/modify`, {
    method: 'POST',
    body: JSON.stringify(
      starred
        ? { removeLabelIds: ['STARRED'] }
        : { addLabelIds: ['STARRED'] }
    ),
  })
}

export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  cc?: string,
  bcc?: string,
  threadId?: string,
  replyToMessageId?: string
): Promise<void> {
  const headers = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/html; charset=utf-8`,
  ]
  if (cc) headers.push(`Cc: ${cc}`)
  if (bcc) headers.push(`Bcc: ${bcc}`)
  if (replyToMessageId) headers.push(`In-Reply-To: ${replyToMessageId}`)

  const raw = btoa(
    headers.join('\r\n') + '\r\n\r\n' + body
  )
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  const payload: Record<string, string> = { raw }
  if (threadId) payload.threadId = threadId

  await request('/messages/send', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function searchMessages(query: string, maxResults: number = 50): Promise<EmailSummary[]> {
  const params = new URLSearchParams({
    maxResults: String(maxResults),
    q: query,
  })

  const data = await request<{ messages?: { id: string }[] }>(
    `/messages?${params}`
  )

  if (!data.messages?.length) return []

  const messages = await Promise.all(
    data.messages.map((m) =>
      request<GmailMessage>(`/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`)
    )
  )

  return messages.map(messageToSummary)
}

export async function getLabels(): Promise<GmailLabel[]> {
  const data = await request<{ labels: GmailLabel[] }>('/labels')
  return data.labels
}

export async function getProfile(): Promise<{ emailAddress: string; messagesTotal: number; threadsTotal: number }> {
  return request('/profile')
}
