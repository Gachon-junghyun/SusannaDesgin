import { PageHero } from "@/components/Section";
import { site } from "@/config/site";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("/no-email-collect");

export default function NoEmailCollectPage() {
  return (
    <>
      <PageHero eyebrow="NOTICE" title="이메일주소 무단수집 거부" path="/no-email-collect" />

      <div className="mx-auto max-w-3xl px-6 py-14 md:py-20">
        <div className="space-y-5 text-[15px] leading-relaxed">
          <p>
            본 웹사이트에 게시된 이메일 주소가 전자우편 수집 프로그램이나 그 밖의 기술적
            장치를 이용하여 무단으로 수집되는 것을 거부하며, 이를 위반 시{" "}
            <b>정보통신망 이용촉진 및 정보보호 등에 관한 법률</b>에 의해 형사 처벌됨을
            유념하시기 바랍니다.
          </p>

          <div className="rounded-xl bg-paper p-5 text-[14px] leading-relaxed text-ink-500">
            <p className="font-bold text-ink">
              정보통신망 이용촉진 및 정보보호 등에 관한 법률 제50조의2 (전자우편주소의
              무단 수집행위 등 금지)
            </p>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              <li>
                누구든지 전자우편주소의 수집을 거부하는 의사가 명시된 인터넷 홈페이지에서
                자동으로 전자우편주소를 수집하는 프로그램 그 밖의 기술적 장치를 이용하여
                전자우편주소를 수집하여서는 아니 된다.
              </li>
              <li>
                누구든지 제1항의 규정을 위반하여 수집된 전자우편주소를 판매·유통하여서는
                아니 된다.
              </li>
              <li>
                누구든지 제1항 및 제2항의 규정에 의하여 수집·판매 및 유통이 금지된
                전자우편주소임을 알고 이를 정보 전송에 이용하여서는 아니 된다.
              </li>
            </ol>
          </div>

          <p className="text-ink-500">
            문의: <a href={`mailto:${site.email}`} className="font-bold text-brand underline underline-offset-4">{site.email}</a>
          </p>
        </div>
      </div>
    </>
  );
}
