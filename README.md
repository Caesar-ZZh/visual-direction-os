<div align="center">

# 🎬 Visual Direction OS — v2.0

### Narrative becomes visual behavior. —— 叙事即视觉行为

**一套把「电影 / 动画 / 游戏 / 广告」的视觉规律，拆成可查、可看、可推演的导演操作系统。**
不是又一份"配色灵感"收藏，而是一台真的能跑的机器。

✨ 零构建 · 零依赖 · 双击即玩 · 中英双语 ✨

[![Tech](https://img.shields.io/badge/Tech-Vanilla%20HTML%2FCSS%2FJS-c4a362?style=flat-square)](https://github.com/Caesar-ZZh/123)
[![Version](https://img.shields.io/badge/Version-2.0-cc4444?style=flat-square)](https://github.com/Caesar-ZZh/123)
[![Build](https://img.shields.io/badge/Build-None%20Needed-4a9a5a?style=flat-square)](https://github.com/Caesar-ZZh/123)
[![Deploy](https://img.shields.io/badge/Deploy-GitHub%20Pages%20Ready-4a7fa8?style=flat-square)](https://github.com/Caesar-ZZh/123)
[![QA](https://img.shields.io/badge/QA-50%2F50%20checks-cc4444?style=flat-square)](https://github.com/Caesar-ZZh/123)
[![License](https://img.shields.io/badge/License-待补充-lightgrey?style=flat-square)](https://github.com/Caesar-ZZh/123)

</div>

---

## 🎛️ STUDIO v2.1（开发中）

`agent/director-workspace-v2-1` 在现有 SYSTEM 之上增加一个独立的导演工作空间，而不是替换当前知识首页。

```text
/                     SYSTEM · editorial knowledge experience
/studio/              STUDIO · Director Workspace v2.1
```

SYSTEM 继续负责知识、方法论和案例浏览；STUDIO 负责 Project Context、Narrative、Direct、Diagnose、Scene 切换、Project Arc 与 Cross-Scene Continuity。**Project 是四个 Director mode 之上的 context layer，不是第五个 mode。**

STUDIO 当前锁定的 MVP 包括：

- **Project Breakdown** — 长叙事先形成 Scene Structure Proposal，Director 确认后才写入 Project Store。
- **Scene isolation** — 每个 Scene 独立保存 Narrative / Scene State / Sequence snapshot，切换 Scene 不互相污染。
- **Project Arc** — 横向查看多个 Scene 的 Narrative Role / Agency / Camera / Color / Space / Density / Rhythm；未导演字段保持 `—`。
- **Cross-Scene Continuity** — 用可解释规则检查跨 Scene 的视觉因果关系，不提供 Auto Fix。
- **Local persistence** — Project 可在浏览器本地恢复；持久化失败只降级保存能力，不允许杀死 Project Workspace。
- **Narrative / Project AI boundary** — AI 只提出结构化候选；Project Breakdown 不允许直接输出 Camera / Color / Space 等视觉决定。

开发预览：

```text
visual-direction-os/director-v2.html?narrativeDemo=1&projectDemo=1
visual-direction-os/studio/?narrativeDemo=1&projectDemo=1
```

Sector 8 的发布目标是保持当前 SYSTEM 在公开根目录 `/`，并把 STUDIO 发布到 `/studio/`。`master` 仍是唯一自动 Pages 发布分支，开发分支不会直接替换线上首页。

---

## 💡 这玩意儿到底是啥？

大多数"视觉风格指南"只告诉你**画成什么样**。Visual Direction OS 告诉你**谁有权决定画面变成什么样**。

> **视觉风格从来不是一堆特效的集合，而是一套规则系统**——
> 它规定**什么可以变、何时变、为什么变，以及谁拥有这个"变"的权力。**

我们把这套规则拆成 **11 个知识模块**，再给它配上一个**高颜值、零依赖、可交互**的网页前端。知识是源（Markdown），网页是窗（HTML）——各活各的，互相印证，谁也不绑架谁。

**一句话定位**：如果你的视觉系统在去掉颜色之后就塌了，那它从来不是系统，只是层皮。我们干的就是把"皮"下面的骨架挖出来，编号，上架。

---

## ✨ 功能亮点（aka 为什么这仓库值得一个 Star）

### 📚 知识库 · Single Source of Truth
- 🧠 **11 篇中英双语文档**：主框架 → 角色系统 → 世界语法 → 序列与色彩 → 生产管线 → 工作模板 → 原创案例 → 术语表 → 决策树 → 主工作流 → 视觉 QA。从 Brief 到 Final Sequence 一条龙不卡壳。
- 🎭 **角色机制，不是画风模板**：Miles / Gwen / Hobie / Elian 示范的是"变量所有权"怎么转移，不是"黑红配色怎么抄"。
- 🌐 **中英术语表**：写 Brief 不再词穷，中英文对齐到每一个概念。
- 🔬 **Elian / Meridian 原创案例**：一个"谁有权决定什么值得被看见"的世界——注意力被制度化分配。听着像科幻？问问你自己每天刷的信息流。

### 🖥️ 交互操作系统 · `visual-direction-os/`
这里是技术的炫技场，也是设计师的游乐场：

- 🧭 **System Map 主链路**：Narrative → Primary Variable → State → Sequence → Agency，30 秒看懂全局。
- 📈 **Sequence Score**：Inline SVG 画出 Space / Color / Camera / Agency 随时间的曲线，并自动标出 **Ownership Shift（所有权转移）**——高潮不是最响，是权力易主。
- 🎭 **Character State Machine**：六状态可交互推演，Baseline → Pressure → Crisis → Decision → Agency → Resolution，每个 Transition 都有叙事触发条件。
- 🌈 **Color Territory & Ownership**：色彩所有权矩阵——这块颜色**归谁**，谁说了算。
- 🗂️ **全套导演工具**：Decision Tree、Master Workflow（20 步）、Visual QA 清单，理论落地一条龙。
- ♿ **认真到偏执的可访问性**：完整键盘导航、`prefers-reduced-motion`、所有图形带文本替代、`skip-link`、`aria-live` 状态播报、`inert` 焦点管理、响应式（820 / 480 断点实测，桌面到手机零横向溢出）、深 / 浅双主题。
- ✅ **结构 QA**：`qa-check.js` 自带 **50 项**断言，全绿才算过关。CI 没有，但我自己就是 CI。

---

## 🤯 技术栈（或者：为什么我连个 `npm install` 都不给你）

| 层 | 选型 | 为什么这么轴 |
|---|---|---|
| 前端 | Vanilla HTML / CSS / JS + Inline SVG | 零构建、零维护债、十年后还能双击打开 |
| 知识源 | Markdown（中英双语） | 可维护、可检索、可继续长 |
| 质量 | `qa-check.js`（Node 原生，零依赖）+ 四档响应式人工核验 | 结构 50/50，控制台 0 报错，不靠信仰 |
| 依赖 | **0 个 node_module** | 对未来的自己温柔一点 |

> 没有 React。没有 Vue。没有打包器。没有"先 `npm install` 再等三分钟"。
> 一个浏览器，一个标签页，开工。这就是我对"可维护"的全部理解——以及我对"炫技"的另一种定义：用最朴素的技术，做出最不朴素的东西。

---

## 🚀 三秒上手

```bash
# 方案 A：双击即玩（真·双击）
open visual-direction-os/index.html

# 方案 B：起个静态服务器（如果你迷信 localhost）
npx serve .
```

想读"原典"？直接翻 [`visual-direction-system/`](./visual-direction-system/)，11 篇文档即是内容源，**只追加、不改写语义**。

跑质量自检：

```bash
node visual-direction-os/qa-check.js   # 期望输出：50 passed, 0 failed
```

---

## 🎬 我想干嘛来着？（按图索骥）

| 你想做的事 | 去哪看 |
|---|---|
| 一眼看懂整个视觉框架 | 首页 **Overview → System Map** |
| 看一个角色怎么"长大" | **Character → State Machine**（推演 Elian 的焦点所有权转移） |
| 给一段戏排视觉节奏 | **Sequence → Sequence Score** |
| 决定这场戏谁掌镜 | **Color → Color Territory** |
| 把理论榨成 Brief | **Production → Workflow / QA** |
| 查一个术语卡壳了 | **Glossary**（中英对照） |
| 把长叙事拆成多个可导演 Scene | **STUDIO → Project Breakdown** |
| 看多个 Scene 的整体视觉弧线 | **STUDIO → Project Arc** |

> 💡 推荐路径：**Overview（30 秒）→ Character（2 分钟）→ Sequence（看图秒懂）**。之后你就回不去"凭感觉调色"了。

---

## 📁 仓库结构

```
📦 visual-direction-os
├── 🖥️ visual-direction-os/          # SYSTEM + STUDIO 前端，零构建
│   ├── index.html  styles.css  app.js
│   ├── director-v2.html            # STUDIO staging / compatibility entry
│   ├── studio/index.html           # branch preview shim；Pages build 生成完整 STUDIO
│   └── qa-check.js                 # SYSTEM 结构 QA
├── 🤖 api/                          # Narrative / Project Serverless API
├── 📚 visual-direction-system/      # 11 篇知识文档（内容源，勿改语义）
│   ├── 01-master-framework.md … 11-visual-qa.md
│   └── README.md
├── 📐 docs/superpowers/             # v2/v2.1 设计规格 + 实施计划
└── 📋 CONTEXT.md                    # 项目上下文
```

---

## 🤝 贡献指南

这是个个人知识项目，欢迎一切交流：

- 🐛 **报 Bug** — 提 Issue，注明浏览器、分辨率、复现步骤
- 💡 **提点子** — 新模块、新案例、新可视化？开 Issue 聊聊
- 🔧 **提 PR** — 请遵守两条馆规：
  1. 📚 [`visual-direction-system/`](./visual-direction-system/) 的 Markdown 是**内容唯一源**，只追加、不改写语义
  2. 🚫 保持**零构建依赖**——不引入 React / Vue / 打包器，对未来的自己温柔一点
- ✅ **自检** — 改动 `visual-direction-os/` 后跑 `node visual-direction-os/qa-check.js`，50/50 才算过

---

<div align="center">

💀 由 **Hades × Caesar** 联袂监制 · Made with ☕ and exactly zero node_modules

如果这套视觉哲学让你产生"aha"，欢迎点个 ⭐——毕竟，注意力也是一种所有权。

</div>
