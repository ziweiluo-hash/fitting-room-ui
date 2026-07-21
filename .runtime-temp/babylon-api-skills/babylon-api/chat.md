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
