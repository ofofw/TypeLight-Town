# F01 干净环境安装记录

日期：2026-11-12。被测代码：提交 `40576dc`。

## 做法

1. 用 `git archive` 把提交里的 `light-town/` 导出到新目录。导出内容不含 `node_modules`、缓存或未提交的文件。
2. 每个 Node 版本各用一个空的 npm 缓存目录。
3. 用 `env -i` 清空环境变量，`PATH` 只保留所选的 Node 和系统命令。
4. 按 README 的命令执行。

## 结果

| 步骤 | Node 26.13.1 / npm 11.20.0 | Node 22.23.5 / npm 10.9.9 |
|---|---|---|
| `npm ci` | 成功，安装 52 个包（177 秒） | 成功，安装 52 个包（95 秒） |
| `npm run typecheck` | 通过 | 通过 |
| `npm test` | 7 个文件、97 项全部通过 | 7 个文件、97 项全部通过 |
| `npm run build` | 成功；新产物与提交中的 `dist/` 逐字节相同（`diff -r` 无差异） | 同左 |
| `npm run preview` | 首页 200；主脚本 200（517534 字节）；背景音乐 200（931068 字节） | 同左 |
| `npm run dev` | 首页 200；`/src/main.tsx` 200 | 同左 |
| `npm run test:e2e` | 在开发目录中运行：90 项通过，3 项按设计跳过 | 在干净目录中运行：90 项通过，3 项按设计跳过 |

运行端到端测试时，复用了本机已经下载好的 Playwright WebKit（设置了 `PLAYWRIGHT_BROWSERS_PATH`），没有重新执行 `npx playwright install webkit`。

Node 22.23.5 是从 nodejs.org 下载的官方 macOS arm64 版本，压缩包的 SHA-256 与官方 `SHASUMS256.txt` 一致（`e7131995759b61a0170b646010d2ad35a5d37b4cb0d471f3e8317eac6f742f3d`）。

## 局域网访问（README 中的 iPad 步骤，Mac 一侧）

运行 `npm run preview:lan` 和 `npm run dev:lan` 后，在 Mac 上用本地主机名访问：

| 地址 | 结果 |
|---|---|
| `http://<本地主机名>.local:4183/`（preview:lan） | 200，主脚本 200 |
| `http://<本地主机名>.local:5183/`（dev:lan） | 200 |
| 伪造的 `Host: attacker.example` | 403（其他主机名仍被拒绝） |

修复前，用 `.local` 地址访问返回 403，因为 Vite 默认只接受 localhost 和 IP 地址。现在已在 `vite.config.ts` 中加入 `allowedHosts: ['.local']`。iPad 端的访问没有测试。

## 其他

npm 11 默认不运行依赖包的安装脚本，会提示 `fsevents` 的安装脚本未经批准。`fsevents` 自带编译好的文件，不需要运行安装脚本，因此已在 `package.json` 的 `allowScripts` 中明确写为 `false`。之后 `npm ci` 不再出现这条提示。
