'use client'
import { Card, Chip, Button, EmptyState } from '@/app/lib/ui'

const STATUS_TONE = { pending: 'warning', approved: 'success', rejected: 'neutral' }

export function DraftsPage({ drafts, loading, onApprove, onReject }) {
  if (drafts.length === 0) {
    return (
      <Card>
        <EmptyState
          icon="📭"
          title="ยังไม่มี draft"
          description="ให้ trainer พิมพ์ข้อความใน LINE group"
        />
      </Card>
    )
  }

  return (
    <Card>
      <ul className="divide-y divide-[color:var(--color-border)]">
        {drafts.map(d => (
          <li key={d.id} className="p-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Chip tone={STATUS_TONE[d.status] || 'neutral'}>{d.status.toUpperCase()}</Chip>
              <span className="font-mono text-[11px] text-[color:var(--color-fg-subtle)]">
                #{String(d.id).slice(0, 8)} · {new Date(d.created_at).toLocaleString('th-TH')}
              </span>
            </div>
            <div className="mb-3 text-sm leading-relaxed">{d.content}</div>
            {d.status === 'pending' && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" tone="success" onClick={() => onApprove(d)} disabled={loading}>
                  ✓ Approve → Knowledge
                </Button>
                <Button size="sm" tone="danger" onClick={() => onReject(d.id)}>
                  ✕ Reject
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Card>
  )
}
