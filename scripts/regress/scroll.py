"""F1/F2/F12 browser regression; Python Playwright sync API, installed Chrome."""
import sys
from playwright.sync_api import sync_playwright, expect


def check(value, reason):
    if not value:
        raise AssertionError(reason)


def run(page, case):
    hero = page.locator('section[aria-label="주요 소개"]')  # HeroSlider.tsx:194-202
    live = hero.locator('p[aria-live]')  # HeroSlider.tsx:472-473
    def position(y):
        page.evaluate('(y) => scrollTo({top:y,behavior:"instant"})', y)
        page.wait_for_timeout(100)
    def wheel(dy, **extra):
        # Cancelable DOM wheel isolates interception from Chrome native wheel inertia.
        return page.evaluate('''([dy,extra]) => !document.body.dispatchEvent(
            new WheelEvent('wheel',{deltaY:dy,bubbles:true,cancelable:true,...extra}))''', [dy, extra])
    def target():
        return page.evaluate('document.querySelector("#business").getBoundingClientRect().top + scrollY - document.querySelector("header").offsetHeight')
    def landed():
        page.wait_for_timeout(1050)
        check(abs(page.evaluate('scrollY') - target()) < 4, 'business/header offset mismatch')
    if case == 1:  # HeroSlider.tsx:19,105-128,169-174
        position(80)
        check(wheel(30), 'wheel at 80px was not intercepted')
        landed()
    elif case == 2:  # HeroSlider.tsx:170
        position(81)
        check(not wheel(30), 'wheel beyond 80px intercepted')
        page.wait_for_timeout(1000)
        check(abs(page.evaluate('scrollY') - 81) < 2, 'unexpected glide')
    elif case == 3:  # HeroSlider.tsx:159-167, UP_GUARD_MS:20
        position(20)
        check(not wheel(-10), 'upward wheel intercepted')
        check(not wheel(10), 'downward wheel inside 700ms intercepted')
        page.wait_for_timeout(750)
        check(wheel(10), 'guard did not expire')
        landed()
    elif case == 4:  # HeroSlider.tsx:51-73,87; reduced motion before navigation
        before = live.inner_text()
        check(not wheel(30), 'reduced-motion wheel intercepted')
        position(200)
        transform = hero.locator(':scope > div').first.evaluate('(e)=>getComputedStyle(e).transform')
        check(transform in ('none', 'matrix(1, 0, 0, 1, 0, 0)'), 'scroll scale active')
        page.wait_for_timeout(6300)
        check(live.inner_text() == before, 'reduced-motion auto advance active')
        check(hero.get_by_role('button', name='자동 넘김 정지').count() == 0, 'pause button present')
    elif case == 5:  # HeroSlider.tsx:11,58-63; mouse/focus must leave carousel
        # Enter/leave restarts the effect's interval: measure from a known timer origin.
        page.mouse.move(700, 300)
        page.wait_for_timeout(100)
        page.mouse.move(0, 0)
        page.evaluate('document.activeElement.blur()')
        page.wait_for_timeout(100)
        before = live.inner_text()
        page.wait_for_timeout(5400)
        check(live.inner_text() == before, 'advanced before 6 seconds')
        expect(live).not_to_have_text(before, timeout=1800)
        expect(live).to_have_attribute('aria-live', 'off')
    elif case == 6:  # HeroSlider.tsx:33,60,420-423,472
        hero.get_by_role('button', name='자동 넘김 정지', exact=True).click()
        page.mouse.move(0, 0)
        page.evaluate('document.activeElement.blur()')
        before = live.inner_text()
        page.wait_for_timeout(6300)
        check(live.inner_text() == before, 'pause lost after pointer/focus leave')
        expect(live).to_have_attribute('aria-live', 'polite')
        hero.get_by_role('button', name='자동 넘김 시작', exact=True).click()
        page.mouse.move(0, 0)
        page.evaluate('document.activeElement.blur()')
        expect(live).not_to_have_text(before, timeout=7000)
    elif case == 7:  # Header.tsx:44,79,135-138: strict >40, not >=40
        nav = page.locator('header div.border-b').first
        position(40)
        check('bg-white/95' not in (nav.get_attribute('class') or ''), 'solid at exactly 40')
        position(41)
        expect(nav).to_have_class(__import__('re').compile(r'.*bg-white/95.*'))
        page.wait_for_timeout(350)
        # Tailwind v4 는 bg-white/95 를 oklab()/color() 로 계산해 «255, 255, 255» 문자열이 안 나온다 — 캔버스로 sRGB 로 되돌려 잰다.
        rgba = nav.evaluate('''(e)=>{const c=document.createElement('canvas').getContext('2d');c.fillStyle='#000';
            c.fillStyle=getComputedStyle(e).backgroundColor;c.fillRect(0,0,1,1);return Array.from(c.getImageData(0,0,1,1).data)}''')
        check(rgba[0] > 240 and rgba[1] > 240 and rgba[2] > 240 and rgba[3] > 200, f'white background missing {rgba}')
    elif case == 8:  # HeroSlider.tsx:264,351,500-509; two CSS layouts, first slide h1 only
        stacks = hero.locator('div.grid').filter(has=page.locator('h1'))
        active_layout = [s for s in stacks.all() if s.evaluate('(e)=>!!e.getClientRects().length')]
        check(len(active_layout) == 1, 'expected one displayed title stack')
        tags = active_layout[0].locator(':scope > div > h1, :scope > div > h2').evaluate_all('(es)=>es.map(e=>e.tagName)')
        check(len(tags) >= 2 and tags[0] == 'H1' and all(t == 'H2' for t in tags[1:]), 'heading order wrong / fewer than two slides')
    elif case == 9:  # HeroSlider.tsx:157; ctrl+wheel zoom gesture
        check(not wheel(30, ctrlKey=True), 'zoom gesture intercepted')
        page.wait_for_timeout(1000)
        check(page.evaluate('scrollY') < 2, 'zoom gesture triggered glide')
    elif case == 10:  # HeroSlider.tsx:440-454; phone SCROLL anchor uses same glide
        hero.get_by_role('link', name='아래 내용 보기', exact=True).click()
        landed()


