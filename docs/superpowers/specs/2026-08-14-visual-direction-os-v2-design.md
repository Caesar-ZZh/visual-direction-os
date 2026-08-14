# Visual Direction OS v2 Design Spec

## Goal
将现有 `visual-direction-system/` Markdown 知识库升级为一个高美化、高可读、可交互的 Visual Direction OS，同时保持现有知识内容可维护、可检索、可继续扩展。

## Design Direction
最终视觉方向采用三套草案的融合：

- **Director Console** 提供系统骨架：左侧 System Map、核心变量、导演操作台感。
- **Editorial Atlas** 提供阅读品质：高端编辑排版、章节秩序、长文沉浸与交叉引用。
- **Motion Score** 提供独特交互：Sequence Score、State Curve、Visual Ownership 等可视化模块。

目标不是普通文档站，也不是炫技Dashboard，而是“高端视觉研究机构 + 导演操作系统”。

## Information Architecture
首页分为七个入口：

1. Overview
2. Character
3. World
4. Sequence
5. Color
6. Production
7. Case Study

附加入口：Glossary、Decision Tree、Master Workflow、Visual QA。

现有 Markdown 文件继续作为内容源，不删除，不覆盖；网页层作为其可视化入口。

## Homepage Structure
首页必须包含：

### Hero
- 标题：Visual Direction OS
- 核心句：Narrative becomes visual behavior.
- 三个产品标签：Knowledge Base / Visual Bible / Sequence System

### System Map
从 Narrative → Primary Variable → State → Sequence → Agency 的主链路。

### Editorial Chapters
以出版物式列表呈现 Character、World、Sequence、Color、Production 等章节。

### Active Thesis
突出系统核心：Who gets to define the image?

### Sequence Score
使用 SVG 或 Canvas 可视化 Space / Color / Camera / Agency 随时间变化，并标出 Ownership Shift。

## Visual Language
整体必须克制、成熟、专业、有高端编辑出版感。

### Layout
- Desktop：左侧导航 + 右侧内容区。
- Tablet：导航可压缩为顶部横向入口。
- Mobile：单列，导航折叠。
- 避免大量等宽卡片；章节内容优先使用编辑型排版与开放留白。

### Typography
- 标题强调编辑感与层级，不做夸张展示字体。
- 正文以长时间阅读舒适为目标。
- 英文术语与中文解释并存。

### Color
- 深浅模式均需可读。
- 主强调色只用于激活状态、关键节点与 Ownership Shift。
- 避免霓虹、彩虹渐变、无功能高饱和背景。

### Surface
- 轻边框、低对比面板、少量强调色。
- 不依赖大面积阴影和Glow。
- Visual Score、State Machine 等图形应透明融入页面，而非塞进重卡片。

## Interaction Model
### Navigation
点击 System Map 或左侧章节入口切换到对应内容页/内容区。

### Progressive Disclosure
Overview 只展示核心逻辑；深层定义、表格、案例在章节中展开。

### Visualization
至少实现：
- Sequence Score
- Character State Machine
- World Compatibility Matrix
- Color Ownership / Territory 示例
- Master Workflow

首版不做复杂数据编辑器，优先做高完成度阅读体验。

## Content Strategy
现有 Markdown 是 Single Source of Truth。

首版网页可以将核心段落手工映射为 HTML；同时保留到 Markdown 原文的明确入口。未来再考虑自动解析 Markdown。

不得把 Miles / Gwen / Hobie 当作系统本体；它们只作为机制案例。通用理论与 IP 案例必须视觉上分层。

## Technical Direction
首版采用轻量静态实现：

- HTML5
- CSS3
- Vanilla JavaScript
- Inline SVG for diagrams

不引入 React、Vue 或复杂构建系统，降低部署与维护成本。

建议文件：

- `visual-direction-os/index.html`
- `visual-direction-os/styles.css`
- `visual-direction-os/app.js`
- `visual-direction-os/content.js`

原有 `visual-direction-system/` 保持不变。

## Accessibility
- 键盘可完成章节导航。
- 所有图表/图形提供 `aria-label` 或文字解释。
- 对比度满足常规阅读需求。
- 不以颜色作为唯一状态编码。
- 动效遵循 `prefers-reduced-motion`。

## Performance
- 无远程JS依赖。
- 首屏不加载大图。
- SVG数量受控。
- 页面在普通移动端保持流畅。

## Non-goals for v2.0
本阶段不做：

- CMS
- 登录系统
- 在线协作
- AI自动生成Bible
- 拖拽式Sequence编辑器
- 后端数据库

这些属于后续 v2.x / v3.0。

## Success Criteria
完成后应满足：

1. 打开页面第一眼不像GitHub文档站，而像成熟视觉研究产品。
2. 30秒内理解整个 Visual Direction Framework。
3. 2分钟内能从首页进入任一核心知识模块。
4. Sequence / State / Ownership 等抽象概念通过图形显著更易理解。
5. 移动端仍保持阅读质量。
6. 原Markdown知识库仍然独立可读、可维护。
7. 页面美化程度高，但不牺牲信息层级和专业性。

## QA
实现后至少验证：

- Desktop / Tablet / Mobile 响应式
- Dark / Light 可读性
- 键盘导航
- 无横向溢出
- 主要按钮和章节切换工作正常
- `prefers-reduced-motion` 生效
- 所有核心可视化都有文本替代说明
- 原 `visual-direction-system/` 文件未被破坏
