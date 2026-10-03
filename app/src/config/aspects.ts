// Label schema (spec §5). Must stay in sync with ml/schema.py.
export const ASPECTS = [
  'walk_trail',
  'coffee_picking',
  'processing_roasting',
  'tasting',
  'guide_communication',
  'host_hospitality',
  'food',
  'price_value',
  'scenery',
  'logistics_directions',
  'group_size_timing',
  'purchase_interest',
  'other',
] as const;
export type Aspect = (typeof ASPECTS)[number];

export const SENTIMENTS = ['positive', 'negative', 'mixed'] as const;
export type Sentiment = (typeof SENTIMENTS)[number];

export const GUEST_LANGS = ['en', 'zh', 'ko'] as const;
export type GuestLang = (typeof GUEST_LANGS)[number];
export type Lang = GuestLang | 'th';

export interface AspectInfo {
  /** Thai noun phrase used inside template sentences, e.g. "การชิมกาแฟ". */
  th: string;
  icon: string;
  /** Optional tour photo (public/tour/) for this aspect; photo ratings use TOUR_STEPS. */
  photo?: string;
}

export const ASPECT_INFO: Record<Aspect, AspectInfo> = {
  walk_trail: { th: 'การเดินชมสวน', icon: '🥾', photo: '/tour/walk.svg' },
  coffee_picking: { th: 'การเก็บเมล็ดกาแฟ', icon: '🍒', photo: '/tour/picking.svg' },
  processing_roasting: { th: 'การแปรรูปและคั่วกาแฟ', icon: '🔥', photo: '/tour/processing.svg' },
  tasting: { th: 'การชิมกาแฟ', icon: '☕', photo: '/tour/tasting.svg' },
  guide_communication: { th: 'การอธิบายและการสื่อสาร', icon: '🗣️' },
  host_hospitality: { th: 'การต้อนรับของเจ้าบ้าน', icon: '🏡', photo: '/tour/host.svg' },
  food: { th: 'อาหาร', icon: '🍲' },
  price_value: { th: 'ราคาและความคุ้มค่า', icon: '💰' },
  scenery: { th: 'วิวทิวทัศน์', icon: '⛰️' },
  logistics_directions: { th: 'การเดินทางและเส้นทาง', icon: '🧭' },
  group_size_timing: { th: 'ขนาดกลุ่มและเวลา', icon: '⏱️' },
  purchase_interest: { th: 'การซื้อเมล็ดกาแฟหรือสินค้า', icon: '🛍️' },
  other: { th: 'เรื่องอื่น ๆ', icon: '💬' },
};

export const SENTIMENT_TH: Record<Sentiment, string> = {
  positive: 'ชอบ',
  negative: 'ไม่ชอบ',
  mixed: 'ทั้งชอบและไม่ชอบ',
};

/** Photo-rating cards shown to guests (spec §6.2 step 3), each mapped to one aspect. */
export const TOUR_STEPS: { id: string; aspect: Aspect; photo: string }[] = [
  { id: 'walk', aspect: 'walk_trail', photo: '/tour/walk.svg' },
  { id: 'picking', aspect: 'coffee_picking', photo: '/tour/picking.svg' },
  { id: 'processing', aspect: 'processing_roasting', photo: '/tour/processing.svg' },
  { id: 'tasting', aspect: 'tasting', photo: '/tour/tasting.svg' },
  { id: 'host', aspect: 'host_hospitality', photo: '/tour/host.svg' },
];
