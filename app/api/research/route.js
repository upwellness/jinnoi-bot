import { createClient } from '@supabase/supabase-js'
import { Client } from '@line/bot-sdk'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const lineClient = new Client({
  channelAccessToken: process.env.LINE_ACCESS_TOKEN
})

export const maxDuration = 60 // Vercel Pro = 60s, Free = 10s

export async function POST(req) {
  try {
    const { topic, groupId, userId } = await req.json()
    console.log('=== RESEARCH START:', topic)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 55000)

    let response
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `ค้นหาและสรุปข้อมูลเกี่ยวกับ "${topic}" เป็นภาษาไทย

สร้างความรู้ 5-8 ข้อ โดย:
- แต่ละข้อเป็นประโยคสมบูรณ์ มีบริบทครบ
- เหมาะตอบคำถามลูกค้า
- ข้อมูลถูกต้อง เชื่อถือได้

ตอบ JSON array เท่านั้น ห้ามมีข้อความอื่น:
["ข้อ1...","ข้อ2...","ข้อ3..."]`
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
    } finally {
      clearTimeout(timeout)
    }

    const data = await response.json()
    console.log('=== RESEARCH GEMINI:', JSON.stringify(data))

    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!rawText) throw new Error('No response: ' + JSON.stringify(data?.error || data))

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

    return new Response(JSON.stringify({ ok: true }), { status: 200 })

  } catch (err) {
    console.error('=== RESEARCH ERROR:', err.message)

    try {
      const { groupId } = await req.json().catch(() => ({}))
      if (groupId) {
        await lineClient.pushMessage(groupId, {
          type: 'text',
          text: `❌ Research ไม่สำเร็จค่ะ\nError: ${err.message}\n\nลองใหม่อีกครั้งนะคะ 🙏`
        })
      }
    } catch (e) {}

    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
