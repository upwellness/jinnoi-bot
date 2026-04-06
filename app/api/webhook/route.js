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

const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`
const IMAGEN_URL = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${process.env.GEMINI_API_KEY}`

export const maxDuration = 60

function getPersonality() {
  return `คุณคือ "จิ้นน้อย" 🌟 assistant สาวนักวิชาการสายมาร์เก็ตติ้ง ประจำทีม UP Wellness
บุคลิก:
- 🎓 นักวิชาการ: อธิบายข้อมูลได้ลึก มีหลักการ น่าเชื่อถือ
- 📣 Marketing: รู้จักขายไอเดีย ดึงดูดความสนใจ
- 🌸 น่ารัก สนุก: ใช้ภาษาเข้าใจง่าย ไม่เป็นทางการเกิน
- ใช้ emoji 2-3 ตัวต่อข้อความ
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

      const { data: group } = await supabase
        .from('groups')
        .select('type, name')
        .eq('id', groupId)
        .single()

      console.log('=== GROUP:', JSON.stringify(group))

      if (!group) {
        await handleUnknownGroup(groupId)
        continue
      }

      if (group.type === 'trainer') {
        await handleTrainer(event, text, groupId, userId)
      } else if (group.type === 'customer') {
        await handleCustomer(event, text, groupId, userId)
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
    } catch (e) {}

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
    await researchAndSaveDrafts(text, groupId, userId)
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
async function handleCustomer(event, text, groupId, userId) {
  if (!groupHistory[groupId]) groupHistory[groupId] = []
  groupHistory[groupId].push({ role: 'user', text, timestamp: Date.now() })
  if (groupHistory[groupId].length > 10) {
    groupHistory[groupId] = groupHistory[groupId].slice(-10)
  }

  // เช็คว่าขอ image ไหม
  const isImageRequest = /^(สร้างรูป|วาดรูป|gen รูป|image:|รูปภาพ:)/i.test(text)
  if (isImageRequest) {
    await handleImageRequest(event, text, groupId)
    return
  }

  const result = await decideAndAnswer(text, groupId)
  console.log('=== DECISION:', JSON.stringify(result))

  if (!result.shouldReply) {
    console.log('=== BOT SILENT:', result.reason)
    return
  }

  // high-risk → ส่ง review queue ไม่ตอบทันที
  if (result.isHighRisk) {
    await supabase.from('review_queue').insert({
      group_id: groupId,
      line_user_id: userId,
      question: text,
      suggested_reply: result.reply,
      risk_reason: result.riskReason,
      status: 'pending'
    })

    await lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: '🙏 ขอบคุณสำหรับคำถามนะคะ จิ้นน้อยขอให้ทีมผู้เชี่ยวชาญตรวจสอบข้อมูลให้ละเอียดก่อนนะคะ จะรีบแจ้งกลับเร็วๆ นี้ค่ะ 💙'
    })
    return
  }

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
}

// ==============================
// SMART REPLY + HIGH-RISK CHECK
// ==============================
async function decideAndAnswer(question, groupId) {
  try {
    const { data: knowledge } = await supabase
      .from('knowledge')
      .select('content')
      .order('created_at', { ascending: false })

    const knowledgeText = knowledge?.length > 0
      ? knowledge.map(k => k.content).join('\n---\n')
      : 'ยังไม่มีข้อมูล'

    const history = groupHistory[groupId] || []
    const historyText = history
      .slice(-6)
      .map(m => `${m.role === 'user' ? 'ลูกค้า' : 'จิ้นน้อย'}: ${m.text}`)
      .join('\n')

    const response = await fetch(GEMINI_URL, {
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

## วิเคราะห์และตัดสินใจ:
กฎ shouldReply:
- คำถามชัดเจน → true
- ทักทาย → true ทักกลับสั้นๆ
- พูดคุยทั่วไป → false
- คุยมาหลายประโยคแล้ว → true ร่วมวง
- mention จิ้นน้อย → true เสมอ

กฎ isHighRisk (true ถ้าเข้าข่าย):
- ถามเรื่องโรค วินิจฉัยอาการ ยา การรักษา
- แสดงความไม่พอใจ ร้องเรียน โกรธ

ตอบ 2 ส่วนแยกกัน:

ส่วนที่ 1 — JSON metadata (สั้นๆ เท่านั้น):
{"shouldReply":true/false,"isHighRisk":true/false,"riskReason":"สั้นๆ","reason":"สั้นๆ"}

ส่วนที่ 2 — REPLY:
[ข้อความตอบลูกค้าในสไตล์จิ้นน้อย ถ้า shouldReply: true]`
          }]
        }],
        tools: [{ google_search: {} }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 3000
        }
      })
    })

    const data = await response.json()
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text
    console.log('=== RAW TEXT:', rawText)

    if (!rawText) return { shouldReply: false }

    // strip markdown code fences ก่อน (Gemini บางครั้ง wrap JSON ใน ```json...```)
    const cleanText = rawText.replace(/```[a-z]*\n?/gi, '').trim()

    // แยก JSON และ reply ออกจากกัน
    const jsonMatch = cleanText.match(/\{[^{}]*\}/)
    if (!jsonMatch) return { shouldReply: false }

    const meta = JSON.parse(jsonMatch[0])

    // ดึง reply จากส่วนหลัง JSON
    const replyMatch = cleanText.slice(cleanText.indexOf(jsonMatch[0]) + jsonMatch[0].length).trim()

    return {
      ...meta,
      reply: replyMatch || ''
    }

  } catch (err) {
    console.error('=== decideAndAnswer error:', err.message)
    return { shouldReply: false }
  }
}

// ==============================
// IMAGE GENERATION — Imagen 3
// ==============================
async function handleImageRequest(event, text, groupId) {
  try {
    await lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: '🎨 จิ้นน้อยกำลังสร้างรูปให้นะคะ รอสักครู่ค่ะ...'
    })

    const prompt = text
      .replace(/^สร้างรูป/i, '')
      .replace(/^วาดรูป/i, '')
      .replace(/^gen รูป/i, '')
      .replace(/^image:/i, '')
      .replace(/^รูปภาพ:/i, '')
      .trim()

    console.log('=== IMAGE PROMPT:', prompt)

    const response = await fetch(IMAGEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{
          prompt: `${prompt}, professional product photography, clean background, high quality`
        }],
        parameters: {
          sampleCount: 1,
          aspectRatio: '1:1'
        }
      })
    })

    const data = await response.json()
    console.log('=== IMAGEN RESPONSE:', JSON.stringify(data))

    const base64Image = data?.predictions?.[0]?.bytesBase64Encoded
    if (!base64Image) throw new Error('No image generated: ' + JSON.stringify(data?.error || ''))

    // อัปโหลด base64 ขึ้น LINE
    const imageBuffer = Buffer.from(base64Image, 'base64')

    // บันทึกลง Supabase Storage แล้วได้ URL
    const fileName = `images/${Date.now()}.png`
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('generated-images')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: false
      })

    if (uploadError) throw new Error('Upload error: ' + uploadError.message)

    const { data: urlData } = supabase
      .storage
      .from('generated-images')
      .getPublicUrl(fileName)

    const imageUrl = urlData.publicUrl
    console.log('=== IMAGE URL:', imageUrl)

    // ส่งรูปเข้า LINE
    await lineClient.pushMessage(groupId, {
      type: 'image',
      originalContentUrl: imageUrl,
      previewImageUrl: imageUrl
    })

  } catch (err) {
    console.error('=== IMAGE ERROR:', err.message)
    await lineClient.pushMessage(groupId, {
      type: 'text',
      text: `❌ สร้างรูปไม่สำเร็จค่ะ\nError: ${err.message}\n\nลองใหม่นะคะ 🙏`
    })
  }
}

// ==============================
// RESEARCH — ไม่มี search
// ==============================
async function researchAndSaveDrafts(text, groupId, userId) {
  const topic = text
    .replace(/^research:/i, '')
    .replace(/^ค้นหา:/i, '')
    .replace(/^สรุป:/i, '')
    .trim()

  console.log('=== RESEARCH START:', topic)

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `สรุปความรู้เกี่ยวกับ "${topic}" เป็นภาษาไทย

สร้าง 5-7 ข้อความรู้ที่:
- เป็นประโยคสมบูรณ์ มีบริบทครบ
- เหมาะนำไปตอบคำถามลูกค้า
- ถูกต้อง เชื่อถือได้
- ภาษาเข้าใจง่าย

ตอบ JSON array เท่านั้น ห้ามมีข้อความอื่น:
["ข้อ1...","ข้อ2...","ข้อ3..."]`
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2000
        }
      })
    })

    const data = await response.json()
    console.log('=== RESEARCH GEMINI:', JSON.stringify(data))

    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!rawText) throw new Error('No response: ' + JSON.stringify(data?.error || ''))

    const match = rawText.match(/\[[\s\S]*\]/)
    if (!match) throw new Error('No JSON array found')

    const items = JSON.parse(match[0])
    if (!Array.isArray(items) || items.length === 0) throw new Error('Empty array')

    await supabase.from('drafts').insert(
      items.map(item => ({
        content: item,
        group_id: groupId,
        line_user_id: userId,
        status: 'pending'
      }))
    )

    await lineClient.pushMessage(groupId, {
      type: 'text',
      text: `✅ Research เสร็จแล้วค่ะ!\n\n📚 หัวข้อ: ${topic}\n🔖 สร้างความรู้ได้ ${items.length} ข้อ\n\nรอ admin อนุมัติใน dashboard นะคะ 🙏`
    })

  } catch (err) {
    console.error('=== RESEARCH ERROR:', err.message)
    await lineClient.pushMessage(groupId, {
      type: 'text',
      text: `❌ Research ไม่สำเร็จค่ะ\nError: ${err.message}\n\nลองใหม่นะคะ 🙏`
    })
  }
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
    await supabase.from('group_programs').update({ current_day_override: day }).eq('id', gp.id)
    return `✅ ตั้งค่าแล้วค่ะ! จะส่งเนื้อหาวันที่ ${day} ในรอบถัดไปเลยนะคะ 🎯`
  }

  if (cmd === '/หยุด') {
    const reason = parts.slice(1).join(' ') || 'ไม่ระบุ'
    await supabase.from('group_programs')
      .update({ is_paused: true, pause_reason: reason })
      .eq('group_id', groupId).eq('is_active', true)
    return `⏸ หยุดโปรแกรมชั่วคราวแล้วค่ะ\nเหตุผล: ${reason}\n\nพิมพ์ /เริ่ม เพื่อเริ่มใหม่นะคะ`
  }

  if (cmd === '/เริ่ม') {
    await supabase.from('group_programs')
      .update({ is_paused: false, pause_reason: null })
      .eq('group_id', groupId).eq('is_active', true)
    return `▶️ เริ่มโปรแกรมต่อแล้วค่ะ จิ้นน้อยพร้อมแล้ว! 💪`
  }

  if (cmd === '/สถานะ') {
    const { data: gp } = await supabase
      .from('group_programs')
      .select('*, programs(name)')
      .eq('group_id', groupId).eq('is_active', true)
      .single()
    if (!gp) return '❌ ไม่พบโปรแกรมที่ active ในกลุ่มนี้ค่ะ'
    const today = new Date()
    const start = new Date(gp.start_date)
    const diffDays = Math.floor((today - start) / (1000 * 60 * 60 * 24))
    const currentDay = gp.current_day_override ?? (diffDays + 1)
    return `📊 สถานะโปรแกรมค่ะ\n\n📚 ${gp.programs.name}\n📅 วันที่: ${currentDay}\n⏱ เริ่มตั้งแต่: ${gp.start_date}\n${gp.is_paused ? '⏸ หยุดชั่วคราว' : '▶️ กำลังทำงาน'}${gp.current_day_override ? `\n⚡ Override: วันที่ ${gp.current_day_override}` : ''}`
  }

  if (cmd === '/ช่วยเหลือ') {
    return `🌸 คำสั่งจิ้นน้อยค่ะ\n\n/วันที่ [เลข] — ข้ามไปวันที่ต้องการ\n/หยุด [เหตุผล] — หยุดโปรแกรม\n/เริ่ม — เริ่มโปรแกรมต่อ\n/สถานะ — ดูสถานะปัจจุบัน\n\n💡 research: [หัวข้อ] — ให้จิ้นน้อยค้นข้อมูล`
  }

  return `❓ ไม่รู้จักคำสั่งนี้ค่ะ พิมพ์ /ช่วยเหลือ เพื่อดูคำสั่งทั้งหมดนะคะ 🌸`
}