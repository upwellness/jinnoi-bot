'use client'
import { useState, useEffect } from 'react'

const FONT_URL = 'https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap'

const css = `
  @import url('${FONT_URL}');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #060810;
    --bg1: #0c0f1a;
    --bg2: #111520;
    --bg3: #171b28;
    --border: rgba(255,255,255,0.06);
    --border2: rgba(255,255,255,0.1);
    --text: #e8edf5;
    --text2: #7a8499;
    --text3: #4a5166;
    --teal: #00d4aa;
    --teal-dim: rgba(0,212,170,0.12);
    --teal-glow: rgba(0,212,170,0.25);
    --amber: #f59e0b;
    --amber-dim: rgba(245,158,11,0.12);
    --rose: #f43f5e;
    --rose-dim: rgba(244,63,94,0.12);
    --blue: #3b82f6;
    --blue-dim: rgba(59,130,246,0.12);
    --purple: #a855f7;
    --purple-dim: rgba(168,85,247,0.12);
    --green: #22c55e;
    --green-dim: rgba(34,197,94,0.12);
    --radius: 14px;
    --radius-sm: 8px;
    --font: 'DM Sans', sans-serif;
    --font-display: 'Syne', sans-serif;
  }
  html, body { height: 100%; background: var(--bg); color: var(--text); font-family: var(--font); }

  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 4px; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes shimmer {
    from { background-position: -200% center; }
    to { background-position: 200% center; }
  }
  @keyframes pulse-ring {
    0% { box-shadow: 0 0 0 0 var(--teal-glow); }
    70% { box-shadow: 0 0 0 8px transparent; }
    100% { box-shadow: 0 0 0 0 transparent; }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .anim-up { animation: fadeUp 0.4s ease both; }
  .anim-up-1 { animation: fadeUp 0.4s 0.05s ease both; }
  .anim-up-2 { animation: fadeUp 0.4s 0.1s ease both; }
  .anim-up-3 { animation: fadeUp 0.4s 0.15s ease both; }
  .anim-up-4 { animation: fadeUp 0.4s 0.2s ease both; }

  .stat-card {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 22px 24px;
    position: relative;
    overflow: hidden;
    transition: border-color 0.2s, transform 0.2s;
  }
  .stat-card:hover { border-color: var(--border2); transform: translateY(-2px); }
  .stat-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    border-radius: var(--radius) var(--radius) 0 0;
  }
  .stat-card.teal::before { background: linear-gradient(90deg, transparent, var(--teal), transparent); }
  .stat-card.amber::before { background: linear-gradient(90deg, transparent, var(--amber), transparent); }
  .stat-card.rose::before { background: linear-gradient(90deg, transparent, var(--rose), transparent); }
  .stat-card.blue::before { background: linear-gradient(90deg, transparent, var(--blue), transparent); }

  .card {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    margin-bottom: 16px;
    transition: border-color 0.2s;
  }
  .card:hover { border-color: var(--border2); }

  .card-header {
    display: flex; align-items: center; gap: 10px;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
    font-size: 13px; font-weight: 600;
    font-family: var(--font-display);
    letter-spacing: 0.01em;
  }

  .nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 12px; border-radius: var(--radius-sm);
    cursor: pointer; font-size: 13px; font-weight: 500;
    color: var(--text2); transition: all 0.15s;
    margin-bottom: 2px; position: relative;
    font-family: var(--font);
  }
  .nav-item:hover { color: var(--text); background: rgba(255,255,255,0.04); }
  .nav-item.active { color: var(--teal); background: var(--teal-dim); }
  .nav-item.active::before {
    content: '';
    position: absolute; left: 0; top: 20%; bottom: 20%;
    width: 2px; border-radius: 2px;
    background: var(--teal);
  }

  .btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 16px; border-radius: var(--radius-sm);
    font-size: 12px; font-weight: 500; cursor: pointer;
    font-family: var(--font); border: none;
    transition: all 0.15s; white-space: nowrap;
  }
  .btn:active { transform: scale(0.97); }
  .btn-primary { background: var(--teal); color: #000; }
  .btn-primary:hover { background: #00bfa0; }
  .btn-ghost { background: rgba(255,255,255,0.05); color: var(--text2); border: 1px solid var(--border2); }
  .btn-ghost:hover { background: rgba(255,255,255,0.08); color: var(--text); }
  .btn-success { background: var(--green-dim); color: var(--green); border: 1px solid rgba(34,197,94,0.25); }
  .btn-success:hover { background: rgba(34,197,94,0.2); }
  .btn-danger { background: var(--rose-dim); color: var(--rose); border: 1px solid rgba(244,63,94,0.25); }
  .btn-danger:hover { background: rgba(244,63,94,0.2); }
  .btn-info { background: var(--blue-dim); color: var(--blue); border: 1px solid rgba(59,130,246,0.25); }
  .btn-info:hover { background: rgba(59,130,246,0.2); }
  .btn-warn { background: var(--amber-dim); color: var(--amber); border: 1px solid rgba(245,158,11,0.25); }
  .btn-warn:hover { background: rgba(245,158,11,0.2); }
  .btn-sm { padding: 5px 10px; font-size: 11px; }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .badge {
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 18px; height: 18px; padding: 0 5px;
    border-radius: 20px; font-size: 10px; font-weight: 700;
    font-family: var(--font-display);
  }
  .badge-rose { background: var(--rose); color: #fff; }
  .badge-teal { background: var(--teal); color: #000; }
  .badge-blue { background: var(--blue); color: #fff; }
  .badge-amber { background: var(--amber); color: #000; }

  .chip {
    display: inline-flex; align-items: center;
    padding: 3px 10px; border-radius: 20px;
    font-size: 11px; font-weight: 600; letter-spacing: 0.03em;
    font-family: var(--font-display);
  }
  .chip-teal { background: var(--teal-dim); color: var(--teal); border: 1px solid rgba(0,212,170,0.2); }
  .chip-blue { background: var(--blue-dim); color: var(--blue); border: 1px solid rgba(59,130,246,0.2); }
  .chip-green { background: var(--green-dim); color: var(--green); border: 1px solid rgba(34,197,94,0.2); }
  .chip-amber { background: var(--amber-dim); color: var(--amber); border: 1px solid rgba(245,158,11,0.2); }
  .chip-rose { background: var(--rose-dim); color: var(--rose); border: 1px solid rgba(244,63,94,0.2); }
  .chip-neutral { background: rgba(255,255,255,0.05); color: var(--text2); border: 1px solid var(--border); }
  .chip-purple { background: var(--purple-dim); color: var(--purple); border: 1px solid rgba(168,85,247,0.2); }

  .table { width: 100%; border-collapse: collapse; }
  .table th {
    text-align: left; font-size: 10px; color: var(--text3);
    letter-spacing: 0.1em; padding: 12px 20px;
    border-bottom: 1px solid var(--border);
    font-weight: 500; text-transform: uppercase;
    font-family: var(--font-display);
  }
  .table td { padding: 13px 20px; font-size: 13px; border-bottom: 1px solid var(--border); vertical-align: middle; }
  .table tr:last-child td { border-bottom: none; }
  .table tbody tr { transition: background 0.1s; }
  .table tbody tr:hover { background: rgba(255,255,255,0.02); }

  .input {
    background: var(--bg3); border: 1px solid var(--border2);
    border-radius: var(--radius-sm); padding: 9px 14px;
    color: var(--text); font-size: 13px; font-family: var(--font);
    outline: none; transition: border-color 0.15s;
  }
  .input:focus { border-color: var(--teal); }
  .input::placeholder { color: var(--text3); }

  .empty-state { text-align: center; padding: 56px 20px; color: var(--text3); }
  .empty-icon { font-size: 36px; margin-bottom: 14px; opacity: 0.5; }
  .empty-title { font-size: 14px; font-weight: 600; color: var(--text2); margin-bottom: 6px; font-family: var(--font-display); }
  .empty-sub { font-size: 12px; line-height: 1.7; }

  .draft-item {
    padding: 18px 20px;
    border-bottom: 1px solid var(--border);
    transition: background 0.1s;
  }
  .draft-item:last-child { border-bottom: none; }
  .draft-item:hover { background: rgba(255,255,255,0.02); }

  .overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.8);
    backdrop-filter: blur(4px); z-index: 200;
    display: flex; align-items: center; justify-content: center;
    animation: fadeIn 0.15s ease;
  }
  .modal {
    background: var(--bg2); border: 1px solid var(--border2);
    border-radius: 18px; width: 480px; overflow: hidden;
    animation: fadeUp 0.2s ease;
  }

  .toast-container {
    position: fixed; bottom: 24px; right: 24px; z-index: 999;
    display: flex; flex-direction: column; gap: 8px; align-items: flex-end;
  }
  .toast {
    background: var(--bg2); border: 1px solid var(--border2);
    border-radius: var(--radius-sm); padding: 12px 18px;
    font-size: 13px; display: flex; align-items: center; gap: 8px;
    animation: fadeUp 0.2s ease;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  }

  .disc-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }
  .disc-bar-track { flex: 1; height: 5px; background: var(--bg3); border-radius: 4px; overflow: hidden; }
  .disc-bar-fill { height: 100%; border-radius: 4px; transition: width 0.5s cubic-bezier(0.34,1.56,0.64,1); }
  .disc-label { font-size: 10px; font-weight: 700; width: 12px; font-family: var(--font-display); }
  .disc-score { font-size: 10px; color: var(--text3); width: 18px; text-align: right; font-variant-numeric: tabular-nums; }

  .refresh-icon { display: inline-block; }
  .refreshing .refresh-icon { animation: spin 0.8s linear infinite; }

  .bg-mesh {
    position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background:
      radial-gradient(ellipse 60% 40% at 10% 20%, rgba(0,212,170,0.04) 0%, transparent 60%),
      radial-gradient(ellipse 50% 50% at 90% 80%, rgba(59,130,246,0.03) 0%, transparent 60%),
      radial-gradient(ellipse 40% 40% at 50% 50%, rgba(168,85,247,0.02) 0%, transparent 60%);
  }

  .logo-ring {
    width: 34px; height: 34px;
    background: linear-gradient(135deg, #00d4aa, #0099cc);
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 17px;
    box-shadow: 0 0 16px rgba(0,212,170,0.3);
  }

  .sidebar-divider {
    height: 1px; background: var(--border);
    margin: 12px 16px;
  }
  .nav-section-label {
    font-size: 9px; color: var(--text3); letter-spacing: 0.15em;
    text-transform: uppercase; padding: 0 12px; margin-bottom: 6px;
    font-family: var(--font-display); font-weight: 600;
  }

  .topbar-pill {
    display: flex; align-items: center; gap: 6px;
    background: var(--bg2); border: 1px solid var(--border);
    border-radius: 20px; padding: 6px 14px 6px 10px; font-size: 11px; color: var(--text3);
  }
  .status-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--teal);
    animation: pulse-ring 2s infinite;
  }

  .page-wrapper { display: flex; min-height: 100vh; position: relative; z-index: 1; }
  .sidebar {
    width: 224px; min-width: 224px; background: var(--bg1);
    border-right: 1px solid var(--border); height: 100vh;
    position: fixed; display: flex; flex-direction: column;
    padding: 0;
  }
  .main { margin-left: 224px; flex: 1; display: flex; flex-direction: column; }
  .topbar {
    background: rgba(6,8,16,0.8); backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border);
    padding: 14px 28px; display: flex; align-items: center; gap: 16px;
    position: sticky; top: 0; z-index: 50;
  }
  .content { padding: 24px 28px; }
  .stats-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; margin-bottom: 24px; }

  @media (max-width: 1100px) { .stats-grid { grid-template-columns: repeat(2,1fr); } }
`

