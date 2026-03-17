import { Client, validateSignature } from '@line/bot-sdk'
import { createClient } from '@supabase/supabase-js'

const lineClient = new Client({
  channelAccessToken: process.env.LINE_ACCESS_TOKEN
})

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

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

    if (!group) continue

    if (group.type === 'trainer') {
      await supabase.from('drafts').insert({
        content: text,
        group_id: groupId,
        line_user_id: userId,
        status: 'pending'
      })
      await lineClient.replyMessage(event.replyToken, {
        type: 'text',
        text: '📝 บันทึกแล้วครับ รอ admin อนุมัติก่อนนำไปใช้'
      })

    } else if (group.type === 'customer') {
      const reply = await getAnswer(text)

      await lineClient.replyMessage(event.replyToken, {
        type: 'text',
        text: reply
      })

      await supabase.from('messages').insert({
        group_id: groupId,
        line_user_id: 'bot',
        content: reply,
        direction: 'out'
      })
    }
  }

  return new Response('OK', { status: 200 })
}

async function getAnswer(question) {
  try {
    // 1. ดึง knowledge ที่ train ไว้
    const { data: knowledge } = await supabase
      .from('knowledge')
      .select('content')
      .order('created_at', { ascending: false })

    const knowledgeText = knowledge?.length > 0
      ? knowledge.map(k => k.content).join('\n---\n')
      : null

    // 2. เรียก Gemini พร้อม Google Search Grounding
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: buildPrompt(question, knowledgeText)
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 500
          }
        })
      }
    )

    const data = await response.json()
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text

    return reply || 'ขอตรวจสอบและแจ้งกลับนะครับ 🙏'

  } catch (err) {
    console.error('Gemini error:', err)
    return 'ขออภัยครับ ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง'
  }
}

function buildPrompt(question, knowledgeText) {
  return `คุณคือ assistant ของทีม Amway/Nutrilite ประเทศไทย ตอบคำถามเป็นภาษาไทย กระชับ และเป็นมิตร

${knowledgeText ? `## ข้อมูลจากทีมงาน (ใช้อันนี้ก่อนเสมอ ถ้ามีข้อมูลที่ตรง):
${knowledgeText}

` : ''}## แนวทางตอบ:
1. ถ้าคำถามตรงกับข้อมูลทีมงานด้านบน → ตอบจากนั้นก่อนเลย
2. ถ้าไม่มีในข้อมูลทีมงาน → ค้นหาจาก Google เกี่ยวกับ Amway ไทย / Nutrilite ไทย แล้วตอบ
3. ถ้าหาไม่ได้เลย → บอกว่า "ขอตรวจสอบและแจ้งกลับนะครับ 🙏"

## กฎสำคัญ:
- ตอบเฉพาะเรื่อง Amway / Nutrilite / สินค้า / การสั่งซื้อ / โปรโมชั่น
- ห้ามพูดเรื่องราคาที่ไม่แน่ใจ หรือข้อมูลที่อาจผิด
- ตอบไม่เกิน 4-5 ประโยค
- ลงท้ายด้วย "ครับ" หรือ "นะครับ"

คำถาม: ${question}`
}
