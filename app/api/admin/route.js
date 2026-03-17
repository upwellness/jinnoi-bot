import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')

    if (action === 'drafts') {
      const { data, error } = await supabase
        .from('drafts')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return Response.json(data || [])
    }

    if (action === 'knowledge') {
      const { data, error } = await supabase
        .from('knowledge')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return Response.json(data || [])
    }

    if (action === 'groups') {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return Response.json(data || [])
    }

    if (action === 'pending_groups') {
      const { data, error } = await supabase
        .from('pending_groups')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return Response.json(data || [])
    }

    // ไม่มี action ที่ตรง
    return Response.json({ error: 'Unknown action' }, { status: 400 })

  } catch (err) {
    console.error('Admin GET error:', err.message)
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const body = await req.json()

    if (body.action === 'approve_group') {
      const { error: insertError } = await supabase.from('groups').insert({
        id: body.groupId,
        name: body.name,
        type: body.type
      })
      if (insertError) throw insertError

      const { error: deleteError } = await supabase
        .from('pending_groups')
        .delete()
        .eq('id', body.pendingId)
      if (deleteError) throw deleteError

      return Response.json({ ok: true })
    }

    if (body.action === 'reject_group') {
      const { error } = await supabase
        .from('pending_groups')
        .delete()
        .eq('id', body.pendingId)
      if (error) throw error
      return Response.json({ ok: true })
    }

    if (body.action === 'approve_draft') {
      const { error: updateError } = await supabase
        .from('drafts')
        .update({ status: 'approved' })
        .eq('id', body.draftId)
      if (updateError) throw updateError

      const { error: insertError } = await supabase
        .from('knowledge')
        .insert({ content: body.content, source_draft_id: body.draftId })
      if (insertError) throw insertError

      return Response.json({ ok: true })
    }

    if (body.action === 'reject_draft') {
      const { error } = await supabase
        .from('drafts')
        .update({ status: 'rejected' })
        .eq('id', body.draftId)
      if (error) throw error
      return Response.json({ ok: true })
    }

    if (body.action === 'delete_knowledge') {
      const { error } = await supabase
        .from('knowledge')
        .delete()
        .eq('id', body.id)
      if (error) throw error
      return Response.json({ ok: true })
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 })

  } catch (err) {
    console.error('Admin POST error:', err.message)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