const DISC_COLORS = { D: '#f43f5e', I: '#f59e0b', S: '#22c55e', C: '#3b82f6' }

export default function Dashboard() {
  const [page, setPage] = useState('dashboard')
  const [drafts, setDrafts] = useState([])
  const [knowledge, setKnowledge] = useState([])
  const [groups, setGroups] = useState([])
  const [pendingGroups, setPendingGroups] = useState([])
  const [members, setMembers] = useState([])
  const [reviewQueue, setReviewQueue] = useState([])
  const [toasts, setToasts] = useState([])
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [approveModal, setApproveModal] = useState(null)
  const [editingNickname, setEditingNickname] = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setRefreshing(true)
    const [d, k, g, pg, m, rq] = await Promise.all([
      fetch('/api/admin?action=drafts').then(r => r.json()).catch(() => []),
      fetch('/api/admin?action=knowledge').then(r => r.json()).catch(() => []),
      fetch('/api/admin?action=groups').then(r => r.json()).catch(() => []),
      fetch('/api/admin?action=pending_groups').then(r => r.json()).catch(() => []),
      fetch('/api/admin?action=members').then(r => r.json()).catch(() => []),
      fetch('/api/admin?action=review_queue').then(r => r.json()).catch(() => []),
    ])
    setDrafts(d || [])
    setKnowledge(k || [])
    setGroups(g || [])
    setPendingGroups(pg || [])
    setMembers(m || [])
    setReviewQueue(rq || [])
    setRefreshing(false)
  }

  function showToast(msg, type = 'success') {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }

  async function post(body) {
    await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    fetchAll()
  }

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
    await post({ action: 'approve_group', pendingId: pending.id, groupId: pending.group_id, name: name || pending.group_name, type })
    showToast(`${name} ลงทะเบียนเป็น ${type} แล้ว`)
    setApproveModal(null)
  }

  async function rejectGroup(id) {
    await post({ action: 'reject_group', pendingId: id })
    showToast('ปฏิเสธ group แล้ว', 'warn')
  }

  async function saveNickname(id, nickname) {
    await post({ action: 'update_nickname', id, nickname })
    setEditingNickname(null)
    showToast('บันทึกชื่อแล้ว')
  }

  async function approveReview(item) {
    await post({ action: 'approve_review', id: item.id, groupId: item.group_id, reply: item.suggested_reply })
    showToast('ส่งคำตอบแล้ว')
  }

  async function rejectReview(id) {
    await post({ action: 'reject_review', id })
    showToast('ปฏิเสธแล้ว', 'warn')
  }

  const pendingDrafts = drafts.filter(d => d.status === 'pending')

  const navItems = [
    { id: 'dashboard', icon: '◈', label: 'Dashboard', section: 'OVERVIEW' },
    { id: 'pending', icon: '⊕', label: 'Group Approvals', badge: pendingGroups.length, badgeColor: 'rose', section: null },
    { id: 'groups', icon: '⬡', label: 'Groups', badge: groups.length, badgeColor: 'teal', section: null },
    { id: 'drafts', icon: '✦', label: 'Trainer Drafts', badge: pendingDrafts.length, badgeColor: 'amber', section: 'CONTENT' },
    { id: 'knowledge', icon: '◎', label: 'Knowledge Base', badge: knowledge.length, badgeColor: 'blue', section: null },
    { id: 'members', icon: '◉', label: 'Members & DISC', badge: members.length, badgeColor: 'blue', section: 'CONFIG' },
  ]

  const pageInfo = {
    dashboard: { title: 'Dashboard', sub: 'ภาพรวมระบบ LINE Knowledge Bot' },
    pending: { title: 'Group Approvals', sub: `${pendingGroups.length} กลุ่มรอ approve` },
    drafts: { title: 'Trainer Drafts', sub: `${pendingDrafts.length} รายการรอ approve` },
    knowledge: { title: 'Knowledge Base', sub: `${knowledge.length} รายการทั้งหมด` },
    groups: { title: 'Groups', sub: `${groups.length} กลุ่มที่ลงทะเบียน` },
    members: { title: 'Members & DISC', sub: `${members.length} สมาชิกในระบบ` },
  }

  let sectionShown = {}

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="bg-mesh" />
      <div className="page-wrapper">

        {/* SIDEBAR */}
        <nav className="sidebar">
          <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="logo-ring">🌸</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}>จิ้นน้อย</div>
                <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--font-display)', letterSpacing: '0.12em', marginTop: 1 }}>ADMIN CONSOLE</div>
              </div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px' }}>
            {navItems.map((item, i) => {
              const showSection = item.section && !sectionShown[item.section]
              if (item.section) sectionShown[item.section] = true
              return (
                <div key={item.id}>
                  {showSection && (
                    <div style={{ paddingTop: i > 0 ? 10 : 4 }}>
                      <div className="nav-section-label">{item.section}</div>
                    </div>
                  )}
                  <div className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => setPage(item.id)}>
                    <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{item.icon}</span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.badge > 0 && (
                      <span className={`badge badge-${item.badgeColor}`}>{item.badge}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>
              Vercel · Supabase · Gemini 2.5
            </div>
          </div>
        </nav>

        {/* MAIN */}
        <main className="main">
          <div className="topbar">
            <div>
              <div style={{ fontWeight: 700, fontSize: 20, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>{pageInfo[page]?.title}</div>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{pageInfo[page]?.sub}</div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
              <div className="topbar-pill">
                <div className="status-dot" />
                <span>Live</span>
              </div>
              <button className={`btn btn-ghost ${refreshing ? 'refreshing' : ''}`} onClick={fetchAll}>
                <span className="refresh-icon">⟳</span> Refresh
              </button>
            </div>
          </div>

          <div className="content">

            {/* ===== DASHBOARD ===== */}
            {page === 'dashboard' && (
              <div>
                <div className="stats-grid">
                  {[
                    { label: 'PENDING GROUPS', value: pendingGroups.length, sub: 'รอ approve', color: 'rose', icon: '⊕' },
                    { label: 'ACTIVE GROUPS', value: groups.length, sub: 'ลงทะเบียนแล้ว', color: 'teal', icon: '⬡' },
                    { label: 'KNOWLEDGE', value: knowledge.length, sub: 'entries ในระบบ', color: 'blue', icon: '◎' },
                    { label: 'PENDING DRAFTS', value: pendingDrafts.length, sub: 'รอ approve', color: 'amber', icon: '✦' },
                  ].map((s, i) => (
                    <div key={s.label} className={`stat-card ${s.color} anim-up-${i + 1}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                        <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', fontWeight: 600 }}>{s.label}</div>
                        <div style={{ fontSize: 18, opacity: 0.3 }}>{s.icon}</div>
                      </div>
                      <div style={{ fontSize: 36, fontWeight: 800, fontFamily: 'var(--font-display)', letterSpacing: '-0.03em', lineHeight: 1 }}>{s.value}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>{s.sub}</div>
                    </div>
                  ))}
                </div>

                {pendingGroups.length > 0 && (
                  <div className="anim-up-1" style={{
                    background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.2)',
                    borderRadius: 'var(--radius)', padding: '16px 20px', marginBottom: 20,
                    display: 'flex', alignItems: 'center', gap: 14
                  }}>
                    <div style={{ width: 36, height: 36, background: 'rgba(244,63,94,0.12)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🔔</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, fontFamily: 'var(--font-display)', marginBottom: 2 }}>มี {pendingGroups.length} กลุ่มใหม่รอ approve</div>
                      <div style={{ fontSize: 11, color: 'var(--text2)' }}>กลุ่มเหล่านี้ยังไม่สามารถรับบริการจากจิ้นน้อยได้</div>
                    </div>
                    <button className="btn btn-danger" style={{ marginLeft: 'auto' }} onClick={() => setPage('pending')}>ดูและ Approve →</button>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="card anim-up-2">
                    <div className="card-header">
                      <span style={{ color: 'var(--amber)' }}>✦</span> Drafts รอ approve
                      {pendingDrafts.length > 0 && <span className="badge badge-amber" style={{ marginLeft: 'auto' }}>{pendingDrafts.length}</span>}
                    </div>
                    {pendingDrafts.length === 0
                      ? <div className="empty-state"><div className="empty-icon">✦</div><div className="empty-title">ไม่มี draft รอ approve</div></div>
                      : pendingDrafts.slice(0, 3).map(d => (
                        <div key={d.id} className="draft-item">
                          <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--text)', marginBottom: 10 }}>{d.content.slice(0, 100)}{d.content.length > 100 ? '…' : ''}</div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-success btn-sm" onClick={() => approveDraft(d)}>✓ Approve</button>
                            <button className="btn btn-danger btn-sm" onClick={() => rejectDraft(d.id)}>✕ Reject</button>
                          </div>
                        </div>
                      ))
                    }
                    {pendingDrafts.length > 3 && (
                      <div style={{ padding: '12px 20px' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setPage('drafts')}>ดูทั้งหมด {pendingDrafts.length} รายการ →</button>
                      </div>
                    )}
                  </div>

                  <div className="card anim-up-3">
                    <div className="card-header">
                      <span style={{ color: 'var(--teal)' }}>⬡</span> Groups ที่ active
                      {groups.length > 0 && <span className="chip chip-teal" style={{ marginLeft: 'auto', fontSize: 10 }}>{groups.length}</span>}
                    </div>
                    {groups.length === 0
                      ? <div className="empty-state"><div className="empty-icon">⬡</div><div className="empty-title">ยังไม่มี group</div></div>
                      : groups.slice(0, 6).map(g => (
                        <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', borderBottom: '1px solid var(--border)' }}>
                          <span className={`chip ${g.type === 'trainer' ? 'chip-green' : 'chip-blue'}`}>{g.type}</span>
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{g.name}</span>
                        </div>
                      ))
                    }
                  </div>
                </div>

                {/* Members summary */}
                {members.length > 0 && (
                  <div className="card anim-up-4" style={{ marginTop: 16 }}>
                    <div className="card-header">
                      <span style={{ color: 'var(--blue)' }}>◉</span> Top Members by DISC
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>ชื่อ</th>
                            <th>DISC</th>
                            <th>DISC SCORES</th>
                            <th>MSG</th>
                          </tr>
                        </thead>
                        <tbody>
                          {members.slice(0, 5).map(m => {
                            const maxScore = Math.max(m.disc_d, m.disc_i, m.disc_s, m.disc_c, 1)
                            return (
                              <tr key={m.id}>
                                <td>
                                  <div style={{ fontWeight: 500, fontSize: 13 }}>{m.nickname || m.display_name}</div>
                                  <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{m.group_name}</div>
                                </td>
                                <td>
                                  {m.disc_type
                                    ? <span className="chip" style={{ background: `${DISC_COLORS[m.disc_type]}18`, color: DISC_COLORS[m.disc_type], border: `1px solid ${DISC_COLORS[m.disc_type]}30`, fontSize: 13, fontWeight: 800, padding: '4px 14px' }}>{m.disc_type}</span>
                                    : <span style={{ fontSize: 11, color: 'var(--text3)' }}>—</span>
                                  }
                                </td>
                                <td style={{ minWidth: 160 }}>
                                  {['D', 'I', 'S', 'C'].map(dim => {
                                    const score = m[`disc_${dim.toLowerCase()}`] || 0
                                    return (
                                      <div key={dim} className="disc-bar">
                                        <span className="disc-label" style={{ color: DISC_COLORS[dim] }}>{dim}</span>
                                        <div className="disc-bar-track">
                                          <div className="disc-bar-fill" style={{ width: `${Math.round((score / maxScore) * 100)}%`, background: DISC_COLORS[dim] }} />
                                        </div>
                                        <span className="disc-score">{score}</span>
                                      </div>
                                    )
                                  })}
                                </td>
                                <td style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600 }}>{m.message_count}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    {members.length > 5 && (
                      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setPage('members')}>ดูทั้งหมด {members.length} คน →</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ===== PENDING GROUPS ===== */}
            {page === 'pending' && (
              <div className="anim-up">
                {pendingGroups.length === 0
                  ? (
                    <div className="card">
                      <div className="empty-state">
                        <div className="empty-icon">✅</div>
                        <div className="empty-title">ไม่มี group รอ approve</div>
                        <div className="empty-sub">เมื่อมี group ใหม่เพิ่ม bot เข้า LINE<br />จะปรากฏที่นี่เพื่อให้คุณ approve</div>
                      </div>
                    </div>
                  )
                  : pendingGroups.map(pg => (
                    <div key={pg.id} className="card" style={{ borderLeft: '3px solid var(--rose)' }}>
                      <div style={{ padding: '20px 22px', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                        <div style={{ width: 44, height: 44, background: 'var(--rose-dim)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>⬡</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 15, fontFamily: 'var(--font-display)', marginBottom: 4 }}>{pg.group_name || 'Unknown Group'}</div>
                          <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>{pg.group_id}</div>
                          <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 14 }}>📅 พบเมื่อ {new Date(pg.created_at).toLocaleString('th-TH')}</div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-success" onClick={() => setApproveModal(pg)}>✓ Approve Group</button>
                            <button className="btn btn-danger" onClick={() => rejectGroup(pg.id)}>✕ Reject</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}

            {/* ===== DRAFTS ===== */}
            {page === 'drafts' && (
              <div className="anim-up">
                {drafts.length === 0
                  ? <div className="card"><div className="empty-state"><div className="empty-icon">📭</div><div className="empty-title">ยังไม่มี draft</div><div className="empty-sub">ให้ trainer พิมพ์ข้อความใน LINE group</div></div></div>
                  : (
                    <div className="card">
                      {drafts.map(d => (
                        <div key={d.id} className="draft-item">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                            <span className={`chip ${d.status === 'pending' ? 'chip-amber' : d.status === 'approved' ? 'chip-green' : 'chip-neutral'}`}>
                              {d.status.toUpperCase()}
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'monospace' }}>
                              #{String(d.id).slice(0, 8)} · {new Date(d.created_at).toLocaleString('th-TH')}
                            </span>
                          </div>
                          <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text)', marginBottom: d.status === 'pending' ? 12 : 0 }}>{d.content}</div>
                          {d.status === 'pending' && (
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button className="btn btn-success btn-sm" onClick={() => approveDraft(d)} disabled={loading}>✓ Approve → Knowledge</button>
                              <button className="btn btn-danger btn-sm" onClick={() => rejectDraft(d.id)}>✕ Reject</button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                }
              </div>
            )}

            {/* ===== KNOWLEDGE BASE ===== */}
            {page === 'knowledge' && (
              <div className="card anim-up">
                {knowledge.length === 0
                  ? <div className="empty-state"><div className="empty-icon">📚</div><div className="empty-title">ยังไม่มี knowledge</div><div className="empty-sub">approve draft เพื่อเพิ่มข้อมูล</div></div>
                  : (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="table">
                        <thead>
                          <tr>
                            <th style={{ width: 80 }}>ID</th>
                            <th>CONTENT</th>
                            <th style={{ width: 120 }}>CREATED</th>
                            <th style={{ width: 80 }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {knowledge.map(k => (
                            <tr key={k.id}>
                              <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text3)' }}>#{String(k.id).slice(0, 8)}</td>
                              <td style={{ fontSize: 13, lineHeight: 1.6 }}>{k.content.slice(0, 140)}{k.content.length > 140 ? '…' : ''}</td>
                              <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>{new Date(k.created_at).toLocaleDateString('th-TH')}</td>
                              <td><button className="btn btn-danger btn-sm" onClick={() => deleteKnowledge(k.id)}>🗑</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                }
              </div>
            )}

            {/* ===== GROUPS ===== */}
            {page === 'groups' && (
              <div className="card anim-up">
                {groups.length === 0
                  ? <div className="empty-state"><div className="empty-icon">⬡</div><div className="empty-title">ยังไม่มีกลุ่ม</div><div className="empty-sub">invite bot เข้า LINE group แล้ว approve ที่หน้า Group Approvals</div></div>
                  : (
                    <table className="table">
                      <thead>
                        <tr>
                          <th>NAME</th>
                          <th>TYPE</th>
                          <th>GROUP ID</th>
                          <th>CREATED</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groups.map(g => (
                          <tr key={g.id}>
                            <td style={{ fontWeight: 600, fontSize: 13 }}>{g.name}</td>
                            <td><span className={`chip ${g.type === 'trainer' ? 'chip-green' : 'chip-blue'}`}>{g.type.toUpperCase()}</span></td>
                            <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text3)' }}>{g.id.slice(0, 24)}…</td>
                            <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text3)' }}>{new Date(g.created_at).toLocaleDateString('th-TH')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                }
              </div>
            )}

            {/* ===== MEMBERS & DISC ===== */}
            {page === 'members' && (
              <div className="anim-up">
                {members.length === 0
                  ? <div className="card"><div className="empty-state"><div className="empty-icon">◉</div><div className="empty-title">ยังไม่มีสมาชิก</div><div className="empty-sub">สมาชิกจะถูกบันทึกอัตโนมัติ<br />เมื่อส่งข้อความในกลุ่ม customer</div></div></div>
                  : Object.entries(
                    members.reduce((acc, m) => {
                      const key = m.group_name || m.group_id
                      if (!acc[key]) acc[key] = []
                      acc[key].push(m)
                      return acc
                    }, {})
                  ).map(([groupName, groupMembers]) => (
                    <div key={groupName} className="card" style={{ marginBottom: 20 }}>
                      <div className="card-header">
                        <span className="chip chip-blue">CUSTOMER</span>
                        <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>{groupName}</span>
                        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text3)', fontFamily: 'monospace' }}>{groupMembers.length} สมาชิก</span>
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table className="table">
                          <thead>
                            <tr>
                              <th>ชื่อ LINE</th>
                              <th>NICKNAME</th>
                              <th>DISC</th>
                              <th>SCORES</th>
                              <th style={{ textAlign: 'center' }}>MSG</th>
                            </tr>
                          </thead>
                          <tbody>
                            {groupMembers.map(m => {
                              const maxScore = Math.max(m.disc_d, m.disc_i, m.disc_s, m.disc_c, 1)
                              const isEditing = editingNickname?.id === m.id
                              return (
                                <tr key={m.id}>
                                  <td>
                                    <div style={{ fontWeight: 500, fontSize: 13 }}>{m.display_name}</div>
                                    <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'monospace', marginTop: 2 }}>{m.line_user_id.slice(0, 16)}…</div>
                                  </td>
                                  <td>
                                    {isEditing ? (
                                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                        <input
                                          className="input"
                                          style={{ width: 130, padding: '5px 10px', fontSize: 12 }}
                                          value={editingNickname.value}
                                          autoFocus
                                          onChange={e => setEditingNickname({ ...editingNickname, value: e.target.value })}
                                          onKeyDown={e => {
                                            if (e.key === 'Enter') saveNickname(m.id, editingNickname.value)
                                            if (e.key === 'Escape') setEditingNickname(null)
                                          }}
                                        />
                                        <button className="btn btn-success btn-sm" onClick={() => saveNickname(m.id, editingNickname.value)}>✓</button>
                                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingNickname(null)}>✕</button>
                                      </div>
                                    ) : (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: 13, fontWeight: m.nickname !== m.display_name ? 600 : 400, color: m.nickname !== m.display_name ? 'var(--teal)' : 'var(--text)' }}>{m.nickname}</span>
                                        <button className="btn btn-ghost btn-sm" style={{ padding: '3px 8px' }} onClick={() => setEditingNickname({ id: m.id, value: m.nickname })}>✎</button>
                                      </div>
                                    )}
                                  </td>
                                  <td>
                                    {m.disc_type
                                      ? <span className="chip" style={{ background: `${DISC_COLORS[m.disc_type]}18`, color: DISC_COLORS[m.disc_type], border: `1px solid ${DISC_COLORS[m.disc_type]}30`, fontSize: 14, fontWeight: 800, padding: '5px 16px', letterSpacing: '0.05em' }}>{m.disc_type}</span>
                                      : <span style={{ fontSize: 11, color: 'var(--text3)' }}>— รอข้อมูล</span>
                                    }
                                  </td>
                                  <td style={{ minWidth: 180 }}>
                                    {['D', 'I', 'S', 'C'].map(dim => {
                                      const score = m[`disc_${dim.toLowerCase()}`] || 0
                                      return (
                                        <div key={dim} className="disc-bar">
                                          <span className="disc-label" style={{ color: DISC_COLORS[dim] }}>{dim}</span>
                                          <div className="disc-bar-track">
                                            <div className="disc-bar-fill" style={{ width: `${Math.round((score / maxScore) * 100)}%`, background: DISC_COLORS[dim] }} />
                                          </div>
                                          <span className="disc-score">{score}</span>
                                        </div>
                                      )
                                    })}
                                  </td>
                                  <td style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>{m.message_count}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}

          </div>
        </main>
      </div>

      {/* APPROVE MODAL */}
      {approveModal && <ApproveModal group={approveModal} onApprove={approveGroup} onClose={() => setApproveModal(null)} />}

      {/* TOASTS */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className="toast">
            <span>{t.type === 'success' ? '✓' : t.type === 'danger' ? '✕' : '!'}</span>
            {t.msg}
          </div>
        ))}
      </div>
    </>
  )
}

function ApproveModal({ group, onApprove, onClose }) {
  const [type, setType] = useState('customer')
  const [name, setName] = useState(group.group_name || '')

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 700, fontSize: 15, fontFamily: 'var(--font-display)' }}>Approve Group</div>
          <span style={{ cursor: 'pointer', color: 'var(--text3)', fontSize: 22, lineHeight: 1 }} onClick={onClose}>×</span>
        </div>
        <div style={{ padding: '20px 22px' }}>
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 18 }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-display)', letterSpacing: '0.08em', marginBottom: 4 }}>LINE GROUP ID</div>
            <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text2)' }}>{group.group_id}</div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', marginBottom: 8 }}>ชื่อกลุ่ม</div>
            <input className="input" style={{ width: '100%' }} value={name} onChange={e => setName(e.target.value)} placeholder="ตั้งชื่อกลุ่มนี้..." />
          </div>

          <div>
            <div style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--font-display)', letterSpacing: '0.06em', marginBottom: 10 }}>ประเภทกลุ่ม</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { t: 'customer', icon: '👥', label: 'Customer', sub: 'กลุ่มลูกค้า จิ้นน้อยจะตอบคำถาม', color: 'var(--blue)', dim: 'var(--blue-dim)' },
                { t: 'trainer', icon: '🎓', label: 'Trainer', sub: 'กลุ่มทีมงาน ใส่ความรู้ให้จิ้นน้อย', color: 'var(--green)', dim: 'var(--green-dim)' },
              ].map(opt => (
                <div
                  key={opt.t}
                  onClick={() => setType(opt.t)}
                  style={{
                    border: `2px solid ${type === opt.t ? opt.color : 'var(--border)'}`,
                    background: type === opt.t ? opt.dim : 'var(--bg3)',
                    borderRadius: 'var(--radius)', padding: '14px 16px', cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ fontSize: 22, marginBottom: 8 }}>{opt.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 13, fontFamily: 'var(--font-display)', color: type === opt.t ? opt.color : 'var(--text)', marginBottom: 4 }}>{opt.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.5 }}>{opt.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
          <button
            className={`btn ${type === 'trainer' ? 'btn-success' : 'btn-info'}`}
            onClick={() => onApprove(group, type, name)}
            disabled={!name.trim()}
          >
            ✓ Approve as {type}
          </button>
        </div>
      </div>
    </div>
  )
}
