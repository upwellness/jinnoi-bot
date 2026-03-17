import { Client, validateSignature } from '@line/bot-sdk'
import { createClient } from '@supabase/supabase-js'

const lineClient = new Client({
  channelAccessToken: process.env.LINE_ACCESS_TOKEN
})

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// เก็บ conversation history ของแต่ละ group ไว้ใน memory
const groupHistory = {}

export async function POST(req) {
  const body = await req.text()
  const signature = req.headers.get('x-line-signature')

  if (!validateSignature(body, process.env.LINE_CHANNEL_SECRET, signature)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { events } = JSON.parse(body)

  for (const event of events) {
    if (event.type !== 'message' || event.message.type !== 'text') continue
    if (!event.source.groupId) continue

    const groupId = event.source.groupId
    const userId = event.source.userId
    const text = event.message.text.trim()

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

    if (!group) {
      console.log('Unknown group:', groupId)
      continue
    }

    if (group.type === 'trainer') {
      const isResearch = /^(research:|ค้นหา:|สรุป:)/i.test(text)

      if (isResearch) {
        await lineClient.replyMessage(event.replyToken, {
          type: 'text',
          text: '🔍 กำลัง research ข้อมูล รอสักครู่นะครับ...'
        })
        researchAndSaveDrafts(text, groupId, userId)

      } else {
        await supabase.from('drafts').insert({
          content: text,
          group_id: groupId,
          line_user_id: userId,
          status: 'pending'
        })
        await lineClient.replyMessage(event.replyToken, {
          type: 'text',
          text: '📝 บันทึกแล้วครับ รอ admin อนุมัติ\n\n💡 พิมพ์ "research: [หัวข้อ]" ให้ AI ค้นหาข้อมูลให้อัตโนมัติ'
        })
      }

    } else if (group.type === 'customer') {
      // เพิ่ม message เข้า history ของ group นี้
      if (!groupHistory[groupId]) groupHistory[groupId] = []
      groupHistory[groupId].push({ role: 'user', text, timestamp: Date.now() })

      // เก็บแค่ 10 message ล่าสุด
      if (groupHistory[groupId].length > 10) {
        groupHistory[groupId] = groupHistory[groupId].slice(-10)
      }

      // ให้ Gemini ตัดสินใจว่าควรตอบไหม และตอบว่าอะไร
      const result = await decideAndAnswer(text, groupId)

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

        // เพิ่ม bot reply เข้า history ด้วย
        groupHistory[groupId].push({ role: 'bot', text: result.reply, timestamp: Date.now() })
      }
    }
  }

  return new Response('OK', { status: 200 })
}

// ==============================
// SMART REPLY — ตัดสินใจว่าตอบไหม
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

    // สร้าง conversation history string
    const history = groupHistory[groupId] || []
    const historyText = history
      .slice(-6) // เอาแค่ 6 message ล่าสุด
      .map(m => `${m.role === 'user' ? 'ลูกค้า' : 'Bot'}: ${m.text}`)
      .join('\n')

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `คุณคือ assistant ในกลุ่ม LINE ของทีมงาน ทำหน้าที่ตอบคำถามและพูดคุยกับลูกค้า

## ข้อมูลหลักจากทีมงาน:
${knowledgeText}

## บทสนทนาล่าสุดในกลุ่ม:
${historyText || 'ยังไม่มีบทสนทนา'}

## message ล่าสุดของลูกค้า:
"${question}"

## หน้าที่ของคุณ:
วิเคราะห์ว่า message นี้ควรตอบไหม แล้วตอบในรูปแบบ JSON เท่านั้น

กฎการตัดสินใจ:
- ถ้าเป็นคำถามชัดเจน → shouldReply: true, ตอบจาก knowledge + Google
- ถ้าเป็นการทักทาย เช่น "สวัสดี" "หวัดดี" → shouldReply: true, ทักทายกลับสั้นๆ
- ถ้าเป็นการพูดคุยทั่วไป แชทกัน → shouldReply: false (รอให้คุยกันหลายประโยคก่อน)
- ถ้าพูดคุยมาหลายประโยคแล้วและบทสนทนาไหลดี → shouldReply: true, ร่วมวงคุยด้วยเป็นธรรมชาติ
- ถ้า mention bot หรือถามตรงๆ → shouldReply: true เสมอ

ตอบ JSON format นี้เท่านั้น ห้ามมีข้อความอื่น:
{
  "shouldReply": true หรือ false,
  "reason": "เหตุผลสั้นๆ",
  "reply": "ข้อความตอบกลับ (ถ้า shouldReply เป็น true เท่านั้น)"
}`
            }]
          }],
          tools: [{
            google_search: {}
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 800
          }
        })
      }
    )

    const data = await response.json()
    console.log('Gemini decide response:', JSON.stringify(data))

    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!rawText) return { shouldReply: false }

    const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim()
    const result = JSON.parse(cleaned)

    console.log('Decision:', result.shouldReply, '|', result.reason)
    return result

  } catch (err) {
    console.error('DecideAndAnswer error:', err.message)
    return { shouldReply: false }
  }
}

// ==============================
// RESEARCH FUNCTION
// ==============================
async function researchAndSaveDrafts(text, groupId, userId) {
  try {
    const topic = text
      .replace(/^research:/i, '')
      .replace(/^ค้นหา:/i, '')
      .replace(/^สรุป:/i, '')
      .trim()

    console.log('Researching topic:', topic)

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `ค้นหาและสรุปข้อมูลเกี่ยวกับ "${topic}"

สร้างความรู้ที่เป็นประโยชน์ 5-8 ข้อ โดย:
- แต่ละข้อต้องเป็นประโยคสมบูรณ์ มีบริบทครบ
- เหมาะสำหรับนำไปตอบคำถามลูกค้า
- ข้อมูลต้องถูกต้องและเชื่อถือได้
- เขียนเป็นภาษาไทย

ตอบในรูปแบบ JSON array เท่านั้น ห้ามมีข้อความอื่น:
["ความรู้ข้อที่ 1...", "ความรู้ข้อที่ 2...", "ความรู้ข้อที่ 3..."]`
            }]
          }],
          tools: [{ google_search: {} }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2000
          }
        })
      }
    )

    const data = await response.json()
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!rawText) throw new Error('No response from Gemini')

    const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim()
    const items = JSON.parse(cleaned)

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Invalid format from Gemini')
    }

    const drafts = items.map(item => ({
      content: item,
      group_id: groupId,
      line_user_id: userId,
      status: 'pending'
    }))

    await supabase.from('drafts').insert(drafts)

    await lineClient.pushMessage(groupId, {
      type: 'text',
      text: `✅ Research เสร็จแล้วครับ!\n\nหัวข้อ: ${topic}\nสร้างความรู้ได้ ${items.length} ข้อ\n\nรอ admin อนุมัติใน dashboard นะครับ 🙏`
    })

  } catch (err) {
    console.error('Research error:', err.message)
    await lineClient.pushMessage(groupId, {
      type: 'text',
      text: `❌ Research ไม่สำเร็จครับ กรุณาลองใหม่\nError: ${err.message}`
    })
  }
}
