뭐냐: F1·F2·F12 스크롤 10건과 F5·F24-c·F25·F31·F33-b 폼 12건의 Python Playwright 회귀 시험입니다.
언제 읽나: 사진·글꼴·지연 가져오기 등 공개 화면을 바꾸기 전후, 부모 작업에서 실행 결과를 비교할 때 읽습니다.
안 담는 것: 실제 접수·DB 저장·메일/웹훅(F16)·관리자·성능 점수·실기기 터치·서버 검증 우회 시험은 포함하지 않습니다.

## 쓰는 법

이미 Python Playwright와 Chrome이 설치된 PC에서 대상 서버를 먼저 켭니다. Node 의존성 추가나 브라우저 설치는 하지 않습니다.

```powershell
python scripts/regress/scroll.py http://localhost:3000
python scripts/regress/form.py http://localhost:3000
# OpenNext 미리보기 예
python scripts/regress/scroll.py http://localhost:8787
python scripts/regress/form.py http://localhost:8787
```

각 경우는 새 브라우저 컨텍스트에서 실행합니다. `PASS` 또는 `FAIL 이름: 이유` 한 줄과 마지막 합계를 출력하며, 실패가 하나라도 있으면 종료 코드 1입니다. 브라우저 실행 자체의 실패도 Python 예외로 종료 코드 1이 됩니다. 폼 안전 중단 시에는 `NOT_RUN`도 출력합니다. Chrome은 `p.chromium.launch(channel="chrome")`, Playwright는 sync API만 씁니다.

폼은 탐색 전에 `page.route("**/api/quote", ...)`와 `page.route("**/agent/quote", ...)`를 등록해 `{"ok":true}`를 돌려주고, JSON 또는 멀티파트 본문을 메모리에서 검사합니다. 본문을 로그에 저장하거나 요청을 재전송하지 않습니다. 별도의 컨텍스트 라우트가 두 경로의 누락 요청과 모든 다른 변경 요청을 **네트워크 전송 전에 차단**합니다. service worker도 차단합니다. 가로채기가 누락되거나 본문을 해석하지 못하면 `SAFETY STOP`으로 즉시 나머지 경우를 중단합니다. 타사 요청도 차단해 분석 도구로 시험값이 나가지 않게 합니다. **가로채기를 해제하거나 `route.fetch()`로 바꾸지 마세요.**

스크롤 휠 검사는 취소 가능한 DOM `WheelEvent`로 `preventDefault` 여부와 최종 스크롤 위치를 함께 검사합니다. Chrome의 관성 휠을 흉내 내는 시험은 아닙니다. 미개입 경우에는 합성 이벤트가 기본 스크롤을 만들지 않으므로 위치가 그대로여야 합니다. 글라이드 끝은 `#business` 문서 좌표에서 실제 헤더 높이를 뺀 위치(오차 4px 미만)입니다. 휠 보호 시간과 RAF 때문에 고정 대기 시간이 일부 있습니다. 자동 넘김 시험은 실제 시간을 사용합니다.

히어로 슬라이드는 2장 이상이어야 합니다. `?item=bracket`은 대상 CMS의 `sign_model`에 해당 슬러그가 있어야 합니다. 없으면 F07 실패로 드러나며 자동으로 건너뛰지 않습니다. CMS마다 제목이 달라질 수 있어 F07·F09는 긴 폼의 검증된 제품 이름을 읽어 간편 폼 전송값과 대조합니다.

## 22건과 통과 기준

줄 번호는 2026-10-24 작업 사본 기준이며 각 Python 분기에도 근거를 주석으로 적었습니다. D=1440×900, M=390×844 + is_mobile/has_touch.

