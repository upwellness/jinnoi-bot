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
          text: '🔍 จิ้นน้อยกำลัง research ข้อมูลให้นะคะ รอสักครู่ค่ะ...'
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
          text: '📝 บันทึกแล้วค่ะ รอ admin อนุมัติก่อนนะคะ 🙏\n\n💡 พิมพ์ "research: [หัวข้อ]" ให้จิ้นน้อยค้นหาข้อมูลให้อัตโนมัติได้เลยค่ะ'
        })
      }

    } else if (group.type === 'customer') {
      if (!groupHistory[groupId]) groupHistory[groupId] = []
      groupHistory[groupId].push({
        role: 'user',
        text,
        timestamp: Date.now()
      })

      if (groupHistory[groupId].length > 10) {
        groupHistory[groupId] = groupHistory[groupId].slice(-10)
      }

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

        groupHistory[groupId].push({
          role: 'bot',
          text: result.reply,
          timestamp: Date.now()
        })
      }
    }
  }

  return new Response('OK', { status: 200 })
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

    const knowledgeText = knowledge?.length > 0
      ? knowledge.map(k => k.content).join('\n---\n')
      : 'ยังไม่มีข้อมูล'

    const history = groupHistory[groupId] || []
    const historyText = history
      .slice(-6)
      .map(m => `${m.role === 'user' ? 'ลูกค้า' : 'จิ้นน้อย'}: ${m.text}`)
      .join('\n')

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${getPersonality()}

## ข้อมูลหลักจากทีมงาน (ใช้อันนี้ก่อนเสมอ):
${knowledgeText}

## บทสนทนาล่าสุดในกลุ่ม:
${historyText || 'ยังไม่มีบทสนทนา'}

## message ล่าสุดของลูกค้า:
"${question}"

## วิเคราะห์และตัดสินใจ:
กฎการตัดสินใจ:
- คำถามชัดเจน → shouldReply: true ตอบจาก knowledge + ค้น Google เพิ่ม
- ทักทาย "สวัสดี" "หวัดดี" → shouldReply: true ทักทายกลับในสไตล์จิ้นน้อย
- พูดคุยทั่วไป แชทกัน → shouldReply: false รอให้คุยหลายประโยคก่อน
- คุยกันมาหลายประโยคแล้ว → shouldReply: true ร่วมวงคุยเป็นธรรมชาติ
- mention จิ้นน้อย หรือถามตรงๆ → shouldReply: true เสมอ

ตอบ JSON เท่านั้น ห้ามมีข้อความอื่น:
{
  "shouldReply": true หรือ false,
  "reason": "เหตุผลสั้นๆ",
  "reply": "ข้อความในสไตล์จิ้นน้อย (ถ้า shouldReply: true)"
}`
            }]
          }],
          tools: [{ google_search: {} }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 800
          }
        })
      }
    )

    const data = await response.json()
    console.log('Gemini decide:', JSON.stringify(data))

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
// RESEARCH
// ==============================
async function researchAndSaveDrafts(text, groupId, userId) {
  try {
    const topic = text
      .replace(/^research:/i, '')
      .replace(/^ค้นหา:/i, '')
      .replace(/^สรุป:/i, '')
      .trim()

    console.log('Researching:', topic)

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
- ข้อมูลถูกต้อง เชื่อถือได้
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
      text: `✅ Research เสร็จแล้วค่ะ!\n\n📚 หัวข้อ: ${topic}\n🔖 สร้างความรู้ได้ ${items.length} ข้อ\n\nรอ admin อนุมัติใน dashboard นะคะ 🙏`
    })

  } catch (err) {
    console.error('Research error:', err.message)
    await lineClient.pushMessage(groupId, {
      type: 'text',
      text: `❌ Research ไม่สำเร็จค่ะ กรุณาลองใหม่อีกครั้งนะคะ\nError: ${err.message}`
    })
  }
}
