import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { DRIVE_SCOPE, driveClient } from "@/lib/gdrive";

/**
 * 구글 드라이브 연결 시작 (F29) — 관리자가 «구글 연결»을 누르면 구글 동의 화면으로 보냅니다.
 * 동의 버튼은 사람이 누릅니다. 돌아오면 `callback` 이 «연결 열쇠(refresh token)»를 한 번 보여 줍니다.
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return NextResponse.redirect(new URL("/admin/login", req.url));
  const c = driveClient();
  if (!c) return NextResponse.redirect(new URL("/admin/sites/drive?error=client", req.url));

  const state = crypto.randomUUID();
  const redirectUri = new URL("/api/admin/drive/callback", req.url).toString();
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.search = new URLSearchParams({
    client_id: c.id,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: DRIVE_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  }).toString();
  const res = NextResponse.redirect(u.toString());
  res.cookies.set("gdrive_state", state, { httpOnly: true, secure: true, sameSite: "lax", path: "/api/admin/drive", maxAge: 600 });
  return res;
}
