const BABYLON_URL = "https://babylon.garenanow.com/ai/babylon/dock";
const OPENAI_URL = "https://api.openai.com/v1/responses";

const DEFAULT_TEXT_MODEL = "kimi-k2-thinking";
const REFERENCE_IMAGE_LIMIT = 2;
const ALLOWED_TEXT_MODELS = new Set([
  "kimi-k2-thinking",
  "gemini-2.5-pro",
  "gpt-5.2",
  "gpt-5.4",
  "glm-5"
]);

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const body = parseBody(request.body);
  const task = normalizeTask(body.task);
  const requestedModel = normalizeTextModel(body.model || getDefaultModelForTask(task) || process.env.BABYLON_MODEL || DEFAULT_TEXT_MODEL);
  const model = requestedModel;
  const instructions = buildInstructions(task);
  const prompt = buildPrompt(task, body);
  const images = task === "style-analysis" || task === "reference-evidence-analysis" || task === "component-baseline-analysis" || task === "ui-asset-analysis" || task === "ui-asset-style-fidelity-check"
    ? normalizeInlineImages(body.referenceImages)
    : [];

  try {
    const babylonToken = process.env.BABYLON_JWT_TOKEN || process.env.BABYLON_TOKEN || process.env.JWT_TOKEN;
    if (babylonToken) {
      const content = await callBabylon({ token: babylonToken, model, instructions, prompt, task, images });
      return response.status(200).json({ provider: "babylon", model, task, content, plan: content });
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      const content = await callOpenAI({ apiKey: openaiKey, model, instructions, prompt, task });
      return response.status(200).json({ provider: "openai", model, task, content, plan: content });
    }

    return response.status(501).json({
      error: "BABYLON_JWT_TOKEN or OPENAI_API_KEY is not configured."
    });
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
};

function normalizeTextModel(model) {
  const value = String(model || "").trim();
  return ALLOWED_TEXT_MODELS.has(value) ? value : DEFAULT_TEXT_MODEL;
}

function getDefaultModelForTask(task) {
  return task === "outline-normalization"
    || task === "outline-normalization-json-repair"
    || task === "style-analysis-json-repair"
    || task === "reference-evidence-analysis"
    || task === "total-asset-analysis"
    || task === "total-asset-json-repair"
    || task === "ui-asset-analysis"
    || task === "ui-asset-json-repair"
    || task === "ui-asset-style-fidelity-check"
    || task === "design-composition-analysis"
    || task === "design-composition-json-repair"
    ? "gpt-5.2"
    : "";
}

function normalizeTask(task) {
  if (task === "outline-normalization") return "outline-normalization";
  if (task === "outline-normalization-json-repair") return "outline-normalization-json-repair";
  if (task === "game-design") return "game-design";
  if (task === "visual-analysis") return "visual-analysis";
  if (task === "style-analysis") return "style-analysis";
  if (task === "style-analysis-json-repair") return "style-analysis-json-repair";
  if (task === "reference-evidence-analysis") return "reference-evidence-analysis";
  if (task === "component-baseline-analysis") return "component-baseline-analysis";
  if (task === "ui-asset-style-fidelity-check") return "ui-asset-style-fidelity-check";
  if (task === "total-asset-analysis") return "total-asset-analysis";
  if (task === "total-asset-json-repair") return "total-asset-json-repair";
  if (task === "ui-asset-analysis") return "ui-asset-analysis";
  if (task === "ui-asset-json-repair") return "ui-asset-json-repair";
  if (task === "design-composition-analysis") return "design-composition-analysis";
  if (task === "design-composition-json-repair") return "design-composition-json-repair";
  return "interaction-design";
}

function normalizeInlineImages(images) {
  if (!Array.isArray(images)) return [];
  return images
    .filter((item) => typeof item === "string")
    .filter((item) => item.startsWith("data:image/") || /^https?:\/\//.test(item))
    .slice(0, REFERENCE_IMAGE_LIMIT);
}

async function callBabylon({ token, model, instructions, prompt, task, images = [] }) {
  const userContent = images.length
    ? [
        { type: "text", text: prompt },
        ...images.map((url) => ({ type: "image_url", image_url: { url } }))
      ]
    : prompt;
  const payload = {
    messages: [
      { role: "system", content: instructions },
      { role: "user", content: userContent }
    ],
    stream: false,
    max_completion_tokens: Number(process.env.BABYLON_MAX_TOKENS || 9000),
    client_type: "game_ux_board",
    extra_metadata: {
      prompt: task === "game-design"
        ? "Generate complete game design document from outline"
        : task === "visual-analysis"
          ? "Analyze editable interaction SVG"
          : task === "style-analysis"
            ? "Analyze style reference keywords"
            : task === "style-analysis-json-repair"
              ? "Repair style analysis JSON"
              : task === "reference-evidence-analysis"
                ? "Extract per-reference style evidence"
            : task === "component-baseline-analysis"
              ? "Analyze UI asset sheet component baselines"
              : task === "ui-asset-style-fidelity-check"
                ? "Check UI asset style fidelity against references"
              : task === "outline-normalization-json-repair"
                ? "Repair normalized outline JSON"
                : task === "total-asset-analysis"
                  ? "Analyze style references for total asset kit"
                  : task === "total-asset-json-repair"
                    ? "Repair total asset analysis JSON"
                    : task === "ui-asset-analysis"
                    ? "Analyze style references for UI asset sheet"
                    : task === "ui-asset-json-repair"
                      ? "Repair UI asset analysis JSON"
                  : task === "design-composition-analysis"
                    ? "Analyze current screen design composition"
                    : task === "design-composition-json-repair"
                      ? "Repair design composition JSON"
                  : "Generate professional game UX interaction design plan"
    }
  };
  if (String(model || "").startsWith("gpt-")) {
    payload.reasoning_effort = process.env.BABYLON_REASONING_EFFORT || "high";
  }

  const babylonResponse = await fetch(BABYLON_URL, {
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

  const text = await babylonResponse.text();
  const data = safeJsonParse(text);

  if (!babylonResponse.ok) {
    const suggestion = model === "gpt-5.4" ? " This is retryable; switch to GPT 5.2 or Kimi K2 and retry." : "";
    throw new Error(`${formatBabylonTextError(data, babylonResponse.status, text)}${suggestion}`);
  }

  const content = extractBabylonText(data || text).trim();
  if (!content) {
    const suggestion = model === "gpt-5.4" ? " Please switch to GPT 5.2 or Kimi K2 and retry." : "";
    throw new Error(`Babylon returned empty content for ${model}.${suggestion}`);
  }
  return content;
}

async function callOpenAI({ apiKey, model, instructions, prompt, task }) {
  const openaiResponse = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      instructions,
      input: [
        {
          role: "user",
          content: [{ type: "input_text", text: prompt }]
        }
      ],
      max_output_tokens: task === "game-design" ? 9000 : 8000
    })
  });

  const data = await openaiResponse.json();
  if (!openaiResponse.ok) {
    throw new Error(data.error?.message || `OpenAI request failed: ${openaiResponse.status}`);
  }

  const content = extractOpenAIText(data).trim();
  if (!content) throw new Error("OpenAI returned empty content.");
  return content;
}

