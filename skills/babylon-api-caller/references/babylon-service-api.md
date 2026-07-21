# Babylon Service API — AI 助手调用指南

> **使用场景**：当你（AI 助手）需要代用户调用 Babylon 统一 AI 接口时，参考本文档构造请求。
>
> **Base URL**：`https://babylon.garenanow.com`
>
> **统一入口**：`POST /ai/babylon/dock`
>
> **Gateway 兼容入口（可选）**：`POST /v1/chat/completions`、`POST /v1/messages`、`GET /v1/models` — API Key：`Authorization: Bearer tp_...`。管理台 `https://bbl.garenanow.com/docs/manage.html`（SSO）；最高管理员默认 `xingyu.wang@garena.com`（`BABYLON_GATEWAY_OWNER_EMAIL`）可配置每组每 API 配额（`PUT .../gateway/groups/{code}`）。
>
> **认证**：所有请求需要 `Authorization: Bearer <token>` 或 `Cookie: jwt_token=<token>`。本地 Agent 调用 infohub/Babylon skill 时，运行时会优先从用户本地 `.taco_env` 读取 JWT（Windows 默认 `C:\Users\用户名\.taco_env`，也支持 `~/.taco_env` 或 `TACO_ENV_PATH` 覆盖），再回退到请求里的 header/cookie。

---

## 🗺️ 模型路由速查

| 产品名 | 推荐 model | 后端 | 权限 |
|--------|-----------|------|------|
| GPT 5.5 | `gpt-5.5` | OpenAI | llm |
| GPT 5.4 | `gpt-5.4` | OpenAI | llm |
| GPT 5.4 Mini | `gpt-5.4-mini` | OpenAI | llm |
| GPT 5.4 Nano | `gpt-5.4-nano` | OpenAI | llm |
| GPT 5.1 | `gpt-5.1` | OpenAI | llm |
| GPT 5 Mini | `gpt-5-mini` | OpenAI | llm |
| Gemini 3.5 Flash | `gemini-3.5-flash` | Gemini | llm |
| Gemini 3.1 Pro Preview | `gemini-3.1-pro-preview` | Gemini | llm |
| Gemini 3.1 Flash Lite Preview | `gemini-3.1-flash-lite-preview` | Gemini | llm |
| Gemini 2.5 Pro | `gemini-2.5-pro` | Gemini | llm |
| Kimi K2 | `kimi-k2-thinking` | Moonshot | llm |
| MiniMax M2 | `minimax-m2` | MiniMax | llm |
| GLM-5 | `glm-5` | 智谱 | llm |
| Claude Sonnet 4.6 | `claude-sonnet-4-6` | Anthropic | llm |
| Claude Sonnet 4.5 | `claude-sonnet-4-5@20250929` | Anthropic | llm |
| Claude Opus 4.7 | `claude-opus-4-7` | Anthropic | llm |
| Claude Opus 4.6 | `claude-opus-4-6` | Anthropic | llm |
| GPT 2 | `gpt-image-2` | OpenAI | imageGen |
| GPT 1.5 | `gpt-image-1.5` | OpenAI | imageGen |
| GPT 1 | `gpt-image-1` | OpenAI | imageGen |
| Banana 2 | `gemini-3.1-flash-image-preview`（别名 `banana-2` / `nanobanana 2.0`） | Gemini | imageGen |
| Banana Pro | `gemini-3-pro-image-preview`（别名 `banana-pro` / `nanobanana-pro`） | Gemini | imageGen |
| Banana Fast | `gemini-2.5-flash-image`（别名 `banana` / `nanobanana`） | Gemini | imageGen |
| Gemini Image (最新) | `gemini-image`（自动映射到当前 `GEMINI_IMAGE_MODEL`） | Gemini | imageGen |
| Kling V3 | `kling-v3-0` | 可灵 | KLING |
| Kling O3 | `kling-v3-omni` | 可灵 | KLING |
| Kling O1 | `kling-video-o1` | 可灵 | KLING |
| Kling 2.6 | `kling-v2-6` | 可灵 | KLING |
| Motion Control 3 | `kling-v3`（需 `character_orientation`） | 可灵 | KLING |
| 角色替换 2.6 | `kling-v2-6`（需 `character_orientation`） | 可灵 | KLING |
| Seedance 2.0 | `dreamina-seedance-2-0-260128`（dock `model: seedance` 默认） | BytePlus ModelArk | KLING |
| Seedance 2.0 Fast | `dreamina-seedance-2-0-fast-260128` | BytePlus ModelArk | KLING |
| Tripo 3.1 | `tripo`（`model_version: "v3.1-20260211"`） | Tripo AI | TRIPO |
| Tripo 3.0 | `tripo`（`model_version: "v3.0-20250301"`） | Tripo AI | TRIPO |
| Tripo P1 | `tripo`（P1 系列） | Tripo AI | TRIPO |
| Tripo 智能拓扑 | `tripo-topology` | Tripo AI | TRIPO |
| Tripo 网格分割 | `tripo-segmentation` | Tripo AI | TRIPO |
| Tripo 绑定前检测 | `tripo-prerigcheck`（别名 `tripo-pre-rig-check` / `tripo-rig-check`） | Tripo AI | TRIPO |
| Tripo 动画绑定 | `tripo-rig`（别名 `tripo-bind` / `tripo-binding`） | Tripo AI | TRIPO |
| Hunyuan 3.1 | `hunyuan-3d`（`model_version: "3.1"`） | 腾讯混元 | HUNYUAN |
| Hunyuan 3.0 | `hunyuan-3d`（`model_version: "3.0"`） | 腾讯混元 | HUNYUAN |
| 拓扑 | `hy3d-3`（`feature: "reduce_face"`） | 腾讯混元 | HUNYUAN |
| 展UV | `hy3d-3`（`feature: "uv_unwrap"`） | 腾讯混元 | HUNYUAN |
| 拆分 | `hy3d-3`（`feature: "part_split"`） | 腾讯混元 | HUNYUAN |
| 千面动捕 | `qianmian` | 千面 | QIANMIAN |
| Enhance | `enhance` | RealESRGAN | imageGen |
| RMBG | `rmbg` | BiRefNet | imageGen |

> **模型名归一化**：路由时自动 `strip().lower().replace("_", "-")`，大小写和下划线不敏感。
>
> **Banana 系列别名**（不区分大小写、下划线、空格、连字符；可选 `nano` 前缀）：
> - `banana` / `banana-fast` / `nanobanana` / `nano-banana` → `gemini-2.5-flash-image`
> - `banana-pro` / `banana pro` / `nanobanana-pro` / `nano-banana pro` → `gemini-3-pro-image-preview`
> - `banana-2` / `banana 2.0` / `banana2` / `nanobanana2` / `nano-banana 2.0` → `gemini-3.1-flash-image-preview`
> - `gemini-image` → 当前 `GEMINI_IMAGE_MODEL` 配置值（默认指向最新版）

---

## 📋 通用请求结构

### JSON 请求

```json
POST /ai/babylon/dock
Authorization: Bearer <token>
Content-Type: application/json

{
  "model": "<模型名>",
  "payload": {
    // 业务参数
  }
}
```

### Multipart 请求（含文件上传）

```bash
curl -X POST /ai/babylon/dock \
  -H "Authorization: Bearer <token>" \
  -F "model=gpt-image-1.5" \
  -F 'payload={"prompt": "把图片风格改成油画"}' \
  -F "image=@/path/to/image.png"
```

**支持的 multipart 文件字段**：

