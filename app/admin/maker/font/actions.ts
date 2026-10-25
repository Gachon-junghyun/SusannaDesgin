"use server";

import { requireAdmin } from "@/lib/auth";
import { explainFontStoreError, type FontStoreStatus } from "@/lib/maker/hfont-store";
import { createClient } from "@/lib/supabase/server";
import type { MakerFontPartRow, MakerFontRow } from "@/lib/supabase/types";

/**
 * 글꼴 공방 «내 글꼴 작업» 저장 — 목록 · 열기 · 저장 · 지우기 (F26-m 3단계 · 2026-10-25).
 * 🔴 **액션마다 `requireAdmin()`** [A2] — 그 뒤에 0020 의 RLS(`is_admin()`)가 한 번 더 막습니다.
 * 🔴 **0020 이 없는 DB 에서도 던지지 않습니다** — `{ ok: false, state: "missing" }` 을 돌려주면 화면이 «저장소 준비 전»으로 바뀌고
 *    고친 것은 그 브라우저 localStorage 에 남습니다.
 * 저장은 **바뀐 글자만** 보냅니다. 서버 액션 본문 상한(1MB) 때문에 화면이 70만 바이트씩 나눠 여러 번 부릅니다(`FONT_SAVE_BATCH_BYTES`).
 */

/** 이 값은 0020 의 check 제약과 같습니다 — 한쪽만 바꾸지 마세요 */
const PART_MAX = 262144;
const NAME_MAX = 60;

type Fail = { ok: false } & (FontStoreStatus & { state: "missing" | "down" });
export type FontListItem = Pick<MakerFontRow, "id" | "name" | "base" | "updated_at"> & { parts: number };
export type FontPart = Pick<MakerFontPartRow, "kind" | "key" | "data">;
export type FontMeta = { name: string; base: string | null; sample: string; style: MakerFontRow["style"]; frames: unknown | null };

async function client() {
  await requireAdmin();
  return createClient();
}
const down = (message: string): Fail => ({ ok: false, state: "down", message });
const noClient = () => down("Supabase 접속 정보가 없어 저장소를 쓸 수 없습니다. 고친 글자는 이 브라우저에만 남습니다.");

function cleanMeta(m: FontMeta): FontMeta | string {
  const name = String(m?.name ?? "").trim();
  if (!name || name.length > NAME_MAX) return `폰트 이름은 1~${NAME_MAX}자입니다.`;
  const base = m.base == null ? null : String(m.base).slice(0, 80);
  const sample = String(m.sample ?? "").slice(0, 200);
  const s = m.style ?? {};
  const num = (v: unknown, lo: number, hi: number, d: number) => (typeof v === "number" && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d);
  const style = { weight: num(s.weight, -100, 100, 0), slant: num(s.slant, -45, 45, 0), width: num(s.width, 50, 200, 100), tracking: num(s.tracking, -500, 500, 0) };
  const frames = m.frames && typeof m.frames === "object" ? m.frames : null;
  return { name, base, sample, style, frames };
}

/** 내 글꼴 작업 목록 — 고친 날 순 */
export async function listMakerFonts(): Promise<{ ok: true; items: FontListItem[] } | Fail> {
  const supabase = await client();
  if (!supabase) return noClient();
  const { data, error } = await supabase
    .from("maker_fonts")
    .select("id, name, base, updated_at, maker_font_parts(count)")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) return { ok: false, ...explainFontStoreError(error) };
  const rows = (data ?? []) as unknown as (Omit<FontListItem, "parts"> & { maker_font_parts: { count: number }[] })[];
  return { ok: true, items: rows.map(({ maker_font_parts, ...r }) => ({ ...r, parts: maker_font_parts?.[0]?.count ?? 0 })) };
}

