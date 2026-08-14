# 项目上下文

- 当前：Visual Direction OS v2.0 已实现并完成 QA，旧根首页已按确认删除。
- 边界：`visual-direction-system/` 12 份知识源保持只读，不覆盖、不改写。
- 决定：新前端放在 `visual-direction-os/`，使用原生 HTML/CSS/JS 与内联 SVG，无构建依赖。
- 已完成：11 个知识视图、Sequence Score、State Machine、兼容矩阵、Color Territory、Workflow、Glossary、Decision Tree 与 QA 清单。
- 验证：结构检查 50/50；浏览器路由与全部核心交互正常；1440、1024、768、390 四档无横向溢出；深浅主题正常；控制台 0 错误。
- 交付：`visual-direction-os/` 可由 GitHub Pages 或任意静态服务器直接打开，无构建依赖。
- 清理：根目录原 `index.html` 为无关的“玄机·八字命盘”，已删除；项目入口仍为 `visual-direction-os/index.html`。
