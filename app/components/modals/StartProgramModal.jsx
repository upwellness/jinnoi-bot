'use client'
import { useState } from 'react'
import { Modal, Button, Input, Select } from '@/app/lib/ui'

export function StartProgramModal({ groups, programs, onStart, onClose }) {
  const [groupId, setGroupId] = useState('')
  const [programId, setProgramId] = useState('')
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0])

  return (
    <Modal title="เริ่ม Daily Program" onClose={onClose}>
      <div className="space-y-4 px-5 py-5">
        <label className="block">
          <div className="mb-1.5 text-[11px] font-semibold tracking-wide text-[color:var(--color-fg-muted)]">
            เลือกกลุ่ม
          </div>
          <Select value={groupId} onChange={e => setGroupId(e.target.value)}>
            <option value="">— เลือกกลุ่ม —</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </Select>
        </label>

        <label className="block">
          <div className="mb-1.5 text-[11px] font-semibold tracking-wide text-[color:var(--color-fg-muted)]">
            เลือกคอร์ส
          </div>
          <Select value={programId} onChange={e => setProgramId(e.target.value)}>
            <option value="">— เลือกคอร์ส —</option>
            {programs.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.duration_days} วัน)
              </option>
            ))}
          </Select>
        </label>

        <label className="block">
          <div className="mb-1.5 text-[11px] font-semibold tracking-wide text-[color:var(--color-fg-muted)]">
            วันเริ่มต้น
          </div>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </label>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-[color:var(--color-border)] px-5 py-3">
        <Button onClick={onClose}>ยกเลิก</Button>
        <Button
          tone="primary"
          disabled={!groupId || !programId || !startDate}
          onClick={() => onStart({ groupId, programId, startDate })}
        >
          ✓ เริ่ม Program
        </Button>
      </div>
    </Modal>
  )
}
