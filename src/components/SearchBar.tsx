import { useState, useRef, useEffect } from 'react'

interface SearchBarProps {
  onSearch: (query: string) => void
  onClose: () => void
  visible: boolean
}

export function SearchBar({ onSearch, onClose, visible }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (visible) {
      inputRef.current?.focus()
    }
  }, [visible])

  if (!visible) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      onSearch(query.trim())
    }
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
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Rechercher dans les messages..."
          className="search-input"
        />
        <button type="button" className="search-close" onClick={onClose}>
          <kbd>Esc</kbd>
        </button>
      </form>
    </div>
  )
}
