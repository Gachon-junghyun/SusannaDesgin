import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { createUploadSession, driveReady } from "@/lib/gdrive";
import { createClient } from "@/lib/supabase/server";

/**
 * 원본 한 장을 구글 드라이브에 올릴 «자리» 만들기 (F29). 파일은 브라우저가 돌려받은 주소로 직접 보냅니다.
 * 폴더: `수산나 원본/<촬영 연도>/<MM-DD> <현장 이름>/`
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "관리자만 쓸 수 있습니다." }, { status: 401 });
  if (!driveReady()) return NextResponse.json({ error: "drive-off" }, { status: 503 });

  const { photoId, name, mime, size } = (await req.json()) as { photoId?: string; name?: string; mime?: string; size?: number };
  if (!photoId || !name || !size || size > 200 * 1024 * 1024) return NextResponse.json({ error: "요청이 올바르지 않습니다." }, { status: 400 });

  const supabase = await createClient();
  const { data: photo } = await supabase!.from("site_photos").select("taken_at, site_id, sites(title)").eq("id", photoId).maybeSingle();
  if (!photo) return NextResponse.json({ error: "사진을 찾지 못했습니다." }, { status: 404 });

  const kst = new Date(photo.taken_at ?? Date.now()).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }); // YYYY-MM-DD
  const title = ((photo.sites as unknown as { title?: string } | null)?.title ?? "현장").replace(/[\/:*?"<>|]/g, " ").trim().slice(0, 40);
  const origin = req.headers.get("origin") ?? new URL(req.url).origin;
  try {
    const url = await createUploadSession({
      folderPath: [kst.slice(0, 4), `${kst.slice(5)} ${title}`],
      name: name.replace(/[\/]/g, "_").slice(0, 120),
      mime: mime ?? "application/octet-stream",
      size,
      origin,
    });
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