/** 한 벌 열기 — 글자는 1,000줄씩 끝까지 읽습니다(PostgREST 한 번 상한) */
export async function loadMakerFont(id: string): Promise<{ ok: true; font: MakerFontRow; parts: FontPart[] } | Fail> {
  const supabase = await client();
  if (!supabase) return noClient();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return down("잘못된 글꼴 번호입니다.");
  const { data: font, error } = await supabase.from("maker_fonts").select("*").eq("id", id).maybeSingle<MakerFontRow>();
  if (error) return { ok: false, ...explainFontStoreError(error) };
  if (!font) return down("이 글꼴 작업이 없습니다(다른 곳에서 지웠을 수 있습니다).");
  const parts: FontPart[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error: pe } = await supabase.from("maker_font_parts").select("kind, key, data").eq("font_id", id).order("kind").order("key").range(from, from + 999);
    if (pe) return { ok: false, ...explainFontStoreError(pe) };
    parts.push(...((data ?? []) as FontPart[]));
    if (!data || data.length < 1000) break;
  }
  return { ok: true, font, parts };
}

/**
 * 저장 — `id` 가 없으면 새로 만듭니다. `upserts` 는 바뀐 글자, `deletes` 는 «처음 모양으로» 되돌린 글자.
 * 화면이 본문을 70만 바이트 안으로 나눠 여러 번 부릅니다. 이 함수는 한 번 부를 때마다 하나의 묶음만 받습니다.
 */
export async function saveMakerFont(input: {
  id: string | null;
  meta: FontMeta;
  upserts: FontPart[];
  deletes: Pick<FontPart, "kind" | "key">[];
}): Promise<{ ok: true; id: string; updated_at: string } | Fail> {
  const supabase = await client();
  if (!supabase) return noClient();
  const meta = cleanMeta(input.meta);
  if (typeof meta === "string") return down(meta);
  for (const p of input.upserts ?? []) {
    if (p.kind !== "over" && p.kind !== "cell") return down(`모르는 종류입니다: ${p.kind}`);
    if (!p.key || p.key.length > 40) return down("글자 이름이 잘못됐습니다.");
    const bytes = new TextEncoder().encode(JSON.stringify(p.data)).length;
    if (bytes > PART_MAX) return down(`«${p.key}» 한 자가 너무 큽니다(${Math.round(bytes / 1024)}KB, 한 자 상한 256KB). «점 줄이기»로 점을 줄여 주십시오.`);
  }

  let id = input.id;
  const now = new Date().toISOString();
  if (id) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return down("잘못된 글꼴 번호입니다.");
    const { data, error } = await supabase.from("maker_fonts").update({ ...meta, updated_at: now }).eq("id", id).select("id");
    if (error) return { ok: false, ...explainFontStoreError(error) };
    if (!data?.length) return down("이 글꼴 작업이 없습니다(다른 곳에서 지웠을 수 있습니다). «새로 만들기» 뒤 다시 저장해 주십시오.");
  } else {
    const { data, error } = await supabase.from("maker_fonts").insert(meta).select("id").single<{ id: string }>();
    if (error) return { ok: false, ...explainFontStoreError(error) };
    id = data.id;
  }

  if (input.upserts?.length) {
    const rows = input.upserts.map((p) => ({ font_id: id, kind: p.kind, key: p.key, data: p.data, updated_at: now }));
    const { error } = await supabase.from("maker_font_parts").upsert(rows, { onConflict: "font_id,kind,key" });
    if (error) return { ok: false, ...explainFontStoreError(error) };
  }
  for (const kind of ["over", "cell"] as const) {
    const keys = (input.deletes ?? []).filter((d) => d.kind === kind).map((d) => d.key);
    if (!keys.length) continue;
    const { error } = await supabase.from("maker_font_parts").delete().eq("font_id", id).eq("kind", kind).in("key", keys);
    if (error) return { ok: false, ...explainFontStoreError(error) };
  }
  return { ok: true, id: id!, updated_at: now };
}

/** 한 벌 지우기 — 글자도 같이 지워집니다(on delete cascade). 되돌릴 수 없습니다 */
export async function deleteMakerFont(id: string): Promise<{ ok: true } | Fail> {
  const supabase = await client();
  if (!supabase) return noClient();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return down("잘못된 글꼴 번호입니다.");
  const { error } = await supabase.from("maker_fonts").delete().eq("id", id);
  if (error) return { ok: false, ...explainFontStoreError(error) };
  return { ok: true };
}
