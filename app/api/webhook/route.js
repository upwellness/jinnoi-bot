import { Client, validateSignature } from '@line/bot-sdk'
import { createClient } from '@supabase/supabase-js'

const lineClient = new Client({
  channelAccessToken: process.env.LINE_ACCESS_TOKEN
})

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const groupHistory = {}

function getPersonality() {
  return `คุณคือ "จิ้นน้อย" 🌟 assistant สาวนักวิชาการสายมาร์เก็ตติ้ง ประจำทีม UP Labs

บุคลิก:
- 🎓 นักวิชาการ: อธิบายข้อมูลได้ลึก มีหลักการ น่าเชื่อถือ
- 📣 Marketing: รู้จักขายไอเดีย ดึงดูดความสนใจ
- 🌸 น่ารัก สนุก: ใช้ภาษาเข้าใจง่าย ไม่เป็นทางการเกิน
- ใช้ emoji 2-3 ตัวต่อข้อความ ไม่เยอะเกิน
- ลงท้ายด้วย "นะคะ" "ค่ะ" "เลยค่ะ"
- ให้กำลังใจอบอุ่น จริงใจ ไม่แข็งทื่อ
- ถ้าอธิบายวิชาการ ให้เปรียบเทียบให้เข้าใจง่ายเสมอ`
}

export async function POST(req) {
  try {
    const body = await req.text()
    const signature = req.headers.get('x-line-signature')

    if (!validateSignature(body, process.env.LINE_CHANNEL_SECRET, signature)) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { events } = JSON.parse(body)
    console.log('=== WEBHOOK events:', events?.length)

    for (const event of events) {
      if (event.type !== 'message' || event.message.type !== 'text') continue
      if (!event.source.groupId) continue

      const groupId = event.source.groupId
      const userId = event.source.userId
      const text = event.message.text.trim()

      console.log('=== MESSAGE:', groupId, text)

      await supabase.from('messages').insert({
        group_id: groupId,
        line_user_id: userId,
        content: text,
        direction: 'in'
      })

      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('type, name')
        .eq('id', groupId)
        .single()

      console.log('=== GROUP:', JSON.stringify(group), 'error:', groupError?.message)

      if (!group) {
        console.log('=== UNKNOWN GROUP → pending')
        await handleUnknownGroup(groupId)
        continue
      }

      console.log('=== GROUP TYPE:', group.type)

      if (group.type === 'trainer') {
        await handleTrainer(event, text, groupId, userId)
      } else if (group.type === 'customer') {
        console.log('=== HANDLING CUSTOMER')
        await handleCustomer(event, text, groupId)
      }
    }

    return new Response('OK', { status: 200 })

  } catch (err) {
    console.error('=== WEBHOOK CRASH:', err.message)
    return new Response('Error', { status: 500 })
  }
}

// ==============================
// UNKNOWN GROUP → PENDING
// ==============================
async function handleUnknownGroup(groupId) {
  try {
    const { data: existing } = await supabase
      .from('pending_groups')
      .select('id')
      .eq('group_id', groupId)
      .single()

    if (existing) return

    let groupName = 'Unknown Group'
    try {
      const res = await fetch(
        `https://api.line.me/v2/bot/group/${groupId}/summary`,
        { headers: { Authorization: `Bearer ${process.env.LINE_ACCESS_TOKEN}` } }
      )
      const info = await res.json()
      groupName = info.groupName || groupId
    } catch (e) {
      console.log('Cannot fetch group name:', e.message)
    }

    await supabase.from('pending_groups').insert({
      group_id: groupId,
      group_name: groupName
    })

    console.log('=== SAVED PENDING GROUP:', groupId, groupName)
  } catch (err) {
    console.error('handleUnknownGroup error:', err.message)
  }
}