| 字段 | 写入 payload 字段 | 说明 |
|------|-----------------|------|
| `image` / `file`（图片） | `payload.image` | 单图（`file` 传图片时也写入 `image`） |
| `images` / `images[]` | `payload.images`（追加） | 多图列表 |
| `file`（PDF/Office/TXT/CSV 等） | `payload.files`（追加） | 聊天模型的文档附件；GPT/OpenAI Responses 优先走原生 `input_file` |
| `files` / `files[]` / `input_files` | `payload.files`（追加） | 多文档附件 |
| `document` / `documents[]` / `attachments[]` | `payload.files`（追加） | 文档附件；适合聊天模型读取非图片内容 |
| `front` / `back` / `left` / `right` | 同名字段 | 多视角图片 |
| `image_tail` | `payload.image_tail` | 视频尾帧 |
| `video` | `payload.video` | 视频文件（千面动捕使用） |
| `image_2` ~ `image_7` | 同名字段 | 额外图片 |

> JSON payload 中已有同名字段时不覆盖（JSON 优先）。

**InfoHub 背包（TACO `@` 引用，可选）**：`payload.context_infohub_capability_ids`（`string[]`，最多 5）注入 InfoHub 能力上下文；未审核项需用户确认后重试并附带 `allow_unreviewed_infohub_capability_ids`。目录/收藏：`GET /ai/babylon/infohub/catalog`、`GET /ai/babylon/infohub/me/favorites`；收藏 `POST|DELETE /ai/babylon/infohub/capabilities/{id}/favorite`。

### 用户对话中的图片（外部 AI 助手）

用户在 Cursor、Codex 等对话里粘贴或附件图片时，**聊天里「能看见」不等于 API 已收到文件**。必须把图片转成下列输入之一，再调用 `/ai/babylon/dock` 或 `/ai/babylon/agent/dock`：

| 优先级 | 做法 | 适用场景 |
|--------|------|----------|
| 1 | **multipart** `-F image=@<可读路径>`（多图用 `images` / `images[]`） | 运行环境能读到附件落盘路径（如 IDE 提供的 `assets/…png`） |
| 2 | **base64** 写入 `payload.image_base64` 或 `payload.images[]` | 已读取文件字节、暂无 URL |
| 3 | **`POST /ai/babylon/files/upload`**，表单字段 **`files`**，再用返回的 `url` | 需要持久 URL 或多次复用同一文件 |

**禁止**：

- 因对话里能看见图就回复「无法上传」，或让用户把图拷到某个本机目录「等服务器读取」——Babylon **不能**访问用户电脑上的任意路径（如 `D:\...`）；须由**你**在本机读取字节后，用 multipart / base64 / upload 发给 API。
- 把未上传的「视觉上下文」直接当作 `payload.image` URL。

**Agent 模式**：`payload.image` / `images`（或消息 `content` 中的图片 URL）会映射为 `@image-1`、`@image-2` 等；仍须先完成上表三种方式之一。

```bash
curl -X POST https://babylon.garenanow.com/ai/babylon/agent/dock \
  -H "Authorization: Bearer <token>" \
  -F "model=gemini-3.1-flash-image-preview" \
  -F 'payload={"prompt":"按参考图生成","chat_id":"chat_123"}' \
  -F "image=@/path/from/chat/attachment.png"
```

**消息内联引用**（不走 multipart / `payload.files`）：在 `messages[].content` 数组里直接放 `{"type":"file_url","file_url":"<url>"}`，`type` 也可以是 `document_url` / `attachment_url`；同名字段额外支持 `{"url":"<url>"}` 对象形式。

文档附件支持：

- GPT / OpenAI 模型：PDF、DOCX、XLSX、PPTX、CSV / TSV、JSON、Markdown、代码等，URL / base64 / `file_url` 均可；单文件 ≤ 50 MB（超出返回 400 `LLM_P_001`）。
- Claude 模型：PDF、Office、纯文本等文档，单文件 ≤ 30 MB；启用 `code_execution=true` 时额外支持 CSV、Excel、JSON、XML、代码、图片等数据文件。
- 扫描版 PDF 的 OCR 默认关闭；如需启用请联系运维设置 `BABYLON_PDF_OCR_ENABLED=true` 并部署 Tesseract。
- GPT / OpenAI 原生网页搜索：在 payload 中传 `native_web_search=true`，可选附加 `web_search_user_location`；默认 `search_context_size="high"`。

**可选请求头**：

| Header | 说明 |
|--------|------|
| `X-Client-Type` | 客户端来源标识（Header 优先于 payload.client_type）。**请填写你自己的产品名**（如 `my_app`、`acme-frontend`）。格式：小写字母/数字/`_`/`-`，长度 ≤ 64，首字符须为字母或数字；未传或格式非法时默认 `private_api` |
| `X-Request-Id` | 自定义请求 ID；写入访问日志 `request_id` 字段，响应头原样返回，出错时同步返回 `X-Error-Id` |
| `X-Trace-Id` | `X-Request-Id` 的备选别名，优先级低于 `X-Request-Id`；两者行为完全相同，传任意一个即可 |

---

## 💬 聊天 (Chat)

### 基础调用

```json
{
  "model": "gpt-5.5",
  "payload": {
    "messages": [
      {"role": "system", "content": "你是一个专业助手"},
      {"role": "user", "content": "用户的问题"}
    ],
    "stream": true
  }
}
```

### 关键参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `messages` | array | 必填 | 对话历史列表 |
| `stream` | bool | `true` | 是否流式 SSE 输出 |
| `temperature` | float | 配置默认值 | 创造性 0-2 |
| `max_completion_tokens` | int | 配置默认值 | 最大输出 token |
| `tools` | array | - | Function Calling 工具定义 |
| `tool_choice` | object/string | - | 工具选择策略 |
| `reasoning_effort` | string | - | 推理强度：`minimal`/`low`/`medium`/`high`/`xhigh` |
| `deep_reasoning` | bool | - | Claude 扩展思考开关（`true` 时 budget=10000） |
| `response_format` | object | - | 结构化输出（JSON Schema） |
| `chat_id` | string | - | 会话 ID，用于保存历史 |
| `user_timestamp` | int | - | 用户消息时间戳（毫秒） |
| `client_type` | string | `private_api` | 客户端来源（通常由 `X-Client-Type` 头写入，payload 作为兼容回退） |
| `extra_metadata` | object | - | 业务自定义扩展字段，随消息保存；`prompt` 键用于会话消息列表展示 |

### 统一 Tools 接口

推荐使用统一 flat tools 形态，对 GPT / OpenAI 与 Claude 模型通用：

```json
{
  "model": "gpt-5.5",
  "payload": {
    "stream": false,
    "messages": [{"role": "user", "content": "What's the weather like in San Francisco?"}],
    "tools": [
      {
        "type": "function",
        "name": "get_weather",
        "description": "Get the current weather in a given location",
        "parameters": {
          "type": "object",
          "properties": {"location": {"type": "string"}},
          "required": ["location"]
        }
      }
    ],
    "tool_choice": {"type": "tool", "name": "get_weather"}
  }
}
```

兼容性：OpenAI nested `{"type":"function","function":{...}}` 和 Claude `{"name":...,"input_schema":...}` 仍可直接传。GPT / OpenAI 与 Claude 的非流式响应都会返回 `tool_calls`；流式响应会发送 `event: tool_call`。

GPT / OpenAI Responses 图片生成：可直接传 `tools: [{"type":"image_generation"}]`。流式 `event: tool_call` + `type: result`：`body.files`/`body.images` 取图；`body.display.max_width_px` 默认 560，按对话区宽度渲染大图。非流式 `tool_calls[].type === "image_generation"` 同样含 `display`。勿按通用 tool 缩略图样式渲染。

Claude 原生网页搜索：传 `web_search: true` 或 `tools: [{"type":"web_search","max_uses":5}]`，默认 `max_uses` 为 5。可选字段：`web_search_max_uses`、`web_search_allowed_domains`、`web_search_blocked_domains`、`web_search_user_location`。

