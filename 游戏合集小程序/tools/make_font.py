# 从马善政毛笔楷书（Ma Shan Zheng，SIL OFL 开源字体）里只截取《逐鹿三国》用书法字显示的字，
# 生成 miniprogram/common/font.wxss（字体以 base64 内嵌，不依赖网络；游戏大厅和逐鹿三国共用）。
# 用法：python tools/make_font.py <MaShanZheng-Regular.ttf 路径>
# 需要 fontTools：python -m pip install fonttools
import base64
import io
import os
import re
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
ZHULU = os.path.join(HERE, '..', 'miniprogram', 'zhulu')
engine = io.open(os.path.join(ZHULU, 'engine.js'), encoding='utf-8').read()

chars = set()
# 武将名、城名、势力名与姓氏、中立城守将：这些都会以书法字出现
for pattern in [r"G\('([^']+)'", r"C\('([^']+)'", r"name: '([^']+)'", r"mark: '([^']+)'", r"keeper: '([^']+)'"]:
    for m in re.finditer(pattern, engine):
        chars.update(m.group(1))
# 界面上其余用书法字的固定文字
EXTRA = (
    '逐鹿三国 建安元一二三四五六七八九十年春夏秋冬 黄河长江东海渤海舆图 战守中 攻克败退 必胜占优相当不利 '
    '天下归心大业未竟 令否 官渡前夜子龙来投小霸王陨落河北生变孙刘联盟继位势力覆灭瓦解 '
    '盟人政事 纪事史册 部将守城校尉残 游戏厅'
)
chars.update(c for c in EXTRA if not c.isspace())
text = ''.join(sorted(chars))

font = TTFont(sys.argv[1])
options = subset.Options()
options.flavor = 'woff'
options.layout_features = []
options.name_IDs = ['*']          # 保留版权和许可信息
options.notdef_outline = True
sub = subset.Subsetter(options)
sub.populate(text=text)
sub.subset(font)
font.flavor = 'woff'
buf = io.BytesIO()
font.save(buf)
data = base64.b64encode(buf.getvalue()).decode('ascii')

out = os.path.join(HERE, '..', 'miniprogram', 'common', 'font.wxss')
io.open(out, 'w', encoding='utf-8', newline='\n').write(
    '/* 由 tools/make_font.py 生成：马善政毛笔楷书（SIL OFL 1.1，见 common/OFL.txt）的子集，'
    f'共 {len(text)} 字。 */\n'
    "@font-face { font-family: 'ZLBrush'; font-weight: normal; font-style: normal; "
    f"src: url('data:application/font-woff;charset=utf-8;base64,{data}') format('woff'); }}\n"
)
print(f'{len(text)} 个字，字体 {len(buf.getvalue()) // 1024} KB，已写入 {os.path.normpath(out)}')
