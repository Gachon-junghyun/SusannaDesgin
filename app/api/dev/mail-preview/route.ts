import { asHtml } from "@/lib/notify";

/**
 * 견적 알림 **메일 모양 미리보기** — 개발 전용.
 *
 *   npm run dev  후  http://localhost:3000/api/dev/mail-preview
 *
 * 메일 본문을 고칠 때 실제로 어떻게 보이는지 확인하는 용도입니다.
 * 진짜 메일을 보내지 않고, 가짜 문의를 DB 에 넣지도 않습니다.
 *
 * ⚠️ **운영에서는 404 를 냅니다.** 회사 메일 서식이 외부에 노출될 이유가 없고,
 *    개발용 화면이 운영 주소에 열려 있는 것 자체가 좋지 않습니다.
 *    `app/robots.ts` 가 `/api/` 를 막고 있지만 그건 검색엔진 대상일 뿐이라,
 *    코드에서 직접 닫습니다.
 */
export const dynamic = "force-dynamic";

const SAMPLE = {
  kind: "full",
  name: "김철수",
  phone: "010-1234-5678",
  email: "customer@example.com",
  region: "대전 서구 둔산동",
  signType: "LED 채널간판",
  timing: "1개월 이내",
  address: "대전광역시 서구 둔산로 100 3층",
  message:
    "1층 상가 전면에 LED 채널간판 설치하려고 합니다.\n간판 크기는 가로 6m 정도이고, 야간 조명도 함께 보고 있습니다.\n현장 실측 가능한 날짜 알려주시면 감사하겠습니다.",
  // 세 경우를 한 화면에서 보려고 일부러 섞어 둡니다
  files: [
    { name: "매장 전면 사진.jpg", stored: true, attached: true },
    { name: "간판 시안 원본.ai", stored: true, attached: false }, // 커서 화면에서 받는 경우
    { name: "도면.dwg", stored: false, attached: false }, // 업로드가 실패한 경우
  ],
  receivedAt: new Date().toISOString(),
};

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not Found", { status: 404 });
  }

  return new Response(asHtml(SAMPLE), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
