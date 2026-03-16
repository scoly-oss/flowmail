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

  // All searches go through AI to convert natural language to Gmail syntax
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!query.trim() || converting) return
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
      <form onSubmit={handleSearch}>
        <span className="search-icon">⌕</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Rechercher : ex. 'emails de la capeb cette semaine'..."
          className="search-input"
          disabled={converting}
        />
        <button
          type="submit"
          className="toolbar-btn ai-btn search-ai-btn"
          disabled={converting || !query.trim()}
          title="Recherche intelligente IA"
        >
          {converting ? '⏳' : '✦ Rechercher'}
        </button>
        <button type="button" className="search-close" onClick={onClose}>
          <kbd>Esc</kbd>
        </button>
      </form>
      {convertedQuery && (
        <div className="search-converted">
          ✦ Requête Gmail : <code>{convertedQuery}</code>
        </div>
      )}
    </div>
  )
}
