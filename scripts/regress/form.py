"""F5/F24-c/F25/F31/F33-b. Never sends a real quote (two routing layers)."""
import json
import re
import sys
from email.parser import BytesParser
from email.policy import default
from urllib.parse import urlencode, urlsplit
from playwright.sync_api import sync_playwright, expect


class SafetyFailure(Exception):
    pass


def check(value, reason):
    if not value:
        raise AssertionError(reason)


def payload(request):
    """Read captured bytes, never repeat a request via APIRequestContext."""
    content_type = request.headers.get('content-type', '')
    raw = request.post_data_buffer or b''
    if 'application/json' in content_type:
        return json.loads(raw)
    if 'multipart/form-data' in content_type:
        message = BytesParser(policy=default).parsebytes(
            ('Content-Type: ' + content_type + '\r\nMIME-Version: 1.0\r\n\r\n').encode() + raw)
        check(message.is_multipart(), 'multipart body did not parse')
        result = {}
        for part in message.iter_parts():
            key = part.get_param('name', header='content-disposition')
            data = part.get_payload(decode=True) or b''
            value = {'filename': part.get_filename(), 'size': len(data)} if part.get_filename() else data.decode('utf-8')
            if key == 'files':
                result.setdefault(key, []).append(value)
            else:
                result[key] = value
        return result
    raise AssertionError('unsupported captured Content-Type: ' + content_type)


class Harness:
    def __init__(self, browser, base, mobile=False):
        self.base = base
        self.captured = []
        self.unsafe = []
        self.context = browser.new_context(viewport={'width':390 if mobile else 1440, 'height':844 if mobile else 900},
                                           is_mobile=mobile, has_touch=mobile, service_workers='block')
        # Last defense: a page-route miss NEVER reaches any quote server or alternate POST target.
        # Also block third-party telemetry; this suite has no reason to send personal test data there.
        self.context.route('**/*', self.guard)
        self.page = self.context.new_page()
        # Required primary intercepts. Glob handles documented exact endpoints; context catches variants.
        self.page.route('**/api/quote', self.mock)
        self.page.route('**/agent/quote', self.mock)

    def guard(self, route):
        req = route.request
        path = urlsplit(req.url).path.rstrip('/')
        if path in ('/api/quote', '/agent/quote') or req.method not in ('GET', 'HEAD', 'OPTIONS'):
            self.unsafe.append(req.method + ' ' + path)
            route.abort('blockedbyclient')
        elif urlsplit(req.url).netloc != urlsplit(self.base).netloc:
            route.abort('blockedbyclient')
        else:
            route.continue_()

    def mock(self, route):
        # app/api/quote/route.ts:30,50-83,301; QuickQuoteForm.tsx:127-147; QuoteForm.tsx:210-229
        try:
            check(route.request.method == 'POST', 'expected POST')
            self.captured.append((urlsplit(route.request.url).path, payload(route.request)))
            route.fulfill(status=200, content_type='application/json', body='{"ok":true}')
        except Exception as e:
            self.unsafe.append('mock could not inspect body: ' + str(e))
            route.abort('blockedbyclient')

    def safe(self):
        if self.unsafe:
            raise SafetyFailure('; '.join(self.unsafe))

    def go(self, path='/quote'):
        self.page.goto(self.base + path, wait_until='networkidle')
        self.page.wait_for_timeout(500)
        self.safe()

    def quick(self):
        # QuickQuoteForm.tsx:197,206,216; quote/page.tsx:104
        return self.page.locator('form').filter(has=self.page.locator('#quote-name'))

    def full(self):
        # quote/page.tsx:106-115; QuoteForm.tsx:283-286
        detail = self.page.locator('details').filter(has=self.page.locator('#name'))
        if not detail.evaluate('(e)=>e.open'):
            detail.locator('summary').click()
        return detail.locator('form')

    def fill_quick(self, form, prefix='quote'):
        form.locator('#' + prefix + '-name').fill('회귀시험')
        form.locator('#' + prefix + '-phone').fill('01012345678')
        form.locator('#' + prefix + '-region').fill('대전 서구')

    def submit(self, form, expected, full=False):
        before = len(self.captured)
        form.locator('button[type=submit]').click()
        try:
            self.page.wait_for_function('''() => document.body.innerText.includes('상담 신청이 접수됐습니다') ||
                document.body.innerText.includes('견적 문의가 접수됐습니다')''', timeout=5000)
        except Exception:
            self.safe()
            if len(self.captured) == before:
                raise SafetyFailure('submission was not intercepted; stopping suite')
            raise
        self.safe()
        if len(self.captured) != before + 1:
            raise SafetyFailure('expected exactly one intercepted submission; stopping suite')
        path, body = self.captured[-1]
        check(path == '/api/quote', 'form unexpectedly used agent endpoint')
        for key, value in expected.items():
            check(body.get(key) == value, f'captured {key}: {body.get(key)!r} != {value!r}')
        check(body.get('agree') == 'true', 'consent missing')
        check(re.sub(r'\D', '', body.get('phone', '')) == '01012345678', 'phone payload mismatch')
        expect(self.page.get_by_text('견적 문의가 접수됐습니다' if full else '상담 신청이 접수됐습니다', exact=True)).to_be_visible()
        return body


