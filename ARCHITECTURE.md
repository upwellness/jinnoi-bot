# jinnoi-bot — Architecture (describe-what-is)

> เอกสารนี้ **อธิบาย code ที่อยู่ในโปรเจ็คตอนนี้** ว่าทำงานยังไง
> ไม่ได้ตัดสินว่า "ควรเป็นยังไง" (ดูที่ [SPEC.md](SPEC.md) สำหรับ what-should-be)
> ถ้า code มี bug → doc นี้จะสะท้อน bug นั้นตรงๆ

---

## 1. Stack & Entry Points

- **Runtime**: Next.js 14 (App Router) บน Vercel
- **Database**: Supabase (Postgres) — ใช้ `SUPABASE_SERVICE_KEY` ตรงทุก route (ไม่มี RLS)
- **AI**: Google Gemini 2.5 Flash (inline คำถาม) + `google_search` tool (Tier 3 / research)
- **Messaging**: LINE Messaging API (`@line/bot-sdk`)
- **Cron**: Vercel Cron 3 ครั้ง/วัน

| Route | Method | Purpose |
|---|---|---|
| [/api/webhook](app/api/webhook/route.js) | POST | รับ event จาก LINE |
| [/api/admin](app/api/admin/route.js) | GET/POST | Admin dashboard API |
| [/api/cron/daily](app/api/cron/daily/route.js) | GET | ส่งข้อความ daily program |
| [/api/research](app/api/research/route.js) | POST | Research async standalone (dead code? — webhook เรียก inline แทน) |
| [/](app/page.js) | — | Admin Dashboard UI (single-page) |

---

## 2. Webhook — Group Dispatch

