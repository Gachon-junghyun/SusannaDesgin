import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { MAX_FILES, MAX_FILE_BYTES, validateFull, validateQuick } from "@/lib/validate";
import { createPublicClient } from "@/lib/supabase/public";
import { isCmsEnabled } from "@/lib/supabase/env";
import { notifyNewQuote } from "@/lib/notify";
import { site } from "@/config/site";

export const runtime = "nodejs";

/** 아주 단순한 IP 기준 레이트리밋 (인스턴스 메모리 기준) */
const hits = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

function rateLimited(ip: string) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (list.length >= MAX_PER_WINDOW) return true;
  list.push(now);
  hits.set(ip, list);
  return false;
}

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  try {
    const fd = await req.formData();
    const get = (k: string) => (fd.get(k) as string | null)?.trim() ?? "";

    // 봇 트랩 — 채워져 있으면 조용히 성공 응답만 돌려주고 버립니다
    if (get("company_website")) {
      return NextResponse.json({ ok: true });
    }

    if (rateLimited(ip)) {
      return NextResponse.json(
        { ok: false, error: "잠시 후 다시 시도해 주세요." },
        { status: 429 }
      );
    }

    const kind = get("kind") === "quick" ? "quick" : "full";
    const data = {
      kind,
      name: get("name"),
      phone: get("phone"),
      email: get("email"),
      zip: get("zip"),
      address: get("address"),
      addressDetail: get("addressDetail"),
      region: get("region"),
      floor: get("floor"),
      signType: get("signType"),
      timing: get("timing"),
      message: get("message"),
      agree: get("agree") === "true",
    };

    // 서버에서도 동일 규칙으로 재검증 (클라이언트 검증은 우회 가능)
    const errors = kind === "quick" ? validateQuick(data) : validateFull(data);
    if (Object.keys(errors).length) {
      return NextResponse.json({ ok: false, errors }, { status: 400 });
    }

    const files = fd.getAll("files").filter((f): f is File => f instanceof File);
    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { ok: false, error: `첨부파일은 최대 ${MAX_FILES}개입니다.` },
        { status: 400 }
      );
    }
    if (files.some((f) => f.size > MAX_FILE_BYTES)) {
      return NextResponse.json(
        { ok: false, error: "첨부파일 용량을 초과했습니다." },
        { status: 400 }
      );
    }

    const record = {
      ...data,
      files: files.map((f) => ({ name: f.name, size: f.size, type: f.type })),
      ip,
      receivedAt: new Date().toISOString(),
    };

    console.log("[견적문의]", JSON.stringify(record));

    /**
     * 문의 보관 — 여기서 실패하면 **접수를 성공으로 처리하지 않습니다.**
     *
     * 예전에는 파일에만 적고 실패해도 넘어갔는데, 배포 환경(서버리스)은
     * 파일 쓰기가 막혀 있어서 고객은 "접수 완료"를 보는데 회사는 아무것도
     * 못 받는 상태가 됩니다. 문의 한 건이 곧 일감이라 조용히 삼키면 안 됩니다.
     */
    let stored = false;

    // 1순위: DB (배포 환경에서 유일하게 확실한 저장소)
    const supabase = createPublicClient();
    if (supabase) {
      const { error } = await supabase.from("quotes").insert({
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
      });

      if (error) console.error("[견적문의] DB 저장 실패:", error.message);
      else stored = true;
    }

    /**
     * 2순위: 로컬 파일 — **DB 를 안 쓰는 상태(개발·Supabase 미설정)에서만** 씁니다.
     *
     * ⚠️ 예전에는 이 블록이 조건 없이 돌면서 성공하면 `stored = true` 로 만들었습니다.
     *    그러면 **DB 저장이 실패해도 파일 쓰기가 성공하는 순간 "접수 완료"** 가 나갑니다.
     *    서버리스는 보통 파일 쓰기가 막혀 있어 실제로 터지진 않았지만, 플랫폼이
     *    임시 디렉터리를 열어주면 조용히 문의를 삼키는 구조였습니다.
     *    바로 위 주석이 막겠다고 한 상황이라 조건을 붙였습니다.
     */
    if (!isCmsEnabled()) {
      try {
        const dir = path.join(process.cwd(), "data");
        await fs.mkdir(dir, { recursive: true });
        await fs.appendFile(
          path.join(dir, "quotes.jsonl"),
          JSON.stringify(record) + "\n",
          "utf8"
        );
        stored = true;
      } catch (e) {
        console.warn("[견적문의] 파일 기록 실패:", e);
      }
    }

    if (!stored) {
      // 접수됐다고 거짓말하지 않습니다. 고객이 전화라도 걸 수 있게 합니다.
      console.error("[견적문의] 저장 경로가 모두 실패했습니다. 문의 유실:", record);
      return NextResponse.json(
        {
          ok: false,
          error:
            "접수 처리 중 문제가 발생했습니다. 번거로우시겠지만 전화로 연락 주세요.",
        },
        { status: 500 }
      );
    }

    /**
     * 실시간 알림 — **저장이 확정된 뒤에만** 부릅니다.
     *
     * 여기서 실패해도 고객에게는 정상 접수로 응답합니다. 문의는 이미 DB 에 있고,
     * 알림이 안 갔다고 "접수 실패" 를 띄우면 고객이 두 번 넣게 됩니다.
     * `notifyNewQuote` 자체가 예외를 밖으로 안 던지지만, 만약을 위해 한 겹 더 감쌉니다.
     *
     * 환경변수를 안 넣으면 조용히 아무것도 안 합니다(기본 꺼짐).
     */
    try {
      const sent = await notifyNewQuote(
        {
          kind: record.kind,
          name: record.name,
          phone: record.phone,
          email: record.email,
          region: record.region,
          signType: record.signType,
          timing: record.timing,
          address: [record.address, record.addressDetail].filter(Boolean).join(" "),
          message: record.message,
          fileCount: record.files.length,
          receivedAt: record.receivedAt,
        },
        site.url
      );
      if (sent.length) console.log("[견적문의] 알림 발송:", sent.join(", "));
    } catch (e) {
      console.error("[견적문의] 알림 처리 중 예외(접수는 정상):", e);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[견적문의] 처리 실패:", e);
    return NextResponse.json(
      { ok: false, error: "요청을 처리하지 못했습니다." },
      { status: 500 }
    );
  }
}
