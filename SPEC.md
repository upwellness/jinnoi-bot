# jinnoi-bot — Specification (what-should-be)

> เอกสารนี้ระบุ **intent และพฤติกรรมที่คาดหวัง** ของระบบ
> ใช้เป็น contract สำหรับการตัดสินใจ/ตรวจรับฟีเจอร์
> หลายข้อ infer จาก code ปัจจุบัน — ต้องการคุณ (owner) ยืนยัน มีตะขอ ⚠️ กำกับ

**คู่กับ**: [ARCHITECTURE.md](ARCHITECTURE.md) (what-is), [PROMPTS.md](PROMPTS.md) (all prompts)

---

## 1. Vision & Goals

### Vision
จิ้นน้อย = "ตัวแทนดิจิทัลของโค้ชจิ้น" ที่ scale ความรู้และ coaching ของทีม UP Labs ไปยังกลุ่ม LINE ของลูกค้าได้โดยที่โค้ชตัวจริงไม่ต้องตอบทุกคำถาม แต่ยังคงโทน/เนื้อหาที่เชื่อถือได้

### Primary Goals
| # | Goal | ตัววัดที่คาดหวัง ⚠️ |
|---|---|---|
| G1 | ลูกค้าในกลุ่มได้คำตอบที่ถูกต้องและ on-brand ภายในไม่กี่วินาที | เวลา reply < 10s p95, ลูกค้าไม่ต้องรอโค้ช |
| G2 | ทีมโค้ชเพิ่มความรู้เข้าบอทได้โดยไม่ต้องแก้ code | trainer พิมพ์ใน LINE → admin approve ภายใน 1 คลิก |
| G3 | ส่ง daily content ตรงเวลาทุกวันโดยไม่ต้องทำมือ | 3 slot/วัน, 0 miss/เดือน, idempotent |
| G4 | ลดความเสี่ยงการให้คำแนะนำเรื่องสุขภาพที่ไม่เหมาะสม | high-risk question → ไม่ auto-reply, ส่ง review queue เสมอ |
| G5 | ปรับโทนการสื่อสารตามบุคลิกผู้ใช้รายคน | detect DISC ภายใน ~10 ข้อความ |

### Non-Goals (ของเวอร์ชันปัจจุบัน)
- ไม่รองรับ 1-on-1 chat (เฉพาะ group เท่านั้น — code skip event ที่ไม่มี `groupId`)
- ไม่รองรับ image / sticker / file (เฉพาะ `message.text`)
- ไม่มี multi-tenant (1 bot = 1 ทีม = 1 brand ของ UP Labs)
- ไม่มี i18n (ภาษาไทยเท่านั้น)

---

## 2. Personas

### 2.1 End Customer (in customer group)
- คนที่สมัครคอร์ส UP Labs 14D / Full Course 30D / 60D
- ต้องการคำแนะนำด้านอาหาร, IF, ผลิตภัณฑ์เสริม, วิธีลดน้ำหนัก
- **ไม่รู้** ว่ากำลังคุยกับ AI (คาดหวังประสบการณ์เหมือนมีโค้ชจริงในกลุ่ม)
- DISC mix: คาดเดาว่าจะเจอทั้ง 4 แบบ

### 2.2 Trainer (in trainer group)
- ทีมงานโค้ช / ผู้เชี่ยวชาญ UP Labs
- ใช้ LINE เป็น interface หลัก (ไม่ต้อง login dashboard)
- หน้าที่: feed knowledge, research หัวข้อใหม่, ควบคุม program ของกลุ่มลูกค้า
- **ไม่มี** สิทธิ์ approve — ต้องให้ admin (คุณ) confirm ก่อนเข้า KB

### 2.3 Admin (dashboard user)
- ปัจจุบันเข้าใจว่า = คุณคนเดียว (solo operator) ⚠️
- เข้าผ่าน web dashboard `/`
- หน้าที่: approve groups, approve drafts, review high-risk, จัดการ program, monitor DISC
- คาดว่าเข้าวันละ 1-2 ครั้งเพื่อเคลียร์ queue

---

## 3. User Journeys

