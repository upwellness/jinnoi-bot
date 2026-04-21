'use client'
import { useState } from 'react'
import { Card, CardHeader, Chip, Button, Input, EmptyState, DiscBars, DiscChip } from '@/app/lib/ui'

export function MembersPage({ members, onSaveNickname }) {
  const [editing, setEditing] = useState(null)

  if (members.length === 0) {
    return (
      <Card>
        <EmptyState
          icon="◉"
          title="ยังไม่มีสมาชิก"
          description={<>สมาชิกจะถูกบันทึกอัตโนมัติ<br />เมื่อส่งข้อความในกลุ่ม customer</>}
        />
      </Card>
    )
  }

  const grouped = members.reduce((acc, m) => {
    const key = m.group_name || m.group_id
    if (!acc[key]) acc[key] = []
    acc[key].push(m)
    return acc
  }, {})

  async function save(id, value) {
    await onSaveNickname(id, value)
    setEditing(null)
  }

  return (
    <div className="space-y-5">
      {Object.entries(grouped).map(([groupName, groupMembers]) => (
        <Card key={groupName}>
          <CardHeader
            action={
              <span className="font-mono text-[11px] text-[color:var(--color-fg-subtle)]">
                {groupMembers.length} สมาชิก
              </span>
            }
          >
            <div className="flex items-center gap-2">
              <Chip tone="info">CUSTOMER</Chip>
              <span className="font-bold">{groupName}</span>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[color:var(--color-fg-subtle)]">
                  <th className="px-5 py-3 text-left">ชื่อ LINE</th>
                  <th className="px-5 py-3 text-left">Nickname</th>
                  <th className="px-5 py-3 text-left">DISC</th>
                  <th className="px-5 py-3 text-left">Scores</th>
                  <th className="px-5 py-3 text-center">MSG</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--color-border)]">
                {groupMembers.map(m => {
                  const isEditing = editing?.id === m.id
                  return (
                    <tr key={m.id} className="transition hover:bg-[color:var(--color-surface-2)]/40">
                      <td className="px-5 py-3">
                        <div className="font-medium">{m.display_name}</div>
                        <div className="mt-0.5 font-mono text-[10px] text-[color:var(--color-fg-subtle)]">
                          {m.line_user_id.slice(0, 16)}…
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <Input
                              autoFocus
                              value={editing.value}
                              onChange={e => setEditing({ ...editing, value: e.target.value })}
                              onKeyDown={e => {
                                if (e.key === 'Enter') save(m.id, editing.value)
                                if (e.key === 'Escape') setEditing(null)
                              }}
                              className="w-40 py-1.5 text-sm"
                            />
                            <Button size="sm" tone="success" onClick={() => save(m.id, editing.value)}>
                              ✓
                            </Button>
                            <Button size="sm" onClick={() => setEditing(null)}>✕</Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span
                              className={[
                                'text-sm',
                                m.nickname !== m.display_name
                                  ? 'font-semibold text-[color:var(--color-brand)]'
                                  : '',
                              ].join(' ')}
                            >
                              {m.nickname}
                            </span>
                            <Button
                              size="sm"
                              onClick={() => setEditing({ id: m.id, value: m.nickname })}
                              className="!px-2 !py-1"
                            >
                              ✎
                            </Button>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <DiscChip type={m.disc_type} size="lg" />
                      </td>
                      <td className="min-w-[200px] px-5 py-3">
                        <DiscBars profile={m} />
                      </td>
                      <td className="px-5 py-3 text-center font-mono text-sm font-semibold tabular-nums">
                        {m.message_count}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  )
}
