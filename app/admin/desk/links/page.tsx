import AdminShell from "@/components/admin/AdminShell";
import { DESK_LINKS } from "@/config/desk";
import { requireAdmin } from "@/lib/auth";

/**
 * P23 — 바로가기 (F28 · 2026-09-26). 채널 관리 화면 모음. 목록은 `config/desk.ts` 의 `DESK_LINKS` 한 곳입니다.
 * DB 를 안 씁니다 — 마이그레이션 없이도 그대로 보입니다.
 */
export default async function LinksPage() {
  const user = await requireAdmin();
  return (
    <AdminShell user={user} title="바로가기" desc="마케팅 채널과 공공 발주 관리 화면입니다. 새 창으로 열립니다. 비밀번호는 여기 적지 않습니다.">
      <div className="grid gap-10 md:grid-cols-2">
        {DESK_LINKS.map((g) => (
          <section key={g.group}>
            <h2 className="text-[13px] font-black tracking-[0.06em] text-ink-500">{g.group}</h2>
            <ul className="mt-2 divide-y divide-line border-y border-line bg-white">
              {g.items.map((l) => (
                <li key={l.href}>
                  <a href={l.href} target="_blank" rel="noreferrer" className="flex items-baseline justify-between gap-4 px-4 py-3 hover:bg-paper">
                    <span className="text-[15px] font-bold text-ink">{l.label}</span>
                    <span className="text-right text-[12px] text-ink-500">{l.note} ↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </AdminShell>
  );
}
