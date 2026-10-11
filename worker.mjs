/**
 * 공개 페이지 HTML 캐시 — OpenNext 워커 앞에 얹은 얇은 층 (2026-10-11).
 *
 * 왜: 공개 페이지는 전부 `force-dynamic` 이라 방문 1회 = SSR 1회 + DB 조회 3건입니다
 * (§7.2 SSR 부채). 한국 접속이 Cloudflare LAX 로 붙어서(무료 요금제 — Pro·Business 로
 * 올려도 KT 에선 안 바뀌는 걸 실측했습니다) DB 왕복이 바다를 건넙니다. 따뜻한 홈 서버
 * 몫이 약 0.4초였고, 이 층이 그걸 0 에 가깝게 만듭니다.
 *
 * 왜 Cache Rules 가 아니라 여기인가: 워커가 앞에 서 있는 사이트는 Cache Rules 가
 * 워커 응답을 담지 않습니다. 그래서 워커 안에서 Cache API(`caches.default`)를 씁니다.
 * 설정이 대시보드가 아니라 저장소에 남는다는 것도 F13 과 같은 이유로 맞습니다.
 *
 * 🔴 **지키는 것 넷** (ARCHITECTURE §0 A3 예외 · §7.2 «같이 갚아야 하는 한 쌍»)
 *   1. **로그인(`sb-…`)·미리보기(`susanna-preview`) 쿠키가 있으면 캐시를 «읽지도 쓰지도»
 *      않습니다.** 대표님이 보던 새 디자인이 손님에게 새는 걸 막는 줄입니다.
 *   2. **담는 건 손님 화면 HTML 뿐** — GET · 아래 PATHS 의 정확한 주소 · RSC/프리페치 요청 아님
 *      · 200 · `text/html` · `Set-Cookie` 없음. `/quote` 는 주소 뒤 값(`?item=`)을 읽어서 뺐습니다.
 *   3. **배포가 바뀌면 열쇠가 바뀝니다**(`CF_VERSION_METADATA`). 옛 HTML 이 지워진 옛 JS
 *      조각을 가리키는 깨진 화면을 막습니다.
 *   4. **관리자가 화면에서 저장하면(POST + 로그인 쿠키) 담아 둔 것을 지웁니다.**
 *      ⚠️ `npm run cms` 처럼 DB 를 직접 고치면 워커를 안 지나서 못 지웁니다 —
 *      그때는 «다음 손님 한 명»이 옛 화면을 보고, 그 손님이 새로 그려 둡니다(아래 신선도).
 *
 * 신선도: 담은 지 60초 안이면 그대로, 넘었으면 **옛 것을 바로 주고 뒤에서 새로 그립니다**
 * (stale-while-revalidate). 하루 손님이 몇 명인 사이트라 «60초 지나면 버린다»로 하면
 * 캐시가 늘 비어 있어 아무도 이득을 못 봅니다. 하루가 넘은 건 버립니다.
 *
 * 응답 헤더 `x-sd-cache: HIT | STALE | MISS | BYPASS` 로 어느 길로 갔는지 보입니다.
 * 브라우저 쪽 `Cache-Control`(no-store)은 그대로 둡니다 — 담는 곳은 Cloudflare 한 곳뿐입니다.
 */

// OpenNext 빌드 산출물(`cf:build` 가 만든다) — wrangler 가 묶을 때 풀립니다
import openNext from "./.open-next/worker.js";
// 같은 산출물의 Durable Object 클래스를 그대로 내보냅니다(원래 워커가 내보내던 것)
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";

/** 담는 주소 — 화이트리스트입니다. 새 공개 페이지는 여기 한 줄을 더해야 담깁니다. */
const PATHS = new Set(["/", "/works", "/about", "/process", "/signs", "/sign-design", "/support"]);

const FRESH_MS = 60 * 1000;
const MAX_STALE_S = 24 * 60 * 60;

/** 광고·추적 꼬리표 — HTML 이 이 값을 안 읽으므로 열쇠에서 뺍니다(광고로 온 손님도 캐시를 탑니다). */
const TRACKING = /^(utm_.*|gclid|gbraid|wbraid|fbclid|msclkid|_gl|n_.*|NaPm|internal)$/i;

