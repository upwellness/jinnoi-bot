import { createClient } from '@supabase/supabase-js'
import { Client } from '@line/bot-sdk'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const lineClient = new Client({
  channelAccessToken: process.env.LINE_ACCESS_TOKEN
})

function getPersonality() {
  return `คุณคือ "จิ้นน้อย" 🌟 assistant สาวนักวิชาการสายมาร์เก็ตติ้ง ประจำทีม UP Labs
บุคลิก: นักวิชาการ + Marketing + น่ารัก สนุก
ใช้ emoji 2-3 ตัว ลงท้ายด้วย "นะคะ" "ค่ะ" ภาษาเข้าใจง่าย อบอุ่น ให้กำลังใจจริงใจ`
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  if (searchParams.get('secret') !== process.env.CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  const today = new Date()
  const currentTime = `${String(today.getHours()).padStart(2,'0')}:${String(today.getMinutes()).padStart(2,'0')}`

  const { data: activePrograms } = await supabase
    .from('group_programs')
    .select(`*, programs(name), groups(id, name)`)
    .eq('is_active', true)
    .eq('is_paused', false)  // ข้าม group ที่ pause อยู่

  if (!activePrograms?.length) {
    return Response.json({ sent: 0, message: 'No active programs' })
  }

  let sentCount = 0

  for (const gp of activePrograms) {
    // ถ้ามี override ใช้ override ถ้าไม่มีคำนวณจาก start_date
    let currentDay
    if (gp.current_day_override !== null) {
      currentDay = gp.current_day_override
    } else {
      const start = new Date(gp.start_date)
      const diffDays = Math.floor((today - start) / (1000 * 60 * 60 * 24))
      currentDay = diffDays + 1
    }

    const { data: msg } = await supabase
      .from('program_messages')
      .select('*')
      .eq('program_id', gp.program_id)
      .eq('day', currentDay)
      .single()

    if (!msg) continue

    // เช็คเวลา tolerance 5 นาที
    const [msgHour, msgMin] = msg.send_time.split(':').map(Number)
    const [curHour, curMin] = currentTime.split(':').map(Number)
    const diff = Math.abs((msgHour * 60 + msgMin) - (curHour * 60 + curMin))
    if (diff > 5) continue

    const finalMessage = await generateFollowUp(
      msg.content,
      gp.programs.name,
      currentDay,
      gp.group_id
    )

    await lineClient.pushMessage(gp.group_id, {
      type: 'text',
      text: finalMessage
    })

    await supabase.from('messages').insert({
      group_id: gp.group_id,
      line_user_id: 'bot_cron',
      content: finalMessage,
      direction: 'out'
    })

    // ถ้ามี override → clear ออกหลังส่งแล้ว (วันถัดไปกลับคำนวณปกติ)
    if (gp.current_day_override !== null) {
      await supabase
        .from('group_programs')
        .update({ current_day_override: null })
        .eq('id', gp.id)
    }

    sentCount++
    console.log(`Sent day ${currentDay} to ${gp.group_id}`)
  }

  return Response.json({ sent: sentCount, time: currentTime })
}

async function generateFollowUp(baseContent, programName, day, groupId) {
  try {
    const { data: knowledge } = await supabase
      .from('knowledge')
      .select('content')
      .limit(10)

    const knowledgeText = knowledge?.map(k => k.content).join('\n---\n') || ''

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${getPersonality()}

## ข้อมูลโปรแกรม:
ชื่อ: ${programName}
วันที่: ${day}

## เนื้อหาที่ต้องส่งวันนี้:
${baseContent}

## ข้อมูลเพิ่มเติม:
${knowledgeText}

## งานของคุณ:
เขียนข้อความ follow-up ส่งเข้ากลุ่มในสไตล์จิ้นน้อย
- เปิดด้วยบอกวันที่
- สรุปสิ่งที่ต้องทำวันนี้ชัดเจน เข้าใจง่าย
- ให้กำลังใจอบอุ่น จริงใจ
- ปิดด้วยชวนแชร์ความคืบหน้าในกลุ่ม`
            }]
          }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 600 }
        })
      }
    )

    const data = await response.json()
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || baseContent
  } catch (err) {
    console.error('GenerateFollowUp error:', err)
    return baseContent
  }
}
