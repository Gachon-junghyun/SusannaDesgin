import "server-only";

import { works as fallbackWorks, slides as fallbackSlides } from "@/config/content";
import type { Slide, Work } from "@/config/content";
import { createPublicClient } from "@/lib/supabase/public";
import type { HeroSlideRow, WorkRow } from "@/lib/supabase/types";

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