const BYPASS_COOKIE = /(?:^|;\s*)(sb-[^=]*|susanna-preview)=/;

function cacheable(request, url) {
  if (request.method !== "GET") return false;
  if (!PATHS.has(url.pathname)) return false;
  if (BYPASS_COOKIE.test(request.headers.get("cookie") || "")) return false;
  const h = request.headers;
  if (h.get("rsc") || h.get("next-router-prefetch") || h.get("next-router-state-tree") || h.get("next-action")) return false;
  if (url.searchParams.has("_rsc")) return false;
  return true;
}

function cacheKey(url, env) {
  const k = new URL(url.origin + url.pathname);
  for (const [name, value] of url.searchParams) if (!TRACKING.test(name)) k.searchParams.append(name, value);
  k.searchParams.set("__v", env.CF_VERSION_METADATA?.id || "dev");
  return new Request(k.toString(), { method: "GET" });
}

function storable(res) {
  return (
    res.status === 200 &&
    !res.headers.has("set-cookie") &&
    (res.headers.get("content-type") || "").includes("text/html")
  );
}

/** 원본 응답을 담을 사본으로 바꿉니다. 원본의 no-store 를 Cloudflare 보관용 수명으로만 바꿉니다. */
function toStored(res) {
  const copy = new Response(res.body, res);
  copy.headers.set("cache-control", `public, max-age=${MAX_STALE_S}`);
  copy.headers.set("x-sd-cached-at", String(Date.now()));
  return copy;
}

/** 손님에게 줄 때는 원래대로 브라우저가 담지 않게 돌려놓습니다. */
function toClient(res, state) {
  const out = new Response(res.body, res);
  out.headers.set("cache-control", "private, no-cache, no-store, max-age=0, must-revalidate");
  out.headers.delete("x-sd-cached-at");
  out.headers.set("x-sd-cache", state);
  return out;
}

async function render(request, env, ctx, cache, key) {
  const res = await openNext.fetch(request, env, ctx);
  if (!storable(res)) return { res, stored: false };
  const [a, b] = res.body ? res.body.tee() : [null, null];
  const forClient = new Response(a, res);
  ctx.waitUntil(cache.put(key, toStored(new Response(b, res))).catch(() => {}));
  return { res: forClient, stored: true };
}

async function purge(origin, env) {
  if (typeof caches === "undefined" || !caches.default) return;
  const cache = caches.default;
  await Promise.all([...PATHS].map((p) => cache.delete(cacheKey(new URL(origin + p), env))));
}

const cacheLayer = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (!cacheable(request, url)) {
      const res = await openNext.fetch(request, env, ctx);
      // 관리자 화면 저장(서버 액션 POST) 뒤에는 담아 둔 공개 화면을 지웁니다 — 지키는 것 4
      if (request.method === "POST" && BYPASS_COOKIE.test(request.headers.get("cookie") || "")) {
        ctx.waitUntil(purge(url.origin, env).catch(() => {}));
      }
      if (request.method === "GET" && PATHS.has(url.pathname)) return toClient(res, "BYPASS");
      return res;
    }

    // Cache API 가 없는 곳(로컬 next dev 등)에서는 그냥 통과합니다 — A1 «절대 죽지 않는다»
    if (typeof caches === "undefined" || !caches.default) return openNext.fetch(request, env, ctx);

    const cache = caches.default;
    const key = cacheKey(url, env);

    let hit = null;
    try {
      hit = await cache.match(key);
    } catch {
      hit = null;
    }

    if (hit) {
      const age = Date.now() - Number(hit.headers.get("x-sd-cached-at") || 0);
      if (age < FRESH_MS) return toClient(hit, "HIT");
      // 오래됐으면 옛 것을 바로 주고, 새로 그리는 건 손님을 안 기다리게 뒤로 돌립니다
      ctx.waitUntil(
        (async () => {
          const res = await openNext.fetch(new Request(request), env, ctx);
          if (storable(res)) await cache.put(key, toStored(res));
        })().catch(() => {}),
      );
      return toClient(hit, "STALE");
    }

    const { res } = await render(request, env, ctx, cache, key);
    return toClient(res, "MISS");
  },
};

export default cacheLayer;
