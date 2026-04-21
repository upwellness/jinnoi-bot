'use client'
import { Card, Button, EmptyState } from '@/app/lib/ui'

export function PendingPage({ pendingGroups, onApprove, onReject }) {
  if (pendingGroups.length === 0) {
    return (
      <Card>
        <EmptyState
          icon="✅"
          title="ไม่มี group รอ approve"
          description={<>เมื่อมี group ใหม่เพิ่ม bot เข้า LINE<br />จะปรากฏที่นี่เพื่อให้คุณ approve</>}
        />
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {pendingGroups.map(pg => (
        <Card key={pg.id} className="relative overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-1 bg-[color:var(--color-danger)]" />
          <div className="flex items-start gap-4 p-5 pl-6">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color:var(--color-danger-soft)] text-xl">
              ⬡
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-semibold tracking-tight">
                {pg.group_name || 'Unknown Group'}
              </div>
              <div className="mt-1 font-mono text-[11px] text-[color:var(--color-fg-subtle)] break-all">
                {pg.group_id}
              </div>
              <div className="mt-2 text-[11px] text-[color:var(--color-fg-muted)]">
                📅 พบเมื่อ {new Date(pg.created_at).toLocaleString('th-TH')}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button tone="success" onClick={() => onApprove(pg)}>
                  ✓ Approve Group
                </Button>
                <Button tone="danger" onClick={() => onReject(pg.id)}>
                  ✕ Reject
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