def run(h, case):
    p = h.page
    if case == 7:  # quote/page.tsx:31-39; content.ts:420-422; lib/cms.ts:205-209
        h.go('/quote?item=bracket')
    elif case == 8:  # quote/page.tsx:31-37 rejects unknown URL text
        h.go('/quote?' + urlencode({'item':'<script>'}))
    elif case == 9:  # quote/page.tsx:47-52; config/signDesign.ts:49
        h.go('/quote?design=bracket')
    elif case == 10:  # fonts.ts:101-102; QuoteForm.tsx:82-90 (plain string, consumed once)
        p.add_init_script("if(!sessionStorage.getItem('regress-seeded')){sessionStorage.setItem('susanna-custom-font','회귀 글씨');sessionStorage.setItem('regress-seeded','1')}")
        h.go('/quote?font=custom')
    elif case == 11:  # ai-prefill.ts:16,33-37,55-59; QuickQuoteForm.tsx:73-87,135-146
        h.go('/quote#' + urlencode({'ai':'1','name':'회귀시험','phone':'01012345678','region':'대전 서구','message':'간판 문의 시험','agent':'Regression'}))
    elif case == 12:
        h.go('/')
    else:
        h.go()
    if case in (1, 2, 3, 4):
        f = h.quick()
        if case != 1:
            h.fill_quick(f)
        if case == 2:
            f.locator('#quote-phone').fill('123')
            f.locator('[type=checkbox]').check()
        if case < 4:  # validate.ts:50-56; QuickQuoteForm.tsx:119-123,370-383
            f.locator('button[type=submit]').click()
            if case == 1:
                for key in ('name', 'phone', 'region'):
                    expect(f.locator('#quote-' + key)).to_have_attribute('aria-invalid', 'true')
            elif case == 2:
                expect(f.locator('#quote-phone-error')).to_have_text('연락처 형식을 확인해 주세요.')
            else:
                expect(f.locator('[type=checkbox]')).to_have_attribute('aria-invalid', 'true')
            p.wait_for_timeout(400)
            check(not h.captured, 'invalid form submitted')
        else:  # QuickQuoteForm.tsx:127-147,239-259 (optional photo absent)
            f.locator('[type=checkbox]').check()
            h.submit(f, {'kind':'quick','name':'회귀시험','region':'대전 서구','company_website':''})
    elif case in (5, 6):
        # quote/page.tsx:104-115: short form visible, long form initially collapsed.
        expect(h.quick()).to_be_visible()
        # QuickQuoteForm.tsx:239-259: /quote short form offers optional photo.
        photo = h.quick().locator('input[type=file]')
        check(photo.count() == 1, 'short form photo input missing')
        check(photo.get_attribute('required') is None, 'short form photo became mandatory')
        detail = p.locator('details').filter(has=p.locator('#name'))
        check(not detail.evaluate('(e)=>e.open'), 'long form initially open')
        f = h.full()
        if case == 5:  # validate.ts:61-70
            f.locator('button[type=submit]').click()
            for key in ('name','phone','address','floor'):
                expect(f.locator('#' + key)).to_have_attribute('aria-invalid', 'true')
            expect(f.get_by_text('문의 분야를 선택해 주세요.', exact=True)).to_be_visible()
            check(not h.captured, 'empty full form submitted')
        else:  # QuoteForm.tsx:210-229,283-462; no postcode external service needed
            for key, value in {'name':'회귀시험','phone':'01012345678','address':'대전 서구 시험 주소','message':'회귀시험 내용'}.items():
                f.locator('#' + key).fill(value)
            floor = f.locator('#floor option').evaluate_all('(es)=>es.map(e=>e.value).filter(Boolean)')[0]
            f.locator('#floor').select_option(floor)
            radio = f.locator('input[name=signType]').first
            sign_type = radio.input_value()
            radio.check(force=True)
            f.locator('[type=checkbox]').check()
            h.submit(f, {'kind':'full','name':'회귀시험','address':'대전 서구 시험 주소','floor':floor,'signType':sign_type,'message':'회귀시험 내용'}, full=True)
    elif case in (7, 8, 9):
        # Banner only exists in LONG form: QuoteForm.tsx:261-277, not QuickQuoteForm.
        f = h.full()
        banner = f.locator('div.border-brand').first
        if case == 8:
            check(banner.count() == 0, 'untrusted item produced banner')
            check('<script>' not in f.inner_text(), 'raw item rendered')
            expected = ''
        else:
            expect(banner).to_be_visible()
            expected = banner.locator('b').inner_text()
            check(bool(expected.strip()), 'empty product banner')
            if case == 9:
                check(expected.startswith('간판디자인: ') and expected.endswith(' 연출)'), 'design not resolved')
        quick = h.quick()
        h.fill_quick(quick)
        quick.locator('[type=checkbox]').check()
        body = h.submit(quick, {'kind':'quick', **({'product':expected} if expected else {})})
        if not expected:
            check(not body.get('product'), 'untrusted item in payload')
    elif case == 10:
        f = h.full()
        expect(f.locator('#message')).to_have_value('[원하는 글씨]\n회귀 글씨')
        check(p.evaluate("sessionStorage.getItem('susanna-custom-font')") is None, 'custom font storage not consumed')
        p.reload(wait_until='networkidle')
        expect(h.full().locator('#message')).to_have_value('')
    elif case == 11:
        f = h.quick()
        expect(f.locator('#quote-name')).to_have_value('회귀시험')
        expect(f.locator('#quote-region')).to_have_value('대전 서구')
        expect(f.locator('#quote-message')).to_have_value('간판 문의 시험')
        check(not f.locator('[type=checkbox]').is_checked(), 'AI consent prechecked')
        check(urlsplit(p.url).fragment == '', 'AI fragment not removed')
        check(not h.captured, 'AI link auto submitted')
        f.locator('[type=checkbox]').check()
        h.submit(f, {'kind':'quick','via':'ai_link','agent':'Regression','message':'간판 문의 시험','name':'회귀시험','region':'대전 서구'})
        check(p.evaluate("sessionStorage.getItem('sd_ai_prefill')") is None, 'AI storage not cleared')
        check(p.evaluate('window.__sdAiPrefill === undefined'), 'AI memory not cleared')
    elif case == 12:  # QuickQuoteForm.tsx:24-31,197-217; app/page.tsx:85-89 (now only mobile copy)
        forms = p.locator('form').filter(has=p.locator('input[id$="-name"]'))
        check(forms.count() >= 1, 'home quick form missing')
        ids = forms.locator('[id]').evaluate_all('(es)=>es.map(e=>e.id)')
        check(len(ids) == len(set(ids)), 'duplicate home form IDs')
        check(forms.locator('label[for]').evaluate_all('''(es)=>es.every(e=>
            document.querySelectorAll('[id="'+e.htmlFor+'"]').length===1 &&
            e.closest('form').contains(document.getElementById(e.htmlFor)))'''), 'label points outside its own form')
        mobile = p.locator('form').filter(has=p.locator('#mobile-name'))
        expect(mobile).to_be_visible()
        mobile.locator('label[for=mobile-name]').click()
        expect(mobile.locator('#mobile-name')).to_be_focused()
    h.safe()


