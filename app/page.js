'use client'
import { useEffect, useState, useMemo } from 'react'
import { Sidebar } from '@/app/components/Sidebar'
import { Topbar } from '@/app/components/Topbar'
import { ToastStack } from '@/app/components/ToastStack'
import { DashboardPage } from '@/app/components/pages/DashboardPage'
import { PendingPage } from '@/app/components/pages/PendingPage'
import { GroupsPage } from '@/app/components/pages/GroupsPage'
import { DraftsPage } from '@/app/components/pages/DraftsPage'
import { KnowledgePage } from '@/app/components/pages/KnowledgePage'
import { MembersPage } from '@/app/components/pages/MembersPage'
import { ProgramsPage } from '@/app/components/pages/ProgramsPage'
import { ApproveGroupModal } from '@/app/components/modals/ApproveGroupModal'
import { StartProgramModal } from '@/app/components/modals/StartProgramModal'

async function getJson(url) {
  try {
    const res = await fetch(url)
    return await res.json()
  } catch {
    return []
  }
}

async function postJson(body) {
  return fetch('/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export default function AdminConsole() {
  const [page, setPage] = useState('dashboard')
  const [drafts, setDrafts] = useState([])
  const [knowledge, setKnowledge] = useState([])
  const [groups, setGroups] = useState([])
  const [pendingGroups, setPendingGroups] = useState([])
  const [members, setMembers] = useState([])
  const [programs, setPrograms] = useState([])
  const [groupPrograms, setGroupPrograms] = useState([])
  const [selectedProgram, setSelectedProgram] = useState(null)
  const [programDays, setProgramDays] = useState([])
  const [toasts, setToasts] = useState([])
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [approveModal, setApproveModal] = useState(null)
  const [startProgramModal, setStartProgramModal] = useState(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setRefreshing(true)
    const [d, k, g, pg, m, progs, gps] = await Promise.all([
      getJson('/api/admin?action=drafts'),
      getJson('/api/admin?action=knowledge'),
      getJson('/api/admin?action=groups'),
      getJson('/api/admin?action=pending_groups'),
      getJson('/api/admin?action=members'),
      getJson('/api/admin?action=programs'),
      getJson('/api/admin?action=group_programs'),
    ])
    setDrafts(d)
    setKnowledge(k)
    setGroups(g)
    setPendingGroups(pg)
    setMembers(m)
    setPrograms(progs)
    setGroupPrograms(gps)
    setRefreshing(false)
  }

  async function loadProgramDays(programId) {
    const days = await getJson(`/api/admin?action=program_days&program_id=${programId}`)
    setProgramDays(days)
  }

  function showToast(msg, type = 'success') {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }

  async function post(body) {
    await postJson(body)
    await fetchAll()
  }

  const counts = useMemo(() => ({
    pendingGroups: pendingGroups.length,
    groups: groups.length,
    pendingDrafts: drafts.filter(d => d.status === 'pending').length,
    knowledge: knowledge.length,
    members: members.length,
    groupPrograms: groupPrograms.length,
  }), [pendingGroups, groups, drafts, knowledge, members, groupPrograms])

  async function approveDraft(draft) {
    setLoading(true)
    await post({ action: 'approve_draft', draftId: draft.id, content: draft.content })
    showToast('อนุมัติ draft แล้ว เข้า Knowledge Base')
    setLoading(false)
  }

  async function rejectDraft(id) {
    await post({ action: 'reject_draft', draftId: id })
    showToast('ปฏิเสธ draft แล้ว', 'warn')
  }

  async function deleteKnowledge(id) {
    await post({ action: 'delete_knowledge', id })
    showToast('ลบออกจาก Knowledge Base แล้ว', 'danger')
  }

  async function approveGroup(pending, type, name) {
    await post({
      action: 'approve_group',
      pendingId: pending.id,
      groupId: pending.group_id,
      name: name || pending.group_name,
      type,
    })
    showToast(`${name} ลงทะเบียนเป็น ${type} แล้ว`)
    setApproveModal(null)
  }

  async function rejectGroup(id) {
    await post({ action: 'reject_group', pendingId: id })
    showToast('ปฏิเสธ group แล้ว', 'warn')
  }

  async function saveNickname(id, nickname) {
    await post({ action: 'update_nickname', id, nickname })
    showToast('บันทึกชื่อแล้ว')
  }

  async function startGroupProgram({ groupId, programId, startDate }) {
    await post({ action: 'start_group_program', groupId, programId, startDate })
    setStartProgramModal(null)
    showToast('เริ่ม Program แล้ว')
  }

  async function toggleGroupProgram(id, paused) {
    await post({ action: 'toggle_group_program', id, paused })
    showToast(paused ? 'หยุด Program ชั่วคราว' : 'เปิด Program แล้ว', paused ? 'warn' : 'success')
  }

  async function stopGroupProgram(id) {
    await post({ action: 'stop_group_program', id })
    showToast('หยุด Program และลบออกแล้ว', 'danger')
  }

  async function saveDay(day) {
    await post({ action: 'update_program_day', ...day })
    await loadProgramDays(day.program_id)
    showToast(`บันทึก Day ${day.day_number} แล้ว`)
  }

  return (
    <div className="min-h-screen">
      <Sidebar
        page={page}
        onSelect={setPage}
        counts={counts}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(v => !v)}
      />

      <div
        className={[
          'flex min-h-screen flex-col transition-[margin] duration-200',
          sidebarCollapsed ? 'ml-16' : 'ml-60',
        ].join(' ')}
      >
        <Topbar page={page} refreshing={refreshing} onRefresh={fetchAll} />

        <main className="flex-1 px-6 py-6 animate-fade-up">
          {page === 'dashboard' && (
            <DashboardPage
              data={{ drafts, knowledge, groups, pendingGroups, members }}
              onApproveDraft={approveDraft}
              onRejectDraft={rejectDraft}
              onGoto={setPage}
            />
          )}

          {page === 'pending' && (
            <PendingPage
              pendingGroups={pendingGroups}
              onApprove={setApproveModal}
              onReject={rejectGroup}
            />
          )}

          {page === 'groups' && <GroupsPage groups={groups} />}

          {page === 'drafts' && (
            <DraftsPage
              drafts={drafts}
              loading={loading}
              onApprove={approveDraft}
              onReject={rejectDraft}
            />
          )}

          {page === 'knowledge' && (
            <KnowledgePage knowledge={knowledge} onDelete={deleteKnowledge} />
          )}

          {page === 'members' && (
            <MembersPage members={members} onSaveNickname={saveNickname} />
          )}

          {page === 'programs' && (
            <ProgramsPage
              programs={programs}
              groupPrograms={groupPrograms}
              programDays={programDays}
              selectedProgram={selectedProgram}
              onOpenStartModal={() => setStartProgramModal({})}
              onToggleProgram={toggleGroupProgram}
              onStopProgram={stopGroupProgram}
              onSelectProgram={p => {
                setSelectedProgram(p)
                loadProgramDays(p.id)
              }}
              onSaveDay={saveDay}
            />
          )}
        </main>
      </div>

      {approveModal && (
        <ApproveGroupModal
          group={approveModal}
          onApprove={approveGroup}
          onClose={() => setApproveModal(null)}
        />
      )}

      {startProgramModal && (
        <StartProgramModal
          groups={groups}
          programs={programs}
          onStart={startGroupProgram}
          onClose={() => setStartProgramModal(null)}
        />
      )}

      <ToastStack toasts={toasts} />
    </div>
  )
}
