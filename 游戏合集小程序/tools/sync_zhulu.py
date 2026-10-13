# 从网页版《逐鹿三国》生成小程序用的 miniprogram/zhulu/engine.js
# 剧本（data.js）、规则（rules.js）、电脑 AI（ai.js）三个文件原样拼在一起，只把全局变量换成模块导出。
# 用法：python tools/sync_zhulu.py [网页版目录，默认是同级的 逐鹿三国/]
import io
import os
import sys

SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '逐鹿三国')
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'miniprogram', 'zhulu', 'engine.js')
TAIL = '})(globalThis.ZL = globalThis.ZL || {});'

parts = [
    '// 由 tools/sync_zhulu.py 从网页版生成，不要直接改这个文件。',
    '// 要改规则或数值：改网页版的 data.js / rules.js / ai.js，再运行 python tools/sync_zhulu.py。',
    'var ZL = {};',
]
for name in ['data.js', 'rules.js', 'ai.js']:
    text = io.open(os.path.join(SRC, name), encoding='utf-8').read().rstrip()
    if not text.endswith(TAIL):
        sys.exit(f'{name} 的结尾不是预期的 {TAIL}，网页版结构变了，先检查一下')
    parts.append(f'// ---------- {name} ----------\n' + text[:-len(TAIL)] + '})(ZL);')
parts.append('module.exports = ZL;\n')

os.makedirs(os.path.dirname(OUT), exist_ok=True)
io.open(OUT, 'w', encoding='utf-8', newline='\n').write('\n'.join(parts))
print('已生成', os.path.normpath(OUT))
