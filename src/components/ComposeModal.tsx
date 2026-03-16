import { useState } from 'react'
import { sendEmail } from '../services/gmail'
import { getSignature } from '../utils/signature'

interface ComposeModalProps {
  onClose: () => void
  onSent: () => void
  replyTo?: {
    to: string
    subject: string
    threadId?: string
    messageId?: string
    body?: string
  }
}

export function ComposeModal({ onClose, onSent, replyTo }: ComposeModalProps) {
  const [to, setTo] = useState(replyTo?.to || '')
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [subject, setSubject] = useState(
    replyTo?.subject
      ? replyTo.subject.startsWith('Re:')
        ? replyTo.subject
        : `Re: ${replyTo.subject}`
      : ''
  )
  const [body, setBody] = useState(replyTo?.body || '')
  const [sending, setSending] = useState(false)
  const [showCc, setShowCc] = useState(false)

  const handleSend = async () => {
    if (!to.trim()) return
    setSending(true)
    try {
      // Convert plain text body to HTML and append signature
      const htmlBody = buildHtmlEmail(body)
      await sendEmail(to, subject, htmlBody, cc || undefined, bcc || undefined, replyTo?.threadId, replyTo?.messageId)
      onSent()
      onClose()
    } catch (err) {
      console.error('Send failed:', err)
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="compose-overlay" onClick={onClose}>
      <div className="compose-modal" onClick={(e) => e.stopPropagation()}>
        <div className="compose-header">
          <h2>{replyTo ? 'Répondre' : 'Nouveau message'}</h2>
          <button className="compose-close" onClick={onClose}>✕</button>
        </div>

        <div className="compose-fields">
          <div className="compose-field">
            <label>À</label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="destinataire@email.com"
              autoFocus
            />
            {!showCc && (
              <button className="compose-cc-toggle" onClick={() => setShowCc(true)}>
                Cc/Cci
              </button>
            )}
          </div>

          {showCc && (
            <>
              <div className="compose-field">
                <label>Cc</label>
                <input
                  type="email"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                />
              </div>
              <div className="compose-field">
                <label>Cci</label>
                <input
                  type="email"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="compose-field">
            <label>Objet</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Objet du message"
            />
          </div>
        </div>

        <textarea
          className="compose-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Écrivez votre message..."
        />

        <div className="compose-signature-preview">
          <div className="signature-label">Signature</div>
          <div className="signature-preview-content" dangerouslySetInnerHTML={{ __html: getSignature() }} />
        </div>

        <div className="compose-footer">
          <button
            className="btn-primary"
            onClick={handleSend}
            disabled={sending || !to.trim()}
          >
            {sending ? 'Envoi...' : 'Envoyer'}
          </button>
          <span className="compose-shortcut">
            <kbd>Cmd+Enter</kbd> pour envoyer
          </span>
        </div>
      </div>
    </div>
  )
}

function buildHtmlEmail(plainTextBody: string): string {
  const signature = getSignature()
  const bodyHtml = plainTextBody
    .split('\n')
    .map((line) => (line.trim() === '' ? '<br>' : `<p style="margin: 0 0 4px 0; font-family: 'Trebuchet MS', Arial, sans-serif; font-size: 14px; color: #1e2d3d; line-height: 1.5;">${escapeHtml(line)}</p>`))
    .join('\n')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; font-family: 'Trebuchet MS', Arial, sans-serif;">
<div style="max-width: 600px; padding: 0;">
${bodyHtml}
${signature}
</div>
</body>
</html>`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
