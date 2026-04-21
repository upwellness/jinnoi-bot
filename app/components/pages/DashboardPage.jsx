'use client'
import { Card, CardHeader, Chip, Button, StatCard, EmptyState, DiscBars, DiscChip } from '@/app/lib/ui'

export function DashboardPage({
  data,
  onApproveDraft,
  onRejectDraft,
  onGoto,
}) {
  const { drafts, knowledge, groups, pendingGroups, members } = data
  const pendingDrafts = drafts.filter(d => d.status === 'pending')

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pending Groups"
          value={pendingGroups.length}
          sub="กลุ่มใหม่รอ approve"
          tone="danger"
          icon="⊕"
        />
        <StatCard
          label="Active Groups"
          value={groups.length}
          sub="ลงทะเบียนแล้ว"
          tone="brand"
          icon="⬡"
        />
        <StatCard
          label="Knowledge"
          value={knowledge.length}
          sub="entries ในระบบ"
          tone="info"
          icon="◎"
        />
        <StatCard
          label="Pending Drafts"
          value={pendingDrafts.length}
          sub="รอ approve"
          tone="warning"
          icon="✦"
        />
      </div>

      {pendingGroups.length > 0 && (
        <Card className="border-[color:var(--color-danger)]/30 bg-[color:var(--color-danger-soft)]/60">
          <div className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--color-danger)]/15 text-lg">
              🔔
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">
                มี {pendingGroups.length} กลุ่มใหม่รอ approve
              </div>
              <div className="mt-0.5 text-xs text-[color:var(--color-fg-muted)]">
                กลุ่มเหล่านี้ยังไม่สามารถรับบริการจากจิ้นน้อยได้
              </div>
            </div>
            <Button tone="danger" onClick={() => onGoto('pending')}>
              ดูและ Approve →
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            icon={<span className="text-[color:var(--color-warning)]">✦</span>}
            action={pendingDrafts.length > 0 && <Chip tone="warning">{pendingDrafts.length}</Chip>}
          >
            Drafts รอ approve
          </CardHeader>
          {pendingDrafts.length === 0 ? (
            <EmptyState icon="✦" title="ไม่มี draft รอ approve" />
          ) : (
            <ul className="divide-y divide-[color:var(--color-border)]">
              {pendingDrafts.slice(0, 3).map(d => (
                <li key={d.id} className="p-4">
                  <div className="mb-3 text-sm leading-relaxed">
                    {d.content.slice(0, 140)}
                    {d.content.length > 140 ? '…' : ''}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" tone="success" onClick={() => onApproveDraft(d)}>
                      ✓ Approve
                    </Button>
                    <Button size="sm" tone="danger" onClick={() => onRejectDraft(d.id)}>
                      ✕ Reject
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {pendingDrafts.length > 3 && (
            <div className="border-t border-[color:var(--color-border)] p-3">
              <Button size="sm" onClick={() => onGoto('drafts')}>
                ดูทั้งหมด {pendingDrafts.length} รายการ →
              </Button>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader
            icon={<span className="text-[color:var(--color-brand)]">⬡</span>}
            action={groups.length > 0 && <Chip tone="brand">{groups.length}</Chip>}
          >
            Active Groups
          </CardHeader>
          {groups.length === 0 ? (
            <EmptyState icon="⬡" title="ยังไม่มี group" />
          ) : (
            <ul className="divide-y divide-[color:var(--color-border)]">
              {groups.slice(0, 6).map(g => (
                <li key={g.id} className="flex items-center gap-3 px-5 py-3">
                  <Chip tone={g.type === 'trainer' ? 'success' : 'info'}>{g.type}</Chip>
                  <span className="truncate text-sm font-medium">{g.name}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {members.length > 0 && (
        <Card>
          <CardHeader icon={<span className="text-[color:var(--color-info)]">◉</span>}>
            Top Members by DISC
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[color:var(--color-fg-subtle)]">
                  <th className="px-5 py-3 text-left">ชื่อ</th>
                  <th className="px-5 py-3 text-left">DISC</th>
                  <th className="px-5 py-3 text-left">Scores</th>
                  <th className="px-5 py-3 text-right">MSG</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--color-border)]">
                {members.slice(0, 5).map(m => (
                  <tr key={m.id}>
                    <td className="px-5 py-3">
                      <div className="font-medium">{m.nickname || m.display_name}</div>
                      <div className="mt-0.5 text-[10px] text-[color:var(--color-fg-subtle)]">
                        {m.group_name}
                      </div>
                    </td>
                    <td className="px-5 py-3"><DiscChip type={m.disc_type} /></td>
                    <td className="min-w-[160px] px-5 py-3">
                      <DiscBars profile={m} compact />
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-sm font-semibold tabular-nums">
                      {m.message_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {members.length > 5 && (
            <div className="border-t border-[color:var(--color-border)] p-3">
              <Button size="sm" onClick={() => onGoto('members')}>
                ดูทั้งหมด {members.length} คน →
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
