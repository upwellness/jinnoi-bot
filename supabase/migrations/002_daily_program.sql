-- ============================================================
-- 002_daily_program.sql
-- Daily program system: program_days + daily_send_log
-- ============================================================

-- เพิ่ม columns ใน programs (ถ้ายังไม่มี)
alter table programs add column if not exists duration_days int not null default 14;
alter table programs add column if not exists type text not null default 'uplabs';
alter table programs add column if not exists description text default '';

-- program_days: เนื้อหาแต่ละวันของแต่ละคอร์ส (admin config ได้)
create table if not exists program_days (
  id            serial primary key,
  program_id    uuid not null,                    -- references programs(id)
  day_number    int not null,
  -- อาหาร/ยา (keyword หรือ full text — AI จะ expand)
  meal_morning  text not null default '',         -- เมนูเช้า
  meal_afternoon text not null default '',        -- เมนูเที่ยง
  meal_evening  text not null default '',         -- เมนูเย็น
  supplement    text not null default '',         -- อาหารเสริม/ยา
  -- Tricks per meal
  trick_morning   text not null default '',       -- tip สำหรับเช้า/ภาพรวม
  trick_afternoon text not null default '',       -- tip สำหรับเที่ยง
  trick_evening   text not null default '',       -- tip สำหรับเย็น
  -- เนื้อหา support/motivation (AI expand ตาม DISC)
  content_keyword text not null default '',
  content_theme   text not null default 'motivation',  -- motivation|education|checkin|challenge
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique (program_id, day_number)
);

-- group_programs: กลุ่มที่กำลังทำ program อยู่
create table if not exists group_programs (
  id          uuid primary key default gen_random_uuid(),
  group_id    text not null unique,                -- LINE group id (1 กลุ่มต่อ 1 program)
  program_id  uuid not null,                      -- references programs(id)
  start_date  date not null,
  current_day int not null default 1,
  paused      boolean not null default false,
  created_at  timestamptz default now()
);

create index if not exists group_programs_group on group_programs (group_id);

-- daily_send_log: บันทึกว่าส่งข้อความแต่ละ slot ไปแล้วหรือยัง
create table if not exists daily_send_log (
  id                serial primary key,
  group_program_id  uuid not null,               -- references group_programs(id)
  day_number        int not null,
  send_slot         text not null,               -- 'morning' | 'afternoon' | 'evening'
  message_text      text,                        -- เก็บข้อความที่ส่งไปด้วย
  sent_at           timestamptz default now(),
  unique (group_program_id, day_number, send_slot)
);

create index if not exists program_days_lookup on program_days (program_id, day_number);
create index if not exists daily_send_log_lookup on daily_send_log (group_program_id, day_number);

-- ============================================================
-- SEED DEFAULT CONTENT
-- ============================================================

do $$
declare
  pid_uplabs    uuid;
  pid_full30    uuid;
  pid_full60    uuid;
