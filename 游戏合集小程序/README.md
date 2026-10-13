# 游戏合集小程序

一个微信小程序里放两个单机游戏：首页是游戏大厅，点卡片进入对应的游戏。

- **逐鹿三国**：回合制势力争霸，由网页版 `仓库里的 `逐鹿三国/`` 移植而来
- **仓库推箱子 3D**：17 关推箱子，由 `D:\仓库推箱子3D\微信小程序` 复制而来

## 怎么打开

1. 打开微信开发者工具，选「小程序 → 导入项目」，目录选**本文件夹**（有 `project.config.json` 的这一层）。
2. AppID 用的是推箱子原来那个测试号 `wx2372b6d4147278e8`，直接点「编译」即可。

两个游戏的进度都存在手机本地。因为和原来的推箱子工程用同一个测试号，推箱子的进度两边共用。

## 文件结构

| 位置 | 是什么 |
| --- | --- |
| `miniprogram/pages/home/` | 游戏大厅（主包），显示两边的存档进度 |
| `miniprogram/common/font.wxss` | 书法字体（马善政毛笔楷书的子集，只含游戏用到的 225 个字，开源协议见同目录 `OFL.txt`） |
| `miniprogram/zhulu/` | 逐鹿三国分包 |
| `zhulu/engine.js` | 剧本 + 规则 + 电脑 AI，**由脚本从网页版生成，不要直接改** |
| `zhulu/view.js` | 把对局状态整理成页面要显示的数据 |
| `zhulu/map.js` | 用 Canvas 画舆图底图（绢本、海、河、山、势力晕染、道路） |
| `zhulu/pages/game/` | 页面：开场、地图、下令、战斗、战报、史册 |
| `miniprogram/sokoban/` | 推箱子分包，和原工程一样的结构 |
| `tools/` | 同步、生成字体、自测、操控开发者工具的脚本 |
| `预览/` | 开发者工具模拟器里的截图（不是真机截图） |

## 改逐鹿三国的规则或数值

规则只在网页版改一处，然后同步过来：

```powershell
python tools/sync_zhulu.py
```

如果加了新武将、新城池（出现新的字），还要重新生成字体：

```powershell
python -m pip install fonttools
python tools/make_font.py <MaShanZheng-Regular.ttf 的路径>
```

字体文件从 Google Fonts 的开源仓库下载：`https://raw.githubusercontent.com/google/fonts/main/ofl/mashanzheng/MaShanZheng-Regular.ttf`。

## 推箱子和原工程的区别

这里是独立的一份拷贝，原工程改了不会自动同步过来。复制过来时改了四处：

- `game/audio.js`：音效路径加上 `/sokoban` 前缀
- `pages/game/index.js`：分享路径加上 `/sokoban`；新增 `onBack`（回大厅）
- `pages/game/index.wxml`：标题左边加了返回按钮
- `pages/game/index.wxss`：原来 `app.wxss` 里的全局样式挪进页面样式

## 自测

不用开微信就能跑的检查（需要 Node.js 18 或更新版本）：

```powershell
node tools/test_zhulu.cjs
```

在开发者工具里自动点一遍、截图：

```powershell
& "D:\安装的app\微信web开发者工具\cli.bat" auto --project "<仓库路径>\游戏合集小程序" --auto-port 9423
$env:WX_AUTO_PORT=9423; node tools/wx-auto.cjs run "tap:.card.zl" "wait:2000" "shot:预览/a.png"
```

步骤写法见 `tools/wx-auto.cjs` 开头的注释。这次新加了 `rect:选择器`，用来读元素在页面上的位置。

## 已知情况

- 舆图没有直接用 Canvas 显示，而是在屏幕外画好、导出成图片再显示。原因是开发者工具里，放在滚动区域里的 Canvas 会浮在所有内容上面，盖住城池和顶栏。
- 只在开发者工具的模拟器里验证过，还没在真机上试。
- 这是测试号，只适合自己开发和体验。微信规定游戏必须用「小游戏」账号发布，普通小程序不能上架游戏；三国题材用个人账号做小游戏也很可能被归为角色类、上不了线。所以这个合集适合自己玩、给朋友演示，不适合正式发布。
