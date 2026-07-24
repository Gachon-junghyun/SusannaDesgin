import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * Cloudflare Workers 어댑터 설정.
 *
 * ⚠️ 여기에 캐시 저장소(R2 등)를 붙이지 않았습니다. **의도한 것입니다.**
 *
 * OpenNext 는 기본 캐시 저장소가 없고, 저장소 없이 ISR(`export const revalidate`)을
 * 쓰면 요청마다 페이지를 다시 만들려다 `waitUntil` 타임아웃이 납니다.
 * (실제로 그렇게 배포했다가 응답이 4초 넘게 걸리고 경고가 쏟아졌습니다.)
 *
 * 그래서 ISR 을 아예 걷어내고 필요한 페이지만 요청 시 렌더링합니다.
 * 대신 CDN 캐시 헤더(`next.config.ts` 의 headers)로 같은 효과를 냅니다.
 * SSR 은 저장소 없이도 정상 동작합니다.
 *
 * 트래픽이 커져 ISR 이 필요해지면 그때 R2 를 붙이세요:
 *   https://opennext.js.org/cloudflare/caching
 */
export default defineCloudflareConfig();
