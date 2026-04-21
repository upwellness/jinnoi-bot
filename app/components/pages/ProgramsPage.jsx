'use client'
import { useState } from 'react'
import { Card, CardHeader, Chip, Button, EmptyState } from '@/app/lib/ui'
import { DayEditorForm } from '@/app/components/modals/DayEditorForm'

export function ProgramsPage({
  programs,
  groupPrograms,
  programDays,
  onOpenStartModal,
  onToggleProgram,
  onStopProgram,
  onSelectProgram,
  selectedProgram,
  onSaveDay,
}) {
  const [editingDay, setEditingDay] = useState(null)

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          icon={<span className="text-[color:var(--color-violet)]">◷</span>}
          action={
            <Button tone="primary" size="sm" onClick={onOpenStartModal}>
              + เริ่ม Program
            </Button>
          }
        >
          กลุ่มที่กำลังทำ Program
        </CardHeader>

        {groupPrograms.length === 0 ? (
          <EmptyState
            icon="◷"
            title="ยังไม่มีกลุ่มทำ Program"
            description={<>กด &quot;+ เริ่ม Program&quot; เพื่อ assign คอร์สให้กลุ่ม</>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[color:var(--color-fg-subtle)]">
                  <th className="px-5 py-3 text-left">กลุ่ม</th>
                  <th className="px-5 py-3 text-left">คอร์ส</th>
                  <th className="px-5 py-3 text-center">วันที่</th>
                  <th className="px-5 py-3 text-left">เริ่ม</th>
                  <th className="px-5 py-3 text-left">สถานะ</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--color-border)]">
                {groupPrograms.map(gp => {
                  const start = new Date(gp.start_date)
                  const today = new Date()
                  const dayNum = Math.floor((today - start) / 86400000) + 1
                  const pct = gp.program_duration
                    ? Math.min(Math.round((dayNum / gp.program_duration) * 100), 100)
                    : 0
                  return (
                    <tr key={gp.id} className="transition hover:bg-[color:var(--color-surface-2)]/40">
                      <td className="px-5 py-3 font-medium">{gp.group_name}</td>
                      <td className="px-5 py-3">
                        <div>{gp.program_name}</div>
                        <div className="mt-0.5 text-[10px] text-[color:var(--color-fg-subtle)]">
                          {gp.program_duration} วัน
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-baseline gap-1">
                            <span className="text-xl font-bold tabular-nums text-[color:var(--color-brand)]">
                              {dayNum}
                            </span>
                            <span className="text-[10px] text-[color:var(--color-fg-subtle)]">
                              / {gp.program_duration}
                            </span>
                          </div>
                          <div className="h-1 w-16 overflow-hidden rounded-full bg-[color:var(--color-surface-2)]">
                            <div
                              className="h-full rounded-full bg-[color:var(--color-brand)] transition-[width] duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 font-mono text-[11px] text-[color:var(--color-fg-subtle)]">
                        {new Date(gp.start_date).toLocaleDateString('th-TH')}
                      </td>
                      <td className="px-5 py-3">
                        {gp.paused
                          ? <Chip tone="warning">PAUSED</Chip>
                          : <Chip tone="brand">ACTIVE</Chip>}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            tone="warning"
                            onClick={() => onToggleProgram(gp.id, !gp.paused)}
                          >
                            {gp.paused ? '▶' : '⏸'}
                          </Button>
                          <Button size="sm" tone="danger" onClick={() => onStopProgram(gp.id)}>
                            ✕
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="h-fit">
          <CardHeader icon={<span className="text-[color:var(--color-violet)]">◎</span>}>
            คอร์สทั้งหมด
          </CardHeader>
          <ul className="divide-y divide-[color:var(--color-border)]">
            {programs.map(p => {
              const active = selectedProgram?.id === p.id
              return (
                <li key={p.id}>
                  <button
                    onClick={() => {
                      onSelectProgram(p)
                      setEditingDay(null)
                    }}
                    className={[
                      'w-full px-5 py-3 text-left transition',
                      active
                        ? 'bg-[color:var(--color-violet-soft)]'
                        : 'hover:bg-[color:var(--color-surface-2)]/60',
                    ].join(' ')}
                  >
                    <div
                      className={[
                        'text-sm font-semibold',
                        active ? 'text-[color:var(--color-violet)]' : '',
                      ].join(' ')}
                    >
                      {p.name}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[color:var(--color-fg-subtle)]">
                      {p.duration_days} วัน · {p.type}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </Card>

        <Card>
          {!selectedProgram ? (
            <EmptyState icon="◎" title="เลือกคอร์สเพื่อดู/แก้ไข content รายวัน" />
          ) : (
            <>
              <CardHeader
                icon={<span className="text-[color:var(--color-violet)]">◷</span>}
                action={
                  <span className="text-[11px] text-[color:var(--color-fg-subtle)]">
                    {programDays.length} วัน
                  </span>
                }
              >
                {selectedProgram.name} — Day Editor
              </CardHeader>
              <div className="scrollbar-thin max-h-[600px] overflow-y-auto">
                {programDays.length === 0 ? (
                  <EmptyState icon="📅" title="ไม่พบข้อมูลรายวัน" />
                ) : (
                  <ul className="divide-y divide-[color:var(--color-border)]">
                    {programDays.map(day => (
                      <li key={day.id} className="p-4">
                        {editingDay?.id === day.id ? (
                          <DayEditorForm
                            day={editingDay}
                            onChange={setEditingDay}
                            onSave={async () => {
                              await onSaveDay(editingDay)
                              setEditingDay(null)
                            }}
                            onCancel={() => setEditingDay(null)}
                          />
                        ) : (
                          <div className="flex items-start gap-4">
                            <div className="w-10 shrink-0 pt-0.5 font-bold text-[color:var(--color-violet)]">
                              D{day.day_number}
                            </div>
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="text-xs text-[color:var(--color-fg-muted)]">
                                🌅 {day.meal_morning?.slice(0, 70)}
                                {day.meal_morning?.length > 70 ? '…' : ''}
                              </div>
                              <div className="text-xs text-[color:var(--color-fg-subtle)]">
                                ☀️ {day.meal_afternoon?.slice(0, 70)}
                                {day.meal_afternoon?.length > 70 ? '…' : ''}
                              </div>
                            </div>
                            <Button size="sm" onClick={() => setEditingDay({ ...day })}>
                              ✎ แก้ไข
                            </Button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
