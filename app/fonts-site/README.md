# app/fonts-site — 고운바탕 «자주 쓰는 글자 한 벌»

`app/layout.tsx` 의 `gowunKs`(`next/font/local`)가 읽는 파일입니다. 사이트 글꼴 쌓기에서 구글 조각(`next/font/google` 의 `Gowun_Batang`)보다 앞에 섭니다.

| 파일 | 무엇 |
|---|---|
| `GowunBatang-KS-400.woff2` | 고운바탕 Regular 에서 2,599자만 추림 (약 199KB) |
| `GowunBatang-KS-700.woff2` | 고운바탕 Bold 에서 같은 2,599자 (약 168KB) |
| `chars.txt` | 담은 글자 2,599자 (다시 만들 때 그대로 씁니다) |
| `OFL.txt` | 원본 라이선스 전문 (SIL OFL 1.1) — 지우지 마세요 |

## 담은 글자

KS X 1001 한글 2,350자(EUC-KR 0xB0A1~0xC8FE) + 영문·숫자(U+0020~007E) + 라틴-1 보충(U+00A0~00FF)
+ 자주 쓰는 문장부호·화살표·도형·단위 기호. 범위는 `layout.tsx` 의 `unicode-range` 와 같아야 합니다.
여기 없는 글자는 브라우저가 구글 조각에서 같은 모양으로 채웁니다.

## 원본과 라이선스

- 원본: `https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/gowunbatang/` 의 `GowunBatang-Regular.ttf`·`GowunBatang-Bold.ttf` (Version 2.000).
  구글 폰트가 내보내는 조각과 글리프 윤곽이 같음을 대조했습니다(2026-10-24, 360자).
- OFL 1.1. 원본 `OFL.txt` 첫 줄은 저작권 문구뿐이고 **예약 이름(Reserved Font Name)이 없습니다** — 그래서 추린 파일의
  글꼴 이름을 «Gowun Batang» 그대로 두었습니다. 글자를 추리는 것은 OFL-FAQ 기준 «수정»이므로 파일 안 이름표의
  저작권(0번)·라이선스(13·14번)를 남겼고(`--name-IDs='*'`), 이 폴더에 `OFL.txt` 를 같이 둡니다.

## 다시 만드는 법

`chars.txt` 가 담은 글자 목록 그대로입니다(줄바꿈 없는 한 줄). 글자를 늘리려면 이 파일에 더하고, 늘린 범위를 `layout.tsx` 의 `unicode-range` 에도 더합니다.

```sh
pyftsubset GowunBatang-Regular.ttf --text-file=chars.txt --flavor=woff2 --layout-features='*' --name-IDs='*' --name-languages='*' --output-file=GowunBatang-KS-400.woff2
pyftsubset GowunBatang-Bold.ttf    --text-file=chars.txt --flavor=woff2 --layout-features='*' --name-IDs='*' --name-languages='*' --output-file=GowunBatang-KS-700.woff2
```