### 3.1 New customer group onboarding
1. ทีม UP Labs เชิญบอทเข้ากลุ่ม LINE ของลูกค้าใหม่
2. มีคนในกลุ่มพิมพ์ข้อความ → bot log เป็น `pending_groups`
3. Admin เข้า dashboard → ดู pending banner → เลือก type `customer` + ตั้งชื่อกลุ่ม → Approve
4. Admin เข้าหน้า Programs → "+ เริ่ม Program" เลือกคอร์สและวันเริ่ม
5. ตั้งแต่เช้าถัดไป bot ส่ง daily content 3 slot + ตอบคำถามอัตโนมัติ

### 3.2 Trainer เพิ่ม knowledge
1. Trainer พิมพ์ข้อเท็จจริงใน trainer group (เช่น "Fiber Blend ควรทานก่อนมื้อ 15 นาที")
2. Bot reply: "บันทึกแล้วค่ะ รอ admin อนุมัติ"
3. Admin → Trainer Drafts → Approve → ย้ายเข้า KB
4. คำถามต่อไปของลูกค้าที่เกี่ยวข้อง → bot ใช้ข้อมูลนี้ตอบได้

### 3.3 Trainer research หัวข้อใหม่
1. Trainer พิมพ์ `research: ผลของ IF 24 ชม. ต่อ insulin sensitivity`
2. Bot reply ทันที "กำลัง research..."
3. Bot gen 5-7 drafts → push แจ้ง "research เสร็จ"
4. Admin → Trainer Drafts → review แต่ละข้อ → approve/reject

### 3.4 Customer ถามคำถาม high-risk
1. Customer: "มียาลดน้ำหนักอะไรที่ใช้กับยาเบาหวาน metformin ได้บ้าง?"
2. Tier 2A → `isHighRisk:true`
3. Bot reply: "ขอให้ทีมผู้เชี่ยวชาญตรวจสอบ..."
4. Admin → Review Queue → อ่าน suggested_reply → แก้ไข (ถ้าต้องการ) → Approve → bot push คำตอบเข้ากลุ่ม
   - ⚠️ **Gap**: UI ปัจจุบันไม่มีช่องแก้ `suggested_reply` ก่อน approve — approve = push ข้อความเดิม (ดู §10)

### 3.5 Customer cycle ใน program
- Day 1 07:00 → bot ทัก "@ชื่อ" ทุกคน พร้อม meal plan + เทคนิค
- Day 1 12:00 → บอกเมนูกลางวัน + trick
- Day 1 18:00 → บอกเมนูเย็น + trick
- ระหว่างวัน customer ถามอะไรได้ bot ตอบจาก KB
- Trainer พิมพ์ `/วันที่ 5` ใน trainer group ของตัวเอง ⚠️ **หรือ customer group?** (schema ปัจจุบัน query ด้วย `group_id = ที่พิมพ์`) → override current_day

---

## 4. Functional Requirements

### FR-1 Group lifecycle
- **FR-1.1** บอทเข้ากลุ่มใหม่ → ต้อง pending ก่อน ไม่ตอบใดๆ จนกว่า admin approve
- **FR-1.2** Admin approve ได้ 2 type: `customer` หรือ `trainer`
- **FR-1.3** Type ของกลุ่มเปลี่ยนไม่ได้หลัง approve ⚠️ (ปัจจุบัน UI ไม่มีฟีเจอร์แก้ — ต้องไปลบใน DB เอง)
- **FR-1.4** Reject group → ลบจาก pending; ถ้ากลุ่มเดิมพิมพ์อีก → สร้าง pending ใหม่

### FR-2 Customer smart reply
- **FR-2.1** Pre-filter rule-based ก่อน Gemini (ประหยัด cost)
- **FR-2.2** 3-tier: Decide → (KB Reply | Search Reply) — ห้าม skip Tier 2A
- **FR-2.3** Reply ต้อง on-brand (personality ใน PROMPTS §1) ไม่ว่า tier ไหน
- **FR-2.4** Tier 3 fallback → Tier 2B ถ้า Gemini + google_search fail
- **FR-2.5** ตอบตาม DISC ของ user (ถ้ามีข้อมูลพอ) — fallback เป็น "ตอบตามธรรมชาติ"
- **FR-2.6** ห้าม reply ข้อความซ้ำกับที่ pushMessage แล้วภายใน request เดียว

