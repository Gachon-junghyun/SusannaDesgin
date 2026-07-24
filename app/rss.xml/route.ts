import { getWorks } from "@/lib/cms";
import { seo, site } from "@/config/site";

/**
 * RSS 피드.
 *
 * 네이버 서치어드바이저는 사이트맵과 **RSS 를 함께** 제출받습니다.
 * 사이트맵이 "이런 주소들이 있다"면, RSS 는 "최근에 이런 게 새로 올라왔다"를 알려서
 * 수집 주기를 앞당기는 쪽에 가깝습니다. 시공사례가 늘어날 때마다 자동 반영됩니다.
 *
 * 등록: searchadvisor.naver.com → 사이트 관리 → 요청 → RSS 제출
 *       주소는 https://도메인/rss.xml
 */
/** 요청 시 생성 — 이유는 `app/page.tsx` 의 dynamic 설정 주석 참고. */
export const dynamic = "force-dynamic";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const works = await getWorks();
  const now = new Date().toUTCString();

  // 시공사례를 항목으로 내보냅니다. 개별 상세 페이지가 생기면 link 를 그쪽으로 바꿉니다.
  const items = works
    .map((w) => {
      const title = [w.location, w.title].filter(Boolean).join(" ");
      const desc = [w.category, ...(w.tags ?? [])].filter(Boolean).join(" · ");
      return `    <item>
      <title>${escapeXml(title)}</title>
      <link>${site.url}/works</link>
      <guid isPermaLink="false">${escapeXml(`${site.url}/works#${w.slug}`)}</guid>
      <description>${escapeXml(`${desc} — ${site.name} 시공사례`)}</description>
      <category>${escapeXml(w.category)}</category>
      <pubDate>${now}</pubDate>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(seo.homeTitle)}</title>
    <link>${site.url}</link>
    <description>${escapeXml(seo.homeDescription)}</description>
    <language>ko</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${site.url}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=600",
    },
  });
}
