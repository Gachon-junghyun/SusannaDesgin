import "server-only";

import {
  equipment as fallbackFab,
  sectionCopy as fallbackCopy,
  signTypes as fallbackSignTypes,
  slides as fallbackSlides,
  steps as fallbackSteps,
  whyPoints as fallbackWhy,
  works as fallbackWorks,
} from "@/config/content";
import type { SectionCopy, Slide, Work } from "@/config/content";
import { createPublicClient } from "@/lib/supabase/public";
import type { ContentBlockRow, HeroSlideRow, WorkRow } from "@/lib/supabase/types";

/**
 * 공개 페이지가 콘텐츠를 읽는 유일한 통로입니다.
 *
 * 규칙: **어떤 이유로든 DB 를 못 읽으면 `config/content.ts` 내용을 씁니다.**
 * Supabase 를 아직 안 만들었거나, 키가 틀렸거나, 잠시 장애가 나도
 * 회사 홈페이지가 빈 화면이 되는 일은 없어야 하기 때문입니다.
 */

function rowToSlide(r: HeroSlideRow): Slide {
  return {
    eyebrow: r.eyebrow,
    title: r.title,
    sub: r.sub,
    image: r.image_url,
    alt: r.alt,
  };
}

function rowToWork(r: WorkRow): Work {
  return {
    slug: r.id,
    title: r.title,
    category: r.category,
    location: r.location,
    tags: r.tags ?? [],
    image: r.image_url,
  };
}

export async function getSlides(): Promise<Slide[]> {
  const supabase = createPublicClient();
  if (!supabase) return fallbackSlides;

  try {
    const { data, error } = await supabase
      .from("hero_slides")
      .select("*")
      .eq("published", true)
      .order("sort_order", { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) return fallbackSlides;

    return (data as HeroSlideRow[]).map(rowToSlide);
  } catch (e) {
    console.error("[cms] 히어로 슬라이드를 못 읽어 기본 내용으로 대체합니다.", e);
    return fallbackSlides;
  }
}

export async function getWorks(): Promise<Work[]> {
  const supabase = createPublicClient();
  if (!supabase) return fallbackWorks;

  try {
    const { data, error } = await supabase
      .from("works")
      .select("*")
      .eq("published", true)
      .order("sort_order", { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) return fallbackWorks;

    return (data as WorkRow[]).map(rowToWork);
  } catch (e) {
    console.error("[cms] 주요실적을 못 읽어 기본 내용으로 대체합니다.", e);
    return fallbackWorks;
  }
}

// ---------------------------------------------------------------
// 페이지 문구 블록 (F19)
// ---------------------------------------------------------------

/** 화면이 쓰는 모양. DB 행과 config 폴백이 둘 다 이걸로 변환됩니다. */
export type Block = {
  slug: string;
  eyebrow: string;
  title: string;
  sub: string;
  points: string[];
  image: string;
  alt: string;
};

export type SiteBlocks = {
  /** 구역 머리말 — `slug` 로 집어 옵니다 (예: "home-fabrication") */
  copy: Record<string, SectionCopy>;
  why: Block[];
  process: Block[];
  fabrication: Block[];
  signTypes: Block[];
};

function block(b: Partial<Block>): Block {
  return {
    slug: "",
    eyebrow: "",
    title: "",
    sub: "",
    points: [],
    image: "",
    alt: "",
    ...b,
  };
}

function rowToBlock(r: ContentBlockRow): Block {
  return {
    slug: r.slug,
    eyebrow: r.eyebrow,
    title: r.title,
    sub: r.sub,
    points: r.points ?? [],
    image: r.image_url,
    alt: r.alt,
  };
}

/**
 * DB 가 없을 때 쓰는 내용 — `config/content.ts` 를 블록 모양으로 옮긴 것뿐입니다 [A1].
 * 칸의 뜻이 구역마다 다른 것은 `config/sections.ts` 의 명세와 같습니다.
 */
function fallbackBlocks(): SiteBlocks {
  return {
    copy: fallbackCopy,
    why: fallbackWhy.map((w) => block({ title: w.title, sub: w.desc })),
    process: fallbackSteps.map((s) =>
      block({
        eyebrow: s.no,
        title: s.title,
        sub: s.desc,
        points: s.points,
        image: s.image,
      })
    ),
    fabrication: fallbackFab.map((e) =>
      block({ title: e.name, sub: e.desc, image: e.image })
    ),
    signTypes: fallbackSignTypes.map((t) =>
      block({
        slug: t.slug,
        eyebrow: t.en,
        title: t.name,
        sub: t.desc,
        points: t.points,
        image: t.image,
      })
    ),
  };
}

/**
 * 홈·사업영역·업무프로세스가 쓰는 문구를 **한 번의 조회로** 다 가져옵니다.
 *
 * 구역별로 따로 부르면 홈 한 번 그리는 데 조회가 다섯 번 나갑니다. 방문마다
 * SSR 하는 구조(§7)라 그 차이가 그대로 응답 시간이 됩니다.
 *
 * 폴백은 **구역 단위**입니다. `process` 만 DB 에 있고 `why` 가 비어 있으면
 * 프로세스는 DB 값, 강점은 config 값이 나갑니다. 전부-아니면-전무로 만들면
 * 구역 하나를 지웠을 때 멀쩡한 나머지까지 옛 내용으로 되돌아갑니다.
 *
 * ⚠️ **뒤집어 말하면, 한 구역의 항목을 관리자 화면에서 전부 지워도 화면은 비지
 * 않습니다** — 0건이 되는 순간 config 내용이 대신 나갑니다 [A1]. 실제로 2026-08-07
 * 에 "숫자 지표를 다 지웠는데 안 없어진다" 는 문의가 이것이었습니다. 구역 자체를
 * 없애려면 화면에서 지우는 게 아니라 **코드에서 그 구역을 걷어내야** 합니다.
 */
export async function getBlocks(): Promise<SiteBlocks> {
  const fallback = fallbackBlocks();

  const supabase = createPublicClient();
  if (!supabase) return fallback;

  try {
    const { data, error } = await supabase
      .from("content_blocks")
      .select("*")
      .eq("published", true)
      .order("sort_order", { ascending: true });

    if (error) throw error;

    const rows = (data ?? []) as ContentBlockRow[];
    const of = (section: string) =>
      rows.filter((r) => r.section === section).map(rowToBlock);

    /** 그 구역이 DB 에 하나도 없으면 config 내용을 씁니다 */
    const pick = (section: string, fb: Block[]) => {
      const list = of(section);
      return list.length ? list : fb;
    };

    // 머리말은 목록이 아니라 이름표라, 있는 것만 덮어씁니다.
    // 새 구역을 코드에 추가하고 SQL 을 아직 안 돌렸을 때 그 구역만 비는 것을 막습니다.
    const copy = { ...fallback.copy };
    for (const b of of("copy")) {
      if (b.slug) copy[b.slug] = { eyebrow: b.eyebrow, title: b.title, desc: b.sub };
    }

    return {
      copy,
      why: pick("why", fallback.why),
      process: pick("process", fallback.process),
      fabrication: pick("fabrication", fallback.fabrication),
      signTypes: pick("sign_type", fallback.signTypes),
    };
  } catch (e) {
    console.error("[cms] 페이지 문구를 못 읽어 기본 내용으로 대체합니다.", e);
    return fallback;
  }
}