// ==============================
// TRAINER
// ==============================
async function handleTrainer(event, text, groupId, userId) {
  if (text.startsWith('/')) {
    const reply = await handleCommand(text, groupId)
    await lineClient.replyMessage(event.replyToken, { type: 'text', text: reply })
    return
  }

  const isResearch = /^(research:|ค้นหา:|สรุป:)/i.test(text)
  if (isResearch) {
    await lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: '🔍 จิ้นน้อยกำลัง research ข้อมูลให้นะคะ รอสักครู่ค่ะ...'
    })
    researchAndSaveDrafts(text, groupId, userId)
    return
  }

  await supabase.from('drafts').insert({
    content: text,
    group_id: groupId,
    line_user_id: userId,
    status: 'pending'
  })

  await lineClient.replyMessage(event.replyToken, {
    type: 'text',
    text: '📝 บันทึกแล้วค่ะ รอ admin อนุมัติก่อนนะคะ 🙏\n\n💡 พิมพ์ "research: [หัวข้อ]" ให้จิ้นน้อยค้นหาข้อมูลให้อัตโนมัติได้เลยค่ะ'
  })
}

// ==============================
// CUSTOMER
// ==============================
async function handleCustomer(event, text, groupId) {
  if (!groupHistory[groupId]) groupHistory[groupId] = []
  groupHistory[groupId].push({ role: 'user', text, timestamp: Date.now() })

  if (groupHistory[groupId].length > 10) {
    groupHistory[groupId] = groupHistory[groupId].slice(-10)
  }

  console.log('=== CALLING decideAndAnswer')
  const result = await decideAndAnswer(text, groupId)
  console.log('=== DECISION RESULT:', JSON.stringify(result))

  if (result.shouldReply) {
    await lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: result.reply
    })

    await supabase.from('messages').insert({
      group_id: groupId,
      line_user_id: 'bot',
      content: result.reply,
      direction: 'out'
    })

    groupHistory[groupId].push({ role: 'bot', text: result.reply, timestamp: Date.now() })
  } else {
    console.log('=== BOT DECIDED NOT TO REPLY:', result.reason)
  }
}

// ==============================
// SMART REPLY
// ==============================
async function decideAndAnswer(question, groupId) {
  try {
    const { data: knowledge } = await supabase
      .from('knowledge')
      .select('content')
      .order('created_at', { ascending: false })

    console.log('=== KNOWLEDGE COUNT:', knowledge?.length)

    const knowledgeText = knowledge?.length > 0
      ? knowledge.map(k => k.content).join('\n---\n')
      : 'ยังไม่มีข้อมูล'

    const history = groupHistory[groupId] || []
    const historyText = history
      .slice(-6)
      .map(m => `${m.role === 'user' ? 'ลูกค้า' : 'จิ้นน้อย'}: ${m.text}`)
      .join('\n')

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${getPersonality()}

## ข้อมูลหลักจากทีมงาน:
${knowledgeText}

## บทสนทนาล่าสุด:
${historyText || 'ยังไม่มีบทสนทนา'}

## message ล่าสุด:
"${question}"

ตอบ JSON เท่านั้น ให้สั้นที่สุด:
{"shouldReply":true,"reason":"สั้นๆ","reply":"คำตอบ"}`
            }]
          }],
          tools: [{ google_search: {} }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1500
          }
        })
      }
    )

    const data = await response.json()
    console.log('=== GEMINI RAW:', JSON.stringify(data))

    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text
    console.log('=== RAW TEXT:', rawText)

    if (!rawText) {
      console.log('=== NO RAW TEXT, finishReason:', data?.candidates?.[0]?.finishReason)
      return { shouldReply: false }
    }

    const match = rawText.match(/\{[\s\S]*?\}/)
    console.log('=== MATCH:', match?.[0])

    if (!match) return { shouldReply: false }

    const result = JSON.parse(match[0])
    console.log('=== RESULT:', JSON.stringify(result))
    return result

  } catch (err) {
    console.error('=== decideAndAnswer error:', err.message)
    return { shouldReply: false }
  }
}

// ==============================
// RESEARCH
// ==============================
async function researchAndSaveDrafts(text, groupId, userId) {
  const topic = text
    .replace(/^research:/i, '')
    .replace(/^ค้นหา:/i, '')
    .replace(/^สรุป:/i, '')
    .trim()

  console.log('=== TRIGGER RESEARCH:', topic)

  const url = `https://${process.env.VERCEL_URL}/api/research`
  console.log('=== CALLING URL:', url)

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, groupId, userId })
  })
  .then(r => console.log('=== RESEARCH TRIGGERED:', r.status))
  .catch(err => console.error('=== RESEARCH TRIGGER ERROR:', err.message))
}


