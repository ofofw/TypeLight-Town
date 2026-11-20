# 点亮小镇

给孩子的中文打字网页游戏：用实体键盘一盏一盏点亮小镇的灯。适用于 Mac 上的 Safari 或 Chrome，以及接外接键盘的 iPad Safari。纯静态网页，不连接外部服务，进度只保存在本机浏览器里。

| 目录 | 内容 |
|---|---|
| `light-town/` | 游戏源码、构建好的 `dist/`、测试和全部交付文档 |
| `开发需求描述/` | 产品需求文档、开发验收清单、需求澄清记录 |

## 想玩

游戏通过本地网页服务运行（2026-11-20 起不再支持双击文件直接打开）。

需要 Node.js 22.12 或更高版本（[nodejs.org](https://nodejs.org/) 下载 LTS 版）。

```bash
cd light-town
npm ci
npm run preview        # 浏览器打开 http://localhost:4173/
```

在 iPad 上玩、部署和测试的方法见 [`light-town/README.md`](light-town/README.md)。

## 想接着开发

请先读 [`light-town/docs/开发交接.md`](light-town/docs/开发交接.md)。AI agent 会自动读取本目录的 `AGENTS.md`。

本项目尚未发布上线，线上发布需要需求方另行授权。

## 后续开发规范

任何模型或编码工具均从 [spec/README.md](spec/README.md) 开始。未自动读取项目规则的工具使用 [任务启动提示](spec/START-HERE.md)。

## 两个人轮流玩与存档备份

每次打开先选择玩家，两人角色、金币、课程与未完成任务独立保存。原单人进度自动归玩家一。选人页或设置页的“备份与恢复”可导出两人 JSON 文件、整体恢复并撤销最近一次恢复。清空只影响当前选定玩家。

进度仍自动保存在浏览器中；备份文件下载后由家长保管，不会自动写入游戏目录。操作方法见[双玩家与备份使用说明](light-town/docs/双玩家与备份使用说明.md)。
