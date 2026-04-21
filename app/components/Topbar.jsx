'use client'
import { PAGE_INFO } from '@/app/lib/constants'
import { ThemeToggle } from '@/app/lib/theme'
import { Button } from '@/app/lib/ui'

export function Topbar({ page, refreshing, onRefresh }) {
  const info = PAGE_INFO[page] || { title: page, subtitle: '' }
  return (
    <header className="sticky top-0 z-30 border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)]/85 backdrop-blur supports-[backdrop-filter]:bg-[color:var(--color-surface)]/70">
      <div className="flex items-center gap-4 px-6 py-4">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold tracking-tight">{info.title}</h1>
          <p className="mt-0.5 truncate text-xs text-[color:var(--color-fg-muted)]">{info.subtitle}</p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface-1)] px-3 py-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--color-brand)] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[color:var(--color-brand)]" />
          </span>
          <span className="text-[11px] font-medium text-[color:var(--color-fg-muted)]">Live</span>
        </div>

        <ThemeToggle />

        <Button onClick={onRefresh} disabled={refreshing}>
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={refreshing ? 'animate-spin-slow' : ''}
          >
            <path d="M21 12a9 9 0 1 1-3-6.7" />
            <path d="M21 3v6h-6" />
          </svg>
          Refresh
        </Button>
      </div>
    </header>
  )
}
