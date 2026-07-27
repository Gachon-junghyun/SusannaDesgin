/**
 * IndexNow — 검색엔진에 "우리 사이트 주소들 지금 다시 읽어라" 하고 즉시 통보합니다.
 *
 *   npm run indexnow
 *
 * 왜 필요한가: 새 도메인은 아무도 링크해 주지 않으면 검색엔진이 존재 자체를
 * 모릅니다. 사이트맵을 올려 둬도 **찾아와야 읽습니다.** IndexNow 는 그 순서를
 * 뒤집어 우리가 먼저 알려주는 방식입니다.
 *
 * ⚠️ **구글은 IndexNow 에 참여하지 않습니다.** 구글은 Search Console 등록 외에
 *    길이 없습니다(docs/SEO.md C 섹션). 이 명령으로 열리는 곳은 아래뿐입니다.
 *
 *      Bing      → ChatGPT · Perplexity · Copilot 이 읽는 인덱스
 *      네이버     → ⚠️ 서치어드바이저 등록이 선행돼야 실효가 있습니다
 *      Yandex · Seznam · Yep · Internet Archive · Amazonbot
 *
 * 언제 다시 실행하나: 페이지를 새로 만들거나 실적을 크게 늘린 뒤. 매일 돌릴
 * 필요는 없고, 같은 주소를 반복 제출하면 429(너무 잦음)가 날 수 있습니다.
 */

import { readFileSync } from "node:fs";

const G = (s) => `\x1b[32m${s}\x1b[0m`;
const R = (s) => `\x1b[31m${s}\x1b[0m`;
const Y = (s) => `\x1b[33m${s}\x1b[0m`;
const D = (s) => `\x1b[2m${s}\x1b[0m`;

/**
 * ⚠️ 이 스크립트는 `process.exit()` 를 쓰지 않습니다.
 *    fetch 소켓이 닫히는 중에 종료되면 Windows 에서 libuv assertion 경고가
 *    찍힙니다(`check-notify.mjs` 끝의 주석과 같은 이유). 그래서 전 구간을
 *    main() 안에 두고 **return 으로 빠져나온 뒤 자연 종료**시킵니다.
 */
