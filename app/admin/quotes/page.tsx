import { deleteQuote, toggleQuoteHandled } from "@/app/admin/actions";
import AdminShell from "@/components/admin/AdminShell";
import SubmitButton from "@/components/admin/SubmitButton";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { QuoteRow } from "@/lib/supabase/types";

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
                ["첨부", q.files?.length ? q.files.map((f) => f.name).join(", ") : ""],
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
        첨부파일은 이름과 크기만 기록됩니다. 파일 자체가 필요하시면 고객께 이메일로 요청하세요.
        <br />
        고객 개인정보이므로, 상담이 끝난 문의는 정리하시는 편이 좋습니다
        (개인정보처리방침상 보유기간: 상담 완료 후 6개월).
      </p>
    </AdminShell>
  );
}
