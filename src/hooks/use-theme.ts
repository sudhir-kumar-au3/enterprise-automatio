import { useKV } from '@github/spark/hooks'
import { useEffect } from 'react'

type Theme = 'light' | 'dark'

export function useTheme() {
  const [theme, setTheme] = useKV<Theme>('app-theme', 'light')

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme || 'light')
  }, [theme])

  const toggleTheme = () => {
    setTheme(current => current === 'light' ? 'dark' : 'light')
  }

  return { theme: theme || 'light', setTheme, toggleTheme }
}
