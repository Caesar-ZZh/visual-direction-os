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

`agent/director-workspace-v2-1` 正在把现有知识浏览器升级为真正的导演工作台。前端继续保持 Vanilla HTML/CSS/JS 与零打包器；Narrative AI 通过独立 Serverless API 接入，不把模型密钥放进浏览器。

- **LEARN** — 通过 Knowledge Atlas 进入原有 11 个知识视图，不改写知识源。
- **NARRATIVE** — Scene Description + 可选 Director Intent → 2–3 个 Narrative Reading → 可编辑确认 → 2–3 个 Visual Direction Strategy → 五段 Sequence Proposal → Preview / Apply。
- **DIRECT** — 共享 Scene State、Director Workspace、Visual State Machine、Sequence Score、Color Ownership Map。
- **DIAGNOSE** — 使用与 DIRECT 相同的 scene state，输出确定性的 `PASS / WARN / FAIL`，不制造总分。
- **TDD + CI** — Node 合同/状态/API/Apply/Serverless 测试、Visual QA、JS syntax check、Pages 组装测试、Playwright Chromium 验收。
- **响应式验收** — 390 / 768 / 1024 / 1440；移动端保留 Learn / Narrative / Direct / Diagnose；Reduced Motion 保留等价信息。

开发预览入口：

```text
visual-direction-os/director-v2.html?narrativeDemo=1
```

`?narrativeDemo=1` 只用于明确标记的本地/Review fixture，不会伪装成真实 AI 结果。发布策略不会覆盖旧知识库源码：GitHub Pages 构建时把 `director-v2.html` 提升为线上 `index.html`，同时把现有稳定版 `index.html` 原样保留为线上 `knowledge.html`。在 Draft PR 合并前，当前线上站点不会被替换。

### Narrative API configuration

正常 Narrative 模式需要一个独立的 Serverless API base，例如：

```text
https://your-serverless-host.example/api/narrative
```

前端通过 `director-v2.html` 中的：

```html
<meta name="vdos-narrative-api-base" content="https://your-serverless-host.example/api/narrative">
```

调用三个端点：

```text
POST /api/narrative/interpret
POST /api/narrative/strategy
POST /api/narrative/sequence
```

Serverless 环境变量：

```text
OPENAI_API_KEY=<server-side secret>
OPENAI_MODEL=gpt-5.6
VDOS_ALLOWED_ORIGIN=https://caesar-zzh.github.io
```

`OPENAI_API_KEY` **只能存在服务端环境变量中，不能写入 HTML、浏览器 JS、Git 或 GitHub Pages**。未配置 API base 的正常模式会显示 `AI SERVICE NOT CONFIGURED`；只有显式 `?narrativeDemo=1` 才启用 `DEMO FIXTURE`。`vercel.json` 已包含 `/api/narrative/*.js` 的 Serverless function 配置；也可以把同样的 Node handlers 部署到兼容平台。

---

## 💡 这是什么？

视觉风格从来不是一堆特效的集合，而是一套**规则系统**——它决定：

> **什么可以变、何时变、为什么变、以及谁拥有这个“变”的权力。**

Visual Direction OS（视觉导演操作系统）把这套规则拆成知识系统与可交互导演工作台。核心方法不是“模仿某种画风”，而是：

> **Narrative → Primary Variable → State → Sequence → Agency**

知识是源（Markdown），网页是窗（HTML），Director Workspace 则把方法论变成可以选择、预览、应用与诊断的状态系统。

---

## ✨ 功能亮点

### 📚 知识库（Single Source of Truth）
- 🧠 **11 篇中英双语文档**：主框架 → 角色系统 → 世界语法 → 序列与色彩 → 生产管线 → 工作模板 → 原创案例 → 术语表 → 决策树 → 主工作流 → 视觉 QA
- 🎭 **角色机制案例**：Miles / Gwen / Hobie / Elian 不是“画风模板”，而是“变量所有权”的机制示范
- 🌐 **中英术语表**：统一对译，写 Brief 不词穷

### 🖥️ Director Workspace（visual-direction-os/）
- 🧭 **System Map 主链路**：Narrative → Primary Variable → State → Sequence → Agency
- ✍️ **Narrative Input**：自由文本场景 + Director Intent，候选 Reading 与 Grounding、Strategy、Sequence Preview、Apply Selected
- 📈 **Sequence Director / Sequence Score**：五段导演序列、视觉事件、tension probe、动态 Beat/Event replacement
- 🎭 **Visual State Machine**：角色视觉状态机，可交互推演
- 🌈 **Color Territory & Ownership**：色彩所有权矩阵——谁的画面，谁说了算
- 🧪 **DIAGNOSE**：在共享 Scene State 上做确定性一致性诊断，并可路由回精确 DIRECT 控件
- ♿ **可访问性**：键盘导航、`prefers-reduced-motion`、语义控件、`aria-live` 状态与错误
- 📱 **四档响应式**：1440 / 1024 / 768 / 390 无横向溢出

---

## 🚀 使用说明

