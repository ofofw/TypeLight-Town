# 点亮小镇

给孩子的中文打字网页游戏：用实体键盘一盏一盏点亮小镇的灯；第二阶段新增「居民任务」——中英文故事任务、居民委托和专项练习，用系统输入法练习完整汉字词句与英文短句。纯静态网页，运行时不连接任何外部服务，进度只保存在本机浏览器里。

交付文档在 [`docs/`](docs/)：[交付说明](docs/交付说明.md)、[验收记录](docs/验收记录.md)、[兼容性报告](docs/兼容性报告.md)、[许可清单](docs/许可清单.md)、[语音台词表](docs/语音台词表.md)。接手开发请先读[开发交接](docs/开发交接.md)。

## 环境要求

| 用途 | 需要 |
|---|---|
| 安装、开发、构建 | Node.js 22.12 或更高（开发和测试用的是 26.13.1），npm |
| 玩游戏 | Mac 上的 Safari 或 Chrome；iPad 上的 Safari，并接好外接键盘 |
| 浏览器端到端测试（可选） | 已安装 Google Chrome；Playwright 的 WebKit（安装方法见下文） |
| 重新生成音乐和语音（可选） | macOS（用系统自带的 `afconvert` 转 AAC）；生成语音还要 Python 3.10–3.13，以及 Node.js 22.18 或更高（脚本直接读取 TypeScript 台词文件） |

不需要付费服务、账号或 API Key。

## 安装

```bash
cd light-town
npm ci
```

`npm ci` 严格按照 `package-lock.json` 安装。

## 启动

开发模式（修改代码后页面自动刷新）：

```bash
npm run dev            # 打开 http://localhost:5173/
```

试玩正式构建版（和部署出去的版本完全一样）：

```bash
npm run build
npm run preview        # 打开 http://localhost:4173/
```

## 构建

```bash
npm run build
```

构建前会先做 TypeScript 类型检查。产物在 `dist/`，大约 2.8 MB，包括页面、脚本、字体、音频、图标和许可文本。所有路径都是相对路径，可以放在任意网址目录下。

仓库里已经附带当前版本构建好的 `dist/`，可以直接部署；改了代码以后重新运行 `npm run build` 会覆盖它。

可以直接双击 `dist/index.html`，或项目外层的 `点亮小镇/index.html`。这两个文件包含游戏脚本、样式、字体和全部音频，无需服务器。`light-town/index.html` 双击时自动跳转到 `dist/index.html`，开发时仍使用 Vite。文件模式与 HTTP 模式的存档相互独立；移动文件或换浏览器可能改变存档位置。iPad 仍推荐通过局域网 Safari 访问。

## 部署

`dist/` 是纯静态文件，复制到任意静态网页服务器即可，例如 Nginx、Caddy、对象存储的静态网站功能，或 `python3 -m http.server`。不需要服务端程序或数据库。

- 公网部署请使用 HTTPS。
- 浏览器按网址分别保存进度，所以换域名或换端口后，原来的进度不会跟过去。
- 本项目尚未发布上线，**线上发布需要另行授权**。

## 在 iPad 上玩（同一网络）

Mac 和 iPad 连同一个 Wi‑Fi。

1. 在 Mac 上构建并对局域网开放预览服务：

   ```bash
   npm run build
   npm run preview:lan
   ```

   macOS 如果询问是否允许 `node` 接受传入连接，选“允许”。

2. 查看 Mac 的本地主机名：打开“系统设置 → 通用 → 共享”，页面底部“本地主机名”一栏，例如 `Example-MacBook-Pro.local`。也可以在终端运行 `scutil --get LocalHostName`，然后在结果后面加上 `.local`。

3. 在 iPad 的 Safari 地址栏输入 `http://<本地主机名>.local:4173/`，例如 `http://Example-MacBook-Pro.local:4173/`。

   请固定用这个 `.local` 地址，不要用终端里显示的 IP 地址。IP 可能变化，而浏览器按网址保存进度，地址一变，进度看起来就“不见了”。