Claude code execution：传 `code_execution: true` 或 `tools: [{"type":"code_execution"}]`；随请求上传的数据、表格、JSON、XML、代码或图片文件可被 Claude 执行环境读取。

### Taco Search Agent

`taco-search-agent` 是产品侧统一的联网搜索与总结模型名。通过 `payload.version` 选择能力：

| version | 用途 |
|---------|------|
| `search` | 只返回网页搜索结果列表 |
| `agent` | 读取 URL、搜索最新内容并总结 |
| `research` | 对名称、主题或图片识别文本做联网搜索总结 |

示例：

```json
{
  "model": "taco-search-agent",
  "payload": {
    "version": "agent",
    "url": "https://example.com",
    "query": "总结这个网站，并搜索最近的新动态"
  }
}
```

图片场景请先用视觉/OCR 上游生成 `image_description` / `vision_summary` / `ocr_text`，再传给 `taco-search-agent` 的 `research` version。`taco-search-agent` 是 `/ai/babylon/dock` 的模型入口，不是 Agent Loop 内部的 `web-search` skill；内部 skill 仍负责为 Babylon Agent 规划阶段提供 live web context。需要最新新闻、价格、活动、天气或任何实时信息时，Agent 应先调用 `web-search`，通过它拿到最新的 `sources` 和 `dynamic_contexts` 后再回答或继续生成。

### 支持的聊天模型

| 产品名 | 模型名称 | 后端 | 特点 |
|--------|---------|------|------|
| GPT 5.5 | `gpt-5.5` | OpenAI | 最新旗舰，支持 `reasoning_effort` 全档（含 `xhigh`）；快照 `gpt-5.5-2026-04-23` |
| GPT 5.4 | `gpt-5.4` | OpenAI | GPT-5.4 旗舰，支持 `reasoning_effort` 全档（含 `xhigh`） |
| GPT 5.4 Mini | `gpt-5.4-mini` | OpenAI | GPT-5.4 轻量，支持 `reasoning_effort`，不含 `xhigh` |
| GPT 5.4 Nano | `gpt-5.4-nano` | OpenAI | GPT-5.4 极小，支持 `reasoning_effort`，不含 `xhigh` |
| GPT 5.1 | `gpt-5.1` | OpenAI | GPT-5.1 系列 |
| GPT 5 Mini | `gpt-5-mini` | OpenAI | GPT-5 轻量，支持 `reasoning_effort`，不传 `temperature` |
| Gemini 3.5 Flash | `gemini-3.5-flash` | Gemini | Gemini 3.5 Flash，Agent / 编码，支持 Vision |
| Gemini 3.1 Pro Preview | `gemini-3.1-pro-preview` | Gemini | Gemini 3.1 Pro 预览版，支持 Vision |
| Gemini 3.1 Flash Lite Preview | `gemini-3.1-flash-lite-preview` | Gemini | Gemini 3.1 Flash Lite 预览版（轻量，低成本） |
| Gemini 2.5 Pro | `gemini-2.5-pro` | Gemini | Google 旗舰，支持 Vision |
| Kimi K2 | `kimi-k2-thinking` | Moonshot | Kimi 深度思考 |
| MiniMax M2 | `minimax-m2` | MiniMax | MiniMax M2 |
| GLM-5 | `glm-5` | 智谱 | 智谱 GLM-5 |
| Claude Sonnet 4.6 | `claude-sonnet-4-6` | Anthropic | Anthropic Sonnet 4.6（默认） |
| Claude Sonnet 4.5 | `claude-sonnet-4-5@20250929` | Anthropic | Anthropic Sonnet 4.5 |
| Claude Opus 4.7 | `claude-opus-4-7` | Anthropic | Anthropic Opus 4.7 |
| Claude Opus 4.6 | `claude-opus-4-6` | Anthropic | Anthropic Opus 4.6 |
| Taco Search Agent | `taco-search-agent` | Perplexity Gateway | 联网搜索与总结；用 `version` 区分 `search` / `agent` / `research` |

> **Claude 扩展思考** — `reasoning_effort` 各档位 budget：`minimal`=2000 / `low`=4000 / `medium`=8000 / `high`=16000 / `xhigh`=32000；`deep_reasoning: true` 等同于 budget=10000。

---

## 🖼️ 图像生成 (Image Generation)

### GPT IMAGE（GPT 2 / GPT 1.5 / GPT 1）

```json
{
  "model": "gpt-image-2",
  "payload": {
    "prompt": "一只可爱的橘猫戴着宇航员头盔",
    "size": "2048x2048",
    "quality": "high",
    "n": 1,
    "chat_id": "chat_123"
  }
}
```

图像编辑时加 `image_base64`（base64）或 `image`（URL / 本地路径，multipart 写入）；多图编辑用 `images`（URL 或 base64 列表，也支持 multipart `images[]` 字段）。**GPT 2 / 1.5 / 1 调用形态完全一致**，只需切换 `model` 字段。

| 参数 | 说明 |
|------|------|
| `prompt` | 图像描述（必填，GPT 2 最长 32K 字符） |
| `size` | GPT 1.5：`1024x1024` / `1024x1536` / `1536x1024` / `auto`；**GPT 2** 任意 `WxH`（边长 ≤3840、16 倍数、长短比 ≤3:1、像素 655K~8.3M），含 2K (`2048x2048`) / 4K (`3840x2160`)。非法尺寸返回 400 `IMG_P_006`。 |
| `quality` | `low` / `medium` / `high` / `auto` |
| `n` | 生成数量 1-10 |
| `background` | `auto` / `opaque`（**GPT 2 不支持** `transparent`）。透明底：用 `rmbg` 抠图（见背景移除），或 `gpt-image-1.5` 官方 `transparent`（Babylon 待接通） |
| `output_format` | `png`（默认） / `jpeg` / `webp`；`output_compression` 0-100 仅对 jpeg/webp 生效 |
| `moderation` | `auto`（默认） / `low`（低限制） |
| `partial_images` | 0–3，>0 时请求生成中间帧；当前响应以最终图片为准 |
| `image_base64` | 编辑模式：原图 base64（data URI 或纯 base64） |
| `image` | 编辑模式：URL 或本地路径（multipart 兼容） |
| `images` | 多图编辑：URL 或 base64 列表（multipart `images[]` 兼容，最多 16 张，单张 < 50MB） |
| `mask` | 编辑模式可选：PNG 蒙版，alpha 透明区为待编辑区（inpaint） |
| `chat_id` | 会话 ID |
| `user_timestamp` | 用户消息时间戳（毫秒） |
| `extra_metadata` | 业务自定义扩展字段；会话列表常用键 **`prompt`**（与上文一致） |

> **参数生效规则**：上述扩展字段仅在 payload 显式提供且取值合法时生效；GPT 2 传入 `background=transparent` 会被忽略；GPT 1.5 的 `transparent` 亦暂未接通，越界值按合法范围处理。

**支持的 GPT 图像模型**：`gpt-image-2`（GPT 2，新）、`gpt-image-1.5`（GPT 1.5）、`gpt-image-1`（GPT 1）

> **GPT 2 vs 1.5**：尺寸更自由（含 2K/4K），输入图片始终高保真（`input_fidelity` 不可配），GPT 2 不支持透明背景，不支持 `style`；透明底请用 `rmbg` 后处理。Gemini / Banana 不支持原生透明底。其余调用方式完全一致。

### Gemini 图像（Banana 系列）

```json
{
  "model": "gemini-3-pro-image-preview",
  "payload": {
    "prompt": "赛博朋克风格的未来城市",
    "aspect_ratio": "16:9",
    "resolution": "2K",
    "chat_id": "chat_123"
  }
}
```

