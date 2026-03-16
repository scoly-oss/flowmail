import { useState, useRef, useEffect } from 'react'
import { smartSearch } from '../services/claude'

interface SearchBarProps {
  onSearch: (query: string, gmailQuery: string) => void
  onClose: () => void
  visible: boolean
}

export function SearchBar({ onSearch, onClose, visible }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [converting, setConverting] = useState(false)
  const [convertedQuery, setConvertedQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (visible) {
      inputRef.current?.focus()
      setConvertedQuery('')
    }
  }, [visible])

  if (!visible) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setConverting(true)
    try {
      const gmailQuery = await smartSearch(query.trim())
      setConvertedQuery(gmailQuery)
      onSearch(query.trim(), gmailQuery)
    } catch {
      // Fallback: use the raw query directly
      onSearch(query.trim(), query.trim())
    }
    setConverting(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className="search-bar">
      <form onSubmit={handleSubmit}>
        <span className="search-icon">⌕</span>
        <span className="search-ai-indicator">✦ IA</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Recherche intelligente — ex : mails de Louis cette semaine..."
          className="search-input"
          disabled={converting}
        />
        {converting && <span className="search-ai-indicator" style={{ opacity: 0.6 }}>Conversion...</span>}
        <button type="button" className="search-close" onClick={onClose}>
          <kbd>Esc</kbd>
        </button>
      </form>
      {convertedQuery && (
        <div className="search-converted">
          Requête Gmail : <code>{convertedQuery}</code>
        </div>
      )}
    </div>
  )
}
