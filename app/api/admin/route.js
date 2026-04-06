// v4
import { NextResponse } from 'next/server'
import { Client } from '@line/bot-sdk'
import { createClient } from '@supabase/supabase-js'

const lineClient = new Client({
  channelAccessToken: process.env.LINE_ACCESS_TOKEN
})

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')
    console.log('GET action:', action)

    if (action === 'drafts') {
      const { data, error } = await supabase.from('drafts').select('*').order('created_at', { ascending: false })
      console.log('drafts:', data?.length, 'error:', error?.message)
      return NextResponse.json(data || [])
    }
    if (action === 'knowledge') {
      const { data, error } = await supabase.from('knowledge').select('*').order('created_at', { ascending: false })
      console.log('knowledge:', data?.length, 'error:', error?.message)
      return NextResponse.json(data || [])
    }
    if (action === 'groups') {
      const { data, error } = await supabase.from('groups').select('*').order('created_at', { ascending: false })
      console.log('groups:', data?.length, 'error:', error?.message)
      return NextResponse.json(data || [])
    }
    if (action === 'pending_groups') {
      const { data, error } = await supabase.from('pending_groups').select('*').order('created_at', { ascending: false })
      console.log('pending_groups:', data?.length, 'error:', error?.message)
      return NextResponse.json(data || [])
    }
    if (action === 'review_queue') {
      const { data } = await supabase
        .from('review_queue')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      return NextResponse.json(data || [])
    }
    if (action === 'members') {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('*')
        .order('message_count', { ascending: false })
      const { data: groups } = await supabase
        .from('groups')
        .select('id, name')
      const groupMap = Object.fromEntries((groups || []).map(g => [g.id, g.name]))
      const result = (profiles || []).map(p => ({ ...p, group_name: groupMap[p.group_id] || p.group_id }))
      return NextResponse.json(result)
    }
    return NextResponse.json({ error: 'unknown action' }, { status: 400 })

  } catch (err) {
    console.error('GET crash:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const body = await req.json()
    console.log('POST action:', body.action)

    if (body.action === 'approve_group') {
      await supabase.from('groups').insert({ id: body.groupId, name: body.name, type: body.type })
      await supabase.from('pending_groups').delete().eq('id', body.pendingId)
      return NextResponse.json({ ok: true })
    }
    if (body.action === 'reject_group') {
      await supabase.from('pending_groups').delete().eq('id', body.pendingId)
      return NextResponse.json({ ok: true })
    }
    if (body.action === 'approve_draft') {
      await supabase.from('drafts').update({ status: 'approved' }).eq('id', body.draftId)
      await supabase.from('knowledge').insert({ content: body.content, source_draft_id: body.draftId })
      return NextResponse.json({ ok: true })
    }
    if (body.action === 'reject_draft') {
      await supabase.from('drafts').update({ status: 'rejected' }).eq('id', body.draftId)
      return NextResponse.json({ ok: true })
    }
    if (body.action === 'delete_knowledge') {
      await supabase.from('knowledge').delete().eq('id', body.id)
      return NextResponse.json({ ok: true })
    }
    if (body.action === 'update_nickname') {
      await supabase.from('user_profiles').update({ nickname: body.nickname }).eq('id', body.id)
      return NextResponse.json({ ok: true })
    }
    if (body.action === 'approve_review') {
  // ส่งคำตอบเข้า LINE group
  await lineClient.pushMessage(body.groupId, {
    type: 'text',
    text: body.reply
  })
  await supabase.from('review_queue')
    .update({ status: 'approved' })
    .eq('id', body.id)
  return NextResponse.json({ ok: true })
}

if (body.action === 'reject_review') {
  await supabase.from('review_queue')
    .update({ status: 'rejected' })
    .eq('id', body.id)
  return NextResponse.json({ ok: true })
}

    return NextResponse.json({ error: 'unknown action' }, { status: 400 })

  } catch (err) {
    console.error('POST crash:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
