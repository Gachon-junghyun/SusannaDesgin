import { site } from "@/config/site";

/**
 * IndexNow 키 파일.
 *
 * 검색엔진은 "새 주소가 생겼다"는 통보를 받으면 **이 주소를 먼저 읽어서**
 * 통보에 실린 키와 같은지 봅니다. 같으면 사이트 주인이 보낸 것으로 인정합니다.
 * 계정도 로그인도 없이 소유권을 증명하는 방식이 이것뿐이라 필요합니다.
 *
 * ⚠️ **본문은 키 한 줄뿐이어야 합니다.** 공백·줄바꿈·BOM 이 섞이면 403 이 납니다.
 *
 * 왜 `public/<키>.txt` 가 아니라 라우트인가:
 *   표준은 `https://도메인/<키>.txt` 지만 그러면 키 값이 **파일 이름과 config
 *   양쪽에** 존재하게 되어, 키를 바꿀 때 한쪽만 고치면 조용히 깨집니다.
 *   IndexNow 규격은 통보에 `keyLocation` 을 실어 **아무 주소나 지정**할 수 있게
 *   허용하므로(스펙 §2), 키의 출처를 `config/site.ts` 한 곳으로 모았습니다. [원칙 A5]
 *   `scripts/submit-indexnow.mjs` 가 이 주소를 `keyLocation` 으로 함께 보냅니다.
 */
export const dynamic = "force-static";

export function GET() {
  return new Response(site.indexNowKey, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
