'use client'
import { Card, Chip, EmptyState } from '@/app/lib/ui'

export function GroupsPage({ groups }) {
  if (groups.length === 0) {
    return (
      <Card>
        <EmptyState
          icon="⬡"
          title="ยังไม่มีกลุ่ม"
          description="invite bot เข้า LINE group แล้ว approve ที่หน้า Group Approvals"
        />
      </Card>
    )
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[color:var(--color-fg-subtle)]">
              <th className="px-5 py-3 text-left">Name</th>
              <th className="px-5 py-3 text-left">Type</th>
              <th className="px-5 py-3 text-left">Group ID</th>
              <th className="px-5 py-3 text-left">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--color-border)]">
            {groups.map(g => (
              <tr key={g.id} className="transition hover:bg-[color:var(--color-surface-2)]/40">
                <td className="px-5 py-3 font-medium">{g.name}</td>
                <td className="px-5 py-3">
                  <Chip tone={g.type === 'trainer' ? 'success' : 'info'}>
                    {g.type.toUpperCase()}
                  </Chip>
                </td>
                <td className="px-5 py-3 font-mono text-[11px] text-[color:var(--color-fg-subtle)]">
                  {g.id.slice(0, 24)}…
                </td>
                <td className="px-5 py-3 font-mono text-[11px] text-[color:var(--color-fg-subtle)]">
                  {new Date(g.created_at).toLocaleDateString('th-TH')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
