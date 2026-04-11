-- ============================================================
-- 002_daily_program.sql
-- Daily program system: program_days + daily_send_log
-- ============================================================

-- เพิ่ม columns ใน programs (ถ้ายังไม่มี)
alter table programs add column if not exists duration_days int not null default 14;
alter table programs add column if not exists type text not null default 'uplabs';
alter table programs add column if not exists description text default '';

-- เพิ่ม unique constraint บน name เพื่อให้ ON CONFLICT (name) ทำงานได้
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'programs_name_unique'
  ) then
    alter table programs add constraint programs_name_unique unique (name);
  end if;
end $$;

-- program_days: เนื้อหาแต่ละวันของแต่ละคอร์ส (admin config ได้)
create table if not exists program_days (
  id            serial primary key,
  program_id    bigint not null,                  -- references programs(id)
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
  program_id  bigint not null,                    -- references programs(id)
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
  pid_uplabs    bigint;
  pid_full30    bigint;
  pid_full60    bigint;
begin

  -- Upsert programs
  insert into programs (name, duration_days, type, description)
  values
    ('UP Labs 14D',    14, 'uplabs', 'คอร์สลดน้ำหนักเข้มข้น 14 วัน เน้น reset ร่างกาย ปรับพฤติกรรม และเข้าสู่ Fat Adaptation'),
    ('Full Course 30D', 30, 'full',  'คอร์สลดน้ำหนักและปรับสุขภาพ 30 วัน แบ่งช่วงเร่งรัด 14 วัน + คงตัว 16 วัน'),
    ('Full Course 60D', 60, 'full',  'คอร์สเปลี่ยนไลฟ์สไตล์ระยะยาว 60 วัน สลับช่วงเร่งรัดและคงตัว 2 รอบ')
  on conflict (name) do update
    set duration_days = excluded.duration_days,
        type = excluded.type,
        description = excluded.description;

  select id into pid_uplabs from programs where name = 'UP Labs 14D';
  select id into pid_full30  from programs where name = 'Full Course 30D';
  select id into pid_full60  from programs where name = 'Full Course 60D';

  -- ============================================================
  -- UP Labs 14D
  -- Phase 1: วันที่ 1-3 (Shake Reset — ล้างระบบ)
  -- ============================================================
  insert into program_days (
    program_id, day_number,
    meal_morning, meal_afternoon, meal_evening, supplement,
    trick_morning, trick_afternoon, trick_evening,
    content_keyword, content_theme
  ) values

  (pid_uplabs, 1,
   'โปรตีนเชค: Bodykey ครึ่งซอง + โปรตีน 2-3 ช้อน ผสมน้ำ ดื่มเวลาไหนก็ได้ หิวเมื่อไรดื่มได้เลย',
   'ถ้าหิวจริงๆ: ผักใบเขียว + เต้าหู้ ได้เลยครับ | ถ้าไม่หิวไม่ต้องทาน',
   'โปรตีนเชค: Bodykey ครึ่งซอง + โปรตีน 2-3 ช้อน (รวมทั้งวัน 4 มื้อ หิวเมื่อไรดื่มได้)',
   'อาหารเสริมตามที่มีทานได้เลย | ดื่มน้ำเปล่าเยอะๆ + เดินวันละ 1 ชม.',
   'งดน้ำหวาน ชา กาแฟ ผลไม้ทั้งหมด ดื่มน้ำเปล่าอย่างเดียว | วันแรกอาจอยากอาหาร ทานเชคเพิ่มได้เลย',
   'ยังหิวอยู่? ทานเชคเพิ่มได้เลยครับ หรือเสริม ผักใบเขียว + เต้าหู้',
   'ร่างกายกำลัง reset วันแรกสำคัญมาก อดทนได้ครับ พรุ่งนี้จะดีขึ้น',
   'Day 1 เริ่มต้น Reset ร่างกาย', 'motivation'),

  (pid_uplabs, 2,
   'โปรตีนเชค: Bodykey ครึ่งซอง + โปรตีน 2-3 ช้อน',
   'ถ้าหิวจริงๆ: ผักใบเขียว + เต้าหู้ | ไม่หิวไม่ต้องทาน',
   'โปรตีนเชค: Bodykey ครึ่งซอง + โปรตีน 2-3 ช้อน (รวม 4 มื้อทั้งวัน)',
   'อาหารเสริมตามที่มี | ดื่มน้ำเปล่า 2-3 ลิตร + เดิน 1 ชม.',
   'ร่างกายกำลังปรับตัว ดื่มน้ำเปล่าเยอะๆ ช่วยลดความหิวได้ดีมาก',
   'ผักใบเขียว + เต้าหู้ คือเพื่อนที่ดีที่สุดของวันนี้ ถ้าหิวมากทานเลย',
   'งดขนม น้ำหวาน และของว่างทุกอย่าง ดื่มน้ำเปล่าแทนได้เลย',
   'Day 2 ร่างกายเริ่มปรับตัว', 'education'),

  (pid_uplabs, 3,
   'โปรตีนเชค: Bodykey ครึ่งซอง + โปรตีน 2-3 ช้อน',
   'ถ้าหิวจริงๆ: ผักใบเขียว + เต้าหู้ | ไม่หิวไม่ต้องทาน',
   'โปรตีนเชค: Bodykey ครึ่งซอง + โปรตีน 2-3 ช้อน',
   'อาหารเสริมตามที่มี | ดื่มน้ำเปล่าเยอะๆ + เดิน 1 ชม.',
   'วันที่ 3-4 อาจปวดหัวหน่วงๆ นิดๆ = Ketone กำลังขึ้น! นี่คือสัญญาณที่ดี อดทนได้ครับ แค่วันเดียวผ่าน',
   'ปวดหัว = ร่างกายกำลัง switch ไปใช้ไขมันสะสม หลังจากนี้จะเผาไขมันเพลินเลย',
   'คนผอมอาจปวดหัวหรือนอนกระสับกระส่ายได้ตั้งแต่วันที่ 2 เป็นเรื่องปกติ อดทนได้เลย',
   'Day 3 Ketone กำลัง Switch ร่างกายใกล้เผาไขมัน', 'education'),

  -- Phase 2: วันที่ 4-7 (Low Carb + เริ่ม IF)
  (pid_uplabs, 4,
   'โปรตีนเชค: Bodykey ครึ่งซอง + โปรตีน 2-3 ช้อน',
   'Low Carb: ผักใบเขียว + ปลานึ่ง หรือ อกไก่ต้ม/ย่าง หรือ ไข่ต้ม (ไม่มีข้าว)',
   'เชค 1 แก้ว หรือ ผักใบเขียว + เต้าหู้ (No Carb มื้อเย็น งดข้าวแป้งทุกชนิด)',
   'Probiotics + Omega-3 ทานตอนท้องว่าง',
   'พยายามทานให้อยู่ในช่วง 8-10 ชม. กลางวัน ไม่มีมื้อดึก',
   'กลางวัน Low Carb: ปลานึ่ง อกไก่ ไข่ต้ม + ผักใบเขียว ไม่ต้องมีข้าวก็อิ่มได้',
   'เย็น No Carb: ทานเชคหรือผัก+เต้าหู้เท่านั้น งดข้าว แป้ง ทุกชนิด',
   'Day 4 เข้าสู่ Low Carb เต็มตัว', 'motivation'),

  (pid_uplabs, 5,
   'โปรตีนเชค: Bodykey ครึ่งซอง + โปรตีน 2-3 ช้อน',
   'Low Carb: ผักใบเขียว + ปลานึ่ง หรือ อกไก่ หรือ ไข่ต้ม',
   'เชค หรือ ผักใบเขียว + เต้าหู้ (No Carb)',
   'Probiotics + Omega-3 ตอนท้องว่าง',
   'ทานให้จบภายใน 8-10 ชม. กลางวัน เตรียมพร้อมสำหรับ IF 24 ชม. ที่จะทำในสัปดาห์นี้',
   'เลือกร้านใกล้บ้าน/ที่ทำงาน สั่งปลานึ่ง อกไก่ ผักต้ม ง่ายและไม่แพง',
   'ดื่มน้ำเยอะๆ ช่วยให้อิ่มและเร่งการเผาผลาญ',
   'Day 5 ร่างกายเคยชิน Low Carb แล้ว', 'motivation'),

  (pid_uplabs, 6,
   'โปรตีนเชค: Bodykey ครึ่งซอง + โปรตีน 2-3 ช้อน',
   'Low Carb: ผักใบเขียว + ปลานึ่ง หรือ อกไก่ หรือ ไข่ต้ม',
   'เชค หรือ ผักใบเขียว + เต้าหู้ (No Carb)',
   'Probiotics + Omega-3 ตอนท้องว่าง',
   'วันนี้หรือพรุ่งนี้ ลอง IF 24 ชม. ได้เลยครับ เลือกวันที่สะดวกที่สุด',
   'IF 24 ชม. = ทานมื้อสุดท้ายแล้วรอถึงเวลาเดิมวันพรุ่งนี้ ดื่มน้ำ กาแฟดำ ชาไม่หวานได้',
   'ถ้าเลือก IF 24 วันนี้: ทานมื้อเย็นแล้วหยุดเลย มื้อต่อไปพรุ่งนี้เวลาเดิม',
   'Day 6 เตรียม IF 24 ชม. ครั้งแรก', 'challenge'),

  (pid_uplabs, 7,
   'โปรตีนเชค: Bodykey ครึ่งซอง + โปรตีน 2-3 ช้อน',
   'Low Carb: ผักใบเขียว + ปลานึ่ง หรือ อกไก่ หรือ ไข่ต้ม',
   'เชค หรือ ผักใบเขียว + เต้าหู้ (No Carb)',
   'Probiotics + Omega-3 ตอนท้องว่าง',
   'ครบ 1 สัปดาห์! ชั่งน้ำหนักตอนเช้า (ก่อนกิน) และจดไว้',
   'สัปดาห์หน้าจะยืดหยุ่นขึ้น: กลางวัน+เย็น Low Carb ทั้งคู่ ไม่ No Carb แบบเดิม สนุกขึ้นแน่นอน',
   'ถ้ายังไม่ได้ทำ IF 24: สัปดาห์หน้าลองเลย เลือกวันที่ว่างและไม่มีนัดสำคัญ',
   'Day 7 ครบ 1 สัปดาห์ ชั่งน้ำหนัก!', 'checkin'),

  -- Phase 3: วันที่ 8-14 (Fat Adaptation + IF 16/8)
  (pid_uplabs, 8,
   'โปรตีนเชค: Bodykey ครึ่งซอง + โปรตีน 2-3 ช้อน',
   'Low Carb: แป้งน้อยมากๆ เน้นผักและโปรตีนเป็นหลัก',
   'Low Carb: แป้งน้อยมาก (ต่างจากสัปดาห์แรกที่ No Carb) ยืดหยุ่นขึ้น!',
   'อาหารเสริมตามที่มี',
   'เริ่ม IF 16/8: ทานให้จบภายใน 8 ชม. เช่น 10:00-18:00 หรือ 11:00-19:00',
   'Carb ทั้งวันไม่เกิน 50-70g เพื่อ Fat Adaptation เต็มรูปแบบ หรือต่ำกว่า 100g รักษา Low Carb State',
   'IF 24 ชม. ให้ได้ 2 วัน/สัปดาห์ เลือกวันที่ไม่ออกกำลังกายหนัก',
   'Day 8 Fat Adaptation + IF 16/8 เริ่ม', 'education'),

  (pid_uplabs, 9,
   'โปรตีนเชค: Bodykey ครึ่งซอง + โปรตีน 2-3 ช้อน',
   'Low Carb: แป้งน้อยมาก ผักและโปรตีนเป็นหลัก',
   'Low Carb: แป้งน้อยมาก ยืดหยุ่นได้บ้าง',
   'อาหารเสริมตามที่มี',
   'IF 16/8: ดื่มน้ำ กาแฟดำ ชาไม่หวานได้ระหว่าง fasting window',
   'Carb ทั้งวันพยายามต่ำกว่า 100g รักษา Low Carb State ให้ดี',
   'ออกกำลังกายได้ตามชอบ แต่วัน IF 24 ไม่ออกหนักนะครับ',
   'Day 9 ร่างกายกำลังชำนาญเผาผลาญไขมัน', 'motivation'),

  (pid_uplabs, 10,
   'โปรตีนเชค: Bodykey ครึ่งซอง + โปรตีน 2-3 ช้อน',
   'Low Carb: แป้งน้อยมาก ผักและโปรตีนเป็นหลัก',
   'Low Carb: แป้งน้อยมาก',
   'อาหารเสริมตามที่มี',
   'IF 16/8 วันนี้: ตื่นมา skip อาหารเช้า เริ่มทานมื้อแรก 10-11 โมงครับ',
   'Carb 50-70g: ถ้า Fat Adaptation ดีแล้วจะรู้สึกพลังงานสม่ำเสมอตลอดวัน',
   'IF 24 ชม. ครั้งที่ 2 สัปดาห์นี้: เลือกวันที่งาน/ธุระน้อย จะผ่านได้ง่ายกว่า',
   'Day 10 Fat Adaptation กำลังดีเต็มที่', 'motivation'),

  (pid_uplabs, 11,
   'โปรตีนเชค: Bodykey ครึ่งซอง + โปรตีน 2-3 ช้อน',
   'Low Carb: แป้งน้อยมาก ผักและโปรตีนเป็นหลัก',
   'Low Carb: แป้งน้อยมาก',
   'อาหารเสริมตามที่มี',
   'IF 16/8 ดื่มน้ำ กาแฟดำ ชาไม่หวานได้ระหว่าง fasting window',
   'ถ้าทำ IF 24 วันนี้: ทานมื้อสุดท้ายแล้วรอจนถึงพรุ่งนี้เวลาเดิม ดื่มน้ำได้เต็มที่',
   'รู้สึกดีขึ้นแล้วใช่ไหม? ร่างกายกำลังเผาผลาญไขมันสะสมอยู่ตลอดเวลา',
   'Day 11 กำลังดี เหลืออีก 3 วัน!', 'motivation'),

  (pid_uplabs, 12,
   'โปรตีนเชค: Bodykey ครึ่งซอง + โปรตีน 2-3 ช้อน',
   'Low Carb: แป้งน้อยมาก ผักและโปรตีนเป็นหลัก',
   'Low Carb: แป้งน้อยมาก',
   'อาหารเสริมตามที่มี',
   'IF 16/8 เป็นนิสัยที่ดีมาก ถ้ายังไม่ได้ทำ IF 24 ครบ 2 ครั้ง สัปดาห์นี้ยังทันครับ',
   'Carb ทั้งวันไม่เกิน 50-70g วันนี้พยายามให้ถึง goal นะครับ',
   'เหลือ 2 วันสุดท้าย รักษาวินัยให้ครบ ผลลัพธ์จะคุ้มมาก',
   'Day 12 เหลือน้อยแล้ว keep going!', 'challenge'),

  (pid_uplabs, 13,
   'โปรตีนเชค: Bodykey ครึ่งซอง + โปรตีน 2-3 ช้อน',
   'Low Carb: แป้งน้อยมาก ผักและโปรตีนเป็นหลัก',
   'Low Carb: แป้งน้อยมาก',
   'อาหารเสริมตามที่มี',
   'IF 16/8 วันสุดท้ายก่อน finale! พรุ่งนี้ชั่งน้ำหนักตอนเช้า เตรียมถ่ายรูป After ด้วยนะครับ',
   'Low Carb เต็มรูปแบบ ทำดีมากมาทั้ง 13 วัน อีกวันเดียวเท่านั้น!',
   'เตรียมถ่ายรูป Before/After พรุ่งนี้หลังชั่งน้ำหนัก บันทึก progress ของคุณ',
   'Day 13 เกือบถึงแล้ว!', 'challenge'),

  (pid_uplabs, 14,
   'โปรตีนเชค: Bodykey ครึ่งซอง + โปรตีน 2-3 ช้อน',
   'Low Carb ฉลองวันสุดท้าย: เลือกมื้อโปรตีนที่ชอบ Low Carb แบบอร่อยๆ',
   'Low Carb ฉลองการทำ 14 วัน ครบถ้วน',
   'อาหารเสริมตามที่มี',
   'วันนี้ชั่งน้ำหนักตอนเช้า ถ่ายรูปหน้าตรง/ด้านข้าง ส่งให้โค้ชดูด้วยนะครับ!',
   'สำเร็จ UP Labs 14D แล้ว! ต่อไปวางแผน Maintenance หรือต่อ Full Course ได้เลย',
   'รีวิวสิ่งที่เปลี่ยนไปใน 14 วัน: น้ำหนัก พลังงาน การนอน ความรู้สึกโดยรวม',
   'Day 14 UP Labs 14D Complete! ยินดีด้วยครับ', 'checkin')

  on conflict (program_id, day_number) do update
    set meal_morning=excluded.meal_morning, meal_afternoon=excluded.meal_afternoon,
        meal_evening=excluded.meal_evening, supplement=excluded.supplement,
        trick_morning=excluded.trick_morning, trick_afternoon=excluded.trick_afternoon,
        trick_evening=excluded.trick_evening, content_keyword=excluded.content_keyword,
        content_theme=excluded.content_theme, updated_at=now();

  -- ============================================================
  -- Full Course 30D
  -- Phase Intensive: วันที่ 1-14
  -- ============================================================
  insert into program_days (
    program_id, day_number,
    meal_morning, meal_afternoon, meal_evening, supplement,
    trick_morning, trick_afternoon, trick_evening,
    content_keyword, content_theme
  ) values

  (pid_full30, 1,
   'BodyKey + All Plant 1 ช้อน + โปรตีนชาเขียว หรือ ช็อกโกแลต 1 ช้อน (ห้ามโปรตีนเบอร์รี่)',
   'อาหารปกติ สัดส่วน 2:1:1: ผักครึ่งจาน + ข้าว 1 ทัพพี + โปรตีน 1 ส่วน ~350-450 Kcal',
   'BodyKey + All Plant 2 ช้อน (ตัดน้ำตาลให้มากที่สุด)',
   'Fiber Blend เคี้ยว 2 เม็ดก่อนมื้อ + น้ำ 300cc | วิตามินตามคอร์สทานพร้อมเชคหรืออาหาร',
   'วันแรก! Download BodyKey App | ถ่ายรูปอาหารกลางวันส่งให้โค้ชช่วยคำนวนสัดส่วน',
   'สัดส่วน 2:1:1: ผักครึ่งจาน ข้าว 1 ทัพพี โปรตีน 1 ส่วน เน้นต้ม ตุ๋น นึ่ง อบ เลี่ยงหวาน มัน เค็ม',
   'ห้ามทานผลไม้ทุกชนิด | ไม่มีมื้อแทรก: เครื่องดื่มหวาน ลูกอม หมากฝรั่ง = มื้อแทรกทั้งหมด',
   'Day 1 เริ่มต้น Full Course Intensive Phase', 'motivation'),

  (pid_full30, 2,
   'BodyKey + All Plant 1 ช้อน + โปรตีนชาเขียว หรือ ช็อกโกแลต 1 ช้อน',
   'อาหารปกติ สัดส่วน 2:1:1 ~350-450 Kcal เลือกร้านใกล้บ้านหรือที่ทำงานได้เลย ไม่ต้องสั่งอาหารคลีนพิเศษ',
   'BodyKey + All Plant 2 ช้อน',
   'Fiber Blend 2 เม็ดก่อนมื้อ + น้ำ 300cc | วิตามินตามคอร์ส',
   'จิบน้ำทั้งวัน ยิ่งเป็นน้ำแร่หรือน้ำ eSpring ได้ยิ่งดี',
   'เลือกทานร้านใกล้บ้าน/ทำงานได้เลย ไม่ต้องสั่งอาหารคลีนมาพิเศษ ถ่ายรูปส่งมาให้โค้ชดูได้',
   'นอนก่อนเที่ยงคืน 6-7 ชม. ช่วยปรับสมดุล Hormone ได้เร็ว',
   'Day 2 Full Course สัดส่วน 2:1:1', 'education'),

  (pid_full30, 3,
   'BodyKey + All Plant 1 ช้อน + โปรตีนชาเขียว หรือ ช็อกโกแลต 1 ช้อน',
   'อาหารปกติ 2:1:1 | Balance Calories ~350-450 Kcal/มื้อ',
   'BodyKey + All Plant 2 ช้อน',
   'Fiber Blend 2 เม็ดก่อนมื้อ + น้ำ 300cc | วิตามินตามคอร์ส',
   'เดิน 10,000 ก้าว เน้นเดินก่อน 18:00 น. หลัง 18:00 พยายามพักกิจกรรมต่างๆ',
   'โปรตีน 45% | ไขมัน <25% | คาร์บ 30% ถ้าคำนวนได้ละเอียด ถ้าไม่เป๊ะไม่ต้องกังวล',
   'งดผลไม้ทุกชนิด | ไม่มีมื้อแทรก | นอนเร็วก่อนเที่ยงคืน',
   'Day 3 จังหวะ เดิน + นอน คือ key', 'education'),

  (pid_full30, 4,
   'BodyKey + All Plant 1 ช้อน + โปรตีนชาเขียว หรือ ช็อกโกแลต 1 ช้อน',
   'อาหารปกติ 2:1:1 ~350-450 Kcal',
   'BodyKey + All Plant 2 ช้อน',
   'Fiber Blend 2 เม็ดก่อนมื้อ + น้ำ 300cc | วิตามินตามคอร์ส',
   'ถ้ามีตารางออกกำลังกาย แจ้งโค้ชด้วยนะคะ เพราะมีผลต่อการลดน้ำหนัก',
   'ถ่ายรูปอาหารส่งมาให้คำนวน หรือใช้ BodyKey App บันทึกเองได้เลย',
   'งดผลไม้ ไม่มีมื้อแทรก น้ำหวานซักเดียวที่อยู่นอกมื้อ = มื้อแทรก',
   'Day 4 Intensive กำลังดี', 'motivation'),

  (pid_full30, 5,
   'BodyKey + All Plant 1 ช้อน + โปรตีนชาเขียว หรือ ช็อกโกแลต 1 ช้อน',
   'อาหารปกติ 2:1:1 ~350-450 Kcal',
   'BodyKey + All Plant 2 ช้อน',
   'Fiber Blend 2 เม็ดก่อนมื้อ + น้ำ 300cc | วิตามินตามคอร์ส',
   'จิบน้ำทั้งวัน ดื่มน้ำเยอะๆ โดยเฉพาะน้ำแร่หรือน้ำ eSpring',
   'เน้นต้ม ตุ๋น นึ่ง อบ ถ้าทำอาหารเองได้จะควบคุมได้ดีที่สุด',
   'เดิน 10,000 ก้าว ก่อน 18:00 น.',
   'Day 5 ร่างกายกำลังปรับสัดส่วน', 'motivation'),

  (pid_full30, 6,
   'BodyKey + All Plant 1 ช้อน + โปรตีนชาเขียว หรือ ช็อกโกแลต 1 ช้อน',
   'อาหารปกติ 2:1:1 ~350-450 Kcal',
   'BodyKey + All Plant 2 ช้อน',
   'Fiber Blend 2 เม็ดก่อนมื้อ + น้ำ 300cc | วิตามินตามคอร์ส',
   'ครบ 1 สัปดาห์วันพรุ่งนี้! เตรียมชั่งน้ำหนักตอนเช้าและถ่ายรูปส่งโค้ชได้เลย',
   'ถ่ายรูปอาหารทุกมื้อช่วยให้เห็นพฤติกรรมตัวเอง และปรับได้ง่ายขึ้น',
   'งดผลไม้ | ไม่มีมื้อแทรก | นอนก่อนเที่ยงคืน',
   'Day 6 ใกล้ครบสัปดาห์แรก', 'motivation'),

  (pid_full30, 7,
   'BodyKey + All Plant 1 ช้อน + โปรตีนชาเขียว หรือ ช็อกโกแลต 1 ช้อน',
   'อาหารปกติ 2:1:1 ~350-450 Kcal',
   'BodyKey + All Plant 2 ช้อน',
   'Fiber Blend 2 เม็ดก่อนมื้อ + น้ำ 300cc | วิตามินตามคอร์ส',
   'ชั่งน้ำหนักตอนเช้า ถ่ายรูปส่งโค้ช บันทึกผล 1 สัปดาห์',
   'ดูผลสัปดาห์แรก: น้ำหนัก การนอน พลังงาน ความรู้สึกทั่วไป ทุกอย่างดีขึ้นไหม?',
   'งดผลไม้ ไม่มีมื้อแทรก เดิน 10,000 ก้าว',
   'Day 7 ครบ 1 สัปดาห์ ชั่งน้ำหนัก!', 'checkin'),

  (pid_full30, 8,
   'BodyKey + All Plant 1 ช้อน + โปรตีนชาเขียว หรือ ช็อกโกแลต 1 ช้อน',
   'อาหารปกติ 2:1:1 ~350-450 Kcal',
   'BodyKey + All Plant 2 ช้อน',
   'Fiber Blend 2 เม็ดก่อนมื้อ + น้ำ 300cc | วิตามินตามคอร์ส',
   'สัปดาห์ที่ 2 ร่างกายเริ่มปรับตัวได้ดีแล้ว รักษา routine เดิมต่อไป',
   'ถ้าน้ำหนักหยุดลง (plateau) ให้เพิ่มการเดิน หรือลดแป้งในมื้อกลางวันลงอีก',
   'งดผลไม้ ไม่มีมื้อแทรก นอนก่อนเที่ยงคืน',
   'Day 8 สัปดาห์ 2 เริ่มแล้ว', 'motivation'),

  (pid_full30, 9,
   'BodyKey + All Plant 1 ช้อน + โปรตีนชาเขียว หรือ ช็อกโกแลต 1 ช้อน',
   'อาหารปกติ 2:1:1 ~350-450 Kcal',
   'BodyKey + All Plant 2 ช้อน',
   'Fiber Blend 2 เม็ดก่อนมื้อ + น้ำ 300cc | วิตามินตามคอร์ส',
   'จิบน้ำทั้งวัน เดิน 10,000 ก้าว ก่อน 18:00 น.',
   'Balance Calories ~350-450 Kcal/มื้อ ไม่ต้องเป๊ะ แต่พยายามอย่าเกิน',
   'นอนก่อนเที่ยงคืน 6-7 ชม. ช่วย Hormone ได้มาก',
   'Day 9 Intensive กำลังดำเนินต่อ', 'motivation'),

  (pid_full30, 10,
   'BodyKey + All Plant 1 ช้อน + โปรตีนชาเขียว หรือ ช็อกโกแลต 1 ช้อน',
   'อาหารปกติ 2:1:1 ~350-450 Kcal',
   'BodyKey + All Plant 2 ช้อน',
   'Fiber Blend 2 เม็ดก่อนมื้อ + น้ำ 300cc | วิตามินตามคอร์ส',
   'เหลืออีก 4 วัน ของ Intensive Phase รักษาวินัยให้ครบ',
   'ถ่ายรูปอาหารส่งมาให้โค้ชดู ช่วยปรับ feedback ได้ตรงจุด',
   'งดผลไม้ ไม่มีมื้อแทรก เดิน 10,000 ก้าว',
   'Day 10 เหลืออีก 4 วัน Intensive', 'motivation'),

  (pid_full30, 11,
   'BodyKey + All Plant 1 ช้อน + โปรตีนชาเขียว หรือ ช็อกโกแลต 1 ช้อน',
   'อาหารปกติ 2:1:1 ~350-450 Kcal',
   'BodyKey + All Plant 2 ช้อน',
   'Fiber Blend 2 เม็ดก่อนมื้อ + น้ำ 300cc | วิตามินตามคอร์ส',
   'จิบน้ำทั้งวัน เดิน 10,000 ก้าว ก่อน 18:00 น.',
   'โปรตีนเพียงพอช่วยรักษากล้ามเนื้อและทำให้รู้สึกอิ่มนาน',
   'นอนเร็ว พักผ่อนให้ครบ ร่างกายซ่อมแซมตอนนอนหลับ',
   'Day 11 ใกล้จบ Intensive สู้ๆ!', 'motivation'),

  (pid_full30, 12,
   'BodyKey + All Plant 1 ช้อน + โปรตีนชาเขียว หรือ ช็อกโกแลต 1 ช้อน',
   'อาหารปกติ 2:1:1 ~350-450 Kcal',
   'BodyKey + All Plant 2 ช้อน',
   'Fiber Blend 2 เม็ดก่อนมื้อ + น้ำ 300cc | วิตามินตามคอร์ส',
   'เหลือ 2 วันสุดท้ายของ Intensive Phase! รักษาวินัยให้ครบ',
   'ถ่ายรูปอาหารส่งโค้ช โดยเฉพาะมื้อกลางวันที่ควบคุมสัดส่วน',
   'งดผลไม้ ไม่มีมื้อแทรก นอนก่อนเที่ยงคืน',
   'Day 12 เหลือน้อยแล้ว!', 'challenge'),

  (pid_full30, 13,
   'BodyKey + All Plant 1 ช้อน + โปรตีนชาเขียว หรือ ช็อกโกแลต 1 ช้อน',
   'อาหารปกติ 2:1:1 ~350-450 Kcal',
   'BodyKey + All Plant 2 ช้อน',
   'Fiber Blend 2 เม็ดก่อนมื้อ + น้ำ 300cc | วิตามินตามคอร์ส',
   'พรุ่งนี้ชั่งน้ำหนัก เตรียมถ่ายรูปส่งโค้ช ครบ 2 สัปดาห์ Intensive!',
   'Balance Calories 350-450 Kcal/มื้อ รักษา momentum ให้ถึงวันพรุ่งนี้',
   'งดผลไม้ ไม่มีมื้อแทรก เดิน 10,000 ก้าว',
   'Day 13 พรุ่งนี้จบ Intensive!', 'challenge'),

  (pid_full30, 14,
   'BodyKey + All Plant 1 ช้อน + โปรตีนชาเขียว หรือ ช็อกโกแลต 1 ช้อน',
   'อาหารปกติ 2:1:1 ~350-450 Kcal',
   'BodyKey + All Plant 2 ช้อน',
   'Fiber Blend 2 เม็ดก่อนมื้อ + น้ำ 300cc | วิตามินตามคอร์ส',
   'ชั่งน้ำหนักตอนเช้า ถ่ายรูปส่งโค้ช! ครบ 14 วัน Intensive แล้ว!',
   'วันพรุ่งนี้เริ่ม Stabilize Phase: เช้า-กลางวันอาหารปกติ เย็นยังเชคเหมือนเดิม',
   'Intensive Phase สำเร็จ! พรุ่งนี้เข้าสู่ Stabilize Phase ยืดหยุ่นขึ้นมาก',
   'Day 14 จบ Intensive Phase ยินดีด้วย!', 'checkin'),

  -- Phase Stabilize: วันที่ 15-30
  (pid_full30, 15,
   'อาหารปกติแบบควบคุมปริมาณและสัดส่วน 2:1:1 ~350-450 Kcal',
   'อาหารปกติแบบควบคุมปริมาณและสัดส่วน 2:1:1 ~350-450 Kcal',
   'BodyKey + All Plant 2 ช้อน',
   'Fiber Blend 2 เม็ดก่อนมื้อ + น้ำ 300cc | วิตามินตามคอร์ส',
   'เข้าสู่ Stabilize Phase แล้ว! เช้า-กลางวันทานอาหารปกติ ยังควบคุมสัดส่วนนะคะ',
   'ยังใช้ 2:1:1 เหมือนเดิม เลือกร้านได้เสรีขึ้น แต่รักษา Balance Calories',
   'เย็นยังทานเชคเหมือนเดิม ตัดน้ำตาลให้มากที่สุด',
   'Day 15 Stabilize Phase เริ่ม', 'motivation'),

  (pid_full30, 16,
   'อาหารปกติ 2:1:1 ~350-450 Kcal',
   'อาหารปกติ 2:1:1 ~350-450 Kcal',
   'BodyKey + All Plant 2 ช้อน',
   'Fiber Blend 2 เม็ดก่อนมื้อ + น้ำ 300cc | วิตามินตามคอร์ส',
   'เดิน 10,000 ก้าว ก่อน 18:00 น. ออกกำลังกายได้ตามชอบ',
   'ถ้ามีตารางออกกำลังกาย แจ้งโค้ชด้วยนะคะ',
   'นอนก่อนเที่ยงคืน 6-7 ชม.',
   'Day 16 Stabilize คงตัว', 'motivation'),

  (pid_full30, 17,
   'อาหารปกติ 2:1:1 ~350-450 Kcal',
   'อาหารปกติ 2:1:1 ~350-450 Kcal',
   'BodyKey + All Plant 2 ช้อน',
   'Fiber Blend 2 เม็ดก่อนมื้อ + น้ำ 300cc | วิตามินตามคอร์ส',
   'จิบน้ำทั้งวัน เดิน 10,000 ก้าว',
   'เลือกทานอาหารจากร้านใกล้บ้าน/ทำงานได้เลย ไม่ต้องสั่งอาหารคลีนพิเศษ',
   'งดผลไม้ ไม่มีมื้อแทรก',
   'Day 17 รักษา Momentum', 'motivation'),

  (pid_full30, 18,
   'อาหารปกติ 2:1:1 ~350-450 Kcal',
   'อาหารปกติ 2:1:1 ~350-450 Kcal',
   'BodyKey + All Plant 2 ช้อน',
   'Fiber Blend 2 เม็ดก่อนมื้อ + น้ำ 300cc | วิตามินตามคอร์ส',
   'ชั่งน้ำหนักได้เลย บันทึกผลเพื่อ track progress',
   'Balance Calories ~350-450 Kcal/มื้อ รักษาสัดส่วน',
   'นอนก่อนเที่ยงคืน 6-7 ชม.',
   'Day 18 Stabilize กำลังดี', 'checkin'),

  (pid_full30, 19,
   'อาหารปกติ 2:1:1 ~350-450 Kcal',
   'อาหารปกติ 2:1:1 ~350-450 Kcal',
   'BodyKey + All Plant 2 ช้อน',
   'Fiber Blend 2 เม็ดก่อนมื้อ + น้ำ 300cc | วิตามินตามคอร์ส',
   'เดิน 10,000 ก้าว ก่อน 18:00 น.',
   'โปรตีนเพียงพอช่วยรักษากล้ามเนื้อ ลดไขมันได้ดีกว่า',
   'งดผลไม้ ไม่มีมื้อแทรก',
   'Day 19 Stabilize ต่อเนื่อง', 'motivation'),

  (pid_full30, 20,
   'อาหารปกติ 2:1:1 ~350-450 Kcal',
   'อาหารปกติ 2:1:1 ~350-450 Kcal',
   'BodyKey + All Plant 2 ช้อน',
   'Fiber Blend 2 เม็ดก่อนมื้อ + น้ำ 300cc | วิตามินตามคอร์ส',
   'เหลืออีก 10 วัน ทำดีมากมาถึง Day 20!',
   'ถ่ายรูปอาหารส่งโค้ช บอกความรู้สึกโดยรวมตอนนี้ด้วยนะคะ',
   'นอนก่อนเที่ยงคืน เดิน 10,000 ก้าว',
   'Day 20 ครึ่งทาง Stabilize', 'checkin'),

  (pid_full30, 21,
   'อาหารปกติ 2:1:1 ~350-450 Kcal',
   'อาหารปกติ 2:1:1 ~350-450 Kcal',
   'BodyKey + All Plant 2 ช้อน',
   'Fiber Blend 2 เม็ดก่อนมื้อ + น้ำ 300cc | วิตามินตามคอร์ส',
   'ชั่งน้ำหนัก 3 สัปดาห์ครบ! บันทึกผลและส่งโค้ช',
   'รีวิว 3 สัปดาห์: น้ำหนัก พลังงาน การนอน ความรู้สึก เปลี่ยนไปมากไหม?',
   'งดผลไม้ ไม่มีมื้อแทรก',
   'Day 21 ครบ 3 สัปดาห์!', 'checkin'),

  (pid_full30, 22,
   'อาหารปกติ 2:1:1 ~350-450 Kcal',
   'อาหารปกติ 2:1:1 ~350-450 Kcal',
   'BodyKey + All Plant 2 ช้อน',
   'Fiber Blend 2 เม็ดก่อนมื้อ + น้ำ 300cc | วิตามินตามคอร์ส',
   'เดิน 10,000 ก้าว จิบน้ำทั้งวัน',
   'Balance Calories รักษาสัดส่วน 2:1:1',
   'นอนก่อนเที่ยงคืน',
   'Day 22 Stabilize ต่อเนื่อง', 'motivation'),

  (pid_full30, 23,
   'อาหารปกติ 2:1:1 ~350-450 Kcal',
   'อาหารปกติ 2:1:1 ~350-450 Kcal',
   'BodyKey + All Plant 2 ช้อน',
   'Fiber Blend 2 เม็ดก่อนมื้อ + น้ำ 300cc | วิตามินตามคอร์ส',
   'เหลืออีก 7 วัน จบ Full Course 30D แล้ว!',
   'ถ่ายรูปอาหารส่งโค้ช',
   'งดผลไม้ ไม่มีมื้อแทรก เดิน 10,000 ก้าว',
   'Day 23 เหลืออีก 7 วัน', 'motivation'),

  (pid_full30, 24,
   'อาหารปกติ 2:1:1 ~350-450 Kcal',
   'อาหารปกติ 2:1:1 ~350-450 Kcal',
   'BodyKey + All Plant 2 ช้อน',
   'Fiber Blend 2 เม็ดก่อนมื้อ + น้ำ 300cc | วิตามินตามคอร์ส',
   'จิบน้ำทั้งวัน เดิน 10,000 ก้าว ก่อน 18:00 น.',
   'Balance Calories ~350-450 Kcal/มื้อ',
   'นอนก่อนเที่ยงคืน 6-7 ชม.',
   'Day 24 เข้มแข็งต่อไป', 'motivation'),

  (pid_full30, 25,
   'อาหารปกติ 2:1:1 ~350-450 Kcal',
   'อาหารปกติ 2:1:1 ~350-450 Kcal',
   'BodyKey + All Plant 2 ช้อน',
   'Fiber Blend 2 เม็ดก่อนมื้อ + น้ำ 300cc | วิตามินตามคอร์ส',
   'เหลืออีก 5 วัน! รักษา routine เดิมให้ครบ',
   'ถ่ายรูปอาหารกลางวัน ดูสัดส่วนตัวเองว่า 2:1:1 ครบไหม',
   'งดผลไม้ ไม่มีมื้อแทรก',
   'Day 25 เหลือน้อยแล้ว!', 'challenge'),

  (pid_full30, 26,
   'อาหารปกติ 2:1:1 ~350-450 Kcal',
   'อาหารปกติ 2:1:1 ~350-450 Kcal',
   'BodyKey + All Plant 2 ช้อน',
   'Fiber Blend 2 เม็ดก่อนมื้อ + น้ำ 300cc | วิตามินตามคอร์ส',
   'เดิน 10,000 ก้าว จิบน้ำทั้งวัน',
   'Balance Calories รักษาสัดส่วน',
   'นอนก่อนเที่ยงคืน',
   'Day 26 ใกล้ Finish Line', 'motivation'),

  (pid_full30, 27,
   'อาหารปกติ 2:1:1 ~350-450 Kcal',
   'อาหารปกติ 2:1:1 ~350-450 Kcal',
   'BodyKey + All Plant 2 ช้อน',
   'Fiber Blend 2 เม็ดก่อนมื้อ + น้ำ 300cc | วิตามินตามคอร์ส',
   'เหลืออีก 3 วัน! เตรียม Final Check พรุ่งนี้หลังจบ',
   'ถ่ายรูปอาหาร ส่งโค้ช บอก progress',
   'งดผลไม้ ไม่มีมื้อแทรก',
   'Day 27 เหลืออีก 3 วัน!', 'challenge'),

  (pid_full30, 28,
   'อาหารปกติ 2:1:1 ~350-450 Kcal',
   'อาหารปกติ 2:1:1 ~350-450 Kcal',
   'BodyKey + All Plant 2 ช้อน',
   'Fiber Blend 2 เม็ดก่อนมื้อ + น้ำ 300cc | วิตามินตามคอร์ส',
   'เดิน 10,000 ก้าว จิบน้ำทั้งวัน นอนก่อนเที่ยงคืน',
   'Balance Calories รักษาสัดส่วน 2:1:1 อีก 2 วันสุดท้าย',
   'ไม่มีมื้อแทรก งดผลไม้',
   'Day 28 เหลืออีก 2 วัน!', 'challenge'),

  (pid_full30, 29,
   'อาหารปกติ 2:1:1 ~350-450 Kcal',
   'อาหารปกติ 2:1:1 ~350-450 Kcal',
   'BodyKey + All Plant 2 ช้อน',
   'Fiber Blend 2 เม็ดก่อนมื้อ + น้ำ 300cc | วิตามินตามคอร์ส',
   'พรุ่งนี้ชั่งน้ำหนักตอนเช้า เตรียมถ่ายรูป Final After ด้วย',
   'อีกวันเดียว! รักษาวินัยให้ครบ ผลที่ได้จะคุ้มมาก',
   'งดผลไม้ ไม่มีมื้อแทรก',
   'Day 29 วันสุดท้ายก่อน Finale!', 'challenge'),

  (pid_full30, 30,
   'อาหารปกติ 2:1:1 ~350-450 Kcal',
   'อาหารปกติ 2:1:1 ~350-450 Kcal ฉลองด้วยมื้อโปรดที่ Balance แล้ว',
   'BodyKey + All Plant 2 ช้อน ฉลองวันสุดท้าย',
   'Fiber Blend 2 เม็ดก่อนมื้อ + น้ำ 300cc | วิตามินตามคอร์ส',
   'ชั่งน้ำหนักตอนเช้า ถ่ายรูปหน้าตรง/ด้านข้าง ส่งโค้ช! Full Course 30D สำเร็จแล้ว!',
   'รีวิว 30 วัน: น้ำหนัก สัดส่วน พลังงาน การนอน ชีวิตเปลี่ยนไปแค่ไหน?',
   'วางแผน Maintenance Lifestyle ระยะยาว ต่อ Full Course 60D หรือ Maintenance',
   'Day 30 Full Course 30D Complete! ยินดีด้วยนะคะ', 'checkin')

  on conflict (program_id, day_number) do update
    set meal_morning=excluded.meal_morning, meal_afternoon=excluded.meal_afternoon,
        meal_evening=excluded.meal_evening, supplement=excluded.supplement,
        trick_morning=excluded.trick_morning, trick_afternoon=excluded.trick_afternoon,
        trick_evening=excluded.trick_evening, content_keyword=excluded.content_keyword,
        content_theme=excluded.content_theme, updated_at=now();

  -- ============================================================
  -- Full Course 60D
  -- Days 1-30: Clone จาก Full Course 30D
  -- Days 31-44: Intensive Round 2 (เหมือน 1-14 แต่ keyword ต่าง)
  -- Days 45-60: Stabilize Round 2 (เหมือน 15-30 แต่ keyword ต่าง)
  -- ============================================================

  -- Clone days 1-30 จาก 30D
  insert into program_days (
    program_id, day_number,
    meal_morning, meal_afternoon, meal_evening, supplement,
    trick_morning, trick_afternoon, trick_evening,
    content_keyword, content_theme
  )
  select
    pid_full60,
    day_number,
    meal_morning, meal_afternoon, meal_evening, supplement,
    trick_morning, trick_afternoon, trick_evening,
    content_keyword, content_theme
  from program_days
  where program_id = pid_full30
  on conflict (program_id, day_number) do nothing;

  -- Days 31-44: Intensive Round 2
  insert into program_days (
    program_id, day_number,
    meal_morning, meal_afternoon, meal_evening, supplement,
    trick_morning, trick_afternoon, trick_evening,
    content_keyword, content_theme
  )
  select
    pid_full60,
    day_number + 30,
    meal_morning, meal_afternoon, meal_evening, supplement,
    trick_morning,
    'รอบที่ 2 ของ Intensive Phase: ' || trick_afternoon,
    trick_evening,
    'Round 2 Intensive Day ' || day_number || ': ' || content_keyword,
    content_theme
  from program_days
  where program_id = pid_full30
    and day_number between 1 and 14
  on conflict (program_id, day_number) do nothing;

  -- Days 45-60: Stabilize Round 2
  insert into program_days (
    program_id, day_number,
    meal_morning, meal_afternoon, meal_evening, supplement,
    trick_morning, trick_afternoon, trick_evening,
    content_keyword, content_theme
  )
  select
    pid_full60,
    day_number + 30,
    meal_morning, meal_afternoon, meal_evening, supplement,
    trick_morning,
    'รอบที่ 2 ของ Stabilize Phase: ' || trick_afternoon,
    trick_evening,
    'Round 2 Stabilize Day ' || (day_number - 14) || ': ' || content_keyword,
    content_theme
  from program_days
  where program_id = pid_full30
    and day_number between 15 and 30
  on conflict (program_id, day_number) do nothing;

end $$;
