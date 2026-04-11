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
    if (action === 'programs') {
      const { data } = await supabase
        .from('programs')
        .select('*')
        .order('created_at', { ascending: true })
      return NextResponse.json(data || [])
    }
    if (action === 'program_days') {
      const programId = searchParams.get('program_id')
      if (!programId) return NextResponse.json({ error: 'program_id required' }, { status: 400 })
      const { data } = await supabase
        .from('program_days')
        .select('*')
        .eq('program_id', programId)
        .order('day_number', { ascending: true })
      return NextResponse.json(data || [])
    }
    if (action === 'group_programs') {
      const { data: gps } = await supabase
        .from('group_programs')
        .select('*, programs(name, duration_days, type)')
        .order('created_at', { ascending: false })
      const { data: groups } = await supabase.from('groups').select('id, name')
      const groupMap = Object.fromEntries((groups || []).map(g => [g.id, g.name]))
      const result = (gps || []).map(gp => ({
        ...gp,
        group_name: groupMap[gp.group_id] || gp.group_id,
        program_name: gp.programs?.name,
        program_duration: gp.programs?.duration_days,
        program_type: gp.programs?.type
      }))
      return NextResponse.json(result)
    }
    if (action === 'send_log') {
      const gpId = searchParams.get('group_program_id')
      if (!gpId) return NextResponse.json({ error: 'group_program_id required' }, { status: 400 })
      const { data } = await supabase
        .from('daily_send_log')
        .select('*')
        .eq('group_program_id', gpId)
        .order('day_number', { ascending: true })
      return NextResponse.json(data || [])
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
    if (body.action === 'update_program_day') {
      const { id, ...fields } = body
      delete fields.action
      await supabase.from('program_days').update(fields).eq('id', id)
      return NextResponse.json({ ok: true })
    }
    if (body.action === 'start_group_program') {
      // Upsert group_program: one active program per group
      await supabase.from('group_programs').upsert({
        group_id: body.groupId,
        program_id: body.programId,
        start_date: body.startDate || new Date().toISOString().split('T')[0],
        current_day: 1,
        paused: false
      }, { onConflict: 'group_id' })
      return NextResponse.json({ ok: true })
    }
    if (body.action === 'toggle_group_program') {
      await supabase.from('group_programs')
        .update({ paused: body.paused })
        .eq('id', body.id)
      return NextResponse.json({ ok: true })
    }
    if (body.action === 'stop_group_program') {
      await supabase.from('group_programs').delete().eq('id', body.id)
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: 'unknown action' }, { status: 400 })

  } catch (err) {
    console.error('POST crash:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
