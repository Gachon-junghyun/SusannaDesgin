import { deleteQuote, toggleQuoteHandled } from "@/app/admin/actions";
import AdminShell from "@/components/admin/AdminShell";
import SubmitButton from "@/components/admin/SubmitButton";
import { site } from "@/config/site";
import { requireAdmin } from "@/lib/auth";
import { signQuoteFiles } from "@/lib/quote-files";
import { createClient } from "@/lib/supabase/server";
import type { QuoteRow } from "@/lib/supabase/types";

/** 29358 → 29KB */
function fileSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)}MB`
    : `${Math.max(1, Math.round(bytes / 1024))}KB`;
}

/** 2026-07-24 오후 3:20 형태 */
function when(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminQuotesPage() {
  const user = await requireAdmin();

  const supabase = await createClient();
  const { data, error } = await supabase!
    .from("quotes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  const quotes = (data ?? []) as QuoteRow[];
  const pending = quotes.filter((q) => !q.handled).length;

  /**
   * 첨부 내려받기 주소를 **한 번에** 발급합니다 (수명 1시간).
   *
   * 버킷이 비공개라 주소가 고정돼 있지 않습니다. 화면을 그릴 때마다 새로 서명하고,
   * 그 발급 자체가 RLS 의 `is_admin()` 을 통과해야 되므로 관리자가 아니면 애초에
   * 주소가 만들어지지 않습니다. 파일마다 요청하면 문의 200건에 왕복 수백 번이라
   * 전부 모아 한 번에 부릅니다 (`lib/quote-files.ts`).
   */
  const signed = await signQuoteFiles(supabase!, quotes.flatMap((q) => q.files ?? []));

  /**
   * 알림이 켜져 있는지 이 화면에서 바로 보여 줍니다.
   *
   * 예전에는 알림이 꺼져 있어도(또는 발송이 실패해도) 화면에 아무 표시가 없어서,
   * 문의가 안 들어온 것인지 알림만 안 온 것인지 구분할 수 없었습니다.
   * 실제로 그 상태로 한동안 메일이 한 통도 안 갔습니다.
   * 값은 배포 환경의 환경변수를 그대로 읽으므로, 운영 화면에서 보면
   * Cloudflare 에 값이 들어갔는지까지 확인됩니다.
   */
  const notifyEmail = process.env.QUOTE_NOTIFY_EMAIL?.trim() || site.email;
  const notifyOn =
    Boolean(process.env.RESEND_API_KEY?.trim()) ||
    Boolean(process.env.QUOTE_WEBHOOK_URL?.trim());

  return (
    <AdminShell
      user={user}
      title="견적 문의"
      desc="홈페이지 문의 폼으로 들어온 내용입니다. 확인하신 건은 '확인함'으로 표시해 두시면 헷갈리지 않습니다."
    >
      {error && (
        <p className="mb-6 rounded-lg bg-accent/10 px-4 py-3 text-[14px] font-bold text-accent">
          문의를 불러오지 못했습니다. supabase/migrations/0002_quotes.sql 을 실행했는지 확인해 주세요.
          <br />
          <span className="font-normal">({error.message})</span>
        </p>
      )}

      <p
        className={`mb-5 rounded-lg px-4 py-3 text-[14px] leading-relaxed ${
          notifyOn ? "bg-paper text-ink-500" : "bg-accent/10 font-bold text-accent"
        }`}
      >
        {notifyOn ? (
          <>
            새 문의가 들어오면 <b className="text-ink">{notifyEmail}</b> 로 메일이 갑니다.
            받은편지함에 없으면 스팸함도 확인해 보세요.
          </>
        ) : (
          <>
            새 문의가 들어와도 <b>알려드리지 않습니다.</b> 이 화면을 직접 열어 보셔야
            합니다. 메일 알림을 켜려면 배포 설정에 <code>RESEND_API_KEY</code> 를
            넣으세요.
          </>
        )}
      </p>

      {quotes.length > 0 && (
        <p className="mb-5 text-[15px]">
          전체 <b>{quotes.length}</b>건
          {pending > 0 && (
            <>
              {" · "}
              <b className="text-accent">확인 안 한 문의 {pending}건</b>
            </>
          )}
        </p>
      )}

      <ul className="space-y-3">
        {quotes.map((q) => (
          <li
            key={q.id}
            className={`rounded-xl border bg-white ${
              q.handled ? "border-line opacity-60" : "border-brand/40"
            }`}
          >
            <div className="flex flex-wrap items-center gap-3 px-5 py-4">
              {!q.handled && (
                <span className="rounded-md bg-accent px-2 py-1 text-[11px] font-black text-white">
                  NEW
                </span>
              )}
              <span className="font-black">{q.name || "(이름 없음)"}</span>
              <a
                href={`tel:${q.phone.replace(/\D/g, "")}`}
                className="font-bold text-brand underline underline-offset-4"
              >
                {q.phone}
              </a>
              <span className="rounded-md bg-paper px-2 py-1 text-[12px] font-bold text-ink-500">
                {q.kind === "quick" ? "간편문의" : "전체문의"}
              </span>
              <span className="text-[13px] text-ink-500">{when(q.created_at)}</span>

              <div className="ml-auto flex items-center gap-1.5">
                <form action={toggleQuoteHandled}>
                  <input type="hidden" name="id" value={q.id} />
                  <input type="hidden" name="handled" value={String(q.handled)} />
                  <SubmitButton
                    pendingLabel="…"
                    className="rounded-md border border-line px-3 py-1.5 text-[13px] font-bold hover:bg-paper"
                  >
                    {q.handled ? "확인 취소" : "확인함"}
                  </SubmitButton>
                </form>
                <form action={deleteQuote}>
                  <input type="hidden" name="id" value={q.id} />
                  <SubmitButton
                    pendingLabel="삭제 중…"
                    confirm="이 문의를 삭제할까요? 되돌릴 수 없습니다."
                    className="rounded-md border border-line px-3 py-1.5 text-[13px] font-bold text-accent hover:bg-accent/5"
                  >
                    삭제
                  </SubmitButton>
                </form>
              </div>
            </div>

            <dl className="grid gap-x-6 gap-y-2 border-t border-line px-5 py-4 text-[14px] sm:grid-cols-2">
              {[
                ["이메일", q.email],
                ["지역", q.region],
                ["설치 주소", [q.zip && `(${q.zip})`, q.address, q.address_detail].filter(Boolean).join(" ")],
                ["설치 층수", q.floor],
                ["사인물 종류", q.sign_type],
                ["희망 시기", q.timing],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="flex gap-3">
                    <dt className="w-24 shrink-0 font-bold text-ink-500">{k}</dt>
                    <dd className="min-w-0 break-words">{v}</dd>
                  </div>
                ))}
            </dl>

            {q.message && (
              <div className="border-t border-line px-5 py-4">
                <p className="text-[13px] font-bold text-ink-500">문의 내용</p>
                <p className="mt-1.5 leading-relaxed whitespace-pre-line">{q.message}</p>
              </div>
            )}

            {q.files?.length > 0 && (
              <div className="border-t border-line px-5 py-4">
                <p className="text-[13px] font-bold text-ink-500">
                  첨부 {q.files.length}개
                </p>
                <ul className="mt-2 space-y-1.5">
                  {q.files.map((f, i) => {
                    const url = f.path ? signed.get(f.path) : undefined;
                    return (
                      <li key={`${f.name}-${i}`} className="text-[14px]">
                        {url ? (
                          <a
                            href={url}
                            className="font-bold text-brand underline underline-offset-4"
                          >
                            {f.name}
                          </a>
                        ) : (
                          <span className="text-ink-500">{f.name}</span>
                        )}
                        <span className="ml-2 text-[13px] text-ink-500">
                          {fileSize(f.size)}
                          {/* 파일을 저장하기 전(0006 이전) 문의는 이름만 남아 있습니다 */}
                          {!f.path && " · 파일 없음 — 고객께 다시 요청하세요"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </li>
        ))}
      </ul>

      {!error && quotes.length === 0 && (
        <p className="rounded-xl border border-dashed border-line px-5 py-14 text-center text-ink-500">
          아직 들어온 문의가 없습니다.
          <br />
          <span className="text-[14px]">
            홈페이지 견적 문의 폼으로 접수되면 여기에 쌓입니다.
          </span>
        </p>
      )}

      <p className="mt-8 text-[13px] leading-relaxed text-ink-500">
        첨부파일 이름을 누르면 내려받습니다. 알림 메일에도 파일이 그대로 붙어서 갑니다
        (총 12MB 이하일 때). <b>&ldquo;파일 없음&rdquo;</b>이라고 적힌 건 2026-08-06 이전에
        들어온 문의입니다 — 그때는 파일을 보관하지 않아서 이름만 남았습니다.
        <br />
        고객 개인정보이므로, 상담이 끝난 문의는 정리하시는 편이 좋습니다
        (개인정보처리방침상 보유기간: 상담 완료 후 6개월).
      </p>
    </AdminShell>
  );
}
