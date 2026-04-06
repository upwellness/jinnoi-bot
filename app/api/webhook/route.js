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
  return `คุณคือ "จิ้นน้อย" — ตัวแทนดิจิทัลของ จิ้น ผู้เชี่ยวชาญด้าน Wellness Marketing

## บุคลิกหลัก (DISC: D-C)
- D (Dominance): ตรงประเด็น กล้าตัดสินใจ บอกผลลัพธ์ชัดเจน ไม่อ้อมค้อม
- C (Conscientiousness): แม่นยำ มีหลักการ อ้างอิงข้อมูลได้ ไม่พูดมั่ว

## Archetypes (เรียงตามความเด่น)
1. 🔮 Sage: แสวงหาความจริง อธิบายด้วยหลักการ ให้ปัญญา ไม่ใช่แค่ข้อมูล
2. 👑 Ruler: นำทาง จัดระเบียบความคิด ควบคุมบทสนทนาให้มีทิศทาง
3. 🧭 Explorer: กล้าลองมุมใหม่ มองหาสิ่งที่คนอื่นยังไม่เห็น

## สไตล์การสื่อสาร
- ตรงประเด็น ไม่ยืดเยื้อ ใช้ข้อมูลและตัวเลขสนับสนุน
- มีอารมณ์ขันเล็กน้อย แต่ไม่ลืม substance
- ใช้ emoji 1-2 ตัว (ไม่เยอะ)
- ลงท้ายด้วย "ค่ะ" หรือ "เลยค่ะ"`
}

// ==============================
// DISC HELPERS
// ==============================
function getDiscStyle(discType) {
  const styles = {
    D: 'ตรงประเด็น สั้น ระบุผลลัพธ์ชัดเจน ไม่ต้องอธิบายพื้นหลังมาก พูดถึงประสิทธิภาพและผลลัพธ์',
    I: 'สนุก มีพลังงาน เล่าเรื่อง เชื่อมโยงความสัมพันธ์ ใช้ emoji มากขึ้น ชวนให้ excited',
    S: 'อ่อนโยน ใจเย็น อธิบายทีละขั้น ให้ความมั่นใจ ไม่กดดัน เน้นความปลอดภัยและความต่อเนื่อง',
    C: 'ละเอียด มีข้อมูลอ้างอิง ตอบ "ทำไม" ให้เหตุผลและตัวเลข เน้นความถูกต้องและกระบวนการ'
  }
  return styles[discType] || 'ตอบตามธรรมชาติ ยังไม่มีข้อมูล DISC เพียงพอ'
}

// ==============================
// USER PROFILE — ดึงหรือสร้างใหม่
// ==============================
async function getOrCreateUserProfile(groupId, userId) {
  const { data: existing } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('group_id', groupId)
    .eq('line_user_id', userId)
    .single()

  if (existing) return existing

  // ดึงชื่อจาก LINE API
  let displayName = 'สมาชิก'
  try {
    const res = await fetch(
      `https://api.line.me/v2/bot/group/${groupId}/member/${userId}`,
      { headers: { Authorization: `Bearer ${process.env.LINE_ACCESS_TOKEN}` } }
    )
    const profile = await res.json()
    displayName = profile.displayName || displayName
  } catch (e) {}

  const { data: newProfile } = await supabase
    .from('user_profiles')
    .insert({
      group_id: groupId,
      line_user_id: userId,
      display_name: displayName,
      nickname: displayName,
      disc_d: 0, disc_i: 0, disc_s: 0, disc_c: 0,
      disc_type: null,
      message_count: 0
    })
    .select()
    .single()

  return newProfile || { group_id: groupId, line_user_id: userId, display_name: displayName, nickname: displayName, disc_d: 0, disc_i: 0, disc_s: 0, disc_c: 0, disc_type: null, message_count: 0 }
}

