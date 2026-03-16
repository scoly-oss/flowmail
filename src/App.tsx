import { useState, useEffect, useCallback } from 'react'
import { initAuth, logout } from './services/auth'
import { listMessages, searchMessages, archiveMessage, trashMessage, markAsRead, toggleStar } from './services/gmail'
import { LoginScreen } from './components/LoginScreen'
import { Sidebar } from './components/Sidebar'
import { EmailList } from './components/EmailList'
import { EmailReader } from './components/EmailReader'
import { ComposeModal } from './components/ComposeModal'
import { SearchBar } from './components/SearchBar'
import { useKeyboard } from './hooks/useKeyboard'
import type { EmailSummary, EmailDetail } from './types'
import './App.css'

export default function App() {
  const [authenticated, setAuthenticated] = useState(false)
  const [email, setEmail] = useState('')
  const [emails, setEmails] = useState<EmailSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [currentLabel, setCurrentLabel] = useState('INBOX')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [selectedEmail, setSelectedEmail] = useState<EmailSummary | null>(null)
  const [showCompose, setShowCompose] = useState(false)
  const [replyData, setReplyData] = useState<{ to: string; subject: string; threadId?: string; messageId?: string; body?: string } | undefined>()
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchEmails = useCallback(async (label: string, query?: string) => {
    setLoading(true)
    try {
      const msgs = query
        ? await searchMessages(query)
        : await listMessages(label)
      setEmails(msgs)
      setSelectedIndex(0)
    } catch (err) {
      console.error('Failed to fetch emails:', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    initAuth(
      async (token) => {
        setAuthenticated(true)
        try {
          const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
            headers: { Authorization: `Bearer ${token}` },
          })
          const data = await res.json()
          setEmail(data.emailAddress || '')
        } catch {}
        fetchEmails('INBOX')
      },
      (err) => console.error('Auth error:', err)
    )
  }, [fetchEmails])

  const handleLabelChange = (label: string) => {
    setCurrentLabel(label)
    setSelectedEmail(null)
    setSearchQuery('')
    fetchEmails(label)
  }

  const handleSelectEmail = (email: EmailSummary, index: number) => {
    setSelectedIndex(index)
    setSelectedEmail(email)
    if (email.isUnread) {
      markAsRead(email.id).then(() => {
        setEmails((prev) =>
          prev.map((e) => (e.id === email.id ? { ...e, isUnread: false } : e))
        )
      })
    }
  }

  const handleArchive = async () => {
    if (!selectedEmail) return
    await archiveMessage(selectedEmail.id)
    setEmails((prev) => prev.filter((e) => e.id !== selectedEmail.id))
    setSelectedEmail(null)
    setSelectedIndex((i) => Math.min(i, emails.length - 2))
  }

  const handleTrash = async () => {
    if (!selectedEmail) return
    await trashMessage(selectedEmail.id)
    setEmails((prev) => prev.filter((e) => e.id !== selectedEmail.id))
    setSelectedEmail(null)
    setSelectedIndex((i) => Math.min(i, emails.length - 2))
  }

  const handleReply = (detail: EmailDetail) => {
    setReplyData({
      to: detail.replyTo || detail.fromEmail,
      subject: detail.subject,
      threadId: detail.threadId,
      messageId: detail.id,
    })
    setShowCompose(true)
  }

  const handleReplyWithDraft = (detail: EmailDetail, draft: string) => {
    setReplyData({
      to: detail.replyTo || detail.fromEmail,
      subject: detail.subject,
      threadId: detail.threadId,
      messageId: detail.id,
      body: draft,
    })
    setShowCompose(true)
  }

  const handleCompose = () => {
    setReplyData(undefined)
    setShowCompose(true)
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setSelectedEmail(null)
    setShowSearch(false)
    fetchEmails(currentLabel, query)
  }

  const handleStar = async (index: number) => {
    const em = emails[index]
    if (!em) return
    await toggleStar(em.id, em.isStarred)
    setEmails((prev) =>
      prev.map((e) => (e.id === em.id ? { ...e, isStarred: !e.isStarred } : e))
    )
  }

  useKeyboard(
    {
      j: () => {
        if (!selectedEmail) setSelectedIndex((i) => Math.min(i + 1, emails.length - 1))
      },
      k: () => {
        if (!selectedEmail) setSelectedIndex((i) => Math.max(i - 1, 0))
      },
      o: () => {
        if (!selectedEmail && emails[selectedIndex]) {
          handleSelectEmail(emails[selectedIndex], selectedIndex)
        }
      },
      Enter: () => {
        if (!selectedEmail && emails[selectedIndex]) {
          handleSelectEmail(emails[selectedIndex], selectedIndex)
        }
      },
      Escape: () => {
        if (showCompose) {
          setShowCompose(false)
        } else if (showSearch) {
          setShowSearch(false)
        } else if (selectedEmail) {
          setSelectedEmail(null)
        }
      },
      e: () => {
        if (selectedEmail) {
          handleArchive()
        } else if (emails[selectedIndex]) {
          archiveMessage(emails[selectedIndex].id).then(() => {
            setEmails((prev) => prev.filter((_, i) => i !== selectedIndex))
          })
        }
      },
      '#': () => handleTrash(),
      c: () => handleCompose(),
      r: () => {
        if (selectedEmail) {
          handleReply({
            ...selectedEmail,
            body: '',
            cc: '',
            bcc: '',
            replyTo: selectedEmail.fromEmail,
          })
        }
      },
      '/': () => setShowSearch(true),
      s: () => handleStar(selectedIndex),
      g: () => handleLabelChange('INBOX'),
    },
    [selectedEmail, selectedIndex, emails, showCompose, showSearch]
  )

  if (!authenticated) {
    return <LoginScreen />
  }

  const unreadCount = emails.filter((e) => e.isUnread).length

  return (
    <div className="app">
      <Sidebar
        currentLabel={currentLabel}
        onLabelChange={handleLabelChange}
        onCompose={handleCompose}
        email={email}
        unreadCount={unreadCount}
      />

      <main className="main">
        <SearchBar
          visible={showSearch}
          onSearch={handleSearch}
          onClose={() => setShowSearch(false)}
        />

        <div className="main-header">
          <h2 className="main-title">
            {searchQuery ? `Recherche : ${searchQuery}` : getLabelName(currentLabel)}
          </h2>
          <div className="main-actions">
            <button className="toolbar-btn" onClick={() => fetchEmails(currentLabel, searchQuery || undefined)} title="Actualiser">
              ↻
            </button>
            <button className="toolbar-btn" onClick={() => setShowSearch(true)} title="Rechercher (/)">
              ⌕
            </button>
            <button className="toolbar-btn" onClick={logout} title="Déconnexion">
              ⏻
            </button>
          </div>
        </div>

        {selectedEmail ? (
          <EmailReader
            threadId={selectedEmail.threadId}
            onBack={() => setSelectedEmail(null)}
            onReply={handleReply}
            onReplyWithDraft={handleReplyWithDraft}
            onArchive={handleArchive}
            onTrash={handleTrash}
          />
        ) : (
          <EmailList
            emails={emails}
            selectedIndex={selectedIndex}
            selectedId={selectedEmail ? (selectedEmail as EmailSummary).id : null}
            onSelect={handleSelectEmail}
            loading={loading}
          />
        )}
      </main>

      {showCompose && (
        <ComposeModal
          onClose={() => setShowCompose(false)}
          onSent={() => fetchEmails(currentLabel)}
          replyTo={replyData}
        />
      )}

    </div>
  )
}

function getLabelName(label: string): string {
  const names: Record<string, string> = {
    INBOX: 'Boîte de réception',
    STARRED: 'Suivis',
    SENT: 'Envoyés',
    DRAFT: 'Brouillons',
    TRASH: 'Corbeille',
    SPAM: 'Spam',
  }
  return names[label] || label
}
