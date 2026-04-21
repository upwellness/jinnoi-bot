'use client'

export function Card({ children, className = '', ...rest }) {
  return (
    <div
      className={[
        'rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-1)]',
        'shadow-sm',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, icon, action, className = '' }) {
  return (
    <div
      className={[
        'flex items-center gap-3 border-b border-[color:var(--color-border)] px-5 py-4',
        className,
      ].join(' ')}
    >
      {icon && <span className="text-base leading-none" aria-hidden>{icon}</span>}
      <div className="flex-1 text-sm font-semibold tracking-tight">{children}</div>
      {action}
    </div>
  )
}

const TONE = {
  brand: 'bg-[color:var(--color-brand-soft)] text-[color:var(--color-brand)] ring-[color:var(--color-brand)]/20',
  info: 'bg-[color:var(--color-info-soft)] text-[color:var(--color-info)] ring-[color:var(--color-info)]/20',
  success: 'bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] ring-[color:var(--color-success)]/20',
  warning: 'bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] ring-[color:var(--color-warning)]/20',
  danger: 'bg-[color:var(--color-danger-soft)] text-[color:var(--color-danger)] ring-[color:var(--color-danger)]/20',
  violet: 'bg-[color:var(--color-violet-soft)] text-[color:var(--color-violet)] ring-[color:var(--color-violet)]/20',
  neutral: 'bg-[color:var(--color-surface-2)] text-[color:var(--color-fg-muted)] ring-[color:var(--color-border)]',
}

export function Chip({ tone = 'neutral', children, className = '' }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset',
        TONE[tone] || TONE.neutral,
        className,
      ].join(' ')}
    >
      {children}
    </span>
  )
}

export function Badge({ tone = 'brand', children }) {
  return (
    <span
      className={[
        'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums ring-1 ring-inset',
        TONE[tone] || TONE.brand,
      ].join(' ')}
    >
      {children}
    </span>
  )
}

const BUTTON_TONE = {
  primary:
    'bg-[color:var(--color-brand)] text-[color:var(--color-brand-fg)] hover:brightness-95 disabled:opacity-40',
  ghost:
    'bg-transparent text-[color:var(--color-fg-muted)] ring-1 ring-inset ring-[color:var(--color-border)] hover:text-[color:var(--color-fg)] hover:bg-[color:var(--color-surface-2)]',
  success:
    'bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] ring-1 ring-inset ring-[color:var(--color-success)]/25 hover:brightness-95',
  danger:
    'bg-[color:var(--color-danger-soft)] text-[color:var(--color-danger)] ring-1 ring-inset ring-[color:var(--color-danger)]/25 hover:brightness-95',
  warning:
    'bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] ring-1 ring-inset ring-[color:var(--color-warning)]/25 hover:brightness-95',
  info:
    'bg-[color:var(--color-info-soft)] text-[color:var(--color-info)] ring-1 ring-inset ring-[color:var(--color-info)]/25 hover:brightness-95',
}

export function Button({ tone = 'ghost', size = 'md', className = '', children, ...rest }) {
  const sizeClass = size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3.5 py-2 text-xs'
  return (
    <button
      className={[
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)]/40',
        'disabled:cursor-not-allowed',
        sizeClass,
        BUTTON_TONE[tone] || BUTTON_TONE.ghost,
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  )
}

export function Input({ className = '', ...rest }) {
  return (
    <input
      className={[
        'w-full rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)]',
        'px-3 py-2 text-sm text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-subtle)]',
        'outline-none transition focus:border-[color:var(--color-brand)] focus:ring-2 focus:ring-[color:var(--color-brand)]/20',
        className,
      ].join(' ')}
      {...rest}
    />
  )
}

export function Textarea({ className = '', ...rest }) {
  return (
    <textarea
      className={[
        'w-full rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)]',
        'px-3 py-2 text-sm text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-subtle)] leading-relaxed',
        'outline-none transition focus:border-[color:var(--color-brand)] focus:ring-2 focus:ring-[color:var(--color-brand)]/20',
        'resize-y min-h-20',
        className,
      ].join(' ')}
      {...rest}
    />
  )
}