4. 接好外接键盘后开始玩。练习时不需要也不会弹出屏幕键盘。

5. 可选：点 Safari 的“分享 → 添加到主屏幕”，以后从主屏幕图标打开。注意，主屏幕版和 Safari 标签页里的进度是分开保存的。

关于存储：如果连续 7 天（按使用 Safari 的天数计算）没有打开本游戏，Safari 可能会自动清除它在本机保存的进度。家长页和设置页也写了这一点。

Mac 停止 `preview:lan` 或进入睡眠后，iPad 就打不开游戏了。正式长期使用应部署到一台常开的服务器上（需另行授权）。

## 测试

```bash
npm test                 # Vitest 单元测试：课程、出题、输入、结算、统计、存档、音频
npm run typecheck        # 类型检查（源码与测试）
```

浏览器端到端测试（Playwright）：

```bash
npx playwright install webkit    # 第一次运行前：下载 Playwright 的 WebKit
npm run build
caffeinate -du npm run test:e2e  # 会自动启动 vite preview（4173 端口）
```

测试分三组：

| 名称 | 实际使用的浏览器 |
|---|---|
| `chrome` | 本机安装的 Google Chrome |
| `webkit` | Playwright 自带的 WebKit（Safari 的内核，但不是 Safari 本身） |
| `ipad-sim` | WebKit 加上 iPad 的尺寸、触摸和 UA，只是模拟，不能代替 iPad 真机 |

结果写入 `test-results/e2e-results.json`。

`caffeinate -du` 用来防止 Mac 在测试中途关闭显示器。显示器休眠时，无界面的 WebKit 会把鼠标点击送到错误的坐标，导致大批测试超时。

### 真实 Safari 键盘巡检

Playwright 不能驱动真正的 Safari，所以另有一个脚本，通过 macOS 自带的 `safaridriver` 在真实 Safari 里走一遍主要的键盘流程：

- 首页 → 选伙伴 → 引导 → 第一关
- 按键延迟测量、连错两次放大目标键、Shift 大写字母
- Escape 暂停、Tab 停在菜单内；切换标签页后自动暂停
- 刷新后恢复
- 结果页 Enter 防误触
- 结束本次 → 本次成果 → 小镇
- 空格不滚动页面
- 声音文件加载、设置里的“全部声音”开关
- 四种窗口尺寸下的版面检查（与 `tests/e2e/layout.spec.ts` 的规则相同）

Caps Lock 状态和中文输入法组字 WebDriver 模拟不出来，需要人手动检查（见[兼容性报告](docs/兼容性报告.md)）。

第一次运行前，在 Safari 里打开两个设置（或者在终端运行一次 `safaridriver --enable`）：

1. 设置 → 高级 → 勾选“显示网页开发者功能”。
2. 设置 → 开发者 → 勾选“允许远程自动化”。

然后：

```bash
npm run build
npm run preview          # 另开一个终端运行下面这行
npm run test:safari      # 结果写入 docs/evidence/safari-real.json
```

脚本运行在 Safari 单独的自动化窗口里，网站数据是临时、隔离的，不会读取或改动你平时在 Safari 里的游戏进度。

## 素材生成

所有图片都由代码绘制（`src/art/`），没有图片文件。音乐和音效由代码合成，语音由开源 TTS 模型在本机离线生成。生成结果已经放在 `public/` 里，平时不需要重新生成。

| 命令 | 作用 |
|---|---|
| `npm run art:preview` | 把 12 座建筑、4 个街区、3 个伙伴、饰品等画成预览图，输出到 `.cache/preview/` |
| `npm run audio` | 重新合成背景音乐和 4 种音效，写入 `public/audio/` |
| `npm run icons` | 由 `public/icon.svg` 生成主屏幕图标 PNG |
| `node scripts/tour.mjs <网址> <输出目录> <宽> <高> chrome\|webkit` | 按首次游玩的路线把 28 个画面截图 |

### 语音生成