// ==============================
// PROGRAM COMMANDS
// ==============================
async function handleCommand(text, groupId) {
  const parts = text.trim().split(' ')
  const cmd = parts[0].toLowerCase()

  if (cmd === '/วันที่' && parts[1]) {
    const day = parseInt(parts[1])
    if (isNaN(day)) return '❌ รูปแบบไม่ถูกต้องค่ะ ใช้ /วันที่ 5'

    const { data: gp } = await supabase
      .from('group_programs')
      .select('id, programs(name)')
      .eq('group_id', groupId)
      .eq('is_active', true)
      .single()

    if (!gp) return '❌ ไม่พบโปรแกรมที่ active ในกลุ่มนี้ค่ะ'

    await supabase
      .from('group_programs')
      .update({ current_day_override: day })
      .eq('id', gp.id)

    return `✅ ตั้งค่าแล้วค่ะ! กลุ่มนี้จะส่งเนื้อหา วันที่ ${day} ในรอบถัดไปเลยนะคะ 🎯`
  }

  if (cmd === '/หยุด') {
    const reason = parts.slice(1).join(' ') || 'ไม่ระบุ'
    await supabase
      .from('group_programs')
      .update({ is_paused: true, pause_reason: reason })
      .eq('group_id', groupId)
      .eq('is_active', true)
    return `⏸ หยุดโปรแกรมชั่วคราวแล้วค่ะ\nเหตุผล: ${reason}\n\nพิมพ์ /เริ่ม เพื่อเริ่มใหม่นะคะ`
  }

  if (cmd === '/เริ่ม') {
    await supabase
      .from('group_programs')
      .update({ is_paused: false, pause_reason: null })
      .eq('group_id', groupId)
      .eq('is_active', true)
    return `▶️ เริ่มโปรแกรมต่อแล้วค่ะ จิ้นน้อยพร้อมแล้ว! 💪`
  }

  if (cmd === '/สถานะ') {
    const { data: gp } = await supabase
      .from('group_programs')
      .select('*, programs(name)')
      .eq('group_id', groupId)
      .eq('is_active', true)
      .single()

    if (!gp) return '❌ ไม่พบโปรแกรมที่ active ในกลุ่มนี้ค่ะ'

    const today = new Date()
    const start = new Date(gp.start_date)
    const diffDays = Math.floor((today - start) / (1000 * 60 * 60 * 24))
    const currentDay = gp.current_day_override ?? (diffDays + 1)

    return `📊 สถานะโปรแกรมค่ะ\n\n` +
      `📚 ${gp.programs.name}\n` +
      `📅 วันที่: ${currentDay}\n` +
      `⏱ เริ่มตั้งแต่: ${gp.start_date}\n` +
      `${gp.is_paused ? '⏸ สถานะ: หยุดชั่วคราว' : '▶️ สถานะ: กำลังทำงาน'}` +
      `${gp.current_day_override ? `\n⚡ Override: วันที่ ${gp.current_day_override}` : ''}`
  }

  if (cmd === '/ช่วยเหลือ') {
    return `🌸 คำสั่งจิ้นน้อยค่ะ\n\n` +
      `/วันที่ [เลข] — ข้ามไปวันที่ต้องการ\n` +
      `/หยุด [เหตุผล] — หยุดโปรแกรมชั่วคราว\n` +
      `/เริ่ม — เริ่มโปรแกรมต่อ\n` +
      `/สถานะ — ดูสถานะปัจจุบัน\n\n` +
      `💡 research: [หัวข้อ] — ให้จิ้นน้อยค้นข้อมูล`
  }

  return `❓ ไม่รู้จักคำสั่งนี้ค่ะ พิมพ์ /ช่วยเหลือ เพื่อดูคำสั่งทั้งหมดนะคะ 🌸`
}