| 번호 | 이름·화면 | 근거 파일:줄 | 통과 기준 |
|---|---|---|---|
| S01 | 상단 80px 글라이드 D | components/HeroSlider.tsx:19,105,170 | 80px에서 아래 휠 취소, 사업 구역이 헤더 바로 아래에 도착 |
| S02 | 81px 미개입 D | components/HeroSlider.tsx:170 | 휠 취소 없음, 글라이드 없음 |
| S03 | 위 휠 700ms 보호 D | components/HeroSlider.tsx:20,159,167 | 위 휠과 직후 아래 휠은 미개입, 750ms 뒤 아래 휠은 글라이드 |
| S04 | 움직임 줄이기 D | components/HeroSlider.tsx:51,60,67,87,330 | 휠·스크롤 확대·자동 넘김 꺼짐, 정지 단추 없음 |
| S05 | 6초 자동 넘김 D | components/HeroSlider.tsx:11,58,472 | hover 해제로 타이머를 다시 시작해 약 5.5초까지 그대로, 약 6초 뒤 다음 장, aria-live off |
| S06 | 정지 유지·재시작 D | components/HeroSlider.tsx:33,60,420,472 | 정지 후 마우스·포커스가 떠나도 6.3초 유지, polite, 시작 후 다시 넘김 |
| S07 | 헤더 40/41px D | components/Header.tsx:44,79,135 | 정확히 40px는 투명, 41px는 흰 바탕 클래스와 실제 흰 배경 |
| S08 | 첫 장만 h1 M | components/HeroSlider.tsx:264,351,500,509 | 표시 레이아웃 한 벌, 그 스택의 첫 제목만 h1, 나머지는 h2 |
| S09 | 확대 휠 미개입 D | components/HeroSlider.tsx:157 | ctrl+wheel 취소 없음, 글라이드 없음 |
| S10 | 아래 내용 보기 M | components/HeroSlider.tsx:440,454 | SCROLL 링크로 사업 구역이 헤더 바로 아래에 도착 |
| F01 | 간편 필수값 D | lib/validate.ts:50; components/QuickQuoteForm.tsx:119,370 | 빈 세 칸 aria-invalid, 제출 요청 0 |
| F02 | 잘못된 전화번호 D | lib/validate.ts:39,54 | 123 입력 시 연락처 형식 오류, 요청 0 |
| F03 | 개인정보 동의 필수 D | lib/validate.ts:56; components/PrivacyConsent.tsx:50 | 세 칸 정상이어도 미동의 시 aria-invalid, 요청 0 |
| F04 | 간편 정상 전송 D | components/QuickQuoteForm.tsx:127,142,161 | 가로챈 quick/name/phone/region/agree/trap 값 일치, 완료 문구 |
| F05 | 짧은 폼·접힌 긴 폼·필수값 D | app/quote/page.tsx:104,106; lib/validate.ts:61; components/QuickQuoteForm.tsx:239 | 짧은 폼·선택 사진 칸 보임, 긴 폼 접힘, 펼친 빈 긴 폼 필수값 오류와 요청 0 |
| F06 | 긴 폼 정상 전송 D | components/QuoteForm.tsx:210,242,283,354,386,442 | 가로챈 full/name/phone/address/floor/signType/message/agree 값 일치, 완료 문구 |
| F07 | 정상 item 전달 D | app/quote/page.tsx:31,79; components/QuoteForm.tsx:261 | bracket의 제품 띠가 보이고 간편 폼 product가 같은 값 |
| F08 | 악성 item 차단 D | app/quote/page.tsx:31,37 | `<script>`의 띠·원문 렌더링 없음, 전송 product 없음 |
| F09 | design 전달 D | app/quote/page.tsx:47,80; config/signDesign.ts:49 | 간판디자인 이름·연출 띠, 간편 폼 product 같은 값 |
| F10 | 커스텀 글꼴 일회 소비 D | config/fonts.ts:102; components/QuoteForm.tsx:82 | 저장소 글이 문의 내용에 들어감, 키 삭제, 재로딩 후 빈 문의 내용 |
| F11 | AI 링크 전달·동의·삭제 D | lib/ai-prefill.ts:16,33,55; components/QuickQuoteForm.tsx:73,135 | 칸 채움·hash 삭제·미동의·자동 제출 없음, 수동 제출에 via/agent/message, 성공 후 저장소·메모리 삭제 |
| F12 | 홈 폼 ID·라벨 M | components/QuickQuoteForm.tsx:24,197; app/page.tsx:85 | 모든 현재 간편 폼 ID 유일, 라벨은 자기 폼 칸 하나만 가리킴, 모바일 이름 라벨 클릭 시 해당 칸 포커스 |

## 미실행·선택자 주의

이 샌드박스에 Python이 없어 실행·문법 검사·브라우저 검증을 하지 못했습니다. 부모가 두 명령을 실행하고 실패 번호와 이유를 돌려주어야 합니다. 특히 `header div.border-b`, 히어로 `div.grid` 스택, 긴 폼 `div.border-brand > ... b`, `details` 안의 `#name`, CSS로 숨긴 라디오의 `check(force=True)`는 코드에서 도출했으며 실브라우저 확인 전입니다. 타사 차단에 따른 외부 자원 오류는 예상됩니다.

문서와 현재 코드의 차이: QuickQuoteForm 머리말은 홈 두 벌을 말하지만 HeroSlider는 2026-09-29 데스크톱 폼을 제거했고 app/page.tsx:89의 모바일 한 벌만 남았습니다. F12는 한 벌 이상을 요구하고 **있는 모든 벌**의 중복을 검사하므로 다시 두 벌이 되어도 검사합니다. 두 벌이 있다고 거짓으로 단정하지 않습니다. 제품 띠는 현재 간편 폼에는 없고 접힌 긴 폼 안에 있어 F07~F09에서 펼쳐 확인합니다.

## 변경 이력

- 2026-10-24: 유실된 wheeltest.mjs·formtest.mjs 대신 Python sync Playwright 스크롤 10건·폼 12건 신설. 실제 접수 차단, 본문 검사, 안전 중단 추가. 앱·설정·ARCHITECTURE는 수정하지 않음(부모 담당).
