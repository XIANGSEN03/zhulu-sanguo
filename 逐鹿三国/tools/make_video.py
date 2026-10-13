# 把录好的逐帧画面剪成介绍视频：按分镜取片段、变速、叠字幕，片段之间淡入淡出，最后配乐。
# 用法：python tools/make_video.py <工作目录> <输出 mp4>
#   工作目录里要有：record-video.cjs 录的各镜头帧目录（title/、story/ …）、video_assets.py 生成的 assets/
import json
import os
import subprocess
import sys

WORK, OUT = sys.argv[1], sys.argv[2]
FF = os.environ.get('FFMPEG', 'ffmpeg')
HERE = os.path.dirname(os.path.abspath(__file__))
FPS, XF = 30, 0.5   # 帧率、转场时长（秒）
A = lambda name: os.path.join(WORK, 'assets', name)

# 分镜：('rec', 镜头目录, 起点秒, 终点秒（None=到尾）, 速度, 字幕)
#       ('still', 图片, 时长, 字幕, 缓推)
#       ('pan', 长图, 时长, 字幕)：从左往右平移
SHOTS = [
    ('still', 'opener.png', 3.2, None, True),
    ('rec', 'title', 0.0, None, 1.0, 'title'),
    ('rec', 'story', 0.0, 11.0, 1.15, 'story'),
    ('rec', 'brief', 0.0, None, 1.0, 'brief'),
    ('rec', 'board', 0.0, None, 1.0, 'board'),
    ('rec', 'sandbox', 0.0, None, 1.0, 'sandbox'),
    ('rec', 'order', 0.0, None, 1.15, 'order'),
    ('rec', 'siege', 0.0, 8.95, 1.0, 'siege'),
    ('rec', 'report', 0.0, None, 1.0, 'after'),
    ('rec', 'profile', 0.0, None, 1.0, 'profile'),
    ('rec', 'audience', 1.3, 18.0, 1.7, 'audience'),
    ('rec', 'council', 0.0, 13.7, 1.6, 'council'),
    ('pan', 'gallery.png', 9.0, 'gallery'),
    ('still', 'outro.png', 5.0, None, True),
]
# 字幕只露这么久（秒），之后淡出，免得一直挡画面；None = 整段都在
CAP_MAX = {'siege': 3.2, 'story': 4.5, 'gallery': 3.6}


