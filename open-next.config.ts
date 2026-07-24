import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * Cloudflare Workers 어댑터 설정.
 *
 * 기본값 그대로 씁니다. ISR 캐시를 Cloudflare KV 에 붙이는 옵션이 있지만,
 * 이 사이트는 관리자가 저장할 때 `revalidatePath` 로 즉시 다시 굽는 구조라
 * 없어도 정상 동작합니다. 나중에 트래픽이 커지면 그때 붙이면 됩니다.
 */
export default defineCloudflareConfig();
