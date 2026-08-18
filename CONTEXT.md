# 项目上下文

- 当前稳定版：Visual Direction OS v2.0 已实现并完成 QA，正式知识库入口仍为 `visual-direction-os/index.html`。
- 当前开发版：Director Workspace v2.1 位于 `agent/director-workspace-v2-1`，开发入口为 `visual-direction-os/director-v2.html`，尚未合并到 `master`。
- 边界：本次 v2.1 前端开发不修改 `visual-direction-system/` 的知识语义；知识源仍作为 Single Source of Truth。并行运行的 evidence-calibrated 语料流水线由其他任务独立更新，不属于本次前端改动。
- 产品结构：v2.1 明确分为 LEARN / DIRECT / DIAGNOSE 三个模式；LEARN 保留 11 个现有知识视图，DIRECT 提供共享 Scene State、Director Workspace、Character State Machine、Sequence Score、Color Ownership，DIAGNOSE 提供确定性 PASS / WARN / FAIL 诊断。
- 核心机制：所有新工具读取/写入同一个 `scene-state.js` 状态模型；Character 与 Sequence 共用同一 playhead，Ownership、变量状态与 Diagnostic 不维护竞争状态源。
- 技术决定：继续使用原生 HTML/CSS/JS、SVG/DOM、零构建框架；不引入 React/Vue/Next；禁止 `transition: all`；支持 `prefers-reduced-motion`。
- QA：新增 Node 模型测试、Visual QA 源码扫描、JS syntax check、Pages 组装测试与 Playwright Chromium 浏览器验收。验收覆盖 390 / 768 / 1024 / 1440、无横向页面溢出、移动/桌面主导航、State Machine ↔ Sequence 双向同步、Diagnostic fixture、Reduced Motion 与 console errors。
- 发布策略：合并后 GitHub Pages 在临时 `_site` 中把 `director-v2.html` 发布为线上 `index.html`，同时把稳定版 `visual-direction-os/index.html` 原样保留为线上 `knowledge.html`；不会为了发布重写旧 53KB 首页源码。
- 当前交付原则：只有 Director Workspace CI 全绿并完成 Draft PR 审查后才考虑合并；不直接在 `master` 上试验。
