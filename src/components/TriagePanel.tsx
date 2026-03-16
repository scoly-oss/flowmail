import type { EmailSummary } from '../types'

interface TriageResult {
  id: string
  category: string
  reason: string
  suggestedAction: string
}

interface TriagePanelProps {
  results: TriageResult[]
  emails: EmailSummary[]
  onDismiss: () => void
  onArchive: (id: string) => void
  onReply: (email: EmailSummary) => void
  onTrash: (id: string) => void
  onBatchArchiveNewsletters: () => void
}

const BADGE_COLORS: Record<string, string> = {
  URGENT: '#e8842c',
  A_REPONDRE: '#3b82f6',
  NEWSLETTER: '#9ca3af',
  NOTIFICATION: '#9ca3af',
  INFO: '#9ca3af',
}

const CATEGORY_LABELS: Record<string, string> = {
  URGENT: 'Urgent',
  A_REPONDRE: 'À répondre',
  NEWSLETTER: 'Newsletter',
  NOTIFICATION: 'Notification',
  INFO: 'Info',
}

export function TriagePanel({
  results,
  emails,
  onDismiss,
  onArchive,
  onReply,
  onTrash,
  onBatchArchiveNewsletters,
}: TriagePanelProps) {
  if (results.length === 0) return null

  const hasNewsletters = results.some((r) => r.category === 'NEWSLETTER')

  const getEmail = (id: string) => emails.find((e) => e.id === id)

  return (
    <div className="triage-panel">
      <div className="triage-header">
        <span className="triage-title">✦ Suggestions de tri</span>
        <div className="triage-header-actions">
          {hasNewsletters && (
            <button className="toolbar-btn" onClick={onBatchArchiveNewsletters}>
              Tout archiver les newsletters
            </button>
          )}
          <button className="triage-dismiss" onClick={onDismiss}>✕</button>
        </div>
      </div>
      <div className="triage-list">
        {results.map((result) => {
          const email = getEmail(result.id)
          if (!email) return null
          return (
            <div key={result.id} className="triage-item">
              <span
                className="triage-badge"
                style={{ background: BADGE_COLORS[result.category] || '#9ca3af' }}
              >
                {CATEGORY_LABELS[result.category] || result.category}
              </span>
              <div className="triage-info">
                <span className="triage-from">{email.from}</span>
                <span className="triage-subject">{email.subject}</span>
                <span className="triage-reason">{result.reason}</span>
              </div>
              <div className="triage-actions">
                {result.suggestedAction === 'archiver' && (
                  <button className="toolbar-btn" onClick={() => onArchive(result.id)}>Archiver</button>
                )}
                {result.suggestedAction === 'répondre' && (
                  <button className="toolbar-btn" onClick={() => onReply(email)}>Répondre</button>
                )}
                {result.suggestedAction === 'supprimer' && (
                  <button className="toolbar-btn" onClick={() => onTrash(result.id)}>Supprimer</button>
                )}
                {result.suggestedAction === 'lire' && (
                  <button className="toolbar-btn" onClick={() => onArchive(result.id)}>Archiver</button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
