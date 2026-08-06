import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { QuoteFile } from "@/lib/supabase/types";

/**
 * 견적 문의 첨부파일 보관.
 *
 * **왜 비공개 버킷 + 서명 URL 인가**
 * 고객이 올리는 건 매장 사진·도면·간판 시안입니다. 공개 버킷에 두면 주소만
 * 알면 누구나 열립니다. 그래서 `quote-files` 는 비공개로 두고, 관리자가 화면을
 * 열 때마다 수명 있는 임시 주소를 새로 발급합니다 (마이그레이션 `0006`).
 *
 * **service_role 키를 쓰지 않습니다** [§6]. 업로드는 익명 키 + INSERT 정책,
 * 열람은 로그인한 관리자 세션 + `is_admin()` 정책으로 갈라집니다. 즉 이 파일의
 * 어떤 함수도 RLS 를 우회하지 않습니다.
 */

export const QUOTE_BUCKET = "quote-files";

/** 서명 URL 수명 — 관리자가 화면을 열어 두고 한참 뒤 눌러도 살아 있을 만큼 */
const SIGNED_URL_TTL = 60 * 60; // 1시간

/**
 * 스토리지 키를 만듭니다.
 *
 * ⚠️ **원본 파일명을 키에 쓰지 않습니다.** 실제 문의에 들어온 이름이
 *    `자석 게시판(필름마감).jpg` 처럼 한글·공백·괄호 범벅이라, 그대로 키로 쓰면
 *    URL 인코딩 단계마다 깨질 자리가 생깁니다. 키는 `문의ID/01.jpg` 로 단순하게
 *    두고, 사람이 보는 이름은 DB(`quotes.files[].name`)에 남겨 내려받을 때
 *    `?download=` 로 되살립니다.
 */
function objectKey(quoteId: string, index: number, name: string): string {
  const ext = /\.([a-zA-Z0-9]{1,8})$/.exec(name)?.[1]?.toLowerCase() ?? "";
  return `${quoteId}/${String(index + 1).padStart(2, "0")}${ext ? `.${ext}` : ""}`;
}

/**
 * 업로드된 파일을 **한 번만 읽어** 메모리에 들고 있는 형태.
 *
 * 🔴 **`File` 을 그대로 돌려쓰면 안 됩니다 (2026-08-06 운영 장애).**
 *    예전에는 `File` 을 스토리지 업로드에 넘기고, 같은 `File` 을 메일 첨부용으로
 *    다시 `arrayBuffer()` 했습니다. Node(로컬)에서는 `Blob` 이 메모리 기반이라
 *    두 번 읽혀서 통과했지만, **운영(Cloudflare workerd)에서는 첫 업로드가
 *    본문 스트림을 소비해 두 번째 읽기가 빈 내용**이 됐습니다.
 *    빈 첨부는 Resend 가 요청 단계에서 거부하고, 거부된 요청은 발송 로그에도
 *    안 남아서 **"저장은 되는데 알림만 조용히 사라지는"** 상태가 됐습니다.
 *
 *    그래서 라우트가 **맨 앞에서 딱 한 번** 바이트를 읽고, 저장과 메일이
 *    그 바이트를 나눠 씁니다. 아래 함수들이 `File` 이 아니라 이 타입을 받는 이유입니다.
 */
export type QuoteUpload = {
  /** 원래 첨부 목록에서 몇 번째였나 — 메일 본문에서 "이건 붙었고 저건 아니다" 를 가릅니다 */
  index: number;
  name: string;
  type: string;
  size: number;
  bytes: Uint8Array;
};

/**
 * 첨부파일을 **한 개씩** 버킷에 올리고, 메일에 붙일 바이트만 따로 남깁니다.
 *
 * **왜 순차인가 — 메모리 때문입니다.**
 * 워커 메모리는 128MB 이고 `formData()` 가 이미 본문 전체를 들고 있습니다.
 * 여기서 전부를 한꺼번에 `arrayBuffer()` 로 복사하면 같은 데이터가 두 벌이 되어
 * 50MB 파일 두 개만으로도 한도에 닿습니다. 한 개씩 읽어 올리고 바로 놓아주면
 * 최대 사용량이 "본문 + 파일 하나" 로 묶입니다.
 *
 * **메일용 바이트는 예산 안에서만 들고 있습니다.** 어차피 총 12MB 를 넘으면 메일에
 * 안 붙이므로(F16), 그보다 큰 건 복사본을 남길 이유가 없습니다.
 *
 * **한 장이 실패해도 나머지는 올립니다.** 그리고 예외를 밖으로 던지지 않습니다 —
 * 업로드가 안 됐다고 접수 자체를 실패시키면 문의를 통째로 잃습니다. 실패한
 * 항목은 `path` 없이 이름·크기만 돌아가고, 관리자 화면이 "받지 못함"으로 표시합니다.
 */
