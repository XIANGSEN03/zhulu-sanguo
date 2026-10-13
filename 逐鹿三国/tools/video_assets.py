# 生成介绍视频的画面素材：片头、片尾、字幕条、群英立绘长卷（除长卷外都是 1920x1080 PNG）
# 用法：python tools/video_assets.py <输出目录> <马善政 TTF> <思源黑体粗 TTF> <思源黑体常规 TTF>
# 字体可以从 Google Fonts 下载：Ma Shan Zheng、Noto Sans SC。
import json
import os
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT, BRUSH_TTF, SANS_B, SANS = sys.argv[1:5]
HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.dirname(HERE)
os.makedirs(OUT, exist_ok=True)
W, H = 1920, 1080
TENT = (19, 27, 29)
SILK_HI = (234, 220, 184)
TEXT = (236, 226, 204)
DIM = (164, 156, 137)
BRONZE = (201, 160, 102)
SEAL = (181, 63, 43)
FACTION = {'wei': (74, 120, 168), 'yuan': (194, 147, 48), 'shu': (76, 147, 97), 'wu': (192, 78, 55), None: (120, 112, 98)}


def font(path, size):
    return ImageFont.truetype(path, size)


def has_glyph(f, ch):
    """书法字体缺字时会画成方框（.notdef），和一个肯定没有的字比一比"""
    return bytes(f.getmask(ch)) != bytes(f.getmask('\U0010FFFD'))


def text_mixed(draw, xy, text, f, fallback, fill, anchor='lm'):
    """逐字写，书法字体里缺的字换成后备字体（如 荀彧 的 彧、夏侯惇 的 惇）"""
    x, y = xy
    for ch in text:
        g = f if has_glyph(f, ch) else fallback
        draw.text((x, y), ch, font=g, fill=fill, anchor=anchor)
        x += draw.textlength(ch, font=g)


def tent_bg(w=W, h=H):
    """深黛军帐底：中间略亮的径向光晕"""
    img = Image.new('RGB', (w, h), TENT)
    glow = Image.new('L', (w, h), 0)
    ImageDraw.Draw(glow).ellipse((w * 0.18, h * 0.05, w * 0.82, h * 0.95), fill=70)
    glow = glow.filter(ImageFilter.GaussianBlur(220))
    return Image.composite(Image.new('RGB', (w, h), (36, 50, 52)), img, glow)


def seal_block(draw, x, y, w, h, chars, size):
    draw.rounded_rectangle((x, y, x + w, y + h), radius=8, fill=SEAL)
    f = font(BRUSH_TTF, size)
    step = h / (len(chars) + 0.2)
    for i, ch in enumerate(chars):
        draw.text((x + w / 2, y + step * (i + 0.6)), ch, font=f, fill=SILK_HI, anchor='mm')


# ---------- 字幕条 ----------
CAPTIONS = json.load(open(os.path.join(HERE, 'video_captions.json'), encoding='utf-8'))
for cap in CAPTIONS:
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    band = Image.new('L', (1, 330))
    for i in range(330):
        band.putpixel((0, i), int(236 * min(1, (i / 250)) ** 1.3))
    shade = Image.new('RGBA', (W, 330), (12, 17, 18, 0))
    shade.putalpha(band.resize((W, 330)))
    img.alpha_composite(shade, (0, H - 330))
    d = ImageDraw.Draw(img)
    x0, y0 = 116, 930
    d.rounded_rectangle((x0, y0, x0 + 66, y0 + 66), radius=8, fill=SEAL)
    d.text((x0 + 33, y0 + 35), cap['seal'], font=font(BRUSH_TTF, 46), fill=SILK_HI, anchor='mm')
    text_mixed(d, (x0 + 92, y0 + 14), cap['eyebrow'], font(BRUSH_TTF, 38), font(SANS_B, 32), (222, 182, 120), 'ls')
    d.text((x0 + 92, y0 + 36), cap['text'], font=font(SANS_B, 42), fill=TEXT, anchor='la')
    img.save(os.path.join(OUT, f"cap_{cap['id']}.png"))

# ---------- 片头 ----------
img = tent_bg()
d = ImageDraw.Draw(img)
title_font = font(BRUSH_TTF, 104)
title = '建安五年　官渡前夜'   # 书法字体里没有间隔号，用全角空格隔开
tw = d.textlength(title, font=title_font)
d.text((W / 2 - 46, H / 2 - 10), title, font=title_font, fill=SILK_HI, anchor='mm')
seal_block(d, W / 2 - 46 + tw / 2 + 30, H / 2 - 70, 62, 120, '逐鹿', 44)
d.text((W / 2, H / 2 + 110), '公元 200 年，群雄逐鹿，天下二十二城待定', font=font(SANS, 34), fill=DIM, anchor='mm')
img.save(os.path.join(OUT, 'opener.png'))

