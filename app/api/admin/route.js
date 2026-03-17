// v3
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')
    console.log('GET action:', action)

    let data = []

    if (action === 'drafts') {
      const res = await supabase.from('drafts').select('*').order('created_at', { ascending: false })
      console.log('drafts error:', res.error)
      data = res.data || []
    } else if (action === 'knowledge') {
      const res = await supabase.from('knowledge').select('*').order('created_at', { ascending: false })
      console.log('knowledge error:', res.error)
      data = res.data || []
    } else if (action === 'groups') {
      const res = await supabase.from('groups').select('*').order('created_at', { ascending: false })
      console.log('groups error:', res.error)
      data = res.data || []
    } else if (action === 'pending_groups') {
      const res = await supabase.from('pending_groups').select('*').order('created_at', { ascending: false })
      console.log('pending_groups error:', res.error)
      data = res.data || []
    } else {
      return new Response(JSON.stringify({ error: 'unknown action' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('GET crash:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

export async function POST(req) {
  try {
    const body = await req.json()
    console.log('POST action:', body.action)

    if (body.action === 'approve_group') {
      await supabase.from('groups').insert({ id: body.groupId, name: body.name, type: body.type })
      await supabase.from('pending_groups').delete().eq('id', body.pendingId)
    } else if (body.action === 'reject_group') {
      await supabase.from('pending_groups').delete().eq('id', body.pendingId)
    } else if (body.action === 'approve_draft') {
      await supabase.from('drafts').update({ status: 'approved' }).eq('id', body.draftId)
      await supabase.from('knowledge').insert({ content: body.content, source_draft_id: body.draftId })
    } else if (body.action === 'reject_draft') {
      await supabase.from('drafts').update({ status: 'rejected' }).eq('id', body.draftId)
    } else if (body.action === 'delete_knowledge') {
      await supabase.from('knowledge').delete().eq('id', body.id)
    } else {
      return new Response(JSON.stringify({ error: 'unknown action' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('POST crash:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