```bash
# 稳定知识浏览器
visual-direction-os/index.html

# v2.1 导演工作台 Demo Review
visual-direction-os/director-v2.html?narrativeDemo=1

# 或起本地静态服务器
python3 -m http.server 4173 --directory visual-direction-os
```

想读“原典”？直接翻 [`visual-direction-system/`](./visual-direction-system/)，知识文档即是内容源。

跑稳定版质量自检：

```bash
node visual-direction-os/qa-check.js
```

v2.1 的模型、Narrative contracts/state/client、Apply、Serverless handlers、源码 QA、发布组装与浏览器验收由 `.github/workflows/director-v2-ci.yml` 自动执行。

---

## 📦 安装与部署

| 方式 | 命令 / 入口 | 说明 |
|---|---|---|
| 🔁 克隆 | `git clone https://github.com/Caesar-ZZh/visual-direction-os.git` | 完整仓库 |
| 📥 下载 | GitHub **Code → Download ZIP** | 静态知识库与 Demo 可直接查看 |
| 🌐 前端 | GitHub Pages / 任意静态服务器 | 发布 `visual-direction-os/` 装配站点 |
| 🤖 Narrative AI | Vercel / 兼容 Node Serverless | 部署 `api/narrative/`，服务端配置 API Key |

前端没有 React / Vue / 打包器运行时。真实 AI Narrative 模式需要 Serverless 网络请求；Demo fixture 不需要模型服务。

---

## 🎬 示例演示

| 你想做的事 | 去哪看 |
|---|---|
| 从一段剧情形成导演判断 | **Narrative → Interpret → Strategy → Sequence Preview** |
| 一眼看懂整个视觉框架 | **Learn → Knowledge Atlas / System Map** |
| 看一个角色如何“长大” | **Character → State Machine** |
| 给一段戏排视觉节奏 | **Sequence Director / Sequence Score** |
| 决定这场戏谁掌镜 | **Color / Ownership** |
| 检查导演变量是否互相打架 | **Diagnose** |
| 查一个术语 | **Glossary**（中英对照） |

---

## 📁 仓库结构

```text
📦 visual-direction-os
├── 🖥️ visual-direction-os/
│   ├── index.html / knowledge source browser
│   ├── director-v2.html / director-v2-app.js / director-v2*.css
│   ├── scene-state.js / state-machine.js / sequence-director*.js
│   ├── narrative-contracts.js / narrative-state.js / narrative-api-client.js
│   ├── narrative-workspace.js / narrative-workspace.css
│   ├── narrative-apply.js / narrative-apply-ui.js
│   └── visual-qa.js / build-pages-site.js / tests
├── 🤖 api/narrative/
│   ├── _contracts.js / _prompts.js / _openai-adapter.js / _handler.js
│   └── interpret.js / strategy.js / sequence.js
├── 📚 visual-direction-system/      # 知识文档内容源
├── 📐 docs/superpowers/             # v2.1 设计规格 + 实施计划
├── vercel.json                      # Narrative Serverless function 配置
└── 📋 CONTEXT.md
```

---

## 🛠️ 技术栈

| 层 | 选型 | 为什么 |
|---|---|---|
| 前端 | Vanilla HTML / CSS / JS + Inline SVG | 零打包器、永久可读、静态发布友好 |
| 状态 | Canonical Scene State + isolated Narrative Draft | AI 提案与导演最终状态明确隔离 |
| Narrative AI | Node Serverless + OpenAI Responses API Structured Outputs | API Key 留服务端；三阶段结构化合同可替换 provider |
| 知识源 | Markdown（中英双语） | 可维护、可检索、可继续扩展 |
| 质量 | Node tests + Visual QA + Playwright Chromium + GitHub Actions | TDD 与真实浏览器回归共同守住行为边界 |

---

## ✍️ 仓库命名

仓库已使用：

> **`visual-direction-os`**

建议仓库 Description 保持：

> 🎬 Narrative Visual Direction System + 交互式导演操作系统 · 中英双语知识库，Sequence Director / State Machine / Narrative Input / Diagnostic 一应俱全

---

## 🤝 贡献指南

这是个个人知识项目，欢迎交流：

- 🐛 **报 Bug** — 提 Issue，注明浏览器、分辨率、复现步骤
- 💡 **提点子** — 新模块、新案例、新可视化可以开 Issue 讨论
- 🔧 **提 PR** — 请遵守两条原则：
  1. [`visual-direction-system/`](./visual-direction-system/) 的 Markdown 是**内容唯一源**，只追加、不无依据改写语义
  2. 保持前端**零打包器依赖**，不要把 Narrative Serverless secret 移进浏览器
- ✅ **自检** — 修改 Director Workspace 后跑对应 Node + Playwright 测试，并以 GitHub Actions exact-head success 为合并前证据

---

<div align="center">

💀 由 **Hades × Caesar** 联袂监制 · Made with ☕

**如果这套视觉哲学让你觉得“aha”，欢迎点个 ⭐**

</div>
