# Narrative Visual Director — Pressure Scenarios

这些场景用于验证 Skill 是否真的执行“叙事视觉转译”，而不是退化成普通风格滤镜。

> 当前文件定义验收基线。正式 runtime/subagent 对照测试应在部署环境中执行；未执行前不要把 Skill 标记为 fully verified。

## S1｜只有照片，没有文字
**输入**：一张单人城市人像，无额外说明。

**失败行为**：直接输出通用漫画滤镜 prompt；没有状态、原型、主变量判断。

**通过条件**：
- 自动进入 `auto_director`；
- 只根据可见表情、姿态、视线、构图和环境推断，不猜测敏感身份；
- 选择一个 narrative state 和一个 archetype；
- 明确 primary variable、camera、color、edge、background、readability；
- 再生成图像指令。

## S2｜用户明确指定“压迫感 + Gwen-like情绪机制”
**输入**：照片 + “想要压迫、脆弱，但不要乱，要偏Gwen那种情绪画面。”

**失败行为**：自动判断覆盖用户要求；只增加粉紫水彩。

**通过条件**：
- 用户显式意图优先；
- 路由到 `boundary_emotion` + `pressure`；
- 核心由 Edge × Color 承担，而不是“粉紫色”；
- 背景抽象、负空间、边缘硬软与关系色域共同表达压力；
- 保持人物脸和核心姿态可读。

## S3｜用户要求“纵横宇宙风格”但没有指定角色原型
**失败行为**：Prompt只写 `Spider-Verse style`、halftone、chromatic aberration。

**通过条件**：
- 将表面风格请求翻译为具体 rendering mechanisms；
- 仍先根据照片选 narrative archetype；
- Style Stack 中 Structure / Hierarchy / Camera 高于 Texture / FX；
- 不能用表面效果替代叙事变量。

## S4｜高强度反叛人像
**输入**：人物姿态强、直视镜头，用户选择 `rebellion_time`, `extreme`。

**失败行为**：全画面随机噪点、拼贴、错版，人物身份丢失。

**通过条件**：
- 保留黑色或高值差的结构骨架；
- 局部媒介可碎裂，但全局gesture清楚；
- 允许 registration/time desync，但至少3个识别通道保留；
- 通过 QA 检查身份和主体优先级。

## S5｜多人关系冲突
**输入**：两人合照，用户指定 `duo_conflict`。

**失败行为**：分别给两个人套同一种效果，没有关系设计。

**通过条件**：
- 建立关系层：视觉中心、距离、边界、色域、camera allegiance；
- 可将人物与“关系场”视为三个视觉owner；
- 颜色和negative space体现冲突，不需要改写两人的身份。

## S6｜情绪难以判断
**输入**：表情中性、姿态中性。

**失败行为**：自信宣称角色“悲伤/愤怒/创伤”。

**通过条件**：
- 使用低置信度语言；
- 默认 `baseline` 或温和 `pressure`；
- 视觉方案可由构图/视线而非臆测心理驱动；
- 不推断敏感属性或生活背景。

## S7｜四状态组图
**输入**：同一人像，输出 `four_state_sheet`。

**失败行为**：四张像四个不同人物；状态只靠不同色板区分。

**通过条件**：
- Identity anchors保持一致；
- `baseline → pressure → crisis → agency` 至少在 camera / edge / space or focus / color territory 中出现结构性差异；
- Agency是组织权变化，不只是“最亮最炸”。

## S8｜生成结果身份不像本人
**失败行为**：接受首张结果。

**通过条件**：
- QA识别 `identity_preservation` 失败；
- 触发 identity retry；
- 第二次降低表面噪声、加强face/hair/silhouette anchors，同时保留核心视觉机制。

## S9｜生成结果很酷但原型跑偏
**输入**：`focus_attention`。

**失败行为**：输出纯动态动作漫画。

**通过条件**：
- QA发现Primary Variable不是Focus/Visibility；
- Retry删除无关动势，强化focal hierarchy、gaze-led clarity、selective reveal。

## S10｜无可用图片
**输入**：用户说“把我这张图转一下”，但当前会话没有图片。

**通过条件**：
- 不假装看到了图片；
- 简短要求用户上传/重新发送目标图片；
- 不执行虚构分析。
