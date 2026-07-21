const BABYLON_URL = "https://babylon.garenanow.com/ai/babylon/dock";
const BABYLON_HOST = "https://babylon.garenanow.com";
const MAX_REFERENCE_IMAGE_BYTES = 20 * 1024 * 1024;
const REFERENCE_IMAGE_LIMIT = 5;

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  let requestId = "";
  try {
    const body = parseBody(request.body);
    requestId = String(body.requestId || "").slice(0, 120);
    const token = process.env.BABYLON_JWT_TOKEN || process.env.BABYLON_TOKEN || process.env.JWT_TOKEN;
    if (!token) {
      return response.status(501).json({ error: "BABYLON_JWT_TOKEN is not configured.", requestId });
    }

    const model = body.model || process.env.BABYLON_IMAGE_MODEL || "gpt-image-2";
    const prompt = buildPrompt(body);
    const referenceImages = await prepareReferenceImagesForBabylon(body.referenceImages, token);
    const canvasSpec = normalizeCanvasSpec(body);
    const result = await callBabylonImage({ token, model, prompt, referenceImages, canvasSpec });

    response.setHeader("Cache-Control", "no-store");
    return response.status(200).json({
      provider: "babylon",
      requestId,
      model,
      prompt,
      imageUrl: result.images[0] || "",
      images: result.images,
      files: result.files,
      durationMs: result.durationMs,
      rawKeys: result.rawKeys
    });
  } catch (error) {
    return response.status(500).json({
      error: error.message,
      requestId,
      code: error.code || "BABYLON_IMAGE_ERROR",
      message: error.message,
      model: error.model || "",
      durationMs: error.durationMs || 0,
      rawStatus: error.rawStatus || ""
    });
  }
};

async function callBabylonImage({ token, model, prompt, referenceImages, canvasSpec = normalizeCanvasSpec({}) }) {
  const startedAt = Date.now();
  const payload = {
    prompt,
    n: 1,
    chat_id: `game_ux_board_design_${Date.now()}`,
    extra_metadata: {
      prompt,
      source: "game_ux_board_design_draft"
    }
  };

  if (referenceImages.length) {
    payload.images = referenceImages;
  }

  if (model.startsWith("gpt-image")) {
    payload.size = canvasSpec.size;
    payload.quality = "high";
  } else {
    payload.aspect_ratio = canvasSpec.aspectRatio;
    payload.resolution = "2K";
  }

  let babylonResponse;
  try {
    babylonResponse = await fetch(BABYLON_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-Client-Type": "game_ux_board"
      },
      body: JSON.stringify({
        model,
        payload
      })
    });
  } catch (error) {
    throw createBabylonImageError(`Babylon image request failed: ${error.message || error}`, "BABYLON_NETWORK_ERROR", model, Date.now() - startedAt, "network");
  }

  const text = await babylonResponse.text();
  const data = safeJsonParse(text) || {};
  if (!babylonResponse.ok) {
    throw createBabylonImageError(
      extractErrorMessage(data) || `Babylon image request failed: ${babylonResponse.status}`,
      "BABYLON_HTTP_ERROR",
      model,
      Date.now() - startedAt,
      String(babylonResponse.status)
    );
  }

  const files = extractFiles(data);
  const imageStrings = extractImageStrings(data).map(toAbsoluteBabylonUrl);
  const images = unique([
    ...files.map((file) => toAbsoluteBabylonUrl(file.url)).filter(Boolean),
    ...imageStrings
  ]).filter(Boolean);

  if (!images.length) {
    throw createBabylonImageError("Babylon returned no image file.", "BABYLON_NO_IMAGE", model, Date.now() - startedAt, "no_image");
  }

  return {
    files,
    images,
    durationMs: Date.now() - startedAt,
    rawKeys: Object.keys(data)
  };
}

function createBabylonImageError(message, code, model, durationMs, rawStatus) {
  const error = new Error(message);
  error.code = code;
  error.model = model;
  error.durationMs = durationMs;
  error.rawStatus = rawStatus;
  return error;
}

