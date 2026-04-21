'use client'
import { Card, Button, EmptyState } from '@/app/lib/ui'

export function KnowledgePage({ knowledge, onDelete }) {
  if (knowledge.length === 0) {
    return (
      <Card>
        <EmptyState icon="📚" title="ยังไม่มี knowledge" description="approve draft เพื่อเพิ่มข้อมูล" />
      </Card>
    )
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[color:var(--color-fg-subtle)]">
              <th className="w-24 px-5 py-3 text-left">ID</th>
              <th className="px-5 py-3 text-left">Content</th>
              <th className="w-32 px-5 py-3 text-left">Created</th>
              <th className="w-20 px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--color-border)]">
            {knowledge.map(k => (
              <tr key={k.id} className="transition hover:bg-[color:var(--color-surface-2)]/40">
                <td className="px-5 py-3 font-mono text-[11px] text-[color:var(--color-fg-subtle)]">
                  #{String(k.id).slice(0, 8)}
                </td>
                <td className="px-5 py-3 leading-relaxed">
                  {k.content.slice(0, 160)}{k.content.length > 160 ? '…' : ''}
                </td>
                <td className="px-5 py-3 font-mono text-[11px] text-[color:var(--color-fg-subtle)] whitespace-nowrap">
                  {new Date(k.created_at).toLocaleDateString('th-TH')}
                </td>
                <td className="px-5 py-3 text-right">
                  <Button size="sm" tone="danger" onClick={() => onDelete(k.id)}>
                    ลบ
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
