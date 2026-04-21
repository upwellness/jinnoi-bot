'use client'
import { useState } from 'react'
import { Modal, Button, Input } from '@/app/lib/ui'

const TYPES = [
  {
    key: 'customer',
    icon: '👥',
    label: 'Customer',
    sub: 'กลุ่มลูกค้า จิ้นน้อยจะตอบคำถาม',
    color: 'var(--color-info)',
    soft: 'var(--color-info-soft)',
  },
  {
    key: 'trainer',
    icon: '🎓',
    label: 'Trainer',
    sub: 'กลุ่มทีมงาน ใส่ความรู้ให้จิ้นน้อย',
    color: 'var(--color-success)',
    soft: 'var(--color-success-soft)',
  },
]

export function ApproveGroupModal({ group, onApprove, onClose }) {
  const [type, setType] = useState('customer')
  const [name, setName] = useState(group.group_name || '')

  return (
    <Modal title="Approve Group" onClose={onClose}>
      <div className="space-y-5 px-5 py-5">
        <div className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface-1)] px-3.5 py-2.5">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[color:var(--color-fg-subtle)]">
            LINE Group ID
          </div>
          <div className="break-all font-mono text-xs text-[color:var(--color-fg-muted)]">
            {group.group_id}
          </div>
        </div>

        <label className="block">
          <div className="mb-1.5 text-[11px] font-semibold tracking-wide text-[color:var(--color-fg-muted)]">
            ชื่อกลุ่ม
          </div>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="ตั้งชื่อกลุ่มนี้..."
          />
        </label>

        <div>
          <div className="mb-2 text-[11px] font-semibold tracking-wide text-[color:var(--color-fg-muted)]">
            ประเภทกลุ่ม
          </div>
          <div className="grid grid-cols-2 gap-3">
            {TYPES.map(opt => {
              const active = type === opt.key
              return (
                <button
                  key={opt.key}
                  onClick={() => setType(opt.key)}
                  className={[
                    'rounded-xl border-2 px-4 py-3 text-left transition',
                    'focus-visible:outline-none focus-visible:ring-2',
                  ].join(' ')}
                  style={{
                    borderColor: active ? opt.color : 'var(--color-border)',
                    background: active ? opt.soft : 'var(--color-surface-1)',
                  }}
                >
                  <div className="text-xl" aria-hidden>{opt.icon}</div>
                  <div
                    className="mt-2 text-sm font-bold tracking-tight"
                    style={{ color: active ? opt.color : 'inherit' }}
                  >
                    {opt.label}
                  </div>
                  <div className="mt-1 text-[11px] leading-relaxed text-[color:var(--color-fg-subtle)]">
                    {opt.sub}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-[color:var(--color-border)] px-5 py-3">
        <Button onClick={onClose}>ยกเลิก</Button>
        <Button
          tone={type === 'trainer' ? 'success' : 'info'}
          disabled={!name.trim()}
          onClick={() => onApprove(group, type, name)}
        >
          ✓ Approve as {type}
        </Button>
      </div>
    </Modal>
  )
}
