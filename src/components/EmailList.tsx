import type { EmailSummary } from '../types'
import { formatDate } from '../utils/date'

interface EmailListProps {
  emails: EmailSummary[]
  selectedIndex: number
  selectedId: string | null
  onSelect: (email: EmailSummary, index: number) => void
  loading: boolean
}

export function EmailList({ emails, selectedIndex, selectedId, onSelect, loading }: EmailListProps) {
  if (loading) {
    return (
      <div className="email-list">
        <div className="email-list-loading">
          <div className="spinner" />
        </div>
      </div>
    )
  }

  if (emails.length === 0) {
    return (
      <div className="email-list">
        <div className="email-list-empty">
          <p>Aucun message</p>
        </div>
      </div>
    )
  }

  return (
    <div className="email-list">
      {emails.map((email, index) => (
        <div
          key={email.id}
          className={[
            'email-row',
            email.isUnread ? 'unread' : '',
            index === selectedIndex ? 'selected' : '',
            selectedId === email.id ? 'active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => onSelect(email, index)}
        >
          <div className="email-row-star" onClick={(e) => { e.stopPropagation() }}>
            {email.isStarred ? '★' : '☆'}
          </div>
          <div className="email-row-from">{email.from}</div>
          <div className="email-row-content">
            <span className="email-row-subject">{email.subject}</span>
            <span className="email-row-snippet"> — {email.snippet}</span>
          </div>
          <div className="email-row-meta">
            {email.hasAttachments && <span className="email-row-attachment">📎</span>}
            <span className="email-row-date">{formatDate(email.date)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
