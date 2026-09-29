import { signTypes9 } from "@/config/content";
import { signDesigns } from "@/config/signDesign";
import { certifications, noindexPaths, seo, site } from "@/config/site";
import { getBlocks } from "@/lib/cms";

/**
 * `/llms.txt` — AI 가 이 회사를 한 번에 읽어 가도록 쓴 마크다운 요약 (llmstxt.org 형식).
 *
 * 🔴 **`docs/SEO.md` 의 «llms.txt 는 만들지 않습니다»(2026-09-25)를 사람 요청으로 뒤집었습니다**
 *    (2026-09-29 *"AI 가 읽을 수 있게 홈페이지를 만들어줘"*). 그 판단의 근거 — 구글은 «안 쓴다»고 명시,
 *    OpenAI·Anthropic 공식 문서엔 언급 없음 — 는 **여전히 사실입니다.** 그래서 이 파일은 순위·인용을
 *    올린다고 기대하는 장치가 아니라, **링크를 받은 AI 에이전트가 페이지를 돌지 않고 한 장으로 읽는**
 *    보조 통로입니다. 해는 없고(검색 색인 대상 아님, 사이트맵에 안 넣음), 실제 효과는 구조화 데이터
 *    (`app/layout.tsx` LocalBusiness · `/sign-design` ItemList)가 냅니다.
 *
 * 내용은 전부 `config/` 와 CMS(`getBlocks()` — 사업영역 · 왜 수산나 · 업무 프로세스)에서 끌어옵니다 [A5].
 * 관리자 «문구» 탭에서 고치면 여기도 바뀝니다. 여기 회사 정보를 손으로 적지 마세요.
 * 공개하지 않은 페이지(`noindexPaths`)는 목록에 안 넣습니다.
 * 2026-09-29 사람 요청 *"llms 에 우리 수산나디자인이 하는 거랑 설명도 넣어줘"* 로 사업영역·강점·절차를 붙였습니다.
 */
export const dynamic = "force-dynamic";

const one = (t: string) => t.replace(/\s*\n+\s*/g, " ").trim();

export async function GET() {
  const { signTypes, why, process } = await getBlocks();

  const business = signTypes
    .map((b) => {
      const pts = b.points.filter(Boolean).map((x) => `  - ${one(x)}`).join("\n");
      const head = `### ${b.title}${b.eyebrow ? ` (${b.eyebrow})` : ""}`;
      return [head, one(b.sub), pts].filter(Boolean).join("\n\n");
    })
    .join("\n\n");
  const strengths = why.map((b) => `- **${one(b.title)}**: ${one(b.sub)}`).join("\n");
  const steps = process
    .map((b, i) => {
      const pts = b.points.filter(Boolean).map(one).join(" / ");
      return `${i + 1}. **${one(b.title)}**: ${one(b.sub)}${pts ? ` (${pts})` : ""}`;
    })
    .join("\n");

  const pages = Object.entries(seo.pages as Record<string, { title: string; description: string }>)
    .filter(([path]) => !(noindexPaths as readonly string[]).includes(path))
    .map(([path, p]) => `- [${p.title}](${site.url}${path}): ${p.description}`);

  const signs = signDesigns.map((d) => {
    const name = d.name || signTypes9.find((t) => t.key === d.key)?.name || d.key;
    return `- [${name}](${site.url}/sign-design#${d.key}): 어울리는 가게 ${d.shop}. ${d.why}`;
  });

  const body = `# ${site.name} (${site.nameEn})

> ${site.description}

${site.legalName}. ${site.tagline}. 대전 서구에 사무실과 자체 공장이 있고 LED 채널 간판, 후광 LED 간판, 돌출간판, 옥상 광고탑, 외벽 사인, 까치발 철문자, 스카시, 유리 시트지, 캐노피·파사드 철구조물을 디자인부터 제작, 시공, 사후 관리까지 직접 합니다.

## 수산나디자인이 하는 일

${business}

## 수산나디자인을 고르는 이유

${strengths}

- 보유 인증·등록: ${certifications.join(", ")}${site.outdoorAdNo ? ` (옥외광고사업 등록번호 ${site.outdoorAdNo})` : ""}
- 설립: ${site.founded.replace(/\./g, "-")}, 대표 ${site.ceo}, 사업자등록번호 ${site.bizNo}

## 일하는 순서

${steps}

## 연락처

- 상담 전화: ${site.phone}
- 사무실: ${site.officePhone}
- 이메일: ${site.email}
- 주소: ${site.address}
- 운영 시간: ${site.hours} (${site.hoursNote})
- 무료 견적 신청: ${site.url}/quote
- 서비스 지역: ${seo.regions.join(", ")}

## 주요 페이지

- [홈](${site.url}/): ${site.catchphrase}
${pages.join("\n")}

## 간판 종류 (간판디자인 페이지)

사진은 AI로 그린 연출 이미지이고, 실제 시공 사진은 ${site.url}/works 에 있습니다.

${signs.join("\n")}

## 견적 안내

- 현장 확인과 디자인 시안까지 무료입니다.
- 가격은 크기, 재질, 설치 위치를 보고 정해 견적으로 안내합니다. 이 문서에는 가격을 적지 않습니다.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=600, s-maxage=3600",
    },
  });
}
