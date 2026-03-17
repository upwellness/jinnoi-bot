import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  if (action === 'drafts') {
    const { data } = await supabase
      .from('drafts')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    return Response.json(data)
  }

  if (action === 'knowledge') {
    const { data } = await supabase
      .from('knowledge')
      .select('*')
      .order('created_at', { ascending: false })
    return Response.json(data)
  }

  if (action === 'groups') {
    const { data } = await supabase.from('groups').select('*')
    return Response.json(data)
  }
}

export async function POST(req) {
  const body = await req.json()

  // ลงทะเบียน group
  if (body.action === 'register_group') {
    const { data } = await supabase.from('groups').upsert({
      id: body.groupId,
      name: body.name,
      type: body.type
    })
    return Response.json({ ok: true })
  }

  // approve draft → เข้า knowledge
  if (body.action === 'approve_draft') {
    await supabase.from('drafts')
      .update({ status: 'approved' })
      .eq('id', body.draftId)

    await supabase.from('knowledge').insert({
      content: body.content,
      source_draft_id: body.draftId
    })
    return Response.json({ ok: true })
  }

  // ลบ knowledge
  if (body.action === 'delete_knowledge') {
    await supabase.from('knowledge').delete().eq('id', body.id)
    return Response.json({ ok: true })
  }

  // reject draft
  if (body.action === 'reject_draft') {
    await supabase.from('drafts')
      .update({ status: 'rejected' })
      .eq('id', body.draftId)
    return Response.json({ ok: true })
  }
}
