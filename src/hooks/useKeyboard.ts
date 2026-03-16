import { useEffect, useCallback } from 'react'

type KeyHandler = (e: KeyboardEvent) => void

interface KeyMap {
  [key: string]: KeyHandler
}

export function useKeyboard(keyMap: KeyMap, deps: unknown[] = []) {
  const handler = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        if (e.key === 'Escape') {
          keyMap['Escape']?.(e)
        }
        return
      }

      const key = [
        e.metaKey || e.ctrlKey ? 'Cmd+' : '',
        e.shiftKey ? 'Shift+' : '',
        e.altKey ? 'Alt+' : '',
        e.key,
      ].join('')

      const fn = keyMap[key] || keyMap[e.key]
      if (fn) {
        e.preventDefault()
        fn(e)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps
  )

  useEffect(() => {
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handler])
}
