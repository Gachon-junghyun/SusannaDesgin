"""Independent full-table verification and round trip using fontTools."""
from pathlib import Path
import json
import random
import struct
from fontTools.ttLib import TTFont
from fontTools.pens.boundsPen import BoundsPen

OUT = Path(__file__).resolve().parents[1] / '.hfont-test-out'


def checksum(data):
    data += b'\0' * (-len(data) % 4)
    return sum(struct.unpack(f'>{len(data) // 4}I', data)) & 0xFFFFFFFF


def check_file(filename, composite):
    path = OUT / filename
    data = path.read_bytes()
    assert data[:4] == b'\x00\x01\x00\x00', 'Must be a TrueType sfnt'
    assert checksum(data) == 0xB1B0AFBA
    count = struct.unpack_from('>H', data, 4)[0]
    tags = []
    for i in range(count):
        tag, expected, offset, length = struct.unpack_from('>4sIII', data, 12 + 16 * i)
        tags.append(tag)
        table = bytearray(data[offset:offset + length])
        assert offset % 4 == 0
        if tag == b'head':
            adjustment = struct.unpack_from('>I', table, 8)[0]
            table[8:12] = b'\0' * 4
            zeroed = bytearray(data)
            zeroed[offset + 8:offset + 12] = b'\0' * 4
            assert adjustment == (0xB1B0AFBA - checksum(zeroed)) & 0xFFFFFFFF
        assert checksum(table) == expected, f'{tag!r} checksum'
    assert tags == sorted(tags)

    font = TTFont(path, checkChecksums=2)
    font.ensureDecompiled()
    for tag in font.keys():
        _ = font[tag]
    cmap = font.getBestCmap()
    assert all(cp in cmap for cp in range(0xAC00, 0xD7A4)), 'Incomplete syllable cmap'
    assert all(cp in cmap for cp in range(0x3131, 0x3164)), 'Incomplete jamo cmap'
    assert font['head'].unitsPerEm == 1000 and font['head'].indexToLocFormat == 1
    assert font['hhea'].ascent == 880 and font['hhea'].descent == -120
    assert font['hmtx'].metrics[cmap[0x20]][0] == 300
    assert 'glyf' in font and 'CFF ' not in font
    glyf = font['glyf']
    assert glyf[cmap[0xAC00]].numberOfContours != 0
    assert glyf[cmap[0xD7A3]].numberOfContours != 0
    meta = json.loads((OUT / 'fixture_meta.json').read_text(encoding='utf-8'))
    expected_count = 11225 + (len(meta['baseKeys']) if composite else 0)
    assert len(font.getGlyphOrder()) == font['maxp'].numGlyphs == expected_count
    assert glyf[cmap[ord('한')]].numberOfContours > 0
    assert glyf[cmap[ord('가')]].isComposite() == composite

    max_points = max_contours = max_cp = max_cc = max_elements = 0
    boxes = []
    for name in font.getGlyphOrder():
        g = glyf[name]
        width, lsb = font['hmtx'].metrics[name]
        assert width == (300 if name == cmap[0x20] else 1000)
        assert lsb == (g.xMin if g.numberOfContours else 0)
        if not g.numberOfContours:
            continue
        boxes.append((g.xMin, g.yMin, g.xMax, g.yMax))
        coordinates, ends, flags = g.getCoordinates(glyf)
        if g.isComposite():
            max_cp = max(max_cp, len(coordinates))
            max_cc = max(max_cc, len(ends))
            max_elements = max(max_elements, len(g.components))
            for c in g.components:
                assert c.flags & 0x400, 'OVERLAP_COMPOUND missing'
                assert c.flags & 0x1000, 'Explicit unscaled offset missing'
                assert c.transform[0][0] > 0 and c.transform[1][1] > 0
        else:
            max_points = max(max_points, len(coordinates))
            max_contours = max(max_contours, len(ends))
            assert flags[0] & 0x40, 'OVERLAP_SIMPLE missing'
            assert all(flag & 1 for flag in flags)
            first = 0
            for end in ends:
                contour = list(coordinates[first:end + 1])
                assert len(set(contour)) >= 3
                assert all(contour[i] != contour[(i + 1) % len(contour)] for i in range(len(contour)))
                first = end + 1
    m = font['maxp']
    assert (m.maxPoints, m.maxContours, m.maxCompositePoints, m.maxCompositeContours) == (max_points, max_contours, max_cp, max_cc)
    assert m.maxComponentElements == max_elements
    assert m.maxComponentDepth == int(bool(max_elements))
    assert (font['head'].xMin, font['head'].yMin, font['head'].xMax, font['head'].yMax) == (
        min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
    os2 = font['OS/2']
    assert os2.version == 4 and os2.fsType == 0
    assert (os2.usWinAscent, os2.usWinDescent) == (880, 120)
    assert os2.ulUnicodeRange2 & (1 << (52 - 32)) and os2.ulUnicodeRange2 & (1 << (56 - 32))
    assert os2.ulCodePageRange1 & (1 << 19)
    assert font['post'].formatType == 3.0
    records = font['name'].names
    assert {n.nameID for n in records} == {1, 2, 3, 4, 5, 6}
    assert all((n.platformID, n.platEncID, n.langID) == (3, 1, 0x409) for n in records)
    assert font['name'].getDebugName(1) == '시험 한글 Fixture'
    ps = font['name'].getDebugName(6)
    assert ps.startswith('HW') and ps.isascii() and len(ps) <= 63
    assert {(t.platformID, t.platEncID, t.format) for t in font['cmap'].tables} == {(0, 3, 4), (3, 1, 4)}
    font.save(OUT / (path.stem + '_roundtrip.ttf'))
    mode = 'composite' if composite else 'simple'
    print(f'FONTTOOLS_SUMMARY ({mode}): PASS - full decompile, cmap, checksums, metrics, flags, round trip')
    print(f'GLYPH_COUNT ({mode}): {m.numGlyphs}')
    print(f'TTF_SIZE_BYTES ({mode}): {len(data)}')
    return font


fonts = [check_file('fixture.ttf', True), check_file('fixture_simple.ttf', False)]
fixed = list('가각곡왜뷁한힣')
rng = random.Random(20261024)
others = rng.sample([chr(cp) for cp in range(0xAC00, 0xD7A4) if chr(cp) not in fixed], 23)
glyph_sets = [font.getGlyphSet() for font in fonts]
for ch in fixed + others:
    boxes = []
    for font, glyph_set in zip(fonts, glyph_sets):
        pen = BoundsPen(glyph_set)
        glyph_set[font.getBestCmap()[ord(ch)]].draw(pen)
        boxes.append(pen.bounds)
    assert (boxes[0] is None) == (boxes[1] is None), ch
    if boxes[0] is not None:
        assert all(abs(a - b) <= 1 for a, b in zip(*boxes)), (ch, boxes)
print('BOUNDS_SUMMARY: PASS - 30 syllables, composite vs simple within 1 unit')
for font in fonts:
    font.close()