function formatDesignCompositionForBackend(analysis) {
  if (!analysis || typeof analysis !== "object") return "";
  const pick = {
    screenGoal: analysis.screenGoal || analysis.goal || "",
    requiredComponents: analysis.requiredComponents || analysis.required || [],
    optionalComponents: analysis.optionalComponents || analysis.optional || [],
    forbiddenComponents: analysis.forbiddenComponents || analysis.forbidden || [],
    layoutSlots: analysis.layoutSlots || analysis.regions || analysis.layout || [],
    primaryActions: analysis.primaryActions || analysis.actions || [],
    stateWidgets: analysis.stateWidgets || analysis.states || [],
    systemEntrances: analysis.systemEntrances || analysis.entryPoints || [],
    persistentAnchors: analysis.persistentAnchors || analysis.anchorComponents || analysis.fixedAnchors || [],
    titlePolicy: analysis.titlePolicy || analysis.headerPolicy || analysis.titleRule || "",
    anchorExceptions: analysis.anchorExceptions || analysis.specialCases || analysis.exceptionRules || [],
    resourceBarPolicy: analysis.resourceBarPolicy || analysis.resourcePolicy || "",
    negativePromptRules: analysis.negativePromptRules || analysis.negativeRules || []
  };
  return JSON.stringify(pick, null, 2).slice(0, 5000);
}