function parseBody(body) {
  if (!body || typeof body !== "string") return body || {};
  try {
    return JSON.parse(body);
  } catch (error) {
    return {};
  }
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

function buildInstructions(task) {
  if (task === "outline-normalization") return buildOutlineNormalizationInstructions();
  if (task === "outline-normalization-json-repair") return buildOutlineNormalizationJsonRepairInstructions();
  if (task === "game-design") return buildGameDesignInstructionsV2();

  if (task === "game-design") {
    return [
      "你是资深游戏策划负责人，擅长把玩法大纲扩写成可用于立项评审、UI/UX 设计和程序协作的正式策划案。",
      "输出必须是中文 Markdown，结构清晰、专业、详细，不输出代码，不输出图片，不写空泛营销文案。",
      "必须补全：游戏定位、目标玩家、核心循环、玩法系统、资源经济、玩家留存、界面清单、MVP 范围、后续拓展。",
      "适合结构化对比的内容请使用 Markdown 表格，例如系统拆分、资源经济、界面清单、留存设计。",
      "如果玩法大纲信息不足，可以基于合理行业假设补全，但要保持和原始玩法方向一致。"
    ].join("\n");
  }

  if (task === "visual-analysis") {
    return [
      "你是资深游戏 UX 交互设计师，负责把游戏策划案和交互设计案转成可编辑 SVG 线框标注所需的结构化内容。",
      "只返回严格 JSON，不要 Markdown，不要代码块，不要解释。",
      "所有界面元素、文案、道具、角色和状态必须来自输入文本或使用中性专业占位，不得编造与策划案无关的内容。",
      "必须优先分析当前界面的交互段落，输出可直接驱动 SVG 线框结构的区域、组件、状态、流程和交付字段。",
      "状态覆盖要完整，但必须结合当前界面的实际职责，不要机械堆砌无关状态。"
    ].join("\n");
  }

  if (task === "style-analysis") {
    return [
      "你是资深游戏美术风格迁移分析师，负责把参考图背后的视觉规则转换成可复用的 UI、背景和角色资产规范。",
      "只返回严格 JSON，不要 Markdown，不要代码块，不要解释。",
      "必须优先观察用户上传的参考图本身，再结合文本摘要；不要只根据本地颜色摘要猜测风格。",
      "策划案和交互案决定功能、玩法、信息结构、交互流程和资产需求；参考图只决定美术风格、材质、颜色、光影、角色风格和背景风格。",
      "如果策划案或交互案中的美术建议与参考图冲突，优先遵循参考图，但不得改变策划案/交互案里的玩法、组件清单或布局结构。",
      "不要复制参考图中的 Logo、文字、角色、专有图案、独特符号、活动名、资源图标或原始布局。",
      "输出必须包含 styleDNA、pointLinePlane、shapeLanguage、colorSystem、materialRules、lightingHierarchy、buttonSpec、panelModalSpec、iconItemResourceSpec、typographySpec、backgroundSpec、characterSpec、unityRules、designTokens、imagePrompts、negativePrompts。",
      "所有描述尽量使用比例、层数、位置、用途、状态变化和可执行参数，不要只写好看、精致、华丽、大圆角等模糊词。",
      "如果某项无法从参考图确认，对应字段返回空数组、空对象或空字符串，不要用默认规则冒充真实参考图分析。"
    ].join("\n");
  }

  if (task === "style-analysis-json-repair") {
    return [
      "你是严格 JSON 修复器，只负责把参考图风格分析模型输出修复为指定 schema 的合法 JSON。",
      "只返回一个 JSON 对象，不要 Markdown，不要代码块，不要解释。",
      "只能保留原始返回中已经表达的参考图风格、点线面、形状、色彩、材质、光影、按钮、面板、图标、字体、背景、角色、统一性、token、prompt 和负向规则；不能凭空编造新的参考图结论。",
      "缺失字段用空对象、空数组或空字符串补齐；如果原文没有对应内容，不要编造默认规则。"
    ].join("\n");
  }

  if (task === "reference-evidence-analysis") {
    return [
      "你是资深游戏美术参考图取证分析师，只分析当前消息附带的单张参考图。",
      "只返回严格 JSON，不要 Markdown，不要代码块，不要解释。",
      "必须输出可被后续总资产分析直接引用的视觉证据：HEX 与比例、材质厚度、描边/边框层数、圆角比例、角饰节奏、点线面比例、光源方向、渲染方式、UI/背景/角色可迁移证据。",
      "只能描述参考图中可见的真实视觉现象；看不清或无法确认就写 missingEvidence，不要用默认规则或策划案美术建议补齐。",
      "不得复制参考图中的 Logo、文字、角色、专有图案、独特符号、活动名、资源图标或原始布局。"
    ].join("\n");
  }

  if (task === "total-asset-analysis") {
    return [
      "你是资深游戏美术风格迁移总资产设计负责人，负责把参考图风格迁移到当前项目的 UI控件资产图、背景设定图、角色设定图。",
      "只返回严格 JSON，不要 Markdown，不要代码块，不要解释。",
      "本阶段不再接收原始参考图；必须只基于 referenceEvidenceSet 和 imageSummaries 中的逐图取证结果综合具体视觉指纹。",
      "如果基础视觉 DNA 证据不足，返回 analysisStatus=insufficient 和 missingEvidence，不要编造、不要兜底、不要继续写可执行生图 prompt。",
      "参考图不必直接出现每一种目标控件；具体控件缺失但同类视觉证据充分时，必须用 styleExtrapolationRules 说明证据驱动补全方式。",
      "策划案和交互案决定做什么资产、组件下限、场景需求、角色需求、玩法结构和交互状态；参考图只决定画风、材质、颜色、光影、形状语言和渲染方式。",
      "不得根据参考图改变界面类型、玩法逻辑、业务入口、信息层级或组件清单。",
      "不得复制参考图中的 Logo、文字、角色、专有图案、独特符号、活动名、资源图标、原始布局或原始场景。",
      "必须为 UI、背景、角色分别输出英文 image prompt，并输出可执行的 negativePrompts。"
    ].join("\n");
  }

  if (task === "total-asset-json-repair") {
    return [
      "你是严格 JSON 修复器，只负责把总资产分析模型输出修复为指定 schema 的合法 JSON。",
      "只返回一个 JSON 对象，不要 Markdown，不要代码块，不要解释。",
      "保留原始返回中已经表达的视觉规则、资产需求、英文 prompts 和 negative prompts；不要新增原文没有表达的参考图观察。",
      "策划案/交互案决定资产需求，参考图只决定画风；修复时不得引入新的玩法、业务入口、角色或资源。"
    ].join("\n");
  }

  if (task === "component-baseline-analysis") {
    return [
      "你是资深游戏 UI 设计系统负责人，负责只从项目级 UI控件资产图中提取可复用的通用控件基准。",
      "只返回严格 JSON，不要 Markdown，不要代码块，不要解释。",
      "附带图片应是 UI控件资产图；不要把普通界面设计稿、业务插画、角色、场景、道具当成跨界面控件基准。",
      "如果提供了 A-H 分区资产板规范，优先按分区位置识别通用控件族，并在 evidence 写清分区证据。",
      "如果某类控件没有出现在图片中，也没有对应分区视觉等价物，不要返回该类型。",
      "规则必须描述可复用的视觉语言：外轮廓、圆角/斜切、描边层数、材质、阴影、发光、高光、字体、图标承载、默认/选中/禁用状态差异。",
      "控件基准只约束通用 UI 语言，不复用具体业务内容、具体文字、IP 角色或原始图案。"
    ].join("\n");
  }

  if (task === "ui-asset-style-fidelity-check") {
    return [
      "你是资深游戏 UI 美术总监，负责判断 UI控件资产图是否贴合参考图画风。",
      "只返回严格 JSON，不要 Markdown，不要代码块，不要解释。",
      "附带图片顺序：第 1 张是生成后的 UI控件资产图；后续图片是原始参考图。",
      "只判断画风贴合，不判断控件清单。重点比较主色比例、色温、面板轮廓、线条粗细、描边层数、材质噪点、发光/阴影、图标语言、信息密度、装饰节奏和点线面比例。",
      "如果 UI资产图退化成通用蓝色科幻、通用金属奇幻、默认圆角网页卡片、奶油宠物 UI，或与参考图主体画风明显不一致，必须 ok=false。",
      "如果无法判断，也必须返回 JSON 且 status=needs_review，不要输出普通文字或 Markdown。",
      "不要因为组件种类不同而判失败；组件种类由交互案决定。只看这些新组件是否用参考图视觉 DNA 外推。"
    ].join("\n");
  }

  if (task === "ui-asset-analysis") {
    return [
      "你是资深游戏 UI 设计系统美术指导，负责把参考图分析为可生成项目级 UI Asset Sheet 的结构化规则。",
      "只返回严格 JSON，不要 Markdown，不要代码块，不要解释。",
      "必须按“关键词 → 配色 → 元素 → 控件需求下限 → 参考图同类型控件风格库 → 按钮形态 → 风格贴合目标 → 风格锁定”的顺序分析参考图，并结合当前策划案和交互案提取替换主题元素。",
      "只迁移视觉语言，不迁移参考图原主题角色、IP、商标、原文字、特定道具、主题货币图案或原游戏符号。",
      "策划案和交互案决定控件需求下限；参考图只提供同类型控件画风迁移，不决定当前项目要出现哪些业务控件。",
      "参考图是 UI 控件视觉语言的强基准，必须提取具体可执行的色彩比例、面板轮廓、按钮材质、按钮圆角比例、角部结构、描边厚度、字体气质、装饰节奏、光影和点线面比例。",
      "不要输出通用 Q版、宠物模拟器奶油拟物、现代网页扁平卡片或泛化卡通资产板，除非参考图本身明确呈现这些特征。",
      "输出必须能直接指导一张干净、可复用、非完整界面的游戏 UI 资产板。"
    ].join("\n");
  }

  if (task === "ui-asset-json-repair") {
    return [
      "你是严格 JSON 修复器，只负责把输入内容改写为指定 schema 的合法 JSON。",
      "只返回一个 JSON 对象，不要 Markdown，不要代码块，不要解释。",
      "不得新增与输入项目无关的玩法、资源、角色或 UI 系统；无法判断的字段返回空数组或空字符串。"
    ].join("\n");
  }

  if (task === "design-composition-analysis") {
    return [
      "你是资深游戏 UE/UI 交互架构师，负责在生成视觉设计稿前裁剪当前界面的组件清单。",
      "只返回严格 JSON，不要 Markdown，不要代码块，不要解释。",
      "完整策划案、交互设计案、当前界面段落、当前界面 SVG/visual-analysis 决定控件需求下限；可补充服务当前页面目标的状态变体和辅助控件，但不允许添加无关系统入口。",
      "UI资产图只决定控件视觉风格，不决定当前界面应该出现哪些按钮或入口。",
      "必须明确 requiredComponents、optionalComponents、forbiddenComponents；禁止把返回、关闭、主页、设置、帮助、邮件、公告、收藏等通用按钮自动放到每个界面。",
      "如果当前界面文档没有要求资源栏、顶部导航或系统入口，必须在 resourceBarPolicy 或 forbiddenComponents 中说明不显示。"
    ].join("\n");
  }

  if (task === "design-composition-json-repair") {
    return [
      "You are a strict JSON repair service for game UI composition analysis.",
      "Return exactly one valid JSON object. Do not return Markdown, code fences, prose, comments, or explanations.",
      "Keep only components supported by the current screen plan, interaction plan, editable SVG/visual analysis, or game design document.",
      "Do not invent unrelated navigation icons, system entrances, resource bars, buttons, or decorative controls.",
      "If a field cannot be recovered, use an empty array or a short empty-safe string, but keep the required schema keys."
    ].join("\n");
  }

  return [
    "你是资深游戏 UX 设计师和 UI 交互设计负责人。",
    "你的任务是根据完整游戏策划案生成专业、可交付、中文的界面交互设计方案。",
    "不要生成视觉图片，不要输出代码，不要写空泛营销文案。",
    "必须输出 Markdown，结构稳定，便于前端继续解析和导出。",
    "必须结合策划案真实类型，不要机械套用 MOBA、RPG 或养成模板。",
    "每个页面都要包含：页面目标、入口来源、布局结构、关键交互、状态反馈、异常状态、按钮层级、关闭/返回方式、Figma 交付建议。",
    "关闭/返回方式必须继承目标界面中的界面关闭方式，写清允许出现的关闭/返回控件、触发条件、返回目标界面和异常处理；不得给所有页面套用同一个返回/关闭按钮。",
    "适合交付的内容请使用 Markdown 表格，例如页面清单、按钮层级、状态规范、程序字段。",
    "页面命名必须优先来自策划案中的目标界面；如果策划案未列清楚，按玩法核心循环推导主要界面。"
  ].join("\n");
}

function buildPrompt(task, body) {
  if (task === "outline-normalization") return buildOutlineNormalizationPrompt(body);
  if (task === "outline-normalization-json-repair") return buildOutlineNormalizationJsonRepairPrompt(body);
  if (task === "game-design") return buildGameDesignPromptV2(body);
  if (task === "visual-analysis") return buildVisualAnalysisPrompt(body);
  if (task === "style-analysis") return buildStyleAnalysisPrompt(body);
  if (task === "style-analysis-json-repair") return buildStyleAnalysisJsonRepairPrompt(body);
  if (task === "reference-evidence-analysis") return buildReferenceEvidenceAnalysisPrompt(body);
  if (task === "component-baseline-analysis") return buildComponentBaselineAnalysisPrompt(body);
  if (task === "ui-asset-style-fidelity-check") return buildUiAssetStyleFidelityCheckPrompt(body);
  if (task === "total-asset-analysis") return buildTotalAssetAnalysisPrompt(body);
  if (task === "total-asset-json-repair") return buildTotalAssetJsonRepairPrompt(body);
  if (task === "ui-asset-analysis") return buildUiAssetAnalysisPrompt(body);
  if (task === "ui-asset-json-repair") return buildUiAssetJsonRepairPrompt(body);
  if (task === "design-composition-analysis") return buildDesignCompositionAnalysisPrompt(body);
  if (task === "design-composition-json-repair") return buildDesignCompositionJsonRepairPrompt(body);
  return buildInteractionPrompt(body);
}

function buildGameDesignInstructionsV2() {
  return [
    "你是资深游戏主策、系统策划和 UI/UX 协作策划，负责把用户提供的游戏名字和玩法大纲扩写为可用于立项评审、交互设计、SVG 线框图和视觉设计稿生成的正式游戏策划案。",
    "输出必须是中文 Markdown 正文，不要输出代码块、图片、解释性前言或结尾说明。",
    "必须严格覆盖指定的 14 个一级章节和所有二级章节，不得遗漏、合并或改编号。",
    "每个二级章节都必须结合用户玩法大纲定制，不得使用“根据项目情况”“可根据需要调整”“后续再定”等空泛占位句。",
    "信息不足时可以提出“建议设定”，但建议必须围绕原始玩法方向、游戏名字、目标平台和用户提供的留存/拓展内容展开。",
    "策划案必须包含清晰的界面清单、系统入口、资源名、状态名、操作路径、界面关闭方式、版本范围和数据指标，方便后续生成交互案和设计稿。",
    "系统、资源、任务、UI、商业化、版本计划、数据指标和风险评估等结构化内容优先使用 Markdown 表格。",
    "输出不是提纲，必须是可评审的策划正文；每个子项都要给出明确机制、玩家行为、界面承载或验收标准。"
  ].join("\n");
}

function buildOutlineNormalizationInstructions() {
  return [
    "你是小游戏玩法大纲规范化助手，只负责把原始玩法描述补全为固定模板的右列填写内容。",
    "只返回严格 JSON，不要 Markdown，不要代码块，不要解释，不要页面结构图，不要界面表格，不要策划案章节。",
    "JSON 必须包含 rows 数组，且 rows 必须且只能包含九个字段：游戏名称、游戏类型、一句话概述、玩家目标、核心玩法、核心循环、成长与关卡、美术风格、特色亮点。",
    "每一项格式为 {\"field\":\"字段名\",\"content\":\"填写内容\"}。",
    "优先直接提取用户原始输入中的明确内容；缺失项根据上下文合理补全，并在 content 前写“建议设定：”。",
    "不允许返回空字符串，不允许“待补充”“按需调整”之类占位话术。"
  ].join("\n");
}

function buildOutlineNormalizationPrompt(body) {
  const projectName = body.projectName || "未命名小游戏";
  const rawOutline = body.rawOutline || body.outline || body.brief || "";
  const platform = body.platform || "界面：横版（16:9）";
  const extraNeeds = body.extraNeeds || "无";

  return `请把下面的原始玩法大纲整理成固定 9 项的结构化 JSON，只填写模板右列内容。

目标 JSON 格式：
{
  "rows": [
    {"field": "游戏名称", "content": "..."},
    {"field": "游戏类型", "content": "..."},
    {"field": "一句话概述", "content": "..."},
    {"field": "玩家目标", "content": "..."},
    {"field": "核心玩法", "content": "..."},
    {"field": "核心循环", "content": "..."},
    {"field": "成长与关卡", "content": "..."},
    {"field": "美术风格", "content": "..."},
    {"field": "特色亮点", "content": "..."}
  ]
}

规则：
- field 名称和顺序必须完全一致。
- 只返回一个 JSON 对象，不要 Markdown，不要代码块，不要任何解释。
- 不要生成页面清单、界面表格、ASCII 结构图、系统拆解或策划案章节。
- 优先直接提取原始输入里的明确内容。
- 如果某项缺失，但可以从上下文推断，content 必须以“建议设定：”开头。
- 不允许空字符串，不允许“待补充”“按需调整”。

项目名称：
${projectName}

原始玩法大纲：
${rawOutline || "无"}

目标平台：
${platform}

补充要求：
${extraNeeds}`;
}

function buildOutlineNormalizationJsonRepairInstructions() {
  return [
    "你是严格 JSON 修复器，只负责把输入内容修复成规范化玩法大纲所需的合法 JSON。",
    "只返回一个 JSON 对象，不要 Markdown，不要代码块，不要解释。",
    "JSON 必须包含 rows 数组，且 rows 必须且只能包含九个字段：游戏名称、游戏类型、一句话概述、玩家目标、核心玩法、核心循环、成长与关卡、美术风格、特色亮点。",
    "每一项格式为 {\"field\":\"字段名\",\"content\":\"填写内容\"}。",
    "只能做结构修复与字段补齐，不要扩写成策划案、交互案、界面清单或 ASCII 结构图。",
    "如果字段缺失但可从原始玩法大纲推断，content 必须以“建议设定：”开头。"
  ].join("\n");
}

function buildOutlineNormalizationJsonRepairPrompt(body) {
  const rawOutline = body.rawOutline || body.outline || body.brief || "";
  const rawResponse = body.rawResponse || body.content || "";

  return `请把下面的原始返回内容修复为规范化玩法大纲所需的严格 JSON，只返回 JSON，不要 Markdown。

目标 JSON 格式：
{
  "rows": [
    {"field": "游戏名称", "content": "..."},
    {"field": "游戏类型", "content": "..."},
    {"field": "一句话概述", "content": "..."},
    {"field": "玩家目标", "content": "..."},
    {"field": "核心玩法", "content": "..."},
    {"field": "核心循环", "content": "..."},
    {"field": "成长与关卡", "content": "..."},
    {"field": "美术风格", "content": "..."},
    {"field": "特色亮点", "content": "..."}
  ]
}

修复规则：
- field 名称和顺序必须完全一致。
- 只保留这九项，不要额外字段。
- 不要生成页面、界面、系统表格、策划案章节或解释文字。
- 如果某项无法直接从原始返回恢复，但能从原始玩法大纲推断，content 用“建议设定：”补齐。
- 不允许空字符串，不允许“待补充”“按需调整”。

原始玩法大纲：
${rawOutline || "无"}

原始返回内容：
${rawResponse || "无"}`;
}

function buildGameDesignPromptV2(body) {
  const projectName = body.projectName || "未命名小游戏";
  const platform = body.platform || "界面：横版（16:9），建议基准画板 1920×1080";
  const outline = body.normalizedOutline || body.outline || body.brief || "";
  const extraNeeds = body.extraNeeds || "暂无";
  const retryInstruction = buildMissingHeadingsRetryInstruction(body, "策划案");

  return `请基于“游戏名字 + 玩法大纲”生成一份专业、详细、可继续用于 UI/UX 设计和程序拆解的游戏策划案。

输出硬性要求：
- 标题必须是：# 《${projectName}》游戏策划案
- 必须严格使用下面 14 个一级章节和全部二级章节编号。
- 每个二级章节都要结合玩法大纲定制内容，不能只写通用模板。
- 每个二级章节必须写正文内容，不允许只保留标题；正文需要包含机制说明、玩家行为、系统入口、状态反馈或落地建议中的至少两类信息。
- 适合结构化的内容必须使用 Markdown 表格。
- 8. UI/UX 设计 必须包含“主要界面清单”表格，字段固定为：界面名称、界面目标、入口来源、核心操作、关键状态、界面关闭方式。
- 8.7“主要界面清单”必须原样使用以下 6 列 Markdown 表头，不得输出旧 5 列版本：
| 界面名称 | 界面目标 | 入口来源 | 核心操作 | 关键状态 | 界面关闭方式 |
| --- | --- | --- | --- | --- | --- |
- 8.7 不能只输出标题，标题下方必须紧跟上面的 Markdown 表格；8.7 必须放在 8.6 新手引导之后、9. 美术与音频方向之前，不能跳过、合并或挪到别的章节。
- 主要界面清单至少 6 行；第 1 行必须是默认落点（主界面/主场景界面/大厅/HUD），入口写启动游戏默认进入，界面关闭方式写“无关闭入口；作为默认根界面”。
- 主要界面清单每一行都必须补齐第 6 列“界面关闭方式”。
- “界面关闭方式”必须由信息架构推理得出，明确写出无关闭入口、返回上一层、关闭弹窗、返回主界面、跳转结算/下一关/关卡选择等具体语义和目标界面；不能写“待定”“按需调整”。
- 只有默认落点、根 HUD、首页、大厅等真正根界面可以写“无关闭入口”；从主界面进入的图鉴、仓库、任务、好友、商店、背包、活动等二级功能页必须写“返回主界面”或“返回来源界面”，不能因为入口来源是主界面就写“无关闭入口”。
- 5. 系统设计、6. 数值与经济、12. 版本计划、13. 数据指标、14. 风险评估 必须优先用表格呈现。
- 5. 系统设计需要写清每个系统的功能目标、核心规则、入口界面和关键状态。
- 6. 数值与经济需要写清资源名、产出、消耗、成长节奏、付费边界和平衡原则。
- 8. UI/UX 设计需要写清主界面结构、功能入口层级、核心操作路径、弹窗规则、红点规则和新手引导步骤。
- 12-14 章需要写清版本验收、数据口径、风险表现和解决方案，不能只写方向。
- 页面、系统、资源、任务、状态、按钮、弹窗等命名必须尽量来自游戏名字和玩法大纲；没有明确输入时用“建议设定：”标注。
- 竞品与差异化可以写“同类产品方向/参考类型”，但不要编造未经输入确认的真实商业数据。
- 禁止输出“待补充”“按需调整”“视情况而定”“后续再定”“根据项目情况”等空泛占位语。
- 最后不要输出额外解释，不要输出代码块，只输出完整 Markdown 策划案正文。

生成前请先在内部完成以下理解，但不要单独输出分析过程：
1. 从玩法大纲抽取题材、玩家身份、核心循环、主要系统、留存方式、后续拓展。
2. 将抽取结果映射到每个章节，确保资源、角色、界面、状态、操作路径都来自当前项目。
3. 如果原文没有明确内容，用“建议设定：……”补齐，但必须贴合当前玩法方向。

必须输出的章节结构如下：

# 《${projectName}》游戏策划案

## 1. 项目概述
### 1.1 游戏名称
### 1.2 游戏类型
### 1.3 平台定位
### 1.4 目标用户
### 1.5 核心卖点
### 1.6 竞品与差异化

## 2. 核心体验
### 2.1 玩家扮演身份
### 2.2 核心乐趣
### 2.3 核心玩法循环
### 2.4 短中长期目标

## 3. 世界观与题材
### 3.1 世界背景
### 3.2 主角设定
### 3.3 主要角色
### 3.4 阵营与冲突
### 3.5 玩法包装

## 4. 核心玩法设计
### 4.1 基础操作
### 4.2 单局流程
### 4.3 胜负条件
### 4.4 奖励反馈
### 4.5 失败惩罚

## 5. 系统设计
### 5.1 角色系统
### 5.2 养成系统
### 5.3 关卡系统
### 5.4 任务系统
### 5.5 资源系统
### 5.6 商店系统
### 5.7 活动系统
### 5.8 社交系统

## 6. 数值与经济
### 6.1 资源产出
### 6.2 资源消耗
### 6.3 成长曲线
### 6.4 付费点设计
### 6.5 平衡性原则

## 7. 内容规划
### 7.1 首发内容
### 7.2 剧情章节
### 7.3 角色数量
### 7.4 关卡数量
### 7.5 活动规划
### 7.6 长线更新计划

## 8. UI/UX 设计
### 8.1 主界面结构
### 8.2 功能入口
### 8.3 操作流程
### 8.4 弹窗规则
### 8.5 红点规则
### 8.6 新手引导
### 8.7 主要界面清单

## 9. 美术与音频方向
### 9.1 美术风格
### 9.2 角色风格
### 9.3 场景风格
### 9.4 UI 风格
### 9.5 特效风格
### 9.6 音乐音效

## 10. 商业化设计
### 10.1 商业模式
### 10.2 付费内容
### 10.3 广告设计
### 10.4 礼包设计
### 10.5 付费节奏

## 11. 技术需求
### 11.1 引擎与平台
### 11.2 网络需求
### 11.3 数据存储
### 11.4 性能目标
### 11.5 风险功能

## 12. 版本计划
### 12.1 Demo 版本
### 12.2 Alpha 版本
### 12.3 Beta 版本
### 12.4 上线版本
### 12.5 后续运营版本

## 13. 数据指标
### 13.1 新手完成率
### 13.2 留存指标
### 13.3 关卡数据
### 13.4 付费数据
### 13.5 活动数据

## 14. 风险评估
### 14.1 玩法风险
### 14.2 内容风险
### 14.3 技术风险
### 14.4 美术风险
### 14.5 商业化风险
### 14.6 解决方案

项目名称：${projectName}
目标平台：${platform}
输出深度：${body.depth || "标准方案"}
方案语气：${body.tone || "专业评审风格"}
补充要求：${extraNeeds}
${retryInstruction}

玩法大纲：
${outline}`;
}

function buildMissingHeadingsRetryInstruction(body, documentLabel = "文档") {
  const missing = Array.isArray(body.retryMissingHeadings)
    ? body.retryMissingHeadings.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
  if (!missing.length) return "";

  const retryAttempt = Math.max(1, Number(body.retryAttempt || 1));
  const retryMaxAttempts = Math.max(retryAttempt, Number(body.retryMaxAttempts || 3));
  return [
    "",
    `重试修正要求（第 ${retryAttempt}/${retryMaxAttempts} 次重试）：`,
    `上一版${documentLabel}缺少以下章节标题，必须重新输出整篇完整${documentLabel}，不要只补写缺失章节：`,
    missing.map((item, index) => `${index + 1}. ${item}`).join("\n"),
    "本次输出必须保留所有既定章节结构、编号和标题，并补齐上述缺失项。"
  ].join("\n");
}

function buildComponentBaselineAnalysisPrompt(body) {
  const screen = body.screen && typeof body.screen === "object" ? body.screen : {};
  const componentTypes = Array.isArray(body.componentTypes) ? body.componentTypes : [];
  const existingBaselines = Array.isArray(body.existingBaselines) ? body.existingBaselines : [];
  const requiredUiAssetComponents = Array.isArray(body.requiredUiAssetComponents) ? body.requiredUiAssetComponents : [];
  const projectAnchorPolicy = Array.isArray(body.projectAnchorPolicy) ? body.projectAnchorPolicy : [];
  const retryMissingComponents = Array.isArray(body.retryMissingComponents) ? body.retryMissingComponents : [];
  const uiAssetBoardSectionSpec = String(body.uiAssetBoardSectionSpec || "").trim();
  const componentTypeLines = componentTypes
    .map((item) => `- ${item.id}: ${item.label}`)
    .join("\n");
  const existingLines = existingBaselines
    .map((item) => `- ${item.type}（${item.label || item.type}，来源：${item.sourceScreenName || "未知"}）：${item.rules || ""}`)
    .join("\n");
  const requiredLines = requiredUiAssetComponents
    .map((item, index) => `${index + 1}. ${item.type || item.id || item.name} / ${item.label || item.name || ""}（来源：${item.sourceScreen || item.screen || "交互案"}；证据：${item.evidence || item.reason || item.source || ""}）`)
    .join("\n");
  const anchorLines = projectAnchorPolicy
    .map((item, index) => `${index + 1}. ${item.type || item.id || item.name} / ${item.label || item.name || ""}：${item.anchor || item.position || item.rule || ""}；适用：${item.appliesTo || item.scope || ""}`)
    .join("\n");
  const retryLines = retryMissingComponents
    .map((item, index) => `${index + 1}. ${item.type || item.id || item.name} / ${item.label || item.name || ""}`)
    .join("\n");

  return `请观察附带的“UI控件资产图”，提取其中真实出现的项目级通用 UI 控件基准。
输出必须是严格 JSON 对象，格式如下：
{
  "components": [
    {
      "type": "resource_token",
      "present": true,
      "rules": ["外轮廓/圆角或斜切规则", "材质/描边/阴影/高光规则", "字体/图标承载/状态层级规则"],
      "shapeRules": ["外轮廓、比例、斜切/碎片边缘、圆角或尖角规则"],
      "colorRules": ["主色/辅色/禁用色/选中色关系"],
      "materialRules": ["材质、半调纹理、噪点、厚度、投影和高光"],
      "strokeRules": ["描边层数、黑白描边、内外框关系"],
      "iconCarrierRules": ["图标底板、图标留白、箭头/齿轮/资源图标承载规则"],
      "stateRules": ["默认态、选中态、禁用态、锁定态或红点态的视觉差异"],
      "usageRules": ["普通界面中什么场景必须复用该基准，什么场景只能外推"],
      "positionRules": ["普通界面中的稳定锚点、相对标题/资源栏/底部导航的位置关系"],
      "evidence": "该控件在图中的位置或表现证据",
      "confidence": 0.85
    }
  ],
  "coverage": {
    "covered": [{"type": "back_button", "label": "返回按钮", "evidence": "图中左上区域有同类箭头返回按钮"}],
    "missing": [{"type": "screen_title", "label": "界面标题区", "evidence": "交互案要求但图中没有可复用标题底板"}]
  },
  "layoutAnchors": [
    {"type": "back_button", "label": "返回按钮", "anchor": "左上安全区固定位置", "appliesTo": "需要返回的功能页", "evidence": "交互案固定锚点"}
  ]
}

可返回的 type 只能来自下列列表：
${componentTypeLines || "- button_primary: 主按钮"}

分析规则：
1. requiredUiAssetComponents 只是固定通用控件族或前端传入的识别提示，不是交互案 hard minimum；不要因为 missing 阻断总资产。
1.1 如果提供了 A-H 分区资产板规范，必须先按分区位置检查：A 导航与关闭、B 按钮、C 容器面板、D 标签导航、E 资源状态、F 物品角色信息、G 输入提示、H 图标基础件。evidence 必须写出分区或相对位置。
1.2 components 只返回 UI控件资产图中明确出现或在对应 A-H 分区有可信视觉等价物的通用控件类型；不确定项可放入 coverage.unconfirmed，missing 仅作提示。
2. 只提取通用 UI 样式，不提取具体业务文字、角色、商品、道具、场景和 IP 元素。
3. rules 必须可用于后续界面复用，重点描述：外轮廓、圆角/斜切、材质、描边层数、阴影/发光、高光、字体气质、图标承载容器、图标线条、状态区分、按钮层级。
4. 必须尽量区分：screen_title、back_button、close_button、settings_button、resource_token、tab_default、tab_selected、bottom_nav_default、bottom_nav_selected、icon_button、progress_bar、panel_card、modal、list_item、item_slot、avatar_frame、tooltip、badge。
5. 如果 UI资产图中同时出现默认态和选中态，必须拆成 tab_default/tab_selected 或 bottom_nav_default/bottom_nav_selected，不要合并成一个笼统 tab/nav。
6. resource_token 必须描述资源图标、数值胶囊、加号/补充入口、底槽材质和描边/高光关系；不要只返回 resource_icon。
7. back_button 必须描述图标承载容器、箭头图形、粗黑白描边、红/白状态、斜切/碎片边缘、半调纹理、材质、高光和背景分离方式。看到红框那类箭头按钮时必须识别为 back_button。
8. item_slot、avatar_frame、tooltip、list_item 必须只有在图中真实出现对应格子/头像容器/提示气泡/列表项时才返回；不要把纯装饰框、角色插画或背景物件误判为通用控件。
9. 如果同类控件已有基准，仍可描述图片中的表现，但前端会以前者为准；不要建议覆盖已有基准。
10. layoutAnchors 必须把 projectAnchorPolicy 中的返回、关闭、设置、资源栏、底部导航和 screen_title 位置规则转成后续界面可复用的固定锚点。
11. 输出仅 JSON，不要 Markdown。

项目名称：${body.projectName || "未命名小游戏"}
目标平台：${body.platform || "界面：横版（16:9）"}
分析对象：${screen.name || "UI控件资产图"}（${screen.kind || "ui_asset"}）
分析目标：${screen.goal || "从 UI资产图锁定跨界面组件基准"}
当前界面关闭方式：${screen.closeBehavior || "未指定；以 requiredUiAssetComponents 和项目级固定锚点策略为准"}

已锁定控件基准（只作上下文，不要覆盖）：
${existingLines || "暂无"}

通用 UI 控件族识别提示（非交互案 hard minimum，missing 不阻断）：
${requiredLines || "暂无；只提取图中真实通用控件"}

项目级固定锚点策略：
${anchorLines || "暂无；仍需保持同类控件位置一致"}

UI控件资产图 A-H 分区规范：
${uiAssetBoardSectionSpec || "未提供；按图中空间聚类识别，但仍需写清位置证据"}

本次重试需重点复核的缺失组件：
${retryLines || "无"}

完整策划案摘要：
${body.gameDesign || "无"}

交互设计案摘要：
${body.interactionPlan || "无"}

当前界面交互段落：
${body.currentScreenPlan || "无"}

当前界面 SVG/结构摘要：
${body.visualStructure || "无"}`;
}

function buildUiAssetStyleFidelityCheckPrompt(body) {
  return `请判断生成后的 UI控件资产图是否严格贴合原始参考图画风。

附带图片顺序：
1. 图1 = 生成后的 UI控件资产图
2. 图2 = 原始参考图

输出严格 JSON：
{
  "ok": true,
  "status": "passed",
  "score": 0.86,
  "issues": [],
  "styleDistanceWarnings": [],
  "mustKeep": ["必须继续保持的参考图风格锚点"],
  "mustAvoid": ["必须避免的通用化偏差"]
}

判定规则：
1. 只判断画风贴合，不判断组件清单是否完整。
2. 必须比较：主色比例、色温、明暗对比、面板轮廓、线条粗细、描边层数、材质噪点、发光/阴影、图标绘制语言、信息密度、装饰节奏、点线面比例。
3. 允许组件类型来自交互案，不要求参考图直接出现同组件；但新组件必须像是从参考图视觉 DNA 外推出来的。
4. 如果 UI资产图明显退化成通用蓝色科幻、通用金属奇幻、默认圆角网页卡片、奶油宠物 UI 或其他参考图未呈现的资产板风格，必须 ok=false，并在 issues 说明。
5. score 低于 0.72 时 ok=false。
6. 只返回 JSON，不要 Markdown。
7. 如果无法判断、证据不足、图片读取不稳定或不能完成比较，也必须返回 JSON：{"ok": null, "status": "needs_review", "score": 0, "issues": ["写清待确认原因"], "styleDistanceWarnings": []}；不要返回普通文字、空内容或 Markdown。
8. 只有明确观察到画风偏离时才返回 ok=false；不要因为组件种类来自通用控件族、A-H 分区编号或缺少中文标签而判失败。

项目：${body.projectName || "未命名小游戏"}
平台：${body.platform || "界面：横版（16:9）"}

参考图逐图证据：
${JSON.stringify(body.referenceEvidenceSet || [], null, 2).slice(0, 5000)}

综合风格证据：
${JSON.stringify({
  mergedStyleEvidence: body.mergedStyleEvidence || {},
  styleDNA: body.styleDNA || {},
  colorSystem: body.colorSystem || {},
  designTokens: body.designTokens || {},
  styleFidelityDigest: body.styleFidelityDigest || ""
}, null, 2).slice(0, 6000)}`;
}

function buildStyleAnalysisPrompt(body) {
  const summaries = Array.isArray(body.imageSummaries) ? body.imageSummaries : [];
  const imageCount = Array.isArray(body.referenceImages) ? body.referenceImages.length : 0;
  const currentScreen = body.currentScreen && typeof body.currentScreen === "object" ? body.currentScreen : {};
  const projectKeywords = Array.isArray(body.projectKeywords) ? body.projectKeywords : [];
  return `请根据消息中附带的参考图，按《游戏美术风格迁移分析与生成规范》提取可复用视觉规则。输出必须是 JSON 对象，格式如下：
{
  "styleKeywords": ["10-20 个参考图风格关键词"],
  "styleDNA": {
    "worldStyle": "",
    "mood": "",
    "renderingMethod": "",
    "complexity": "",
    "visualSymbols": [],
    "coreDescription": "",
    "keyVisualFeatures": [],
    "easyToDrift": []
  },
  "pointLinePlane": {
    "pointElements": [{"type": "", "sizeRatio": "", "positions": [], "roles": []}],
    "lineElements": [{"type": "", "thicknessRatio": "", "shape": "", "effect": ""}],
    "planeElements": [{"shape": "", "material": "", "layer": "", "treatment": ""}],
    "summary": {"pointRole": "", "lineRole": "", "planeRole": "", "decorationVsInformation": ""}
  },
  "shapeLanguage": {
    "contour": "",
    "cornerRules": [],
    "cutRules": [],
    "symmetry": "",
    "ornaments": [],
    "attachmentPositions": [],
    "ratioNotes": []
  },
  "colorSystem": {
    "primary": [{"hex": "#RRGGBB", "usage": ""}],
    "secondary": [{"hex": "#RRGGBB", "usage": ""}],
    "background": [{"hex": "#RRGGBB", "usage": ""}],
    "highlight": [{"hex": "#RRGGBB", "usage": ""}],
    "shadow": [{"hex": "#RRGGBB", "usage": ""}],
    "functional": [{"name": "success/warning/danger/disabled/locked", "hex": "#RRGGBB", "usage": ""}],
    "rarity": [{"name": "common/rare/epic/legendary", "hex": "#RRGGBB", "usage": ""}],
    "colorMood": ""
  },
  "materialRules": {
    "ui": [],
    "background": [],
    "character": []
  },
  "lightingHierarchy": {
    "mainLightDirection": "",
    "shadowStrength": "",
    "glowRules": [],
    "contrast": "",
    "layerRelationship": [],
    "sharedLightRule": ""
  },
  "buttonSpec": {
    "primary": {},
    "secondary": {},
    "danger": {},
    "small": {},
    "icon": {},
    "close": {},
    "tab": {},
    "stateRules": {"default": "", "hover": "", "pressed": "", "selected": "", "disabled": "", "locked": "", "reward": ""}
  },
  "panelModalSpec": {
    "panel": {},
    "modal": {},
    "card": {},
    "infoBox": {},
    "nineSliceRules": [],
    "decorationVsInformation": ""
  },
  "iconItemResourceSpec": {
    "icons": {},
    "itemSlots": {},
    "resourceBars": {}
  },
  "typographySpec": {
    "title": "",
    "body": "",
    "number": "",
    "buttonText": "",
    "textSafety": "生成无文字 UI 资产，保留文字区域，禁止乱码文字"
  },
  "backgroundSpec": {
    "space": "",
    "perspective": "",
    "depth": [],
    "uiSafeAreas": [],
    "material": [],
    "focusControl": "",
    "sceneReplacementRule": ""
  },
  "characterSpec": {
    "proportions": "",
    "face": "",
    "contour": "",
    "costume": "",
    "materials": [],
    "line": "",
    "renderStyle": "",
    "pose": "",
    "copyAvoidance": ""
  },
  "unityRules": [],
  "designTokens": {
    "colors": {},
    "corner": {},
    "border": {},
    "shadow": {},
    "glow": {},
    "material": {},
    "font": {},
    "spacing": {}
  },
  "imagePrompts": {
    "ui": "English prompt for a transparent-background text-free game UI asset sheet",
    "background": "English prompt for a no-UI background style board",
    "character": "English prompt for transparent-background character style board"
  },
  "negativePrompts": []
}

要求：
1. 策划案和交互案决定“做什么”和“怎么用”；参考图和本规范决定“长什么样”。
2. 不要根据参考图自行判断界面类型、改变玩法逻辑、改变信息层级或新增功能。
3. 不要复制参考图中的 Logo、文字、角色、专有图案、独特符号、活动名、资源图标或原始布局。
4. 只提取可复用视觉规则，不描述或复刻参考图具体内容。
5. 输出尽量包含比例、层数、位置、用途、状态变化、HEX 近似色值、材质厚度、描边比例、光源方向等可执行参数。
6. 每个对象字段都必须填入具体观察值或明确缺失原因；不要只返回 schema key、字段名列表、空对象集合，不能把 primary/secondary/background 等键名当作分析内容。
6. buttonSpec 必须分别覆盖主按钮、次按钮、危险按钮、小按钮、图标按钮、关闭按钮、标签页按钮，并包含 default/hover/pressed/selected/disabled/locked/reward 状态规则。
7. UI 资产规则必须强调透明背景、无文字、多状态、9-slice、同类资产一致尺寸比例和边框厚度。
8. 背景规则必须强调不带 UI、根据策划案指定场景生成新背景、保留 UI 安全区和角色站位、背景不能抢 UI。
9. 角色规则必须强调透明背景、全新角色/宠物/NPC 风格、不得复制参考图具体角色设计。
10. imagePrompts 必须是英文，分别用于 UI asset、Background、Character 三张图。
11. negativePrompts 必须包含 modern flat app UI、generic mobile app style、photorealistic background、inconsistent lighting、mismatched color palette、copied logo、copied character、unreadable text、random letters、changed gameplay layout、changed interaction structure、style suggestions from design document that conflict with reference images。
12. 如果图片无法读取，请在 styleDNA.easyToDrift 或 negativePrompts 中说明无法读取原因；不要编造低饱和、写实、自然背景等结论。
13. 如果某项无法从参考图确认，对应字段返回空数组、空对象或空字符串，并在 easyToDrift 或对应 spec 中说明缺失；不要用默认规则冒充真实观察。

项目名称：${body.projectName || "未命名小游戏"}
目标平台：${body.platform || "横版 16:9"}
当前界面：${currentScreen.name || "未指定"} / ${currentScreen.kind || "generic"}
当前界面目标：${currentScreen.goal || "未提供"}
参考图数量：${imageCount}
用户输入画风关键词：${body.styleKeywords || "未填写"}
本地图像指标（仅供校验，不能作为风格结论）：${body.localKeywords || "无"}
项目关键词：${projectKeywords.join("、") || "无"}
当前界面交互段落：
${body.currentScreenPlan || "无"}

当前界面 SVG/结构摘要：
${body.visualStructure || "无"}

完整策划案：
${body.gameDesign || "无"}

完整交互设计案：
${body.interactionPlan || "无"}

参考图特征摘要：
${JSON.stringify(summaries, null, 2)}`;
}

function buildStyleAnalysisPromptLegacyUnused(body) {
  const summaries = Array.isArray(body.imageSummaries) ? body.imageSummaries : [];
  const imageCount = Array.isArray(body.referenceImages) ? body.referenceImages.length : 0;
  const currentScreen = body.currentScreen && typeof body.currentScreen === "object" ? body.currentScreen : {};
  const projectKeywords = Array.isArray(body.projectKeywords) ? body.projectKeywords : [];
  return `请根据消息中附带的参考图，生成一组“画风迁移关键词”。输出必须是 JSON 对象，格式如下：
{
  "styleKeywords": "一段可直接放进生图提示词的中文画风迁移关键词，120-220字",
  "styleAnalysis": {
    "overallStyle": "一、整体画风定位：UI核心气质与风格类型",
    "colorAnalysis": "二、色彩分析：主色调、强调色、配色关键词",
    "materialTexture": "三、材质与质感分析：面板、按钮、卡片、边框、质感层级",
    "layoutComposition": "四、版式与构图分析：布局密度、视觉重心、分区方式、信息层级",
    "iconDesign": "五、图标设计分析：线条、体积、描边、材质、语义迁移规则",
    "buttonsComponents": "六、按钮与组件分析：按钮形态、状态、组件层级、交互反馈",
    "typography": "七、文字与字体风格分析：字体气质、字号层级、描边/阴影/对齐方式",
    "decorativeElements": "八、装饰元素分析：可迁移的装饰语言，以及不可迁移的主题符号",
    "lightingAtmosphere": "九、光影与氛围分析：光源、阴影、发光、景深、整体情绪"
  },
  "palette": ["#RRGGBB", "#RRGGBB"],
  "styleRules": ["迁移规则1", "迁移规则2", "迁移规则3"],
  "themeBoundElements": ["参考图中和原游戏主题强绑定、不应迁移的元素"],
  "replacementThemeElements": ["从当前策划案、交互案或当前界面中提取的替换主题元素"],
  "elementReplacementRules": ["参考图主题元素A不要保留，替换为当前项目主题元素B；只保留其图标绘制风格"],
  "backgroundStyle": {
    "sceneType": "背景整体类型与气质",
    "depthLayers": ["远景层规则", "中景层规则", "前景层规则"],
    "textureRules": ["背景材质、纹理、渐层或底色规则"],
    "decorativeMotifs": ["可用于背景边缘或远景的弱装饰元素"],
    "lightingMood": ["背景光影和氛围规则"],
    "avoidRules": ["背景禁止事项"],
    "uiSafetyRules": ["保证 UI 可读性与层级的规则"],
    "promptText": "可直接注入界面生图提示词的背景执行说明，80-180字"
  },
  "shapeLanguage": {
    "pointElements": ["参考图中点状元素的真实用途，例如星点、高光、角标、节点、微装饰"],
    "lineElements": ["参考图中线性元素的真实用途，例如描边、连接线、分隔线、轨道、细框"],
    "planeElements": ["参考图中面状元素的真实用途，例如主面板、半透信息层、局部承载面"],
    "proportionGuidance": ["必须直接说明参考图更偏点/更偏线/更偏面，哪一类主导，哪一类辅助"],
    "panelWeightRules": ["基于参考图说明面板是薄、透、轻，还是少量主面板可略实；不要泛泛而谈"],
    "transparencyRules": ["基于参考图说明透明度、浅面层、悬浮感如何使用"],
    "edgeTreatmentRules": ["基于参考图说明边缘、描边、分隔线、圆角、阴影的轻重关系"],
    "avoidRules": ["指出与该参考图不符的厚重块面做法"],
    "promptText": "可直接注入界面生图提示词的点线面执行说明，80-180字，必须明确参考图主次比例"
  },
  "buttonMorphology": {
    "silhouette": ["主按钮、Tab、入口按钮的整体外轮廓，例如复合页签、卡片按钮、胶囊、旗帜、切角或局部异形"],
    "cornerProfile": ["圆角大小、位置和对称性，必须使用 micro/small/medium/large/pill 相对等级，可描述混合圆角"],
    "segmentation": ["左图标腔、文字区、右角标、顶部凸起、底部阴影等分段结构"],
    "edgeProfile": ["描边厚度、斜切、弧形拼接、缺口、尖角、内外边等边缘结构"],
    "materialLayers": ["底色、纹理、描边、高光、内阴影、投影层等按钮材质层"],
    "ornamentSlots": ["红点、礼物、徽章、尖角、角花等可迁移的角标/装饰插槽"],
    "stateVariants": ["默认、选中、禁用、可领取、红点等状态差异"],
    "negativeSimplifications": ["禁止简化为普通圆角矩形、长圆角按钮、默认网页胶囊等低信息形态"],
    "promptText": "可直接注入界面和 UI资产图提示词的按钮形态执行说明，80-180字"
  },
  "negativeKeywords": "需要避免的风格偏差"
}

要求：
1. 必须先观察参考图本身，再输出风格结论；本地特征摘要只用于校正主色、明度、饱和度，不允许作为唯一依据。
2. 只描述可迁移的视觉风格，不描述具体图片内容，不复刻参考图原始页面。
3. styleAnalysis 必须完整填写 9 个字段，且每个字段必须是针对参考图的具体观察关键词 + 迁移说明；不要写空泛形容词。
4. 每个 styleAnalysis 字段必须包含能从参考图观察到的具体关键词，例如主色、材质、线条、按钮形态、图标质感、光影、信息密度、装饰节奏；不允许只写“参考图已上传”“本地图像指标读取基础色彩”“按参考图风格生成”等空泛句。
5. styleKeywords 必须是一组具体可用的 UI 生图关键词组合，覆盖色彩、材质、线条、按钮、图标、光影、信息密度和构图；不能只是项目名或用户输入关键词复述。
6. 必须强调 UI 面板材质、按钮质感、图标渲染、描边/投影、光影层级、色彩氛围、构图语言和信息密度。
7. 如果参考图呈现漫画/二次元/暗黑/科幻/手绘/Q版/写实/像素等明确风格，styleKeywords 必须明确对应风格；不要输出与参考图明显冲突的风格。
8. 如果图片无法读取，请在 styleKeywords 中写“参考图无法被模型读取”，styleAnalysis 只说明无法读取原因，不要编造自然背景、写实风格、低饱和等结论。
9. 如果用户输入了画风关键词，需要与参考图特征合并，不要互相冲突。
10. themeBoundElements 只列参考图里的原游戏主题符号、IP角色、角色头像、道具、徽章、货币图案、资源符号、装饰性主题元素；不要把通用 UI 形态、按钮形状、面板材质、配色、投影、描边写进去。
11. replacementThemeElements 只能来自“当前项目上下文”，例如策划案、交互案、当前界面、SVG/结构信息或项目关键词；没有明确元素时返回空数组，不要凭空创造新玩法或新资源。
12. elementReplacementRules 必须写成明确映射：参考图主题绑定元素 → 当前项目主题元素；如果当前项目没有对应元素，则写“替换为中性系统占位图标”，但不要保留原主题符号。
13. 如果参考图主题和当前项目主题一致，可以保留同类主题语义，但不能复制具体 IP 角色、商标、原文字、原角色头像或原道具造型。
14. backgroundStyle 只描述背景如何体现参考图风格，不允许把参考图里的角色、商品、主题道具、文字、IP 标识直接搬进背景。
15. backgroundStyle 必须明确：背景不能只是纯色铺底，至少给出材质、层次、轻装饰或光影氛围中的一种以上做法。
16. backgroundStyle.uiSafetyRules 必须强调：背景服务 UI，不抢主按钮、主卡片、关键数值、资源栏和正文区。
17. shapeLanguage 不是通用建议集合，而是对当前参考图的观察结果；必须判断点状装饰是稀疏还是密集、线性分隔是否主导信息组织、面状容器是主导还是辅助。
18. shapeLanguage.proportionGuidance 必须直接回答“参考图更偏点 / 更偏线 / 更偏面”，并说明背景、容器、按钮三层中哪一层在主导视觉。
19. shapeLanguage 必须明确哪些面板在这张参考图里是薄面、透面、浅面，哪些才允许做成主面板；不要把所有图都统一压成“减少块面”。
20. shapeLanguage 必须限制“大片纯色矩形 + 厚描边 + 多层重阴影”的厚重块面倾向，并说明如何按该参考图的做法用线和点替代一部分大面块。
21. 如果参考图整体更轻、更透、更依赖细线和留白，不允许把这种风格翻译成多个厚重矩形卡片。
22. negativeKeywords 需要提醒不要复制参考图角色、商品、文字、原始布局、无关玩法和主题绑定元素，也不要生成厚重的默认卡片堆叠 UI。
23. buttonMorphology 必须专门分析主按钮、Tab、活动入口、导航按钮和弹窗按钮；不能只写“长圆角矩形”“圆角按钮”。
24. buttonMorphology.cornerProfile 必须使用 micro/small/medium/large/pill 相对圆角级别，并说明圆角位置、是否左右/上下不对称、是否有斜切、凸起、缺口、图标腔或角标插槽。
25. buttonMorphology.negativeSimplifications 必须明确禁止把参考图中的复合按钮、页签或入口按钮简化为普通圆角矩形、默认胶囊按钮或现代网页按钮。
26. backgroundStyle、shapeLanguage 和 buttonMorphology 必须作为根级 JSON 对象输出，不能写成普通段落、不能塞进 styleKeywords 或 styleAnalysis 的某个字符串里。
27. 如果某项分析无法从参考图确认，对应字段返回空数组或空字符串，并说明缺失；不要用默认规则冒充参考图真实观察。

项目名称：${body.projectName || "未命名小游戏"}
目标平台：${body.platform || "横版 16:9"}
当前界面：${currentScreen.name || "未指定"} / ${currentScreen.kind || "generic"}
当前界面目标：${currentScreen.goal || "未提供"}
参考图数量：${imageCount}
用户输入画风关键词：${body.styleKeywords || "未填写"}
本地图像指标（仅供校验，不能作为风格结论）：${body.localKeywords || "无"}
项目关键词：${projectKeywords.join("、") || "无"}
当前界面交互段落：
${body.currentScreenPlan || "无"}

当前界面 SVG/结构摘要：
${body.visualStructure || "无"}

完整策划案：
${body.gameDesign || "无"}

完整交互设计案：
${body.interactionPlan || "无"}

参考图特征摘要：
${JSON.stringify(summaries, null, 2)}`;
}

function buildStyleAnalysisJsonRepairPrompt(body) {
  const summaries = Array.isArray(body.imageSummaries) ? body.imageSummaries : [];
  const currentScreen = body.currentScreen && typeof body.currentScreen === "object" ? body.currentScreen : {};
  const projectKeywords = Array.isArray(body.projectKeywords) ? body.projectKeywords : [];
  return `请把下面“原始返回内容”修复为合法 JSON 对象，只返回 JSON，不要 Markdown。

目标 JSON schema：
{
  "styleKeywords": ["10-20 个参考图风格关键词"],
  "styleDNA": {
    "worldStyle": "",
    "mood": "",
    "renderingMethod": "",
    "complexity": "",
    "visualSymbols": [],
    "coreDescription": "",
    "keyVisualFeatures": [],
    "easyToDrift": []
  },
  "pointLinePlane": {
    "pointElements": [{"type": "", "sizeRatio": "", "positions": [], "roles": []}],
    "lineElements": [{"type": "", "thicknessRatio": "", "shape": "", "effect": ""}],
    "planeElements": [{"shape": "", "material": "", "layer": "", "treatment": ""}],
    "summary": {"pointRole": "", "lineRole": "", "planeRole": "", "decorationVsInformation": ""}
  },
  "shapeLanguage": {
    "contour": "",
    "cornerRules": [],
    "cutRules": [],
    "symmetry": "",
    "ornaments": [],
    "attachmentPositions": [],
    "ratioNotes": []
  },
  "colorSystem": {
    "primary": [{"hex": "#RRGGBB", "usage": ""}],
    "secondary": [{"hex": "#RRGGBB", "usage": ""}],
    "background": [{"hex": "#RRGGBB", "usage": ""}],
    "highlight": [{"hex": "#RRGGBB", "usage": ""}],
    "shadow": [{"hex": "#RRGGBB", "usage": ""}],
    "functional": [{"name": "success/warning/danger/disabled/locked", "hex": "#RRGGBB", "usage": ""}],
    "rarity": [{"name": "common/rare/epic/legendary", "hex": "#RRGGBB", "usage": ""}],
    "colorMood": ""
  },
  "materialRules": {"ui": [], "background": [], "character": []},
  "lightingHierarchy": {"mainLightDirection": "", "shadowStrength": "", "glowRules": [], "contrast": "", "layerRelationship": [], "sharedLightRule": ""},
  "buttonSpec": {"primary": {}, "secondary": {}, "danger": {}, "small": {}, "icon": {}, "close": {}, "tab": {}, "stateRules": {"default": "", "hover": "", "pressed": "", "selected": "", "disabled": "", "locked": "", "reward": ""}},
  "panelModalSpec": {"panel": {}, "modal": {}, "card": {}, "infoBox": {}, "nineSliceRules": [], "decorationVsInformation": ""},
  "iconItemResourceSpec": {"icons": {}, "itemSlots": {}, "resourceBars": {}},
  "typographySpec": {"title": "", "body": "", "number": "", "buttonText": "", "textSafety": "生成无文字 UI 资产，保留文字区域，禁止乱码文字"},
  "backgroundSpec": {"space": "", "perspective": "", "depth": [], "uiSafeAreas": [], "material": [], "focusControl": "", "sceneReplacementRule": ""},
  "characterSpec": {"proportions": "", "face": "", "contour": "", "costume": "", "materials": [], "line": "", "renderStyle": "", "pose": "", "copyAvoidance": ""},
  "unityRules": [],
  "designTokens": {"colors": {}, "corner": {}, "border": {}, "shadow": {}, "glow": {}, "material": {}, "font": {}, "spacing": {}},
  "imagePrompts": {"ui": "", "background": "", "character": ""},
  "negativePrompts": []
}

修复规则：
1. 只修复结构和字段归位，不重新分析参考图，不新增原始返回没有表达的结论。
2. 可把旧字段归位：palette/color → colorSystem；buttonMorphology/buttonShape → buttonSpec；backgroundStyle/backgroundRules → backgroundSpec；negativeKeywords → negativePrompts。
3. 如果原始返回没有某类内容，对应对象保留空字段或空数组，不要填默认规则。
4. imagePrompts 必须保留原文中已经出现的 UI、背景、角色英文 prompt；没有就返回空字符串，不要编造。
5. negativePrompts 只保留原文已表达的禁止项，并可保留规范要求的明确禁止词。
6. 不要保留 Markdown 标题、代码块标记、解释性前后文。

项目名称：${body.projectName || "未命名小游戏"}
目标平台：${body.platform || "横版 16:9"}
当前界面：${currentScreen.name || "未指定"} / ${currentScreen.kind || "generic"}
用户输入画风关键词：${body.styleKeywords || "未填写"}
本地图像指标（仅供校验，不能作为风格结论）：${body.localKeywords || "无"}
项目关键词：${projectKeywords.join("、") || "无"}

当前界面交互段落：
${body.currentScreenPlan || "无"}

参考图特征摘要：
${JSON.stringify(summaries, null, 2)}

原始返回内容：
${body.rawContent || ""}`;
}

function buildReferenceEvidenceAnalysisPrompt(body) {
  const imageSummary = body.imageSummary && typeof body.imageSummary === "object" ? body.imageSummary : {};
  const cropLabel = body.cropLabel || "";
  const sourceReferenceLabel = body.sourceReferenceLabel || body.referenceLabel || `图${body.referenceIndex || 1}`;
  const cropMetadata = body.cropMetadata && typeof body.cropMetadata === "object" ? body.cropMetadata : null;
  return `请只分析当前附带的单张参考图，提取可验证的视觉证据。必须严格返回 JSON 对象，不要 Markdown。

目标 JSON：
{
  "label": "${body.referenceLabel || `图${body.referenceIndex || 1}`}",
  "index": ${Number(body.referenceIndex || 1)},
  "sourceReferenceLabel": "${sourceReferenceLabel}",
  "cropLabel": "${cropLabel}",
  "cropMetadata": ${JSON.stringify(cropMetadata || {}, null, 2)},
  "analysisStatus": "complete 或 insufficient",
  "missingEvidence": [],
  "styleKeywords": [],
  "paletteAndRatio": [{"hex": "#RRGGBB", "approxRatio": "约占画面/组件多少", "usage": "用在什么区域", "visibleEvidence": "从图中哪里观察到"}],
  "materialAndStroke": ["材质厚度、边框/描边层数、纹理、高光、阴影的可见证据"],
  "shapeAndOrnament": ["圆角比例、切角/缺口、角饰节奏、点线面比例、装饰位置的可见证据"],
  "lightingAndRendering": ["主光方向、阴影、发光、渲染方式、复杂度的可见证据"],
  "uiEvidence": ["只写按钮、面板、Tab、资源条、图标底板、控件状态、文字承载等 UI 规则；没有则写缺失原因"],
  "backgroundEvidence": ["只写背景空间、景深、透视、光源、背景材质、UI 安全区、焦点控制；没有则写缺失原因"],
  "characterEvidence": ["只写角色/宠物/NPC 的轮廓比例、脸部、服装材质、线条、姿态、渲染方式；没有则写缺失原因"],
  "transferableRules": ["仅可共享低层视觉 token，例如主色/辅色、高光色、光源方向、材质厚度、描边宽度、颗粒纹理、渲染方式"],
  "copyAvoidance": ["不得复制的参考图专有内容"]
}

硬规则：
1. 只取证，不生成资产，不改玩法，不新增组件。
2. 必须基于图像可见事实；本地图像指标只用于校验基础色彩，不得替代视觉观察。
3. paletteAndRatio 至少给出 3 个真实 HEX 或在 missingEvidence 说明为什么无法确认。
4. materialAndStroke、shapeAndOrnament、lightingAndRendering 必须包含具体比例、层数、位置或用途，不要写“精致”“高级”“按参考图”。
5. uiEvidence、backgroundEvidence、characterEvidence 允许某项缺失，但必须明确缺失原因；不得用通用默认风格补齐。
5.1 三类证据必须隔离：不要把人物/服装/脸部/姿态写进 uiEvidence；不要把按钮/面板/Tab/资源条写进 backgroundEvidence 或 characterEvidence；不要把背景空间/建筑/场景物写进 uiEvidence。
5.2 不要写笼统“画面气质/整体气质/世界观气质”。必须分别描述 UI气质、背景气质、角色气质；配色、材质和光影也必须按 UI/背景/角色分别说明，不得只写一份整体配色套给三类资产。
6. 如果当前图是自动裁切区域，请把它当作原参考图的局部证据，只提取局部中可见的圆角、描边、角饰、材质、光影和 UI 结构，不要把局部当成完整界面。
7. 如果图像无法读取或基础视觉 DNA 证据不足，analysisStatus 返回 insufficient，missingEvidence 列缺失项，其余字段不要编造。
8. 不要复制参考图中的 Logo、文字、角色、专有图案、独特符号、活动名、资源图标或原始布局。

当前参考图：${body.referenceLabel || `图${body.referenceIndex || 1}`}
原始参考图：${sourceReferenceLabel}
自动裁切标签：${cropLabel || "非裁切原图"}
裁切元数据：${JSON.stringify(cropMetadata || {}, null, 2)}
本地图像指标（仅用于校验色彩，不得单独作为风格结论）：
${JSON.stringify(imageSummary, null, 2)}`;
}

function buildTotalAssetAnalysisPrompt(body) {
  const summaries = Array.isArray(body.imageSummaries) ? body.imageSummaries : [];
  const currentScreen = body.currentScreen && typeof body.currentScreen === "object" ? body.currentScreen : {};
  const targetScreens = Array.isArray(body.targetScreens) ? body.targetScreens : [];
  const screenInteractionSections = Array.isArray(body.screenInteractionSections) ? body.screenInteractionSections : [];
  const referenceEvidenceSet = Array.isArray(body.referenceEvidenceSet) ? body.referenceEvidenceSet : [];
  const skippedEvidenceSet = Array.isArray(body.skippedEvidenceSet) ? body.skippedEvidenceSet : [];
  const assetDemandSummary = body.assetDemandSummary && typeof body.assetDemandSummary === "object" ? body.assetDemandSummary : {};
  const imageCount = Number(body.referenceImageCount || referenceEvidenceSet.length || summaries.length || 0);
  const screenLines = body.targetScreenList || targetScreens.map((item, index) => {
    const closeBehavior = item.closeBehavior ? `；关闭方式=${item.closeBehavior}` : "";
    return `${index + 1}. ${item.name || "目标界面"}：${item.goal || item.coreAction || ""}${closeBehavior}`;
  }).join("\n");
  const interactionLines = screenInteractionSections.map((item, index) => {
    const title = `${index + 1}. ${item.name || "目标界面"}${item.missing ? "（缺少对应交互章节）" : ""}`;
    return item.section ? `${title}\n${String(item.section).slice(0, 1800)}` : title;
  }).join("\n\n");
  return `请基于逐图参考图取证结果、策划案主要界面清单和对应交互章节，生成“项目级总资产”的结构化分析。必须严格返回 JSON 对象，不要 Markdown。

注意：本阶段不会再接收原始参考图。referenceEvidenceSet 只包含前端筛选后的有效逐图证据；skippedEvidenceSet/ignored references 只作诊断提示，不得参与风格综合。所有视觉判断只能来自有效 referenceEvidenceSet 和参考图特征摘要；不得自行想象参考图内容，不得使用默认风格补齐。

目标 JSON schema：
{
  "analysisStatus": "complete 或 insufficient",
  "missingEvidence": ["如果不足，列出缺少哪些参考图证据；充分时为空数组"],
  "referenceImageCount": ${imageCount},
  "referenceEvidenceSet": ["逐图取证结果，必须原样保留并可压缩摘要"],
  "mergedStyleEvidence": {
    "paletteAndRatio": ["综合全部参考图后的色彩 HEX、比例、冷暖和用途"],
    "materialAndStroke": ["综合全部参考图后的材质厚度、描边/边框层数、纹理、高光"],
    "shapeAndOrnament": ["综合全部参考图后的圆角比例、切角/缺口、角饰节奏、点线面比例"],
    "lightingAndRendering": ["综合全部参考图后的光源方向、阴影、发光、渲染方式"],
    "uiEvidence": ["只来自 uiEvidence 的 UI 控件资产可迁移证据"],
    "backgroundEvidence": ["只来自 backgroundEvidence 的背景设定图可迁移证据"],
    "characterEvidence": ["只来自 characterEvidence 的角色设定图可迁移证据"],
    "transferableRules": ["仅限三张总资产共享的低层视觉 token，不得包含人物、背景物体、场景题材、道具或 UI 组件语义"]
  },
  "evidenceConflicts": ["多张参考图之间的风格冲突和处理规则"],
  "styleExtrapolationRules": [{"target": "需要补全的资产/控件类型", "directEvidence": "来自逐图证据的真实依据", "extrapolationRule": "如何按证据外推，不能写默认风格"}],
  "directTransferTargets": ["参考图中可直接迁移的视觉项"],
  "extrapolatedTargets": ["参考图未直接出现但可按证据补全的目标项"],
  "missingVisualDNA": ["基础视觉 DNA 缺失项；只有这些缺失才应阻止生成"],
  "missingExactComponentReference": ["具体控件/角色/背景样例未直接出现但可外推的项"],
  "referenceEvidence": {
    "paletteAndRatio": ["从参考图直接观察到的 HEX、色彩比例、冷暖关系"],
    "materialAndStroke": ["从参考图直接观察到的材质厚度、描边/边框层数、纹理、高光"],
    "shapeAndOrnament": ["从参考图直接观察到的圆角比例、切角/缺口、角饰节奏、点线面比例"],
    "lightingAndRendering": ["从参考图直接观察到的光源方向、阴影、发光、渲染方式"],
    "uiBackgroundCharacter": ["仅限主色/辅色、高光色、光源方向、材质厚度、描边宽度、颗粒纹理、渲染方式等低层视觉 token"]
  },
  "styleKeywords": [],
  "styleDNA": {},
  "pointLinePlane": {},
  "shapeLanguage": {},
  "colorSystem": {},
  "materialRules": {"ui": [], "background": [], "character": []},
  "lightingHierarchy": {},
  "buttonSpec": {"primary": {}, "secondary": {}, "danger": {}, "small": {}, "icon": {}, "close": {}, "tab": {}, "stateRules": {}},
  "panelModalSpec": {"panel": {}, "modal": {}, "card": {}, "infoBox": {}, "nineSliceRules": []},
  "iconItemResourceSpec": {"icons": {}, "itemSlots": {}, "resourceBars": {}},
  "typographySpec": {},
  "backgroundSpec": {},
  "characterSpec": {},
  "unityRules": [],
  "designTokens": {"colors": {}, "corner": {}, "border": {}, "shadow": {}, "glow": {}, "material": {}, "font": {}, "spacing": {}},
  "assetRequirements": {
    "ui": ["固定通用 UI 控件风格库；不从交互案抽取 hard minimum"],
    "uiRequiredComponents": [],
    "background": ["必须覆盖的背景/场景需求，来自策划案/交互案"],
    "character": ["必须覆盖的角色/宠物/NPC/头像/立绘需求，来自策划案/交互案"]
  },
  "uiAnalysis": {},
  "backgroundAnalysis": {},
  "characterAnalysis": {},
  "imagePrompts": {
    "ui": "English prompt for UI控件资产图",
    "background": "English prompt for 背景设定图",
    "character": "English prompt for 角色设定图"
  },
  "negativePrompts": []
}

硬规则：
1. 参考图只决定画风；背景和角色资产的题材需求仍可来自策划案主要界面清单和对应交互章节。
2. 总资产 UI 阶段不再读取交互案控件清单，也不再输出全项目 uiRequiredComponents hard minimum。UI控件资产图固定生成通用游戏 UI 控件族风格库。
3. UI控件资产图固定覆盖 A-H 通用控件族：导航与关闭、按钮控件、容器与面板、标签与导航组、资源与状态、物品与角色信息、输入与提示、图标基础件。
3.1 UI控件资产图应覆盖通用状态：default/pressed/selected/disabled/locked/reward；透明背景、控件留足切图空间、每个控件带小号英文识别标签，标签格式为 Control Name - function label，例如 Back Button - go back、Resource Token - show currency、Item Card - display item reward；可 9-slice。
3.2 若参考图没有某类通用控件直接样例，也必须按参考图已有按钮、图标底板、面板边框、圆角、材质、描边、光影和装饰节奏外推生成，并写入 styleExtrapolationRules；不得因为缺少直接样例而退回默认模板。
4. 背景设定图必须不带 UI；根据策划案/交互案的新场景生成，不复制参考图场景；保留 UI 安全区和角色站位，背景不能抢 UI。
5. 角色设定图必须透明背景；按策划案主题生成全新角色/宠物/NPC 风格，不复制参考图具体角色。
6. 三类资产不能直接共享一整套配色/材质/光影结论；必须分别说明 UI配色、背景配色、角色配色，以及各自材质和光影用法。只允许在三者之间共享少量低层 token 作为统一性约束，例如共同主色族、高光色族、光源方向、渲染颗粒；不得共享人物、背景物体、场景题材、具体道具、UI 组件语义或世界观元素。
6.1 buttonSpec、panelModalSpec、iconItemResourceSpec、typographySpec 只能从 uiEvidence 推导；backgroundSpec 只能从 backgroundEvidence 推导；characterSpec 只能从 characterEvidence 推导。某类证据缺失时写缺失或外推规则，不得借用其他类别证据冒充。
7. imagePrompts 必须是英文，并分别能直接用于生成 UI asset sheet、background style board、character style board。三个 prompt 必须分别描述 UI temperament、background temperament、character temperament，不得写泛化的 overall visual mood。
7.1 每个对象字段都必须填入具体观察值或明确缺失原因；不要只返回 schema key、字段名列表、空对象集合，不能把 primary/secondary/background、pointElements/lineElements/planeElements、primary/secondary/danger 等键名当作分析内容。
7.2 必须先消费 referenceEvidenceSet，把全部参考图合成为 mergedStyleEvidence，再按 UI/背景/角色三条通道分别填写 styleDNA、colorSystem、materialRules、lightingHierarchy、buttonSpec、backgroundSpec、characterSpec。每条综合证据必须能追溯到对应通道的逐图证据，例如 UI 规则追溯 uiEvidence、背景规则追溯 backgroundEvidence、角色规则追溯 characterEvidence；共享字段只可追溯低层视觉 token。不要写“按参考图风格”“高级 UI”“精致卡通”“整体画面气质”这类空话。
7.3 如果 referenceEvidenceSet 或 mergedStyleEvidence 无法覆盖色彩比例、材质厚度、描边/边框层数、圆角比例、角饰节奏、光源方向、渲染方式、复杂度、按钮/面板/图标规则，analysisStatus 必须为 insufficient，missingVisualDNA/missingEvidence 列缺失项，imagePrompts 返回空字符串；不要继续生成可执行 prompt。
7.3.1 参考图不必直接出现每一种目标控件。若关闭/返回/确认/领取/Tab/图标按钮等具体控件缺失，但已有同类按钮、图标底板、面板边框、角标、圆角、材质、描边和光影证据，analysisStatus 仍可为 complete，并必须在 styleExtrapolationRules 写清“直接观察依据”和“如何外推补全”。不得把外推项写成参考图直接出现。
7.3.2 背景和角色也可按真实色彩、材质、光影、轮廓/渲染复杂度外推到当前项目新题材；不得复制参考图场景或角色。只有基础视觉 DNA 不足时才停止。
7.4 未指定图号时仍必须综合全部参考图；不得自动选择主图、不得丢弃风格冲突图片。冲突必须写入 evidenceConflicts，并给出统一处理规则。
8. negativePrompts 必须包含 modern flat app UI、generic mobile app style、photorealistic background、inconsistent lighting、mismatched color palette、copied logo、copied character、unreadable text、random letters、changed gameplay layout、changed interaction structure、style suggestions from design document that conflict with reference images。
9. 不要复制参考图 Logo、文字、角色、专有图案、独特符号、原资源图标、活动名或布局。
10. 如果参考图分析无法确认某项，返回空字段并在 negativePrompts 或对应 spec 中说明缺失，不要用默认规则冒充真实观察。
11. 禁止跨通道污染：人物服装/脸部/姿态不得进入 UI 分析；按钮/面板/资源条/Tab 不得进入背景或角色分析；背景空间/场景物/建筑不得进入 UI 分析。

项目名称：${body.projectName || "未命名小游戏"}
目标平台：${body.platform || "横版 16:9"}
当前选中界面：${currentScreen.name || "未指定"} / ${currentScreen.kind || "generic"}
当前界面目标：${currentScreen.goal || "未提供"}
当前界面关闭方式：${currentScreen.closeBehavior || "未提供"}
参考图数量：${imageCount}
用户生图关键词：${body.styleKeywords || "未填写"}
已有画风迁移关键词：${body.styleTransferKeywords || "无"}

目标界面清单（仅来自策划案主要界面清单）：
${screenLines || "无"}

对应交互章节（仅这些章节可用于组件、状态、背景和角色需求）：
${interactionLines || "无"}

资产需求摘要（仅供背景/角色需求参考；UI资产不从这里抽取 hard minimum）：
${JSON.stringify(assetDemandSummary, null, 2)}

参考图特征摘要：
${JSON.stringify(summaries, null, 2)}

有效逐图参考图取证结果（必须全部纳入综合）：
${JSON.stringify(referenceEvidenceSet, null, 2)}

已跳过参考图取证结果（仅诊断，不参与风格综合）：
${JSON.stringify(skippedEvidenceSet, null, 2)}`;
}

function buildTotalAssetJsonRepairPrompt(body) {
  return `请把下面“原始返回内容”修复为合法 JSON 对象，只返回 JSON，不要 Markdown。

目标 JSON schema：
{
  "analysisStatus": "complete 或 insufficient",
  "missingEvidence": [],
  "referenceImageCount": 0,
  "referenceEvidenceSet": [],
  "mergedStyleEvidence": {},
  "evidenceConflicts": [],
  "styleExtrapolationRules": [],
  "directTransferTargets": [],
  "extrapolatedTargets": [],
  "missingVisualDNA": [],
  "missingExactComponentReference": [],
  "referenceEvidence": {},
  "styleKeywords": [],
  "styleDNA": {},
  "pointLinePlane": {},
  "shapeLanguage": {},
  "colorSystem": {},
  "materialRules": {"ui": [], "background": [], "character": []},
  "lightingHierarchy": {},
  "buttonSpec": {"primary": {}, "secondary": {}, "danger": {}, "small": {}, "icon": {}, "close": {}, "tab": {}, "stateRules": {}},
  "panelModalSpec": {"panel": {}, "modal": {}, "card": {}, "infoBox": {}, "nineSliceRules": []},
  "iconItemResourceSpec": {"icons": {}, "itemSlots": {}, "resourceBars": {}},
  "typographySpec": {},
  "backgroundSpec": {},
  "characterSpec": {},
  "unityRules": [],
  "designTokens": {"colors": {}, "corner": {}, "border": {}, "shadow": {}, "glow": {}, "material": {}, "font": {}, "spacing": {}},
  "assetRequirements": {"ui": [], "uiRequiredComponents": [], "background": [], "character": []},
  "uiAnalysis": {},
  "backgroundAnalysis": {},
  "characterAnalysis": {},
  "imagePrompts": {"ui": "", "background": "", "character": ""},
  "negativePrompts": []
}

修复规则：
1. 只做结构修复和字段归位，不新增原始返回没有表达的参考图观察。
2. 旧 UI资产分析字段可归入 uiAnalysis、buttonSpec、panelModalSpec、iconItemResourceSpec 和 imagePrompts.ui。
3. 背景、角色、统一性、token、negative prompt 如果原文没有就返回空对象或空数组。
4. 不要新增玩法、界面结构、业务入口、资源、角色或参考图 IP 内容。
5. 如果原始返回包含 uiRequiredComponents、requiredUiAssetComponents、UI资产必需组件或 hard minimum，不要把它们作为总资产 UI 的阻断条件；assetRequirements.uiRequiredComponents 返回空数组或仅保留固定通用控件族摘要。

项目名称：${body.projectName || "未命名小游戏"}
目标平台：${body.platform || "横版 16:9"}
用户生图关键词：${body.styleKeywords || "未填写"}

原始返回内容：
${body.rawContent || ""}`;
}

function buildUiAssetAnalysisPrompt(body) {
  const summaries = Array.isArray(body.imageSummaries) ? body.imageSummaries : [];
  const imageCount = Array.isArray(body.referenceImages) ? body.referenceImages.length : 0;
  const currentScreen = body.currentScreen && typeof body.currentScreen === "object" ? body.currentScreen : {};
  const projectKeywords = Array.isArray(body.projectKeywords) ? body.projectKeywords : [];
  return `请基于参考图、策划案和交互案，生成“项目级 UI资产图”的结构化分析。必须严格返回 JSON 对象：
{
  "keywords": {
    "visualKeywords": ["参考图可迁移的视觉关键词"],
    "uiKeywords": ["按钮/面板/图标/字体等 UI 关键词"],
    "projectThemeKeywords": ["来自当前项目的主题关键词"]
  },
  "palette": {
    "primary": ["主色与使用比例"],
    "accent": ["强调色与使用场景"],
    "background": ["背景/面板底色"],
    "contrastRules": ["明暗、饱和度、可读性规则"]
  },
  "elements": {
    "transferable": ["可迁移的视觉元素，例如描边、投影、分层、网点、发光"],
    "themeBoundElements": ["参考图中不应迁移的原主题元素"],
    "replacementThemeElements": ["当前项目中可替换进资产图的主题元素"],
    "elementReplacementRules": ["原主题元素 → 当前项目主题元素的映射规则"],
    "assetList": ["从策划案/交互案提取出的必须覆盖资产项，不能少于这些项"]
  },
  "componentDemand": {
    "requiredFromPlan": ["策划案/交互案明确要求或项目必然需要的控件类型"],
    "extendableVariants": ["可合理补充的状态变体或辅助控件"],
    "forbiddenUnrelated": ["参考图中存在但当前项目不需要、不得搬入的控件或入口"]
  },
  "referenceComponentStyleLibrary": [
    {
      "componentType": "button/card/panel/tab/nav/resource/progress/badge/icon/input/modal/list/other",
      "observedStyle": "参考图同类控件的具体视觉表现",
      "transferableRules": "可迁移到当前项目控件的形状、描边、材质、色彩、光影、字体规则",
      "replacementBoundary": "哪些原主题内容不能迁移，应该替换成当前项目语义"
    }
  ],
  "buttonMorphology": {
    "silhouette": ["主按钮、Tab、入口按钮的整体外轮廓"],
    "cornerProfile": ["圆角大小、位置和对称性，使用 micro/small/medium/large/pill 相对等级"],
    "segmentation": ["左图标腔、文字区、右角标、顶部凸起、底部阴影等分段结构"],
    "edgeProfile": ["描边厚度、斜切、弧形拼接、缺口、尖角、内外边等边缘结构"],
    "materialLayers": ["底色、纹理、描边、高光、内阴影、投影层"],
    "ornamentSlots": ["红点、礼物、徽章、尖角、角花等角标或装饰插槽"],
    "stateVariants": ["默认、选中、禁用、可领取、红点等状态差异"],
    "negativeSimplifications": ["禁止简化为普通圆角矩形、长圆角按钮或默认网页胶囊"],
    "promptText": "资产图生成时必须复用的按钮形态与圆角执行说明"
  },
  "styleFidelityTargets": {
    "colorRatio": ["主色/辅助色/强调色比例与使用位置"],
    "shapeLanguage": ["面板轮廓、圆角、斜切、裁切、卡片比例"],
    "materialTexture": ["纸质、金属、玻璃、磨砂、木纹、渐变、颗粒等材质证据"],
    "strokeShadow": ["描边厚度、内外阴影、高光、投影、发光规则"],
    "typography": ["标题/正文/数字字体气质、粗细、描边或阴影"],
    "decorativeRhythm": ["纹样、角花、红点、标签、点状节奏和装饰密度"],
    "pointLinePlane": ["点/线/面比例，线性分隔和面板重量"]
  },
  "referenceStyleAnchors": [
    {
      "target": "button/card/panel/tab/nav/resource/progress/badge/icon/input/modal/list/other",
      "referenceEvidence": "参考图里可观察到的同类或近似控件证据",
      "transferRule": "生成当前项目同类控件时必须迁移的视觉规则",
      "doNotChange": "不得迁移的原主题内容或不得泛化的方向"
    }
  ],
  "antiGenericRules": ["防止资产图退化成通用风格的具体禁止项"],
  "assetSheetStyleLocks": {
    "mustKeep": ["UI资产图必须保留的参考图风格特征"],
    "mustAvoid": ["UI资产图必须避免的通用化偏差"],
    "styleDistanceWarnings": ["如果出现这些迹象，说明资产图已经偏离参考图"]
  },
  "style": {
    "material": "材质与质感规则",
    "shapeRules": ["按钮、卡片、面板、图标底板形状规则"],
    "iconRules": ["图标绘制语言与语义替换规则"],
    "buttonRules": ["主/次/弱/禁用按钮层级规则"],
    "panelRules": ["面板、弹窗、卡片、列表容器规则"],
    "typographyRules": ["字体气质、字号层级、描边或阴影规则"],
    "lightingRules": ["光影、发光、阴影、氛围规则"],
    "forbiddenShapes": ["参考图不支持或当前项目不应使用的形状"],
    "forbiddenContent": ["禁止出现在资产图和后续界面的内容"]
  },
  "themeBoundElements": ["同 elements.themeBoundElements"],
  "replacementThemeElements": ["同 elements.replacementThemeElements"],
  "elementReplacementRules": ["同 elements.elementReplacementRules"],
  "assetSheetPrompt": "一段可直接指导生图模型生成 UI Asset Sheet 的中文提示词，180-320字"
}

分析顺序硬约束：
1. 先写 keywords：提炼参考图整体关键词、UI关键词和当前项目主题关键词。
2. 再写 palette：明确主色、强调色、背景色、比例和可读性规则。
3. 再写 elements：区分可迁移视觉元素、不可迁移主题元素、当前项目替换元素。
4. 再写 componentDemand：从策划案/交互案中提取控件需求下限，并给出合理延伸边界。
5. 再写 referenceComponentStyleLibrary：从参考图中提取同类型控件风格样本，用于后续画风迁移。
6. 再写 buttonMorphology：专门拆解主按钮、Tab、活动入口和导航按钮的外轮廓、圆角比例、角部结构、分段、描边、材质和状态。
7. 再写 styleFidelityTargets / referenceStyleAnchors / antiGenericRules / assetSheetStyleLocks：把参考图风格锁成可执行规则。
8. 最后写 style：输出能约束资产图的材质、形状、图标、按钮、面板、字体、光影规则。

可迁移内容：配色比例、材质、描边、按钮形态、图标绘制语言、光影、字体气质、信息密度。
不可迁移内容：参考图原主题角色、IP、商标、原文字、特定道具、主题货币图案、原游戏符号。
替换原则：所有主题符号都必须替换为当前策划案/交互案里的游戏主题元素；没有明确元素时使用中性系统图标，不凭空添加新系统。
控件来源原则：策划案和交互案决定 UI 资产图的控件需求下限，生成结果不能少于这些需求；AI 可以补充服务当前项目的状态变体和辅助控件，但不得因为参考图里出现某业务入口、资源栏、导航或系统按钮就强行加入当前项目。
同类型迁移原则：参考图负责提供画风、材质、构图语言和同类型控件样式。每个资产项都要优先匹配参考图中的同类或近似控件进行迁移；找不到足够同类证据时，必须在分析结果中标记缺失并建议补充参考图，不要改用默认画风。
风格贴合原则：UI资产图的第一优先级是贴近参考图控件视觉语言。必须写清主色比例、辅助色、面板轮廓、按钮材质、描边、字体、装饰节奏、点线面比例和信息密度。
按钮形态原则：buttonMorphology 必须使用 micro/small/medium/large/pill 描述圆角相对比例，并说明圆角位置、混合圆角、斜切、凸起、缺口、图标腔、角标插槽、描边和材质层；禁止只写“长圆角矩形”。
反通用原则：除非参考图本身就是对应风格，否则禁止把资产图写成通用 Q版、宠物模拟器奶油拟物、现代网页扁平卡片、默认柔和圆角或泛化卡通 UI。

项目名称：${body.projectName || "未命名小游戏"}
目标平台：${body.platform || "横版 16:9"}
当前选中界面：${currentScreen.name || "未指定"} / ${currentScreen.kind || "generic"}
当前界面目标：${currentScreen.goal || "未提供"}
参考图数量：${imageCount}
用户生图关键词：${body.styleKeywords || "未填写"}
已有画风迁移关键词：${body.styleTransferKeywords || "无"}
项目关键词：${projectKeywords.join("、") || "无"}

完整策划案：
${body.gameDesign || "无"}

完整交互设计案：
${body.interactionPlan || "无"}

当前界面交互段落：
${body.currentScreenPlan || "无"}

参考图特征摘要：
${JSON.stringify(summaries, null, 2)}`;
}

function buildUiAssetJsonRepairPrompt(body) {
  return `请把下面“原始返回内容”修复为合法 JSON 对象，只返回 JSON，不要 Markdown。

目标 JSON schema：
{
  "keywords": {
    "visualKeywords": [],
    "uiKeywords": [],
    "projectThemeKeywords": []
  },
  "palette": {
    "primary": [],
    "accent": [],
    "background": [],
    "contrastRules": []
  },
  "elements": {
    "transferable": [],
    "themeBoundElements": [],
    "replacementThemeElements": [],
    "elementReplacementRules": [],
    "assetList": []
  },
  "componentDemand": {
    "requiredFromPlan": [],
    "extendableVariants": [],
    "forbiddenUnrelated": []
  },
  "referenceComponentStyleLibrary": [
    {
      "componentType": "",
      "observedStyle": "",
      "transferableRules": "",
      "replacementBoundary": ""
    }
  ],
  "buttonMorphology": {
    "silhouette": [],
    "cornerProfile": [],
    "segmentation": [],
    "edgeProfile": [],
    "materialLayers": [],
    "ornamentSlots": [],
    "stateVariants": [],
    "negativeSimplifications": [],
    "promptText": ""
  },
  "styleFidelityTargets": {
    "colorRatio": [],
    "shapeLanguage": [],
    "materialTexture": [],
    "strokeShadow": [],
    "typography": [],
    "decorativeRhythm": [],
    "pointLinePlane": []
  },
  "referenceStyleAnchors": [
    {
      "target": "",
      "referenceEvidence": "",
      "transferRule": "",
      "doNotChange": ""
    }
  ],
  "antiGenericRules": [],
  "assetSheetStyleLocks": {
    "mustKeep": [],
    "mustAvoid": [],
    "styleDistanceWarnings": []
  },
  "style": {
    "material": "",
    "shapeRules": [],
    "iconRules": [],
    "buttonRules": [],
    "panelRules": [],
    "typographyRules": [],
    "lightingRules": [],
    "forbiddenShapes": [],
    "forbiddenContent": []
  },
  "themeBoundElements": [],
  "replacementThemeElements": [],
  "elementReplacementRules": [],
  "assetSheetPrompt": ""
}

修复规则：
1. 保留原始返回中与 UI资产分析有关的信息。
2. 不要保留 Markdown 标题、代码块标记、解释性前后文。
3. 缺失字段用空数组或空字符串补齐。
4. componentDemand 必须体现策划案/交互案决定的控件需求下限，不能用参考图控件清单替代。
5. referenceComponentStyleLibrary 只记录参考图里的同类型控件风格样本，不把参考图业务入口当成当前项目控件需求。
6. 如果原始返回把按钮形态写成 buttonShape、buttonCornerProfile、mainButtonMorphology、按钮形态、主按钮形态、按钮圆角，请归入 buttonMorphology。
7. buttonMorphology 只保留原始返回中已经表达的按钮轮廓、圆角等级、角部结构、分段、描边、材质和状态；不要凭空编造。
8. styleFidelityTargets、referenceStyleAnchors、antiGenericRules、assetSheetStyleLocks 必须保留原始返回里关于参考图贴合度、同类控件证据和反通用偏差的内容；没有就用空数组或空字符串，不要编造。
9. assetSheetPrompt 必须是 180-320 字中文提示词，指导生图模型生成强贴参考图视觉语言的干净可复用 UI Asset Sheet。

项目名称：${body.projectName || "未命名小游戏"}
目标平台：${body.platform || "横版 16:9"}
用户生图关键词：${body.styleKeywords || "未填写"}

原始返回内容：
${body.rawContent || ""}`;
}

function buildDesignCompositionJsonRepairPrompt(body) {
  const screen = body.screen && typeof body.screen === "object" ? body.screen : {};
  const schema = {
    screenGoal: "",
    requiredComponents: [],
    optionalComponents: [],
    forbiddenComponents: [],
    layoutSlots: [],
    primaryActions: [],
    stateWidgets: [],
    systemEntrances: [],
    persistentAnchors: [],
    titlePolicy: "",
    anchorExceptions: [],
    resourceBarPolicy: "none",
    negativePromptRules: []
  };

  return `Repair the original model output into a strict JSON object for current-screen UI composition analysis.

Output requirements:
- Return only one valid JSON object.
- Do not wrap it in Markdown or code fences.
- Preserve the minimum component requirements supported by the game design document, interaction plan, current screen section, editable SVG/visual-analysis, or local visual summary.
- You may preserve reasonable state variants or helper controls only when they serve those requirements; do not add generic mobile-game navigation, mail, announcement, favorite, home, setting, close, back, resource bars, or buttons unless the current screen sources explicitly support them.
- UI asset images define visual style only; they are not a component inventory.
- Use this exact top-level schema and keep every key:
${JSON.stringify(schema, null, 2)}

Field rules:
- requiredComponents / optionalComponents / forbiddenComponents / layoutSlots / primaryActions / stateWidgets / systemEntrances must be arrays of objects where possible.
- Each component object should include at least name, type, reason, source, and priority when recoverable.
- persistentAnchors must include fixed cross-screen controls such as back, close, settings, resource, bottom navigation and title when supported by the current screen sources.
- titlePolicy must state whether the current screen follows the unified primary-screen title zone or is a documented special composition.
- negativePromptRules must be an array of concise strings for the image-generation prompt.
- If a field cannot be recovered, return an empty array or "none"; do not invent unrelated systems.

Project: ${body.projectName || "Untitled game"}
Platform: ${body.platform || "16:9"}
Current screen: ${screen.name || "Target screen"} (${screen.kind || "generic"})
Current screen goal: ${screen.goal || ""}
Current screen close behavior: ${screen.closeBehavior || "not specified; infer only from current screen interaction section"}

Original invalid output:
${body.rawContent || ""}

Game design document:
${body.brief || ""}

Interaction design plan:
${body.interactionPlan || ""}

Current screen interaction section:
${body.currentScreenPlan || ""}

Editable SVG / visual-analysis / local visual summary:
${JSON.stringify(body.visualStructure || body.localVisual || {}, null, 2)}`;
}

function buildDesignCompositionAnalysisPrompt(body) {
  const screen = body.screen && typeof body.screen === "object" ? body.screen : {};
  const screens = Array.isArray(body.screens) ? body.screens : [];
  const screenLines = screens
    .map((item, index) => {
      const closeBehavior = item.closeBehavior ? `；关闭方式=${item.closeBehavior}` : "";
      return `${index + 1}. ${item.name || "目标界面"}（${item.kind || "generic"}）：${item.goal || ""}${closeBehavior}`;
    })
    .join("\n");
  const currentCloseBehavior = screen.closeBehavior || "未在目标界面清单中明确；必须从当前交互段落推断，不能默认加返回/关闭/主页控件。";

  return `请为当前界面做“视觉设计稿生成前的组件裁剪分析”。输出必须是一个严格 JSON 对象，不要 Markdown、代码块或解释。

JSON schema：
{
  "screenGoal": "当前界面一句话目标",
  "requiredComponents": [
    {"name": "必须出现的组件名", "type": "title/resource/tab/list/card/button/panel/modal/state/nav/input/icon/other", "reason": "为什么必须出现", "source": "来自策划案/交互案/SVG 的证据", "priority": "must"}
  ],
  "optionalComponents": [
    {"name": "可选组件名", "type": "组件类型", "reason": "只有满足什么条件才出现", "source": "证据", "priority": "optional"}
  ],
  "forbiddenComponents": [
    {"name": "禁止出现的组件或入口", "type": "nav/button/resource/system/icon/other", "reason": "为什么当前界面不应出现", "source": "未被当前界面文档支持"}
  ],
  "layoutSlots": [
    {"name": "布局区域名", "type": "top/left/center/right/bottom/modal", "reason": "区域承载内容", "source": "证据"}
  ],
  "primaryActions": [
    {"name": "主操作按钮/动作", "type": "button/action", "reason": "主流程用途", "source": "证据"}
  ],
  "stateWidgets": [
    {"name": "状态/反馈组件", "type": "progress/badge/empty/loading/locked/reward/error", "reason": "状态用途", "source": "证据"}
  ],
  "systemEntrances": [
    {"name": "系统入口", "type": "nav/entry", "reason": "是否显示及依据", "source": "证据", "priority": "show/hide"}
  ],
  "persistentAnchors": [
    {"name": "跨界面固定控件", "type": "back/close/settings/home/resource/title", "reason": "为什么需要固定位置", "source": "证据", "priority": "fixed/optional"}
  ],
  "titlePolicy": "说明当前页面标题是沿用统一标题区，还是允许特殊标题构图",
  "anchorExceptions": ["只有哪些特殊页面允许偏离项目级固定锚点"],
  "resourceBarPolicy": "none/minimal/full，并说明当前界面是否需要资源栏、需要哪些资源、证据是什么",
  "negativePromptRules": ["给生图模型的负向规则，例如不要出现设置/邮件/主页/公告等无关入口"]
}

分析硬规则：
1. 完整策划案、交互设计案、当前界面交互段落、当前界面可编辑 SVG/visual-analysis 决定控件需求下限；requiredComponents 不能少于这些资料中当前页面必需的控件。
2. UI资产图只决定控件视觉风格，不决定当前界面应该出现哪些按钮、图标、资源栏或系统入口。
3. requiredComponents 必须是当前界面完成目标不可缺少的组件；optionalComponents 可以补充服务同一目标的状态变体、辅助控件和合理扩展，但不要为了画面丰富而添加无关导航按钮。
4. forbiddenComponents 必须明确列出当前界面不该出现的常见误加组件。除非当前界面文档或“当前界面关闭方式”明确要求，否则默认禁止：返回、关闭、主页、设置、帮助、邮件、公告、收藏、一排通用导航图标、无关活动入口、无关商店入口。
5. 每日任务界面通常可以有任务页标题、任务分类、任务列表、任务进度、活跃奖励、领取/前往按钮；不应自动出现返回、关闭、主页、设置、帮助、邮件、公告、收藏等。
6. 商店界面通常可以有分类 Tab、商品卡、详情区、价格、购买/取消/资源不足状态；不应出现任务、邮件、公告、收藏等无关入口。
7. 主界面 HUD 可以有资源栏和核心系统入口，但入口数量和名称必须来自策划案/交互案，不能复制 UI资产里的全部图标。
8. 如果当前资料不足，只能输出保守的必要组件和明确负向规则，不要用默认手游模板补齐。
9. 必须根据“当前界面关闭方式”额外判断跨界面通用锚点：返回、关闭、设置、主页、顶部资源栏、主标题哪些需要出现；如果关闭方式写明无关闭入口/无返回，则必须把返回、关闭、主页列入 forbiddenComponents 或 negativePromptRules。
10. titlePolicy 必须明确说明：当前页面标题是沿用统一标题区，还是属于活动主视觉页/剧情页/登录页等特殊构图。
11. anchorExceptions 只列真正允许打破通用锚点的特殊界面类型；普通列表、详情、任务、商店、设置等功能页默认不允许随意漂移返回按钮、设置按钮、资源栏和主标题。

项目名称：${body.projectName || "未命名小游戏"}
目标平台：${body.platform || "界面：横版（16:9）"}
当前界面：${screen.name || "目标界面"}（${screen.kind || "generic"}）
当前界面目标：${screen.goal || ""}
当前界面关闭方式：${currentCloseBehavior}
全部目标界面：
${screenLines || "暂无"}

完整策划案：
${body.brief || ""}

交互设计案：
${body.interactionPlan || ""}

当前界面交互段落：
${body.currentScreenPlan || ""}

当前界面可编辑 SVG / visual-analysis 结构：
${JSON.stringify(body.visualStructure || body.localVisual || {}, null, 2)}
`;
}

function buildGameDesignPrompt(body) {
  return `请把下面的玩法大纲扩写成一份专业且详细的小游戏策划案。适合结构化呈现的内容必须使用 Markdown 表格。

输出结构必须包含：
# 项目名称 游戏策划案
## 1. 项目概述
### 1.1 游戏名称
### 1.2 游戏介绍
### 1.3 类型定位
### 1.4 目标玩家
## 2. 核心玩法
### 2.1 玩家目标
### 2.2 核心循环
### 2.3 关键操作
### 2.4 失败/成功反馈
## 3. 系统设计
### 3.1 主界面与导航
### 3.2 核心玩法系统
### 3.3 成长/收集/任务系统
### 3.4 商店/资源/经济系统
## 4. 玩家留存方式
### 4.1 短期留存
### 4.2 中期留存
### 4.3 长期留存
## 5. 主要界面清单
主要界面清单必须使用以下固定 6 列表头：
| 界面名称 | 界面目标 | 入口来源 | 核心操作 | 关键状态 | 界面关闭方式 |
| --- | --- | --- | --- | --- | --- |
每一行都必须填写“界面关闭方式”，不能输出旧 5 列表格，不能写“待定”“按需调整”。

## 6. 美术与音频方向
## 7. MVP 范围
## 8. 后续拓展计划

项目名称：${body.projectName || "未命名小游戏"}
目标平台：${body.platform || "界面：横版（16:9），建议基准画板 1920 × 1080"}
输出深度：${body.depth || "标准方案"}
方案语气：${body.tone || "专业评审风格"}
补充要求：${body.extraNeeds || "暂无"}

玩法大纲：
${body.outline || body.brief || ""}`;
}

function buildVisualAnalysisPrompt(body) {
  const screen = body.screen || {};
  const screens = Array.isArray(body.screens) ? body.screens : [];
  const visualRequirements = String(body.visualRequirements || "").trim();
  const retryIssues = Array.isArray(body.retryIssues)
    ? body.retryIssues.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
  const retryInstruction = retryIssues.length
    ? [
        "",
        `重试修正要求（第 ${Math.max(1, Number(body.retryAttempt || 1))}/${Math.max(1, Number(body.retryMaxAttempts || 3))} 次重试）：`,
        "上一版 SVG 结构分析未覆盖或违规以下项目，请重新输出完整 JSON，不要只补片段：",
        retryIssues.map((item, index) => `${index + 1}. ${item}`).join("\n")
      ].join("\n")
    : "";
  const screenLines = screens
    .map((item, index) => {
      const closeBehavior = item.closeBehavior ? `；关闭方式=${item.closeBehavior}` : "";
      return `${index + 1}. ${item.name || "目标界面"}（${item.kind || "generic"}）：${item.goal || ""}${closeBehavior}`;
    })
    .join("\n");
  const currentCloseBehavior = screen.closeBehavior || "未在目标界面清单中明确；从当前交互段落推断。";

  return `请为指定界面补全可编辑交互 SVG 所需的结构化分析。
输出必须是一个 JSON 对象，格式如下：
{
  "layoutType": "main/home/shop-grid/list-detail/task-progress/form-flow/default",
  "goal": "一句话页面目标",
  "closeBehavior": "当前界面关闭/返回方式、触发条件和目标界面",
  "annotations": [
    {"title": "布局结构", "body": "70字以内，说明主要区域和信息层级"},
    {"title": "关键交互", "body": "70字以内，说明主操作路径和跳转"},
    {"title": "状态与异常", "body": "70字以内，覆盖默认、空、加载、禁用、资源不足、成功、失败等适用状态"},
    {"title": "交付关注", "body": "70字以内，说明按钮状态、字段、埋点或程序关注点"}
  ],
  "layoutRegions": [
    {"name": "区域名称", "slot": "top/left/center/right/bottom/modal", "priority": "primary/secondary/utility", "role": "区域职责", "elements": ["区域内真实元素"], "state": "默认/空/加载/异常等"}
  ],
  "components": [
    {"name": "组件名称", "type": "button/tab/card/panel/input/resource/nav/modal/badge", "belongsTo": "所属区域名称", "anchor": "top-left/top-right/center/bottom-nav", "purpose": "组件用途", "states": ["default", "disabled"]}
  ],
  "primaryAction": {"label": "主操作按钮文案", "belongsTo": "所属区域名称", "state": "default/disabled/loading", "result": "点击后的结果"},
  "forbiddenComponents": ["当前界面不允许出现的组件或入口"],
  "flows": ["用户从入口到完成目标的操作路径"],
  "handoffNotes": ["action_id、字段、埋点、边界条件、程序关注点"],
  "terms": ["用于界面结构稿的真实内容词1", "真实内容词2", "真实内容词3", "真实内容词4", "真实内容词5", "真实内容词6"],
  "states": ["default", "loading", "empty", "disabled", "locked", "insufficient", "success", "error"],
  "fieldIds": ["action_xxx", "state_xxx", "resource_xxx"]
}

要求：
1. annotations 必须正好 4 条，且标题尽量短。
2. layoutRegions 输出 3-6 条；components 输出 4-10 条；flows 输出 2-5 条；handoffNotes 输出 3-6 条。
3. 所有内容必须来自完整策划案、交互设计案、当前界面交互段落或当前 SVG 结构摘要。
4. 如果没有明确对象，只能使用“内容A/功能入口A/资源A”等中性占位；不要出现输入中没有的小鱼干、宠物、金币等具体词。
5. 当前界面名称必须优先使用“当前界面”的中文显示名，不要把 id 或 kind 当作页面名称。
6. closeBehavior 必须继承当前界面关闭方式；若未明确，只能根据当前界面段落推断，不能默认加返回/关闭。
7. layoutType 必须贴合当前界面职责；slot/priority/belongsTo/anchor 必须能直接驱动 SVG 布局。
8. forbiddenComponents 用来约束当前界面不该出现的返回、主页、商店、活动、设置等无关入口。
9. 不要输出同类游戏参考、视觉风格、生图建议或无关默认模板。
10. 输出仅 JSON。

项目名称：${body.projectName || "未命名小游戏"}
目标平台：${body.platform || "界面：横版（16:9）"}
当前界面：${screen.name || "目标界面"}（${screen.kind || "generic"}）
当前界面目标：${screen.goal || ""}
当前界面关闭方式：${currentCloseBehavior}
当前 SVG 要求：${visualRequirements || "暂无"}
全部目标界面：
${screenLines || "暂无"}

完整策划案：
${body.brief || ""}

交互设计案：
${body.interactionPlan || ""}

当前界面交互段落：
${body.currentScreenPlan || ""}

当前本地 SVG 初稿信息，仅作兜底参考：
${JSON.stringify(body.visualStructure || body.localVisual || {})}
${retryInstruction}`;
}

function buildInteractionPrompt(body) {
  const screens = Array.isArray(body.screens) ? body.screens : [];
  const keywords = Array.isArray(body.keywords) ? body.keywords.join("、") : "";
  const genre = body.genre || {};
  const retryInstruction = buildMissingHeadingsRetryInstruction(body, "交互案");

  return `请基于下面的完整游戏策划案生成专业界面交互设计方案。页面清单、按钮层级、状态规范、程序字段等内容优先用 Markdown 表格表达。

输出要求：
- 使用中文 Markdown。
- 不输出 SVG，不输出视觉图，不输出代码。
- 每个目标界面都要写到。
- 页面命名必须优先使用“目标界面”列表。
- 每个页面必须包含：页面目标、入口来源、布局结构、关键交互、状态反馈、异常状态、按钮层级、关闭/返回方式、交付建议。
- 每个页面必须继承目标界面中的“关闭方式”，写清关闭/返回控件、触发条件、返回目标界面和异常处理；不得给所有页面套用同一个返回/关闭按钮。
- “关闭/返回方式”必须作为每个页面自己的 #### 小节输出，不要只写在信息架构总表里。
- 关闭方式为“无关闭入口/无返回/默认根界面”时，该页面小节必须明确禁止返回、关闭、主页控件。
- 关闭方式为“返回主界面/返回上一层”时，该页面小节必须明确返回按钮、触发条件和返回目标。
- 关闭方式为“关闭后返回来源界面/弹窗关闭”时，该页面小节必须明确关闭按钮、触发条件、来源栈为空时的兜底目标和异常处理。

建议结构：
# 项目名称 专业交互设计方案
## 1. 项目理解
### 1.1 项目定位
### 1.2 设计目标
### 1.3 输出规格
### 1.4 同类产品参考方向
## 2. 信息架构
## 3. 核心流程
## 4. 页面交互设计
### 4.x 页面名称
#### 页面目标
#### 入口来源
#### 布局结构
#### 关键交互
#### 状态反馈
#### 异常状态
#### 按钮层级
#### 关闭/返回方式
#### Figma 交付建议
## 5. 状态规范
## 6. 设计交付物

项目名称：${body.projectName || "未命名小游戏"}
目标平台：${body.platform || "界面：横版（16:9），建议基准画板 1920 × 1080"}
输出深度：${body.depth || "标准方案"}
方案语气：${body.tone || "专业评审风格"}
识别关键词：${keywords || "暂无"}
识别类型：${genre.label || "未识别"}
类型参考原则：${Array.isArray(genre.principles) ? genre.principles.join("；") : ""}

目标界面：
${screens.map((screen, index) => {
  const details = [
    screen.goal || "",
    screen.entrySource ? `入口=${screen.entrySource}` : "",
    screen.coreAction ? `核心操作=${screen.coreAction}` : "",
    screen.keyState ? `关键状态=${screen.keyState}` : "",
    screen.closeBehavior ? `关闭方式=${screen.closeBehavior}` : ""
  ].filter(Boolean).join("；");
  return `${index + 1}. ${screen.name}（${screen.kind}）：${details}`;
}).join("\n") || "暂无明确目标界面，请从策划案推导 5-8 个主要界面。"}

补充要求：
${body.extraNeeds || "暂无"}
${retryInstruction}

玩法大纲原文：
${body.outline || ""}

完整策划案：
${body.brief || ""}

本地规则初稿，仅作参考：
${body.localPlan || ""}

关闭/返回方式小节内容要求：
- 关闭方式：复述目标界面的“界面关闭方式”原文。
- 关闭/返回控件：写明返回按钮、关闭按钮、主页按钮或“不显示返回/关闭/主页控件”。
- 触发条件：写明点击哪个控件或完成哪个流程后触发。
- 返回目标：写明返回主界面、来源界面、上一层、下一关/下一流程或停留当前根界面。
- 异常处理：写明未保存、来源栈缺失、网络提交中、动画/奖励未完成等情况下如何拦截或兜底。`;
}

function extractOpenAIText(data) {
  if (typeof data.output_text === "string") return data.output_text;

  const chunks = [];
  for (const item of data.output || []) {
    if (item.type === "message") {
      for (const content of item.content || []) {
        if (content.type === "output_text" && content.text) {
          chunks.push(content.text);
        }
      }
    }
  }

  return chunks.join("\n");
}

function extractBabylonText(data) {
  if (typeof data === "string") return data;
  if (!data || typeof data !== "object") return "";

  const directFields = [
    data.output_text,
    data.text,
    data.content,
    data.message,
    data.response,
    data.result
  ];

  for (const field of directFields) {
    if (typeof field === "string" && field.trim()) return field;
  }

  if (typeof data.data === "string") return data.data;
  if (data.data && typeof data.data === "object") {
    const nested = extractBabylonText(data.data);
    if (nested) return nested;
  }

  if (Array.isArray(data.choices)) {
    const choiceText = data.choices
      .map((choice) => choice.message?.content || choice.delta?.content || choice.text || "")
      .filter(Boolean)
      .join("\n");
    if (choiceText) return choiceText;
  }

  if (Array.isArray(data.output)) {
    const outputText = data.output
      .map((item) => extractBabylonText(item))
      .filter(Boolean)
      .join("\n");
    if (outputText) return outputText;
  }

  if (Array.isArray(data.content)) {
    return data.content
      .map((item) => (typeof item === "string" ? item : item.text || item.content || ""))
      .filter(Boolean)
      .join("\n");
  }

  return "";
}

function extractErrorMessage(data) {
  if (!data) return "";
  return data.error?.message || data.message || data.error || "";
}

function formatBabylonTextError(data, status, rawText = "") {
  const root = data && typeof data === "object" ? data : {};
  const error = root.error && typeof root.error === "object" ? root.error : {};
  const code = root.code || error.code || root.error_code || "";
  const message = root.message || error.message || extractErrorMessage(root) || "";
  const retryable = root.retryable ?? error.retryable;
  const parts = [`Babylon text request failed: ${status}`];
  if (code) parts.push(`code: ${code}`);
  if (message && message !== code) parts.push(`message: ${message}`);
  if (retryable !== undefined) parts.push(`retryable: ${Boolean(retryable)}`);
  if (!code && !message && rawText) parts.push(`detail: ${String(rawText).slice(0, 500)}`);
  return parts.join("; ");
}
