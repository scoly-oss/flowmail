import { useState, useEffect, useCallback } from 'react'
import { initAuth, logout } from './services/auth'
import { listMessages, searchMessages, archiveMessage, trashMessage, markAsRead, toggleStar } from './services/gmail'
import { classifyEmails } from './services/claude'
import { LoginScreen } from './components/LoginScreen'
import { Sidebar } from './components/Sidebar'
import { EmailList } from './components/EmailList'
import { EmailReader } from './components/EmailReader'
import { ComposeModal } from './components/ComposeModal'
import { SearchBar } from './components/SearchBar'
import { TriagePanel } from './components/TriagePanel'
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
  const [replyData, setReplyData] = useState<{ to: string; cc?: string; subject: string; threadId?: string; messageId?: string; body?: string } | undefined>()
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [gmailQuery, setGmailQuery] = useState('')
  const [showTriage, setShowTriage] = useState(false)
  const [triageResults, setTriageResults] = useState<{ id: string; category: string; reason: string; suggestedAction: string }[]>([])
  const [triaging, setTriaging] = useState(false)

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

  const getReplyRecipient = (detail: EmailDetail): string => {
    const myEmail = email.toLowerCase()

    // Helper to extract clean email from "Name <email>" format
    const extractEmail = (raw: string): string => {
      const match = raw.match(/<(.+?)>/)
      return match ? match[1].trim() : raw.split(',')[0].trim()
    }

    // Determine candidate: prefer Reply-To header, fallback to From
    const replyToHeader = detail.replyTo || ''
    const fromAddr = detail.fromEmail || ''

    // If Reply-To is my own email (even in "Name <email>" format), ignore it and use From
    let candidate = extractEmail(replyToHeader).toLowerCase() === myEmail ? fromAddr : (replyToHeader || fromAddr)

    // If candidate is still my own email (I sent this message), use the To field
    if (extractEmail(candidate).toLowerCase() === myEmail && detail.to) {
      candidate = detail.to
    }

    return extractEmail(candidate)
  }

  const handleReply = (detail: EmailDetail) => {
    setReplyData({
      to: getReplyRecipient(detail),
      subject: detail.subject,
      threadId: detail.threadId,
      messageId: detail.id,
    })
    setShowCompose(true)
  }

  const handleReplyAll = (detail: EmailDetail) => {
    const myAddr = email.toLowerCase()
    const mainRecipient = getReplyRecipient(detail)

    // Helper to extract individual email addresses from a comma-separated field
    const parseAddresses = (field: string): string[] => {
      if (!field) return []
      return field.split(',').map((addr) => {
        const match = addr.match(/<(.+?)>/)
        return (match ? match[1] : addr).trim()
      }).filter((addr) => addr.toLowerCase() !== myAddr)
    }

    // Cc = original To + original Cc, minus me and minus the main recipient
    const toAddrs = parseAddresses(detail.to)
    const ccAddrs = parseAddresses(detail.cc)
    const allCc = [...toAddrs, ...ccAddrs]
      .filter((addr) => addr.toLowerCase() !== mainRecipient.toLowerCase())

    setReplyData({
      to: mainRecipient,
      cc: allCc.length > 0 ? allCc.join(', ') : undefined,
      subject: detail.subject,
      threadId: detail.threadId,
      messageId: detail.id,
    })
    setShowCompose(true)
  }

  const handleReplyWithDraft = (detail: EmailDetail, draft: string) => {
    setReplyData({
      to: getReplyRecipient(detail),
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

  const handleSearch = (query: string, convertedGmailQuery: string) => {
    setSearchQuery(query)
    setGmailQuery(convertedGmailQuery)
    setSelectedEmail(null)
    setShowSearch(false)
    fetchEmails(currentLabel, convertedGmailQuery)
  }

  const handleTriage = async () => {
    if (triaging || emails.length === 0) return
    setTriaging(true)
    try {
      const emailsToClassify = emails.slice(0, 20).map((e) => ({
        id: e.id,
        from: e.from,
        subject: e.subject,
        snippet: e.snippet,
      }))
      const results = await classifyEmails(emailsToClassify)
      setTriageResults(results)
      setShowTriage(true)
    } catch (err) {
      console.error('Triage failed:', err)
    }
    setTriaging(false)
  }

  const handleTriageArchive = async (id: string) => {
    await archiveMessage(id)
    setEmails((prev) => prev.filter((e) => e.id !== id))
    setTriageResults((prev) => prev.filter((r) => r.id !== id))
  }

  const handleTriageReply = (email: EmailSummary) => {
    setReplyData({
      to: email.fromEmail,
      subject: email.subject,
      threadId: email.threadId,
    })
    setShowCompose(true)
  }

  const handleTriageTrash = async (id: string) => {
    await trashMessage(id)
    setEmails((prev) => prev.filter((e) => e.id !== id))
    setTriageResults((prev) => prev.filter((r) => r.id !== id))
  }

  const handleBatchArchiveNewsletters = async () => {
    const newsletterIds = triageResults
      .filter((r) => r.category === 'NEWSLETTER')
      .map((r) => r.id)
    for (const id of newsletterIds) {
      await archiveMessage(id)
    }
    setEmails((prev) => prev.filter((e) => !newsletterIds.includes(e.id)))
    setTriageResults((prev) => prev.filter((r) => r.category !== 'NEWSLETTER'))
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
            {searchQuery
              ? <>Recherche : {searchQuery}{gmailQuery && gmailQuery !== searchQuery && <span className="search-converted-inline"> ({gmailQuery})</span>}</>
              : getLabelName(currentLabel)}
          </h2>
          <div className="main-actions">
            <button
              className="toolbar-btn ai-btn"
              onClick={handleTriage}
              disabled={triaging || emails.length === 0}
              title="Triage IA"
            >
              {triaging ? '...' : '✦ Trier'}
            </button>
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

        {showTriage && !selectedEmail && (
          <TriagePanel
            results={triageResults}
            emails={emails}
            onDismiss={() => setShowTriage(false)}
            onArchive={handleTriageArchive}
            onReply={handleTriageReply}
            onTrash={handleTriageTrash}
            onBatchArchiveNewsletters={handleBatchArchiveNewsletters}
          />
        )}

        {selectedEmail ? (
          <EmailReader
            threadId={selectedEmail.threadId}
            myEmail={email}
            onBack={() => setSelectedEmail(null)}
            onReply={handleReply}
            onReplyAll={handleReplyAll}
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
