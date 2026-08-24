# Visual Direction OS M3 — Generation Evaluation Loop Design

## Goal
把 M2 的 `Visual IR → Agnes Image 2.1 Flash` 单向生成链路升级为一个可验证、可迭代的导演闭环：

`DIRECT → GENERATE → MEASURE → JUDGE → RE-DIRECT`

同时保持 GitHub Pages 前端不持有 Agnes API Key。

## Scope
M3 只解决两个问题：

1. **Secure Generation Proxy**：把 Agnes 凭据隔离到服务端，并让现有静态 GitHub Pages 可以安全调用。
2. **Evidence-aware Visual QA**：对生成图片进行可证明的自动测量；对无法由像素可靠判断的导演维度明确交给人工判断，并将结果编译成下一轮 Re-direct delta。

本阶段不引入第二个视觉大模型，不伪装拥有语义视觉理解能力。

## Architecture

### 1. Secure Generation Proxy
GitHub Pages 继续作为静态主站。新增独立 Node.js serverless endpoint：

`POST /api/agnes-generate`

代理职责：

- 从服务端环境变量读取 `AGNES_API_KEY`。
- 固定上游 endpoint 为 `https://apihub.agnes-ai.com/v1/images/generations`。
- 固定允许模型为 `agnes-image-2.1-flash`。
- 校验 `size`、`ratio`、`prompt`、`extra_body.image` 与 `response_format`。
- 拒绝任意上游 URL、任意模型名和未知顶层字段，防止代理退化为开放转发器。
- 支持 CORS；允许来源通过 `VDOS_ALLOWED_ORIGINS` 环境变量控制。
- 上游超时使用 AbortController，默认 300 秒。
- Agnes 错误以受控 JSON 返回，不回传 API Key 或内部栈。

部署目标采用 Vercel Function 兼容结构 `api/agnes-generate.js`。GitHub Pages 与代理可以是不同域名。

前端允许两种 proxy 配置：

- `window.VDOS_GENERATION_PROXY`
- 浏览器本地保存的 proxy URL

API Key 永远不进入静态仓库或 localStorage。

### 2. Generation Artifact
每次成功生成后，前端创建一个 Generation Artifact：

```js
{
  id,
  createdAt,
  provider,
  request,
  result: { kind, src, revisedPrompt },
  visualIRVersion,
  grammarId,
  measurements: null,
  evaluation: null
}
```

它把“这张图”与“生成它的 Visual IR / request”绑定，避免下一轮 QA 不知道自己在评什么。

M3 只在内存中维护当前 artifact，不建立数据库或跨设备历史。

## Evidence-aware Visual QA

### Principle
自动 QA 不能把“可测量”误写成“已理解”。每一项必须声明 evidence mode：

- `measured`：可从图像像素或元数据直接测量。
- `human_required`：当前运行时无法可靠证明，需要用户判断。
- `unsupported`：IR 未提供足够目标或没有可比较规则。

### Automatic Pixel Measurements
浏览器 Canvas 对生成图片下采样后计算：

- `width` / `height` / `aspectRatio`
- `meanLuminance`
- `luminanceStdDev`
- `shadowShare`
- `highlightShare`
- `meanSaturation`
- `highSaturationShare`
- `edgeDensity`：相邻像素亮度梯度超过阈值的比例
- `localContrast`：相邻像素亮度差均值
- `entropyProxy`：灰度直方图 Shannon entropy，用作信息密度代理

这些测量只描述图像特征，不直接声明叙事正确。

### Automatic Checks
M3 自动检查：

1. **Canvas ratio**：生成图实际宽高比与 request ratio 是否接近。
2. **Saturation direction**：当 Visual IR 的 saturation 信号明确为 low / restrained / high 等可映射值时，检查平均饱和度方向。
3. **Detail density direction**：当 `detail.informationDensity` 明确时，用 `edgeDensity + entropyProxy` 判断 low / moderate / high 的方向。
4. **Value contrast direction**：当 `value.contrastBudget` 明确时，用亮度标准差与 localContrast 判断方向。
5. **Edge activity direction**：仅在 `edge.policy` 能映射为 restrained / hard / unstable / high-activity 时给出方向性检查。

自动检查输出不是二元真理，而是：

- `pass`
- `warn`
- `needs_judgment`
- `unsupported`

每项必须附 `evidence` 和 `reason`。

### Human-required Checks
以下维度默认不能由 M3 像素分析自动判断：

- Narrative Verb 是否成立
- Primary Variable 是否承担主要叙事负载
- Character identity anchors 是否可读
- World relation / ownership 是否正确
- Composition hierarchy 是否符合第一/第二/第三读取
- Camera allegiance 是否站在正确一侧
- Color ownership 的语义归属
- Medium ownership 是否局部而非全局污染
- FX 是否属于正确 owner
- Anti-rule 是否发生语义违规

UI 为这些维度提供 `PASS / NEEDS WORK / NOT SURE` 三态人工判断。

## Evaluation Report
统一输出：

