import { NextResponse } from 'next/server'
import { Client } from '@line/bot-sdk'
import { createClient } from '@supabase/supabase-js'

const lineClient = new Client({ channelAccessToken: process.env.LINE_ACCESS_TOKEN })

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = 'gemini-2.5-flash'

async function callGemini(prompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          thinkingConfig: { thinkingBudget: 0 }
        }
      })
    }
  )
  const data = await res.json()
  return data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || ''
}

// DISC tone guide
const DISC_TONE = {
  D: 'กระชับ ตรงประเด็น เน้นผลลัพธ์ ไม่อ้อมค้อม',
  I: 'ร่าเริง มีพลัง เน้นแรงบันดาลใจ ใช้ emoji',
  S: 'อบอุ่น ห่วงใย ค่อยๆ สนับสนุน ไม่กดดัน',
  C: 'มีข้อมูลเชิงลึก อธิบายเหตุผล เน้นความแม่นยำ'
}

function discTone(type) {
  return DISC_TONE[type] || 'เป็นมิตร ให้กำลังใจ'
}

async function generateMorningMessage(slot, dayData, members) {
  // Morning: full meal plan for the day + morning trick + motivation
  const memberList = members.map(m => {
    const name = m.nickname || m.display_name || 'เพื่อน'
    const disc = m.disc_type || 'S'
    return `- ${name} (DISC: ${disc}, tone: ${discTone(disc)})`
  }).join('\n')

  const prompt = `คุณคือ จิ้นน้อย โค้ชด้านสุขภาพและลดน้ำหนักของ UP Labs

กลุ่มนี้กำลังทำ program วันที่ ${dayData.day_number}
เมนูวันนี้:
- เช้า: ${dayData.meal_morning}
- กลางวัน: ${dayData.meal_afternoon}
- เย็น: ${dayData.meal_evening}
- ผลิตภัณฑ์เสริม: ${dayData.supplement || 'ตามปกติ'}
- เทคนิคเช้า: ${dayData.trick_morning}
${dayData.content_keyword ? `- ธีมวันนี้: ${dayData.content_keyword}` : ''}

สมาชิกในกลุ่ม:
${memberList}

สร้างข้อความเช้าภาษาไทย 1 ข้อความ สำหรับส่งใน LINE group:
1. ทักทายสมาชิกทุกคนโดยเรียกชื่อแต่ละคน (ใช้ @ชื่อ) พร้อมให้กำลังใจตาม DISC ของแต่ละคนในประโยคเดียวกัน
2. แสดงเมนูอาหารทั้งวัน (เช้า กลางวัน เย็น) + ผลิตภัณฑ์เสริม
3. เทคนิคเช้าวันนี้
4. ข้อความจบที่สร้างแรงบันดาลใจ

ห้ามยาวเกิน 20 บรรทัด ไม่ต้องมีหัวข้อ ให้อ่านง่ายเป็นธรรมชาติ`

  return callGemini(prompt)
}

