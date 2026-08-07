import { PageHero } from "@/components/Section";
import { privacyConsent, site } from "@/config/site";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("/privacy");

export default function PrivacyPage() {
  return (
    <>
      <PageHero eyebrow="PRIVACY POLICY" title="개인정보처리방침" path="/privacy" />

      <div className="mx-auto max-w-3xl px-6 py-14 md:py-20">
        <p className="rounded-xl bg-brand-50 p-4 text-[13px] leading-relaxed text-brand-700">
          이 문서는 기본 틀입니다. 실제 운영 전 회사 상황(수집 항목, 보유 기간, 위탁
          업체, 개인정보 보호책임자)에 맞게 수정하고 법률 검토를 받으세요.
        </p>

        <div className="mt-10 space-y-10 leading-relaxed">
          <Article title="제1조 (개인정보의 처리 목적)">
            <p>
              {site.legalName}(이하 &lsquo;회사&rsquo;)는 다음의 목적을 위하여 개인정보를
              처리하며, 목적 이외의 용도로는 이용하지 않습니다.
            </p>
            <List
              items={[
                "간판 제작·시공 관련 견적 상담 및 회신",
                "현장 실측 일정 조율 및 시공 안내",
                "계약 이행 및 A/S 처리",
              ]}
            />
          </Article>

          <Article title="제2조 (처리하는 개인정보의 항목)">
            <p>회사는 견적 문의 과정에서 아래 항목을 수집합니다.</p>
            <List
              items={[
                `필수 항목: ${privacyConsent.items}`,
                "선택 항목: 이메일, 첨부파일(현장 사진·로고 파일), 문의 내용",
                "자동 수집 항목: 접속 IP, 접수 일시",
              ]}
            />
          </Article>

          <Article title="제3조 (개인정보의 처리 및 보유 기간)">
            <p>
              회사는 정보주체로부터 개인정보를 수집할 때 동의받은 보유·이용 기간 내에서
              개인정보를 처리·보유합니다.
            </p>
            <List
              items={[
                `견적 상담 정보: ${privacyConsent.retention}`,
                "계약 체결 시 관련 법령에 따른 보존 기간(거래 관련 기록 5년 등)",
              ]}
            />
          </Article>

          <Article title="제4조 (개인정보의 제3자 제공)">
            <p>
              회사는 정보주체의 개인정보를 제1조에서 명시한 범위 내에서만 처리하며,
              정보주체의 동의나 법령의 규정 등 개인정보 보호법 제17조에 해당하는 경우에만
              제3자에게 제공합니다.
            </p>
          </Article>

          <Article title="제5조 (개인정보 처리의 위탁)">
            <p>
              회사는 원활한 서비스 제공을 위해 개인정보 처리 업무를 아래와 같이 위탁하고
              있습니다.
            </p>
            <ul className="mt-3 space-y-1.5 pl-5 [&>li]:list-disc">
              <li>
                <b>Google LLC</b> — 홈페이지 이용 통계 분석 (Google Analytics).
                위탁 기간은 서비스 이용 계약 종료 시까지입니다.
              </li>
              <li>
                <b>Resend, Inc.</b> — 견적 문의 접수 알림 메일 발송. 문의하신 성명·연락처가
                담당자 메일로 전달됩니다.
              </li>
              <li>
                <b>Cloudflare, Inc. / Supabase, Inc.</b> — 홈페이지 호스팅 및 문의 내용 보관.
              </li>
            </ul>
          </Article>

          <Article title="제5조의2 (쿠키 및 이용 통계 분석 도구)">
            <p>
              회사는 이용자에게 더 나은 서비스를 제공하기 위해 Google Analytics를 사용하여
              방문 경로와 페이지 이용 현황을 분석합니다. 이 과정에서 <b>쿠키</b>가 이용자의
              브라우저에 저장되며, 방문 일시·접속 기기·페이지 이동 경로 등이 수집됩니다.
              이름·연락처와 같이 개인을 직접 식별할 수 있는 정보는 수집하지 않습니다.
            </p>
            <p>
              이용자는 브라우저 설정에서 쿠키 저장을 거부할 수 있으며, Google이 제공하는
              차단 도구(Google Analytics 옵트아웃 브라우저 부가기능)를 설치해 수집을 거부할
              수 있습니다. 쿠키 저장을 거부하셔도 홈페이지 이용에는 제한이 없습니다.
            </p>
          </Article>

          <Article title="제6조 (정보주체의 권리·의무 및 행사 방법)">
            <p>
              정보주체는 언제든지 개인정보 열람·정정·삭제·처리정지를 요구할 수 있습니다.
              요청은 아래 연락처로 접수하실 수 있으며, 회사는 지체 없이 조치합니다.
            </p>
          </Article>

          <Article title="제7조 (개인정보의 파기)">
            <p>
              회사는 보유 기간이 경과하거나 처리 목적이 달성된 경우 지체 없이 해당
              개인정보를 파기합니다. 전자적 파일은 복구할 수 없는 방법으로 삭제하고, 종이
              문서는 분쇄하거나 소각합니다.
            </p>
          </Article>

          <Article title="제8조 (개인정보의 안전성 확보 조치)">
            <List
              items={[
                "개인정보 취급 직원의 최소화 및 교육",
                "개인정보에 대한 접근 제한 및 접근 권한 관리",
                "개인정보가 포함된 자료의 잠금장치가 있는 장소 보관",
              ]}
            />
          </Article>

          <Article title="제9조 (개인정보 보호책임자)">
            <dl className="divide-y divide-line border-y border-line">
              {[
                ["책임자", site.ceo],
                ["연락처", site.phone],
                ["이메일", site.email],
              ].map(([k, v]) => (
                <div key={k} className="grid gap-1 py-3 sm:grid-cols-[120px_1fr]">
                  <dt className="text-[14px] font-bold text-ink-500">{k}</dt>
                  <dd className="text-[15px]">{v}</dd>
                </div>
              ))}
            </dl>
          </Article>

          <Article title="제10조 (권익침해 구제방법)">
            <p>
              개인정보 침해에 대한 상담이 필요하신 경우 아래 기관에 문의하실 수 있습니다.
            </p>
            <List
              items={[
                "개인정보분쟁조정위원회 (privacy.go.kr / 국번없이 1833-6972)",
                "개인정보침해신고센터 (privacy.kisa.or.kr / 국번없이 118)",
                "대검찰청 사이버수사과 (spo.go.kr / 국번없이 1301)",
                "경찰청 사이버수사국 (ecrm.police.go.kr / 국번없이 182)",
              ]}
            />
          </Article>

          <Article title="제11조 (개인정보처리방침의 변경)">
            <p>
              이 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경 내용의
              추가·삭제 및 정정이 있는 경우에는 변경 사항의 시행 7일 전부터 공지사항을
              통하여 고지할 것입니다.
            </p>
            <p className="mt-3 font-bold">시행일: 2026년 00월 00일 (TODO)</p>
          </Article>
        </div>
      </div>
    </>
  );
}

function Article({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-black">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink-500">
        {children}
      </div>
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((t) => (
        <li key={t} className="flex gap-2.5">
          <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}
