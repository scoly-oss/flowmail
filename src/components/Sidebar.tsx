interface SidebarProps {
  currentLabel: string
  onLabelChange: (label: string) => void
  onCompose: () => void
  email: string
  unreadCount: number
}

const LABELS = [
  { id: 'INBOX', name: 'Boîte de réception', icon: '↓' },
  { id: 'STARRED', name: 'Suivis', icon: '★' },
  { id: 'SENT', name: 'Envoyés', icon: '↗' },
  { id: 'DRAFT', name: 'Brouillons', icon: '✎' },
  { id: 'TRASH', name: 'Corbeille', icon: '✕' },
  { id: 'SPAM', name: 'Spam', icon: '⚠' },
]

export function Sidebar({ currentLabel, onLabelChange, onCompose, email, unreadCount }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">FM</div>
        <span className="sidebar-title">FlowMail</span>
      </div>

      <button className="btn-compose" onClick={onCompose}>
        <span>Nouveau</span>
        <kbd>c</kbd>
      </button>

      <nav className="sidebar-nav">
        {LABELS.map((label) => (
          <button
            key={label.id}
            className={`nav-item ${currentLabel === label.id ? 'active' : ''}`}
            onClick={() => onLabelChange(label.id)}
          >
            <span className="nav-icon">{label.icon}</span>
            <span className="nav-label">{label.name}</span>
            {label.id === 'INBOX' && unreadCount > 0 && (
              <span className="nav-badge">{unreadCount}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span className="sidebar-email">{email}</span>
      </div>
    </aside>
  )
}
