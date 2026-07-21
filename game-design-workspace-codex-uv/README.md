# 游戏设计工作台 / Game Design Workspace

游戏设计工作台（Game Design Workspace）是一个本地运行的网页工具，用于把“玩法大纲”逐步扩展成：

1. 专业且详细的游戏策划案。
2. 基于策划案的主要界面交互设计方案。
3. 可导入 Figma 的可视化 SVG 交互稿。
4. 结合策划案、交互结构、画风参考图和关键词生成的界面视觉设计稿。

## 当前流程

```text
输入玩法大纲
→ 选择 Babylon 文本模型生成完整策划案
→ 编辑/确认策划案
→ 选择 Babylon 文本模型生成交互设计案
→ 点击生成可导入 Figma 的 SVG 交互稿
→ 上传多张画风参考图 + 输入生图关键词
→ 选择 Babylon 图像模型生成对应界面设计稿
```

## 支持模型

文本生成模型下拉：

- Kimi K2：`kimi-k2-thinking`（默认，长中文策划案更稳定）
- Gemini 2.5 Pro：`gemini-2.5-pro`
- GPT 5.2：`gpt-5.2`
- GPT 5.4：`gpt-5.4`
- GLM-5：`glm-5`

图像生成模型下拉：

- IMAGE 2：`gpt-image-2`（默认）
- Banana 2.0 NEW：`gemini-3.1-flash-image-preview`
- Banana Pro：`gemini-3-pro-image-preview`
- GPT 1.5：`gpt-image-1.5`

## 本地使用

如果只打开静态页面：

```text
index.html
```

页面可以编辑已有内容，但无法调用 Babylon API 生成策划案、交互案或设计稿。

如果需要调用 Babylon 文本和图像模型，请启动本地服务：

```text
start-local.bat
```

然后打开：

```text
http://localhost:8787
```

本地服务会读取 `.env` 中的 `BABYLON_JWT_TOKEN`，并提供：

- `/api/generate-plan`：生成完整策划案或交互设计案。
- `/api/generate-design`：生成界面视觉设计稿。

## 环境变量

不要把真实 token 写进源码或分享包。请在本地 `.env` 或部署平台环境变量里配置：

```text
BABYLON_JWT_TOKEN=你的 Babylon JWT Token
BABYLON_MODEL=kimi-k2-thinking
BABYLON_IMAGE_MODEL=gpt-image-2
```

`.env` 已加入 `.gitignore`，分享包只包含 `.env.example`。

## 项目结构

```text
game-ux-board/
├─ api/
│  ├─ generate-plan.js    # Babylon 文本代理：策划案 / 交互案
│  └─ generate-design.js  # Babylon 图像代理：设计稿
├─ assets/
│  └─ local-cat.svg       # 本地演示素材，不走 Babylon
├─ index.html             # 页面结构
├─ script.js              # 前端流程、SVG、设计稿逻辑
├─ styles.css             # 轻量画板风格
├─ local-server.py        # 本地 Python 服务
├─ local-server.ps1       # PowerShell 备用服务
├─ start-local.bat        # Windows 一键启动
├─ .env.example
├─ .gitignore
└─ README.md
```

## 注意

- 玩法大纲建议包含：游戏名字、游戏介绍、玩法设计、玩家留存方式、后续拓展。
- 完整策划案生成后可以直接在页面中编辑，再生成交互设计案。
- 设计稿生成会读取完整策划案、交互设计案、当前界面 SVG 结构、画风参考图和关键词。
- 每次设计稿生成只调用当前下拉框选中的一个图像模型，不会三个模型同时生成。
