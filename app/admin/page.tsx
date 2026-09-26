import Link from "next/link";

import AdminShell from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/auth";
import { addDays, todayKST } from "@/lib/desk";
import { createClient } from "@/lib/supabase/server";

export default async function AdminHome() {
  const user = await requireAdmin();
  const supabase = await createClient();

  const [heroCount, workCount, newQuotes, blockCount, deskDue] = await Promise.all([
    supabase!.from("hero_slides").select("id", { count: "exact", head: true }),
    supabase!.from("works").select("id", { count: "exact", head: true }),
    supabase!
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("handled", false),
    supabase!.from("content_blocks").select("id", { count: "exact", head: true }),
    // 0015 를 안 돌렸으면 오류가 오고 count 가 null — 카드는 숫자 없이 뜹니다 [A1]
    supabase!
      .from("desk_tasks")
      .select("id", { count: "exact", head: true })
      .is("done_at", null)
      .lte("due_on", addDays(todayKST(), 7)),
  ]);

  const pending = newQuotes.count ?? 0;

  const cards = [
    {
      href: "/admin/desk",
      title: "업무 달력",
      count: deskDue.error ? null : (deskDue.count ?? 0),
      unit: "건",
      desc: "기한이 지났거나 7일 안에 돌아오는 할 일 수입니다. 마케팅 주기·바로가기도 왼쪽 «업무»에 있습니다.",
    },
    {
      href: "/admin/quotes",
      title: "견적 문의",
      count: pending,
      unit: "건",
      desc: "홈페이지로 들어온 문의입니다. 확인 안 한 건수를 보여줍니다.",
    },
    {
      href: "/admin/sites",
      title: "현장 폴더",
      count: null,
      unit: "",
      desc: "현장마다 사진을 모아 두고, 사실 몇 칸을 채워 공개하면 홈페이지에 시공사례 페이지가 생깁니다.",
    },
    {
      href: "/admin/hero",
      title: "첫 화면 사진",
      count: heroCount.count ?? 0,
      unit: "장",
      desc: "홈페이지를 열면 제일 먼저 보이는 큰 사진입니다. 추가·교체·순서 변경·삭제를 할 수 있습니다.",
    },
    {
      href: "/admin/works",
      title: "주요 실적",
      count: workCount.count ?? 0,
      unit: "건",
      desc: "시공한 현장 카드입니다. 위에서부터 6개가 홈페이지에도 함께 나옵니다.",
    },
    {
      href: "/admin/content",
      title: "페이지 문구",
      count: blockCount.count ?? 0,
      unit: "개",
      desc: "홈페이지 구역 제목, 회사 강점, 숫자 지표, 업무 프로세스, 제작 공정, 사업영역 문구입니다.",
    },
    {
      href: "/admin/maker",
      title: "간판 메이커",
      count: null,
      unit: "",
      desc: "상호·로고로 간판 시안을 만들고, 만들 수 있는지(획·글자 높이)를 판정합니다. 이 PC 의 글꼴도 쓸 수 있습니다.",
    },
    {
      // F26-k (2026-09-27) — 관리자 전용 베타. 손님 메이커엔 없습니다
      href: "/admin/maker/logo",
      title: "로고 만들기 (베타)",
      count: null,
      unit: "",
      desc: "상호·업종·인상을 넣으면 락업·심벌·글꼴·색을 한 단계씩 정해 세 안을 나란히 보고, 간판으로 만들 수 있는지까지 판정해 에디터로 보냅니다.",
    },
    {
      href: "/admin/usage",
      title: "사용량",
      count: null,
      unit: "",
      desc: "Supabase 무료 요금제 한도(DB 500MB·파일 1GB …) 대비 지금 얼마나 쓰는지 봅니다.",
    },
  ];

  return (
    <AdminShell
      user={user}
      title="무엇을 바꾸시겠어요?"
      desc="저장하면 홈페이지에 바로 반영됩니다. 새로 배포할 필요 없습니다."
    >
      {pending > 0 && (
        <Link
          href="/admin/quotes"
          className="mb-5 flex flex-wrap items-center gap-3 rounded-xl bg-accent px-6 py-5 text-white transition-opacity hover:opacity-90"
        >
          <span className="text-2xl font-black">확인 안 한 견적 문의 {pending}건</span>
          <span className="ml-auto font-bold underline underline-offset-4">
            보러 가기 →
          </span>
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group rounded-xl border border-line bg-white p-6 transition-colors hover:border-brand"
          >
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-black transition-colors group-hover:text-brand">
                {c.title}
              </h2>
              {c.count !== null && (
                <p className="text-2xl font-black tracking-tight">
                  {c.count}
                  <span className="ml-0.5 text-[14px] font-bold text-ink-500">{c.unit}</span>
                </p>
              )}
            </div>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-500">{c.desc}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded-xl bg-white p-6">
        <h2 className="font-black">알아두시면 좋은 점</h2>
        <ul className="mt-3 space-y-2.5 text-[14px] leading-relaxed text-ink-500">
          <li>
            <b className="text-ink">사진은 가로로 넓은 것</b>이 잘 맞습니다. 세로 사진을 넣으면 위아래가 잘립니다.
          </li>
          <li>
            <b className="text-ink">&ldquo;홈페이지에 보이기&rdquo;</b> 체크를 풀면 지우지 않고 잠시 숨길 수 있습니다.
          </li>
          <li>
            <b className="text-ink">삭제는 되돌릴 수 없습니다.</b> 확실하지 않으면 숨김을 쓰세요.
          </li>
          <li>
            바뀐 내용이 안 보이면 브라우저에서 <b className="text-ink">새로고침</b> 한 번 해 주세요.
          </li>
        </ul>
      </div>
    </AdminShell>
  );
}
