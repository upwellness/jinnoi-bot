'use client'
import { useState, useEffect } from 'react'

export default function Dashboard() {
  const [page, setPage] = useState('dashboard')
  const [drafts, setDrafts] = useState([])
  const [knowledge, setKnowledge] = useState([])
  const [groups, setGroups] = useState([])
  const [pendingGroups, setPendingGroups] = useState([])
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(false)
  const [approveModal, setApproveModal] = useState(null) // pending group ที่กำลัง approve

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [d, k, g, pg] = await Promise.all([
      fetch('/api/admin?action=drafts').then(r => r.json()),
      fetch('/api/admin?action=knowledge').then(r => r.json()),
      fetch('/api/admin?action=groups').then(r => r.json()),
      fetch('/api/admin?action=pending_groups').then(r => r.json()),
    ])
    setDrafts(d || [])
    setKnowledge(k || [])
    setGroups(g || [])
    setPendingGroups(pg || [])
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function approveDraft(draft) {
    setLoading(true)
    await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve_draft', draftId: draft.id, content: draft.content })
    })
    showToast('✅ อนุมัติแล้ว เข้า Knowledge Base')
    fetchAll()
    setLoading(false)
  }

  async function rejectDraft(id) {
    await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject_draft', draftId: id })
    })
    showToast('✕ ปฏิเสธ draft แล้ว')
    fetchAll()
  }

  async function deleteKnowledge(id) {
    await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_knowledge', id })
    })
    showToast('🗑 ลบออกจาก Knowledge Base แล้ว')
    fetchAll()
  }

  async function approveGroup(pending, type, name) {
    await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'approve_group',
        pendingId: pending.id,
        groupId: pending.group_id,
        name: name || pending.group_name,
        type
      })
    })
    showToast(`✅ ${name} ลงทะเบียนเป็น ${type} แล้ว`)
    setApproveModal(null)
    fetchAll()
  }

  async function rejectGroup(id) {
    await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject_group', pendingId: id })
    })
    showToast('✕ ปฏิเสธ group แล้ว')
    fetchAll()
  }

  const pendingDrafts = drafts.filter(d => d.status === 'pending')

  const s = {
    body: { background:'#0a0c0f', color:'#e8ecf0', fontFamily:'system-ui,sans-serif', minHeight:'100vh', display:'flex' },
    sidebar: { width:220, minWidth:220, background:'#111418', borderRight:'1px solid #22272f', height:'100vh', position:'fixed', display:'flex', flexDirection:'column' },
    logo: { padding:'20px 18px', borderBottom:'1px solid #22272f' },
    logoText: { fontWeight:800, fontSize:16 },
    logoSub: { fontSize:10, color:'#4a5568', fontFamily:'monospace', marginTop:2 },
    navSection: { padding:'12px 10px 4px' },
    navLabel: { fontSize:10, color:'#4a5568', fontFamily:'monospace', letterSpacing:'0.1em', padding:'0 8px', marginBottom:4 },
    nav: (active) => ({ display:'flex', alignItems:'center', gap:9, padding:'8px 10px', borderRadius:6, cursor:'pointer', color: active ? '#00d4aa' : '#8a95a3', background: active ? 'rgba(0,212,170,0.1)' : 'transparent', fontSize:13, marginBottom:2 }),
    badge: (color='warn') => ({ marginLeft:'auto', background: color==='red'?'#e53e3e': color==='green'?'#00d4aa': color==='blue'?'#4299e1':'#f5a623', color: color==='red'||color==='blue'?'#fff':'#000', fontSize:10, fontWeight:600, padding:'1px 6px', borderRadius:20, fontFamily:'monospace' }),
    main: { marginLeft:220, flex:1, display:'flex', flexDirection:'column' },
    topbar: { background:'#111418', borderBottom:'1px solid #22272f', padding:'14px 28px', display:'flex', alignItems:'center', gap:16, position:'sticky', top:0, zIndex:50 },
    pageTitle: { fontWeight:700, fontSize:20 },
    pageSub: { fontSize:12, color:'#4a5568', marginTop:2 },
    content: { padding:'24px 28px' },
    statsGrid: { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 },
    statCard: (accent='#00d4aa') => ({ background:'#111418', border:'1px solid #22272f', borderRadius:10, padding:'18px 20px', borderLeft:`3px solid ${accent}` }),
    statLabel: { fontSize:11, color:'#4a5568', fontFamily:'monospace', letterSpacing:'0.05em', marginBottom:8 },
    statValue: { fontSize:28, fontWeight:700, lineHeight:1 },
    panel: { background:'#111418', border:'1px solid #22272f', borderRadius:10, overflow:'hidden', marginBottom:16 },
    panelHeader: { padding:'14px 18px', borderBottom:'1px solid #22272f', display:'flex', alignItems:'center', gap:10, fontSize:13, fontWeight:600 },
    panelBody: { padding:'16px 18px' },
    draftCard: { background:'#181c22', border:'1px solid #2d3440', borderRadius:10, padding:'16px 18px', marginBottom:12 },
    chip: (type='warn') => {
      const c = { warn:['rgba(245,166,35,0.12)','#f5a623','rgba(245,166,35,0.3)'], green:['rgba(6,199,85,0.12)','#06c755','rgba(6,199,85,0.3)'], info:['rgba(66,153,225,0.12)','#4299e1','rgba(66,153,225,0.3)'], red:['rgba(229,62,62,0.12)','#e53e3e','rgba(229,62,62,0.3)'], purple:['rgba(159,122,234,0.12)','#9f7aea','rgba(159,122,234,0.3)'], neutral:['#181c22','#8a95a3','#2d3440'] }
      const [bg,color,border] = c[type]||c.warn
      return { display:'inline-flex', alignItems:'center', padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:500, fontFamily:'monospace', background:bg, color, border:`1px solid ${border}`, whiteSpace:'nowrap' }
    },
    btn: (variant='ghost') => {
      const v = { primary:{ background:'#00d4aa', color:'#000', border:'none' }, ghost:{ background:'transparent', color:'#8a95a3', border:'1px solid #2d3440' }, danger:{ background:'rgba(229,62,62,0.15)', color:'#e53e3e', border:'1px solid rgba(229,62,62,0.3)' }, success:{ background:'rgba(0,212,170,0.12)', color:'#00d4aa', border:'1px solid rgba(0,212,170,0.3)' }, warn:{ background:'rgba(245,166,35,0.12)', color:'#f5a623', border:'1px solid rgba(245,166,35,0.3)' }, info:{ background:'rgba(66,153,225,0.12)', color:'#4299e1', border:'1px solid rgba(66,153,225,0.3)' } }
      return { ...(v[variant]||v.ghost), padding:'7px 14px', borderRadius:6, fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'inherit', display:'inline-flex', alignItems:'center', gap:6 }
    },
    table: { width:'100%', borderCollapse:'collapse' },
    th: { textAlign:'left', fontSize:10, color:'#4a5568', fontFamily:'monospace', letterSpacing:'0.08em', padding:'10px 14px', borderBottom:'1px solid #22272f', fontWeight:400 },
    td: { padding:'11px 14px', fontSize:12, borderBottom:'1px solid #22272f', color:'#e8ecf0', verticalAlign:'middle' },
    input: { background:'#0a0c0f', border:'1px solid #2d3440', borderRadius:6, padding:'8px 12px', color:'#e8ecf0', fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' },
    toast: { position:'fixed', bottom:24, right:24, background:'#111418', border:'1px solid #2d3440', borderLeft:'3px solid #00d4aa', borderRadius:6, padding:'12px 16px', fontSize:12, zIndex:999, opacity: toast ? 1 : 0, transform: toast ? 'translateY(0)' : 'translateY(10px)', transition:'all 0.25s', pointerEvents:'none' },
    emptyState: { textAlign:'center', padding:'48px 20px', color:'#4a5568', fontSize:13 },
    grid2: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 },
    overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' },
    modal: { background:'#111418', border:'1px solid #2d3440', borderRadius:12, width:480, overflow:'hidden' },
    modalHeader: { padding:'18px 20px', borderBottom:'1px solid #22272f', display:'flex', alignItems:'center', justifyContent:'space-between' },
    modalBody: { padding:'20px' },
    modalFooter: { padding:'14px 20px', borderTop:'1px solid #22272f', display:'flex', gap:8, justifyContent:'flex-end' },
  }

  const pageInfo = {
    dashboard: { title:'Dashboard', sub:'ภาพรวมระบบ LINE Knowledge Bot' },
    pending: { title:'Group Approvals', sub:`${pendingGroups.length} กลุ่มรอ approve` },
    drafts: { title:'Trainer Drafts', sub:`${pendingDrafts.length} รายการรอ approve` },
    knowledge: { title:'Knowledge Base', sub:`${knowledge.length} รายการที่ approve แล้ว` },
    groups: { title:'Groups', sub:`${groups.length} กลุ่มที่ลงทะเบียน` },
  }

  return (
    <div style={s.body}>
      {/* SIDEBAR */}
      <nav style={s.sidebar}>
        <div style={s.logo}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:32, height:32, background:'#06c755', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>🌸</div>
            <div>
              <div style={s.logoText}>จิ้นน้อย Admin</div>
              <div style={s.logoSub}>LINE KNOWLEDGE BOT</div>
            </div>
          </div>
        </div>

        <div style={s.navSection}>
          <div style={{ fontSize:10, color:'#4a5568', fontFamily:'monospace', letterSpacing:'0.1em', padding:'0 8px', marginBottom:4 }}>OVERVIEW</div>
          <div style={s.nav(page==='dashboard')} onClick={()=>setPage('dashboard')}>◈ Dashboard</div>
          <div style={s.nav(page==='pending')} onClick={()=>setPage('pending')}>
            🔔 Group Approvals
            {pendingGroups.length > 0 && <span style={s.badge('red')}>{pendingGroups.length}</span>}
          </div>
          <div style={s.nav(page==='groups')} onClick={()=>setPage('groups')}>
            ⬡ Groups
            {groups.length > 0 && <span style={s.badge('green')}>{groups.length}</span>}
          </div>
        </div>

        <div style={s.navSection}>
          <div style={{ fontSize:10, color:'#4a5568', fontFamily:'monospace', letterSpacing:'0.1em', padding:'0 8px', marginBottom:4 }}>CONTENT</div>
          <div style={s.nav(page==='drafts')} onClick={()=>setPage('drafts')}>
            ✍ Trainer Drafts
            {pendingDrafts.length > 0 && <span style={s.badge()}>{pendingDrafts.length}</span>}
          </div>
          <div style={s.nav(page==='knowledge')} onClick={()=>setPage('knowledge')}>◎ Knowledge Base</div>
        </div>

        <div style={{ marginTop:'auto', padding:'14px 18px', borderTop:'1px solid #22272f', fontSize:11, color:'#4a5568', fontFamily:'monospace' }}>
          vercel + supabase + gemini
        </div>
      </nav>

      {/* MAIN */}
      <main style={s.main}>
        <div style={s.topbar}>
          <div>
            <div style={s.pageTitle}>{pageInfo[page]?.title}</div>
            <div style={s.pageSub}>{pageInfo[page]?.sub}</div>
          </div>
          <div style={{ marginLeft:'auto', display:'flex', gap:10 }}>
            <button style={s.btn('ghost')} onClick={fetchAll}>⟳ Refresh</button>
          </div>
        </div>

        <div style={s.content}>

          {/* ===== DASHBOARD ===== */}
          {page === 'dashboard' && (
            <div>
              <div style={s.statsGrid}>
                <div style={s.statCard('#e53e3e')}>
                  <div style={s.statLabel}>PENDING GROUPS</div>
                  <div style={s.statValue}>{pendingGroups.length}</div>
                  <div style={{ fontSize:11, color:'#4a5568', marginTop:6 }}>รอ approve</div>
                </div>
                <div style={s.statCard('#06c755')}>
                  <div style={s.statLabel}>ACTIVE GROUPS</div>
                  <div style={s.statValue}>{groups.length}</div>
                  <div style={{ fontSize:11, color:'#4a5568', marginTop:6 }}>ลงทะเบียนแล้ว</div>
                </div>
                <div style={s.statCard('#00d4aa')}>
                  <div style={s.statLabel}>KNOWLEDGE</div>
                  <div style={s.statValue}>{knowledge.length}</div>
                  <div style={{ fontSize:11, color:'#4a5568', marginTop:6 }}>approved แล้ว</div>
                </div>
                <div style={s.statCard('#f5a623')}>
                  <div style={s.statLabel}>PENDING DRAFTS</div>
                  <div style={s.statValue}>{pendingDrafts.length}</div>
                  <div style={{ fontSize:11, color:'#4a5568', marginTop:6 }}>รอ approve</div>
                </div>
              </div>

              {/* pending groups alert */}
              {pendingGroups.length > 0 && (
                <div style={{ background:'rgba(229,62,62,0.08)', border:'1px solid rgba(229,62,62,0.25)', borderRadius:10, padding:'14px 18px', marginBottom:16, display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{ fontSize:20 }}>🔔</span>
                  <div>
                    <div style={{ fontWeight:600, fontSize:13, marginBottom:2 }}>มี {pendingGroups.length} กลุ่มใหม่รอ approve</div>
                    <div style={{ fontSize:11, color:'#8a95a3' }}>กลุ่มเหล่านี้ยังไม่สามารถรับบริการจากจิ้นน้อยได้</div>
                  </div>
                  <button style={{ ...s.btn('danger'), marginLeft:'auto' }} onClick={()=>setPage('pending')}>ดูและ Approve →</button>
                </div>
              )}

              <div style={s.grid2}>
                <div style={s.panel}>
                  <div style={s.panelHeader}>✍ Drafts รอ approve</div>
                  {pendingDrafts.length === 0
                    ? <div style={s.emptyState}>ไม่มี draft รอ approve</div>
                    : pendingDrafts.slice(0,3).map(d => (
                      <div key={d.id} style={{ padding:'12px 18px', borderBottom:'1px solid #22272f' }}>
                        <div style={{ fontSize:12, marginBottom:8 }}>{d.content.slice(0,100)}{d.content.length>100?'...':''}</div>
                        <div style={{ display:'flex', gap:6 }}>
                          <button style={s.btn('success')} onClick={()=>approveDraft(d)}>✓ Approve</button>
                          <button style={s.btn('danger')} onClick={()=>rejectDraft(d.id)}>✕ Reject</button>
                        </div>
                      </div>
                    ))
                  }
                  {pendingDrafts.length > 3 && (
                    <div style={{ padding:'10px 18px' }}>
                      <button style={s.btn('ghost')} onClick={()=>setPage('drafts')}>ดูทั้งหมด {pendingDrafts.length} รายการ →</button>
                    </div>
                  )}
                </div>

                <div style={s.panel}>
                  <div style={s.panelHeader}>⬡ Groups ที่ active</div>
                  {groups.length === 0
                    ? <div style={s.emptyState}>ยังไม่มี group<br/>approve group เพื่อเริ่มใช้งาน</div>
                    : groups.slice(0,5).map(g => (
                      <div key={g.id} style={{ padding:'10px 18px', borderBottom:'1px solid #22272f', display:'flex', alignItems:'center', gap:10 }}>
                        <span style={s.chip(g.type==='trainer'?'green':'info')}>{g.type}</span>
                        <span style={{ fontSize:12, fontWeight:500 }}>{g.name}</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          )}

          {/* ===== PENDING GROUPS ===== */}
          {page === 'pending' && (
            <div>
              {pendingGroups.length === 0 ? (
                <div style={s.emptyState}>
                  <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
                  <div style={{ fontSize:15, fontWeight:600, marginBottom:6 }}>ไม่มี group รอ approve</div>
                  <p>เมื่อมี group ใหม่เพิ่ม bot เข้า LINE<br/>จะปรากฏที่นี่เพื่อให้คุณ approve</p>
                </div>
              ) : (
                pendingGroups.map(pg => (
                  <div key={pg.id} style={{ ...s.draftCard, borderLeft:'3px solid #e53e3e' }}>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
                      <div style={{ width:44, height:44, background:'#181c22', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>⬡</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:600, fontSize:14, marginBottom:4 }}>
                          {pg.group_name || 'Unknown Group'}
                        </div>
                        <div style={{ fontFamily:'monospace', fontSize:11, color:'#4a5568', marginBottom:10 }}>
                          {pg.group_id}
                        </div>
                        <div style={{ fontSize:11, color:'#8a95a3', marginBottom:12 }}>
                          📅 พบเมื่อ {new Date(pg.created_at).toLocaleString('th-TH')}
                        </div>
                        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                          <button
                            style={s.btn('success')}
                            onClick={() => setApproveModal(pg)}
                          >
                            ✓ Approve Group
                          </button>
                          <button
                            style={s.btn('danger')}
                            onClick={() => rejectGroup(pg.id)}
                          >
                            ✕ Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ===== DRAFTS ===== */}
          {page === 'drafts' && (
            <div>
              {drafts.length === 0
                ? <div style={s.emptyState}><div style={{ fontSize:32, marginBottom:12 }}>📭</div><p>ยังไม่มี draft<br/>ให้ trainer พิมพ์ข้อความใน LINE group</p></div>
                : drafts.map(d => (
                  <div key={d.id} style={s.draftCard}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10, flexWrap:'wrap' }}>
                      <span style={s.chip(d.status==='pending'?'warn':d.status==='approved'?'green':'neutral')}>
                        {d.status.toUpperCase()}
                      </span>
                      <span style={{ fontSize:11, color:'#4a5568', fontFamily:'monospace' }}>
                        #{d.id} · {new Date(d.created_at).toLocaleString('th-TH')}
                      </span>
                    </div>
                    <div style={{ fontSize:13, lineHeight:1.65, marginBottom:12 }}>{d.content}</div>
                    {d.status === 'pending' && (
                      <div style={{ display:'flex', gap:8 }}>
                        <button style={s.btn('success')} onClick={()=>approveDraft(d)} disabled={loading}>✓ Approve → Knowledge</button>
                        <button style={s.btn('danger')} onClick={()=>rejectDraft(d.id)}>✕ Reject</button>
                      </div>
                    )}
                  </div>
                ))
              }
            </div>
          )}

          {/* ===== KNOWLEDGE BASE ===== */}
          {page === 'knowledge' && (
            <div style={s.panel}>
              <div style={{ overflowX:'auto' }}>
                {knowledge.length === 0
                  ? <div style={s.emptyState}><div style={{ fontSize:32, marginBottom:12 }}>📚</div><p>ยังไม่มี knowledge<br/>approve draft เพื่อเพิ่มครับ</p></div>
                  : <table style={s.table}>
                      <thead>
                        <tr>
                          <th style={s.th}>ID</th>
                          <th style={s.th}>CONTENT</th>
                          <th style={s.th}>CREATED</th>
                          <th style={s.th}>ACTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {knowledge.map(k => (
                          <tr key={k.id}>
                            <td style={{ ...s.td, fontFamily:'monospace', fontSize:11, color:'#4a5568' }}>#{k.id}</td>
                            <td style={s.td}>{k.content.slice(0,120)}{k.content.length>120?'...':''}</td>
                            <td style={{ ...s.td, fontFamily:'monospace', fontSize:11, whiteSpace:'nowrap' }}>{new Date(k.created_at).toLocaleDateString('th-TH')}</td>
                            <td style={s.td}>
                              <button style={s.btn('danger')} onClick={()=>deleteKnowledge(k.id)}>🗑</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                }
              </div>
            </div>
          )}

          {/* ===== GROUPS ===== */}
          {page === 'groups' && (
            <div style={s.panel}>
              <div style={s.panelHeader}>⬡ กลุ่มที่ลงทะเบียนแล้ว</div>
              {groups.length === 0
                ? <div style={s.emptyState}><div style={{ fontSize:32, marginBottom:12 }}>⬡</div><p>ยังไม่มีกลุ่ม<br/>invite bot เข้า LINE group แล้ว approve ที่หน้า Group Approvals</p></div>
                : <table style={s.table}>
                    <thead>
                      <tr>
                        <th style={s.th}>NAME</th>
                        <th style={s.th}>TYPE</th>
                        <th style={s.th}>GROUP ID</th>
                        <th style={s.th}>CREATED</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groups.map(g => (
                        <tr key={g.id}>
                          <td style={{ ...s.td, fontWeight:500 }}>{g.name}</td>
                          <td style={s.td}><span style={s.chip(g.type==='trainer'?'green':'info')}>{g.type.toUpperCase()}</span></td>
                          <td style={{ ...s.td, fontFamily:'monospace', fontSize:11, color:'#4a5568' }}>{g.id}</td>
                          <td style={{ ...s.td, fontFamily:'monospace', fontSize:11 }}>{new Date(g.created_at).toLocaleDateString('th-TH')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              }
            </div>
          )}

        </div>
      </main>

      {/* APPROVE GROUP MODAL */}
      {approveModal && (
        <ApproveModal
          group={approveModal}
          onApprove={approveGroup}
          onClose={() => setApproveModal(null)}
          s={s}
        />
      )}

      <div style={s.toast}>{toast}</div>
    </div>
  )
}

function ApproveModal({ group, onApprove, onClose, s }) {
  const [type, setType] = useState('customer')
  const [name, setName] = useState(group.group_name || '')

  return (
    <div style={s.overlay} onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.modalHeader}>
          <div style={{ fontWeight:600, fontSize:15 }}>🔔 Approve Group</div>
          <span style={{ cursor:'pointer', color:'#4a5568', fontSize:20, lineHeight:1 }} onClick={onClose}>×</span>
        </div>
        <div style={s.modalBody}>
          <div style={{ background:'#0a0c0f', border:'1px solid #22272f', borderRadius:8, padding:'12px 14px', marginBottom:18 }}>
            <div style={{ fontSize:11, color:'#4a5568', fontFamily:'monospace', marginBottom:4 }}>LINE GROUP ID</div>
            <div style={{ fontFamily:'monospace', fontSize:12, color:'#8a95a3' }}>{group.group_id}</div>
          </div>

          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:11, color:'#8a95a3', fontFamily:'monospace', marginBottom:8 }}>ชื่อกลุ่ม</div>
            <input
              style={{ ...s.input, width:'100%' }}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="ตั้งชื่อกลุ่มนี้..."
            />
          </div>

          <div style={{ marginBottom:8 }}>
            <div style={{ fontSize:11, color:'#8a95a3', fontFamily:'monospace', marginBottom:10 }}>ประเภทกลุ่ม</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div
                onClick={() => setType('customer')}
                style={{
                  border: `2px solid ${type==='customer' ? '#4299e1' : '#22272f'}`,
                  background: type==='customer' ? 'rgba(66,153,225,0.08)' : '#0a0c0f',
                  borderRadius:10, padding:'14px 16px', cursor:'pointer', transition:'all 0.15s'
                }}
              >
                <div style={{ fontSize:22, marginBottom:6 }}>👥</div>
                <div style={{ fontWeight:600, fontSize:13, marginBottom:4, color: type==='customer'?'#4299e1':'#e8ecf0' }}>Customer</div>
                <div style={{ fontSize:11, color:'#4a5568', lineHeight:1.5 }}>กลุ่มลูกค้า<br/>จิ้นน้อยจะตอบคำถาม</div>
              </div>
              <div
                onClick={() => setType('trainer')}
                style={{
                  border: `2px solid ${type==='trainer' ? '#06c755' : '#22272f'}`,
                  background: type==='trainer' ? 'rgba(6,199,85,0.08)' : '#0a0c0f',
                  borderRadius:10, padding:'14px 16px', cursor:'pointer', transition:'all 0.15s'
                }}
              >
                <div style={{ fontSize:22, marginBottom:6 }}>🎓</div>
                <div style={{ fontWeight:600, fontSize:13, marginBottom:4, color: type==='trainer'?'#06c755':'#e8ecf0' }}>Trainer</div>
                <div style={{ fontSize:11, color:'#4a5568', lineHeight:1.5 }}>กลุ่มทีมงาน<br/>ใส่ความรู้ให้จิ้นน้อย</div>
              </div>
            </div>
          </div>
        </div>
        <div style={s.modalFooter}>
          <button style={s.btn('ghost')} onClick={onClose}>ยกเลิก</button>
          <button
            style={s.btn(type==='trainer'?'success':'info')}
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
```

---

## Flow ที่ได้
```
bot ถูก invite เข้า group ใหม่
        ↓
มีคนพิมพ์ message แรก
        ↓
webhook บันทึกลง pending_groups
        ↓
dashboard แจ้งเตือน 🔔 badge แดง
        ↓
admin กด Approve → เลือกชื่อ + ประเภท
        ↓
group พร้อมใช้งานทันที ✅
