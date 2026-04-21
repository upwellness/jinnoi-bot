'use client'
import { PROGRAM_DAY_FIELDS } from '@/app/lib/constants'
import { Button, Textarea } from '@/app/lib/ui'

export function DayEditorForm({ day, onChange, onSave, onCancel }) {
  return (
    <div>
      <div className="mb-4 flex items-baseline gap-3">
        <div className="text-xl font-bold text-[color:var(--color-violet)]">
          Day {day.day_number}
        </div>
        <div className="text-xs text-[color:var(--color-fg-subtle)]">
          กรอกข้อมูลสำหรับสร้างข้อความประจำวัน
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {PROGRAM_DAY_FIELDS.map(f => (
          <label key={f.key} className="block">
            <div className="mb-1.5 text-[11px] font-semibold tracking-wide text-[color:var(--color-fg-muted)]">
              <span className="mr-1">{f.icon}</span>{f.label}
            </div>
            <Textarea
              value={day[f.key] || ''}
              onChange={e => onChange({ ...day, [f.key]: e.target.value })}
              rows={3}
            />
          </label>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <Button tone="primary" size="sm" onClick={onSave}>✓ บันทึก</Button>
        <Button size="sm" onClick={onCancel}>ยกเลิก</Button>
      </div>
    </div>
  )
}
