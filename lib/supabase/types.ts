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
  | "sign_type"
  /** 제품(간판 유형) 카탈로그 — `0008_product.sql`. 칸의 뜻은 그 파일 머리말에 있습니다 */
  | "product"
  /** 재질(외벽 텍스처) 58종 · 간판 종류 9가지(가격 포함) — `0009_material_signmodel.sql` */
  | "material"
  | "sign_model";

export type ContentBlockRow = {
  id: string;
  section: ContentSection;
  slug: string;
  eyebrow: string;
  title: string;
  sub: string;
  points: string[];
  /**
   * 손님이 읽는 설명 (`0011_signmodel_body.sql`). 지금은 `sign_model` 구역만 씁니다.
   * 문단은 빈 줄로 나뉘고, **마크다운을 안 그립니다**(있는 그대로 나갑니다).
   * 이 칸이 비면 제품 상세페이지가 색인 대상에서 빠집니다 — 얇은 중복 페이지 방지.
   */
  body: string;
  /**
   * 실제 시공 사진 여러 장 (`0012_signmodel_photos.sql`). 순서가 곧 화면 순서입니다.
   * 🔴 대표 사진(`image_url`, 3D 렌더)은 여기 «안» 넣습니다 — 화면이 이어 붙이므로
   * 넣으면 같은 사진이 두 번 나옵니다.
   */
  photos: string[];
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
  /**
   * 손님이 `/products` 에서 **실제로 누른 카드**의 이름 (`0010_quote_product.sql`).
   *
   * 🔴 `sign_type`(폼에서 고른 문의 분야)과 축이 다릅니다 — 합치지 마세요.
   * 마이그레이션을 아직 안 돌린 DB 에서는 이 칸이 아예 안 옵니다(화면은 빈 값으로 취급).
   */
  product: string;
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
