"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { SECTIONS } from "@/config/sections";
import { requireAdmin } from "@/lib/auth";
import { removeQuoteFiles } from "@/lib/quote-files";
import { createClient } from "@/lib/supabase/server";
import type {
  ContentBlockRow,
  HeroSlideRow,
  QuoteFile,
  WorkRow,
} from "@/lib/supabase/types";

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
  // 문구 블록(F19)은 이 세 곳에도 같이 나갑니다
  revalidatePath("/signs");
  revalidatePath("/process");
  revalidatePath("/about");
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
// 페이지 문구 블록 (F19)
// ---------------------------------------------------------------

/**
 * 넘어온 구역 이름이 우리가 아는 것인지 확인합니다.
 *
 * 서버 액션은 화면과 별개로 열려 있는 엔드포인트라 form 의 hidden 값을
 * 그대로 믿으면 안 됩니다. 모르는 값이면 DB 의 `check` 제약이 막아 주기는 하지만,
 * 그 오류 메시지는 관리자에게 아무 도움이 안 되므로 여기서 먼저 거릅니다.
 */
function sectionOf(formData: FormData) {
  const key = text(formData, "section");
  return SECTIONS.find((s) => s.key === key);
}

/** 상세 항목·특징 — 화면에서는 줄바꿈으로 나눠 적습니다 */
function toLines(raw: string): string[] {
  return raw
    .split("\n")
    .map((t) => t.trim())
    .filter(Boolean);
}

export async function saveBlock(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await adminClient();

  const spec = sectionOf(formData);
  if (!spec) return { error: "어느 구역인지 알 수 없습니다. 새로고침 후 다시 시도해 주세요." };

  const id = text(formData, "id");
  const title = text(formData, "title");
  if (!title) {
    return { error: `${spec.fields.title?.label ?? "제목"}을(를) 넣어 주세요.` };
  }

  const payload = {
    section: spec.key,
    eyebrow: text(formData, "eyebrow"),
    title,
    sub: text(formData, "sub"),
    points: toLines(text(formData, "points")),
    image_url: text(formData, "image_url"),
    alt: text(formData, "alt"),
    published: formData.get("published") === "on",
  };

  if (id) {
    // slug 는 코드가 이름으로 집어 오는 값이라 화면에서 바꾸지 않습니다.
    const { error } = await supabase.from("content_blocks").update(payload).eq("id", id);
    if (error) return { error: error.message };
  } else {
    if (spec.fixed) {
      return { error: `${spec.label}은(는) 항목을 새로 넣을 수 없습니다. 있는 것을 고쳐 주세요.` };
    }

    const { data: last } = await supabase
      .from("content_blocks")
      .select("sort_order")
      .eq("section", spec.key)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle<Pick<ContentBlockRow, "sort_order">>();

    const { error } = await supabase
      .from("content_blocks")
      .insert({ ...payload, sort_order: (last?.sort_order ?? 0) + 10 });
    if (error) return { error: error.message };
  }

  refreshPublicPages();
  revalidatePath("/admin/content");
  redirect(`/admin/content?section=${spec.key}&saved=1`);
}

export async function deleteBlock(formData: FormData) {
  const supabase = await adminClient();

  const spec = sectionOf(formData);
  const id = text(formData, "id");
  if (!spec || spec.fixed || !id) return;

  await supabase.from("content_blocks").delete().eq("id", id);

  refreshPublicPages();
  revalidatePath("/admin/content");
}

/**
 * 같은 구역 안에서만 이웃과 순서를 맞바꿉니다.
 *
 * ⚠️ 한 표에 여섯 구역이 섞여 있으므로 `eq("section", …)` 을 빼면 다른 구역의
 *    항목과 값을 바꿔 버립니다. 화면상으로는 "아무 일도 안 일어난 것처럼" 보이고
 *    엉뚱한 구역의 순서가 흐트러집니다.
 */
export async function moveBlock(formData: FormData) {
  const supabase = await adminClient();

  const spec = sectionOf(formData);
  const id = text(formData, "id");
  const dir = text(formData, "dir"); // "up" | "down"
  if (!spec || spec.fixed || !id) return;

  const { data: rows } = await supabase
    .from("content_blocks")
    .select("id, sort_order")
    .eq("section", spec.key)
    .order("sort_order", { ascending: true });

  if (!rows) return;

  const list = rows as Pick<ContentBlockRow, "id" | "sort_order">[];
  const i = list.findIndex((r) => r.id === id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return;

  await supabase
    .from("content_blocks")
    .update({ sort_order: list[j].sort_order })
    .eq("id", list[i].id);
  await supabase
    .from("content_blocks")
    .update({ sort_order: list[i].sort_order })
    .eq("id", list[j].id);

  refreshPublicPages();
  revalidatePath("/admin/content");
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

  /**
   * 행보다 첨부를 **먼저** 지웁니다. 행이 사라지면 파일 경로를 알 길이 없어져
   * 고객 사진이 버킷에 영영 남습니다 (F10 의 고아 파일과 같은 실수).
   * 개인정보처리방침상 보유기간이 있는 자료라 더 그렇습니다.
   */
  const { data } = await supabase.from("quotes").select("files").eq("id", id).single();
  await removeQuoteFiles(supabase, (data?.files ?? []) as QuoteFile[]);

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