### FR-3 DISC profiling
- **FR-3.1** Accumulate score ต่อ user ต่อ group — ไม่ reset
- **FR-3.2** Update ทุกข้อความที่ Tier 2A ทำงาน (ไม่ว่า reply จริงหรือไม่)
- **FR-3.3** ⚠️ **Decision needed**: DISC score increment 0-2 ต่อ dimension ต่อ message — convergence rate ควรเป็นเท่าไร? ควร normalize/decay ถ้ามีข้อความเยอะเกินจริงไหม?
- **FR-3.4** `disc_type` = dimension คะแนนสูงสุด (ถ้าเท่ากัน → order D > I > S > C by `max === value` check)

### FR-4 High-risk handling
- **FR-4.1** Definition (จาก prompt Tier 2A): ถามเรื่องโรค/ยา/รักษาเฉพาะบุคคล หรือแสดงความไม่พอใจ
- **FR-4.2** ห้าม auto-reply เนื้อหาจริง; reply ด้วย canned message เท่านั้น
- **FR-4.3** บันทึกใน `review_queue` พร้อม suggested_reply + risk_reason
- **FR-4.4** Admin approve → push suggested_reply เข้ากลุ่ม (ยังไม่มี UI แก้ก่อน push — ดู §10)
- **FR-4.5** ⚠️ **Decision needed**: SLA ในการ clear review queue? ตอนนี้ไม่มี notification ให้ admin

### FR-5 Trainer drafts & knowledge
- **FR-5.1** Default ของ trainer message ที่ไม่ใช่ command/research = draft
- **FR-5.2** Approve draft → insert เข้า `knowledge` (source_draft_id track ได้)
- **FR-5.3** Reject draft → status updated, ไม่ลบ (keep audit)
- **FR-5.4** Delete knowledge → hard delete
- **FR-5.5** KB cache 5 นาที — ยอมรับ staleness ระดับนี้ได้
- **FR-5.6** KB prompt ใช้ล่าสุด 20 entries เท่านั้น — ⚠️ **Decision**: ควร ranking/RAG เลือก relevant แทนไหม?

### FR-6 Research
- **FR-6.1** Trigger ด้วย prefix `research:` / `ค้นหา:` / `สรุป:`
- **FR-6.2** สร้าง 5-7 drafts ภาษาไทย → รอ admin approve
- **FR-6.3** ⚠️ **Gap**: webhook ใช้ inline call ที่ **ไม่มี** google_search — ไม่ได้ข้อมูลสด; `/api/research` endpoint มี google_search แต่ webhook ไม่เรียก ควร consolidate (ดู §10)

### FR-7 Slash commands (trainer)
- **FR-7.1** Commands ต้องทำงานจาก group ใด? ⚠️ (code ใช้ `group_id` ของกลุ่มที่พิมพ์ → น่าจะ trainer กดใน customer group → อธิบายซับซ้อน)
- **FR-7.2** `/ชื่อ` ต้อง match คนเดียว — ถ้า match หลาย หรือ 0 → error message ที่ชัดเจน
- **FR-7.3** ต้องมี `/ช่วยเหลือ` อ้างครบทุก command
- **FR-7.4** ⚠️ **Gap**: commands อ้าง `is_active/is_paused/current_day_override` แต่ schema ใช้ `paused/current_day` — **decide schema เดียวแล้ว align ทั้ง webhook + cron + dashboard**

### FR-8 Daily program
- **FR-8.1** 3 slot/วัน: morning 07:00, afternoon 12:00, evening 18:00 (TH)
- **FR-8.2** Idempotent — cron run ซ้ำ (หรือ manual trigger) ต้องไม่ส่ง duplicate
- **FR-8.3** Skip silently เมื่อ: paused, day < 1, ไม่มี program_days, ไม่มี members
- **FR-8.4** Message ต้องเรียกชื่อสมาชิกทุกคน (ใช้ `@ชื่อ`) + ปรับ tone ตาม DISC
- **FR-8.5** Morning = full meal plan ทั้งวัน (max 20 บรรทัด); afternoon/evening = เฉพาะมื้อ (max 10 บรรทัด)
- **FR-8.6** Missed send (เช่น Vercel down) — ⚠️ **Decision**: backfill อัตโนมัติ, admin push มือ, หรือข้าม?
- **FR-8.7** Timezone handling: `new Date()` บน Vercel ใช้ UTC; dayNumber ใช้ `today.split('T')[0]` ⚠️ **ตรวจสอบ**: ถ้า cron UTC 00:00 = TH 07:00 แต่ `today` = UTC date อาจคลาดเคลื่อน 1 วันในช่วง 00:00-07:00 TH

