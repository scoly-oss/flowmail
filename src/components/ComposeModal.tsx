import { useState } from 'react'
import { sendEmail } from '../services/gmail'

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
      await sendEmail(to, subject, body, cc || undefined, bcc || undefined, replyTo?.threadId, replyTo?.messageId)
      onSent()
      onClose()
    } catch (err) {
      console.error('Send failed:', err)
      setSending(false)
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
          placeholder="Écrivez votre message..."
        />

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
