-- user_profiles: เก็บ nickname + DISC profile ของสมาชิกแต่ละคนในแต่ละกลุ่ม
create table if not exists user_profiles (
  id            uuid primary key default gen_random_uuid(),
  group_id      text not null,
  line_user_id  text not null,
  display_name  text not null default 'สมาชิก',  -- ชื่อจาก LINE API
  nickname      text not null default 'สมาชิก',  -- ชื่อที่ trainer ตั้งให้
  disc_d        int  not null default 0,
  disc_i        int  not null default 0,
  disc_s        int  not null default 0,
  disc_c        int  not null default 0,
  disc_type     text,                             -- 'D' | 'I' | 'S' | 'C' | null
  message_count int  not null default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique (group_id, line_user_id)
);

-- index สำหรับ lookup เร็ว
create index if not exists user_profiles_group_user on user_profiles (group_id, line_user_id);
