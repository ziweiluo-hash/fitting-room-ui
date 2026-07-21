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