async function updateUserDisc(profile, discUpdate, discType) {
  if (!profile?.id) return
  const newD = (profile.disc_d || 0) + (discUpdate?.d || 0)
  const newI = (profile.disc_i || 0) + (discUpdate?.i || 0)
  const newS = (profile.disc_s || 0) + (discUpdate?.s || 0)
  const newC = (profile.disc_c || 0) + (discUpdate?.c || 0)

  // คำนวณ type จากคะแนนสะสม
  const max = Math.max(newD, newI, newS, newC)
  const resolvedType = discType || (
    max === newD ? 'D' : max === newI ? 'I' : max === newS ? 'S' : 'C'
  )

  await supabase
    .from('user_profiles')
    .update({
      disc_d: newD, disc_i: newI, disc_s: newS, disc_c: newC,
      disc_type: resolvedType,
      message_count: (profile.message_count || 0) + 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', profile.id)
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

  // ดึง user profile (ชื่อ + DISC)
  const userProfile = await getOrCreateUserProfile(groupId, userId)

  const result = await decideAndAnswer(text, groupId, userProfile)
  console.log('=== DECISION:', JSON.stringify(result))

  // อัปเดต DISC เสมอ ไม่ว่าจะตอบหรือไม่
  if (result.discUpdate) {
    await updateUserDisc(userProfile, result.discUpdate, result.discType)
  }

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
async function decideAndAnswer(question, groupId, userProfile = {}) {
  try {
    const { data: knowledge } = await supabase
      .from('knowledge')
      .select('content')
      .order('created_at', { ascending: false })

    const knowledgeText = knowledge?.length > 0
      ? knowledge.map(k => k.content).join('\n---\n')
      : 'ยังไม่มีข้อมูล'

    const history = groupHistory[groupId] || []
    const userName = userProfile.nickname || userProfile.display_name || 'สมาชิก'
    const historyText = history
      .slice(-6)
      .map(m => `${m.role === 'user' ? userName : 'จิ้นน้อย'}: ${m.text}`)
      .join('\n')

    const discType = userProfile.disc_type
    const discInfo = discType
      ? `DISC Type: ${discType} (${getDiscStyle(discType)})\nคะแนนสะสม D=${userProfile.disc_d} I=${userProfile.disc_i} S=${userProfile.disc_s} C=${userProfile.disc_c} (จาก ${userProfile.message_count} ข้อความ)`
      : `DISC: ยังไม่มีข้อมูลเพียงพอ (${userProfile.message_count || 0} ข้อความ) — ประเมินจากข้อความนี้ก็ได้`

    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${getPersonality()}

## ข้อมูลหลักจากทีมงาน:
${knowledgeText}

## ข้อมูลคนที่ถาม:
ชื่อ: ${userName}
${discInfo}

## วิธีปรับตอบตาม DISC ของคนนี้:
${getDiscStyle(discType)}

## บทสนทนาล่าสุดในกลุ่ม:
${historyText || 'ยังไม่มีบทสนทนา'}

## message ล่าสุดจาก ${userName}:
"${question}"

## วิเคราะห์และตัดสินใจ:

กฎ shouldReply (เข้าไป involve เฉพาะเมื่อ):
- ถามคำถามที่ชัดเจน ต้องการคำตอบ → true
- mention "จิ้นน้อย" โดยตรง → true เสมอ
- ทักทายทั่วไป → true ตอบสั้นๆ
- คุยกันเองในกลุ่ม ไม่ได้ถามอะไร → false (อย่าไปขัด)
- บอกสิ่งที่กำลังทำ เล่าเรื่อง ไม่ได้ถาม → false
- ถามกันเองระหว่างสมาชิก ไม่เกี่ยวบอท → false

กฎ isHighRisk:
- ถามเรื่องโรค วินิจฉัยอาการ ยา การรักษาเฉพาะบุคคล → true
- แสดงความไม่พอใจ ร้องเรียน โกรธ → true

กฎ discUpdate (ประเมินสไตล์จากข้อความนี้):
- เพิ่มคะแนน 0-2 ต่อ dimension ตามสัญญาณที่เห็นในข้อความ

ตอบเป็น JSON object เดียวเท่านั้น ห้ามมีข้อความอื่นนอก JSON:
{
  "shouldReply": true,
  "isHighRisk": false,
  "riskReason": "",
  "reason": "สั้นๆ ว่าทำไมถึง involve หรือ silent",
  "discUpdate": {"d": 0, "i": 0, "s": 0, "c": 0},
  "discType": "D/I/S/C หรือ null ถ้าข้อมูลน้อยเกินไป",
  "reply": "ข้อความตอบในสไตล์จิ้นน้อย ปรับตาม DISC ของ ${userName} (empty string ถ้า shouldReply: false)"
}`
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
    // Gemini อาจ return หลาย parts เมื่อใช้ google_search — รวม text ทุก part
    const parts = data?.candidates?.[0]?.content?.parts || []
    const rawText = parts.map(p => p.text || '').join('')
    console.log('=== RAW TEXT:', rawText)

    if (!rawText) return { shouldReply: false }

    // strip markdown code fences แล้ว parse JSON
    const cleanText = rawText.replace(/```[a-z]*/gi, '').trim()
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { shouldReply: false }

    const meta = JSON.parse(jsonMatch[0])
    return meta

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

  if (cmd === '/ชื่อ') {
    // /ชื่อ [ชื่อเดิม/LINE name] [ชื่อใหม่]
    // เช่น /ชื่อ สมชาย คุณสมชาย
    if (parts.length < 3) return '❌ รูปแบบ: /ชื่อ [ชื่อเดิม] [ชื่อที่ต้องการ]\nเช่น /ชื่อ สมชาย คุณสมชาย'
    const oldName = parts[1]
    const newNickname = parts.slice(2).join(' ')
    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('id, display_name, nickname')
      .eq('group_id', groupId)
      .ilike('display_name', `%${oldName}%`)
    if (!profiles?.length) return `❌ ไม่พบสมาชิกชื่อ "${oldName}" ในกลุ่มนี้ค่ะ`
    if (profiles.length > 1) {
      const names = profiles.map(p => p.display_name).join(', ')
      return `⚠️ พบหลายคนที่ชื่อใกล้เคียง: ${names}\nโปรดระบุชื่อให้ตรงกว่านี้ค่ะ`
    }
    await supabase
      .from('user_profiles')
      .update({ nickname: newNickname })
      .eq('id', profiles[0].id)
    return `✅ เปลี่ยนชื่อ "${profiles[0].display_name}" เป็น "${newNickname}" แล้วค่ะ 🌸`
  }

  if (cmd === '/ดูชื่อ') {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('display_name, nickname, disc_type, message_count')
      .eq('group_id', groupId)
      .order('message_count', { ascending: false })
    if (!profiles?.length) return '📋 ยังไม่มีสมาชิกในกลุ่มนี้ค่ะ'
    const list = profiles.map(p =>
      `• ${p.display_name}${p.nickname !== p.display_name ? ` → "${p.nickname}"` : ''} [DISC: ${p.disc_type || '?'}] (${p.message_count} msg)`
    ).join('\n')
    return `📋 สมาชิกในกลุ่มค่ะ\n\n${list}`
  }

  if (cmd === '/ช่วยเหลือ') {
    return `🌸 คำสั่งจิ้นน้อยค่ะ\n\n/วันที่ [เลข] — ข้ามไปวันที่ต้องการ\n/หยุด [เหตุผล] — หยุดโปรแกรม\n/เริ่ม — เริ่มโปรแกรมต่อ\n/สถานะ — ดูสถานะปัจจุบัน\n/ชื่อ [ชื่อเดิม] [ชื่อใหม่] — ตั้งชื่อเรียกสมาชิก\n/ดูชื่อ — ดูรายชื่อ + DISC สมาชิกทั้งหมด\n\n💡 research: [หัวข้อ] — ให้จิ้นน้อยค้นข้อมูล`
  }

  return `❓ ไม่รู้จักคำสั่งนี้ค่ะ พิมพ์ /ช่วยเหลือ เพื่อดูคำสั่งทั้งหมดนะคะ 🌸`
}