### FR-9 Program management
- **FR-9.1** 1 กลุ่ม / 1 active program (unique constraint `group_programs.group_id`)
- **FR-9.2** Start program → upsert (replace ของเดิม) ⚠️ **Decision**: ควรเตือน admin ถ้าทับของเดิมไหม?
- **FR-9.3** Pause → ยังเก็บ state, cron skip
- **FR-9.4** Stop → **hard delete** row → ⚠️ **Decision**: ต้องการ history ของกลุ่มที่ทำคอร์สจบแล้วไหม?
- **FR-9.5** Admin แก้ content รายวันได้ (8 fields) — update จะมีผลกับกลุ่มที่ยังไม่ถึงวันนั้น

### FR-10 Admin dashboard
- **FR-10.1** Single-page, auto-fetch ทุก section ใน 1 `fetchAll()`
- **FR-10.2** Refresh manual ด้วยปุ่ม ⟳
- **FR-10.3** Toast notification 3.5s ทุก action
- **FR-10.4** ⚠️ **Gap**: **ไม่มี auth** — ใครรู้ URL ก็เข้าได้ ต้องเพิ่ม basic auth / NextAuth

---

## 5. Non-Functional Requirements

### 5.1 Performance
| Metric | Target ⚠️ |
|---|---|
| Customer reply latency p95 | < 10s (quick filter path < 500ms) |
| Tier 2A decide | < 3s (thinking budget 0) |
| Tier 2B reply | < 8s |
| Tier 3 search | < 15s |
| Cron full run (ทุกกลุ่ม) | < 60s (Vercel Pro max) |
| Dashboard load | < 2s |

### 5.2 Scale ⚠️
- รองรับ **~20 customer groups** concurrent (cron serial loop limit)
- สมาชิกต่อกลุ่ม: 10-30 (LINE group ปกติ)
- KB entries: 100-500 (prompt ใช้ 20 ล่าสุด)
- ถ้าเกิน → ต้องปรับ cron ให้ parallel + RAG สำหรับ KB

### 5.3 Cost (Gemini budget) ⚠️
- Decision needed: กำหนด budget/เดือน
- Tier 2A เรียกทุก customer message ที่ผ่าน filter → dominant cost
- แนะนำ add cost logging (tokens in/out) ภายหลัง

### 5.4 Reliability
- Cron idempotency ต้องการันตีเสมอ (via `daily_send_log` unique)
- Webhook crash ต้อง return 200 ภายใน LINE timeout (~1s) — ⚠️ **Gap**: ปัจจุบัน sync-wait Gemini ก่อน return
- Retry policy สำหรับ Gemini / LINE fail → ⚠️ **Decision**: ไม่มีปัจจุบัน

### 5.5 Security
- Webhook: LINE signature validation ✅
- Cron: `CRON_SECRET` Bearer ✅ (optional — ควรบังคับ)
- Admin dashboard: **ไม่มี auth** ❌ (priority fix)
- Supabase: ใช้ service key ตรง → ต้อง RLS หรือจำกัด origin
- LINE tokens / Supabase keys ใน env vars เท่านั้น

### 5.6 Privacy / Compliance ⚠️
- เก็บข้อความ LINE ของลูกค้าตลอดไปใน `messages` → ⚠️ **Decision**: retention policy (30/90 วัน?)
- ข้อความถูกส่ง Gemini → ลูกค้าควรรู้ / ในเงื่อนไขการสมัครต้องระบุ
- PDPA: มีช่องให้ลูกค้าขอลบข้อมูล (right to erasure)?

### 5.7 Observability ⚠️
- ปัจจุบันแค่ `console.log` → ไปเป็น Vercel logs
- ต้องมี dashboard metric: message/day, cost/day, high-risk rate, cron success rate
- ตอนนี้ไม่มี alerting

---

## 6. Acceptance Criteria (ตัวอย่างสำคัญ)

### AC-2.1 Quick filter ต้อง silent กับ noise
- Given: customer พิมพ์ "555" / "ok" / "ขอบคุณค่ะ" / "🙏"
- Then: bot ไม่เรียก Gemini, ไม่ reply (log only)

