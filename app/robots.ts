import type { MetadataRoute } from "next";
import { site } from "@/config/site";

/**
 * AI 답변 엔진 크롤러.
 *
 * **왜 따로 적어 두는가**
 * Cloudflare 가 우리 `robots.txt` **앞에** 자기 "관리형" 블록을 끼워 넣고,
 * 거기서 이 봇들을 `Disallow: /` 로 막습니다(신규 도메인 기본값).
 * 그러면 "대전 간판업체 추천해줘" 같은 질문에 이 사이트가 인용될 길이 막힙니다.
 *
 * robots.txt 규칙은 **같은 User-agent 그룹끼리 합쳐지고, 똑같이 구체적인
 * Allow 와 Disallow 가 부딪히면 Allow 가 이깁니다**(RFC 9309 · 구글 문서).
 * 그래서 우리가 각 봇을 이름으로 지목해 `Allow: /` 를 선언하면 대개 뒤집힙니다.
 *
 * ⚠️ **다만 이건 보조 장치입니다.** 확실하게 풀려면 Cloudflare 대시보드에서
 *    관리형 robots.txt(AI Crawl Control)를 끄세요. 규칙 해석은 크롤러마다
 *    조금씩 달라서 100% 보장은 아닙니다. 자세한 건 `docs/SEO.md` 참조.
 *
 * ⚠️ 아래 그룹에도 `/api/` `/admin` 차단을 **똑같이 넣어야 합니다.**
 *    크롤러는 자기 이름의 그룹이 있으면 `*` 그룹을 아예 보지 않으므로,
 *    빼먹으면 이 봇들에게만 관리자 화면이 열립니다.
 */
const AI_CRAWLERS = [
  // OpenAI — 검색 인용(OAI-SearchBot)·학습(GPTBot)·사용자 요청 열람(ChatGPT-User)
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  // Anthropic
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  // Perplexity
  "PerplexityBot",
  "Perplexity-User",
  // 구글 AI(제미나이·AI 개요) · 애플 인텔리전스
  "Google-Extended",
  "Applebot-Extended",
  // 그 외 Cloudflare 기본 차단 목록에 들어 있는 것들
  "Amazonbot",
  "meta-externalagent",
  "Bytespider",
  "CCBot",
];

/** 공개해도 되는 것과 안 되는 것 — 모든 그룹이 이 정책을 공유합니다. */
const POLICY = {
  allow: "/",
  // 관리자 화면은 검색 결과에 뜨면 안 됩니다.
  // (각 페이지의 noindex 메타태그와 이중으로 막습니다)
  disallow: ["/api/", "/admin"],
};

export default function robots(): MetadataRoute.Robots {
  // 임시 주소(*.workers.dev 등)에서는 통째로 막습니다.
  // 임시 주소가 검색에 잡히면 나중에 진짜 도메인과 중복 콘텐츠가 되어
  // 서로 순위를 깎아먹습니다.
  if (!site.isProductionDomain) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: [
      { userAgent: "*", ...POLICY },
      { userAgent: AI_CRAWLERS, ...POLICY },
    ],
    sitemap: `${site.url}/sitemap.xml`,
  };
}