async function main() {
  /**
   * 값은 `config/site.ts` 에서 읽어 옵니다. 여기 적어 두면 config 와 어긋납니다. [원칙 A5]
   * (plain JS 라 TS 를 import 할 수 없어 파일에서 뽑아냅니다 — check-notify.mjs 와 같은 방식)
   */
  const src = readFileSync("config/site.ts", "utf8");
  const pick = (re) => src.match(re)?.[1];

  const rawCanonical = pick(/^export const CANONICAL_URL = ["']([^"']+)["']/m);
  const key = pick(/^\s*indexNowKey:\s*["']([^"']+)["']/m);

  if (!rawCanonical || !key) {
    console.log(
      R(`\nconfig/site.ts 에서 ${!rawCanonical ? "CANONICAL_URL" : "indexNowKey"} 를 찾지 못했습니다.\n`)
    );
    return 1;
  }

  const canonical = rawCanonical.replace(/\/$/, "");
  const host = new URL(canonical).host;
  const keyLocation = `${canonical}/indexnow.txt`;

  console.log(`\n\x1b[1mIndexNow 제출\x1b[0m  ${D(canonical)}\n`);

  /* 1 ─ 키 파일이 실제로 서비스되는지. 이게 안 되면 전부 403 이라 먼저 막습니다. */
  try {
    const res = await fetch(keyLocation, { signal: AbortSignal.timeout(15000) });
    const body = (await res.text()).trim();
    if (!res.ok) {
      console.log(`  ${R("✘")} 키 파일  ${keyLocation}  (HTTP ${res.status})`);
      console.log(D(`     → app/indexnow.txt/route.ts 가 배포됐는지 확인하세요.`));
      console.log(D(`       코드를 방금 고쳤다면 git push 후 배포가 끝나야 합니다.\n`));
      return 1;
    }
    if (body !== key) {
      console.log(`  ${R("✘")} 키 불일치`);
      console.log(D(`     운영: ${body.slice(0, 60)}`));
      console.log(D(`     설정: ${key}`));
      console.log(D(`     → config/site.ts 를 고친 뒤 배포하지 않았을 때 납니다.\n`));
      return 1;
    }
    console.log(`  ${G("✔")} 키 파일  ${D(keyLocation)}`);
  } catch (e) {
    console.log(`  ${R("✘")} 키 파일을 못 읽었습니다 (${e.message})\n`);
    return 1;
  }

  /* 2 ─ 제출할 주소 목록. 운영 사이트맵을 그대로 씁니다 (app/sitemap.ts 가 원본). */
  let urlList = [];
  try {
    const res = await fetch(`${canonical}/sitemap.xml`, { signal: AbortSignal.timeout(15000) });
    const xml = await res.text();
    urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  } catch (e) {
    console.log(`  ${R("✘")} 사이트맵을 못 읽었습니다 (${e.message})\n`);
    return 1;
  }

  if (!urlList.length) {
    console.log(`  ${R("✘")} 사이트맵이 비어 있습니다.\n`);
    return 1;
  }
  console.log(`  ${G("✔")} 사이트맵  ${urlList.length}개 주소\n`);

  /* 3 ─ 통보. api.indexnow.org 가 참여사 전체로 퍼뜨리지만, 정작 중요한 두 곳은
   *     따로도 찔러 둡니다 — 중계가 늦거나 빠져도 직접 도달하게. 중복은 무해합니다. */
  const endpoints = [
    ["전체 중계", "https://api.indexnow.org/indexnow"],
    ["Bing", "https://www.bing.com/indexnow"],
    ["네이버", "https://searchadvisor.naver.com/indexnow"],
  ];

  const payload = JSON.stringify({ host, key, keyLocation, urlList });
  let bad = 0;

  for (const [name, api] of endpoints) {
    try {
      const res = await fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: payload,
        signal: AbortSignal.timeout(20000),
      });

      // 200 = 받았음 / 202 = 받았고 키 확인 중. 둘 다 정상입니다.
      if (res.status === 200 || res.status === 202) {
        const note = res.status === 202 ? "접수 — 키 확인 중" : "접수";
        console.log(`  ${G("✔")} ${name.padEnd(9)} ${D(`${note} (HTTP ${res.status})`)}`);
        continue;
      }

      bad++;
      const body = (await res.text()).slice(0, 200);
      console.log(`  ${R("✘")} ${name.padEnd(9)} HTTP ${res.status}  ${D(body)}`);
      if (res.status === 403)
        console.log(D(`     → 키 파일을 못 읽었다는 뜻입니다. ${keyLocation} 를 브라우저로 열어 보세요.`));
      else if (res.status === 422)
        console.log(D(`     → 주소가 ${host} 소속이 아니거나 키가 안 맞습니다.`));
      else if (res.status === 429)
        console.log(D(`     → 너무 자주 보냈습니다. 하루쯤 뒤에 다시 하세요. (앞의 접수는 유효합니다)`));
    } catch (e) {
      bad++;
      console.log(`  ${R("✘")} ${name.padEnd(9)} ${e.message}`);
    }
  }

  console.log(
    bad === endpoints.length
      ? R("\n● 전부 실패했습니다. 위 안내를 보고 고친 뒤 다시 실행하세요.\n")
      : bad
        ? Y("\n● 일부만 접수됐습니다. 한 곳이라도 접수되면 참여사끼리 공유되므로 대개 괜찮습니다.\n")
        : G("\n● 접수 완료.\n") +
          D("  색인까지는 며칠 걸립니다. 즉시 반영되는 게 아닙니다.\n") +
          D("  구글은 이 경로에 없습니다 — Search Console 등록이 따로 필요합니다.\n")
  );

  return bad === endpoints.length ? 1 : 0;
}

process.exitCode = await main();
