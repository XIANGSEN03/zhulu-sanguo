# 把单人立绘原画（立绘/原图/<武将id>.jpg，竖版 2:3）做成游戏用的几种尺寸：
#   立绘/<武将id>-full.jpg  整张 720×1080（武将详情页、剧情对话）
#   立绘/<武将id>.jpg       半身像 320×400（4:5）
#   立绘/<武将id>-head.jpg  头像 160×160
#   立绘/faces.js          每张图上脸的位置（剧情对话里立绘的淡出以脸为中心）
# 用法：python tools/crop_art.py   （需要 Pillow）
# 换了某人的原图，记得核对下面 FACE 里他的脸的位置。
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ART = os.path.join(HERE, '..', '立绘')

# 每张原图上脸（鼻梁附近）的中心，按图宽、图高的比例（目测标定）
FACE = {
    'caocao': (.48, .31), 'xunyu': (.49, .33), 'guojia': (.45, .32), 'xunyou': (.58, .33), 'xuchu': (.55, .27), 'xiahoudun': (.50, .30),
    'zhangliao': (.47, .33), 'xiahouyuan': (.53, .33), 'xuhuang': (.55, .31), 'caoren': (.57, .30), 'yujin': (.57, .32),
    'yuanshao': (.50, .33), 'yanliang': (.52, .35), 'tianfeng': (.52, .38), 'shenpei': (.57, .37), 'wenchou': (.60, .33), 'jushou': (.55, .37),
    'zhanghe': (.44, .35), 'gaogan': (.52, .32), 'gaolan': (.56, .35), 'yuanshang': (.57, .35), 'yuantan': (.58, .33),
    'liubei': (.50, .35), 'guanyu': (.52, .32), 'zhangfei': (.50, .35), 'mizhu': (.55, .31), 'sunqian': (.56, .32), 'jianyong': (.55, .33),
    'zhaoyun': (.52, .37), 'zhugeliang': (.50, .31), 'xushu': (.58, .33), 'pangtong': (.50, .37), 'huangzhong': (.50, .33), 'weiyan': (.50, .38), 'machao': (.47, .37),
    'sunce': (.64, .40), 'sunquan': (.50, .36), 'zhangzhao': (.56, .37), 'zhouyu': (.57, .38), 'lusu': (.52, .35), 'ganning': (.56, .36),
    'handang': (.50, .40), 'chengpu': (.43, .38), 'zhoutai': (.55, .33), 'huanggai': (.58, .37), 'taishici': (.60, .36),
}
LABEL_RIGHT = 0.27  # 左上角名牌的右边缘（占图宽），裁半身像和头像时尽量避开


def clamp(v, a, b):
    return max(a, min(b, v))


def place(cx, size, w, keep):
    # 以脸为中心；碰到名牌就往右挪，但脸至少留在左起 keep 的位置
    lr = LABEL_RIGHT * w
    x0 = clamp(cx - size / 2, 0, w - size)
    if x0 < lr:
        x0 = min(lr, cx - keep * size)
    return clamp(x0, 0, w - size)


def main():
    n = 0
    for gid, (fx, fy) in FACE.items():
        src = os.path.join(ART, '原图', gid + '.jpg')
        if not os.path.exists(src):
            print('缺原图：', gid)
            continue
        im = Image.open(src).convert('RGB')
        w, h = im.size
        cx, cy = fx * w, fy * h
        im.resize((720, 1080), Image.LANCZOS).save(os.path.join(ART, gid + '-full.jpg'), quality=84, optimize=True, progressive=True)
        cw = 0.56 * w
        ch = cw * 1.25
        x0 = place(cx, cw, w, 0.34)
        y0 = clamp(cy - 0.36 * ch, 0, h - ch)
        im.crop((round(x0), round(y0), round(x0 + cw), round(y0 + ch))).resize((320, 400), Image.LANCZOS) \
            .save(os.path.join(ART, gid + '.jpg'), quality=86, optimize=True, progressive=True)
        s = 0.30 * w
        x0 = place(cx, s, w, 0.36)
        y0 = clamp(cy - 0.52 * s, 0, h - s)
        im.crop((round(x0), round(y0), round(x0 + s), round(y0 + s))).resize((160, 160), Image.LANCZOS) \
            .save(os.path.join(ART, gid + '-head.jpg'), quality=86, optimize=True)
        n += 1
    faces = ', '.join(f"{k}: [{v[0]}, {v[1]}]" for k, v in FACE.items())
    with open(os.path.join(ART, 'faces.js'), 'w', encoding='utf-8', newline='\n') as f:
        f.write('// 由 tools/crop_art.py 生成：立绘上脸的中心（占图宽、图高的比例）\n')
        f.write('(function (ZL) { ZL.FACES = { ' + faces + ' }; })(globalThis.ZL = globalThis.ZL || {});\n')
    print('已生成', n, '位武将的立绘')


if __name__ == '__main__':
    main()