| 参数 | 说明 |
|------|------|
| `prompt` | 图像描述（必填） |
| `aspect_ratio` | 通用: `1:1` / `16:9` / `9:16` / `3:2` / `2:3` / `4:3` / `3:4`；Banana 2 和 Banana Pro 额外支持 `21:9` / `9:21`；Banana 2 还支持 `1:4` / `4:1` / `1:8` / `8:1` |
| `size` | 兼容字段，自动解析为 `aspect_ratio`（如 `1024x1024` → `1:1`） |
| `resolution` / `image_size` | 分辨率：`1K` / `2K` / `4K` |
| `image_base64` / `image` | 参考图片（base64 或本地路径） |
| `images` | 多图输入（URL 或 base64 列表，multipart `images[]` 兼容） |

**支持的 Gemini 图像模型**：

| 产品名 | 模型名称 | 常用别名（大小写/空格/下划线/连字符不敏感） |
|--------|---------|---------|
| Banana 2 | `gemini-3.1-flash-image-preview` | `banana 2` / `banana-2` / `banana 2.0` / `banana2` / `nanobanana2` / `nanobanana 2.0` |
| Banana Pro | `gemini-3-pro-image-preview` | `banana pro` / `banana-pro` / `nanobanana pro` / `nano-banana-pro` |
| Banana Fast | `gemini-2.5-flash-image` | `banana` / `banana-fast` / `nanobanana` / `nano-banana` |
| 最新 Gemini Image | `GEMINI_IMAGE_MODEL` 配置 | `gemini-image`（自动映射到当前最新） |

> 匹配规则：
> - 以 `gemini-` 开头且包含 `image` 或 `imagen` 的模型名均走 Gemini 图像生成
> - banana / nanobanana 系列别名（大小写 / 空格 / 下划线 / 连字符不敏感）映射到对应真实模型
> - `gemini-image` 始终指向当前最新版本

---

## 🎬 视频生成 (Video Generation)

### 可灵 Kling（需要 KLING 权限，异步任务）

**文生视频**：

```json
{
  "model": "kling-v3-0",
  "payload": {
    "prompt": "一个女孩在雨中奔跑，电影感镜头",
    "mode": "pro",
    "duration": "5",
    "aspect_ratio": "16:9",
    "chat_id": "chat_123"
  }
}
```

**图生视频（首尾帧）**：

```json
{
  "model": "kling-v3-0",
  "payload": {
    "prompt": "让人物转头微笑",
    "image": "data:image/png;base64,...",
    "image_tail": "data:image/png;base64,...",
    "mode": "pro",
    "duration": "5",
    "chat_id": "chat_123"
  }
}
```

**Omni-Video（多镜头 / 主体参考）**：

```json
{
  "model": "kling-v3-omni",
  "payload": {
    "prompt": "从第一张图过渡到第二张图",
    "image_list": [
      {"image_url": "data:image/png;base64,...", "type": "first_frame"},
      {"image_url": "data:image/png;base64,...", "type": "end_frame"}
    ],
    "mode": "pro",
    "duration": "5",
    "chat_id": "chat_123"
  }
}
```

**关键参数**：

| 参数 | 说明 |
|------|------|
| `prompt` | 视频描述（文生视频必填；图生/Omni 视频在未启用 `multi_shot` 时同样**必填**，最长 2500 字符） |
| `model_name` | payload 内可覆盖顶层 `model` 字段 |
| `mode` | `std`（标准）/ `pro`（专业，默认） |
| `duration` | 时长（秒），**字符串类型**，枚举 `"3"`-`"15"` |
| `aspect_ratio` | `16:9` / `9:16` / `1:1` |
| `cfg_scale` | CFG Scale (0.0-1.0) |
| `sound` | `on` / `off`（仅 v3 模型；Omni 有 `video_list` 时只能 `off`） |
| `image` | 首帧图片（base64 / URL，multipart 兼容） |
| `image_tail` | 尾帧图片（base64 / URL，multipart 兼容；非 v3 仅 pro 模式） |
| `image_2` ~ `image_7` | 额外图片（multipart 兼容字段） |
| `image_list` | Omni 模式图片列表，每项含 `image_url` / `type`（`first_frame`/`end_frame`/无）；有 `video_list` 时上限 4 项，无时上限 7 项；`end_frame` 必须配合 `first_frame` 且仅限 1-2 张图 |
| `element_list` | Omni 模式主体参考元素列表 |
| `video_list` | Omni 模式视频参考列表，**最多 1 条**，每项含 `video_url`/`refer_type`（`feature`/`base`）/`keep_original_sound`（`yes`/`no`） |
| `frame_mode` | 图片解析模式：`reference`（参考，默认）/ `frame`（首尾帧） |
| `multi_shot` | 是否启用多分镜（仅 v3 模型） |
| `shot_type` | `intelligence`（AI 自动）/ `customize`（自定义） |
| `multi_prompt` | 自定义分镜列表（1-6 个），每项含 `index`/`prompt`（≤512 字符）/`duration`；所有时长之和须等于总时长 |
| `callback_url` | 任务回调地址 |
| `external_task_id` | 自定义任务 ID |
| `chat_id` | 会话 ID |
| `user_timestamp` | 用户消息时间戳（毫秒） |
| `extra_metadata` | 业务自定义扩展字段；会话列表常用键 **`prompt`** |

**Kling 模式选择**（按优先级）：
1. 含运动控制参数（`character_orientation` 等）→ Motion Control
2. 使用 `kling-v3-omni` 系列模型 → Omni-Video
3. 有 `image` → 图生视频
4. 有 `prompt` → 文生视频

**文生音效**（独立音频，非视频内嵌音轨）：

```bash
curl -X POST /ai/babylon/dock \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "kling",
    "payload": {
      "model_name": "kling-text-to-audio",
      "prompt": "轻柔的雨滴落在窗户上的环境音",
      "duration": "5",
      "chat_id": "chat_123"
    }
  }'
```

| 参数 | 说明 |
|------|------|
| `model_name` | `kling-text-to-audio`（必填，用于路由 `text_to_audio`） |
| `prompt` | **必填**，音效描述 |
| `duration` | **必填**，`3.0`–`10.0` 秒（字符串，支持一位小数） |

Agent skill：`generate-audio`（`audio_duration` + `prompt`）。

**Motion Control / 角色替换 专属参数**：

| 参数 | 说明 |
|------|------|
| `image` / `image_url` | **必填**，参考图片（决定角色外观） |
| `video` / `video_url` | **必填**，参考视频（决定动作） |
| `character_orientation` | **必填**，`image`（面朝镜头）/ `video`（跟随视频朝向） |
| `keep_original_sound` | `yes`（默认）/ `no` |
| `mc_model_name` | 模型白名单: `kling-v2-6` / `kling-v3` / `kling-v3-0`（默认 `kling-v3`） |

**支持的模型**：

| 产品名 | 模型名称 | 说明 |
|--------|---------|------|
| Kling V3 | `kling-v3-0`（别名 `kling-v3`） | 文生/图生视频 |
| Kling O3 | `kling-v3-omni`（别名 `kling-video-o3`/`kling-omni`） | Omni 多图/多视频参考 |
| Kling O1 | `kling-video-o1` | Omni 旧版（首尾帧逻辑） |
| Kling 2.6 | `kling-v2-6` | 文生/图生视频 |
| Motion Control 3 | `kling-v3`（需 `character_orientation`） | 动作迁移 |
| 角色替换 2.6 | `kling-v2-6`（需 `character_orientation`） | 角色替换 |

### Seedance（需要 KLING 权限，与可灵共用，异步任务）