def run(args):
    r = subprocess.run([FF, '-hide_banner', '-loglevel', 'error', '-y'] + args, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if r.returncode:
        sys.exit(r.stderr[-2000:])


def caption_filter(cap, dur):
    """字幕：比画面晚 0.25 秒淡入，结束前淡出（避开转场）"""
    end = min(dur - 0.75, CAP_MAX.get(cap, 99))
    return (f"[1:v]format=rgba,fade=t=in:st=0.25:d=0.4:alpha=1,"
            f"fade=t=out:st={max(0.8, end):.2f}:d=0.4:alpha=1[c];[v][c]overlay=0:0:shortest=1[o]")


os.makedirs(os.path.join(WORK, 'segs'), exist_ok=True)
REDO = {int(x) for x in os.environ.get('REDO', '').split(',') if x.strip()}
segs, durs, offsets = [], [], []
for i, shot in enumerate(SHOTS):
    path = os.path.join(WORK, 'segs', f's{i:02d}.mp4')
    if shot[0] == 'rec':
        _, name, a, b, speed, cap = shot
        total = len([f for f in os.listdir(os.path.join(WORK, name)) if f.endswith('.jpg')])
        fa, fb = round(a * FPS), total if b is None else min(total, round(b * FPS))
        frames = round((fb - fa) / speed)
        dur = frames / FPS
        base = f"[0:v]setpts=(PTS-STARTPTS)/{speed},fps={FPS},scale=1920:1080:flags=lanczos,setsar=1[v]"
        inputs = ['-framerate', str(FPS), '-start_number', str(fa), '-i', os.path.join(WORK, name, '%04d.jpg')]
    elif shot[0] == 'still':
        _, img, dur, cap, push = shot
        frames = round(dur * FPS)
        dur = frames / FPS
        # 静止画面缓缓推近：先放大到 4K 再缩放，避免抖动
        zoom = f"scale=3840:2160,zoompan=z='1+0.035*on/{frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s=1920x1080:fps={FPS}" if push else f"fps={FPS}"
        base = f"[0:v]{zoom},setsar=1[v]"
        inputs = ['-loop', '1', '-t', f'{dur + 0.2:.3f}', '-i', A(img)]
    else:
        _, img, dur, cap = shot
        frames = round(dur * FPS)
        dur = frames / FPS
        # 长卷平移：放大一倍再裁，子像素也平滑；先慢后快再慢
        base = (f"[0:v]scale=iw*2:ih*2,crop=3840:2160:x='(iw-3840)*(0.5-0.5*cos(PI*min(1\\,n/{frames - 1})))':y=0,"
                f"scale=1920:1080:flags=lanczos,fps={FPS},setsar=1[v]")
        inputs = ['-loop', '1', '-framerate', str(FPS), '-t', f'{dur + 0.2:.3f}', '-i', A(img)]
    if REDO and i not in REDO and os.path.exists(path):
        segs.append(path); durs.append(dur)
        continue
    if cap:
        inputs += ['-loop', '1', '-t', f'{dur + 0.2:.3f}', '-i', A(f'cap_{cap}.png')]
        graph = base + ';' + caption_filter(cap, dur)
    else:
        graph = base.replace('[v]', '[o]')
    run(inputs + ['-filter_complex', graph, '-map', '[o]', '-frames:v', str(frames),
                  '-c:v', 'libx264', '-crf', '15', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-r', str(FPS), path])
    segs.append(path); durs.append(dur)
    print(f'片段 {i:02d}  {dur:5.2f} 秒  {shot[1]}')

# 每个片段在成片里的起点（扣掉转场重叠）
starts, t = [], 0.0
for d in durs:
    starts.append(t); t += d - XF
total = sum(durs) - XF * (len(durs) - 1)

# 配乐：攻城段加鼓，开场、破城印章落下、片尾各一记重鼓
si = next(i for i, s in enumerate(SHOTS) if s[0] == 'rec' and s[1] == 'siege')
siege_start = starts[si]
stamp = siege_start + 7.1 / SHOTS[si][4]   # 攻城动画第 7 秒盖“攻克”印
spec = {'duration': total, 'battle': [siege_start + 0.2, stamp + 0.3], 'hits': [0.25, stamp, starts[-1] + 0.2]}
spec_path = os.path.join(WORK, 'music.json')
json.dump(spec, open(spec_path, 'w', encoding='utf-8'))
music = os.path.join(WORK, 'music.wav')
subprocess.run([sys.executable, os.path.join(HERE, 'video_music.py'), music, spec_path], check=True)


def kind_at(i):
    return 'fadeblack' if i in (1, len(segs) - 1) else 'fade'


def xfade_join(paths, lens, kinds, out, final=False):
    inputs, chain, last, t = [], [], '0:v', 0.0
    for p in paths:
        inputs += ['-i', p]
    for i in range(1, len(paths)):
        t += lens[i - 1] - XF
        chain.append(f"[{last}][{i}:v]xfade=transition={kinds[i - 1]}:duration={XF}:offset={t:.3f}[x{i}]")
        last = f'x{i}'
    chain.append(f"[{last}]format=yuv420p[vout]")
    if final:
        enc = ['-i', music, '-filter_complex', ';'.join(chain), '-map', '[vout]', '-map', f'{len(paths)}:a',
               '-c:v', 'libx264', '-crf', '21', '-preset', 'slow', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
               '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', out]
    else:
        enc = ['-filter_complex', ';'.join(chain), '-map', '[vout]', '-c:v', 'libx264', '-crf', '8', '-preset', 'veryfast', out]
    run(inputs + enc)
    return sum(lens) - XF * (len(lens) - 1)


# 片段太多一次合成会内存不够：先每 5 段合成一个近无损的中间文件，再把中间文件连起来
BATCH = 5
batch_files, batch_lens, batch_kinds = [], [], []
for b, first in enumerate(range(0, len(segs), BATCH)):
    idx = list(range(first, min(first + BATCH, len(segs))))
    path = os.path.join(WORK, 'segs', f'batch{b}.mp4')
    batch_lens.append(xfade_join([segs[i] for i in idx], [durs[i] for i in idx], [kind_at(i) for i in idx[1:]], path))
    batch_files.append(path)
    if b:
        batch_kinds.append(kind_at(first))
    print(f'中间文件 {b}：片段 {idx[0]}–{idx[-1]}')
xfade_join(batch_files, batch_lens, batch_kinds, OUT, final=True)
print(f'成片 {total:.1f} 秒：{OUT}')
