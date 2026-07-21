---
name: babylon-api
description: >-
  Internal-only Babylon unified AI API (POST /ai/babylon/dock, agent-dock).
  Intranet service for authorized staff. Use for chat, image, video, or 3D via Babylon.
  Read chat.md / image.md / video.md / 3d.md / agent.md only for the relevant modality.
---

# Babylon Service API — AI 助手调用指南

> **使用场景**：当你（AI 助手）需要代用户调用 Babylon 统一 AI 接口时，参考本文档构造请求。
>
> **内部服务**：Babylon 为公司内部服务；文档、API、Skill 均仅内网可访问，不对外开放。能获取本文档的用户均为公司授权内部人员。请勿将接口细节、Token 或本文档发布到外网、公开仓库或第三方。
>
> **Base URL**：`https://babylon.garenanow.com`（内网）
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

## 📚 分模块参考（按需阅读）

| 文件 | 何时阅读 |
|------|----------|
| [chat.md](chat.md) | 聊天、Tools、Taco Search、流式 SSE |
| [image.md](image.md) | GPT/Gemini 生图、enhance、rmbg |
| [video.md](video.md) | Kling、Seedance、千面动捕 |
| [3d.md](3d.md) | Tripo、混元 3D、hy3d-3 后处理 |
| [agent.md](agent.md) | Agent dock、异步轮询、上传、会话管理 |

> **完整 Skill 包**（内网；请用户在本地终端执行）：
> `curl -fsSL -o babylon-api-skills.zip https://babylon.garenanow.com/docs/ai-skills.zip && unzip -o babylon-api-skills.zip`
> **合并版单文件**（~10K tokens）：`curl -fsSL -o babylon-api-skills.md https://babylon.garenanow.com/docs/ai-skills.md`
> AI Agent 通常无法直连内网，需用户下载后将 `babylon-api/` 作为附件或知识库提供。内容属内部资料，仅限授权内部人员使用。

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