export function Select({ className = '', children, ...rest }) {
  return (
    <select
      className={[
        'w-full rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)]',
        'px-3 py-2 text-sm text-[color:var(--color-fg)]',
        'outline-none transition focus:border-[color:var(--color-brand)] focus:ring-2 focus:ring-[color:var(--color-brand)]/20',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </select>
  )
}

export function EmptyState({ icon = '📭', title, description }) {
  return (
    <div className="px-6 py-14 text-center">
      <div className="mx-auto mb-3 text-4xl opacity-50" aria-hidden>{icon}</div>
      <div className="text-sm font-semibold text-[color:var(--color-fg-muted)]">{title}</div>
      {description && (
        <div className="mt-1.5 text-xs leading-relaxed text-[color:var(--color-fg-subtle)]">
          {description}
        </div>
      )}
    </div>
  )
}

export function StatCard({ label, value, sub, tone = 'brand', icon }) {
  const bar = {
    brand: 'from-transparent via-[color:var(--color-brand)] to-transparent',
    danger: 'from-transparent via-[color:var(--color-danger)] to-transparent',
    warning: 'from-transparent via-[color:var(--color-warning)] to-transparent',
    info: 'from-transparent via-[color:var(--color-info)] to-transparent',
    violet: 'from-transparent via-[color:var(--color-violet)] to-transparent',
  }[tone] || 'from-transparent via-[color:var(--color-brand)] to-transparent'

  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${bar}`} />
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[color:var(--color-fg-subtle)]">
            {label}
          </div>
          {icon && <div className="text-lg opacity-30" aria-hidden>{icon}</div>}
        </div>
        <div className="mt-3 text-3xl font-bold tabular-nums tracking-tight">{value}</div>
        {sub && <div className="mt-1.5 text-xs text-[color:var(--color-fg-subtle)]">{sub}</div>}
      </div>
    </Card>
  )
}

export function Modal({ onClose, children, title }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-up"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-[480px] max-w-[calc(100vw-32px)] overflow-hidden rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-2xl">
        {title && (
          <div className="flex items-center justify-between border-b border-[color:var(--color-border)] px-5 py-4">
            <div className="text-sm font-semibold tracking-tight">{title}</div>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-[color:var(--color-fg-subtle)] hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-fg)]"
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

export function DiscBars({ profile, compact = false }) {
  const max = Math.max(profile.disc_d, profile.disc_i, profile.disc_s, profile.disc_c, 1)
  return (
    <div className={compact ? 'space-y-0.5' : 'space-y-1'}>
      {['D', 'I', 'S', 'C'].map(dim => {
        const score = profile[`disc_${dim.toLowerCase()}`] || 0
        const pct = Math.round((score / max) * 100)
        const colorVar = {
          D: 'var(--color-danger)',
          I: 'var(--color-warning)',
          S: 'var(--color-success)',
          C: 'var(--color-info)',
        }[dim]
        return (
          <div key={dim} className="flex items-center gap-2">
            <span className="w-3 text-[10px] font-bold" style={{ color: colorVar }}>{dim}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[color:var(--color-surface-2)]">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${pct}%`, background: colorVar }}
              />
            </div>
            <span className="w-5 text-right text-[10px] tabular-nums text-[color:var(--color-fg-subtle)]">{score}</span>
          </div>
        )
      })}
    </div>
  )
}

export function DiscChip({ type, size = 'md' }) {
  if (!type) return <span className="text-xs text-[color:var(--color-fg-subtle)]">—</span>
  const tone = { D: 'danger', I: 'warning', S: 'success', C: 'info' }[type]
  return (
    <Chip tone={tone} className={size === 'lg' ? 'px-3 py-1 text-xs font-bold' : 'font-bold'}>
      {type}
    </Chip>
  )
}
