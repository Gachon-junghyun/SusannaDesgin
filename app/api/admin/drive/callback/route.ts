import { cookies } from "next/headers";

import { getCurrentUser } from "@/lib/auth";
import { exchangeCode } from "@/lib/gdrive";

/**
 * 구글 동의 뒤 돌아오는 곳 (F29). «연결 열쇠(refresh token)»를 **이 화면에 한 번만** 보여 줍니다.
 *
 * 🔴 열쇠를 서버에 저장하지 않습니다 — 워커는 자기 Secret 을 스스로 쓸 수 없고, DB 에 두면 DB 를 읽는 누구나
 *    드라이브에 손댈 수 있게 됩니다. 사람이 Cloudflare 대시보드에 `GDRIVE_REFRESH_TOKEN` **Secret** 으로 붙여 넣습니다.
 */
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export async function GET(req: Request) {
  const page = (body: string, status = 200) =>
    new Response(
      `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>구글 드라이브 연결</title><body style="font:16px/1.7 system-ui,sans-serif;max-width:680px;margin:48px auto;padding:0 20px;color:#0f1a19">${body}<p><a href="/admin/sites/drive">← 돌아가기</a></p></body>`,
      { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
    );

  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return page("<h1>관리자만 볼 수 있습니다</h1>", 401);

  const url = new URL(req.url);
  const jar = await cookies();
  if (!url.searchParams.get("state") || url.searchParams.get("state") !== jar.get("gdrive_state")?.value)
    return page("<h1>연결을 확인하지 못했습니다</h1><p>다시 «구글 연결»을 눌러 주세요.</p>", 400);
  if (url.searchParams.get("error")) return page(`<h1>연결을 취소했습니다</h1><p>${esc(url.searchParams.get("error")!)}</p>`, 400);

  const t = await exchangeCode(url.searchParams.get("code") ?? "", new URL("/api/admin/drive/callback", req.url).toString());
  if (!t.refresh_token)
    return page(`<h1>열쇠를 받지 못했습니다</h1><p>${esc(t.error_description ?? t.error ?? "구글이 refresh token 을 주지 않았습니다 — 구글 계정 «보안 → 타사 액세스»에서 이 앱을 지우고 다시 연결해 보세요.")}</p>`, 400);

  return page(
    `<h1>연결됐습니다 — 마지막 한 단계</h1>
<p>아래 열쇠를 Cloudflare 대시보드 → Workers → <b>susannadesgin</b> → 설정 → 변수 및 비밀 에 <b>Secret</b> 타입,
이름 <code>GDRIVE_REFRESH_TOKEN</code> 으로 붙여 넣으세요. <b>Plaintext 로 넣으면 다음 배포 때 지워집니다.</b></p>
<textarea readonly style="width:100%;height:120px;font:13px monospace" onclick="this.select()">${esc(t.refresh_token)}</textarea>
<p style="color:#5a6b69">이 열쇠는 이 화면에만 한 번 보입니다. 다른 사람에게 보내지 마세요. 새로 받으면 옛 열쇠는 버려도 됩니다.</p>`,
  );
}
