import { useEffect, useState } from 'react'
import type { EmailDetail } from '../types'
import { getThread } from '../services/gmail'
import { formatFullDate } from '../utils/date'

interface EmailReaderProps {
  threadId: string
  onBack: () => void
  onReply: (email: EmailDetail) => void
  onArchive: () => void
  onTrash: () => void
}

export function EmailReader({ threadId, onBack, onReply, onArchive, onTrash }: EmailReaderProps) {
  const [messages, setMessages] = useState<EmailDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    setLoading(true)
    getThread(threadId).then((msgs) => {
      setMessages(msgs)
      if (msgs.length > 0) {
        setExpandedIds(new Set([msgs[msgs.length - 1].id]))
      }
      setLoading(false)
    })
  }, [threadId])

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (loading) {
    return (
      <div className="email-reader">
        <div className="reader-loading"><div className="spinner" /></div>
      </div>
    )
  }

  const subject = messages[0]?.subject || '(sans objet)'

  return (
    <div className="email-reader">
      <div className="reader-toolbar">
        <button className="toolbar-btn" onClick={onBack} title="Retour (Escape)">
          ← Retour
        </button>
        <div className="toolbar-actions">
          <button className="toolbar-btn" onClick={onArchive} title="Archiver (e)">
            Archiver
          </button>
          <button className="toolbar-btn" onClick={onTrash} title="Supprimer (#)">
            Supprimer
          </button>
          <button className="toolbar-btn" onClick={() => messages.length > 0 && onReply(messages[messages.length - 1])} title="Répondre (r)">
            Répondre
          </button>
        </div>
      </div>

      <h1 className="reader-subject">{subject}</h1>

      <div className="reader-messages">
        {messages.map((msg) => {
          const expanded = expandedIds.has(msg.id)
          return (
            <div key={msg.id} className={`reader-message ${expanded ? 'expanded' : 'collapsed'}`}>
              <div className="message-header" onClick={() => toggleExpand(msg.id)}>
                <div className="message-sender">
                  <div className="message-avatar">{msg.from.charAt(0).toUpperCase()}</div>
                  <div>
                    <strong>{msg.from}</strong>
                    <span className="message-email">&lt;{msg.fromEmail}&gt;</span>
                  </div>
                </div>
                <div className="message-date">{formatFullDate(msg.date)}</div>
              </div>
              {expanded && (
                <div className="message-body">
                  <div dangerouslySetInnerHTML={{ __html: msg.body }} />
                </div>
              )}
              {!expanded && (
                <div className="message-snippet">{msg.snippet}</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