begin

  -- Upsert programs
  insert into programs (name, duration_days, type, description)
  values
    ('UP Labs 14D',    14, 'uplabs', 'คอร์สลดน้ำหนักเข้มข้น 14 วัน เน้นปรับพฤติกรรมและ reset ร่างกาย'),
    ('Full Course 30D', 30, 'full',  'คอร์สลดน้ำหนักและปรับสุขภาพ 30 วัน แบบครอบคลุม'),
    ('Full Course 60D', 60, 'full',  'คอร์สเปลี่ยนไลฟ์สไตล์ระยะยาว 60 วัน')
  on conflict (name) do update
    set duration_days = excluded.duration_days,
        type = excluded.type,
        description = excluded.description;

  select id into pid_uplabs from programs where name = 'UP Labs 14D';
  select id into pid_full30  from programs where name = 'Full Course 30D';
  select id into pid_full60  from programs where name = 'Full Course 60D';

  -- ============================================================
  -- UP Labs 14D — Default Content
  -- ============================================================
  insert into program_days (program_id, day_number, meal_morning, meal_afternoon, meal_evening, supplement, trick_morning, trick_afternoon, trick_evening, content_keyword, content_theme)
  values
  (pid_uplabs, 1,
    'ไข่ต้ม 2 ฟอง + แตงกวา + น้ำเปล่า',
    'อกไก่ต้ม + ผักสด + น้ำเปล่า',
    'ปลาทับทิมนึ่ง + ผักต้ม',
    'Fiber 1 ช้อน ละลายน้ำก่อนอาหารเช้า',
    'ดื่มน้ำ 1 แก้วก่อนอาหารทุกมื้อ ช่วยลดความหิวและช่วยย่อย',
    'เคี้ยวช้าๆ อย่างน้อย 20 ครั้งต่อคำ ส่งสัญญาณอิ่มได้เร็วขึ้น',
    'หยุดกินก่อน 19:00 น. ให้ร่างกาย detox ตอนนอน',
    'เริ่มต้นใหม่ reset ร่างกาย วันแรกสำคัญมาก', 'motivation'),

  (pid_uplabs, 2,
    'ไข่ดาว 2 ฟอง + มะเขือเทศ + นมไขมันต่ำ 1 กล่อง',
    'อกไก่ย่าง 150g + บร็อคโคลี่นึ่ง + ข้าวกล้อง ½ ทัพพี',
    'กุ้งผัดผัก + เต้าหู้แข็ง',
    'Fiber + วิตามิน C',
    'โปรตีนเช้าช่วยรักษากล้ามเนื้อระหว่างลดน้ำหนัก',
    'ข้าวกล้อง ½ ทัพพีพอ ไม่ต้องกินเยอะ โฟกัสที่โปรตีนและผัก',
    'งดขนม น้ำหวาน ดื่มแต่น้ำเปล่าหรือชาเขียวไม่หวาน',
    'โปรตีนคือกุญแจ ลดน้ำหนักโดยไม่เสียกล้ามเนื้อ', 'education'),

  (pid_uplabs, 3,
    'โจ๊กข้าวกล้องไก่ไม่ใส่น้ำตาล',
    'สลัดผักใหญ่ + อกไก่ต้ม + น้ำสลัดมะนาว',
    'ซุปผักใส + เต้าหู้',
    'Fiber + น้ำมันปลา',
    'ดื่มน้ำ 2.5-3 ลิตรวันนี้ ช่วย flush ไขมันออกจากร่างกาย',
    'สลัดก่อน main dish ทุกครั้ง ได้ fiber ก่อน ลดการดูดซึม carb',
    'ไม่ต้องหิวมากก็กินเย็นได้เลย อย่ารอจนหิวมากแล้วกินเยอะ',
    'hydration และ fiber วันนี้คือพระเอก', 'education'),

  (pid_uplabs, 4,
    'สมูทตี้ผักโขม + แอปเปิ้ลเขียว + นม',
    'ข้าวกล้อง ½ ทัพพี + ผัดผักรวม + ปลา',
    'ต้มจืดผักรวม + ไข่',
    'Fiber + แมกนีเซียม',
    'ผักสีเขียวเข้มช่วย detox ตับ เพิ่มอัตราเผาผลาญ',
    'ผักต้องเป็นครึ่งจาน เนื้อสัตว์ไขมันต่ำหนึ่งส่วน carb หนึ่งส่วนเล็ก',
    'ชาอบเชย ½ ช้อนชา ละลายน้ำอุ่น ดื่มหลังอาหาร ช่วยน้ำตาลเลือด',
    'ผักให้เต็มที่ ร่างกายต้องการ micronutrient', 'education'),

  (pid_uplabs, 5,
    'กล้วยหอม 1 ลูก + ไข่ต้ม + นมไขมันต่ำ',
    'อกไก่ + ข้าวกล้อง + แตงกวา',
    'ปลาอบ + ผักย่าง',
    'Fiber + BCAA (ถ้ามี)',
    'กินกล้วยก่อนออกกำลังกายถ้าวันนี้เดินหรือออกกำลัง',
    'วันนี้ลองเดิน 30 นาทีหลังอาหารเที่ยง เผาผลาญเพิ่ม 15%',
    'stretching เบาๆ ก่อนนอน ช่วย recovery และนอนหลับดีขึ้น',
    'movement คือยาที่ดีที่สุด แม้แค่เดิน', 'challenge'),

  (pid_uplabs, 6,
    'ไข่ตุ๋น + ผักโขม + น้ำเปล่า',
    'ซุปไก่ใส + ผัก + วุ้นเส้น',
    'ปลานึ่ง + น้ำซุปผัก',
    'Fiber + วิตามิน D',
    'วันนี้ให้ร่างกายพัก กินเบาๆ น้ำซุปผักช่วย inflammation',
    'วันพักไม่ได้แปลว่ากินเยอะได้ ยังต้องควบคุม portion',
    'นอนให้ได้ 7-8 ชั่วโมง ฮอร์โมน leptin จะทำงานดี ลดความอยากอาหาร',
    'recovery สำคัญเท่าๆ กับการออกกำลังกาย', 'motivation'),

  (pid_uplabs, 7,
    'โยเกิร์ต Greek + ผลไม้สด + เมล็ดเชีย',
    'อกไก่ + ผักสด + มะนาว',
    'ปลาแซลมอน + ผักนึ่ง',
    'Fiber + โอเมก้า 3',
    'สัปดาห์แรกผ่านไปแล้ว! ร่างกายเริ่มปรับตัวกับ routine ใหม่',
    'ชั่งน้ำหนักตอนเช้าหลังเข้าห้องน้ำ ก่อนกินอะไร เพื่อ baseline ที่แม่นยำ',
    'เขียน reflection สิ่งที่ทำได้ดีในสัปดาห์นี้ 3 ข้อ',
    'สัปดาห์ 1 checkpoint ทบทวนและเตรียมสัปดาห์ 2', 'checkin'),

  (pid_uplabs, 8,
    'ไข่คน 2 ฟอง + อะโวคาโด ½ ลูก',
    'สลัดโปรตีน อกไก่ + ถั่วแดง + ผัก',
    'เนื้อปลาย่าง + บร็อคโคลี่',
    'Fiber + CLA (ถ้ามี)',
    'อะโวคาโดให้ไขมันดีช่วยดูดซึม fat-soluble vitamins',
    'ลองกินข้าวกล้องเพียง ¼ ทัพพีวันนี้ ลดลงจากเดิม',
    'หยุดกินก่อน 18:30 น. วันนี้ intermittent fasting เบาๆ',
    'week 2 เริ่มแล้ว กระชับ discipline ให้มากขึ้น', 'challenge'),

  (pid_uplabs, 9,
    'ชาเขียว + ไข่ต้ม + แครอทดิบ',
    'อกไก่ + ผักสด + น้ำสลัด',
    'ต้มจืดเต้าหู้ + ผัก',
    'Fiber + พรีไบโอติก',
    'กินช้าๆ วางช้อนระหว่างคำ สังเกตความหิว-อิ่มของร่างกาย',
    'ถามตัวเองก่อนกินว่าหิวจริงๆ หรือแค่เบื่อ/เครียด',
    'mindful eating เย็นนี้ กินโดยไม่ดูโทรศัพท์',
    'mindful eating เปลี่ยนความสัมพันธ์กับอาหาร', 'education'),

  (pid_uplabs, 10,
    'นมไขมันต่ำ + โปรตีนบาร์ไม่หวาน (ถ้ามี)',
    'ผัดผักน้ำมันน้อย + ไก่ + ข้าวกล้องน้อย',
    'กุ้งนึ่ง + น้ำจิ้มซีฟู้ดน้ำตาลน้อย',
    'Fiber + วิตามิน B complex',
    'ตรวจสอบ label อาหาร: sodium ควรต่ำกว่า 600mg ต่อมื้อ',
    'น้ำตาลซ่อนอยู่ใน sauce และ dressing ระวังให้ดี',
    'ดื่มน้ำอุ่นก่อนนอน ช่วย digestion ตอนกลางคืน',
    'ลด sodium และ hidden sugar วันนี้', 'education'),

  (pid_uplabs, 11,
    'ไข่ต้ม + ผลไม้สด (ส้ม หรือฝรั่ง)',
    'อกไก่ + ผักนึ่ง + quinoa หรือข้าวกล้อง',
    'ปลาอบ + สลัด',
    'Fiber + zinc',
    'ทำ routine เดิมทุกเช้า: น้ำ → ชั่งน้ำหนัก → อาหาร สร้าง habit loop',
    'เตรียมกล่องข้าวล่วงหน้าคืนนี้ ลดโอกาสกินผิดแผน',
    'เขียน meal plan ของพรุ่งนี้ก่อนนอน',
    'habit stacking ทำให้ไม่ต้องใช้ willpower', 'education'),

  (pid_uplabs, 12,
    'สมูทตี้โปรตีน + เมล็ดเชีย',
    'เลือกเมนูอาหารนอกบ้านอย่างชาญฉลาด: ต้ม/นึ่ง/ย่าง ไม่ทอด',
    'ซุปใส + โปรตีน',
    'Fiber',
    'กินนอกบ้านได้ แค่เลือกวิธีทำ: ต้ม ย่าง นึ่ง > ผัด > ทอด',
    'ออเดอร์ sauce แยก น้ำสลัดแยก control ได้ดีกว่า',
    'social eating ไม่ใช่ศัตรู แค่ต้องมีกลยุทธ์',
    'กินนอกบ้านโดยไม่ทำลายแผน ทำได้!', 'challenge'),

  (pid_uplabs, 13,
    'ไข่ดาว + มะเขือเทศ + นมไขมันต่ำ',
    'อกไก่ + ผัก + ข้าวกล้อง ¼ ทัพพี',
    'ปลา + ผักต้ม',
    'Fiber + โอเมก้า 3',
    'เหลืออีกแค่ 2 วัน! รักษาโมเมนตัม วันนี้สำคัญมาก',
    'ไม่ต้องรีบ cheat meal ยังอีก 2 วัน เส้นชัยอยู่ตรงหน้า',
    'วัดรอบเอว หรือถ่ายรูป progress เพื่อเปรียบเทียบ',
    'ใกล้แล้ว! push ให้ถึงเส้นชัย', 'motivation'),

  (pid_uplabs, 14,
    'อาหารเช้าที่ชอบที่สุดในคอร์ส (เลือกเองได้)',
    'อาหารกลางวัน clean eating ที่ทำได้ในชีวิตจริง',
    'ฉลองด้วยอาหารเย็นสุขภาพที่อร่อยที่สุด',
    'Fiber',
    'วันสุดท้าย! คุณทำสำเร็จแล้ว ภูมิใจในตัวเองด้วย',
    'สิ่งที่ได้เรียนรู้ใน 14 วันนี้ใช้ได้ตลอดชีวิต',
    'วางแผน maintenance หลังจากนี้ เพื่อรักษาผลลัพธ์ที่ได้',
    'จบ UP Labs 14D แล้ว! ก้าวต่อไปสู่ maintenance', 'checkin')

  on conflict (program_id, day_number) do nothing;

  -- ============================================================
  -- Full Course 30D — Default Content (4 phases)
  -- ============================================================
  insert into program_days (program_id, day_number, meal_morning, meal_afternoon, meal_evening, supplement, trick_morning, trick_afternoon, trick_evening, content_keyword, content_theme)
  values
  -- PHASE 1: Foundation (Days 1-7)
  (pid_full30, 1, 'ไข่ต้ม + ผัก + น้ำ', 'อกไก่ + สลัด', 'ปลาต้ม + ผัก', 'Fiber', 'reset ร่างกาย วันแรก', 'เน้น clean eating', 'นอน 7-8 ชม.', 'เริ่มต้นใหม่ปรับพฤติกรรม', 'motivation'),
  (pid_full30, 2, 'โปรตีนสูง ไข่ + นม', 'อกไก่ + ข้าวกล้อง', 'กุ้ง + ผัก', 'Fiber + วิตามิน C', 'โปรตีนทุกมื้อ', 'ลด carb ลง 30%', 'งดน้ำหวาน', 'โปรตีนสำคัญมาก', 'education'),
  (pid_full30, 3, 'สมูทตี้ผัก', 'สลัดใหญ่ + ไก่', 'ซุปผัก + เต้าหู้', 'Fiber + น้ำมันปลา', 'น้ำ 3 ลิตร', 'ผักครึ่งจาน', 'ชาอบเชย', 'hydration & fiber', 'education'),
  (pid_full30, 4, 'ข้าวต้มไก่', 'ผัดผัก + ปลา', 'ต้มจืด + ไข่', 'Fiber', 'ผักสีสันหลากหลาย', 'กินช้าๆ', 'ไม่กินดึก', 'micronutrients', 'education'),
  (pid_full30, 5, 'กล้วย + ไข่', 'อกไก่ + quinoa', 'ปลาอบ + ผัก', 'BCAA', 'กินก่อนเดิน', 'เดิน 30 นาที', 'stretch ก่อนนอน', 'movement สำคัญ', 'challenge'),
  (pid_full30, 6, 'ไข่ตุ๋น + ผักโขม', 'ซุปไก่ใส', 'น้ำซุปผัก', 'วิตามิน D', 'วันพัก', 'กินเบาๆ', 'นอนให้พอ', 'recovery day', 'motivation'),
  (pid_full30, 7, 'Greek yogurt + ผลไม้', 'อกไก่ + ผัก', 'ปลา + สลัด', 'โอเมก้า 3', 'check progress', 'ชั่งน้ำหนัก', 'วาง plan สัปดาห์ 2', 'week 1 review', 'checkin'),
  -- PHASE 2: Build (Days 8-14)
  (pid_full30, 8, 'ไข่คน + อะโวคาโด', 'สลัดโปรตีน', 'เนื้อปลาย่าง + บร็อคโคลี่', 'CLA', 'ไขมันดีสำคัญ', 'ลด carb อีก', 'IF 16:8', 'boost metabolism', 'challenge'),
  (pid_full30, 9, 'ชาเขียว + ไข่', 'อกไก่ + ผัก', 'เต้าหู้ + ผัก', 'พรีไบโอติก', 'mindful eating', 'กินช้า', 'ไม่ดูโทรศัพท์ตอนกิน', 'gut health', 'education'),
  (pid_full30, 10, 'นม + โปรตีนบาร์', 'ผัดผักน้ำน้อย + ไก่', 'กุ้งนึ่ง', 'วิตามิน B', 'อ่าน label อาหาร', 'ลด sodium', 'ดื่มน้ำอุ่น', 'hidden sugar', 'education'),
  (pid_full30, 11, 'ไข่ + ผลไม้', 'ไก่ + quinoa', 'ปลา + สลัด', 'zinc', 'habit loop', 'เตรียมอาหาร', 'วาง plan พรุ่งนี้', 'habit building', 'education'),
  (pid_full30, 12, 'สมูทตี้โปรตีน', 'อาหารนอกบ้าน ต้ม/ย่าง', 'ซุป + โปรตีน', 'Fiber', 'เลือกฉลาด', 'sauce แยก', 'social eating strategy', 'social dining', 'challenge'),
  (pid_full30, 13, 'ไข่ + มะเขือเทศ', 'อกไก่ + ข้าวกล้อง', 'ปลา + ผัก', 'โอเมก้า 3', 'momentum สำคัญ', 'maintain discipline', 'วัด progress', 'keep momentum', 'motivation'),
  (pid_full30, 14, 'อาหารเช้า clean ที่ชอบ', 'clean eating ในชีวิตจริง', 'อาหารเย็นสุขภาพ', 'Fiber', 'phase 2 จบ!', 'review 2 สัปดาห์', 'วาง plan phase 3', 'phase 2 checkpoint', 'checkin'),
  -- PHASE 3: Accelerate (Days 15-21)
  (pid_full30, 15, 'ไข่ + ผัก + เมล็ดเชีย', 'อกไก่ + ผักสด', 'ปลา + ผักนึ่ง', 'Fiber + CLA', 'เพิ่ม intensity', 'ลด portion เล็กน้อย', 'IF strict ขึ้น', 'phase 3 เร่งเครื่อง', 'challenge'),
  (pid_full30, 16, 'สมูทตี้โปรตีน', 'สลัด + โปรตีน 2 ชนิด', 'ซุปใส + ไข่', 'วิตามิน C + D', 'super food วันนี้', 'antioxidant สูง', 'ชา catechin', 'superfoods', 'education'),
  (pid_full30, 17, 'ไข่คน + สมุนไพร', 'ไก่ + ถั่ว + ผัก', 'ปลาแซลมอน', 'โอเมก้า 3', 'omega-3 ช่วยเผาผลาญ', 'anti-inflammation', 'นอนหลับลึก', 'omega-3 day', 'education'),
  (pid_full30, 18, 'โยเกิร์ต + granola ไม่หวาน', 'ต้มจืดผัก + เต้าหู้', 'กุ้ง + ผัก', 'พรีไบโอติก', 'gut-brain axis', 'อาหารเพื่อลำไส้', 'ลดความเครียด', 'gut health advanced', 'education'),
  (pid_full30, 19, 'ไข่ + ผลไม้ + น้ำ', 'อกไก่ + ผัก + ข้าวกล้อง', 'ปลาอบ + สลัด', 'BCAA + Fiber', 'active rest day', 'yoga หรือ stretch', 'meditation 5 นาที', 'body & mind', 'motivation'),
  (pid_full30, 20, 'ชาเขียว + ไข่ต้ม', 'อาหารนอกบ้านอย่างมีสติ', 'ซุป + โปรตีน', 'Fiber', 'week 3 almost done', 'ทบทวน progress', 'ภูมิใจในตัวเอง', 'progress review', 'checkin'),
  (pid_full30, 21, 'อาหารเช้าที่ชอบ clean', 'อกไก่ + quinoa', 'ปลา + ผักนึ่ง', 'โอเมก้า 3 + วิตามิน', 'week 3 done!', 'ชั่งน้ำหนัก + วัดรอบ', 'วาง final plan', 'week 3 checkpoint', 'checkin'),
  -- PHASE 4: Sustain (Days 22-30)
  (pid_full30, 22, 'ไข่ + อะโวคาโด + ผัก', 'สลัดโปรตีน + ถั่ว', 'ปลา + ผัก', 'CLA + Fiber', 'maintenance mindset เริ่ม', 'กินได้หลากหลายมากขึ้น', 'balance คือกุญแจ', 'sustainable eating', 'education'),
  (pid_full30, 23, 'สมูทตี้ผัก + โปรตีน', 'อกไก่ + ผัก', 'เนื้อแดงไม่ติดมัน + ผัก', 'วิตามิน B + iron', 'lean protein หลากหลาย', 'ไม่จำเป็นต้องไก่ทุกวัน', 'protein rotation', 'protein variety', 'education'),
  (pid_full30, 24, 'ไข่ + ผลไม้สด', 'อาหารไทยสุขภาพ', 'ต้มข่าไก่ใสๆ', 'Fiber + สมุนไพร', 'อาหารไทยสุขภาพมีเยอะ', 'เลือกถูก กินได้ทุกวัน', 'รากสมุนไพรช่วย metabolism', 'thai healthy food', 'education'),
  (pid_full30, 25, 'โยเกิร์ต + เมล็ดผ้า + ผลไม้', 'ผัดผักน้ำน้อย + โปรตีน', 'ซุปผัก + ไข่', 'พรีไบโอติก + โพรไบโอติก', 'ลำไส้แข็งแรง = metabolism ดี', 'fermented food', 'kefir หรือ kimchi เล็กน้อย', 'gut microbiome', 'education'),
  (pid_full30, 26, 'ไข่ + ผัก + น้ำมะนาว', 'อกไก่ + บร็อคโคลี่', 'ปลา + สลัด', 'วิตามิน C + zinc', 'ระบบภูมิคุ้มกัน + การลดน้ำหนัก', 'อาหารสีส้มเหลือง', 'ลดอาหารอักเสบ', 'immunity & weight', 'education'),
  (pid_full30, 27, 'สมูทตี้ผัก', 'อาหารสุขภาพที่ทำเองได้', 'อาหารเย็นเบาๆ', 'Fiber', 'cook at home ประหยัดและสุขภาพดี', 'meal prep สำคัญ', 'วาง plan อาหารสัปดาห์', 'meal prep skills', 'challenge'),
  (pid_full30, 28, 'ไข่ + อะโวคาโด', 'อาหารนอกบ้านมีสติ', 'ซุป + โปรตีน', 'โอเมก้า 3', 'เกือบถึงแล้ว! 2 วันสุดท้าย', 'maintain ความมุ่งมั่น', 'วัด progress ครั้งสุดท้าย', 'final stretch', 'motivation'),
  (pid_full30, 29, 'อาหารเช้า clean ที่ชอบ', 'อกไก่ + ผัก + ข้าวกล้อง', 'ปลา + ผักนึ่ง', 'Fiber + วิตามิน', 'วันสุดท้าย approach', 'ทบทวนสิ่งที่เรียนรู้', 'เตรียม maintenance plan', 'day 29 reflection', 'checkin'),
  (pid_full30, 30, 'อาหารเช้าฉลองสุขภาพ', 'clean eating ที่ sustain ได้', 'อาหารเย็นฉลองสำเร็จ', 'Fiber + multi-vitamin', 'จบ 30 วันแล้ว!', 'ชั่งน้ำหนัก + ถ่ายรูป', 'วาง maintenance lifestyle', 'Full Course 30D Complete!', 'checkin')

  on conflict (program_id, day_number) do nothing;

  -- ============================================================
  -- Full Course 60D — Days 1-30 clone จาก 30D pattern, 31-60 advanced
  -- ============================================================
  -- Days 1-30: คล้าย 30D แต่ pace ช้ากว่า
  insert into program_days (program_id, day_number, meal_morning, meal_afternoon, meal_evening, supplement, trick_morning, trick_afternoon, trick_evening, content_keyword, content_theme)
  select pid_full60, day_number, meal_morning, meal_afternoon, meal_evening, supplement, trick_morning, trick_afternoon, trick_evening, content_keyword, content_theme
  from program_days where program_id = pid_full30
  on conflict (program_id, day_number) do nothing;

  -- Days 31-60: Advanced lifestyle integration
  insert into program_days (program_id, day_number, meal_morning, meal_afternoon, meal_evening, supplement, trick_morning, trick_afternoon, trick_evening, content_keyword, content_theme)
  values
  (pid_full60, 31, 'ไข่ + ผัก + เมล็ดเชีย', 'อกไก่ + quinoa', 'ปลา + ผักนึ่ง', 'Fiber + CLA', 'เริ่ม phase advanced', 'ลด carb ต่อเนื่อง', 'IF ให้เป็นนิสัย', 'advanced phase เริ่ม', 'challenge'),
  (pid_full60, 32, 'สมูทตี้โปรตีนขั้นสูง', 'สลัด + โปรตีน 2 ชนิด', 'ซุปผัก + เต้าหู้', 'วิตามิน C + D + E', 'antioxidant สูงสุด', 'สีผักหลากหลาย', 'green tea + lemon', 'antioxidant power', 'education'),
  (pid_full60, 33, 'โยเกิร์ต + granola + ผลไม้', 'ไก่ + ถั่ว + ผัก', 'ปลาแซลมอน + ผัก', 'โอเมก้า 3 + Q10', 'ไขมันดีช่วย brain', 'fat adaptation', 'ketone body เบื้องต้น', 'metabolic flexibility', 'education'),
  (pid_full60, 34, 'ไข่ + สมุนไพร ขมิ้น ขิง', 'ต้มข่าไก่ใส', 'กุ้ง + ผักรวม', 'พรีไบโอติก + เคอร์คูมิน', 'สมุนไพรต้านอักเสบ', 'turmeric + black pepper', 'anti-inflammation สูงสุด', 'thai herbs power', 'education'),
  (pid_full60, 35, 'ชาเขียว matcha + ไข่', 'อกไก่ + ผักใบเขียว', 'ปลา + บร็อคโคลี่', 'EGCG + Fiber', 'matcha เพิ่ม thermogenesis', 'catechin ช่วยเผาผลาญ', 'detox tea ก่อนนอน', 'green tea advanced', 'education'),
  (pid_full60, 36, 'ไข่ + อะโวคาโด + เมล็ดแฟลกซ์', 'สลัดโปรตีน + nuts', 'ปลาทูน่า + ผัก', 'โอเมก้า 3 + แมกนีเซียม', 'healthy fats สำคัญ', 'ไม่กลัวไขมันดี', 'nuts ก่อนนอนได้', 'healthy fat mastery', 'education'),
  (pid_full60, 37, 'smoothie bowl ผัก + ผลไม้', 'ไก่ + ผัก + ข้าวกล้องน้อยมาก', 'ซุปใส + โปรตีน', 'Fiber + chromium', 'blood sugar stability', 'glycemic index', 'cinnamon ช่วยน้ำตาล', 'blood sugar control', 'education'),
  (pid_full60, 38, 'ไข่ + ผัก + กาแฟดำ', 'อกไก่ + ผักสด', 'ปลาอบ + ผัก', 'CLA + L-carnitine', 'กาแฟดำเพิ่ม fat burning', 'pre-workout nutrition', 'post-workout recovery', 'fat burning optimization', 'challenge'),
  (pid_full60, 39, 'โปรตีนเชค + ผลไม้', 'สลัดใหญ่ + โปรตีน 2 ชนิด', 'ซุปกระดูก + ผัก', 'คอลลาเจน + Fiber', 'bone broth benefits', 'คอลลาเจนผิว + ข้อต่อ', 'skin & joint health', 'collagen & bone health', 'education'),
  (pid_full60, 40, 'ไข่ + ผัก + เมล็ดเจีย', 'อาหารไทยสุขภาพ clean', 'ปลา + ผักนึ่ง', 'Fiber + multi', 'day 40 milestone!', 'ชั่งน้ำหนัก + ถ่ายรูป', 'วาง plan 20 วันสุดท้าย', 'day 40 major checkpoint', 'checkin'),
  (pid_full60, 41, 'สมูทตี้ผัก + protein', 'อกไก่ + quinoa + ผัก', 'เนื้อแดงไม่ติดมัน + ผัก', 'วิตามิน B12 + iron', 'iron สำหรับพลังงาน', 'ดูดซึม iron กับวิตามิน C', 'พักผ่อนให้พอ', 'energy optimization', 'education'),
  (pid_full60, 42, 'ไข่ + ผลไม้ + น้ำ', 'อาหารสุขภาพที่ทำเองได้', 'ซุปผัก + ไก่', 'Fiber + probiotics', 'cook at home week', 'meal prep ล่วงหน้า', 'เตรียมอาหารสัปดาห์', 'home cooking week', 'challenge'),
  (pid_full60, 43, 'โยเกิร์ต + ผลไม้ + granola', 'สลัดโปรตีน', 'ปลา + ผักนึ่ง', 'โอเมก้า 3 + D3', 'week 7 เริ่มแล้ว', 'ปรับ routine ให้ยั่งยืน', 'lifestyle ที่ maintain ได้', 'sustainable lifestyle', 'education'),
  (pid_full60, 44, 'ชาเขียว + ไข่ต้ม', 'ไก่ + ผัก + ถั่ว', 'ปลาแซลมอน + สลัด', 'โอเมก้า 3 + CLA', 'lean body composition', 'ลด body fat เพิ่ม muscle', 'resistance training เบาๆ', 'body recomposition', 'challenge'),
  (pid_full60, 45, 'ไข่ + อะโวคาโด + ผัก', 'อกไก่ + ผักสด', 'ซุปใส + โปรตีน', 'Fiber + zinc', 'day 45 halfway 60D!', 'review progress ครึ่งทาง', 'วาง plan ครึ่งหลัง', 'day 45 halfway checkpoint', 'checkin'),
  (pid_full60, 46, 'สมูทตี้ผัก + เมล็ด', 'อาหารนอกบ้านอย่างมีสติ', 'ปลา + ผักนึ่ง', 'Fiber', 'social eating mastery', 'กินได้ทุกที่ถ้ารู้จักเลือก', 'ไม่รู้สึกผิด หลังกินสังสรรค์', 'social life & diet', 'education'),
  (pid_full60, 47, 'ไข่ + ผัก + น้ำมะนาว', 'อกไก่ + quinoa', 'เต้าหู้ + ผักรวม', 'พรีไบโอติก', 'plant-based day', 'ลอง more plant protein', 'legumes & tofu', 'plant protein day', 'challenge'),
  (pid_full60, 48, 'โปรตีนเชค + ผลไม้', 'สลัด + โปรตีนสูง', 'ปลา + บร็อคโคลี่', 'BCAA + Fiber', 'muscle preservation สำคัญ', 'โปรตีนทุกมื้อ', 'resist muscle loss', 'muscle & diet balance', 'education'),
  (pid_full60, 49, 'ไข่ + ผัก + เมล็ดเชีย', 'อกไก่ + ผักสด', 'ซุปกระดูก + ผัก', 'คอลลาเจน + multi', 'week 8 เริ่มแล้ว', 'ใกล้เส้นชัยแล้ว!', 'วาง plan สัปดาห์สุดท้าย', 'final week approaching', 'motivation'),
  (pid_full60, 50, 'สมูทตี้ผัก + โปรตีน', 'อาหารไทยสุขภาพ', 'ปลา + ผักนึ่ง', 'Fiber + วิตามิน', 'day 50 milestone!', 'ชั่งน้ำหนัก + วัดรอบ', 'progress photos', 'day 50 milestone', 'checkin'),
  (pid_full60, 51, 'ไข่ + ผัก', 'อกไก่ + ผัก', 'ปลา + สลัด', 'Fiber', 'เส้นชัยใกล้มาก', 'maintain discipline', 'don''t stop now', 'final countdown', 'motivation'),
  (pid_full60, 52, 'โยเกิร์ต + ผลไม้', 'สลัดโปรตีน', 'ซุป + โปรตีน', 'โอเมก้า 3', 'เหลือ 8 วัน', 'รักษาโมเมนตัม', 'ทบทวนสิ่งที่เรียนรู้', '8 days left', 'motivation'),
  (pid_full60, 53, 'ไข่ + ผัก + เมล็ดแฟลกซ์', 'อกไก่ + quinoa + ผัก', 'ปลา + ผัก', 'Fiber + CLA', 'เหลือ 7 วัน', 'สัปดาห์สุดท้าย', 'push to the end', 'one week left', 'challenge'),
  (pid_full60, 54, 'สมูทตี้ผัก', 'อาหารสุขภาพ', 'ปลา + ผักนึ่ง', 'multi-vitamin', 'เหลือ 6 วัน', 'ทำต่อไป', 'finish strong', '6 days left', 'motivation'),
  (pid_full60, 55, 'ไข่ + ผัก', 'อกไก่ + ผัก', 'ซุปใส + โปรตีน', 'Fiber', 'เหลือ 5 วัน', 'maintain the pace', 'sleep well', '5 days left', 'motivation'),
  (pid_full60, 56, 'ไข่ + อะโวคาโด', 'สลัดโปรตีน', 'ปลา + ผัก', 'โอเมก้า 3', 'เหลือ 4 วัน', 'ตรวจสอบ progress', 'รู้สึกภูมิใจ', '4 days left', 'checkin'),
  (pid_full60, 57, 'โปรตีนเชค + ผลไม้', 'อกไก่ + ผักสด', 'ปลา + สลัด', 'Fiber', 'เหลือ 3 วัน', 'final sprint', 'คุณทำได้!', '3 days left', 'motivation'),
  (pid_full60, 58, 'ไข่ + ผัก + น้ำ', 'อาหารไทยสุขภาพ', 'ซุปผัก + ไก่', 'Fiber + วิตามิน', 'เหลือ 2 วัน', 'ใกล้ถึงแล้ว', 'อย่าหยุดตอนนี้', '2 days left', 'motivation'),
  (pid_full60, 59, 'อาหารเช้า clean ที่ชอบ', 'อกไก่ + ผัก', 'ปลา + ผักนึ่ง', 'Fiber', 'วันสุดท้ายก่อน finale', 'เกือบถึงแล้ว!', 'วาง maintenance plan', 'day 59 final prep', 'checkin'),
  (pid_full60, 60, 'อาหารเช้าฉลองสุขภาพ', 'clean eating ที่ sustain ได้', 'อาหารเย็นฉลองการเดินทาง 60 วัน', 'Fiber + multi-vitamin', 'คุณทำสำเร็จ 60 วัน!', 'ชั่งน้ำหนัก + ถ่ายรูป final', 'วาง maintenance lifestyle ระยะยาว', 'Full Course 60D Complete! คุณเปลี่ยนชีวิตได้แล้ว', 'checkin')

  on conflict (program_id, day_number) do nothing;

end $$;
