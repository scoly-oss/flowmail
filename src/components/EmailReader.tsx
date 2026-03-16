import { useEffect, useState } from 'react'
import type { EmailDetail } from '../types'
import { getThread } from '../services/gmail'
import { summarizeEmail, draftReply } from '../services/claude'
import { formatFullDate } from '../utils/date'

interface EmailReaderProps {
  threadId: string
  myEmail: string
  onBack: () => void
  onReply: (email: EmailDetail) => void
  onReplyAll: (email: EmailDetail) => void
  onReplyWithDraft: (email: EmailDetail, draft: string) => void
  onArchive: () => void
  onTrash: () => void
}

export function EmailReader({ threadId, myEmail, onBack, onReply, onReplyAll, onReplyWithDraft, onArchive, onTrash }: EmailReaderProps) {
  const [messages, setMessages] = useState<EmailDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [summary, setSummary] = useState<string | null>(null)
  const [summarizing, setSummarizing] = useState(false)
  const [drafting, setDrafting] = useState(false)
  const [draftInstruction, setDraftInstruction] = useState('')
  const [showDraftInput, setShowDraftInput] = useState(false)

  useEffect(() => {
    setLoading(true)
    setSummary(null)
    setShowDraftInput(false)
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

  // Find the best message to reply to: last message NOT from me
  const getReplyTarget = (): EmailDetail | undefined => {
    const me = myEmail.toLowerCase()
    // Try last message not from me
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].fromEmail.toLowerCase() !== me) {
        return messages[i]
      }
    }
    // If all messages are from me, reply to the last one
    return messages[messages.length - 1]
  }

  const handleSummarize = async () => {
    const target = getReplyTarget()
    if (!target) return
    setSummarizing(true)
    try {
      const text = await summarizeEmail({
        from: target.from,
        subject: target.subject,
        body: target.body.replace(/<[^>]*>/g, ' ').substring(0, 3000),
      })
      setSummary(text)
    } catch (err) {
      console.error('Summarize failed:', err)
      setSummary('Erreur lors du résumé.')
    }
    setSummarizing(false)
  }

  const handleDraftReply = async () => {
    const target = getReplyTarget()
    if (!target) return
    setDrafting(true)
    try {
      const text = await draftReply(
        {
          from: target.from,
          fromEmail: target.fromEmail,
          subject: target.subject,
          body: target.body.replace(/<[^>]*>/g, ' ').substring(0, 3000),
        },
        draftInstruction || undefined
      )
      setShowDraftInput(false)
      setDraftInstruction('')
      onReplyWithDraft(target, text)
    } catch (err) {
      console.error('Draft failed:', err)
    }
    setDrafting(false)
  }

  if (loading) {
    return (
      <div className="email-reader">
        <div className="reader-loading"><div className="spinner" /></div>
      </div>
    )
  }

  const subject = messages[0]?.subject || '(sans objet)'
  const replyTarget = getReplyTarget()

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
          <button className="toolbar-btn" onClick={() => replyTarget && onReply(replyTarget)} title="Répondre (r)">
            Répondre
          </button>
          <button className="toolbar-btn" onClick={() => replyTarget && onReplyAll(replyTarget)} title="Répondre à tous">
            Rép. à tous
          </button>
          <span className="toolbar-separator" />
          <button
            className="toolbar-btn ai-btn"
            onClick={handleSummarize}
            disabled={summarizing}
            title="Résumer avec Claude"
          >
            {summarizing ? '...' : '✦ Résumer'}
          </button>
          <button
            className="toolbar-btn ai-btn"
            onClick={() => setShowDraftInput(!showDraftInput)}
            title="Rédiger une réponse avec Claude"
          >
            ✦ Rédiger
          </button>
        </div>
      </div>

      {summary && (
        <div className="ai-summary">
          <div className="ai-badge">✦ Résumé Claude</div>
          <p>{summary}</p>
          <button className="ai-dismiss" onClick={() => setSummary(null)}>✕</button>
        </div>
      )}

      {showDraftInput && (
        <div className="ai-draft-input">
          <div className="ai-badge">✦ Instructions pour Claude</div>
          <div className="ai-draft-form">
            <input
              type="text"
              value={draftInstruction}
              onChange={(e) => setDraftInstruction(e.target.value)}
              placeholder="Ex: dis oui pour jeudi, demande les pièces manquantes..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleDraftReply()
                if (e.key === 'Escape') setShowDraftInput(false)
              }}
            />
            <button
              className="btn-primary ai-draft-btn"
              onClick={handleDraftReply}
              disabled={drafting}
            >
              {drafting ? 'Rédaction...' : 'Rédiger'}
            </button>
          </div>
          <span className="ai-draft-hint">Laisse vide pour une réponse automatique · Entrée pour valider</span>
        </div>
      )}

      <h1 className="reader-subject">{subject}</h1>

      <div className="reader-messages">
        {messages.map((msg) => {
          const expanded = expandedIds.has(msg.id)
          const isMe = msg.fromEmail.toLowerCase() === myEmail.toLowerCase()
          return (
            <div key={msg.id} className={`reader-message ${expanded ? 'expanded' : 'collapsed'}`}>
              <div className="message-header" onClick={() => toggleExpand(msg.id)}>
                <div className="message-sender">
                  <div className="message-avatar">{msg.from.charAt(0).toUpperCase()}</div>
                  <div>
                    <strong>{msg.from}</strong>
                    <span className="message-email">&lt;{msg.fromEmail}&gt;</span>
                    {expanded && msg.to && (
                      <div className="message-recipients">
                        <span className="recipient-label">À :</span> {msg.to}
                        {msg.cc && <><br /><span className="recipient-label">Cc :</span> {msg.cc}</>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="message-meta">
                  <div className="message-date">{formatFullDate(msg.date)}</div>
                  {expanded && !isMe && (
                    <>
                      <button
                        className="message-reply-btn"
                        onClick={(e) => { e.stopPropagation(); onReply(msg) }}
                        title="Répondre à ce message"
                      >
                        ↩ Répondre
                      </button>
                      {(msg.cc || (msg.to && msg.to.includes(','))) && (
                        <button
                          className="message-reply-btn"
                          onClick={(e) => { e.stopPropagation(); onReplyAll(msg) }}
                          title="Répondre à tous"
                        >
                          ↩↩ Tous
                        </button>
                      )}
                    </>
                  )}
                </div>
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
