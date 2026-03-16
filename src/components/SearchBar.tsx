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

  // Direct Gmail search — fast, immediate
  const handleDirectSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setConvertedQuery('')
    onSearch(query.trim(), query.trim())
  }

  // AI-powered search — converts natural language to Gmail syntax
  const handleAISearch = async () => {
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
      <form onSubmit={handleDirectSearch}>
        <span className="search-icon">⌕</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Rechercher dans vos emails..."
          className="search-input"
          disabled={converting}
        />
        <button
          type="button"
          className="toolbar-btn ai-btn search-ai-btn"
          onClick={handleAISearch}
          disabled={converting || !query.trim()}
          title="Recherche intelligente IA — convertit ta requête en syntaxe Gmail avancée"
        >
          {converting ? '...' : '✦ IA'}
        </button>
        <button type="button" className="search-close" onClick={onClose}>
          <kbd>Esc</kbd>
        </button>
      </form>
      {convertedQuery && convertedQuery !== query && (
        <div className="search-converted">
          Requête Gmail convertie : <code>{convertedQuery}</code>
        </div>
      )}
    </div>
  )
}
