# 介绍视频的配乐：用代码合成，没有任何版权素材。
# 五声音阶（D 宫调）拨弦旋律 + 低音持续音 + 战斗段的战鼓 + 关键时刻的重鼓。
# 用法：python tools/video_music.py <输出 wav> <配置 json：{"duration":秒,"battle":[起,止],"hits":[秒,...]}>
import json
import sys
import wave

import numpy as np

SR = 44100
OUT, SPEC = sys.argv[1], json.load(open(sys.argv[2], encoding='utf-8'))
DUR = SPEC['duration']
N = int(DUR * SR) + SR
rng = np.random.default_rng(200)
mix = np.zeros((N, 2))


def add(sig, t, pan=0.0, gain=1.0):
    i = int(t * SR)
    if i >= N:
        return
    sig = sig[: N - i] * gain
    mix[i:i + len(sig), 0] += sig * (1 - pan) * 0.5 ** 0.5 * 1.2
    mix[i:i + len(sig), 1] += sig * (1 + pan) * 0.5 ** 0.5 * 1.2


def pluck(freq, length=3.2, bright=1.0):
    """拨弦：若干泛音各自衰减，略带非谐性，再加一点拨片噪声"""
    t = np.arange(int(length * SR)) / SR
    s = np.zeros_like(t)
    for n in range(1, 9):
        f = n * freq * (1 + 0.0005 * n * n)
        if f > 9000:
            break
        s += np.sin(2 * np.pi * f * t) * (1 / n ** (1.35 / bright)) * np.exp(-t * (1.4 + 1.1 * n))
    attack = np.minimum(1, t / 0.004)
    noise = rng.standard_normal(len(t)) * np.exp(-t * 60) * 0.08
    return (s + noise) * attack


def drum(big=False):
    """战鼓：下滑的低频 + 鼓皮噪声"""
    length = 1.6 if big else 0.7
    t = np.arange(int(length * SR)) / SR
    f = (55 if big else 75) + (90 if big else 70) * np.exp(-t * 9)
    phase = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(phase) * np.exp(-t * (2.2 if big else 6))
    skin = rng.standard_normal(len(t)) * np.exp(-t * (28 if big else 45)) * 0.35
    return (body + skin) * (1.0 if big else 0.55)


# D 宫调五声音阶：D E F# A B
BASE = 293.66
DEGREES = [0, 2, 4, 7, 9]
def note(step):
    octave, k = divmod(step, 5)
    return BASE * 2 ** ((DEGREES[k] + 12 * octave) / 12)


# 低音持续音：D2 + A2，缓慢起伏
t = np.arange(N) / SR
drone = (np.sin(2 * np.pi * 73.42 * t) * 0.5 + np.sin(2 * np.pi * 110.0 * t) * 0.3 + np.sin(2 * np.pi * 146.83 * t) * 0.12)
drone *= 0.06 * (0.75 + 0.25 * np.sin(2 * np.pi * t / 9.0))
mix[:, 0] += drone
mix[:, 1] += drone

# 旋律：按小节随机游走，偶尔一串快速的刮奏
beat = 60 / 66
pos, step, bar = 1.2, 5, 0
b0, b1 = SPEC['battle']
RHYTHMS = [[1, 1, 2], [1, 0.5, 0.5, 2], [2, 1, 1], [1.5, 0.5, 2], [0.5, 0.5, 1, 2]]
while pos < DUR - 3:
    in_battle = b0 - 0.5 < pos < b1
    if bar % 4 == 0 and not in_battle:
        for k in range(4):   # 刮奏
            add(pluck(note(step - 4 + k), 1.6, 1.2), pos + k * 0.07, pan=-0.3, gain=0.16)
        pos += 0.3
    for d in RHYTHMS[rng.integers(len(RHYTHMS))]:
        step = int(np.clip(step + rng.choice([-2, -1, -1, 1, 1, 2, 0]), 2, 9))
        add(pluck(note(step), 3.0), pos, pan=rng.uniform(-0.25, 0.25), gain=0.22 if not in_battle else 0.14)
        if d >= 2:  # 长音下面垫一个低八度
            add(pluck(note(step - 5), 3.5, 0.8), pos, pan=0.2, gain=0.12)
        pos += d * beat
    bar += 1

# 战斗段：鼓点逐渐加密
tb = b0
while tb < b1:
    add(drum(), tb, pan=-0.1, gain=0.7)
    add(drum(), tb + beat / 2, pan=0.1, gain=0.45 if tb - b0 > 3 else 0.0)
    tb += beat
# 平时每两小节一下轻鼓
tb = 2.0
while tb < DUR - 4:
    if not (b0 - 1 < tb < b1 + 0.5):
        add(drum(), tb, gain=0.22)
    tb += beat * 8
for h in SPEC['hits']:
    add(drum(True), h, gain=1.0)
    add(drum(True), h + 0.18, gain=0.45)

# 简单混响：与指数衰减的噪声做卷积
ir_len = int(1.1 * SR)
ir = rng.standard_normal(ir_len) * np.exp(-np.arange(ir_len) / SR * 4.5)
ir /= np.sqrt((ir ** 2).sum())
def fftconv(x, h):
    # 用 FFT 做卷积：逐点卷积要算上千亿次，FFT 只要几秒
    size = 1 << (len(x) + len(h) - 2).bit_length()
    return np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(h, size), size)[:len(x)]


wet = np.stack([fftconv(mix[:, c], ir) for c in range(2)], axis=1)
out = mix * 0.8 + wet * 0.35

# 淡入淡出、限幅、归一化
fade_in, fade_out = int(1.2 * SR), int(3.0 * SR)
end = int(DUR * SR)
out = out[:end]
out[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
out[-fade_out:] *= np.linspace(1, 0, fade_out)[:, None] ** 1.5
out = np.tanh(out * 1.4) / np.tanh(1.4)
out *= 0.89 / np.max(np.abs(out))
pcm = (out * 32767).astype(np.int16)
with wave.open(OUT, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print(f'配乐 {DUR:.1f} 秒，已写入 {OUT}')