function buildPrompt(body) {
  const projectName = body.projectName || "未命名小游戏";
  const screenName = body.screen?.name || "目标界面";
  const screenKind = body.screen?.kind || "generic";
  const prompt = body.prompt || "";
  const styleTransferKeywords = body.styleTransferKeywords || "";
  const canvasSpec = normalizeCanvasSpec(body);
  const designComposition = formatDesignCompositionForBackend(body.designComposition);
  const uiRequiredComponents = Array.isArray(body.uiRequiredComponents) ? body.uiRequiredComponents : [];
  const projectAnchorPolicy = Array.isArray(body.projectAnchorPolicy) ? body.projectAnchorPolicy : [];
  const uiAssetBoardSectionSpec = String(body.uiAssetBoardSectionSpec || "").trim();
  const mode = body.mode === "ui-asset-sheet" ? "total-asset-ui" : body.mode;

  if (mode === "interaction-visual") {
    return [
      "你是资深游戏 UX 交互设计师。请生成一张专业、克制、中性的交互设计方案图。",
      `项目：${projectName}`,
      `界面：${screenName}`,
      `界面类型：${screenKind}`,
      `画布规格：${canvasSpec.promptText}`,
      prompt,
      `输出要求：只生成一张 ${canvasSpec.aspectRatio} 专业交互设计图；重点是信息架构、界面结构、按钮层级、状态反馈、流程箭头和编号标注；不要生成最终美术视觉稿、角色插画、场景插画、宣传海报或策划案未出现的玩法系统；文本使用中文并保持短句可读。`
    ].filter(Boolean).join("\n");
  }

  if (mode === "component-addition") {
    return [
      "You are editing an existing game UI design draft by regenerating it with minimal visual changes.",
      `Project: ${projectName}`,
      `Screen: ${screenName}`,
      `Screen type: ${screenKind}`,
      `Canvas: ${canvasSpec.promptText}`,
      "Reference image order: image 1 is the current complete interface draft; image 2 is the project UI control asset sheet. Additional images, if any, are only background or character style references.",
      prompt,
      "Hard constraints:",
      "1. Preserve the original interface composition, background, character art, panels, lists, ranking content, task content, title treatment, color balance and existing text as much as possible.",
      "2. Add only the user-specified missing component or components. Do not add unrelated navigation, resources, popups, characters, rewards, tasks or business entries.",
      "3. Derive the new component's visual language from the UI control asset sheet: material, stroke width, border layers, corner radius, icon rendering, shadow, highlight and state language.",
      "3a. If the exact requested component is absent from the UI asset sheet, extrapolate it only from observed similar buttons, icon plates, badges, panel borders, corner treatment and lighting in the UI asset sheet. Do not fall back to generic controls.",
      "4. Place the component in the most conventional safe area for its function, for example close/back in a top corner and confirm/claim near the related action region.",
      "5. Do not use generic web buttons, modern flat app controls, unreadable random text, copied reference logos, copied characters, or changed gameplay layout."
    ].filter(Boolean).join("\n");
  }

  if (mode === "screen-draft-edit") {
    const referenceCount = Array.isArray(body.referenceImages) ? body.referenceImages.length : 0;
    const operationCount = Array.isArray(body.operations) ? body.operations.length : 0;
    return [
      "You are editing an existing game UI design draft by regenerating it with minimal visual changes.",
      `Project: ${projectName}`,
      `Screen: ${screenName}`,
      `Screen type: ${screenKind}`,
      `Canvas: ${canvasSpec.promptText}`,
      referenceCount > 1
        ? "Reference image order: image 1 is the current complete interface draft; image 2 is the project UI control asset sheet."
        : "Reference image order: image 1 is the current complete interface draft.",
      operationCount ? `Composite edit count: ${operationCount}. Treat every listed operation as required in a single result.` : "",
      prompt,
      "Hard constraints:",
      "1. Preserve the original interface composition, background, character art, panels, lists, title treatment, color balance, resource bars and existing text as much as possible.",
      "2. Modify only the listed target rectangles and the smallest necessary feathered edge area around each of them.",
      "3. For deletion, remove only one independent UI control inside the target rectangle: the centered, largest, or most visually prominent control. If the rectangle contains multiple controls, do not remove adjacent buttons, titles, borders, characters, resource bars, primary action buttons, or anything outside the target.",
      "3a. For deletion, reconstruct only the pixels originally covered by the removed control. Do not expand the repaint area, do not redesign the corner, and do not change nearby layout or text.",
      "4. For repair, only fill the local gap or damaged edge by extending surrounding panel, border, backing, stroke, material and lighting. Do not invent new controls, text or decorations.",
      "5. For replacement or addition, use the selected source rectangle from the UI asset sheet only as the component style reference: material, stroke width, border layers, corner radius, icon rendering, shadow, highlight and state language.",
      "6. The edited result must be one complete game UI screen with seamless integration: no sticker edges, mask seams, smudges, duplicate controls, random text, copied asset-sheet labels or unrelated new entries."
    ].filter(Boolean).join("\n");
  }

  if (mode === "total-asset-ui") {
    return [
      prompt,
      "Backend guardrail: use attached reference images and the prompt's detailed style analysis; do not add duplicated backend reference JSON.",
      "Generate only reusable transparent-background UI controls, not a complete screen.",
      "Keep the fixed A-H asset-board grouping and tiny English labels from the prompt.",
      "Do not copy reference logos, words, exact characters, original scene layout, or proprietary symbols."
    ].filter(Boolean).join("\n");

    return [
      "你是资深游戏 UI 设计系统美术指导。请生成一张项目级 UI控件资产图，不是完整游戏界面。",
      `项目：${projectName}`,
      styleTransferKeywords ? `锁定画风迁移关键词：${styleTransferKeywords}` : "",
      `画布规格：${canvasSpec.promptText}`,
      prompt,
      "This total-asset UI request uses a fixed universal game UI control taxonomy. Do not treat the interaction plan as a hard-minimum component checklist at this stage.",
      uiRequiredComponents.length ? `Universal UI control taxonomy aliases for later baseline extraction, not interaction-plan hard minimum: ${JSON.stringify(uiRequiredComponents).slice(0, 2400)}` : "",
      projectAnchorPolicy.length ? `Optional later-screen anchor hints, not required total-asset coverage: ${JSON.stringify(projectAnchorPolicy).slice(0, 1600)}` : "",
      uiAssetBoardSectionSpec ? `Mandatory A-H sectioned universal asset-board layout:\n${uiAssetBoardSectionSpec}` : "",
      "Use transparent background. Each control must have a tiny English asset-identification label in the exact format `Control Name - function label`; examples: `Back Button - go back`, `Close Button - dismiss modal`, `Primary Button - main action`, `Claim Button - collect reward`, `Resource Token - show currency`, `Progress Bar - show progress`, `Item Slot - hold item icon`, `Toast - temporary feedback`. Later normal screens must not copy those labels.",
      "Style fidelity is the first priority: match the attached reference images' dominant palette ratio, color temperature, panel silhouette, line weight, stroke layering, material/noise texture, glow/shadow system, icon language, information density, ornament rhythm, and point-line-plane balance before applying project theme.",
      "The UI asset sheet defines reusable style, material, stroke, corner radius, shadow, highlight, icon rendering and state language only. Concrete screen functions are decided later when normal screen generation reads the current interaction section.",
      "Do not drift into generic blue sci-fi UI, generic metallic fantasy UI, default rounded web cards, cream pet-simulator UI, modern flat app UI, or any unrelated asset-sheet style unless those exact traits are visible in the references.",
      "生成内容：透明背景 PNG 风格资产板；覆盖 A-H 通用控件族：导航与关闭、按钮控件、容器与面板、标签与导航组、资源与状态、物品与角色信息、输入与提示、图标基础件，以及 default、pressed、selected、disabled、locked、reward 状态。",
      "功能来源边界：本阶段控件种类由固定 A-H 通用控件族决定；策划案/交互案只在后续普通界面生图时决定具体页面需要哪些控件。参考图只决定同类型或近似控件的画风迁移，不决定业务入口。",
      "参考图贴合硬约束：强贴参考图的色彩比例、面板轮廓、按钮材质、按钮圆角比例、角部结构、描边厚度、字体气质、装饰节奏、光影和点线面比例。",
      "资产规则：按钮、面板、道具格必须无文字，保留文字区域和数字区域；面板需要适合 9-slice 拉伸；同类资产保持一致尺寸比例和边框厚度。",
      "禁止：不要生成完整页面、角色立绘、背景插画、宣传海报、Figma 工作区；不要复制参考图 Logo、文字、角色、IP 符号、原资源图标或原始布局；不要退化成通用金色 UI、默认圆角网页卡片、现代扁平 App UI 或与参考图无关的奶油宠物模拟器风格。"
    ].filter(Boolean).join("\n");
  }

  if (mode === "total-asset-background") {
    return [
      prompt,
      "Backend guardrail: use attached reference images and the prompt's detailed style analysis; do not add duplicated backend reference JSON.",
      "Generate only a project-level background style board, not a UI screen.",
      "No buttons, menus, UI widgets, text, logos, or full gameplay layout.",
      "Do not copy the reference scene composition, exact characters, words, logos, or proprietary symbols."
    ].filter(Boolean).join("\n");

    return [
      "你是资深游戏场景美术指导。请生成一张项目级背景设定图，不是完整 UI 界面。",
      `项目：${projectName}`,
      styleTransferKeywords ? `锁定画风迁移关键词：${styleTransferKeywords}` : "",
      `画布规格：${canvasSpec.promptText}`,
      prompt,
      "生成内容：不带 UI 的背景风格板；根据策划案和交互案指定的新场景生成，不复制参考图场景。",
      "背景规则：必须体现前景、中景、远景、透视、材质、光源、虚实关系、UI 安全区和角色站位；背景饱和度、对比和光效不得抢 UI 或角色焦点。",
      "参考图贴合硬约束：只迁移参考图的画风、材质、色彩、光影、装饰符号和复杂度；不得迁移参考图原场景、文字、Logo、角色或专有符号。",
      "禁止：不要生成按钮、菜单、资源栏、文字、乱码、完整界面结构或玩法截图；不要生成照片感背景、通用素材库背景或与参考图光源/色彩不一致的场景。"
    ].filter(Boolean).join("\n");
  }

  if (mode === "total-asset-character") {
    return [
      prompt,
      "Backend guardrail: use attached reference images and the prompt's detailed style analysis; do not add duplicated backend reference JSON.",
      "Generate only a transparent-background character / pet / NPC style board, not a complete screen.",
      "No UI menus, buttons, background scene, text, logos, or Figma/workspace elements.",
      "Do not copy the reference character, exact outfit, pose composition, IP marks, weapons, badges, or proprietary symbols."
    ].filter(Boolean).join("\n");

    return [
      "你是资深游戏角色美术指导。请生成一张项目级角色设定图，不是完整 UI 界面。",
      `项目：${projectName}`,
      styleTransferKeywords ? `锁定画风迁移关键词：${styleTransferKeywords}` : "",
      `画布规格：${canvasSpec.promptText}`,
      prompt,
      "生成内容：透明背景角色/宠物/NPC 风格板；按策划案主题生成全新角色资产方向，可包含头像、半身、全身、表情或姿态变体。",
      "角色规则：比例、脸部、轮廓、发型/毛发、服装/外观结构、材质、描边、渲染方式、姿态和特效必须与 UI 和背景共享同一套色彩、光源、材质和装饰符号。",
      "参考图贴合硬约束：只迁移参考图的角色画风和渲染语言，不复制参考图具体角色、服装、IP 符号、武器、徽章或独特剪影。",
      "禁止：不要生成写实风偏移、照片感角色、随机文字、Logo、UI 菜单、背景场景或完整玩法截图。"
    ].filter(Boolean).join("\n");
  }

  return [
    "你是资深游戏 UI 视觉设计师。请根据策划案和交互设计稿生成一张可用于汇报的中高保真游戏界面视觉稿。",
    `项目：${projectName}`,
    `界面：${screenName}`,
    `界面类型：${screenKind}`,
    `画布规格：${canvasSpec.promptText}`,
    designComposition ? `当前界面组件裁剪分析（必须优先遵守）：\n${designComposition}` : "",
    styleTransferKeywords ? `参考图画风迁移关键词：${styleTransferKeywords}` : "",
    prompt,
    designComposition
      ? "组件硬约束：只绘制组件裁剪分析中 requiredComponents 和当前目标必要的 optionalComponents；forbiddenComponents、negativePromptRules、resourceBarPolicy 禁止的按钮、入口、资源栏、图标和系统功能不得出现。"
      : "组件硬约束：没有组件裁剪分析时，也只能依据当前界面的策划案和交互案放置组件，不要套用通用手游按钮模板。",
    "总资产使用规则：如果参考图包含项目级总资产，它只提供控件、背景、角色的对应画风基准，不是当前界面的组件清单；不得把总资产里的全部按钮、导航图标、入口图标或角色复制到当前界面。",
    "画风迁移规则：参考图只用于迁移色彩、材质、线条、UI 质感、角色风格、背景风格、光影和信息密度；不要复制参考图中的具体文字、角色、商品、场景或原始布局。",
    `输出要求：只生成完整 ${canvasSpec.aspectRatio} 游戏 UI 画面；不要生成说明文字、标注稿、网格稿、Figma 面板或多张拼图；不要把交互标注放进界面内；界面只保留当前组件裁剪分析或当前界面文档允许的按钮、导航、状态反馈、资源栏和主要内容区。`
  ].filter(Boolean).join("\n");
}

