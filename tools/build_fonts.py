#!/usr/bin/env python3
"""按本站实际用字子集化并自托管字体（国内无法访问 Google Fonts）。

字体来源：npm 上的 Fontsource 包（SIL OFL 1.1）
  npm pack @fontsource/ma-shan-zheng @fontsource/noto-serif-sc
  并分别解压到 <src>/ma-shan-zheng 与 <src>/noto-serif-sc
依赖：pip install fonttools brotli

用法：python3 tools/build_fonts.py <src>
输出：assets/fonts/*.woff2 与 assets/css/fonts.css
修改页面文字后重新运行即可；未覆盖的字会回退到系统字体。
"""
import os
import re
import sys
from html.parser import HTMLParser

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'fonts')
TEXT_FILES = ['index.html', 'assets/data/archive.js', 'assets/js/main.js', 'assets/js/courtyard3d.js']

# 使用书法字体的元素（与 style.css 中 var(--brush) 的用法一致）
BRUSH_CLASSES = {
    'sec-no', 'sec-head__quote', 'pull', 'couplet__col', 'plaque__face', 'mud__k', 'cards3__k',
    'story__k', 'gudu__orig', 'seg', 'motifs__x',
}
BRUSH_EXTRA = '康家滩欣院壹贰叁肆伍陆柒捌玖拾勤俭谦和中原大漠晨午暮夜0123456789'


class BrushText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack = []
        self.chars = set()

    def handle_starttag(self, tag, attrs):
        cls = set((dict(attrs).get('class') or '').split())
        inside = bool(cls & BRUSH_CLASSES) or (tag == 'h1') or (tag == 'b' and self._in('menu')) or \
            (tag == 'b' and self._in('four')) or (tag == 'span' and self._in('motifs__col'))
        self.stack.append((tag, cls, inside))

    def _in(self, c):
        return any(c in s[1] for s in self.stack)

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                del self.stack[i:]
                break

    def handle_data(self, data):
        if any(s[2] for s in self.stack):
            self.chars.update(data)


def site_chars():
    text = ''
    for f in TEXT_FILES:
        with open(os.path.join(ROOT, f), encoding='utf8') as fh:
            text += fh.read()
    return set(text) | {chr(c) for c in range(32, 127)} | set('·—“”‘’…、，。：；！？（）《》〔〕〇')


def brush_chars():
    p = BrushText()
    with open(os.path.join(ROOT, 'index.html'), encoding='utf8') as fh:
        p.feed(fh.read())
    return {c for c in (p.chars | set(BRUSH_EXTRA)) if not c.isspace()}


def faces(css_path):
    css = open(css_path, encoding='utf8').read()
    out = []
    for body in re.findall(r'@font-face\s*{(.*?)}', css, re.S):
        url = re.search(r'url\(\./files/([^)]+?\.woff2)\)', body)
        ur = re.search(r'unicode-range:\s*([^;]+);', body)
        if not url or not ur:
            continue
        cps = set()
        for part in ur.group(1).split(','):
            part = part.strip().upper().replace('U+', '')
            if '-' in part:
                a, b = part.split('-')
                cps.update(range(int(a, 16), int(b, 16) + 1))
            elif '?' in part:
                cps.update(range(int(part.replace('?', '0'), 16), int(part.replace('?', 'F'), 16) + 1))
            else:
                cps.add(int(part, 16))
        out.append((url.group(1), cps))
    return out


def ranges(cps):
    cps = sorted(cps)
    res, start, prev = [], cps[0], cps[0]
    for c in cps[1:]:
        if c == prev + 1:
            prev = c
            continue
        res.append((start, prev))
        start = prev = c
    res.append((start, prev))
    return ', '.join(f'U+{a:X}' if a == b else f'U+{a:X}-{b:X}' for a, b in res)


def build(pkg_dir, css_name, chars, family, weight, prefix):
    cps_needed = {ord(c) for c in chars}
    rules = []
    n = 0
    for fname, cps in faces(os.path.join(pkg_dir, css_name)):
        hit = cps & cps_needed
        if not hit:
            continue
        font = TTFont(os.path.join(pkg_dir, 'files', fname))
        cmap = font.getBestCmap()
        hit = {c for c in hit if c in cmap}
        if not hit:
            continue
        opts = subset.Options()
        opts.flavor = 'woff2'
        opts.layout_features = ['*']
        opts.name_IDs = ['*']
        opts.notdef_outline = True
        sub = subset.Subsetter(opts)
        sub.populate(unicodes=hit)
        sub.subset(font)
        out_name = f'{prefix}-{n:02d}.woff2'
        font.flavor = 'woff2'
        font.save(os.path.join(OUT, out_name))
        rules.append(
            f"@font-face {{ font-family: '{family}'; font-style: normal; font-weight: {weight}; font-display: swap;"
            f" src: url(../fonts/{out_name}) format('woff2'); unicode-range: {ranges(hit)}; }}"
        )
        n += 1
    return rules


def main():
    src = sys.argv[1]
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        if f.endswith('.woff2'):
            os.remove(os.path.join(OUT, f))
    all_chars = site_chars()
    brush = brush_chars()
    rules = ['/* 由 tools/build_fonts.py 生成：按本站用字子集化的 Ma Shan Zheng 与 Noto Serif SC（SIL OFL 1.1） */']
    rules += build(os.path.join(src, 'ma-shan-zheng'), '400.css', brush, 'Xinyuan Brush', 400, 'brush')
    rules += build(os.path.join(src, 'noto-serif-sc'), '400.css', all_chars, 'Xinyuan Serif', 400, 'serif-400')
    rules += build(os.path.join(src, 'noto-serif-sc'), '900.css', all_chars, 'Xinyuan Serif', 900, 'serif-900')
    with open(os.path.join(ROOT, 'assets', 'css', 'fonts.css'), 'w', encoding='utf8') as fh:
        fh.write('\n'.join(rules) + '\n')
    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT) if f.endswith('.woff2'))
    print(f'brush chars: {len(brush)}, site chars: {len(all_chars)}, faces: {len(rules) - 1}, total {total / 1024:.0f} KB')


if __name__ == '__main__':
    main()
