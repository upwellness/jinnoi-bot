export const DISC_COLORS = {
  D: 'hsl(352 78% 52%)',
  I: 'hsl(35 90% 48%)',
  S: 'hsl(150 60% 36%)',
  C: 'hsl(217 91% 55%)',
}

export const DISC_DARK = {
  D: 'hsl(352 78% 62%)',
  I: 'hsl(38 92% 60%)',
  S: 'hsl(150 60% 52%)',
  C: 'hsl(217 91% 65%)',
}

export const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [{ id: 'dashboard', icon: '◈', label: 'Dashboard' }],
  },
  {
    label: 'Groups',
    items: [
      { id: 'pending', icon: '⊕', label: 'Group Approvals', badgeKey: 'pendingGroups', tone: 'danger' },
      { id: 'groups', icon: '⬡', label: 'Active Groups', badgeKey: 'groups', tone: 'brand' },
    ],
  },
  {
    label: 'Content',
    items: [
      { id: 'drafts', icon: '✦', label: 'Trainer Drafts', badgeKey: 'pendingDrafts', tone: 'warning' },
      { id: 'knowledge', icon: '◎', label: 'Knowledge Base', badgeKey: 'knowledge', tone: 'info' },
    ],
  },
  {
    label: 'People',
    items: [{ id: 'members', icon: '◉', label: 'Members & DISC', badgeKey: 'members', tone: 'info' }],
  },
  {
    label: 'Programs',
    items: [{ id: 'programs', icon: '◷', label: 'Daily Programs', badgeKey: 'groupPrograms', tone: 'violet' }],
  },
]

export const PAGE_INFO = {
  dashboard: { title: 'Dashboard', subtitle: 'ภาพรวมระบบ LINE Knowledge Bot' },
  pending: { title: 'Group Approvals', subtitle: 'อนุมัติกลุ่มใหม่เข้าสู่ระบบ' },
  groups: { title: 'Active Groups', subtitle: 'กลุ่มที่ลงทะเบียนแล้ว' },
  drafts: { title: 'Trainer Drafts', subtitle: 'ความรู้รอการตรวจสอบ' },
  knowledge: { title: 'Knowledge Base', subtitle: 'ความรู้ที่ใช้ตอบลูกค้า' },
  members: { title: 'Members & DISC', subtitle: 'สมาชิกและบุคลิก DISC ของแต่ละคน' },
  programs: { title: 'Daily Programs', subtitle: 'คอร์สรายวันและกลุ่มที่กำลังทำ' },
}

export const PROGRAM_DAY_FIELDS = [
  { key: 'meal_morning', label: 'อาหารเช้า', icon: '🌅' },
  { key: 'meal_afternoon', label: 'อาหารกลางวัน', icon: '☀️' },
  { key: 'meal_evening', label: 'อาหารเย็น', icon: '🌙' },
  { key: 'supplement', label: 'ผลิตภัณฑ์เสริม', icon: '💊' },
  { key: 'trick_morning', label: 'เทคนิคเช้า', icon: '💡' },
  { key: 'trick_afternoon', label: 'เทคนิคเที่ยง', icon: '💡' },
  { key: 'trick_evening', label: 'เทคนิคเย็น', icon: '💡' },
  { key: 'content_keyword', label: 'Keyword วันนี้', icon: '🏷' },
]
