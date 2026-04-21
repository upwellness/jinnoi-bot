'use client'

const TONE = {
  success: {
    ring: 'ring-[color:var(--color-success)]/25',
    text: 'text-[color:var(--color-success)]',
    icon: '✓',
  },
  danger: {
    ring: 'ring-[color:var(--color-danger)]/25',
    text: 'text-[color:var(--color-danger)]',
    icon: '✕',
  },
  warn: {
    ring: 'ring-[color:var(--color-warning)]/25',
    text: 'text-[color:var(--color-warning)]',
    icon: '!',
  },
  info: {
    ring: 'ring-[color:var(--color-info)]/25',
    text: 'text-[color:var(--color-info)]',
    icon: 'i',
  },
}

export function ToastStack({ toasts }) {
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {toasts.map(t => {
        const tone = TONE[t.type] || TONE.success
        return (
          <div
            key={t.id}
            className={[
              'pointer-events-auto flex items-center gap-3 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-1)] px-4 py-3 shadow-lg animate-fade-up ring-1 ring-inset',
              tone.ring,
            ].join(' ')}
          >
            <span
              className={[
                'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                tone.text,
                'bg-[color:var(--color-surface-2)]',
              ].join(' ')}
            >
              {tone.icon}
            </span>
            <span className="text-sm">{t.msg}</span>
          </div>
        )
      })}
    </div>
  )
}