export async function uploadQuoteFiles(
  supabase: SupabaseClient | null,
  quoteId: string,
  files: File[],
  mailBudgetBytes: number
): Promise<{ stored: QuoteFile[]; mail: QuoteUpload[] }> {
  const stored: QuoteFile[] = [];
  const mail: QuoteUpload[] = [];
  let mailUsed = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const meta = { name: file.name, size: file.size, type: file.type };

    let bytes: Uint8Array;
    try {
      // 🔴 이 파일에서 바이트를 읽는 곳은 여기 한 곳뿐입니다. 위 QuoteUpload 주석 참고.
      bytes = new Uint8Array(await file.arrayBuffer());
    } catch (e) {
      console.error(`[견적문의] 첨부를 읽지 못했습니다 (${file.name}):`, e);
      stored.push(meta);
      continue;
    }

    // 메일 예산 안에 들면 복사본을 남깁니다 (넘으면 안 들고 있습니다 — 메모리)
    if (mailUsed + bytes.length <= mailBudgetBytes) {
      mail.push({ ...meta, index: i, bytes });
      mailUsed += bytes.length;
    }

    if (!supabase) {
      stored.push(meta); // CMS 미설정(개발) — 저장 없이 메타데이터만
      continue;
    }

    const path = objectKey(quoteId, i, file.name);
    try {
      const { error } = await supabase.storage.from(QUOTE_BUCKET).upload(path, bytes, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
      if (error) {
        console.error(`[견적문의] 첨부 업로드 실패 (${file.name}):`, error.message);
        stored.push(meta); // path 없음 = 파일을 못 받았다는 뜻
        continue;
      }
    } catch (e) {
      console.error(`[견적문의] 첨부 업로드 예외 (${file.name}):`, e);
      stored.push(meta);
      continue;
    }

    stored.push({ ...meta, path });
  }

  return { stored, mail };
}

/**
 * 경로 → 내려받기 주소. 관리자 화면에서만 부릅니다 (RLS 가 `is_admin()` 을 봅니다).
 *
 * 여러 문의의 파일을 **한 번에** 서명합니다. 목록 화면이 문의 200건을 그리는데
 * 파일마다 왕복하면 수백 번 요청이 나갑니다.
 */
export async function signQuoteFiles(
  supabase: SupabaseClient,
  files: QuoteFile[]
): Promise<Map<string, string>> {
  const urls = new Map<string, string>();

  const stored = files.filter((f): f is QuoteFile & { path: string } => Boolean(f.path));
  if (!stored.length) return urls;

  const { data, error } = await supabase.storage
    .from(QUOTE_BUCKET)
    .createSignedUrls(
      stored.map((f) => f.path),
      SIGNED_URL_TTL
    );

  if (error) {
    console.error("[견적문의] 첨부 서명 URL 발급 실패:", error.message);
    return urls;
  }

  // 키에는 원본 이름이 없으므로(위 objectKey 주석), 내려받을 때 DB 의 이름을 되살립니다.
  const nameByPath = new Map(stored.map((f) => [f.path, f.name]));

  for (const item of data ?? []) {
    if (!item.signedUrl || !item.path) continue;
    const name = nameByPath.get(item.path);
    urls.set(
      item.path,
      name ? `${item.signedUrl}&download=${encodeURIComponent(name)}` : item.signedUrl
    );
  }

  return urls;
}

/** 문의를 지울 때 첨부도 같이 지웁니다 (개인정보 보유기간). */
export async function removeQuoteFiles(
  supabase: SupabaseClient,
  files: QuoteFile[]
): Promise<void> {
  const paths = files.map((f) => f.path).filter((p): p is string => Boolean(p));
  if (!paths.length) return;

  const { error } = await supabase.storage.from(QUOTE_BUCKET).remove(paths);
  if (error) console.error("[견적문의] 첨부 삭제 실패:", error.message);
}
