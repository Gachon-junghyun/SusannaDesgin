"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { HeroSlideRow, WorkRow } from "@/lib/supabase/types";

export type ActionState = { error?: string; ok?: boolean };

/**
 * 서버 액션은 화면과 별개로 인터넷에 열려 있는 엔드포인트입니다.
 * 그래서 화면에서 이미 막았더라도 **액션마다** 권한을 다시 확인합니다.
 * (그 뒤에 DB 의 RLS 정책이 한 번 더 걸러 줍니다.)
 */
async function adminClient() {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase 접속 정보가 설정되지 않았습니다.");
  return supabase;
}

/** 관리자가 바꾼 내용이 공개 페이지에 바로 보이도록 다시 굽습니다. */
function refreshPublicPages() {
  revalidatePath("/");
  revalidatePath("/works");
}

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function toTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------
// 히어로 슬라이드 (첫 화면 사진)
// ---------------------------------------------------------------

export async function saveSlide(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await adminClient();

  const id = text(formData, "id");
  const image_url = text(formData, "image_url");
  if (!image_url) return { error: "사진을 넣어 주세요." };

  const payload = {
    eyebrow: text(formData, "eyebrow"),
    title: text(formData, "title"),
    sub: text(formData, "sub"),
    image_url,
    alt: text(formData, "alt"),
    published: formData.get("published") === "on",
  };

  if (id) {
    const { error } = await supabase.from("hero_slides").update(payload).eq("id", id);
    if (error) return { error: error.message };
  } else {
    // 새 슬라이드는 맨 뒤에 붙입니다.
    const { data: last } = await supabase
      .from("hero_slides")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle<Pick<HeroSlideRow, "sort_order">>();

    const { error } = await supabase
      .from("hero_slides")
      .insert({ ...payload, sort_order: (last?.sort_order ?? 0) + 10 });
    if (error) return { error: error.message };
  }

  refreshPublicPages();
  revalidatePath("/admin/hero");
  redirect("/admin/hero?saved=1");
}

export async function deleteSlide(formData: FormData) {
  const supabase = await adminClient();
  const id = text(formData, "id");
  if (!id) return;

  await supabase.from("hero_slides").delete().eq("id", id);

  refreshPublicPages();
  revalidatePath("/admin/hero");
}

/** 위/아래 이웃과 순서 값을 맞바꿉니다. */
export async function moveSlide(formData: FormData) {
  const supabase = await adminClient();
  const id = text(formData, "id");
  const dir = text(formData, "dir"); // "up" | "down"
  if (!id) return;

  const { data: rows } = await supabase
    .from("hero_slides")
    .select("id, sort_order")
    .order("sort_order", { ascending: true });

  if (!rows) return;

  const list = rows as Pick<HeroSlideRow, "id" | "sort_order">[];
  const i = list.findIndex((r) => r.id === id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return;

  await supabase
    .from("hero_slides")
    .update({ sort_order: list[j].sort_order })
    .eq("id", list[i].id);
  await supabase
    .from("hero_slides")
    .update({ sort_order: list[i].sort_order })
    .eq("id", list[j].id);

  refreshPublicPages();
  revalidatePath("/admin/hero");
}

// ---------------------------------------------------------------
// 주요 실적 (카드 박스)
// ---------------------------------------------------------------

export async function saveWork(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await adminClient();

  const id = text(formData, "id");
  const title = text(formData, "title");
  if (!title) return { error: "현장 이름을 넣어 주세요." };

  const payload = {
    title,
    category: text(formData, "category"),
    location: text(formData, "location"),
    tags: toTags(text(formData, "tags")),
    image_url: text(formData, "image_url"),
    published: formData.get("published") === "on",
  };

  if (id) {
    const { error } = await supabase.from("works").update(payload).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { data: last } = await supabase
      .from("works")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle<Pick<WorkRow, "sort_order">>();

    const { error } = await supabase
      .from("works")
      .insert({ ...payload, sort_order: (last?.sort_order ?? 0) + 10 });
    if (error) return { error: error.message };
  }

  refreshPublicPages();
  revalidatePath("/admin/works");
  redirect("/admin/works?saved=1");
}

export async function deleteWork(formData: FormData) {
  const supabase = await adminClient();
  const id = text(formData, "id");
  if (!id) return;

  await supabase.from("works").delete().eq("id", id);

  refreshPublicPages();
  revalidatePath("/admin/works");
}

export async function moveWork(formData: FormData) {
  const supabase = await adminClient();
  const id = text(formData, "id");
  const dir = text(formData, "dir");
  if (!id) return;

  const { data: rows } = await supabase
    .from("works")
    .select("id, sort_order")
    .order("sort_order", { ascending: true });

  if (!rows) return;

  const list = rows as Pick<WorkRow, "id" | "sort_order">[];
  const i = list.findIndex((r) => r.id === id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return;

  await supabase.from("works").update({ sort_order: list[j].sort_order }).eq("id", list[i].id);
  await supabase.from("works").update({ sort_order: list[i].sort_order }).eq("id", list[j].id);

  refreshPublicPages();
  revalidatePath("/admin/works");
}

// ---------------------------------------------------------------
// 견적 문의
// ---------------------------------------------------------------

/** 확인함 / 확인 안 함 토글 */
export async function toggleQuoteHandled(formData: FormData) {
  const supabase = await adminClient();
  const id = text(formData, "id");
  if (!id) return;

  await supabase
    .from("quotes")
    .update({ handled: text(formData, "handled") !== "true" })
    .eq("id", id);

  revalidatePath("/admin/quotes");
  revalidatePath("/admin");
}

export async function deleteQuote(formData: FormData) {
  const supabase = await adminClient();
  const id = text(formData, "id");
  if (!id) return;

  await supabase.from("quotes").delete().eq("id", id);

  revalidatePath("/admin/quotes");
  revalidatePath("/admin");
}

// ---------------------------------------------------------------
// 로그아웃
// ---------------------------------------------------------------

export async function signOut() {
  const supabase = await createClient();
  await supabase?.auth.signOut();
  redirect("/admin/login");
}
