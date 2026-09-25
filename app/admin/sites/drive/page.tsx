import AdminShell from "@/components/admin/AdminShell";
import DrivePurgeButton from "@/components/admin/DrivePurgeButton";
import { site } from "@/config/site";
import { requireAdmin } from "@/lib/auth";
import { DRIVE_ROOT_NAME, driveClient, driveReady } from "@/lib/gdrive";

/**
 * P26 — 원본 사진 → 구글 드라이브 → 비스테이션 연결 (F29).
 * 사람이 할 일을 순서대로 보여 주고, 구글 동의 버튼만 여기서 누르게 합니다.
 */
export const dynamic = "force-dynamic";

export default async function DrivePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireAdmin();
  const { error } = await searchParams;
  const hasClient = Boolean(driveClient());
  const ready = driveReady();
  const callback = `${site.url}/api/admin/drive/callback`;
  const step = "border-b border-line px-4 py-4";

  return (
    <AdminShell
      user={user}
      title="원본 사진 보관 연결"
      desc="홈페이지에 올린 사진의 원본이 구글 드라이브를 거쳐 24시간 켜진 비스테이션에 쌓이게 합니다. PC 는 꺼져 있어도 됩니다."
    >
      <div className="max-w-[860px] space-y-8 text-[15px] leading-relaxed">
        {error === "client" && <p className="border-l-4 border-accent bg-white px-4 py-3">먼저 1단계의 두 값을 넣고 배포해야 «구글 연결»이 됩니다.</p>}
        <p className="font-bold">
          지금: <span className={ready ? "text-brand-700" : "text-accent-600"}>{ready ? "연결됨 — 원본이 드라이브로 갑니다" : "아직 연결 안 됨"}</span>
        </p>
        <ol className="border-t border-line bg-white">
          <li className={step}>
            <b>1. 구글 클라우드에서 «OAuth 클라이언트» 만들기</b> {hasClient && <span className="text-brand-700">— 됨</span>}
            <p className="mt-1 text-[14px] text-ink-500">
              console.cloud.google.com → 새 프로젝트 → «Google Drive API» 사용 설정 → OAuth 동의 화면(외부, 앱 이름 «수산나 홈페이지», 테스트 사용자에 회사 구글 계정
              추가) → 사용자 인증 정보 → OAuth 클라이언트 ID(웹 애플리케이션) → 승인된 리디렉션 URI 에 아래 주소를 그대로 넣기:
            </p>
            <code className="mt-2 block break-all bg-paper px-3 py-2 text-[13px]">{callback}</code>
            <p className="mt-2 text-[14px] text-ink-500">
              나온 두 값을 Cloudflare 대시보드 → Workers → susannadesgin → 설정 → 변수 및 비밀에 <b>Secret</b> 으로: <code>GDRIVE_CLIENT_ID</code>,{" "}
              <code>GDRIVE_CLIENT_SECRET</code>. (Plaintext 로 넣으면 다음 배포에 지워집니다.)
            </p>
          </li>
          <li className={step}>
            <b>2. 회사 구글 계정으로 연결</b>
            <p className="mt-1 text-[14px] text-ink-500">
              버튼을 누르면 구글 동의 화면이 뜹니다. 이 앱이 «만든 파일만» 다루는 권한입니다(드라이브의 다른 파일은 못 봅니다). 끝나면 «연결 열쇠»가 한 번 보이고, 그걸{" "}
              <code>GDRIVE_REFRESH_TOKEN</code> Secret 으로 넣습니다.
            </p>
            {hasClient ? (
              <a href="/api/admin/drive/auth" className="mt-3 inline-block bg-brand-700 px-5 py-2.5 text-[14px] font-bold text-white">
                구글 드라이브 연결
              </a>
            ) : (
              <p className="mt-2 text-[13px] text-accent-600">1단계가 끝나야 누를 수 있습니다.</p>
            )}
          </li>
          <li className={step}>
            <b>3. 비스테이션에서 드라이브 폴더 받아 오기</b>
            <p className="mt-1 text-[14px] text-ink-500">
              비스테이션 웹(portal.bee.synology.com) → BeeFiles → 클라우드 서비스 → Google Drive 연결(같은 회사 계정) → 폴더 «{DRIVE_ROOT_NAME}» 를{" "}
              <b>한 방향(One-way) 동기화</b>로. 한 방향이어야 드라이브에서 오래된 원본을 비워도 비스테이션엔 남습니다.
            </p>
          </li>
          <li className={step}>
            <b>4. 한 장 올려 확인</b>
            <p className="mt-1 text-[14px] text-ink-500">
              현장 폴더에 사진 한 장 → 사진 아래 «원본 전송됨» → 드라이브에 «{DRIVE_ROOT_NAME}/연도/월-일 현장명» 폴더 → 잠시 뒤 비스테이션에도 생기는지. 받아 가는
              간격은 비스테이션이 정합니다(확인 필요).
            </p>
          </li>
        </ol>
        <section>
          <h2 className="text-[17px] font-black">드라이브 비우기</h2>
          <p className="mt-1 text-[14px] text-ink-500">
            드라이브는 중간 보관함입니다. 30일 지난 원본을 드라이브에서 지웁니다 — 한 방향 동기화라 비스테이션엔 남습니다. 이 앱이 올린 파일만 지웁니다. ⚠️ 비스테이션이 그동안
            꺼져 있었다면 누르지 마세요.
          </p>
          <DrivePurgeButton disabled={!ready} />
        </section>
      </div>
    </AdminShell>
  );
}
