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
  files: { name: string; size: number; type: string }[];
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
