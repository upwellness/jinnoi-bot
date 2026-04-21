'use client'
import { NAV_SECTIONS } from '@/app/lib/constants'
import { Badge } from '@/app/lib/ui'

export function Sidebar({ page, onSelect, counts, collapsed, onToggleCollapse }) {
  return (
    <aside
      className={[
        'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-[color:var(--color-border)] bg-[color:var(--color-surface-1)] transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-60',
      ].join(' ')}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-[color:var(--color-border)] px-4 py-5">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg shadow-sm"
          style={{ background: 'linear-gradient(135deg, var(--color-brand), var(--color-accent))' }}
        >
          🌸
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate text-sm font-bold tracking-tight">จิ้นน้อย</div>
            <div className="truncate text-[10px] font-semibold uppercase tracking-[0.15em] text-[color:var(--color-fg-subtle)]">
              Admin Console
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="scrollbar-thin flex-1 overflow-y-auto px-2 py-3">
        {NAV_SECTIONS.map(section => (
          <div key={section.label} className="mb-4 last:mb-0">
            {!collapsed && (
              <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-[color:var(--color-fg-subtle)]">
                {section.label}
              </div>
            )}
            {section.items.map(item => {
              const active = page === item.id
              const badge = counts?.[item.badgeKey] || 0
              return (
                <button
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={[
                    'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition',
                    active
                      ? 'bg-[color:var(--color-brand-soft)] text-[color:var(--color-brand)]'
                      : 'text-[color:var(--color-fg-muted)] hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-fg)]',
                  ].join(' ')}
                >
                  {active && (
                    <span
                      aria-hidden
                      className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-[color:var(--color-brand)]"
                    />
                  )}
                  <span className="w-5 shrink-0 text-center text-base leading-none" aria-hidden>
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate">{item.label}</span>
                      {badge > 0 && <Badge tone={item.tone}>{badge}</Badge>}
                    </>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-[color:var(--color-border)] px-4 py-3">
        {!collapsed ? (
          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[color:var(--color-fg-subtle)]">
              Vercel · Supabase · Gemini
            </div>
            <button
              onClick={onToggleCollapse}
              className="rounded-md p-1 text-[color:var(--color-fg-subtle)] hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-fg)]"
              aria-label="Collapse sidebar"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m15 6-6 6 6 6" /></svg>
            </button>
          </div>
        ) : (
          <button
            onClick={onToggleCollapse}
            className="mx-auto flex h-7 w-7 items-center justify-center rounded-md text-[color:var(--color-fg-subtle)] hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-fg)]"
            aria-label="Expand sidebar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 6 6 6-6 6" /></svg>
          </button>
        )}
      </div>
    </aside>
  )
}
