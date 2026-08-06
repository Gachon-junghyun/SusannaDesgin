/**
 * DB 테이블 타입. `supabase/migrations/0001_init.sql` 의 스키마와 1:1 로 맞춰져 있습니다.
 * 스키마를 바꾸면 이 파일도 같이 고쳐야 합니다.
 */

export type HeroSlideRow = {
  id: string;
  eyebrow: string;
  title: string;
  sub: string;
  image_url: string;
  alt: string;
  sort_order: number;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type WorkRow = {
  id: string;
  title: string;
  category: string;
  location: string;
  tags: string[];
  image_url: string;
  sort_order: number;
  published: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * 페이지 문구 블록 (`0005_content_blocks.sql`).
 *
 * 한 표에 여섯 구역이 들어 있고, **칸의 뜻이 구역마다 다릅니다.**
 * 대응표는 마이그레이션 파일 맨 위와 `config/sections.ts` 에 있습니다.
 */
export type ContentSection =
  | "copy"
  | "why"
  | "stat"
  | "process"
  | "fabrication"
  | "sign_type";

export type ContentBlockRow = {
  id: string;
  section: ContentSection;
  slug: string;
  eyebrow: string;
  title: string;
  sub: string;
  points: string[];
  image_url: string;
  alt: string;
  sort_order: number;
  published: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * 견적 문의 첨부파일 한 건.
 *
 * `path` 는 `quote-files` 버킷의 키입니다. **없을 수도 있습니다** — 두 경우입니다.
 *   1) 마이그레이션 `0006` 이전에 들어온 문의 (그때는 파일을 아예 안 받았습니다)
 *   2) 업로드가 실패한 경우 (접수는 살리고 파일만 포기 — lib/quote-files.ts)
 * 그래서 화면은 `path` 유무로 "받음 / 못 받음" 을 갈라 보여 줘야 합니다.
 */
export type QuoteFile = { name: string; size: number; type: string; path?: string };

export type QuoteRow = {
  id: string;
  kind: "quick" | "full";
  name: string;
  phone: string;
  email: string;
  zip: string;
  address: string;
  address_detail: string;
  region: string;
  floor: string;
  sign_type: string;
  timing: string;
  message: string;
  files: QuoteFile[];
  ip: string;
  handled: boolean;
  created_at: string;
};

export type ProfileRow = {
  id: string;
  email: string | null;
  role: "admin" | "viewer";
  created_at: string;
};
