'use client'
import { useEffect, useState, useCallback } from 'react'

const MODES = ['light', 'dark', 'system']

function resolveDark(mode) {
  if (mode === 'dark') return true
  if (mode === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyTheme(mode) {
  const isDark = resolveDark(mode)
  document.documentElement.classList.toggle('dark', isDark)
  document.documentElement.dataset.theme = mode
}

export function useTheme() {
  const [mode, setMode] = useState('system')

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    if (stored && MODES.includes(stored)) setMode(stored)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    applyTheme(mode)
    localStorage.setItem('theme', mode)

    if (mode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [mode])

  const cycle = useCallback(() => {
    setMode(m => MODES[(MODES.indexOf(m) + 1) % MODES.length])
  }, [])

  return { mode, setMode, cycle }
}

function SunIcon(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  )
}

function MoonIcon(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function SystemIcon(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  )
}

const OPTIONS = [
  { mode: 'light', label: 'Light', Icon: SunIcon },
  { mode: 'dark', label: 'Dark', Icon: MoonIcon },
  { mode: 'system', label: 'System', Icon: SystemIcon },
]

export function ThemeToggle() {
  const { mode, setMode } = useTheme()

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex items-center gap-0.5 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface-1)] p-0.5"
    >
      {OPTIONS.map(({ mode: m, label, Icon }) => {
        const active = mode === m
        return (
          <button
            key={m}
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setMode(m)}
            className={[
              'inline-flex items-center justify-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition',
              active
                ? 'bg-[color:var(--color-surface)] text-[color:var(--color-fg)] shadow-sm'
                : 'text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]',
            ].join(' ')}
          >
            <Icon />
            <span className="hidden sm:inline">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
