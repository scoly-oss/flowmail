const API_URL = '/api/claude'

interface ClaudeResponse {
  text: string
  error?: string
}

export async function summarizeEmail(email: {
  from: string
  subject: string
  body: string
}): Promise<string> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'summarize', email }),
  })
  const data: ClaudeResponse = await res.json()
  if (data.error) throw new Error(data.error)
  return data.text
}

export async function draftReply(
  email: {
    from: string
    fromEmail: string
    subject: string
    body: string
  },
  instruction?: string
): Promise<string> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'draft_reply', email, instruction }),
  })
  const data: ClaudeResponse = await res.json()
  if (data.error) throw new Error(data.error)
  return data.text
}

export async function classifyEmails(
  emails: { id: string; from: string; subject: string; snippet: string }[]
): Promise<{ id: string; category: string; reason: string }[]> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'classify', emails }),
  })
  const data: ClaudeResponse = await res.json()
  if (data.error) throw new Error(data.error)
  try {
    return JSON.parse(data.text)
  } catch {
    return []
  }
}

export async function smartCompose(instruction: string): Promise<string> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'smart_compose', instruction }),
  })
  const data: ClaudeResponse = await res.json()
  if (data.error) throw new Error(data.error)
  return data.text
}
