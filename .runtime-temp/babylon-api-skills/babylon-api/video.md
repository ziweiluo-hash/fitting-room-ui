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