### AC-2.2 Quick filter ต้อง force reply กับ mention
- Given: customer พิมพ์ "จิ้นน้อยคิดยังไง"
- Then: bot ตอบเสมอ (ไปถึง Tier 2B/3)

### AC-2.3 ข้อความไม่ชัด → Gemini decide
- Given: "อันนี้เวิร์คมั้ย" (ไม่มี keyword ใน rule)
- Then: quickFilter return null → เรียก Tier 2A

### AC-3.1 DISC accumulation
- Given: user ใหม่ (counts = 0)
- When: ส่ง 10 ข้อความที่มี D signal ชัด
- Then: `disc_d > disc_i/s/c`, `disc_type = 'D'`, `message_count = 10`

### AC-4.1 High-risk isolation
- Given: customer ถาม "metformin ทานกับ Bodykey ได้ไหม"
- Then:
  - bot reply canned "ขอให้ทีมผู้เชี่ยวชาญ..." (ไม่ใช่คำตอบจริง)
  - `review_queue` มี row ใหม่ status=pending
  - admin เห็นในหน้า review

### AC-8.1 Cron idempotency
- Given: cron `morning` run สำเร็จแล้ว
- When: manual trigger `morning` ซ้ำ
- Then: log response `skipped: already sent`, ไม่มี push ซ้ำ

### AC-8.2 Program skip ใหม่ที่ยังไม่ถึงเวลา
- Given: `start_date` = 2026-05-01, วันนี้ 2026-04-21
- Then: cron skip ทุก slot (dayNumber < 1)

### AC-9.1 Start program ทับ
- Given: กลุ่ม A มี group_programs อยู่
- When: admin start program อื่นให้กลุ่ม A
- Then: row เดิมถูก replace (upsert on conflict `group_id`) ⚠️ ควร warn ก่อน

---

## 7. Data Lifecycle & Retention ⚠️

ต้องการ decision จาก owner:

| Table | ปัจจุบัน | ข้อเสนอ |
|---|---|---|
| `messages` | เก็บตลอด | 90 วัน แล้ว archive/delete |
| `review_queue` | เก็บตลอด | approved/rejected → archive 180 วัน |
| `drafts` rejected | เก็บตลอด | 30 วันแล้วลบ |
| `daily_send_log` | เก็บตลอด | 1 ปี แล้ว archive |
| `pending_groups` rejected | ลบทันที | คงเดิม |
| `group_programs` จบแล้ว | ลบทันที | เปลี่ยนเป็น soft delete + มี history |
| `user_profiles` | เก็บตลอด | คงเดิม (เพราะ DISC มีค่า) |

---

## 8. Error Handling & Edge Cases

### 8.1 Gemini errors
- Timeout → ⚠️ **Decision**: retry / fallback tier / silent
- Response ไม่ใช่ JSON → `parseGeminiJson` return null → treat as `shouldReply:false`
- Rate limit → ⚠️ ไม่มี handling ปัจจุบัน → ต้องมี exponential backoff

### 8.2 LINE errors
- `replyMessage` fail (token หมดอายุ) → ⚠️ ไม่มี retry
- `pushMessage` fail (quota เต็ม) → ⚠️ ไม่มี alert

### 8.3 Supabase errors
- Connection fail → webhook crash → LINE retry event
- Unique violation (ซ้ำ) → gracefully skip (ใช้ `onConflict` / ON CONFLICT)

### 8.4 Concurrency
- 2 cron fire ใกล้กัน (เช่น Vercel retry) → กันด้วย unique constraint บน `daily_send_log`
- 2 webhooks จาก LINE ใกล้กัน → race ที่ `user_profiles` ⚠️ **ยังไม่มี row lock** — ใน worst case อาจ lost update message_count

---

## 9. Integration Contracts

### 9.1 LINE
- Receive: webhook event `message.text` in group (ignore อื่น)
- Send: `replyMessage` (ภายใน 1 event) + `pushMessage` (cron, review approve, research done)
- Identity: ต้องดึงชื่อคน (`group/{id}/member/{userId}`) และชื่อกลุ่ม (`group/{id}/summary`)

### 9.2 Gemini
- Authentication: API key ใน URL query
- Content-Type: `application/json`
- Response parsing: ต้อง tolerant ต่อ markdown fences + ต้อง extract JSON ด้วย regex