NAMES = ['간편 필수값', '잘못된 전화번호', '개인정보 동의 필수', '간편 정상 전송',
         '짧은 폼·접힌 긴 폼과 긴 폼 필수값', '긴 폼 정상 전송', '정상 item 전달', '악성 item 차단',
         'design 전달', '커스텀 글꼴 일회 소비', 'AI 링크 전달·동의·삭제', '홈 폼 ID와 라벨']


def main():
    if len(sys.argv) != 2 or urlsplit(sys.argv[1]).scheme not in ('http', 'https'):
        print('Usage: python scripts/regress/form.py <URL>')
        return 1
    passed = failed = 0
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chrome')
        for case, name in enumerate(NAMES, 1):
            h = Harness(browser, sys.argv[1].rstrip('/'), mobile=case == 12)
            stop = False
            try:
                run(h, case)
                passed += 1
                print(f'PASS F{case:02} {name}')
            except Exception as e:
                failed += 1
                stop = isinstance(e, SafetyFailure) or bool(h.unsafe)
                print(f'FAIL F{case:02} {name}: {str(e).splitlines()[0]}' + (' [SAFETY STOP]' if stop else ''))
            finally:
                h.context.close()
            if stop:
                break
        browser.close()
    print(f'TOTAL 12 PASS {passed} FAIL {failed} NOT_RUN {12-passed-failed}')
    return int(bool(failed))


if __name__ == '__main__':
    sys.exit(main())
