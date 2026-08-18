<div align="center">

# 🎬 Visual Direction OS

### Narrative becomes visual behavior. —— 叙事即视觉行为

**一套把「电影 / 动画 / 游戏 / 广告」的视觉规律，变成可查、可看、可推演的导演操作系统**

✨ 零构建 · 双击可看 · 中英双语 ✨

[![Tech](https://img.shields.io/badge/Tech-Vanilla%20HTML%2FCSS%2FJS-c4a362?style=flat-square)](https://github.com/Caesar-ZZh/visual-direction-os)
[![Deploy](https://img.shields.io/badge/Deploy-GitHub%20Pages%20%2B%20Serverless-4a7fa8?style=flat-square)](https://github.com/Caesar-ZZh/visual-direction-os)
[![QA](https://img.shields.io/badge/QA-TDD%20%2B%20Playwright-cc4444?style=flat-square)](https://github.com/Caesar-ZZh/visual-direction-os)
[![License](https://img.shields.io/badge/License-待补充-lightgrey?style=flat-square)](https://github.com/Caesar-ZZh/visual-direction-os)

</div>

---

## 🎛️ Director Workspace v2.1（开发分支）

`agent/director-workspace-v2-1` 正在把现有知识浏览器升级为真正的导演工作台。前端继续保持 Vanilla HTML/CSS/JS 与零打包器；Narrative / Project AI 通过独立 Serverless API 接入，模型密钥只存在服务端。

**Project 不是第五个 mode。** 它是 LEARN / NARRATIVE / DIRECT / DIAGNOSE 之上的 context layer：先把长叙事拆成可确认的 Scene 结构，再逐 Scene 导演，并在 Project Arc 与 Cross-Scene Continuity 中检查整个项目的视觉因果关系。

- **PROJECT CONTEXT** — Project Breakdown → Director Edit / Add / Split / Merge / Remove / Reorder → Confirm Scene Structure → Scene Rail → Project Arc → Cross-Scene Continuity。
- **LEARN** — 通过 Knowledge Atlas 进入原有 11 个知识视图，不改写知识源。
- **NARRATIVE** — 当前 Scene 的 Description + 可选 Director Intent + 上游 Project Context → 2–3 个 Narrative Reading → 可编辑确认 → 2–3 个 Visual Direction Strategy → 五段 Sequence Proposal → Preview / Apply。
- **DIRECT** — 当前 Scene 独立的 canonical Scene State、Director Workspace、Visual State Machine、Sequence Score、Color Ownership Map。
- **DIAGNOSE** — 使用当前 Scene 的同一份 Scene State 输出确定性的 `PASS / WARN / FAIL`，不制造总分。
- **PROJECT ARC** — 横向压缩每个已导演 Scene 的 Narrative Role / Agency / Camera / Color / Space / Density / Rhythm；未导演视觉字段保持 `—`，不伪造默认方向。
- **CONTINUITY** — 只做可解释的跨 Scene 规则诊断，给出涉及 Scene 的路由入口，不提供自动修复。
- **TDD + CI** — Node contracts/state/runtime/API/Serverless、Visual QA、JS syntax、Pages 组装和 Playwright Chromium 验收。

### SYSTEM / STUDIO release architecture

Visual Direction OS 正式发布时分成两个平级空间：

```text
/                     SYSTEM · editorial knowledge experience
/studio/              STUDIO · Director Workspace v2.1
```

SYSTEM 保持默认首页；STUDIO 不再覆盖根 `index.html`。Pages 组装只在发布产物中加入克制的双向空间入口，并把 `director-v2.html` 生成成 `/studio/index.html`；`director-v2.html` 本身继续作为兼容 / exact-commit staging entry 保留。

开发预览入口：

```text
# 单 Scene Narrative review
visual-direction-os/director-v2.html?narrativeDemo=1

# Multi-Scene Project review
visual-direction-os/director-v2.html?narrativeDemo=1&projectDemo=1

# RawGitHack / branch preview shortcut
visual-direction-os/studio/?narrativeDemo=1&projectDemo=1
```

正式 Pages 入口：

```text
SYSTEM  https://caesar-zzh.github.io/visual-direction-os/
STUDIO  https://caesar-zzh.github.io/visual-direction-os/studio/
DEMO    https://caesar-zzh.github.io/visual-direction-os/studio/?narrativeDemo=1&projectDemo=1
```

`narrativeDemo=1` 与 `projectDemo=1` 都是**显式 fixture 模式**，只用于本地 / PR Review，不会伪装成生产 AI。Draft PR 合并前不会替换当前线上站点；`.github/workflows/pages.yml` 仍只在 `master` 发布。

### Serverless API configuration

Narrative API base 示例：

```text
https://your-serverless-host.example/api/narrative
```

前端通过 `director-v2.html` 中的：

```html
<meta name="vdos-narrative-api-base" content="https://your-serverless-host.example/api/narrative">
```

调用：

```text
POST /api/narrative/interpret
POST /api/narrative/strategy
POST /api/narrative/sequence
```

Project Breakdown 使用：

```text
POST /api/project/breakdown
```

如果 Project 与 Narrative API 部署在同一个 origin，Project client 会从 Narrative API base 自动派生 server root；也可以显式配置：

```html
<meta name="vdos-project-api-base" content="https://your-serverless-host.example">
```

Serverless 环境变量：

```text
OPENAI_API_KEY=<server-side secret>
OPENAI_MODEL=gpt-5.6
VDOS_ALLOWED_ORIGIN=https://caesar-zzh.github.io
```

`OPENAI_API_KEY` **只能存在服务端环境变量中，不能写入 HTML、浏览器 JS、Git 或 GitHub Pages**。正常模式未配置服务时会明确显示不可用状态，不做 silent fake fallback。`vercel.json` 同时声明 `api/narrative/*.js` 与 `api/project/*.js` 的 Serverless functions。

### Multi-Scene state boundary

Project 层和 Scene 层分开保存：

```text
Project Store
├── sceneOrder
├── activeSceneId
└── SceneRecord[]
    ├── narrativeRole
    ├── workspace.narrativeState
    ├── workspace.sceneState
    ├── workspace.sequenceState
    └── visual status
```

Scene switch 通过 `ProjectRuntime.switchScene(sceneId)` 完成事务：先保存当前 Scene snapshot，终止 transient Narrative work，再恢复目标 Scene 的 Narrative / Scene State / Sequence。Restore 期间产生的技术性 Scene events 不会被当成用户编辑重新持久化，从而避免跨 Scene 污染。

Project Context 只进入 **Interpret**，并被明确视为 upstream intent，而不是已确认 Scene truth；Strategy / Sequence 不重复携带 Project Context。AI Project Breakdown 也只允许叙事结构字段，不允许输出 Camera / Color / Space 等视觉方向。

---

## 💡 这是什么？

视觉风格从来不是一堆特效的集合，而是一套**规则系统**——它决定：

> **什么可以变、何时变、为什么变、以及谁拥有这个“变”的权力。**

Visual Direction OS 把这套规则拆成知识系统与可交互导演工作台。核心方法不是“模仿某种画风”，而是：

> **Narrative → Primary Variable → State → Sequence → Agency**

Project 层进一步回答：**不同 Scene 为什么发生变化、变化是否有叙事原因、谁在跨 Scene 获得或失去视觉所有权。**

---

## ✨ 功能亮点

### 📚 知识库（Single Source of Truth）
- 🧠 **11 篇中英双语文档**：主框架 → 角色系统 → 世界语法 → 序列与色彩 → 生产管线 → 工作模板 → 原创案例 → 术语表 → 决策树 → 主工作流 → 视觉 QA
- 🎭 **角色机制案例**：Miles / Gwen / Hobie / Elian 不是“画风模板”，而是“变量所有权”的机制示范
- 🌐 **中英术语表**：统一对译，写 Brief 不词穷

### 🖥️ Director Workspace（`/studio/`）
- 🧩 **Project Breakdown**：长叙事先形成 Project Reading 和 Scene Structure Proposal，Director 确认后才写入 Project Store
- 🧭 **Scene Context Bar**：项目名、当前 Scene、位置、角色/agency，以及 Project Arc / Previous / Next 路由
- 📊 **Project Arc**：七行语义矩阵检查整个项目的视觉变化
- 🔎 **Cross-Scene Continuity**：检查 agency alignment、无叙事原因的视觉权力跳变、rupture 无视觉响应、同时多系统峰值等规则
- ✍️ **Narrative Input**：自由文本场景 + Director Intent + Project Context，候选 Reading 与 Grounding、Strategy、Sequence Preview、Apply Selected
- 📈 **Sequence Director / Sequence Score**：五段导演序列、视觉事件、tension probe、动态 Beat/Event replacement
- 🎭 **Visual State Machine**：角色视觉状态机，可交互推演
- 🌈 **Color Territory & Ownership**：色彩所有权矩阵——谁的画面，谁说了算
- 🧪 **DIAGNOSE**：在共享 Scene State 上做确定性一致性诊断，并可路由回精确 DIRECT 控件
- ♿ **可访问性**：键盘导航、显式 move-left / move-right、`prefers-reduced-motion`、语义控件、`aria-live` 状态与错误
- 📱 **响应式目标**：390 / 768 / 1024 / 1440；Project Arc 自身可横向滚动，禁止页面级横向溢出

---

## 🚀 使用说明

```bash
# SYSTEM 源页面
visual-direction-os/index.html

# STUDIO exact-commit / staging entry
visual-direction-os/director-v2.html?narrativeDemo=1&projectDemo=1

# branch / RawGitHack Studio shortcut
visual-direction-os/studio/?narrativeDemo=1&projectDemo=1

# 本地静态服务器
python3 -m http.server 4173 --directory visual-direction-os
```

GitHub Pages 由 `build-pages-site.js` 组装：源 `index.html` 保留为 SYSTEM，`director-v2.html` 生成到发布产物的 `studio/index.html`，并共享根目录的 Director / Project / Narrative assets。

想读“原典”？直接翻 [`visual-direction-system/`](./visual-direction-system/)，知识文档即是内容源。

跑稳定版质量自检：

```bash
node visual-direction-os/qa-check.js
```

v2.1 的 Scene / Project / Narrative contracts、state/runtime、Apply、Serverless handlers、源码 QA、发布组装与浏览器验收由 `.github/workflows/director-v2-ci.yml` 自动执行。

---

## 📦 安装与部署

| 方式 | 命令 / 入口 | 说明 |
|---|---|---|
| 🔁 克隆 | `git clone https://github.com/Caesar-ZZh/visual-direction-os.git` | 完整仓库 |
| 📥 下载 | GitHub **Code → Download ZIP** | 静态知识库与 Demo 可直接查看 |
| 🌐 前端 | GitHub Pages / 任意静态服务器 | SYSTEM 发布在 `/`，STUDIO 发布在 `/studio/` |
| 🤖 Narrative / Project AI | Vercel / 兼容 Node Serverless | 部署 `api/narrative/` + `api/project/`，服务端配置 API Key |

前端没有 React / Vue / 打包器运行时。真实 AI 模式需要 Serverless 网络请求；显式 Demo fixture 不需要模型服务。

---

## 🎬 示例演示

| 你想做的事 | 去哪看 |
|---|---|
| 把一段长故事拆成可导演的 Scene | **Project → Break Down Story → Confirm Scene Structure** |
| 看多个 Scene 的整体视觉弧线 | **Project Arc** |
| 检查两个 Scene 之间是否有因果断裂 | **Cross-Scene Continuity** |
| 从一段场景形成导演判断 | **Narrative → Interpret → Strategy → Sequence Preview** |
| 一眼看懂整个视觉框架 | **SYSTEM → Knowledge Atlas / System Map** |
| 看一个角色如何“长大” | **Character → State Machine** |
| 给一段戏排视觉节奏 | **Sequence Director / Sequence Score** |
| 决定这场戏谁掌镜 | **Color / Ownership** |
| 检查单 Scene 导演变量是否互相打架 | **Diagnose** |
| 查一个术语 | **Glossary**（中英对照） |

---

## 📁 仓库结构

```text
📦 visual-direction-os
├── 🖥️ visual-direction-os/
│   ├── index.html                         # SYSTEM source
│   ├── studio/index.html                  # branch preview shim; Pages build replaces with full STUDIO
│   ├── director-v2.html / director-v2-app.js / director-v2*.css
│   ├── release-routing.css / build-pages-site.js
│   ├── scene-state.js / state-machine.js / sequence-director*.js
│   ├── narrative-contracts.js / narrative-state.js / narrative-api-client.js
│   ├── narrative-workspace.js / narrative-apply*.js
│   ├── project-contracts.js / project-context.js / project-state.js
│   ├── project-persistence.js / project-runtime.js / project-arc.js / project-continuity.js
│   ├── project-breakdown-state.js / project-breakdown-api-client.js
│   ├── project-workspace.js / project-workspace.css / project-context.css
│   ├── project-bootstrap.js
│   └── visual-qa.js / release + project tests
├── 🤖 api/narrative/
│   ├── _contracts.js / _prompts.js / _openai-adapter.js / _handler.js
│   └── interpret.js / strategy.js / sequence.js
├── 🤖 api/project/
│   ├── _contracts.js / _prompts.js / _openai-adapter.js / _handler.js
│   └── breakdown.js
├── 📚 visual-direction-system/      # 知识文档内容源
├── 📐 docs/superpowers/             # v2.1 设计规格 + 实施计划
├── vercel.json                      # Narrative + Project Serverless functions
└── 📋 CONTEXT.md
```

---

## 🛠️ 技术栈

| 层 | 选型 | 为什么 |
|---|---|---|
| 前端 | Vanilla HTML / CSS / JS + Inline SVG | 零打包器、永久可读、静态发布友好 |
| Project 状态 | Project Store + independent Scene snapshots + Project Runtime | Scene 可独立保存/恢复，Project 只做 context 与跨 Scene 关系 |
| Scene 状态 | Canonical Scene State + isolated Narrative Draft | AI 提案与导演最终状态明确隔离 |
| AI | Node Serverless + OpenAI Responses API Structured Outputs | API Key 留服务端；Project Breakdown 与 Narrative 三阶段分别有结构化合同 |
| 知识源 | Markdown（中英双语） | 可维护、可检索、可继续扩展 |
| 质量 | Node tests + Visual QA + Playwright Chromium + GitHub Actions | TDD 与真实浏览器回归共同守住行为边界 |

---

## ✍️ 仓库命名

仓库已使用：

> **`visual-direction-os`**

建议仓库 Description 保持：

> 🎬 Narrative Visual Direction System + 交互式导演操作系统 · 中英双语知识库，Project / Sequence Director / State Machine / Narrative Input / Diagnostic

---

## 🤝 贡献指南

这是个个人知识项目，欢迎交流：

- 🐛 **报 Bug** — 提 Issue，注明浏览器、分辨率、复现步骤
- 💡 **提点子** — 新模块、新案例、新可视化可以开 Issue 讨论
- 🔧 **提 PR** — 请遵守两条原则：
  1. [`visual-direction-system/`](./visual-direction-system/) 的 Markdown 是**内容唯一源**，只追加、不无依据改写语义
  2. 保持前端**零打包器依赖**，不要把 Serverless secret 移进浏览器
- ✅ **自检** — 修改 Director Workspace 后跑对应 Node + Playwright 测试，并以 GitHub Actions exact-head success 作为合并前证据

---

<div align="center">

💀 由 **Hades × Caesar** 联袂监制 · Made with ☕

**如果这套视觉哲学让你觉得“aha”，欢迎点个 ⭐**

</div>