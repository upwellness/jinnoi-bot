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

    if (!group) {
      console.log('Unknown group:', groupId)
      continue
    }

    if (group.type === 'trainer') {
      // เช็คว่าเป็นคำสั่ง research หรือเปล่า
      const isResearch = text.toLowerCase().startsWith('research:') ||
                         text.toLowerCase().startsWith('ค้นหา:') ||
                         text.toLowerCase().startsWith('สรุป:')

      if (isResearch) {
        // แจ้ง trainer ก่อนว่ากำลัง research
        await lineClient.replyMessage(event.replyToken, {
          type: 'text',
          text: '🔍 กำลัง research ข้อมูล รอสักครู่นะครับ...'
        })

        // ทำ research ใน background
        researchAndSaveDrafts(text, groupId, userId)

      } else {
        // message ปกติ → บันทึกเป็น draft เดียว
        await supabase.from('drafts').insert({
          content: text,
          group_id: groupId,
          line_user_id: userId,
          status: 'pending'
        })

        await lineClient.replyMessage(event.replyToken, {
          type: 'text',
          text: '📝 บันทึกแล้วครับ รอ admin อนุมัติ\n\n💡 Tip: พิมพ์ "research: [หัวข้อ]" ให้ AI ค้นหาข้อมูลมาให้อัตโนมัติ'
        })
      }

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

// ==============================
// RESEARCH FUNCTION
// ==============================
async function researchAndSaveDrafts(text, groupId, userId) {
  try {
    // ตัด prefix ออก เอาแค่ topic
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
              
กรุณาสร้างความรู้ที่เป็นประโยชน์ 5-8 ข้อ โดย:
- แต่ละข้อต้องเป็นประโยคสมบูรณ์ มีบริบทครบ
- เหมาะสำหรับนำไปตอบคำถามลูกค้า
- ข้อมูลต้องถูกต้องและเชื่อถือได้
- เขียนเป็นภาษาไทย

ตอบในรูปแบบ JSON array เท่านั้น ห้ามมีข้อความอื่น:
["ความรู้ข้อที่ 1...", "ความรู้ข้อที่ 2...", "ความรู้ข้อที่ 3..."]`
            }]
          }],
          tools: [{
            google_search: {}
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2000
          }
        })
      }
    )

    const data = await response.json()
    console.log('Research response:', JSON.stringify(data))

    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!rawText) throw new Error('No response from Gemini')

    // parse JSON array
    const cleaned = rawText
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim()

    const items = JSON.parse(cleaned)

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Invalid format from Gemini')
    }

    // บันทึกแต่ละข้อเป็น draft แยกกัน
    const drafts = items.map(item => ({
      content: item,
      group_id: groupId,
      line_user_id: userId,
      status: 'pending'
    }))

    await supabase.from('drafts').insert(drafts)

    // แจ้ง trainer ว่าเสร็จแล้ว (push message)
    await lineClient.pushMessage(groupId, {
      type: 'text',
      text: `✅ Research เสร็จแล้วครับ!\n\nหัวข้อ: ${topic}\nสร้างความรู้ได้ ${items.length} ข้อ\n\nรอ admin อนุมัติใน dashboard นะครับ 🙏`
    })

    console.log(`Research done: ${items.length} drafts saved`)

  } catch (err) {
    console.error('Research error:', err.message)

    // แจ้ง trainer ว่ามีปัญหา
    await lineClient.pushMessage(groupId, {
      type: 'text',
      text: `❌ Research ไม่สำเร็จครับ\n\nกรุณาลองใหม่หรือพิมพ์ข้อมูลเองครับ\nError: ${err.message}`
    })
  }
}

// ==============================
// CUSTOMER Q&A
// ==============================
async function getAnswer(question) {
  try {
    const { data: knowledge } = await supabase
      .from('knowledge')
      .select('content')
      .order('created_at', { ascending: false })

    const knowledgeText = knowledge?.length > 0
      ? knowledge.map(k => k.content).join('\n---\n')
      : 'ยังไม่มีข้อมูล'

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: buildPrompt(question, knowledgeText) }]
          }],
          tools: [{
            google_search: {}
          }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 500
          }
        })
      }
    )

    const data = await response.json()
    console.log('Gemini full response:', JSON.stringify(data))

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || null
    return reply || 'ขอตรวจสอบและแจ้งกลับนะครับ 🙏'

  } catch (err) {
    console.error('Gemini error:', err.message)
    return 'ขออภัยครับ ระบบขัดข้องชั่วคราว'
  }
}

function buildPrompt(question, knowledgeText) {
  return `คุณคือ assistant ของทีมงาน ตอบคำถามเป็นภาษาไทย กระชับ และเป็นมิตร

## ข้อมูลหลักจากทีมงาน (ให้ความสำคัญสูงสุด):
${knowledgeText}

## วิธีตอบ:
1. ถ้าคำถามตรงกับข้อมูลทีมงานด้านบน → ตอบจากนั้นก่อนเลย
2. ถ้าข้อมูลทีมงานไม่ครอบคลุมพอ → ค้นหาข้อมูลเพิ่มเติมจาก internet แต่ต้องอยู่ในกรอบเดียวกัน
3. ถ้าหาไม่ได้จริงๆ → ตอบว่า "ขอตรวจสอบและแจ้งกลับนะครับ 🙏"

## กฎสำคัญ:
- ข้อมูลทีมงานมีความถูกต้องสูงกว่า internet เสมอ
- ถ้าข้อมูล internet ขัดแย้งกับทีมงาน → ใช้ข้อมูลทีมงาน
- ตอบไม่เกิน 4-5 ประโยค
- ลงท้ายด้วย "ครับ" หรือ "นะครับ"

คำถาม: ${question}`
}
