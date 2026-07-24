/**
 * 구조화 데이터(JSON-LD) 삽입용.
 *
 * 검색엔진과 AI 요약이 페이지 내용을 구조로 이해하게 해 줍니다.
 * 넣는 값은 반드시 **화면에 실제로 보이는 내용과 같아야** 합니다.
 * 화면에 없는 내용을 스키마에만 넣으면 리치 결과에서 제외되거나 수동 조치를 받습니다.
 */
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
