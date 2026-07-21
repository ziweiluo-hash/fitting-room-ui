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
