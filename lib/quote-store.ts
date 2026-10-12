import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isCmsEnabled } from "@/lib/supabase/env";
import type { QuoteFile } from "@/lib/supabase/types";

/**
 * 견적 한 건을 보관합니다 — 견적 폼(`/api/quote`)과 AI 문의(`/agent/quote`)가 같이 씁니다 (F5 · F33).
 *
 * 1순위 DB `quotes` → 2순위 로컬 파일(**DB 를 안 쓰는 상태에서만**). 둘 다 실패하면 `stored=false` 이고,
 * 부르는 쪽은 **접수됐다고 거짓 응답하지 않습니다**(500). 원래 `/api/quote` 안에 있던 순서를
 * 문이 둘이 되면서 여기로 옮겼습니다 — 저장 규칙이 두 벌이 되면 한쪽만 고쳐지는 날이 옵니다.
 */

/** 접수 경로 (`0019_quote_source.sql`). 빈 문자열 = 사람이 홈페이지 폼으로 넣은 것 */
export type QuoteSource = "" | "trap" | "agent";

export type QuoteRecord = {
  id: string;
  kind: "quick" | "full";
  name: string;
  phone: string;
  email: string;
  zip: string;
  address: string;
  addressDetail: string;
  region: string;
  floor: string;
  signType: string;
  product: string;
  timing: string;
  message: string;
  files: QuoteFile[];
  ip: string;
  receivedAt: string;
  source: QuoteSource;
  /** AI 가 스스로 밝힌 이름(예: «ChatGPT»). 검증된 값이 아닙니다 */
  agent: string;
};

/** 견적함·메일에 붙는 접수 경로 이름 — 한 곳에서만 만듭니다 */
export function sourceLabel(source: string, agent?: string): string {
  if (source === "agent") return `AI 경유${agent ? ` (${agent})` : ""}`;
  if (source === "trap") return "자동 입력 의심";
  return "";
}

/**
 * 마이그레이션이 늦게 돈 DB 에서도 문의를 잃지 않게, **없는 칸은 빼고 다시 넣습니다.**
 * 칸 이름 → 그 칸을 만드는 마이그레이션 파일.
 */
const OPTIONAL_COLUMNS: Record<string, string> = {
  product: "0010_quote_product.sql",
  source: "0019_quote_source.sql",
  agent: "0019_quote_source.sql",
};

export async function storeQuote(
  supabase: SupabaseClient | null,
  record: QuoteRecord
): Promise<{ stored: boolean; dbStored: boolean }> {
  let stored = false;
  let dbStored = false;

  // 1순위: DB (배포 환경에서 유일하게 확실한 저장소)
  if (supabase) {
    const row: Record<string, unknown> = {
      id: record.id,
      kind: record.kind,
      name: record.name,
      phone: record.phone,
      email: record.email,
      zip: record.zip,
      address: record.address,
      address_detail: record.addressDetail,
      region: record.region,
      floor: record.floor,
      sign_type: record.signType,
      timing: record.timing,
      message: record.message,
      files: record.files,
      ip: record.ip,
      product: record.product,
      source: record.source,
      agent: record.agent,
    };

    /**
     * 🔴 **없는 칸 하나 때문에 문의를 통째로 잃지 않습니다.** 없는 칸을 넣으면 INSERT 가 통째로
     * 실패하고 고객에게 500 이 나갑니다. 그래서 오류에 이름이 나온 선택 칸만 빼고 다시 넣고,
     * **로그에 크게 남깁니다** — 조용히 성공하면 마이그레이션을 안 돌린 걸 아무도 모릅니다.
     * 접수 경로 칸이 빠지면 경로를 문의 내용 맨 앞에 적어서 사람이 볼 수 있게 합니다.
     */
    for (let attempt = 0; attempt <= Object.keys(OPTIONAL_COLUMNS).length; attempt++) {
      const { error } = await supabase.from("quotes").insert(row);
      if (!error) {
        stored = dbStored = true;
        break;
      }
      const msg = `${error.message} ${error.details ?? ""}`;
      const missing = Object.keys(OPTIONAL_COLUMNS).filter(
        (c) => c in row && new RegExp(`\\b${c}\\b`, "i").test(msg)
      );
      if (!missing.length) {
        console.error("[견적문의] DB 저장 실패:", error.message);
        break;
      }
      for (const c of missing) {
        console.error(
          `[견적문의] 🔴 quotes.${c} 칸이 없습니다 — supabase/migrations/${OPTIONAL_COLUMNS[c]} 을 실행하세요. ` +
            `이번 건은 그 칸을 빼고 저장합니다.`
        );
        delete row[c];
      }
      if (missing.some((c) => c === "source" || c === "agent")) {
        const label = sourceLabel(record.source, record.agent);
        if (label && !String(row.message).startsWith(`[${label}]`)) {
          row.message = `[${label}] ${row.message}`.trim();
        }
      }
    }
  }

  /**
   * 2순위: 로컬 파일 — **DB 를 안 쓰는 상태(개발·Supabase 미설정)에서만** 씁니다.
   * 조건 없이 돌면 DB 저장이 실패해도 파일 쓰기가 성공하는 순간 "접수 완료" 가 나갑니다.
   */
  if (!isCmsEnabled()) {
    try {
      const dir = path.join(process.cwd(), "data");
      await fs.mkdir(dir, { recursive: true });
      await fs.appendFile(path.join(dir, "quotes.jsonl"), JSON.stringify(record) + "\n", "utf8");
      stored = true;
    } catch (e) {
      console.warn("[견적문의] 파일 기록 실패:", e);
    }
  }

  return { stored, dbStored };
}