`POST /api/webhook` ([webhook/route.js:152](app/api/webhook/route.js#L152)):

1. Validate signature ด้วย `LINE_CHANNEL_SECRET`
2. วน events — ข้ามถ้าไม่ใช่ `message.text` หรือไม่มี `groupId`
3. Log ข้อความทุกอันลง `messages` (direction:`in`)
4. Query `groups` ด้วย `groupId`:
   - ไม่เจอ → `handleUnknownGroup` (สร้าง `pending_groups` entry)
   - type=`trainer` → `handleTrainer`
   - type=`customer` → `handleCustomer`

### 2.1 handleUnknownGroup
- Dedupe ด้วย `group_id` ใน `pending_groups`
- ดึงชื่อจาก LINE API `/v2/bot/group/{id}/summary` (ถ้า fail → `Unknown Group`)
- Insert `pending_groups` รอ admin approve

### 2.2 In-memory State (per lambda instance)
- `groupHistory[groupId]` — last 10 messages (role+text+timestamp)
- `knowledgeCache` — TTL 5 นาที, limit 20 knowledge entries เรียง `created_at desc`
- ⚠️ Reset ทุก cold start

---

## 3. Customer Flow (`handleCustomer`)

1. Push ข้อความเข้า `groupHistory` (truncate ที่ 10)
2. `quickFilter(text)` rule-based:
   - Match `จิ้นน้อย` → return `true`
   - Match keywords คำถาม (?, ได้ไหม, ยังไง, ราคา, สั่งซื้อ, ฯลฯ) → `true`
   - Match ขอบคุณ/ok/555/emoji ล้วน → `false`
   - ข้อความ `< 5 ตัวอักษร` → `false`
   - อื่นๆ → `null` (ให้ Gemini ตัดสิน)
3. ถ้า `quickFilter === false` → return เงียบ (ไม่เรียก Gemini)
4. `getOrCreateUserProfile(groupId, userId)` — insert ถ้ายังไม่มี, ดึง `displayName` จาก LINE API
5. `decideAndAnswer()`:
   - **Tier 2A** `tier2Decide()` — Gemini 2.5 Flash, tokens 512, temp 0.2, `thinkingBudget:0`, response = JSON เดียว
   - ถ้า `shouldReply:false` หรือ `isHighRisk:true` → return ไม่ generate reply
   - ถ้า `needsSearch:true` → **Tier 3** `tier3Reply()` — Gemini + `google_search` tool, tokens 3000
   - ไม่งั้น → **Tier 2B** `tier2Reply()` — Gemini + KB context, tokens 2048, temp 0.5
6. `updateUserDisc()` เสมอ — accumulate `disc_d/i/s/c` + `message_count += 1` + recompute `disc_type` (max dimension)
7. ถ้า `!shouldReply` → return
8. ถ้า `isHighRisk:true`:
   - Insert `review_queue` (question + suggested_reply + risk_reason)
   - Reply ข้อความมาตรฐาน: "ขอให้ทีมผู้เชี่ยวชาญตรวจสอบ..."
9. ถ้า normal → `replyMessage(result.reply)` + log `messages` direction:`out` + push เข้า `groupHistory`

### Parser `parseGeminiJson`
- Strip markdown fences ``` → regex `\{[\s\S]*\}` → `JSON.parse` กับ try/catch

---

## 4. Trainer Flow (`handleTrainer`)

1. ถ้าขึ้นต้นด้วย `/` → `handleCommand()` (ดูหัวข้อ 5)
2. ถ้าขึ้นต้น `research:` / `ค้นหา:` / `สรุป:`:
   - Reply ทันที "🔍 กำลัง research..."
   - `researchAndSaveDrafts()` — เรียก Gemini (ไม่มี `google_search`) ให้ return JSON array 5-7 ข้อ
   - Insert ทุกข้อเป็น `drafts` (status:`pending`)
   - `pushMessage` แจ้งเสร็จ
3. ข้อความอื่น → insert `drafts` พร้อม reply "บันทึกแล้ว รอ admin อนุมัติ"

---

## 5. Slash Commands

| Command | Columns ที่ใช้ |
|---|---|
| `/วันที่ N` | `group_programs.is_active` + `current_day_override` |
| `/หยุด [reason]` | `is_active` + `is_paused` + `pause_reason` |
| `/เริ่ม` | `is_active` + `is_paused` + `pause_reason` |
| `/สถานะ` | `is_active` + `is_paused` + `current_day_override` + `start_date` |
| `/ชื่อ [เดิม] [ใหม่]` | `user_profiles.nickname` (match `display_name ilike %เดิม%`, ต้อง match คนเดียว) |
| `/ดูชื่อ` | join `user_profiles` กับ `groups` แสดงทุกกลุ่ม |
| `/ช่วยเหลือ` | static text |

⚠️ **Schema mismatch**: คอลัมน์ `is_active`, `is_paused`, `current_day_override`, `pause_reason` ไม่มีใน [002_daily_program.sql](supabase/migrations/002_daily_program.sql) ซึ่งใช้ `paused`, `current_day` — อย่างใดอย่างหนึ่งต้องมี migration เพิ่มเติมที่ไม่ได้ track ใน repo หรือ commands เหล่านี้ runtime fail

---

## 6. Admin API (`/api/admin`)

### GET (`?action=`)
- `drafts` · `knowledge` · `groups` · `pending_groups`
- `review_queue` (filter `status:pending`)
- `members` — profiles + join `groups` แสดง `group_name`
- `programs` · `program_days?program_id=`
- `group_programs` — join `programs(name, duration_days, type)` + `groups(name)`
- `send_log?group_program_id=`

### POST (`body.action`)
| action | effect |
|---|---|
| `approve_group` | insert `groups` + delete `pending_groups` |
| `reject_group` | delete `pending_groups` |
| `approve_draft` | update `drafts.status:approved` + insert `knowledge` |
| `reject_draft` | update `drafts.status:rejected` |
| `delete_knowledge` | delete `knowledge` |
| `update_nickname` | update `user_profiles.nickname` |
| `approve_review` | **`pushMessage` เข้ากลุ่ม** + update `review_queue.status:approved` |
| `reject_review` | update `review_queue.status:rejected` |
| `update_program_day` | update `program_days` ตาม fields ที่ส่งมา |
| `start_group_program` | upsert `group_programs` on conflict `group_id` (1 กลุ่ม/1 program) |
| `toggle_group_program` | update `paused` |
| `stop_group_program` | **delete** `group_programs` (ไม่ใช่ soft) |

---

## 7. Admin Dashboard UI ([app/page.js](app/page.js))

Single-page dark UI (DM Sans + Syne fonts). Client-side state, fetch all data ใน `fetchAll()` ครั้งเดียว

| Section | Content |
|---|---|
| `dashboard` | Stat cards 4 ตัว + banner pending groups + preview drafts/groups + top 5 members DISC |
| `pending` | List `pending_groups` → `ApproveModal` (เลือก customer/trainer + ตั้งชื่อ) |
| `groups` | Table: name, type, id, created |
| `drafts` | List ทุก draft เรียง desc, ปุ่ม approve/reject เฉพาะ `pending` |
| `knowledge` | Table + ปุ่มลบ |
| `members` | Group by `group_name`, inline-edit nickname, DISC chip + D/I/S/C bars, message_count |
| `programs` | active group_programs + program list + day editor (8 fields) + `StartProgramModal` |

ไม่มี auth — ใครเข้า URL ก็ใช้ได้

---

## 8. Daily Program Cron

### Schedule ([vercel.json](vercel.json))
| Slot | Cron (UTC) | TH (UTC+7) |
|---|---|---|
| morning | `0 0 * * *` | 07:00 |
| afternoon | `0 5 * * *` | 12:00 |
| evening | `0 11 * * *` | 18:00 |

### Flow ([cron/daily/route.js](app/api/cron/daily/route.js))
1. ตรวจ `Authorization: Bearer $CRON_SECRET` (ถ้า env set)
2. ตรวจ `time ∈ {morning, afternoon, evening}`
3. Query `group_programs where paused=false`
4. ต่อกลุ่ม:
   - `dayNumber = floor((today - start_date) / 1day) + 1`
   - Skip ถ้า `dayNumber < 1`
   - Check `daily_send_log` มี row (`group_program_id + day_number + send_slot`) → skip
   - ดึง `program_days` ตาม `(program_id, day_number)` — skip ถ้าไม่มี
   - ดึง members (`id, display_name, nickname, disc_type`) — skip ถ้า empty
   - Generate message (Gemini 2.5 Flash, tokens 2048, temp 0.7, `thinkingBudget:0`):
     - morning → `generateMorningMessage` (meal ทั้งวัน + trick เช้า + motivation, max 20 บรรทัด)
     - afternoon/evening → `generateSlotMessage` (เฉพาะมื้อนั้น, max 10 บรรทัด)
   - `pushMessage` เข้ากลุ่ม
   - Insert `daily_send_log` (unique constraint guard)
   - ถ้า morning → update `current_day`
5. Return JSON `{ok, time, sent, results, debug_*}` + `Cache-Control: no-store`

Response มี field `debug_supabase_url`, `debug_ts`, `debug_group_programs` — leftover จาก debugging cache issue

---

## 9. Database Schema

### 9.1 Migration 001 — [user_profiles](supabase/migrations/001_user_profiles.sql)
```
user_profiles (
  id uuid PK,
  group_id text, line_user_id text,
  display_name text,        -- จาก LINE API
  nickname text,            -- ตั้งโดย trainer (default = display_name)
  disc_d/i/s/c int,         -- สะสม
  disc_type text,           -- D|I|S|C|null (recomputed)
  message_count int,
  created_at, updated_at,
  UNIQUE (group_id, line_user_id)
)
```

### 9.2 Migration 002 — [daily program](supabase/migrations/002_daily_program.sql)
```
programs (
  id bigint PK,
  name text UNIQUE,         -- 'UP Labs 14D' | 'Full Course 30D' | 'Full Course 60D'
  duration_days int,
  type text,                -- 'uplabs' | 'full'
  description text
)

program_days (
  id serial PK,
  program_id bigint, day_number int,
  meal_morning/afternoon/evening text,
  supplement text,
  trick_morning/afternoon/evening text,
  content_keyword text, content_theme text,  -- motivation|education|checkin|challenge
  UNIQUE (program_id, day_number)
)

group_programs (
  id uuid PK,
  group_id text UNIQUE,     -- 1 กลุ่ม / 1 program
  program_id bigint,
  start_date date,
  current_day int default 1,
  paused bool default false
)

daily_send_log (
  id serial PK,
  group_program_id uuid,
  day_number int,
  send_slot text,           -- 'morning' | 'afternoon' | 'evening'
  message_text text,
  sent_at timestamptz,
  UNIQUE (group_program_id, day_number, send_slot)
)
```

Seed: UP Labs 14D (14 rows), Full Course 30D (30 rows), Full Course 60D (60 rows — clone 1-30 + Round 2 31-60)

### 9.3 Tables ที่ไม่มี migration file (inferred จาก code)
```
groups (id text PK, name, type, created_at)
pending_groups (id uuid?, group_id, group_name, created_at)
drafts (id, content, group_id, line_user_id, status, created_at)
knowledge (id, content, source_draft_id?, created_at)
messages (id, group_id, line_user_id, content, direction, created_at)
review_queue (id, group_id, line_user_id, question, suggested_reply,
              risk_reason, status, created_at)
```

---

## 10. Environment Variables
| Key | Usage |
|---|---|
| `LINE_ACCESS_TOKEN` | reply/push + get member/group profile |
| `LINE_CHANNEL_SECRET` | webhook signature validation |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | service role (bypass RLS) |
| `GEMINI_API_KEY` | Gemini API |
| `CRON_SECRET` | (optional) Bearer token สำหรับ cron |

---

## 11. File Map

```
app/
├── layout.js               root layout
├── page.js                 admin dashboard (client, ~1200 lines)
└── api/
    ├── webhook/route.js    LINE webhook + 3-tier reply + commands + research
    ├── admin/route.js      admin GET/POST actions
    ├── cron/daily/route.js daily program cron
    └── research/route.js   standalone research (dead?)
supabase/migrations/
├── 001_user_profiles.sql
└── 002_daily_program.sql
vercel.json                 cron config
SPEC.md                     what-should-be
ARCHITECTURE.md             this file — what-is
PROMPTS.md                  all Gemini prompts
```
