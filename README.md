<div align="center">

# 🎬 Visual Direction OS

### Narrative becomes visual behavior. —— 叙事即视觉行为

**一套把「电影 / 动画 / 游戏 / 广告」的视觉规律，变成可查、可看、可推演的导演操作系统**

✨ 零构建 · 零依赖 · 双击即玩 · 中英双语 ✨

[![Tech](https://img.shields.io/badge/Tech-Vanilla%20HTML%2FCSS%2FJS-c4a362?style=flat-square)](https://github.com/Caesar-ZZh/123)
[![Build](https://img.shields.io/badge/Build-None%20Needed-4a9a5a?style=flat-square)](https://github.com/Caesar-ZZh/123)
[![Deploy](https://img.shields.io/badge/Deploy-GitHub%20Pages%20Ready-4a7fa8?style=flat-square)](https://github.com/Caesar-ZZh/123)
[![QA](https://img.shields.io/badge/QA-50%2F50%20checks-cc4444?style=flat-square)](https://github.com/Caesar-ZZh/123)
[![License](https://img.shields.io/badge/License-待补充-lightgrey?style=flat-square)](https://github.com/Caesar-ZZh/123)

</div>

---

## 💡 这是什么？

视觉风格从来不是一堆特效的集合，而是一套**规则系统**——它决定：

> **什么可以变、何时变、为什么变、以及谁拥有这个"变"的权力。**

Visual Direction OS（视觉导演操作系统）把这套规则拆成 11 个知识模块，并为其配上一个**高颜值、可交互**的网页前端。知识是源（Markdown），网页是窗（HTML），两者各自独立、互相印证。

---

## ✨ 功能亮点

### 📚 知识库（Single Source of Truth）
- 🧠 **11 篇中英双语文档**：主框架 → 角色系统 → 世界语法 → 序列与色彩 → 生产管线 → 工作模板 → 原创案例 → 术语表 → 决策树 → 主工作流 → 视觉 QA
- 🎭 **角色机制案例**：Miles / Gwen / Hobie / Elian 不是"画风模板"，而是"变量所有权"的机制示范
- 🌐 **中英术语表**：统一对译，写 Brief 不词穷

### 🖥️ 交互操作系统（visual-direction-os/）
- 🧭 **System Map 主链路**：Narrative → Primary Variable → State → Sequence → Agency，30 秒看懂全局
- 📈 **Sequence Score**：SVG 可视化 Space / Color / Camera / Agency 随时间的曲线，标出 **Ownership Shift（所有权转移）**
- 🎭 **Character State Machine**：角色视觉状态机，可交互推演
- 🌈 **Color Territory & Ownership**：色彩所有权矩阵——谁的画面，谁说了算
- 🗂️ **全套导演工具**：Decision Tree、Master Workflow、Visual QA 清单
- ♿ **认真的可访问性**：键盘导航、`prefers-reduced-motion`、所有图形带文本替代
- 📱 **四档响应式**：1440 / 1024 / 768 / 390 全部无横向溢出，深浅双主题
- ✅ **结构 QA**：`qa-check.js` 含 50 项检查，全绿才算过关

---

## 🚀 使用说明

```bash
# 打开导演控制台（无需安装任何东西）
visual-direction-os/index.html

# 或起个本地静态服务器
npx serve .
```

想读"原典"？直接翻 [`visual-direction-system/`](./visual-direction-system/)，11 篇文档即是内容源。

跑质量自检：

```bash
node visual-direction-os/qa-check.js   # 期望输出 50/50 passed
```

---

## 📦 安装步骤

| 方式 | 命令 | 说明 |
|---|---|---|
| 🔁 克隆 | `git clone https://github.com/Caesar-ZZh/123.git` | 完整仓库 |
| 📥 下载 | 点 GitHub 右上角 **Code → Download ZIP** | 解压即玩 |
| 🌐 部署 | GitHub Pages / 任意静态服务器 | 指向 `visual-direction-os/` |

> 无 `npm install`、无打包、无运行时依赖。一个浏览器即可开工。

---

## 🎬 示例演示

| 你想做的事 | 去哪看 |
|---|---|
| 一眼看懂整个视觉框架 | 首页 **Overview → System Map** |
| 看一个角色如何"长大" | **Character → State Machine**（推演 Elian 的焦点所有权转移） |
| 给一段戏排视觉节奏 | **Sequence → Sequence Score** |
| 决定这场戏谁掌镜 | **Color → Color Territory** |
| 把理论落地成 Brief | **Production → Workflow / QA** |
| 查一个术语 | **Glossary**（中英对照） |

> 💡 建议路径：**Overview（30 秒）→ Character（2 分钟）→ Sequence（看图秒懂）**。

---

## 📁 仓库结构

```
📦 visual-direction-os
├── 🖥️ visual-direction-os/          # 交互前端（11 视图，无构建）
│   ├── index.html  styles.css  app.js
│   └── qa-check.js                # 50 项结构 QA
├── 📚 visual-direction-system/      # 11 篇知识文档（内容源，勿改语义）
│   ├── 01-master-framework.md … 11-visual-qa.md
│   └── README.md
├── 📐 docs/superpowers/             # v2 设计规格 + 实施计划
└── 📋 CONTEXT.md                    # 项目上下文
```

---

## 🛠️ 技术栈

| 层 | 选型 | 为什么 |
|---|---|---|
| 前端 | Vanilla HTML / CSS / JS + Inline SVG | 零构建、零维护债、永久可读 |
| 知识源 | Markdown（中英双语） | 可维护、可检索、可继续扩展 |
| 质量 | `qa-check.js` + 四档响应式人工验证 | 结构 50/50，控制台 0 报错 |

---

## ✍️ 改名提案：从「123」到「Visual Direction OS」

当前仓库名 `123` + 简介「乱七八糟」已与实际内容严重不符（命理应用已移除）。建议重命名：

### 🏆 首选方案

> **仓库名：`visual-direction-os`**
> **简介：** 🎬 Narrative Visual Direction System + 交互式导演操作系统 · 中英双语知识库，零构建可交互网页，Sequence Score / State Machine / Color Territory 一应俱全

### 🥈 备选方案

| 名称 | 简介 | 风格 |
|---|---|---|
| `narrative-visual-direction` | 叙事视觉导演系统：把抽象视觉规律变成可查可推演的知识库 | 📚 学术、内容向 |
| `dir-os` | Director OS：给视觉导演的操作系统 | 🎬 极简、产品感 |
| `visual-grammar-lab` | 视觉语法实验室：研究"画面为什么这样动" | 🔬 研究、方法论 |

> 💡 改名路径：仓库页 **Settings → General → Repository name**，旧地址自动跳转，不影响克隆记录。建议同步把默认分支 `master` → `main`，并更新仓库 Description 为上方首选简介。

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

💀 由 **Hades × Caesar** 联袂监制 · Made with ☕ and 零个 node_modules

**如果这套视觉哲学让你觉得"aha"，欢迎点个 ⭐**

</div>
