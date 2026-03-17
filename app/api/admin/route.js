// v2
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')
  console.log('Admin GET action:', action)

  if (action === 'drafts') {
    const { data } = await supabase.from('drafts').select('*').order('created_at', { ascending: false })
    return Response.json(data || [])
  }
  if (action === 'knowledge') {
    const { data } = await supabase.from('knowledge').select('*').order('created_at', { ascending: false })
    return Response.json(data || [])
  }
  if (action === 'groups') {
    const { data } = await supabase.from('groups').select('*').order('created_at', { ascending: false })
    return Response.json(data || [])
  }
  if (action === 'pending_groups') {
    const { data } = await supabase.from('pending_groups').select('*').order('created_at', { ascending: false })
    return Response.json(data || [])
  }
  return Response.json({ error: 'unknown action' }, { status: 400 })
}

export async function POST(req) {
  const body = await req.json()
  console.log('Admin POST action:', body.action)

  if (body.action === 'approve_group') {
    await supabase.from('groups').insert({ id: body.groupId, name: body.name, type: body.type })
    await supabase.from('pending_groups').delete().eq('id', body.pendingId)
    return Response.json({ ok: true })
  }
  if (body.action === 'reject_group') {
    await supabase.from('pending_groups').delete().eq('id', body.pendingId)
    return Response.json({ ok: true })
  }
  if (body.action === 'approve_draft') {
    await supabase.from('drafts').update({ status: 'approved' }).eq('id', body.draftId)
    await supabase.from('knowledge').insert({ content: body.content, source_draft_id: body.draftId })
    return Response.json({ ok: true })
  }
  if (body.action === 'reject_draft') {
    await supabase.from('drafts').update({ status: 'rejected' }).eq('id', body.draftId)
    return Response.json({ ok: true })
  }
  if (body.action === 'delete_knowledge') {
    await supabase.from('knowledge').delete().eq('id', body.id)
    return Response.json({ ok: true })
  }
  return Response.json({ error: 'unknown action' }, { status: 400 })
}
