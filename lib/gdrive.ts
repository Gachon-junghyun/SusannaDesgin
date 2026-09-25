import "server-only";

/**
 * 원본 사진 → 구글 드라이브 → (비스테이션이 24시간 받아 감) (F29).
 *
 * 왜 드라이브를 거치나: 비스테이션(시놀로지 BeeStation)은 외부 프로그램용 API·WebDAV 가 없습니다.
 * 대신 **비스테이션이 스스로 구글 드라이브 폴더를 «한 방향»으로 받아 오는** 기능이 공식 사양에 있습니다
 * (bee.synology.com BeeStation Software Specifications — «Create sync folders with Google Drive …»,
 *  «One-way sync: Downloaded files on BeeStation will not be removed when they are removed in the cloud services»,
 *  2026-09-26 브라우저로 직접 봄). 그래서 드라이브는 «중간 보관함»이고, 30일 지난 원본은 비워도 비스테이션엔 남습니다.
 *
 * 🔴 **권한 범위는 `drive.file` 하나** — 이 앱이 «만든» 파일·폴더만 보고 지웁니다. 드라이브의 다른 파일은 못 봅니다.
 * 🔴 **원본 파일은 우리 서버를 지나지 않습니다.** 서버는 «올릴 자리(업로드 주소)»만 만들고, 브라우저가 구글로 직접 보냅니다
 *    (워커 요청 크기·무료 한도를 안 씁니다).
 *
 * 설정(사람이 한 번 — 절차는 ARCHITECTURE F29): 대시보드 **Secret** 으로
 *   GDRIVE_CLIENT_ID · GDRIVE_CLIENT_SECRET · GDRIVE_REFRESH_TOKEN
 * 셋 중 하나라도 없으면 원본 전송은 «꺼짐»이고 나머지 기능은 그대로 됩니다 [A1].
 */

export const DRIVE_ROOT_NAME = "수산나 원본";
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const FOLDER = "application/vnd.google-apps.folder";

export function driveClient() {
  const id = process.env.GDRIVE_CLIENT_ID?.trim();
  const secret = process.env.GDRIVE_CLIENT_SECRET?.trim();
  return id && secret ? { id, secret } : null;
}

export function driveReady(): boolean {
  return Boolean(driveClient() && process.env.GDRIVE_REFRESH_TOKEN?.trim());
}

export async function accessToken(): Promise<string> {
  const c = driveClient();
  const refresh = process.env.GDRIVE_REFRESH_TOKEN?.trim();
  if (!c || !refresh) throw new Error("구글 드라이브가 연결되지 않았습니다.");
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: c.id, client_secret: c.secret, refresh_token: refresh, grant_type: "refresh_token" }),
  });
  const j = (await r.json()) as { access_token?: string; error?: string; error_description?: string };
  if (!j.access_token) throw new Error(`구글 인증 실패: ${j.error_description ?? j.error ?? r.status}`);
  return j.access_token;
}

/** 코드 → 토큰 (연결 화면의 콜백에서 한 번) */
export async function exchangeCode(code: string, redirectUri: string) {
  const c = driveClient();
  if (!c) throw new Error("GDRIVE_CLIENT_ID / GDRIVE_CLIENT_SECRET 가 없습니다.");
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: c.id, client_secret: c.secret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
  });
  return (await r.json()) as { refresh_token?: string; access_token?: string; error?: string; error_description?: string };
}

const q = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

async function findOrCreateFolder(token: string, name: string, parent: string | null): Promise<string> {
  const where = [`name='${q(name)}'`, `mimeType='${FOLDER}'`, "trashed=false", parent ? `'${parent}' in parents` : "'root' in parents"].join(" and ");
  const found = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(where)}&fields=files(id)&pageSize=1`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json() as Promise<{ files?: { id: string }[] }>);
  if (found.files?.[0]) return found.files[0].id;
  const made = await fetch("https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: FOLDER, ...(parent ? { parents: [parent] } : {}) }),
  }).then((r) => r.json() as Promise<{ id?: string; error?: { message: string } }>);
  if (!made.id) throw new Error(`드라이브 폴더를 못 만들었습니다: ${made.error?.message ?? "?"}`);
  return made.id;
}

/**
 * 원본을 올릴 자리를 만듭니다 — `수산나 원본/2026/09-26 태평한우/<파일>`.
 * 돌려주는 주소로 브라우저가 파일을 PUT 합니다. `origin` 을 실어야 구글이 브라우저의 직접 업로드를 허락합니다(CORS).
 */
export async function createUploadSession(opts: { folderPath: string[]; name: string; mime: string; size: number; origin: string }) {
  const token = await accessToken();
  let parent: string | null = null;
  for (const part of [DRIVE_ROOT_NAME, ...opts.folderPath]) parent = await findOrCreateFolder(token, part, parent);
  const r = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": opts.mime || "application/octet-stream",
      "X-Upload-Content-Length": String(opts.size),
      Origin: opts.origin,
    },
    body: JSON.stringify({ name: opts.name, parents: [parent] }),
  });
  const url = r.headers.get("location");
  if (!r.ok || !url) throw new Error(`드라이브 업로드 자리를 못 만들었습니다 (${r.status}).`);
  return url;
}

/** 30일 지난 원본을 드라이브에서 비웁니다 — 비스테이션(한 방향 동기화)엔 남습니다. 이 앱이 만든 파일만 봅니다 */
export async function purgeOldOriginals(days = 30): Promise<{ deleted: number }> {
  const token = await accessToken();
  const before = new Date(Date.now() - days * 864e5).toISOString();
  const where = `mimeType!='${FOLDER}' and trashed=false and createdTime < '${before}'`;
  let deleted = 0;
  let pageToken = "";
  for (let i = 0; i < 20; i++) {
    const list = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(where)}&fields=nextPageToken,files(id)&pageSize=100${pageToken ? `&pageToken=${pageToken}` : ""}`,
      { headers: { Authorization: `Bearer ${token}` } },
    ).then((r) => r.json() as Promise<{ files?: { id: string }[]; nextPageToken?: string }>);
    for (const f of list.files ?? []) {
      const d = await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (d.ok || d.status === 404) deleted++;
    }
    if (!list.nextPageToken) break;
    pageToken = list.nextPageToken;
  }
  return { deleted };
}