```js
{
  artifactId,
  measuredAt,
  measurements,
  checks: [
    {
      id,
      label,
      evidenceMode,
      status,
      target,
      observed,
      reason
    }
  ],
  summary: {
    measuredPass,
    measuredWarn,
    humanPassed,
    humanNeedsWork,
    unresolved
  }
}
```

不得把 `human_required` 项算进自动置信度。

## Re-direct Delta
Evaluation Report 可以编译成一个 `ReDirectionDelta`，只描述下一轮需要修改或保护的内容：

```js
{
  preserve: [],
  correct: [],
  unresolved: [],
  promptAppendix: ''
}
```

规则：

- 自动 `pass` → 加入 `preserve`，避免下一轮无意破坏。
- 自动 `warn` → 加入 `correct`，使用观测值和目标方向生成纠偏指令。
- 人工 `PASS` → 加入 `preserve`。
- 人工 `NEEDS WORK` → 加入 `correct`。
- `NOT SURE / unsupported` → 加入 `unresolved`，不转成强制生成指令。

`promptAppendix` 只包含 `preserve + correct`，不把未知项伪装成模型指令。

下一轮 Agnes request 在原始 Agnes prompt 后追加：

`ITERATION / EVALUATION DELTA`

从而形成：

`Original Visual IR + measured/human feedback → revised generation request`

Visual IR 本体不被自动篡改；M3 的 delta 是一次 generation iteration layer。

## UI
Generation Result 下方新增 **Visual QA / Iteration** 工作区。

布局：

1. **Measured Signals**：显示 ratio、value、saturation、edge、density 指标及状态。
2. **Director Judgment**：语义维度人工三态评分。
3. **Deviation Ledger**：集中列出 `preserve / correct / unresolved`。
4. **RE-DIRECT & GENERATE**：使用当前 delta 重新编译 Agnes request，然后再次生成。

UI 延续现有 editorial / director-console 语言，不做通用 AI SaaS scorecard。

## Error Handling

- 图片 URL 因 CORS 无法进入 Canvas：标记 pixel analysis `unsupported`，但不影响图片展示和人工 QA。
- Base64 图像：应可直接 Canvas 分析。
- Proxy 未配置：保留 request preview；明确提示 secure proxy 未连接。
- Proxy 4xx/5xx：显示 provider-safe message，不丢失当前 Visual IR 和 request。
- Agnes 请求超时：允许重新生成，不自动重试以避免重复费用/重复图片。
- Evaluation 没有可测规则：允许只进行人工 QA。

## Security

- 不在前端、仓库、localStorage 存 Agnes API Key。
- Proxy 只允许 Agnes Image 2.1 Flash，不允许客户端指定上游 host。
- 默认最多 8 张 reference image。
- 默认请求体最大 16 MB。
- prompt 最大 24,000 字符。
- Origin allowlist 由 `VDOS_ALLOWED_ORIGINS` 控制；未配置时仅允许同源调用。
- Proxy 不记录完整 Base64 reference 或 API Key。

## Compatibility

- 不修改 Visual IR v0.1 schema。
- 不改变 `compileVisualIR()` 现有输出契约。
- Agnes adapter 继续是模型特定层。
- Evaluation engine 是模型中立层，可用于未来其他生成 provider。
- 未来可增加 `vision-evaluator` adapter，但其结果必须作为独立 evidence source，不替换 measured / human evidence。

## Testing

### Proxy
- 拒绝非 POST。
- OPTIONS CORS 正常。
- 缺少 API Key 时返回安全错误。
- 拒绝未知模型、非法 size/ratio、过长 prompt、过多 references。
- 只向 Agnes 固定 endpoint 转发白名单字段。
- 上游错误安全透传状态与消息。

### Evaluation Engine
- 已知像素矩阵产生稳定 luminance / saturation / edge / entropy 指标。
- ratio check 能识别通过和偏差。
- unsupported IR 信号不会被强制评分。
- human-required 项不会计入 measured pass rate。
- delta compiler 只把 pass/warn/人工判定转成 preserve/correct。

### Frontend
- 成功生成后自动创建 artifact 并启动测量。
- 图片 CORS 失败时降级为人工 QA。
- 修改人工判定会实时更新 delta。
- Re-direct 不修改 active Visual IR，只更新 iteration request。
- 减少动态效果偏好仍生效。

## Non-goals

M3 不做：

- 多模态 LLM 自动审图。
- 自动识别人脸或角色身份。
- 云端 generation history。
- 用户账户、额度与计费。
- 多人协作。
- 自动修改 Visual IR schema。
- 自动连续生成直到“通过”。

## Success Criteria

1. GitHub Pages 不暴露 Agnes API Key，且可以通过独立 proxy 实时生成。
2. 每张结果都能追溯到生成它的 Visual IR / Agnes request。
3. 系统自动展示至少五类客观图像测量，并明确 evidence 来源。
4. 不可自动证明的导演规则明确显示为人工判断，而不是虚假自动分数。
5. 用户可以把 QA 结果编译为 iteration delta 并再次生成。
6. 整个流程形成可读的 `DIRECT → GENERATE → EVALUATE → RE-DIRECT` 闭环。
