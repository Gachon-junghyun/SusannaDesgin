import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import {
  ACCEPTED_FILE_LABEL,
  MAX_FILES,
  MAX_FILE_BYTES,
  MAX_TOTAL_BYTES,
  isAcceptedFile,
  validateFull,
  validateQuick,
} from "@/lib/validate";
import { createPublicClient } from "@/lib/supabase/public";
import { isCmsEnabled } from "@/lib/supabase/env";
import { MAX_MAIL_ATTACH_BYTES, notifyNewQuote, toMailAttachments } from "@/lib/notify";
import { uploadQuoteFiles } from "@/lib/quote-files";

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
    const tooBig = files.find((f) => f.size > MAX_FILE_BYTES);
    if (tooBig) {
      return NextResponse.json(
        {
          ok: false,
          error:
            `${tooBig.name} 이(가) 너무 큽니다. ` +
            `파일 하나당 ${Math.round(MAX_FILE_BYTES / 1024 / 1024)}MB 까지입니다.`,
        },
        { status: 400 }
      );
    }

    /**
     * 형식 검사 — **서버에서도 반드시 합니다.**
     *
     * 폼의 `accept` 속성은 파일 선택창을 걸러 줄 뿐, 브라우저 밖에서 요청을 만들면
     * 아무 파일이나 들어옵니다. 예전에는 이 검사가 아예 없어서 실행 파일도 그대로
     * 저장됐습니다. 비공개 버킷이라 남이 열지는 못하지만, **나중에 그 파일을 내려받아
     * 여는 건 우리 쪽 사람**이라 여기서 막는 게 맞습니다.
     */
    const badType = files.find((f) => !isAcceptedFile(f.name));
    if (badType) {
      return NextResponse.json(
        {
          ok: false,
          error: `${badType.name} 은(는) 받을 수 없는 형식입니다. ${ACCEPTED_FILE_LABEL} 를 올려주세요.`,
        },
        { status: 400 }
      );
    }

    // 합계 — 넘으면 코드에 닿기 전에 Cloudflare 가 잘라 원인 모를 오류가 됩니다
    const totalBytes = files.reduce((n, f) => n + f.size, 0);
    if (totalBytes > MAX_TOTAL_BYTES) {
      return NextResponse.json(
        {
          ok: false,
          error:
            `첨부파일 전체 용량이 ${Math.round(MAX_TOTAL_BYTES / 1024 / 1024)}MB 를 넘습니다. ` +
            `나눠서 보내주시거나 큰 파일은 메일로 보내주세요.`,
        },
        { status: 400 }
      );
    }

    const supabase = createPublicClient();

    /**
     * 첨부파일 — **DB 에 넣기 전에** 스토리지부터 올립니다.
     *
     * 순서가 이상해 보이지만 이유가 있습니다. `quotes` 의 RLS 는 익명에게
     * INSERT 만 허용합니다(0002). UPDATE 권한이 없으니 행을 먼저 만들고 나서
     * 파일 경로를 채워 넣을 수가 없습니다. 그래서 ID 를 여기서 미리 만들고,
     * 파일을 그 ID 폴더에 올린 뒤, 경로까지 담아 **한 번에** INSERT 합니다.
     * (익명에게 UPDATE 를 열어 주는 쪽이 훨씬 나쁩니다 — 누구나 남의 문의를
     *  고칠 수 있게 됩니다. [원칙 A2])
     *
     * 업로드가 실패해도 접수는 계속합니다. 사진을 잃는 것과 문의를 통째로
     * 잃는 것 중에는 후자가 비교할 수 없이 큽니다.
     */
    const id = crypto.randomUUID();

    /**
     * 파일은 **한 개씩** 읽어 올리고, 메일에 붙일 것만 예산 안에서 들고 있습니다.
     * 파일마다 바이트를 읽는 곳은 `uploadQuoteFiles` 한 곳뿐입니다 —
     * 같은 `File` 을 두 번 읽으면 workerd 에서 두 번째가 비어 버립니다
     * (`lib/quote-files.ts` 의 `QuoteUpload` 주석).
     */
    const { stored: storedFiles, mail } = await uploadQuoteFiles(
      supabase,
      id,
      files,
      MAX_MAIL_ATTACH_BYTES
    );

    const record = {
      ...data,
      id,
      files: storedFiles,
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
    if (supabase) {
      const { error } = await supabase.from("quotes").insert({
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
      // 사진을 메일에 그대로 붙입니다 — 현장에서 휴대폰으로 메일만 봐도 사양이 보이게
      const attachments = toMailAttachments(mail);

      // 변환까지 성공한 것만 실제로 붙습니다 (빈 내용이면 toMailAttachments 가 전부 버림)
      const attachedIdx = new Set(attachments.length ? mail.map((m) => m.index) : []);

      /**
       * 첨부가 몇 장 붙었는지 **반드시 남깁니다.** 예전에 첨부가 조용히 비어서
       * Resend 가 요청째로 거부했고, 거부된 요청은 발송 로그에도 안 남아
       * "저장은 되는데 알림만 사라지는" 상태를 한참 못 찾았습니다.
       */
      if (files.length) {
        console.log(
          `[견적문의] 첨부 ${files.length}개 중 ${attachments.length}개를 메일에 붙입니다` +
            ` (합계 ${Math.round(totalBytes / 1024)}KB).`
        );
      }

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
          // 메일에 실제로 붙은 것만 attached — 큰 원본과 작은 사양서가 섞여 와도
          // 받는 사람이 "어느 게 어디 있는지" 를 정확히 압니다
          files: record.files.map((f, i) => ({
            name: f.name,
            stored: Boolean(f.path),
            attached: attachedIdx.has(i),
          })),
          receivedAt: record.receivedAt,
        },
        attachments
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