function parseBody(body) {
  if (!body) return {};
  if (typeof body === "string") return safeJsonParse(body) || {};
  return body;
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

function normalizeReferenceImages(images) {
  if (!Array.isArray(images)) return [];
  return images
    .filter((item) => typeof item === "string")
    .filter((item) => item.startsWith("data:image/") || /^https?:\/\//.test(item))
    .slice(0, REFERENCE_IMAGE_LIMIT);
}

async function prepareReferenceImagesForBabylon(images, token) {
  const result = [];
  for (const image of normalizeReferenceImages(images)) {
    if (image.startsWith("data:image/")) {
      result.push(image);
    } else if (isTrustedBabylonResourceUrl(image)) {
      result.push(image);
    }
    if (result.length >= REFERENCE_IMAGE_LIMIT) break;
  }
  return result;
}

function isTrustedBabylonResourceUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:"
      && parsed.hostname === "babylon.garenanow.com"
      && (parsed.pathname.startsWith("/resources/") || parsed.pathname.startsWith("/ai/babylon/resources/"));
  } catch (error) {
    return false;
  }
}

async function fetchImageAsDataUrl(url, token) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "game-ux-board/1.0"
    }
  });
  if (!response.ok) {
    throw new Error(`参考图无法转为可用参考图：${response.status}`);
  }
  const contentType = (response.headers.get("content-type") || "").split(";", 1)[0].trim().toLowerCase();
  if (!contentType.startsWith("image/")) {
    throw new Error(`参考图链接返回的不是图片数据：${contentType || "unknown"}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) {
    throw new Error("参考图为空");
  }
  if (buffer.length > MAX_REFERENCE_IMAGE_BYTES) {
    throw new Error("参考图超过 20MB，无法作为生图参考");
  }
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

function normalizeCanvasSpec(body = {}) {
  const rawAspect = String(body.aspectRatio || body.aspect_ratio || "");
  const platform = String(body.platform || "");
  const portrait = rawAspect.includes("9:16")
    || platform.includes("9:16")
    || platform.includes("竖")
    || platform.toLowerCase().includes("portrait");
  const aspectRatio = portrait ? "9:16" : "16:9";
  const figmaSize = portrait ? "1080x1920" : "1920x1080";
  const safeSize = portrait ? "1008x1792" : "1792x1008";
  const size = normalizeImageGenerationSize(body.size, safeSize);
  return {
    aspectRatio,
    figmaSize,
    generationSize: size,
    size,
    promptText: portrait
      ? "竖版 9:16，Figma 基准 1080 x 1920，实际生图 1008 x 1792"
      : "横版 16:9，Figma 基准 1920 x 1080，实际生图 1792 x 1008"
  };
}

function normalizeImageGenerationSize(rawSize, fallbackSize) {
  const value = String(rawSize || "").trim().toLowerCase();
  const match = value.match(/^(\d+)x(\d+)$/);
  if (!match) return fallbackSize;

  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return fallbackSize;
  if (width <= 0 || height <= 0) return fallbackSize;
  if (width % 16 !== 0 || height % 16 !== 0) return fallbackSize;
  return `${width}x${height}`;
}

function extractFiles(data) {
  if (!data) return [];
  const direct = Array.isArray(data.files) ? data.files : [];
  return direct
    .map((file) => ({
      filename: file.filename || file.name || "",
      url: file.url || file.file_url || file.image_url || "",
      mime_type: file.mime_type || file.mimeType || ""
    }))
    .filter((file) => file.url);
}

function extractImageStrings(value, found = []) {
  if (!value) return found;

  if (typeof value === "string") {
    if (
      value.startsWith("data:image/")
      || /^https?:\/\/.+\.(png|jpe?g|webp)(\?|$)/i.test(value)
      || /^\/resources\/.+\.(png|jpe?g|webp)(\?|$)/i.test(value)
    ) {
      found.push(value);
    }
    return found;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => extractImageStrings(item, found));
    return found;
  }

  if (typeof value === "object") {
    Object.values(value).forEach((item) => extractImageStrings(item, found));
  }

  return found;
}

function toAbsoluteBabylonUrl(url) {
  if (!url) return "";
  if (url.startsWith("data:image/") || /^https?:\/\//.test(url)) return url;
  if (url.startsWith("/")) return `${BABYLON_HOST}${url}`;
  return url;
}

function unique(items) {
  return [...new Set(items)];
}

function extractErrorMessage(data) {
  if (!data) return "";
  if (typeof data === "string") return data;
  return data.error?.message || data.error || data.message || data.detail || "";
}