async function generateSlotMessage(slot, dayData, members) {
  const slotTh = slot === 'afternoon' ? 'กลางวัน' : 'เย็น'
  const mealKey = slot === 'afternoon' ? 'meal_afternoon' : 'meal_evening'
  const trickKey = slot === 'afternoon' ? 'trick_afternoon' : 'trick_evening'

  const memberList = members.map(m => {
    const name = m.nickname || m.display_name || 'เพื่อน'
    const disc = m.disc_type || 'S'
    return `- ${name} (DISC: ${disc}, tone: ${discTone(disc)})`
  }).join('\n')

  const prompt = `คุณคือ จิ้นน้อย โค้ชด้านสุขภาพและลดน้ำหนักของ UP Labs

กลุ่มนี้กำลังทำ program วันที่ ${dayData.day_number}
มื้อ${slotTh}วันนี้: ${dayData[mealKey]}
เทคนิค${slotTh}: ${dayData[trickKey] || 'รับประทานให้ครบถ้วน ไม่ข้ามมื้อ'}

สมาชิกในกลุ่ม:
${memberList}

สร้างข้อความ${slotTh}ภาษาไทย 1 ข้อความ สำหรับส่งใน LINE group:
1. เรียกชื่อสมาชิก (ใช้ @ชื่อ) พร้อมให้กำลังใจสั้นๆ ตาม DISC ของแต่ละคน
2. แจ้งเมนูมื้อ${slotTh}
3. เทคนิคหรือเคล็ดลับสั้นๆ สำหรับมื้อนี้

ห้ามยาวเกิน 10 บรรทัด สั้น กระชับ อ่านง่าย ไม่เป็นทางการเกินไป`

  return callGemini(prompt)
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const time = searchParams.get('time') // morning | afternoon | evening

    // Verify cron secret to prevent unauthorized calls
    const authHeader = req.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    if (!['morning', 'afternoon', 'evening'].includes(time)) {
      return NextResponse.json({ error: 'invalid time param' }, { status: 400 })
    }

    // Get all active, non-paused group programs
    const { data: groupPrograms, error: gpError } = await supabase
      .from('group_programs')
      .select('id, group_id, program_id, start_date, current_day, paused')
      .eq('paused', false)

    if (gpError) throw gpError
    if (!groupPrograms?.length) {
      return NextResponse.json({ ok: true, sent: 0, message: 'no active programs', debug_supabase_url: process.env.SUPABASE_URL?.slice(0, 40) })
    }
    console.log('[CRON DEBUG] groupPrograms:', JSON.stringify(groupPrograms))

    const today = new Date().toISOString().split('T')[0]
    const results = []

    for (const gp of groupPrograms) {
      try {
        // Calculate current day from start_date
        const startDate = new Date(gp.start_date)
        const nowDate = new Date(today)
        const dayNumber = Math.floor((nowDate - startDate) / (1000 * 60 * 60 * 24)) + 1

        // Skip if program hasn't started or day is out of range
        if (dayNumber < 1) {
          results.push({ group_id: gp.group_id, skipped: 'not started yet' })
          continue
        }

        // Check for duplicate send (idempotency)
        const { data: alreadySent } = await supabase
          .from('daily_send_log')
          .select('id')
          .eq('group_program_id', gp.id)
          .eq('day_number', dayNumber)
          .eq('send_slot', time)
          .maybeSingle()

        if (alreadySent) {
          results.push({ group_id: gp.group_id, skipped: 'already sent' })
          continue
        }

        // Fetch program day content
        const { data: dayData, error: dayError } = await supabase
          .from('program_days')
          .select('*')
          .eq('program_id', gp.program_id)
          .eq('day_number', dayNumber)
          .maybeSingle()

        if (dayError || !dayData) {
          results.push({ group_id: gp.group_id, skipped: `no content for day ${dayNumber}` })
          continue
        }

        // Fetch group members with profiles
        const { data: members } = await supabase
          .from('user_profiles')
          .select('id, display_name, nickname, disc_type')
          .eq('group_id', gp.group_id)

        if (!members?.length) {
          results.push({ group_id: gp.group_id, skipped: 'no members' })
          continue
        }

        // Generate message based on time slot
        let messageText
        if (time === 'morning') {
          messageText = await generateMorningMessage(time, dayData, members)
        } else {
          messageText = await generateSlotMessage(time, dayData, members)
        }

        if (!messageText?.trim()) {
          results.push({ group_id: gp.group_id, error: 'empty message from AI' })
          continue
        }

        // Send to LINE group
        await lineClient.pushMessage(gp.group_id, {
          type: 'text',
          text: messageText
        })

        // Log the send (UNIQUE constraint prevents duplicates)
        await supabase.from('daily_send_log').insert({
          group_program_id: gp.id,
          day_number: dayNumber,
          send_slot: time,
          message_text: messageText
        })

        // Update current_day on group_programs
        if (time === 'morning') {
          await supabase
            .from('group_programs')
            .update({ current_day: dayNumber })
            .eq('id', gp.id)
        }

        results.push({ group_id: gp.group_id, day: dayNumber, slot: time, ok: true })

      } catch (err) {
        console.error(`Error processing group ${gp.group_id}:`, err.message)
        results.push({ group_id: gp.group_id, error: err.message })
      }
    }

    const sent = results.filter(r => r.ok).length
    console.log(`[CRON ${time}] processed ${groupPrograms.length} programs, sent ${sent}`)
    return NextResponse.json({ ok: true, time, sent, results, debug_group_programs: groupPrograms.map(g => ({ id: g.id, group_id: g.group_id, paused: g.paused })), debug_supabase_url: process.env.SUPABASE_URL?.slice(0, 40) })

  } catch (err) {
    console.error('[CRON] crash:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