Dock 入口 `model: seedance`，通过 `payload.sub_model` 选择模型 ID。API 参考：[BytePlus ModelArk — Create a video generation task](https://docs.byteplus.com/en/docs/ModelArk/1520757)

**文生视频**：

```json
{
  "model": "seedance",
  "payload": {
    "sub_model": "dreamina-seedance-2-0-260128",
    "prompt": "下雨的街道，电影感慢镜头",
    "duration": 5,
    "aspect_ratio": "16:9",
    "resolution": "720p",
    "generate_audio": false,
    "chat_id": "chat_123"
  }
}
```

**图生视频**（multipart 上传 `image` 或 payload 内 `image` / `img_url`）：

```json
{
  "model": "seedance",
  "payload": {
    "sub_model": "dreamina-seedance-2-0-fast-260128",
    "prompt": "镜头缓慢推进",
    "image": "https://example.com/first_frame.png",
    "duration": 5,
    "aspect_ratio": "16:9"
  }
}
```

**首尾帧**（2.0；`reference_mode: first_last_frame`；`image` + `image_tail`，与全能参考互斥）：

```json
{
  "model": "seedance",
  "payload": {
    "sub_model": "dreamina-seedance-2-0-260128",
    "prompt": "从白天平滑过渡到夜景",
    "reference_mode": "first_last_frame",
    "image": "https://example.com/first.png",
    "image_tail": "https://example.com/last.png",
    "duration": 5
  }
}
```

**全能参考**（2.0；最多 9 图 + 3 视频 + 3 音频，合计 ≤12；`reference_mode: reference`）：

**输入限制**：图 ≤30MB/张；视频 ≤50MB/段、2–15s/段、视频合计 ≤15s；音频 ≤15MB/段、仅 MP3/WAV、2–15s/段、音频合计 ≤15s；**音频须搭配 ≥1 图或 ≥1 视频**。

```json
{
  "model": "seedance",
  "payload": {
    "sub_model": "dreamina-seedance-2-0-260128",
    "prompt": "参考 @video1 运镜，@image1 角色，配乐 @audio1",
    "reference_mode": "reference",
    "image_urls": ["https://example.com/hero.png", "https://example.com/style.png"],
    "video_urls": ["https://example.com/motion.mp4"],
    "audio_urls": ["https://example.com/beat.mp3"],
    "duration": 6
  }
}
```

含人脸参考视频须为本账号 30 天内 Seedance 2.0 输出（ModelArk 可信输出策略）。**智能多帧**为即梦产品入口，API 无独立模式，可用全能参考 + 分镜 prompt 或 `return_last_frame` 分段衔接。

**关键参数**：

| 参数 | 说明 |
|------|------|
| `sub_model` | 模型 ID，默认 `dreamina-seedance-2-0-260128` |
| `prompt` | 视频描述（必填） |
| `reference_mode` | 2.0 模式：`auto` / `reference` / `first_last_frame` / `first_frame` |
| `image` / `img_url` | 首帧或主参考图 |
| `image_tail` / `last_frame_image` | 尾帧（首尾帧模式） |
| `image_urls` / `ref_images` | 参考图列表（最多 9 张） |
| `image_role` | 2.0：`first_frame` / `last_frame` / `reference_image` |
| `video` / `video_url` | 参考视频 |
| `video_urls` / `ref_video` | 参考视频列表（最多 3 个） |
| `audio_url` / `audio_urls` / `ref_audio` | 参考音频（最多 3 个；MP3/WAV；须搭配图/视频） |
| `video_role` | 默认 `reference_video` |
| `audio_role` | 默认 `reference_audio` |
| `duration` | 时长（秒）；2.0 建议 4–15 |
| `aspect_ratio` | `adaptive` / `16:9` / `21:9` / `4:3` / `1:1` / `3:4` / `9:16`（默认 `adaptive`） |
| `resolution` | `720p` / `1080p`（2.0 标准版；Fast 最高 720p） |
| `generate_audio` | 是否生成音频（2.0 系列） |
| `return_last_frame` | 是否返回最后一帧（2.0 系列） |

**支持的模型**：

| 产品名 | 模型 ID | 说明 |
|--------|---------|------|
| Seedance 2.0 | `dreamina-seedance-2-0-260128` | 文生/首帧/首尾帧/全能参考；最高 1080p |
| Seedance 2.0 Fast | `dreamina-seedance-2-0-fast-260128` | 同上；更快；最高 720p |

**轮询**：`GET /ai/babylon/dock/task/{task_id}?backend=seedance`

### 千面动捕 QianMian（异步任务）

上传视频文件，通过千面动捕 API 生成动作捕捉数据（FBX/BVH 等格式），支持全身/半身/手捕/面捕多种类型和多种骨架格式。

**Multipart 上传（推荐）**：

```bash
curl -X POST /ai/babylon/dock \
  -H "Authorization: Bearer <token>" \
  -F "model=qianmian" \
  -F 'payload={"bonetype": "1", "capturetype": "0", "chat_id": "chat_123"}' \
  -F "video=@/path/to/dance.mp4"
```

**JSON 请求（引用已上传视频 URL）**：

```json
{
  "model": "qianmian",
  "payload": {
    "video": "/resources/uploads/2026/04/01/user/dance.mp4",
    "bonetype": "1",
    "capturetype": "0",
    "chat_id": "chat_123"
  }
}
```

**关键参数**：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `video` / `video_url` | string | 必填 | 视频文件 URL 或本地路径（multipart 上传时自动写入） |
| `bonetype` | string | `"1"` | 骨架类型：`1`=boyFBX / `7`=girlFBX / `3`=Mixamo / `4`=UE4 / `13`=UE5.5 / `14`=UE5.6 / `8`=Unity / `2`=BIP / `5`=VMD / `10`=C4D / `15`=BVH+blendshape / `16`=Warudo 等 |
| `capturetype` | string | `"0"` | 动捕类型，逗号分隔：`0`=全身 / `1`=半身 / `2`=手捕 / `3`=面捕 / `5`=自动判断；全身/半身/自动只能选一 |
| `poseType` | string | - | 第一帧姿势：`1`=TPose / `2`=APose / `3`=原Pose |
| `frameRate` | string | - | 输出帧率：`24`/`30`/`60`/`120` |
| `standPose` | string | - | 原地动作：`true`/`false` |
| `physicType` | string | - | 物理优化：`1`=1.0版 / `2`=2.0版 |
| `physicTimes` | string | - | 物理优化次数（`physicType=2` 时有效，1-6） |
| `isStaticCamera` | string | - | 摄像机状态：`1`=通用摄像机 |
| `chat_id` | string | - | 会话 ID |

**模型别名**：`qianmian` / `qianmian-mocap`（均路由到同一后端）

> 千面动捕为**异步任务**，返回 `task_id`，需轮询 `GET /ai/babylon/dock/task/{task_id}?backend=qianmian`。结果为 zip 压缩包（内含 FBX/BVH 等动捕文件）。
> 轮询时建议优先读取 `data.status`（流程控制）和 `data.progress` / `data.duration`（展示进度），并可结合 `data.video_status` / `data.progress_status` 展示千面原生制作阶段。
> `data.progress_status` 状态码：`1` 待制作 / `2` 制作中 / `3` 制作完成 / `4` 制作失败。

---

## 🧊 3D 模型生成

### Tripo AI（需要 TRIPO 权限，异步任务）

```json
{
  "model": "tripo",
  "payload": {
    "prompt": "一个卡通机器人",
    "generate_type": "Normal",
    "pbr": true,
    "chat_id": "chat_123"
  }
}
```

**分发规则**（按优先级）：
1. `original_task_id + image` → 纹理生成
2. `front` → 多视角生3D（至少 front + 1 个其他视角）
3. `image` → 图生3D
4. `prompt` → 文生3D

特殊功能（拓扑/分割/prerigcheck/绑定）需使用独立 model 别名，见下方「Tripo 特殊功能」节。

**关键参数**：

| 参数 | 说明 |
|------|------|
| `prompt` | 文生3D描述 |
| `image` | 图生3D图片（base64 / URL，multipart 兼容） |
| `front` / `back` / `left` / `right` | 多视角图片（multipart 兼容） |
| `original_task_id` | 纹理生成时的原始任务 ID |
| `model_version` | 模型版本（默认 `v3.1-20260211`） |
| `generate_type` | `Normal` / `LowPoly` / `Geometry` |
| `geometry_quality` | `detailed` / `standard`（v3.x） |
| `face_limit` | 面数限制（P1 范围 48-20000；`smart_low_poly=true` 时范围 1000-20000） |
| `smart_low_poly` | 是否启用智能低面数，仅支持 `true` / `false` |
| `generate_parts` | 是否生成分段可编辑部件（文/图/多视图生3D；H2/H3；额外计费；与 `texture`/`pbr`/`quad` 互斥，启用时需设 `texture=false`、`pbr=false`、`quad=false`） |
| `multigen` | Babylon 并发生成参数；Tripo 仅支持 `1` / `2`，`1` 等同普通单次，`2` 返回两个 `task_id` |
| `pbr` | 是否生成 PBR 材质（默认 `true`） |
| `model_seed` / `texture_seed` | 随机种子（P1+） |
| `texture_quality` | `standard` / `detailed`（P1+） |
| `auto_size` | 自动缩放到真实尺寸（P1+） |
| `compress` | 压缩类型：`geometry`（P1+） |
| `export_uv` | 是否导出 UV，`false` 可加速（P1+） |
| `enable_image_autofix` | 优化输入图片（P1 图生3D） |
| `texture_alignment` | `original_image` / `geometry`（P1 图生3D） |
| `orientation` | `default` / `align_image`（P1 图生3D） |
| `chat_id` | 会话 ID |
| `user_timestamp` | 用户消息时间戳（毫秒） |

**所有 Tripo 任务为异步任务**，提交后返回 `task_id`，需轮询 `GET /ai/babylon/dock/task/{task_id}?backend=tripo`。

轮询响应 `data` 字段说明：

| 字段 | 说明 |
|------|------|
| `status` | `queued` / `running` / `success` / `failed` / `banned` / `expired` / `cancelled` |
| `progress` | 进度（0-100），`running` 时可用 |
| `output.model` | 成功时：本地保存的模型文件 URL |
| `output.pbr_model` | 成功时：同 `model`（PBR 版本） |
| `output.model_seed` | 几何生成种子（成功时，如有） |
| `output.texture_seed` | 纹理生成种子（成功时，如有） |
| `output.riggable` | prerigcheck 专用：是否可绑定 |
| `output.reason` | prerigcheck 专用：原因说明 |

> 建议轮询间隔 **10 秒**，最多 **200 次**（约 33 分钟超时）。

### Tripo 特殊功能

以下功能使用独立 `model` 别名，需提供 `original_task_id` 或本地 3D 文件路径（`mesh`），结果同样需轮询 `?backend=tripo`。

| 功能 | model 别名 | 必填参数 | 关键可选参数 |
|------|-----------|---------|------------|
| 智能拓扑（高模转低模） | `tripo-topology` | `original_task_id` 或 `mesh` | `quad`（默认 false）、`bake`（默认 true）、`face_limit`（三角面 500-150000；四边面 500-50000）、`part_names`、`model_version`（默认 `P-v2.0-20251225`） |
| 网格分割 | `tripo-segmentation` | `original_task_id` 或 `mesh` | - |
| 绑定前检测 | `tripo-prerigcheck` | `original_task_id` 或 `mesh` | - |
| 动画绑定（Auto-Rig） | `tripo-rig` | `original_task_id` 或 `mesh` | `out_format`（`glb`/`fbx`，默认 `glb`）、`spec`（`tripo`/`mixamo`，默认 `tripo`） |

**别名扩展**：
- `tripo-topology` 无其他别名
- `tripo-segmentation` 无其他别名
- `tripo-prerigcheck` / `tripo-pre-rig-check` / `tripo-rig-check` → 同一功能
- `tripo-rig` / `tripo-bind` / `tripo-binding` → 同一功能

**`mesh` 字段**：接受已上传至本地的 3D 文件路径（GLB/OBJ/FBX/STL，通过 `/ai/babylon/files/upload` 上传后得到的 URL）。不支持外部网络 URL。

### 腾讯混元 3D（需要 HUNYUAN 权限，异步任务）

```json
{
  "model": "hunyuan-3d",
  "payload": {
    "prompt": "一个古代宝塔",
    "model_version": "3.0",
    "generate_type": "Normal",
    "enable_pbr": true,
    "chat_id": "chat_123"
  }
}
```

**分发规则**（按优先级）：
1. `front` → 多视角生3D
2. `image` → 图生3D
3. `prompt` → 文生3D

**关键参数**：

| 参数 | 说明 |
|------|------|
| `prompt` | 文生3D描述 |
| `image` | 图生3D图片（base64 / URL，multipart 兼容；也可通过 `images[0]` 传入） |
| `front` / `back` / `left` / `right` | 多视角图片（3.0 支持 4 视角） |
| `top` / `bottom` / `left_front` / `right_front` | 额外视角（仅 3.1） |
| `model_version` | `3.0`（默认）/ `3.1`（支持 8 视角，不支持 LowPoly/Sketch） |
| `version` | 兼容字段，等同于 `model_version`（支持 `hunyuan3.1` 等格式，自动提取版本号） |
| `generate_type` | `Normal` / `LowPoly` / `Geometry` |
| `polygon_type` | 多边形类型（LowPoly 模式）：`triangle` / `quad` |
| `enable_pbr` | 是否生成 PBR 材质（默认 `true`） |
| `face_count` | 面数（10000-1500000，不传由系统自动决定） |
| `chat_id` | 会话 ID |
| `user_timestamp` | 用户消息时间戳（毫秒） |

### 混元 3D 后处理 hy3d-3（需要 HUNYUAN 权限，异步任务）

```json
{
  "model": "hy3d-3",
  "payload": {
    "feature": "reduce_face",
    "file_url": "https://babylon.garenanow.com/resources/output/model.glb",
    "file_type": "GLB",
    "face_level": "medium",
    "chat_id": "chat_123"
  }
}
```

| `feature` 值 | 说明 | 关键参数 |
|-------------|------|---------|
| `reduce_face` | 智能拓扑（减面） | `polygon_type`（`triangle`/`quadrilateral`），`face_level`（`high`/`medium`/`low`）；支持 OBJ/GLB |
| `uv_unwrap` | 智能展 UV | 支持 OBJ/GLB/FBX |
| `texture` | 纹理贴图生成 | `prompt` 或 `image`（二选一），`enable_pbr`（默认 `false`）；支持 OBJ/GLB |
| `part_split` | 3D 模型拆分组件 | 支持 OBJ/GLB/FBX |

> 别名：`hy3d-3` / `hy3d_3`（两者均可使用）

---

## 🔧 图像工具

### 图像增强/超分 (Enhance)

```json
{
  "model": "enhance",
  "payload": {
    "image": "https://babylon.garenanow.com/resources/output/photo.png",
    "model_name": "RealESRGAN_x4plus",
    "outscale": 4.0,
    "face_enhance": false,
    "chat_id": "chat_123"
  }
}
```

| 参数 | 说明 |
|------|------|
| `image` | 单图（URL / base64） |
| `images` | 批量图片列表（URL / base64） |
| `model_name` | `RealESRGAN_x4plus`（通用推荐）/ `RealESRNet_x4plus`（高质量）/ `RealESRGAN_x4plus_anime_6B`（动漫）/ `RealESRGAN_x2plus`（2倍）/ `realesr-animevideov3`（动漫视频帧）/ `realesr-general-x4v3`（通用轻量） |
| `outscale` | 放大倍数 1-8（默认 4.0） |
| `face_enhance` | 是否启用人脸增强（默认 `false`） |
| `chat_id` | 会话 ID |

**模型别名**：`enhance` / `realesr` / `realesrgan` / `real-esrgan` / `esrgan`（均路由到同一后端）

> 增强为**异步任务**，返回 `task_id`，需轮询 `GET /ai/babylon/dock/task/{task_id}?backend=enhance&chat_id=<chat_id>`。

### 背景移除 (RMBG)

```json
{
  "model": "rmbg",
  "payload": {
    "image_base64": "iVBORw0KGgo...",
    "weights_file": "General-dynamic",
    "resolution": "1024x1024"
  }
}
```

| 参数 | 说明 |
|------|------|
| `image_base64` | 单图 base64（必填，或用 `image` 字段） |
| `image` | 单图 URL / 本地路径（兼容字段） |
| `images_base64` | 批量图片列表（每项为 `{"image_base64": "..."}` 或纯字符串） |
| `weights_file` | BiRefNet 模型：`General-dynamic`（默认）/ `General-HR`（2K）/ `Matting-HR`（带 alpha）/ `DIS`（场景）/ `solid`（本地纯色背景算法，无需 AI） |
| `resolution` | 输出分辨率（默认 `1024x1024`） |
| `tolerance` | 纯色模式颜色容差（默认 30） |
| `edge_smooth` | 纯色模式边缘羽化半径（默认 0） |
| `bg_color` | 纯色模式背景色，支持 `"#rrggbb"` / `"r,g,b"` / `[r,g,b]` |
| `chat_id` | 会话 ID |

> RMBG 为**同步**接口，直接返回结果；支持批量并发处理。

---

## ⏳ 异步任务处理

**异步 / 轮询任务**（视频 Kling、千面动捕、3D 生成、图像增强，以及**显式开启轮询的图片生成**）提交后返回 `task_id`，需轮询状态。图片 dock 默认可能同步返回文件；轮询模式在 payload 设 `_image_polling: true`（或 `image_polling` / `image_task_polling`），响应含 `poll_url`，轮询端点与下表一致（`backend` 为 `openai` / `gemini` 等生图后端）。

**提交响应**：
```json
{
  "success": true,
  "task_id": "hy3d_abc123",
  "chat_id": "chat_123",
  "message": "任务已提交，正在后台处理",
  "queue_position": 0,
  "queue_info": {},
  "request_message_id": 456
}
```

**轮询状态**：
```
GET /ai/babylon/dock/task/{task_id}?backend=hy3d
GET /ai/babylon/dock/task/{task_id}?backend=tripo
GET /ai/babylon/dock/task/{task_id}?backend=enhance&chat_id=<chat_id>
GET /ai/babylon/dock/task/{task_id}?backend=kling&task_type=text2video
GET /ai/babylon/dock/task/{task_id}?backend=qianmian
```

`task_type` 可选值（kling）：`text2video` / `image2video` / `omni-video` / `motion_control`

**状态值**：`queued` / `submitted` / `running` / `success` / `failed` / `timeout`

**视频任务成功输出（`data.output`）**：

| 字段 | 说明 |
|------|------|
| `video_url` | 标准视频 URL 字段；视频后端成功时优先读取 |
| `videos` | 视频列表；每项包含 `url`，可能包含 `filename` / `poster` |
| `filepath` | 兼容字段，通常与 `video_url` 一致 |
| `poster_url` | 视频封面图 URL（若可用） |

**Tripo** 轮询成功后，`data.output` 字段说明：

| 字段 | 说明 |
|------|------|
| `model` | 本地保存的模型文件 URL（3D 生成 / 拓扑 / 分割 / 绑定） |
| `pbr_model` | 同 `model`（PBR 版本） |
| `model_seed` | 几何生成种子（如有） |
| `texture_seed` | 纹理生成种子（如有） |
| `riggable` | prerigcheck 专用：是否可绑定（bool） |
| `reason` | prerigcheck 专用：原因说明 |

> Tripo 建议轮询间隔 **10 秒**，最多 **200 次**（约 33 分钟）。

其中千面动捕建议额外读取（位于 `data` 内）：

- `progress`：制作进度（0-100）
- `video_status`：千面原生制作状态文本
- `progress_status`：千面原生制作状态码
- `duration`：预估总时长（秒）

---

## 🚀 并发生成 (multigen)

```json
{
  "model": "gpt-image-1.5",
  "payload": {
    "prompt": "一只猫",
    "multigen": 4
  }
}
```

> 默认 `multigen` 值为 2-4，需要 `MULTIGEN` 权限；Tripo 仅支持 1-2，`1` 等同普通单次，`2` 需要 `MULTIGEN` 权限并返回两个 `task_id`。

---

## 📋 模型注册表 (Model Registry)

动态获取所有可用模型、参数和 UI 规则。调用方可用该接口构建参数面板。

```
GET /ai/babylon/registry/models           → 完整注册表（可选 ?category=image 筛选）
GET /ai/babylon/registry/version          → 仅版本号（用于缓存失效）
```

**`/registry/models` 响应结构**：

```json
{
  "version": "2026-04-10-a",
  "categories": [
    {
      "id": "image",
      "name": "图像生成",
      "recommended": "gemini-3.1-flash-image-preview",
      "models": [
        {
          "id": "gemini-3.1-flash-image-preview",
          "name": "Banana 2",
          "permission": "imageGen",
          "params": [
            {"key": "aspect_ratio", "label": "宽高比", "ui_type": "chips", "default": "1:1", "options": [...]}
          ],
          "rules": [...]
        }
      ]
    }
  ]
}
```

**ParamSchema.ui_type 枚举**：`select` / `chips` / `switch` / `slider` / `vertical-slider` / `input` / `custom`

> 调用方可先请求 `/registry/version`，与本地缓存的 `version` 比对，不一致时再拉取完整 `/registry/models`。

---

## 🤖 Agent 智能编排

### Agent Dock（`POST /ai/babylon/agent/dock`）

Agent 模式的统一入口，请求格式与 `POST /ai/babylon/dock` 完全相同（JSON / multipart），并会触发意图分类 → 提示词优化 → 参数推断 → 模型选择 → 多步编排。

**Agent 专属 payload 参数**：

| 参数 | 说明 |
|------|------|
| `smart_level` | `"normal"`（默认，标准编排）/ `"advanced"`（增加质量门控，不满意自动重试） |

**响应**：`text/event-stream`（SSE 流）

**单步模式 SSE 事件**：

```
data: {"type": "status", "message": "正在分析意图..."}
data: {"type": "reasoning", "steps": ["意图: 生图", "模型: Banana 2", "用于生成的提示词: ..."]}
data: {"type": "stream_start"}
... (生成结果事件)
data: {"type": "done"}
```

**多步 Pipeline SSE 事件**（Named Events）：

| 事件名 | data 字段 | 说明 |
|--------|----------|------|
| `pipeline_start` | `pipeline_id`, `total_steps`, `steps_summary` | Pipeline 开始 |
| `step_reasoning` | `pipeline_id`, `step`, `total`, `intent_type`, `reasoning` | 某步推理过程 |
| `step_result` | `pipeline_id`, `step`, `total`, `intent_type`, `success`, `result` | 某步执行完成 |
| `step_error` | `pipeline_id`, `step`, `total`, `intent_type`, `error` | 某步执行失败 |
| `pipeline_done` | `pipeline_id`, `total_steps`, `success`, `latency_ms` | Pipeline 结束 |

### Agent 个性化思考提示

用户可设置个性化指导，影响 Agent 优化生图提示词时的风格偏好（不影响意图分类），保存在云端。

```
GET  /ai/babylon/chat/me/agent-thinking-prompt   → {"success": true, "prompt": "..."}
PUT  /ai/babylon/chat/me/agent-thinking-prompt   → body: {"prompt": "偏好写实风格..."}（最多 8000 字符）
```

### Agent Personas（用户 Agent 配置）

前端 `=` 命令面板用的用户 Agent 列表（摘要，不含 `system_prompt`）。JWT + `llm` 权限。

```
GET    /ai/babylon/chat/agent-personas              → ?capability=image_generate（可选筛选 applies_to）
POST   /ai/babylon/chat/agent-personas              → body: {name, system_prompt, description?, applies_to?, enabled_skills?, ...}
DELETE /ai/babylon/chat/agent-personas/{persona_id} → persona_id: 数字 id 或 user-sauce:<id>
```

- 创建响应：`{success, persona}`；列表响应：`{success, personas}`（失败时 personas 为空数组，HTTP 200）
- 删除响应：`{success: true, source_sauce_id}`；仅用户自建的 Agent Persona 可删（`400` 非自建/`404` 不存在）

### 个人用量统计

```
GET /ai/babylon/analytics/me/usage?days=30
```

- 认证：JWT + `llm` 权限
- `days`：1–365，默认 30
- 响应：`totals`（message_count / tokens / cost_usd / today_*）、`by_model`、`by_task_type`、`daily_trend`
- DB Center 失败时返回空汇总，HTTP 200

### 回复点赞 / 点踩

```
POST /ai/babylon/analytics/feedback
```

Body: `{ "chat_id": "...", "message_id": 456, "vote": 1 }` — `vote`: `1` 赞 / `-1` 踩 / `0` 清除。也可用 `client_message_id` 代替 `message_id`。

- 认证：JWT + `llm` 权限；仅能反馈本人会话消息
- 响应：`{ ok, vote, message_id, deleted }`
- 后台：更新 `personal_preference_md` + 写入 `agent_experiences`（feedback 来源）

---

## 💬 聊天历史与文件夹

### 文件夹管理

> `/ai/babylon/channels` 与 `channel_id` 为过渡兼容别名，等价于 `folders` / `folder_id`。

```
GET    /ai/babylon/folders                          → 文件夹列表
POST   /ai/babylon/folders                          → 创建文件夹（body: {name, emoji?}）
PATCH  /ai/babylon/folders/{folder_id}              → 更新文件夹
DELETE /ai/babylon/folders/{folder_id}              → 软删除（移入回收站）
PATCH  /ai/babylon/folders/reorder                  → 排序（body: {folders: [{id, order}, ...]}）
GET    /ai/babylon/folders/trash                     → 回收站列表
POST   /ai/babylon/folders/{folder_id}/restore       → 恢复文件夹
DELETE /ai/babylon/folders/{folder_id}/permanent    → 永久删除
```

### 会话管理

```
GET    /ai/babylon/chat/sessions                     → 会话列表（?limit=30&offset=0&folder_id=xxx）
POST   /ai/babylon/chat/sessions                     → 创建会话（body: {folder_id?}）
GET    /ai/babylon/chat/sessions/{chat_id}            → 会话详情
PATCH  /ai/babylon/chat/sessions/{chat_id}            → 更新会话（body: {title?}）
DELETE /ai/babylon/chat/sessions/{chat_id}            → 删除会话（?hard_delete=false）
```

### 消息管理

```
GET    /ai/babylon/chat/sessions/{chat_id}/messages   → 消息列表（?limit=100&offset=0）
POST   /ai/babylon/chat/messages                      → 保存消息（body: {chat_id, role, content, content_type?}）
```

---

## 📤 文件上传（独立接口）

先上传拿 URL，再写入 dock / agent-dock 的 `image` / `images` / `video` / `mesh` 等字段。与 dock multipart 二选一即可，不必重复上传。

```bash
curl -X POST https://babylon.garenanow.com/ai/babylon/files/upload \
  -H "Authorization: Bearer <token>" \
  -F "files=@/path/to/image.png"
```

| 项 | 说明 |
|----|------|
| 表单字段 | **`files`**（可多个同名 `-F "files=@..."`） |
| 权限 | `imageGen` |
| 单文件上限 | 100 MB |
| 返回 | `files[].url` 为 `/resources/uploads/...`（生产环境可能带 `expires` / `signature` 查询参数） |

删除未使用的上传文件：`DELETE /ai/babylon/files/delete`，body `{"url": "<uploads url>"}`。

支持类型与限制详见人类版文档「七、文件上传」；Tripo `mesh` 等字段须使用本接口或 dock multipart 得到的 **Babylon uploads URL**，不支持外网直链。

---

## 📡 其他接口

| 接口 | 说明 |
|------|------|
| `POST /ai/babylon/dock/cancel` | 取消任务（`task_id` / `chat_id` / `cancel_all`） |
| `GET /ai/babylon/dock/tasks` | 获取当前活动任务列表 |
| `GET /ai/babylon/dock/task/{task_id}` | 查询任务状态（需 `backend` 参数） |
| `GET /resources/output/**` | 访问 AI 生成的文件（图片 / 视频 / 3D 模型） |
| `GET /resources/uploads/**` | 访问用户上传的文件 |
| `GET /ai/babylon/resources/**` | 同 `/resources/**`（代理兼容路径） |

---

## ⚠️ 权限要求

| 权限标识 | 适用功能 |
|---------|---------|
| `llm` | 所有聊天模型 |
| `imageGen` | 图像生成、图像工具（enhance/rmbg） |
| `KLING` | 可灵 / Seedance 视频生成（Seedance 暂与 KLING 共用权限） |
| `TRIPO` | Tripo 3D 生成 |
| `HUNYUAN` | 混元 3D 生成（含 hy3d-3） |
| `MULTIGEN` | 并发多图生成（`multigen` 参数） |

> `rmbg` 只需认证（无需 `imageGen` 权限）；

---

## 🚫 常见错误处理

| 错误 | 原因 | 处理 |
|------|------|------|
| `401` | Token 无效或过期 | 提示用户重新登录 |
| `403` | 无对应权限 | 提示用户申请权限 |
| `400` | 参数错误 | 检查必填参数和格式 |
| `410` | 接口已弃用（hy3d 旧版） | 改用 `hunyuan-3d` |
| `500` | 服务内部错误 | 稍后重试 |
| `503` | AI 服务不可用 | 稍后重试 |

---

## 💡 调用建议

1. **通用聊天可用 `gpt-5.5` 或 `claude-sonnet-4-6`**；需要更强推理时显式传 `reasoning_effort: "high"` 等档位
2. **图像生成**：最强用 `gpt-image-2`（GPT 2，支持 2K/4K），高质量基线用 `gpt-image-1.5`（GPT 1.5），Banana Pro（`gemini-3-pro-image-preview`）风格多样，Banana 2（`gemini-3.1-flash-image-preview`）速度快
3. **视频生成**：标准用 `kling-v3-0`（Kling V3），多图/主体参考用 `kling-v3-omni`（Kling O3）
4. **3D 生成**：精度优先用 `tripo`，速度优先用 `hunyuan-3d`
5. **异步任务轮询**：建议间隔 **10 秒**；Kling 最多 60 次（10 分钟），Omni/混元 最多 150 次（25 分钟），千面/Seedance/QuickMagic 等最多 120 次（20 分钟），Tripo 最多 200 次（约 33 分钟）
6. **图片传递**：生成结果优先用返回 URL；**用户对话附件**优先 multipart 或 base64 提交，勿要求用户手动拷盘；仅复用历史产物时用已有 URL
7. **始终传 `chat_id`**：确保生成历史正确保存到会话
8. **模型名不区分大小写**：路由时自动归一化（`_` → `-`，转小写）