# ---------- 片尾 ----------
img = tent_bg()
d = ImageDraw.Draw(img)
d.text((W / 2 - 60, H / 2 - 90), '逐鹿三国', font=font(BRUSH_TTF, 220), fill=SILK_HI, anchor='mm')
seal_block(d, W / 2 + 400, H / 2 - 190, 70, 140, '建安', 50)
d.text((W / 2, H / 2 + 90), '回合制势力争霸 · 单机可玩', font=font(SANS_B, 46), fill=TEXT, anchor='mm')
d.text((W / 2, H / 2 + 158), '四十六幅武将立绘　·　剧情对白　·　3D 沙盘与攻城', font=font(SANS, 34), fill=DIM, anchor='mm')
d.text((W / 2, H / 2 + 222), '网页版　·　微信小程序', font=font(SANS, 36), fill=BRONZE, anchor='mm')
img.save(os.path.join(OUT, 'outro.png'))

# ---------- 群英立绘长卷：两行全身立绘，按势力排，视频里从左往右平移 ----------
data = json.loads(subprocess.run(['node', '-e', "require('./data.js'); process.stdout.write(JSON.stringify(Object.entries(ZL.GENERALS).map(([id, g]) => [id, g.name, g.faction || null])))"],
                                 cwd=GAME, capture_output=True, text=True, encoding='utf-8', check=True).stdout)
order = ['wei', 'yuan', 'shu', 'wu', None]
gens = sorted(data, key=lambda g: order.index(g[2] if g[2] in order else None))
gens = [g for g in gens if os.path.exists(os.path.join(GAME, '立绘', f'{g[0]}-full.jpg'))]
ROWS, CH, CW, GAP, TOP = 2, 470, 300, 22, 40
cols = (len(gens) + ROWS - 1) // ROWS
PAD = 140   # 长卷两头留一点边
strip_w = cols * (CW + GAP) + GAP + CW // 2 + PAD * 2
img = tent_bg(strip_w, H)
d = ImageDraw.Draw(img)
name_f = font(BRUSH_TTF, 40)
name_fb = font(SANS_B, 34)
for i, (gid, name, fac) in enumerate(gens):
    r, c = i % ROWS, i // ROWS
    x = PAD + GAP + c * (CW + GAP) + (CW // 2 if r else 0)
    y = TOP + r * (CH + 32)
    art = Image.open(os.path.join(GAME, '立绘', f'{gid}-full.jpg')).convert('RGB')
    s = max(CW / art.width, CH / art.height)
    art = art.resize((round(art.width * s), round(art.height * s)), Image.LANCZOS)
    art = art.crop(((art.width - CW) // 2, 0, (art.width - CW) // 2 + CW, CH))
    mask = Image.new('L', (CW, CH), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, CW - 1, CH - 1), radius=14, fill=255)
    shadow = Image.new('L', (CW + 60, CH + 60), 0)
    ImageDraw.Draw(shadow).rounded_rectangle((30, 40, CW + 30, CH + 40), radius=18, fill=170)
    shadow = shadow.filter(ImageFilter.GaussianBlur(14))
    img.paste((0, 0, 0), (x - 30, y - 30), shadow)
    img.paste(art, (x, y), mask)
    # 底部渐暗 + 名字 + 势力色条
    fade = Image.new('L', (CW, 130), 0)
    for k in range(130):
        ImageDraw.Draw(fade).line((0, k, CW, k), fill=int(220 * (k / 130) ** 1.4))
    fade_mask = Image.new('L', (CW, CH), 0)
    fade_mask.paste(fade, (0, CH - 130))
    fade_mask = Image.composite(fade_mask, Image.new('L', (CW, CH), 0), mask)
    img.paste((14, 18, 19), (x, y), fade_mask)
    d.rounded_rectangle((x + 18, y + CH - 54, x + 26, y + CH - 18), radius=3, fill=FACTION.get(fac, FACTION[None]))
    text_mixed(d, (x + 38, y + CH - 36), name, name_f, name_fb, SILK_HI)
img.save(os.path.join(OUT, 'gallery.png'))
print('素材已生成：', len(CAPTIONS), '条字幕 + 片头 + 片尾 + 群英长卷', img.size, len(gens), '人')
