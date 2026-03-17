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

    // log ทุก message ที่เข้ามา
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

    console.log('Group found:', group.name, group.type)

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
      console.log('Final reply:', reply)

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
    // ดึง knowledge ทั้งหมดที่ approve แล้ว
    const { data: knowledge, error: kbError } = await supabase
      .from('knowledge')
      .select('content')
      .order('created_at', { ascending: false })

    console.log('KB error:', kbError)
    console.log('Knowledge count:', knowledge?.length)
    console.log('Knowledge data:', JSON.stringify(knowledge))

    const knowledgeText = knowledge?.length > 0
      ? knowledge.map(k => k.content).join('\n---\n')
      : 'ยังไม่มีข้อมูล'

    const prompt = buildPrompt(question, knowledgeText)
    console.log('Prompt:', prompt)

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 500
          }
        })
      }
    )

    const data = await response.json()
    console.log('=== GEMINI RAW ===', JSON.stringify(data, null, 2))
    console.log('=== KNOWLEDGE SENT ===', knowledgeText)
    console.log('Gemini full response:', JSON.stringify(data))

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      data?.candidates?.[0]?.output ||
      data?.text ||
      null

    console.log('Parsed reply:', reply)

    if (!reply) {
      console.log('No reply — finishReason:', data?.candidates?.[0]?.finishReason)
      console.log('promptFeedback:', JSON.stringify(data?.promptFeedback))
    }

    return reply || 'ขอตรวจสอบและแจ้งกลับนะครับ 🙏'

  } catch (err) {
    console.error('Gemini error:', err.message)
    return 'ขออภัยครับ ระบบขัดข้องชั่วคราว'
  }
}

function buildPrompt(question, knowledgeText) {
  return `คุณคือ assistant ของทีม Amway/Nutrilite ประเทศไทย ตอบคำถามเป็นภาษาไทย กระชับ และเป็นมิตร

## ข้อมูลจากทีมงาน:
${knowledgeText}

## กฎสำคัญ:
- ตอบจากข้อมูลทีมงานด้านบนก่อนเสมอ ถ้ามีข้อมูลที่เกี่ยวข้อง
- ถ้าไม่มีในข้อมูลทีมงาน ให้ใช้ความรู้ทั่วไปเกี่ยวกับ Amway / Nutrilite ประเทศไทย
- ตอบทุกคำถามที่เกี่ยวข้องกับข้อมูลทีมงานด้านบน
- ถ้าไม่มีข้อมูลเพียงพอจริงๆ ให้ตอบว่า "ขอตรวจสอบและแจ้งกลับนะคะ 🙏"
- ตอบไม่เกิน 4-5 ประโยค
- ลงท้ายด้วย "ค่ะ" หรือ "นะคะ"

คำถาม: ${question}`
}
