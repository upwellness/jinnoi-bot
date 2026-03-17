'use client'
import { useState, useEffect } from 'react'

export default function Dashboard() {
  const [page, setPage] = useState('dashboard')
  const [drafts, setDrafts] = useState([])
  const [knowledge, setKnowledge] = useState([])
  const [groups, setGroups] = useState([])
  const [messages, setMessages] = useState([])
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(false)

  // ดึงข้อมูลจริงจาก Supabase ผ่าน API
  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    const [d, k, g] = await Promise.all([
      fetch('/api/admin?action=drafts').then(r => r.json()),
      fetch('/api/admin?action=knowledge').then(r => r.json()),
      fetch('/api/admin?action=groups').then(r => r.json()),
    ])
    setDrafts(d || [])
    setKnowledge(k || [])
    setGroups(g || [])
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
      body: JSON.stringify({
        action: 'approve_draft',
        draftId: draft.id,
        content: draft.content
      })
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

  const pendingDrafts = drafts.filter(d => d.status === 'pending')

  // ---- STYLES (inline เพื่อไม่ต้องติดตั้ง Tailwind) ----
  const s = {
    body: { background:'#0a0c0f', color:'#e8ecf0', fontFamily:'system-ui,sans-serif', minHeight:'100vh', display:'flex' },
    sidebar: { width:210, background:'#111418', borderRight:'1px solid #22272f', height:'100vh', position:'fixed', display:'flex', flexDirection:'column' },
    logo: { padding:'20px 18px', borderBottom:'1px solid #22272f', fontWeight:800, fontSize:16, letterSpacing:'-0.02em' },
    logoSub: { fontSize:10, color:'#4a5568', fontFamily:'monospace', marginTop:2 },
    navSection: { padding:'12px 10px 4px' },
    navLabel: { fontSize:10, color:'#4a5568', fontFamily:'monospace', letterSpacing:'0.1em', padding:'0 8px', marginBottom:4 },
    nav: (active) => ({ display:'flex', alignItems:'center', gap:9, padding:'8px 10px', borderRadius:6, cursor:'pointer', color: active ? '#00d4aa' : '#8a95a3', background: active ? 'rgba(0,212,170,0.1)' : 'transparent', fontSize:13, marginBottom:2, transition:'all 0.15s' }),
    badge: (color='warn') => ({ marginLeft:'auto', background: color==='red'?'#e53e3e': color==='green'?'#00d4aa':'#f5a623', color: color==='red'?'#fff':'#000', fontSize:10, fontWeight:600, padding:'1px 6px', borderRadius:20, fontFamily:'monospace' }),
    main: { marginLeft:210, flex:1, display:'flex', flexDirection:'column' },
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
    draftMeta: { display:'flex', alignItems:'center', gap:8, marginBottom:10, flexWrap:'wrap' },
    draftBody: { fontSize:13, lineHeight:1.65, marginBottom:12, color:'#e8ecf0' },
    chip: (type='warn') => {
      const colors = { warn:['rgba(245,166,35,0.12)','#f5a623','rgba(245,166,35,0.25)'], green:['rgba(6,199,85,0.12)','#06c755','rgba(6,199,85,0.25)'], info:['rgba(66,153,225,0.12)','#4299e1','rgba(66,153,225,0.25)'], neutral:['#181c22','#8a95a3','#2d3440'] }
      const [bg,color,border] = colors[type]||colors.warn
      return { display:'inline-flex', alignItems:'center', padding:'3px 8px', borderRadius:20, fontSize:10, fontWeight:500, fontFamily:'monospace', background:bg, color, border:`1px solid ${border}`, whiteSpace:'nowrap' }
    },
    btn: (variant='ghost') => {
      const v = { primary:{ background:'#00d4aa', color:'#000' }, ghost:{ background:'transparent', color:'#8a95a3', border:'1px solid #2d3440' }, danger:{ background:'rgba(229,62,62,0.15)', color:'#e53e3e', border:'1px solid rgba(229,62,62,0.3)' }, success:{ background:'rgba(0,212,170,0.12)', color:'#00d4aa', border:'1px solid rgba(0,212,170,0.3)' } }
      return { ...(v[variant]||v.ghost), padding:'7px 14px', borderRadius:6, fontSize:12, fontWeight:500, cursor:'pointer', border:'none', fontFamily:'inherit', display:'inline-flex', alignItems:'center', gap:6, ...( v[variant]?.border ? {border:v[variant].border} : {} ) }
    },
    table: { width:'100%', borderCollapse:'collapse' },
    th: { textAlign:'left', fontSize:10, color:'#4a5568', fontFamily:'monospace', letterSpacing:'0.08em', padding:'10px 14px', borderBottom:'1px solid #22272f', fontWeight:400 },
    td: { padding:'11px 14px', fontSize:12, borderBottom:'1px solid #22272f', color:'#e8ecf0', verticalAlign:'middle' },
    input: { background:'#0a0c0f', border:'1px solid #2d3440', borderRadius:6, padding:'8px 12px', color:'#e8ecf0', fontSize:13, fontFamily:'inherit', width:'100%', outline:'none', boxSizing:'border-box' },
    toast: { position:'fixed', bottom:24, right:24, background:'#111418', border:'1px solid #2d3440', borderLeft:'3px solid #00d4aa', borderRadius:6, padding:'12px 16px', fontSize:12, zIndex:999, opacity: toast ? 1 : 0, transform: toast ? 'translateY(0)' : 'translateY(10px)', transition:'all 0.25s', pointerEvents:'none' },
    emptyState: { textAlign:'center', padding:'48px 20px', color:'#4a5568', fontSize:13 },
    grid2: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 },
  }

  const pageInfo = {
    dashboard: { title:'Dashboard', sub:'ภาพรวมระบบ LINE Knowledge Bot' },
    drafts: { title:'Trainer Drafts', sub:`${pendingDrafts.length} รายการรอ approve` },
    knowledge: { title:'Knowledge Base', sub:`${knowledge.length} รายการที่ approve แล้ว` },
    groups: { title:'Groups', sub:`${groups.length} กลุ่มที่ลงทะเบียน` },
  }

  return (
    <div style={s.body}>
      {/* SIDEBAR */}
      <nav style={s.sidebar}>
        <div style={s.logo}>
          🤖 KnowledgeBot
          <div style={s.logoSub}>LINE ADMIN</div>
        </div>
        <div style={s.navSection}>
          <div style={s.navLabel}>OVERVIEW</div>
          <div style={s.nav(page==='dashboard')} onClick={()=>setPage('dashboard')}>◈ Dashboard</div>
          <div style={s.nav(page==='groups')} onClick={()=>setPage('groups')}>
            ⬡ Groups
            {groups.length > 0 && <span style={s.badge('green')}>{groups.length}</span>}
          </div>
        </div>
        <div style={s.navSection}>
          <div style={s.navLabel}>CONTENT</div>
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
                <div style={s.statCard('#06c755')}>
                  <div style={s.statLabel}>GROUPS</div>
                  <div style={s.statValue}>{groups.length}</div>
                  <div style={{ fontSize:11, color:'#4a5568', marginTop:6 }}>ที่ลงทะเบียนแล้ว</div>
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
                <div style={s.statCard('#4299e1')}>
                  <div style={s.statLabel}>TOTAL DRAFTS</div>
                  <div style={s.statValue}>{drafts.length}</div>
                  <div style={{ fontSize:11, color:'#4a5568', marginTop:6 }}>ทั้งหมด</div>
                </div>
              </div>

              <div style={s.grid2}>
                <div style={s.panel}>
                  <div style={s.panelHeader}>✍ Drafts ล่าสุด (รอ approve)</div>
                  {pendingDrafts.length === 0
                    ? <div style={s.emptyState}>ไม่มี draft รอ approve</div>
                    : pendingDrafts.slice(0,3).map(d => (
                      <div key={d.id} style={{ padding:'12px 18px', borderBottom:'1px solid #22272f' }}>
                        <div style={{ fontSize:12, marginBottom:8, color:'#e8ecf0' }}>{d.content.slice(0,100)}{d.content.length>100?'...':''}</div>
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
                  <div style={s.panelHeader}>◎ Knowledge ล่าสุด</div>
                  {knowledge.length === 0
                    ? <div style={s.emptyState}>ยังไม่มี knowledge<br/>approve draft เพื่อเพิ่มครับ</div>
                    : knowledge.slice(0,4).map(k => (
                      <div key={k.id} style={{ padding:'10px 18px', borderBottom:'1px solid #22272f', fontSize:12, color:'#8a95a3' }}>
                        {k.content.slice(0,80)}{k.content.length>80?'...':''}
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          )}

          {/* ===== DRAFTS ===== */}
          {page === 'drafts' && (
            <div>
              {drafts.length === 0
                ? <div style={s.emptyState}><div style={{fontSize:32,marginBottom:12}}>📭</div><p>ยังไม่มี draft<br/>ให้ trainer พิมพ์ข้อความใน LINE group</p></div>
                : drafts.map(d => (
                  <div key={d.id} style={s.draftCard}>
                    <div style={s.draftMeta}>
                      <span style={s.chip(d.status==='pending'?'warn':d.status==='approved'?'green':'neutral')}>
                        {d.status.toUpperCase()}
                      </span>
                      <span style={{ fontSize:11, color:'#4a5568', fontFamily:'monospace' }}>
                        #{d.id} · {new Date(d.created_at).toLocaleString('th-TH')}
                      </span>
                    </div>
                    <div style={s.draftBody}>{d.content}</div>
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
            <div>
              <div style={s.panel}>
                <div style={{ overflowX:'auto' }}>
                  {knowledge.length === 0
                    ? <div style={s.emptyState}><div style={{fontSize:32,marginBottom:12}}>📚</div><p>ยังไม่มี knowledge<br/>approve draft เพื่อเพิ่มครับ</p></div>
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
                              <td style={{...s.td, fontFamily:'monospace', fontSize:11, color:'#4a5568'}}>#{k.id}</td>
                              <td style={s.td}>{k.content.slice(0,120)}{k.content.length>120?'...':''}</td>
                              <td style={{...s.td, fontFamily:'monospace', fontSize:11, whiteSpace:'nowrap'}}>{new Date(k.created_at).toLocaleDateString('th-TH')}</td>
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
            </div>
          )}

          {/* ===== GROUPS ===== */}
          {page === 'groups' && (
            <div>
              <div style={s.panel}>
                <div style={s.panelHeader}>กลุ่มที่ลงทะเบียน</div>
                {groups.length === 0
                  ? <div style={s.emptyState}><div style={{fontSize:32,marginBottom:12}}>⬡</div><p>ยังไม่มีกลุ่ม<br/>ลงทะเบียนผ่าน API หรือ Supabase ครับ</p></div>
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
                            <td style={{...s.td, fontWeight:500}}>{g.name}</td>
                            <td style={s.td}><span style={s.chip(g.type==='trainer'?'green':'info')}>{g.type.toUpperCase()}</span></td>
                            <td style={{...s.td, fontFamily:'monospace', fontSize:11, color:'#4a5568'}}>{g.id}</td>
                            <td style={{...s.td, fontFamily:'monospace', fontSize:11}}>{new Date(g.created_at).toLocaleDateString('th-TH')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                }
                <div style={{ padding:'14px 18px', borderTop:'1px solid #22272f' }}>
                  <p style={{ fontSize:12, color:'#4a5568', marginBottom:8 }}>เพิ่มกลุ่มใหม่ผ่าน Supabase → Table Editor → groups → Insert row</p>
                  <p style={{ fontSize:11, color:'#4a5568', fontFamily:'monospace' }}>id = LINE groupId (ดูได้จาก messages table), type = trainer หรือ customer</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* TOAST */}
      <div style={s.toast}>{toast}</div>
    </div>
  )
}
