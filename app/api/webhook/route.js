import { Client, validateSignature } from '@line/bot-sdk'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

const lineClient = new Client({
  channelAccessToken: process.env.LINE_ACCESS_TOKEN
})

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

export async function POST(req) {
  // ตรวจสอบว่ามาจาก LINE จริง
  const body = await req.text()
  const signature = req.headers.get('x-line-signature')
  
  if (!validateSignature(body, process.env.LINE_CHANNEL_SECRET, signature)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { events } = JSON.parse(body)

  for (const event of events) {
    if (event.type !== 'message' || event.message.type !== 'text') continue
    if (!event.source.groupId) continue  // รับเฉพาะ group message

    const groupId = event.source.groupId
    const userId = event.source.userId
    const text = event.message.text.trim()

    // log message เข้า
    await supabase.from('messages').insert({
      group_id: groupId,
      line_user_id: userId,
      content: text,
      direction: 'in'
    })

    // เช็คว่า group นี้เป็นประเภทอะไร
    const { data: group } = await supabase
      .from('groups')
      .select('type, name')
      .eq('id', groupId)
      .single()

    // group ยังไม่ได้ลงทะเบียน → ข้าม
    if (!group) continue

    if (group.type === 'trainer') {
      // บันทึกเป็น draft รอ admin approve
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
      // ดึง knowledge ที่ approved
      const { data: knowledge } = await supabase
        .from('knowledge')
        .select('content')
        .order('created_at', { ascending: false })

      if (!knowledge || knowledge.length === 0) {
        await lineClient.replyMessage(event.replyToken, {
          type: 'text',
          text: 'ขอบคุณสำหรับคำถามครับ ขอตรวจสอบและแจ้งกลับนะครับ 🙏'
        })
        continue
      }

      // ส่งให้ Gemini ตอบจาก knowledge เท่านั้น
      const knowledgeText = knowledge.map(k => k.content).join('\n---\n')

      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      
      const prompt = `คุณคือ assistant ของบริษัท ตอบคำถามลูกค้าเป็นภาษาไทย ใช้ข้อมูลจากฐานความรู้นี้เท่านั้น:

${knowledgeText}

กฎสำคัญ:
- ถ้าคำถามไม่มีในฐานความรู้ ให้ตอบว่า "ขอตรวจสอบและแจ้งกลับนะครับ 🙏"
- ห้ามเดาหรือแต่งข้อมูลเอง
- ตอบกระชับ ไม่เกิน 3-4 ประโยค
- ลงท้ายด้วย "ครับ" หรือ "นะครับ"

คำถามลูกค้า: ${text}`

      const result = await model.generateContent(prompt)
      const reply = result.response.text()

      await lineClient.replyMessage(event.replyToken, {
        type: 'text',
        text: reply
      })

      // log message ออก
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
