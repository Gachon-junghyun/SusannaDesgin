/**
 * 페이지 문구 구역 명세 — 관리자 화면(F19)이 이 파일 하나만 보고 그려집니다.
 *
 * `content_blocks` 는 여러 구역을 한 표에 담고 있어서 **칸의 뜻이 구역마다 다릅니다**
 * (`process` 구역에서 `eyebrow` 는 "01", `points` 는 상세 항목). 그 대응을 코드
 * 여기저기에 흩어 두면 관리자 화면 라벨과 실제 화면이 어긋납니다. 그래서 한 곳에
 * 모읍니다 [A5].
 *
 * 새 구역을 넣을 때는 ① 마이그레이션의 `check` 목록 ② `ContentSection` 타입
 * ③ 이 배열 ④ `lib/cms.ts` 의 폴백 — 네 곳을 같이 고칩니다.
 *
 * ⚠️ **이 배열에 없는 구역은 관리자 화면에 탭이 안 뜹니다.** `stat`(숫자 지표)이
 * 그렇습니다 — 2026-08-07 에 홈·회사소개에서 지표 띠를 걷어내면서 같이 뺐습니다.
 * DB 의 `section='stat'` 행은 남아 있지만 어디에도 안 나옵니다.
 */

import type { ContentSection } from "@/lib/supabase/types";

export type FieldSpec = {
  /** 관리자 화면에 붙는 라벨 */
  label: string;
  /** 라벨 옆 회색 설명 */
  hint?: string;
  placeholder?: string;
  /** 줄바꿈을 넣을 수 있는 칸인가 (화면에서도 줄이 나뉩니다) */
  multiline?: boolean;
};

export type SectionSpec = {
  key: ContentSection;
  /** 관리자 화면 탭 이름 */
  label: string;
  /** 이 구역이 화면 어디에 나오는지 — 관리자가 헷갈리지 않게 */
  where: string;
  /**
   * 항목을 새로 넣거나 지울 수 있는가.
   *
   * `copy` 는 코드가 `slug` 로 집어 오므로 임의로 늘리면 아무 데도 안 나오고,
   * 지우면 그 구역 머리말이 통째로 사라집니다. 그래서 수정만 허용합니다.
   */
  fixed?: boolean;
  fields: {
    eyebrow?: FieldSpec;
    title?: FieldSpec;
    sub?: FieldSpec;
    points?: FieldSpec;
    image?: FieldSpec;
  };
};

export const SECTIONS: SectionSpec[] = [
  {
    key: "copy",
    label: "구역 제목",
    where: "홈페이지 각 구역의 머리말입니다. “공장을 가졌다는 건…” 같은 큰 문구가 여기 있습니다.",
    fixed: true,
    fields: {
      eyebrow: { label: "작은 영문", hint: "제목 위 주황색 글씨", placeholder: "FABRICATION" },
      title: {
        label: "큰 제목",
        hint: "줄바꿈하면 화면에서도 줄이 나뉩니다",
        placeholder: "공장을 가졌다는 건\n일정을 지킬 수 있다는 뜻입니다",
        multiline: true,
      },
      sub: { label: "설명", hint: "제목 아래 한두 문장" },
    },
  },
  {
    key: "why",
    label: "회사 강점",
    where: "홈페이지 “WHY SUSANNA” 구역의 점 찍힌 네 줄입니다.",
    fields: {
      title: { label: "강점", placeholder: "795평 자체 공장" },
      sub: { label: "설명", placeholder: "절단·가공·도색·조립을 외주 없이 공장 안에서 끝냅니다." },
    },
  },
  {
    key: "process",
    label: "업무 프로세스",
    where: "홈페이지 PROCESS 구역과 “업무프로세스” 페이지에 함께 나옵니다.",
    fields: {
      eyebrow: { label: "번호", placeholder: "01" },
      title: { label: "단계 이름", placeholder: "상담 및 접수" },
      sub: { label: "한 줄 설명", placeholder: "고객 요구사항을 파악하고 현장을 직접 확인합니다." },
      points: {
        label: "상세 항목",
        hint: "한 줄에 하나씩. 업무프로세스 페이지에서만 보입니다",
      },
      image: { label: "사진", hint: "가로로 넓은 사진 (권장 640×480). 10MB 이하." },
    },
  },
  {
    key: "fabrication",
    label: "제작 공정",
    where: "홈페이지 검은 배경의 FABRICATION 구역, 여섯 칸입니다.",
    fields: {
      title: { label: "공정 이름", placeholder: "절단" },
      sub: { label: "한 줄 설명", placeholder: "판재·형강 재단" },
      image: { label: "사진", hint: "정사각형에 가까운 사진이 잘 맞습니다 (권장 800×600). 10MB 이하." },
    },
  },
  {
    key: "sign_type",
    label: "사업영역",
    where: "홈페이지 맨 위 네 칸 바와 “사업영역” 페이지에 함께 나옵니다.",
    fields: {
      eyebrow: { label: "영문 이름", hint: "홈 상단 바에 작게 나옵니다", placeholder: "OUTDOOR" },
      title: { label: "분야 이름", placeholder: "옥외광고물" },
      sub: { label: "소개 문단", placeholder: "빌딩 외벽, 도로변, 건물 옥상 등…" },
      points: { label: "특징", hint: "한 줄에 하나씩" },
      image: { label: "사진", hint: "가로로 넓은 사진 (권장 800×600). 10MB 이하." },
    },
  },
];

export function sectionSpec(key: string): SectionSpec {
  return SECTIONS.find((s) => s.key === key) ?? SECTIONS[0];
}