NAMES = ['상단 80px 글라이드', '81px 미개입', '위 휠 700ms 보호', '움직임 줄이기',
         '6초 자동 넘김', '정지 유지와 재시작', '헤더 40/41px 경계', '첫 장만 h1', '확대 휠 미개입', '폰 아래 내용 보기']


def main():
    if len(sys.argv) != 2:
        print('Usage: python scripts/regress/scroll.py <URL>')
        return 1
    failed = 0
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chrome')
        for case, name in enumerate(NAMES, 1):
            mobile = case in (8, 10)
            context = browser.new_context(viewport={'width':390 if mobile else 1440, 'height':844 if mobile else 900},
                                          is_mobile=mobile, has_touch=mobile, reduced_motion='reduce' if case == 4 else 'no-preference', service_workers='block')
            # 다른 호스트(GA·Clarity 등)는 막는다 — 로컬 미리보기도 운영 설정이라 시험 방문이 통계에 섞인다.
            base_host = sys.argv[1].split('//', 1)[-1].split('/', 1)[0]
            context.route('**/*', lambda r: r.continue_() if r.request.url.split('//', 1)[-1].split('/', 1)[0] == base_host else r.abort())
            try:
                page = context.new_page()
                page.goto(sys.argv[1].rstrip('/') + '/', wait_until='networkidle')
                # Effects mounted; performance.now() must exceed initial 700ms guard.
                page.wait_for_timeout(900)
                run(page, case)
                print(f'PASS S{case:02} {name}')
            except Exception as e:
                failed += 1
                print(f'FAIL S{case:02} {name}: {str(e).splitlines()[0]}')
            finally:
                context.close()
        browser.close()
    print(f'TOTAL 10 PASS {10-failed} FAIL {failed}')
    return int(bool(failed))


if __name__ == '__main__':
    sys.exit(main())