语音使用 Kokoro-82M-v1.1-zh 模型（Apache-2.0）和 `zf_001` 声音，完全离线运行。第一阶段台词在 `src/config/voice.ts`；第二阶段的读音来自 `src/config/phase2/content.json`、提示台词在 `src/config/phase2/voice.ts`。

> 本机如装不了 requirements.txt 固定的 torch 版本，可用较新的 Python（3.10–3.13）建 venv 并安装 `torch==2.6.0 kokoro==0.9.4 "misaki[zh]==0.9.4" soundfile numpy`（第二阶段生成环境用的是 uv 管理的 Python 3.13 + torch 2.6.0）。

```bash
python3.10 -m venv scripts/.venv        # 或 uv venv --python 3.13 scripts/.venv
scripts/.venv/bin/pip install -r scripts/voice/requirements.txt
scripts/.venv/bin/python scripts/voice/download_model.py      # 下载固定版本的模型到 scripts/models/（约 360 MB，不入库）
scripts/.venv/bin/python scripts/voice/generate.py            # 生成第一阶段 public/audio/voice/*.m4a
scripts/.venv/bin/python scripts/voice/generate-phase2.py     # 生成第二阶段 public/audio/phase2/voice/*.m4a（115 个）
scripts/.venv/bin/python scripts/voice/verify-phase2.py       # 第二阶段读音链与音频核对（--asr 加 Whisper 转写核对）
```

想换一种声音，可以先试听：

```bash
scripts/.venv/bin/python scripts/voice/generate.py --audition   # 同一句话用 8 种声音朗读，输出到 .cache/voice-audition/
scripts/.venv/bin/python scripts/voice/generate.py --voice zf_018
```

改完台词后，可以用 Whisper 把语音转成文字，和台词逐句比对（只用于检查，不随游戏分发）：

```bash
scripts/.venv/bin/pip install -r scripts/voice/requirements-verify.txt
scripts/.venv/bin/python scripts/voice/download_model.py --whisper   # 约 1.5 GB
scripts/.venv/bin/python scripts/voice/verify.py
```

## 目录结构

```
light-town/
├── index.html                页面入口（含脚本加载失败时的“重新加载”提示）
├── src/
│   ├── config/               集中配置：课程与手指映射、建筑与街区、商品、奖励与时间规则、词库、语音台词、音频
│   ├── core/                 纯逻辑：出题、输入分类、关卡、结算、统计、鼓励语、存档（校验/备份/租约）
│   ├── app/                  控制器（状态、存档写入、多页面租约）、音频管理
│   ├── ui/                   12 个页面与组件
│   ├── art/                  SVG 美术：buildings（建筑、街区、庆祝）、partners（伙伴、饰品、双手）
│   ├── styles/               样式与字体声明
│   └── assets/fonts/         Andika 字体（目标字母用）
├── public/                   音频、图标、manifest、许可文本（原样复制到 dist/）
├── tests/
│   ├── unit/                 Vitest 单元测试
│   ├── e2e/                  Playwright 端到端测试
│   └── preview/              美术预览图生成
├── scripts/
│   ├── audio/                音乐与音效合成
│   ├── voice/                语音生成与校验（Python）
│   ├── icons.mjs             图标生成
│   ├── tour.mjs、shot.mjs    截图工具
│   └── safari-check.mjs      真实 Safari 键盘巡检
└── docs/                     交付文档与测试证据
```

`.cache/` 是本地临时目录（预览图、截图、日志、模型缓存），不入库。

## 两个人轮流玩与存档备份

每次打开先选择玩家，两人角色、金币、课程与未完成任务独立保存。原单人进度自动归玩家一。选人页或设置页的“备份与恢复”可导出两人 JSON 文件、整体恢复并撤销最近一次恢复。清空只影响当前选定玩家。

进度仍自动保存在浏览器中；备份文件下载后由家长保管，不会自动写入游戏目录。操作方法见[双玩家与备份使用说明](docs/双玩家与备份使用说明.md)。