### 9.3 Supabase
- ใช้ `@supabase/supabase-js` ผ่าน service key
- ใช้ `.single()` vs `.maybeSingle()` ให้ถูกต้อง (`.single()` throw ถ้าไม่เจอ)

### 9.4 Admin API (internal)
- Contract: `action` field เป็นตัวกำหนด verb, ไม่ใช่ REST — ⚠️ OK สำหรับตอนนี้ แต่ควรแยกเป็น resource routes ถ้าโตขึ้น

---

## 10. Known Gaps / Open Decisions

รายการที่ต้องตัดสินใจ (priority สูงสุดบน):

### P0 — Security/Correctness
1. **Admin dashboard ไม่มี auth** → ใครรู้ URL ก็เข้าได้ — ต้องเพิ่มก่อน production
2. **Schema mismatch ของ slash commands** → `is_active/is_paused/current_day_override` vs `paused/current_day` — commands ยังไม่ทำงานจริง ต้องเลือกด้านเดียว
3. **Timezone bug ที่ cron** → `new Date().toISOString().split('T')[0]` บน Vercel = UTC ไม่ใช่ TH อาจทำให้ dayNumber เลื่อน ต้อง normalize เป็น Asia/Bangkok

### P1 — Feature Gaps
4. **Review queue แก้ suggested_reply ไม่ได้** ก่อน approve — admin ต้องกด approve ของที่ Gemini เสนอตรงๆ
5. **Start program ทับของเดิม** ไม่มี confirm — เสี่ยง accidental replace
6. **Stop program = hard delete** — ไม่มี history ของคอร์สที่จบแล้ว
7. **Research endpoint standalone** ไม่ถูกเรียก + ใช้ model เก่า — ลบ หรือ wire เข้า webhook ให้ได้ google_search
8. **Daily prompt ใช้ default DISC='S'** เมื่อ user ยังไม่มี type — อาจทำให้ข้อความรอบแรกๆ ไม่ตรงกับคนจริง

### P2 — Consistency
9. **Identity 2 รูปแบบ** — webhook personality บอกว่า "ตัวแทนดิจิทัลของจิ้น ผู้เชี่ยวชาญ Wellness Marketing" แต่ cron prompt บอก "โค้ช UP Labs" — เลือกอันเดียว
10. **DISC tone description 2 ชุด** (webhook vs cron) — ควร consolidate
11. **Research endpoint ใช้ gemini-2.0** แต่ที่อื่นใช้ 2.5 — align

### P3 — Operations
12. **Retention policy** ของทุก table — ดู §7
13. **Observability** — metrics, cost tracking, alerting
14. **Retry policy** — Gemini/LINE failure handling
15. **PDPA compliance** — customer disclosure + erasure path

---

## 11. Decisions Log (โปรดเติม)

| Date | Decision | Owner | Status |
|---|---|---|---|
| _(รอ)_ | เลือก schema daily program (`is_active/is_paused/current_day_override`) | — | Open |
| _(รอ)_ | Admin auth mechanism as-is แต่ note ไว้ก่อน | — | Open |
| _(รอ)_ | Timezone handling ที่ cron UTC+7 | — | Open |
| _(รอ)_ | Review queue editable suggested_reply | — | Open |
| _(รอ)_ | Retention policy per table | — | Open |

---

## 12. Glossary

| Term | Meaning |
|---|---|
| **KB / Knowledge Base** | ข้อความที่ admin approve แล้ว เก็บใน `knowledge` table |
| **Draft** | ข้อความจาก trainer ที่รอ approve |
| **DISC** | โมเดลบุคลิก 4 มิติ: Dominance, Influence, Steadiness, Conscientiousness |
| **Program** | คอร์สลดน้ำหนัก (UP Labs 14D / Full 30D / Full 60D) |
| **Slot** | รอบส่งข้อความใน 1 วัน: morning/afternoon/evening |
| **Tier 1** | Rule-based quick filter (ไม่ใช้ AI) |
| **Tier 2A / 2B** | Gemini decide / Gemini reply-from-KB |
| **Tier 3** | Gemini + google_search |
| **High-risk** | คำถามเรื่องโรค/ยา หรือ user ไม่พอใจ → ต้อง manual review |
| **Group program** | การ assign program ให้กลุ่มเฉพาะ (`group_programs` row) |
