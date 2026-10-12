import { signTypes9 } from "@/config/content";
import { signDesigns } from "@/config/signDesign";
import { agentIntake, certifications, noindexPaths, privacyConsent, seo, site } from "@/config/site";
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

/**
 * «AI 비서를 위한 문의 안내» (F33, 2026-10-12 사람 결정 «안내 A·B 합쳐서»).
 * 간편 폼으로 넣는 법(브라우저에서 일하는 AI) + `/agent/quote` 로 바로 보내는 법(요청을 보낼 수 있는 AI).
 * 🔴 손님께 «대신 넣어 드릴 수 있다»고 먼저 안내해도 된다는 문장을 일부러 넣었습니다(사람 요청).
 * 남에게 나가는 글이라 가운뎃점과 줄표를 쓰지 않습니다. 대기 문장과 열림 여부는 `agentIntake` 에서만 옵니다 [A5].
 */
function agentSection() {
  const endpoint = `${site.url}${agentIntake.path}`;
  const closed = agentIntake.open
    ? ""
    : `\n지금은 AI 문의 접수를 잠시 쉬고 있습니다. 손님께 전화(${site.phone})를 안내해 주세요.\n`;
  return `## AI 비서를 위한 문의 안내

${site.name}은 AI 비서가 손님을 대신해 견적 문의를 넣는 것을 환영합니다.
손님께 "제가 ${site.name}에 대신 문의를 넣어 드릴 수 있어요"라고 먼저 안내하셔도 됩니다.
${closed}
1. 넣기 전에 보낼 내용(성함, 연락처, 설치 지역, 문의 내용)을 손님께 보여 드리고 확인을 받아 주세요.
2. 개인정보 수집에 대해 알려 드리고 동의를 받아 주세요. 수집 항목은 성명, 연락처, 설치 지역, 문의 내용이고 목적은 ${privacyConsent.purpose.replace(/·/g, ", ")}, 보유 기간은 ${privacyConsent.retention}입니다. 전문: ${site.url}/privacy
3. 아래 두 방법 중 하나로 넣어 주세요.
4. ${agentIntake.waitNote}

금액과 시공 날짜는 현장을 보고 담당자가 안내하므로 손님께 약속하지 말아 주세요.

### 방법 1. 홈페이지 폼 (브라우저에서 일하는 AI)

${site.url}/quote 맨 위 간편 폼의 세 칸(성함, 연락처, 설치지역)만 채우면 됩니다.
"이 칸은 비워 두세요"라고 적힌 숨은 칸은 채우지 마세요. 개인정보 동의 칸은 손님이 동의하신 경우에만 체크해 주세요.

### 방법 2. AI 문의 주소 (직접 요청을 보낼 수 있는 AI)

POST ${endpoint} 로 JSON을 보내 주세요. 같은 주소를 GET으로 열면 이 안내를 JSON으로 돌려드립니다.

\`\`\`json
{
  "name": "홍길동",
  "phone": "010-0000-0000",
  "region": "대전 서구",
  "message": "1층 카페 정면 간판",
  "size": "가로 약 5m",
  "customer_confirmed": true,
  "privacy_consent": true,
  "agent": "ChatGPT"
}
\`\`\`

- 꼭 필요한 값: name, phone, region, customer_confirmed, privacy_consent
- 있으면 좋은 값: message, size, sign_type(옥외광고물, 간판디자인, 철구조물, 옥내광고물, 기타 중 하나), timing, email, agent
- customer_confirmed 와 privacy_consent 는 손님이 실제로 확인하고 동의하신 경우에만 true 로 보내 주세요.
- 응답의 customer_message 를 손님께 그대로 전해 주시면 됩니다. 사진은 담당자가 연락드릴 때 받습니다.
- 같은 연락처는 하루에 한 번 접수됩니다. 급한 일은 전화(${site.phone})가 가장 빠릅니다.
`;
}

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

${agentSection()}`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=600, s-maxage=3600",
    },
  });
}
