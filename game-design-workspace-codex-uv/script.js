const sampleBrief = `游戏名称：口袋萌宠
类型：治愈系宠物养成模拟小游戏
目标玩家：喜欢可爱宠物、休闲养成、轻收集体验的学生和年轻用户
核心循环：登录游戏 → 查看宠物状态 → 喂食、清洁、玩耍 → 获得金币和好感度 → 购买食物、玩具、装饰 → 解锁图鉴和皮肤
核心系统：主界面、商店、宠物图鉴、背包、任务、宠物详情
宠物状态：饥饿、脏污、无聊、开心、睡眠
经济系统：金币用于购买食物、玩具和装饰；爱心用于购买稀有皮肤和加速
美术风格：治愈、明亮、马卡龙色、轻手绘、干净直角界面
MVP范围：一个可互动宠物、喂食、清洁、好感度、商店雏形`;

let screens = [];
const runningButtonTasks = new Map();

const TOTAL_ASSET_DESIGN_SCREEN_ID = "__total_asset__";
const UI_ASSET_DESIGN_SCREEN_ID = TOTAL_ASSET_DESIGN_SCREEN_ID;
const TOTAL_ASSET_PROMPT_VERSION = "total-asset-style-fidelity-strict-v6-universal-ui-taxonomy";
const REFERENCE_EVIDENCE_TIMEOUT_MS = 120000;
const TOTAL_ASSET_ANALYSIS_TIMEOUT_MS = 180000;
const TOTAL_ASSET_IMAGE_TIMEOUT_MS = 360000;
const TOTAL_ASSET_IMAGE_MAX_RETRIES = 3;
const DESIGN_COMPOSITION_ANALYSIS_TIMEOUT_MS = 30000;
const DESIGN_COMPOSITION_REPAIR_TIMEOUT_MS = 30000;
const DESIGN_DRAFT_IMAGE_TIMEOUT_MS = 180000;
const SCREEN_DIRECT_IMAGE_TIMEOUT_MS = 600000;
const DESIGN_REFERENCE_LIMIT = 2;
const DESIGN_DRAFT_REFERENCE_LIMIT = 5;
const DESIGN_DRAFT_REFERENCE_EXPERIMENT = true;
const DESIGN_DRAFT_FALLBACK_MODEL = "gemini-3.1-flash-image-preview";
const LOCKED_DOCS_STORAGE_KEY = "gameUxBoard.lockedDocs.v1";
const VISUAL_SVG_LOCK_STORAGE_KEY = "gameUxBoard.lockedVisualSvg.v1";
const TOTAL_ASSET_LOCK_STORAGE_KEY = "gameUxBoard.lockedTotalAsset.v1";
const DESIGN_DRAFT_LOCK_STORAGE_KEY = "gameUxBoard.lockedDesignDraft.v1";
const DESIGN_DIAGNOSTIC_VERSION = "screen-direct-v1";

function getLocalAccessHint() {
  if (window.location?.origin && /^https?:/i.test(window.location.origin)) {
    return `${window.location.origin}/`;
  }
  return "http://localhost:8787/";
}

const UNIVERSAL_UI_ASSET_TAXONOMY = [
  {
    id: "A",
    label: "Navigation and Close Controls",
    labelZh: "导航与关闭控件",
    items: [
      ["back_button", "Back Button", "返回按钮", "go back"],
      ["close_button", "Close Button", "关闭按钮", "dismiss modal"],
      ["home_button", "Home Button", "主页按钮", "return home"],
      ["settings_button", "Settings Button", "设置按钮", "open settings"],
      ["icon_button", "Help Button", "帮助/说明按钮", "show help"],
      ["icon_button", "Collapse / Expand Button", "折叠/展开按钮", "toggle panel"]
    ]
  },
  {
    id: "B",
    label: "Button Controls",
    labelZh: "按钮控件",
    items: [
      ["button_primary", "Primary Button", "主按钮", "main action"],
      ["button_secondary", "Secondary Button", "次按钮", "secondary action"],
      ["button_weak", "Danger / Cancel Button", "危险/取消按钮", "cancel or risky action"],
      ["button_disabled", "Disabled Button", "禁用按钮", "unavailable action"],
      ["button_primary", "Claim Button", "高亮领取按钮", "collect reward"],
      ["icon_button", "Icon Button", "小型图标按钮", "quick tool action"],
      ["button_primary", "Confirm Bar Button", "长条确认按钮", "confirm action"],
      ["button_disabled", "Default / Pressed / Selected / Disabled / Locked / Reward", "按钮状态", "show button states"]
    ]
  },
  {
    id: "C",
    label: "Containers and Panels",
    labelZh: "容器与面板",
    items: [
      ["panel_card", "Base Panel", "基础面板", "hold content"],
      ["panel_card", "Info Panel", "信息面板", "show details"],
      ["modal", "Modal Frame", "弹窗框体", "focus decision"],
      ["screen_title", "Title Bar", "标题栏", "show screen title"],
      ["screen_title", "Section Header", "分组标题条", "group content"],
      ["panel_card", "Content Card", "内容卡片", "display content item"],
      ["list_item", "List Row", "列表行", "display list entry"],
      ["panel_card", "Empty State Panel", "空状态容器", "show empty state"]
    ]
  },
  {
    id: "D",
    label: "Tabs and Navigation Groups",
    labelZh: "标签与导航组",
    items: [
      ["tab_selected", "Top Tab", "顶部 Tab", "switch top category"],
      ["tab_default", "Side Tab", "侧边 Tab", "switch side category"],
      ["bottom_nav_default", "Bottom Navigation Item", "底部导航按钮", "open main section"],
      ["tab_default", "Segmented Control", "分段选择器", "choose mode"],
      ["tab_selected", "Selected State", "当前选中态", "mark active option"],
      ["tab_default", "Unselected State", "未选中态", "show inactive option"]
    ]
  },
  {
    id: "E",
    label: "Resources and Status Controls",
    labelZh: "资源与状态控件",
    items: [
      ["resource_token", "Resource Token", "资源 Token", "show resource"],
      ["resource_token", "Currency Bar", "货币条", "show currency"],
      ["progress_bar", "Energy Bar", "体力/能量条", "show energy"],
      ["progress_bar", "Progress Bar", "进度条", "show progress"],
      ["progress_bar", "Level Progress", "等级/经验条", "show level progress"],
      ["badge", "Count Badge", "数量徽标", "show count"],
      ["badge", "Notification Dot", "红点提醒", "show notification"],
      ["badge", "Status Tag", "状态标签", "show status"]
    ]
  },
  {
    id: "F",
    label: "Item and Character Info Controls",
    labelZh: "物品与角色信息控件",
    items: [
      ["item_slot", "Item Slot", "道具格", "hold item icon"],
      ["item_slot", "Item Card", "道具卡", "display item reward"],
      ["avatar_frame", "Avatar Frame", "头像框", "frame portrait"],
      ["screen_title", "Nameplate", "角色名牌", "show character name"],
      ["badge", "Rarity / Star Badge", "星级/稀有度标识", "show rarity"],
      ["item_slot", "Reward Slot", "奖励展示格", "display reward"]
    ]
  },
  {
    id: "G",
    label: "Inputs and Feedback Controls",
    labelZh: "输入与提示控件",
    items: [
      ["panel_card", "Search Input", "搜索框", "search content"],
      ["button_secondary", "Stepper", "数字步进器", "adjust number"],
      ["button_secondary", "Toggle", "开关", "turn option on off"],
      ["button_secondary", "Checkbox", "复选框", "select option"],
      ["panel_card", "Dropdown", "下拉选择框", "choose option"],
      ["tooltip", "Tooltip", "Tooltip", "explain detail"],
      ["tooltip", "Toast", "Toast", "temporary feedback"],
      ["tooltip", "Warning Banner", "警告提示条", "warn player"]
    ]
  },
  {
    id: "H",
    label: "Icon Primitives",
    labelZh: "图标基础件",
    items: [
      ["nav_icon", "Arrow Icon", "通用箭头", "show direction"],
      ["resource_icon", "Plus / Minus Icon", "加号/减号", "increase decrease"],
      ["resource_icon", "Lock Icon", "锁", "show locked"],
      ["resource_icon", "Check / Cross Icon", "勾/叉", "confirm or reject"],
      ["resource_icon", "Reward / Chest Icon", "奖励/宝箱", "show reward"],
      ["resource_icon", "Generic Resource Icon", "资源占位图标", "represent resource"],
      ["resource_icon", "Info / Alert Icon", "信息/感叹号", "show info alert"]
    ]
  }
];
const TOTAL_ASSET_TYPES = [
  {
    id: "ui",
    label: "UI控件资产图",
    shortLabel: "UI控件",
    mode: "total-asset-ui",
    fileBase: "ui_asset_sheet",
    promptFile: "ui_asset_prompt.txt",
    summaryFile: "ui_asset_summary.json"
  },
  {
    id: "background",
    label: "背景设定图",
    shortLabel: "背景设定",
    mode: "total-asset-background",
    fileBase: "background_style_board",
    promptFile: "background_prompt.txt",
    summaryFile: "background_summary.json"
  },
  {
    id: "character",
    label: "角色设定图",
    shortLabel: "角色设定",
    mode: "total-asset-character",
    fileBase: "character_style_board",
    promptFile: "character_prompt.txt",
    summaryFile: "character_summary.json"
  }
];
const DEFAULT_DESIGN_DRAFT_ASSET_REFERENCE_SELECTION = {
  ui: true,
  background: true,
  character: true
};

function createEmptyTotalAssetPart() {
  return {
    status: "idle",
    imageUrl: "",
    referenceDataUrl: "",
    prompt: "",
    files: [],
    analysis: null,
    error: ""
  };
}

function createEmptyTotalAssetKit() {
  return {
    status: "idle",
    requestId: "",
    referenceSignature: "",
    referenceSourceSignature: "",
    referenceRequestInfo: null,
    styleKeywords: "",
    imageModel: "",
    analysis: null,
    evidenceProgress: [],
    currentAssetType: "",
    currentAssetStartedAt: 0,
    updatedAt: 0,
    dirty: false,
    dirtyReason: "",
    error: "",
    ui: createEmptyTotalAssetPart(),
    background: createEmptyTotalAssetPart(),
    character: createEmptyTotalAssetPart()
  };
}

const screenTypeProfiles = {
  main: {
    label: "主界面",
    goal: "作为玩家进入游戏后的默认落点，承载状态总览、核心操作和系统入口。",
    layout: "顶部为玩家信息、资源和设置入口；中部为当前核心对象或玩法舞台；底部放置一级操作与低频系统入口。",
    interaction: "玩家可从此进入核心玩法、任务、商店、角色、背包等系统；高频操作保持一屏可达，低频入口降低视觉权重。",
    state: "需要覆盖默认、可操作、强提醒、资源不足、入口红点、网络同步中等状态。",
    annotations: [
      { title: "核心落点", body: "主界面负责展示当前目标、资源状态和最重要操作，避免玩家进入后不知道下一步。" },
      { title: "入口层级", body: "一级操作靠近主内容区，商店、背包、任务、设置等低频系统作为次级入口归组展示。" },
      { title: "状态提醒", body: "任务可领取、资源不足、活动开启等信息通过角标、气泡或轻提示表达。" },
      { title: "返回闭环", body: "其他系统页完成操作后应回到主界面，并保留下一步目标提示。" }
    ]
  },
  gameplay: {
    label: "核心玩法界面",
    goal: "承载游戏最主要的操作过程、实时反馈和胜负目标。",
    layout: "中部为玩法舞台；左侧或底部为移动/选择/操作区；右侧放技能、道具或关键按钮；顶部展示目标、时间、分数、血量等状态。",
    interaction: "核心操作需要低延迟、高可读；技能、道具、暂停、自动、倍速等按钮根据玩法频率分层摆放。",
    state: "需要覆盖准备、进行中、冷却、受击、失败预警、暂停、胜利和失败结算前状态。",
    annotations: [
      { title: "操作优先", body: "核心玩法按钮必须稳定、清晰、可快速触达，避免被活动入口和装饰信息干扰。" },
      { title: "战况反馈", body: "生命、时间、分数、目标进度等关键状态需要常驻并与动画反馈同步。" },
      { title: "异常处理", body: "暂停、断线、失败预警和资源不足等状态应有明确提示与恢复路径。" },
      { title: "节奏控制", body: "自动、倍速、跳过、提示等功能需根据游戏节奏决定是否常驻。" }
    ]
  },
  level: {
    label: "关卡界面",
    goal: "承载关卡选择、解锁进度、难度、奖励预览和进入玩法的路径。",
    layout: "以地图、章节列表或关卡网格为主体；顶部展示章节进度；右侧或弹窗展示关卡详情和奖励。",
    interaction: "点击关卡节点查看目标与消耗；满足条件后进入战斗/挑战；未解锁节点展示条件。",
    state: "关卡包含未解锁、可挑战、已通关、三星/完美、扫荡、限时等状态。",
    annotations: [
      { title: "进度感", body: "关卡节点需要明确展示已通关、当前可挑战和未解锁路径。" },
      { title: "进入确认", body: "挑战前展示目标、消耗、奖励和推荐战力，避免玩家误入。" },
      { title: "奖励预期", body: "首通、三星、掉落和限时奖励应在进入前可见。" },
      { title: "卡点引导", body: "条件不足时说明缺少等级、体力、道具或前置关卡。" }
    ]
  },
  character: {
    label: "角色界面",
    goal: "承载角色信息、成长、技能、装备和外观管理。",
    layout: "左侧或中部展示角色形象；右侧为属性、技能、装备、升级材料；底部或页签切换成长模块。",
    interaction: "点击页签切换属性、技能、装备、皮肤；升级、穿戴、强化等操作需要二次反馈。",
    state: "角色包含未拥有、可升级、材料不足、已满级、可穿戴、已装备等状态。",
    annotations: [
      { title: "成长信息", body: "等级、属性、战力、技能和装备需要围绕角色展示，减少玩家理解成本。" },
      { title: "操作反馈", body: "升级、强化、穿戴成功后需要数值变化、动效和结果提示。" },
      { title: "材料缺口", body: "材料不足时明确展示缺少数量和获取入口。" },
      { title: "预览机制", body: "皮肤、装备和技能变化应支持预览，确认后再消耗资源。" }
    ]
  },
  inventory: {
    label: "背包界面",
    goal: "承载道具、材料、装备等资产的查看、筛选、使用和出售。",
    layout: "左侧或上方为分类页签；中部为道具网格；右侧为选中道具详情与操作按钮。",
    interaction: "点击道具刷新详情；可使用、合成、出售或跳转获取；高价值道具操作需确认。",
    state: "道具包含新获得、可使用、不可用、已锁定、数量不足、已过期等状态。",
    annotations: [
      { title: "资产管理", body: "分类、筛选和排序需要降低大量道具带来的检索成本。" },
      { title: "选中反馈", body: "点击道具后应高亮选中格，并在详情区说明用途、来源和限制。" },
      { title: "安全操作", body: "出售、分解、消耗稀有道具必须二次确认。" },
      { title: "获取路径", body: "不可用或数量不足时提供获取来源，形成闭环。" }
    ]
  },
  shop: {
    label: "商店界面",
    goal: "承载商品浏览、资源消费、购买确认和充值/获取入口。",
    layout: "顶部展示货币；左侧或顶部为分类；中部商品列表；右侧或弹窗展示商品详情。",
    interaction: "点击商品查看详情，购买前确认价格、数量、库存和限制；资源不足时跳转获取。",
    state: "商品包含可买、限购、售罄、已拥有、折扣、推荐、资源不足等状态。",
    annotations: [
      { title: "购买路径", body: "商品卡、详情、确认和结果反馈形成完整消费闭环。" },
      { title: "资源状态", body: "金币、钻石、体力等货币应常驻，资源不足给出获取入口。" },
      { title: "商品层级", body: "推荐、限时、折扣与普通商品需要视觉层级区分。" },
      { title: "安全确认", body: "高价值商品或真实付费行为必须有明确确认步骤。" }
    ]
  },
  task: {
    label: "任务界面",
    goal: "承载每日目标、成就目标、活跃度和奖励领取。",
    layout: "顶部为任务分类与活跃度；中部任务列表；右侧或底部展示奖励与前往按钮。",
    interaction: "点击前往跳转目标系统；达成后点击领取奖励；批量领取需反馈明细。",
    state: "任务包含未开始、进行中、可领取、已领取、已过期等状态。",
    annotations: [
      { title: "目标驱动", body: "任务文案需要清楚说明玩家要做什么、做到多少和奖励是什么。" },
      { title: "领取反馈", body: "可领取状态使用主按钮和高亮，领取后展示奖励飞入或弹窗。" },
      { title: "跳转闭环", body: "前往按钮应直达目标系统并高亮目标操作。" },
      { title: "长期目标", body: "成就任务承接长期成长，和每日任务形成节奏区分。" }
    ]
  },
  collection: {
    label: "图鉴界面",
    goal: "承载收集进度、未解锁目标、详情预览和长期追求。",
    layout: "顶部展示收集总进度；中部为卡片网格；右侧或弹窗展示详情、来源和奖励。",
    interaction: "点击卡片查看详情；未解锁显示剪影和条件；已收集支持查看故事、属性或奖励。",
    state: "条目包含已解锁、未解锁、可领取奖励、稀有、限时等状态。",
    annotations: [
      { title: "收集目标", body: "总进度和分类进度帮助玩家建立长期目标。" },
      { title: "解锁条件", body: "未解锁内容不应完全隐藏，应保留关键条件和追求方向。" },
      { title: "详情承接", body: "点击条目后展示来源、故事、属性、奖励或关联系统入口。" },
      { title: "奖励回收", body: "收集成就与奖励领取需要形成明确反馈。" }
    ]
  },
  social: {
    label: "社交界面",
    goal: "承载好友、队伍、公会、拜访、聊天或协作玩法入口。",
    layout: "左侧为好友/队伍列表；中部展示对象详情；右侧或底部放互动、邀请、拜访、聊天按钮。",
    interaction: "点击对象查看状态；可邀请、拜访、赠送、聊天或进入协作玩法。",
    state: "对象包含在线、离线、可邀请、已互动、可领取、申请中等状态。",
    annotations: [
      { title: "关系状态", body: "在线、可互动、可领取奖励等状态需要在列表中直接可见。" },
      { title: "互动路径", body: "邀请、拜访、赠送和聊天入口要和对象详情强关联。" },
      { title: "打扰控制", body: "申请、邀请和聊天提醒需控制频率，避免干扰核心玩法。" },
      { title: "奖励边界", body: "社交奖励应轻量明确，不应让玩家误解会损失核心资产。" }
    ]
  },
  generic: {
    label: "系统界面",
    goal: "承载该系统的核心信息展示、筛选、操作和反馈闭环。",
    layout: "顶部展示标题、按界面关闭方式决定的返回/关闭控件与关键资源；中部展示主内容列表或画面；右侧或底部放详情与操作按钮。",
    interaction: "点击列表或卡片查看详情；主按钮执行核心动作；次按钮用于关闭方式要求的返回/关闭、筛选、说明或跳转。",
    state: "需要覆盖默认、选中、可操作、禁用、空状态、错误和完成反馈。",
    annotations: [
      { title: "页面目标", body: "围绕该系统的核心任务组织信息，不堆叠无关入口。" },
      { title: "信息结构", body: "标题、资源、内容区、详情区和操作区需要层级清晰。" },
      { title: "关键交互", body: "核心按钮应清楚表达动作、消耗、目标和结果。" },
      { title: "状态覆盖", body: "空状态、禁用、错误、完成和加载态需要提前定义。" }
    ]
  }
};

const screenKeywordRules = [
  { kind: "main", name: "主界面 HUD", aliases: ["主界面", "主页面", "首页", "主页", "大厅", "主城", "HUD", "核心操作界面"] },
  { kind: "gameplay", name: "核心玩法界面", aliases: ["战斗界面", "对局界面", "玩法界面", "操作界面", "游戏界面", "棋盘界面", "消除界面", "跑酷界面", "射击界面", "演奏界面", "冒险界面"] },
  { kind: "level", name: "关卡界面", aliases: ["关卡界面", "章节界面", "地图界面", "选关界面", "关卡地图", "世界地图", "副本界面"] },
  { kind: "character", name: "角色界面", aliases: ["角色界面", "英雄界面", "卡牌界面", "宠物详情", "伙伴界面", "角色详情", "皮肤界面", "换装界面"] },
  { kind: "inventory", name: "背包界面", aliases: ["背包界面", "仓库界面", "物品界面", "道具界面", "装备界面", "材料界面", "库存界面"] },
  { kind: "shop", name: "商店界面", aliases: ["商店界面", "商城界面", "商店", "商城", "购买界面", "充值界面", "礼包界面"] },
  { kind: "task", name: "任务界面", aliases: ["任务界面", "任务系统", "每日任务", "成就界面", "成就系统", "目标界面", "通行证界面"] },
  { kind: "collection", name: "图鉴界面", aliases: ["图鉴界面", "收集界面", "图鉴系统", "收藏界面", "卡册界面", "怪物图鉴", "宠物图鉴"] },
  { kind: "social", name: "好友界面", aliases: ["好友界面", "好友系统", "社交界面", "公会界面", "队伍界面", "聊天界面", "拜访界面"] },
  { kind: "leaderboard", name: "排行榜界面", aliases: ["排行榜", "排行榜界面", "排名界面", "榜单界面"] },
  { kind: "settings", name: "设置界面", aliases: ["设置界面", "系统设置", "音效设置", "账号设置", "弹出设置"] },
  { kind: "result", name: "结算界面", aliases: ["结算界面", "胜利界面", "失败界面", "奖励结算", "战斗结算"] },
  { kind: "event", name: "活动界面", aliases: ["活动界面", "活动中心", "限时活动", "运营活动"] },
  { kind: "gacha", name: "抽卡界面", aliases: ["抽卡界面", "招募界面", "召唤界面", "卡池界面"] },
  { kind: "room", name: "匹配房间界面", aliases: ["匹配界面", "房间界面", "组队房间", "准备房间"] },
  { kind: "story", name: "剧情界面", aliases: ["剧情界面", "对话界面", "故事界面", "章节剧情", "展开剧情", "隐藏剧情"] },
  { kind: "generic", name: "邮件界面", aliases: ["邮件界面", "邮箱界面", "公告界面"] },
  { kind: "base", name: "基地界面", aliases: ["基地界面", "家园界面", "建造界面", "装饰界面", "经营界面", "农场界面"] },
  { kind: "boss", name: "BOSS挑战界面", aliases: ["BOSS", "Boss", "boss", "首领", "怪物", "BOSS界面", "BOSS挑战", "设计BOSS"] }
];

Object.assign(screenTypeProfiles, {
  boss: {
    label: "BOSS挑战界面",
    goal: "承载强敌信息、剧情铺垫、弱点提示、挑战条件和战前确认。",
    layout: "左侧展示 BOSS 形象、阶段与威胁等级；中部展示剧情/机制提示；右侧展示弱点、奖励、消耗和挑战按钮。",
    interaction: "点击弱点或机制说明查看详情；挑战前确认队伍/道具/体力；失败后提供复战、强化和剧情回看路径。",
    state: "包含未解锁、可挑战、挑战中、阶段转换、狂暴预警、已击败、奖励可领取等状态。",
    annotations: [
      { title: "强敌信息", body: "参考动作/RPG/塔防 BOSS 页，优先展示威胁等级、阶段机制和弱点。" },
      { title: "战前确认", body: "挑战按钮前置队伍、消耗、推荐战力和奖励，避免误进入高成本战斗。" },
      { title: "剧情承接", body: "隐藏剧情、首次遇见、击败后剧情需要和挑战结果形成闭环。" },
      { title: "失败引导", body: "失败后给出强化、换阵容、查看机制等具体下一步。" }
    ]
  },
  story: {
    label: "剧情界面",
    goal: "承载剧情阅读、分支选择、角色对白和关键事件反馈。",
    layout: "中部为剧情画面或插图；底部为对白框；右侧或弹层展示分支选择、回看、跳过和自动播放。",
    interaction: "点击推进文本；分支选择需要明确后果提示；支持跳过、自动、日志回看和关键剧情确认。",
    state: "包含未读、已读、可跳过、自动播放、分支锁定、关键选择确认等状态。",
    annotations: [
      { title: "阅读节奏", body: "参考叙事冒险/视觉小说，底部对白框和分支选择要减少对画面的遮挡。" },
      { title: "分支反馈", body: "分支选择要说明影响范围，重要选择需二次确认或保留回看入口。" },
      { title: "跳过控制", body: "跳过、自动、回看常驻但弱化，避免打断沉浸感。" },
      { title: "剧情奖励", body: "剧情解锁、隐藏线索和奖励需要在节点完成后明确反馈。" }
    ]
  },
  leaderboard: {
    label: "排行榜界面",
    goal: "承载排名、段位、好友对比、奖励预览和冲榜目标。",
    layout: "顶部展示榜单类型与赛季时间；中部为排名列表；右侧展示个人排名、奖励和规则说明。",
    interaction: "切换全服/好友/赛季榜；点击玩家查看资料；点击奖励预览说明段位收益。",
    state: "包含未上榜、排名上升/下降、赛季结算、奖励可领取、数据刷新中等状态。",
    annotations: [
      { title: "排名结构", body: "参考竞技/派对/策略游戏榜单，个人排名与奖励目标需要常驻。" },
      { title: "榜单筛选", body: "全服、好友、周榜、赛季榜切换必须清楚，避免玩家误读排名范围。" },
      { title: "奖励预期", body: "段位奖励和结算时间需要前置展示，形成冲榜动机。" },
      { title: "数据状态", body: "刷新中、未上榜、并列排名和异常数据要有明确展示方式。" }
    ]
  },
  settings: {
    label: "设置界面",
    goal: "承载音画、操作、账号、通知、辅助功能等配置。",
    layout: "左侧为设置分类；右侧为开关、滑杆、下拉选项和危险操作区域；底部保存/恢复默认。",
    interaction: "开关即时生效；重要设置需保存或确认；账号退出、清档等危险操作必须二次确认。",
    state: "包含默认、已修改、保存成功、保存失败、禁用、危险确认等状态。",
    annotations: [
      { title: "分类清晰", body: "参考主流手游/PC 游戏设置页，将画面、声音、操作、账号分组。" },
      { title: "即时反馈", body: "音量、画质、震动等设置修改后需要即时反馈或保存提示。" },
      { title: "危险隔离", body: "退出登录、清除缓存、删除数据等操作单独分区并二次确认。" },
      { title: "可访问性", body: "字幕、色弱、镜头灵敏度等辅助设置建议保留扩展位。" }
    ]
  },
  result: {
    label: "结算界面",
    goal: "承载胜负结果、奖励、评分、成长变化和下一步行动。",
    layout: "顶部强调胜负/评级；中部展示奖励和数据；底部提供再来一次、下一关、返回主界面。",
    interaction: "奖励可逐项展示或跳过；点击下一步进入推荐目标；失败提供复盘与强化入口。",
    state: "包含胜利、失败、完美、首次通关、奖励翻倍、网络同步失败等状态。",
    annotations: [
      { title: "结果优先", body: "参考关卡/战斗游戏结算，胜负、评分和奖励必须第一时间可见。" },
      { title: "成长反馈", body: "经验、道具、解锁和排名变化要形成明确获得感。" },
      { title: "下一步", body: "再挑战、下一关、强化、返回等按钮按玩家最可能动作排序。" },
      { title: "失败复盘", body: "失败时展示原因与提升路径，减少挫败感。" }
    ]
  },
  event: {
    label: "活动界面",
    goal: "承载限时玩法、奖励进度、活动规则和参与入口。",
    layout: "左侧为活动列表；中部为活动海报和任务进度；右侧展示奖励、规则和参与按钮。",
    interaction: "切换活动刷新内容；点击参与跳转玩法；奖励达成后领取，过期活动置灰。",
    state: "包含未开始、进行中、可领取、已领取、即将结束、已过期等状态。",
    annotations: [
      { title: "时间压力", body: "参考运营活动中心，倒计时、进度和奖励必须清晰。" },
      { title: "参与入口", body: "活动页要能直达对应玩法，减少活动说明和实际操作断层。" },
      { title: "奖励展示", body: "阶段奖励、累计奖励和稀有奖励需形成视觉层级。" },
      { title: "过期处理", body: "过期、未开启和条件不足状态需要解释原因。" }
    ]
  },
  gacha: {
    label: "抽卡界面",
    goal: "承载卡池信息、概率说明、资源消耗、抽取动画和结果反馈。",
    layout: "中部为卡池主视觉；侧边展示概率、保底、预览；底部为单抽/十连按钮和资源状态。",
    interaction: "点击抽取前确认资源；可查看概率与保底；结果展示支持跳过、再抽和分享。",
    state: "包含资源不足、保底进度、UP、已拥有、抽取中、结果展示等状态。",
    annotations: [
      { title: "卡池主视觉", body: "参考卡牌/RPG 抽卡页，当前 UP 和保底进度要清晰。" },
      { title: "消耗确认", body: "单抽、十连和付费资源需明确数量，资源不足给获取入口。" },
      { title: "概率透明", body: "概率、规则和历史记录必须容易访问。" },
      { title: "结果反馈", body: "抽取结果需要区分稀有度、重复转化和新获得。" }
    ]
  },
  room: {
    label: "匹配房间界面",
    goal: "承载队伍成员、准备状态、模式选择和开始匹配。",
    layout: "中部为队伍席位；右侧为模式与规则；底部为邀请、准备、开始按钮。",
    interaction: "邀请好友、切换模式、准备/取消准备、房主开始匹配。",
    state: "包含空位、已准备、未准备、匹配中、房主、网络异常等状态。",
    annotations: [
      { title: "席位状态", body: "参考多人/派对游戏房间，玩家席位与准备状态要直接可见。" },
      { title: "房主权限", body: "开始、踢人、换模式等只给房主显示或强调。" },
      { title: "邀请路径", body: "邀请好友、队伍码、最近队友等入口要靠近空位。" },
      { title: "匹配反馈", body: "匹配中、取消、失败重试需要明确反馈。" }
    ]
  },
  base: {
    label: "基地/经营界面",
    goal: "承载建筑、生产、布置、资源收取和经营目标。",
    layout: "中部为基地/场景俯视图；底部为建筑与装饰栏；顶部展示资源、队列和任务。",
    interaction: "点击建筑查看状态；拖拽摆放或升级；资源可一键收取；队列完成后提醒。",
    state: "包含可建造、升级中、生产中、可收取、空间不足、资源不足等状态。",
    annotations: [
      { title: "场景承载", body: "参考模拟经营/基地建造，核心是场景状态和资源产出可见。" },
      { title: "建造反馈", body: "摆放、升级、生产队列要有进度和完成提醒。" },
      { title: "资源回收", body: "可收取状态需要高亮，但避免遮挡场景。" },
      { title: "布局编辑", body: "拖拽、旋转、撤销、保存等编辑操作需要明确模式区分。" }
    ]
  }
});

const genreReferenceProfiles = [
  {
    id: "ai_narrative",
    label: "AI叙事 / UGC创作",
    keywords: ["AI", "AIGC", "UGC", "编剧", "剧本", "DM", "跑团", "TRPG", "世界观", "世界构建", "创作", "创造", "宇宙", "叙事", "故事生成", "角色设定", "互动小说"],
    examples: "可参考 AI Dungeon、互动小说编辑器、跑团工具和叙事创作平台的信息组织：先建立世界观，再生成/管理角色、剧情节点和玩家选择。",
    principles: ["创作入口要比竞技操作更突出", "世界观、角色、剧情线和生成记录需要可追溯", "AI 生成结果必须支持重试、编辑、采纳和回滚"]
  },
  {
    id: "moba",
    label: "MOBA / 竞技对战",
    keywords: ["moba", "MOBA", "5v5", "竞技", "英雄对战", "推塔", "排位"],
    examples: "可参考《王者荣耀》《英雄联盟手游》的战局 HUD、技能冷却、装备购买和结算路径。",
    principles: ["技能/普攻/移动区必须低延迟且拇指可达", "小地图、战况和目标资源常驻", "结算页强调评分、段位与下一局"]
  },
  {
    id: "rpg",
    label: "RPG / 动作冒险",
    keywords: ["RPG", "角色扮演", "冒险", "剧情", "BOSS", "装备", "技能", "副本", "世界"],
    examples: "可参考《原神》《崩坏：星穹铁道》《塞尔达传说》在探索、角色成长、任务追踪和 BOSS 战前信息上的组织方式。",
    principles: ["主界面突出任务追踪与探索入口", "角色/装备/技能形成成长闭环", "BOSS 和剧情节点需要机制说明与失败引导"]
  },
  {
    id: "card",
    label: "卡牌 / 策略养成",
    keywords: ["卡牌", "抽卡", "阵容", "回合", "策略", "羁绊", "编队", "养成"],
    examples: "可参考《炉石传说》《阴阳师》《明日方舟》在卡牌详情、编队、关卡准备和抽卡反馈上的信息层级。",
    principles: ["卡牌稀有度、等级、技能和阵容位置要高识别", "编队与战前确认强绑定", "抽卡/获得反馈要突出新获得和重复转化"]
  },
  {
    id: "tower",
    label: "塔防 / 策略关卡",
    keywords: ["塔防", "防线", "波次", "部署", "怪潮", "路线", "防御"],
    examples: "可参考《明日方舟》《植物大战僵尸》的关卡路径、部署位、波次预警和战前准备。",
    principles: ["地图路线和敌人波次是首要信息", "部署/撤回/技能释放需要清晰状态", "战前要展示敌人、奖励和推荐配置"]
  },
  {
    id: "puzzle",
    label: "消除 / 解谜休闲",
    keywords: ["消除", "三消", "解谜", "拼图", "益智", "关卡目标", "步数"],
    examples: "可参考《开心消消乐》《Candy Crush》的关卡目标、步数、道具栏和失败续关路径。",
    principles: ["关卡目标、步数/时间和道具状态常驻", "失败前预警和续关入口明确", "奖励反馈轻快但不遮挡棋盘"]
  },
  {
    id: "sim",
    label: "模拟经营 / 放置",
    keywords: ["经营", "建造", "农场", "家园", "放置", "生产", "装饰", "收取"],
    examples: "可参考《动物森友会》《梦想城镇》《旅行青蛙》在场景经营、资源收取和装饰编辑上的低压力交互。",
    principles: ["场景状态优先，按钮弱化但可发现", "生产/收取/建造队列要有明确进度", "装饰编辑需要撤销、预览和保存"]
  },
  {
    id: "party",
    label: "派对 / 多人休闲",
    keywords: ["派对", "多人", "房间", "匹配", "好友", "社交", "竞技场", "排行"],
    examples: "可参考《蛋仔派对》《Fall Guys》的房间准备、匹配反馈、赛后结算和好友邀请。",
    principles: ["房间席位和准备状态要强可见", "匹配中需要清楚的等待与取消反馈", "排行榜和结算强调成绩对比"]
  },
  {
    id: "narrative",
    label: "剧情 / 视觉小说",
    keywords: ["剧情", "分支", "对话", "故事", "隐藏剧情", "选择", "文本冒险"],
    examples: "可参考视觉小说和叙事解谜游戏的对白框、分支选择、回看日志和关键选择确认。",
    principles: ["文本阅读区域不能压住关键画面", "分支选择需要反馈影响范围", "自动、跳过、日志回看入口应弱化常驻"]
  },
  {
    id: "casual",
    label: "休闲小游戏",
    keywords: ["休闲", "小游戏", "轻量", "点击", "收集", "简单"],
    examples: "可参考轻量休闲小游戏的一屏核心操作、短任务、即时反馈和弱系统负担。",
    principles: ["3 秒内看懂目标和主操作", "减少深层菜单和长流程", "反馈要快，奖励要明确"]
  }
];

const state = {
  gameName: "",
  normalizedOutline: "",
  normalizedOutlineRows: [],
  normalizedOutlineParseMeta: {
    totalRecognizedFields: 0,
    usedAliases: false,
    sourceShape: "empty",
    usedDefaults: false
  },
  normalizedOutlineSignature: "",
  normalizedOutlineSourceSignature: "",
  normalizedOutlineManual: false,
  isNormalizingOutline: false,
  gameDesign: "",
  gameDesignSourceSignature: "",
  plan: "",
  fullPlan: "",
  planSourceSignature: "",
  activeTab: "overview",
  visualSvg: "",
  visualSvgs: {},
  isGeneratingVisualSvg: false,
  generatingVisualScreen: "",
  visualSvgBatchSummary: {
    status: "idle",
    total: 0,
    successCount: 0,
    failedCount: 0,
    screens: {},
    updatedAt: 0
  },
  activeVisualScreen: "",
  activeDesignScreen: "",
  screenInferenceSource: "none",
  designDrafts: {},
  designJobs: {},
  designEditJobs: {},
  designLateRecoveries: {},
  designDraftEdit: {
    active: false,
    action: "delete",
    targetBox: null,
    sourceBox: null,
    selectingSource: false,
    sourceImageUrl: "",
    drag: null,
    busy: false,
    error: ""
  },
  designBatch: {
    status: "idle",
    stopRequested: false,
    currentScreenId: "",
    screenIds: [],
    completedScreenIds: [],
    failedScreenIds: [],
    skippedScreenIds: [],
    total: 0,
    index: 0,
    success: 0,
    failed: 0
  },
  visualAnalyses: {},
  designCompositionAnalyses: {},
  styleTransferKeywords: "",
  styleAnalysisCache: {
    status: "idle",
    requestId: "",
    styleTransferKeywords: "",
    styleKeywordSummary: "",
    styleAnalysisSummary: "",
    styleAnalysisSections: [],
    styleAnalysisSource: "none",
    structuredAnalysis: null,
    backgroundStyleSummary: "",
    shapeLanguageSummary: "",
    buttonMorphologySummary: "",
    backgroundPromptText: "",
    shapeLanguagePromptText: "",
    buttonMorphologyPromptText: "",
    backgroundStyleSource: "none",
    shapeLanguageSource: "none",
    buttonMorphologySource: "none",
    backgroundStyleReason: "",
    shapeLanguageReason: "",
    buttonMorphologyReason: "",
    styleAnalysisCompleteness: "idle",
    styleAnalysisParseSource: "none",
    referenceImages: [],
    referenceLabels: [],
    referenceSignature: "",
    referenceSourceSignature: "",
    referenceRequestInfo: null,
    userKeywords: "",
    updatedAt: 0,
    error: "",
    dirty: false,
    dirtyReason: ""
  },
  styleAnalysisPromise: null,
  uiComponentBaselines: {
    items: {},
    order: [],
    source: "none",
    assetVersion: "",
    coverage: null,
    layoutAnchors: []
  },
  totalAssetKit: createEmptyTotalAssetKit(),
  totalAssetActiveType: "ui",
  designDraftAssetReferenceSelection: createDefaultDesignDraftAssetReferenceSelection(),
  uiAssetKit: null,
  uiAssetKitPromise: null,
  totalAssetKitPromise: null,
  totalAssetCancelController: null,
  totalAssetPartJobs: {},
  totalAssetBusyRenderTimer: null,
  designInputVersion: 0,
  styleReferenceFiles: [],
  styleReferences: [],
  isGeneratingGameDesign: false,
  isGeneratingPlan: false,
  isGeneratingDesign: false,
  isAutoGeneratingWorkflow: false,
  autoGenerateCancelRequested: false,
  autoGenerateStage: "",
  lockedDocs: {
    brief: false,
    gameDesign: false,
    plan: false
  },
  lockedVisualSvg: false,
  lockedTotalAsset: false,
  lockedDesignDraft: false,
  lockedDesignDraftStaleReason: "",
  docModes: {
    gameDesign: "preview",
    plan: "preview"
  }
};

state.uiAssetKit = state.totalAssetKit.ui;

const TEXT_MODELS = [
  { id: "kimi-k2-thinking", label: "Kimi K2" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { id: "gpt-5.2", label: "GPT 5.2" },
  { id: "gpt-5.4", label: "GPT 5.4" },
  { id: "glm-5", label: "GLM-5" }
];

const DESIGN_MODELS = [
  {
    id: "gpt-image-2",
    label: "IMAGE 2",
    desc: "质量更高，适合最终视觉设计稿"
  },
  {
    id: "gemini-3.1-flash-image-preview",
    label: "🍌 Banana 2.0 NEW",
    desc: "速度快，适合快速探索"
  },
  {
    id: "gemini-3-pro-image-preview",
    label: "🍌 Banana Pro",
    desc: "质量更高，适合汇报稿"
  },
  {
    id: "gpt-image-1.5",
    label: "GPT 1.5",
    desc: "结构稳定，适合 UI 细化"
  }
];

const UI_COMPONENT_BASELINE_TYPES = [
  { id: "logo", label: "Logo / 游戏标题" },
  { id: "resource_token", label: "资源 Token / 货币胶囊" },
  { id: "resource_icon", label: "资源图标" },
  { id: "screen_title", label: "界面标题区" },
  { id: "back_button", label: "返回按钮" },
  { id: "close_button", label: "关闭按钮" },
  { id: "settings_button", label: "设置按钮" },
  { id: "home_button", label: "主页按钮" },
  { id: "icon_button", label: "图标按钮" },
  { id: "nav_icon", label: "导航图标" },
  { id: "tab_default", label: "Tab 默认态" },
  { id: "tab_selected", label: "Tab 选中态" },
  { id: "bottom_nav_default", label: "底部导航默认态" },
  { id: "bottom_nav_selected", label: "底部导航选中态" },
  { id: "button_primary", label: "主按钮" },
  { id: "button_secondary", label: "次按钮" },
  { id: "button_weak", label: "弱按钮" },
  { id: "button_disabled", label: "禁用按钮" },
  { id: "progress_bar", label: "进度条 / 状态条" },
  { id: "panel_card", label: "面板 / 卡片" },
  { id: "modal", label: "弹窗 / 详情面板" },
  { id: "list_item", label: "列表项" },
  { id: "item_slot", label: "道具格 / 物品槽" },
  { id: "avatar_frame", label: "头像框" },
  { id: "tooltip", label: "提示框 / 气泡" },
  { id: "badge", label: "徽标 / 红点" }
];

const UI_ASSET_REQUIRED_COMPONENT_RULES = [
  { types: ["back_button"], label: "返回按钮", pattern: /返回|后退|上一页|back|return/i, allowScreenFields: false },
  { types: ["close_button"], label: "关闭按钮", pattern: /关闭|关掉|退出弹窗|关闭弹窗|close|dismiss/i, allowScreenFields: false },
  { types: ["settings_button"], label: "设置按钮", pattern: /设置|齿轮|setting|settings|gear/i, allowScreenFields: true },
  { types: ["home_button"], label: "主页按钮", pattern: /主页|首页|回到主页|home/i, allowScreenFields: false },
  { types: ["resource_token"], label: "资源 token", pattern: /资源栏|资源条|货币|金币|钻石|体力|能量|爱心|代币|数值胶囊|token|currency|coin|gem|stamina|resource/i, allowScreenFields: true },
  { types: ["resource_icon"], label: "资源图标", pattern: /资源图标|货币图标|金币图标|钻石图标|体力图标|currency icon|resource icon/i, allowScreenFields: true },
  { types: ["screen_title"], label: "界面标题区", pattern: /界面标题|页面标题|标题区|主标题|标题栏|页面名称|界面名|screen title|title area|title bar/i, allowScreenFields: true },
  { types: ["tab_default", "tab_selected"], label: "Tab 默认/选中态", pattern: /Tab|tabs|页签|标签页|标签栏|分类页签|分类\s*Tab|分段|切换栏|segmented|segment/i, allowScreenFields: true },
  { types: ["bottom_nav_default", "bottom_nav_selected", "nav_icon"], label: "底部导航默认/选中态", pattern: /底部导航|底栏|底部栏|主导航|导航栏|一级导航|bottom nav|bottom_navigation|navigation bar/i, allowScreenFields: true },
  { types: ["button_primary"], label: "主按钮", pattern: /主按钮|确认|确定|保存|购买|领取|开始|继续|升级|前往|挑战|使用|装备|一键|提交|完成|primary button|cta/i, allowScreenFields: true },
  { types: ["button_secondary"], label: "次按钮", pattern: /次按钮|取消|返回列表|重置|筛选|排序|查看详情|secondary button/i, allowScreenFields: true },
  { types: ["icon_button"], label: "图标按钮", pattern: /图标按钮|工具按钮|筛选|搜索|帮助|问号|加号|减号|相机|礼物|邮件|公告|编辑|刷新|icon button|tool button/i, allowScreenFields: true },
  { types: ["progress_bar"], label: "进度条", pattern: /进度|状态条|经验|等级|血量|生命|好感|装饰值|活跃度|倒计时|progress|progress bar|status bar/i, allowScreenFields: true },
  { types: ["panel_card"], label: "面板/卡片", pattern: /面板|卡片|详情区|信息框|容器|panel|card|info box/i, allowScreenFields: true },
  { types: ["modal"], label: "弹窗", pattern: /弹窗|对话框|确认框|二次确认|浮层|modal|dialog|popup/i, allowScreenFields: true },
  { types: ["list_item"], label: "列表项", pattern: /列表|列表项|任务列表|商品列表|好友列表|排行|记录|list|list item/i, allowScreenFields: true },
  { types: ["item_slot"], label: "道具格", pattern: /道具格|物品格|格子|背包格|装备槽|槽位|卡槽|item slot|inventory slot|slot/i, allowScreenFields: true },
  { types: ["avatar_frame"], label: "头像框", pattern: /头像框|头像|玩家头像|角色头像|portrait|avatar|avatar frame/i, allowScreenFields: true },
  { types: ["tooltip"], label: "提示框", pattern: /提示框|提示气泡|气泡提示|轻提示|toast|tooltip|hint bubble/i, allowScreenFields: true },
  { types: ["badge"], label: "红点/角标", pattern: /红点|角标|徽标|提醒标|notification|badge/i, allowScreenFields: true }
];

const UI_ASSET_BOARD_SECTION_DEFINITIONS = [
  {
    id: "A",
    label: "导航控件区",
    position: "画布左上到上中区域",
    types: ["back_button", "close_button", "settings_button", "home_button", "icon_button", "nav_icon", "tab_default", "tab_selected", "bottom_nav_default", "bottom_nav_selected"],
    guidance: "放置返回、关闭、设置、主页、工具图标按钮，以及 Tab/底部导航默认态和选中态；图标必须清楚但不写业务文字。"
  },
  {
    id: "B",
    label: "按钮状态区",
    position: "画布左中区域",
    types: ["button_primary", "button_secondary", "button_weak", "button_disabled"],
    guidance: "放置主按钮、次按钮、弱按钮、禁用/锁定按钮和 pressed/selected/reward 状态；保留空文字区。"
  },
  {
    id: "C",
    label: "资源与状态区",
    position: "画布右上区域",
    types: ["resource_token", "resource_icon", "progress_bar"],
    guidance: "放置资源 Token/货币胶囊、资源图标、进度条/状态条；展示可复用图标承载、数值槽和状态填充。"
  },
  {
    id: "D",
    label: "容器区",
    position: "画布下中到左下区域",
    types: ["screen_title", "panel_card", "modal", "list_item"],
    guidance: "放置界面标题区/标题底板、面板、卡片、弹窗/详情面板、列表项；面板要适合 9-slice 拉伸。"
  },
  {
    id: "E",
    label: "槽位与提示区",
    position: "画布右下区域",
    types: ["avatar_frame", "item_slot", "badge", "tooltip"],
    guidance: "放置头像框、道具格/物品槽、徽标/红点、提示框/气泡；避免画具体角色、道具或业务图案。"
  }
];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const hasOwn = Object.prototype.hasOwnProperty;

const briefText = $("#briefText");
const gameName = $("#gameName");
const gameDesignOutput = $("#gameDesignOutput");
const planOutput = $("#planOutput");
const gameDesignPreview = $("#gameDesignPreview");
const planPreview = $("#planPreview");
const normalizedOutlineOutput = $("#normalizedOutlineOutput");
const normalizedOutlineBody = $(".normalized-outline-body");
const normalizedOutlineTable = $("#normalizedOutlineTable");
const normalizedOutlineStatus = $("#normalizedOutlineStatus");
const AUTO_GENERATE_DELAY = 700;
const MIN_BRIEF_LENGTH = 12;
const MAX_REFERENCE_IMAGE_BYTES = 1.5 * 1024 * 1024;
let autoGenerateTimer = 0;
let isComposingBrief = false;
let savedStylePromptRange = null;
let activeDesignLightbox = null;
let quickTabScrollFrame = 0;

function init() {
  bindEvents();
  restoreLockedDocsFromStorage();
  restoreLockedVisualSvgFromStorage();
  restoreLockedTotalAssetFromStorage();
  restoreLockedDesignDraftFromStorage();
}

function bindEvents() {
  briefText.addEventListener("compositionstart", () => {
    isComposingBrief = true;
  });

  briefText.addEventListener("compositionend", () => {
    isComposingBrief = false;
    markNormalizedOutlineDirty();
  });

  briefText.addEventListener("input", () => {
    if (!isComposingBrief) markNormalizedOutlineDirty();
    persistLockedDocsIfNeeded("brief");
  });

  gameName.addEventListener("input", () => {
    markNormalizedOutlineDirty();
    persistLockedDocsIfNeeded("brief");
  });
  $("#platform")?.addEventListener("change", () => {
    persistLockedDocsIfNeeded("brief");
  });

  normalizedOutlineOutput?.addEventListener("input", () => {
    const parsed = parseNormalizedOutlineResponse(normalizedOutlineOutput.value);
    state.normalizedOutlineRows = parsed.length ? parsed : state.normalizedOutlineRows;
    state.normalizedOutline = normalizedOutlineOutput.value.trim();
    state.normalizedOutlineManual = Boolean(state.normalizedOutline);
    setNormalizedOutlineBodyVisible(Boolean(state.normalizedOutline.trim()));
    updateNormalizedOutlineStatus(state.normalizedOutline ? "规范化玩法大纲已手动编辑，将作为后续生成的权威输入。" : "请先输入玩法大纲，再点击「规范化玩法大纲」。");
    persistLockedDocsIfNeeded("brief");
  });

  normalizedOutlineTable?.addEventListener("input", () => {
    syncNormalizedOutlineFromTable({ manual: true });
    updateNormalizedOutlineStatus("规范化玩法大纲已手动编辑，将作为后续生成的权威输入。");
    persistLockedDocsIfNeeded("brief");
  });

  gameDesignOutput.addEventListener("input", () => {
    syncGameDesignFromEditor();
    renderMarkdownDocument("gameDesign");
    persistLockedDocsIfNeeded("gameDesign");
  });
  planOutput.addEventListener("input", () => {
    syncPlanFromEditor();
    renderMarkdownDocument("plan");
    persistLockedDocsIfNeeded("plan");
  });
  gameDesignPreview?.addEventListener("input", () => {
    syncEditableDocumentToMarkdown("gameDesign");
    persistLockedDocsIfNeeded("gameDesign");
  });
  planPreview?.addEventListener("input", () => {
    syncEditableDocumentToMarkdown("plan");
    persistLockedDocsIfNeeded("plan");
  });
  $("#briefFile").addEventListener("change", handleBriefUpload);
  $("#normalizeOutline")?.addEventListener("click", handleNormalizeOutline);
  $("#generateGameDesign").addEventListener("click", () => generateGameDesign({ useApi: true, autoContinue: false }));
  $("#generatePlan").addEventListener("click", () => {
    syncEditableDocumentToMarkdown("gameDesign");
    generatePlan({ useApi: true });
  });
  $("#exportGameDesignPdf")?.addEventListener("click", () => {
    syncEditableDocumentToMarkdown("gameDesign");
    exportGameDesignPdf();
  });
  $("#exportPlanPdf")?.addEventListener("click", () => {
    syncEditableDocumentToMarkdown("plan");
    exportInteractionPdf();
  });
  $("#exportSvg").addEventListener("click", () => {
    syncEditableDocumentToMarkdown("plan");
    exportSvg();
  });
  $("#refreshVisualInline").addEventListener("click", () => {
    syncEditableDocumentToMarkdown("plan");
    generateEditableInteractionSvg();
  });
  $("#generateInteractionVisuals").addEventListener("click", () => {
    syncEditableDocumentToMarkdown("plan");
    generateEditableInteractionSvg();
  });
  $("#generateAllInteractionVisuals")?.addEventListener("click", () => {
    syncEditableDocumentToMarkdown("plan");
    generateAllEditableInteractionSvgs();
  });
  $("#styleRefs").addEventListener("change", handleStyleReferenceUpload);
  bindStyleReferencePromptUi();
  $("#generateAllDesigns")?.addEventListener("click", () => {
    syncEditableDocumentToMarkdown("gameDesign");
    syncEditableDocumentToMarkdown("plan");
    generateAllDesignDrafts();
  });
  $("#generateDesigns").addEventListener("click", () => {
    syncEditableDocumentToMarkdown("gameDesign");
    syncEditableDocumentToMarkdown("plan");
    generateDesignDrafts();
  });
  $("#exportAllDesignDrafts")?.addEventListener("click", () => {
    syncEditableDocumentToMarkdown("gameDesign");
    syncEditableDocumentToMarkdown("plan");
    exportAllDesignDraftZip();
  });
  $("#exportAllResources")?.addEventListener("click", () => {
    syncEditableDocumentToMarkdown("gameDesign");
    syncEditableDocumentToMarkdown("plan");
    exportAllResourcesBundle();
  });
  $("#autoGenerateWorkflow")?.addEventListener("click", runAutoGenerateWorkflow);
  $("#refreshTargetScreens")?.addEventListener("click", () => {
    syncEditableDocumentToMarkdown("gameDesign");
    refreshTargetScreensFromCurrentDocument();
  });
  $("#refreshStyleAnalysis")?.addEventListener("click", () => refreshStyleAnalysisCache({ force: true, source: "manual" }));
  $("#designModel")?.addEventListener("change", () => markDesignInputsDirty("图像模型已变化"));
  $$("[data-lock-doc]").forEach((button) => {
    button.addEventListener("click", () => toggleLockedDoc(button.dataset.lockDoc));
  });
  $("#lockVisualSvg")?.addEventListener("click", toggleLockedVisualSvg);
  $("#visualRequirements")?.addEventListener("input", persistLockedVisualSvgIfNeeded);
  $("#lockTotalAssetKit")?.addEventListener("click", toggleLockedTotalAsset);
  $("#lockDesignDrafts")?.addEventListener("click", toggleLockedDesignDraft);

  $(".screen-picker").addEventListener("change", (event) => {
    if (event.target.matches("input[type='checkbox']")) {
      syncActiveVisualScreen();
      syncActiveDesignScreen();
      renderVisualTabs();
      renderDesignTabs();
      state.visualAnalyses = {};
      state.visualSvgs = {};
      resetVisualSvgBatchSummary();
      state.generatingVisualScreen = "";
      unlockLockedVisualSvg();
      state.designCompositionAnalyses = {};
      state.visualSvg = "";
      renderEmptyVisual();
      if (hasUsableBrief()) {
        scheduleAutoGenerate(0);
      } else {
        renderEmptyVisual();
      }
    }
  });

  $$(".step").forEach((button) => {
    button.addEventListener("click", () => {
      setActiveQuickTab(button.dataset.focus);
      const target = document.getElementById(button.dataset.focus);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
  window.addEventListener("scroll", scheduleQuickTabScrollSync, { passive: true });
  window.addEventListener("resize", scheduleQuickTabScrollSync, { passive: true });

  $$(".plan-tabs button").forEach((button) => {
    button.addEventListener("click", () => {
      syncEditableDocumentToMarkdown("plan");
      state.activeTab = button.dataset.planTab;
      $$(".plan-tabs button").forEach((item) => item.classList.toggle("is-active", item.dataset.planTab === state.activeTab));
      renderPlanTab();
    });
  });

  syncActiveVisualScreen();
  syncActiveDesignScreen();
  renderVisualTabs();
  renderDesignTabs();
  renderMarkdownDocuments();
  renderEmptyVisual();
  renderDesignOutput();
  renderDesignPromptSummary();
  syncQuickTabsFromScroll();
}

function getQuickTabTargets() {
  return $$(".step[data-focus]")
    .map((button) => ({
      button,
      moduleId: button.dataset.focus,
      target: document.getElementById(button.dataset.focus)
    }))
    .filter((item) => item.moduleId && item.target);
}

function setActiveQuickTab(moduleId) {
  getQuickTabTargets().forEach(({ button }) => {
    const active = button.dataset.focus === moduleId;
    button.classList.toggle("is-active", active);
    if (active) {
      button.setAttribute("aria-current", "true");
    } else {
      button.removeAttribute("aria-current");
    }
  });
}

function scheduleQuickTabScrollSync() {
  if (quickTabScrollFrame) return;
  quickTabScrollFrame = window.requestAnimationFrame(() => {
    quickTabScrollFrame = 0;
    syncQuickTabsFromScroll();
  });
}

function syncQuickTabsFromScroll() {
  const items = getQuickTabTargets();
  if (!items.length) return;

  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 800;
  const anchorY = Math.min(280, Math.max(160, viewportHeight * 0.35));
  let activeModuleId = "";
  let nearestModuleId = "";
  let nearestDistance = Number.POSITIVE_INFINITY;

  items.forEach(({ moduleId, target }) => {
    const rect = target.getBoundingClientRect();
    if (rect.height <= 0 || rect.width <= 0) return;

    if (!activeModuleId && rect.top <= anchorY && rect.bottom > anchorY) {
      activeModuleId = moduleId;
    }

    const distance = Math.min(Math.abs(rect.top - anchorY), Math.abs(rect.bottom - anchorY));
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestModuleId = moduleId;
    }
  });

  setActiveQuickTab(activeModuleId || nearestModuleId || items[0].moduleId);
}

function hasUsableBrief() {
  return briefText.value.trim().length >= MIN_BRIEF_LENGTH;
}

function getAutoGenerateMissingInputs() {
  const missing = [];
  if (!gameName.value.trim()) missing.push("游戏名");
  if (!briefText.value.trim()) missing.push("玩法大纲");
  if (!getStyleReferenceSelectionState().sendableReferences.length) missing.push("参考图");
  return missing;
}

function cancelAutoGenerateWorkflow() {
  if (!state.isAutoGeneratingWorkflow) return false;
  state.autoGenerateCancelRequested = true;
  const stage = state.autoGenerateStage || "";
  if (stage === "normalize") cancelRunningButtonTask("normalizeOutline");
  if (stage === "gameDesign") cancelRunningButtonTask("generateGameDesign");
  if (stage === "plan") cancelRunningButtonTask("generatePlan");
  if (stage === "svg") cancelRunningButtonTask("generateAllInteractionVisuals") || cancelRunningButtonTask("generateInteractionVisuals");
  if (stage === "assets") {
    const kit = state.totalAssetKit || {};
    if (isTotalAssetBusy(kit)) {
      cancelTotalAssetAnalysis(kit.status === "analyzing" ? "已取消分析，未生成总资产" : "已取消总资产生成");
    }
  }
  if (stage === "designs") cancelRunningButtonTask("generateAllDesigns") || cancelRunningButtonTask("generateDesigns");
  setAutoGenerateStatus("正在取消自动生成...", "warning");
  return true;
}

function throwIfAutoGenerateCancelled() {
  if (state.autoGenerateCancelRequested) {
    throw createClientAbortError("已取消自动生成");
  }
}

async function runAutoGenerateStage(stage, label, fn, verify) {
  state.autoGenerateStage = stage;
  setAutoGenerateStatus(`正在自动生成：${label}`);
  const result = await fn();
  throwIfAutoGenerateCancelled();
  if (typeof verify === "function" && !verify(result)) {
    throw new Error(`${label}未完成`);
  }
  return result;
}

async function runAutoGenerateWorkflow() {
  if (state.isAutoGeneratingWorkflow) {
    cancelAutoGenerateWorkflow();
    return;
  }

  const missing = getAutoGenerateMissingInputs();
  if (missing.length) {
    setAutoGenerateStatus(`自动生成未启动：请先补充${missing.join("、")}`, "warning");
    return;
  }

  state.isAutoGeneratingWorkflow = true;
  state.autoGenerateCancelRequested = false;
  state.autoGenerateStage = "";
  setAutoGenerateButtonPending(true);
  setRunningButtonTask("autoGenerateWorkflow", cancelAutoGenerateWorkflow);

  try {
    let svgStageResult = null;
    await runAutoGenerateStage(
      "normalize",
      "规范化玩法大纲",
      () => handleNormalizeOutline(),
      () => Boolean(getNormalizedOutlineFromEditor())
    );
    await runAutoGenerateStage(
      "gameDesign",
      "生成策划案",
      () => generateGameDesign({ useApi: true, autoContinue: false }),
      () => Boolean(state.gameDesign || gameDesignOutput.value.trim())
    );
    await runAutoGenerateStage(
      "plan",
      "生成交互案",
      () => generatePlan({ useApi: true }),
      () => Boolean(state.fullPlan || state.plan || planOutput.value.trim())
    );
    svgStageResult = await runAutoGenerateStage(
      "svg",
      "生成所有界面 SVG",
      () => generateAllEditableInteractionSvgs(),
      (result) => Boolean(result?.completed) && (result.total > 0 || getSelectedScreens().length > 0)
    );
    await runAutoGenerateStage(
      "assets",
      "生成总资产",
      () => generateTotalAssetsFromDesignTab(getSelectedScreens()[0] || getUiAssetDesignScreen()),
      () => getTotalAssetReadyTypes(state.totalAssetKit || {}).length === TOTAL_ASSET_TYPES.length
    );
    await runAutoGenerateStage(
      "designs",
      "生成所有界面设计稿",
      () => generateAllDesignDrafts(),
      () => {
        const selectedScreens = getSelectedScreens().filter((screen) => !isUiAssetDesignScreenId(screen.id));
        return selectedScreens.length > 0 && selectedScreens.every((screen) => Boolean(getDesignDraftForScreen(screen)?.imageUrl));
      }
    );
    if (svgStageResult?.failedCount) {
      setAutoGenerateStatus(
        `自动生成完成：SVG 成功 ${svgStageResult.successCount}/${svgStageResult.total}，失败 ${svgStageResult.failedCount}；后续总资产和设计稿已继续完成`,
        "warning"
      );
    } else {
      setAutoGenerateStatus("自动生成完成：所有界面设计稿已完成", "success");
    }
  } catch (error) {
    if (isAbortLikeError(error) || state.autoGenerateCancelRequested) {
      setAutoGenerateStatus("自动生成已取消，已完成内容保留。", "warning");
    } else {
      setAutoGenerateStatus(`自动生成失败：${error?.message || "未知错误"}`, "error");
    }
  } finally {
    state.isAutoGeneratingWorkflow = false;
    state.autoGenerateCancelRequested = false;
    state.autoGenerateStage = "";
    setAutoGenerateButtonPending(false);
  }
}

function scheduleAutoGenerate(delay = AUTO_GENERATE_DELAY) {
  window.clearTimeout(autoGenerateTimer);
  markNormalizedOutlineDirty();
}

function getRawOutlineSignature() {
  return [
    gameName.value.trim(),
    briefText.value.trim(),
    $("#platform")?.value || ""
  ].join("\n---\n");
}

function normalizeProjectSignatureValue(value = "") {
  return String(value || "").trim();
}

function getCurrentProjectSignature() {
  return normalizeProjectSignatureValue(getRawOutlineSignature());
}

function isBlankProjectDraft() {
  return !String(gameName?.value || "").trim() && !String(briefText?.value || "").trim();
}

function getNormalizedOutlineSourceSignature() {
  return normalizeProjectSignatureValue(state.normalizedOutlineSourceSignature || state.normalizedOutlineSignature || "");
}

function getGameDesignSourceSignature() {
  return normalizeProjectSignatureValue(state.gameDesignSourceSignature || "");
}

function getPlanSourceSignature() {
  return normalizeProjectSignatureValue(state.planSourceSignature || "");
}

function hasCrossProjectMismatch(sourceSignature = "") {
  const currentSignature = getCurrentProjectSignature();
  const normalizedSource = normalizeProjectSignatureValue(sourceSignature);
  if (!currentSignature) return false;
  return !normalizedSource || normalizedSource !== currentSignature;
}

function hasStaleNormalizedOutline() {
  return Boolean(getNormalizedOutlineFromEditor()) && hasCrossProjectMismatch(getNormalizedOutlineSourceSignature());
}

function hasStaleGameDesign() {
  return Boolean(gameDesignOutput?.value?.trim() || state.gameDesign) && hasCrossProjectMismatch(getGameDesignSourceSignature());
}

function hasStalePlan() {
  return Boolean(planOutput?.value?.trim() || state.fullPlan || state.plan) && hasCrossProjectMismatch(getPlanSourceSignature());
}

function getProjectSwitchBlockMessage(target = "继续生成") {
  if (target === "gameDesign") {
    return "检测到已切换项目，需先重新规范化玩法大纲，再重新生成策划案。";
  }
  if (target === "plan") {
    return "检测到已切换项目，旧策划案/交互案已失效；请先重新规范化玩法大纲并重新生成策划案、交互案。";
  }
  return "检测到已切换项目，旧内容已失效；请先重新规范化玩法大纲并重新生成文档。";
}

const NORMALIZED_OUTLINE_TEMPLATE = [
  {
    field: "游戏名称",
    hint: "填写游戏名。"
  },
  {
    field: "游戏类型",
    hint: "填写游戏类型，例如：休闲合成、跑酷躲避、放置经营、动作闯关、塔防策略、益智解谜。"
  },
  {
    field: "一句话概述",
    hint: "用一句话说明这是什么游戏。"
  },
  {
    field: "玩家目标",
    hint: "说明玩家最终想达成什么，例如存活更久、获得更高分、经营更大店铺。"
  },
  {
    field: "核心玩法",
    hint: "说明玩家主要怎么操作、怎么获得反馈，例如点击、滑动、拖拽、合成、选择、放置。"
  },
  {
    field: "核心循环",
    hint: "说明玩家每一轮会重复做什么，例如进入关卡 -> 执行核心操作 -> 获得资源/分数 -> 结算 -> 升级/解锁 -> 再次挑战。"
  },
  {
    field: "成长与关卡",
    hint: "说明游戏如何推进，关卡如何推进，难度如何提升。"
  },
  {
    field: "美术风格",
    hint: "说明整体视觉方向，例如卡通、Q版、像素、轻科幻、国风、治愈、搞笑。"
  },
  {
    field: "特色亮点",
    hint: "说明相比普通同类游戏有什么记忆点。"
  }
];

const NORMALIZED_OUTLINE_FIELD_ALIASES = new Map([
  ["游戏名称", "游戏名称"],
  ["游戏名", "游戏名称"],
  ["名称", "游戏名称"],
  ["游戏类型", "游戏类型"],
  ["类型", "游戏类型"],
  ["玩法类型", "游戏类型"],
  ["一句话概述", "一句话概述"],
  ["一句话简介", "一句话概述"],
  ["简介", "一句话概述"],
  ["概述", "一句话概述"],
  ["玩家目标", "玩家目标"],
  ["目标", "玩家目标"],
  ["玩家核心目标", "玩家目标"],
  ["核心玩法", "核心玩法"],
  ["玩法", "核心玩法"],
  ["主要玩法", "核心玩法"],
  ["核心循环", "核心循环"],
  ["循环", "核心循环"],
  ["玩法循环", "核心循环"],
  ["成长与关卡", "成长与关卡"],
  ["成长", "成长与关卡"],
  ["成长系统", "成长与关卡"],
  ["关卡成长", "成长与关卡"],
  ["美术风格", "美术风格"],
  ["美术", "美术风格"],
  ["视觉风格", "美术风格"],
  ["特色亮点", "特色亮点"],
  ["亮点", "特色亮点"],
  ["特色", "特色亮点"],
  ["核心亮点", "特色亮点"]
]);

const NORMALIZED_OUTLINE_FIELD_KEYS = ["field", "name", "title", "label", "字段"];
const NORMALIZED_OUTLINE_CONTENT_KEYS = ["content", "value", "text", "body", "description", "填写内容", "说明"];

function createEmptyNormalizedOutlineRows() {
  return NORMALIZED_OUTLINE_TEMPLATE.map((item) => ({
    field: item.field,
    hint: item.hint,
    content: ""
  }));
}

function canonicalizeNormalizedOutlineField(rawField) {
  const field = String(rawField || "").replace(/[:：]/g, "").trim();
  if (!field) return "";
  return NORMALIZED_OUTLINE_FIELD_ALIASES.get(field) || "";
}

function extractNormalizedOutlineFieldValue(row) {
  if (!row || typeof row !== "object") return "";
  for (const key of NORMALIZED_OUTLINE_FIELD_KEYS) {
    if (key in row) {
      const field = canonicalizeNormalizedOutlineField(row[key]);
      if (field) return field;
    }
  }
  return "";
}

function extractNormalizedOutlineContentValue(row) {
  if (!row || typeof row !== "object") return "";
  for (const key of NORMALIZED_OUTLINE_CONTENT_KEYS) {
    if (typeof row[key] === "string") {
      const content = row[key].trim();
      if (content) return content;
    }
  }
  return "";
}

function collectNormalizedOutlineCandidateRows(parsed) {
  if (!parsed || typeof parsed !== "object") return [];
  if (Array.isArray(parsed)) return parsed;
  for (const key of ["rows", "items", "fields"]) {
    if (Array.isArray(parsed[key])) return parsed[key];
  }
  return [];
}

function normalizeOutlineRows(rows, fallbackProjectName = "") {
  const byField = new Map();
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const field = canonicalizeNormalizedOutlineField(row?.field || row?.name || row?.title || row?.label || row?.字段);
    if (!field) return;
    const content = extractNormalizedOutlineContentValue(row);
    byField.set(field, content);
  });

  return NORMALIZED_OUTLINE_TEMPLATE.map((item) => {
    let content = byField.get(item.field) || "";
    if (!content && item.field === "游戏名称" && fallbackProjectName) {
      content = fallbackProjectName;
    }
    return {
      field: item.field,
      hint: item.hint,
      content
    };
  });
}

function parseNormalizedOutlineResponse(raw) {
  return parseNormalizedOutlineResponseDetailed(raw).rows;
}

function parseNormalizedOutlineResponseDetailed(raw) {
  const text = String(raw || "").trim();
  if (!text) {
    return {
      rows: [],
      totalRecognizedFields: 0,
      usedAliases: false,
      sourceShape: "empty"
    };
  }

  const parsed = parseJsonObjectFromText(text);
  if (!parsed) {
    return {
      rows: [],
      totalRecognizedFields: 0,
      usedAliases: false,
      sourceShape: "unparseable"
    };
  }

  let usedAliases = false;
  let sourceShape = "object";
  let recognizedRows = [];
  const candidates = collectNormalizedOutlineCandidateRows(parsed);

  if (candidates.length) {
    sourceShape = Array.isArray(parsed) ? "array-root" : "array-container";
    recognizedRows = candidates
      .filter((row) => row && typeof row === "object")
      .map((row) => {
        const field = extractNormalizedOutlineFieldValue(row);
        const content = extractNormalizedOutlineContentValue(row);
        const rawField = String(row.field || row.name || row.title || row.label || row.字段 || "").replace(/[:：]/g, "").trim();
        if (field && rawField && field !== rawField) usedAliases = true;
        if (field && !("field" in row)) usedAliases = true;
        if (content && typeof row.content !== "string") {
          for (const key of NORMALIZED_OUTLINE_CONTENT_KEYS) {
            if (key !== "content" && typeof row[key] === "string" && row[key].trim()) {
              usedAliases = true;
              break;
            }
          }
        }
        return { field, content };
      })
      .filter((row) => row.field);
  } else {
    const mapped = [];
    NORMALIZED_OUTLINE_TEMPLATE.forEach((item) => {
      if (typeof parsed[item.field] === "string" && parsed[item.field].trim()) {
        mapped.push({ field: item.field, content: parsed[item.field].trim() });
      }
    });
    Object.entries(parsed).forEach(([key, value]) => {
      const field = canonicalizeNormalizedOutlineField(key);
      if (!field || typeof value !== "string" || !value.trim()) return;
      if (field !== key.trim()) usedAliases = true;
      if (!mapped.some((row) => row.field === field)) {
        mapped.push({ field, content: value.trim() });
      }
    });
    recognizedRows = mapped;
  }

  const rows = normalizeOutlineRows(recognizedRows, gameName?.value?.trim());
  return {
    rows,
    totalRecognizedFields: rows.filter((row) => row.content.trim()).length,
    usedAliases,
    sourceShape
  };
}

async function repairNormalizedOutlineJsonWithApi({ model, projectName, rawOutline, rawResponse, signal }) {
  return generateTextWithApi({
    task: "outline-normalization-json-repair",
    model: model || $("#normalizeOutlineModel")?.value || "gpt-5.2",
    projectName,
    rawOutline,
    outline: rawOutline,
    rawResponse,
    platform: getPlatformText($("#platform")?.value),
    extraNeeds: getExtraNeeds(),
    signal
  });
}

function serializeNormalizedOutlineRows(rows) {
  const normalizedRows = normalizeOutlineRows(rows, gameName?.value?.trim());
  return [
    "# 游戏大纲",
    "",
    ...normalizedRows.flatMap((row) => [
      `## ${row.field}`,
      row.content.trim() || `建议设定：${row.hint}`,
      ""
    ])
  ].join("\n").trim();
}

function fillMissingNormalizedOutlineRows(rows) {
  return normalizeOutlineRows(rows, gameName?.value?.trim()).map((row) => ({
    ...row,
    content: row.content.trim() || `建议设定：${row.hint}`
  }));
}

function setNormalizedOutlineBodyVisible(visible) {
  if (!normalizedOutlineBody) return;
  normalizedOutlineBody.classList.toggle("is-hidden", !visible);
}

function renderNormalizedOutlineTable(rows = state.normalizedOutlineRows) {
  if (!normalizedOutlineTable) return;
  const normalizedRows = normalizeOutlineRows(rows, gameName?.value?.trim());
  state.normalizedOutlineRows = normalizedRows;
  const hasRowsWithContent = normalizedRows.some((row) => row.content.trim());

  if (!hasRowsWithContent) {
    normalizedOutlineTable.innerHTML = "";
    setNormalizedOutlineBodyVisible(false);
    return;
  }

  setNormalizedOutlineBodyVisible(true);
  normalizedOutlineTable.innerHTML = `
    <div class="normalized-outline-list">
      ${normalizedRows.map((row, index) => `
        <div class="normalized-outline-row">
          <div class="normalized-outline-field">${escapeXml(row.field)}</div>
          <div class="normalized-outline-colon">:</div>
          <div class="normalized-outline-input">
            <textarea data-outline-index="${index}" aria-label="${escapeXml(row.field)}" placeholder="${escapeXml(row.hint)}">${escapeXml(row.content)}</textarea>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function readNormalizedOutlineRowsFromTable() {
  if (!normalizedOutlineTable) return state.normalizedOutlineRows || [];
  const textareas = Array.from(normalizedOutlineTable.querySelectorAll("textarea[data-outline-index]"));
  if (!textareas.length) return state.normalizedOutlineRows || [];
  const rows = createEmptyNormalizedOutlineRows();
  textareas.forEach((textarea) => {
    const index = Number(textarea.dataset.outlineIndex);
    if (!Number.isInteger(index) || !rows[index]) return;
    rows[index].content = textarea.value.trim();
  });
  return rows;
}

function syncNormalizedOutlineFromTable({ manual = false } = {}) {
  const rows = readNormalizedOutlineRowsFromTable();
  state.normalizedOutlineRows = normalizeOutlineRows(rows, gameName?.value?.trim());
  state.normalizedOutline = serializeNormalizedOutlineRows(state.normalizedOutlineRows);
  state.normalizedOutlineManual = manual || Boolean(state.normalizedOutline);
  setNormalizedOutlineBodyVisible(state.normalizedOutlineRows.some((row) => row.content.trim()));
  if (normalizedOutlineOutput) normalizedOutlineOutput.value = state.normalizedOutline;
  return state.normalizedOutline;
}

function getNormalizedOutlineFromEditor() {
  if (normalizedOutlineTable?.querySelector("textarea[data-outline-index]")) {
    return syncNormalizedOutlineFromTable({ manual: state.normalizedOutlineManual });
  }
  return normalizedOutlineOutput?.value.trim() || state.normalizedOutline || "";
}

function updateNormalizedOutlineStatus(message, tone = "") {
  if (!normalizedOutlineStatus) return;
  normalizedOutlineStatus.textContent = message;
  normalizedOutlineStatus.dataset.tone = tone;
}

function markNormalizedOutlineDirty(options = {}) {
  const brief = briefText.value.trim();
  if (!brief) {
    state.normalizedOutline = "";
    state.normalizedOutlineRows = [];
    state.normalizedOutlineSignature = "";
    state.normalizedOutlineSourceSignature = "";
    state.gameDesignSourceSignature = "";
    state.planSourceSignature = "";
    state.normalizedOutlineManual = false;
    if (normalizedOutlineOutput) normalizedOutlineOutput.value = "";
    renderNormalizedOutlineTable([]);
    updateNormalizedOutlineStatus("请先输入玩法大纲，再点击「规范化玩法大纲」。");
    resetGeneratedContent();
    $("#briefStatus").textContent = "等待输入策划案";
    $("#planStatus").textContent = "方案待生成";
    return;
  }

  if (brief.length < MIN_BRIEF_LENGTH) {
    state.normalizedOutlineSignature = "";
    updateNormalizedOutlineStatus("玩法大纲内容还不够，继续补充后再规范化。");
    $("#briefStatus").textContent = "继续输入玩法大纲";
    $("#planStatus").textContent = "等待手动生成策划案";
    return;
  }

  const switchedProject = hasStaleNormalizedOutline() || hasStaleGameDesign() || hasStalePlan();
  state.normalizedOutlineSignature = "";
  const existingNormalized = getNormalizedOutlineFromEditor();
  if (existingNormalized) {
    state.normalizedOutline = existingNormalized;
    state.normalizedOutlineManual = true;
    updateNormalizedOutlineStatus(
      switchedProject
        ? "检测到已切换项目，旧的规范化大纲已失效；请重新规范化玩法大纲后再继续生成。"
        : "原始玩法大纲已变化，当前规范化大纲可能已过期；请重新规范化。"
    );
  } else {
    updateNormalizedOutlineStatus("玩法大纲已更新，请点击“规范化玩法大纲”生成标准大纲。");
  }
  if (switchedProject) {
    $("#briefStatus").textContent = "检测到已切换项目";
    $("#planStatus").textContent = "检测到已切换项目，需重新生成策划案与交互案";
    hideTargetScreensUntilGameDesignReady();
  } else if (!state.gameDesign && !gameDesignOutput.value.trim()) {
    hideTargetScreensUntilGameDesignReady();
  }
  if (!options.keepStatus && !switchedProject) $("#briefStatus").textContent = "玩法大纲已更新";
  if (!switchedProject) {
    $("#planStatus").textContent = state.gameDesign || gameDesignOutput.value.trim()
    ? "可点击重新生成策划案"
    : "点击生成策划案";
  }
}

async function handleBriefUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const lower = file.name.toLowerCase();
  if (lower.endsWith(".txt") || lower.endsWith(".md") || lower.endsWith(".json") || lower.endsWith(".csv")) {
    briefText.value = await file.text();
  } else {
    const buffer = await file.arrayBuffer();
    briefText.value = extractLooseText(buffer) || `已读取文件：${file.name}\n\n当前前端原型对 PDF / DOCX 仅做基础文本尝试提取。建议在这里补充粘贴策划案正文，以获得更准确的生成结果。`;
  }

  $("#briefStatus").textContent = `已导入：${file.name}`;
  markNormalizedOutlineDirty({ keepStatus: true });
}

function bindStyleReferencePromptUi() {
  const preview = $("#stylePreview");
  const prompt = $("#styleKeywords");
  const reset = $("#resetStylePrompt");
  if (!preview || !prompt) return;

  preview.addEventListener("click", () => preview.focus());
  preview.addEventListener("paste", handleStyleReferencePaste);
  preview.addEventListener("dragover", (event) => {
    event.preventDefault();
    preview.classList.add("is-dragging");
  });
  preview.addEventListener("dragleave", () => preview.classList.remove("is-dragging"));
  preview.addEventListener("drop", handleStyleReferenceDrop);
  preview.addEventListener("keydown", (event) => {
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      clearStyleReferences();
    }
  });

  ["focus", "mouseup", "keyup", "input"].forEach((eventName) => {
    prompt.addEventListener(eventName, saveStylePromptSelection);
  });

  prompt.addEventListener("input", () => markDesignInputsDirty("生图关键词已变化"));

  reset?.addEventListener("click", () => {
    prompt.textContent = "";
    savedStylePromptRange = null;
    prompt.focus();
    markDesignInputsDirty("生图关键词已清空");
  });
}

function handleStyleReferenceUpload(event) {
  loadStyleReferenceFiles(Array.from(event.target.files || []), "上传");
  event.target.value = "";
}

function handleStyleReferencePaste(event) {
  const files = Array.from(event.clipboardData?.files || []).filter((file) => file.type.startsWith("image/"));
  if (!files.length) return;
  event.preventDefault();
  loadStyleReferenceFiles(files, "粘贴");
}

function handleStyleReferenceDrop(event) {
  event.preventDefault();
  $("#stylePreview")?.classList.remove("is-dragging");
  loadStyleReferenceFiles(Array.from(event.dataTransfer?.files || []), "拖拽");
}

async function loadStyleReferenceFiles(files, sourceLabel = "上传") {
  const imageFiles = files.filter((file) => file.type.startsWith("image/"));
  const slots = Math.max(0, DESIGN_REFERENCE_LIMIT - state.styleReferences.length);
  const nextFiles = imageFiles.slice(0, slots);
  if (!nextFiles.length) {
    renderStyleReferenceList(`最多支持 ${DESIGN_REFERENCE_LIMIT} 张画风参考图`);
    return;
  }

  const loaded = await Promise.all(nextFiles.map(readStyleReferenceFile));
  state.styleReferences.push(...loaded);
  state.styleReferenceFiles = state.styleReferences.map((item) => item.file);
  renderStyleReferencePreview();
  renderStyleReferenceList(`${sourceLabel} ${loaded.length} 张，当前 ${state.styleReferences.length}/${DESIGN_REFERENCE_LIMIT}`);
  markDesignInputsDirty("画风参考图已变化");
}

function readStyleReferenceFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => resolve({
        file,
        dataUrl: String(reader.result || ""),
        fileName: file.name,
        displayName: file.name || "style-reference.png",
        size: file.size,
        width: image.width,
        height: image.height
      });
      image.onerror = () => reject(new Error(`图片加载失败：${file.name}`));
      image.src = String(reader.result || "");
    };
    reader.onerror = () => reject(new Error(`无法读取参考图：${file.name}`));
    reader.readAsDataURL(file);
  });
}

function renderStyleReferencePreview() {
  const preview = $("#stylePreview");
  if (!preview) return;

  if (!state.styleReferences.length) {
    preview.classList.add("is-empty");
    preview.style.width = "";
    preview.innerHTML = `
      <div class="style-preview-empty">
        <strong>等待参考图</strong>
        <span>最多 ${DESIGN_REFERENCE_LIMIT} 张。支持上传、拖拽、粘贴，点击图号可插入到提示词。</span>
      </div>
    `;
    return;
  }

  preview.classList.remove("is-empty");
  preview.style.width = "";
  preview.innerHTML = `
    <div class="style-preview-grid count-${state.styleReferences.length}">
      ${state.styleReferences.map((item, index) => {
        const imageWidth = Math.max(1, Number(item.width || 1));
        const imageHeight = Math.max(1, Number(item.height || 1));
        const fitClass = imageWidth >= imageHeight ? "is-wide" : "is-tall";
        return `
        <div class="style-preview-card">
          <div class="style-preview-image-wrap ${fitClass}" style="--style-ref-aspect: ${imageWidth} / ${imageHeight};">
            <button class="style-preview-image-button" type="button" data-open-style-index="${index}" aria-label="查看图${index + 1}原图">
              <img src="${escapeXml(item.dataUrl)}" alt="图${index + 1} ${escapeXml(item.displayName)}">
            </button>
            <button class="style-ref-badge" type="button" data-style-index="${index}">图${index + 1}</button>
            <button class="style-ref-remove" type="button" data-remove-style-index="${index}">Delete</button>
          </div>
        </div>
      `; }).join("")}
    </div>
  `;

  preview.querySelectorAll("[data-style-index]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      insertStylePromptToken(`图${Number(button.dataset.styleIndex) + 1}`);
    });
  });

  preview.querySelectorAll("[data-open-style-index]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const index = Number(button.dataset.openStyleIndex);
      const item = state.styleReferences[index];
      if (!item) return;
      openImageLightbox(item.dataUrl, `图${index + 1} / 原始参考图`);
    });
  });

  preview.querySelectorAll("[data-remove-style-index]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      removeStyleReference(Number(button.dataset.removeStyleIndex));
    });
  });
}

function renderStyleReferenceList(message = "") {
  const target = $("#styleRefList");
  const hint = $("#styleRefHint");
  if (!target && !hint) return;

  if (!state.styleReferences.length) {
    if (target) target.textContent = message || "未上传参考图";
    if (hint) hint.textContent = `未引用图号时默认使用前 ${DESIGN_REFERENCE_LIMIT} 张参考图`;
    return;
  }

  const names = state.styleReferences.map((item, index) => `图${index + 1} ${item.displayName} (${formatFileSize(item.size)})`);
  if (target) target.textContent = message || names.join(" / ");
  const selection = getStyleReferenceSelectionState();
  const limitedText = selection.limitedReferences.length
    ? `，${selection.limitedReferences.map((item) => item.label).join("、")} 超过 ${DESIGN_REFERENCE_LIMIT} 张上限未发送`
    : "";
  if (hint) hint.textContent = `本次会尝试发送 ${selection.sendableReferences.length} 张参考图${limitedText}`;
}

function removeStyleReference(index) {
  state.styleReferences.splice(index, 1);
  state.styleReferenceFiles = state.styleReferences.map((item) => item.file);
  renderStyleReferencePreview();
  renderStyleReferenceList();
  markDesignInputsDirty("画风参考图已变化");
}

function clearStyleReferences() {
  state.styleReferences = [];
  state.styleReferenceFiles = [];
  renderStyleReferencePreview();
  renderStyleReferenceList("画风参考图已清空");
  markDesignInputsDirty("画风参考图已清空");
}

function markDesignInputsDirty(reason = "设计稿输入已变化") {
  state.designInputVersion += 1;
  reason = unlockLockedTotalAssetForStyleReferenceChange(reason);
  markLockedDesignDraftsStale(reason);
  const affectsStyleAnalysis = reason.includes("画风参考图") || reason.includes("生图关键词");
  if (affectsStyleAnalysis && state.styleAnalysisCache?.status === "ready") {
    state.styleAnalysisCache.dirty = true;
    state.styleAnalysisCache.dirtyReason = reason;
  }
  const affectsUiAssetKit = affectsStyleAnalysis || reason.includes("图像模型") || reason.includes("策划") || reason.includes("交互");
  if (affectsUiAssetKit && state.totalAssetKit?.status === "ready") {
    patchTotalAssetKit({
      dirty: true,
      dirtyReason: reason,
      ui: { ...(state.totalAssetKit.ui || createEmptyTotalAssetPart()), dirty: true, dirtyReason: reason },
      background: { ...(state.totalAssetKit.background || createEmptyTotalAssetPart()), dirty: true, dirtyReason: reason },
      character: { ...(state.totalAssetKit.character || createEmptyTotalAssetPart()), dirty: true, dirtyReason: reason }
    });
    persistLockedTotalAssetIfNeeded();
  }
  if (reason.includes("策划") || reason.includes("交互") || reason.includes("目标界面")) {
    state.designCompositionAnalyses = {};
  }
  renderDesignPromptSummary();
  syncStyleAnalysisRefreshButtonState();
  syncUiAssetKitButtonState();

  if (hasAnyDesignJobGenerating()) {
    state.isGeneratingDesign = true;
    renderDesignTabs();
    renderDesignOutput();
    syncDesignGenerateButtonState();
    $("#designStatus").textContent = `${reason}，正在生成的界面完成后可按需重新生成`;
    return;
  }

  const hasDrafts = Object.keys(state.designDrafts || {}).length > 0;
  renderDesignTabs();
  syncDesignGenerateButtonState();
  updateLockedDesignDraftButton();
  $("#designStatus").textContent = hasDrafts
    ? `${reason}，已有设计稿保留，重新生成当前界面后才会更新`
    : reason;
}

function resetStyleAnalysisCache() {
  state.styleTransferKeywords = "";
  state.styleAnalysisPromise = null;
  state.styleAnalysisCache = {
    status: "idle",
    requestId: "",
    styleTransferKeywords: "",
    styleKeywordSummary: "",
    styleAnalysisSummary: "",
    styleAnalysisSections: [],
    styleAnalysisSource: "none",
    structuredAnalysis: null,
    backgroundStyleSummary: "",
    shapeLanguageSummary: "",
    buttonMorphologySummary: "",
    backgroundPromptText: "",
    shapeLanguagePromptText: "",
    buttonMorphologyPromptText: "",
    backgroundStyleSource: "none",
    shapeLanguageSource: "none",
    buttonMorphologySource: "none",
    backgroundStyleReason: "",
    shapeLanguageReason: "",
    buttonMorphologyReason: "",
    styleAnalysisCompleteness: "idle",
    styleAnalysisParseSource: "none",
    referenceImages: [],
    referenceLabels: [],
    referenceSignature: "",
    referenceSourceSignature: "",
    referenceRequestInfo: null,
    userKeywords: "",
    updatedAt: 0,
    error: "",
    dirty: false,
    dirtyReason: ""
  };
  syncStyleAnalysisRefreshButtonState();
}

function resetUiComponentBaselines() {
  state.uiComponentBaselines = {
    items: {},
    order: [],
    source: "none",
    assetVersion: "",
    coverage: null,
    layoutAnchors: []
  };
}

function syncLegacyUiAssetKit() {
  state.uiAssetKit = state.totalAssetKit?.ui || createEmptyTotalAssetPart();
  return state.uiAssetKit;
}

function patchTotalAssetKit(patch = {}) {
  const current = state.totalAssetKit || createEmptyTotalAssetKit();
  state.totalAssetKit = {
    ...current,
    ...patch,
    ui: patch.ui ? { ...(current.ui || createEmptyTotalAssetPart()), ...patch.ui } : (current.ui || createEmptyTotalAssetPart()),
    background: patch.background ? { ...(current.background || createEmptyTotalAssetPart()), ...patch.background } : (current.background || createEmptyTotalAssetPart()),
    character: patch.character ? { ...(current.character || createEmptyTotalAssetPart()), ...patch.character } : (current.character || createEmptyTotalAssetPart())
  };
  syncLegacyUiAssetKit();
  syncTotalAssetBusyRenderTimer();
  updateLockedTotalAssetButton();
  return state.totalAssetKit;
}

function patchTotalAssetPart(type, patch = {}) {
  if (!TOTAL_ASSET_TYPES.some((item) => item.id === type)) return state.totalAssetKit;
  return patchTotalAssetKit({
    [type]: {
      ...((state.totalAssetKit || createEmptyTotalAssetKit())[type] || createEmptyTotalAssetPart()),
      ...patch
    }
  });
}

function getTotalAssetPartMeta(type) {
  return TOTAL_ASSET_TYPES.find((item) => item.id === type) || TOTAL_ASSET_TYPES[0];
}

function prepareTotalAssetPartForRefresh(part = createEmptyTotalAssetPart(), { preserveFresh = true } = {}) {
  if (preserveFresh && isTotalAssetPartFresh(part)) {
    return {
      ...part,
      error: part.error || ""
    };
  }
  return {
    ...createEmptyTotalAssetPart(),
    analysis: part.analysis || null,
    status: "analyzing",
    imageUrl: "",
    referenceDataUrl: "",
    files: [],
    prompt: "",
    error: "",
    uiAssetCoverage: null,
    uiAssetStyleFidelity: null
  };
}

function structuredCloneSafe(value) {
  try {
    if (typeof structuredClone === "function") return structuredClone(value);
  } catch (error) {
    // Fall through to JSON clone for simple state objects.
  }
  return JSON.parse(JSON.stringify(value || {}));
}

function isTotalAssetBusy(kit = state.totalAssetKit || {}) {
  return kit.status === "analyzing"
    || kit.status === "generating"
    || Boolean(kit.currentAssetType)
    || TOTAL_ASSET_TYPES.some((item) => ["analyzing", "generating"].includes(kit[item.id]?.status))
    || hasAnyTotalAssetPartJobGenerating();
}

function getTotalAssetPartJob(type) {
  return state.totalAssetPartJobs?.[type] || null;
}

function isTotalAssetPartJobGenerating(type, kit = state.totalAssetKit || {}) {
  const job = getTotalAssetPartJob(type);
  return Boolean(job?.requestId)
    && job.status === "generating"
    && !job.abortController?.signal?.aborted
    && kit?.[type]?.status === "generating";
}

function hasAnyTotalAssetPartJobGenerating(kit = state.totalAssetKit || {}) {
  return TOTAL_ASSET_TYPES.some((item) => isTotalAssetPartJobGenerating(item.id, kit));
}

function isSingleTotalAssetPartGenerating(kit = state.totalAssetKit || {}) {
  return hasAnyTotalAssetPartJobGenerating(kit);
}

function isActiveTotalAssetPartGenerating(type = state.totalAssetActiveType, kit = state.totalAssetKit || {}) {
  return isTotalAssetPartJobGenerating(type, kit) || kit?.[type]?.status === "generating";
}

function isTotalAssetFullGenerationBusy(kit = state.totalAssetKit || {}) {
  return kit.status === "analyzing" || kit.status === "generating";
}

function setTotalAssetPartJob(type, job = {}) {
  if (!TOTAL_ASSET_TYPES.some((item) => item.id === type)) return null;
  state.totalAssetPartJobs = {
    ...(state.totalAssetPartJobs || {}),
    [type]: job
  };
  return state.totalAssetPartJobs[type];
}

function clearTotalAssetPartJob(type, requestId = "") {
  const current = getTotalAssetPartJob(type);
  if (requestId && current?.requestId && current.requestId !== requestId) return false;
  if (!current && !state.totalAssetPartJobs?.[type]) return false;
  state.totalAssetPartJobs = { ...(state.totalAssetPartJobs || {}) };
  delete state.totalAssetPartJobs[type];
  return true;
}

function cancelTotalAssetPartJob(type, message = "已取消生成") {
  const job = getTotalAssetPartJob(type);
  if (!job?.requestId) return false;
  const error = createClientAbortError(message);
  if (job.abortController && !job.abortController.signal.aborted) {
    job.abortController.abort(error);
  }
  clearTotalAssetPartJob(type, job.requestId);
  const partPatch = {
    status: "error",
    imageUrl: "",
    referenceDataUrl: "",
    files: [],
    error: message
  };
  if (type === "ui") {
    partPatch.uiAssetCoverage = null;
    partPatch.uiAssetStyleFidelity = null;
  }
  patchTotalAssetPart(type, partPatch);
  patchTotalAssetKit({
    status: getTotalAssetReadyTypes(state.totalAssetKit).length === TOTAL_ASSET_TYPES.length ? "ready" : "error",
    currentAssetType: "",
    currentAssetStartedAt: 0,
    error: message
  });
  $("#designStatus").textContent = `${getTotalAssetPartMeta(type).label}${message}`;
  renderDesignPromptSummary();
  renderUiAssetOutputIfActive();
  syncDesignGenerateButtonState();
  return true;
}

function cancelAllTotalAssetPartJobs(message = "已取消生成") {
  return TOTAL_ASSET_TYPES
    .map((item) => cancelTotalAssetPartJob(item.id, message))
    .some(Boolean);
}

function getTotalAssetReadyTypes(kit = state.totalAssetKit || {}) {
  return TOTAL_ASSET_TYPES.filter((item) => kit[item.id]?.status === "ready" && kit[item.id]?.imageUrl).map((item) => item.id);
}

function getMinimumUsableReferenceEvidenceCount(imageCount = 0) {
  const count = Math.max(0, Number(imageCount) || 0);
  return count > 1 ? count : count ? 1 : 0;
}

function formatReferenceEvidenceGateText(imageCount = 0) {
  const required = getMinimumUsableReferenceEvidenceCount(imageCount);
  return required ? `必须 ${required}/${imageCount} 张参考图都通过后才会生成` : "请先上传可分析的参考图";
}

function enforceTotalAssetImageTimeout() {
  const kit = state.totalAssetKit || {};
  if (kit.status !== "generating" || !kit.currentAssetType || !kit.currentAssetStartedAt) return false;
  return false;
}

function syncTotalAssetBusyRenderTimer() {
  if (typeof window === "undefined") return;
  const busy = isTotalAssetBusy(state.totalAssetKit);
  if (busy && !state.totalAssetBusyRenderTimer) {
    state.totalAssetBusyRenderTimer = window.setInterval(() => {
      if (!isTotalAssetBusy(state.totalAssetKit)) {
        syncTotalAssetBusyRenderTimer();
        return;
      }
      if (enforceTotalAssetImageTimeout()) {
        syncTotalAssetBusyRenderTimer();
        return;
      }
      renderDesignPromptSummary();
      renderUiAssetOutputIfActive();
    }, 1000);
    return;
  }
  if (!busy && state.totalAssetBusyRenderTimer) {
    window.clearInterval(state.totalAssetBusyRenderTimer);
    state.totalAssetBusyRenderTimer = null;
  }
}

function createClientAbortError(message = "已取消分析，未生成总资产") {
  const error = new Error(message);
  error.name = "AbortError";
  error.isAbort = true;
  return error;
}

function createClientTimeoutError(message = "请求超时") {
  const error = new Error(message);
  error.name = "TimeoutError";
  error.isTimeout = true;
  return error;
}

function getAbortReason(signal, fallbackMessage = "已取消分析，未生成总资产") {
  const reason = signal?.reason;
  if (reason instanceof Error) return reason;
  if (typeof reason === "string" && reason.trim()) return createClientAbortError(reason.trim());
  return createClientAbortError(fallbackMessage);
}

function isClientAbortError(error) {
  const message = String(error?.message || "");
  return Boolean(error?.isAbort)
    || error?.name === "AbortError"
    || /abort|aborted|cancel|cancelled|取消|已取消/i.test(message);
}

function isClientTimeoutError(error) {
  const message = String(error?.message || "");
  return Boolean(error?.isTimeout)
    || error?.name === "TimeoutError"
    || /timeout|超时/i.test(message);
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw getAbortReason(signal);
}

async function fetchJsonWithClientTimeout(url, payload, { signal, timeoutMs = 0, timeoutMessage = "请求超时" } = {}) {
  const controller = new AbortController();
  let timeoutId = null;
  let timeoutReject = null;
  const abortWithReason = (reason) => {
    if (controller.signal.aborted) return;
    try {
      controller.abort(reason);
    } catch (error) {
      controller.abort();
    }
  };
  const onAbort = () => abortWithReason(getAbortReason(signal));

  if (signal) {
    if (signal.aborted) {
      onAbort();
    } else {
      signal.addEventListener("abort", onAbort, { once: true });
    }
  }
  if (timeoutMs > 0) {
    timeoutId = setTimeout(() => {
      const timeoutError = createClientTimeoutError(timeoutMessage);
      abortWithReason(timeoutError);
      timeoutReject?.(timeoutError);
    }, timeoutMs);
  }

  try {
    const fetchPromise = fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    const timeoutPromise = timeoutMs > 0
      ? new Promise((_, reject) => {
        timeoutReject = reject;
      })
      : null;
    const response = await (timeoutPromise ? Promise.race([fetchPromise, timeoutPromise]) : fetchPromise);
    const data = await response.json().catch(() => ({}));
    return { response, data };
  } catch (error) {
    if (controller.signal.aborted) {
      const reason = controller.signal.reason;
      throw reason instanceof Error ? reason : getAbortReason(controller.signal, error?.message);
    }
    throw error;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    if (signal) signal.removeEventListener("abort", onAbort);
  }
}

function cancelTotalAssetAnalysis(message = "已取消分析，未生成总资产") {
  const kit = state.totalAssetKit || {};
  if (!isTotalAssetBusy(kit)) return false;
  if (!isTotalAssetFullGenerationBusy(kit) && hasAnyTotalAssetPartJobGenerating(kit)) {
    return cancelAllTotalAssetPartJobs(message);
  }
  const error = createClientAbortError(message);
  if (state.totalAssetCancelController && !state.totalAssetCancelController.signal.aborted) {
    state.totalAssetCancelController.abort(error);
  }
  cancelAllTotalAssetPartJobs(message);
  patchTotalAssetKit({
    status: "error",
    requestId: `${kit.requestId || "total_asset"}_cancelled_${Date.now()}`,
    error: message,
    currentAssetType: "",
    currentAssetStartedAt: 0,
    dirty: false,
    dirtyReason: "",
    analysis: {
      ...(kit.analysis || {}),
      analysisStatus: "cancelled",
      missingEvidence: [message],
      referenceImageCount: kit.analysis?.referenceImageCount || getCurrentEvidenceProgressItems(kit).length || 0,
      referenceEvidenceSet: kit.analysis?.referenceEvidenceSet || [],
      evidenceProgress: getCurrentEvidenceProgressItems(kit)
    },
    ui: { ...(kit.ui || createEmptyTotalAssetPart()), status: "error", error: message, uiAssetCoverage: null },
    background: { ...(kit.background || createEmptyTotalAssetPart()), status: "error", error: message },
    character: { ...(kit.character || createEmptyTotalAssetPart()), status: "error", error: message }
  });
  state.totalAssetKitPromise = null;
  state.uiAssetKitPromise = null;
  state.totalAssetCancelController = null;
  state.totalAssetPartJobs = {};
  $("#designStatus").textContent = message;
  renderDesignPromptSummary();
  renderDesignTabs();
  renderUiAssetOutputIfActive();
  syncUiAssetKitButtonState();
  syncDesignGenerateButtonState();
  return true;
}

function resetUiAssetKit({ force = false, reason = "输入内容已变化" } = {}) {
  if (state.totalAssetCancelController && !state.totalAssetCancelController.signal.aborted) {
    state.totalAssetCancelController.abort(createClientAbortError("已重置总资产生成"));
  }
  cancelAllTotalAssetPartJobs("已重置总资产生成");
  state.totalAssetCancelController = null;
  state.uiAssetKitPromise = null;
  state.totalAssetKitPromise = null;
  state.totalAssetPartJobs = {};
  if (!force && hasUsableTotalAssetKit(state.totalAssetKit || {})) {
    patchTotalAssetKit({
      dirty: true,
      dirtyReason: reason,
      currentAssetType: "",
      currentAssetStartedAt: 0
    });
    persistLockedTotalAssetIfNeeded();
    syncUiAssetKitButtonState();
    updateLockedTotalAssetButton();
    return;
  }
  if (!force && restoreLockedTotalAssetFromStorage({ render: false })) {
    patchTotalAssetKit({
      dirty: true,
      dirtyReason: reason,
      currentAssetType: "",
      currentAssetStartedAt: 0
    });
    persistLockedTotalAssetIfNeeded();
    syncUiAssetKitButtonState();
    updateLockedTotalAssetButton();
    return;
  }
  state.totalAssetKit = createEmptyTotalAssetKit();
  state.totalAssetActiveType = "ui";
  syncLegacyUiAssetKit();
  syncTotalAssetBusyRenderTimer();
  syncUiAssetKitButtonState();
  updateLockedTotalAssetButton();
}

function saveStylePromptSelection() {
  const prompt = $("#styleKeywords");
  const selection = window.getSelection();
  if (!prompt || !selection || !selection.rangeCount) return;
  const range = selection.getRangeAt(0);
  if (prompt.contains(range.commonAncestorContainer)) {
    savedStylePromptRange = range.cloneRange();
  }
  renderStyleReferenceList();
}

function insertStylePromptToken(token) {
  const prompt = $("#styleKeywords");
  if (!prompt) return;

  const tokenNode = document.createElement("span");
  tokenNode.className = "style-prompt-token";
  tokenNode.textContent = token;

  if (!insertNodeAtStylePromptCaret(tokenNode)) {
    if (getStylePromptText()) prompt.appendChild(document.createTextNode(" "));
    prompt.appendChild(tokenNode);
    prompt.appendChild(document.createTextNode(" "));
    moveCaretToEnd(prompt);
  } else {
    insertTextAtCurrentStylePromptSelection(" ");
  }

  prompt.focus();
  saveStylePromptSelection();
  markDesignInputsDirty("生图关键词已变化");
  renderStyleReferenceList();
}

function insertNodeAtStylePromptCaret(node) {
  const prompt = $("#styleKeywords");
  const selection = window.getSelection();
  let range = null;

  if (selection?.rangeCount) {
    const currentRange = selection.getRangeAt(0);
    if (prompt?.contains(currentRange.commonAncestorContainer)) {
      range = currentRange;
    }
  }

  if (!range && savedStylePromptRange && prompt?.contains(savedStylePromptRange.commonAncestorContainer)) {
    range = savedStylePromptRange;
    selection.removeAllRanges();
    selection.addRange(range);
  }

  if (!range) return false;
  range.deleteContents();
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

function insertTextAtCurrentStylePromptSelection(text) {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return;
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const textNode = document.createTextNode(text);
  range.insertNode(textNode);
  range.setStartAfter(textNode);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

function moveCaretToEnd(element) {
  const range = document.createRange();
  const selection = window.getSelection();
  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function getStylePromptText() {
  const prompt = $("#styleKeywords");
  const text = (prompt?.innerText || "").replace(/\u00a0/g, " ").trim();
  const placeholder = (prompt?.dataset?.placeholder || "").replace(/\u00a0/g, " ").trim();
  return text && text !== placeholder ? text : "";
}

function getReferencedStyleIndices() {
  const matches = Array.from(getStylePromptText().matchAll(/图\s*([1-6])/g));
  const indices = [...new Set(matches.map((match) => Number(match[1]) - 1))];
  return indices.filter((index) => index >= 0 && index < state.styleReferences.length);
}

function getActiveStyleReferences() {
  const referencedIndices = getReferencedStyleIndices();
  const indices = referencedIndices.length
    ? referencedIndices
    : state.styleReferences.map((_, index) => index);
  return indices.map((index) => ({
    ...state.styleReferences[index],
    originalIndex: index,
    label: `图${index + 1}`
  }));
}

function buildStyleReferenceRules(labelsOverride = null) {
  if (Array.isArray(labelsOverride)) {
    if (!labelsOverride.length) {
      return "未锁定画风参考图，请根据文字关键词、策划案和交互案生成。";
    }
    const labels = labelsOverride.join("、");
    return [
      `本次锁定的画风参考图标签：${labels}。`,
      "生成界面设计稿时必须复用这一次锁定的参考图分析，不要因为切换界面而重新解释画风。",
      "参考图只用于迁移色彩、材质、线条、UI 质感、图形语言、按钮风格、字体气质和光影氛围。",
      "不要复制参考图中的文字、水印、无关角色、无关道具、IP 标识或主题绑定装饰。"
    ].join("\n");
  }
  const activeReferences = getActiveStyleReferences();
  if (!activeReferences.length) {
    return "未提供画风参考图，请根据文字关键词和策划案生成。";
  }

  const labels = activeReferences.map((item) => item.label).join("、");
  return [
    `本次附带的画风参考图标签：${labels}。`,
    "如果提示词明确提到某个图号，只使用对应图号作为画风参考，不要替换成其他图。",
    "参考图只用于色彩、材质、线条、UI 质感、图形语言和光影氛围。",
    "不要复制参考图中的文字、水印、无关角色、无关构图或版权元素。"
  ].join("\n");
}

function formatFileSize(size) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))}KB`;
  return `${(size / 1024 / 1024).toFixed(1)}MB`;
}

function extractLooseText(buffer) {
  const bytes = new Uint8Array(buffer);
  let text = "";
  for (let i = 0; i < bytes.length; i += 1) {
    const code = bytes[i];
    text += code >= 32 && code <= 126 ? String.fromCharCode(code) : " ";
  }
  return text.replace(/\s+/g, " ").slice(0, 5000);
}

function setDocumentMode(docName) {
  if (!["gameDesign", "plan"].includes(docName)) return;
  state.docModes[docName] = "preview";
  renderMarkdownDocument(docName);
}

function getEmptyLockedDocsSnapshot() {
  return {
    version: 1,
    locked: {
      brief: false,
      gameDesign: false,
      plan: false
    },
    docs: {},
    updatedAt: 0
  };
}

function normalizeDesignDraftAssetReferenceSelection(selection = {}) {
  return TOTAL_ASSET_TYPES.reduce((acc, meta) => {
    acc[meta.id] = selection?.[meta.id] !== false;
    return acc;
  }, { ...DEFAULT_DESIGN_DRAFT_ASSET_REFERENCE_SELECTION });
}

function createDefaultDesignDraftAssetReferenceSelection() {
  return normalizeDesignDraftAssetReferenceSelection(DEFAULT_DESIGN_DRAFT_ASSET_REFERENCE_SELECTION);
}

function getDesignDraftAssetReferenceSelection() {
  state.designDraftAssetReferenceSelection = normalizeDesignDraftAssetReferenceSelection(state.designDraftAssetReferenceSelection);
  return state.designDraftAssetReferenceSelection;
}

function setDesignDraftAssetReferenceSelection(type, checked) {
  if (!TOTAL_ASSET_TYPES.some((item) => item.id === type)) return;
  state.designDraftAssetReferenceSelection = {
    ...getDesignDraftAssetReferenceSelection(),
    [type]: Boolean(checked)
  };
  persistLockedTotalAssetIfNeeded();
}

function getDesignDraftScreenKey(screen = {}) {
  const nameKey = normalizeBriefForScreenDetect(screen?.name || screen?.screenName || "");
  const kindKey = normalizeBriefForScreenDetect(screen?.kind || screen?.screenKind || "generic");
  return [kindKey || "generic", nameKey].filter(Boolean).join(":");
}

function getDesignDraftForScreen(screen = {}) {
  if (!screen?.id) return null;
  const directDraft = state.designDrafts?.[screen.id];
  if (directDraft) return directDraft;

  const targetKey = getDesignDraftScreenKey(screen);
  if (!targetKey) return null;
  return Object.values(state.designDrafts || {}).find((draft) => {
    if (!draft) return false;
    if (draft.screenKey && draft.screenKey === targetKey) return true;
    return getDesignDraftScreenKey({
      name: draft.screenName,
      kind: draft.screenKind || screen.kind
    }) === targetKey;
  }) || null;
}

function setDesignDraftForScreen(screen = {}, draft = null) {
  if (!screen?.id || !draft) return null;
  const enrichedDraft = {
    ...draft,
    screenId: screen.id,
    screenName: screen.name || draft.screenName || "",
    screenKind: screen.kind || draft.screenKind || "generic",
    screenKey: getDesignDraftScreenKey(screen),
    lastJobType: draft.lastJobType || "draft-generate",
    locked: state.lockedDesignDraft ? true : Boolean(draft.locked),
    isLocked: state.lockedDesignDraft ? true : Boolean(draft.isLocked),
    frozenSnapshotStaleReason: state.lockedDesignDraft ? (state.lockedDesignDraftStaleReason || draft.frozenSnapshotStaleReason || "") : (draft.frozenSnapshotStaleReason || "")
  };
  state.designDrafts = state.designDrafts || {};
  state.designDrafts[screen.id] = enrichedDraft;
  persistLockedDesignDraftIfNeeded();
  return enrichedDraft;
}

function getDesignScreenById(screenId = "") {
  if (!screenId) return null;
  return getSelectedScreens().find((screen) => screen.id === screenId) || null;
}

function getDesignLateRecovery(screenId = "", requestId = "") {
  return state.designLateRecoveries?.[screenId]?.[requestId] || null;
}

function clearDesignLateRecovery(screenId = "", requestId = "") {
  if (!screenId || !state.designLateRecoveries?.[screenId]) return;
  const entries = state.designLateRecoveries[screenId];
  const requestIds = requestId ? [requestId] : Object.keys(entries);
  requestIds.forEach((id) => {
    const item = entries[id];
    if (item?.timerId) {
      clearInterval(item.timerId);
    }
    delete entries[id];
  });
  if (!Object.keys(entries).length) {
    delete state.designLateRecoveries[screenId];
  }
}

function registerDesignLateRecovery(screen = {}, requestId = "", context = {}) {
  if (!screen?.id || !requestId) return null;
  const screenId = screen.id;
  const existing = getDesignLateRecovery(screenId, requestId);
  if (existing?.timerId) {
    clearInterval(existing.timerId);
  }
  state.designLateRecoveries = state.designLateRecoveries || {};
  state.designLateRecoveries[screenId] = state.designLateRecoveries[screenId] || {};
  const entry = {
    screenId,
    screenName: screen.name || context.screenName || "",
    screenKind: screen.kind || context.screenKind || "generic",
    requestId,
    startedAt: Date.now(),
    attempts: 0,
    maxAttempts: context.maxAttempts || 180,
    pollIntervalMs: context.pollIntervalMs || 2500,
    fallbackDraft: context.fallbackDraft ? { ...context.fallbackDraft } : null,
    prompt: context.prompt || "",
    model: context.model || "",
    referenceCount: context.referenceCount || 0,
    referenceLabels: Array.isArray(context.referenceLabels) ? [...context.referenceLabels] : [],
    preflightWarnings: Array.isArray(context.preflightWarnings) ? [...context.preflightWarnings] : [],
    styleReferenceRequestInfo: context.styleReferenceRequestInfo || null,
    styleTransferKeywords: context.styleTransferKeywords || "",
    uiAssetVersion: context.uiAssetVersion || "",
    totalAssetVersion: context.totalAssetVersion || "",
    totalAssetRoles: Array.isArray(context.totalAssetRoles) ? [...context.totalAssetRoles] : [],
    usedUiAsset: Boolean(context.usedUiAsset),
    usedTotalAsset: Boolean(context.usedTotalAsset),
    directMode: context.directMode !== false,
    batchStatus: context.batchStatus || "",
    timerId: null
  };
  state.designLateRecoveries[screenId][requestId] = entry;
  const currentDraft = getDesignDraftForScreen(screen);
  if (currentDraft) {
    setDesignDraftForScreen(screen, {
      ...currentDraft,
      pendingLateRequestId: requestId,
      lastFailedRequestId: requestId
    });
  }
  return entry;
}

function markDesignBatchRecovered(screenId = "") {
  if (!screenId || !state.designBatch) return;
  const completed = new Set(Array.isArray(state.designBatch.completedScreenIds) ? state.designBatch.completedScreenIds : []);
  const failed = new Set(Array.isArray(state.designBatch.failedScreenIds) ? state.designBatch.failedScreenIds : []);
  if (failed.has(screenId)) {
    failed.delete(screenId);
    state.designBatch.failed = Math.max(0, (Number(state.designBatch.failed) || 0) - 1);
  }
  if (!completed.has(screenId)) {
    completed.add(screenId);
    state.designBatch.success = Math.max(0, Number(state.designBatch.success) || 0) + 1;
  }
  state.designBatch.completedScreenIds = Array.from(completed);
  state.designBatch.failedScreenIds = Array.from(failed);
}

function shouldApplyRecoveredDesignDraft(screen = {}, requestId = "", completedAt = 0) {
  if (!screen?.id || !requestId) return false;
  const currentJob = getDesignJob(screen.id);
  const currentDraft = getDesignDraftForScreen(screen);
  if (currentJob?.status === "generating" && currentJob.requestId !== requestId) {
    return false;
  }
  if (currentJob?.requestId && currentJob.requestId !== requestId && ["success", "generating"].includes(currentJob.status)) {
    return false;
  }
  if (!currentDraft?.imageUrl) return true;
  if (currentDraft.requestId === requestId) return true;
  if (currentDraft.pendingLateRequestId === requestId || currentDraft.lastFailedRequestId === requestId) {
    return true;
  }
  const draftCompletedAt = Number(currentDraft.completedAt || 0);
  if (draftCompletedAt && completedAt) {
    return completedAt >= draftCompletedAt;
  }
  return false;
}

function buildRecoveredDesignDraftFromStatus(screen = {}, requestId = "", status = {}, recovery = null) {
  const currentDraft = getDesignDraftForScreen(screen) || {};
  const fallbackDraft = recovery?.fallbackDraft || {};
  return {
    ...fallbackDraft,
    ...currentDraft,
    imageUrl: status.imageUrl || status.images?.[0] || "",
    files: Array.isArray(status.files) ? status.files : [],
    prompt: recovery?.prompt || currentDraft.prompt || fallbackDraft.prompt || "",
    requestId,
    model: status.model || recovery?.model || currentDraft.model || fallbackDraft.model || "",
    durationMs: status.durationMs || 0,
    referenceCount: Number.isFinite(Number(status.referenceCount)) ? Number(status.referenceCount) : (recovery?.referenceCount || currentDraft.referenceCount || 0),
    referenceLabels: Array.isArray(recovery?.referenceLabels) ? recovery.referenceLabels : (currentDraft.referenceLabels || []),
    preflightWarnings: [
      ...(Array.isArray(recovery?.preflightWarnings) ? recovery.preflightWarnings : []),
      ...(Array.isArray(status.referenceWarnings) ? status.referenceWarnings.filter(Boolean) : [])
    ],
    styleReferenceRequestInfo: recovery?.styleReferenceRequestInfo || currentDraft.styleReferenceRequestInfo || null,
    styleTransferKeywords: recovery?.styleTransferKeywords || currentDraft.styleTransferKeywords || "",
    uiAssetVersion: recovery?.uiAssetVersion || currentDraft.uiAssetVersion || "",
    totalAssetVersion: recovery?.totalAssetVersion || currentDraft.totalAssetVersion || "",
    totalAssetRoles: Array.isArray(recovery?.totalAssetRoles) ? recovery.totalAssetRoles : (currentDraft.totalAssetRoles || []),
    usedUiAsset: recovery?.usedUiAsset ?? currentDraft.usedUiAsset,
    usedTotalAsset: recovery?.usedTotalAsset ?? currentDraft.usedTotalAsset,
    directMode: recovery?.directMode ?? currentDraft.directMode,
    lastJobType: "draft-generate",
    error: "",
    pendingLateRequestId: "",
    lastFailedRequestId: "",
    lastError: "",
    recoveredLateResult: true,
    completedAt: Number(status.updatedAt) || Date.now()
  };
}

function applyRecoveredDesignDraftIfEligible(screen = {}, requestId = "", status = {}) {
  if (!screen?.id || !requestId) return false;
  const completedAt = Number(status.updatedAt || 0);
  if (!shouldApplyRecoveredDesignDraft(screen, requestId, completedAt)) return false;
  const recovery = getDesignLateRecovery(screen.id, requestId);
  const recoveredDraft = buildRecoveredDesignDraftFromStatus(screen, requestId, status, recovery);
  if (!recoveredDraft.imageUrl) return false;
  setDesignDraftForScreen(screen, recoveredDraft);
  const currentJob = getDesignJob(screen.id);
  if (currentJob?.requestId === requestId || currentJob?.lastTrackedRequestId === requestId) {
    state.designJobs[screen.id] = {
      ...currentJob,
      status: "success",
      phase: "",
      error: "",
      requestStatus: "completed",
      designRequestStatus: status,
      abortController: null,
      completedAt: recoveredDraft.completedAt,
      cancelledByUser: false
    };
  }
  markDesignBatchRecovered(screen.id);
  clearDesignLateRecovery(screen.id, requestId);
  renderDesignTabs();
  if (state.activeDesignScreen === screen.id) {
    $("#designStatus").textContent = `${screen.name} 的晚到结果已自动补回`;
    renderDesignOutput();
  }
  syncDesignGenerateButtonState();
  return true;
}

async function pollDetachedDesignResult(screen = {}, requestId = "") {
  if (!screen?.id || !requestId) return false;
  const recovery = getDesignLateRecovery(screen.id, requestId);
  if (!recovery) return false;
  let data = null;
  try {
    const response = await fetch(`/api/design-request-status?requestId=${encodeURIComponent(requestId)}`, { cache: "no-store" });
    data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`状态接口返回 ${response.status}`);
    }
  } catch (error) {
    recovery.attempts += 1;
    if (recovery.attempts >= recovery.maxAttempts) {
      clearDesignLateRecovery(screen.id, requestId);
    }
    return false;
  }
  recovery.attempts += 1;
  if (!data?.found) {
    if (recovery.attempts >= recovery.maxAttempts) {
      clearDesignLateRecovery(screen.id, requestId);
    }
    return false;
  }
  if (data.stage === "completed" && (data.imageUrl || data.images?.[0])) {
    const applied = applyRecoveredDesignDraftIfEligible(screen, requestId, data);
    if (!applied) {
      clearDesignLateRecovery(screen.id, requestId);
    }
    return applied;
  }
  if (data.stage === "failed" || recovery.attempts >= recovery.maxAttempts) {
    clearDesignLateRecovery(screen.id, requestId);
  }
  return false;
}

function startDetachedDesignResultPolling(screen = {}, requestId = "", context = {}) {
  if (!screen?.id || !requestId) return null;
  const recovery = registerDesignLateRecovery(screen, requestId, context);
  if (!recovery) return null;
  pollDetachedDesignResult(screen, requestId);
  recovery.timerId = setInterval(() => {
    if (!getDesignLateRecovery(screen.id, requestId)) return;
    pollDetachedDesignResult(screen, requestId);
  }, recovery.pollIntervalMs);
  return recovery;
}

function reconcileDesignDraftsForScreens(nextScreens = [], previousDrafts = state.designDrafts || {}, previousScreens = screens || []) {
  const reconciled = {};
  const usedSourceIds = new Set();
  const previousScreenById = new Map((previousScreens || []).map((screen) => [screen.id, screen]));
  nextScreens.forEach((screen) => {
    if (!screen?.id) return;
    const directDraft = previousDrafts?.[screen.id];
    if (directDraft) {
      reconciled[screen.id] = {
        ...directDraft,
        screenId: screen.id,
        screenName: screen.name || directDraft.screenName || "",
        screenKind: screen.kind || directDraft.screenKind || "generic",
        screenKey: getDesignDraftScreenKey(screen)
      };
      usedSourceIds.add(screen.id);
      return;
    }

    const screenKey = getDesignDraftScreenKey(screen);
    const matchedEntry = Object.entries(previousDrafts || {}).find(([draftId, draft]) => {
      if (usedSourceIds.has(draftId) || !draft) return false;
      const previousScreen = previousScreenById.get(draftId);
      if (previousScreen && getDesignDraftScreenKey(previousScreen) === screenKey) return true;
      if (draft.screenKey && draft.screenKey === screenKey) return true;
      return getDesignDraftScreenKey({
        name: draft.screenName,
        kind: draft.screenKind || screen.kind
      }) === screenKey;
    });
    if (!matchedEntry) return;
    const [draftId, draft] = matchedEntry;
    reconciled[screen.id] = {
      ...draft,
      screenId: screen.id,
      screenName: screen.name || draft.screenName || "",
      screenKind: screen.kind || draft.screenKind || "generic",
      screenKey
    };
    usedSourceIds.add(draftId);
  });
  return reconciled;
}

function reconcileDesignJobsForScreens(nextScreens = [], previousJobs = state.designJobs || {}, previousScreens = screens || []) {
  const reconciled = {};
  const usedSourceIds = new Set();
  const previousScreenById = new Map((previousScreens || []).map((screen) => [screen.id, screen]));
  const nextScreenKeys = new Set((nextScreens || []).map(getDesignDraftScreenKey).filter(Boolean));

  nextScreens.forEach((screen) => {
    if (!screen?.id) return;
    const directJob = previousJobs?.[screen.id];
    if (directJob) {
      reconciled[screen.id] = directJob;
      usedSourceIds.add(screen.id);
      return;
    }

    const screenKey = getDesignDraftScreenKey(screen);
    const matchedEntry = Object.entries(previousJobs || {}).find(([jobId, job]) => {
      if (usedSourceIds.has(jobId) || !job) return false;
      const previousScreen = previousScreenById.get(jobId);
      if (previousScreen && getDesignDraftScreenKey(previousScreen) === screenKey) return true;
      return getDesignDraftScreenKey({
        name: job.screenName,
        kind: job.screenKind || screen.kind
      }) === screenKey;
    });
    if (!matchedEntry) return;
    const [jobId, job] = matchedEntry;
    reconciled[screen.id] = {
      ...job,
      screenId: screen.id,
      screenName: screen.name || job.screenName || "",
      screenKind: screen.kind || job.screenKind || "generic",
      screenKey
    };
    usedSourceIds.add(jobId);
  });

  Object.entries(previousJobs || {}).forEach(([jobId, job]) => {
    if (!job || usedSourceIds.has(jobId) || job.status !== "generating") return;
    const previousScreen = previousScreenById.get(jobId);
    const previousKey = previousScreen ? getDesignDraftScreenKey(previousScreen) : getDesignDraftScreenKey(job);
    if (previousKey && nextScreenKeys.has(previousKey)) return;
    if (job.abortController && !job.abortController.signal.aborted) {
      job.abortController.abort(createClientAbortError(`${previousScreen?.name || job.screenName || "目标界面"}已取消生成：目标界面已从列表移除`));
    }
    clearDesignJobProgressTimer(job);
    clearDesignJobStatusPolling(job);
  });

  return reconciled;
}

function reconcileDesignEditJobsForScreens(nextScreens = [], previousJobs = state.designEditJobs || {}, previousScreens = screens || []) {
  const reconciled = {};
  const usedSourceIds = new Set();
  const previousScreenById = new Map((previousScreens || []).map((screen) => [screen.id, screen]));
  const nextScreenKeys = new Set((nextScreens || []).map(getDesignDraftScreenKey).filter(Boolean));

  nextScreens.forEach((screen) => {
    if (!screen?.id) return;
    const directJob = previousJobs?.[screen.id];
    if (directJob) {
      reconciled[screen.id] = {
        ...directJob,
        screenId: screen.id,
        screenName: screen.name || directJob.screenName || "",
        screenKind: screen.kind || directJob.screenKind || "generic",
        screenKey: getDesignDraftScreenKey(screen)
      };
      usedSourceIds.add(screen.id);
      return;
    }

    const screenKey = getDesignDraftScreenKey(screen);
    const matchedEntry = Object.entries(previousJobs || {}).find(([jobId, job]) => {
      if (usedSourceIds.has(jobId) || !job) return false;
      const previousScreen = previousScreenById.get(jobId);
      if (previousScreen && getDesignDraftScreenKey(previousScreen) === screenKey) return true;
      return getDesignDraftScreenKey({
        name: job.screenName,
        kind: job.screenKind || screen.kind
      }) === screenKey;
    });
    if (!matchedEntry) return;
    const [jobId, job] = matchedEntry;
    reconciled[screen.id] = {
      ...job,
      screenId: screen.id,
      screenName: screen.name || job.screenName || "",
      screenKind: screen.kind || job.screenKind || "generic",
      screenKey
    };
    usedSourceIds.add(jobId);
  });

  Object.entries(previousJobs || {}).forEach(([jobId, job]) => {
    if (!job || usedSourceIds.has(jobId) || job.status !== "generating") return;
    const previousScreen = previousScreenById.get(jobId);
    const previousKey = previousScreen ? getDesignDraftScreenKey(previousScreen) : getDesignDraftScreenKey(job);
    if (previousKey && nextScreenKeys.has(previousKey)) return;
    if (job.abortController && !job.abortController.signal.aborted) {
      job.abortController.abort(createClientAbortError(`${previousScreen?.name || job.screenName || "目标界面"}已取消编辑：目标界面已从列表移除`));
    }
  });

  return reconciled;
}

function unlockDesignDraftsForTotalAssetChange(reason = "总资产已更新，设计稿需重新生成") {
  if (state.lockedDesignDraft) {
    return markLockedDesignDraftsStale(reason);
  }
  let changed = false;
  Object.entries(state.designDrafts || {}).forEach(([screenId, draft]) => {
    if (!draft?.imageUrl) return;
    state.designDrafts[screenId] = {
      ...draft,
      locked: false,
      isLocked: false,
      totalAssetStaleReason: reason
    };
    changed = true;
  });
  return changed;
}

function readLockedDocsStorage() {
  try {
    const raw = window.localStorage?.getItem(LOCKED_DOCS_STORAGE_KEY);
    if (!raw) return getEmptyLockedDocsSnapshot();
    const parsed = JSON.parse(raw);
    return {
      ...getEmptyLockedDocsSnapshot(),
      ...parsed,
      locked: {
        ...getEmptyLockedDocsSnapshot().locked,
        ...(parsed?.locked || {})
      },
      docs: parsed?.docs || {}
    };
  } catch (error) {
    console.warn(error);
    return getEmptyLockedDocsSnapshot();
  }
}

function collectLockedDocsSnapshot() {
  const normalizedOutline = getNormalizedOutlineFromEditor();
  syncPlanFromEditor();
  return {
    version: 2,
    locked: { ...state.lockedDocs },
    docs: {
      briefText: briefText?.value || "",
      gameName: gameName?.value || state.gameName || "",
      platform: $("#platform")?.value || "",
      projectSignature: getCurrentProjectSignature(),
      normalizedOutline,
      normalizedOutlineRows: state.normalizedOutlineRows || [],
      normalizedOutlineSignature: state.normalizedOutlineSignature || "",
      normalizedOutlineSourceSignature: getNormalizedOutlineSourceSignature(),
      normalizedOutlineManual: state.normalizedOutlineManual === true,
      gameDesign: gameDesignOutput?.value || state.gameDesign || "",
      gameDesignSourceSignature: getGameDesignSourceSignature(),
      plan: planOutput?.value || state.plan || "",
      fullPlan: state.fullPlan || state.plan || planOutput?.value || "",
      planSourceSignature: getPlanSourceSignature(),
      activeTab: state.activeTab || "overview"
    },
    updatedAt: Date.now()
  };
}

function writeLockedDocsStorage(snapshot = collectLockedDocsSnapshot()) {
  try {
    window.localStorage?.setItem(LOCKED_DOCS_STORAGE_KEY, JSON.stringify(snapshot));
  } catch (error) {
    console.warn(error);
  }
}

function persistLockedDocsIfNeeded(docName = "") {
  if (!docName || !state.lockedDocs?.[docName]) return;
  writeLockedDocsStorage();
  updateLockedDocButtons();
}

function toggleLockedDoc(docName) {
  if (!["brief", "gameDesign", "plan"].includes(docName)) return;
  state.lockedDocs[docName] = !state.lockedDocs[docName];
  writeLockedDocsStorage();
  updateLockedDocButtons();
  const status = state.lockedDocs[docName] ? "已锁定，刷新页面后会自动恢复。" : "已解锁，当前内容保留但不再跨刷新恢复。";
  if (docName === "brief") {
    $("#briefStatus").textContent = `玩法大纲${status}`;
  } else if (docName === "gameDesign") {
    $("#planStatus").textContent = `策划案${status}`;
  } else {
    $("#planStatus").textContent = `交互案${status}`;
  }
}

function updateLockedDocButtons() {
  $$("[data-lock-doc]").forEach((button) => {
    const docName = button.dataset.lockDoc;
    const locked = Boolean(state.lockedDocs?.[docName]);
    button.textContent = locked ? "已锁定" : "锁定";
    button.classList.toggle("is-active", locked);
    button.setAttribute("aria-pressed", locked ? "true" : "false");
  });
}

function getVisualSvgScreenSnapshot() {
  return getSelectedScreens().map((screen) => ({
    id: screen.id,
    name: screen.name,
    kind: screen.kind,
    goal: screen.goal || "",
    closeBehavior: getScreenCloseBehavior(screen)
  }));
}

function hasUsableVisualSvgCache() {
  return Object.values(state.visualSvgs || {}).some((svg) => String(svg || "").trim());
}

function collectLockedVisualSvgSnapshot() {
  return {
    version: 1,
    locked: true,
    visualSvgs: { ...(state.visualSvgs || {}) },
    visualAnalyses: { ...(state.visualAnalyses || {}) },
    activeVisualScreen: state.activeVisualScreen || "",
    visualRequirements: $("#visualRequirements")?.value || "",
    screens: getVisualSvgScreenSnapshot(),
    updatedAt: Date.now()
  };
}

function writeLockedVisualSvgStorage(snapshot = collectLockedVisualSvgSnapshot()) {
  try {
    window.localStorage?.setItem(VISUAL_SVG_LOCK_STORAGE_KEY, JSON.stringify(snapshot));
    state.lockedVisualSvg = true;
    updateLockedVisualSvgButton();
    return true;
  } catch (error) {
    console.warn(error);
    $("#planStatus").textContent = `SVG 锁定失败：${error?.message || "浏览器本地存储空间不足"}`;
    return false;
  }
}

function readLockedVisualSvgStorage() {
  try {
    const raw = window.localStorage?.getItem(VISUAL_SVG_LOCK_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.locked ? parsed : null;
  } catch (error) {
    console.warn(error);
    return null;
  }
}

function clearLockedVisualSvgStorage() {
  try {
    window.localStorage?.removeItem(VISUAL_SVG_LOCK_STORAGE_KEY);
  } catch (error) {
    console.warn(error);
  }
}

function persistLockedVisualSvgIfNeeded() {
  if (!state.lockedVisualSvg) return false;
  return writeLockedVisualSvgStorage();
}

function unlockLockedVisualSvg(reason = "") {
  if (!state.lockedVisualSvg) return;
  state.lockedVisualSvg = false;
  clearLockedVisualSvgStorage();
  updateLockedVisualSvgButton();
  if (reason) $("#planStatus").textContent = reason;
}

function toggleLockedVisualSvg() {
  if (state.lockedVisualSvg) {
    state.lockedVisualSvg = false;
    clearLockedVisualSvgStorage();
    updateLockedVisualSvgButton();
    $("#planStatus").textContent = "可视化 SVG 已解锁，当前页面内容保留，但刷新后不再自动恢复。";
    return;
  }
  if (!hasUsableVisualSvgCache()) {
    $("#planStatus").textContent = "请先生成至少一个界面的 SVG，再锁定。";
    updateLockedVisualSvgButton();
    return;
  }
  if (writeLockedVisualSvgStorage()) {
    $("#planStatus").textContent = "可视化 SVG 已锁定，刷新页面后会自动恢复。";
  }
}

function updateLockedVisualSvgButton() {
  const button = $("#lockVisualSvg");
  if (!button) return;
  const locked = Boolean(state.lockedVisualSvg);
  button.textContent = locked ? "已锁定" : "锁定";
  button.classList.toggle("is-active", locked);
  button.setAttribute("aria-pressed", locked ? "true" : "false");
  button.title = locked
    ? "刷新页面后自动恢复当前可视化 SVG"
    : hasUsableVisualSvgCache()
      ? "锁定当前可视化 SVG，刷新页面后继续复用"
      : "请先生成 SVG";
}

function restoreLockedVisualSvgFromStorage() {
  const snapshot = readLockedVisualSvgStorage();
  if (!snapshot) {
    state.lockedVisualSvg = false;
    updateLockedVisualSvgButton();
    return false;
  }

  const selected = getSelectedScreens();
  const selectedIds = new Set(selected.map((screen) => screen.id));
  const restoredSvgs = {};
  const restoredAnalyses = {};
  Object.entries(snapshot.visualSvgs || {}).forEach(([screenId, svg]) => {
    if (selectedIds.has(screenId) && String(svg || "").trim()) {
      restoredSvgs[screenId] = svg;
    }
  });
  Object.entries(snapshot.visualAnalyses || {}).forEach(([screenId, analysis]) => {
    if (selectedIds.has(screenId) && analysis) {
      restoredAnalyses[screenId] = analysis;
    }
  });

  if (!Object.keys(restoredSvgs).length) {
    state.lockedVisualSvg = false;
    clearLockedVisualSvgStorage();
    updateLockedVisualSvgButton();
    return false;
  }

  state.lockedVisualSvg = true;
  state.visualSvgs = restoredSvgs;
  state.visualAnalyses = {
    ...(state.visualAnalyses || {}),
    ...restoredAnalyses
  };
  if ($("#visualRequirements")) {
    $("#visualRequirements").value = snapshot.visualRequirements || "";
  }
  const activeId = selectedIds.has(snapshot.activeVisualScreen) && restoredSvgs[snapshot.activeVisualScreen]
    ? snapshot.activeVisualScreen
    : Object.keys(restoredSvgs)[0];
  state.activeVisualScreen = activeId || state.activeVisualScreen;
  state.visualSvg = restoredSvgs[state.activeVisualScreen] || "";
  renderVisualTabs();
  if (state.visualSvg) {
    $("#visualCanvas").innerHTML = state.visualSvg;
  }
  $("#planStatus").textContent = "可视化 SVG 已从锁定缓存恢复";
  updateLockedVisualSvgButton();
  renderDesignPromptSummary();
  return true;
}

function restoreLockedDocsFromStorage() {
  const snapshot = readLockedDocsStorage();
  const docs = snapshot.docs || {};
  const currentProjectSignature = getCurrentProjectSignature();
  const blankProjectDraft = isBlankProjectDraft();
  const snapshotProjectSignature = normalizeProjectSignatureValue(
    docs.projectSignature
    || docs.planSourceSignature
    || docs.gameDesignSourceSignature
    || docs.normalizedOutlineSourceSignature
    || docs.normalizedOutlineSignature
    || ""
  );
  const shouldSkipRestore = !blankProjectDraft
    && Boolean(currentProjectSignature)
    && (!snapshotProjectSignature || snapshotProjectSignature !== currentProjectSignature);

  if (shouldSkipRestore) {
    state.lockedDocs = { ...state.lockedDocs };
    updateLockedDocButtons();
    updateNormalizedOutlineStatus("检测到锁定缓存属于其他项目，已跳过恢复。", "warning");
    $("#briefStatus").textContent = "已跳过其他项目的锁定缓存";
    $("#planStatus").textContent = "检测到缓存属于其他项目，已跳过恢复";
    return;
  }

  state.lockedDocs = {
    ...state.lockedDocs,
    ...(snapshot.locked || {})
  };
  let restoredBrief = false;
  let restoredGameDesign = false;
  let restoredPlan = false;
  let restoredProjectSignature = currentProjectSignature;

  if (state.lockedDocs.brief) {
    if (briefText) briefText.value = docs.briefText || "";
    if (gameName) gameName.value = docs.gameName || gameName.value || "";
    if ($("#platform") && docs.platform) $("#platform").value = docs.platform;
    state.gameName = gameName?.value || state.gameName;
    state.normalizedOutline = docs.normalizedOutline || "";
    state.normalizedOutlineSignature = docs.normalizedOutlineSignature || getRawOutlineSignature();
    state.normalizedOutlineSourceSignature = normalizeProjectSignatureValue(docs.normalizedOutlineSourceSignature || docs.normalizedOutlineSignature || docs.projectSignature || "");
    state.normalizedOutlineManual = docs.normalizedOutlineManual !== false && Boolean(state.normalizedOutline);
    const storedRows = Array.isArray(docs.normalizedOutlineRows) ? docs.normalizedOutlineRows : [];
    const parsedRows = storedRows.length
      ? storedRows
      : (state.normalizedOutline ? parseNormalizedOutlineResponse(state.normalizedOutline) : []);
    state.normalizedOutlineRows = parsedRows.length ? fillMissingNormalizedOutlineRows(parsedRows) : [];
    if (normalizedOutlineOutput) normalizedOutlineOutput.value = state.normalizedOutline;
    renderNormalizedOutlineTable(state.normalizedOutlineRows);
    updateNormalizedOutlineStatus(state.normalizedOutline ? "已恢复锁定的规范化玩法大纲。" : "已恢复锁定的玩法大纲。");
    $("#briefStatus").textContent = "玩法大纲已从锁定缓存恢复";
    restoredBrief = true;
    restoredProjectSignature = normalizeProjectSignatureValue(docs.projectSignature || getCurrentProjectSignature());
  }

  if (state.lockedDocs.gameDesign && docs.gameDesign
    && normalizeProjectSignatureValue(docs.gameDesignSourceSignature || docs.projectSignature || "") === normalizeProjectSignatureValue(restoredProjectSignature)) {
    state.gameDesign = docs.gameDesign;
    state.gameDesignSourceSignature = normalizeProjectSignatureValue(docs.gameDesignSourceSignature || docs.projectSignature || "");
    if (gameDesignOutput) gameDesignOutput.value = docs.gameDesign;
    renderMarkdownDocument("gameDesign");
    syncScreensFromBrief(docs.gameDesign);
    $("#planStatus").textContent = "策划案已从锁定缓存恢复";
    restoredGameDesign = true;
  }

  if (state.lockedDocs.plan && (docs.fullPlan || docs.plan)
    && normalizeProjectSignatureValue(docs.planSourceSignature || docs.projectSignature || "") === normalizeProjectSignatureValue(restoredProjectSignature)) {
    state.fullPlan = docs.fullPlan || docs.plan || "";
    state.plan = state.fullPlan;
    state.planSourceSignature = normalizeProjectSignatureValue(docs.planSourceSignature || docs.projectSignature || "");
    state.activeTab = docs.activeTab || "overview";
    $$(".plan-tabs button").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.planTab === state.activeTab);
    });
    renderPlanTab();
    syncActiveVisualScreen();
    syncActiveDesignScreen();
    renderVisualTabs();
    renderDesignTabs();
    $("#planStatus").textContent = "交互案已从锁定缓存恢复，可直接生成设计稿";
    restoredPlan = true;
  }

  if (state.lockedDocs.gameDesign && docs.gameDesign && !restoredGameDesign) {
    $("#planStatus").textContent = "已跳过恢复其他项目的锁定策划案";
  }
  if (state.lockedDocs.plan && (docs.fullPlan || docs.plan) && !restoredPlan) {
    $("#planStatus").textContent = "已跳过恢复其他项目的锁定交互案";
  }

  if (!restoredGameDesign && !screens.length) {
    hideTargetScreensUntilGameDesignReady();
  }
  if (!restoredPlan) {
    renderMarkdownDocument("plan");
  }
  if (restoredBrief || restoredGameDesign || restoredPlan) {
    renderDesignPromptSummary();
  }
  updateLockedDocButtons();
}

function hasUsableTotalAssetKit(kit = state.totalAssetKit || {}) {
  return kit?.status === "ready" && getTotalAssetReadyTypes(kit).length > 0 && Boolean(getTotalAssetVersion(kit));
}

function sanitizeTotalAssetPartForStorage(part = createEmptyTotalAssetPart()) {
  const clone = structuredCloneSafe(part);
  if (String(clone.referenceDataUrl || "").startsWith("data:image/")) {
    clone.referenceDataUrl = "";
  }
  return clone;
}

function sanitizeTotalAssetKitForStorage(kit = state.totalAssetKit || {}) {
  const clone = {
    ...createEmptyTotalAssetKit(),
    ...structuredCloneSafe(kit)
  };
  clone.status = hasUsableTotalAssetKit(clone) ? "ready" : clone.status;
  clone.currentAssetType = "";
  clone.currentAssetStartedAt = 0;
  clone.ui = sanitizeTotalAssetPartForStorage(clone.ui || createEmptyTotalAssetPart());
  clone.background = sanitizeTotalAssetPartForStorage(clone.background || createEmptyTotalAssetPart());
  clone.character = sanitizeTotalAssetPartForStorage(clone.character || createEmptyTotalAssetPart());
  return clone;
}

function sanitizeStyleReferencesForTotalAssetStorage(references = state.styleReferences || []) {
  return references
    .filter((item) => item?.dataUrl)
    .map((item) => ({
      dataUrl: item.dataUrl,
      fileName: item.fileName || item.displayName || "style-reference.png",
      displayName: item.displayName || item.fileName || "style-reference.png",
      size: Number(item.size) || estimateDataUrlBytes(item.dataUrl),
      width: Number(item.width) || 0,
      height: Number(item.height) || 0
    }));
}

function restoreStyleReferencesFromLockedTotalAsset(snapshot = {}) {
  if (!Array.isArray(snapshot.styleReferences)) return false;
  state.styleReferences = sanitizeStyleReferencesForTotalAssetStorage(snapshot.styleReferences).map((item) => ({
    ...item,
    file: null
  }));
  state.styleReferenceFiles = state.styleReferences.map((item) => item.file).filter(Boolean);
  renderStyleReferencePreview();
  renderStyleReferenceList(state.styleReferences.length ? "已恢复锁定总资产时的画风参考图" : "未上传参考图");
  return true;
}

function unlockLockedTotalAssetForStyleReferenceChange(reason = "") {
  if (!state.lockedTotalAsset || !String(reason).includes("画风参考图")) return reason;
  state.lockedTotalAsset = false;
  clearLockedTotalAssetStorage();
  updateLockedTotalAssetButton();
  return String(reason).includes("总资产已自动解锁")
    ? reason
    : `${reason}，总资产已自动解锁`;
}

function readLockedTotalAssetStorage() {
  try {
    const raw = window.localStorage?.getItem(TOTAL_ASSET_LOCK_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.locked || !parsed.kit) return null;
    return parsed;
  } catch (error) {
    console.warn(error);
    return null;
  }
}

function writeLockedTotalAssetStorage(kit = state.totalAssetKit || {}) {
  if (!hasUsableTotalAssetKit(kit)) return false;
  try {
    const styleReferences = sanitizeStyleReferencesForTotalAssetStorage();
    const payload = {
      version: 1,
      locked: true,
      kit: sanitizeTotalAssetKitForStorage(kit),
      designDraftAssetReferenceSelection: normalizeDesignDraftAssetReferenceSelection(state.designDraftAssetReferenceSelection),
      styleReferences,
      styleReferenceSignature: getStyleReferenceSourceSignature(getStyleReferenceSelectionState(), getStylePromptText()),
      updatedAt: Date.now()
    };
    window.localStorage?.setItem(TOTAL_ASSET_LOCK_STORAGE_KEY, JSON.stringify(payload));
    state.lockedTotalAsset = true;
    updateLockedTotalAssetButton();
    return true;
  } catch (error) {
    console.warn(error);
    $("#designStatus").textContent = `总资产锁定失败：${error?.message || "浏览器本地存储空间不足"}`;
    return false;
  }
}

function clearLockedTotalAssetStorage() {
  try {
    window.localStorage?.removeItem(TOTAL_ASSET_LOCK_STORAGE_KEY);
  } catch (error) {
    console.warn(error);
  }
}

function restoreLockedTotalAssetFromStorage({ render = true } = {}) {
  const snapshot = readLockedTotalAssetStorage();
  if (!snapshot?.kit || !hasUsableTotalAssetKit(snapshot.kit)) {
    state.lockedTotalAsset = false;
    updateLockedTotalAssetButton();
    return false;
  }
  state.lockedTotalAsset = true;
  state.totalAssetKit = {
    ...createEmptyTotalAssetKit(),
    ...sanitizeTotalAssetKitForStorage(snapshot.kit)
  };
  state.designDraftAssetReferenceSelection = normalizeDesignDraftAssetReferenceSelection(snapshot.designDraftAssetReferenceSelection);
  restoreStyleReferencesFromLockedTotalAsset(snapshot);
  syncLegacyUiAssetKit();
  syncTotalAssetBusyRenderTimer();
  if (render) {
    renderDesignPromptSummary();
    renderUiAssetOutputIfActive();
    syncUiAssetKitButtonState();
    syncDesignGenerateButtonState();
  }
  updateLockedTotalAssetButton();
  return true;
}

function persistLockedTotalAssetIfNeeded() {
  if (!state.lockedTotalAsset) return false;
  return writeLockedTotalAssetStorage(state.totalAssetKit || {});
}

function toggleLockedTotalAsset() {
  if (state.lockedTotalAsset) {
    state.lockedTotalAsset = false;
    clearLockedTotalAssetStorage();
    updateLockedTotalAssetButton();
    $("#designStatus").textContent = "总资产已解锁，当前页面内资产保留，但刷新后不再自动恢复。";
    return;
  }
  if (!hasUsableTotalAssetKit(state.totalAssetKit || {})) {
    $("#designStatus").textContent = "请先生成总资产，再锁定。";
    updateLockedTotalAssetButton();
    return;
  }
  if (writeLockedTotalAssetStorage(state.totalAssetKit)) {
    $("#designStatus").textContent = "总资产已锁定，刷新页面后会自动恢复。";
  }
}

function updateLockedTotalAssetButton() {
  const button = $("#lockTotalAssetKit");
  if (!button) return;
  const locked = Boolean(state.lockedTotalAsset);
  const kit = state.totalAssetKit || {};
  const ready = hasUsableTotalAssetKit(kit);
  button.textContent = locked ? "已锁定总资产" : "锁定总资产";
  button.classList.toggle("is-active", locked);
  button.setAttribute("aria-pressed", locked ? "true" : "false");
  button.title = locked && kit.dirty
    ? `总资产已锁定，但当前输入已变化：${kit.dirtyReason || "可能需要手动重新生成"}`
    : locked
      ? "刷新页面后自动恢复上次生成的总资产"
      : ready
        ? "锁定当前总资产，刷新页面后继续复用"
        : "请先生成总资产";
}

function hasUsableDesignDraftCache(drafts = state.designDrafts || {}) {
  return Object.values(drafts || {}).some((draft) => Boolean(draft?.imageUrl));
}

function sanitizeDesignDraftBatchForStorage(batch = state.designBatch || {}) {
  return {
    status: batch.status === "generating" ? "stopped" : (batch.status || "idle"),
    stopRequested: false,
    currentScreenId: "",
    screenIds: Array.isArray(batch.screenIds) ? [...batch.screenIds] : [],
    completedScreenIds: Array.isArray(batch.completedScreenIds) ? [...batch.completedScreenIds] : [],
    failedScreenIds: Array.isArray(batch.failedScreenIds) ? [...batch.failedScreenIds] : [],
    skippedScreenIds: Array.isArray(batch.skippedScreenIds) ? [...batch.skippedScreenIds] : [],
    total: Math.max(0, Number(batch.total) || 0),
    index: Math.max(0, Number(batch.index) || 0),
    success: Math.max(0, Number(batch.success) || 0),
    failed: Math.max(0, Number(batch.failed) || 0)
  };
}

function sanitizeDesignDraftsForStorage(drafts = state.designDrafts || {}) {
  const sanitized = {};
  Object.entries(drafts || {}).forEach(([screenId, draft]) => {
    if (!draft || !draft.imageUrl) return;
    sanitized[screenId] = {
      ...structuredCloneSafe(draft),
      locked: true,
      isLocked: true
    };
  });
  return sanitized;
}

function collectLockedDesignDraftSnapshot() {
  return {
    version: 1,
    locked: true,
    projectSignature: getCurrentProjectSignature(),
    designDrafts: sanitizeDesignDraftsForStorage(),
    activeDesignScreen: state.activeDesignScreen || "",
    designBatch: sanitizeDesignDraftBatchForStorage(),
    stylePrompt: getStylePromptText(),
    styleReferences: sanitizeStyleReferencesForTotalAssetStorage(),
    designModel: getSelectedDesignModel(),
    designDraftAssetReferenceSelection: normalizeDesignDraftAssetReferenceSelection(state.designDraftAssetReferenceSelection),
    screens: getVisualSvgScreenSnapshot(),
    staleReason: state.lockedDesignDraftStaleReason || "",
    updatedAt: Date.now()
  };
}

function writeLockedDesignDraftStorage(snapshot = collectLockedDesignDraftSnapshot()) {
  if (!hasUsableDesignDraftCache(snapshot.designDrafts || {})) return false;
  try {
    window.localStorage?.setItem(DESIGN_DRAFT_LOCK_STORAGE_KEY, JSON.stringify(snapshot));
    state.lockedDesignDraft = true;
    updateLockedDesignDraftButton();
    return true;
  } catch (error) {
    console.warn(error);
    $("#designStatus").textContent = `设计稿锁定失败：${error?.message || "浏览器本地存储空间不足"}`;
    return false;
  }
}

function readLockedDesignDraftStorage() {
  try {
    const raw = window.localStorage?.getItem(DESIGN_DRAFT_LOCK_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.locked ? parsed : null;
  } catch (error) {
    console.warn(error);
    return null;
  }
}

function clearLockedDesignDraftStorage() {
  try {
    window.localStorage?.removeItem(DESIGN_DRAFT_LOCK_STORAGE_KEY);
  } catch (error) {
    console.warn(error);
  }
}

function persistLockedDesignDraftIfNeeded() {
  if (!state.lockedDesignDraft) return false;
  return writeLockedDesignDraftStorage();
}

function persistLockedDesignDraftStaleReasonOnly() {
  if (!state.lockedDesignDraft) return false;
  const snapshot = readLockedDesignDraftStorage();
  if (!snapshot?.locked) return false;
  try {
    window.localStorage?.setItem(DESIGN_DRAFT_LOCK_STORAGE_KEY, JSON.stringify({
      ...snapshot,
      staleReason: state.lockedDesignDraftStaleReason || "",
      updatedAt: Date.now()
    }));
    return true;
  } catch (error) {
    console.warn(error);
    return false;
  }
}

function markLockedDesignDraftsStale(reason = "") {
  if (!state.lockedDesignDraft) return false;
  const staleReason = String(reason || "").trim();
  if (!staleReason) return false;
  state.lockedDesignDraftStaleReason = staleReason;
  Object.entries(state.designDrafts || {}).forEach(([screenId, draft]) => {
    if (!draft?.imageUrl) return;
    state.designDrafts[screenId] = {
      ...draft,
      locked: true,
      isLocked: true,
      frozenSnapshotStaleReason: staleReason
    };
  });
  persistLockedDesignDraftStaleReasonOnly();
  updateLockedDesignDraftButton();
  return true;
}

function restoreLockedDesignDraftStyleReferences(snapshot = {}) {
  if (!Array.isArray(snapshot.styleReferences)) return false;
  state.styleReferences = sanitizeStyleReferencesForTotalAssetStorage(snapshot.styleReferences).map((item) => ({
    ...item,
    file: null
  }));
  state.styleReferenceFiles = [];
  renderStyleReferencePreview();
  renderStyleReferenceList(state.styleReferences.length ? "已恢复锁定设计稿时的画风参考图" : "未上传参考图");
  return true;
}

function restoreLockedDesignDraftFromStorage() {
  const snapshot = readLockedDesignDraftStorage();
  if (!snapshot?.designDrafts || !hasUsableDesignDraftCache(snapshot.designDrafts)) {
    state.lockedDesignDraft = false;
    state.lockedDesignDraftStaleReason = "";
    updateLockedDesignDraftButton();
    return false;
  }

  const currentProjectSignature = getCurrentProjectSignature();
  const blankProjectDraft = isBlankProjectDraft();
  const snapshotProjectSignature = normalizeProjectSignatureValue(snapshot.projectSignature || "");
  const shouldSkipRestore = !blankProjectDraft
    && Boolean(currentProjectSignature)
    && (!snapshotProjectSignature || snapshotProjectSignature !== currentProjectSignature);

  if (shouldSkipRestore) {
    state.lockedDesignDraft = false;
    state.lockedDesignDraftStaleReason = "";
    updateLockedDesignDraftButton();
    $("#designStatus").textContent = "已跳过其他项目的锁定设计稿";
    return false;
  }

  const previousScreens = Array.isArray(snapshot.screens) ? snapshot.screens : [];
  state.lockedDesignDraft = true;
  state.lockedDesignDraftStaleReason = String(snapshot.staleReason || "").trim();
  state.designDrafts = reconcileDesignDraftsForScreens(
    getSelectedScreens(),
    sanitizeDesignDraftsForStorage(snapshot.designDrafts),
    previousScreens
  );
  state.designJobs = {};
  state.designBatch = {
    ...(state.designBatch || {}),
    ...sanitizeDesignDraftBatchForStorage(snapshot.designBatch || {})
  };
  if ($("#styleKeywords")) {
    $("#styleKeywords").textContent = snapshot.stylePrompt || "";
  }
  savedStylePromptRange = null;
  restoreLockedDesignDraftStyleReferences(snapshot);
  if ($("#designModel") && snapshot.designModel) {
    $("#designModel").value = snapshot.designModel;
  }
  state.designDraftAssetReferenceSelection = normalizeDesignDraftAssetReferenceSelection(snapshot.designDraftAssetReferenceSelection);
  const selectedIds = new Set(getSelectedScreens().map((screen) => screen.id));
  state.activeDesignScreen = selectedIds.has(snapshot.activeDesignScreen)
    ? snapshot.activeDesignScreen
    : (Object.keys(state.designDrafts || {})[0] || getSelectedScreens()[0]?.id || state.activeDesignScreen);
  Object.entries(state.designDrafts || {}).forEach(([screenId, draft]) => {
    state.designDrafts[screenId] = {
      ...draft,
      locked: true,
      isLocked: true,
      frozenSnapshotStaleReason: state.lockedDesignDraftStaleReason || draft.frozenSnapshotStaleReason || ""
    };
  });
  renderStyleReferencePreview();
  renderStyleReferenceList();
  renderDesignTabs();
  renderDesignPromptSummary();
  renderDesignOutput();
  syncDesignGenerateButtonState();
  updateLockedDesignDraftButton();
  $("#designStatus").textContent = "设计稿与设计输入已从锁定缓存恢复";
  return true;
}

function toggleLockedDesignDraft() {
  if (state.lockedDesignDraft) {
    state.lockedDesignDraft = false;
    state.lockedDesignDraftStaleReason = "";
    Object.entries(state.designDrafts || {}).forEach(([screenId, draft]) => {
      if (!draft) return;
      state.designDrafts[screenId] = {
        ...draft,
        locked: false,
        isLocked: false,
        frozenSnapshotStaleReason: ""
      };
    });
    clearLockedDesignDraftStorage();
    updateLockedDesignDraftButton();
    renderDesignOutput();
    $("#designStatus").textContent = "设计稿已解锁，当前页面内容保留，但刷新后不再自动恢复。";
    return;
  }
  if (!hasUsableDesignDraftCache()) {
    $("#designStatus").textContent = "请先生成至少一个设计稿，再锁定。";
    updateLockedDesignDraftButton();
    return;
  }
  Object.entries(state.designDrafts || {}).forEach(([screenId, draft]) => {
    if (!draft?.imageUrl) return;
    state.designDrafts[screenId] = {
      ...draft,
      locked: true,
      isLocked: true,
      frozenSnapshotStaleReason: state.lockedDesignDraftStaleReason || ""
    };
  });
  if (writeLockedDesignDraftStorage()) {
    $("#designStatus").textContent = "设计稿与设计输入已锁定，刷新页面后会自动恢复。";
    renderDesignOutput();
  }
}

function updateLockedDesignDraftButton() {
  const button = $("#lockDesignDrafts");
  if (!button) return;
  const locked = Boolean(state.lockedDesignDraft);
  const ready = hasUsableDesignDraftCache();
  button.textContent = locked ? "已锁定设计稿" : "锁定设计稿";
  button.classList.toggle("is-active", locked);
  button.setAttribute("aria-pressed", locked ? "true" : "false");
  button.title = locked && state.lockedDesignDraftStaleReason
    ? `设计稿已锁定，但当前输入已变化：${state.lockedDesignDraftStaleReason}`
    : locked
      ? "刷新页面后自动恢复当前设计稿与设计输入"
      : ready
        ? "锁定当前整组设计稿与设计输入，刷新页面后继续复用"
        : "请先生成设计稿";
}

function renderMarkdownDocuments() {
  renderMarkdownDocument("gameDesign");
  renderMarkdownDocument("plan");
}

function normalizeRunningButtonLabel(label = "") {
  const text = String(label || "").trim();
  if (!text) return "正在处理...";
  let normalized = text
    .replace(/中[.。…]*$/u, "")
    .replace(/[.。…]+$/u, "")
    .trim();
  if (/^重新生成/.test(normalized)) {
    normalized = normalized.replace(/^重新/, "");
  }
  if (/^一键生成/.test(normalized)) {
    normalized = normalized.replace(/^一键/, "");
  }
  if (/^全部已完成/.test(normalized)) {
    normalized = "生成所有设计稿";
  }
  if (!/^正在/.test(normalized)) {
    normalized = `正在${normalized}`;
  }
  return `${normalized}...`;
}

function getRunningButtonLabel(button, pendingLabel = "") {
  return normalizeRunningButtonLabel(pendingLabel || button?.dataset?.idleLabel || button?.textContent || "");
}

function setGenerateButtonPending(buttonId, isPending, pendingLabel = "生成中") {
  const button = document.getElementById(buttonId);
  if (!button) return;

  if (!button.dataset.idleLabel) {
    button.dataset.idleLabel = button.textContent.trim();
  }

  button.classList.toggle("is-loading", Boolean(isPending));
  button.classList.toggle("is-muted-loading", Boolean(isPending));
  button.setAttribute("aria-busy", isPending ? "true" : "false");
  if (!isPending) {
    button.classList.remove("is-muted-loading");
    button.removeAttribute("aria-busy");
    clearRunningButtonTask(buttonId);
  }
  button.disabled = false;
  button.textContent = isPending ? getRunningButtonLabel(button, pendingLabel) : button.dataset.idleLabel;
}

function setSvgGenerateButtonPending(isPending, pendingLabel = "分析交互结构") {
  setGenerateButtonPending("generateInteractionVisuals", isPending, pendingLabel);
  const button = document.getElementById("generateInteractionVisuals");
  if (!button) return;
  button.classList.toggle("is-muted-loading", Boolean(isPending));
}

function setAllSvgGenerateButtonPending(isPending, pendingLabel = "生成所有界面 SVG") {
  setGenerateButtonPending("generateAllInteractionVisuals", isPending, pendingLabel);
  const button = document.getElementById("generateAllInteractionVisuals");
  if (!button) return;
  button.classList.toggle("is-muted-loading", Boolean(isPending));
}

function setDesignGenerateButtonGenerating(isGenerating, label = "生成中...") {
  const button = document.getElementById("generateDesigns");
  if (!button) return;

  if (!button.dataset.idleLabel) {
    button.dataset.idleLabel = button.textContent.trim();
  }

  button.disabled = false;
  button.classList.toggle("is-loading", Boolean(isGenerating));
  button.classList.toggle("is-muted-loading", Boolean(isGenerating));
  button.setAttribute("aria-busy", isGenerating ? "true" : "false");
  if (!isGenerating) {
    button.removeAttribute("aria-busy");
    clearRunningButtonTask("generateDesigns");
  }
  button.textContent = isGenerating ? getRunningButtonLabel(button, label) : button.dataset.idleLabel;
}

function setRunningButtonTask(buttonId, cancel) {
  if (!buttonId || typeof cancel !== "function") return;
  runningButtonTasks.set(buttonId, cancel);
}

function clearRunningButtonTask(buttonId) {
  runningButtonTasks.delete(buttonId);
}

function cancelRunningButtonTask(buttonId) {
  const cancel = runningButtonTasks.get(buttonId);
  if (typeof cancel !== "function") return false;
  cancel();
  return true;
}

function createButtonAbortController(buttonId, cancelMessage = "已取消操作") {
  const controller = new AbortController();
  setRunningButtonTask(buttonId, () => {
    if (!controller.signal.aborted) {
      controller.abort(createClientAbortError(cancelMessage));
    }
  });
  return controller;
}

function setButtonTaskComplete(buttonId, completedLabel = "") {
  const button = document.getElementById(buttonId);
  if (!button) return;
  if (completedLabel) button.dataset.idleLabel = completedLabel;
  setGenerateButtonPending(buttonId, false);
}

function setAutoGenerateButtonPending(isPending) {
  const button = $("#autoGenerateWorkflow");
  if (!button) return;
  if (!button.dataset.idleLabel) {
    button.dataset.idleLabel = button.textContent.trim() || "自动生成";
  }
  button.classList.toggle("is-loading", Boolean(isPending));
  button.setAttribute("aria-busy", isPending ? "true" : "false");
  if (!isPending) {
    button.removeAttribute("aria-busy");
    clearRunningButtonTask("autoGenerateWorkflow");
  }
  button.textContent = isPending ? "正在自动生成..." : button.dataset.idleLabel;
}

function setAutoGenerateStatus(message, tone = "") {
  const status = $("#exportAllResourcesStatus");
  if (!status) return;
  status.textContent = message;
  if (tone) {
    status.dataset.tone = tone;
  } else {
    status.removeAttribute("data-tone");
  }
}

function isAbortLikeError(error) {
  const message = error?.message || "";
  return error?.name === "AbortError" || error?.isAbort || /abort|aborted|cancel|cancelled|取消|已取消/i.test(message);
}

function hasAnyDesignJobGenerating() {
  return Object.values(state.designJobs || {}).some((job) => job?.status === "generating");
}

function isDesignBatchRunning() {
  return state.designBatch?.status === "generating";
}

function getDesignJob(screenId) {
  return screenId ? state.designJobs?.[screenId] || null : null;
}

function getDesignEditJob(screenId) {
  return screenId ? state.designEditJobs?.[screenId] || null : null;
}

function isDesignEditJobCurrent(screenId, requestId) {
  return Boolean(screenId && requestId && state.designEditJobs?.[screenId]?.requestId === requestId);
}

function hasAnyDesignEditJobGenerating() {
  return Object.values(state.designEditJobs || {}).some((job) => job?.status === "generating");
}

function isDesignJobCurrent(screenId, requestId) {
  return Boolean(screenId && requestId && state.designJobs?.[screenId]?.requestId === requestId);
}

function createDesignRequestId(screenId) {
  return `${screenId || "screen"}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createDesignJobAbortController(screenId) {
  const job = getDesignJob(screenId);
  if (!job) return null;
  if (!job.abortController || job.abortController.signal.aborted) {
    job.abortController = new AbortController();
  }
  return job.abortController;
}

function getDesignJobSignal(screenId) {
  return getDesignJob(screenId)?.abortController?.signal || null;
}

function getDesignJobElapsedSeconds(job = null) {
  if (!job?.startedAt) return 0;
  return Math.max(0, Math.floor((Date.now() - job.startedAt) / 1000));
}

function formatElapsedTime(seconds = 0) {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const rest = safeSeconds % 60;
  return minutes ? `${minutes}分${rest}秒` : `${rest}秒`;
}

function getDesignJobPhaseElapsedSeconds(job = null) {
  const startedAt = job?.phaseStartedAt || job?.startedAt;
  if (!startedAt) return 0;
  return Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
}

function setDesignJobPhase(screenId, phase, extra = {}) {
  const job = getDesignJob(screenId);
  if (!job) return;
  Object.assign(job, {
    phase,
    phaseStartedAt: Date.now(),
    lastPhaseRenderAt: Date.now(),
    phaseTimeoutMs: extra.phaseTimeoutMs || 0,
    phaseMaxWaitLabel: extra.phaseMaxWaitLabel || ""
  }, extra);
  syncDesignGenerateButtonState();
  if (state.activeDesignScreen === screenId) {
    renderDesignOutput();
  }
}

function getDesignJobButtonLabel(job = null) {
  if (!job || job.status !== "generating") return "";
  const phase = String(job.phase || "生成中...").replace(/\.\.\.$/, "");
  const elapsed = formatElapsedTime(getDesignJobPhaseElapsedSeconds(job));
  if (/生成界面设计稿|生图|generate/i.test(phase)) {
    return `生图中，已等待 ${elapsed}`;
  }
  return `${phase}，已等待 ${elapsed}`;
}

function clearDesignJobProgressTimer(job = null) {
  if (job?.progressTimerId) {
    clearInterval(job.progressTimerId);
    job.progressTimerId = null;
  }
}

function expireDesignJobIfTimedOut(screenId, requestId) {
  const job = getDesignJob(screenId);
  if (!job || job.requestId !== requestId || job.status !== "generating") return false;
  const timeoutMs = Number(job.phaseTimeoutMs) || 0;
  const startedAt = job.requestDispatchedAt || 0;
  if (job.timeoutHandled) return false;
  if (!timeoutMs || !startedAt || Date.now() - startedAt < timeoutMs) return false;

  const message = `界面生图超过 ${formatMinutesForTimeout(timeoutMs)} 分钟，已停止等待，可重新生成。`;
  const error = createClientTimeoutError(message);
  if (job.abortController && !job.abortController.signal.aborted) {
    job.abortController.abort(error);
  }
  if (job.allowAttemptTimeoutRetry) {
    Object.assign(job, {
      timeoutHandled: true,
      requestStatus: "failed",
      lastAttemptError: message
    });
    return true;
  }
  clearDesignJobProgressTimer(job);
  clearDesignJobStatusPolling(job);
  const screen = getDesignScreenById(screenId) || {
    id: screenId,
    name: job.screenName || "当前界面",
    kind: job.screenKind || "generic"
  };
  const currentDraft = getDesignDraftForScreen(screen);
  if (!currentDraft?.imageUrl) {
    setDesignDraftForScreen(screen, {
      error: message,
      model: job.model,
      referenceCount: job.referenceCount || 0,
      referenceLabels: job.referenceLabels || [],
      designComposition: job.designComposition || null,
      preflightWarnings: job.preflightWarnings || [],
      styleTransferKeywords: job.styleTransferKeywords || "",
      requestId,
      lastFailedRequestId: requestId,
      pendingLateRequestId: requestId
    });
  } else {
    setDesignDraftForScreen(screen, {
      ...currentDraft,
      lastError: message,
      lastFailedRequestId: requestId,
      pendingLateRequestId: requestId
    });
  }
  state.designJobs[screenId] = {
    ...job,
    status: "error",
    phase: "",
    error: message,
    requestStatus: "failed",
    abortController: null,
    completedAt: Date.now(),
    timedOut: true,
    lastTrackedRequestId: requestId
  };
  startDetachedDesignResultPolling(screen, requestId, {
    fallbackDraft: currentDraft ? { ...currentDraft } : null,
    prompt: currentDraft?.prompt || "",
    model: job.model,
    referenceCount: job.referenceCount || 0,
    referenceLabels: job.referenceLabels || [],
    preflightWarnings: job.preflightWarnings || [],
    styleReferenceRequestInfo: job.styleReferenceRequestInfo || null,
    styleTransferKeywords: job.styleTransferKeywords || "",
    uiAssetVersion: currentDraft?.uiAssetVersion || "",
    totalAssetVersion: job.totalAssetVersion || currentDraft?.totalAssetVersion || "",
    totalAssetRoles: job.totalAssetRoles || currentDraft?.totalAssetRoles || [],
    usedUiAsset: job.usedUiAsset ?? currentDraft?.usedUiAsset,
    usedTotalAsset: job.usedTotalAsset ?? currentDraft?.usedTotalAsset,
    directMode: true
  });
  state.isGeneratingDesign = isDesignBatchRunning() || hasAnyDesignJobGenerating();
  if (state.activeDesignScreen === screenId) {
    $("#designStatus").textContent = `${getDesignScreen()?.name || "当前界面"} 生成失败：${message}`;
    renderDesignOutput();
  }
  renderDesignTabs();
  syncDesignGenerateButtonState();
  return true;
}

function startDesignJobProgressTimer(screenId, requestId) {
  const job = getDesignJob(screenId);
  if (!job) return;
  clearDesignJobProgressTimer(job);
  job.progressTimerId = setInterval(() => {
    const current = getDesignJob(screenId);
    if (!current || current.requestId !== requestId || current.status !== "generating") {
      clearDesignJobProgressTimer(current || job);
      return;
    }
    if (expireDesignJobIfTimedOut(screenId, requestId)) return;
    current.lastTickAt = Date.now();
    if (state.activeDesignScreen === screenId) {
      renderDesignOutput();
    }
    syncDesignGenerateButtonState();
  }, 1000);
}

function ensureDesignJobProgressTimer(screenId, requestId = getDesignJob(screenId)?.requestId) {
  const job = getDesignJob(screenId);
  if (!job || job.status !== "generating" || !requestId) return;
  if (job.progressTimerId) return;
  startDesignJobProgressTimer(screenId, requestId);
}

function clearDesignJobStatusPolling(job = null) {
  if (job?.statusPollTimerId) {
    clearInterval(job.statusPollTimerId);
    job.statusPollTimerId = null;
  }
}

function getDesignRequestStageLabel(stage) {
  const labels = {
    waiting_local: "本地服务尚未收到该 requestId",
    received: "本地服务已收到",
    references_ready: "参考图已整理",
    posting_babylon: "正在请求 Babylon",
    babylon_response: "Babylon 已返回",
    completed: "已完成",
    failed: "已失败",
    status_unavailable: "状态接口不可用，请重启服务并强刷页面"
  };
  return labels[stage] || stage || "";
}

function mapDesignRequestStageToStatus(stage) {
  if (stage === "received" || stage === "references_ready") return "local-received";
  if (stage === "posting_babylon") return "posting-babylon";
  if (stage === "babylon_response") return "babylon-response";
  if (stage === "completed") return "completed";
  if (stage === "failed") return "failed";
  if (stage === "waiting_local") return "waiting-local";
  if (stage === "status_unavailable") return "status-unavailable";
  return "waiting-image";
}

async function pollDesignRequestStatus(screenId, requestId) {
  if (!isDesignJobCurrent(screenId, requestId)) return;
  let data = null;
  try {
    const response = await fetch(`/api/design-request-status?requestId=${encodeURIComponent(requestId)}`, { cache: "no-store" });
    data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`状态接口返回 ${response.status}`);
    }
  } catch (error) {
    if (!isDesignJobCurrent(screenId, requestId)) return;
    const job = getDesignJob(screenId);
    if (job) {
      job.designRequestStatusError = error?.message || "状态查询失败";
      job.designRequestStatus = {
        found: false,
        requestId,
        stage: "status_unavailable",
        label: "状态接口不可用，请重启服务并强刷页面",
        error: job.designRequestStatusError,
        updatedAt: Date.now()
      };
      job.requestStatus = "status-unavailable";
      if (state.activeDesignScreen === screenId) {
        renderDesignOutput();
      }
    }
    return;
  }
  if (!isDesignJobCurrent(screenId, requestId)) return;
  const job = getDesignJob(screenId);
  if (!job || job.status !== "generating") return;
  if (data?.found) {
    job.designRequestStatus = data;
    job.designRequestStatusError = "";
    job.requestStatus = mapDesignRequestStageToStatus(data.stage);
    if (state.activeDesignScreen === screenId) {
      renderDesignOutput();
    }
    if (data.stage === "completed" || data.stage === "failed") {
      clearDesignJobStatusPolling(job);
    }
  } else {
    job.designRequestStatus = {
      ...(data || {}),
      found: false,
      requestId,
      stage: "waiting_local",
      label: "本地服务尚未收到该 requestId",
      updatedAt: Date.now()
    };
    job.designRequestStatusError = "";
    job.requestStatus = "waiting-local";
    if (state.activeDesignScreen === screenId) {
      renderDesignOutput();
    }
  }
}

function startDesignRequestStatusPolling(screenId, requestId) {
  const job = getDesignJob(screenId);
  if (!job || job.status !== "generating" || !requestId) return;
  clearDesignJobStatusPolling(job);
  pollDesignRequestStatus(screenId, requestId);
  job.statusPollTimerId = setInterval(() => {
    const current = getDesignJob(screenId);
    if (!current || current.requestId !== requestId || current.status !== "generating") {
      clearDesignJobStatusPolling(current || job);
      return;
    }
    pollDesignRequestStatus(screenId, requestId);
  }, 1500);
}

function normalizeDesignGenerationError(error, fallback = "生成失败") {
  const message = String(error?.message || fallback || "生成失败").trim();
  if (isClientTimeoutError(error)) {
    return message || `界面生图超过 ${formatMinutesForTimeout(getDesignDraftImageTimeoutMs())} 分钟，已停止等待，可重新生成。`;
  }
  if (error?.name === "AbortError" || error?.isAbort || /取消|aborted|abort/i.test(message)) {
    return message.includes("取消") ? message : "已取消生成";
  }
  if (/Failed to fetch|NetworkError|Load failed|Network request failed/i.test(message)) {
    return "界面生图请求中断或网络不可用，已停止等待，可重新生成。";
  }
  return message;
}

function formatDesignRequestAttemptError(model, error, timeoutMs = getDesignDraftImageTimeoutMs()) {
  const modelLabel = getDesignModelMeta(model).label || model;
  if (isClientTimeoutError(error)) {
    return `${modelLabel} 超过 ${formatMinutesForTimeout(timeoutMs)} 分钟未返回图片`;
  }
  const message = normalizeDesignGenerationError(error);
  if (/no image|未返回图片|returned no image|no image file/i.test(message)) {
    return `${modelLabel} 未返回图片`;
  }
  return `${modelLabel} 失败：${message}`;
}

function isRetryableDesignDraftError(error) {
  const message = String(error?.message || "");
  return isClientTimeoutError(error)
    || /no image|未返回图片|returned no image|no image file|timeout|timed out|超时|504|502|503|Failed to fetch|NetworkError|request failed/i.test(message);
}

function getDesignDraftModelAttempts(primaryModel) {
  const models = [primaryModel || getSelectedDesignModel(), DESIGN_DRAFT_FALLBACK_MODEL].filter(Boolean);
  return [...new Set(models)];
}

function summarizeDesignRequestAttempts(attempts = []) {
  return attempts
    .map((attempt) => {
      const label = getDesignModelMeta(attempt.model).label || attempt.model;
      const duration = attempt.durationMs ? `${Math.round(attempt.durationMs / 1000)}秒` : "";
      const status = attempt.status === "success" ? "成功" : "失败";
      const detail = attempt.error ? `：${attempt.error}` : "";
      return `${label}${duration ? `（${duration}）` : ""}${status}${detail}`;
    })
    .join("；");
}

async function generateDesignDraftWithModelRetry(screen, options) {
  const timeoutMs = options.timeoutMs || getDesignDraftImageTimeoutMs();
  const models = getDesignDraftModelAttempts(options.model);
  const attempts = [];
  let lastError = null;

  for (let index = 0; index < models.length; index += 1) {
    const attemptModel = models[index];
    const attemptStartedAt = Date.now();
    const attempt = {
      model: attemptModel,
      startedAt: attemptStartedAt,
      durationMs: 0,
      status: "running",
      error: ""
    };
    attempts.push(attempt);

    const job = getDesignJob(screen.id);
    if (job?.status === "generating") {
      const phaseText = index === 0
        ? "生成界面设计稿中..."
        : `${getDesignModelMeta(models[index - 1]).label} 超时，正在改用 ${getDesignModelMeta(attemptModel).label} 重试...`;
      Object.assign(job, {
        model: attemptModel,
        phase: phaseText,
        phaseStartedAt: attemptStartedAt,
        requestDispatchedAt: attemptStartedAt,
        requestStatus: "waiting-image",
        requestAttempts: attempts,
        allowAttemptTimeoutRetry: true,
        timeoutHandled: false,
        lastAttemptError: ""
      });
      createDesignJobAbortController(screen.id);
      if (state.activeDesignScreen === screen.id) {
        renderDesignOutput();
      }
    }

    try {
      const draft = await generateSingleDesignDraft(screen, { ...options, model: attemptModel, timeoutMs });
      attempt.status = "success";
      attempt.durationMs = Date.now() - attemptStartedAt;
      draft.requestAttempts = attempts;
      draft.model = attemptModel;
      return draft;
    } catch (error) {
      attempt.status = "failed";
      attempt.durationMs = Date.now() - attemptStartedAt;
      attempt.error = formatDesignRequestAttemptError(attemptModel, error, timeoutMs);
      lastError = error;
      const job = getDesignJob(screen.id);
      if (job?.status === "generating") {
        Object.assign(job, {
          requestAttempts: attempts,
          lastAttemptError: attempt.error,
          requestStatus: "failed",
          allowAttemptTimeoutRetry: false,
          timeoutHandled: false
        });
      }
      if (!isRetryableDesignDraftError(error) || index === models.length - 1) {
        break;
      }
      createDesignJobAbortController(screen.id);
    }
  }

  const message = summarizeDesignRequestAttempts(attempts) || normalizeDesignGenerationError(lastError);
  const error = new Error(message);
  error.requestAttempts = attempts;
  throw error;
}

function cancelDesignJob(screenId, message = "已取消生成") {
  const job = getDesignJob(screenId);
  if (!job || job.status !== "generating") return false;
  const requestId = job.requestId;
  const error = createClientAbortError(message);
  if (job.abortController && !job.abortController.signal.aborted) {
    job.abortController.abort(error);
  }
  clearDesignJobProgressTimer(job);
  clearDesignJobStatusPolling(job);
  state.designJobs[screenId] = {
    ...job,
    requestId: `${requestId || screenId}_cancelled_${Date.now()}`,
    status: "error",
    phase: "",
    error: message,
    completedAt: Date.now(),
    cancelledByUser: true,
    lastTrackedRequestId: requestId || ""
  };
  clearDesignLateRecovery(screenId);
  state.isGeneratingDesign = hasAnyDesignJobGenerating();
  if (state.activeDesignScreen === screenId) {
    $("#designStatus").textContent = message;
    renderDesignOutput();
  }
  renderDesignTabs();
  syncDesignGenerateButtonState();
  return true;
}

function syncGenerateAllDesignsButtonState() {
  const button = document.getElementById("generateAllDesigns");
  if (!button) return;

  if (isUiAssetDesignScreenId()) {
    button.hidden = true;
    button.classList.remove("is-loading", "is-muted-loading");
    button.removeAttribute("aria-busy");
    clearRunningButtonTask("generateAllDesigns");
    return;
  }

  button.hidden = false;
  const isRunning = isDesignBatchRunning();
  const batch = state.designBatch || {};
  const idleLabel = batch.status === "completed"
      ? `全部已完成 ${batch.success || 0}/${batch.total || 0}`
      : batch.status === "stopped"
        ? "继续生成所有设计稿"
        : "一键生成所有设计稿";

  button.dataset.idleLabel = idleLabel;
  button.disabled = false;
  button.classList.toggle("is-loading", Boolean(isRunning));
  button.classList.toggle("is-muted-loading", Boolean(isRunning));
  button.setAttribute("aria-busy", isRunning ? "true" : "false");
  if (isRunning) {
    setRunningButtonTask("generateAllDesigns", () => {
      const currentBatch = state.designBatch || {};
      currentBatch.stopRequested = true;
      if (currentBatch.currentScreenId) {
        cancelDesignJob(currentBatch.currentScreenId, "已停止批量生成");
      }
      $("#designStatus").textContent = `正在停止全部设计稿生成：成功 ${currentBatch.success || 0} 个，失败 ${currentBatch.failed || 0} 个`;
      syncDesignGenerateButtonState();
    });
  } else {
    button.removeAttribute("aria-busy");
    clearRunningButtonTask("generateAllDesigns");
  }
  button.textContent = isRunning ? getRunningButtonLabel(button, "生成所有设计稿") : idleLabel;
}

function syncDesignGenerateButtonState() {
  const button = document.getElementById("generateDesigns");
  if (!button) {
    syncGenerateAllDesignsButtonState();
    return;
  }

  if (isUiAssetDesignScreenId()) {
    const kit = state.totalAssetKit || {};
    const isGenerating = isTotalAssetBusy(kit);
    const readyTypes = getTotalAssetReadyTypes(kit);
    const idleLabel = readyTypes.length
        ? "重新生成总资产"
        : "生成总资产";
    button.dataset.idleLabel = idleLabel;
    button.disabled = false;
    button.classList.toggle("is-loading", Boolean(isGenerating));
    button.classList.toggle("is-muted-loading", Boolean(isGenerating));
    button.setAttribute("aria-busy", isGenerating ? "true" : "false");
    if (isGenerating) {
      setRunningButtonTask("generateDesigns", () => {
        cancelTotalAssetAnalysis(kit.status === "analyzing" ? "已取消分析，未生成总资产" : "已取消总资产生成");
      });
    } else {
      button.removeAttribute("aria-busy");
      clearRunningButtonTask("generateDesigns");
    }
    button.textContent = isGenerating
      ? getRunningButtonLabel(button, "生成总资产")
      : idleLabel;
    state.isGeneratingDesign = Boolean(isGenerating) || hasAnyDesignJobGenerating();
    syncGenerateAllDesignsButtonState();
    return;
  }

  const screen = getDesignScreen();
  const job = getDesignJob(screen?.id);
  const isGenerating = job?.status === "generating";
  const hasDraft = Boolean(screen && getDesignDraftForScreen(screen));
  const idleLabel = hasDraft
      ? "重新生成界面设计稿"
      : "生成界面设计稿";

  button.dataset.idleLabel = idleLabel;
  button.disabled = false;
  button.classList.toggle("is-loading", Boolean(isGenerating));
  button.classList.toggle("is-muted-loading", Boolean(isGenerating));
  button.setAttribute("aria-busy", isGenerating ? "true" : "false");
  if (isGenerating) {
    setRunningButtonTask("generateDesigns", () => cancelDesignJob(screen.id, `${screen.name} 已取消生成`));
  } else {
    button.removeAttribute("aria-busy");
    clearRunningButtonTask("generateDesigns");
  }
  button.textContent = isGenerating
    ? getRunningButtonLabel(button, "生成界面设计稿")
    : idleLabel;
  state.isGeneratingDesign = isDesignBatchRunning() || hasAnyDesignJobGenerating();
  syncGenerateAllDesignsButtonState();
}

function setGenerateButtonComplete(buttonId, completedLabel) {
  const button = document.getElementById(buttonId);
  if (!button) return;

  button.dataset.idleLabel = completedLabel;
  button.disabled = false;
  button.classList.remove("is-loading", "is-muted-loading");
  button.removeAttribute("aria-busy");
  clearRunningButtonTask(buttonId);
  button.textContent = completedLabel;
}

function renderDocumentLoading(docName, title, desc) {
  const source = docName === "gameDesign" ? gameDesignOutput : planOutput;
  const preview = docName === "gameDesign" ? gameDesignPreview : planPreview;
  if (!source || !preview) return;

  state.docModes[docName] = "preview";
  source.classList.add("is-hidden");
  preview.classList.remove("is-hidden", "empty-document");
  preview.classList.add("is-loading-document");
  setEditableDocumentEnabled(preview, false);

  preview.innerHTML = `
    <div class="doc-loading">
      <span class="doc-loading-mark" aria-hidden="true"></span>
      <p class="eyebrow">GENERATING</p>
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(desc)}</p>
    </div>
  `;
}

function renderDocumentError(docName, title, desc) {
  const source = docName === "gameDesign" ? gameDesignOutput : planOutput;
  const preview = docName === "gameDesign" ? gameDesignPreview : planPreview;
  if (!source || !preview) return;

  state.docModes[docName] = "preview";
  source.classList.add("is-hidden");
  preview.classList.remove("is-hidden");
  preview.classList.add("empty-document");
  preview.classList.remove("is-loading-document");
  setEditableDocumentEnabled(preview, false);

  preview.innerHTML = `
    <div>
      <p class="eyebrow">GENERATION FAILED</p>
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(desc)}</p>
    </div>
  `;
}

function renderMarkdownDocument(docName) {
  const source = docName === "gameDesign" ? gameDesignOutput : planOutput;
  const preview = docName === "gameDesign" ? gameDesignPreview : planPreview;
  if (!source || !preview) return;

  state.docModes[docName] = "preview";
  source.classList.add("is-hidden");
  preview.classList.remove("is-hidden");

  preview.classList.remove("is-loading-document");
  const value = source.value.trim();
  preview.classList.toggle("empty-document", !value);
  setEditableDocumentEnabled(preview, Boolean(value));
  preview.innerHTML = value
    ? renderMarkdownToHtml(value)
    : `<div><p class="eyebrow">DOCUMENT PREVIEW</p><strong>${docName === "gameDesign" ? "等待生成完整策划案" : "等待生成交互设计方案"}</strong><p>生成后会在这里以标题、列表和表格形式排版展示。</p></div>`;
}

function setEditableDocumentEnabled(preview, enabled) {
  if (!preview) return;
  preview.contentEditable = enabled ? "true" : "false";
  preview.classList.toggle("is-editable-document", Boolean(enabled));
  preview.setAttribute("aria-readonly", enabled ? "false" : "true");
}

function syncEditableDocumentToMarkdown(docName) {
  const source = docName === "gameDesign" ? gameDesignOutput : planOutput;
  const preview = docName === "gameDesign" ? gameDesignPreview : planPreview;
  if (
    !source
    || !preview
    || !preview.classList.contains("is-editable-document")
    || preview.classList.contains("empty-document")
    || preview.classList.contains("is-loading-document")
  ) return;

  const markdown = editableDocumentToMarkdown(preview);
  source.value = markdown;

  if (docName === "gameDesign") {
    syncGameDesignFromEditor();
  } else {
    syncPlanFromEditor();
  }
}

function editableDocumentToMarkdown(root) {
  return Array.from(root.children)
    .map((node) => editableNodeToMarkdown(node))
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function editableNodeToMarkdown(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return "";
  const tag = node.tagName.toLowerCase();

  if (/^h[1-4]$/.test(tag)) {
    const level = Number(tag.slice(1));
    const text = getEditablePlainText(node);
    return text ? `${"#".repeat(level)} ${text}` : "";
  }

  if (tag === "table") return editableTableToMarkdown(node);
  if (tag === "ul" || tag === "ol") return editableListToMarkdown(node, tag === "ol");
  if (tag === "p" || tag === "div" || tag === "section" || tag === "article") {
    const childBlocks = Array.from(node.children)
      .map((child) => editableNodeToMarkdown(child))
      .filter(Boolean);
    if (childBlocks.length) return childBlocks.join("\n\n");
    return getEditablePlainText(node);
  }

  if (tag === "br") return "";
  return getEditablePlainText(node);
}

function editableListToMarkdown(listNode, ordered = false) {
  return Array.from(listNode.children)
    .filter((item) => item.tagName?.toLowerCase() === "li")
    .map((item, index) => {
      const prefix = ordered ? `${index + 1}.` : "-";
      return `${prefix} ${getEditablePlainText(item)}`;
    })
    .filter((line) => line.trim().length > 2)
    .join("\n");
}

function editableTableToMarkdown(tableNode) {
  const rows = Array.from(tableNode.querySelectorAll("tr"))
    .map((row) => Array.from(row.children).map((cell) => escapeMarkdownTableCell(getEditablePlainText(cell))));
  if (!rows.length) return "";

  const maxColumns = Math.max(...rows.map((row) => row.length));
  const normalizedRows = rows.map((row) => {
    const next = [...row];
    while (next.length < maxColumns) next.push("");
    return next;
  });
  const header = normalizedRows[0];
  const body = normalizedRows.slice(1);
  return [
    formatMarkdownTableRow(header),
    formatMarkdownTableRow(new Array(maxColumns).fill("---")),
    ...body.map((row) => formatMarkdownTableRow(row))
  ].join("\n");
}

function getEditablePlainText(node) {
  return String(node?.innerText || node?.textContent || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function escapeMarkdownTableCell(text) {
  return String(text || "").replace(/\|/g, "｜").replace(/\r?\n/g, "<br>").trim();
}

function renderMarkdownToHtml(markdown) {
  const lines = String(markdown || "").replace(/\r/g, "").split("\n");
  const html = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (isMarkdownTableStart(lines, index)) {
      const tableLines = [];
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
        tableLines.push(lines[index]);
        index += 1;
      }
      html.push(renderMarkdownTable(tableLines));
      continue;
    }

    if (/^#{1,4}\s+/.test(trimmed)) {
      const level = Math.min(4, trimmed.match(/^#+/)[0].length);
      html.push(`<h${level}>${renderInlineMarkdown(trimmed.replace(/^#{1,4}\s+/, ""))}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^[-*_]{3,}$/.test(trimmed)) {
      html.push("<hr>");
      index += 1;
      continue;
    }

    if (/^(\-|\*|•)\s+/.test(trimmed)) {
      const items = [];
      while (index < lines.length && /^(\-|\*|•)\s+/.test(lines[index].trim())) {
        items.push(`<li>${renderInlineMarkdown(lines[index].trim().replace(/^(\-|\*|•)\s+/, ""))}</li>`);
        index += 1;
      }
      html.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    if (/^\d+[.)]\s+/.test(trimmed)) {
      const items = [];
      while (index < lines.length && /^\d+[.)]\s+/.test(lines[index].trim())) {
        items.push(`<li>${renderInlineMarkdown(lines[index].trim().replace(/^\d+[.)]\s+/, ""))}</li>`);
        index += 1;
      }
      html.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    const paragraph = [];
    while (
      index < lines.length
      && lines[index].trim()
      && !/^#{1,4}\s+/.test(lines[index].trim())
      && !/^(\-|\*|•)\s+/.test(lines[index].trim())
      && !/^\d+[.)]\s+/.test(lines[index].trim())
      && !isMarkdownTableStart(lines, index)
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    html.push(`<p>${renderInlineMarkdown(paragraph.join(" "))}</p>`);
  }

  return html.join("");
}

function isMarkdownTableStart(lines, index) {
  if (index + 1 >= lines.length) return false;
  const head = lines[index].trim();
  const separator = lines[index + 1].trim();
  return head.includes("|") && /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(separator);
}

function renderMarkdownTable(tableLines) {
  const rows = tableLines
    .filter((line, index) => index !== 1)
    .map((line) => splitMarkdownTableRow(line));
  const header = rows.shift() || [];
  const body = rows;

  return `<table><thead><tr>${header.map((cell) => `<th>${renderInlineMarkdown(cell)}</th>`).join("")}</tr></thead><tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${renderInlineMarkdown(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

function splitMarkdownTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function renderInlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getSelectedScreens() {
  return $$(".screen-picker input:checked")
    .map((input) => screens.find((screen) => screen.id === input.value))
    .filter(Boolean);
}

function syncScreensFromBrief(brief) {
  const previousDrafts = { ...(state.designDrafts || {}) };
  const previousJobs = { ...(state.designJobs || {}) };
  const previousScreens = [...screens];
  screens = inferScreensFromBrief(brief);
  showTargetScreens();
  renderScreenPicker(screens.map((screen) => screen.id));
  state.designDrafts = reconcileDesignDraftsForScreens(screens, previousDrafts, previousScreens);
  state.designJobs = reconcileDesignJobsForScreens(screens, previousJobs, previousScreens);
  state.designEditJobs = reconcileDesignEditJobsForScreens(screens, state.designEditJobs || {}, previousScreens);
  state.designCompositionAnalyses = {};
  resetStyleAnalysisCache();
  resetUiAssetKit();
  resetUiComponentBaselines();
  syncActiveVisualScreen();
  syncActiveDesignScreen();
  renderVisualTabs();
  renderDesignTabs();

  if (!screens.length) {
    $("#planStatus").textContent = "未识别到目标界面";
  } else {
    $("#planStatus").textContent = getScreenInferenceStatusText(screens.length);
  }
}

function getCurrentGameDesignSource() {
  return [
    gameDesignOutput?.value,
    state.gameDesign,
    briefText?.value
  ].map((item) => String(item || "").trim()).find(Boolean) || "";
}

function refreshTargetScreensFromCurrentDocument() {
  const source = getCurrentGameDesignSource();
  if (!source) {
    $("#planStatus").textContent = "请先生成或填写策划案，再刷新目标界面";
    return;
  }

  $("#planStatus").textContent = "正在从当前策划案重新读取目标界面...";
  syncGameDesignFromEditor();
  const previousDrafts = { ...(state.designDrafts || {}) };
  const previousJobs = { ...(state.designJobs || {}) };
  const previousScreens = [...screens];
  const nextScreens = inferScreensFromBrief(getCurrentGameDesignSource());
  screens = nextScreens;
  showTargetScreens();
  renderScreenPicker(nextScreens.map((screen) => screen.id));
  state.visualSvg = "";
  state.visualSvgs = {};
  resetVisualSvgBatchSummary();
  state.generatingVisualScreen = "";
  state.visualAnalyses = {};
  unlockLockedVisualSvg();
  state.designDrafts = reconcileDesignDraftsForScreens(nextScreens, previousDrafts, previousScreens);
  state.designJobs = reconcileDesignJobsForScreens(nextScreens, previousJobs, previousScreens);
  state.designEditJobs = reconcileDesignEditJobsForScreens(nextScreens, state.designEditJobs || {}, previousScreens);
  state.designCompositionAnalyses = {};
  resetStyleAnalysisCache();
  resetUiAssetKit();
  resetUiComponentBaselines();
  syncActiveVisualScreen();
  syncActiveDesignScreen();
  renderVisualTabs();
  renderDesignTabs();
  renderEmptyVisual();
  renderEmptyDesignOutput();

  if (!nextScreens.length) {
    $("#planStatus").textContent = "未从当前策划案识别到目标界面，请补充主要界面清单或界面表格";
    return;
  }

  $("#planStatus").textContent = getScreenInferenceStatusText(nextScreens.length);
}

function getScreenInferenceStatusText(count) {
  if (state.screenInferenceSource === "primary-table") {
    return `已从策划案主要界面清单读取 ${count} 个界面`;
  }
  if (state.screenInferenceSource === "explicit-table") {
    return `已从策划案界面表格读取 ${count} 个界面`;
  }
  if (state.screenInferenceSource === "interface-section") {
    return `已从策划案界面章节读取 ${count} 个界面`;
  }
  if (state.screenInferenceSource === "generated-primary-table") {
    return `主要界面清单缺失，已按策划案内容本地补齐 ${count} 个界面`;
  }
  return `未找到主要界面清单，请补充 8.7 主要界面清单`;
}

function hideTargetScreensUntilGameDesignReady() {
  screens = [];
  state.activeVisualScreen = "";
  state.activeDesignScreen = "";
  state.designDrafts = {};
  state.designJobs = {};
  state.designEditJobs = {};
  state.designDraftEdit = createDefaultDesignDraftEditState();
  state.designCompositionAnalyses = {};
  state.lockedDesignDraft = false;
  state.lockedDesignDraftStaleReason = "";
  resetStyleAnalysisCache();
  resetUiAssetKit();
  resetUiComponentBaselines();
  const card = $(".screen-card");
  if (card) card.classList.add("is-hidden");
  const picker = $(".screen-picker");
  if (picker) {
    picker.innerHTML = `<p class="screen-empty">完整策划案生成完成后自动识别目标界面</p>`;
  }
  renderVisualTabs();
  renderDesignTabs();
  updateLockedDesignDraftButton();
}

function showTargetScreens() {
  const card = $(".screen-card");
  if (card) card.classList.remove("is-hidden");
}

function renderScreenPicker(checkedIds = []) {
  const checkedSet = new Set(checkedIds);
  const picker = $(".screen-picker");
  if (!picker) return;

  if (!screens.length) {
    picker.innerHTML = `<p class="screen-empty">未识别到目标界面，可在策划案中写明“主界面、战斗界面、关卡界面、商店界面”等。</p>`;
    return;
  }

  picker.innerHTML = screens.map((screen) => {
    const checked = checkedSet.has(screen.id) ? " checked" : "";
    const title = getScreenCloseBehavior(screen) ? ` title="关闭方式：${escapeHtml(getScreenCloseBehavior(screen))}"` : "";
    return `<label${title}><input type="checkbox" value="${escapeXml(screen.id)}"${checked}><span>${escapeXml(screen.name)}</span></label>`;
  }).join("");
}

function inferScreensFromBrief(brief) {
  state.screenInferenceSource = "none";
  const screenSource = ensurePrimaryScreenListCloseBehaviorColumn(brief);
  const primaryTableScreens = createDetectedScreensFromCandidates(extractPrimaryScreenListTable(screenSource), true, { trusted: true });
  if (primaryTableScreens.length) {
    state.screenInferenceSource = "primary-table";
    return primaryTableScreens.slice(0, 10);
  }

  const tableScreens = createDetectedScreensFromCandidates(extractScreensFromMarkdownTables(screenSource), true, { trusted: true });
  if (tableScreens.length) {
    state.screenInferenceSource = "explicit-table";
    return tableScreens.slice(0, 10);
  }

  const sectionScreens = createDetectedScreensFromCandidates(extractScreensFromInterfaceSections(screenSource), true);
  if (sectionScreens.length) {
    state.screenInferenceSource = "interface-section";
    return sectionScreens.slice(0, 10);
  }

  const completedBrief = ensurePrimaryScreenListSection(screenSource);
  if (completedBrief && completedBrief !== String(screenSource || "")) {
    const generatedScreens = createDetectedScreensFromCandidates(extractPrimaryScreenListTable(completedBrief), true, { trusted: true });
    if (generatedScreens.length) {
      state.screenInferenceSource = "generated-primary-table";
      return generatedScreens.slice(0, 10);
    }
  }

  return [];
}

function extractExplicitScreensFromBrief(brief) {
  const screenSource = ensurePrimaryScreenListCloseBehaviorColumn(brief);
  const fromPrimaryTable = createDetectedScreensFromCandidates(extractPrimaryScreenListTable(screenSource), true, { trusted: true });
  if (fromPrimaryTable.length) return fromPrimaryTable;
  const fromTables = createDetectedScreensFromCandidates(extractScreensFromMarkdownTables(screenSource), true, { trusted: true });
  if (fromTables.length) return fromTables;
  return createDetectedScreensFromCandidates(extractScreensFromInterfaceSections(screenSource), true);
}

function createDetectedScreensFromCandidates(candidates, explicit = false, options = {}) {
  const found = [];
  const seen = new Set();
  const trusted = Boolean(options.trusted);
  candidates.forEach((candidate) => {
    const item = typeof candidate === "string" ? { name: candidate } : candidate;
    const name = normalizeScreenName(item?.name || "");
    if (trusted) {
      if (!isTrustedScreenName(name)) return;
    } else {
      if (isComponentLikeScreenName(name)) return;
      if (!isLikelyScreenName(name, { explicit })) return;
    }
    const kind = inferScreenKind(name);
    const aliases = [
      ...getScreenAliases({ name, kind }),
      ...(item.aliases || []),
      item.entrySource,
      item.coreAction,
      item.keyState,
      item.closeBehavior
    ].filter(Boolean);
    addDetectedScreen(found, seen, name, kind, aliases, item);
  });
  return found;
}

function extractPrimaryScreenListTable(brief) {
  const lines = String(brief || "").split(/\r?\n/);
  let inPrimarySection = false;
  let primaryDepth = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const heading = getMarkdownHeadingInfo(lines[index]);
    if (heading) {
      if (isPrimaryScreenListHeading(heading.text)) {
        inPrimarySection = true;
        primaryDepth = heading.depth;
        continue;
      }
      if (inPrimarySection && heading.depth <= primaryDepth) break;
    }

    if (!inPrimarySection) continue;
    const line = lines[index];
    if (!line.includes("|")) continue;

    const headers = splitMarkdownRow(line);
    if (!headers.length || !isStrictScreenTableHeader(headers)) continue;
    return extractScreenTableRows(lines, index);
  }

  return [];
}

function extractScreensFromMarkdownTables(brief) {
  const lines = String(brief || "").split(/\r?\n/);
  const candidates = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.includes("|")) continue;

    const headers = splitMarkdownRow(line);
    if (!headers.length || !isScreenTableHeader(headers)) continue;

    const { candidates: tableCandidates, rowIndex } = extractScreenTableRows(lines, index, { withRowIndex: true });
    candidates.push(...tableCandidates);
    index = Math.max(index, rowIndex - 1);
  }

  return candidates;
}

function extractScreenTableRows(lines, headerIndex, options = {}) {
  const headers = splitMarkdownRow(lines[headerIndex]);
  const nextLine = lines[headerIndex + 1] || "";
  let rowIndex = isMarkdownTableDivider(nextLine) ? headerIndex + 2 : headerIndex + 1;
  const headerMap = buildScreenTableHeaderMap(headers);
  const nameIndex = headerMap.nameIndex ?? 0;
  const candidates = [];

  while (rowIndex < lines.length && lines[rowIndex].includes("|")) {
    const cells = splitMarkdownRow(lines[rowIndex]);
    rowIndex += 1;
    if (!cells.length || cells.every((cell) => !cell)) continue;

    const name = normalizeScreenName(cells[nameIndex] || cells[0] || "");
    if (!name) continue;

    const goal = getTableCellByHeader(cells, headerMap, ["goal", "purpose", "target"]);
    const entrySource = getTableCellByHeader(cells, headerMap, ["entry"]);
    const coreAction = getTableCellByHeader(cells, headerMap, ["action"]);
    const keyState = getTableCellByHeader(cells, headerMap, ["state"]);
    const closeBehavior = normalizeScreenCloseBehaviorFromContext({
      name,
      entrySource,
      closeBehavior: getTableCellByHeader(cells, headerMap, ["close"])
    });
    candidates.push({
      name,
      goal: goal || coreAction || "",
      entrySource,
      coreAction,
      keyState,
      closeBehavior,
      aliases: [goal, entrySource, coreAction, keyState, closeBehavior].filter(Boolean)
    });
  }

  return options.withRowIndex ? { candidates, rowIndex } : candidates;
}

function splitMarkdownRow(line) {
  return String(line || "")
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map(stripMarkdownFormatting);
}

function stripMarkdownFormatting(value) {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/[`*_~]/g, "")
    .replace(/\[[^\]]+\]\([^)]+\)/g, (match) => match.replace(/^\[|\]\([^)]+\)$/g, ""))
    .trim();
}

function isMarkdownTableDivider(line) {
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(String(line || ""));
}

function formatMarkdownTableRow(cells = []) {
  return `| ${cells.map((cell) => String(cell || "").trim()).join(" | ")} |`;
}

function isLegacyPrimaryScreenTableHeader(headers = []) {
  const headerMap = buildScreenTableHeaderMap(headers);
  return headers.length === 5
    && isStrictScreenTableHeader(headers)
    && headerMap.close === undefined;
}

function inferScreenCloseBehaviorFromTableCells(cells = [], headerMap = {}) {
  const name = getTableCellByHeader(cells, headerMap, ["name"]) || cells[headerMap.nameIndex ?? 0] || cells[0] || "";
  const entrySource = getTableCellByHeader(cells, headerMap, ["entry"]);
  const coreAction = getTableCellByHeader(cells, headerMap, ["action"]);
  const keyState = getTableCellByHeader(cells, headerMap, ["state"]);
  const normalizedRootClose = normalizeScreenCloseBehaviorFromContext({ name, entrySource, closeBehavior: "" });
  if (normalizedRootClose) return normalizedRootClose;
  const isRootName = /^(主界面|主页面|首页|主页|大厅|主大厅|主界面\s*HUD|HUD|home|lobby)$/i.test(name.trim())
    || /家园主界面|主场景界面|核心操作界面/i.test(name);
  const fromMain = /主界面|主页面|首页|主页|大厅|主大厅|home|lobby/i.test(entrySource);
  const modalText = [name, coreAction, keyState].join(" ");
  const text = [name, entrySource, coreAction, keyState].join(" ");

  if (isRootName) {
    return "无关闭入口；作为默认根界面";
  }
  if (/设置|弹窗|浮层|详情|资料|状态面板|面板|说明|规则|确认|二次确认|modal|popup|dialog|detail|setting/i.test(modalText)) {
    return "关闭后返回来源界面";
  }
  if (/结算|结果|胜利|失败|通关|奖励|settlement|result/i.test(text)) {
    return "返回主界面或进入下一关/下一流程";
  }
  if (fromMain || /图鉴|仓库|任务|好友|商店|背包|列表|养成|成长|活动|排行|邮件|公告|collection|inventory|task|friend|shop|bag|list|event/i.test(text)) {
    return "返回主界面";
  }
  return "返回主界面";
}

const ROOT_SCREEN_CLOSE_BEHAVIOR = "无关闭入口；作为默认根界面";

function isDefaultRootEntrySource(entrySource = "") {
  const text = String(entrySource || "").trim();
  return /游戏启动默认|启动游戏默认|默认进入|默认落点|首次进入|进入游戏默认|打开游戏默认|启动后默认|登录后默认|app\s*launch|game\s*launch|default\s*entry/i.test(text);
}

function isRootScreenIdentity({ name = "", kind = "" } = {}) {
  const text = [name, kind].join(" ");
  return /主界面|主页面|首页|主页|大厅|主大厅|主场景|根界面|默认根界面|HUD|home|lobby|base/i.test(text);
}

function normalizeScreenCloseBehaviorFromContext({ name = "", kind = "", entrySource = "", closeBehavior = "" } = {}) {
  if (isDefaultRootEntrySource(entrySource) && isRootScreenIdentity({ name, kind })) {
    return ROOT_SCREEN_CLOSE_BEHAVIOR;
  }
  return String(closeBehavior || "").trim();
}

function normalizePrimaryScreenListRow(row = {}) {
  return {
    ...row,
    closeBehavior: normalizeScreenCloseBehaviorFromContext(row)
  };
}

function ensurePrimaryScreenListCloseBehaviorColumn(markdown = "") {
  const lines = String(markdown || "").replace(/\r/g, "").split("\n");
  let inPrimarySection = false;
  let primaryDepth = 0;
  let changed = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const heading = getMarkdownHeadingInfo(line);
    if (heading) {
      if (isPrimaryScreenListHeading(heading.text)) {
        inPrimarySection = true;
        primaryDepth = heading.depth;
      } else if (inPrimarySection && heading.depth <= primaryDepth) {
        inPrimarySection = false;
      }
    } else if (!inPrimarySection && isPrimaryScreenListHeading(line.replace(/[:：]\s*$/, ""))) {
      inPrimarySection = true;
      primaryDepth = 6;
    }

    if (!inPrimarySection || !line.includes("|")) continue;

    const headers = splitMarkdownRow(line);
    const headerMap = buildScreenTableHeaderMap(headers);
    if (isStrictScreenTableHeader(headers) && headerMap.close !== undefined) {
      let rowIndex = isMarkdownTableDivider(lines[index + 1] || "") ? index + 2 : index + 1;
      while (rowIndex < lines.length && lines[rowIndex].includes("|") && lines[rowIndex].trim()) {
        if (isMarkdownTableDivider(lines[rowIndex])) {
          rowIndex += 1;
          continue;
        }
        const cells = splitMarkdownTableRow(lines[rowIndex]);
        const row = {
          name: getTableCellByHeader(cells, headerMap, ["name"]) || cells[headerMap.nameIndex ?? 0] || cells[0] || "",
          goal: getTableCellByHeader(cells, headerMap, ["goal", "purpose", "target"]),
          entrySource: getTableCellByHeader(cells, headerMap, ["entry"]),
          coreAction: getTableCellByHeader(cells, headerMap, ["action"]),
          keyState: getTableCellByHeader(cells, headerMap, ["state"]),
          closeBehavior: getTableCellByHeader(cells, headerMap, ["close"])
        };
        const normalized = normalizePrimaryScreenListRow(row).closeBehavior;
        if (normalized && normalized !== row.closeBehavior && headerMap.close < cells.length) {
          cells[headerMap.close] = normalized;
          lines[rowIndex] = formatMarkdownTableRow(cells);
          changed = true;
        }
        rowIndex += 1;
      }
      break;
    }
    if (!isLegacyPrimaryScreenTableHeader(headers)) continue;

    lines[index] = formatMarkdownTableRow([...headers, "界面关闭方式"]);
    if (isMarkdownTableDivider(lines[index + 1] || "")) {
      lines[index + 1] = formatMarkdownTableRow(new Array(headers.length + 1).fill("---"));
    }

    let rowIndex = isMarkdownTableDivider(lines[index + 1] || "") ? index + 2 : index + 1;
    while (rowIndex < lines.length && lines[rowIndex].includes("|") && lines[rowIndex].trim()) {
      if (isMarkdownTableDivider(lines[rowIndex])) {
        rowIndex += 1;
        continue;
      }
      const cells = splitMarkdownTableRow(lines[rowIndex]);
      if (cells.length === headers.length) {
        lines[rowIndex] = formatMarkdownTableRow([
          ...cells,
          inferScreenCloseBehaviorFromTableCells(cells, headerMap)
        ]);
        changed = true;
      }
      rowIndex += 1;
    }

    changed = true;
    break;
  }

  return changed ? lines.join("\n").trim() : String(markdown || "");
}

function ensurePrimaryScreenListSection(markdown = "", normalizedOutline = "", rawOutline = "") {
  const sourceMarkdown = String(markdown || "");
  if (!sourceMarkdown.trim()) return sourceMarkdown;

  let nextMarkdown = ensurePrimaryScreenListCloseBehaviorColumn(sourceMarkdown);
  return nextMarkdown;
}

const GAME_DESIGN_COMPLETENESS_MAX_RETRIES = 5;
const DOCUMENT_COMPLETENESS_MAX_RETRIES = 3;
const SVG_COMPLETENESS_MAX_RETRIES = 3;

const GAME_DESIGN_REQUIRED_HEADINGS = [
  "1. 项目概述",
  "1.1 游戏名称",
  "1.2 游戏类型",
  "1.3 平台定位",
  "1.4 目标用户",
  "1.5 核心卖点",
  "1.6 竞品与差异化",
  "2. 核心体验",
  "2.1 玩家扮演身份",
  "2.2 核心乐趣",
  "2.3 核心玩法循环",
  "2.4 短中长期目标",
  "3. 世界观与题材",
  "3.1 世界背景",
  "3.2 主角设定",
  "3.3 主要角色",
  "3.4 阵营与冲突",
  "3.5 玩法包装",
  "4. 核心玩法设计",
  "4.1 基础操作",
  "4.2 单局流程",
  "4.3 胜负条件",
  "4.4 奖励反馈",
  "4.5 失败惩罚",
  "5. 系统设计",
  "5.1 角色系统",
  "5.2 养成系统",
  "5.3 关卡系统",
  "5.4 任务系统",
  "5.5 资源系统",
  "5.6 商店系统",
  "5.7 活动系统",
  "5.8 社交系统",
  "6. 数值与经济",
  "6.1 资源产出",
  "6.2 资源消耗",
  "6.3 成长曲线",
  "6.4 付费点设计",
  "6.5 平衡性原则",
  "7. 内容规划",
  "7.1 首发内容",
  "7.2 剧情章节",
  "7.3 角色数量",
  "7.4 关卡数量",
  "7.5 活动规划",
  "7.6 长线更新计划",
  "8. UI/UX 设计",
  "8.1 主界面结构",
  "8.2 功能入口",
  "8.3 操作流程",
  "8.4 弹窗规则",
  "8.5 红点规则",
  "8.6 新手引导",
  "8.7 主要界面清单",
  "9. 美术与音频方向",
  "9.1 美术风格",
  "9.2 角色风格",
  "9.3 场景风格",
  "9.4 UI 风格",
  "9.5 特效风格",
  "9.6 音乐音效",
  "10. 商业化设计",
  "10.1 商业模式",
  "10.2 付费内容",
  "10.3 广告设计",
  "10.4 礼包设计",
  "10.5 付费节奏",
  "11. 技术需求",
  "11.1 引擎与平台",
  "11.2 网络需求",
  "11.3 数据存储",
  "11.4 性能目标",
  "11.5 风险功能",
  "12. 版本计划",
  "12.1 Demo 版本",
  "12.2 Alpha 版本",
  "12.3 Beta 版本",
  "12.4 上线版本",
  "12.5 后续运营版本",
  "13. 数据指标",
  "13.1 新手完成率",
  "13.2 留存指标",
  "13.3 关卡数据",
  "13.4 付费数据",
  "13.5 活动数据",
  "14. 风险评估",
  "14.1 玩法风险",
  "14.2 内容风险",
  "14.3 技术风险",
  "14.4 美术风险",
  "14.5 商业化风险",
  "14.6 解决方案"
];

const INTERACTION_PLAN_REQUIRED_HEADINGS = [
  "1. 项目理解",
  "1.1 项目定位",
  "1.2 设计目标",
  "1.3 输出规格",
  "1.4 同类产品参考方向",
  "2. 信息架构",
  "3. 核心流程",
  "4. 页面交互设计",
  "5. 状态规范",
  "6. 设计交付物"
];

const INTERACTION_SCREEN_REQUIRED_SUBHEADINGS = [
  "页面目标",
  "入口来源",
  "布局结构",
  "关键交互",
  "状态反馈",
  "异常状态",
  "按钮层级",
  "关闭/返回方式",
  "Figma 交付建议"
];

function normalizeDocumentHeadingForCheck(text = "") {
  return String(text || "")
    .replace(/^\s{0,3}#{1,6}\s*/, "")
    .replace(/[*_`~]/g, "")
    .replace(/[．。]/g, ".")
    .replace(/[：:]\s*$/, "")
    .replace(/\s+/g, "")
    .trim()
    .toLowerCase();
}

function extractMarkdownHeadingsForCheck(markdown = "") {
  return String(markdown || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line, index) => {
      const match = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
      if (!match) return null;
      const text = match[2].trim();
      return {
        depth: match[1].length,
        text,
        normalized: normalizeDocumentHeadingForCheck(text),
        index
      };
    })
    .filter(Boolean);
}

function headingMatchesExpectedForCheck(heading, expected) {
  const normalizedHeading = heading?.normalized || normalizeDocumentHeadingForCheck(heading?.text || "");
  const normalizedExpected = normalizeDocumentHeadingForCheck(expected);
  if (/^\d/.test(normalizedExpected)) {
    return normalizedHeading === normalizedExpected || normalizedHeading.startsWith(normalizedExpected);
  }
  return normalizedHeading === normalizedExpected
    || normalizedHeading.includes(normalizedExpected)
    || (normalizedExpected.includes("figma") && normalizedHeading.includes("交付建议"));
}

function validateRequiredMarkdownHeadings(markdown = "", requiredHeadings = []) {
  const headings = extractMarkdownHeadingsForCheck(markdown);
  const missing = requiredHeadings.filter((expected) => (
    !headings.some((heading) => headingMatchesExpectedForCheck(heading, expected))
  ));
  return { ok: missing.length === 0, missing };
}

function findScreenHeadingForCheck(headings = [], screen = {}) {
  const screenName = normalizeDocumentHeadingForCheck(screen.name || "");
  const screenNameWithoutParentheses = normalizeDocumentHeadingForCheck(
    String(screen.name || "").replace(/[（(].*?[）)]/g, "")
  );
  if (!screenName) return null;
  return headings.find((heading) => (
    heading.depth >= 3
    && (
      heading.normalized.includes(screenName)
      || (screenNameWithoutParentheses && heading.normalized.includes(screenNameWithoutParentheses))
    )
  ));
}

function validateInteractionScreenHeadings(markdown = "", screens = []) {
  const headings = extractMarkdownHeadingsForCheck(markdown);
  const missing = [];

  screens.forEach((screen) => {
    const screenHeading = findScreenHeadingForCheck(headings, screen);
    if (!screenHeading) {
      missing.push(`页面：${screen.name || "未命名界面"}`);
      return;
    }

    const sectionHeadings = headings.filter((heading) => (
      heading.index > screenHeading.index
      && !(heading.depth <= screenHeading.depth && heading.index > screenHeading.index)
    ));
    const nextPeer = headings.find((heading) => (
      heading.index > screenHeading.index && heading.depth <= screenHeading.depth
    ));
    const scopedHeadings = nextPeer
      ? sectionHeadings.filter((heading) => heading.index < nextPeer.index)
      : sectionHeadings;

    INTERACTION_SCREEN_REQUIRED_SUBHEADINGS.forEach((expected) => {
      if (!scopedHeadings.some((heading) => headingMatchesExpectedForCheck(heading, expected))) {
        missing.push(`${screen.name || "未命名界面"} / ${expected}`);
      }
    });
  });

  return missing;
}

function validateGameDesignCompleteness(markdown = "") {
  return validateRequiredMarkdownHeadings(markdown, GAME_DESIGN_REQUIRED_HEADINGS);
}

function validateInteractionPlanCompleteness(markdown = "", screens = []) {
  const baseValidation = validateRequiredMarkdownHeadings(markdown, INTERACTION_PLAN_REQUIRED_HEADINGS);
  const screenMissing = validateInteractionScreenHeadings(markdown, screens);
  const missing = [...baseValidation.missing, ...screenMissing];
  return { ok: missing.length === 0, missing };
}

function summarizeMissingHeadings(missing = [], limit = 6) {
  const items = missing.slice(0, limit);
  const suffix = missing.length > limit ? ` 等 ${missing.length} 项` : "";
  return `${items.join("、")}${suffix}`;
}

function hasRequiredPrimaryScreenListHeaders(headers = []) {
  const normalizedHeaders = headers.map((header) => normalizeDocumentHeadingForCheck(header));
  const normalizedExpected = PRIMARY_SCREEN_LIST_HEADERS.map((header) => normalizeDocumentHeadingForCheck(header));
  return normalizedHeaders.length === normalizedExpected.length
    && normalizedHeaders.every((header, index) => header === normalizedExpected[index]);
}

function validatePrimaryScreenListCompleteness(markdown = "") {
  const tableInfo = findCompletePrimaryScreenListTable(markdown);
  if (!tableInfo) {
    return {
      ok: false,
      issue: "8.7 主要界面清单缺少合法 Markdown 表格"
    };
  }

  if (!hasRequiredPrimaryScreenListHeaders(tableInfo.headers)) {
    return {
      ok: false,
      issue: "8.7 主要界面清单表头不是 6 列标准表头"
    };
  }

  const rows = Array.isArray(tableInfo.rows) ? tableInfo.rows : [];
  if (!rows.length) {
    return {
      ok: false,
      issue: "8.7 主要界面清单缺少有效数据行"
    };
  }

  const hasInvalidRow = rows.some((row) => (
    !String(row?.name || "").trim()
    || !String(row?.goal || "").trim()
    || !String(row?.entrySource || "").trim()
    || !String(row?.coreAction || "").trim()
    || !String(row?.keyState || "").trim()
    || !String(row?.closeBehavior || "").trim()
  ));
  if (hasInvalidRow) {
    return {
      ok: false,
      issue: "8.7 主要界面清单存在必填列为空的数据行"
    };
  }

  if (!hasPrimaryRootScreenRow(rows)) {
    return {
      ok: false,
      issue: "8.7 主要界面清单缺少默认根界面行"
    };
  }

  return { ok: true, issue: "" };
}

function buildGameDesignRetryMissingItems(validation = { missing: [] }, primaryScreenListValidation = { ok: true, issue: "" }) {
  const missing = Array.isArray(validation?.missing) ? [...validation.missing] : [];
  if (!primaryScreenListValidation?.ok) {
    missing.push(primaryScreenListValidation.issue || "8.7 主要界面清单未完整生成");
  }
  return [...new Set(missing.map((item) => String(item || "").trim()).filter(Boolean))];
}

function summarizeGameDesignRetryIssues(validation = { missing: [] }, primaryScreenListValidation = { ok: true, issue: "" }) {
  return summarizeMissingHeadings(buildGameDesignRetryMissingItems(validation, primaryScreenListValidation));
}

function buildGameDesignCandidateResult(markdown = "", attempt = 0) {
  const validation = validateGameDesignCompleteness(markdown);
  const primaryScreenListValidation = validatePrimaryScreenListCompleteness(markdown);
  return {
    content: markdown,
    validation,
    primaryScreenListValidation,
    hasCompletePrimaryScreenList: primaryScreenListValidation.ok,
    missingCount: Array.isArray(validation?.missing) ? validation.missing.length : 0,
    attempt
  };
}

async function generateGameDesignWithCompletenessRetry(payload, normalizedOutline = "", rawOutline = "") {
  const candidates = [];
  let latestValidation = { ok: false, missing: [] };
  let latestPrimaryScreenListValidation = { ok: false, issue: "" };

  for (let attempt = 0; attempt <= GAME_DESIGN_COMPLETENESS_MAX_RETRIES; attempt += 1) {
    throwIfAborted(payload.signal);
    const generated = ensurePrimaryScreenListSection(await generateTextWithApi({
      ...payload,
      retryMissingHeadings: attempt > 0 ? buildGameDesignRetryMissingItems(latestValidation, latestPrimaryScreenListValidation) : [],
      retryAttempt: attempt,
      retryMaxAttempts: GAME_DESIGN_COMPLETENESS_MAX_RETRIES
    }), normalizedOutline, rawOutline);
    const candidate = buildGameDesignCandidateResult(generated, attempt);
    candidates.push(candidate);
    latestValidation = candidate.validation;
    latestPrimaryScreenListValidation = candidate.primaryScreenListValidation;

    if (candidate.validation.ok && candidate.hasCompletePrimaryScreenList) break;
    if (attempt >= GAME_DESIGN_COMPLETENESS_MAX_RETRIES) break;

    $("#planStatus").textContent = `策划案章节不完整，缺少：${summarizeGameDesignRetryIssues(candidate.validation, candidate.primaryScreenListValidation)}，正在第 ${attempt + 1}/${GAME_DESIGN_COMPLETENESS_MAX_RETRIES} 次重试`;
  }

  const validCandidates = candidates.filter((candidate) => candidate.hasCompletePrimaryScreenList);
  if (!validCandidates.length) {
    throw new Error(`连续 ${GAME_DESIGN_COMPLETENESS_MAX_RETRIES + 1} 次仍未生成完整 8.7 主要界面清单`);
  }

  const bestCandidate = validCandidates.reduce((best, candidate) => {
    if (!best) return candidate;
    if (candidate.missingCount < best.missingCount) return candidate;
    if (candidate.missingCount === best.missingCount && candidate.attempt > best.attempt) return candidate;
    return best;
  }, null);

  return { content: bestCandidate.content, validation: bestCandidate.validation };
}

async function generateInteractionPlanWithCompletenessRetry(payload, selectedScreens = []) {
  let latestGenerated = "";
  let latestValidation = { ok: true, missing: [] };

  for (let attempt = 0; attempt <= DOCUMENT_COMPLETENESS_MAX_RETRIES; attempt += 1) {
    throwIfAborted(payload.signal);
    const apiPlan = await generatePlanWithApi({
      ...payload,
      retryMissingHeadings: attempt > 0 ? latestValidation.missing : [],
      retryAttempt: attempt,
      retryMaxAttempts: DOCUMENT_COMPLETENESS_MAX_RETRIES
    });
    if (!apiPlan) {
      return { content: "", validation: { ok: true, missing: [] } };
    }

    latestGenerated = ensureInteractionPlanCloseBehaviorSections(apiPlan, selectedScreens);
    latestValidation = validateInteractionPlanCompleteness(latestGenerated, selectedScreens);

    if (latestValidation.ok || attempt >= DOCUMENT_COMPLETENESS_MAX_RETRIES) break;

    $("#planStatus").textContent = `交互案章节不完整，缺少：${summarizeMissingHeadings(latestValidation.missing)}，正在第 ${attempt + 1}/${DOCUMENT_COMPLETENESS_MAX_RETRIES} 次重试`;
  }

  return { content: latestGenerated, validation: latestValidation };
}

function findCompletePrimaryScreenListTable(markdown = "") {
  const lines = String(markdown || "").split(/\r?\n/);
  let inPrimarySection = false;
  let primaryDepth = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const heading = getMarkdownHeadingInfo(lines[index]);
    if (heading) {
      if (isPrimaryScreenListHeading(heading.text)) {
        inPrimarySection = true;
        primaryDepth = heading.depth;
        continue;
      }
      if (inPrimarySection && heading.depth <= primaryDepth) break;
    }

    if (!inPrimarySection || !lines[index].includes("|")) continue;
    const headers = splitMarkdownRow(lines[index]);
    const headerMap = buildScreenTableHeaderMap(headers);
    if (!isStrictScreenTableHeader(headers) || headerMap.close === undefined) continue;
    const rows = extractScreenTableRows(lines, index);
    return rows.length ? { headers, headerMap, headerIndex: index, rows } : null;
  }

  return null;
}

function hasPrimaryRootScreenRow(rows = []) {
  return rows.some((row) => {
    const text = [row.name, row.closeBehavior].join(" ");
    return /主界面|主页面|首页|主页|大厅|主大厅|主场景|根界面|默认根界面|无关闭入口|home|lobby/i.test(text);
  });
}

function ensurePrimaryScreenListRootRow(markdown = "", tableInfo = null) {
  if (!tableInfo || tableInfo.headerIndex === undefined) return markdown;
  const lines = String(markdown || "").split(/\r?\n/);
  const insertIndex = isMarkdownTableDivider(lines[tableInfo.headerIndex + 1] || "")
    ? tableInfo.headerIndex + 2
    : tableInfo.headerIndex + 1;
  const rootRow = createPrimaryScreenListRow("main");
  lines.splice(insertIndex, 0, formatMarkdownTableRow(primaryScreenListRowToCells(rootRow)));
  return lines.join("\n").trim();
}

function formatPrimaryScreenListMarkdown(rows = []) {
  return [
    formatMarkdownTableRow(PRIMARY_SCREEN_LIST_HEADERS),
    formatMarkdownTableRow(new Array(PRIMARY_SCREEN_LIST_HEADERS.length).fill("---")),
    ...rows.map((row) => formatMarkdownTableRow(primaryScreenListRowToCells(row)))
  ].join("\n");
}

function primaryScreenListRowToCells(row = {}) {
  return [
    row.name,
    row.goal,
    row.entrySource,
    row.coreAction,
    row.keyState,
    row.closeBehavior
  ];
}

function insertPrimaryScreenListSection(markdown = "", tableMarkdown = "") {
  const lines = String(markdown || "").replace(/\r/g, "").split("\n");
  const tableLines = ["", ...tableMarkdown.split("\n"), ""];
  let primaryHeadingIndex = -1;
  let nineHeadingIndex = -1;

  for (let index = 0; index < lines.length; index += 1) {
    const heading = getMarkdownHeadingInfo(lines[index]);
    if (!heading) continue;
    if (primaryHeadingIndex === -1 && isPrimaryScreenListHeading(heading.text)) {
      primaryHeadingIndex = index;
    }
    if (nineHeadingIndex === -1 && /^9(?:\.|\s|、|$)|美术与音频方向/.test(normalizeBriefForScreenDetect(heading.text))) {
      nineHeadingIndex = index;
    }
  }

  if (primaryHeadingIndex >= 0) {
    lines.splice(primaryHeadingIndex + 1, 0, ...tableLines);
    return lines.join("\n").trim();
  }

  const headingBlock = ["### 8.7 主要界面清单", ...tableLines];
  if (nineHeadingIndex >= 0) {
    lines.splice(nineHeadingIndex, 0, ...headingBlock);
    return lines.join("\n").trim();
  }

  return [String(markdown || "").trim(), "", ...headingBlock].join("\n").trim();
}

const PRIMARY_SCREEN_LIST_HEADERS = ["界面名称", "界面目标", "入口来源", "核心操作", "关键状态", "界面关闭方式"];

const PRIMARY_SCREEN_LIST_ROW_TEMPLATES = {
  main: {
    name: "主界面",
    goal: "承载默认落点、核心状态总览和主要系统入口。",
    entrySource: "启动游戏默认进入",
    coreAction: "查看状态、进入核心玩法、打开功能入口",
    keyState: "默认、引导中、可领取、红点提醒",
    closeBehavior: "无关闭入口；作为默认根界面"
  },
  mainScene: {
    name: "主场景界面",
    goal: "承载默认落点、主对象展示、日常互动和主要功能入口。",
    entrySource: "启动游戏默认进入",
    coreAction: "查看主对象状态、执行日常互动、进入功能入口",
    keyState: "默认、引导中、可互动、可领取、红点提醒",
    closeBehavior: "无关闭入口；作为默认根界面"
  },
  gameplay: {
    name: "核心玩法界面",
    goal: "承载单局或核心操作过程，让玩家完成主要玩法目标。",
    entrySource: "主界面核心玩法入口",
    coreAction: "执行核心操作、观察反馈、完成目标",
    keyState: "准备、进行中、成功、失败、奖励待领取",
    closeBehavior: "返回主界面或进入结算/下一流程"
  },
  petDetail: {
    name: "宠物详情界面",
    goal: "查看宠物状态、成长信息、互动反馈和养成入口。",
    entrySource: "主界面宠物区域",
    coreAction: "查看状态、喂养互动、进入养成或装扮",
    keyState: "健康、饥饿、心情、成长、可互动",
    closeBehavior: "关闭后返回来源界面"
  },
  character: {
    name: "角色详情界面",
    goal: "查看角色属性、成长、装备和皮肤等养成信息。",
    entrySource: "主界面角色入口",
    coreAction: "查看属性、升级、装备、切换皮肤",
    keyState: "已拥有、可升级、材料不足、已装备",
    closeBehavior: "关闭后返回来源界面"
  },
  task: {
    name: "任务界面",
    goal: "展示每日任务、成就目标、进度和奖励领取。",
    entrySource: "主界面任务入口",
    coreAction: "查看任务、追踪目标、领取奖励",
    keyState: "未完成、可领取、已领取、限时",
    closeBehavior: "返回主界面"
  },
  shop: {
    name: "商店界面",
    goal: "承载商品浏览、资源消耗、购买确认和刷新状态。",
    entrySource: "主界面商店入口",
    coreAction: "浏览商品、查看价格、购买或刷新",
    keyState: "可购买、资源不足、已售罄、限时",
    closeBehavior: "返回主界面"
  },
  furnitureShop: {
    name: "家具商店界面",
    goal: "承载家具与装饰物浏览、购买、预览和刷新状态。",
    entrySource: "主界面商店或装饰入口",
    coreAction: "浏览家具、预览效果、购买或刷新",
    keyState: "可购买、资源不足、已拥有、限时刷新",
    closeBehavior: "返回主界面"
  },
  collection: {
    name: "图鉴界面",
    goal: "展示收集进度、已解锁内容、未解锁条件和奖励。",
    entrySource: "主界面图鉴入口",
    coreAction: "浏览图鉴、查看详情、领取收集奖励",
    keyState: "已解锁、未解锁、可领取、稀有",
    closeBehavior: "返回主界面"
  },
  petCollection: {
    name: "宠物图鉴界面",
    goal: "展示宠物收集进度、稀有度、解锁条件和奖励。",
    entrySource: "主界面图鉴入口",
    coreAction: "浏览宠物、查看详情、领取收集奖励",
    keyState: "已解锁、未解锁、稀有、可领取",
    closeBehavior: "返回主界面"
  },
  base: {
    name: "家园管理界面",
    goal: "承载家园、基地、房间或经营空间的布置与管理。",
    entrySource: "主界面家园入口",
    coreAction: "查看设施、摆放装饰、收取资源、升级管理",
    keyState: "可编辑、生产中、可收取、空间不足",
    closeBehavior: "返回主界面"
  },
  decorate: {
    name: "装饰编辑界面",
    goal: "承载房间装饰、家具摆放、预览和保存操作。",
    entrySource: "主界面装饰入口",
    coreAction: "选择家具、拖拽摆放、保存布置",
    keyState: "编辑中、可保存、空间不足、已保存",
    closeBehavior: "关闭后返回来源界面"
  },
  social: {
    name: "好友界面",
    goal: "承载好友列表、拜访、邀请、赠送或协作入口。",
    entrySource: "主界面社交入口",
    coreAction: "查看好友、发起互动、拜访或邀请",
    keyState: "在线、离线、可互动、申请中",
    closeBehavior: "返回主界面"
  },
  coCare: {
    name: "好友共养界面",
    goal: "承载好友协作照顾、共养记录、邀请和奖励状态。",
    entrySource: "主界面社交或共养入口",
    coreAction: "邀请好友、查看共养状态、执行协作互动",
    keyState: "可邀请、协作中、可领取、次数不足",
    closeBehavior: "返回主界面"
  },
  settings: {
    name: "设置界面",
    goal: "承载画面、声音、账号、通知和辅助功能设置。",
    entrySource: "主界面设置入口",
    coreAction: "修改设置、保存、恢复默认",
    keyState: "默认、已修改、保存成功、禁用",
    closeBehavior: "关闭后返回来源界面"
  },
  leaderboard: {
    name: "排行榜界面",
    goal: "展示排名、好友对比、赛季进度和奖励预览。",
    entrySource: "主界面排行榜入口",
    coreAction: "切换榜单、查看玩家、预览奖励",
    keyState: "未上榜、排名变化、赛季结算",
    closeBehavior: "返回主界面"
  },
  event: {
    name: "活动界面",
    goal: "展示限时活动、任务进度、奖励和参与入口。",
    entrySource: "主界面活动入口",
    coreAction: "查看规则、参与活动、领取奖励",
    keyState: "未开始、进行中、可领取、已过期",
    closeBehavior: "返回主界面"
  },
  gacha: {
    name: "抽卡界面",
    goal: "承载卡池预览、资源消耗、概率说明和抽取结果。",
    entrySource: "主界面抽卡入口",
    coreAction: "查看卡池、确认消耗、执行抽取",
    keyState: "资源不足、保底进度、抽取中、结果展示",
    closeBehavior: "返回主界面"
  },
  inventory: {
    name: "背包界面",
    goal: "展示道具、材料、装备和使用入口。",
    entrySource: "主界面背包入口",
    coreAction: "筛选道具、查看详情、使用或出售",
    keyState: "已获得、可使用、已锁定、数量不足",
    closeBehavior: "返回主界面"
  }
};

function createPrimaryScreenListRow(templateKey, overrides = {}) {
  return {
    ...(PRIMARY_SCREEN_LIST_ROW_TEMPLATES[templateKey] || PRIMARY_SCREEN_LIST_ROW_TEMPLATES.main),
    ...overrides
  };
}

function buildFallbackPrimaryScreenListRows(markdown = "", normalizedOutline = "", rawOutline = "") {
  const source = [normalizedOutline, rawOutline, markdown].filter(Boolean).join("\n");
  const normalized = normalizeBriefForScreenDetect(source);
  const rows = [];
  const seen = new Set();
  const add = (templateKey, overrides = {}) => {
    const row = createPrimaryScreenListRow(templateKey, overrides);
    const key = normalizeBriefForScreenDetect(row.name);
    if (!key || seen.has(key)) return;
    seen.add(key);
    rows.push(row);
  };

  const hasPet = /宠物|猫|狗|萌宠|养宠|陪伴/.test(normalized);
  const hasBase = /家园|基地|装饰|房间|家具|布置|建造|经营/.test(normalized);
  add(hasPet || hasBase ? "mainScene" : "main");

  if (/战斗|关卡|对局|消除|跑酷|射击|塔防|闯关|冒险|解谜|单局/.test(normalized)) add("gameplay");
  if (hasPet) add("petDetail");
  else if (/角色|英雄|伙伴|卡牌|皮肤|换装/.test(normalized)) add("character");
  if (/任务|每日|成就|活跃|新手|奖励/.test(normalized)) add("task");
  if (/家具|装饰/.test(normalized)) add("furnitureShop");
  else if (/商店|商城|购买|礼包|付费|广告|货币|资源消耗/.test(normalized)) add("shop");
  if (/图鉴|收集|收藏|解锁|稀有/.test(normalized)) add(hasPet ? "petCollection" : "collection");
  if (hasBase) add(/编辑|摆放|装饰|家具/.test(normalized) ? "decorate" : "base");
  if (/共养|协作照顾/.test(normalized)) add("coCare");
  else if (/好友|社交|拜访|邀请|公会|聊天|队伍/.test(normalized)) add("social");
  if (/排行|排名|榜单|赛季/.test(normalized)) add("leaderboard");
  if (/活动|限时|运营|节日/.test(normalized)) add("event");
  if (/抽卡|召唤|招募|卡池/.test(normalized)) add("gacha");
  if (/背包|仓库|道具|材料|装备/.test(normalized)) add("inventory");
  add("settings");

  ["task", "shop", "collection", "social", "inventory", "event"].forEach((templateKey) => {
    if (rows.length < 6) add(templateKey);
  });

  return rows.slice(0, 10);
}

function isPrimaryScreenListHeading(text) {
  const normalized = normalizeBriefForScreenDetect(text);
  return /主要界面清单|目标界面|界面清单|主要页面清单/.test(normalized);
}

function isScreenTableHeader(headers) {
  const normalizedHeaders = headers.map((header) => normalizeBriefForScreenDetect(header));
  const hasNameColumn = normalizedHeaders.some(isScreenNameHeader);
  const hasContextColumn = normalizedHeaders.some((header) => /入口来源|核心操作|主要操作|关键状态|界面关闭方式|关闭方式|返回方式|返回去向|退出方式|关闭去向|界面目标|页面目标|界面用途|页面用途|目标|用途|入口/.test(header));
  return hasNameColumn && hasContextColumn;
}

function isStrictScreenTableHeader(headers) {
  const normalizedHeaders = headers.map((header) => normalizeBriefForScreenDetect(header));
  const headerMap = buildScreenTableHeaderMap(headers);
  return normalizedHeaders.some(isScreenNameHeader)
    && headerMap.goal !== undefined
    && headerMap.entry !== undefined
    && headerMap.action !== undefined
    && headerMap.state !== undefined;
}

function isScreenNameHeader(normalizedHeader) {
  return /^(界面名称|页面名称|屏幕名称|目标界面|screen|screenname|page|pagename)$/.test(normalizedHeader);
}

function buildScreenTableHeaderMap(headers) {
  const map = {};
  headers.forEach((header, index) => {
    const normalized = normalizeBriefForScreenDetect(header);
    if (map.nameIndex === undefined && isScreenNameHeader(normalized)) map.nameIndex = index;
    if (map.name === undefined && isScreenNameHeader(normalized)) map.name = index;
    if (/界面目标|页面目标|目标/.test(normalized)) map.goal = index;
    if (/用途|说明|定位/.test(normalized)) map.purpose = index;
    if (/入口来源|入口/.test(normalized)) map.entry = index;
    if (/核心操作|主要操作|操作/.test(normalized)) map.action = index;
    if (/关键状态|状态/.test(normalized)) map.state = index;
    if (/界面关闭方式|关闭方式|返回方式|返回去向|退出方式|关闭去向|关闭目标|返回目标/.test(normalized)) map.close = index;
  });
  if (map.nameIndex === undefined) map.nameIndex = 0;
  return map;
}

function getTableCellByHeader(cells, headerMap, keys) {
  for (const key of keys) {
    const index = headerMap[key];
    if (index !== undefined && cells[index]) return cells[index];
  }
  return "";
}

function extractScreensFromInterfaceSections(brief) {
  const lines = String(brief || "").split(/\r?\n/);
  const candidates = [];
  let inInterfaceSection = false;
  let sectionDepth = 0;

  lines.forEach((line) => {
    if (inInterfaceSection && /^\s*(?:[-*•]|\d+[.)、])\s+/.test(line)) {
      const item = parseScreenListItem(line);
      if (item) candidates.push(item);
      return;
    }

    const heading = getMarkdownHeadingInfo(line);
    if (heading) {
      const isInterface = isInterfaceSectionHeading(heading.text);
      if (isInterface) {
        inInterfaceSection = true;
        sectionDepth = heading.depth;
      } else if (inInterfaceSection && heading.depth <= sectionDepth) {
        inInterfaceSection = false;
      }
      return;
    }

    if (!inInterfaceSection) return;
    const item = parseScreenListItem(line);
    if (item) candidates.push(item);
  });

  return candidates;
}

function getMarkdownHeadingInfo(line) {
  const text = String(line || "").trim();
  if (!text) return null;

  const markdown = text.match(/^(#{1,6})\s+(.+)$/);
  if (markdown) return { depth: markdown[1].length, text: stripMarkdownFormatting(markdown[2]) };

  const numbered = text.match(/^(\d+(?:\.\d+)*)[.、\s]+(.+)$/);
  if (numbered) return { depth: numbered[1].split(".").length, text: stripMarkdownFormatting(numbered[2]) };

  return null;
}

function isInterfaceSectionHeading(text) {
  const normalized = normalizeBriefForScreenDetect(text);
  return /uiux|ui\/ux|界面设计|主要界面|页面清单|功能入口|信息架构|界面结构|页面输出|界面规划|页面规划|ui模块|界面模块|界面清单|页面列表|屏幕清单/.test(normalized);
}

function parseScreenListItem(line) {
  const text = stripMarkdownFormatting(line).replace(/^[-*•]\s*/, "").replace(/^\d+[.)、]\s*/, "").trim();
  if (!text || text.includes("|")) return null;

  const pair = text.match(/^(.{1,24}?)(?:[:：\-—–]|，|,)\s*(.+)$/);
  const rawName = pair ? pair[1] : text;
  const name = normalizeScreenName(rawName);
  if (!isLikelyScreenName(name, { explicit: true })) return null;

  return {
    name,
    goal: pair?.[2] || "",
    aliases: pair?.[2] ? [pair[2]] : []
  };
}

function extractFallbackScreenNames(brief) {
  const names = [];
  const text = String(brief || "");
  const semanticPattern = /[\u4e00-\u9fa5A-Za-z0-9（）()\/]{1,18}(?:界面|页面|HUD|大厅|主城|地图|背包|仓库|商店|商城|图鉴|任务|成就|排行|好友|社交|设置|结算|抽卡|召唤|关卡|战斗|角色|英雄|装备|技能|剧情|活动|邮件|基地|家园|房间)/g;
  let match = semanticPattern.exec(text);
  while (match) {
    const name = normalizeScreenName(match[0]);
    if (isLikelyScreenName(name)) names.push(name);
    match = semanticPattern.exec(text);
  }

  extractCustomScreenNames(brief).forEach((name) => {
    if (isLikelyScreenName(name)) names.push(name);
  });

  return [...new Set(names)];
}

function isLikelyScreenName(name, { explicit = false } = {}) {
  const cleanName = normalizeScreenName(name);
  if (!cleanName || isExcludedScreenName(cleanName) || isGenericSystemName(cleanName)) return false;
  if (isAbstractScreenPhrase(cleanName)) return false;
  if (cleanName.length > (explicit ? 24 : 18)) return false;

  const normalized = normalizeBriefForScreenDetect(cleanName);
  const hasPageSemantic = /界面|页面|hud|大厅|主城|地图|背包|仓库|商店|商城|图鉴|任务|成就|排行|好友|社交|设置|结算|抽卡|召唤|关卡|战斗|角色|英雄|装备|技能|剧情|活动|邮件|基地|家园|房间/.test(normalized);
  if (hasPageSemantic) return true;

  if (!explicit) return false;
  return screenKeywordRules.some((rule) => {
    const ruleName = normalizeBriefForScreenDetect(rule.name);
    return ruleName === normalized || normalized.includes(ruleName) || ruleName.includes(normalized);
  });
}

function isTrustedScreenName(name) {
  const cleanName = normalizeScreenName(name);
  if (!cleanName || isExcludedScreenName(cleanName) || isGenericSystemName(cleanName)) return false;
  if (isComponentLikeScreenName(cleanName)) return false;
  if (isAbstractScreenPhrase(cleanName)) return false;
  return cleanName.length <= 24;
}

function isComponentLikeScreenName(name) {
  const normalized = normalizeBriefForScreenDetect(name);
  if (!normalized) return false;
  return /banner|顶部|底部|限时|标签|图标|按钮|红点|角标|卡片|提示|弹窗|弹层|入口|资源位|活动位|toast|徽标/.test(normalized);
}

function isGenericSystemName(name) {
  const normalized = normalizeBriefForScreenDetect(name);
  if (/界面|页面|hud|大厅|地图|商店|商城|背包|图鉴|任务/.test(normalized)) return false;

  const blockedExact = [
    "活动系统",
    "社交系统",
    "成就系统",
    "资源系统",
    "经济系统",
    "留存方式",
    "后续拓展",
    "玩家留存",
    "目标用户",
    "核心体验",
    "核心玩法",
    "玩法循环",
    "商业化设计",
    "技术需求",
    "版本计划",
    "数据指标",
    "风险评估"
  ].map(normalizeBriefForScreenDetect);

  if (blockedExact.includes(normalized)) return true;
  if (/系统$|方式$|规划$|计划$|指标$|风险$|需求$/.test(normalized)) return true;
  return false;
}

function isAbstractScreenPhrase(name) {
  const normalized = normalizeBriefForScreenDetect(name);
  if (!normalized) return true;
  const hasAbstractMarker = /降低|支持|同类产品|机制|带来|轻度|差异化|目标|卖点|亮点|方向|体验|可用|不可用|刷新次数|复合/.test(normalized);
  if (!hasAbstractMarker) return false;
  const exactPageLike = /^[\u4e00-\u9fa5a-z0-9]{0,12}(?:界面|页面|hud|大厅|主城|地图|背包|仓库|商店|商城|图鉴|任务|成就|排行|设置|结算|抽卡|召唤|关卡|战斗|剧情|活动|邮件|基地|家园|房间)$/.test(normalized);
  if (exactPageLike && !/降低|支持|同类产品|机制|带来|差异化|卖点|亮点|方向|体验/.test(normalized)) return false;
  return true;
}

function addDetectedScreen(list, seen, name, kind = "generic", aliases = [], metadata = {}) {
  const cleanName = normalizeScreenName(name);
  if (!cleanName || isExcludedScreenName(cleanName)) return;
  const normalizedMetadata = normalizePrimaryScreenListRow({
    ...metadata,
    name: cleanName,
    kind
  });

  const key = normalizeBriefForScreenDetect(cleanName);
  if (!key || seen.has(key)) return;

  const duplicate = list.find((item) => {
    const existing = normalizeBriefForScreenDetect(item.name);
    return item.kind === kind && (existing.includes(key) || key.includes(existing));
  });
  if (duplicate) {
    duplicate.aliases = [...new Set([...(duplicate.aliases || []), cleanName, ...aliases])];
    if (!duplicate.goal && normalizedMetadata.goal) duplicate.goal = normalizedMetadata.goal;
    if (!duplicate.entrySource && normalizedMetadata.entrySource) duplicate.entrySource = normalizedMetadata.entrySource;
    if (!duplicate.coreAction && normalizedMetadata.coreAction) duplicate.coreAction = normalizedMetadata.coreAction;
    if (!duplicate.keyState && normalizedMetadata.keyState) duplicate.keyState = normalizedMetadata.keyState;
    if (normalizedMetadata.closeBehavior && (!duplicate.closeBehavior || normalizedMetadata.closeBehavior === ROOT_SCREEN_CLOSE_BEHAVIOR)) {
      duplicate.closeBehavior = normalizedMetadata.closeBehavior;
    }
    seen.add(key);
    return;
  }

  const profile = getScreenProfile(kind);
  const id = `screen-${kind}-${list.length + 1}`;
  seen.add(key);
  list.push({
    id,
    name: cleanName,
    kind,
    aliases: [...new Set([cleanName, ...aliases])],
    goal: normalizedMetadata.goal || profile.goal,
    entrySource: normalizedMetadata.entrySource || "",
    coreAction: normalizedMetadata.coreAction || "",
    keyState: normalizedMetadata.keyState || "",
    closeBehavior: normalizedMetadata.closeBehavior || ""
  });
}

function getScreenCloseBehavior(screen = {}) {
  return String(screen?.closeBehavior || screen?.close_behavior || "").trim();
}

function isNoNavigationCloseBehavior(closeBehavior = "") {
  const text = String(closeBehavior || "").trim();
  if (!text) return false;
  return /无关闭入口|无关闭|无返回|无需关闭|无需返回|不需要关闭|不需要返回|不可关闭|无法关闭|不显示关闭|不显示返回|常驻|默认根界面|作为根界面|根界面/i.test(text);
}

function getCloseBehaviorComponentTypes(closeBehavior = "") {
  const text = String(closeBehavior || "").trim();
  if (!text || isNoNavigationCloseBehavior(text)) return [];
  const types = [];
  const homeLike = /主页按钮|首页按钮|home\s*button|回主页|回到主页|返回主页|回首页|返回首页/i.test(text);
  if (homeLike) types.push("home_button");
  const closeLike = /关闭|关掉|退出弹窗|关闭弹窗|收起|来源界面|弹窗|浮层|close|dismiss|modal|popup|dialog/i.test(text);
  const sourceCloseLike = /关闭.*来源|来源.*关闭|关闭后返回来源界面|关闭弹窗|弹窗关闭|返回来源界面/i.test(text);
  const backLike = /返回主界面|返回首页|返回主页|返回大厅|回到主界面|回到首页|回到主页|回到大厅|返回上一层|返回上一页|后退|back|return/i.test(text);
  if (closeLike) types.push("close_button");
  if (backLike && !sourceCloseLike && !homeLike) types.push("back_button");
  if (!types.length && /返回|后退|上一层|上一页|回到|退回|back|return/i.test(text)) types.push("back_button");
  return [...new Set(types)];
}

function formatScreenCloseBehaviorForPrompt(screen = {}, fallback = "未在目标界面清单中明确；从当前交互段落推断。") {
  return getScreenCloseBehavior(screen) || fallback;
}

function extractCustomScreenNames(brief) {
  const names = [];
  const patterns = [
    /([\u4e00-\u9fa5A-Za-z0-9（）()\/]{1,16}(?:界面|页面|系统|HUD|大厅|主城|地图|背包|仓库|商店|商城|图鉴|任务|成就|排行|好友|社交|设置|结算|抽卡|招募|关卡|战斗|角色|英雄|装备|技能|剧情|活动|邮件|基地|家园|房间))/g,
    /(?:页面输出|关键界面列表|核心系统|目标界面|主要界面|界面列表|包含界面)[：:]\s*([^\n\r]+)/g
  ];

  patterns.forEach((pattern) => {
    let match = pattern.exec(brief);
    while (match) {
      const value = match[1] || "";
      value.split(/[、,，;；|\/\s]+/).forEach((item) => {
        const name = normalizeScreenName(item);
        if (name && !isExcludedScreenName(name)) names.push(name);
      });
      match = pattern.exec(brief);
    }
  });

  return [...new Set(names)];
}

function normalizeScreenName(value) {
  return String(value)
    .replace(/^[-*•\d.、\s]+/, "")
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
    .replace(/[：:。；;，,、]+$/g, "")
    .replace(/^[-*•\d.、\s]+/, "")
    .replace(/[：:。；;，,]+$/g, "")
    .trim();
}

function isExcludedScreenName(name) {
  const normalized = normalizeBriefForScreenDetect(name);
  const excluded = ["经济系统", "成长系统", "核心系统", "音频设计", "美术风格", "项目范围", "目标玩家", "控制系统", "资源系统", "数值系统", "战斗系统"];
  return !normalized || excluded.some((item) => normalized === normalizeBriefForScreenDetect(item));
}

function inferScreenKind(name) {
  const normalized = normalizeBriefForScreenDetect(name);
  if (/boss|BOSS|首领|怪物/i.test(name)) return "boss";
  if (normalized.includes("隐藏剧情") || normalized.includes("展开剧情") || normalized.includes("剧情") || normalized.includes("对话") || normalized.includes("故事")) return "story";
  if (normalized.includes("排行") || normalized.includes("榜单") || normalized.includes("排名")) return "leaderboard";
  if (normalized.includes("设置")) return "settings";
  if (normalized.includes("结算") || normalized.includes("胜利") || normalized.includes("失败")) return "result";
  if (normalized.includes("抽卡") || normalized.includes("招募") || normalized.includes("召唤")) return "gacha";
  if (normalized.includes("房间") || normalized.includes("匹配")) return "room";
  if (normalized.includes("任务")) return "task";
  if (normalized.includes("宠物") || normalized.includes("角色") || normalized.includes("英雄")) return "character";
  if (normalized.includes("地图") || normalized.includes("关卡") || normalized.includes("章节")) return "level";
  if (normalized.includes("基地") || normalized.includes("家园") || normalized.includes("建造") || normalized.includes("经营") || normalized.includes("装饰")) return "base";
  const hit = screenKeywordRules.find((rule) => rule.aliases.some((alias) => normalized.includes(normalizeBriefForScreenDetect(alias))));
  return hit?.kind || "generic";
}

function getScreenProfile(kind) {
  return screenTypeProfiles[kind] || screenTypeProfiles.generic;
}

function normalizeBriefForScreenDetect(value) {
  return String(value)
    .replace(/\s+/g, "")
    .replace(/[（）()【】\[\]《》<>：:、，,。.；;\/\\|-]/g, "")
    .toLowerCase();
}

function getSelectedTextModel(selectId, fallback = "kimi-k2-thinking") {
  return document.getElementById(selectId)?.value || fallback;
}

function getTextModelLabel(modelId) {
  return TEXT_MODELS.find((model) => model.id === modelId)?.label || modelId || "Kimi K2";
}

function getSelectedDepth() {
  return document.getElementById("depth")?.value || "standard";
}

function getSelectedTone() {
  return document.getElementById("tone")?.value || "professional";
}

function getExtraNeeds() {
  return document.getElementById("extraNeeds")?.value.trim() || "";
}

function getPlanningDocument() {
  return [gameDesignOutput?.value, state.gameDesign, briefText.value]
    .map((item) => String(item || "").trim())
    .find(Boolean) || "";
}

function extractGameDesignSectionByHeading(documentText = "", headingPattern = /世界观与题材/) {
  const lines = String(documentText || "").replace(/\r/g, "").split("\n");
  const start = lines.findIndex((line) => {
    const normalized = line.trim().replace(/^#+\s*/, "");
    return headingPattern.test(normalized);
  });
  if (start < 0) return "";

  const startLine = lines[start].trim();
  const headingLevel = (startLine.match(/^#+/) || [""])[0].length;
  const numberedLevel = /^(\d+)(?:[.、\s]|$)/.test(startLine.replace(/^#+\s*/, "")) ? 1 : 0;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) continue;
    const nextHeadingLevel = (line.match(/^#+/) || [""])[0].length;
    if (headingLevel && nextHeadingLevel && nextHeadingLevel <= headingLevel) {
      end = index;
      break;
    }
    const text = line.replace(/^#+\s*/, "");
    if (!headingLevel && numberedLevel && /^\d+(?:[.、\s]|$)/.test(text) && !/^3(?:\.|、|\s|$)/.test(text)) {
      end = index;
      break;
    }
    if (headingLevel && nextHeadingLevel === headingLevel + 1 && /^\d+(?:[.、\s]|$)/.test(text) && !/^3(?:\.|、|\s|$)/.test(text)) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join("\n").trim();
}

function getWorldAndThemeSectionForImagePrompt() {
  const planningDocument = getPlanningDocument();
  const section = extractGameDesignSectionByHeading(planningDocument, /^(?:3(?:\.|、|\s|$).*世界观与题材|世界观与题材)/i)
    || extractGameDesignSectionByHeading(planningDocument, /世界背景|主角设定|主要角色|阵营与冲突|玩法包装/i);
  if (section) return section;
  return [
    "策划案缺少明确的「3. 世界观与题材」章节。",
    "不要从参考图推断题材、角色身份、场景语义、阵营、时代背景、世界规则或玩法包装。",
    "内容只能退回项目名、当前界面交互案、目标界面名称和策划案已有文字。"
  ].join("\n");
}

function formatWorldAndThemeForImagePrompt(maxChars = 2800) {
  const text = cleanAnalysisText(getWorldAndThemeSectionForImagePrompt())
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text.slice(0, maxChars);
}

function hasUsablePlanningSource() {
  return getPlanningDocument().length >= MIN_BRIEF_LENGTH;
}

function syncGameDesignFromEditor() {
  const edited = gameDesignOutput.value.trim();
  const unchanged = edited && edited === String(state.gameDesign || "").trim() && screens.length > 0;
  state.gameDesign = edited;
  if (!edited) return;

  state.gameName = gameName.value.trim() || detectGameName(edited) || detectGameName(briefText.value.trim()) || state.gameName;
  if (state.gameName) gameName.value = state.gameName;
  if (unchanged) return;
  syncScreensFromBrief(edited);
}

async function normalizeGameplayOutline({ model, projectName, rawOutline }) {
  const currentSignature = getRawOutlineSignature();
  const existing = getNormalizedOutlineFromEditor();
  if (existing && state.normalizedOutlineManual) {
    if (hasCrossProjectMismatch(getNormalizedOutlineSourceSignature())) {
      updateNormalizedOutlineStatus("检测到已切换项目，旧规范化大纲不可复用；请重新规范化。", "warning");
    } else {
    state.normalizedOutline = existing;
    state.normalizedOutlineSignature = currentSignature;
    return existing;
    }
  }
  if (existing && state.normalizedOutlineSignature === currentSignature) {
    if (hasCrossProjectMismatch(getNormalizedOutlineSourceSignature())) {
      updateNormalizedOutlineStatus("检测到已切换项目，旧规范化大纲不可复用；请重新规范化。", "warning");
    } else {
    return existing;
    }
  }

  state.isNormalizingOutline = true;
  if (normalizedOutlineOutput) {
    normalizedOutlineOutput.value = "正在按模板补全玩法大纲，请稍候...";
  }
  if (normalizedOutlineTable) {
    normalizedOutlineTable.innerHTML = `<div class="normalized-outline-empty">正在按模板补全玩法大纲，请稍候...</div>`;
  }
  if (normalizedOutlineTable) {
    normalizedOutlineTable.innerHTML = `<div class="normalized-outline-empty">正在按模板补全玩法大纲，请稍候...</div>`;
  }

  try {
    const normalized = await generateTextWithApi({
      task: "outline-normalization",
      model,
      projectName,
      rawOutline,
      outline: rawOutline,
      platform: getPlatformText($("#platform").value),
      extraNeeds: getExtraNeeds()
    });

    let rows = parseNormalizedOutlineResponse(normalized);
    state.normalizedOutlineRows = fillMissingNormalizedOutlineRows(rows);
    state.normalizedOutline = serializeNormalizedOutlineRows(state.normalizedOutlineRows);
    state.normalizedOutlineSignature = currentSignature;
    state.normalizedOutlineSourceSignature = normalizeProjectSignatureValue(currentSignature);
    state.normalizedOutlineManual = false;
    renderNormalizedOutlineTable(state.normalizedOutlineRows);
    if (normalizedOutlineOutput) normalizedOutlineOutput.value = state.normalizedOutline;
    persistLockedDocsIfNeeded("brief");
    return state.normalizedOutline;
  } finally {
    state.isNormalizingOutline = false;
  }
}

async function generateGameDesign(options = {}) {
  if (state.isGeneratingGameDesign) {
    cancelRunningButtonTask("generateGameDesign");
    return gameDesignOutput.value.trim() || state.gameDesign || "";
  }

  const outline = briefText.value.trim();
  if (!outline) {
    resetGeneratedContent();
    $("#briefStatus").textContent = "请先输入玩法大纲";
    $("#planStatus").textContent = "策划案待生成";
    return "";
  }

  state.isGeneratingGameDesign = true;
  const selectedModel = getSelectedTextModel("gameDesignModel", "kimi-k2-thinking");
  const selectedModelLabel = getTextModelLabel(selectedModel);
  setGenerateButtonPending("generateGameDesign", true, "规范化大纲");
  const hadGameDesignBefore = Boolean(state.gameDesign || gameDesignOutput.value.trim());
  if (!hadGameDesignBefore) {
    hideTargetScreensUntilGameDesignReady();
  }
  renderDocumentLoading("gameDesign", "正在规范化玩法大纲", "正在按模板补齐游戏名称、类型、目标、核心玩法、循环、成长、美术和特色亮点。");
  $("#briefStatus").textContent = "正在规范化玩法大纲";
  $("#planStatus").textContent = `正在调用 ${selectedModelLabel} 补全玩法大纲`;

  try {
    const brief = outline;
    state.gameName = gameName.value.trim() || detectGameName(outline) || "未命名小游戏";
    state.gameName = gameName.value.trim() || detectGameName(brief) || detectGameName(briefText.value.trim()) || "未命名小游戏";
    gameName.value = state.gameName;
    const normalizedOutline = await normalizeGameplayOutline({
      model: selectedModel,
      projectName: state.gameName,
      rawOutline: outline
    });
    setGenerateButtonPending("generateGameDesign", true, "生成策划案");
    renderDocumentLoading("gameDesign", `正在调用 ${selectedModelLabel} 生成完整策划案`, "正在基于规范化玩法大纲生成模板化策划案，请稍候。");
    $("#briefStatus").textContent = "玩法大纲已规范化";
    $("#planStatus").textContent = `正在调用 ${selectedModelLabel} 生成完整策划案`;

    const payload = {
      task: "game-design",
      model: selectedModel,
      projectName: state.gameName,
      outline: normalizedOutline,
      rawOutline: outline,
      normalizedOutline,
      platform: getPlatformText($("#platform").value),
      depth: getDepthText(getSelectedDepth()),
      tone: getToneText(getSelectedTone()),
      extraNeeds: getExtraNeeds()
    };

    if (!options.useApi) {
      throw new Error("完整策划案必须通过 Babylon 聊天模型生成，请使用本地服务或部署地址访问。");
    }

    if (window.location.protocol === "file:") {
      throw new Error(`当前是 file:// 打开，无法调用 Babylon。请双击 start-local.bat 后访问 ${getLocalAccessHint()}。`);
    }

    const generated = ensurePrimaryScreenListSection(await generateTextWithApi(payload), normalizedOutline, outline);

    state.gameDesign = generated;
    gameDesignOutput.value = generated;
    renderMarkdownDocument("gameDesign");
    syncScreensFromBrief(generated);
    $("#planStatus").textContent = "策划案已生成";
    persistLockedDocsIfNeeded("gameDesign");

    if (state.lockedDocs?.plan && (state.fullPlan || state.plan || planOutput.value.trim())) {
      $("#planStatus").textContent = "策划案已生成；交互案来自锁定缓存，若策划案已变更建议重新生成";
      persistLockedDocsIfNeeded("plan");
    } else {
      state.plan = "";
      state.fullPlan = "";
      state.visualAnalyses = {};
      state.visualSvgs = {};
      resetVisualSvgBatchSummary();
      state.generatingVisualScreen = "";
      unlockLockedVisualSvg();
      state.designCompositionAnalyses = {};
      planOutput.value = "";
      if (options.autoContinue) {
        renderDocumentLoading("plan", "正在生成交互设计案", "完整策划案已完成，正在拆解目标界面、流程和交互状态。");
      } else {
        renderMarkdownDocument("plan");
      }
    }
    renderEmptyVisual();
    renderEmptyDesignOutput();
    $("#designStatus").textContent = "设计稿待生成";

    state.isGeneratingGameDesign = false;
    setGenerateButtonComplete("generateGameDesign", "重新生成策划案");

    if (options.autoContinue) {
      await generatePlan({ useApi: true, skipGameDesign: true });
    }

    return generated;
  } catch (error) {
    const message = error?.message || `${selectedModelLabel} 生成失败，请检查本地服务、Babylon Token 或网络后重试。`;
    console.warn(error);
    $("#planStatus").textContent = `${selectedModelLabel} 生成失败`;
    if (state.gameDesign || gameDesignOutput.value.trim()) {
      const button = document.getElementById("generateGameDesign");
      if (button) button.dataset.idleLabel = "重新生成策划案";
      renderMarkdownDocument("gameDesign");
    } else {
      const button = document.getElementById("generateGameDesign");
      if (button) button.dataset.idleLabel = "生成策划案";
      renderDocumentError("gameDesign", `${selectedModelLabel} 生成失败`, message);
    }
    return "";
  } finally {
    if (state.isGeneratingGameDesign) {
      state.isGeneratingGameDesign = false;
      setGenerateButtonPending("generateGameDesign", false);
    }
  }
}

async function handleNormalizeOutline() {
  if (state.isNormalizingOutline) {
    cancelRunningButtonTask("normalizeOutline");
    return;
  }

  const rawOutline = briefText.value.trim();
  if (!rawOutline || rawOutline.length < MIN_BRIEF_LENGTH) {
    updateNormalizedOutlineStatus("请先输入玩法大纲，再点击规范化玩法大纲。", "error");
    $("#briefStatus").textContent = "请先输入玩法大纲";
    return;
  }

  state.gameName = gameName.value.trim() || detectGameName(rawOutline) || state.gameName || "未命名小游戏";
  if (gameName) gameName.value = state.gameName;

  const selectedModel = getSelectedTextModel("normalizeOutlineModel", getSelectedTextModel("gameDesignModel", "gpt-5.2"));
  const selectedModelLabel = getTextModelLabel(selectedModel);

  setGenerateButtonPending("normalizeOutline", true, "规范化玩法大纲");
  const buttonController = createButtonAbortController("normalizeOutline", "已取消规范化玩法大纲");
  updateNormalizedOutlineStatus(`正在调用 ${selectedModelLabel} 按模板补全玩法大纲...`);
  $("#briefStatus").textContent = "正在规范化玩法大纲";

  try {
    await normalizeGameplayOutline({
      model: selectedModel,
      projectName: state.gameName,
      rawOutline,
      force: true,
      signal: buttonController.signal
    });

    const meta = state.normalizedOutlineParseMeta || {};
    let successMessage = "规范化玩法大纲已生成，可继续编辑后再生成策划案。";
    if (meta.totalRecognizedFields > 0 && meta.totalRecognizedFields < NORMALIZED_OUTLINE_TEMPLATE.length) {
      successMessage = `已识别 ${meta.totalRecognizedFields} 项内容，其余字段已用默认建议补齐。`;
    } else if (meta.usedAliases) {
      successMessage = "模型返回了非标准字段名，已本地归一化为标准玩法大纲。";
    }
    updateNormalizedOutlineStatus(successMessage);
    $("#briefStatus").textContent = "玩法大纲已规范化";
    $("#planStatus").textContent = state.gameDesign || gameDesignOutput.value.trim() ? "可重新生成策划案" : "可生成策划案";
    setGenerateButtonComplete("normalizeOutline", "重新规范化");
  } catch (error) {
    console.warn(error);
    if (isAbortLikeError(error)) {
      updateNormalizedOutlineStatus(error?.message || "已取消规范化玩法大纲", "warning");
      $("#briefStatus").textContent = "已取消规范化";
    } else {
      updateNormalizedOutlineStatus(error?.message || "规范化玩法大纲失败，请检查 Babylon Token、网络或本地服务。", "error");
      $("#briefStatus").textContent = "规范化失败";
    }
    setGenerateButtonPending("normalizeOutline", false);
  }
}

async function normalizeGameplayOutline({ model, projectName, rawOutline, force = false, signal = null }) {
  const currentSignature = getRawOutlineSignature();
  const existing = getNormalizedOutlineFromEditor();

  if (!force && existing && state.normalizedOutlineManual) {
    if (hasCrossProjectMismatch(getNormalizedOutlineSourceSignature())) {
      updateNormalizedOutlineStatus("检测到已切换项目，旧规范化大纲不可复用；请重新规范化。", "warning");
    } else {
    state.normalizedOutline = existing;
    state.normalizedOutlineSignature = currentSignature;
    return existing;
    }
  }

  if (!force && existing && state.normalizedOutlineSignature === currentSignature) {
    if (hasCrossProjectMismatch(getNormalizedOutlineSourceSignature())) {
      updateNormalizedOutlineStatus("检测到已切换项目，旧规范化大纲不可复用；请重新规范化。", "warning");
    } else {
    return existing;
    }
  }

  state.isNormalizingOutline = true;
  throwIfAborted(signal);
  if (normalizedOutlineOutput) {
    normalizedOutlineOutput.value = "正在按模板补全玩法大纲，请稍候...";
  }
  if (normalizedOutlineTable) {
    normalizedOutlineTable.innerHTML = `<div class="normalized-outline-empty">正在按模板补全玩法大纲，请稍候...</div>`;
  }

  try {
    const normalized = await generateTextWithApi({
      task: "outline-normalization",
      model,
      projectName,
      rawOutline,
      outline: rawOutline,
      platform: getPlatformText($("#platform").value),
      extraNeeds: getExtraNeeds(),
      signal
    });

    throwIfAborted(signal);
    let parsed = parseNormalizedOutlineResponseDetailed(normalized);
    let rows = parsed.rows;
    if (!rows.length) {
      const repaired = await repairNormalizedOutlineJsonWithApi({
        model,
        projectName,
        rawOutline,
        rawResponse: normalized,
        signal
      });
      throwIfAborted(signal);
      parsed = parseNormalizedOutlineResponseDetailed(repaired);
      rows = parsed.rows;
    }
    if (!rows.length) {
      const failureReason = parsed.sourceShape === "unparseable"
        ? "规范化玩法大纲失败：模型返回了非空内容，但结构不可解析。"
        : "规范化玩法大纲失败：模型未返回可修复的固定游戏大纲内容。";
      throw new Error(failureReason);
    }
    state.normalizedOutlineParseMeta = {
      totalRecognizedFields: parsed.totalRecognizedFields,
      usedAliases: parsed.usedAliases,
      sourceShape: parsed.sourceShape,
      usedDefaults: parsed.totalRecognizedFields < NORMALIZED_OUTLINE_TEMPLATE.length
    };
    state.normalizedOutlineRows = fillMissingNormalizedOutlineRows(rows);
    state.normalizedOutline = serializeNormalizedOutlineRows(state.normalizedOutlineRows);
    state.normalizedOutlineSignature = currentSignature;
    state.normalizedOutlineSourceSignature = normalizeProjectSignatureValue(currentSignature);
    state.normalizedOutlineManual = false;
    renderNormalizedOutlineTable(state.normalizedOutlineRows);
    if (normalizedOutlineOutput) normalizedOutlineOutput.value = state.normalizedOutline;
    persistLockedDocsIfNeeded("brief");
    return state.normalizedOutline;
  } finally {
    state.isNormalizingOutline = false;
  }
}

async function generateGameDesign(options = {}) {
  if (state.isGeneratingGameDesign) {
    cancelRunningButtonTask("generateGameDesign");
    return gameDesignOutput.value.trim() || state.gameDesign || "";
  }

  const rawOutline = briefText.value.trim();
  const normalizedOutline = getNormalizedOutlineFromEditor();

  if (!rawOutline) {
    resetGeneratedContent();
    updateNormalizedOutlineStatus("请先输入玩法大纲。", "error");
    $("#briefStatus").textContent = "请先输入玩法大纲";
    $("#planStatus").textContent = "策划案待生成";
    return "";
  }

  if (!normalizedOutline) {
    updateNormalizedOutlineStatus("请先点击「规范化玩法大纲」，确认或编辑后再生成策划案。", "error");
    $("#briefStatus").textContent = "请先规范化玩法大纲";
    $("#planStatus").textContent = "策划案未生成";
    if (!state.gameDesign && !gameDesignOutput.value.trim()) {
      renderDocumentError("gameDesign", "请先规范化玩法大纲", "请在玩法大纲模块点击「规范化玩法大纲」，确认或编辑后再生成策划案。");
    }
    return "";
  }

  if (hasStaleNormalizedOutline()) {
    const message = getProjectSwitchBlockMessage("gameDesign");
    updateNormalizedOutlineStatus(message, "error");
    $("#briefStatus").textContent = "检测到已切换项目";
    $("#planStatus").textContent = message;
    renderDocumentError("gameDesign", "旧规范化大纲已失效", message);
    return "";
  }

  state.isGeneratingGameDesign = true;
  const selectedModel = getSelectedTextModel("gameDesignModel", "gpt-5.2");
  const selectedModelLabel = getTextModelLabel(selectedModel);
  const hadGameDesignBefore = Boolean(state.gameDesign || gameDesignOutput.value.trim());

  if (!hadGameDesignBefore) {
    hideTargetScreensUntilGameDesignReady();
  }

  setGenerateButtonPending("generateGameDesign", true, "生成策划案");
  const buttonController = createButtonAbortController("generateGameDesign", "已取消策划案生成");
  renderDocumentLoading("gameDesign", `正在调用 ${selectedModelLabel} 生成完整策划案`, "正在基于可编辑的规范化玩法大纲扩展为完整策划案，请稍候。");
  $("#briefStatus").textContent = "规范化大纲已确认";
  $("#planStatus").textContent = `正在调用 ${selectedModelLabel} 生成完整策划案`;

  try {
    throwIfAborted(buttonController.signal);
    state.gameName = gameName.value.trim() || detectGameName(normalizedOutline) || detectGameName(rawOutline) || "未命名小游戏";
    if (gameName) gameName.value = state.gameName;

    if (!options.useApi) {
      throw new Error("完整策划案必须通过 Babylon 聊天模型生成，请使用本地服务或部署地址访问。");
    }

    if (window.location.protocol === "file:") {
      throw new Error(`当前是 file:// 打开，无法调用 Babylon。请启动本地服务后访问 ${getLocalAccessHint()}。`);
    }

    const gameDesignResult = await generateGameDesignWithCompletenessRetry({
      task: "game-design",
      model: selectedModel,
      projectName: state.gameName,
      outline: normalizedOutline,
      rawOutline,
      normalizedOutline,
      platform: getPlatformText($("#platform").value),
      depth: getDepthText(getSelectedDepth()),
      tone: getToneText(getSelectedTone()),
      extraNeeds: getExtraNeeds(),
      signal: buttonController.signal
    }, normalizedOutline, rawOutline);
    throwIfAborted(buttonController.signal);
    const generated = gameDesignResult.content;

    state.gameDesign = generated;
    state.gameDesignSourceSignature = getCurrentProjectSignature();
    gameDesignOutput.value = generated;
    renderMarkdownDocument("gameDesign");
    syncScreensFromBrief(generated);
    const gameDesignStatusText = gameDesignResult.validation.ok
      ? "策划案已生成"
      : `策划案已生成，但仍缺少章节：${summarizeMissingHeadings(gameDesignResult.validation.missing)}`;
    $("#planStatus").textContent = gameDesignStatusText;
    persistLockedDocsIfNeeded("gameDesign");

    if (state.lockedDocs?.plan && (state.fullPlan || state.plan || planOutput.value.trim())) {
      if (hasStalePlan()) {
        state.plan = "";
        state.fullPlan = "";
        state.planSourceSignature = "";
        planOutput.value = "";
        renderMarkdownDocument("plan");
        $("#planStatus").textContent = `${gameDesignStatusText}；检测到旧交互案属于其他项目，已阻止复用`;
      } else {
        $("#planStatus").textContent = `${gameDesignStatusText}；交互案来自锁定缓存，若策划案已变更建议重新生成`;
        persistLockedDocsIfNeeded("plan");
      }
    } else {
      state.plan = "";
      state.fullPlan = "";
      state.planSourceSignature = "";
      state.visualAnalyses = {};
      state.visualSvgs = {};
      resetVisualSvgBatchSummary();
      state.generatingVisualScreen = "";
      unlockLockedVisualSvg();
      state.designCompositionAnalyses = {};
      planOutput.value = "";
      if (options.autoContinue) {
        renderDocumentLoading("plan", "正在生成交互设计案", "完整策划案已完成，正在拆解目标界面、流程和交互状态。");
      } else {
        renderMarkdownDocument("plan");
      }
    }
    renderEmptyVisual();
    renderEmptyDesignOutput();
    $("#designStatus").textContent = "设计稿待生成";

    state.isGeneratingGameDesign = false;
    setGenerateButtonComplete("generateGameDesign", "重新生成策划案");

    if (options.autoContinue) {
      await generatePlan({ useApi: true, skipGameDesign: true, signal: buttonController.signal });
    }

    return generated;
  } catch (error) {
    const message = error?.message || `${selectedModelLabel} 生成失败，请检查本地服务、Babylon Token 或网络后重试。`;
    console.warn(error);
    if (isAbortLikeError(error)) {
      $("#planStatus").textContent = message || "已取消策划案生成";
      if (!state.gameDesign && !gameDesignOutput.value.trim()) {
        renderDocumentError("gameDesign", "已取消策划案生成", "可再次点击生成策划案。");
      } else {
        renderMarkdownDocument("gameDesign");
      }
    } else if (state.gameDesign || gameDesignOutput.value.trim()) {
      $("#planStatus").textContent = message;
      const button = document.getElementById("generateGameDesign");
      if (button) button.dataset.idleLabel = "重新生成策划案";
      renderMarkdownDocument("gameDesign");
    } else {
      $("#planStatus").textContent = message;
      const button = document.getElementById("generateGameDesign");
      if (button) button.dataset.idleLabel = "生成策划案";
      renderDocumentError("gameDesign", `${selectedModelLabel} 生成失败`, message);
    }
    return "";
  } finally {
    if (state.isGeneratingGameDesign) {
      state.isGeneratingGameDesign = false;
      setGenerateButtonPending("generateGameDesign", false);
    }
  }
}

function buildLocalGameDesign({ projectName, outline, platform, depth, tone, extraNeeds }) {
  throw new Error("本地策划案兜底已停用，请调用 Babylon 聊天模型生成完整策划案。");
  const safeProjectName = projectName || detectGameName(outline) || "未命名小游戏";
  const cleanOutline = outline || "建议设定：玩法大纲暂缺，先以一个可快速验证的核心玩法闭环为基础。";
  const keywords = getKeywords(cleanOutline).join("、") || "核心玩法、目标反馈、成长、任务、资源、长期留存";
  const extensionText = extraNeeds || "建议设定：后续拓展围绕新角色/内容、新玩法模式、限时活动、社交协作和商业化礼包展开。";
  const platformText = platform || "界面：横版（16:9）";
  const depthText = depth || "标准方案";
  const toneText = tone || "专业评审风格";

  return `# 《${safeProjectName}》游戏策划案

> 本地策划案兜底已停用。此内容不应被展示，请调用 Babylon 聊天模型生成完整策划案。
> 输出配置：${platformText} / ${depthText} / ${toneText}

## 1. 项目概述

### 1.1 游戏名称
《${safeProjectName}》

### 1.2 游戏类型
建议设定：根据玩法大纲关键词“${keywords}”，本项目定位为轻量化小游戏，核心类型以玩法大纲描述的主循环为准，副类型可结合成长、任务、收集、经营、社交或关卡挑战进行包装。

### 1.3 平台定位
| 项目 | 规划 |
| --- | --- |
| 目标平台 | ${platformText} |
| 操作方式 | 鼠标点击/触控点击为主，拖拽、长按、滑动作为辅助操作 |
| 单次体验 | 建议设定：单次核心体验控制在 1-5 分钟，适合快速进入和反复游玩 |
| 交付目标 | 支持后续生成交互设计案、SVG 线框标注和界面视觉稿 |

### 1.4 目标用户
| 用户类型 | 核心诉求 | 对应设计 |
| --- | --- | --- |
| 轻度休闲用户 | 快速理解玩法、低学习成本、即时反馈 | 主目标前置、核心按钮突出、失败惩罚轻量 |
| 中度目标用户 | 有成长目标、阶段奖励和可持续追求 | 任务、成长、收集、关卡或活动进度 |
| 内容探索用户 | 希望发现新内容、新剧情或新组合 | 解锁线、图鉴/档案、活动和后续拓展 |

### 1.5 核心卖点
- 玩法卖点：围绕大纲中的核心动作建立清晰闭环，让玩家能快速做出选择并立即获得反馈。
- 成长卖点：通过任务、资源、等级、收集或关卡推进建立中长期目标。
- 表现卖点：用明确的主题包装、状态反馈、奖励动效和可视化进度提升完成感。
- 留存卖点：通过每日目标、阶段解锁、活动刷新和后续拓展保持回访动机。

### 1.6 竞品与差异化
| 同类方向 | 可参考重点 | 本项目差异化 |
| --- | --- | --- |
| 轻量休闲小游戏 | 上手快、反馈强、节奏短 | 更强调玩法大纲中的定制主题和核心循环，不做泛化模板 |
| 成长/收集型小游戏 | 长期目标、图鉴、资源回收 | 通过阶段目标和可视化状态让成长路径更清晰 |
| 任务驱动型小游戏 | 日常目标、成就、活动 | 将任务入口与主界面目标联动，降低玩家迷失感 |

## 2. 核心体验

### 2.1 玩家扮演身份
建议设定：玩家扮演能够推动大纲中核心事件发展的主导者。身份包装应直接服务核心玩法，例如管理者、探索者、经营者、训练者、解谜者、守护者或挑战者，避免与玩法动作脱节。

### 2.2 核心乐趣
- 决策乐趣：玩家根据当前状态、资源和目标选择下一步行动。
- 反馈乐趣：每次操作都有清晰的视觉、音效、数值或剧情反馈。
- 成长乐趣：玩家能看到长期目标逐步推进。
- 探索乐趣：后续拓展内容为玩家提供新角色、新系统、新场景或新玩法变化。

### 2.3 核心玩法循环
进入游戏 → 查看当前目标/状态 → 执行核心操作 → 获得即时反馈 → 回收奖励/资源 → 推进成长或解锁内容 → 出现新的目标与选择。

### 2.4 短中长期目标
| 周期 | 玩家目标 | 系统承载 | UI 表达 |
| --- | --- | --- | --- |
| 短期 | 完成当前局/当前任务/当前操作 | 主界面、核心玩法界面 | 目标条、主按钮、即时反馈 |
| 中期 | 解锁新内容、提升能力、完成章节 | 成长、任务、关卡、商店 | 进度条、红点、解锁条件 |
| 长期 | 收集完整内容、参与活动、形成社交/排行目标 | 活动、图鉴、社交、排行榜 | 赛季页、图鉴页、榜单页 |

## 3. 世界观与题材

### 3.1 世界背景
建议设定：世界背景应从玩法大纲中的题材关键词延展，解释玩家为什么要重复进行核心操作，以及资源、关卡、任务和成长为什么合理存在。

### 3.2 主角设定
主角应具备明确行动动机，能够自然承接核心玩法。若玩法强调经营，主角可以是经营者；若强调战斗，主角可以是挑战者；若强调收集或探索，主角可以是探索者。

### 3.3 主要角色
| 角色类型 | 职责 | UI/系统用途 |
| --- | --- | --- |
| 玩家主角 | 承载玩家身份和成长线 | 头像、等级、称号、能力展示 |
| 引导角色 | 解释目标、教学和剧情推进 | 新手引导、任务提示、剧情弹窗 |
| 功能角色 | 商店、任务、活动或强化入口 | NPC 面板、功能入口、状态提示 |
| 对手/目标对象 | 形成挑战、冲突或经营目标 | 关卡目标、挑战列表、胜负反馈 |

### 3.4 阵营与冲突
建议设定：冲突不一定是战斗，也可以是资源不足、时间压力、顾客需求、环境变化、谜题阻碍、经营目标或收集缺口。冲突要能转化为界面状态和玩家操作目标。

### 3.5 玩法包装
玩法包装需要把抽象操作转化为主题动作，例如“点击升级”包装为训练/建造/培养，“完成任务”包装为委托/订单/探索，“消耗资源”包装为制作/兑换/强化。

## 4. 核心玩法设计

### 4.1 基础操作
| 操作 | 使用场景 | 反馈要求 |
| --- | --- | --- |
| 点击 | 进入功能、确认操作、领取奖励 | 按钮态变化、点击音效、结果提示 |
| 拖拽/滑动 | 调整对象、执行互动、移动视角 | 拖拽轨迹、吸附反馈、失败回弹 |
| 长按 | 查看详情、连续操作、蓄力类操作 | 进度反馈、取消提示、完成反馈 |

### 4.2 单局流程
建议流程：进入准备状态 → 查看目标与资源 → 执行核心操作 → 触发结果判断 → 展示奖励/失败反馈 → 返回主界面或进入下一阶段。

### 4.3 胜负条件
| 条件类型 | 成功判定 | 失败判定 |
| --- | --- | --- |
| 目标完成 | 达成任务、关卡、订单或挑战目标 | 时间耗尽、资源不足、关键对象失败 |
| 分数/评级 | 达到指定分数、评级或效率 | 分数不足、评级低于门槛 |
| 进度推进 | 完成阶段节点或解锁内容 | 进度中断或未满足条件 |

### 4.4 奖励反馈
- 即时奖励：金币、经验、材料、评分、成长值或剧情推进。
- 阶段奖励：任务宝箱、章节奖励、活动点数、图鉴解锁。
- 表现反馈：资源飞入、完成动画、音效、弹窗、进度条增长。

### 4.5 失败惩罚
建议设定：失败惩罚以轻量为主，避免直接劝退。可采用少量资源损耗、进度不满、评级降低、冷却等待或需要重新挑战的方式。

## 5. 系统设计

### 5.1 角色系统
| 模块 | 设计内容 | 关键状态 |
| --- | --- | --- |
| 角色信息 | 名称、头像、等级、身份标签 | 默认、升级可用、满级 |
| 能力展示 | 属性、技能、专长或功能加成 | 未解锁、已解锁、可强化 |
| 角色更换 | 角色/皮肤/装扮选择 | 已拥有、未拥有、试用 |

### 5.2 养成系统
| 养成项 | 产出价值 | 消耗资源 | UI 状态 |
| --- | --- | --- | --- |
| 等级成长 | 解锁功能、提升能力 | 经验/金币/材料 | 可升级、资源不足、满级 |
| 技能/能力 | 改变玩法效率或策略 | 技能点/材料 | 未解锁、可升级、冷却 |
| 外观/收集 | 个性化和长期追求 | 稀有资源/活动币 | 已拥有、未拥有、限时 |

### 5.3 关卡系统
| 内容 | 设计规则 | 状态 |
| --- | --- | --- |
| 主线关卡 | 承载核心玩法推进和教学 | 未解锁、可挑战、已通关 |
| 支线/挑战 | 提供额外目标和资源产出 | 开放、冷却、已领取 |
| 难度分层 | 用目标、时间、资源限制增加变化 | 普通、困难、精英 |

### 5.4 任务系统
| 任务类型 | 目的 | 奖励 |
| --- | --- | --- |
| 新手任务 | 教学和功能引导 | 基础资源、解锁提示 |
| 每日任务 | 短期留存 | 日常货币、经验、活跃度 |
| 成就任务 | 长期目标 | 稀有资源、称号、外观 |

### 5.5 资源系统
| 资源 | 主要来源 | 主要消耗 | UI 展示 |
| --- | --- | --- | --- |
| 基础货币 | 核心玩法、任务、签到 | 升级、购买、制作 | 顶部常驻 |
| 高级货币 | 成就、活动、付费 | 稀有道具、加速、外观 | 顶部/商店重点展示 |
| 材料/道具 | 关卡、活动、兑换 | 强化、解锁、合成 | 背包/详情面板 |

### 5.6 商店系统
| 分区 | 商品类型 | 关键状态 |
| --- | --- | --- |
| 推荐 | 当前阶段最相关商品 | 推荐、限时、折扣 |
| 常规 | 消耗品、材料、基础道具 | 可购买、资源不足 |
| 稀有 | 外观、礼包、活动商品 | 限购、售罄、未解锁 |

### 5.7 活动系统
| 活动类型 | 目的 | 核心入口 |
| --- | --- | --- |
| 日常活动 | 稳定回访 | 主界面活动入口、任务页 |
| 限时活动 | 提升阶段热度 | 活动页、红点、倒计时 |
| 赛季活动 | 长线目标 | 赛季页、通行证、排行榜 |

### 5.8 社交系统
| 功能 | 作用 | 风险控制 |
| --- | --- | --- |
| 好友/助力 | 提升分享和回访 | 限制每日收益，避免刷资源 |
| 排行榜 | 提供竞争目标 | 分段排行、好友榜优先 |
| 分享 | 扩散内容和成就 | 分享奖励轻量，避免强制 |

## 6. 数值与经济

### 6.1 资源产出
| 来源 | 产出内容 | 节奏建议 |
| --- | --- | --- |
| 核心玩法 | 基础货币、经验、材料 | 高频、小额、稳定 |
| 任务系统 | 活跃度、宝箱、阶段奖励 | 每日刷新、阶段累积 |
| 活动系统 | 活动币、稀有材料 | 限时、目标明确 |

### 6.2 资源消耗
| 消耗点 | 消耗资源 | 设计目的 |
| --- | --- | --- |
| 升级/强化 | 基础货币、材料 | 推动成长线 |
| 商店购买 | 基础/高级货币 | 建立资源回收 |
| 外观/稀有内容 | 高级货币、活动币 | 长期目标和个性化 |

### 6.3 成长曲线
| 阶段 | 时间范围 | 设计重点 |
| --- | --- | --- |
| 新手期 | 0-30 分钟 | 快速理解玩法，频繁正反馈 |
| 成长期 | 1-7 天 | 解锁系统，形成日常循环 |
| 稳定期 | 7 天后 | 活动、收集、排行和社交目标 |

### 6.4 付费点设计
| 付费点 | 内容 | 原则 |
| --- | --- | --- |
| 便利性 | 加速、额外次数、资源补足 | 不破坏核心公平 |
| 外观类 | 皮肤、主题、装扮 | 不影响强度或弱强度影响 |
| 礼包类 | 新手礼包、月卡、活动礼包 | 清晰标价和价值展示 |

### 6.5 平衡性原则
| 原则 | 说明 |
| --- | --- |
| 不堵死免费路径 | 免费玩家可通过时间和技巧推进核心内容 |
| 资源缺口可预期 | 缺少资源时明确告诉玩家来源和替代路径 |
| 付费提升体验而非替代玩法 | 付费应减少等待或扩展表达，不直接跳过核心体验 |

## 7. 内容规划

### 7.1 首发内容
建议设定：首发至少包含 1 套完整核心玩法、1 条新手流程、3-5 个可感知成长节点、5-10 个任务目标、1 个商店雏形和 1 个活动/签到入口。

### 7.2 剧情章节
建议设定：用 3 个章节建立基础内容节奏。第 1 章教学，第 2 章引入成长或资源压力，第 3 章引入活动/社交/高阶目标。

### 7.3 角色数量
建议设定：Demo 可先 1-3 个角色或核心对象；上线版本根据题材扩展到 8-20 个可收集或可成长对象。

### 7.4 关卡数量
建议设定：Demo 5-10 个关卡/目标节点；Beta 30-60 个；上线版本按章节、难度和活动继续扩展。

### 7.5 活动规划
| 活动 | 开启时机 | 目标 |
| --- | --- | --- |
| 新手七日 | 首次登录后 7 天 | 建立回访和系统认知 |
| 周常挑战 | 第 2 天后 | 提供中期目标 |
| 主题活动 | 上线后周期更新 | 提供新内容和稀有奖励 |

### 7.6 长线更新计划
${extensionText}

## 8. UI/UX 设计

### 8.1 主界面结构
主界面需要同时承载玩家状态、当前目标、核心操作按钮、资源栏和主要系统入口。建议顶部放资源与身份，中部放核心玩法/当前对象，底部放高频操作，侧边放低频系统。

### 8.7 主要界面清单

| 界面名称 | 界面目标 | 入口来源 | 核心操作 | 关键状态 | 界面关闭方式 |
| --- | --- | --- | --- | --- | --- |
| 主界面 HUD | 汇总玩家状态、资源、目标和核心入口 | 登录后默认进入 | 查看目标、进入核心玩法、领取提示 | 默认、红点、资源不足、可领取 | 无关闭入口；作为默认根界面 |
| 核心玩法界面 | 承载主要操作和即时反馈 | 主界面主按钮 | 执行操作、确认结果、暂停/返回 | 准备、进行中、成功、失败 | 暂停后返回主界面 HUD；完成后进入结算/奖励 |
| 任务界面 | 展示每日、成就和阶段目标 | 主界面任务入口 | 查看任务、跳转、领取奖励 | 进行中、可领取、已完成 | 返回主界面 HUD |
| 成长界面 | 展示角色/能力/内容解锁进度 | 主界面成长入口 | 升级、强化、查看条件 | 未解锁、可升级、资源不足、满级 | 返回主界面 HUD |
| 商店界面 | 购买资源、道具、礼包和外观 | 主界面商店入口 | 筛选、查看详情、购买 | 可购买、售罄、限购、资源不足 | 返回主界面 HUD；详情弹窗关闭后回到商店界面 |
| 活动界面 | 展示限时目标和活动奖励 | 主界面活动入口 | 查看规则、参与、领取奖励 | 未开始、进行中、倒计时、已结束 | 返回主界面 HUD；活动结果跳转奖励结算 |
| 设置界面 | 调整基础配置和查看帮助 | 主界面设置入口 | 音量、语言、帮助、账号 | 默认、保存成功、异常提示 | 关闭设置返回来源界面 |

### 8.2 功能入口
| 入口层级 | 入口类型 | 放置建议 |
| --- | --- | --- |
| 一级入口 | 核心玩法、当前目标 | 主界面视觉中心或底部主按钮 |
| 二级入口 | 任务、成长、商店、活动 | 主界面底部或侧边导航 |
| 三级入口 | 设置、公告、帮助、邮件 | 角落图标或折叠菜单 |

### 8.3 操作流程
主流程：主界面查看目标 → 点击核心操作 → 进入核心玩法界面 → 完成目标 → 结算奖励 → 返回主界面 → 任务/成长出现可领取或可升级状态。

### 8.4 弹窗规则
| 弹窗类型 | 使用场景 | 规则 |
| --- | --- | --- |
| 确认弹窗 | 消耗资源、购买、退出 | 明确代价和结果，主按钮高亮 |
| 奖励弹窗 | 任务、关卡、活动奖励 | 展示奖励图标、数量和下一步 |
| 详情弹窗 | 商品、角色、道具、规则 | 支持关闭、返回和跳转来源 |

### 8.5 红点规则
| 红点来源 | 触发条件 | 消失条件 |
| --- | --- | --- |
| 任务 | 有可领取奖励或新任务 | 领取后或查看后消失 |
| 成长 | 可升级、可解锁、材料满足 | 执行升级/解锁或查看后消失 |
| 活动 | 新活动、可领取、倒计时紧迫 | 查看或领取后消失 |

### 8.6 新手引导
建议采用轻引导：首局强制引导核心操作，后续通过任务目标、手势提示、局部高亮和引导角色说明逐步开放系统。

## 9. 美术与音频方向

### 9.1 美术风格
建议设定：根据题材选择清晰统一的视觉方向，保证主界面、核心玩法界面、弹窗和按钮组件有一致的材质、描边、色彩和图标语言。

### 9.2 角色风格
角色需要具备可读性和功能辨识度，头像、立绘或小图标应能在小尺寸下识别身份和状态。

### 9.3 场景风格
场景服务玩法目标，避免背景干扰 UI。核心操作区需要保留足够对比度和留白。

### 9.4 UI 风格
UI 应形成稳定组件体系：顶部资源栏、底部主操作、卡片容器、Tab、弹窗、奖励展示、红点和禁用态需要可复用。

### 9.5 特效风格
特效用于强化成功、失败、资源获得、升级、解锁和活动奖励，不应遮挡关键操作。

### 9.6 音乐音效
音乐强化题材氛围，音效重点覆盖点击、确认、失败、领取、升级、资源飞入和红点提示。

## 10. 商业化设计

### 10.1 商业模式
建议设定：免费游玩 + 轻度内购 + 可选激励广告，优先保证核心玩法体验完整。

### 10.2 付费内容
| 内容 | 价值 | 风险 |
| --- | --- | --- |
| 新手礼包 | 降低前期资源压力 | 避免破坏新手节奏 |
| 月卡/通行证 | 稳定长期收益 | 奖励展示要清晰 |
| 外观/主题 | 个性化表达 | 避免影响核心平衡 |

### 10.3 广告设计
激励广告只在可选场景出现，例如额外奖励、失败复活、资源补足或加速等待，不应强制打断核心流程。

### 10.4 礼包设计
礼包应按玩家阶段分层：新手礼包、成长礼包、活动礼包、回流礼包。每个礼包需要明确价值构成和领取路径。

### 10.5 付费节奏
建议前 10 分钟不强推付费，先建立核心乐趣；首次资源缺口后展示低门槛礼包；中期通过活动和成长节点展示更高价值内容。

## 11. 技术需求

### 11.1 引擎与平台
建议设定：可用 Web/移动端小游戏技术栈实现，优先支持横版或竖版目标界面比例，资源加载需要按模块拆分。

### 11.2 网络需求
| 模式 | 需求 |
| --- | --- |
| 单机/弱联网 | 本地存档、离线可玩、上线同步奖励 |
| 联网 | 账号、任务、活动、商店、排行榜和支付校验 |

### 11.3 数据存储
需要记录玩家等级、资源、任务进度、关卡进度、已购商品、活动状态、设置项和新手引导步骤。

### 11.4 性能目标
首屏加载尽量控制在 3 秒内；核心操作反馈低于 100ms；弹窗和动画避免长时间阻塞操作。

### 11.5 风险功能
| 功能 | 风险 | 建议 |
| --- | --- | --- |
| 支付/广告 | 接入复杂、合规风险 | 后置到 Alpha/Beta 阶段 |
| 社交/排行 | 数据同步和作弊风险 | 先做好友榜或本地榜 |
| 大量动效 | 性能和包体压力 | 先实现关键反馈动效 |

## 12. 版本计划

### 12.1 Demo 版本
| 目标 | 内容 | 验收 |
| --- | --- | --- |
| 验证核心玩法 | 主界面、核心玩法、基础奖励 | 玩家能完成 1 次完整闭环 |

### 12.2 Alpha 版本
| 目标 | 内容 | 验收 |
| --- | --- | --- |
| 验证系统结构 | 任务、成长、商店、基础活动 | 主要界面可跳转，状态完整 |

### 12.3 Beta 版本
| 目标 | 内容 | 验收 |
| --- | --- | --- |
| 验证留存和经济 | 数值、活动、广告/付费雏形 | 次日留存和资源回收可观测 |

### 12.4 上线版本
| 目标 | 内容 | 验收 |
| --- | --- | --- |
| 完整发布 | 首发内容、商业化、埋点、性能优化 | 核心指标达到上线门槛 |

### 12.5 后续运营版本
| 目标 | 内容 | 验收 |
| --- | --- | --- |
| 长线更新 | 新关卡、新角色/内容、活动、赛季 | 周期更新稳定，活动数据可复盘 |

## 13. 数据指标

### 13.1 新手完成率
| 指标 | 建议目标 | 说明 |
| --- | --- | --- |
| 首次核心操作完成率 | 70%+ | 判断新手入口是否清晰 |
| 首局/首任务完成率 | 60%+ | 判断核心流程是否易懂 |

### 13.2 留存指标
| 指标 | 建议目标 | 说明 |
| --- | --- | --- |
| D1 留存 | 建议设定：25%-40% | 取决于品类和投放来源 |
| D7 留存 | 建议设定：8%-18% | 观察中期目标有效性 |

### 13.3 关卡数据
| 指标 | 用途 |
| --- | --- |
| 失败率 | 判断难度曲线 |
| 平均时长 | 判断节奏和疲劳度 |
| 重试率 | 判断挑战吸引力 |

### 13.4 付费数据
| 指标 | 用途 |
| --- | --- |
| 首付转化 | 判断付费入口时机 |
| ARPPU | 判断礼包价值 |
| 广告完成率 | 判断激励广告接受度 |

### 13.5 活动数据
| 指标 | 用途 |
| --- | --- |
| 活动参与率 | 判断活动入口和奖励吸引力 |
| 活动完成率 | 判断目标难度 |
| 活动回访率 | 判断短期留存价值 |

## 14. 风险评估

### 14.1 玩法风险
| 风险 | 表现 | 解决方案 |
| --- | --- | --- |
| 核心循环不清晰 | 玩家不知道下一步做什么 | 主界面目标前置，新手任务强引导 |

### 14.2 内容风险
| 风险 | 表现 | 解决方案 |
| --- | --- | --- |
| 内容消耗过快 | 玩家短期完成全部目标 | 增加日常、活动和分阶段解锁 |

### 14.3 技术风险
| 风险 | 表现 | 解决方案 |
| --- | --- | --- |
| 性能压力 | 首屏慢、动效卡顿 | 分包加载、动效降级、资源压缩 |

### 14.4 美术风险
| 风险 | 表现 | 解决方案 |
| --- | --- | --- |
| 风格不统一 | 页面之间按钮、图标和面板不一致 | 建立组件基准和设计系统，首批界面统一评审 |

### 14.5 商业化风险
| 风险 | 表现 | 解决方案 |
| --- | --- | --- |
| 付费压迫感强 | 玩家早期流失 | 先建立玩法价值，再展示可选付费 |

### 14.6 解决方案
| 优先级 | 方案 | 负责人建议 |
| --- | --- | --- |
| P0 | 先验证核心玩法闭环和主界面目标表达 | 策划 + UI/UX |
| P1 | 建立任务、资源、成长和奖励反馈标准 | 系统策划 + 程序 |
| P2 | 补齐活动、商业化和长线内容 | 运营策划 + 商业化 |
| P3 | 建立数据埋点和版本复盘机制 | 数据 + 产品 |`;
}

async function generatePlan(options = {}) {
  if (state.isGeneratingPlan) {
    cancelRunningButtonTask("generatePlan");
    return;
  }

  if (hasStaleNormalizedOutline() || hasStaleGameDesign()) {
    const message = getProjectSwitchBlockMessage("plan");
    updateNormalizedOutlineStatus(message, "error");
    $("#briefStatus").textContent = "检测到已切换项目";
    $("#planStatus").textContent = message;
    renderDocumentError("plan", "旧项目文档已失效", message);
    return;
  }

  if (!gameDesignOutput.value.trim() && !state.gameDesign) {
    renderDocumentError("plan", "交互设计案未生成", "请先点击“生成策划案”，成功生成完整策划案后再生成交互设计案。");
    $("#planStatus").textContent = "请先手动生成策划案";
    return;
  }

  const brief = getPlanningDocument();
  if (!brief) {
    resetGeneratedContent();
    $("#briefStatus").textContent = "等待输入策划案";
    $("#planStatus").textContent = "请先输入策划案";
    return;
  }

  state.isGeneratingPlan = true;
  setGenerateButtonPending("generatePlan", true, "生成交互案");
  const buttonController = options.signal
    ? { signal: options.signal }
    : createButtonAbortController("generatePlan", "已取消交互案生成");
  renderDocumentLoading("plan", "正在生成交互设计案", "正在结合完整策划案拆解主要界面、操作路径、按钮状态和交互标注。");

  try {
    throwIfAborted(buttonController.signal);
    state.gameName = gameName.value.trim() || detectGameName(brief) || "未命名小游戏";
    gameName.value = state.gameName;
    state.gameName = gameName.value.trim() || detectGameName(brief) || detectGameName(briefText.value.trim()) || "未命名小游戏";
    gameName.value = state.gameName;
    syncScreensFromBrief(brief);
    const selectedScreens = getSelectedScreens();
    const keywords = getKeywords(brief);
    const genreProfile = getGenreReferenceProfile(brief);
    const platform = $("#platform").value;
    const depth = getSelectedDepth();
    const tone = getSelectedTone();
    const extraNeeds = getExtraNeeds();

    const localPlan = buildFullPlan({
      selectedScreens,
      brief,
      keywords,
      genreProfile,
      platform,
      depth,
      tone,
      extraNeeds
    });

    state.fullPlan = localPlan;

    if (options.useApi) {
      $("#planStatus").textContent = "正在请求 Babylon / OpenAI API";
      const apiPlanResult = await generateInteractionPlanWithCompletenessRetry({
        task: "interaction-design",
        model: getSelectedTextModel("interactionModel"),
        brief,
        outline: getNormalizedOutlineFromEditor() || briefText.value.trim(),
        rawOutline: briefText.value.trim(),
        normalizedOutline: getNormalizedOutlineFromEditor(),
        selectedScreens,
        keywords,
        genreProfile,
        platform,
        depth,
        tone,
        extraNeeds,
        localPlan,
        signal: buttonController.signal
      }, selectedScreens);
      throwIfAborted(buttonController.signal);
      if (apiPlanResult.content) {
        state.fullPlan = apiPlanResult.content;
        $("#planStatus").textContent = apiPlanResult.validation.ok
          ? "API 方案已生成"
          : `API 方案已生成，但仍缺少章节：${summarizeMissingHeadings(apiPlanResult.validation.missing)}`;
      } else {
        $("#planStatus").textContent = "API 未连接，已使用本地规则方案";
      }
    }

    state.fullPlan = ensureInteractionPlanCloseBehaviorSections(state.fullPlan, selectedScreens);
    state.plan = state.fullPlan;
    state.planSourceSignature = getCurrentProjectSignature();

    state.activeTab = "overview";
    $$(".plan-tabs button").forEach((button) => button.classList.toggle("is-active", button.dataset.planTab === "overview"));
    syncActiveVisualScreen();
    syncActiveDesignScreen();
    renderVisualTabs();
    renderDesignTabs();
    renderPlanTab();
    persistLockedDocsIfNeeded("plan");
    state.visualAnalyses = {};
    state.visualSvgs = {};
    resetVisualSvgBatchSummary();
    state.generatingVisualScreen = "";
    unlockLockedVisualSvg();
    state.designCompositionAnalyses = {};
    state.visualSvg = "";
    renderEmptyVisual();
    renderEmptyDesignOutput();
    $("#designStatus").textContent = "设计稿待生成";
    $("#briefStatus").textContent = "策划案已分析";
    if (!options.useApi) {
      $("#planStatus").textContent = selectedScreens.length ? "交互方案已生成" : "方案已生成，但未识别到目标界面";
    }
    state.isGeneratingPlan = false;
    setGenerateButtonComplete("generatePlan", "重新生成交互案");
  } catch (error) {
    console.warn(error);
    if (isAbortLikeError(error)) {
      $("#planStatus").textContent = error?.message || "已取消交互案生成";
      if (!state.fullPlan && !state.plan && !planOutput.value.trim()) {
        renderDocumentError("plan", "已取消交互案生成", "可再次点击生成交互案。");
      } else {
        renderMarkdownDocument("plan");
      }
    } else {
      $("#planStatus").textContent = error?.message || "交互案生成失败";
      if (!state.fullPlan && !state.plan && !planOutput.value.trim()) {
        renderDocumentError("plan", "交互案生成失败", error?.message || "请检查本地服务、Babylon Token 或网络后重试。");
      } else {
        renderMarkdownDocument("plan");
      }
    }
  } finally {
    if (state.isGeneratingPlan) {
      state.isGeneratingPlan = false;
      setGenerateButtonPending("generatePlan", false);
    }
  }
}

function detectGameName(brief) {
  const direct = String(brief || "").match(/(?:游戏名称|游戏名字|项目名称|名称)\s*[：:]\s*([^\n\r]+)/);
  if (direct) return direct[1].replace(/[（(].*?[）)]/g, "").trim();
  const match = brief.match(/游戏名称[：:]\s*([^\n\r]+)/);
  return match ? match[1].trim() : "";
}

async function generateTextWithApi(payload) {
  if (window.location.protocol === "file:") {
    throw new Error(`当前是 file:// 打开，无法调用 Babylon。请通过 ${getLocalAccessHint()} 访问。`);
  }

  throwIfAborted(payload.signal);
  const requestModel = payload.model || "kimi-k2-thinking";
  const requestModelLabel = getTextModelLabel(requestModel);
  const response = await fetch("/api/generate-plan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    signal: payload.signal,
    body: JSON.stringify({
      task: payload.task || "game-design",
      model: requestModel,
      projectName: payload.projectName || state.gameName,
      outline: payload.outline || briefText.value.trim(),
      rawOutline: payload.rawOutline || briefText.value.trim(),
      normalizedOutline: payload.normalizedOutline || getNormalizedOutlineFromEditor(),
      platform: payload.platform,
      depth: payload.depth,
      tone: payload.tone,
      extraNeeds: payload.extraNeeds,
      existingGameDesign: payload.existingGameDesign,
      inferredScreens: payload.inferredScreens,
      retryMissingHeadings: payload.retryMissingHeadings,
      retryAttempt: payload.retryAttempt,
      retryMaxAttempts: payload.retryMaxAttempts
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMessage = typeof data.error === "string" ? data.error : data.error?.message;
    throw new Error(formatPlanApiError(errorMessage || `${requestModelLabel} API request failed: ${response.status}`));
  }

  const content = String(data.content || data.plan || data.gameDesign || "").trim();
  if (!content) {
    const suggestion = requestModel === "gpt-5.4" ? "，建议切换 GPT 5.2 或 Kimi K2 后重试" : "";
    throw new Error(`${requestModelLabel} returned empty content${suggestion}.`);
  }
  return content;
}

async function generatePlanWithApi(payload) {
  if (window.location.protocol === "file:") {
    return "";
  }

  try {
    throwIfAborted(payload.signal);
    const response = await fetch("/api/generate-plan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      signal: payload.signal,
      body: JSON.stringify({
        ...payload,
        task: payload.task || "interaction-design",
        model: payload.model,
        projectName: payload.projectName || state.gameName,
        brief: payload.brief,
        outline: payload.outline || briefText.value.trim(),
        rawOutline: payload.rawOutline || briefText.value.trim(),
        normalizedOutline: payload.normalizedOutline || getNormalizedOutlineFromEditor(),
        screens: Array.isArray(payload.selectedScreens)
          ? payload.selectedScreens.map((screen) => ({
              name: screen.name,
              kind: screen.kind,
              goal: screen.goal,
              entrySource: screen.entrySource || "",
              coreAction: screen.coreAction || "",
              keyState: screen.keyState || "",
              closeBehavior: getScreenCloseBehavior(screen)
            }))
          : payload.screens,
        keywords: payload.keywords,
        genre: payload.genreProfile
          ? {
              id: payload.genreProfile.id,
              label: payload.genreProfile.label,
              examples: payload.genreProfile.examples,
              principles: payload.genreProfile.principles
            }
          : payload.genre,
        platform: payload.platform ? getPlatformText(payload.platform) : payload.platform,
        depth: payload.depth ? getDepthText(payload.depth) : payload.depth,
        tone: payload.tone ? getToneText(payload.tone) : payload.tone,
        extraNeeds: payload.extraNeeds,
        localPlan: payload.localPlan
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = typeof errorData.error === "string" ? errorData.error : errorData.error?.message;
      throw new Error(formatPlanApiError(errorMessage || `API proxy failed: ${response.status}`));
    }

    const data = await response.json();
    return String(data.plan || "").trim();
  } catch (error) {
    console.warn(error);
    return "";
  }
}

function formatPlanApiError(message) {
  const text = String(message || "").trim();
  if (!text) return "本地服务请求失败。";
  if (/Local plan API is not enabled/i.test(text)) {
    return "当前本地服务启动成了简化版 PowerShell 服务，未启用 /api/generate-plan。请用 Game-UX-Board-Launcher.bat 重新启动完整 Python 服务。";
  }
  if (/BABYLON_JWT_TOKEN.*missing|Missing BABYLON_JWT_TOKEN|token.*missing/i.test(text)) {
    return "未检测到 Babylon Token。请检查 .env 中的 BABYLON_JWT_TOKEN。";
  }
  if (/WinError 10061|actively refused|connection refused/i.test(text)) {
    return "Babylon 网络连接被拒绝。若本地服务已启动，请检查代理环境变量、公司网络或 Babylon 服务可达性。";
  }
  return text;
}

async function generateVisualAnalysisWithApi(screen, options = {}) {
  if (window.location.protocol === "file:" || !screen) {
    throw new Error(`请通过 ${getLocalAccessHint()} 访问，file:// 无法调用聊天模型分析 SVG。`);
  }

  throwIfAborted(options.signal);
  const brief = getPlanningDocument();
  const interactionPlan = getVisualPlanText();
  if (!brief || !interactionPlan) {
    throw new Error("缺少完整策划案或交互设计案，无法生成可编辑 SVG。");
  }

  const localVisual = buildLocalVisualAnalysisPayload(screen);
  const currentScreenPlan = extractScreenSection(interactionPlan, screen);
  const visualRequirements = document.getElementById("visualRequirements")?.value.trim() || "";
  const visualStructure = {
    goal: localVisual.goal,
    annotations: localVisual.annotations,
    terms: localVisual.terms,
    screenKind: screen.kind,
    screenName: screen.name,
    closeBehavior: getScreenCloseBehavior(screen),
    visualRequirements
  };

  const response = await fetch("/api/generate-plan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    signal: options.signal,
    body: JSON.stringify({
      task: "visual-analysis",
      model: getSelectedTextModel("interactionModel"),
      projectName: state.gameName,
      platform: getPlatformText($("#platform").value),
      brief,
      outline: briefText.value.trim(),
      interactionPlan,
      currentScreenPlan,
      visualRequirements,
      retryIssues: options.retryIssues || [],
      retryAttempt: options.retryAttempt || 0,
      retryMaxAttempts: options.retryMaxAttempts || SVG_COMPLETENESS_MAX_RETRIES,
      visualStructure,
      screen: {
        id: screen.id,
        name: screen.name,
        kind: screen.kind,
        goal: screen.goal,
        closeBehavior: getScreenCloseBehavior(screen)
      },
      screens: getSelectedScreens().map((item) => ({
        id: item.id,
        name: item.name,
        kind: item.kind,
        goal: item.goal,
        closeBehavior: getScreenCloseBehavior(item)
      })),
      localVisual
    })
  });

  if (!response.ok) {
    let message = `SVG 结构化分析请求失败：${response.status}`;
    try {
      const errorData = await response.json();
      message = errorData.error || errorData.message || message;
    } catch (error) {
      // Keep the HTTP status message when the proxy does not return JSON.
    }
    throw new Error(message);
  }

  const data = await response.json();
  const content = data.analysis || data.content || data.plan || "";
  const normalized = normalizeVisualAnalysis(content, screen, localVisual);
  if (!normalized) {
    throw new Error("结构化分析失败：聊天模型未返回合法 JSON，已停止生成 SVG。");
  }
  return normalized;
}

function buildLocalVisualAnalysisPayload(screen) {
  const manual = getManualVisualDataFromPlan(screen);
  const fallback = getScreenVisualData(screen);
  const annotations = manual.annotations.length ? manual.annotations : fallback.annotations;
  const plan = getVisualPlanText();
  const section = extractScreenSection(plan, screen);
  const terms = collectVisualTerms([section, plan, getPlanningDocument()].filter(Boolean).join("\n"), screen).slice(0, 6);
  while (terms.length < 6) terms.push(`内容${String.fromCharCode(65 + terms.length)}`);
  return {
    goal: manual.goal || screen.goal || "",
    closeBehavior: manual.closeBehavior || getScreenCloseBehavior(screen),
    layoutType: inferVisualLayoutType(screen),
    annotations: annotations.slice(0, 4),
    terms
  };
}

function normalizeVisualAnalysis(raw, screen, fallback = buildLocalVisualAnalysisPayload(screen)) {
  const parsed = typeof raw === "string" ? parseJsonObjectFromText(raw) : raw;
  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const layoutRegions = normalizeVisualObjectList(parsed.layoutRegions || parsed.regions || parsed.layout || parsed.layoutStructure);
  const components = normalizeVisualObjectList(parsed.components || parsed.controls || parsed.widgets || parsed.modules);
  const primaryAction = normalizePrimaryVisualAction(parsed.primaryAction || parsed.mainAction || parsed.cta || parsed.primaryButton);
  const forbiddenComponents = normalizeAnalysisList(parsed.forbiddenComponents || parsed.forbidden || parsed.disallowedComponents);
  const states = normalizeAnalysisList(parsed.states || parsed.stateCoverage || parsed.status);
  const flows = normalizeAnalysisList(parsed.flows || parsed.userFlows || parsed.interactionFlows || parsed.keyInteractions);
  const handoffNotes = normalizeAnalysisList(parsed.handoffNotes || parsed.handoff || parsed.delivery || parsed.devNotes);
  const fieldIds = normalizeAnalysisList(parsed.fieldIds || parsed.fields || parsed.actionIds || parsed.events);

  const blocks = [];
  const directAnnotations = Array.isArray(parsed.annotations)
    ? parsed.annotations
    : Array.isArray(parsed.annotationBlocks)
      ? parsed.annotationBlocks
      : Array.isArray(parsed.blocks)
        ? parsed.blocks
        : [];

  directAnnotations.forEach((item) => {
    const title = cleanAnalysisText(item?.title || item?.name || item?.heading || "");
    const body = cleanAnalysisText(item?.body || item?.description || item?.content || "");
    if (title && body) blocks.push({ title, body });
  });

  [
    ["布局结构", layoutRegions.map((item) => [item.name, item.role, item.elements.join("、")].filter(Boolean).join("："))],
    ["关键交互", flows.length ? flows : (parsed.interactions || parsed.keyInteractions || parsed.actions)],
    ["状态与异常", states],
    ["交付关注", handoffNotes.length ? handoffNotes : fieldIds]
  ].forEach(([title, value]) => {
    const body = cleanAnalysisText(normalizeAnalysisList(value).join("；"));
    if (body && !blocks.some((item) => item.title === title)) {
      blocks.push({ title, body });
    }
  });

  fallback.annotations.forEach((item) => {
    if (blocks.length < 4) blocks.push(item);
  });

  const terms = [
    ...normalizeAnalysisList(parsed.terms),
    ...normalizeAnalysisList(parsed.keyTerms),
    ...normalizeAnalysisList(parsed.mockupTerms),
    ...normalizeAnalysisList(components.map((item) => item.name)),
    ...normalizeAnalysisList(layoutRegions.map((item) => item.name))
  ].map(cleanAnalysisText).filter(Boolean);

  return {
    layoutType: normalizeVisualLayoutType(parsed.layoutType || parsed.pageLayout || parsed.structureType || fallback.layoutType || inferVisualLayoutType(screen), screen),
    goal: cleanAnalysisText(parsed.goal || parsed.pageGoal || parsed.objective || fallback.goal || screen.goal || ""),
    closeBehavior: cleanAnalysisText(parsed.closeBehavior || parsed.closeMode || parsed.returnBehavior || fallback.closeBehavior || getScreenCloseBehavior(screen)),
    annotations: blocks.slice(0, 4).map((item) => ({
      title: cleanAnalysisText(item.title).slice(0, 12),
      body: cleanAnalysisText(item.body)
    })),
    layoutRegions,
    components,
    primaryAction,
    forbiddenComponents,
    states,
    flows,
    handoffNotes,
    fieldIds,
    terms: [...new Set([...terms, ...(fallback.terms || [])])].slice(0, 10)
  };
}

function parseJsonObjectFromText(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;

  const unwrapped = raw
    .replace(/^\uFEFF/, "")
    .replace(/```(?:json|JSON)?/g, "")
    .replace(/```/g, "")
    .trim();

  const candidates = [
    unwrapped,
    extractFirstBalancedJsonObject(unwrapped)
  ].filter(Boolean);

  for (const candidate of candidates) {
    const parsed = tryParseJsonObjectCandidate(candidate);
    if (parsed) return parsed;
  }

  return null;
}

function tryParseJsonObjectCandidate(candidate) {
  const source = String(candidate || "").trim();
  if (!source) return null;
  const variants = [
    source,
    source.replace(/,\s*([}\]])/g, "$1")
  ];
  for (const variant of variants) {
    try {
      const parsed = JSON.parse(variant);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch (error) {
      // Try the next tolerant variant.
    }
  }
  return null;
}

function extractFirstBalancedJsonObject(text) {
  const source = String(text || "");
  for (let start = 0; start < source.length; start += 1) {
    if (source[start] !== "{") continue;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < source.length; index += 1) {
      const char = source[index];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === "\"") {
          inString = false;
        }
        continue;
      }
      if (char === "\"") {
        inString = true;
      } else if (char === "{") {
        depth += 1;
      } else if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          return source.slice(start, index + 1);
        }
      }
    }
  }
  return "";
}

function getTextExcerpt(text, limit = 220) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  return normalized.length > limit ? `${normalized.slice(0, limit)}...` : normalized;
}

function normalizeAnalysisList(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => (typeof item === "object" ? Object.values(item) : item))
      .flatMap(normalizeAnalysisList);
  }
  if (typeof value === "object") {
    return Object.values(value).flatMap(normalizeAnalysisList);
  }
  return String(value)
    .split(/\n|；|;|、/)
    .map(cleanAnalysisText)
    .filter(Boolean);
}

function normalizeStyleExtrapolationRules(value) {
  const source = Array.isArray(value) ? value : value ? [value] : [];
  return source.map((item) => {
    if (item && typeof item === "object") {
      const target = cleanAnalysisText(item.target || item.component || item.componentType || item.type || item.name || item.label || "");
      const directEvidence = cleanAnalysisText(item.directEvidence || item.referenceEvidence || item.evidence || item.observedEvidence || item.visualEvidence || item.reason || "");
      const extrapolationRule = cleanAnalysisText(item.extrapolationRule || item.rule || item.transferRule || item.transferableRule || item.styleRule || item.method || "");
      return { target, directEvidence, extrapolationRule };
    }
    return {
      target: cleanAnalysisText(item),
      directEvidence: "",
      extrapolationRule: ""
    };
  }).filter((item) => item.target || item.directEvidence || item.extrapolationRule);
}

function normalizeVisualObjectList(value) {
  if (!value) return [];
  const source = Array.isArray(value) ? value : normalizeAnalysisList(value);
  return source.map((item) => {
    if (typeof item === "object" && item) {
      const name = cleanAnalysisText(item.name || item.title || item.label || item.region || item.component || "");
      const role = cleanAnalysisText(item.role || item.description || item.purpose || item.body || item.content || "");
      const type = cleanAnalysisText(item.type || item.kind || item.category || "");
      const state = cleanAnalysisText(item.state || item.status || "");
      const slot = cleanAnalysisText(item.slot || item.position || item.area || item.layoutSlot || "");
      const priority = cleanAnalysisText(item.priority || item.level || item.importance || "");
      const belongsTo = cleanAnalysisText(item.belongsTo || item.region || item.parent || item.group || "");
      const anchor = cleanAnalysisText(item.anchor || item.placement || item.align || "");
      const elements = normalizeAnalysisList(item.elements || item.children || item.items || item.fields || item.controls);
      const states = normalizeAnalysisList(item.states || item.stateList || item.variants);
      return { name, role, type, state, slot, priority, belongsTo, anchor, elements, states };
    }
    return { name: cleanAnalysisText(item), role: "", type: "", state: "", slot: "", priority: "", belongsTo: "", anchor: "", elements: [], states: [] };
  }).filter((item) => item.name || item.role || item.elements.length);
}

function cleanAnalysisText(value) {
  return cleanMarkdownText(String(value || ""))
    .replace(/[{}[\]"']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getKeywords(text) {
  const rules = [
    ["BOSS", "BOSS"],
    ["剧情", "剧情"],
    ["冒险", "冒险"],
    ["战斗", "战斗"],
    ["关卡", "关卡"],
    ["排行榜", "排行榜"],
    ["设置", "设置"],
    ["抽卡", "抽卡"],
    ["角色", "角色"],
    ["装备", "装备"],
    ["地图", "地图"],
    ["解谜", "解谜"],
    ["竞技", "竞技"],
    ["养成", "养成"],
    ["宠物", "宠物"],
    ["收集", "收集"],
    ["任务", "任务"],
    ["商店", "商店"],
    ["幻想", "幻想"],
    ["治愈", "治愈"],
    ["休闲", "休闲"],
    ["经营", "经营"],
    ["好友", "社交"],
    ["皮肤", "换装"],
    ["装饰", "家园装饰"]
  ];
  const found = rules.filter(([needle]) => text.includes(needle)).map(([, label]) => label);
  return found.length ? [...new Set(found)].slice(0, 8) : ["休闲", "成长", "轻量系统"];
}

function getGenreReferenceProfile(brief) {
  const normalized = normalizeBriefForScreenDetect(brief);
  const scored = genreReferenceProfiles
    .map((profile) => ({
      profile,
      score: getGenreProfileScore(profile, normalized)
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.profile || genreReferenceProfiles.find((profile) => profile.id === "casual");
}

function getGenreProfileScore(profile, normalizedBrief) {
  const weights = {
    ai_narrative: {
      ai: 5,
      aigc: 5,
      ugc: 5,
      编剧: 5,
      剧本: 5,
      dm: 5,
      跑团: 5,
      trpg: 5,
      世界观: 4,
      世界构建: 4,
      创作: 4,
      创造: 3,
      宇宙: 3,
      叙事: 4,
      故事生成: 5,
      角色设定: 4,
      互动小说: 5
    },
    moba: {
      moba: 6,
      "5v5": 6,
      英雄对战: 5,
      推塔: 5,
      排位: 4,
      竞技: 1
    },
    rpg: {
      rpg: 5,
      角色扮演: 5,
      冒险: 2,
      剧情: 1,
      boss: 2,
      装备: 2,
      技能: 1,
      副本: 3,
      世界: 1
    },
    party: {
      派对: 5,
      多人: 3,
      房间: 2,
      匹配: 2,
      好友: 1,
      社交: 1,
      竞技场: 3,
      排行: 1
    },
    narrative: {
      剧情: 3,
      分支: 4,
      对话: 4,
      故事: 3,
      隐藏剧情: 4,
      选择: 2,
      文本冒险: 5
    }
  };

  const profileWeights = weights[profile.id] || {};
  return profile.keywords.reduce((score, keyword) => {
    const key = normalizeBriefForScreenDetect(keyword);
    if (!key || !normalizedBrief.includes(key)) return score;
    return score + (profileWeights[keyword] || profileWeights[key] || 2);
  }, 0);
}

function buildGenreReferenceSection(genreProfile) {
  return `### 1.4 同类游戏参考方向

- 类型判断：${genreProfile.label}
- 参考对象：${genreProfile.examples}
- 借鉴重点：${genreProfile.principles.join("；")}。
- 使用原则：这里只借鉴成熟同类游戏的信息架构、交互层级和状态反馈，不照搬具体美术资源。`;
}

function buildReferenceItems(brief, selectedScreens, genreProfile) {
  const projectName = gameName.value.trim() || detectGameName(brief) || "小游戏";
  if (genreProfile.id === "ai_narrative") {
    return buildAiNarrativeReferenceItems(projectName, brief, selectedScreens, genreProfile);
  }

  const items = [
    {
      title: `${genreProfile.label} 参考方向`,
      body: `${genreProfile.examples} 借鉴重点：${genreProfile.principles.slice(0, 2).join("；")}。`,
      query: `${genreProfile.label} 游戏 UI 参考 interface`
    }
  ];

  selectedScreens.slice(0, 5).forEach((screen) => {
    items.push({
      title: `${screen.name} 参考`,
      body: getScreenReferenceText(screen, genreProfile).slice(0, 120),
      query: `${genreProfile.label} ${screen.name} 游戏 UI 交互设计 参考`
    });
  });

  items.push({
    title: "本项目风格校准",
    body: `围绕《${projectName}》策划案，只参考同类游戏的信息架构、操作层级、状态反馈和交付标注，不直接套用画面。`,
    query: `${projectName} 游戏 UI moodboard wireframe`
  });

  return items.map((item) => ({
    ...item,
    url: `https://www.bing.com/images/search?q=${encodeURIComponent(item.query)}`
  }));
}

function buildAiNarrativeReferenceItems(projectName, brief, selectedScreens, genreProfile) {
  const hasLeaderboard = selectedScreens.some((screen) => screen.kind === "leaderboard");
  const hasRoom = selectedScreens.some((screen) => screen.kind === "room" || screen.kind === "social");
  const hasBoss = selectedScreens.some((screen) => screen.kind === "boss");
  const baseItems = [
    {
      title: "AI叙事 / UGC创作 参考方向",
      body: `${genreProfile.examples} 借鉴重点：${genreProfile.principles.slice(0, 2).join("；")}。`,
      query: "AI Dungeon interactive fiction editor UI worldbuilding story generator"
    },
    {
      title: "创作工作台参考",
      body: "主界面应优先承载项目入口、继续创作、最近剧本、生成状态和下一步建议，而不是战斗 HUD 或竞技按钮。",
      query: "story writing dashboard UI AI writing workspace"
    },
    {
      title: "世界观管理参考",
      body: "世界观、阵营、地点、规则、时间线和关键设定需要以资料库方式组织，支持快速检索、编辑和版本回溯。",
      query: "worldbuilding database UI lore management"
    },
    {
      title: "剧情编排参考",
      body: "剧情线适合用节点、章节、分支选择和条件触发来表达，重点是分支关系、关键选择和后果反馈。",
      query: "branching narrative editor UI dialogue tree"
    },
    {
      title: "角色 / DM 对话参考",
      body: "角色卡、性格标签、记忆、当前目标和 DM 旁白要同时可见；AI 回复需要支持重试、编辑、采纳和锁定。",
      query: "AI roleplay chat UI character card dungeon master"
    }
  ];

  if (hasBoss) {
    baseItems.push({
      title: "剧情事件 / 强敌节点参考",
      body: "如果有 BOSS 或关键事件，应更像剧情节点管理：展示触发条件、机制说明、剧情影响和完成后的世界状态变化。",
      query: "narrative event boss encounter planning UI"
    });
  }

  if (hasRoom) {
    baseItems.push({
      title: "多人共创房间参考",
      body: "多人或好友功能应围绕协作创作：席位、权限、在线状态、当前章节、评论和共同编辑冲突提示。",
      query: "collaborative writing room UI multiplayer storytelling"
    });
  }

  if (hasLeaderboard) {
    baseItems.push({
      title: "作品展示 / 社区榜单参考",
      body: "排行榜不应按竞技战绩设计，更适合做作品热度、收藏、续写次数、评分和编辑精选的社区展示。",
      query: "community story ranking UI creator platform"
    });
  }

  baseItems.push({
    title: "本项目风格校准",
    body: `围绕《${projectName}》策划案，参考重点放在创作流程、世界观资料、剧情分支、AI 生成反馈和作品发布闭环，不套用 MOBA/战斗类 HUD。`,
    query: `${projectName} AI storytelling UX wireframe`
  });

  return baseItems.slice(0, 7).map((item) => ({
    ...item,
    url: `https://www.bing.com/images/search?q=${encodeURIComponent(item.query)}`
  }));
}

function buildFullPlan({ brief, selectedScreens, keywords, genreProfile, platform, depth, tone, extraNeeds }) {
  const platformText = getPlatformText(platform);
  const screensText = selectedScreens.map((screen, index) => buildScreenSection(screen, index + 1, depth, genreProfile)).join("\n\n");
  const flowText = buildFlowSection(selectedScreens);
  const stateText = buildStateSection(selectedScreens);
  const handoffText = buildHandoffSection(selectedScreens, platformText);

  return `# ${state.gameName} 专业交互设计方案

## 1. 项目理解

### 1.1 项目定位

${state.gameName} 是一款以 ${keywords.join("、")} 为核心关键词的小游戏。界面设计需要优先服务玩家的核心循环，让玩家能快速理解当前目标、执行关键操作，并在操作后获得明确反馈。

### 1.2 设计目标

- 降低首次使用门槛，让主操作一眼可见。
- 强化状态反馈，让玩家知道现在该做什么。
- 建立短期任务和长期收集目标，支撑持续游玩。
- 保持界面结构清晰，方便 UI、策划和程序协作落地。

### 1.3 输出规格

- 目标平台：${platformText}
- 输出深度：${getDepthText(depth)}
- 表达语气：${getToneText(tone)}
- 补充要求：${extraNeeds || "暂无额外要求"}

${buildGenreReferenceSection(genreProfile)}

## 2. 信息架构

### 2.1 一级模块

${selectedScreens.map((screen) => `- ${screen.name}：${screen.goal}${getScreenCloseBehavior(screen) ? `（关闭方式：${getScreenCloseBehavior(screen)}）` : ""}`).join("\n")}

### 2.2 核心页面关系

${buildPageRelationText(selectedScreens)}

## 3. 核心交互循环

${flowText}

## 4. 主要界面设计说明

${screensText}

## 5. 状态与反馈规范

${stateText}

## 6. 交付与实现建议

${handoffText}

## 7. 策划案摘要记录

${brief.slice(0, 1600)}
`;
}

function buildPageRelationText(selectedScreens) {
  if (!selectedScreens.length) {
    return "策划案中暂未识别到明确界面列表。建议补充“关键界面列表”“核心系统”或“页面输出”，便于继续拆分 UI 结构。";
  }

  const main = selectedScreens.find((screen) => screen.kind === "main") || selectedScreens[0];
  const rest = selectedScreens.filter((screen) => screen.id !== main.id).map((screen) => screen.name);
  const closeRules = selectedScreens
    .map((screen) => getScreenCloseBehavior(screen) ? `${screen.name}：${getScreenCloseBehavior(screen)}` : "")
    .filter(Boolean)
    .join("；");
  return `${main.name} 作为当前方案的主要入口，负责承接玩家进入后的第一目标和核心状态。${rest.length ? `其余页面包括 ${rest.join("、")}，需要通过策划案中的关闭方式、跳转、弹窗和状态反馈规则形成闭环。` : "如果后续策划补充更多系统页，可继续扩展为多页面结构。"}${closeRules ? `页面关闭/返回关系：${closeRules}。` : ""}同类页面建议复用 TopBar、Tab、Card、Panel、Button、Toast 等基础组件。`;
}

const INTERACTION_PLAN_FIELD_HEADINGS = [
  "页面目标",
  "入口来源",
  "布局结构",
  "界面结构",
  "关键交互",
  "交互要点",
  "状态反馈",
  "状态说明",
  "状态与异常",
  "异常状态",
  "按钮层级",
  "关闭/返回方式",
  "关闭方式",
  "返回方式",
  "关闭/返回控件",
  "关闭控件",
  "返回控件",
  "Figma 交付建议",
  "交付建议",
  "程序关注点"
];

function ensureInteractionPlanCloseBehaviorSections(markdown = "", targetScreens = []) {
  const source = String(markdown || "").replace(/\r/g, "");
  const targets = (Array.isArray(targetScreens) ? targetScreens : [])
    .filter((screen) => screen && getScreenCloseBehavior(screen));
  if (!source.trim() || !targets.length) return source;

  let lines = source.split("\n");
  targets.forEach((screen) => {
    const range = findInteractionPlanScreenSectionRange(lines, screen, targets);
    if (!range) return;

    const bodyLines = lines.slice(range.start + 1, range.end);
    const sectionLines = buildInteractionPlanCloseBehaviorSection(screen);
    if (!sectionLines.length) return;

    const existing = findInteractionCloseBehaviorSectionRange(bodyLines);
    if (existing) {
      const existingBody = bodyLines.slice(existing.start + 1, existing.end).join("\n");
      if (hasCompleteInteractionCloseBehaviorSection(existingBody)) return;
      bodyLines.splice(existing.start, existing.end - existing.start, ...sectionLines);
    } else {
      const insertIndex = findInteractionCloseBehaviorInsertIndex(bodyLines);
      const prefix = insertIndex > 0 && bodyLines[insertIndex - 1]?.trim() ? [""] : [];
      const suffix = insertIndex < bodyLines.length && bodyLines[insertIndex]?.trim() ? [""] : [];
      bodyLines.splice(insertIndex, 0, ...prefix, ...sectionLines, ...suffix);
    }

    lines.splice(range.start + 1, range.end - range.start - 1, ...bodyLines);
  });

  return lines.join("\n").trim();
}

function findInteractionPlanScreenSectionRange(lines = [], screen = {}, targetScreens = []) {
  const aliases = getScreenAliases(screen);
  const candidates = [];
  lines.forEach((line, index) => {
    const text = String(line || "");
    if (text.includes("|") || !isPotentialScreenSectionHeading(text)) return;
    const score = scoreScreenSectionHeading(text, screen, aliases);
    if (score < 6) return;
    candidates.push({
      index,
      score,
      level: getMarkdownHeadingLevel(text)
    });
  });
  if (!candidates.length) return null;

  candidates.sort((left, right) => right.score - left.score || left.index - right.index);
  const best = candidates[0];
  let end = lines.length;
  if (best.level) {
    for (let index = best.index + 1; index < lines.length; index += 1) {
      const level = getMarkdownHeadingLevel(lines[index]);
      if (level && level <= best.level) {
        end = index;
        break;
      }
    }
  } else {
    for (let index = best.index + 1; index < lines.length; index += 1) {
      if (targetScreens.some((item) => item !== screen && isScreenHeadingLine(lines[index], getScreenAliases(item)))) {
        end = index;
        break;
      }
    }
  }

  return { start: best.index, end };
}

function buildInteractionPlanCloseBehaviorSection(screen = {}) {
  const closeBehavior = getScreenCloseBehavior(screen);
  if (!closeBehavior) return [];
  const noNavigation = isNoNavigationCloseBehavior(closeBehavior);
  const componentTypes = getCloseBehaviorComponentTypes(closeBehavior);
  const componentLabels = componentTypes
    .map((type) => getUiComponentTypeMeta(type)?.label || type)
    .filter(Boolean);
  const controlText = noNavigation
    ? "不显示返回按钮、关闭按钮、主页按钮；不得因通用模板额外补导航控件。"
    : componentLabels.length
      ? `显示${componentLabels.join("、")}；只允许这些关闭/返回控件参与该页面退出逻辑。`
      : "不新增通用返回、关闭或主页按钮；只通过交互流程中明确的跳转动作离开当前界面。";

  return [
    "#### 关闭/返回方式",
    "",
    `- 关闭方式：${closeBehavior}`,
    `- 关闭/返回控件：${controlText}`,
    `- 触发条件：${getInteractionCloseTriggerText(closeBehavior, componentLabels)}`,
    `- 返回目标：${getInteractionCloseTargetText(closeBehavior)}`,
    `- 异常处理：${getInteractionCloseExceptionText(closeBehavior)}`
  ];
}

function getInteractionCloseTriggerText(closeBehavior = "", componentLabels = []) {
  if (isNoNavigationCloseBehavior(closeBehavior)) {
    return "无关闭/返回触发；该界面作为默认根界面或常驻界面停留。";
  }
  if (componentLabels.length) {
    return `玩家点击${componentLabels.join("或")}，或触发平台系统返回时，按关闭方式执行。`;
  }
  return "玩家完成当前流程或点击交互案明确的流程按钮后，按关闭方式执行。";
}

function getInteractionCloseTargetText(closeBehavior = "") {
  const text = String(closeBehavior || "").trim();
  if (isNoNavigationCloseBehavior(text)) return "无跳转目标；停留在当前界面。";
  if (/下一关|下一流程|下一步/i.test(text) && /主界面|首页|主页|大厅/i.test(text)) {
    return "返回主界面，或在结算/流程完成状态下进入下一关/下一流程。";
  }
  if (/来源界面|来源页|来源栈/i.test(text)) return "返回来源界面；来源栈为空时回到主界面。";
  if (/上一层|上一页/i.test(text)) return "返回上一层/上一页。";
  if (/主界面|首页|主页|大厅/i.test(text)) return "返回主界面。";
  if (/关闭|弹窗|浮层/i.test(text)) return "关闭当前层后返回来源界面。";
  if (/返回|回到|退回/i.test(text)) return `按“${text}”指定目标返回。`;
  return `按“${text}”指定目标执行。`;
}

function getInteractionCloseExceptionText(closeBehavior = "") {
  const text = String(closeBehavior || "").trim();
  if (isNoNavigationCloseBehavior(text)) {
    return "如果系统返回键触发，保持当前根界面，不展示额外关闭控件。";
  }
  if (/来源界面|来源页|来源栈/i.test(text)) {
    return "来源栈缺失时回到主界面；存在未保存设置、购买确认、权限申请或进行中操作时先二次确认。";
  }
  if (/下一关|下一流程|结算|结果/i.test(text)) {
    return "奖励未领取、动画未完成或网络提交中时禁用关闭/返回控件，完成后再允许跳转。";
  }
  return "存在未保存设置、购买确认、资源提交中或动画播放中状态时先拦截并提示，确认后再返回。";
}

function findInteractionCloseBehaviorSectionRange(bodyLines = []) {
  return findInteractionSubsectionRange(bodyLines, ["关闭/返回方式", "关闭方式", "返回方式", "关闭/返回控件", "关闭控件", "返回控件"]);
}

function findInteractionCloseBehaviorInsertIndex(bodyLines = []) {
  const preferred = [
    ["按钮层级"],
    ["异常状态"],
    ["状态反馈", "状态说明", "状态与异常"]
  ];
  for (const headings of preferred) {
    const range = findInteractionSubsectionRange(bodyLines, headings);
    if (range) return range.end;
  }
  return bodyLines.length;
}

function findInteractionSubsectionRange(bodyLines = [], headings = []) {
  for (let index = 0; index < bodyLines.length; index += 1) {
    if (!matchesInteractionSubsectionHeading(bodyLines[index], headings)) continue;
    const level = getMarkdownHeadingLevel(bodyLines[index]);
    let end = bodyLines.length;
    for (let next = index + 1; next < bodyLines.length; next += 1) {
      const nextLevel = getMarkdownHeadingLevel(bodyLines[next]);
      if (level && nextLevel && nextLevel <= level) {
        end = next;
        break;
      }
      if (!level && isInteractionPlanFieldHeadingLine(bodyLines[next])) {
        end = next;
        break;
      }
    }
    return { start: index, end };
  }
  return null;
}

function matchesInteractionSubsectionHeading(line = "", headings = []) {
  const title = getInteractionSubsectionHeadingTitle(line);
  if (!title) return false;
  const normalizedTitle = normalizeLabel(title);
  return headings.some((heading) => normalizedTitle.includes(normalizeLabel(heading)));
}

function getInteractionSubsectionHeadingTitle(line = "") {
  const trimmed = String(line || "").trim();
  if (!trimmed || trimmed.includes("|")) return "";
  const markdown = trimmed.match(/^#{3,6}\s*(.+)$/);
  if (markdown) return cleanMarkdownText(markdown[1]);
  const plain = matchPlainFieldHeading(trimmed, INTERACTION_PLAN_FIELD_HEADINGS);
  return plain ? cleanMarkdownText(trimmed.replace(/[：:].*$/, "")) : "";
}

function isInteractionPlanFieldHeadingLine(line = "") {
  return Boolean(getInteractionSubsectionHeadingTitle(line));
}

function hasCompleteInteractionCloseBehaviorSection(text = "") {
  const clean = cleanMarkdownText(text);
  if (!clean) return false;
  const hasControl = /控件|按钮|不显示|不绘制|无显性|返回按钮|关闭按钮|主页按钮/i.test(clean);
  const hasTrigger = /触发|点击|单击|按下|操作|无关闭\/返回触发/i.test(clean);
  const hasTarget = /返回目标|目标界面|返回主界面|来源界面|上一层|上一页|下一关|下一流程|停留/i.test(clean);
  const hasException = /异常|禁用|拦截|未保存|二次确认|来源栈|无来源|不响应|系统返回键/i.test(clean);
  return hasControl && hasTrigger && hasTarget && hasException;
}

function getPlatformText(platform) {
  const map = {
    landscape: "界面：横版（16:9），建议基准画板 1920 × 1080",
    portrait: "界面：竖版（9:16），建议基准画板 1080 × 1920",
    pc: "PC 横屏 16:9，建议基准画板 1920 × 1080",
    mobile: "移动端竖屏，建议基准画板 1080 × 1920",
    responsive: "多端适配，建议同时准备横屏与竖屏布局"
  };
  return map[platform] || map.landscape;
}

function getDesignCanvasSpec(platform = $("#platform")?.value) {
  const value = String(platform || "landscape");
  const portrait = value === "portrait" || value === "mobile" || value.includes("9:16") || value.includes("竖");
  return portrait
    ? {
        orientation: "portrait",
        aspectRatio: "9:16",
        figmaSize: "1080x1920",
        generationSize: "1008x1792",
        size: "1008x1792",
        promptText: "竖版 9:16，Figma基准 1080 × 1920，实际生图 1008 × 1792"
      }
    : {
        orientation: "landscape",
        aspectRatio: "16:9",
        figmaSize: "1920x1080",
        generationSize: "1792x1008",
        size: "1792x1008",
        promptText: "横版 16:9，Figma基准 1920 × 1080，实际生图 1792 × 1008"
      };
}

function getDepthText(depth) {
  const map = {
    standard: "标准方案，适合快速评审和继续画线框",
    detailed: "详细评审稿，包含更完整的状态、流程和组件说明",
    handoff: "程序交付版，强调控件命名、状态枚举和实现边界"
  };
  return map[depth] || map.standard;
}

function getToneText(tone) {
  const map = {
    professional: "专业评审风格",
    teaching: "教学讲解风格",
    handoff: "开发交付风格"
  };
  return map[tone] || map.professional;
}

function buildFlowSection(selectedScreens) {
  const names = selectedScreens.map((screen) => screen.name);
  const hasShop = selectedScreens.some((screen) => screen.kind === "shop");
  const hasTasks = selectedScreens.some((screen) => screen.kind === "task");
  const hasCollection = selectedScreens.some((screen) => screen.kind === "collection");
  const hasGameplay = selectedScreens.some((screen) => screen.kind === "gameplay" || screen.kind === "level");

  if (!selectedScreens.length) {
    return "暂未从策划案中识别到明确目标界面。建议在策划案中补充“关键界面列表”或“核心系统”字段。";
  }

  return `进入游戏 → 到达${names[0]} → 查看当前目标与资源状态${hasGameplay ? " → 进入核心玩法并获得结果反馈" : " → 执行页面核心操作"}${hasShop ? " → 使用资源购买或兑换内容" : ""}${hasTasks ? " → 完成目标并领取奖励" : ""}${hasCollection ? " → 推进收集或图鉴进度" : ""} → 回到主流程继续下一轮操作。`;
}

function buildScreenSection(screen, index, depth, genreProfile = getGenreReferenceProfile(getPlanningDocument())) {
  const data = getScreenProfile(screen.kind);
  const referenceText = getScreenReferenceText(screen, genreProfile);
  const closeBehavior = formatScreenCloseBehaviorForPrompt(screen, "策划案未明确；需根据入口来源、页面层级和主流程补充关闭/返回目标，不能默认套用通用返回按钮。");
  const closeComponentTypes = getCloseBehaviorComponentTypes(closeBehavior);
  const closeControlText = isNoNavigationCloseBehavior(closeBehavior)
    ? "不绘制返回、关闭或主页控件；通过主流程状态自然停留或跳转。"
    : closeComponentTypes.length
      ? `需要控件：${closeComponentTypes.map((type) => getUiComponentTypeMeta(type)?.label || type).join("、")}；触发后按关闭方式返回或跳转。`
      : "关闭/返回可能由流程跳转完成；若需要显性控件，必须在交互案中写明触发条件和目标界面。";

  const extra = depth === "detailed" || depth === "handoff"
    ? `\n\n#### 程序关注点\n\n- 需要明确控件 ID、按钮状态和跳转目标。\n- 关闭/返回控件必须绑定具体目标界面或来源栈，不能只写 close/back。\n- 所有可领取、可购买、可使用状态建议由数据字段驱动。\n- 弹窗和详情区尽量复用同一套组件。`
    : "";

  return `### 4.${index} ${screen.name}

#### 页面目标

${screen.goal}

#### 布局结构

${data.layout}

#### 关键交互

${data.interaction}

#### 同类游戏参考

${referenceText}

#### 状态反馈

${data.state}

#### 关闭/返回方式

${closeBehavior}

${closeControlText}${extra}`;
}

function getScreenReferenceText(screen, genreProfile) {
  const profile = getScreenProfile(screen.kind);
  if (genreProfile.id === "ai_narrative") {
    const aiSpecific = {
      main: "主界面建议参考 AI 创作工作台：继续创作、最近项目、世界观状态、AI 生成队列和下一步建议优先展示。",
      gameplay: "核心玩法界面建议参考互动叙事体验：输入框、当前场景、角色状态、AI 回复、重试/采纳/编辑和历史记录需要形成闭环。",
      story: "剧情界面建议参考互动小说和对白树编辑器：章节节点、分支选择、触发条件、回看日志和关键后果要清楚。",
      boss: "BOSS 或强敌更适合作为剧情事件节点：重点展示触发条件、剧情影响、机制设定和完成后的世界状态变化。",
      leaderboard: "排行榜应更像作品社区榜：展示作品热度、收藏、评分、续写次数和编辑精选，而不是竞技段位。",
      social: "社交界面应围绕共创协作：成员权限、评论、共同编辑状态、邀请链接和版本冲突提示要直接可见。",
      room: "房间界面应参考多人共创空间：席位、当前章节、DM 权限、协作状态和开始共创按钮是核心。",
      task: "任务界面可转为创作目标：完善世界观、创建角色、生成剧情节点、发布作品和获得反馈。",
      collection: "图鉴界面可转为资料库：角色、地点、阵营、物品、事件和规则条目需要可检索、可关联。",
      settings: "设置界面应包含模型偏好、内容安全、生成强度、记忆开关、导出格式和隐私权限。"
    };
    return `${aiSpecific[screen.kind] || "该页面应围绕 AI 叙事创作流程设计，优先服务创作、编辑、生成反馈和版本管理。"} 重点借鉴：${genreProfile.principles.slice(0, 2).join("；")}。`;
  }

  const specific = {
    main: "主界面建议参考同类游戏的大厅/主城/首页：顶部资源常驻，中部承载当前目标，底部或侧边承载系统入口，并通过红点或气泡提示下一步。",
    gameplay: "核心玩法界面建议参考同类游戏的战斗/对局 HUD：把操作按钮、战况信息、目标进度和暂停入口分层，优先保证操作稳定和反馈即时。",
    level: "关卡界面建议参考同类游戏的章节地图或节点路径：用解锁线、星级、奖励预览和推荐条件帮助玩家判断下一关。",
    character: "角色界面建议参考 RPG/卡牌游戏的角色养成页：形象、属性、技能、装备和材料缺口围绕同一对象组织。",
    inventory: "背包界面建议参考 RPG/经营游戏的资产管理页：分类页签、道具网格、详情区和使用/来源操作形成闭环。",
    shop: "商店界面建议参考同类游戏商城：分类、推荐、限购、折扣、资源不足和购买确认需要清楚区分。",
    task: "任务界面建议参考休闲/养成/竞技游戏任务页：每日目标、成就目标、活跃度和奖励领取形成短期驱动。",
    collection: "图鉴界面建议参考收集类游戏：总进度、未解锁条件、详情预览和奖励回收共同支撑长期目标。",
    social: "社交界面建议参考多人游戏好友/房间页：在线状态、邀请、拜访、聊天和奖励提醒需要直接可见。",
    boss: "BOSS/强敌界面建议参考动作 RPG 或塔防强敌关：展示弱点、阶段机制、推荐配置、剧情节点和失败后的强化路径。",
    story: "剧情界面建议参考叙事冒险/视觉小说：对白框、分支选择、自动/跳过/回看日志需要兼顾沉浸和效率。",
    leaderboard: "排行榜界面建议参考竞技/派对游戏：个人排名、好友对比、赛季时间和奖励区间要常驻。",
    settings: "设置界面建议参考主流手游/PC 游戏设置：分类导航、开关/滑杆即时反馈、危险操作隔离。",
    result: "结算界面建议参考关卡/战斗游戏：胜负、评分、奖励、成长变化和下一步行动按优先级展示。",
    event: "活动界面建议参考运营活动中心：限时、进度、奖励、规则和参与入口需要一屏闭环。",
    gacha: "抽卡界面建议参考卡牌/RPG 招募页：卡池主视觉、消耗、概率、保底和结果反馈必须清楚。",
    room: "房间界面建议参考多人派对/竞技游戏：席位、准备状态、邀请路径和匹配反馈要强可见。",
    base: "基地/经营界面建议参考模拟经营游戏：场景状态、资源收取、建造队列和装饰编辑模式要区分。"
  };

  return `${specific[screen.kind] || profile.annotations[0]?.body || profile.goal} 同时结合本项目的 ${genreProfile.label} 定位，重点借鉴：${genreProfile.principles.slice(0, 2).join("；")}。`;
}

function buildStateSection(selectedScreens) {
  const screenNames = selectedScreens.map((screen) => screen.name).join("、") || "暂未识别到明确页面";
  return `适用页面：${screenNames}

- 默认态：界面正常展示，无强提示。
- 高亮态：出现需求、可领取、推荐购买、当前选中时触发。
- 禁用态：资源不足、条件未达成、当前对象不可用时触发。
- 完成态：操作成功、奖励领取、挑战通过、购买成功、配置保存后触发。
- 空状态：无内容、未解锁、无搜索结果、暂无好友/队伍/商品/任务时出现，需要给出下一步引导。
- 错误态：网络失败、资源不足、条件不满足、同步失败时出现，优先轻提示，避免打断当前操作。`;
}

function buildHandoffSection(selectedScreens, platformText) {
  return `### 6.1 Figma 交付建议

- 基准规格：${platformText}
- 页面输出：${selectedScreens.map((screen) => screen.name).join("、")}
- 组件拆分：TopBar、Button、Tab、Card、Panel、Progress、Badge、Toast。
- 标注内容：页面目标、入口来源、出口跳转、按钮状态、空状态、异常状态。

### 6.2 程序字段建议

- screen_id：页面标识。
- component_id：组件标识。
- state：default / active / disabled / completed / empty / error。
- action_type：navigate / open_modal / claim / purchase / use_item。
- target：跳转页面或弹层名称。

### 6.3 验收标准

- 玩家能在 3 秒内识别当前最重要操作。
- 主流程不超过 2 次点击进入关键行为。
- 可领取、可购买、可使用状态清晰可辨。
- 页面结构在同类系统中保持一致。`;
}

function renderPlanTab() {
  const sourcePlan = state.fullPlan || state.plan;
  if (!sourcePlan) return;
  const selectedScreens = getSelectedScreens();
  const genreProfile = getGenreReferenceProfile(getPlanningDocument());
  const chunks = {
    overview: sourcePlan,
    screens: selectedScreens.map((screen, index) => buildScreenSection(screen, index + 1, getSelectedDepth(), genreProfile)).join("\n\n"),
    flows: `# 流程与状态\n\n## 核心流程\n\n${buildFlowSection(selectedScreens)}\n\n## 状态规范\n\n${buildStateSection(selectedScreens)}`,
    handoff: `# 交付清单\n\n${buildHandoffSection(selectedScreens, getPlatformText($("#platform").value))}`
  };
  planOutput.value = chunks[state.activeTab] || state.plan;
  renderMarkdownDocument("plan");
}

function exportPlan() {
  const content = planOutput.value.trim() || state.plan || "尚未生成交互设计方案。";
  download(`${state.gameName || "小游戏"}_交互设计方案.md`, content, "text/markdown;charset=utf-8");
}

function exportCombinedDocument() {
  const content = [
    gameDesignOutput.value.trim() ? `# 完整策划案\n\n${gameDesignOutput.value.trim()}` : "",
    planOutput.value.trim() ? `# 交互设计方案\n\n${planOutput.value.trim()}` : ""
  ].filter(Boolean).join("\n\n---\n\n") || state.plan || "尚未生成文档。";
  download(`${state.gameName || "小游戏"}_策划案与交互设计方案.md`, content, "text/markdown;charset=utf-8");
}

async function exportGameDesignPdf() {
  if (cancelRunningButtonTask("exportGameDesignPdf")) return;
  const content = gameDesignOutput.value.trim() || state.gameDesign || "";
  if (!content) {
    $("#briefStatus").textContent = "暂无可下载的完整策划案";
    return;
  }

  setGenerateButtonPending("exportGameDesignPdf", true, "下载 PDF");
  const buttonController = createButtonAbortController("exportGameDesignPdf", "已取消 PDF 下载");
  try {
  await downloadPrintablePdf({
    title: `${state.gameName || gameName.value || "小游戏"}_完整策划案`,
    eyebrow: "GAME DESIGN DOC",
    heading: "完整策划案",
    markdown: content,
    statusSelector: "#briefStatus",
    signal: buttonController.signal
  });
  } finally {
    setGenerateButtonPending("exportGameDesignPdf", false);
  }
}

async function exportInteractionPdf() {
  if (cancelRunningButtonTask("exportPlanPdf")) return;
  syncPlanFromEditor();
  const content = planOutput.value.trim() || state.fullPlan || state.plan || "";
  if (!content) {
    $("#planStatus").textContent = "暂无可下载的交互设计方案";
    return;
  }

  setGenerateButtonPending("exportPlanPdf", true, "下载 PDF");
  const buttonController = createButtonAbortController("exportPlanPdf", "已取消 PDF 下载");
  try {
  await downloadPrintablePdf({
    title: `${state.gameName || gameName.value || "小游戏"}_交互设计方案`,
    eyebrow: "DOCUMENT",
    heading: "交互设计方案",
    markdown: content,
    statusSelector: "#planStatus",
    signal: buttonController.signal
  });
  } finally {
    setGenerateButtonPending("exportPlanPdf", false);
  }
}

async function downloadPrintablePdf({ title, eyebrow, heading, markdown, statusSelector, signal }) {
  const statusElement = statusSelector ? $(statusSelector) : null;
  const filename = `${safeFileName(title)}.pdf`;
  const html = buildPrintableDocumentHtml({ title, eyebrow, heading, markdown });

  if (statusElement) {
    statusElement.textContent = "正在生成 PDF...";
  }

  try {
    throwIfAborted(signal);
    const response = await fetch("/api/export-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename, html }),
      signal
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null);
      throw new Error(errorPayload?.error || `PDF 生成失败：HTTP ${response.status}`);
    }

    const blob = await response.blob();
    if (!blob.size) {
      throw new Error("PDF 生成失败：文件为空。");
    }

    const url = URL.createObjectURL(blob);
    triggerDownload(url, filename);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    if (statusElement) {
      statusElement.textContent = "PDF 已开始下载";
    }
  } catch (error) {
    if (statusElement) {
      statusElement.textContent = isAbortLikeError(error) ? (error.message || "已取消 PDF 下载") : (error.message || "PDF 下载失败");
    }
  }
}

function buildPrintableDocumentHtml({ title, eyebrow, heading, markdown }) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: A4; margin: 16mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #17201d;
      background: #ffffff;
      font-family: "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif;
      font-size: 13px;
      line-height: 1.72;
    }
    .document {
      max-width: 860px;
      margin: 0 auto;
      padding: 8px 0 32px;
    }
    .eyebrow {
      margin: 0 0 8px;
      color: #7a817c;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    h1 {
      margin: 0 0 22px;
      padding-bottom: 14px;
      border-bottom: 1px solid #d3d7d2;
      font-size: 24px;
      line-height: 1.3;
    }
    h2, h3, h4 {
      margin: 22px 0 10px;
      line-height: 1.35;
    }
    p, ul, ol, table {
      margin: 0 0 12px;
    }
    ul, ol {
      padding-left: 1.3em;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      page-break-inside: avoid;
    }
    th, td {
      padding: 9px 10px;
      border: 1px solid #d9ded8;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: #f2f4f1;
      font-weight: 900;
    }
    code {
      padding: 1px 4px;
      background: #f2f4f1;
      border-radius: 4px;
    }
    hr {
      margin: 22px 0;
      border: 0;
      border-top: 1px solid #d3d7d2;
    }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <main class="document">
    <p class="eyebrow">${escapeHtml(eyebrow)}</p>
    <h1>${escapeHtml(heading)}</h1>
    ${renderMarkdownToHtml(markdown)}
  </main>
</body>
</html>`;
}

function exportSvg() {
  setGenerateButtonPending("exportSvg", true, "导出 SVG");
  window.setTimeout(() => setGenerateButtonPending("exportSvg", false), 160);
  const screen = getVisualScreen();
  if (!screen) {
    $("#planStatus").textContent = "未识别到目标界面";
    return;
  }
  const svg = getVisualSvgForScreen(screen);
  if (!svg) {
    $("#planStatus").textContent = "暂无可导出的 SVG，请先生成当前界面的可编辑 SVG";
    return;
  }
  download(`${state.gameName || "小游戏"}_${screen.name}_交互设计方案.svg`, svg, "image/svg+xml;charset=utf-8");
}

async function exportAllDesignDraftZip() {
  if (cancelRunningButtonTask("exportAllDesignDrafts")) return;
  const drafts = Object.entries(state.designDrafts || {}).filter(([, draft]) => draft?.imageUrl);
  if (!drafts.length) {
    $("#designStatus").textContent = "暂无可下载的界面设计稿";
    return;
  }

  setGenerateButtonPending("exportAllDesignDrafts", true, "下载设计稿");
  const buttonController = createButtonAbortController("exportAllDesignDrafts", "已取消设计稿下载");
  const screenMap = new Map(getSelectedScreens().map((screen) => [screen.id, screen]));
  const projectName = safeFileName(state.gameName || gameName.value || "小游戏");
  const entries = [];
  const failures = [];

  $("#designStatus").textContent = `正在打包 ${drafts.length} 张界面设计稿`;

  try {
    for (let index = 0; index < drafts.length; index += 1) {
      throwIfAborted(buttonController.signal);
      const [screenId, draft] = drafts[index];
      const screenName = screenMap.get(screenId)?.name || screenId || `界面${index + 1}`;
      const extension = getImageFileExtension(draft.imageUrl);
      const filename = `${projectName}_${safeFileName(screenName)}_界面视觉设计稿.${extension}`;
      try {
        const blob = await fetchImageBlobForZip(draft.imageUrl, { signal: buttonController.signal });
        entries.push({
          filename,
          data: new Uint8Array(await blob.arrayBuffer())
        });
      } catch (error) {
        if (isAbortLikeError(error)) throw error;
        failures.push(`${screenName}：${error.message || "图片读取失败"}`);
      }
    }

    if (failures.length) {
      $("#designStatus").textContent = `打包失败：${failures.join("；")}`;
      return;
    }

    const zipBlob = createZipBlob(entries);
    const zipUrl = URL.createObjectURL(zipBlob);
    triggerDownload(zipUrl, `${projectName}_界面视觉设计稿.zip`);
    window.setTimeout(() => URL.revokeObjectURL(zipUrl), 1000);
    $("#designStatus").textContent = `已打包 ${entries.length} 张界面设计稿`;
  } catch (error) {
    $("#designStatus").textContent = isAbortLikeError(error) ? (error.message || "已取消设计稿下载") : (error.message || "设计稿打包失败");
  } finally {
    setGenerateButtonPending("exportAllDesignDrafts", false);
  }
}

function exportAllSvg() {
  if (!state.fullPlan && !planOutput.value.trim()) {
    $("#planStatus").textContent = "暂无可导出的 SVG";
    return;
  }

  const selectedScreens = getSelectedScreens();
  if (!selectedScreens.length) {
    $("#planStatus").textContent = "未识别到目标界面";
    return;
  }

  selectedScreens.forEach((screen, index) => {
    const svg = createInterfaceSvg(screen);
    setTimeout(() => {
      download(`${state.gameName || "小游戏"}_${screen.name}_交互设计方案.svg`, svg, "image/svg+xml;charset=utf-8");
    }, index * 180);
  });
}

async function copyPlan() {
  const content = planOutput.value.trim() || state.plan;
  if (!content) return;

  try {
    await navigator.clipboard.writeText(content);
    $("#planStatus").textContent = "方案已复制";
  } catch (error) {
    setDocumentMode("plan", "edit");
    planOutput.focus();
    planOutput.select();
    document.execCommand("copy");
    $("#planStatus").textContent = "已尝试复制方案";
  }
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function downloadRemoteImage(url, filename) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Image download failed: ${response.status}`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    triggerDownload(objectUrl, filename);
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch (error) {
    triggerDownload(url, filename, true);
  }
}

async function fetchImageBlobForZip(url, options = {}) {
  throwIfAborted(options.signal);
  const response = await fetch(url, { cache: "no-store", signal: options.signal });
  if (!response.ok) {
    throw new Error(`图片读取失败：${response.status}`);
  }
  return response.blob();
}

async function fetchPrintablePdfBlob({ title, eyebrow, heading, markdown, signal }) {
  const filename = `${safeFileName(title)}.pdf`;
  const html = buildPrintableDocumentHtml({ title, eyebrow, heading, markdown });
  throwIfAborted(signal);
  const response = await fetch("/api/export-pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, html }),
    signal
  });
  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null);
    throw new Error(errorPayload?.error || `PDF 生成失败：HTTP ${response.status}`);
  }
  return response.blob();
}

async function exportAllResourcesBundle() {
  if (cancelRunningButtonTask("exportAllResources")) return;
  const status = $("#exportAllResourcesStatus");
  const projectTitle = state.gameName || gameName.value.trim() || "小游戏";
  const projectName = safeFileName(projectTitle);
  const entries = [];
  const manifest = {
    projectName: projectTitle,
    exportedAt: new Date().toISOString(),
    files: [],
    missing: [],
    failed: []
  };

  const addTextEntry = (filename, content) => {
    const value = String(content || "").trim();
    if (!value) {
      manifest.missing.push(filename);
      return;
    }
    entries.push({ filename, data: new TextEncoder().encode(value) });
    manifest.files.push(filename);
  };
  const addJsonEntry = (filename, value) => addTextEntry(filename, JSON.stringify(value, null, 2));
  const addBlobEntry = async (filename, blob) => {
    entries.push({ filename, data: new Uint8Array(await blob.arrayBuffer()) });
    manifest.files.push(filename);
  };

  setGenerateButtonPending("exportAllResources", true, "下载项目资源包");
  const buttonController = createButtonAbortController("exportAllResources", "已取消项目资源包下载");
  if (status) status.textContent = "正在收集项目资源...";

  try {
    throwIfAborted(buttonController.signal);
    addTextEntry("00_brief/project_name.txt", projectTitle);
    addTextEntry("00_brief/raw_brief.txt", briefText.value.trim());
    addTextEntry("00_brief/platform.txt", getPlatformText($("#platform")?.value));

    const normalizedRows = readNormalizedOutlineRowsFromTable();
    const normalizedSourceRows = normalizedRows.length ? normalizedRows : (state.normalizedOutlineRows || []);
    addTextEntry("01_normalized_outline/normalized_outline.md", serializeNormalizedOutlineRows(normalizedSourceRows));
    addJsonEntry("01_normalized_outline/normalized_outline.json", normalizedSourceRows);

    const gameDesignMarkdown = gameDesignOutput.value.trim() || state.gameDesign || "";
    addTextEntry("02_game_design/game_design.md", gameDesignMarkdown);
    if (gameDesignMarkdown) {
      try {
        await addBlobEntry("02_game_design/game_design.pdf", await fetchPrintablePdfBlob({
          title: `${projectTitle}_完整策划案`,
          eyebrow: "DOCUMENT",
          heading: "完整策划案",
          markdown: gameDesignMarkdown,
          signal: buttonController.signal
        }));
      } catch (error) {
        if (isAbortLikeError(error)) throw error;
        manifest.failed.push(`02_game_design/game_design.pdf: ${error.message || "PDF 导出失败"}`);
      }
    }

    const interactionMarkdown = planOutput.value.trim() || state.fullPlan || state.plan || "";
    addTextEntry("03_interaction_plan/interaction_plan.md", interactionMarkdown);
    if (interactionMarkdown) {
      try {
        await addBlobEntry("03_interaction_plan/interaction_plan.pdf", await fetchPrintablePdfBlob({
          title: `${projectTitle}_交互设计方案`,
          eyebrow: "DOCUMENT",
          heading: "交互设计方案",
          markdown: interactionMarkdown,
          signal: buttonController.signal
        }));
      } catch (error) {
        if (isAbortLikeError(error)) throw error;
        manifest.failed.push(`03_interaction_plan/interaction_plan.pdf: ${error.message || "PDF 导出失败"}`);
      }
    }

    const selectedScreens = getSelectedScreens();
    throwIfAborted(buttonController.signal);
    if (selectedScreens.length) {
      selectedScreens.forEach((screen) => {
        const filename = `04_svg/${safeFileName(screen.name)}.svg`;
        entries.push({ filename, data: new TextEncoder().encode(createInterfaceSvg(screen)) });
        manifest.files.push(filename);
      });
    } else {
      manifest.missing.push("04_svg/");
    }

    addTextEntry("05_style_references/style_prompt.txt", getStylePromptText());
    if (state.styleAnalysisCache?.status === "ready") {
      addJsonEntry("05_style_references/style_analysis_cache.json", state.styleAnalysisCache);
      addTextEntry(
        "05_style_references/style_analysis_summary.txt",
        [
          `状态：${state.styleAnalysisCache.status}`,
          `更新时间：${state.styleAnalysisCache.updatedAt || 0}`,
          `迁移关键词：${state.styleAnalysisCache.styleTransferKeywords || ""}`
        ].join("\n")
      );
    } else {
      manifest.missing.push("05_style_references/style_analysis_summary.txt");
    }
    for (let index = 0; index < state.styleReferences.length; index += 1) {
      throwIfAborted(buttonController.signal);
      const item = state.styleReferences[index];
      const extension = getImageFileExtension(item.fileName || item.displayName || item.dataUrl || "") || "png";
      const filename = `05_style_references/style_ref_${index + 1}.${extension}`;
      try {
        const blob = item.file instanceof Blob ? item.file : dataUrlToBlob(item.dataUrl);
        await addBlobEntry(filename, blob);
      } catch (error) {
        manifest.failed.push(`${filename}: ${error.message || "参考图写入失败"}`);
      }
    }

    const totalKit = state.totalAssetKit || {};
    for (const meta of TOTAL_ASSET_TYPES) {
      throwIfAborted(buttonController.signal);
      const part = totalKit[meta.id] || {};
      const basePath = `06_total_assets/${meta.id}`;
      if (part.imageUrl) {
        try {
          const extension = getImageFileExtension(part.imageUrl);
          await addBlobEntry(`${basePath}/${meta.fileBase}.${extension}`, await fetchImageBlobForZip(part.imageUrl, { signal: buttonController.signal }));
        } catch (error) {
          if (isAbortLikeError(error)) throw error;
          manifest.failed.push(`${basePath}/${meta.fileBase}: ${error.message || `${meta.label}读取失败`}`);
        }
      } else {
        manifest.missing.push(`${basePath}/${meta.fileBase}.*`);
      }
      addTextEntry(`${basePath}/${meta.promptFile}`, part.prompt || "");
      addJsonEntry(`${basePath}/${meta.summaryFile}`, {
        ...part,
        assetType: meta.id,
        assetLabel: meta.label,
        totalAssetVersion: getTotalAssetVersion(totalKit)
      });
    }

    const screenMap = new Map(selectedScreens.map((screen) => [screen.id, screen]));
    const designDraftEntries = Object.entries(state.designDrafts || {});
    if (designDraftEntries.length) {
      for (const [screenId, draft] of designDraftEntries) {
        throwIfAborted(buttonController.signal);
        if (!draft?.imageUrl) continue;
        const screen = screenMap.get(screenId);
        const screenName = screen?.name || screenId;
        const extension = getImageFileExtension(draft.imageUrl);
        try {
          await addBlobEntry(`07_design_drafts/${safeFileName(screenName)}.${extension}`, await fetchImageBlobForZip(draft.imageUrl, { signal: buttonController.signal }));
          addJsonEntry(`07_design_drafts/${safeFileName(screenName)}.json`, {
            screenId,
            screenName,
            model: draft.model || getSelectedDesignModel(),
            imageUrl: draft.imageUrl,
            prompt: draft.prompt || "",
            styleTransferKeywords: draft.styleTransferKeywords || "",
            totalAssetVersion: draft.totalAssetVersion || getTotalAssetVersion(),
            totalAssetRoles: draft.totalAssetRoles || [],
            uiAssetVersion: draft.uiAssetVersion || state.uiAssetKit?.updatedAt || 0
          });
        } catch (error) {
          if (isAbortLikeError(error)) throw error;
          manifest.failed.push(`07_design_drafts/${screenName}: ${error.message || "设计稿读取失败"}`);
        }
      }
    } else {
      manifest.missing.push("07_design_drafts/");
    }

    addJsonEntry("99_manifest/manifest.json", manifest);

    const zipBlob = createZipBlob(entries);
    const zipUrl = URL.createObjectURL(zipBlob);
    triggerDownload(zipUrl, `${projectName}_全量资源包.zip`);
    window.setTimeout(() => URL.revokeObjectURL(zipUrl), 1000);
    if (status) {
      status.textContent = manifest.failed.length || manifest.missing.length
        ? "已导出可用资源，部分项目缺失或抓取失败"
        : "全量资源包已开始下载";
    }
  } catch (error) {
    if (status) status.textContent = isAbortLikeError(error) ? (error.message || "已取消项目资源包下载") : (error.message || "资源打包失败");
  } finally {
    setGenerateButtonPending("exportAllResources", false);
  }
}

function dataUrlToBlob(dataUrl) {
  const [meta, data] = String(dataUrl || "").split(",", 2);
  if (!meta || !data) {
    throw new Error("无效的 data URL");
  }
  const mimeMatch = meta.match(/^data:(.*?);base64$/);
  const mimeType = mimeMatch?.[1] || "application/octet-stream";
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType });
}

function createZipBlob(entries) {
  const files = [];
  const centralRecords = [];
  let offset = 0;

  entries.forEach((entry) => {
    const nameBytes = new TextEncoder().encode(entry.filename);
    const data = entry.data instanceof Uint8Array ? entry.data : new Uint8Array(entry.data);
    const crc = crc32(data);
    const timeDate = getZipDosTimeDate(new Date());
    const localHeader = createZipLocalHeader({ nameBytes, data, crc, timeDate });
    const centralHeader = createZipCentralHeader({ nameBytes, data, crc, timeDate, offset });

    files.push(localHeader, data);
    centralRecords.push(centralHeader);
    offset += localHeader.length + data.length;
  });

  const centralSize = centralRecords.reduce((sum, item) => sum + item.length, 0);
  const endRecord = createZipEndRecord(entries.length, centralSize, offset);
  return new Blob([...files, ...centralRecords, endRecord], { type: "application/zip" });
}

function createZipLocalHeader({ nameBytes, data, crc, timeDate }) {
  const header = new Uint8Array(30 + nameBytes.length);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0x0800, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, timeDate.time, true);
  view.setUint16(12, timeDate.date, true);
  view.setUint32(14, crc, true);
  view.setUint32(18, data.length, true);
  view.setUint32(22, data.length, true);
  view.setUint16(26, nameBytes.length, true);
  view.setUint16(28, 0, true);
  header.set(nameBytes, 30);
  return header;
}

function createZipCentralHeader({ nameBytes, data, crc, timeDate, offset }) {
  const header = new Uint8Array(46 + nameBytes.length);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, 0x0800, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, timeDate.time, true);
  view.setUint16(14, timeDate.date, true);
  view.setUint32(16, crc, true);
  view.setUint32(20, data.length, true);
  view.setUint32(24, data.length, true);
  view.setUint16(28, nameBytes.length, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, 0, true);
  view.setUint32(42, offset, true);
  header.set(nameBytes, 46);
  return header;
}

function createZipEndRecord(fileCount, centralSize, centralOffset) {
  const record = new Uint8Array(22);
  const view = new DataView(record.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(4, 0, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, fileCount, true);
  view.setUint16(10, fileCount, true);
  view.setUint32(12, centralSize, true);
  view.setUint32(16, centralOffset, true);
  view.setUint16(20, 0, true);
  return record;
}

function getZipDosTimeDate(date) {
  const year = Math.max(1980, date.getFullYear());
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  };
}

let crc32Table = null;

function crc32(data) {
  if (!crc32Table) {
    crc32Table = new Uint32Array(256);
    for (let index = 0; index < 256; index += 1) {
      let value = index;
      for (let bit = 0; bit < 8; bit += 1) {
        value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
      }
      crc32Table[index] = value >>> 0;
    }
  }

  let crc = 0xffffffff;
  for (let index = 0; index < data.length; index += 1) {
    crc = crc32Table[(crc ^ data[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function triggerDownload(url, filename, openFallback = false) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  if (openFallback) {
    link.target = "_blank";
    link.rel = "noopener";
  }
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function getImageFileExtension(url) {
  const value = String(url || "");
  const dataMatch = value.match(/^data:image\/([a-zA-Z0-9.+-]+);/);
  if (dataMatch) return normalizeImageExtension(dataMatch[1]);

  try {
    const path = new URL(value, window.location.href).pathname;
    const match = path.match(/\.([a-zA-Z0-9]+)$/);
    if (match) return normalizeImageExtension(match[1]);
  } catch (error) {
    const match = value.match(/\.([a-zA-Z0-9]+)(?:[?#].*)?$/);
    if (match) return normalizeImageExtension(match[1]);
  }

  return "png";
}

function normalizeImageExtension(extension) {
  const value = String(extension || "").toLowerCase();
  if (value === "jpeg") return "jpg";
  if (["png", "jpg", "webp", "gif"].includes(value)) return value;
  return "png";
}

function safeFileName(value) {
  return String(value || "download")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 80) || "download";
}

function getVisualSvgForScreen(screen) {
  if (!screen?.id) return "";
  const cached = state.visualSvgs?.[screen.id] || "";
  if (cached) return cached;
  if (!getStoredVisualAnalysis(screen)) return "";
  const svg = createInterfaceSvg(screen);
  state.visualSvgs = state.visualSvgs || {};
  state.visualSvgs[screen.id] = svg;
  return svg;
}

function setCurrentVisualSvg(screen, svg = "") {
  const isActive = Boolean(screen?.id && screen.id === state.activeVisualScreen);
  if (isActive) {
    state.visualSvg = svg;
  }
  return isActive;
}

function renderVisual() {
  syncPlanFromEditor();
  if (!state.fullPlan && !planOutput.value.trim()) {
    renderEmptyVisual();
    $("#planStatus").textContent = "请先输入策划案";
    return;
  }

  const screen = getVisualScreen();
  if (!screen) {
    renderEmptyVisual("未识别到目标界面", "请在策划案中写明需要的界面，例如：主界面、商店、图鉴、背包、任务。");
    $("#planStatus").textContent = "未识别到目标界面";
    return;
  }

  const svg = getVisualSvgForScreen(screen);
  if (!svg) {
    const batchResult = getVisualSvgBatchScreenResult(screen.id);
    if (batchResult?.status === "failed") {
      renderEmptyVisual(
        `${screen.name} SVG 生成失败`,
        batchResult.error || "本轮自动生成已跳过该界面的 SVG，请稍后单独重试这个界面或继续查看后续设计稿结果。"
      );
      $("#planStatus").textContent = `${screen.name} SVG 生成失败：${batchResult.error || "请稍后重试"}`;
      return;
    }
    renderEmptyVisual("当前界面尚未生成 SVG", "请点击「生成可编辑交互 SVG」后再查看这个界面的正式 SVG。");
    $("#planStatus").textContent = "当前界面尚未生成 SVG";
    return;
  }

  state.visualSvg = svg;
  $("#visualCanvas").innerHTML = svg;
  updateLockedVisualSvgButton();
}

function renderEmptyVisual(title = "等待生成可编辑交互 SVG", desc = "输入玩法大纲并生成交互设计案后，这里会生成可导入 Figma 拆层编辑的 SVG 线框标注稿。") {
  state.visualSvg = "";
  $("#visualCanvas").innerHTML = `
    <div class="empty-visual">
      <p class="eyebrow">EMPTY CANVAS</p>
      <strong>${escapeXml(title)}</strong>
      <span>${escapeXml(desc)}</span>
    </div>
  `;
}

function renderVisualLoading(screenName = "当前界面") {
  $("#visualCanvas").innerHTML = `
    <div class="draft-loading">
      <div>
        <p class="eyebrow">ANALYZING</p>
        <strong>正在分析 ${escapeXml(screenName)} 的交互 SVG</strong>
        <p>正在结合完整策划案、交互设计案和界面目标补全布局、状态、异常和交付标注。</p>
      </div>
    </div>
  `;
}

function normalizeSvgCompletenessText(value = "") {
  return String(value || "")
    .replace(/<desc[\s\S]*?<\/desc>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[\s#（）()：:、.《》<>/|｜；;，,]/g, "")
    .toLowerCase();
}

function svgTextContains(svg = "", value = "") {
  const expected = normalizeSvgCompletenessText(value);
  if (!expected || expected.length < 2) return true;
  return normalizeSvgCompletenessText(svg).includes(expected);
}

function validateVisualSvgCompleteness(svg = "", screen = {}, analysis = {}) {
  const missing = [];
  const forbidden = [];
  const goal = analysis.goal || screen.goal || "";
  const closeBehavior = analysis.closeBehavior || getScreenCloseBehavior(screen);
  const regions = (analysis.layoutRegions || []).slice(0, 6);
  const components = (analysis.components || []).slice(0, 8);
  const primaryAction = analysis.primaryAction?.label || "";

  [
    ["当前界面名称", screen.name],
    ["页面目标", goal],
    ["关闭方式", closeBehavior],
    ["主操作", primaryAction]
  ].forEach(([label, value]) => {
    if (value && !svgTextContains(svg, value)) missing.push(`${label}：${value}`);
  });

  regions.forEach((region) => {
    if (region.name && !svgTextContains(svg, region.name)) missing.push(`区域：${region.name}`);
  });
  components.forEach((component) => {
    if (component.name && !svgTextContains(svg, component.name)) missing.push(`组件：${component.name}`);
  });
  (analysis.forbiddenComponents || []).forEach((item) => {
    if (item && svgTextContains(svg, item)) forbidden.push(`禁用组件误出现：${item}`);
  });

  return {
    ok: missing.length === 0 && forbidden.length === 0,
    issues: [...missing, ...forbidden]
  };
}

async function generateEditableInteractionSvg() {
  if (state.isGeneratingVisualSvg) {
    cancelRunningButtonTask("generateInteractionVisuals");
    return;
  }

  if (!hasUsablePlanningSource()) {
    $("#planStatus").textContent = "请先输入玩法大纲";
    renderEmptyVisual("缺少策划案内容", "先输入玩法大纲并生成完整策划案与交互设计案，再生成可编辑 SVG。");
    return;
  }

  state.isGeneratingVisualSvg = true;
  state.generatingVisualScreen = "";
  renderVisualTabs();
  setSvgGenerateButtonPending(true, "分析交互结构");
  const buttonController = createButtonAbortController("generateInteractionVisuals", "已取消可编辑 SVG 生成");
  setRunningButtonTask("generateAllInteractionVisuals", () => cancelRunningButtonTask("generateInteractionVisuals"));
  try {
    throwIfAborted(buttonController.signal);
    await prepareEditableInteractionSvgSource(buttonController.signal);

    syncActiveVisualScreen();
    const screen = getVisualScreen();
    if (!screen) {
      throw new Error("未识别到当前目标界面，无法生成 SVG。");
    }

    const result = await generateEditableInteractionSvgForScreen(screen, {
      signal: buttonController.signal,
      onPhase: (phase) => setSvgGenerateButtonPending(true, phase)
    });
    renderVisualTabs();

    if (result.svg) {
      $("#planStatus").textContent = result.validation.ok
        ? "可编辑交互 SVG 已生成，可导入 Figma 编辑"
        : `可编辑交互 SVG 已生成，但仍有结构项待检查：${summarizeMissingHeadings(result.validation.issues, 4)}`;
      setGenerateButtonComplete("generateInteractionVisuals", "重新生成 SVG");
    }
  } catch (error) {
    console.warn(error);
    $("#planStatus").textContent = error.message || "可编辑 SVG 生成失败";
    renderEmptyVisual(
      isAbortLikeError(error) ? "已取消 SVG 生成" : "结构化分析失败",
      isAbortLikeError(error) ? "可再次点击生成可编辑交互 SVG。" : (error.message || "聊天模型未返回可用结构化结果，已停止生成 SVG。")
    );
  } finally {
    state.isGeneratingVisualSvg = false;
    state.generatingVisualScreen = "";
    renderVisualTabs();
    const button = document.getElementById("generateInteractionVisuals");
    if (button?.classList.contains("is-loading")) {
      setSvgGenerateButtonPending(false);
    }
    clearRunningButtonTask("generateAllInteractionVisuals");
  }
}

async function generateAllEditableInteractionSvgs() {
  if (state.isGeneratingVisualSvg) {
    cancelRunningButtonTask("generateAllInteractionVisuals") || cancelRunningButtonTask("generateInteractionVisuals");
    return;
  }

  if (!hasUsablePlanningSource()) {
    $("#planStatus").textContent = "请先输入玩法大纲";
    renderEmptyVisual("缺少策划案内容", "先输入玩法大纲并生成完整策划案与交互设计案，再生成可编辑 SVG。");
    return;
  }

  state.isGeneratingVisualSvg = true;
  state.generatingVisualScreen = "";
  state.visualSvgBatchSummary = {
    status: "running",
    total: 0,
    successCount: 0,
    failedCount: 0,
    screens: {},
    updatedAt: Date.now()
  };
  renderVisualTabs();
  setAllSvgGenerateButtonPending(true, "生成所有界面 SVG");
  setSvgGenerateButtonPending(true, "生成所有界面 SVG");
  const buttonController = createButtonAbortController("generateAllInteractionVisuals", "已取消所有界面 SVG 生成");
  setRunningButtonTask("generateInteractionVisuals", () => cancelRunningButtonTask("generateAllInteractionVisuals"));

  try {
    await prepareEditableInteractionSvgSource(buttonController.signal);
    const selectedScreens = getSelectedScreens();
    if (!selectedScreens.length) {
      throw new Error("未识别到目标界面，无法生成 SVG。");
    }

    let successCount = 0;
    let failedCount = 0;
    let latestIssues = [];
    const failures = [];
    state.visualSvgBatchSummary.total = selectedScreens.length;
    for (let index = 0; index < selectedScreens.length; index += 1) {
      throwIfAborted(buttonController.signal);
      const screen = selectedScreens[index];
      $("#planStatus").textContent = `正在生成所有界面 SVG：${index + 1}/${selectedScreens.length} ${screen.name}`;
      setAllSvgGenerateButtonPending(true, "生成所有界面 SVG");
      setSvgGenerateButtonPending(true, "生成所有界面 SVG");
      try {
        const result = await generateEditableInteractionSvgForScreen(screen, {
          signal: buttonController.signal,
          onPhase: (phase) => {
            setAllSvgGenerateButtonPending(true, "生成所有界面 SVG");
            setSvgGenerateButtonPending(true, phase);
          }
        });
        if (result.svg) {
          successCount += 1;
          state.visualSvgBatchSummary.screens[screen.id] = {
            status: "success",
            error: "",
            issues: result.validation?.issues || []
          };
        } else {
          failedCount += 1;
          const errorMessage = `${screen.name} 未产出 SVG`;
          failures.push(`${screen.name}：未产出 SVG`);
          state.visualSvgBatchSummary.screens[screen.id] = {
            status: "failed",
            error: errorMessage,
            issues: result.validation?.issues || []
          };
        }
        latestIssues = result.validation?.issues || [];
      } catch (error) {
        if (isAbortLikeError(error)) throw error;
        failedCount += 1;
        const errorMessage = error?.message || "未知错误";
        failures.push(`${screen.name}：${errorMessage}`);
        state.visualSvgBatchSummary.screens[screen.id] = {
          status: "failed",
          error: errorMessage,
          issues: []
        };
        console.warn(`SVG 生成失败：${screen.name}`, error);
        if (screen.id === state.activeVisualScreen) {
          renderVisual();
        }
      }
      state.visualSvgBatchSummary.successCount = successCount;
      state.visualSvgBatchSummary.failedCount = failedCount;
      state.visualSvgBatchSummary.updatedAt = Date.now();
      renderVisualTabs();
    }

    state.visualSvgBatchSummary.status = failedCount ? "completed_with_failures" : "completed";
    $("#planStatus").textContent = latestIssues.length
      ? `所有界面 SVG 已完成：成功 ${successCount}/${selectedScreens.length}，失败 ${failedCount}${latestIssues.length ? `，仍有结构项待检查：${summarizeMissingHeadings(latestIssues, 4)}` : ""}`
      : `所有界面 SVG 已完成：成功 ${successCount}/${selectedScreens.length}，失败 ${failedCount}`;
    if (failedCount && failures.length) {
      const summary = failures.slice(0, 3).join("；");
      setAutoGenerateStatus(`SVG 阶段已完成：成功 ${successCount}/${selectedScreens.length}，失败 ${failedCount}。${summary}`, "warning");
    }
    setGenerateButtonComplete("generateAllInteractionVisuals", "重新生成所有界面 SVG");
    setGenerateButtonComplete("generateInteractionVisuals", "重新生成 SVG");
    return {
      completed: true,
      total: selectedScreens.length,
      successCount,
      failedCount,
      failures
    };
  } catch (error) {
    console.warn(error);
    $("#planStatus").textContent = error.message || "所有界面 SVG 生成失败";
    if (isAbortLikeError(error)) {
      $("#planStatus").textContent = error.message || "已取消所有界面 SVG 生成";
      state.visualSvgBatchSummary.status = "cancelled";
    } else {
      state.visualSvgBatchSummary.status = "failed";
    }
    throw error;
  } finally {
    state.isGeneratingVisualSvg = false;
    state.generatingVisualScreen = "";
    state.visualSvgBatchSummary.updatedAt = Date.now();
    renderVisualTabs();
    const allButton = document.getElementById("generateAllInteractionVisuals");
    if (allButton?.classList.contains("is-loading")) {
      setAllSvgGenerateButtonPending(false);
    }
    const singleButton = document.getElementById("generateInteractionVisuals");
    if (singleButton?.classList.contains("is-loading")) {
      setSvgGenerateButtonPending(false);
    }
  }
}

async function prepareEditableInteractionSvgSource(signal) {
  throwIfAborted(signal);
  if (!state.fullPlan && !planOutput.value.trim()) {
    await generatePlan({ useApi: true, signal });
  } else {
    syncPlanFromEditor();
  }

  const planningDocument = getPlanningDocument();
  const interactionDocument = planOutput.value.trim() || state.plan || "";
  if (!planningDocument) {
    throw new Error("缺少完整策划案，请先生成或填写策划案。");
  }
  if (!interactionDocument) {
    throw new Error("缺少交互设计案，请先生成或填写交互设计方案。");
  }
}

async function generateEditableInteractionSvgForScreen(screen, { signal, onPhase = () => {} } = {}) {
  if (!screen) {
    throw new Error("未识别到当前目标界面，无法生成 SVG。");
  }

  state.generatingVisualScreen = screen.id;
  state.visualSvgs = state.visualSvgs || {};
  delete state.visualSvgs[screen.id];
  if (state.visualSvgBatchSummary?.screens?.[screen.id]) {
    delete state.visualSvgBatchSummary.screens[screen.id];
  }
  setCurrentVisualSvg(screen, "");
  renderVisualTabs();
  if (screen.id === state.activeVisualScreen) {
    renderVisualLoading(screen.name);
  }

  let latestValidation = { ok: false, issues: [] };
  let candidateSvg = "";
  for (let attempt = 0; attempt <= SVG_COMPLETENESS_MAX_RETRIES; attempt += 1) {
    throwIfAborted(signal);
    $("#planStatus").textContent = attempt
      ? `SVG 结构不完整，正在第 ${attempt}/${SVG_COMPLETENESS_MAX_RETRIES} 次重试`
      : `正在分析 ${screen.name} 的 SVG 交互结构`;
    onPhase("分析交互结构");
    const analysis = await generateVisualAnalysisWithApi(screen, {
      retryIssues: attempt ? latestValidation.issues : [],
      retryAttempt: attempt,
      retryMaxAttempts: SVG_COMPLETENESS_MAX_RETRIES,
      signal
    });
    throwIfAborted(signal);
    state.visualAnalyses[screen.id] = analysis;

    onPhase("生成 SVG");
    candidateSvg = createInterfaceSvg(screen);
    throwIfAborted(signal);
    latestValidation = validateVisualSvgCompleteness(candidateSvg, screen, analysis);
      if (latestValidation.ok || attempt >= SVG_COMPLETENESS_MAX_RETRIES) {
        state.visualSvgs[screen.id] = candidateSvg;
        if (setCurrentVisualSvg(screen, candidateSvg)) {
          $("#visualCanvas").innerHTML = candidateSvg;
        }
        persistLockedVisualSvgIfNeeded();
      }
    if (latestValidation.ok || attempt >= SVG_COMPLETENESS_MAX_RETRIES) break;
  }
  renderVisualTabs();
  return { svg: state.visualSvgs?.[screen.id] || "", validation: latestValidation };
}

function resetGeneratedContent() {
  const preserveBrief = Boolean(state.lockedDocs?.brief);
  const preserveGameDesign = Boolean(state.lockedDocs?.gameDesign);
  const preservePlan = Boolean(state.lockedDocs?.plan);
  const preserved = collectLockedDocsSnapshot().docs;
  window.clearTimeout(autoGenerateTimer);
  state.gameDesign = "";
  state.gameDesignSourceSignature = "";
  state.plan = "";
  state.fullPlan = "";
  state.planSourceSignature = "";
  state.visualSvg = "";
  state.visualSvgs = {};
  state.generatingVisualScreen = "";
  resetVisualSvgBatchSummary();
  state.visualAnalyses = {};
  unlockLockedVisualSvg();
  state.designCompositionAnalyses = {};
  state.designDrafts = {};
  state.designJobs = {};
  state.designEditJobs = {};
  state.designDraftEdit = createDefaultDesignDraftEditState();
  state.lockedDesignDraft = false;
  state.lockedDesignDraftStaleReason = "";
  clearLockedDesignDraftStorage();
  state.normalizedOutline = "";
  state.normalizedOutlineSignature = "";
  state.normalizedOutlineSourceSignature = "";
  state.normalizedOutlineManual = false;
  resetStyleAnalysisCache();
  resetUiAssetKit();
  resetUiComponentBaselines();
  state.designInputVersion += 1;
  state.gameName = gameName.value.trim();
  screens = [];
  state.activeVisualScreen = "";
  state.activeDesignScreen = "";
  hideTargetScreensUntilGameDesignReady();
  gameDesignOutput.value = "";
  planOutput.value = "";
  if (normalizedOutlineOutput) normalizedOutlineOutput.value = "";
  state.normalizedOutlineRows = [];
  state.normalizedOutline = "";
  renderNormalizedOutlineTable([]);
  renderMarkdownDocuments();
  renderEmptyVisual();
  renderEmptyDesignOutput();
  updateLockedDesignDraftButton();
  $("#designStatus").textContent = "设计稿待生成";

  if (preserveBrief) {
    briefText.value = preserved.briefText || "";
    if (gameName) gameName.value = preserved.gameName || "";
    if ($("#platform") && preserved.platform) $("#platform").value = preserved.platform;
    state.normalizedOutline = preserved.normalizedOutline || "";
    state.normalizedOutlineRows = Array.isArray(preserved.normalizedOutlineRows) ? preserved.normalizedOutlineRows : [];
    state.normalizedOutlineSignature = preserved.normalizedOutlineSignature || "";
    state.normalizedOutlineSourceSignature = preserved.normalizedOutlineSourceSignature || preserved.normalizedOutlineSignature || "";
    state.normalizedOutlineManual = preserved.normalizedOutlineManual === true;
    if (normalizedOutlineOutput) normalizedOutlineOutput.value = state.normalizedOutline;
    renderNormalizedOutlineTable(state.normalizedOutlineRows);
  }
  if (preserveGameDesign && preserved.gameDesign) {
    state.gameDesign = preserved.gameDesign;
    state.gameDesignSourceSignature = preserved.gameDesignSourceSignature || "";
    gameDesignOutput.value = preserved.gameDesign;
    renderMarkdownDocument("gameDesign");
    syncScreensFromBrief(preserved.gameDesign);
  }
  if (preservePlan && (preserved.fullPlan || preserved.plan)) {
    state.fullPlan = preserved.fullPlan || preserved.plan || "";
    state.plan = state.fullPlan;
    state.planSourceSignature = preserved.planSourceSignature || "";
    state.activeTab = preserved.activeTab || "overview";
    renderPlanTab();
  }
  if (preserveBrief || preserveGameDesign || preservePlan) {
    writeLockedDocsStorage();
    updateLockedDocButtons();
  }
}

function syncPlanFromEditor() {
  const edited = planOutput.value.trim();
  if (edited) {
    state.plan = edited;
    if (state.activeTab === "overview") {
      state.fullPlan = edited;
    }
  }
}

function renderVisualTabs() {
  const selected = getSelectedScreens();
  $("#visualTabs").innerHTML = selected.map((screen) => {
    const active = screen.id === state.activeVisualScreen ? "is-active" : "";
    const isGeneratingCurrent = state.isGeneratingVisualSvg && screen.id === state.generatingVisualScreen;
    const suffix = isGeneratingCurrent ? "..." : (getVisualSvgForScreen(screen) ? " ✓" : "");
    return `<button class="${active}" type="button" data-screen="${screen.id}">${escapeXml(screen.name)}${suffix}</button>`;
  }).join("");

  $$("#visualTabs button").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeVisualScreen = button.dataset.screen;
      renderVisualTabs();
      const screen = getVisualScreen();
      if (state.isGeneratingVisualSvg && state.activeVisualScreen === state.generatingVisualScreen) {
        renderVisualLoading(screen?.name || "当前界面");
        return;
      }
      if (state.fullPlan || planOutput.value.trim()) {
        renderVisual();
      } else {
        renderEmptyVisual();
      }
    });
  });
}

function getVisualSvgBatchScreenResult(screenId = "") {
  if (!screenId) return null;
  return state.visualSvgBatchSummary?.screens?.[screenId] || null;
}

function resetVisualSvgBatchSummary() {
  state.visualSvgBatchSummary = {
    status: "idle",
    total: 0,
    successCount: 0,
    failedCount: 0,
    screens: {},
    updatedAt: 0
  };
}

function renderDesignTabs() {
  const selected = getSelectedScreens();
  const target = $("#designTabs");
  if (!target) return;

  target.innerHTML = selected.map((screen) => {
    const active = screen.id === state.activeDesignScreen ? "is-active" : "";
    const job = getDesignJob(screen.id);
    const editJob = getDesignEditJob(screen.id);
    const batchState = getDesignBatchQueueState(screen.id);
    const batchFailed = Array.isArray(state.designBatch?.failedScreenIds) && state.designBatch.failedScreenIds.includes(screen.id);
    const batchSkipped = Array.isArray(state.designBatch?.skippedScreenIds) && state.designBatch.skippedScreenIds.includes(screen.id);
    const generating = job?.status === "generating" || batchState.inRunningBatch ? " …" : "";
    const editing = editJob?.status === "generating" ? " ✎" : "";
    const ready = getDesignDraftForScreen(screen)?.imageUrl ? " ✓" : "";
    const skipped = !generating && !editing && batchSkipped ? " ↷" : "";
    const failed = !generating && !editing && !ready && !skipped && batchFailed ? " !" : "";
    return `<button class="${active}" type="button" data-screen="${screen.id}">${escapeXml(screen.name)}${generating || editing || ready || skipped || failed}</button>`;
  }).join("");

  const assetKit = state.totalAssetKit || {};
  const assetBusy = isTotalAssetBusy(assetKit);
  const readyTypes = getTotalAssetReadyTypes(assetKit);
  const assetLabel = assetBusy ? "总资产 …" : readyTypes.length ? `总资产 ${readyTypes.length}/3 ✓` : "总资产";
  target.insertAdjacentHTML(
    "afterbegin",
    `<button class="${isUiAssetDesignScreenId() ? "is-active" : ""}" type="button" data-screen="${UI_ASSET_DESIGN_SCREEN_ID}">${assetLabel}</button>`
  );

  $$("#designTabs button").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeDesignScreen = button.dataset.screen;
      persistLockedDesignDraftIfNeeded();
      renderDesignTabs();
      renderDesignPromptSummary();
      renderDesignOutput();
    });
  });
  renderDesignPromptSummary();
  syncDesignGenerateButtonState();
  updateLockedDesignDraftButton();
}

function syncActiveVisualScreen() {
  const selected = getSelectedScreens();
  if (!selected.some((screen) => screen.id === state.activeVisualScreen)) {
    state.activeVisualScreen = selected[0]?.id || "";
  }
}

function syncActiveDesignScreen() {
  const selected = getSelectedScreens();
  if (!state.activeDesignScreen) {
    state.activeDesignScreen = UI_ASSET_DESIGN_SCREEN_ID;
    return;
  }
  if (isUiAssetDesignScreenId()) return;
  if (!selected.some((screen) => screen.id === state.activeDesignScreen)) {
    state.activeDesignScreen = selected[0]?.id || UI_ASSET_DESIGN_SCREEN_ID;
  }
}

function getVisualScreen() {
  const selected = getSelectedScreens();
  return selected.find((screen) => screen.id === state.activeVisualScreen) || selected[0] || null;
}

function getDesignScreen() {
  if (isUiAssetDesignScreenId()) return getUiAssetDesignScreen();
  const selected = getSelectedScreens();
  return selected.find((screen) => screen.id === state.activeDesignScreen) || selected[0] || null;
}

function getDesignBatchQueueState(screenId) {
  const batch = state.designBatch || {};
  const batchRunning = isDesignBatchRunning();
  const batchScreenIds = new Set(Array.isArray(batch.screenIds) ? batch.screenIds : []);
  const batchCompletedIds = new Set(Array.isArray(batch.completedScreenIds) ? batch.completedScreenIds : []);
  const batchFailedIds = new Set(Array.isArray(batch.failedScreenIds) ? batch.failedScreenIds : []);
  const inRunningBatch = batchRunning
    && batchScreenIds.has(screenId)
    && !batchCompletedIds.has(screenId)
    && !batchFailedIds.has(screenId);
  const isCurrentBatchScreen = inRunningBatch && batch.currentScreenId === screenId;
  const isQueued = inRunningBatch && !isCurrentBatchScreen && getDesignJob(screenId)?.status !== "generating";
  return {
    batchRunning,
    inRunningBatch,
    isCurrentBatchScreen,
    isQueued,
    batchIndex: Math.max(0, Number(batch.index) || 0),
    batchTotal: Math.max(0, Number(batch.total) || 0),
    currentScreenId: batch.currentScreenId || ""
  };
}

function isUiAssetDesignScreenId(screenId = state.activeDesignScreen) {
  return screenId === UI_ASSET_DESIGN_SCREEN_ID;
}

function getUiAssetDesignScreen() {
  return {
    id: UI_ASSET_DESIGN_SCREEN_ID,
    name: "总资产",
    kind: "total_asset",
    goal: "项目级 UI控件资产图、背景设定图、角色设定图"
  };
}

function renderEmptyDesignOutput(title = "等待生成界面设计稿", desc = "先生成交互设计方案，再上传画风参考图和关键词，点击「生成界面设计稿」。") {
  const target = $("#designOutput");
  if (!target) return;

  target.innerHTML = `
    <div class="empty-visual">
      <p class="eyebrow">EMPTY DRAFT</p>
      <strong>${escapeXml(title)}</strong>
      <span>${escapeXml(desc)}</span>
    </div>
  `;
}

function getDesignPromptSummaryTarget() {
  const nodes = Array.from(document.querySelectorAll("#designPromptSummary"));
  nodes.slice(1).forEach((node) => {
    node.setAttribute("aria-hidden", "true");
    node.classList.add("is-empty");
    node.innerHTML = "";
  });
  return nodes[0] || null;
}

function renderDesignPromptSummary() {
  const target = getDesignPromptSummaryTarget();
  if (!target) return;

  const screen = getDesignScreen();
  const selectedScreens = getSelectedScreens();
  const promptText = getStylePromptText();
  const modelMeta = getDesignModelMeta(getSelectedDesignModel());
  const referenceSelection = getStyleReferenceSelectionState();
  const sendableReferences = referenceSelection.sendableReferences;
  const gameDesignReady = Boolean(gameDesignOutput.value.trim() || state.gameDesign);
  const interactionReady = Boolean(planOutput.value.trim() || state.fullPlan || state.plan);
  const svgReady = Boolean(getVisualSvgForScreen(getVisualScreen()));
  const job = getDesignJob(screen?.id);
  const cache = state.styleAnalysisCache || {};
  const assetKit = state.totalAssetKit || {};
  const isTotalAssetScreen = isUiAssetDesignScreenId(screen?.id);
  const currentSourceSignature = getStyleReferenceSourceSignature(referenceSelection, promptText);
  const currentSignature = getStyleReferenceSignature(sendableReferences, promptText);
  const cacheDirty = cache.status === "ready" && (cache.dirty || (
    cache.referenceSourceSignature
      ? cache.referenceSourceSignature !== currentSourceSignature
      : cache.referenceSignature && cache.referenceSignature !== currentSignature
  ));
  const currentAssetSourceSignature = getUiAssetKitSourceSignature(referenceSelection, promptText, getSelectedDesignModel());
  const currentAssetSignature = getUiAssetKitSignature(sendableReferences, promptText, getSelectedDesignModel());
  const assetDirty = assetKit.status === "ready" && (assetKit.dirty || (
    assetKit.referenceSourceSignature
      ? assetKit.referenceSourceSignature !== currentAssetSourceSignature
      : assetKit.referenceSignature && assetKit.referenceSignature !== currentAssetSignature
  ));
  const cacheAnalysisIsCurrent = cache.status === "ready" && !cacheDirty;
  const totalAssetBusy = isTotalAssetBusy(assetKit);
  const totalAssetDisplaySummary = buildTotalAssetDisplayAnalysisSummary(assetKit);
  const assetAnalysisIsCurrent = assetKit.status === "ready" && !assetDirty;
  const totalAssetAnalysisIsCurrent = Boolean(assetKit.analysis) && !assetDirty && (assetKit.status === "ready" || totalAssetBusy || assetKit.status === "error");
  const usesTotalAssetAnalysisForDisplay = isTotalAssetScreen && totalAssetAnalysisIsCurrent && totalAssetDisplaySummary.hasAnalysis;
  const usesReadyAssetAnalysisAsFallback = !isTotalAssetScreen && !cacheAnalysisIsCurrent && assetAnalysisIsCurrent && totalAssetDisplaySummary.hasAnalysis;
  const usesAssetAnalysisForDisplay = usesTotalAssetAnalysisForDisplay || usesReadyAssetAnalysisAsFallback;
  const structuredAnalysisSource = usesAssetAnalysisForDisplay
    ? assetKit.analysis
    : cacheAnalysisIsCurrent
      ? cache.structuredAnalysis
      : null;
  const displayStructuredAnalysis = normalizeStructuredStyleAnalysisForDisplay(structuredAnalysisSource);
  const structuredBackgroundSummary = displayStructuredAnalysis
    ? formatBackgroundSpecSummary(displayStructuredAnalysis.backgroundSpec)
    : "";
  const structuredShapeLanguageSummary = displayStructuredAnalysis
    ? joinSpecSummary([
      formatPointLinePlaneSummary(displayStructuredAnalysis.pointLinePlane),
      joinSpecSummary(formatShapeLanguageDetailedLines(displayStructuredAnalysis.shapeLanguage))
    ])
    : "";
  const structuredButtonMorphologySummary = displayStructuredAnalysis
    ? formatButtonSpecSummary(displayStructuredAnalysis.buttonSpec)
    : "";
  const lockedLabels = normalizeSummaryTextList(cache.referenceLabels);
  const styleKeywordSummary = cacheAnalysisIsCurrent
    ? normalizeSummaryText(cache.styleKeywordSummary)
    : "";
  const referenceRule = cache.referenceRequestInfo
    ? formatStyleReferenceRequestInfo(cache.referenceRequestInfo, referenceSelection)
    : formatStyleReferenceSelectionRule(referenceSelection);
  const lockedReferenceRule = cache.status === "ready"
    ? formatStyleReferenceRequestInfo(cache.referenceRequestInfo || {
      uploadedCount: cache.referenceImages?.length || 0,
      explicitSelection: false,
      sentLabels: lockedLabels,
      skippedItems: []
    }, referenceSelection)
    : referenceRule;
  const hasReferenceInputs = sendableReferences.length > 0;
  const cacheStatusMap = {
    idle: hasReferenceInputs ? "未分析，首次生成时会自动分析并锁定" : "未上传参考图",
    analyzing: "正在分析参考图",
    ready: cacheDirty
      ? "已锁定；参考图/关键词已变化，当前仍使用上一次分析"
      : cache.styleAnalysisParseSource === "repaired"
        ? "已锁定，参考图分析已通过 JSON repair 恢复"
      : cache.styleAnalysisCompleteness === "complete"
        ? "已锁定，后续界面复用同一份分析"
        : cache.styleAnalysisCompleteness === "partial"
          ? "已锁定，但部分分析缺失；缺失项不会用默认风格补齐"
          : cache.styleAnalysisCompleteness === "insufficient" || cache.styleAnalysisCompleteness === "fallback"
            ? "参考图分析不足；不会使用默认风格兜底"
            : "已锁定，后续界面复用同一份分析",
    error: `分析失败：${cache.error || "未知错误"}`
  };
  const totalAssetInProgressForDisplay = isTotalAssetScreen && totalAssetBusy;
  const cacheStatus = isTotalAssetScreen && totalAssetDisplaySummary.hasAnalysis && !assetDirty
    ? totalAssetDisplaySummary.statusText
    : totalAssetInProgressForDisplay
      ? totalAssetDisplaySummary.statusText || "正在严格分析参考图视觉指纹；不会使用默认风格兜底"
      : isTotalAssetScreen && assetKit.status === "error"
        ? totalAssetDisplaySummary.statusText || "总资产严格分析未通过；不会使用默认风格兜底"
      : cacheStatusMap[cache.status] || cacheStatusMap.idle;
  const assetStatus = buildTotalAssetKitSummary();
  const backgroundFallbackReason = normalizeSummaryText(cache.backgroundStyleReason) || "背景分析缺失；不会用默认背景规则补齐";
  const shapeFallbackReason = normalizeSummaryText(cache.shapeLanguageReason) || "点线面分析缺失；不会用默认点线面规则补齐";
  const buttonFallbackReason = normalizeSummaryText(cache.buttonMorphologyReason) || "按钮形态分析缺失；不会用默认按钮规则补齐";
  const cacheBackgroundSummary = cacheAnalysisIsCurrent ? chooseAnalysisSummary(cache.backgroundStyleSummary, structuredBackgroundSummary) : "";
  const cacheShapeLanguageSummary = cacheAnalysisIsCurrent ? chooseAnalysisSummary(cache.shapeLanguageSummary, structuredShapeLanguageSummary) : "";
  const cacheButtonMorphologySummary = cacheAnalysisIsCurrent ? chooseAnalysisSummary(cache.buttonMorphologySummary, structuredButtonMorphologySummary) : "";
  const displayBackgroundSummary = usesAssetAnalysisForDisplay ? totalAssetDisplaySummary.backgroundSummary : cacheBackgroundSummary;
  const displayShapeLanguageSummary = usesAssetAnalysisForDisplay ? totalAssetDisplaySummary.shapeLanguageSummary : cacheShapeLanguageSummary;
  const displayButtonMorphologySummary = usesAssetAnalysisForDisplay ? totalAssetDisplaySummary.buttonMorphologySummary : cacheButtonMorphologySummary;
  const totalAssetFailureText = totalAssetDisplaySummary.failureText || "总资产严格分析未通过；不会使用默认风格兜底";
  const backgroundSummary = totalAssetDisplaySummary.failed && isTotalAssetScreen
    ? totalAssetFailureText
    : totalAssetInProgressForDisplay && !displayBackgroundSummary
      ? "正在从参考图提取背景空间、光源、材质、焦点控制和 UI 安全区证据..."
    : displayBackgroundSummary
      ? displayBackgroundSummary
    : cache.status === "analyzing"
    ? "正在分析参考图中的背景规则..."
    : cache.status === "idle" && !hasReferenceInputs
      ? "未上传参考图"
      : cache.backgroundStyleSource === "insufficient" || cache.backgroundStyleSource === "missing"
        ? backgroundFallbackReason
        : "背景规则缺失；不会使用通用 UI 风格补齐";
  const shapeLanguageSummary = totalAssetDisplaySummary.failed && isTotalAssetScreen
    ? totalAssetFailureText
    : totalAssetInProgressForDisplay && !displayShapeLanguageSummary
      ? "正在从参考图提取点线面比例、描边厚度、圆角比例和角部结构证据..."
    : displayShapeLanguageSummary
      ? displayShapeLanguageSummary
    : cache.status === "analyzing"
    ? "正在分析参考图中的点线面比例..."
    : cache.status === "idle" && !hasReferenceInputs
      ? "未上传参考图"
    : cache.shapeLanguageSource === "insufficient" || cache.shapeLanguageSource === "missing"
      ? shapeFallbackReason
      : "点线面规则缺失；不会使用默认块面规则补齐";
  const buttonMorphologySummary = totalAssetDisplaySummary.failed && isTotalAssetScreen
    ? totalAssetFailureText
    : totalAssetInProgressForDisplay && !displayButtonMorphologySummary
      ? "正在从参考图提取按钮轮廓、边框层数、材质厚度、状态和角饰节奏证据..."
    : (usesAssetAnalysisForDisplay || cache.buttonMorphologySource === "analysis" || structuredButtonMorphologySummary) && displayButtonMorphologySummary
      ? displayButtonMorphologySummary
    : cache.status === "analyzing"
    ? "正在分析参考图中的按钮圆角与角部结构..."
    : cache.status === "idle" && !hasReferenceInputs
      ? "未上传参考图"
      : cache.buttonMorphologySource === "insufficient" || cache.buttonMorphologySource === "missing"
        ? buttonFallbackReason
        : "按钮形态分析缺失；不会使用默认圆角按钮补齐";
  const readyAssetLabels = getTotalAssetReadyTypes(assetKit).map((type) => getTotalAssetPartMeta(type).label);
  const lockedComponentLabels = getLockedUiComponentBaselines().map((item) => item.label);
  const lockedLayoutAnchorLabels = getLockedProjectLayoutAnchors().map((item) => item.label || getUiComponentTypeMeta(item.type)?.label || item.type).filter(Boolean);
  const fallbackProjectContext = isTotalAssetScreen || assetKit.analysis || assetKit.ui?.analysis
    ? buildTotalAssetProjectContext(getUiAssetDesignScreen())
    : null;
  const uiRequiredComponents = normalizeRequiredUiAssetComponents(
    assetKit.analysis?.assetRequirements?.uiRequiredComponents
    || assetKit.ui?.analysis?.assetRequirements?.uiRequiredComponents
    || assetKit.analysis?.projectContext?.assetDemandSummary?.uiRequiredComponents
    || fallbackProjectContext?.assetDemandSummary?.uiRequiredComponents
    || []
  );
  const uiAssetCoverage = assetKit.ui?.uiAssetCoverage
    || assetKit.analysis?.uiAssetCoverage
    || (uiRequiredComponents.length && lockedComponentLabels.length
      ? buildUiAssetCoverage(uiRequiredComponents, getLockedUiComponentBaselines())
      : null);
  const uiAssetStyleFidelity = assetKit.ui?.uiAssetStyleFidelity || assetKit.ui?.analysis?.uiAssetStyleFidelity || assetKit.analysis?.uiAssetStyleFidelity || null;
  const uiAssetStyleFidelityIssues = normalizeAnalysisList(uiAssetStyleFidelity?.issues || uiAssetStyleFidelity?.styleDistanceWarnings || []);
  const uiAssetStyleFidelityBlocking = isUiAssetStyleFidelityBlocking(uiAssetStyleFidelity);
  const uiAssetStyleFidelityNeedsReview = isUiAssetStyleFidelityNeedsReview(uiAssetStyleFidelity);
  const uiAssetCoverageSummary = uiAssetCoverage ? getUiAssetCoverageSummary(uiAssetCoverage) : { requiredText: summarizeRequiredUiAssetComponents(uiRequiredComponents), missingText: "", unconfirmedText: "", statusText: "" };
  const uiAssetCoverageMissing = normalizeRequiredUiAssetComponents(uiAssetCoverage?.missing || []);
  const uiAssetCoverageUnconfirmed = normalizeRequiredUiAssetComponents(uiAssetCoverage?.unconfirmed || []);
  const uiAssetCoverageNeedsAttention = uiAssetCoverageMissing.length;
  const controlBaselineSummary = lockedComponentLabels.length
    ? `已锁定组件基准：${lockedComponentLabels.slice(0, 8).join("、")}${lockedComponentLabels.length > 8 ? "..." : ""}`
    : readyAssetLabels.includes(getTotalAssetPartMeta("ui").label)
      ? "UI资产图已生成，组件基准将在生成普通界面前自动分析"
      : "未锁定：普通界面不会沉淀为项目级控件基准";
  const composition = getStoredDesignCompositionAnalysis(screen);
  const compositionState = getDesignCompositionSummary(screen, composition, { gameDesignReady, interactionReady });
  const compositionSummary = compositionState.summary;
  const detailedStyleSections = cacheAnalysisIsCurrent && Array.isArray(cache.styleAnalysisSections)
    ? cache.styleAnalysisSections.filter((line) => line && !isLikelySchemaKeyOnlySummary(line))
    : [];
  const detailedAnalysisBlocks = [];
  const missingAnalysisLines = [];

  if (styleKeywordSummary) {
    detailedAnalysisBlocks.push({
      title: "参考图核心关键词",
      lines: [styleKeywordSummary]
    });
  }
  if ((usesAssetAnalysisForDisplay || cache.backgroundStyleSource === "analysis" || structuredBackgroundSummary) && displayBackgroundSummary) {
    detailedAnalysisBlocks.push({
      title: "背景风格观察",
      lines: [displayBackgroundSummary]
    });
  } else if (cacheAnalysisIsCurrent && !usesAssetAnalysisForDisplay) {
    missingAnalysisLines.push(backgroundFallbackReason);
  }
  if ((usesAssetAnalysisForDisplay || cache.shapeLanguageSource === "analysis" || structuredShapeLanguageSummary) && displayShapeLanguageSummary) {
    detailedAnalysisBlocks.push({
      title: "点线面观察",
      lines: [displayShapeLanguageSummary]
    });
  } else if (cacheAnalysisIsCurrent && !usesAssetAnalysisForDisplay) {
    missingAnalysisLines.push(shapeFallbackReason);
  }
  if ((usesAssetAnalysisForDisplay || cache.buttonMorphologySource === "analysis" || structuredButtonMorphologySummary) && displayButtonMorphologySummary) {
    detailedAnalysisBlocks.push({
      title: "主按钮形态拆解",
      lines: [displayButtonMorphologySummary]
    });
  } else if (cacheAnalysisIsCurrent && !usesAssetAnalysisForDisplay) {
    missingAnalysisLines.push(buttonFallbackReason);
  }
  detailedAnalysisBlocks.push(...buildStructuredStyleDetailBlocks(displayStructuredAnalysis));
  if (detailedStyleSections.length) {
    detailedAnalysisBlocks.push({
      title: "九类风格观察",
      lines: detailedStyleSections
    });
  } else if (cacheAnalysisIsCurrent && !displayStructuredAnalysis) {
    missingAnalysisLines.push(cache.styleAnalysisSource === "missing"
      ? "后端未返回 styleAnalysis，九类风格分析缺失"
      : cache.styleAnalysisSource === "insufficient"
        ? "styleAnalysis 结构不完整或未提取到具体字段，九类风格分析缺失"
        : "九类风格分析缺失");
  }
  if (totalAssetDisplaySummary.failed && isTotalAssetScreen && totalAssetFailureText) {
    missingAnalysisLines.push(totalAssetFailureText);
  }
  if (missingAnalysisLines.length) {
    detailedAnalysisBlocks.push({
      title: "缺失项说明",
      lines: [...new Set(missingAnalysisLines.filter(Boolean))]
    });
  }
  detailedAnalysisBlocks.push({
    title: "总资产状态",
    lines: [totalAssetBusy
      ? assetStatus
      : readyAssetLabels.length
        ? `已生成 ${readyAssetLabels.join("、")}；控件、背景、角色分别按对应资产引用，是否出现仍以策划案/交互案和当前界面裁剪为准`
        : assetStatus]
  });
  if (lockedComponentLabels.length) {
    detailedAnalysisBlocks.push({
      title: "已锁定组件基准",
      lines: [lockedComponentLabels.join("、")]
    });
  }
  if (lockedLayoutAnchorLabels.length) {
    detailedAnalysisBlocks.push({
      title: "已锁定锚点",
      lines: [lockedLayoutAnchorLabels.join("、")]
    });
  }
  if (uiRequiredComponents.length) {
    detailedAnalysisBlocks.push({
      title: "UI资产必需组件",
      lines: [uiAssetCoverageSummary.requiredText || summarizeRequiredUiAssetComponents(uiRequiredComponents)]
    });
  }
  if (uiAssetCoverageMissing.length) {
    detailedAnalysisBlocks.push({
      title: "UI资产缺失",
      lines: uiAssetCoverageMissing.map((item) => `${item.label}：${item.evidence || item.sourceScreen || "交互案要求"}`)
    });
  }
  if (uiAssetCoverageUnconfirmed.length) {
    detailedAnalysisBlocks.push({
      title: "UI资产基准待确认",
      lines: uiAssetCoverageUnconfirmed.map((item) => `${item.label}：UI资产图已生成，但组件基准分析暂未锁定该类型；普通界面会按同族形状、材质、描边和状态规则外推。`)
    });
  }
  if (uiAssetStyleFidelity) {
    detailedAnalysisBlocks.push({
      title: "UI资产画风贴合",
      lines: uiAssetStyleFidelity.ok === true
        ? ["通过：UI资产图画风贴合参考图，可作为普通界面控件基准"]
        : uiAssetStyleFidelityNeedsReview
          ? [uiAssetStyleFidelityIssues.join("；") || "UI资产画风校验待确认：校验模型未返回有效 JSON，已保留资产并继续生成。"]
        : uiAssetStyleFidelityIssues.length
          ? uiAssetStyleFidelityIssues
          : ["画风贴合不足：建议重新生成总资产"]
    });
  }
  detailedAnalysisBlocks.push({
    title: "当前界面组件裁剪",
    lines: [compositionSummary]
  });

  target.classList.toggle("is-empty", !screen && !state.styleReferences.length && !promptText);

  if (!screen && !state.styleReferences.length && !promptText) {
    target.innerHTML = "<span>先生成策划案和交互案，选择目标界面后，这里会汇总用于生图的信息。</span>";
    syncStyleAnalysisRefreshButtonState();
    syncUiAssetKitButtonState();
    return;
  }

  const longInfo = [
    promptText ? `用户关键词：${promptText}` : "用户关键词：未填写，将按策划案和交互案自动提炼",
    cache.status === "ready" && !totalAssetBusy
      ? `锁定分析：${lockedLabels.length ? lockedLabels.join("、") : "无参考图"}；更新时间 ${getStyleAnalysisUpdatedText(cache.updatedAt)}`
      : `参考图分析：${cacheStatus}`,
    cacheDirty ? `提示：${cache.dirtyReason || "参考图或关键词已经变化"}；点击「刷新参考图分析」后才会影响后续生成。` : "",
    assetDirty ? `总资产提示：${assetKit.dirtyReason || "参考图、关键词、策划案、交互案或模型已经变化"}；切到「总资产」Tab 并点击「重新生成总资产」后才会影响后续生成。` : "",
    screen ? `界面目标：${screen.goal || "按当前交互设计案生成"}` : "界面目标：等待选择目标界面",
    job?.status === "generating" ? `当前界面状态：${screen?.name || "当前界面"} 正在生成中` : ""
  ].filter(Boolean).join("；");

  const detailHtml = compactAnalysisBlocks(detailedAnalysisBlocks)
    .map((block) => `
      <section class="summary-detail-block">
        <h4>${escapeHtml(block.title)}</h4>
        <div class="summary-detail-list">
          ${block.lines.filter(Boolean).map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
        </div>
      </section>
    `)
    .join("");

  target.innerHTML = `
    <dl>
      <dt>当前界面</dt>
      <dd>${escapeHtml(screen?.name || selectedScreens[0]?.name || "未选择")}</dd>
      <dt>图像模型</dt>
      <dd>${escapeHtml(modelMeta.label)}</dd>
      <dt>参考图</dt>
      <dd>${escapeHtml(lockedReferenceRule)}</dd>
      <dt>分析状态</dt>
      <dd class="${cacheDirty || (isTotalAssetScreen && totalAssetDisplaySummary.failed) ? "summary-warning" : ""}">${escapeHtml(cacheStatus)}</dd>
      <dt>背景风格</dt>
      <dd>${escapeHtml(backgroundSummary)}</dd>
      <dt>点线面分析</dt>
      <dd>${escapeHtml(shapeLanguageSummary)}</dd>
      <dt>按钮形态</dt>
      <dd>${escapeHtml(buttonMorphologySummary)}</dd>
      <dt>总资产</dt>
      <dd class="${assetDirty ? "summary-warning" : ""}">${escapeHtml(assetStatus)}</dd>
      <dt>策划案</dt>
      <dd>${gameDesignReady ? "已生成 / 可编辑" : "未完成"}</dd>
      <dt>交互案</dt>
      <dd>${interactionReady ? "已生成 / 可编辑" : "未完成"}</dd>
      <dt>SVG结构</dt>
      <dd>${svgReady ? "已生成，可作为界面结构参考" : "未生成，将使用交互案结构"}</dd>
      <dt>控件基准</dt>
      <dd>${escapeHtml(controlBaselineSummary)}</dd>
      <dt>固定锚点</dt>
      <dd>${escapeHtml(lockedLayoutAnchorLabels.length ? `已锁定锚点：${lockedLayoutAnchorLabels.slice(0, 8).join("、")}${lockedLayoutAnchorLabels.length > 8 ? "..." : ""}` : "未锁定项目级锚点")}</dd>
      <dt>UI必需组件</dt>
      <dd class="${uiAssetCoverageNeedsAttention ? "summary-warning" : ""}">${escapeHtml(uiAssetCoverageSummary.statusText || uiAssetCoverageSummary.requiredText || "未抽取到交互案必需组件")}</dd>
      <dt>UI画风贴合</dt>
      <dd class="${uiAssetStyleFidelityBlocking ? "summary-warning" : ""}">${escapeHtml(uiAssetStyleFidelity ? (uiAssetStyleFidelity.ok === true ? "已通过参考图贴合校验" : uiAssetStyleFidelityNeedsReview ? `画风校验待确认：${uiAssetStyleFidelityIssues.slice(0, 2).join("、") || "校验模型未返回有效 JSON，已保留资产并继续生成"}` : `画风贴合不足：${uiAssetStyleFidelityIssues.slice(0, 2).join("、") || "建议重新生成总资产"}`) : "待 UI资产图生成后校验")}</dd>
      <dt>组件裁剪</dt>
      <dd class="${compositionState.status !== "ready" ? "summary-warning" : ""}">${escapeHtml(compositionSummary)}</dd>
      ${longInfo ? `<dd class="summary-long">${escapeHtml(longInfo)}</dd>` : ""}
    </dl>
    ${detailHtml ? `<div class="summary-details">${detailHtml}</div>` : ""}
  `;
  syncStyleAnalysisRefreshButtonState();
  syncUiAssetKitButtonState();
}

function getUiComponentBaselineState() {
  if (!state.uiComponentBaselines || typeof state.uiComponentBaselines !== "object") {
    resetUiComponentBaselines();
  }
  state.uiComponentBaselines.items ||= {};
  state.uiComponentBaselines.order ||= [];
  state.uiComponentBaselines.source ||= "none";
  state.uiComponentBaselines.assetVersion ||= "";
  state.uiComponentBaselines.coverage ||= null;
  state.uiComponentBaselines.layoutAnchors ||= [];
  return state.uiComponentBaselines;
}

function getUiComponentTypeMeta(type) {
  return UI_COMPONENT_BASELINE_TYPES.find((item) => item.id === type) || null;
}

function getLockedUiComponentBaselines() {
  const baselineState = getUiComponentBaselineState();
  const orderedTypes = [
    ...baselineState.order,
    ...Object.keys(baselineState.items).filter((type) => !baselineState.order.includes(type))
  ];

  return orderedTypes
    .map((type) => baselineState.items[type])
    .filter(Boolean)
    .map((item) => ({
      ...item,
      label: item.label || getUiComponentTypeMeta(item.type)?.label || item.type
    }));
}

function buildUiAssetCoverage(requiredComponents = [], detectedComponents = getLockedUiComponentBaselines()) {
  const required = normalizeRequiredUiAssetComponents(requiredComponents);
  const detected = Array.isArray(detectedComponents) ? detectedComponents : [];
  const detectedMap = new Map();
  detected.forEach((item) => {
    const type = normalizeUiComponentType(item?.type || item?.componentType || item?.id);
    if (!type || detectedMap.has(type)) return;
    detectedMap.set(type, {
      type,
      label: item?.label || getUiComponentTypeMeta(type)?.label || type,
      evidence: item?.evidence || item?.rules || ""
    });
  });

  const requiredTypes = new Set(required.map((item) => item.type));
  const covered = required.filter((item) => detectedMap.has(item.type));
  const missing = required.filter((item) => !detectedMap.has(item.type));
  const extra = Array.from(detectedMap.values()).filter((item) => !requiredTypes.has(item.type));
  return {
    status: missing.length ? "incomplete" : "complete",
    required,
    covered,
    missing,
    unconfirmed: [],
    extra
  };
}

function getUiAssetCoverageSummary(coverage = {}) {
  const required = normalizeRequiredUiAssetComponents(coverage.required || []);
  const missing = normalizeRequiredUiAssetComponents(coverage.missing || []);
  const unconfirmed = normalizeRequiredUiAssetComponents(coverage.unconfirmed || []);
  const needsReview = coverage.status === "needs_review" || coverage.coverageReviewRequired;
  const requiredText = summarizeRequiredUiAssetComponents(required);
  const missingText = summarizeRequiredUiAssetComponents(missing);
  const unconfirmedText = summarizeRequiredUiAssetComponents(unconfirmed);
  return {
    requiredText,
    missingText,
    unconfirmedText,
    statusText: missing.length
      ? `UI资产缺失：${missingText}`
      : unconfirmed.length
        ? `${needsReview ? "UI资产部分组件待确认" : "UI资产基准待确认"}：${unconfirmedText}${needsReview ? "；已继续生成总资产" : ""}`
      : required.length
        ? `UI资产必需组件已覆盖：${requiredText}`
        : ""
  };
}

function normalizePrimaryVisualAction(value) {
  if (!value) return { label: "", belongsTo: "", state: "", result: "" };
  if (typeof value === "object") {
    return {
      label: cleanAnalysisText(value.label || value.name || value.text || value.action || ""),
      belongsTo: cleanAnalysisText(value.belongsTo || value.region || value.area || ""),
      state: cleanAnalysisText(value.state || value.status || ""),
      result: cleanAnalysisText(value.result || value.outcome || value.description || value.purpose || "")
    };
  }
  return { label: cleanAnalysisText(value), belongsTo: "", state: "", result: "" };
}

function inferVisualLayoutType(screen = {}) {
  const text = [screen.id, screen.kind, screen.name, screen.goal].filter(Boolean).join(" ");
  if (/主界面|主场景|首页|大厅|home|hud|main/i.test(text)) return "main";
  if (/商店|商城|shop|store|gacha|抽卡/i.test(text)) return "shop-grid";
  if (/任务|成就|进度|task|quest|progress/i.test(text)) return "task-progress";
  if (/表单|设置|登录|编辑|提交|form|setting|settings/i.test(text)) return "form-flow";
  if (/背包|仓库|列表|详情|图鉴|好友|排行|管理|bag|inventory|list|detail|codex|social|leaderboard/i.test(text)) return "list-detail";
  return "default";
}

function normalizeVisualLayoutType(value = "", screen = {}) {
  const raw = cleanAnalysisText(value).toLowerCase();
  if (/main|home|hud|主/.test(raw)) return "main";
  if (/shop|grid|store|商城|商店|抽卡/.test(raw)) return "shop-grid";
  if (/list|detail|列表|详情|背包|图鉴|好友|排行|管理/.test(raw)) return "list-detail";
  if (/task|progress|quest|任务|进度|成就/.test(raw)) return "task-progress";
  if (/form|flow|step|表单|流程|设置|编辑/.test(raw)) return "form-flow";
  return inferVisualLayoutType(screen);
}

function hasUiAssetCoverageEvidence(coverage = {}, detectedComponents = []) {
  const detected = Array.isArray(detectedComponents) ? detectedComponents : [];
  return detected.some((item) => normalizeUiComponentType(item?.type || item?.componentType || item?.id))
    || normalizeRequiredUiAssetComponents(coverage.covered || []).length > 0
    || normalizeRequiredUiAssetComponents(coverage.unconfirmed || []).length > 0
    || normalizeCoverageComponentList(coverage.extra || []).length > 0;
}

function downgradeUiAssetCoverageMissingToReview(coverage = {}, detectedComponents = [], options = {}) {
  const missing = normalizeRequiredUiAssetComponents(coverage?.missing || []);
  const unconfirmed = normalizeRequiredUiAssetComponents(coverage?.unconfirmed || []);
  const hasEvidence = hasUiAssetCoverageEvidence(coverage, detectedComponents)
    || Boolean(options.generatedAssetImage && options.sectionedAssetBoard);
  if (!missing.length || !hasEvidence) {
    return {
      coverage,
      downgraded: false,
      missing,
      unconfirmed
    };
  }

  const reviewItems = missing.map((item) => ({
    ...item,
    status: "reported_missing_needs_review",
    evidence: item.evidence
      ? `${item.evidence}（覆盖分析待复核）`
      : "覆盖分析待复核"
  }));
  const nextUnconfirmed = normalizeRequiredUiAssetComponents([...unconfirmed, ...reviewItems]);
  return {
    coverage: {
      ...coverage,
      status: "needs_review",
      missing: [],
      unconfirmed: nextUnconfirmed,
      reportedMissing: missing,
      coverageReviewRequired: true,
      coverageReviewReason: options.sectionedAssetBoard
        ? "UI资产图已按 A-H 分区生成，coverage.missing 降级为待确认，避免视觉模型漏识别导致误报。"
        : "UI资产图已生成且存在已识别组件，coverage.missing 降级为待确认，避免误报中断总资产生成。"
    },
    downgraded: true,
    missing: [],
    unconfirmed: nextUnconfirmed,
    reportedMissing: missing
  };
}

function clearUiAssetCoverageFromAnalysis(analysis) {
  if (!analysis || typeof analysis !== "object") return analysis || null;
  const next = { ...analysis };
  delete next.uiAssetCoverage;
  return next;
}

function getPendingUiComponentBaselineTypes() {
  const items = getUiComponentBaselineState().items;
  return UI_COMPONENT_BASELINE_TYPES.filter((type) => !items[type.id]);
}

function getBaselineLookupText(screen, designComposition = null) {
  const composition = normalizeDesignCompositionAnalysis(designComposition || getStoredDesignCompositionAnalysis(screen), screen);
  const compositionItems = composition
    ? [
      ...(composition.requiredComponents || []),
      ...(composition.optionalComponents || []),
      ...(composition.layoutSlots || []),
      ...(composition.primaryActions || []),
      ...(composition.stateWidgets || []),
      ...(composition.systemEntrances || []),
      ...(composition.persistentAnchors || [])
    ].map((item) => [item.name, item.type, item.reason, item.source, item.priority].filter(Boolean).join(" "))
    : [];
  const screenPlan = extractScreenSection(getVisualPlanText(), screen) || "";
  return [
    screen?.id,
    screen?.name,
    screen?.kind,
    screen?.goal,
    screen?.coreAction,
    screen?.keyState,
    getScreenCloseBehavior(screen),
    composition?.screenGoal,
    composition?.titlePolicy,
    composition?.resourceBarPolicy,
    ...(composition?.anchorExceptions || []),
    ...compositionItems,
    screenPlan.slice(0, 1800)
  ].filter(Boolean).join(" ");
}

function getRequiredUiComponentBaselineTypes(screen, designComposition = null) {
  const text = getBaselineLookupText(screen, designComposition);
  const composition = normalizeDesignCompositionAnalysis(designComposition || getStoredDesignCompositionAnalysis(screen), screen);
  const screenPlan = extractScreenSection(getVisualPlanText(), screen) || "";
  const required = new Set();
  const add = (type) => {
    if (getUiComponentTypeMeta(type)) required.add(type);
  };
  const anchorText = (composition?.persistentAnchors || [])
    .map((item) => [item.name, item.type, item.reason].filter(Boolean).join(" "))
    .join(" ");
  const resourcePolicy = String(composition?.resourceBarPolicy || "").toLowerCase();

  if (/返回|后退|上一页|back|return/i.test(text) || /back|返回|后退/i.test(anchorText)) add("back_button");
  if (/关闭|close|退出弹窗/i.test(text) || /close|关闭/i.test(anchorText)) add("close_button");
  if (/设置|齿轮|setting|settings|gear/i.test(text) || /settings|设置/i.test(anchorText)) add("settings_button");
  if (/主页|首页|home/i.test(text) || /home|主页|首页/i.test(anchorText)) add("home_button");

  if (resourcePolicy && resourcePolicy !== "none") {
    add("resource_token");
    add("resource_icon");
  } else if (/资源栏|资源条|货币|金币|钻石|体力|能量|token|currency|coin|gem|stamina|resource/i.test(text)) {
    add("resource_token");
    add("resource_icon");
  }

  if (/tab|tabs|页签|标签页|标签栏|分类|分段|切换栏|segment|segmented/i.test(text)) {
    add("tab_default");
    add("tab_selected");
  }
  if (/底部导航|底栏|底部栏|主导航|bottom nav|bottom_nav|nav bar|navigation bar|导航栏/i.test(text)) {
    add("bottom_nav_default");
    add("bottom_nav_selected");
    add("nav_icon");
  }
  if (/图标按钮|工具按钮|筛选|搜索|帮助|问号|加号|减号|确认图标|icon button|icon_button/i.test(text)) add("icon_button");
  if (/主按钮|确认|保存|购买|领取|开始|继续|升级|primary button|cta/i.test(text)) add("button_primary");
  if (/取消|返回列表|次按钮|secondary button|弱按钮|disabled|禁用/i.test(text)) {
    add("button_secondary");
    add("button_weak");
  }
  if (/进度|状态条|经验|等级|血量|生命|好感|装饰值|活跃度|progress|progress bar|status bar/i.test(text)) add("progress_bar");
  if (/面板|卡片|列表项|详情区|弹窗|modal|dialog|panel|card/i.test(text)) {
    add("panel_card");
    if (/弹窗|modal|dialog|popup/i.test(text)) add("modal");
  }
  if (/列表|列表项|任务列表|商品列表|好友列表|排行|记录|list item/i.test(text)) add("list_item");
  if (/道具格|物品格|格子|背包格|装备槽|槽位|item slot|inventory slot/i.test(text)) add("item_slot");
  if (/头像框|头像|玩家头像|角色头像|avatar|portrait/i.test(text)) add("avatar_frame");
  if (/提示框|提示气泡|轻提示|tooltip|toast|hint bubble/i.test(text)) add("tooltip");
  if (/徽标|红点|角标|badge|notification/i.test(text)) add("badge");
  if (isPrimaryScreenForTitle(screen, screenPlan)) add("screen_title");

  const forbiddenText = [
    ...(composition?.forbiddenComponents || []),
    ...(composition?.negativePromptRules || [])
  ].map((item) => typeof item === "string" ? item : [item.name, item.type, item.reason].filter(Boolean).join(" ")).join(" ");
  if (/返回|后退|back|return/i.test(forbiddenText)) required.delete("back_button");
  if (/关闭|close/i.test(forbiddenText)) required.delete("close_button");
  if (/设置|setting|settings|gear/i.test(forbiddenText)) required.delete("settings_button");
  if (/主页|首页|home/i.test(forbiddenText)) required.delete("home_button");
  if (/资源栏|资源条|货币|金币|钻石|体力|resource|currency|token/i.test(forbiddenText)) {
    required.delete("resource_token");
    required.delete("resource_icon");
  }
  if (/tab|页签|标签页|分类|分段/i.test(forbiddenText)) {
    required.delete("tab_default");
    required.delete("tab_selected");
  }
  if (/底部导航|底栏|主导航|bottom nav|navigation bar/i.test(forbiddenText)) {
    required.delete("bottom_nav_default");
    required.delete("bottom_nav_selected");
  }
  if (isNoNavigationCloseBehavior(getScreenCloseBehavior(screen))) {
    required.delete("back_button");
    required.delete("close_button");
    required.delete("home_button");
  }

  return UI_COMPONENT_BASELINE_TYPES
    .map((item) => item.id)
    .filter((type) => required.has(type));
}

function getRelevantUiComponentBaselines(screen, designComposition = null) {
  const requiredTypes = getRequiredUiComponentBaselineTypes(screen, designComposition);
  if (!requiredTypes.length) return [];
  const required = new Set(requiredTypes);
  return getLockedUiComponentBaselines().filter((item) => required.has(item.type));
}

function getLockedProjectLayoutAnchors(screen = null, designComposition = null) {
  const anchors = normalizeProjectLayoutAnchors(getUiComponentBaselineState().layoutAnchors || []);
  if (!screen) return anchors;
  const requiredTypes = new Set(getRequiredUiComponentBaselineTypes(screen, designComposition));
  return anchors.filter((item) => !item.type || requiredTypes.has(item.type));
}

function buildUiComponentBaselinePrompt(screen = null, designComposition = null) {
  const locked = screen ? getRelevantUiComponentBaselines(screen, designComposition) : getLockedUiComponentBaselines();
  const pending = getPendingUiComponentBaselineTypes();
  const anchors = getLockedProjectLayoutAnchors(screen, designComposition);
  const anchorPrompt = formatProjectLayoutAnchorsForPrompt(anchors);

  if (!locked.length) {
    return [
      "UI资产图尚未完成可用的组件级基准分析。",
      "普通界面仍必须把 UI控件资产图作为控件形态唯一来源；不得从当前普通界面反向沉淀新控件基准。",
      "如果当前界面需要返回、资源 token、Tab、底部导航、界面标题等通用控件，必须优先贴合 UI控件资产图里的同类形态。",
      `已锁定项目级位置锚点：\n${anchorPrompt}`
    ].join("\n");
  }

  return [
    "已锁定 UI控件资产图组件基准；这些是跨界面控件形态的唯一来源，不得被普通界面或原始参考图覆盖：",
    ...locked.map((item, index) => {
      const source = item.sourceScreenName ? `来源：${item.sourceScreenName}` : "来源：UI控件资产图";
      const details = [
        item.rules,
        item.stateRules ? `状态=${item.stateRules}` : "",
        item.iconCarrierRules ? `图标承载=${item.iconCarrierRules}` : "",
        item.positionRules ? `位置=${item.positionRules}` : ""
      ].filter(Boolean).join("；");
      return `${index + 1}. ${item.label}（${item.type}，${source}）：${details}`;
    }),
    `已锁定项目级位置锚点：\n${anchorPrompt}`,
    pending.length
      ? `UI资产图中尚未提取到的控件类型：${pending.map((item) => item.label).join("、")}。若当前界面必须出现这些控件，只能从 UI控件资产图的同族形状、材质、描边、图标承载和状态规则外推，不得用默认模板。`
      : "常见通用控件类型已全部锁定。",
    "返回按钮必须继承 UI资产图里的箭头形态、外框轮廓、黑白红配色、粗描边、斜切/碎片边缘、半调纹理和状态差异，不得改成普通矩形返回条。",
    "返回按钮、关闭按钮、设置按钮、资源 token、Tab 默认/选中态、底部导航默认/选中态和界面标题区必须继承基准的外轮廓、描边层数、材质、高光、阴影、图标承载容器和状态差异。",
    "同权重按钮必须保持强关联：形状语言、材质、描边、阴影、字体和图标承载方式一致；不同权重按钮允许层级差异，但必须属于同一套 UI资产设计系统。"
  ].join("\n");
}

function cleanUiComponentBaselineRuleForImagePrompt(value, maxChars = 220) {
  const text = normalizeUiComponentRules(value)
    .replace(/\b(shapeRules|colorRules|materialRules|strokeRules|iconCarrierRules|stateRules|usageRules|positionRules|anchorRules|layoutRules|visualAnchor|rules|present|confidence|evidence|type|label)\s*[：:]/gi, "")
    .replace(/[{}\[\]"]/g, "")
    .replace(/\b(true|false|null|undefined)\b/gi, "")
    .replace(/\s*,\s*/g, "；")
    .replace(/\s+/g, " ")
    .replace(/；{2,}/g, "；")
    .replace(/^；|；$/g, "")
    .trim();
  return compactRepeatedSummarySegments(text, maxChars);
}

function formatUiComponentBaselineForImagePrompt(screen = null, designComposition = null) {
  const locked = screen ? getRelevantUiComponentBaselines(screen, designComposition) : getLockedUiComponentBaselines();
  const pending = getPendingUiComponentBaselineTypes();
  const anchors = getLockedProjectLayoutAnchors(screen, designComposition);
  const anchorPrompt = formatProjectLayoutAnchorsForPrompt(anchors);

  if (!locked.length) {
    return [
      "当前没有已缓存的组件级基准；仍必须直接观察随请求附带的 UI控件资产图，把它作为控件形态唯一来源。",
      "需要返回、关闭、资源 Token、Tab、底部导航、界面标题、面板、列表项、道具格、图标按钮等通用控件时，只能按 UI控件资产图里的最近邻控件外推。",
      "不得使用默认网页控件、通用手游模板控件或重新发明按钮；不得因为原始参考图里有不同控件而覆盖 UI控件资产图。",
      anchorPrompt ? `项目位置锚点：${anchorPrompt}` : ""
    ].filter(Boolean).join("\n");
  }

  const lines = locked.slice(0, 12).map((item, index) => {
    const label = item.label || getUiComponentTypeMeta(item.type)?.label || item.type || "通用控件";
    const source = item.sourceScreenName || "UI控件资产图";
    const mainRules = cleanUiComponentBaselineRuleForImagePrompt(item.rules, 260);
    const stateRules = cleanUiComponentBaselineRuleForImagePrompt(item.stateRules, 170);
    const carrierRules = cleanUiComponentBaselineRuleForImagePrompt(item.iconCarrierRules, 150);
    const positionRules = cleanUiComponentBaselineRuleForImagePrompt(item.positionRules, 150);
    const ruleParts = [
      mainRules ? `复用${mainRules}` : "复用 UI控件资产图中同类控件的外轮廓、材质、描边、高光、阴影和字体气质",
      carrierRules ? `图标承载保持${carrierRules}` : "",
      stateRules ? `状态差异保持${stateRules}` : "",
      positionRules ? `布局位置遵守${positionRules}` : ""
    ].filter(Boolean);
    return `${index + 1}. ${label}：来自${source}；${ruleParts.join("；")}。`;
  });

  return [
    "已缓存的 UI资产组件基准已转换为生图规则；以下控件形态必须继承 UI控件资产图，不得被原始参考图覆盖：",
    ...lines,
    anchorPrompt ? `项目位置锚点：${anchorPrompt}` : "",
    pending.length
      ? `尚未缓存的控件类型：${pending.map((item) => item.label).join("、")}；如果当前界面必须使用，只能按 UI控件资产图最近邻控件外推。`
      : "常见通用控件类型已有缓存基准；所有同族控件必须保持同一套项目 UI 设计系统。",
    "返回、关闭、主页控件必须服从当前界面关闭方式；默认根界面不得添加返回、关闭或主页控件。"
  ].filter(Boolean).join("\n");
}

function getUiComponentBaselineReferenceItems(maxCount = 3) {
  const seen = new Set();
  const refs = [];
  for (const baseline of getLockedUiComponentBaselines()) {
    if (!baseline.imageUrl || seen.has(baseline.imageUrl)) continue;
    seen.add(baseline.imageUrl);
    refs.push({
      imageUrl: baseline.imageUrl,
      label: `控件基准-${baseline.sourceScreenName || baseline.label}`
    });
    if (refs.length >= maxCount) break;
  }
  return refs;
}

function normalizeUiComponentType(type) {
  const value = String(type || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  const aliasMap = {
    resource: "resource_token",
    resources: "resource_token",
    resource_bar: "resource_token",
    resources_bar: "resource_token",
    currency_bar: "resource_token",
    resource_pill: "resource_token",
    resource_capsule: "resource_token",
    currency_pill: "resource_token",
    currency_capsule: "resource_token",
    coin_pill: "resource_token",
    gem_pill: "resource_token",
    token_pill: "resource_token",
    resource_token: "resource_token",
    currency: "resource_token",
    currency_token: "resource_token",
    token: "resource_token",
    currency_icon: "resource_icon",
    resource_icon: "resource_icon",
    screen_title: "screen_title",
    title_plate: "screen_title",
    title_zone: "screen_title",
    title_panel: "screen_title",
    title_frame: "screen_title",
    header: "screen_title",
    header_bar: "screen_title",
    page_header: "screen_title",
    screen_header: "screen_title",
    title: "screen_title",
    title_area: "screen_title",
    title_bar: "screen_title",
    page_title: "screen_title",
    header_title: "screen_title",
    "资源栏": "resource_token",
    "资源条": "resource_token",
    "资源_token": "resource_token",
    "资源token": "resource_token",
    "货币胶囊": "resource_token",
    "资源图标": "resource_icon",
    "界面标题": "screen_title",
    "界面标题区": "screen_title",
    "页面标题": "screen_title",
    "标题区": "screen_title",
    "标题栏": "screen_title",
    back: "back_button",
    return: "back_button",
    return_button: "back_button",
    "返回": "back_button",
    "返回按钮": "back_button",
    "后退": "back_button",
    close: "close_button",
    "关闭": "close_button",
    "关闭按钮": "close_button",
    setting: "settings_button",
    settings: "settings_button",
    gear: "settings_button",
    "设置": "settings_button",
    "设置按钮": "settings_button",
    home: "home_button",
    "主页": "home_button",
    "首页": "home_button",
    icon: "icon_button",
    button: "button_primary",
    action_button: "button_primary",
    cta: "button_primary",
    cta_button: "button_primary",
    confirm_button: "button_primary",
    submit_button: "button_primary",
    save_button: "button_primary",
    start_button: "button_primary",
    "按钮": "button_primary",
    "主按钮": "button_primary",
    "次按钮": "button_secondary",
    "弱按钮": "button_weak",
    "禁用按钮": "button_disabled",
    "图标按钮": "icon_button",
    nav: "nav_icon",
    navigation_icon: "nav_icon",
    navigation: "nav_icon",
    "导航图标": "nav_icon",
    tab: "tab_default",
    inactive_tab: "tab_default",
    default_tab: "tab_default",
    tab_inactive: "tab_default",
    selected_tab: "tab_selected",
    active_tab: "tab_selected",
    tab_active: "tab_selected",
    "页签": "tab_default",
    "标签页": "tab_default",
    "tab默认态": "tab_default",
    "tab选中态": "tab_selected",
    bottom_nav: "bottom_nav_default",
    bottom_navigation: "bottom_nav_default",
    bottom_nav_inactive: "bottom_nav_default",
    bottom_nav_default: "bottom_nav_default",
    bottom_nav_active: "bottom_nav_selected",
    bottom_nav_selected: "bottom_nav_selected",
    nav_selected: "bottom_nav_selected",
    "底部导航": "bottom_nav_default",
    "底部导航默认态": "bottom_nav_default",
    "底部导航选中态": "bottom_nav_selected",
    primary_button: "button_primary",
    main_button: "button_primary",
    secondary_button: "button_secondary",
    weak_button: "button_weak",
    disabled_button: "button_disabled",
    progress: "progress_bar",
    progressbar: "progress_bar",
    status_bar: "progress_bar",
    "进度条": "progress_bar",
    "状态条": "progress_bar",
    card: "panel_card",
    card_panel: "panel_card",
    content_panel: "panel_card",
    detail_panel: "panel_card",
    info_panel: "panel_card",
    panel: "panel_card",
    "卡片": "panel_card",
    "面板": "panel_card",
    popup: "modal",
    dialog: "modal",
    "弹窗": "modal",
    "对话框": "modal",
    list: "list_item",
    list_item: "list_item",
    list_row: "list_item",
    row_item: "list_item",
    table_row: "list_item",
    menu_row: "list_item",
    row: "list_item",
    "列表": "list_item",
    "列表项": "list_item",
    item: "item_slot",
    item_slot: "item_slot",
    prop_slot: "item_slot",
    inventory_slot: "item_slot",
    slot: "item_slot",
    "道具格": "item_slot",
    "物品格": "item_slot",
    "背包格": "item_slot",
    avatar: "avatar_frame",
    avatar_frame: "avatar_frame",
    profile_frame: "avatar_frame",
    profile_avatar: "avatar_frame",
    player_avatar: "avatar_frame",
    portrait_plate: "avatar_frame",
    portrait: "avatar_frame",
    portrait_frame: "avatar_frame",
    "头像": "avatar_frame",
    "头像框": "avatar_frame",
    tooltip: "tooltip",
    toast: "tooltip",
    hint: "tooltip",
    bubble: "tooltip",
    "提示框": "tooltip",
    "提示气泡": "tooltip",
    tag: "badge",
    "红点": "badge",
    "角标": "badge",
    "徽标": "badge"
  };
  const normalized = aliasMap[value] || value;
  if (!getUiComponentTypeMeta(normalized)) {
    const loose = value.replace(/[_/|,，、]+/g, " ");
    if (/返回|后退|back|return/i.test(loose)) return "back_button";
    if (/关闭|close|dismiss/i.test(loose)) return "close_button";
    if (/设置|齿轮|setting|gear/i.test(loose)) return "settings_button";
    if (/主页|首页|home/i.test(loose)) return "home_button";
    if (/资源图标|货币图标|resource icon|currency icon/i.test(loose)) return "resource_icon";
    if (/资源|货币|金币|钻石|体力|token|currency|resource|coin pill|gem pill|currency pill|resource bar/i.test(loose)) return "resource_token";
    if (/界面标题|页面标题|标题区|标题栏|主标题|screen title|title area|title bar|title plate|title zone|header/i.test(loose)) return "screen_title";
    if (/底部导航|bottom nav|bottom navigation/i.test(loose) && /选中|selected|active/i.test(loose)) return "bottom_nav_selected";
    if (/底部导航|bottom nav|bottom navigation/i.test(loose)) return "bottom_nav_default";
    if (/tab|页签|标签页/i.test(loose) && /选中|selected|active/i.test(loose)) return "tab_selected";
    if (/tab|页签|标签页/i.test(loose)) return "tab_default";
    if (/图标按钮|icon button|tool button/i.test(loose)) return "icon_button";
    if (/主按钮|确认|保存|开始|action button|primary|cta|confirm|submit|save|start/i.test(loose)) return "button_primary";
    if (/次按钮|secondary/i.test(loose)) return "button_secondary";
    if (/弱按钮|weak/i.test(loose)) return "button_weak";
    if (/禁用按钮|disabled/i.test(loose)) return "button_disabled";
    if (/进度|状态条|progress|status bar/i.test(loose)) return "progress_bar";
    if (/弹窗|对话框|modal|dialog|popup/i.test(loose)) return "modal";
    if (/列表|list item|list row|menu row|table row|list/i.test(loose)) return "list_item";
    if (/道具格|物品格|背包格|装备槽|item slot|inventory slot|slot/i.test(loose)) return "item_slot";
    if (/头像框|头像|profile frame|player avatar|avatar|portrait/i.test(loose)) return "avatar_frame";
    if (/提示框|提示气泡|tooltip|toast|hint/i.test(loose)) return "tooltip";
    if (/红点|角标|徽标|badge|notification/i.test(loose)) return "badge";
    if (/面板|卡片|panel|card/i.test(loose)) return "panel_card";
  }
  return getUiComponentTypeMeta(normalized) ? normalized : "";
}

function normalizeUiComponentRules(value) {
  if (!value) return "";
  if (Array.isArray(value)) {
    return value.map(normalizeUiComponentRules).filter(Boolean).join("；");
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => `${key}：${normalizeUiComponentRules(item)}`)
      .filter((item) => item && !item.endsWith("："))
      .join("；");
  }
  return String(value).replace(/\s+/g, " ").trim().slice(0, 700);
}

function normalizeCoverageComponentList(value) {
  const source = Array.isArray(value) ? value : [];
  return source
    .map((item) => {
      const type = normalizeUiComponentType(item?.type || item?.componentType || item?.id || item?.name || item);
      if (!type) return null;
      const meta = getUiComponentTypeMeta(type);
      return {
        type,
        label: item?.label || item?.name || meta?.label || type,
        evidence: normalizeUiComponentRules(item?.evidence || item?.reason || item?.source || item?.notes || item?.description || item)
      };
    })
    .filter(Boolean);
}

function normalizeUiAssetCoverageResult(value, requiredComponents = [], detectedComponents = getLockedUiComponentBaselines()) {
  const localCoverage = buildUiAssetCoverage(requiredComponents, detectedComponents);
  if (!value || typeof value !== "object") return localCoverage;
  const hasCoverageFields = Array.isArray(value.covered) || Array.isArray(value.missing);
  if (!hasCoverageFields) return localCoverage;
  const coveredFromModel = normalizeCoverageComponentList(value.covered || []);
  const missingFromModel = normalizeCoverageComponentList(value.missing || []);
  const coveredTypes = new Set([
    ...localCoverage.covered.map((item) => item.type),
    ...coveredFromModel.map((item) => item.type)
  ]);
  const missingTypesFromModel = new Set(missingFromModel.map((item) => item.type));
  const covered = normalizeRequiredUiAssetComponents([
    ...localCoverage.covered,
    ...coveredFromModel
  ]);
  const missing = localCoverage.required
    .filter((item) => !coveredTypes.has(item.type) && missingTypesFromModel.has(item.type))
    .map((item) => missingFromModel.find((candidate) => candidate.type === item.type) || item);
  const unconfirmed = coveredFromModel
    .filter((item) => !localCoverage.covered.some((candidate) => candidate.type === item.type))
    .map((item) => ({ ...item, status: "covered_unlocked" }));
  return {
    ...localCoverage,
    status: missing.length ? "incomplete" : "complete",
    covered: covered.length ? covered : localCoverage.covered,
    missing,
    unconfirmed,
    assetVersion: value.assetVersion || localCoverage.assetVersion || ""
  };
}

function normalizeUiComponentBaselineAnalysisResult(raw, requiredComponents = []) {
  const parsed = typeof raw === "string" ? parseJsonObjectFromText(raw) : raw;
  if (!parsed || typeof parsed !== "object") {
    return {
      components: [],
      coverage: buildUiAssetCoverage(requiredComponents, []),
      layoutAnchors: []
    };
  }

  const sourceItems = Array.isArray(parsed.components)
    ? parsed.components
    : Array.isArray(parsed.baselines)
      ? parsed.baselines
      : Array.isArray(parsed.items)
        ? parsed.items
        : [];

  const components = sourceItems
    .map((item) => {
      const type = normalizeUiComponentType(item?.type || item?.componentType || item?.id);
      if (!type || item?.present === false) return null;
      const rules = normalizeUiComponentRules([
        item?.rules || item?.styleRules || item?.description || item?.style,
        item?.shapeRules,
        item?.colorRules,
        item?.materialRules,
        item?.strokeRules,
        item?.iconCarrierRules || item?.iconRules,
        item?.stateRules,
        item?.usageRules,
        item?.positionRules || item?.anchorRules || item?.layoutRules,
        item?.visualAnchor,
        item?.state,
        item?.boundary
      ].filter(Boolean));
      if (!rules || rules.length < 10) return null;
      return {
        type,
        rules,
        evidence: normalizeUiComponentRules(item?.evidence || item?.position || item?.notes || item?.source),
        stateRules: normalizeUiComponentRules(item?.stateRules || item?.state),
        usageRules: normalizeUiComponentRules(item?.usageRules || item?.boundary),
        iconCarrierRules: normalizeUiComponentRules(item?.iconCarrierRules || item?.iconRules),
        positionRules: normalizeUiComponentRules(item?.positionRules || item?.anchorRules || item?.layoutRules || item?.visualAnchor),
        confidence: Number(item?.confidence || 0)
      };
    })
    .filter(Boolean);
  const modelCovered = normalizeCoverageComponentList(parsed.coverage?.covered || parsed.uiAssetCoverage?.covered || []);
  const componentsByType = new Set(components.map((item) => item.type));
  modelCovered.forEach((item) => {
    if (componentsByType.has(item.type)) return;
    const rules = normalizeUiComponentRules([
      item.evidence,
      `${item.label || item.type} 在 UI资产图中被组件覆盖分析识别为已出现；普通界面应按该图中同族控件的外轮廓、材质、描边、光影和状态规则复用。`
    ]);
    if (!rules || rules.length < 10) return;
    components.push({
      type: item.type,
      rules,
      evidence: item.evidence || "coverage.covered",
      stateRules: "",
      usageRules: "coverage covered but component rules were not explicit; use same-family UI asset sheet rules only.",
      iconCarrierRules: "",
      positionRules: "",
      confidence: 0.55
    });
    componentsByType.add(item.type);
  });
  return {
    components,
    coverage: normalizeUiAssetCoverageResult(parsed.coverage || parsed.uiAssetCoverage, requiredComponents, components),
    layoutAnchors: normalizeProjectLayoutAnchors(parsed.layoutAnchors || parsed.anchors || parsed.projectAnchors || [])
  };
}

function normalizeUiComponentBaselineAnalysis(raw) {
  return normalizeUiComponentBaselineAnalysisResult(raw).components;
}

async function generateUiComponentBaselineAnalysisWithApi(screen, source = {}) {
  const imageUrl = source.imageUrl || source.referenceDataUrl || "";
  if (window.location.protocol === "file:" || !imageUrl) return "";
  const requiredUiAssetComponents = normalizeRequiredUiAssetComponents(source.requiredUiAssetComponents || []);
  const projectAnchorPolicy = normalizeProjectLayoutAnchors(source.projectAnchorPolicy || []);

  const response = await fetch("/api/generate-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      task: "component-baseline-analysis",
      source: source.source || "ui-asset",
      baselineSource: source.baselineSource || "ui-asset",
      model: getSelectedTextModel("interactionModel"),
      projectName: state.gameName || gameName.value || detectGameName(briefText.value.trim()) || "未命名小游戏",
      platform: getPlatformText($("#platform").value),
      screen: {
        id: screen.id,
        name: screen.name,
        kind: screen.kind,
        goal: screen.goal,
        closeBehavior: getScreenCloseBehavior(screen)
      },
      componentTypes: UI_COMPONENT_BASELINE_TYPES,
      existingBaselines: getLockedUiComponentBaselines().map((item) => ({
        type: item.type,
        label: item.label,
        sourceScreenName: item.sourceScreenName,
        rules: item.rules,
        stateRules: item.stateRules,
        iconCarrierRules: item.iconCarrierRules,
        positionRules: item.positionRules
      })),
      requiredUiAssetComponents,
      projectAnchorPolicy,
      uiAssetBoardSectionSpec: formatUiAssetBoardSectionSpecForPrompt(requiredUiAssetComponents, projectAnchorPolicy),
      retryMissingComponents: normalizeRequiredUiAssetComponents(source.retryMissingComponents || []),
      gameDesign: getPlanningDocument().slice(0, 7000),
      interactionPlan: getVisualPlanText().slice(0, 6000),
      currentScreenPlan: (extractScreenSection(getVisualPlanText(), screen) || "").slice(0, 3000),
      visualStructure: getVisualAnalysisSource(screen).slice(0, 2200),
      referenceImages: [imageUrl]
    })
  });

  if (!response.ok) {
    throw new Error(`控件基准分析失败：${response.status}`);
  }
  const data = await response.json().catch(() => ({}));
  return data.content || data.plan || "";
}

function normalizeUiAssetStyleFidelityResult(raw, assetVersion = "") {
  const parsed = typeof raw === "string" ? parseJsonObjectFromText(raw) : raw;
  if (!parsed || typeof parsed !== "object") {
    return {
      ok: null,
      status: "needs_review",
      score: 0,
      issues: ["UI资产画风校验待确认：校验模型未返回有效 JSON，已保留资产并继续生成。"],
      styleDistanceWarnings: [],
      needsReview: true,
      blocking: false,
      assetVersion
    };
  }
  const status = cleanAnalysisText(parsed.status || parsed.analysisStatus || parsed.result || "");
  const issues = normalizeAnalysisList(parsed.issues || parsed.missing || parsed.failures || parsed.problems);
  const warnings = normalizeAnalysisList(parsed.styleDistanceWarnings || parsed.warnings || parsed.driftWarnings);
  const scoreSource = parsed.score ?? parsed.fidelityScore ?? parsed.styleSimilarityScore;
  const hasScore = scoreSource !== undefined && scoreSource !== null && `${scoreSource}`.trim() !== "";
  const score = hasScore ? Number(scoreSource) || 0 : 0;
  const reviewStatus = /needs[_-]?review|待确认|无法判断|不能判断|unknown|uncertain/i.test(status);
  const passed = !reviewStatus && (parsed.ok === true
    || /pass|passed|ok|complete|通过|贴合/i.test(status)
    || (score >= 0.72 && !issues.length));
  const explicitFailure = parsed.ok === false && (
    issues.length > 0
    || warnings.length > 0
    || (hasScore && score < 0.72)
    || /fail|failed|不通过|不足|偏离|不贴合/i.test(status)
  );
  const needsReview = !passed && !explicitFailure;
  const normalizedIssues = needsReview && !issues.length && !warnings.length
    ? ["UI资产画风校验待确认：校验结果字段不完整，已保留资产并继续生成。"]
    : issues;
  return {
    ok: passed ? true : explicitFailure ? false : null,
    status: passed ? (status || "passed") : explicitFailure ? (status || "failed") : "needs_review",
    score,
    issues: normalizedIssues,
    styleDistanceWarnings: warnings,
    mustKeep: normalizeAnalysisList(parsed.mustKeep || parsed.referenceStyleLocks),
    mustAvoid: normalizeAnalysisList(parsed.mustAvoid || parsed.antiGenericRules),
    needsReview,
    blocking: explicitFailure,
    assetVersion
  };
}

function isUiAssetStyleFidelityNeedsReview(styleFidelity) {
  if (!styleFidelity) return false;
  return styleFidelity.needsReview === true || /needs_review|review|待确认/i.test(styleFidelity.status || "");
}

function isUiAssetStyleFidelityBlocking(styleFidelity) {
  if (!styleFidelity) return false;
  return styleFidelity.blocking === true || (styleFidelity.ok === false && !isUiAssetStyleFidelityNeedsReview(styleFidelity));
}

async function generateUiAssetStyleFidelityCheckWithApi({ uiAssetImage, referenceImages = [], analysis = null, assetVersion = "" } = {}) {
  if (window.location.protocol === "file:" || !uiAssetImage) {
    return { ok: true, status: "skipped", score: 1, issues: [], styleDistanceWarnings: [], assetVersion };
  }
  const response = await fetch("/api/generate-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      task: "ui-asset-style-fidelity-check",
      model: getSelectedTextModel("interactionModel"),
      projectName: state.gameName || gameName.value || detectGameName(briefText.value.trim()) || "未命名小游戏",
      platform: getPlatformText($("#platform").value),
      referenceEvidenceSet: analysis?.referenceEvidenceSet || [],
      mergedStyleEvidence: analysis?.mergedStyleEvidence || analysis?.referenceEvidence || {},
      styleDNA: analysis?.styleDNA || {},
      colorSystem: analysis?.colorSystem || {},
      designTokens: analysis?.designTokens || {},
      styleFidelityDigest: buildTotalAssetStyleFidelityDigest(analysis, "ui"),
      referenceImages: [uiAssetImage, ...referenceImages].filter(Boolean).slice(0, DESIGN_REFERENCE_LIMIT)
    })
  });
  if (!response.ok) {
    throw new Error(`UI资产画风贴合校验失败：${response.status}`);
  }
  const data = await response.json().catch(() => ({}));
  return normalizeUiAssetStyleFidelityResult(data.content || data.plan || data.analysis || "", assetVersion);
}

function addUiComponentBaselines(components, source = {}) {
  if (!Array.isArray(components) || !components.length) return [];
  const baselineState = getUiComponentBaselineState();
  const added = [];
  components.forEach((component) => {
    const meta = getUiComponentTypeMeta(component.type);
    if (!meta || baselineState.items[component.type]) return;
    const item = {
      status: "ready",
      type: component.type,
      label: meta.label || component.type,
      source: source.source || "ui-asset",
      sourceScreenId: source.sourceScreenId || UI_ASSET_DESIGN_SCREEN_ID,
      sourceScreenName: source.sourceScreenName || "UI控件资产图",
      imageUrl: source.imageUrl || "",
      rules: component.rules,
      evidence: component.evidence,
      stateRules: component.stateRules || "",
      usageRules: component.usageRules || "",
      iconCarrierRules: component.iconCarrierRules || "",
      positionRules: component.positionRules || "",
      confidence: component.confidence || 0,
      createdAt: Date.now()
    };
    baselineState.items[component.type] = item;
    if (!baselineState.order.includes(component.type)) {
      baselineState.order.push(component.type);
    }
    added.push(item);
  });
  return added;
}

function getUiAssetComponentBaselineVersion(kit = state.totalAssetKit?.ui || state.uiAssetKit || {}) {
  if (kit.status !== "ready" || !kit.imageUrl) return "";
  return String(kit.imageUrl);
}

async function ensureUiAssetComponentBaselines({ force = false, requiredUiAssetComponents = null, projectAnchorPolicy = null } = {}) {
  const kit = state.totalAssetKit?.ui || state.uiAssetKit || {};
  if (kit.status !== "ready" || !kit.imageUrl) return [];
  let referenceDataUrl = kit.referenceDataUrl || "";
  if (!referenceDataUrl.startsWith("data:image/")) {
    referenceDataUrl = await ensureUiAssetReferenceDataUrl();
  }
  if (!referenceDataUrl) return [];

  const projectContext = buildTotalAssetProjectContext(getUiAssetDesignScreen());
  const required = normalizeRequiredUiAssetComponents(
    requiredUiAssetComponents
    || state.totalAssetKit?.analysis?.assetRequirements?.uiRequiredComponents
    || state.totalAssetKit?.analysis?.projectContext?.assetDemandSummary?.uiRequiredComponents
    || projectContext.assetDemandSummary?.uiRequiredComponents
    || []
  );
  const baseAnchors = normalizeProjectLayoutAnchors(
    projectAnchorPolicy
    || state.totalAssetKit?.analysis?.projectContext?.projectAnchorPolicy
    || projectContext.projectAnchorPolicy
    || []
  );
  const assetVersion = getUiAssetComponentBaselineVersion(kit);
  const baselineState = getUiComponentBaselineState();
  const hasLocked = Object.keys(baselineState.items || {}).length > 0;
  if (!force && baselineState.source === "ui-asset" && baselineState.assetVersion === assetVersion && hasLocked) {
    baselineState.coverage = {
      ...buildUiAssetCoverage(required, getLockedUiComponentBaselines()),
      assetVersion
    };
    baselineState.layoutAnchors = mergeProjectLayoutAnchors(baseAnchors, baselineState.layoutAnchors);
    return getLockedUiComponentBaselines();
  }

  try {
    const sourceScreen = {
      id: UI_ASSET_DESIGN_SCREEN_ID,
      name: "UI控件资产图",
      kind: "ui_asset",
      goal: "项目级 UI 控件组件基准"
    };

    let lastCoverage = buildUiAssetCoverage(required, []);
    let lastAdded = [];
    for (let attempt = 0; attempt < 2; attempt += 1) {
      baselineState.items = {};
      baselineState.order = [];
      baselineState.source = "ui-asset";
      baselineState.assetVersion = assetVersion;
      baselineState.coverage = null;
      baselineState.layoutAnchors = baseAnchors;
      const raw = await generateUiComponentBaselineAnalysisWithApi(sourceScreen, {
        source: "ui-asset",
        baselineSource: "ui-asset",
        imageUrl: referenceDataUrl,
        requiredUiAssetComponents: required,
        projectAnchorPolicy: baseAnchors,
        retryMissingComponents: attempt ? lastCoverage.missing : []
      });
      const result = normalizeUiComponentBaselineAnalysisResult(raw, required);
      const added = addUiComponentBaselines(result.components, {
        source: "ui-asset",
        sourceScreenId: sourceScreen.id,
        sourceScreenName: sourceScreen.name,
        imageUrl: referenceDataUrl
      });
      const locked = getLockedUiComponentBaselines();
      lastCoverage = {
        ...normalizeUiAssetCoverageResult(result.coverage, required, locked),
        assetVersion
      };
      baselineState.coverage = lastCoverage;
      baselineState.layoutAnchors = mergeProjectLayoutAnchors(baseAnchors, result.layoutAnchors);
      lastAdded = added;
      if (!lastCoverage.missing.length || attempt === 1) break;
    }
    renderDesignPromptSummary();
    return lastAdded.length ? lastAdded : getLockedUiComponentBaselines();
  } catch (error) {
    console.warn(error);
    renderDesignPromptSummary();
    return [];
  }
}

async function updateUiComponentBaselinesFromDraft(screen, draft, requestId, options = {}) {
  // Component baselines are locked only from the generated UI asset sheet.
  if (options.source !== "ui-asset") return [];
  if (!screen || !draft?.imageUrl || getPendingUiComponentBaselineTypes().length === 0) return [];
  try {
    const raw = await generateUiComponentBaselineAnalysisWithApi(screen, { source: "ui-asset", imageUrl: draft.imageUrl });
    if (!options.skipJobCheck && !isDesignJobCurrent(screen.id, requestId)) return [];
    const components = normalizeUiComponentBaselineAnalysis(raw);
    if (!components.length) return [];

    const added = addUiComponentBaselines(components, {
      source: "ui-asset",
      sourceScreenId: screen.id,
      sourceScreenName: screen.name,
      imageUrl: draft.imageUrl
    });

    if (added.length) {
      renderDesignPromptSummary();
    }
    return added;
  } catch (error) {
    console.warn(error);
    return [];
  }
}

function queueUiComponentBaselineAnalysis(screen, draft, requestId) {
  // Ordinary design drafts must not become cross-screen component baselines.
  return;
}

function renderDesignLoading(screenName, index, total) {
  const target = $("#designOutput");
  if (!target) return;
  const screen = getDesignScreen();
  const job = getDesignJob(screen?.id);
  const now = Date.now();
  const elapsedFrom = (timestamp) => timestamp ? Math.max(0, Math.floor((now - timestamp) / 1000)) : 0;
  const rawTotalSeconds = getDesignJobElapsedSeconds(job);
  const rawPhaseSeconds = getDesignJobPhaseElapsedSeconds(job);
  const fallbackSeconds = Math.max(
    rawTotalSeconds,
    elapsedFrom(job?.requestDispatchedAt),
    elapsedFrom(job?.startedAt)
  );
  const phaseSeconds = rawPhaseSeconds === 0 && fallbackSeconds > 2 ? fallbackSeconds : rawPhaseSeconds;
  const totalElapsed = formatElapsedTime(Math.max(rawTotalSeconds, fallbackSeconds));
  const phaseElapsed = formatElapsedTime(phaseSeconds);
  const phase = String(job?.phase || "生成界面设计稿中...").replace(/\.\.\.$/, "");
  const maxWait = job?.phaseMaxWaitLabel || (job?.phaseTimeoutMs > 0 ? `${formatMinutesForTimeout(job.phaseTimeoutMs)} 分钟` : "");
  const diagnostic = job?.designRequestStatus?.found ? job.designRequestStatus : null;
  const diagnosticStage = diagnostic?.stage || "";
  const diagnosticLabel = diagnostic?.label || getDesignRequestStageLabel(diagnosticStage);
  const requestStatusText = diagnosticLabel
    ? `诊断阶段：${diagnosticLabel}`
    : job?.requestStatus === "dispatching"
      ? "正在发送生图请求"
      : job?.requestStatus === "waiting-image"
        ? "请求已发送到本地服务，正在等待图片结果"
        : job?.requestStatus === "local-received"
          ? "本地服务已收到请求"
          : job?.requestStatus === "posting-babylon"
            ? "正在请求 Babylon"
            : job?.requestStatus === "babylon-response"
              ? "Babylon 已返回，正在解析图片结果"
              : job?.requestStatus === "waiting-local"
                ? "本地服务尚未收到该 requestId"
                : job?.requestStatus === "status-unavailable"
                  ? "状态接口不可用，请重启服务并强刷页面"
              : "正在调用生图服务";
  const statusText = /生成界面设计稿|生图|generate/i.test(phase)
    ? `${requestStatusText}；当前阶段已等待 ${phaseElapsed}，总计 ${totalElapsed}${maxWait ? `，单张最多等待 ${maxWait}` : ""}。可点击「取消生成」停止等待。`
    : `${phase}；当前阶段已等待 ${phaseElapsed}，总计 ${totalElapsed}${maxWait ? `，当前阶段最多等待 ${maxWait}` : ""}。可点击「取消生成」停止等待。`;
  const diagnosticMeta = diagnostic
    ? [
      job?.requestId ? `requestId：${job.requestId}` : "",
      `诊断版本：${DESIGN_DIAGNOSTIC_VERSION}`,
      diagnostic.model ? `模型：${diagnostic.model}` : "",
      Number.isFinite(Number(diagnostic.referenceCount)) ? `参考图：${diagnostic.referenceCount}` : "",
      Number.isFinite(Number(diagnostic.promptLength)) ? `Prompt：${diagnostic.promptLength} 字符` : "",
      diagnostic.durationMs ? `服务耗时：${Math.round(Number(diagnostic.durationMs) / 1000)}秒` : "",
      diagnostic.error ? `错误：${diagnostic.error}` : ""
    ].filter(Boolean).join("；")
    : (job?.requestId ? `requestId：${job.requestId}；诊断版本：${DESIGN_DIAGNOSTIC_VERSION}` : "");

  target.innerHTML = `
    <div class="draft-loading">
      <div>
        <p class="eyebrow">GENERATING</p>
        <strong>正在生成 ${escapeXml(screenName)}</strong>
        <p>${index} / ${total}，正在结合策划案、交互稿和画风参考图生成视觉设计稿。</p>
        <p>${escapeXml(statusText)}</p>
        ${diagnosticMeta ? `<p>${escapeXml(diagnosticMeta)}</p>` : ""}
      </div>
    </div>
  `;
  updateLockedVisualSvgButton();
}

function renderDesignQueued(screenName, batchIndex = 0, batchTotal = 0) {
  const target = $("#designOutput");
  if (!target) return;
  const progressText = batchTotal > 0
    ? `当前批量进度 ${Math.min(batchIndex, batchTotal)} / ${batchTotal}，轮到该界面后会自动开始生成。`
    : "该界面已进入本轮批量队列，轮到后会自动开始生成。";
  target.innerHTML = `
    <div class="draft-loading">
      <div>
        <p class="eyebrow">QUEUED</p>
        <strong>${escapeXml(screenName)} 等待生成</strong>
        <p>${escapeXml(progressText)}</p>
        <p>当前界面尚未开始请求生图服务，请等待批量流程推进到这一项。</p>
      </div>
    </div>
  `;
  updateLockedVisualSvgButton();
}

function createDefaultDesignDraftEditState(overrides = {}) {
  return {
    active: false,
    screenId: "",
    action: "delete",
    operations: [],
    selectedOperationId: "",
    targetBox: null,
    sourceBox: null,
    selectingSource: false,
    sourceImageUrl: "",
    candidate: null,
    drag: null,
    busy: false,
    error: "",
    abortController: null,
    ...overrides
  };
}

function resetDesignDraftEditState(overrides = {}) {
  if (state.designDraftEdit?.abortController && !state.designDraftEdit.abortController.signal.aborted) {
    state.designDraftEdit.abortController.abort(createClientAbortError("已取消设计稿编辑"));
  }
  state.designDraftEdit = createDefaultDesignDraftEditState(overrides);
}

function getUiAssetImageForDesignEdit() {
  const uiPart = state.totalAssetKit?.ui || state.uiAssetKit || {};
  return uiPart.imageUrl || "";
}

function getDesignEditActionLabel(action = state.designDraftEdit?.action) {
  if (action === "replace") return "替换控件";
  if (action === "add") return "添加控件";
  if (action === "repair") return "补全缺口";
  return "删除控件";
}

function isDesignDraftEditForScreen(screenId = "") {
  return Boolean(screenId && state.designDraftEdit?.active && state.designDraftEdit?.screenId === screenId);
}

function clampNumber(value = 0, min = 0, max = 1) {
  const numeric = Number.isFinite(Number(value)) ? Number(value) : min;
  return Math.min(max, Math.max(min, numeric));
}

function normalizeDesignEditBox(box = null) {
  if (!box) return null;
  const imageWidth = Math.max(1, Math.round(Number(box.imageWidth) || 0));
  const imageHeight = Math.max(1, Math.round(Number(box.imageHeight) || 0));
  const x1 = clampNumber(Number(box.x), 0, imageWidth);
  const y1 = clampNumber(Number(box.y), 0, imageHeight);
  const x2 = clampNumber(Number(box.x) + Number(box.width), 0, imageWidth);
  const y2 = clampNumber(Number(box.y) + Number(box.height), 0, imageHeight);
  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  const width = Math.max(1, Math.abs(x2 - x1));
  const height = Math.max(1, Math.abs(y2 - y1));
  return {
    x: Math.round(left),
    y: Math.round(top),
    width: Math.round(width),
    height: Math.round(height),
    imageWidth,
    imageHeight
  };
}

function getDesignEditBoxStyle(box = null) {
  const normalized = normalizeDesignEditBox(box);
  if (!normalized) return "";
  const left = (normalized.x / normalized.imageWidth) * 100;
  const top = (normalized.y / normalized.imageHeight) * 100;
  const width = (normalized.width / normalized.imageWidth) * 100;
  const height = (normalized.height / normalized.imageHeight) * 100;
  return `left:${left}%;top:${top}%;width:${width}%;height:${height}%;`;
}

function getDesignEditPointFromEvent(event, surface = "target") {
  const overlay = event.currentTarget;
  const shell = overlay?.closest("[data-design-edit-surface]");
  const image = shell?.querySelector("img");
  if (!image) return null;
  const rect = image.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const imageWidth = Math.max(1, image.naturalWidth || Math.round(rect.width));
  const imageHeight = Math.max(1, image.naturalHeight || Math.round(rect.height));
  const x = clampNumber(((event.clientX - rect.left) / rect.width) * imageWidth, 0, imageWidth);
  const y = clampNumber(((event.clientY - rect.top) / rect.height) * imageHeight, 0, imageHeight);
  return { x, y, imageWidth, imageHeight, surface };
}

function setDesignEditBox(surface = "target", start = null, current = null) {
  if (!start || !current) return null;
  const box = normalizeDesignEditBox({
    x: start.x,
    y: start.y,
    width: current.x - start.x,
    height: current.y - start.y,
    imageWidth: start.imageWidth || current.imageWidth,
    imageHeight: start.imageHeight || current.imageHeight
  });
  if (surface === "source") {
    state.designDraftEdit.sourceBox = box;
  } else {
    state.designDraftEdit.targetBox = box;
  }
  return box;
}

function updateDesignEditBoxElement(surface = "target") {
  const box = surface === "source" ? state.designDraftEdit?.sourceBox : state.designDraftEdit?.targetBox;
  const element = document.querySelector(`[data-design-edit-current-box="${surface}"]`);
  if (!element) return;
  const style = getDesignEditBoxStyle(box);
  element.setAttribute("style", style);
  element.hidden = !style;
}

function handleDesignEditPointerDown(event) {
  if (event.button !== 0 || !state.designDraftEdit?.active || state.designDraftEdit.busy) return;
  const surface = event.currentTarget.dataset.designEditOverlay || "target";
  if (surface === "source" && !getUiAssetImageForDesignEdit()) return;
  const start = getDesignEditPointFromEvent(event, surface);
  if (!start) return;
  event.preventDefault();
  event.currentTarget.setPointerCapture?.(event.pointerId);
  state.designDraftEdit.drag = { surface, start, pointerId: event.pointerId };
  setDesignEditBox(surface, start, start);
  updateDesignEditBoxElement(surface);
}

function handleDesignEditPointerMove(event) {
  const drag = state.designDraftEdit?.drag;
  if (!drag || drag.pointerId !== event.pointerId || state.designDraftEdit.busy) return;
  const current = getDesignEditPointFromEvent(event, drag.surface);
  if (!current) return;
  event.preventDefault();
  setDesignEditBox(drag.surface, drag.start, current);
  updateDesignEditBoxElement(drag.surface);
}

function handleDesignEditPointerUp(event) {
  const drag = state.designDraftEdit?.drag;
  if (!drag || drag.pointerId !== event.pointerId) return;
  const current = getDesignEditPointFromEvent(event, drag.surface);
  if (current) setDesignEditBox(drag.surface, drag.start, current);
  state.designDraftEdit.drag = null;
  event.currentTarget.releasePointerCapture?.(event.pointerId);
  renderDesignOutput();
}

function bindDesignEditSurfaceEvents(root = document) {
  root.querySelectorAll("[data-design-edit-overlay]").forEach((overlay) => {
    overlay.addEventListener("pointerdown", handleDesignEditPointerDown);
    overlay.addEventListener("pointermove", handleDesignEditPointerMove);
    overlay.addEventListener("pointerup", handleDesignEditPointerUp);
    overlay.addEventListener("pointercancel", handleDesignEditPointerUp);
  });
}

function canApplyDesignDraftEdit() {
  const edit = state.designDraftEdit || {};
  return canApplyDesignDraftEditOperations(edit);
}

function getDesignEditBoxAreaRatio(box = null) {
  const normalized = normalizeDesignEditBox(box);
  if (!normalized) return 0;
  return (normalized.width * normalized.height) / Math.max(1, normalized.imageWidth * normalized.imageHeight);
}

function createDesignEditOperationId() {
  return `design-edit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeDesignEditOperation(operation = {}) {
  const action = ["delete", "replace", "add", "repair"].includes(operation.action) ? operation.action : "delete";
  return {
    id: operation.id || createDesignEditOperationId(),
    action,
    targetBox: normalizeDesignEditBox(operation.targetBox),
    sourceBox: normalizeDesignEditBox(operation.sourceBox),
    sourceImageUrl: operation.sourceImageUrl || "",
    createdAt: Number(operation.createdAt || Date.now())
  };
}

function canStageDesignDraftEditOperation(edit = state.designDraftEdit || {}) {
  const screen = getDesignScreen();
  if (!edit.active || edit.busy || edit.screenId !== screen?.id || !edit.targetBox) return false;
  if (edit.action === "delete" || edit.action === "repair") return true;
  return Boolean(edit.sourceBox && getUiAssetImageForDesignEdit());
}

function canApplyDesignDraftEditOperations(edit = state.designDraftEdit || {}) {
  const screen = getDesignScreen();
  return Boolean(edit.active && !edit.busy && edit.screenId === screen?.id && Array.isArray(edit.operations) && edit.operations.length);
}

function buildCurrentDesignEditOperation(edit = state.designDraftEdit || {}) {
  if (!canStageDesignDraftEditOperation(edit)) return null;
  return normalizeDesignEditOperation({
    action: edit.action,
    targetBox: edit.targetBox,
    sourceBox: edit.action === "replace" || edit.action === "add" ? edit.sourceBox : null,
    sourceImageUrl: edit.action === "replace" || edit.action === "add" ? getUiAssetImageForDesignEdit() : ""
  });
}

function getDesignEditOperationLabel(operation = {}) {
  return getDesignEditActionLabel(operation.action || "delete");
}

function summarizeDesignEditOperation(operation = {}) {
  const target = normalizeDesignEditBox(operation.targetBox);
  if (!target) return getDesignEditOperationLabel(operation);
  return `${getDesignEditOperationLabel(operation)} · x:${target.x} y:${target.y} w:${target.width} h:${target.height}`;
}

function renderDesignEditSelectionBoxes(surface = "target") {
  const edit = state.designDraftEdit || {};
  const operations = Array.isArray(edit.operations) ? edit.operations : [];
  const operationBoxes = surface === "target"
    ? operations.map((operation, index) => {
      const box = normalizeDesignEditBox(operation.targetBox);
      const style = getDesignEditBoxStyle(box);
      if (!style) return "";
      const selected = edit.selectedOperationId === operation.id ? " is-selected" : "";
      return `<div class="design-edit-box design-edit-box-target design-edit-box-committed${selected}" data-design-edit-operation-box="${escapeXml(operation.id)}" style="${style}">${escapeXml(`${index + 1}. ${getDesignEditOperationLabel(operation)}`)}</div>`;
    }).join("")
    : "";
  const currentBox = surface === "source" ? edit.sourceBox : edit.targetBox;
  const currentLabel = surface === "source" ? "当前来源" : "当前区域";
  const currentStyle = getDesignEditBoxStyle(currentBox);
  const currentBoxHtml = `<div class="design-edit-box design-edit-box-${surface} design-edit-box-current" data-design-edit-current-box="${surface}" ${currentStyle ? `style="${currentStyle}"` : "hidden"}>${escapeXml(currentLabel)}</div>`;
  return `${operationBoxes}${currentBoxHtml}`;
}

function renderDesignDraftImageWithEditLayer({ imageUrl = "", title = "", editActive = false, surface = "target" } = {}) {
  const overlayLabel = surface === "source" ? "拖拽框选 UI资产控件" : "拖拽框选目标区域";
  if (!editActive) {
    return `<button class="design-preview-button" type="button" data-open-design-image aria-label="查看 ${escapeXml(title)} 完整设计稿">
      <img src="${escapeXml(imageUrl)}" alt="${escapeXml(title)}">
    </button>`;
  }
  return `
    <div class="design-edit-stage">
      <div class="design-edit-image-shell" data-design-edit-surface="${escapeXml(surface)}">
        <img src="${escapeXml(imageUrl)}" alt="${escapeXml(title)}">
        <div class="design-edit-overlay" data-design-edit-overlay="${escapeXml(surface)}" aria-label="${escapeXml(overlayLabel)}"></div>
        ${renderDesignEditSelectionBoxes(surface)}
      </div>
    </div>`;
}

function renderDesignEditControls() {
  const edit = state.designDraftEdit || createDefaultDesignDraftEditState();
  const screen = getDesignScreen();
  const editJob = getDesignEditJob(screen?.id);
  const otherRunningEditJob = Object.values(state.designEditJobs || {}).find((job) => job?.status === "generating" && job?.screenId && job.screenId !== screen?.id);
  const busy = editJob?.status === "generating" || edit.busy;
  const uiAssetImage = getUiAssetImageForDesignEdit();
  const needsSource = edit.action === "replace" || edit.action === "add";
  const isCurrentScreenEdit = isDesignDraftEditForScreen(screen?.id);
  if (!isCurrentScreenEdit) {
    return `<div class="design-edit-toolbar">
      <button type="button" class="inline-refresh" data-start-design-edit ${otherRunningEditJob ? "disabled" : ""}>编辑设计稿</button>
      ${otherRunningEditJob ? `<span class="design-stale-note">${escapeXml(otherRunningEditJob.screenName || "其他界面")} 正在应用局部编辑，请等待其完成后再开启新的编辑。</span>` : ""}
    </div>`;
  }
  const actionButtons = [
    ["delete", "删除"],
    ["replace", "替换"],
    ["add", "添加"],
    ["repair", "补全"]
  ].map(([action, label]) => `<button type="button" class="${edit.action === action ? "is-active" : ""}" data-design-edit-action="${action}" ${busy ? "disabled" : ""}>${label}</button>`).join("");
  const stageDisabled = canStageDesignDraftEditOperation(edit) ? "" : " disabled";
  const applyDisabled = canApplyDesignDraftEditOperations(edit) ? "" : " disabled";
  const deleteLargeBoxWarning = edit.action === "delete" && getDesignEditBoxAreaRatio(edit.targetBox) > 0.018
    ? `<p class="design-edit-error">框选范围较大，可能导致 BBL 误改附近 UI；建议贴紧框住单个控件。</p>`
    : "";
  const operationItems = (Array.isArray(edit.operations) ? edit.operations : []).map((operation, index) => {
    const selected = edit.selectedOperationId === operation.id ? " is-selected" : "";
    return `<div class="design-edit-operation-item${selected}" data-select-design-edit-operation="${escapeXml(operation.id)}" role="button" tabindex="0">
      <span>${escapeXml(`${index + 1}. ${summarizeDesignEditOperation(operation)}`)}</span>
      <span class="design-edit-operation-actions">
        <span class="design-edit-operation-tag">${escapeXml(getDesignEditOperationLabel(operation))}</span>
        <button type="button" data-remove-design-edit-operation="${escapeXml(operation.id)}" ${busy ? "disabled" : ""}>删除</button>
      </span>
    </div>`;
  }).join("");
  const candidate = edit.candidate || null;
  const candidatePanel = candidate
    ? `<div class="design-edit-candidate-panel">
        <strong>候选结果</strong>
        <p class="design-edit-hint">已生成候选编辑结果。确认覆盖后才会替换当前设计稿。</p>
        <button class="design-preview-button" type="button" data-open-design-candidate aria-label="查看候选设计稿">
          <img src="${escapeXml(candidate.imageUrl || "")}" alt="设计稿候选结果">
        </button>
        <div class="design-edit-toolbar">
          <button type="button" class="inline-refresh" data-confirm-design-edit-candidate>确认覆盖</button>
          <button type="button" data-discard-design-edit-candidate>丢弃候选</button>
        </div>
      </div>`
    : "";
  const sourcePanel = needsSource
    ? `<div class="design-edit-source-panel">
        <div class="design-edit-source-head">
          <strong>UI资产来源控件</strong>
          ${uiAssetImage ? `<button type="button" class="inline-refresh" data-open-design-source-image>查看完整图</button>` : ""}
        </div>
        ${uiAssetImage
          ? renderDesignDraftImageWithEditLayer({ imageUrl: uiAssetImage, title: "UI控件资产图", editActive: true, surface: "source" })
          : `<p class="design-edit-hint">请先生成总资产中的 UI控件资产图。</p>`}
      </div>`
    : "";
  return `
    <div class="design-edit-panel">
      <div class="design-edit-toolbar">
        <span>编辑模式：${escapeXml(getDesignEditActionLabel(edit.action))}</span>
        ${actionButtons}
        <button type="button" class="inline-refresh" data-stage-design-edit-operation${stageDisabled} ${busy ? "disabled" : ""}>加入本次编辑</button>
        <button type="button" class="inline-refresh" data-apply-design-edit${applyDisabled} ${busy ? "disabled" : ""}>${busy ? "正在应用..." : "应用全部编辑"}</button>
        <button type="button" data-clear-design-edit-operations ${busy ? "disabled" : ""}>清空整单</button>
        <button type="button" data-cancel-design-edit>${busy ? "取消等待" : "取消"}</button>
      </div>
      <p class="design-edit-hint">${needsSource ? "先在设计稿上框选目标区域，再在 UI资产图上框选来源控件，然后点“加入本次编辑”。" : edit.action === "repair" ? "框选需要补齐的缺口或断边区域，系统会参考周围已有 UI 结构自然补全。" : "请贴紧框选单个要删除的控件，不要框到相邻按钮、标题边框或大面积背景，然后点“加入本次编辑”。"}</p>
      ${deleteLargeBoxWarning}
      ${edit.error ? `<p class="design-edit-error">${escapeXml(edit.error)}</p>` : ""}
      <div class="design-edit-operations">
        <strong>本次编辑操作</strong>
        ${operationItems ? `<div class="design-edit-operation-list">${operationItems}</div>` : `<p class="design-edit-hint">还没有加入任何操作。</p>`}
      </div>
      ${sourcePanel}
      ${candidatePanel}
    </div>`;
}

function buildDesignDraftEditPrompt({ screen = {}, operations = [] } = {}) {
  const normalizedOperations = (Array.isArray(operations) ? operations : [])
    .map((operation) => normalizeDesignEditOperation(operation))
    .filter((operation) => operation.targetBox);
  const operationLines = normalizedOperations.map((operation, index) => {
    const target = operation.targetBox ? JSON.stringify(operation.targetBox) : "未提供";
    const source = operation.sourceBox ? `；来源框（图2原始像素）：${JSON.stringify(operation.sourceBox)}` : "";
    const detail = operation.action === "delete"
      ? "删除目标框内中心/最大/最显著的单个独立控件，并自然补底。"
      : operation.action === "repair"
        ? "参考目标区域周围已有 UI 结构、边框、面板、底板、描边和材质，做局部自然延展与补齐，不新增新的按钮、图标、文案或随机装饰。"
        : operation.action === "replace"
          ? "用来源框控件替换目标控件；继承材质、描边、圆角、阴影、图标语言和状态风格。"
          : "把来源框控件添加到目标区域，并适配当前位置尺寸、透视、光影和层级。";
    return `${index + 1}. ${getDesignEditActionLabel(operation.action)}；目标框（图1原始像素）：${target}${source}；要求：${detail}`;
  });
  return [
    "设计稿复合局部编辑任务：请一次完成下面所有区域操作。",
    `当前界面：${screen.name || "目标界面"}；类型：${screen.kind || "generic"}`,
    normalizedOperations.some((operation) => operation.action === "replace" || operation.action === "add")
      ? "参考图顺序：图1 是当前完整界面设计稿；图2 是 UI控件资产图。"
      : "参考图顺序：图1 是当前完整界面设计稿。",
    "操作清单：",
    ...operationLines,
    "硬约束：保留图1整体界面构图、背景、角色、面板、列表、文字、资源栏、标题处理和色彩平衡。",
    "删除精度硬约束：如果某个删除框内包含多个控件，只删除中心/最大/最显著的那一个；不要连带删除相邻按钮、标题、边框、角色、资源栏、主操作按钮或任何框外内容。只在被删除控件原本覆盖区域做补底，不扩大重绘范围。",
    "补全精度硬约束：repair 只做缺口补齐、边缘延展和底板连续性修复，不改变邻近按钮的语义、布局、文案和功能。",
    "来源控件约束：replace/add 仅把图2来源框当成控件风格参考，不得复制来源图上的完整布局或无关控件。",
    "硬约束：只允许修改目标框及必要的边缘融合区，不要重绘其他区域，不要新增无关入口、弹窗、奖励、任务、角色或随机文字。",
    "融合要求：边缘必须自然，不留贴图边、遮罩边、涂抹痕迹、重复按钮或明显修补痕迹。输出一张完整的游戏 UI 界面图。"
  ].filter(Boolean).join("\n");
}

function commitDesignDraftEditCandidate() {
  const screen = getDesignScreen();
  const draft = getDesignDraftForScreen(screen);
  const edit = state.designDraftEdit || {};
  const candidate = edit.candidate || null;
  if (!screen || !draft || !candidate?.imageUrl) return;
  const editRecord = {
    operations: Array.isArray(candidate.operations) ? candidate.operations : [],
    model: candidate.model || draft.model || "",
    requestId: candidate.requestId || "",
    editedAt: Date.now()
  };
  setDesignDraftForScreen(screen, {
    ...draft,
    imageUrl: candidate.imageUrl,
    files: candidate.files || [],
    prompt: candidate.prompt || draft.prompt || "",
    requestId: candidate.requestId || draft.requestId || "",
    model: candidate.model || draft.model || "",
    durationMs: candidate.durationMs || 0,
    referenceCount: candidate.referenceCount || draft.referenceCount || 0,
    completedAt: Date.now(),
    lastJobType: "draft-edit",
    previousImageUrl: draft.imageUrl,
    editHistory: [...(Array.isArray(draft.editHistory) ? draft.editHistory : []), editRecord],
    lastError: "",
    error: ""
  });
  state.designDraftEdit = createDefaultDesignDraftEditState({
    active: true,
    screenId: screen.id,
    action: edit.action || "delete"
  });
  $("#designStatus").textContent = "设计稿局部编辑已确认覆盖，当前界面已更新。";
  renderDesignTabs();
  renderDesignOutput();
}

async function applyDesignDraftEdit() {
  const screen = getDesignScreen();
  const draft = getDesignDraftForScreen(screen);
  const edit = state.designDraftEdit || {};
  const generateJob = getDesignJob(screen?.id);
  const uiAssetImage = getUiAssetImageForDesignEdit();
  const operations = (Array.isArray(edit.operations) ? edit.operations : []).map((operation) => normalizeDesignEditOperation(operation)).filter((operation) => operation.targetBox);
  if (!screen || !draft?.imageUrl || edit.screenId !== screen.id || !operations.length) {
    state.designDraftEdit = { ...edit, error: "请先至少加入一个编辑操作，再应用全部编辑。" };
    renderDesignOutput();
    return;
  }
  const requestId = createDesignRequestId(`${screen.id}-edit`);
  const abortController = new AbortController();
  const model = getSelectedDesignModel();
  const timeoutMs = getDesignDraftImageTimeoutMs();
  const prompt = buildDesignDraftEditPrompt({
    screen,
    operations
  });
  state.designDraftEdit = {
    ...edit,
    busy: true,
    error: "",
    abortController
  };
  state.designEditJobs[screen.id] = {
    status: "generating",
    jobType: "draft-edit",
    requestId,
    screenId: screen.id,
    screenName: screen.name || "",
    screenKind: screen.kind || "generic",
    screenKey: getDesignDraftScreenKey(screen),
    startedAt: Date.now(),
    phaseStartedAt: Date.now(),
    model,
    action: "composite",
    operations,
    conflictWithGenerate: Boolean(generateJob?.status === "generating")
  };
  renderDesignOutput();
  $("#designStatus").textContent = `正在应用设计稿复合编辑：${operations.length} 个区域`;
  try {
    const requiresUiAsset = operations.some((operation) => operation.action === "replace" || operation.action === "add");
    const referenceImages = [draft.imageUrl, requiresUiAsset ? uiAssetImage : ""].filter(Boolean);
    const canvasSpec = getDesignCanvasSpec();
    const { response, data } = await fetchJsonWithClientTimeout("/api/generate-design", {
      mode: "screen-draft-edit",
      requestId,
      projectName: state.gameName || gameName.value || detectGameName(briefText.value.trim()) || "未命名小游戏",
      screen: {
        id: screen.id,
        name: screen.name,
        kind: screen.kind,
        goal: screen.goal
      },
      prompt,
      operations,
      model,
      platform: getPlatformText($("#platform").value),
      aspectRatio: canvasSpec.aspectRatio,
      size: canvasSpec.generationSize,
      timeoutSeconds: Math.ceil(timeoutMs / 1000),
      referenceImages
    }, {
      signal: abortController.signal,
      timeoutMs,
      timeoutMessage: `设计稿局部编辑超过 ${formatMinutesForTimeout(timeoutMs)} 分钟，已停止等待，原稿已保留。`
    });
    if (!response.ok) {
      throw new Error(data.error || data.message || `设计稿编辑失败：${response.status}`);
    }
    const imageUrl = data.imageUrl || data.images?.[0] || "";
    if (!imageUrl) throw new Error("设计稿编辑未返回图片");
    delete state.designEditJobs[screen.id];
    state.designDraftEdit = {
      ...edit,
      active: true,
      screenId: screen.id,
      action: edit.action,
      operations,
      targetBox: null,
      sourceBox: null,
      busy: false,
      abortController: null,
      error: "",
      candidate: {
        imageUrl,
        files: data.files || [],
        prompt: data.prompt || prompt,
        requestId: data.requestId || requestId,
        model: data.model || model,
        durationMs: data.durationMs || 0,
        referenceCount: referenceImages.length,
        operations,
        createdAt: Date.now()
      }
    };
    $("#designStatus").textContent = "设计稿复合编辑候选结果已生成，请确认是否覆盖当前稿。";
    renderDesignOutput();
  } catch (error) {
    delete state.designEditJobs[screen.id];
    if (isAbortLikeError(error)) {
      state.designDraftEdit = createDefaultDesignDraftEditState({
        active: true,
        screenId: screen.id,
        action: edit.action,
        operations,
        targetBox: edit.targetBox,
        sourceBox: edit.sourceBox,
        sourceImageUrl: edit.sourceImageUrl,
        error: "已取消编辑等待，原设计稿已保留。"
      });
      $("#designStatus").textContent = "已取消设计稿局部编辑，原稿保留。";
    } else {
      state.designDraftEdit = createDefaultDesignDraftEditState({
        active: true,
        screenId: screen.id,
        action: edit.action,
        operations,
        targetBox: edit.targetBox,
        sourceBox: edit.sourceBox,
        sourceImageUrl: edit.sourceImageUrl,
        error: error?.message || "设计稿编辑失败，原稿已保留。"
      });
      $("#designStatus").textContent = `设计稿编辑失败：${error?.message || "未知错误"}`;
    }
    renderDesignOutput();
  }
}

function bindDesignEditControls(target = $("#designOutput")) {
  if (!target) return;
  target.querySelector("[data-start-design-edit]")?.addEventListener("click", () => {
    const currentScreen = getDesignScreen();
    const otherRunningEditJob = Object.values(state.designEditJobs || {}).find((job) => job?.status === "generating" && job?.screenId && job.screenId !== currentScreen?.id);
    if (otherRunningEditJob) {
      $("#designStatus").textContent = `${otherRunningEditJob.screenName || "其他界面"} 正在应用局部编辑，请等待其完成后再开启新的编辑。`;
      return;
    }
    state.designDraftEdit = createDefaultDesignDraftEditState({
      active: true,
      screenId: currentScreen?.id || "",
      action: state.designDraftEdit?.action || "delete",
      sourceImageUrl: getUiAssetImageForDesignEdit()
    });
    renderDesignOutput();
  });
  target.querySelectorAll("[data-design-edit-action]").forEach((button) => {
    button.addEventListener("click", () => {
      state.designDraftEdit = {
        ...(state.designDraftEdit || createDefaultDesignDraftEditState()),
        screenId: state.designDraftEdit?.screenId || getDesignScreen()?.id || "",
        action: button.dataset.designEditAction || "delete",
        targetBox: null,
        sourceBox: null,
        candidate: null,
        error: "",
        busy: false
      };
      renderDesignOutput();
    });
  });
  target.querySelector("[data-stage-design-edit-operation]")?.addEventListener("click", () => {
    const nextOperation = buildCurrentDesignEditOperation();
    if (!nextOperation) {
      state.designDraftEdit = {
        ...(state.designDraftEdit || createDefaultDesignDraftEditState()),
        error: "请先完成当前操作的框选；替换/添加还需要框选来源控件。"
      };
      renderDesignOutput();
      return;
    }
    const nextOperations = [...(Array.isArray(state.designDraftEdit?.operations) ? state.designDraftEdit.operations : []), nextOperation];
    state.designDraftEdit = {
      ...(state.designDraftEdit || createDefaultDesignDraftEditState()),
      screenId: state.designDraftEdit?.screenId || getDesignScreen()?.id || "",
      operations: nextOperations,
      selectedOperationId: nextOperation.id,
      targetBox: null,
      sourceBox: null,
      error: "",
      candidate: null
    };
    renderDesignOutput();
  });
  target.querySelector("[data-apply-design-edit]")?.addEventListener("click", applyDesignDraftEdit);
  target.querySelector("[data-clear-design-edit-operations]")?.addEventListener("click", () => {
    state.designDraftEdit = {
      ...(state.designDraftEdit || createDefaultDesignDraftEditState()),
      operations: [],
      selectedOperationId: "",
      targetBox: null,
      sourceBox: null,
      error: "",
      candidate: null
    };
    renderDesignOutput();
  });
  target.querySelectorAll("[data-remove-design-edit-operation]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const id = button.dataset.removeDesignEditOperation || "";
      const operations = (state.designDraftEdit?.operations || []).filter((operation) => operation.id !== id);
      state.designDraftEdit = {
        ...(state.designDraftEdit || createDefaultDesignDraftEditState()),
        operations,
        selectedOperationId: state.designDraftEdit?.selectedOperationId === id ? "" : state.designDraftEdit?.selectedOperationId || "",
        candidate: null
      };
      renderDesignOutput();
    });
  });
  target.querySelectorAll("[data-select-design-edit-operation]").forEach((button) => {
    button.addEventListener("click", () => {
      state.designDraftEdit = {
        ...(state.designDraftEdit || createDefaultDesignDraftEditState()),
        selectedOperationId: button.dataset.selectDesignEditOperation || ""
      };
      renderDesignOutput();
    });
    button.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      state.designDraftEdit = {
        ...(state.designDraftEdit || createDefaultDesignDraftEditState()),
        selectedOperationId: button.dataset.selectDesignEditOperation || ""
      };
      renderDesignOutput();
    });
  });
  target.querySelector("[data-confirm-design-edit-candidate]")?.addEventListener("click", commitDesignDraftEditCandidate);
  target.querySelector("[data-discard-design-edit-candidate]")?.addEventListener("click", () => {
    state.designDraftEdit = {
      ...(state.designDraftEdit || createDefaultDesignDraftEditState()),
      candidate: null,
      error: ""
    };
    $("#designStatus").textContent = "已丢弃候选结果，当前设计稿保持不变。";
    renderDesignOutput();
  });
  target.querySelector("[data-open-design-candidate]")?.addEventListener("click", () => {
    const imageUrl = state.designDraftEdit?.candidate?.imageUrl || "";
    if (!imageUrl) return;
    openDesignImageModal(imageUrl, "设计稿候选结果");
  });
  target.querySelector("[data-open-design-source-image]")?.addEventListener("click", () => {
    const imageUrl = getUiAssetImageForDesignEdit();
    if (!imageUrl) return;
    openDesignImageModal(imageUrl, "UI资产来源控件");
  });
  target.querySelector("[data-cancel-design-edit]")?.addEventListener("click", () => {
    if (state.designDraftEdit?.busy && state.designDraftEdit.abortController && !state.designDraftEdit.abortController.signal.aborted) {
      state.designDraftEdit.abortController.abort(createClientAbortError("已取消设计稿编辑"));
      return;
    }
    resetDesignDraftEditState({ action: state.designDraftEdit?.action || "delete" });
    renderDesignOutput();
  });
  bindDesignEditSurfaceEvents(target);
}

function renderUiAssetOutput() {
  const target = $("#designOutput");
  if (!target) return;

  const kit = state.totalAssetKit || {};
  const busy = isTotalAssetFullGenerationBusy(kit);
  const readyTypes = getTotalAssetReadyTypes(kit);
  const activeType = TOTAL_ASSET_TYPES.some((item) => item.id === state.totalAssetActiveType)
    ? state.totalAssetActiveType
    : "ui";
  state.totalAssetActiveType = activeType;
  const activeMeta = getTotalAssetPartMeta(activeType);
  const activePart = kit[activeType] || createEmptyTotalAssetPart();
  const activePartJob = getTotalAssetPartJob(activeType);
  const activePartGenerating = isActiveTotalAssetPartGenerating(activeType, kit);
  const modelMeta = getDesignModelMeta(kit.imageModel || getSelectedDesignModel());
  const assetReferenceSelection = getDesignDraftAssetReferenceSelection();
  const subTabs = TOTAL_ASSET_TYPES.map((item) => {
    const part = kit[item.id] || {};
    const sendable = part.status === "ready" && Boolean(part.imageUrl);
    const checked = sendable && assetReferenceSelection[item.id] !== false ? " checked" : "";
    const disabled = sendable ? "" : " disabled";
    const inProgress = ["analyzing", "generating"].includes(part.status)
      || isTotalAssetPartJobGenerating(item.id, kit)
      || (busy && part.status !== "ready" && part.status !== "error" && part.status !== "incomplete");
    const tabLabel = inProgress ? `${item.shortLabel}...`
      : part.status === "incomplete" ? `${item.shortLabel} !`
        : part.imageUrl ? `${item.shortLabel} ✓`
          : part.status === "error" ? `${item.shortLabel} !` : `${item.shortLabel} · 未生成`;
    return `<div class="total-asset-tab-item">
      <label class="total-asset-send-toggle" title="勾选后，普通界面生图会把${escapeXml(item.shortLabel)}发给 BBL">
        <input type="checkbox" data-total-asset-reference-type="${item.id}"${checked}${disabled}>
      </label>
      <button class="${item.id === activeType ? "is-active" : ""}" type="button" data-total-asset-type="${item.id}">${escapeXml(tabLabel)}</button>
    </div>`;
  }).join("");
  const activePartActionLabel = activePartGenerating
    ? "正在生成当前资产..."
    : activePart.imageUrl ? "重新生成当前资产" : "生成当前资产";
  const disablePartAction = busy;
  let previewHtml = "";
  const fullBusyNotice = busy && readyTypes.length
    ? `<span>总资产仍在生成：已完成 ${readyTypes.length}/${TOTAL_ASSET_TYPES.length}，其他资产完成后会自动更新。</span>`
    : "";
  if (activePartGenerating) {
    const startedAt = activePartJob?.startedAt || (kit.currentAssetType === activeType ? kit.currentAssetStartedAt : 0);
    const currentElapsed = startedAt
      ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
      : 0;
    const elapsedText = currentElapsed
      ? `已等待 ${Math.floor(currentElapsed / 60)}分${currentElapsed % 60}秒，`
      : "";
    previewHtml = `<div class="empty-visual"><strong>正在生成${escapeXml(activeMeta.label)}</strong><span>${elapsedText}生成完成后会立即显示这一项。</span></div>`;
  } else if (busy && activePart.imageUrl) {
    previewHtml = `<button class="design-preview-button" type="button" data-open-design-image aria-label="查看 ${escapeXml(activeMeta.label)} 完整图">
        <img src="${escapeXml(activePart.imageUrl)}" alt="${escapeXml(activeMeta.label)} ${escapeXml(modelMeta.label)}">
      </button>`;
  } else if (busy) {
    const progressItems = getCurrentEvidenceProgressItems(kit);
    const progressLines = formatEvidenceProgressLines(progressItems);
    const expectedCount = getEvidenceProgressExpectedCount(kit);
    const completeCount = progressItems.filter((item) => item.status === "complete").length;
    const progressHeading = expectedCount
      ? `<p>参考图数量：${expectedCount} 张；逐图取证：${completeCount}/${expectedCount} 完成；${escapeXml(formatReferenceEvidenceGateText(expectedCount))}</p>`
      : "";
    const currentMeta = kit.currentAssetType ? getTotalAssetPartMeta(kit.currentAssetType) : null;
    const currentElapsed = kit.currentAssetStartedAt
      ? Math.max(0, Math.floor((Date.now() - kit.currentAssetStartedAt) / 1000))
      : 0;
    const totalAssetMaxWait = formatMinutesForTimeout(TOTAL_ASSET_IMAGE_TIMEOUT_MS);
    const generatingText = currentMeta
      ? `正在生成 ${currentMeta.label}；已等待 ${Math.floor(currentElapsed / 60)}分${currentElapsed % 60}秒，单张最多等待 ${totalAssetMaxWait} 分钟。可点击「取消生成」停止等待。`
      : `正在并行生成 UI控件资产图、背景设定图和角色设定图；单张最多等待 ${totalAssetMaxWait} 分钟。可点击「取消生成」停止等待。`;
    const evidenceLoadingText = expectedCount > 1
      ? `正在并行提取参考图真实视觉证据；${expectedCount} 张都有效才会进入生成；可点击「取消分析」停止等待。`
      : expectedCount === 1
        ? "正在提取参考图真实视觉证据；1 张有效才会进入生成；可点击「取消分析」停止等待。"
        : "正在提取参考图真实视觉证据；请等待取证结果。可点击「取消分析」停止等待。";
    const fallbackProgressText = expectedCount > 1
      ? `逐图取证：${Array.from({ length: expectedCount }, (_, index) => `图${index + 1}`).join("/")} 并行分析中。`
      : expectedCount === 1
        ? "逐图取证：图1 分析中。"
        : "逐图取证：参考图分析中。";
    const progressHtml = progressLines.length
      ? `<div class="summary-detail-list">${progressLines.map((line) => `<p>${escapeXml(line)}</p>`).join("")}</div>`
      : `<p>${escapeXml(fallbackProgressText)}</p>`;
    previewHtml = `
      <div class="draft-loading">
        <div>
          <p class="eyebrow">GENERATING</p>
          <strong>${kit.status === "analyzing" ? "正在生成 总资产 / 参考图分析" : "正在生成 总资产"}</strong>
          <p>${kit.status === "analyzing" ? escapeXml(evidenceLoadingText) : generatingText}</p>
          ${progressHeading}
          ${progressHtml}
        </div>
      </div>`;
  } else if (activePart.imageUrl) {
    previewHtml = `<button class="design-preview-button" type="button" data-open-design-image aria-label="查看 ${escapeXml(activeMeta.label)} 完整图">
        <img src="${escapeXml(activePart.imageUrl)}" alt="${escapeXml(activeMeta.label)} ${escapeXml(modelMeta.label)}">
      </button>`;
  } else {
    previewHtml = `<div class="empty-visual"><strong>${escapeXml(activeMeta.label)}未生成</strong><span>${escapeXml(activePart.error || kit.error || "点击「生成总资产」后，这里会显示对应资产图。")}</span></div>`;
  }
  const activePartNotice = !busy && (activePart.status === "incomplete" || activePart.status === "error") && activePart.error
    ? `<span class="design-stale-note">${escapeXml(activePart.error)}</span>`
    : "";
  const analysisBlocksHtml = renderAnalysisBlocksHtml(buildTotalAssetVisibleAnalysisBlocks(activeType, activePart.analysis || kit.analysis));
  target.innerHTML = `
    <div class="design-draft-card total-asset-draft-card">
      <div class="total-asset-card-head">
        <div class="total-asset-switch" role="tablist" aria-label="总资产类型切换">
          ${subTabs}
        </div>
        <button class="srp-reset-button style-analysis-refresh-button total-asset-regenerate-button" type="button" data-regenerate-total-asset-part ${disablePartAction ? "disabled" : ""}>${escapeXml(activePartActionLabel)}</button>
      </div>
      ${previewHtml}
      <div class="design-draft-meta">
        <strong>总资产 / ${escapeXml(activeMeta.label)}</strong>
        <span>模型：${escapeXml(modelMeta.label)}　尺寸：${escapeXml(getDesignCanvasSpec().promptText)}</span>
        ${activePartNotice}
        ${fullBusyNotice}
        <span>后续设计稿按角色引用：控件看 UI控件资产图，背景看背景设定图，角色内容看角色设定图。</span>
        <details>
          <summary>查看 ${escapeXml(activeMeta.label)}风格分析结果</summary>
          <div class="summary-details total-asset-analysis-details">${analysisBlocksHtml}</div>
        </details>
      </div>
    </div>
  `;

  target.querySelectorAll("[data-total-asset-type]").forEach((button) => {
    button.addEventListener("click", () => {
      state.totalAssetActiveType = button.dataset.totalAssetType || "ui";
      renderDesignOutput();
    });
  });
  target.querySelectorAll("[data-total-asset-reference-type]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      setDesignDraftAssetReferenceSelection(checkbox.dataset.totalAssetReferenceType, checkbox.checked);
      renderDesignOutput();
    });
  });
  target.querySelector("[data-regenerate-total-asset-part]")?.addEventListener("click", regenerateActiveTotalAssetPart);
  target.querySelector("[data-open-design-image]")?.addEventListener("click", () => {
    openDesignImageModal(activePart.imageUrl, `总资产 / ${activeMeta.label}`);
  });
  syncDesignGenerateButtonState();
}

function renderDesignOutput() {
  if (isUiAssetDesignScreenId()) {
    renderUiAssetOutput();
    return;
  }

  const screen = getDesignScreen();
  if (!screen) {
    renderEmptyDesignOutput("未识别到目标界面", "请先在策划案里写明需要生成的界面。");
    return;
  }

  const draft = getDesignDraftForScreen(screen);
  const job = getDesignJob(screen.id);
  const editJob = getDesignEditJob(screen.id);
  const batchState = getDesignBatchQueueState(screen.id);
  if (job?.status === "generating" && !draft) {
    ensureDesignJobProgressTimer(screen.id, job.requestId);
    renderDesignLoading(screen.name, 1, 1);
    syncDesignGenerateButtonState();
    return;
  }

  if (batchState.isQueued) {
    renderDesignQueued(screen.name, batchState.batchIndex, batchState.batchTotal);
    syncDesignGenerateButtonState();
    return;
  }

  if (!draft) {
    if (isDesignDraftEditForScreen(screen.id)) {
      resetDesignDraftEditState({ action: state.designDraftEdit?.action || "delete" });
    }
    renderEmptyDesignOutput(`${screen.name} 尚未生成`, "点击左侧「生成界面设计稿」后，这里会显示对应界面的视觉稿。");
    syncDesignGenerateButtonState();
    return;
  }

  const modelMeta = getDesignModelMeta(draft.model || "unknown");
  const currentTotalAssetVersion = getTotalAssetVersion();
  const isUsingOldTotalAsset = Boolean(currentTotalAssetVersion && draft.totalAssetVersion && draft.totalAssetVersion !== currentTotalAssetVersion);
  const isMissingCurrentTotalAsset = Boolean(currentTotalAssetVersion && !draft.totalAssetVersion);
  const uiAssetNotice = isUsingOldTotalAsset || isMissingCurrentTotalAsset
    ? `<span class="design-stale-note">基于旧总资产或未使用总资产生成；重新生成后会按最新总资产分角色引用。</span>`
    : "";
  const totalAssetStaleNotice = draft.totalAssetStaleReason
    ? `<span class="design-stale-note">${escapeXml(draft.totalAssetStaleReason)}</span>`
    : "";
  const frozenSnapshotNotice = draft.frozenSnapshotStaleReason
    ? `<span class="design-stale-note">当前锁定稿仍基于旧输入：${escapeXml(draft.frozenSnapshotStaleReason)}</span>`
    : (state.lockedDesignDraft
      ? `<span class="design-stale-note">当前设计稿与设计输入已锁定；刷新页面后会自动恢复。</span>`
      : "");
  const recentErrorNotice = draft.lastError
    ? `<span class="design-stale-note">最近一次生成失败：${escapeXml(draft.lastError)}</span>`
    : "";
  const attemptsNotice = Array.isArray(draft.requestAttempts) && draft.requestAttempts.length
    ? `<span class="design-stale-note">生图尝试：${escapeXml(summarizeDesignRequestAttempts(draft.requestAttempts))}</span>`
    : "";
  const referenceRequestNotice = draft.styleReferenceRequestInfo
    ? `<span>${escapeXml(formatStyleReferenceRequestInfo(draft.styleReferenceRequestInfo))}</span>`
    : "";
  const preflightWarningNotice = Array.isArray(draft.preflightWarnings) && draft.preflightWarnings.length
    ? draft.preflightWarnings.slice(0, 4).map((item) => `<span class="design-stale-note">${escapeXml(item)}</span>`).join("")
    : "";
  const generateBusyNotice = job?.status === "generating"
    ? `<span class="design-stale-note">当前界面普通生图进行中：${escapeXml(getDesignJobButtonLabel(job) || "生成中")}</span>`
    : "";
  const editBusyNotice = editJob?.status === "generating"
    ? `<span class="design-stale-note">当前界面正在应用局部编辑；普通生图仍可在其他界面继续进行。</span>`
    : "";
  const editConflictNotice = editJob?.status === "generating" && job?.status === "generating"
    ? `<span class="design-stale-note">当前界面编辑与普通生图并行进行，最终将以最后完成的结果为准。</span>`
    : "";
  const imageHtml = draft.imageUrl
    ? renderDesignDraftImageWithEditLayer({
      imageUrl: draft.imageUrl,
      title: `${screen.name} ${modelMeta.label} 设计稿`,
      editActive: isDesignDraftEditForScreen(screen.id),
      surface: "target"
    })
    : `<div class="empty-visual"><strong>未返回图片</strong><span>${escapeXml(draft.error || "Babylon 没有返回可用图片。")}</span></div>`;
  const editControls = draft.imageUrl ? renderDesignEditControls() : "";

  const target = $("#designOutput");
  target.innerHTML = `
    <div class="design-draft-card">
      ${imageHtml}
      <div class="design-draft-meta">
        <strong>${escapeXml(screen.name)} / 视觉设计稿</strong>
        <span>模型：${escapeXml(modelMeta.label)}　参考图：${draft.referenceCount || 0} 张</span>
        ${referenceRequestNotice}
        ${frozenSnapshotNotice}
        ${totalAssetStaleNotice}
        ${uiAssetNotice}
        ${recentErrorNotice}
        ${attemptsNotice}
        ${preflightWarningNotice}
        ${generateBusyNotice}
        ${editBusyNotice}
        ${editConflictNotice}
        <span>${escapeXml(modelMeta.desc)}</span>
        ${editControls}
        <details>
          <summary>查看生图提示词</summary>
          <div class="design-prompt-preview">${escapeXml(draft.prompt || "")}</div>
        </details>
      </div>
    </div>
  `;

  target.querySelector("[data-open-design-image]")?.addEventListener("click", () => {
    openDesignImageModal(draft.imageUrl, `${screen.name} / 视觉设计稿`);
  });
  bindDesignEditControls(target);
  syncDesignGenerateButtonState();
}

function openImageLightbox(imageUrl, title = "图片预览") {
  if (!imageUrl) return;
  closeDesignImageModal();

  activeDesignLightbox = document.createElement("div");
  activeDesignLightbox.className = "design-lightbox";
  activeDesignLightbox.innerHTML = `
    <div class="design-lightbox-backdrop" data-close-design-lightbox></div>
    <section class="design-lightbox-panel" role="dialog" aria-modal="true" aria-label="${escapeXml(title)}">
      <div class="design-lightbox-head">
        <strong>${escapeXml(title)}</strong>
        <button type="button" data-close-design-lightbox>关闭</button>
      </div>
      <div class="design-lightbox-body">
        <img src="${escapeXml(imageUrl)}" alt="${escapeXml(title)}">
      </div>
    </section>
  `;

  document.body.appendChild(activeDesignLightbox);
  document.body.classList.add("has-design-lightbox");
  activeDesignLightbox.querySelectorAll("[data-close-design-lightbox]").forEach((item) => {
    item.addEventListener("click", closeDesignImageModal);
  });
  document.addEventListener("keydown", handleDesignLightboxKeydown);
}

function openDesignImageModal(imageUrl, title = "界面视觉设计稿") {
  openImageLightbox(imageUrl, title);
}

function closeDesignImageModal() {
  if (!activeDesignLightbox) return;
  activeDesignLightbox.remove();
  activeDesignLightbox = null;
  document.body.classList.remove("has-design-lightbox");
  document.removeEventListener("keydown", handleDesignLightboxKeydown);
}

function handleDesignLightboxKeydown(event) {
  if (event.key === "Escape") {
    closeDesignImageModal();
  }
}

function getSelectedDesignModel() {
  return $("#designModel")?.value || DESIGN_MODELS[0].id;
}

function getDesignReferenceLimit() {
  return DESIGN_DRAFT_REFERENCE_LIMIT;
}

function getDesignCompositionAnalysisTimeoutMs() {
  return DESIGN_COMPOSITION_ANALYSIS_TIMEOUT_MS;
}

function getDesignDraftImageTimeoutMs() {
  return DESIGN_DRAFT_IMAGE_TIMEOUT_MS;
}

function getScreenDirectImageTimeoutMs() {
  return SCREEN_DIRECT_IMAGE_TIMEOUT_MS;
}

function formatMinutesForTimeout(timeoutMs) {
  return Math.max(1, Math.ceil((Number(timeoutMs) || 0) / 60000));
}

function getDesignModelMeta(modelId) {
  return DESIGN_MODELS.find((model) => model.id === modelId) || {
    id: modelId,
    label: modelId,
    desc: "自定义 Babylon 图像模型"
  };
}

async function prepareDesignGenerationSource() {
  if (window.location.protocol === "file:") {
    $("#designStatus").textContent = "请通过本地服务或 Vercel 打开";
    renderEmptyDesignOutput("当前是 file:// 打开", `设计稿生图需要调用 /api/generate-design。请双击 start-local.bat，然后访问 ${getLocalAccessHint()}`);
    return false;
  }

  if (!hasUsablePlanningSource()) {
    $("#designStatus").textContent = "请先输入策划案";
    renderEmptyDesignOutput("缺少策划案", "先输入或上传策划案，再生成交互方案和视觉设计稿。");
    return false;
  }

  if (!state.fullPlan && !planOutput.value.trim()) {
    await generatePlan({ useApi: true });
  } else {
    syncPlanFromEditor();
  }
  return true;
}

async function generateDirectDesignDraftForScreen(targetScreen, options = {}) {
  const targetScreenId = targetScreen?.id;
  if (!targetScreenId) return { ok: false, error: "未识别到当前界面" };
  if (getDesignJob(targetScreenId)?.status === "generating") {
    if (options.cancelExisting !== false) {
      cancelDesignJob(targetScreenId, `${targetScreen.name} 已取消生成`);
      return { ok: false, cancelledByUser: true, error: "已取消生成" };
    }
    return { ok: false, error: `${targetScreen.name} 正在生成中` };
  }

  const requestId = createDesignRequestId(targetScreenId);
  const generationVersion = state.designInputVersion;
  const model = getSelectedDesignModel();
  const directImageTimeoutMs = getScreenDirectImageTimeoutMs();
  const previousDraft = getDesignDraftForScreen(targetScreen) ? { ...getDesignDraftForScreen(targetScreen) } : null;
  state.designJobs[targetScreenId] = {
    status: "generating",
    jobType: "draft-generate",
    requestId,
    screenId: targetScreenId,
    screenName: targetScreen.name || "",
    screenKind: targetScreen.kind || "generic",
    screenKey: getDesignDraftScreenKey(targetScreen),
    startedAt: Date.now(),
    phaseStartedAt: Date.now(),
    phaseTimeoutMs: 0,
    phaseMaxWaitLabel: "",
    model,
    styleKeywords: "",
    styleTransferKeywords: "",
    referenceCount: 0,
    inputVersion: generationVersion,
    phase: "准备生成...",
    requestStatus: "preparing",
    designRequestStatus: null,
    designRequestStatusError: "",
    cancelledByUser: false,
    lastTrackedRequestId: requestId
  };
  const jobRef = state.designJobs[targetScreenId];
  createDesignJobAbortController(targetScreenId);
  startDesignJobProgressTimer(targetScreenId, requestId);
  startDesignRequestStatusPolling(targetScreenId, requestId);
  state.isGeneratingDesign = true;
  renderDesignTabs();
  if (state.activeDesignScreen === targetScreenId) {
    renderDesignOutput();
  }
  syncDesignGenerateButtonState();

  try {
    const directDraft = await generateScreenDesignImageDirect(targetScreen, {
      model,
      requestId,
      timeoutMs: options.timeoutMs || directImageTimeoutMs
    });
    if (!isDesignJobCurrent(targetScreenId, requestId)) {
      const currentJob = getDesignJob(targetScreenId);
      const cancelledByUser = Boolean(currentJob?.cancelledByUser || state.designBatch?.stopRequested);
      return cancelledByUser
        ? { ok: false, cancelledByUser: true, error: "已取消生成", screenId: targetScreenId }
        : {
          ok: false,
          detached: true,
          error: `${targetScreen.name} 的前端等待已脱钩，已继续后续界面`,
          screenId: targetScreenId,
          requestId,
          recoveredStatus: {
            requestId,
            imageUrl: directDraft.imageUrl,
            images: directDraft.files?.length ? [directDraft.imageUrl, ...(directDraft.files.map((item) => item?.url).filter(Boolean))] : [directDraft.imageUrl],
            files: directDraft.files || [],
            model: directDraft.model || model,
            durationMs: directDraft.durationMs || 0,
            referenceCount: directDraft.referenceCount || 0,
            referenceWarnings: directDraft.preflightWarnings || [],
            updatedAt: Date.now()
          }
        };
    }
    setDesignDraftForScreen(targetScreen, {
      ...directDraft,
      completedAt: Date.now(),
      lastJobType: "draft-generate",
      pendingLateRequestId: "",
      lastFailedRequestId: "",
      lastError: ""
    });
    clearDesignLateRecovery(targetScreenId, requestId);
    state.designJobs[targetScreenId] = {
      ...state.designJobs[targetScreenId],
      status: "success",
      phase: "",
      requestStatus: "completed",
      abortController: null,
      completedAt: Date.now(),
      cancelledByUser: false,
      error: ""
    };
    renderDesignTabs();
    if (state.activeDesignScreen === targetScreenId) {
      $("#designStatus").textContent = options.batchTotal
        ? `正在生成全部设计稿：${options.batchIndex}/${options.batchTotal} ${targetScreen.name} 已完成`
        : `${targetScreen.name} 设计稿已生成`;
      renderDesignOutput();
    }
    return { ok: true, screenId: targetScreenId };
  } catch (error) {
    if (!isDesignJobCurrent(targetScreenId, requestId)) {
      const currentJob = getDesignJob(targetScreenId);
      const cancelledByUser = Boolean(currentJob?.cancelledByUser || state.designBatch?.stopRequested || isClientAbortError(error));
      if (!cancelledByUser) {
        startDetachedDesignResultPolling(targetScreen, requestId, {
          fallbackDraft: previousDraft ? { ...previousDraft } : null,
          prompt: previousDraft?.prompt || "",
          model,
          referenceCount: previousDraft?.referenceCount || 0,
          referenceLabels: previousDraft?.referenceLabels || [],
          preflightWarnings: previousDraft?.preflightWarnings || [],
          styleReferenceRequestInfo: previousDraft?.styleReferenceRequestInfo || null,
          styleTransferKeywords: previousDraft?.styleTransferKeywords || "",
          uiAssetVersion: previousDraft?.uiAssetVersion || "",
          totalAssetVersion: previousDraft?.totalAssetVersion || "",
          totalAssetRoles: previousDraft?.totalAssetRoles || [],
          usedUiAsset: previousDraft?.usedUiAsset,
          usedTotalAsset: previousDraft?.usedTotalAsset,
          directMode: true
        });
      }
      return cancelledByUser
        ? { ok: false, cancelledByUser: true, error: "已取消生成", screenId: targetScreenId }
        : { ok: false, detached: true, error: `${targetScreen.name} 的前端等待已脱钩，已继续后续界面`, screenId: targetScreenId, requestId };
    }
    const message = normalizeDesignGenerationError(error);
    const draftMeta = error?.draftMeta || {};
    const timedOut = isClientTimeoutError(error);
    if (previousDraft?.imageUrl) {
      setDesignDraftForScreen(targetScreen, {
        ...previousDraft,
        lastError: message,
        lastFailedRequestId: requestId,
        pendingLateRequestId: timedOut ? requestId : ""
      });
    } else {
      setDesignDraftForScreen(targetScreen, {
        error: message,
        model,
        referenceCount: draftMeta.referenceCount || 0,
        referenceLabels: draftMeta.referenceLabels || [],
        preflightWarnings: draftMeta.preflightWarnings || ["直连生图模式失败"],
        styleTransferKeywords: "",
        prompt: draftMeta.prompt || buildDesignGenerationPrompt(targetScreen, getStylePromptText(), "", null, null),
        requestId,
        lastFailedRequestId: requestId,
        pendingLateRequestId: timedOut ? requestId : ""
      });
    }
    state.designJobs[targetScreenId] = {
      ...state.designJobs[targetScreenId],
      status: "error",
      phase: "",
      error: message,
      requestStatus: "failed",
      abortController: null,
      completedAt: Date.now(),
      timedOut,
      cancelledByUser: false,
      lastTrackedRequestId: requestId
    };
    if (timedOut || /中断|网络不可用|Network/i.test(message)) {
      startDetachedDesignResultPolling(targetScreen, requestId, {
        fallbackDraft: previousDraft ? { ...previousDraft } : null,
        prompt: draftMeta.prompt || previousDraft?.prompt || "",
        model,
        referenceCount: draftMeta.referenceCount || previousDraft?.referenceCount || 0,
        referenceLabels: draftMeta.referenceLabels || previousDraft?.referenceLabels || [],
        preflightWarnings: draftMeta.preflightWarnings || previousDraft?.preflightWarnings || [],
        styleReferenceRequestInfo: previousDraft?.styleReferenceRequestInfo || null,
        styleTransferKeywords: previousDraft?.styleTransferKeywords || "",
        uiAssetVersion: previousDraft?.uiAssetVersion || "",
        totalAssetVersion: previousDraft?.totalAssetVersion || "",
        totalAssetRoles: previousDraft?.totalAssetRoles || [],
        usedUiAsset: previousDraft?.usedUiAsset,
        usedTotalAsset: previousDraft?.usedTotalAsset,
        directMode: true
      });
    } else {
      clearDesignLateRecovery(targetScreenId, requestId);
    }
    if (state.activeDesignScreen === targetScreenId) {
      $("#designStatus").textContent = `${targetScreen.name} 生成失败：${message}`;
    }
    return {
      ok: false,
      error: message,
      screenId: targetScreenId,
      timedOut,
      failed: !timedOut
    };
  } finally {
    clearDesignJobProgressTimer(jobRef);
    clearDesignJobStatusPolling(jobRef);
    state.isGeneratingDesign = isDesignBatchRunning() || hasAnyDesignJobGenerating();
    renderDesignTabs();
    if (state.activeDesignScreen === targetScreenId) {
      renderDesignOutput();
    }
    syncDesignGenerateButtonState();
  }
}

async function generateAllDesignDrafts() {
  const batch = state.designBatch || {};
  if (batch.status === "generating") {
    batch.stopRequested = true;
    if (batch.currentScreenId) {
      cancelDesignJob(batch.currentScreenId, "已停止批量生成");
    }
    $("#designStatus").textContent = `正在停止全部设计稿生成：成功 ${batch.success || 0} 个，失败 ${batch.failed || 0} 个`;
    syncDesignGenerateButtonState();
    return;
  }

  if (!(await prepareDesignGenerationSource())) return;

  const selectedScreens = getSelectedScreens().filter((screen) => !isUiAssetDesignScreenId(screen.id));
  if (!selectedScreens.length) {
    $("#designStatus").textContent = "未识别到普通目标界面";
    renderEmptyDesignOutput("未识别到普通目标界面", "批量生成不会处理总资产，请先在目标界面列表中保留至少一个普通界面。");
    return;
  }

  state.designBatch = {
    status: "generating",
    stopRequested: false,
    currentScreenId: "",
    screenIds: selectedScreens.map((screen) => screen.id),
    completedScreenIds: [],
    failedScreenIds: [],
    skippedScreenIds: [],
    total: selectedScreens.length,
    index: 0,
    success: 0,
    failed: 0
  };
  state.isGeneratingDesign = true;
  renderDesignTabs();
  syncDesignGenerateButtonState();

  for (let index = 0; index < selectedScreens.length; index += 1) {
    const currentBatch = state.designBatch;
    if (currentBatch.stopRequested) break;
    const screen = selectedScreens[index];
    currentBatch.currentScreenId = screen.id;
    currentBatch.index = index + 1;
    state.activeDesignScreen = screen.id;
    $("#designStatus").textContent = `正在生成全部设计稿：${index + 1}/${selectedScreens.length} ${screen.name}`;
    if (state.isAutoGeneratingWorkflow) {
      setAutoGenerateStatus(`正在自动生成：生成所有界面设计稿 ${index + 1}/${selectedScreens.length}`);
    }
    renderDesignTabs();
    renderDesignOutput();
    syncDesignGenerateButtonState();

    if (getDesignEditJob(screen.id)?.status === "generating") {
      currentBatch.failed += 1;
      currentBatch.skippedScreenIds = Array.from(new Set([...(currentBatch.skippedScreenIds || []), screen.id]));
      currentBatch.failedScreenIds = (currentBatch.failedScreenIds || []).filter((id) => id !== screen.id);
      currentBatch.completedScreenIds = (currentBatch.completedScreenIds || []).filter((id) => id !== screen.id);
      const existingDraft = getDesignDraftForScreen(screen);
      if (existingDraft?.imageUrl) {
        setDesignDraftForScreen(screen, {
          ...existingDraft,
          lastError: "该界面正在编辑，已跳过本轮批量"
        });
      }
      $("#designStatus").textContent = `正在生成全部设计稿：${index + 1}/${selectedScreens.length} ${screen.name} 正在编辑，已跳过`;
      renderDesignTabs();
      continue;
    }

    const result = await generateDirectDesignDraftForScreen(screen, {
      batchIndex: index + 1,
      batchTotal: selectedScreens.length,
      cancelExisting: false
    });
    if (currentBatch.stopRequested || result.cancelledByUser) break;
    if (result.ok) {
      currentBatch.success += 1;
      currentBatch.completedScreenIds = Array.from(new Set([...(currentBatch.completedScreenIds || []), screen.id]));
      currentBatch.failedScreenIds = (currentBatch.failedScreenIds || []).filter((id) => id !== screen.id);
      currentBatch.skippedScreenIds = (currentBatch.skippedScreenIds || []).filter((id) => id !== screen.id);
    } else {
      currentBatch.failed += 1;
      currentBatch.failedScreenIds = Array.from(new Set([...(currentBatch.failedScreenIds || []), screen.id]));
      currentBatch.completedScreenIds = (currentBatch.completedScreenIds || []).filter((id) => id !== screen.id);
      currentBatch.skippedScreenIds = (currentBatch.skippedScreenIds || []).filter((id) => id !== screen.id);
      if (result.recoveredStatus) {
        applyRecoveredDesignDraftIfEligible(screen, result.requestId || result.recoveredStatus.requestId || "", result.recoveredStatus);
      }
    }
    renderDesignTabs();
  }

  const finalBatch = state.designBatch;
  const stopped = Boolean(finalBatch.stopRequested);
  const skippedCount = Array.isArray(finalBatch.skippedScreenIds) ? finalBatch.skippedScreenIds.length : 0;
  const failedText = skippedCount
    ? `失败 ${finalBatch.failed || 0} 个（其中编辑中跳过 ${skippedCount} 个）`
    : `失败 ${finalBatch.failed || 0} 个`;
  finalBatch.status = stopped ? "stopped" : "completed";
  finalBatch.currentScreenId = "";
  finalBatch.stopRequested = false;
  state.isGeneratingDesign = hasAnyDesignJobGenerating();
  $("#designStatus").textContent = stopped
    ? `已停止全部设计稿生成：成功 ${finalBatch.success || 0} 个，${failedText}`
    : `全部设计稿生成完成：成功 ${finalBatch.success || 0} 个，${failedText}`;
  persistLockedDesignDraftIfNeeded();
  renderDesignTabs();
  renderDesignOutput();
  syncDesignGenerateButtonState();
}

async function generateDesignDrafts() {
  if (!(await prepareDesignGenerationSource())) return;

  const selectedScreens = getSelectedScreens();
  if (isUiAssetDesignScreenId()) {
    await generateTotalAssetsFromDesignTab(selectedScreens[0] || getUiAssetDesignScreen());
    return;
  }

  if (!selectedScreens.length) {
    $("#designStatus").textContent = "未识别到目标界面";
    renderEmptyDesignOutput("未识别到目标界面", "请在策划案中写明主界面、商店、背包、任务等目标界面。");
    return;
  }

  if (!selectedScreens.some((screen) => screen.id === state.activeDesignScreen)) {
    state.activeDesignScreen = selectedScreens[0].id;
  }

  const targetScreenId = state.activeDesignScreen;
  const targetScreen = selectedScreens.find((screen) => screen.id === targetScreenId);
  if (!targetScreen) {
    $("#designStatus").textContent = "未识别到当前界面";
    renderEmptyDesignOutput("未识别到当前界面", "请先在目标界面列表里选择一个要生成的界面。");
    return;
  }

  const currentJob = getDesignJob(targetScreenId);
  if (currentJob?.status === "generating") {
    cancelDesignJob(targetScreenId, `${targetScreen.name} 已取消生成`);
    return;
  }

  await generateDirectDesignDraftForScreen(targetScreen, { cancelExisting: false });
  return;

  try {
    const preflightStartedAt = Date.now();
    const preflightMaxMs = 3000;
    const yieldToRender = () => new Promise((resolve) => setTimeout(resolve, 0));
    const isPreflightExpired = () => Date.now() - preflightStartedAt >= preflightMaxMs;
    const remainingPreflightMs = (maxMs = 700) => Math.max(1, Math.min(maxMs, preflightMaxMs - (Date.now() - preflightStartedAt)));
    const addPreflightWarning = (label, error) => {
      const message = error?.message || error || "已跳过";
      preflightWarnings.push(`${label.replace(/\.\.\.$/, "")}：${message}`);
    };
    const setPreflightPhase = async (phase) => {
      if (!isDesignJobCurrent(targetScreenId, requestId)) return;
      setDesignJobPhase(targetScreenId, phase, {
        phaseTimeoutMs: preflightMaxMs,
        phaseMaxWaitLabel: "3 秒",
        preflightWarnings
      });
      if (state.activeDesignScreen === targetScreenId) {
        renderDesignOutput();
      }
      await yieldToRender();
    };
    const runPreflightStep = async (phase, fallback, fn, { timeoutMs = 700, skipWhenExpired = true } = {}) => {
      if (skipWhenExpired && isPreflightExpired()) {
        addPreflightWarning(phase, "预处理超过 3 秒，已跳过该步骤");
        return fallback;
      }
      await setPreflightPhase(phase);
      let timeoutId = null;
      try {
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(createClientTimeoutError(`${phase.replace(/\.\.\.$/, "")}超过 ${Math.ceil(remainingPreflightMs(timeoutMs) / 1000)} 秒，已跳过`));
          }, remainingPreflightMs(timeoutMs));
        });
        return await Promise.race([Promise.resolve().then(fn), timeoutPromise]);
      } catch (error) {
        addPreflightWarning(phase, error);
        return fallback;
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    };
    const buildDirectLockedRefs = () => {
      const selection = getStyleReferenceSelectionState();
      const items = selection.sendableReferences.slice(0, referenceLimit);
      return {
        referenceImages: items.map((item) => item.dataUrl).filter(Boolean),
        referenceLabels: items.map((item) => item.label),
        styleKeywords: getStylePromptText(),
        styleTransferKeywords: "",
        referenceSignature: "",
        referenceSourceSignature: "",
        referenceRequestInfo: null
      };
    };

    let totalAssetReferences = await runPreflightStep(
      "整理总资产引用...",
      [],
      () => getTotalAssetReferencesForDesign(targetScreen, getStoredDesignCompositionAnalysis(targetScreen)),
      { timeoutMs: 500 }
    );
    const hasTotalAssetReference = totalAssetReferences.length > 0;
    let styleCache = null;
    let lockedRefs = buildDirectLockedRefs();

    if (!hasTotalAssetReference) {
      lockedRefs = await runPreflightStep(
        "整理上传参考图...",
        lockedRefs,
        () => getLockedStyleReferencesForDesign(),
        { timeoutMs: 500 }
      );
    }
    lockedRefs = { ...lockedRefs, styleTransferKeywords: "" };

    let designComposition = null;
    designComposition = await runPreflightStep(
      "读取交互案组件...",
      buildFallbackDesignCompositionAnalysis(targetScreen, "读取交互案当前界面组件失败，已使用保守组件裁剪继续"),
      () => ensureDesignCompositionAnalysis(targetScreen, { force: false, timeoutMs: compositionTimeoutMs }),
      { timeoutMs: 600 }
    );
    state.designCompositionAnalyses[targetScreen.id] = designComposition;
    if (!isDesignJobCurrent(targetScreenId, requestId)) return;

    let uiAssetReadinessWarnings = [];
    let uiComponentBaselines = [];
    await setPreflightPhase("整理 UI资产约束...");
    try {
      uiAssetReadinessWarnings = collectUiAssetReadinessWarnings(targetScreen, designComposition);
      if (uiAssetReadinessWarnings.length) {
        designComposition.uiAssetReadinessWarnings = uiAssetReadinessWarnings;
      }
      uiComponentBaselines = getRelevantUiComponentBaselines(targetScreen, designComposition);
    } catch (error) {
      const message = error?.message || "";
      if (/UI资产画风贴合不足/.test(message)) throw error;
      addPreflightWarning("整理 UI资产约束", message || "已跳过 UI资产基准检查");
      uiAssetReadinessWarnings = [`UI资产约束整理失败，已继续生图：${message || "未知错误"}`];
      designComposition.uiAssetReadinessWarnings = uiAssetReadinessWarnings;
      uiComponentBaselines = [];
    }

    totalAssetReferences = getTotalAssetReferencesForDesign(targetScreen, designComposition);
    const hasCurrentTotalAssetReference = totalAssetReferences.length > 0;
    const originalReferenceItems = (lockedRefs.referenceImages || [])
      .map((imageUrl, index) => ({
        imageUrl,
        label: (lockedRefs.referenceLabels || [])[index] || `原参考图${index + 1}`
      }))
      .filter((item) => item.imageUrl);
    const combinedReferenceItems = [
      ...totalAssetReferences.map((item) => ({
        imageUrl: item.imageUrl,
        label: item.label
      })),
      ...originalReferenceItems
    ];
    const dedupedReferenceItems = [];
    const seenReferenceImages = new Set();
    combinedReferenceItems.forEach((item) => {
      if (!item.imageUrl || seenReferenceImages.has(item.imageUrl)) return;
      seenReferenceImages.add(item.imageUrl);
      dedupedReferenceItems.push(item);
    });
    const selectedReferenceItems = dedupedReferenceItems.slice(0, referenceLimit);
    const referenceImages = selectedReferenceItems.map((item) => item.imageUrl);
    const referenceLabels = selectedReferenceItems.map((item) => item.label);
    const styleKeywords = lockedRefs.styleKeywords;
    const styleTransferKeywords = "";
    const totalAssetVersion = getTotalAssetVersion();

    setDesignJobPhase(targetScreenId, "生成界面设计稿中...", {
      model,
      phaseTimeoutMs: imageTimeoutMs,
      phaseMaxWaitLabel: `${formatMinutesForTimeout(imageTimeoutMs)} 分钟`,
      styleKeywords,
      styleTransferKeywords,
      referenceCount: referenceImages.length,
      referenceLabels,
      designComposition,
      uiAssetReadinessWarnings,
      totalAssetReferenceCount: totalAssetReferences.length,
      baselineReferenceCount: uiComponentBaselines.length,
      totalAssetVersion,
      totalAssetRoles: totalAssetReferences.map((item) => item.role),
      styleReferenceSignature: lockedRefs.referenceSignature || styleCache?.referenceSignature || "",
      styleReferenceRequestInfo: lockedRefs.referenceRequestInfo || styleCache?.referenceRequestInfo || null,
      preflightWarnings
    });
    if (state.activeDesignScreen === targetScreenId) {
      renderDesignOutput();
    }
    renderDesignTabs();
    renderDesignPromptSummary();

    const modelMeta = getDesignModelMeta(model);
    if (state.activeDesignScreen === targetScreenId) {
      $("#designStatus").textContent = `生成当前界面设计稿 · ${modelMeta.label} · ${targetScreen.name}`;
    }

    try {
      Object.assign(state.designJobs[targetScreenId], {
        phase: "生成界面设计稿中...",
        phaseStartedAt: Date.now(),
        requestDispatchedAt: Date.now(),
        requestStatus: "waiting-image",
        requestAttempts: [],
        allowAttemptTimeoutRetry: true,
        timeoutHandled: false
      });
      ensureDesignJobProgressTimer(targetScreenId, requestId);
      if (state.activeDesignScreen === targetScreenId) {
        renderDesignOutput();
      }
      const draft = await generateDesignDraftWithModelRetry(targetScreen, { referenceImages, referenceLabels, styleKeywords, styleTransferKeywords, model, designComposition, timeoutMs: imageTimeoutMs, preflightWarnings });
      if (!isDesignJobCurrent(targetScreenId, requestId)) return;
      setDesignDraftForScreen(targetScreen, {
        ...draft,
        styleReferenceRequestInfo: lockedRefs.referenceRequestInfo || styleCache?.referenceRequestInfo || null,
        preflightWarnings
      });
      state.designJobs[targetScreenId] = {
        ...state.designJobs[targetScreenId],
        status: "success",
        phase: "",
        requestStatus: "completed",
        abortController: null,
        completedAt: Date.now()
      };
    } catch (error) {
      if (!isDesignJobCurrent(targetScreenId, requestId)) return;
      const message = normalizeDesignGenerationError(error);
      if (previousDraft?.imageUrl) {
        setDesignDraftForScreen(targetScreen, { ...previousDraft, lastError: message, requestAttempts: error.requestAttempts || state.designJobs[targetScreenId]?.requestAttempts || [] });
      } else {
        setDesignDraftForScreen(targetScreen, {
        error: message,
        model,
        referenceCount: referenceImages.length,
        referenceLabels,
        designComposition,
        preflightWarnings,
        requestAttempts: error.requestAttempts || state.designJobs[targetScreenId]?.requestAttempts || [],
        styleTransferKeywords,
        styleReferenceRequestInfo: lockedRefs.referenceRequestInfo || styleCache?.referenceRequestInfo || null,
        prompt: buildDesignGenerationPrompt(targetScreen, styleKeywords, styleTransferKeywords, referenceLabels, designComposition)
        });
      }
      state.designJobs[targetScreenId] = {
        ...state.designJobs[targetScreenId],
        status: "error",
        phase: "",
        error: message,
        requestStatus: "failed",
        abortController: null,
        completedAt: Date.now()
      };
    }

    renderDesignTabs();
    if (state.activeDesignScreen === targetScreenId) {
      const completedJob = getDesignJob(targetScreenId);
      $("#designStatus").textContent = completedJob?.status === "error"
        ? `${targetScreen.name} 生成失败：${completedJob.error || "生成失败"}`
        : `${targetScreen.name} 设计稿已生成`;
      renderDesignOutput();
    }
  } catch (error) {
    if (isDesignJobCurrent(targetScreenId, requestId)) {
      const message = normalizeDesignGenerationError(error);
      if (previousDraft?.imageUrl) {
        setDesignDraftForScreen(targetScreen, { ...previousDraft, lastError: message });
      } else {
        setDesignDraftForScreen(targetScreen, {
        error: message,
        model,
        referenceCount: 0,
        preflightWarnings,
        styleTransferKeywords: "",
        prompt: buildDesignGenerationPrompt(targetScreen, "", "", null, getStoredDesignCompositionAnalysis(targetScreen))
        });
      }
      state.designJobs[targetScreenId] = {
        ...state.designJobs[targetScreenId],
        status: "error",
        phase: "",
        error: message,
        abortController: null,
        completedAt: Date.now()
      };
      if (state.activeDesignScreen === targetScreenId) {
        $("#designStatus").textContent = `${targetScreen.name} 生成失败：${message}`;
      }
    }
  } finally {
    clearDesignJobProgressTimer(getDesignJob(targetScreenId));
    clearDesignJobStatusPolling(getDesignJob(targetScreenId));
    state.isGeneratingDesign = hasAnyDesignJobGenerating();
    renderDesignTabs();
    if (state.activeDesignScreen === targetScreenId) {
      renderDesignOutput();
    }
    syncDesignGenerateButtonState();
  }
}

async function generateUiAssetFromDesignTab(contextScreen = getSelectedScreens()[0] || getUiAssetDesignScreen()) {
  return generateTotalAssetsFromDesignTab(contextScreen);
}

function getFailedTotalAssetTypes(kit = state.totalAssetKit || {}) {
  return TOTAL_ASSET_TYPES.filter((meta) => {
    const part = kit?.[meta.id] || {};
    return part.status === "error" && !part.imageUrl;
  });
}

function isTotalAssetPartReady(part = {}) {
  return part.status === "ready" && Boolean(part.imageUrl);
}

function isTotalAssetPartFresh(part = {}) {
  return isTotalAssetPartReady(part) && !part.dirty;
}

function getPendingTotalAssetTypesForRefresh(kit = state.totalAssetKit || {}) {
  return TOTAL_ASSET_TYPES.filter((meta) => !isTotalAssetPartFresh(kit?.[meta.id] || {}));
}

function prepareTotalAssetPartForGeneration(part = createEmptyTotalAssetPart(), analysis = null) {
  if (isTotalAssetPartFresh(part)) {
    return {
      ...part,
      analysis: part.analysis || analysis,
      error: part.error || ""
    };
  }
  return {
    ...createEmptyTotalAssetPart(),
    ...part,
    status: "idle",
    imageUrl: "",
    referenceDataUrl: "",
    files: [],
    analysis,
    error: "",
    uiAssetCoverage: null,
    uiAssetStyleFidelity: null
  };
}

function clearTotalAssetPartForRegeneration(part = createEmptyTotalAssetPart(), analysis = null) {
  return {
    ...createEmptyTotalAssetPart(),
    analysis: analysis || part.analysis || null,
    status: "idle",
    imageUrl: "",
    referenceDataUrl: "",
    files: [],
    prompt: "",
    error: "",
    dirty: false,
    dirtyReason: "",
    uiAssetCoverage: null,
    uiAssetStyleFidelity: null
  };
}

async function generateTotalAssetPartWithRetryState({
  meta,
  analysis,
  referenceImages,
  referenceLabels,
  styleKeywords,
  styleTransferKeywords,
  model,
  signal,
  retryAttempt = 0,
  retryMax = TOTAL_ASSET_IMAGE_MAX_RETRIES
}) {
  throwIfAborted(signal);
  const retryText = retryAttempt > 0 ? `，正在重新生成 ${retryAttempt}/${retryMax}` : "";
  patchTotalAssetKit({
    currentAssetType: meta.id,
    currentAssetStartedAt: Date.now(),
    [meta.id]: {
      ...((state.totalAssetKit || createEmptyTotalAssetKit())[meta.id] || createEmptyTotalAssetPart()),
      status: "generating",
      imageUrl: "",
      referenceDataUrl: "",
      files: [],
      prompt: "",
      error: "",
      retryAttempt,
      retryMax,
      uiAssetCoverage: null,
      uiAssetStyleFidelity: null
    }
  });
  $("#designStatus").textContent = retryAttempt > 0
    ? `正在重新生成${meta.label} ${retryAttempt}/${retryMax}`
    : `生成${meta.label}中...`;
  if (state.isAutoGeneratingWorkflow) {
    setAutoGenerateStatus(retryAttempt > 0
      ? `正在自动生成：重新生成${meta.label} ${retryAttempt}/${retryMax}`
      : `正在自动生成：生成${meta.label}`);
  }
  renderDesignPromptSummary();
  renderUiAssetOutputIfActive();

  try {
    const asset = await generateTotalAssetImage({
      type: meta.id,
      analysis,
      referenceImages,
      referenceLabels,
      styleKeywords,
      styleTransferKeywords,
      model,
      signal
    });
    const referenceDataUrl = await resolveImageReferenceDataUrl(asset.imageUrl);
    patchTotalAssetPart(meta.id, {
      status: "ready",
      imageUrl: asset.imageUrl,
      referenceDataUrl,
      files: asset.files || [],
      prompt: asset.prompt || "",
      analysis: asset.analysis || analysis,
      error: "",
      dirty: false,
      dirtyReason: "",
      retryAttempt,
      retryMax
    });
    if (meta.id === "ui") {
      if (asset.uiAssetBoardSectionSpec) {
        analysis.uiAssetBoardSectionSpec = asset.uiAssetBoardSectionSpec;
      }
      const universalCoverage = buildUiAssetCoverage(getUniversalUiAssetComponents(), getLockedUiComponentBaselines());
      getUiComponentBaselineState().coverage = {
        ...universalCoverage,
        status: "ready",
        missing: [],
        unconfirmed: universalCoverage.required
      };
      analysis.uiAssetCoverage = getUiComponentBaselineState().coverage;
      patchTotalAssetPart(meta.id, {
        uiAssetCoverage: analysis.uiAssetCoverage,
        analysis: { ...(asset.analysis || analysis), uiAssetCoverage: analysis.uiAssetCoverage }
      });
      $("#designStatus").textContent = "UI控件资产图已生成并可用；跳过交互案组件覆盖阻断，继续生成其他总资产。";
    }
    renderDesignPromptSummary();
    renderUiAssetOutputIfActive();
    return { ok: true, meta, asset };
  } catch (error) {
    if (isAbortLikeError(error)) throw error;
    const message = error?.message || `${meta.label}生成失败`;
    patchTotalAssetPart(meta.id, {
      status: "error",
      imageUrl: "",
      referenceDataUrl: "",
      files: [],
      prompt: buildTotalAssetPrompt(analysis, meta.id, styleKeywords, ""),
      error: retryAttempt > 0 ? `${message}（重试 ${retryAttempt}/${retryMax}）` : message,
      retryAttempt,
      retryMax,
      uiAssetCoverage: null,
      uiAssetStyleFidelity: null
    });
    renderDesignPromptSummary();
    renderUiAssetOutputIfActive();
    return { ok: false, meta, error: message };
  }
}

async function regenerateActiveTotalAssetPart() {
  const kit = state.totalAssetKit || createEmptyTotalAssetKit();
  if (isTotalAssetFullGenerationBusy(kit)) {
    cancelTotalAssetAnalysis(kit.status === "analyzing" ? "已取消分析，未生成总资产" : "已取消总资产生成");
    renderDesignOutput();
    syncDesignGenerateButtonState();
    return;
  }

  const activeType = TOTAL_ASSET_TYPES.some((item) => item.id === state.totalAssetActiveType)
    ? state.totalAssetActiveType
    : "ui";
  state.totalAssetActiveType = activeType;
  const meta = getTotalAssetPartMeta(activeType);
  if (isTotalAssetPartJobGenerating(activeType, kit)) {
    cancelTotalAssetPartJob(activeType, "已取消生成");
    return;
  }
  const analysis = kit.analysis || kit[activeType]?.analysis;
  if (!analysis) {
    $("#designStatus").textContent = "请先生成总资产分析，再单独生成当前资产。";
    renderUiAssetOutputIfActive();
    return;
  }

  const selection = getStyleReferenceSelectionState();
  const styleKeywords = getStylePromptText();
  const model = getSelectedDesignModel();
  const prepared = await prepareStyleReferenceItemsForRequest(selection.sendableReferences);
  const referenceImages = prepared.referenceImages;
  const referenceLabels = prepared.referenceLabels;
  if (!referenceImages.length) {
    $("#designStatus").textContent = "缺少可发送参考图，无法重新生成当前资产。";
    renderUiAssetOutputIfActive();
    return;
  }

  const requestId = createUiAssetKitRequestId().replace("ui_asset", `total_asset_${activeType}`);
  const cancelController = new AbortController();
  setTotalAssetPartJob(activeType, {
    requestId,
    abortController: cancelController,
    status: "generating",
    startedAt: Date.now(),
    model
  });
  patchTotalAssetKit({
    imageModel: model,
    error: "",
    currentAssetType: activeType,
    currentAssetStartedAt: 0,
    [activeType]: clearTotalAssetPartForRegeneration(kit[activeType] || createEmptyTotalAssetPart(), analysis)
  });
  syncUiAssetKitButtonState();
  renderDesignPromptSummary();
  renderUiAssetOutputIfActive();

  const styleTransferKeywords = buildTotalAssetRoleStyleTransferKeywords(analysis, activeType);

  try {
    const result = await generateTotalAssetPartWithRetryState({
      meta,
      analysis,
      referenceImages,
      referenceLabels,
      styleKeywords,
      styleTransferKeywords,
      model,
      signal: cancelController.signal,
      retryAttempt: 0,
      retryMax: TOTAL_ASSET_IMAGE_MAX_RETRIES
    });

    if (getTotalAssetPartJob(activeType)?.requestId !== requestId) return;
    clearTotalAssetPartJob(activeType, requestId);
    const readyTypes = getTotalAssetReadyTypes(state.totalAssetKit);
    const allAssetsReady = readyTypes.length === TOTAL_ASSET_TYPES.length;
    const failures = getFailedTotalAssetTypes(state.totalAssetKit)
      .map((failedMeta) => `${failedMeta.label}：${state.totalAssetKit?.[failedMeta.id]?.error || "生成失败"}`);
    patchTotalAssetKit({
      status: allAssetsReady ? "ready" : "error",
      currentAssetType: state.totalAssetKit?.currentAssetType === activeType ? "" : state.totalAssetKit?.currentAssetType || "",
      currentAssetStartedAt: state.totalAssetKit?.currentAssetType === activeType ? 0 : state.totalAssetKit?.currentAssetStartedAt || 0,
      updatedAt: Date.now(),
      error: failures.join("；"),
      dirty: allAssetsReady ? false : state.totalAssetKit?.dirty,
      dirtyReason: allAssetsReady ? "" : state.totalAssetKit?.dirtyReason || ""
    });
    if (result.ok) {
      unlockDesignDraftsForTotalAssetChange(`${meta.label}已更新，已有设计稿需重新生成后才会使用最新总资产。`);
    }
    $("#designStatus").textContent = result.ok
      ? `${meta.label}已重新生成`
      : `${meta.label}生成失败：${result.error || "未知错误"}`;
    persistLockedTotalAssetIfNeeded();
  } catch (error) {
    if (getTotalAssetPartJob(activeType)?.requestId !== requestId) return;
    clearTotalAssetPartJob(activeType, requestId);
    const message = isAbortLikeError(error) ? "已取消生成" : error?.message || "当前资产生成失败";
    patchTotalAssetKit({
      status: getTotalAssetReadyTypes(state.totalAssetKit).length ? "error" : "idle",
      currentAssetType: state.totalAssetKit?.currentAssetType === activeType ? "" : state.totalAssetKit?.currentAssetType || "",
      currentAssetStartedAt: state.totalAssetKit?.currentAssetType === activeType ? 0 : state.totalAssetKit?.currentAssetStartedAt || 0,
      error: message
    });
    $("#designStatus").textContent = `${meta.label}${message}`;
  } finally {
    clearTotalAssetPartJob(activeType, requestId);
    renderDesignPromptSummary();
    renderUiAssetOutputIfActive();
    syncDesignGenerateButtonState();
  }
}

async function generateTotalAssetsFromDesignTab(contextScreen = getSelectedScreens()[0] || getUiAssetDesignScreen()) {
  const kit = state.totalAssetKit || {};
  if (isTotalAssetBusy(kit)) {
    cancelTotalAssetAnalysis(kit.status === "analyzing" ? "已取消分析，未生成总资产" : "已取消总资产生成");
    renderDesignOutput();
    syncDesignGenerateButtonState();
    return;
  }

  renderDesignOutput();
  syncDesignGenerateButtonState();
  await refreshTotalAssetKit({
    force: true,
    source: "manual",
    screen: contextScreen,
    model: getSelectedDesignModel()
  });
  renderDesignTabs();
  renderDesignPromptSummary();
  if (isUiAssetDesignScreenId()) {
    renderDesignOutput();
  }
}

async function readStyleReferenceDataUrls() {
  const prepared = await prepareStyleReferenceItemsForRequest(getStyleReferenceSelectionState().sendableReferences);
  return prepared.referenceImages;
}

function getSendableStyleReferenceItems() {
  return getStyleReferenceSelectionState().sendableReferences;
}

function getStyleReferenceIdentity(item = {}) {
  return {
    label: item.label,
    name: item.displayName,
    size: item.size,
    width: item.width || 0,
    height: item.height || 0,
    source: item.originalIndex ?? item.label
  };
}

function getStyleReferenceSignature(items = getSendableStyleReferenceItems(), userKeywords = getStylePromptText()) {
  return JSON.stringify({
    keyword: userKeywords || "",
    refs: items.map((item) => ({
      ...getStyleReferenceIdentity(item),
      requestBytes: item.requestBytes || 0,
      requestHash: item.requestDataUrl ? hashText(item.requestDataUrl) : ""
    }))
  });
}

function getStyleReferenceSourceSignature(selection = getStyleReferenceSelectionState(), userKeywords = getStylePromptText()) {
  return JSON.stringify({
    keyword: userKeywords || "",
    uploadedCount: selection.uploadedCount || 0,
    explicitSelection: Boolean(selection.explicitSelection),
    refs: (selection.selectedReferences || []).map(getStyleReferenceIdentity),
    limitedLabels: selection.limitedLabels || []
  });
}

function createStyleAnalysisRequestId() {
  return `style_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getStyleAnalysisUpdatedText(updatedAt) {
  if (!updatedAt) return "未生成";
  try {
    return new Date(updatedAt).toLocaleString("zh-CN", { hour12: false });
  } catch (error) {
    return "已生成";
  }
}

function syncStyleAnalysisRefreshButtonState() {
  const button = $("#refreshStyleAnalysis");
  if (!button) return;
  const analyzing = state.styleAnalysisCache?.status === "analyzing";
  button.disabled = analyzing;
  button.textContent = analyzing ? "分析中..." : "刷新参考图分析";
  button.classList.toggle("is-loading", analyzing);
}

function createUiAssetKitRequestId() {
  return `ui_asset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function hashText(value) {
  const text = String(value || "");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function getUiAssetKitSignature(items = getSendableStyleReferenceItems(), userKeywords = getStylePromptText(), model = getSelectedDesignModel()) {
  const projectContext = buildTotalAssetProjectContext();
  return JSON.stringify({
    promptVersion: TOTAL_ASSET_PROMPT_VERSION,
    style: getStyleReferenceSignature(items, userKeywords),
    model,
    targetScreens: hashText(JSON.stringify(projectContext.targetScreens || [])),
    screenInteractionSections: hashText(JSON.stringify(projectContext.screenInteractionSections || [])),
    uiRequiredComponents: hashText(JSON.stringify(projectContext.assetDemandSummary?.uiRequiredComponents || [])),
    projectAnchorPolicy: hashText(JSON.stringify(projectContext.projectAnchorPolicy || []))
  });
}

function getUiAssetKitSourceSignature(selection = getStyleReferenceSelectionState(), userKeywords = getStylePromptText(), model = getSelectedDesignModel()) {
  const projectContext = buildTotalAssetProjectContext();
  return JSON.stringify({
    promptVersion: TOTAL_ASSET_PROMPT_VERSION,
    style: getStyleReferenceSourceSignature(selection, userKeywords),
    model,
    targetScreens: hashText(JSON.stringify(projectContext.targetScreens || [])),
    screenInteractionSections: hashText(JSON.stringify(projectContext.screenInteractionSections || [])),
    uiRequiredComponents: hashText(JSON.stringify(projectContext.assetDemandSummary?.uiRequiredComponents || [])),
    projectAnchorPolicy: hashText(JSON.stringify(projectContext.projectAnchorPolicy || []))
  });
}

function syncUiAssetKitButtonState() {
  const button = $("#refreshUiAssetKit");
  updateLockedTotalAssetButton();
  if (!button) return;
  const kit = state.totalAssetKit || {};
  const busy = isTotalAssetBusy(kit);
  const readyTypes = getTotalAssetReadyTypes(kit);
  button.disabled = false;
  button.textContent = busy
    ? kit.status === "analyzing"
      ? "取消分析"
      : "取消生成"
    : readyTypes.length
      ? "刷新总资产"
      : "生成总资产";
  button.classList.toggle("is-loading", busy);
}

function buildTotalAssetProjectContext(screen = getUiAssetDesignScreen()) {
  const selectedScreens = getSelectedScreens();
  const targetScreens = (selectedScreens.length ? selectedScreens : screens)
    .filter(Boolean)
    .filter((item) => item.id !== TOTAL_ASSET_DESIGN_SCREEN_ID)
    .map((item) => ({
      id: item.id,
      name: item.name,
      kind: item.kind,
      goal: item.goal || "",
      entrySource: item.entrySource || "",
      coreAction: item.coreAction || "",
      keyState: item.keyState || "",
      closeBehavior: getScreenCloseBehavior(item)
    }));
  const interactionPlan = getVisualPlanText();
  const screenInteractionSections = targetScreens.map((item) => {
    const section = extractScreenSection(interactionPlan, item);
    return {
      id: item.id,
      name: item.name,
      kind: item.kind,
      section: section ? section.slice(0, 2400) : "",
      missing: !section
    };
  });
  const assetDemandSummary = buildTotalAssetDemandSummary(targetScreens, screenInteractionSections);
  const projectAnchorPolicy = buildProjectAnchorPolicy(targetScreens, screenInteractionSections, assetDemandSummary.uiRequiredComponents);
  return {
    targetScreens,
    targetScreenList: formatTotalAssetTargetScreenList(targetScreens),
    screenInteractionSections,
    projectAnchorPolicy,
    assetDemandSummary,
    missingInteractionSections: screenInteractionSections.filter((item) => item.missing).map((item) => item.name),
    currentScreen: screen ? {
      id: screen.id,
      name: screen.name,
      kind: screen.kind,
      goal: screen.goal || "",
      closeBehavior: getScreenCloseBehavior(screen)
    } : null
  };
}

function formatTotalAssetTargetScreenList(targetScreens = []) {
  return targetScreens.map((item, index) => {
    const details = [
      item.goal ? `目标=${item.goal}` : "",
      item.entrySource ? `入口=${item.entrySource}` : "",
      item.coreAction ? `核心操作=${item.coreAction}` : "",
      item.keyState ? `关键状态=${item.keyState}` : "",
      item.closeBehavior ? `关闭方式=${item.closeBehavior}` : ""
    ].filter(Boolean).join("；");
    return `${index + 1}. ${item.name}${details ? `：${details}` : ""}`;
  }).join("\n");
}

function buildTotalAssetDemandSummary(targetScreens = [], screenInteractionSections = []) {
  const sectionById = new Map(screenInteractionSections.map((item) => [item.id, item]));
  const uiRequiredComponents = extractRequiredUiAssetComponents(targetScreens, screenInteractionSections);
  const ui = targetScreens.map((screen) => {
    const section = sectionById.get(screen.id)?.section || "";
    const sectionLines = pickTotalAssetSentences(section, /按钮|控件|组件|面板|弹窗|标签|Tab|资源栏|进度|道具格|头像|图标|提示|状态|入口|列表|卡片|导航|红点|角标/i, 4);
    return [
      `${screen.name}`,
      screen.goal ? `目标=${screen.goal}` : "",
      screen.entrySource ? `入口=${screen.entrySource}` : "",
      screen.coreAction ? `核心操作=${screen.coreAction}` : "",
      screen.keyState ? `关键状态=${screen.keyState}` : "",
      screen.closeBehavior ? `关闭方式=${screen.closeBehavior}` : "",
      sectionLines.length ? `交互章节=${sectionLines.join("；")}` : ""
    ].filter(Boolean).join("；");
  }).filter(Boolean);
  const background = targetScreens.flatMap((screen) => {
    const section = sectionById.get(screen.id)?.section || "";
    const lines = pickTotalAssetSentences(section, /背景|场景|空间|舞台|地图|大厅|主界面|远景|中景|前景|安全区|站位|焦点|环境|房间|室内|室外/i, 3);
    if (lines.length) return [`${screen.name}：${lines.join("；")}`];
    return [];
  });
  const character = targetScreens.flatMap((screen) => {
    const source = [
      screen.name,
      screen.goal,
      screen.entrySource,
      screen.coreAction,
      screen.keyState,
      screen.closeBehavior,
      sectionById.get(screen.id)?.section || ""
    ].join("\n");
    if (!/角色|宠物|萌宠|NPC|头像|立绘|伙伴|英雄|人物|主角|敌人|怪物|单位|皮肤/i.test(source)) return [];
    const lines = pickTotalAssetSentences(source, /角色|宠物|萌宠|NPC|头像|立绘|伙伴|英雄|人物|主角|敌人|怪物|单位|皮肤/i, 4);
    return [`${screen.name}：${lines.join("；") || "目标界面清单或交互章节要求角色相关内容"}`];
  });
  return {
    ui,
    uiRequiredComponents,
    background,
    character,
    missingInteractionSections: screenInteractionSections.filter((item) => item.missing).map((item) => `${item.name}：缺少对应交互章节`)
  };
}

function splitUiAssetEvidenceLines(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .split(/[\n。；;]+/)
    .map((line) => cleanAnalysisText(line.replace(/^\s*[-*•\d.、()（）]+/, "")))
    .filter(Boolean);
}

function isNegativeUiComponentEvidence(line) {
  const text = cleanAnalysisText(line);
  if (!text) return true;
  return /不需要|无需|无须|不显示|不出现|不应|不要|不得|禁止|隐藏|去掉|避免出现|不要出现|默认禁止|无返回|没有返回|无关闭|没有关闭/i.test(text);
}

function addRequiredUiAssetComponent(componentMap, type, source = {}) {
  const normalizedType = normalizeUiComponentType(type);
  const meta = getUiComponentTypeMeta(normalizedType);
  if (!meta) return;
  const sourceScreen = cleanAnalysisText(source.sourceScreen || "交互案");
  const evidence = cleanAnalysisText(source.evidence || sourceScreen).slice(0, 260);
  const existing = componentMap.get(normalizedType);
  if (existing) {
    if (sourceScreen && !existing.sourceScreen.split("、").includes(sourceScreen)) {
      existing.sourceScreen = [existing.sourceScreen, sourceScreen].filter(Boolean).join("、").slice(0, 140);
    }
    if (evidence && !existing.evidence.includes(evidence)) {
      existing.evidence = [existing.evidence, evidence].filter(Boolean).join("；").slice(0, 360);
    }
    return;
  }
  componentMap.set(normalizedType, {
    type: normalizedType,
    label: meta.label || source.label || normalizedType,
    sourceScreen,
    evidence
  });
}

function scanUiAssetComponentEvidence(componentMap, sourceText, sourceScreen, options = {}) {
  const lines = splitUiAssetEvidenceLines(sourceText);
  const rules = UI_ASSET_REQUIRED_COMPONENT_RULES.filter((rule) => options.fromInteraction || rule.allowScreenFields);
  lines.forEach((line) => {
    if (isNegativeUiComponentEvidence(line)) return;
    rules.forEach((rule) => {
      if (!rule.pattern.test(line)) return;
      rule.types.forEach((type) => {
        addRequiredUiAssetComponent(componentMap, type, {
          sourceScreen,
          evidence: line,
          label: rule.label
        });
      });
    });
  });
}

function isPrimaryScreenForTitle(screen = {}, section = "") {
  const kind = String(screen.kind || "").toLowerCase();
  const text = [
    screen.name,
    screen.goal,
    screen.entrySource,
    screen.coreAction,
    screen.keyState,
    screen.closeBehavior,
    section
  ].filter(Boolean).join(" ");
  if (/弹窗|浮层|剧情|登录|封面|启动|结算|战斗中|对局中|cutscene|login|splash|result|modal|popup/i.test(`${kind} ${text}`)) {
    return /一级|主导航|底部导航|标题区|页面标题|界面标题/i.test(text);
  }
  if (/一级|主导航|底部导航|底栏|主菜单|模块入口|系统入口|页面标题|界面标题|标题区/i.test(text)) return true;
  return ["shop", "inventory", "task", "collection", "social", "leaderboard", "settings", "character", "level", "base", "gacha", "room", "boss", "generic", "event"].includes(kind);
}

function extractRequiredUiAssetComponents(targetScreens = [], screenInteractionSections = []) {
  const sectionById = new Map(screenInteractionSections.map((item) => [item.id, item]));
  const componentMap = new Map();
  targetScreens.forEach((screen) => {
    const section = sectionById.get(screen.id)?.section || "";
    if (section) {
      scanUiAssetComponentEvidence(componentMap, section, screen.name || "目标界面", { fromInteraction: true });
    }
    const screenFields = [
      screen.name,
      screen.goal,
      screen.entrySource,
      screen.coreAction,
      screen.keyState,
      screen.closeBehavior
    ].filter(Boolean).join("；");
    scanUiAssetComponentEvidence(componentMap, screenFields, screen.name || "界面清单", { fromInteraction: false });
    getCloseBehaviorComponentTypes(screen.closeBehavior).forEach((type) => {
      addRequiredUiAssetComponent(componentMap, type, {
        sourceScreen: screen.name || "界面清单",
        evidence: `界面关闭方式=${screen.closeBehavior}`
      });
    });
    if (isPrimaryScreenForTitle(screen, section)) {
      addRequiredUiAssetComponent(componentMap, "screen_title", {
        sourceScreen: screen.name || "一级界面",
        evidence: `${screen.name || "一级界面"}需要沿用统一界面标题区位置`
      });
    }
  });

  return Array.from(componentMap.values());
}

function normalizeProjectLayoutAnchors(value) {
  const source = Array.isArray(value) ? value : [];
  return source.map((item) => {
    if (item && typeof item === "object") {
      const type = normalizeUiComponentType(item.type || item.componentType || item.id || item.name);
      return {
        type,
        label: cleanAnalysisText(item.label || getUiComponentTypeMeta(type)?.label || item.name || type),
        anchor: cleanAnalysisText(item.anchor || item.position || item.location || item.rule || ""),
        appliesTo: cleanAnalysisText(item.appliesTo || item.screenScope || item.scope || ""),
        evidence: cleanAnalysisText(item.evidence || item.source || item.reason || "")
      };
    }
    const type = normalizeUiComponentType(item);
    return {
      type,
      label: getUiComponentTypeMeta(type)?.label || cleanAnalysisText(item),
      anchor: "",
      appliesTo: "",
      evidence: ""
    };
  }).filter((item) => item.type || item.anchor || item.label);
}

function buildProjectAnchorPolicy(targetScreens = [], screenInteractionSections = [], requiredComponents = []) {
  const required = normalizeRequiredUiAssetComponents(requiredComponents);
  const requiredTypes = new Set(required.map((item) => item.type));
  const byType = new Map(required.map((item) => [item.type, item]));
  const primaryScreens = targetScreens
    .filter((screen) => isPrimaryScreenForTitle(screen, screenInteractionSections.find((item) => item.id === screen.id)?.section || ""))
    .map((screen) => screen.name)
    .filter(Boolean);
  const makeAnchor = (type, anchor, appliesTo, fallbackEvidence = "") => {
    if (!requiredTypes.has(type) && type !== "screen_title") return null;
    const item = byType.get(type) || {};
    const meta = getUiComponentTypeMeta(type);
    return {
      type,
      label: item.label || meta?.label || type,
      anchor,
      appliesTo,
      evidence: item.evidence || fallbackEvidence || item.sourceScreen || "交互案固定锚点"
    };
  };
  const anchors = [
    makeAnchor("back_button", "左上安全区固定位置；同一项目所有普通功能页保持相同尺寸、相同朝向和相同外框比例", "需要返回/后退的二级及功能页"),
    makeAnchor("close_button", "右上安全区固定位置；用于弹窗或可关闭层，不能替代返回按钮", "弹窗、详情浮层、可关闭面板"),
    makeAnchor("settings_button", "右上工具按钮组固定位置；与资源栏保持稳定间距", "需要设置入口的界面"),
    makeAnchor("home_button", "左上或右上固定工具位；若返回与主页同时出现，主页不得占用返回按钮位置", "需要回主页的二级界面"),
    makeAnchor("resource_token", "顶部右侧资源栏固定区域；多个资源 token 水平排列，图标、数字、加号位置保持一致", "需要资源显示的界面"),
    makeAnchor("tab_default", "内容区上沿或主面板顶部固定 Tab 区；默认态与选中态同尺寸同基线", "带分类/页签的界面"),
    makeAnchor("tab_selected", "内容区上沿或主面板顶部固定 Tab 区；选中态只改变 UI资产定义的高亮/底板/描边状态", "带分类/页签的界面"),
    makeAnchor("bottom_nav_default", "底部安全区固定导航栏；所有一级界面使用相同导航图标间距和底板位置", "一级界面默认导航项"),
    makeAnchor("bottom_nav_selected", "底部安全区固定导航栏；当前一级界面的选中态位置与默认态同槽位", "一级界面当前导航项"),
    makeAnchor("nav_icon", "跟随底部导航槽位；图标尺寸、线宽和选中反馈保持一致", "一级导航图标"),
    makeAnchor("screen_title", "顶部主标题区固定位置；一级界面名称保持同一基线、同一对齐方式和同一标题底板关系", primaryScreens.length ? primaryScreens.join("、") : "一级界面", "一级界面标题位置统一")
  ].filter(Boolean);
  return normalizeProjectLayoutAnchors(anchors);
}

function formatProjectLayoutAnchorsForPrompt(anchors = [], limit = 14) {
  const normalized = normalizeProjectLayoutAnchors(anchors).slice(0, limit);
  if (!normalized.length) return "无项目级固定锚点；仍需按交互案保持同类控件位置稳定。";
  return normalized.map((item, index) => {
    const parts = [
      `${item.type || "anchor"} / ${item.label || "固定锚点"}`,
      item.anchor ? `位置=${item.anchor}` : "",
      item.appliesTo ? `适用=${item.appliesTo}` : "",
      item.evidence ? `证据=${item.evidence}` : ""
    ].filter(Boolean);
    return `${index + 1}. ${parts.join("; ")}`;
  }).join("\n");
}

function mergeProjectLayoutAnchors(...groups) {
  const merged = [];
  const seen = new Set();
  groups.flatMap((group) => normalizeProjectLayoutAnchors(group)).forEach((item) => {
    const key = `${item.type || item.label}|${item.anchor}`;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(item);
  });
  return merged;
}

function normalizeRequiredUiAssetComponents(value) {
  const sourceItems = Array.isArray(value) ? value : [];
  const componentMap = new Map();
  sourceItems.forEach((item) => {
    if (!item) return;
    if (typeof item === "string") {
      addRequiredUiAssetComponent(componentMap, item, { sourceScreen: "资产需求摘要", evidence: item });
      return;
    }
    const type = item.type || item.componentType || item.id || item.name || item.label;
    addRequiredUiAssetComponent(componentMap, type, {
      sourceScreen: item.sourceScreen || item.screen || item.screenName || "资产需求摘要",
      evidence: item.evidence || item.reason || item.source || item.label || type,
      label: item.label || item.name
    });
  });
  return Array.from(componentMap.values());
}

function formatRequiredUiAssetComponentLabel(item) {
  const type = normalizeUiComponentType(item?.type || item?.componentType || item?.id || item);
  return item?.label || getUiComponentTypeMeta(type)?.label || cleanAnalysisText(item?.type || item) || "未知组件";
}

function formatRequiredUiAssetComponentsForPrompt(components = []) {
  return normalizeRequiredUiAssetComponents(components)
    .map((item, index) => {
      const source = item.sourceScreen ? `source=${item.sourceScreen}` : "source=interaction plan";
      const evidence = item.evidence ? `evidence=${item.evidence}` : "";
      return `${index + 1}. ${item.type} / ${item.label} (${[source, evidence].filter(Boolean).join("; ")})`;
    })
    .join("\n");
}

function getUniversalUiAssetComponents() {
  const componentMap = new Map();
  UNIVERSAL_UI_ASSET_TAXONOMY.forEach((section) => {
    section.items.forEach(([type, englishLabel, zhLabel, functionLabel]) => {
      addRequiredUiAssetComponent(componentMap, type, {
        sourceScreen: "通用 UI 资产控件族",
        evidence: `${section.id}. ${section.labelZh}: ${englishLabel} - ${functionLabel || "reuse control"}`,
        label: zhLabel || englishLabel
      });
    });
  });
  return Array.from(componentMap.values());
}

function formatUniversalUiAssetTaxonomyForPrompt() {
  return UNIVERSAL_UI_ASSET_TAXONOMY.map((section) => {
    const items = section.items
      .map(([, englishLabel, zhLabel, functionLabel]) => `${englishLabel} - ${functionLabel || "reuse control"}${zhLabel ? ` (${zhLabel})` : ""}`)
      .join("; ");
    return `${section.id}. ${section.label} / ${section.labelZh}: ${items}`;
  }).join("\n");
}

function formatCompactUniversalUiAssetTaxonomyForPrompt() {
  return UNIVERSAL_UI_ASSET_TAXONOMY.map((section) => {
    const items = section.items
      .map(([, englishLabel, , functionLabel]) => `${englishLabel} - ${functionLabel || "reuse control"}`)
      .join("; ");
    return `${section.id}. ${section.label}: ${items}`;
  }).join("\n");
}

function buildUiAssetBoardSectionSpec(requiredComponents = [], projectAnchorPolicy = []) {
  const required = normalizeRequiredUiAssetComponents(requiredComponents);
  const anchorTypes = new Set(normalizeProjectLayoutAnchors(projectAnchorPolicy).map((item) => item.type).filter(Boolean));
  const requiredByType = new Map(required.map((item) => [item.type, item]));
  const sections = UI_ASSET_BOARD_SECTION_DEFINITIONS.map((section) => {
    const requiredItems = section.types
      .filter((type) => requiredByType.has(type))
      .map((type) => requiredByType.get(type));
    const anchorItems = section.types
      .filter((type) => anchorTypes.has(type) && !requiredByType.has(type))
      .map((type) => ({
        type,
        label: getUiComponentTypeMeta(type)?.label || type,
        sourceScreen: "项目级固定锚点",
        evidence: "用于普通界面位置一致性"
      }));
    const referenceTypes = [...requiredItems, ...anchorItems];
    const fallbackTypes = section.types
      .filter((type) => !referenceTypes.some((item) => item.type === type))
      .slice(0, 4)
      .map((type) => ({
        type,
        label: getUiComponentTypeMeta(type)?.label || type,
        sourceScreen: "分区识别辅助",
        evidence: "可作为同区补充变体"
      }));
    return {
      ...section,
      requiredItems,
      anchorItems,
      referenceItems: referenceTypes.length ? referenceTypes : fallbackTypes
    };
  });
  return { sections };
}

function formatUiAssetBoardSectionSpecForPrompt(requiredComponents = [], projectAnchorPolicy = []) {
  return [
    "UI控件资产图必须按固定 A-H 分区绘制，透明背景，控件之间保留足够切图空间；可用极小 A/B/C/D/E/F/G/H 分区标记和控件英文小标签辅助识别。",
    "每个控件必须带固定英文小标签，格式为 `Control Name - function label`，例如 `Back Button - go back`、`Resource Token - show currency`、`Item Card - display item reward`。",
    "控件小标签只用于资产识别和普通界面映射，后续普通界面生成时不得把这些标签文字带入最终界面。",
    formatUniversalUiAssetTaxonomyForPrompt(),
    "分区稳定性要求：A-H 区相对位置固定，控件不要混成一堆；每个控件必须是可复用 UI 资产，不组成完整页面。"
  ].join("\n");
}

function buildConciseUiAssetPrompt({ projectName, platformText, canvasSpec, styleKeywords = "" } = {}) {
  return [
    `Create a transparent-background UI control asset sheet for ${projectName || "the game"}.`,
    `Platform/canvas: ${platformText || "game UI"}; ${canvasSpec?.promptText || "16:9 game UI canvas"}.`,
    styleKeywords ? `User style keywords: ${styleKeywords}` : "",
    "Use the attached reference images directly as the visual source. Infer palette, material, stroke weight, corner radius, glow/shadow, ornament rhythm, icon language and density from the images; do not rely on long written style analysis.",
    "Generate reusable UI controls only, not a complete game screen, scene illustration, poster, or Figma workspace.",
    `Fixed A-H control groups:\n${formatCompactUniversalUiAssetTaxonomyForPrompt()}`,
    "Board layout: keep A-H groups separated with enough padding for slicing. Every item must be a reusable asset.",
    "Every control must have a tiny English asset label in this exact format: `Control Name - function label`, for example `Back Button - go back` or `Resource Token - show currency`. Labels are only for asset identification.",
    "Include state language for default, pressed, selected, disabled, locked and reward states.",
    "Do not put random UI text inside buttons or panels; leave clean blank text and number areas. Panels should be suitable for 9-slice scaling.",
    "Do not copy reference logos, words, exact characters, IP symbols, resource icons, original layout, or scene composition. Avoid generic golden fantasy, blue sci-fi, metallic fantasy, cream pet-simulator, modern flat app, and default web-card UI unless those traits are visible in the references."
  ].filter(Boolean).join("\n");
}

function getConciseTotalAssetProjectDirection(analysis, type = "background") {
  const brief = getPlanningDocument();
  const plan = getVisualPlanText();
  const projectContext = analysis?.projectContext || {};
  const promptHint = type === "character"
    ? analysis?.imagePrompts?.character
    : analysis?.imagePrompts?.background;
  const pattern = type === "character"
    ? /角色|宠物|伙伴|NPC|头像|立绘|动物|主角|居民|外观|表情|姿态|服装|养成/i
    : /背景|场景|家园|庭院|森林|房间|地图|世界|区域|空间|光源|氛围|前景|中景|远景/i;
  const facts = [
    ...pickTotalAssetSentences(brief, pattern, 3),
    ...pickTotalAssetSentences(plan, pattern, 2),
    ...pickTotalAssetSentences(projectContext.targetScreenList || "", pattern, 2),
    ...pickTotalAssetSentences(promptHint || "", pattern, 2)
  ];
  const uniqueFacts = [];
  facts.forEach((item) => {
    const text = cleanAnalysisText(item);
    if (text && !uniqueFacts.includes(text)) uniqueFacts.push(text);
  });
  const fallback = type === "character"
    ? "按项目主题生成全新角色、宠物或 NPC 风格方向。"
    : "按项目主题生成全新背景场景风格方向。";
  return (uniqueFacts.join("；") || fallback).slice(0, 400);
}

function buildConciseBackgroundAssetPrompt({ projectName, platformText, canvasSpec, styleKeywords = "", projectDirection = "" } = {}) {
  return [
    `Create a project-level background style board for ${projectName || "the game"}.`,
    `Platform/canvas: ${platformText || "game UI"}; ${canvasSpec?.promptText || "16:9 game UI canvas"}.`,
    styleKeywords ? `User style keywords: ${styleKeywords}` : "",
    projectDirection ? `Project direction: ${projectDirection}` : "",
    "Use the attached reference images directly as the visual source. Infer palette, lighting, material, ornament rhythm, depth and atmosphere from the images; do not rely on long written style analysis.",
    "Generate new background scenery for this project, not a UI screen, not a copied reference scene, and not a poster.",
    "Show foreground, midground, background depth, clear light direction, material language, atmosphere, and clean UI-safe areas where interface panels can sit later.",
    "Do not include UI widgets, buttons, menus, text, logos, random letters, full gameplay layout, or main character focal art.",
    "Do not copy reference scene composition, exact landmarks, words, logos, characters, IP symbols, or proprietary props. Avoid photorealistic stock backgrounds and generic styles unrelated to the references."
  ].filter(Boolean).join("\n");
}

function buildConciseCharacterAssetPrompt({ projectName, platformText, canvasSpec, styleKeywords = "", projectDirection = "" } = {}) {
  const worldAndThemeAnchor = formatWorldAndThemeForImagePrompt(2200);
  return [
    `Create a transparent-background character / pet / NPC style board for ${projectName || "the game"}.`,
    `Platform/canvas: ${platformText || "game UI"}; ${canvasSpec?.promptText || "16:9 game UI canvas"}.`,
    styleKeywords ? `User style keywords: ${styleKeywords}` : "",
    projectDirection ? `Project direction: ${projectDirection}` : "",
    `Character content source contract:\n${worldAndThemeAnchor}`,
    "Reference images only provide low-level style: palette, shape language, line/render style, lighting, material, ornament rhythm, rendering precision and silhouette complexity. Content must come from planning document and project requirements.",
    "If concrete reference objects appear in style analysis, read them only as evidence for material, edge rhythm, layering, color accents and ornament density; never generate the same object or costume structure unless the planning document explicitly requires it.",
    "Generate new project characters, pets or NPCs only. Transparent background. Show reusable visual rules such as silhouette, proportions, face style, material logic, avatar/bust/full-body samples, expressions or poses when useful.",
    "Keep the character direction consistent with the UI and background asset style, but do not generate a complete game screen.",
    "Do not include UI menus, buttons, background scenes, logos, random text, or Figma/workspace elements.",
    "Do not copy reference characters, exact outfits, feathers/羽毛, feather ornaments/羽饰, staff/法杖, cloak/cape/披风, weapon/武器, armor/盔甲, badge/徽章, pendant/吊坠, accessories/饰品, hair silhouette, pose composition, IP symbols or proprietary props.",
    "If the planning document does not explicitly mention feathers, staff, cloak/cape, tribal ornaments, weapon, badge, pendant or armor, these objects are forbidden even when visible in the reference image."
  ].filter(Boolean).join("\n");
}

function getTotalAssetRoleLabel(type = "ui") {
  if (type === "background") return "Background asset";
  if (type === "character") return "Character asset";
  return "UI asset";
}

function getRoleSpecificMergedEvidence(analysis = {}, type = "ui") {
  const merged = analysis?.mergedStyleEvidence || {};
  const reference = analysis?.referenceEvidence || {};
  const roleKey = type === "background"
    ? "backgroundEvidence"
    : type === "character"
      ? "characterEvidence"
      : "uiEvidence";
  return [
    formatStructuredSpecValue(merged?.[roleKey]),
    formatStructuredSpecValue(reference?.[roleKey])
  ].filter(Boolean).join("；");
}

function buildTotalAssetRoleTemperamentAnalysis(analysis = {}, type = "ui") {
  const cache = state.styleAnalysisCache || {};
  const sharedLowLevel = [
    formatColorSystemSummary(pickRoleSpecificSpecValue(analysis?.colorSystem, type)) ? `${getTotalAssetRoleLabel(type)}色彩系统：${formatColorSystemSummary(pickRoleSpecificSpecValue(analysis?.colorSystem, type))}` : "",
    formatMaterialRulesSummary(pickRoleSpecificSpecValue(analysis?.materialRules, type)) ? `${getTotalAssetRoleLabel(type)}材质规则：${formatMaterialRulesSummary(pickRoleSpecificSpecValue(analysis?.materialRules, type))}` : "",
    formatLightingHierarchySummary(pickRoleSpecificSpecValue(analysis?.lightingHierarchy, type)) ? `${getTotalAssetRoleLabel(type)}光影层级：${formatLightingHierarchySummary(pickRoleSpecificSpecValue(analysis?.lightingHierarchy, type))}` : "",
    formatPointLinePlaneSummary(analysis?.pointLinePlane) ? `低层点线面比例：${formatPointLinePlaneSummary(analysis?.pointLinePlane)}` : ""
  ];
  const roleSpecific = type === "background"
    ? [
      cache.backgroundStyleSummary ? `背景气质观察：${cleanAnalysisText(cache.backgroundStyleSummary)}` : "",
      getRoleSpecificMergedEvidence(analysis, type) ? `背景专属证据：${getRoleSpecificMergedEvidence(analysis, type)}` : "",
      formatBackgroundSpecSummary(analysis?.backgroundSpec) ? `背景规格：${formatBackgroundSpecSummary(analysis?.backgroundSpec)}` : ""
    ]
    : type === "character"
      ? [
        getRoleSpecificMergedEvidence(analysis, type) ? `角色专属证据：${getRoleSpecificMergedEvidence(analysis, type)}` : "",
        formatCharacterSpecSummary(analysis?.characterSpec) ? `角色规格：${formatCharacterSpecSummary(analysis?.characterSpec)}` : ""
      ]
      : [
        cache.shapeLanguageSummary ? `UI点线面/形状语言：${cleanAnalysisText(cache.shapeLanguageSummary)}` : "",
        cache.buttonMorphologySummary ? `UI按钮/面板气质：${cleanAnalysisText(cache.buttonMorphologySummary)}` : "",
        getRoleSpecificMergedEvidence(analysis, type) ? `UI专属证据：${getRoleSpecificMergedEvidence(analysis, type)}` : "",
        formatButtonSpecSummary(analysis?.buttonSpec) ? `按钮规格：${formatButtonSpecSummary(analysis?.buttonSpec)}` : "",
        formatPanelModalSpecSummary(analysis?.panelModalSpec) ? `面板与弹窗语言：${formatPanelModalSpecSummary(analysis?.panelModalSpec)}` : "",
        formatIconItemResourceSpecSummary(analysis?.iconItemResourceSpec) ? `图标/资源视觉语言：${formatIconItemResourceSpecSummary(analysis?.iconItemResourceSpec)}` : "",
        joinSpecSummary(formatShapeLanguageDetailedLines(analysis?.shapeLanguage)) ? `UI形状装饰节奏：${joinSpecSummary(formatShapeLanguageDetailedLines(analysis?.shapeLanguage))}` : "",
        formatTypographySpecSummary(analysis?.typographySpec) ? `字体与文字安全：${formatTypographySpecSummary(analysis?.typographySpec)}` : ""
      ];
  const parts = [
    `${getTotalAssetRoleLabel(type)} role-specific visual temperament:`,
    ...sharedLowLevel,
    ...roleSpecific
  ].filter(Boolean);
  return filterTotalAssetTextByRole([...new Set(parts)].join("\n"), type).slice(0, 2600);
}

function buildTotalAssetTemperamentAnalysis(analysis = {}) {
  const parts = [
    buildTotalAssetRoleTemperamentAnalysis(analysis, "ui"),
    buildTotalAssetRoleTemperamentAnalysis(analysis, "background"),
    buildTotalAssetRoleTemperamentAnalysis(analysis, "character")
  ].filter(Boolean);
  return [...new Set(parts)].join("\n\n").slice(0, 2600);
}

function pickRoleSpecificSpecValue(source, type = "ui") {
  if (!source || typeof source !== "object" || Array.isArray(source)) return source;
  const roleKeys = type === "background"
    ? ["background", "bg", "scene"]
    : type === "character"
      ? ["character", "role", "person", "pet", "npc"]
      : ["ui", "interface", "controls", "button"];
  for (const key of roleKeys) {
    if (isMeaningfulSpecValue(source[key])) return source[key];
  }
  return source;
}

function buildTotalAssetLowLevelStyleDigest(analysis = {}, type = "ui") {
  return filterTotalAssetTextByRole(joinSpecSummary([
    formatStructuredSpecValue(analysis?.mergedStyleEvidence?.paletteAndRatio || analysis?.referenceEvidence?.paletteAndRatio),
    formatStructuredSpecValue(analysis?.mergedStyleEvidence?.materialAndStroke || analysis?.referenceEvidence?.materialAndStroke),
    formatStructuredSpecValue(analysis?.mergedStyleEvidence?.lightingAndRendering || analysis?.referenceEvidence?.lightingAndRendering),
    formatColorSystemSummary(pickRoleSpecificSpecValue(analysis?.colorSystem, type)),
    formatMaterialRulesSummary(pickRoleSpecificSpecValue(analysis?.materialRules, type)),
    formatLightingHierarchySummary(pickRoleSpecificSpecValue(analysis?.lightingHierarchy, type)),
    joinSpecSummary(formatDesignTokensSummaryLines(pickRoleSpecificSpecValue(analysis?.designTokens, type)))
  ]), type);
}

function buildTotalAssetRoleSpecificStyleDigest(analysis = {}, type = "ui") {
  const sharedLowLevel = [
    buildTotalAssetLowLevelStyleDigest(analysis, type),
    formatStructuredSpecValue(analysis?.evidenceConflicts),
    joinSpecSummary(
      normalizeStyleExtrapolationRules(analysis?.styleExtrapolationRules)
        .filter((rule) => {
          const target = cleanAnalysisText(rule?.target || "");
          if (type === "background") return /背景|场景|空间|background/i.test(target);
          if (type === "character") return /角色|人物|宠物|NPC|头像|立绘|character/i.test(target);
          return /UI|控件|按钮|面板|图标|资源|Tab|tab|页签|关闭|返回|确认|领取|button|panel|icon/i.test(target);
        })
        .map(formatStyleExtrapolationRule)
    )
  ];
  const roleSpecific = type === "background"
    ? [
      getRoleSpecificMergedEvidence(analysis, type),
      formatBackgroundSpecSummary(analysis?.backgroundSpec),
      formatStructuredSpecValue(analysis?.assetRequirements?.background)
    ]
    : type === "character"
      ? [
        getRoleSpecificMergedEvidence(analysis, type),
        formatCharacterSpecSummary(analysis?.characterSpec),
        formatStructuredSpecValue(analysis?.assetRequirements?.character)
      ]
      : [
        getRoleSpecificMergedEvidence(analysis, type),
        formatButtonSpecSummary(analysis?.buttonSpec),
        formatPanelModalSpecSummary(analysis?.panelModalSpec),
        formatIconItemResourceSpecSummary(analysis?.iconItemResourceSpec),
        formatTypographySpecSummary(analysis?.typographySpec),
        formatStructuredSpecValue(analysis?.assetRequirements?.ui),
        formatRequiredUiAssetComponentsForPrompt(analysis?.assetRequirements?.uiRequiredComponents || [])
      ];
  return joinSpecSummary([...sharedLowLevel, ...roleSpecific]).slice(0, 3600);
}

function buildTotalAssetStyleFidelityDigest(analysis, type = "ui") {
  return buildTotalAssetRoleSpecificStyleDigest(analysis, type);
}

const REFERENCE_CHARACTER_OBJECT_PATTERN = /羽毛|羽饰|翎羽|法杖|手杖|杖|披风|斗篷|披肩|羽衣|羽翼|翅膀|武器|装备|盔甲|铠甲|徽章|吊坠|项链|饰品|腰带|护肩|披挂|部落|羽族|原角色|参考角色|feather|plume|staff|wand|rod|cloak|cape|mantle|wing|weapon|equipment|armor|badge|pendant|necklace|accessory|belt|pauldron|tribe|tribal|original character|reference character/i;
const REFERENCE_CHARACTER_COPY_INSTRUCTION_PATTERN = /复制|照搬|复刻|原样|同款|生成.*(?:羽毛|羽饰|翎羽|法杖|手杖|杖|披风|斗篷|披肩|武器|装备|盔甲|铠甲|徽章|吊坠|饰品)|copy|duplicate|replicate|same as|exact(?:ly)?|generate.*(?:feather|plume|staff|wand|rod|cloak|cape|weapon|armor|badge|pendant|accessory)/i;

function abstractReferenceCharacterObjectTerms(value) {
  return cleanAnalysisText(value)
    .replace(/衣服上的(?:羽毛|羽饰|翎羽)/g, "衣服")
    .replace(/(?:上身|肩部|肩膀|外层|外套|衣服)(?:有|带有|包含|覆盖|点缀|装饰)?(?:羽毛|羽饰|翎羽)(?:分层|层次|层)?/g, (match) => {
      const carrier = match.match(/上身|肩部|肩膀|外层|外套|衣服/)?.[0] || "衣服";
      return `${carrier}层次`;
    })
    .replace(/羽毛披肩|羽饰披肩|羽披肩|feather(?:ed)?\s+(?:shawl|mantle|cape|cloak)/gi, "披肩")
    .replace(/羽毛衣|羽衣|羽毛服饰|羽毛服装|feather(?:ed)?\s+(?:clothes|costume|outfit|garment)/gi, "衣服")
    .replace(/羽毛边缘|羽毛边|羽饰边缘|羽饰边|feather(?:ed)?\s+(?:edge|rim|trim|border)/gi, "边缘")
    .replace(/羽毛层|羽饰层|羽毛分层|羽饰分层|feather(?:ed)?\s+(?:layer|layers|layering)/gi, "衣服层次")
    .replace(/羽毛饰品|羽饰|翎羽装饰|羽毛装饰|feather(?:ed)?\s+(?:ornament|ornaments|accessory|accessories|decoration|decorations)/gi, "饰品")
    .replace(/羽毛冠饰|羽冠|羽毛头饰|羽饰头饰|feather(?:ed)?\s+(?:headpiece|headdress|crown|hair ornament)/gi, "头部装饰")
    .replace(/法杖|手杖|杖|staff|wand|rod/gi, "手持物轮廓")
    .replace(/武器|weapon/gi, "硬质轮廓")
    .replace(/盔甲|铠甲|armor/gi, "硬质材质")
    .replace(/徽章|badge/gi, "小型饰品")
    .replace(/吊坠|项链|pendant|necklace/gi, "饰品")
    .replace(/翅膀|羽翼|wings?/gi, "外轮廓层次")
    .replace(/羽毛|羽饰|翎羽|feathers?|plumes?/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/；{2,}/g, "；")
    .replace(/、{2,}/g, "、")
    .replace(/：\s*([；,，。]|$)/g, "：")
    .trim();
}

function removeReferenceCharacterObjectSegments(value, maxChars = 1800) {
  return cleanAnalysisText(value)
    .split(/[\n；;。]+/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .filter((segment) => !REFERENCE_CHARACTER_COPY_INSTRUCTION_PATTERN.test(segment))
    .map(abstractReferenceCharacterObjectTerms)
    .join("；")
    .slice(0, maxChars);
}

function filterTotalAssetTextByRole(value, type = "ui") {
  const text = cleanAnalysisText(value);
  if (!text) return "";
  const uiPattern = /UI|控件|按钮|面板|弹窗|卡片|Tab|tab|页签|资源条|资源栏|图标|道具格|文字|字体|button|panel|modal|card|icon|resource|typography/i;
  const backgroundPattern = /背景|场景|空间|景深|透视|远景|中景|前景|安全区|站位|地平线|环境|background|scene|space|perspective|depth|environment/i;
  const characterPattern = /角色|人物|宠物|NPC|头像|立绘|脸|姿态|身体|轮廓|比例|表情|character|person|pet|face|pose|silhouette|proportion|expression/i;
  const backgroundForbiddenSemanticPattern = /人物|角色|宠物|NPC|头像|立绘|肖像|脸|眼睛|头发|耳朵|尾巴|翅膀|手部?|身体|姿态|表情|服装|衣服|披风|裙|鞋|帽|盔甲|腰带|饰品|吊坠|徽章|武器|法杖|背包|道具|坐骑|按钮|控件|面板|卡片|弹窗|Tab|tab|页签|资源条|资源栏|图标|Logo|logo|文字|商品|货币|奖杯|活动入口|职业|阵营|IP|ip|character|person|pet|npc|portrait|face|eye|hair|ear|tail|wing|hand|body|pose|expression|costume|outfit|cloak|cape|skirt|shoe|hat|helmet|armor|belt|accessory|pendant|badge|weapon|staff|backpack|prop|mount|button|widget|panel|card|modal|resource|icon|logo|text|product|currency|trophy|event entry|faction|class/i;
  const lowLevelPattern = /色彩|颜色|主色|辅色|高光|光源|光影|阴影|材质|描边|边框|线宽|厚度|颗粒|纹理|渲染|渐变|冷暖|饱和|明度|对比|透明|发光|装饰|节奏|密度|轮廓|层叠|边缘|复杂度|palette|color|highlight|lighting|shadow|material|stroke|border|texture|render|gradient|contrast|glow|ornament|rhythm|density|silhouette|layered|edge|complexity/i;
  return text
    .split(/[\n；;。]+/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .filter((segment) => type !== "character" || !REFERENCE_CHARACTER_COPY_INSTRUCTION_PATTERN.test(segment))
    .map((segment) => type === "character" ? abstractReferenceCharacterObjectTerms(segment) : segment)
    .filter((segment) => {
      const hasUi = uiPattern.test(segment);
      const hasBackground = backgroundPattern.test(segment);
      const hasCharacter = characterPattern.test(segment);
      const hasLowLevel = lowLevelPattern.test(segment);
      if (type === "background") {
        if (backgroundForbiddenSemanticPattern.test(segment)) return false;
        return hasBackground || hasLowLevel || (!hasUi && !hasCharacter);
      }
      if (type === "character") {
        if (REFERENCE_CHARACTER_COPY_INSTRUCTION_PATTERN.test(segment)) return false;
        if (hasUi || hasBackground) return false;
        return hasCharacter || hasLowLevel || (!hasUi && !hasBackground);
      }
      if (hasBackground || hasCharacter) return false;
      return hasUi || hasLowLevel || (!hasBackground && !hasCharacter);
    })
    .join("；");
}

function buildTotalAssetRoleStyleTransferKeywords(analysis, type = "ui", fallbackKeywords = "") {
  return [
    fallbackKeywords || state.styleAnalysisCache?.styleTransferKeywords || "",
    buildTotalAssetStyleFidelityDigest(analysis, type)
  ]
    .map((item) => filterTotalAssetTextByRole(item, type))
    .filter(Boolean)
    .join("\n")
    .slice(0, 1800);
}

function cleanScreenDesignRoleAnalysisText(value, type = "ui", maxChars = 1800) {
  const roleFilteredText = filterTotalAssetTextByRole(value, type);
  const cleanedText = cleanTotalAssetStyleTextForImagePrompt(roleFilteredText, maxChars);
  if (!cleanedText) return "";

  const concreteObjectPattern = type === "background"
    ? /人物|角色|宠物|NPC|头像|立绘|肖像|脸|眼睛|头发|耳朵|尾巴|翅膀|身体|姿态|表情|服装|衣服|披风|裙|鞋|帽|盔甲|腰带|饰品|吊坠|徽章|武器|法杖|背包|道具|坐骑|按钮|控件|面板|卡片|弹窗|Tab|tab|页签|资源条|资源栏|图标|Logo|logo|文字|商品|货币|奖杯|活动入口|职业|阵营|IP|ip|character|person|pet|npc|portrait|face|eye|hair|ear|tail|wing|body|pose|expression|costume|outfit|cloak|cape|skirt|shoe|hat|helmet|armor|belt|accessory|pendant|badge|weapon|staff|backpack|prop|mount|button|widget|panel|card|modal|resource|icon|logo|text|product|currency|trophy|event entry|faction|class/i
    : type === "character"
      ? /按钮|控件|面板|卡片|弹窗|Tab|tab|页签|资源条|资源栏|图标|Logo|logo|文字|商品|货币|奖杯|活动入口|背景|场景|空间|景深|透视|远景|中景|前景|安全区|站位|地平线|环境|职业|阵营|IP|ip|button|widget|panel|card|modal|resource|icon|logo|text|product|currency|trophy|event entry|background|scene|space|perspective|depth|environment|faction|class/i
      : null;

  if (!concreteObjectPattern) return cleanedText.slice(0, maxChars);

  return cleanedText
    .split(/[\n；;。]+/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .filter((segment) => !concreteObjectPattern.test(segment))
    .join("；")
    .slice(0, maxChars);
}

function buildScreenDesignRoleAnalysisForPrompt(analysis = {}, type = "ui") {
  if (!["ui", "background", "character"].includes(type)) return "";
  const roleTitle = type === "background" ? "背景分析" : type === "character" ? "角色分析" : "UI分析";
  const rawPromptFromAnalysis = type === "ui"
    ? analysis?.imagePrompts?.ui
    : "";
  const digest = cleanScreenDesignRoleAnalysisText(buildTotalAssetStyleFidelityDigest(analysis, type), type, 1400);
  const temperament = cleanScreenDesignRoleAnalysisText(buildTotalAssetRoleTemperamentAnalysis(analysis, type), type, 1000);
  const colorSystem = cleanScreenDesignRoleAnalysisText(formatColorSystemSummary(pickRoleSpecificSpecValue(analysis?.colorSystem, type)), type, 420);
  const materialRules = cleanScreenDesignRoleAnalysisText(formatMaterialRulesSummary(pickRoleSpecificSpecValue(analysis?.materialRules, type)), type, 420);
  const lightingRules = cleanScreenDesignRoleAnalysisText(formatLightingHierarchySummary(pickRoleSpecificSpecValue(analysis?.lightingHierarchy, type)), type, 420);
  const promptFromAnalysis = cleanScreenDesignRoleAnalysisText(rawPromptFromAnalysis, type, 520);
  const roleBoundary = type === "background"
    ? "仅用于背景空间、构图、景深、透视、光影、材质、环境氛围和 UI 安全区；不得携带角色、装备、道具、商品、Logo、IP 或 UI 控件语义。"
    : type === "character"
      ? "仅用于抽象角色视觉规则：配色、轮廓比例、线条、材质、渲染、表情和姿态；不得携带 UI 控件、背景空间、具体参考物、装备、道具、Logo 或 IP 语义。"
      : "仅用于 UI 控件视觉规则：按钮、面板、Tab、资源栏、图标、字体、圆角、描边、材质和光影；不得携带背景空间或角色语义。";
  const body = [
    roleBoundary,
    digest,
    temperament,
    colorSystem ? `色彩：${colorSystem}` : "",
    materialRules ? `材质：${materialRules}` : "",
    lightingRules ? `光影：${lightingRules}` : "",
    promptFromAnalysis ? `UI资产生图分析：${promptFromAnalysis}` : ""
  ].filter(Boolean);

  return body.length ? `${roleTitle}：\n${[...new Set(body)].join("\n")}` : "";
}

function buildScreenDesignRoleAnalysisBundle(selectedRoles = []) {
  const analysis = state.totalAssetKit?.analysis || {};
  const roleOrder = ["ui", "background", "character"];
  const selectedRoleSet = new Set((selectedRoles || []).filter((role) => roleOrder.includes(role)));
  const blocks = roleOrder
    .filter((role) => selectedRoleSet.has(role))
    .map((role) => buildScreenDesignRoleAnalysisForPrompt(analysis, role))
    .filter(Boolean);

  return blocks.length
    ? `已发送总资产分角色分析：\n${blocks.join("\n\n")}`
    : "";
}

function collectHexColorsFromSpec(value) {
  const text = JSON.stringify(value || {});
  return [...new Set((text.match(/#[0-9a-f]{6}\b/gi) || [])
    .filter((item) => !/^#RRGGBB$/i.test(item))
    .map((item) => item.toUpperCase()))];
}

function buildTotalAssetColorAnchorForPrompt(analysis = {}, type = "ui", maxChars = 1100) {
  const paletteEvidence = [
    formatColorSystemSummary(pickRoleSpecificSpecValue(analysis?.colorSystem, type)),
    formatStructuredSpecValue(analysis?.mergedStyleEvidence?.paletteAndRatio),
    formatStructuredSpecValue(analysis?.referenceEvidence?.paletteAndRatio),
    formatStructuredSpecValue(analysis?.styleDNA?.mood),
    formatStructuredSpecValue(analysis?.styleDNA?.colorMood)
  ].map((item) => filterTotalAssetTextByRole(item, type)).filter(Boolean);
  const hex = [
    ...collectHexColorsFromSpec(analysis?.colorSystem),
    ...collectHexColorsFromSpec(analysis?.mergedStyleEvidence?.paletteAndRatio),
    ...collectHexColorsFromSpec(analysis?.referenceEvidence?.paletteAndRatio)
  ].slice(0, 10);
  const joinedEvidence = removeReferenceCharacterObjectSegments([...new Set(paletteEvidence)].join("；"), maxChars);
  const hexText = hex.length ? `HEX anchors: ${[...new Set(hex)].join(", ")}. ` : "";
  const roleRule = type === "character"
    ? "Reference palette anchor: preserve the reference image color proportions, saturation, warm/cool balance, brightness contrast, accent-color placement, and material highlight color feel. World/theme decides identity, occupation, props and story meaning; reference images decide palette ratio, saturation, warm/cool relation, lightness and material color glow. Do not drift into black-gray, low-saturation, modern long-coat or dark urban palette unless the reference image or planning document explicitly requires it."
    : "Reference palette anchor: preserve the reference image color proportions, saturation, warm/cool balance, brightness contrast, accent-color placement, and material highlight color feel.";
  return [roleRule, hexText ? `${hexText}${joinedEvidence}` : joinedEvidence]
    .filter(Boolean)
    .join("\n")
    .slice(0, maxChars);
}

function buildDetailedTotalAssetPrompt(analysis, type = "ui", styleKeywords = "", styleTransferKeywords = "") {
  const meta = getTotalAssetPartMeta(type);
  const projectName = state.gameName || gameName.value || "未命名小游戏";
  const canvasSpec = getDesignCanvasSpec();
  const platformText = getPlatformText($("#platform").value);
  const projectDirection = cleanTotalAssetStyleTextForImagePrompt(filterTotalAssetTextByRole(getConciseTotalAssetProjectDirection(analysis, type), type), 420);
  const styleDigest = cleanTotalAssetStyleTextForImagePrompt(filterTotalAssetTextByRole(buildTotalAssetStyleFidelityDigest(analysis, type), type), 2600);
  const temperament = cleanTotalAssetStyleTextForImagePrompt(filterTotalAssetTextByRole(buildTotalAssetRoleTemperamentAnalysis(analysis, type), type), 1800);
  const worldAndThemeAnchor = formatWorldAndThemeForImagePrompt(2800);
  const rawPromptFromAnalysis = type === "ui"
    ? analysis?.imagePrompts?.ui
    : type === "background"
      ? analysis?.imagePrompts?.background
      : analysis?.imagePrompts?.character;
  const promptFromAnalysis = cleanTotalAssetStyleTextForImagePrompt(filterTotalAssetTextByRole(rawPromptFromAnalysis, type), 700);
  const safeStyleTransferKeywords = cleanTotalAssetStyleTextForImagePrompt(filterTotalAssetTextByRole(styleTransferKeywords, type), 1200);
  const roleStyleDigest = type === "character" ? removeReferenceCharacterObjectSegments(styleDigest, 2600) : styleDigest;
  const roleTemperament = type === "character" ? removeReferenceCharacterObjectSegments(temperament, 1800) : temperament;
  const rolePromptFromAnalysis = type === "character" ? removeReferenceCharacterObjectSegments(promptFromAnalysis, 700) : promptFromAnalysis;
  const roleStyleTransferKeywords = type === "character" ? removeReferenceCharacterObjectSegments(safeStyleTransferKeywords, 1200) : safeStyleTransferKeywords;
  const paletteAnchor = buildTotalAssetColorAnchorForPrompt(analysis, type, type === "character" ? 1300 : 900);
  const referenceDigestFallback = type === "character"
    ? "No detailed reference digest available; read attached reference images only for low-level style such as palette, material, line weight, lighting and rendering texture."
    : "No detailed reference digest available; read attached reference images directly.";
  const roleRules = {
    ui: [
      "Asset target: transparent-background reusable UI control asset sheet, not a complete game screen.",
      `Fixed A-H control groups:\n${formatCompactUniversalUiAssetTaxonomyForPrompt()}`,
      "Keep A-H groups separated with enough padding for slicing. Every item must be a reusable asset.",
      "Every control must have a tiny English asset label in exact format `Control Name - function label`; labels are only for asset identification.",
      "Include default, pressed, selected, disabled, locked and reward states.",
      "Do not put random UI text inside buttons or panels; leave clean blank text and number areas. Panels should support 9-slice scaling.",
      "Do not generate concrete props, scenery objects, landmarks or scene subjects from the reference images; generate only reusable UI controls."
    ],
    background: [
      "Asset target: project-level background style board, not a UI screen and not a copied reference scene.",
      "Generate new scenery for this project from the planning/interaction context, with foreground, midground, background depth, light direction, material language, atmosphere and UI-safe areas.",
      "No UI widgets, buttons, menus, text, logos, random letters, full gameplay layout, or main character focal art.",
      "Generate only environment and space. Do not generate characters, pets, NPCs, portraits, equipment, props, UI widgets, product entries or reference-bound theme objects.",
      "Background decoration must come from project-appropriate natural, architectural, terrain, lighting, atmospheric, path, water, sky, fog or depth elements; never migrate wearable objects, equipment, mascot props, character accessories or UI ornament semantics from the references.",
      "Do not copy or name concrete objects from the reference images, including scene subjects, landmarks, characters, props, words, logos, IP symbols or proprietary items."
    ],
    character: [
      "Asset target: transparent-background character / pet / NPC style board, not a complete screen.",
      "Character content source contract: character identity, occupation, clothing direction, props, faction, world rules and temperament must come from the planning document's World and Theme section plus project/screen requirements.",
      "Reference images only provide low-level style: palette, shape language, line/render style, lighting, material, ornament rhythm, rendering precision and silhouette complexity.",
      "If concrete reference objects appear in style analysis, read them only as evidence for material, edge rhythm, layering, color accents and ornament density; never generate the same object or costume structure unless the planning document explicitly requires it.",
      "Generate new project characters, pets or NPCs. Show reusable visual rules such as silhouette, proportions, face style, material logic, avatar/bust/full-body samples, expressions or poses when useful.",
      "Keep character direction consistent with the UI and background asset style.",
      "No UI menus, buttons, background scenes, logos, random text or Figma/workspace elements.",
      "Do not copy reference characters, exact outfits, feathers/羽毛, feather ornaments/羽饰, staff/法杖, cloak/cape/披风, weapon/武器, armor/盔甲, badge/徽章, pendant/吊坠, accessories/饰品, hair silhouette, pose composition, IP symbols or proprietary props.",
      "If the planning document does not explicitly mention feathers, staff, cloak/cape, tribal ornaments, weapon, badge, pendant, armor or similar wearable objects, these objects are forbidden even when visible in the reference image."
    ]
  }[type] || [];
  const roleNegativePrompt = type === "background"
    ? [
      "characters",
      "portraits",
      "character accessories",
      "wearable objects",
      "equipment",
      "weapons",
      "mascot props",
      "UI widgets",
      "buttons",
      "panels",
      "logos",
      "product items",
      "currency items",
      "IP symbols"
    ]
    : type === "character"
      ? [
        "feathers",
        "feather ornaments",
        "plumes",
        "staff",
        "wand",
        "cloak",
        "cape",
        "weapon",
        "armor",
        "badge",
        "pendant",
        "accessories copied from references",
        "exact outfit",
        "tribal ornaments",
        "copied costume",
        "copied hair silhouette",
        "copied pose composition",
        "IP symbols"
      ]
    : [];
  const negativePrompt = [
    "modern flat app UI",
    "generic mobile app style",
    "generic golden fantasy UI",
    "generic blue sci-fi UI",
    "generic metallic fantasy UI",
    "generic cozy pet-simulator cream UI",
    "default rounded web cards",
    "photorealistic background",
    "copied logo",
    "copied character",
    "unreadable random text",
    "copied original scene composition",
    ...roleNegativePrompt
  ].join(", ");
  return [
    `Create ${meta.label} for a game visual system.`,
    `Project: ${projectName}`,
    `Platform/canvas: ${platformText}; ${canvasSpec.promptText}`,
    `User style keywords: ${styleKeywords || "none"}`,
    `World and theme content anchor from the planning document:\n${worldAndThemeAnchor}`,
    "Hard content rule: reference images only provide art style, material, palette, lighting, rendering texture and shape language. Content, background subject, character identity, faction conflict, world rules and gameplay packaging must obey the planning document's World and Theme section.",
    paletteAnchor,
    roleStyleTransferKeywords ? `Reference style keywords: ${roleStyleTransferKeywords}` : "",
    projectDirection ? `Project direction: ${projectDirection}` : "",
    rolePromptFromAnalysis ? `Model analysis prompt summary: ${rolePromptFromAnalysis}` : "",
    "Use attached reference images only for abstract visual style: palette, material, lighting, line weight, rhythm, composition density and texture. Do not use the written analysis to copy concrete objects from the reference images.",
    `Detailed reference image analysis:\n${roleStyleDigest || referenceDigestFallback}`,
    `${getTotalAssetRoleLabel(type)} temperament / visual rules:\n${roleTemperament || "Use only this asset role's evidence plus shared low-level tokens such as palette, material, lighting, line weight and rendering texture."}`,
    ...roleRules,
    type === "ui"
      ? "World/theme boundary for UI assets: reusable controls may use decorations and resource-icon direction inspired by the planning document's setting, but must not invent reference-image tribes, IP symbols, original character identities or copied props."
      : type === "background"
        ? "World/theme boundary for background assets: scene content must come from the planning document's world background and target-screen needs; do not copy reference-image scenery, landmarks, tribes, props, logos or IP symbols."
        : "World/theme boundary for character assets: character identity, temperament, role relationship and faction cues must come from the planning document's protagonist/major-character/world section; do not copy reference-image characters, costumes, weapons, silhouettes, logos or IP symbols.",
    "Reference usage boundary: reference images and analysis decide style only; do not copy or name concrete reference objects, logos, text, exact characters, original resource icons, original layout, proprietary symbols or original scene composition.",
    `Negative prompt: ${negativePrompt}`
  ].filter(Boolean).join("\n");
}

function summarizeRequiredUiAssetComponents(components = [], limit = 14) {
  const labels = normalizeRequiredUiAssetComponents(components).map(formatRequiredUiAssetComponentLabel);
  if (!labels.length) return "";
  const visible = labels.slice(0, limit).join("、");
  return labels.length > limit ? `${visible} 等 ${labels.length} 项` : visible;
}

function formatTotalAssetInteractionSectionsForPrompt(screenInteractionSections = []) {
  return (Array.isArray(screenInteractionSections) ? screenInteractionSections : [])
    .map((item, index) => {
      const section = cleanAnalysisText(item?.section || "");
      const header = `${index + 1}. ${item?.name || "目标界面"}${item?.missing ? "（缺少对应交互章节）" : ""}`;
      return section ? `${header}\n${section.slice(0, 1600)}` : header;
    })
    .filter(Boolean)
    .join("\n\n");
}

function pickTotalAssetSentences(text, pattern, limit = 4) {
  return String(text || "")
    .replace(/\r/g, "")
    .split(/[\n。；;]+/)
    .map((line) => cleanAnalysisText(line.replace(/^\s*[-*•\d.、]+/, "")))
    .filter((line) => line && pattern.test(line))
    .slice(0, limit);
}

function renderUiAssetOutputIfActive() {
  if (isUiAssetDesignScreenId()) {
    renderDesignOutput();
  }
}

function isBabylonResourceUrl(url) {
  try {
    const parsed = new URL(url, window.location.href);
    return parsed.hostname === "babylon.garenanow.com"
      && (parsed.pathname.startsWith("/resources/") || parsed.pathname.startsWith("/ai/babylon/resources/"));
  } catch (error) {
    return false;
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("图片转码失败"));
    reader.readAsDataURL(blob);
  });
}

async function resolveImageReferenceDataUrl(url) {
  if (!url) return "";
  if (url.startsWith("data:image/")) return url;

  if (isBabylonResourceUrl(url)) {
    const response = await fetch("/api/resolve-image-reference", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: url })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.dataUrl) {
      throw new Error(data.error || "总资产图无法转为可用参考图");
    }
    return data.dataUrl;
  }

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`图片读取失败：${response.status}`);
  }
  const blob = await response.blob();
  if (!String(blob.type || "").startsWith("image/")) {
    throw new Error("图片链接返回的不是图片数据");
  }
  return blobToDataUrl(blob);
}

async function ensureUiAssetReferenceDataUrl() {
  const kit = state.totalAssetKit?.ui || state.uiAssetKit || {};
  if (kit.status !== "ready" || !kit.imageUrl) return "";
  if (kit.referenceDataUrl?.startsWith("data:image/")) return kit.referenceDataUrl;

  try {
    const referenceDataUrl = await resolveImageReferenceDataUrl(kit.imageUrl);
    patchTotalAssetPart("ui", {
      referenceDataUrl,
      error: ""
    });
    renderDesignPromptSummary();
    return referenceDataUrl;
  } catch (error) {
    throw new Error(`UI控件资产图无法转为可用参考图，请重新生成总资产或检查 Babylon 图片链接：${error.message || error}`);
  }
}

function getUiAssetKitReferenceForDesign() {
  const kit = state.totalAssetKit?.ui || state.uiAssetKit || {};
  if (kit.status !== "ready" || !kit.referenceDataUrl) return [];
  return [{
    imageUrl: kit.referenceDataUrl,
    label: "UI控件资产图",
    role: "ui"
  }];
}

async function ensureTotalAssetReferenceDataUrls(screen = getDesignScreen(), designComposition = null) {
  const kit = state.totalAssetKit || {};
  const neededTypes = ["ui", "background"];
  if (screenNeedsCharacterReference(screen, designComposition)) neededTypes.push("character");
  for (const type of neededTypes) {
    const part = kit[type] || {};
    if (part.status !== "ready" || !part.imageUrl || part.referenceDataUrl?.startsWith("data:image/")) continue;
    try {
      const referenceDataUrl = await resolveImageReferenceDataUrl(part.imageUrl);
      patchTotalAssetPart(type, { referenceDataUrl, error: "" });
    } catch (error) {
      patchTotalAssetPart(type, { error: error.message || "资产图无法转为可用参考图" });
      if (type === "ui") {
        throw new Error(`UI控件资产图无法转为可用参考图，请重新生成总资产：${error.message || error}`);
      }
    }
  }
  renderDesignPromptSummary();
}

function getTotalAssetReferencesForDesign(screen = getDesignScreen(), designComposition = null) {
  const kit = state.totalAssetKit || {};
  const refs = [];
  const pushRef = (type) => {
    const part = kit[type] || {};
    const imageUrl = part.referenceDataUrl || part.imageUrl || "";
    if (part.status !== "ready" || !imageUrl) return;
    const meta = getTotalAssetPartMeta(type);
    refs.push({
      imageUrl,
      label: meta.label,
      role: type,
      sourceType: part.referenceDataUrl ? "data-url" : "asset-url"
    });
  };
  pushRef("ui");
  pushRef("background");
  if (screenNeedsCharacterReference(screen, designComposition)) pushRef("character");
  return refs;
}

function collectUiAssetReadinessWarnings(screen = getDesignScreen(), designComposition = null) {
  const kit = state.totalAssetKit || {};
  const uiPart = kit.ui || {};
  if (uiPart.status !== "ready" || !uiPart.imageUrl) return [];
  const warnings = [];
  const projectContext = kit.analysis?.projectContext || buildTotalAssetProjectContext(getUiAssetDesignScreen());
  const styleFidelity = uiPart.uiAssetStyleFidelity || uiPart.analysis?.uiAssetStyleFidelity || kit.analysis?.uiAssetStyleFidelity || null;
  if (isUiAssetStyleFidelityBlocking(styleFidelity)) {
    const issues = normalizeAnalysisList(styleFidelity.issues || styleFidelity.styleDistanceWarnings);
    throw new Error(`UI资产画风贴合不足：${issues.slice(0, 3).join("；") || "请先重新生成总资产"}。普通界面不能使用该 UI资产作为控件基准。`);
  }
  const required = normalizeRequiredUiAssetComponents(
    kit.analysis?.assetRequirements?.uiRequiredComponents
    || projectContext.assetDemandSummary?.uiRequiredComponents
    || []
  );
  const baselineState = getUiComponentBaselineState();
  const projectCoverage = baselineState.coverage
    || uiPart.uiAssetCoverage
    || kit.analysis?.uiAssetCoverage
    || buildUiAssetCoverage(required, getLockedUiComponentBaselines());
  const projectMissing = normalizeRequiredUiAssetComponents(projectCoverage.missing || []);
  if (projectMissing.length) {
    warnings.push(`UI资产通用控件覆盖待确认：${summarizeRequiredUiAssetComponents(projectMissing)}。本次不阻断生图，将按资产图同族控件和 Control Name - function label 外推。`);
  }
  const screenRequiredTypes = getRequiredUiComponentBaselineTypes(screen, designComposition);
  const missingForScreen = screenRequiredTypes
    .filter((type) => !baselineState.items?.[type])
    .map((type) => ({
      type,
      label: getUiComponentTypeMeta(type)?.label || type,
      sourceScreen: screen?.name || "当前界面",
      evidence: "当前界面需要该通用组件，但 UI资产组件基准未锁定"
    }));
  if (missingForScreen.length) {
    warnings.push(`当前界面组件基准未锁定：${summarizeRequiredUiAssetComponents(missingForScreen)}。本次继续生图，并要求模型按 UI资产图命名控件族最近邻映射。`);
  }
  return warnings;
}

function screenNeedsCharacterReference(screen = getDesignScreen(), designComposition = null) {
  if (!screen) return false;
  const composition = normalizeDesignCompositionAnalysis(designComposition || getStoredDesignCompositionAnalysis(screen), screen);
  const compositionText = composition
    ? [
      ...(composition.requiredComponents || []),
      ...(composition.optionalComponents || []),
      ...(composition.layoutSlots || []),
      ...(composition.primaryActions || []),
      ...(composition.stateWidgets || [])
    ].map((item) => [item.name, item.type, item.reason].filter(Boolean).join(" ")).join(" ")
    : "";
  const screenPlan = extractScreenSection(getVisualPlanText(), screen) || "";
  const text = [
    screen.name,
    screen.kind,
    screen.goal,
    screen.coreAction,
    screen.keyState,
    getScreenCloseBehavior(screen),
    compositionText,
    screenPlan.slice(0, 1600)
  ].filter(Boolean).join(" ");
  return /角色|宠物|npc|NPC|头像|立绘|半身|全身|伙伴|英雄|皮肤|换装|人物|角色形象|宠物形象|avatar|portrait|character|pet|hero|skin/i.test(text);
}

function getUiAssetVersion(kit = state.totalAssetKit?.ui || state.uiAssetKit || {}) {
  if (kit.status !== "ready" || !kit.imageUrl) return "";
  return String(kit.updatedAt || kit.requestId || kit.imageUrl);
}

function getTotalAssetVersion(kit = state.totalAssetKit || {}) {
  const readyParts = TOTAL_ASSET_TYPES
    .map((item) => kit[item.id])
    .filter((part) => part?.status === "ready" && part.imageUrl)
    .map((part) => part.imageUrl);
  if (!readyParts.length) return "";
  return String(kit.updatedAt || kit.requestId || readyParts.join("|"));
}

function getUiAssetStyleTransferText() {
  return getTotalAssetStyleTransferText();
}

function getTotalAssetStyleTransferText(screen = getDesignScreen(), designComposition = null) {
  const kit = state.totalAssetKit || {};
  if (!getTotalAssetVersion(kit)) return "";
  const refs = getTotalAssetReferencesForDesign(screen, designComposition);
  const roles = refs.map((item) => item.label).join("、") || "总资产";
  const formatRoleAnalysis = (type) => buildTotalAssetVisibleAnalysisBlocks(type, kit.analysis)
    .filter((block) => !/严格校验/.test(block.title))
    .map((block) => `${block.title}：${block.lines.join("；")}`)
    .join("\n")
    .slice(0, 900);
  return [
    `项目级总资产已锁定：本次参考图包含 ${roles}。`,
    "控件只看 UI控件资产图；背景只看背景设定图；角色、宠物、NPC、头像或立绘只在当前界面需要时看角色设定图。",
    "资产图只提供画风、材质、色彩、光影、形状语言和状态表现，不决定当前界面的玩法、业务入口、布局结构或组件清单。",
    "当前界面必须控件不能少于策划案/交互案要求；可合理延伸状态变体和辅助控件，但不得搬入参考图或资产图中与当前页面无关的业务入口。",
    kit.ui?.imageUrl ? `UI控件风格分析：${formatRoleAnalysis("ui")}` : "",
    kit.background?.imageUrl ? `背景风格分析：${formatRoleAnalysis("background")}` : "",
    kit.character?.imageUrl && screenNeedsCharacterReference(screen, designComposition) ? `角色风格分析：${formatRoleAnalysis("character")}` : ""
  ].filter(Boolean).join("\n");
}

function buildUiAssetKitSummary() {
  return buildTotalAssetKitSummary();
}

function normalizeEvidenceProgressItems(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => ({
    index: Number(item?.index || index + 1),
    label: cleanAnalysisText(item?.label || `图${index + 1}`),
    status: cleanAnalysisText(item?.status || "queued"),
    model: cleanAnalysisText(item?.model || ""),
    error: cleanAnalysisText(item?.error || ""),
    summary: cleanAnalysisText(item?.summary || ""),
    attempts: normalizeEvidenceAttemptItems(item?.attempts),
    referenceSignature: cleanAnalysisText(item?.referenceSignature || item?.signature || "")
  }));
}

function normalizeEvidenceAttemptItems(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => ({
    model: cleanAnalysisText(item?.model || ""),
    status: cleanAnalysisText(item?.status || ""),
    error: cleanAnalysisText(item?.error || ""),
    summary: cleanAnalysisText(item?.summary || "")
  })).filter((item) => item.model || item.status || item.error || item.summary);
}

function getStyleReferenceSelectionState() {
  const referencedIndices = getReferencedStyleIndices();
  const explicitSelection = referencedIndices.length > 0;
  const selectedIndices = explicitSelection
    ? referencedIndices
    : state.styleReferences.map((_, index) => index);
  const selectedReferences = selectedIndices
    .map((index) => state.styleReferences[index] ? {
      ...state.styleReferences[index],
      originalIndex: index,
      label: `图${index + 1}`
    } : null)
    .filter(Boolean);
  const sendableReferences = selectedReferences.slice(0, DESIGN_REFERENCE_LIMIT);
  const limitedReferences = selectedReferences.slice(DESIGN_REFERENCE_LIMIT);
  return {
    uploadedCount: state.styleReferences.length,
    explicitSelection,
    referencedIndices,
    selectedReferences,
    sendableReferences,
    limitedReferences,
    labels: sendableReferences.map((item) => item.label),
    limitedLabels: limitedReferences.map((item) => item.label)
  };
}

function formatStyleReferenceSelectionRule(selection = getStyleReferenceSelectionState()) {
  if (!selection.uploadedCount) return "未上传参考图";
  const sentLabels = selection.labels.length ? selection.labels.join("、") : "无";
  const modeText = selection.explicitSelection
    ? `提示词指定仅发送 ${sentLabels}`
    : `未指定图号，默认发送 ${sentLabels}`;
  const limitedText = selection.limitedLabels.length
    ? `；${selection.limitedLabels.join("、")} 超过 ${DESIGN_REFERENCE_LIMIT} 张上限未发送`
    : "";
  return `已上传 ${selection.uploadedCount} 张；本次发送 ${selection.sendableReferences.length} 张；${modeText}${limitedText}`;
}

function estimateDataUrlBytes(dataUrl = "") {
  const value = String(dataUrl || "");
  const commaIndex = value.indexOf(",");
  const base64 = commaIndex >= 0 ? value.slice(commaIndex + 1) : value;
  return Math.floor((base64.length * 3) / 4);
}

async function prepareStyleReferenceDataUrlForRequest(dataUrl) {
  const attempts = [
    { maxSide: 1400, quality: 0.86 },
    { maxSide: 1200, quality: 0.82 },
    { maxSide: 960, quality: 0.74 },
    { maxSide: 768, quality: 0.68 }
  ];
  let current = dataUrl;
  for (const option of attempts) {
    current = await downscaleImageDataUrl(current, option);
    if (estimateDataUrlBytes(current) <= MAX_REFERENCE_IMAGE_BYTES) {
      return { ok: true, dataUrl: current, bytes: estimateDataUrlBytes(current) };
    }
  }
  return {
    ok: false,
    dataUrl: current,
    bytes: estimateDataUrlBytes(current),
    reason: `压缩后仍超过 ${formatFileSize(MAX_REFERENCE_IMAGE_BYTES)}`
  };
}

async function prepareStyleReferenceItemsForRequest(items = []) {
  const source = Array.isArray(items) ? items.slice(0, DESIGN_REFERENCE_LIMIT) : [];
  const sentItems = [];
  const skippedItems = [];
  for (const item of source) {
    try {
      const prepared = await prepareStyleReferenceDataUrlForRequest(item.dataUrl);
      if (!prepared.ok) {
        skippedItems.push({
          label: item.label,
          reason: prepared.reason || "图片过大，未发送"
        });
        continue;
      }
      sentItems.push({
        ...item,
        requestDataUrl: prepared.dataUrl,
        requestBytes: prepared.bytes
      });
    } catch (error) {
      skippedItems.push({
        label: item.label,
        reason: "浏览器端压缩失败，未发送"
      });
    }
  }
  return {
    sentItems,
    skippedItems,
    referenceImages: sentItems.map((item) => item.requestDataUrl || item.dataUrl),
    referenceLabels: sentItems.map((item) => item.label)
  };
}

function buildStyleReferenceRequestInfo(selection = getStyleReferenceSelectionState(), prepared = null, userKeywords = getStylePromptText()) {
  const preparedSentItems = Array.isArray(prepared?.sentItems) ? prepared.sentItems : selection.sendableReferences;
  const skippedItems = [
    ...(Array.isArray(prepared?.skippedItems) ? prepared.skippedItems : []),
    ...selection.limitedReferences.map((item) => ({
      label: item.label,
      reason: `超过 ${DESIGN_REFERENCE_LIMIT} 张上限未发送`
    }))
  ];
  return {
    uploadedCount: selection.uploadedCount,
    explicitSelection: selection.explicitSelection,
    selectedLabels: selection.selectedReferences.map((item) => item.label),
    sentLabels: preparedSentItems.map((item) => item.label),
    sentBytes: preparedSentItems.map((item) => item.requestBytes || estimateDataUrlBytes(item.requestDataUrl || item.dataUrl || "")),
    skippedItems,
    sourceSignature: getStyleReferenceSourceSignature(selection, userKeywords),
    referenceSignature: getStyleReferenceSignature(preparedSentItems, userKeywords)
  };
}

function formatStyleReferenceRequestInfo(requestInfo = null, fallbackSelection = getStyleReferenceSelectionState()) {
  if (!requestInfo) return formatStyleReferenceSelectionRule(fallbackSelection);
  const sentLabels = requestInfo.sentLabels?.length ? requestInfo.sentLabels.join("、") : "无";
  const modeText = requestInfo.explicitSelection
    ? `提示词指定仅发送 ${sentLabels}`
    : `未指定图号，默认发送 ${sentLabels}`;
  const skippedText = Array.isArray(requestInfo.skippedItems) && requestInfo.skippedItems.length
    ? `；${requestInfo.skippedItems.map((item) => `${item.label} ${item.reason}`).join("；")}`
    : "";
  return `已上传 ${requestInfo.uploadedCount || 0} 张；本次发送 ${(requestInfo.sentLabels || []).length} 张；${modeText}${skippedText}`;
}

function formatStyleReferenceSkippedReasons(requestInfo = null) {
  const skippedItems = Array.isArray(requestInfo?.skippedItems) ? requestInfo.skippedItems : [];
  return skippedItems.map((item) => `${item.label || "参考图"} ${item.reason || "未发送"}`).join("；");
}

function buildEvidenceProgressFromReferenceEvidenceSet(referenceEvidenceSet, { referenceLabels = [], expectedCount = 0, referenceSignature = "" } = {}) {
  const entries = normalizeReferenceEvidenceSet(referenceEvidenceSet);
  const byIndex = new Map(entries.map((entry, index) => [Number(entry.index || index + 1), entry]));
  const total = Math.max(Number(expectedCount || 0), entries.length, referenceLabels.length);
  const count = total || entries.length;
  const signature = cleanAnalysisText(referenceSignature);
  return Array.from({ length: count }, (_, index) => {
    const itemIndex = index + 1;
    const entry = byIndex.get(itemIndex) || entries[index] || null;
    const validation = entry ? validateReferenceEvidenceEntry(entry) : null;
    return {
      index: itemIndex,
      label: referenceLabels[index] || entry?.label || `图${itemIndex}`,
      status: entry ? (validation?.ok ? "complete" : "insufficient") : "failed",
      model: entry?.model || "",
      error: entry && !validation?.ok ? validation.missing.join("；") : entry ? "" : "未返回逐图证据",
      summary: entry && validation?.ok ? summarizeReferenceEvidenceEntry(entry) : "",
      attempts: normalizeEvidenceAttemptItems(entry?.attempts),
      referenceSignature: signature
    };
  });
}

function getEvidenceProgressExpectedCount(kit = state.totalAssetKit || {}) {
  return Math.max(
    Number(kit.analysis?.originalReferenceImageCount || kit.analysis?.referenceImageCount || 0),
    normalizeReferenceEvidenceSet(kit.analysis?.referenceEvidenceSet).length,
    normalizeEvidenceProgressItems(kit.analysis?.evidenceProgress).length,
    normalizeEvidenceProgressItems(kit.evidenceProgress).length
  );
}

function progressMatchesReferenceSignature(items, referenceSignature = "") {
  const signature = cleanAnalysisText(referenceSignature);
  if (!signature) return true;
  const signedItems = items.filter((item) => item.referenceSignature);
  return !signedItems.length || signedItems.every((item) => item.referenceSignature === signature);
}

function getCurrentEvidenceProgressItems(kit = state.totalAssetKit || {}) {
  const signature = kit.referenceSignature || kit.analysis?.referenceSignature || "";
  const expectedCount = getEvidenceProgressExpectedCount(kit);
  const referenceEvidenceItems = normalizeReferenceEvidenceSet(kit.analysis?.referenceEvidenceSet);
  const candidates = [
    normalizeEvidenceProgressItems(kit.evidenceProgress),
    normalizeEvidenceProgressItems(kit.analysis?.evidenceProgress),
    referenceEvidenceItems.length ? buildEvidenceProgressFromReferenceEvidenceSet(referenceEvidenceItems, {
      expectedCount,
      referenceSignature: signature
    }) : []
  ].filter((items) => items.length && progressMatchesReferenceSignature(items, signature));
  if (!candidates.length) return [];
  return candidates.sort((a, b) => {
    const aSigned = signature && a.some((item) => item.referenceSignature === signature) ? 1 : 0;
    const bSigned = signature && b.some((item) => item.referenceSignature === signature) ? 1 : 0;
    if (aSigned !== bSigned) return bSigned - aSigned;
    const aExpected = expectedCount && a.length >= expectedCount ? 1 : 0;
    const bExpected = expectedCount && b.length >= expectedCount ? 1 : 0;
    if (aExpected !== bExpected) return bExpected - aExpected;
    if (a.length !== b.length) return b.length - a.length;
    const terminalStatuses = ["complete", "skipped", "insufficient", "failed", "model_failed", "timeout", "cancelled"];
    const aTerminal = a.filter((item) => terminalStatuses.includes(item.status)).length;
    const bTerminal = b.filter((item) => terminalStatuses.includes(item.status)).length;
    return bTerminal - aTerminal;
  })[0];
}

function getEvidenceProgressLabel(status) {
  const map = {
    queued: "等待中",
    analyzing: "分析中",
    retrying: "重试中",
    complete: "完成",
    model_failed: "模型/服务失败",
    skipped: "已跳过",
    timeout: "超时",
    insufficient: "证据不足",
    failed: "失败",
    cancelled: "已取消"
  };
  return map[status] || status || "等待中";
}

function formatEvidenceProgressLines(value) {
  return normalizeEvidenceProgressItems(value).map((item) => {
    const label = item.label || `图${item.index}`;
    const stateText = getEvidenceProgressLabel(item.status);
    const modelText = item.model ? ` · ${item.model}` : "";
    const errorText = item.error ? `：${item.error}` : "";
    const summaryText = item.summary && !item.error ? `：${item.summary}` : "";
    const attemptsText = item.attempts?.length
      ? `；尝试：${item.attempts.map(formatEvidenceAttemptLine).filter(Boolean).join("；")}`
      : "";
    return `${label} ${stateText}${modelText}${errorText || summaryText}${attemptsText}`;
  });
}

function formatEvidenceAttemptLine(item) {
  if (!item) return "";
  const statusText = getEvidenceProgressLabel(item.status);
  const modelText = item.model || "未知模型";
  const detail = item.error || item.summary || "";
  return `${modelText} ${statusText}${detail ? `（${detail}` : ""}${detail ? "）" : ""}`;
}

function buildTotalAssetKitSummary() {
  const kit = state.totalAssetKit || {};
  const uiPart = kit.ui || {};
  const strictValidation = kit.analysis ? validateStrictStyleEvidence(kit.analysis) : { ok: true, missing: [] };
  const styleAnchorWarning = kit.analysis && !strictValidation.ok
    ? `；严格风格证据不足：${strictValidation.missing.join("、")}；不会用默认风格补齐`
    : "";
  const readyTypes = getTotalAssetReadyTypes(kit);
  const readyText = readyTypes.map((type) => getTotalAssetPartMeta(type).label).join("、");
  const failedTypes = TOTAL_ASSET_TYPES
    .filter((item) => kit[item.id]?.status === "error" || kit[item.id]?.status === "incomplete")
    .map((item) => kit[item.id]?.status === "incomplete" ? `${item.label}不完整` : `${item.label}失败`);
  const partialText = failedTypes.length ? `；${failedTypes.join("、")}` : "";
  const progressItems = getCurrentEvidenceProgressItems(kit);
  const progressLines = formatEvidenceProgressLines(progressItems);
  const expectedCount = getEvidenceProgressExpectedCount(kit);
  const completeCount = progressItems.filter((item) => item.status === "complete").length;
  const skippedCount = progressItems.filter((item) => item.status === "skipped").length;
    const serviceFailedCount = progressItems.filter((item) => item.status === "model_failed").length;
    const failedCount = progressItems.filter((item) => ["failed", "timeout", "insufficient", "model_failed"].includes(item.status)).length;
    const countText = expectedCount
    ? `参考图取证 ${completeCount}/${expectedCount} 完成，${formatReferenceEvidenceGateText(expectedCount)}${skippedCount ? `，${skippedCount} 张已跳过` : ""}${serviceFailedCount ? `，${serviceFailedCount} 张模型/服务失败` : ""}${failedCount && !serviceFailedCount ? `，${failedCount} 张失败/不足` : ""}`
    : "";
  const progressText = progressLines.length ? `：${[countText, ...progressLines].filter(Boolean).join("；")}` : "";
  const requestText = kit.referenceRequestInfo
    ? `；${formatStyleReferenceRequestInfo(kit.referenceRequestInfo)}`
    : "";
  const currentMeta = kit.currentAssetType ? getTotalAssetPartMeta(kit.currentAssetType) : null;
  const currentElapsed = kit.currentAssetStartedAt
    ? Math.max(0, Math.floor((Date.now() - kit.currentAssetStartedAt) / 1000))
    : 0;
  const currentText = currentMeta
    ? `：正在生成 ${currentMeta.label}${currentElapsed ? `，已等待 ${Math.floor(currentElapsed / 60)}分${currentElapsed % 60}秒` : ""}，单张最多等待 ${formatMinutesForTimeout(TOTAL_ASSET_IMAGE_TIMEOUT_MS)} 分钟`
    : "";
  const statusMap = {
    idle: "未生成；普通界面可先生成，生成总资产后后续界面将按控件、背景、角色分角色引用",
    analyzing: `正在分析参考图证据、主要界面清单和对应交互章节${requestText}${progressText}`,
    generating: `正在生成项目级总资产${currentText}${requestText}${progressText ? `；取证结果${progressText}` : ""}`,
    ready: kit.dirty
      ? `已锁定 ${readyText || "部分资产"}；输入已变化，仍使用上一次总资产${kit.dirtyReason ? `（${kit.dirtyReason}）` : ""}${requestText}${partialText}`
      : `已锁定 ${readyText || "部分资产"}，作为后续界面的项目级视觉基准${kit.updatedAt ? `；更新时间 ${getStyleAnalysisUpdatedText(kit.updatedAt)}` : ""}${requestText}${styleAnchorWarning}${partialText}`,
    error: `生成失败：${kit.error || "未知错误"}`
  };
  return statusMap[kit.status] || statusMap.idle;
}

function buildTotalAssetDisplayAnalysisSummary(kit = state.totalAssetKit || {}) {
  const analysis = kit.analysis || null;
  const normalized = normalizeStructuredStyleAnalysisForDisplay(analysis);
  const busy = isTotalAssetBusy(kit);
  const status = cleanAnalysisText(normalized?.analysisStatus || analysis?.analysisStatus || kit.status || "");
  const validation = analysis ? validateStrictStyleEvidence(analysis) : { ok: false, missing: [] };
  const declaredFailure = /insufficient|failed|error|cancelled|不足|失败|取消/i.test(status);
  const failed = Boolean(analysis) && (declaredFailure || (!busy && !validation.ok));
  const failureLines = [
    ...(failed && !validation.ok ? validation.missing || [] : []),
    ...normalizeAnalysisList(normalized?.localValidationMissing),
    ...normalizeAnalysisList(normalized?.missingVisualDNA),
    ...normalizeAnalysisList(normalized?.missingEvidence)
  ].filter(Boolean);
  const currentMeta = kit.currentAssetType ? getTotalAssetPartMeta(kit.currentAssetType) : null;
  const backgroundSummary = normalized ? formatBackgroundSpecSummary(normalized.backgroundSpec) : "";
  const shapeLanguageSummary = normalized
    ? joinSpecSummary([
      formatPointLinePlaneSummary(normalized.pointLinePlane),
      joinSpecSummary(formatShapeLanguageDetailedLines(normalized.shapeLanguage))
    ])
    : "";
  const buttonMorphologySummary = normalized ? formatButtonSpecSummary(normalized.buttonSpec) : "";
  const hasStyleSummaries = Boolean(backgroundSummary || shapeLanguageSummary || buttonMorphologySummary);
  const failureText = failureLines.length
    ? `总资产严格分析未通过：${[...new Set(failureLines)].slice(0, 4).join("；")}；不会使用默认风格兜底`
    : failed
      ? "总资产严格分析未通过；不会使用默认风格兜底"
      : "";
  const statusText = !analysis
    ? busy
      ? "正在严格分析参考图视觉指纹；不会使用默认风格兜底"
      : ""
    : failed
      ? failureText
      : kit.status === "generating" || currentMeta
        ? `已通过参考图证据校验，正在生成 ${currentMeta?.label || "UI/背景/角色资产"}`
        : kit.status === "analyzing"
          ? /evidence-ready/i.test(status)
            ? "逐图参考图证据已完成，正在综合总资产风格规则"
            : "正在严格分析参考图视觉指纹；不会使用默认风格兜底"
          : kit.status === "ready"
            ? "总资产综合分析已通过，后续资产和普通界面可复用"
            : "总资产综合分析已通过";

  return {
    hasAnalysis: Boolean(analysis),
    normalized,
    failed,
    failureText,
    statusText,
    backgroundSummary,
    shapeLanguageSummary,
    buttonMorphologySummary,
    hasStyleSummaries
  };
}

function getLockedStyleReferencesForDesign() {
  const cache = state.styleAnalysisCache || {};
  const selection = getStyleReferenceSelectionState();
  const userKeywords = getStylePromptText();
  const sourceSignature = getStyleReferenceSourceSignature(selection, userKeywords);
  if (
    cache.status === "ready"
    && Array.isArray(cache.referenceImages)
    && !cache.dirty
    && (!cache.referenceSourceSignature || cache.referenceSourceSignature === sourceSignature)
  ) {
    return {
      referenceImages: cache.referenceImages,
      referenceLabels: cache.referenceLabels || [],
      styleKeywords: cache.userKeywords || "",
      styleTransferKeywords: cache.styleTransferKeywords || "",
      referenceSignature: cache.referenceSignature || "",
      referenceSourceSignature: cache.referenceSourceSignature || "",
      referenceRequestInfo: cache.referenceRequestInfo || null
    };
  }

  const items = selection.sendableReferences;
  return {
    referenceImages: items.map((item) => item.dataUrl),
    referenceLabels: items.map((item) => item.label),
    styleKeywords: userKeywords,
    styleTransferKeywords: "",
    referenceSignature: getStyleReferenceSignature(items, userKeywords),
    referenceSourceSignature: sourceSignature,
    referenceRequestInfo: null
  };
}

function getStrictReadyStyleCacheForTotalAssets(referenceItems, userKeywords) {
  const cache = state.styleAnalysisCache || {};
  const signature = getStyleReferenceSignature(referenceItems, userKeywords);
  if (
    cache.status === "ready"
    && cache.referenceSignature === signature
    && cache.styleAnalysisCompleteness === "complete"
    && cache.styleTransferKeywords
  ) {
    return cache;
  }
  return null;
}

async function ensureStyleAnalysisCache(screen = getDesignScreen()) {
  const cache = state.styleAnalysisCache || {};
  if (cache.status === "analyzing" && state.styleAnalysisPromise) {
    return state.styleAnalysisPromise;
  }
  const currentSelection = getStyleReferenceSelectionState();
  const currentSourceSignature = getStyleReferenceSourceSignature(currentSelection, getStylePromptText());
  if (
    cache.status === "ready"
    && Array.isArray(cache.referenceImages)
    && cache.referenceImages.length
    && !cache.dirty
    && (!cache.referenceSourceSignature || cache.referenceSourceSignature === currentSourceSignature)
  ) {
    return cache;
  }

  const items = currentSelection.sendableReferences;
  if (!items.length) {
    return {
      status: "idle",
      requestId: "",
      styleTransferKeywords: "",
      styleKeywordSummary: "",
      styleAnalysisSummary: "",
      styleAnalysisSections: [],
      styleAnalysisSource: "none",
      structuredAnalysis: null,
      backgroundStyleSummary: "",
      shapeLanguageSummary: "",
      buttonMorphologySummary: "",
      backgroundPromptText: "",
      shapeLanguagePromptText: "",
      buttonMorphologyPromptText: "",
      backgroundStyleSource: "none",
      shapeLanguageSource: "none",
      buttonMorphologySource: "none",
      backgroundStyleReason: "",
      shapeLanguageReason: "",
      buttonMorphologyReason: "",
      styleAnalysisCompleteness: "idle",
      styleAnalysisParseSource: "none",
      referenceImages: [],
      referenceLabels: [],
      referenceSignature: "",
      referenceSourceSignature: currentSourceSignature,
      referenceRequestInfo: null,
      userKeywords: getStylePromptText(),
      updatedAt: 0,
      error: "",
      dirty: false,
      dirtyReason: ""
    };
  }

  return refreshStyleAnalysisCache({ force: true, source: "auto", screen });
}

async function refreshStyleAnalysisCache({ force = false, source = "manual", screen = getDesignScreen() } = {}) {
  if (state.styleAnalysisCache?.status === "analyzing" && state.styleAnalysisPromise) {
    return state.styleAnalysisPromise;
  }

  const selection = getStyleReferenceSelectionState();
  const userKeywords = getStylePromptText();
  const referenceSourceSignature = getStyleReferenceSourceSignature(selection, userKeywords);

  if (!selection.sendableReferences.length) {
    resetStyleAnalysisCache();
    renderDesignPromptSummary();
    if (source === "manual") {
      $("#designStatus").textContent = "没有可分析的画风参考图";
    }
    return state.styleAnalysisCache;
  }

  if (source === "manual") {
    $("#designStatus").textContent = "正在压缩参考图并准备发送";
  }
  const prepared = await prepareStyleReferenceItemsForRequest(selection.sendableReferences);
  const requestInfo = buildStyleReferenceRequestInfo(selection, prepared, userKeywords);
  const referenceImages = prepared.referenceImages;
  const referenceLabels = prepared.referenceLabels;
  const signature = requestInfo.referenceSignature;

  if (!referenceImages.length) {
    const skippedText = formatStyleReferenceSkippedReasons(requestInfo);
    const message = skippedText
      ? `没有可发送的画风参考图：${skippedText}`
      : "没有可发送的画风参考图";
    state.styleTransferKeywords = "";
    state.styleAnalysisCache = {
      status: "error",
      requestId: "",
      styleTransferKeywords: "",
      styleKeywordSummary: "",
      styleAnalysisSummary: "",
      styleAnalysisSections: [],
      styleAnalysisSource: "none",
      structuredAnalysis: null,
      backgroundStyleSummary: "",
      shapeLanguageSummary: "",
      buttonMorphologySummary: "",
      backgroundPromptText: "",
      shapeLanguagePromptText: "",
      buttonMorphologyPromptText: "",
      backgroundStyleSource: "none",
      shapeLanguageSource: "none",
      buttonMorphologySource: "none",
      backgroundStyleReason: "",
      shapeLanguageReason: "",
      buttonMorphologyReason: "",
      styleAnalysisCompleteness: "idle",
      styleAnalysisParseSource: "none",
      referenceImages: [],
      referenceLabels: [],
      referenceSignature: signature,
      referenceSourceSignature,
      referenceRequestInfo: requestInfo,
      userKeywords,
      updatedAt: 0,
      error: message,
      dirty: false,
      dirtyReason: ""
    };
    renderDesignPromptSummary();
    if (source === "manual") {
      $("#designStatus").textContent = message;
    }
    return state.styleAnalysisCache;
  }

  if (
    !force
    && state.styleAnalysisCache?.status === "ready"
    && state.styleAnalysisCache.referenceSignature === signature
    && (!state.styleAnalysisCache.referenceSourceSignature || state.styleAnalysisCache.referenceSourceSignature === referenceSourceSignature)
  ) {
    return state.styleAnalysisCache;
  }

  const shouldRestorePreviousOnFailure = source !== "manual" && state.styleAnalysisCache?.status === "ready";
  const previousCache = shouldRestorePreviousOnFailure
    ? {
      ...state.styleAnalysisCache,
      referenceImages: [...(state.styleAnalysisCache.referenceImages || [])],
      referenceLabels: [...(state.styleAnalysisCache.referenceLabels || [])],
      referenceRequestInfo: state.styleAnalysisCache.referenceRequestInfo
        ? structuredCloneSafe(state.styleAnalysisCache.referenceRequestInfo)
        : null
    }
    : null;
  const requestId = createStyleAnalysisRequestId();
  state.styleTransferKeywords = "";

  state.styleAnalysisCache = {
    status: "analyzing",
    requestId,
    styleTransferKeywords: "",
    styleKeywordSummary: "",
    styleAnalysisSummary: "",
    styleAnalysisSections: [],
    styleAnalysisSource: "none",
    structuredAnalysis: null,
    backgroundStyleSummary: "",
    shapeLanguageSummary: "",
    buttonMorphologySummary: "",
    backgroundPromptText: "",
    shapeLanguagePromptText: "",
    buttonMorphologyPromptText: "",
    backgroundStyleSource: "none",
    shapeLanguageSource: "none",
    buttonMorphologySource: "none",
    backgroundStyleReason: "",
    shapeLanguageReason: "",
    buttonMorphologyReason: "",
    styleAnalysisCompleteness: "idle",
    styleAnalysisParseSource: "none",
    referenceImages,
    referenceLabels,
    referenceSignature: signature,
    referenceSourceSignature,
    referenceRequestInfo: requestInfo,
    userKeywords,
    updatedAt: 0,
    error: "",
    dirty: false,
    dirtyReason: ""
  };
  syncStyleAnalysisRefreshButtonState();
  renderDesignPromptSummary();
  if (source === "manual") {
    $("#designStatus").textContent = "正在刷新参考图分析";
  }

  state.styleAnalysisPromise = (async () => {
    try {
      const styleAnalysisResult = await buildStyleTransferKeywordsForDesign(referenceImages, userKeywords, null);
      if (state.styleAnalysisCache?.requestId !== requestId) return state.styleAnalysisCache;

      const latestSourceSignature = getStyleReferenceSourceSignature(getStyleReferenceSelectionState(), getStylePromptText());
      const changedDuringAnalysis = latestSourceSignature !== referenceSourceSignature;
      state.styleAnalysisCache = {
        status: "ready",
        requestId,
        styleTransferKeywords: styleAnalysisResult.styleTransferKeywords,
        styleKeywordSummary: styleAnalysisResult.styleKeywordSummary,
        styleAnalysisSummary: styleAnalysisResult.styleAnalysisSummary,
        styleAnalysisSections: [...styleAnalysisResult.styleAnalysisSections],
        styleAnalysisSource: styleAnalysisResult.styleAnalysisSource,
        structuredAnalysis: styleAnalysisResult.structuredAnalysis || null,
        backgroundStyleSummary: styleAnalysisResult.backgroundStyleSummary,
        shapeLanguageSummary: styleAnalysisResult.shapeLanguageSummary,
        buttonMorphologySummary: styleAnalysisResult.buttonMorphologySummary,
        backgroundPromptText: styleAnalysisResult.backgroundPromptText,
        shapeLanguagePromptText: styleAnalysisResult.shapeLanguagePromptText,
        buttonMorphologyPromptText: styleAnalysisResult.buttonMorphologyPromptText,
        backgroundStyleSource: styleAnalysisResult.backgroundStyleSource,
        shapeLanguageSource: styleAnalysisResult.shapeLanguageSource,
        buttonMorphologySource: styleAnalysisResult.buttonMorphologySource,
        backgroundStyleReason: styleAnalysisResult.backgroundStyleReason,
        shapeLanguageReason: styleAnalysisResult.shapeLanguageReason,
        buttonMorphologyReason: styleAnalysisResult.buttonMorphologyReason,
        styleAnalysisCompleteness: styleAnalysisResult.styleAnalysisCompleteness,
        styleAnalysisParseSource: styleAnalysisResult.styleAnalysisParseSource || "analysis",
        referenceImages,
        referenceLabels,
        referenceSignature: signature,
        referenceSourceSignature,
        referenceRequestInfo: requestInfo,
        userKeywords,
        updatedAt: Date.now(),
        error: "",
        dirty: changedDuringAnalysis,
        dirtyReason: changedDuringAnalysis ? "参考图或关键词在分析期间已变化" : ""
      };
      state.styleTransferKeywords = styleAnalysisResult.styleTransferKeywords;
      if (source === "manual") {
        $("#designStatus").textContent = "参考图分析已刷新，已有设计稿不会自动更新";
      }
      renderDesignPromptSummary();
      return state.styleAnalysisCache;
    } catch (error) {
      const message = error?.message || "参考图分析失败";
      if (state.styleAnalysisCache?.requestId !== requestId) return state.styleAnalysisCache;
      if (previousCache) {
        state.styleAnalysisCache = {
          ...previousCache,
          dirty: true,
          dirtyReason: `刷新失败：${message}`,
          error: message
        };
        state.styleTransferKeywords = previousCache.styleTransferKeywords || "";
      } else {
        state.styleAnalysisCache = {
          status: "error",
          requestId,
          styleTransferKeywords: "",
          styleKeywordSummary: "",
          styleAnalysisSummary: "",
          styleAnalysisSections: [],
          styleAnalysisSource: "none",
          structuredAnalysis: null,
          backgroundStyleSummary: "",
          shapeLanguageSummary: "",
          buttonMorphologySummary: "",
          backgroundPromptText: "",
          shapeLanguagePromptText: "",
          buttonMorphologyPromptText: "",
          backgroundStyleSource: "none",
          shapeLanguageSource: "none",
          buttonMorphologySource: "none",
          backgroundStyleReason: "",
          shapeLanguageReason: "",
          buttonMorphologyReason: "",
          styleAnalysisCompleteness: "idle",
          styleAnalysisParseSource: "none",
          referenceImages,
          referenceLabels,
          referenceSignature: signature,
          referenceSourceSignature,
          referenceRequestInfo: requestInfo,
          userKeywords,
          updatedAt: 0,
          error: message,
          dirty: false,
          dirtyReason: ""
        };
        state.styleTransferKeywords = "";
      }
      $("#designStatus").textContent = message;
      renderDesignPromptSummary();
      return state.styleAnalysisCache;
    } finally {
      if (state.styleAnalysisCache?.requestId === requestId) {
        state.styleAnalysisPromise = null;
      }
      syncStyleAnalysisRefreshButtonState();
    }
  })();

  return state.styleAnalysisPromise;
}

async function ensureUiAssetKit({ screen = getDesignScreen(), model = getSelectedDesignModel() } = {}) {
  const kit = await ensureTotalAssetKit({ screen, model });
  return kit?.ui || syncLegacyUiAssetKit();
}

async function refreshUiAssetKit({ force = false, source = "manual", screen = getDesignScreen(), model = getSelectedDesignModel() } = {}) {
  const kit = await refreshTotalAssetKit({ force, source, screen, model });
  return kit?.ui || syncLegacyUiAssetKit();
}

async function ensureTotalAssetKit({ screen = getDesignScreen(), model = getSelectedDesignModel() } = {}) {
  const kit = state.totalAssetKit || {};
  if (isTotalAssetBusy(kit) && state.totalAssetKitPromise) {
    return state.totalAssetKitPromise;
  }
  if (hasUsableTotalAssetKit(kit)) {
    return kit;
  }
  restoreLockedTotalAssetFromStorage();
  return state.totalAssetKit || createEmptyTotalAssetKit();
}

async function refreshTotalAssetKit({ force = false, source = "manual", screen = getDesignScreen(), model = getSelectedDesignModel() } = {}) {
  if (isTotalAssetBusy(state.totalAssetKit) && state.totalAssetKitPromise) {
    return state.totalAssetKitPromise;
  }

  const selection = getStyleReferenceSelectionState();
  const styleKeywords = getStylePromptText();
  const referenceSourceSignature = getUiAssetKitSourceSignature(selection, styleKeywords, model);
  if (source === "manual") {
    $("#designStatus").textContent = "正在压缩参考图并准备总资产分析";
  }
  const prepared = await prepareStyleReferenceItemsForRequest(selection.sendableReferences);
  const requestInfo = buildStyleReferenceRequestInfo(selection, prepared, styleKeywords);
  const referenceImages = prepared.referenceImages;
  const referenceLabels = prepared.referenceLabels;
  const signature = getUiAssetKitSignature(prepared.sentItems, styleKeywords, model);
  const currentKit = state.totalAssetKit || createEmptyTotalAssetKit();
  const pendingAssetTypesAtStart = getPendingTotalAssetTypesForRefresh(currentKit);

  if (force && source !== "manual" && !pendingAssetTypesAtStart.length) {
    patchTotalAssetKit({
      status: "ready",
      currentAssetType: "",
      currentAssetStartedAt: 0,
      error: ""
    });
    if (source === "manual") {
      $("#designStatus").textContent = "总资产已全部生成，无失败项需要重新生成";
    }
    renderDesignPromptSummary();
    renderUiAssetOutputIfActive();
    return state.totalAssetKit;
  }

  if (
    !force
    && currentKit.status === "ready"
    && currentKit.referenceSignature === signature
    && (!currentKit.referenceSourceSignature || currentKit.referenceSourceSignature === referenceSourceSignature)
  ) {
    return currentKit;
  }

  const previousKit = getTotalAssetReadyTypes(currentKit).length ? structuredCloneSafe(currentKit) : null;
  const requestId = createUiAssetKitRequestId().replace("ui_asset", "total_asset");
  if (state.totalAssetCancelController && !state.totalAssetCancelController.signal.aborted) {
    state.totalAssetCancelController.abort(createClientAbortError("已开始新的总资产分析"));
  }
  const cancelController = new AbortController();
  state.totalAssetCancelController = cancelController;
  const preserveFreshAssets = !(force && source === "manual");
  const initialEvidenceProgress = referenceImages.map((_, index) => ({
    index: index + 1,
    label: referenceLabels[index] || `图${index + 1}`,
    status: "queued",
    model: "",
    error: "",
    summary: "",
    referenceSignature: signature
  }));
  patchTotalAssetKit({
    status: "analyzing",
    requestId,
    referenceSignature: signature,
    referenceSourceSignature,
    referenceRequestInfo: requestInfo,
    styleKeywords,
    imageModel: model,
    analysis: null,
    evidenceProgress: initialEvidenceProgress,
    currentAssetType: "",
    currentAssetStartedAt: 0,
    updatedAt: 0,
    error: "",
    dirty: false,
    dirtyReason: "",
    ui: prepareTotalAssetPartForRefresh(previousKit?.ui || createEmptyTotalAssetPart(), { preserveFresh: preserveFreshAssets }),
    background: prepareTotalAssetPartForRefresh(previousKit?.background || createEmptyTotalAssetPart(), { preserveFresh: preserveFreshAssets }),
    character: prepareTotalAssetPartForRefresh(previousKit?.character || createEmptyTotalAssetPart(), { preserveFresh: preserveFreshAssets })
  });
  syncUiAssetKitButtonState();
  renderDesignPromptSummary();
  renderUiAssetOutputIfActive();
  if (source === "manual") {
    $("#designStatus").textContent = "分析总资产规则中...";
  }

  state.totalAssetKitPromise = (async () => {
    const projectContext = buildTotalAssetProjectContext(screen);
    let failedAnalysis = null;
    try {
      if (!referenceImages.length) {
        const skippedText = formatStyleReferenceSkippedReasons(requestInfo);
        throw new Error(skippedText
          ? `缺少可发送参考图，无法精确迁移画风。${skippedText}`
          : "缺少参考图，无法精确迁移画风。请先上传清晰的 UI、背景或角色风格参考图。");
      }
      if (state.totalAssetKit?.requestId !== requestId) return state.totalAssetKit;

      let summaries = [];
      try {
        summaries = await analyzeReferenceImageMetrics(referenceImages);
      } catch (error) {
        summaries = [];
      }

      let analysisImages = referenceImages;
      try {
        analysisImages = await prepareStyleAnalysisImages(referenceImages);
      } catch (error) {
        analysisImages = referenceImages;
      }

      $("#designStatus").textContent = "逐图提取参考图风格证据中...";
      const evidenceResult = await generateReferenceEvidenceWithApi({
        referenceImages: analysisImages,
        imageSummaries: summaries,
        referenceLabels,
        referenceSignature: signature,
        signal: cancelController.signal,
        onProgress: ({ progress, index, total, label, model, status }) => {
          const statusText = status ? getEvidenceProgressLabel(status) : "分析中";
          const gateText = formatReferenceEvidenceGateText(total);
          $("#designStatus").textContent = progress?.length
            ? `逐图取证：${progress.map((item) => `${item.label}${getEvidenceProgressLabel(item.status)}`).join(" / ")}；${gateText}`
            : `逐图提取参考图风格证据 ${index + 1}/${total} · ${label} · ${model} · ${statusText}；${gateText}`;
          renderDesignPromptSummary();
          renderUiAssetOutputIfActive();
        }
      });
      if (state.totalAssetKit?.requestId !== requestId) return state.totalAssetKit;

      const referenceEvidenceSet = Array.isArray(evidenceResult)
        ? normalizeReferenceEvidenceSet(evidenceResult)
        : normalizeReferenceEvidenceSet(evidenceResult?.usableEvidenceSet || evidenceResult?.referenceEvidenceSet || []);
      const skippedEvidenceSet = Array.isArray(evidenceResult)
        ? []
        : normalizeReferenceEvidenceSet(evidenceResult?.skippedEvidenceSet || []);
      const originalReferenceImageCount = Array.isArray(evidenceResult)
        ? analysisImages.length
        : Number(evidenceResult?.originalReferenceImageCount || analysisImages.length || referenceEvidenceSet.length);
      const finalEvidenceProgress = normalizeEvidenceProgressItems(evidenceResult?.evidenceProgress).length
        ? normalizeEvidenceProgressItems(evidenceResult.evidenceProgress)
        : buildEvidenceProgressFromReferenceEvidenceSet(referenceEvidenceSet, {
          referenceLabels,
          expectedCount: originalReferenceImageCount,
          referenceSignature: signature
        });
      patchTotalAssetKit({
        evidenceProgress: finalEvidenceProgress,
        analysis: {
          ...(state.totalAssetKit?.analysis || {}),
          referenceSignature: signature,
          referenceRequestInfo: requestInfo,
          referenceImageCount: referenceEvidenceSet.length,
          originalReferenceImageCount,
          referenceEvidenceSet,
          usableEvidenceSet: referenceEvidenceSet,
          skippedEvidenceSet,
          evidenceAttemptErrors: evidenceResult?.evidenceAttemptErrors || [],
          evidenceProgress: finalEvidenceProgress,
          projectContext,
          analysisStatus: "evidence-ready"
        }
      });
      renderDesignPromptSummary();

      $("#designStatus").textContent = "综合全部参考图证据与目标界面上下文中...";
      throwIfAborted(cancelController.signal);
      const analysis = buildTotalAssetAnalysisFromEvidence({
        imageSummaries: summaries,
        referenceEvidenceSet,
        skippedEvidenceSet,
        originalReferenceImageCount,
        userKeywords: styleKeywords,
        projectContext,
        expectedReferenceCount: referenceEvidenceSet.length,
        evidenceProgress: finalEvidenceProgress,
        referenceSignature: signature
      });
      throwIfAborted(cancelController.signal);
      if (state.totalAssetKit?.requestId !== requestId) return state.totalAssetKit;
      analysis.evidenceProgress = finalEvidenceProgress;
      analysis.referenceRequestInfo = requestInfo;
      analysis.originalReferenceImageCount = originalReferenceImageCount;
      analysis.usableEvidenceSet = referenceEvidenceSet;
      analysis.skippedEvidenceSet = skippedEvidenceSet;
      analysis.evidenceAttemptErrors = evidenceResult?.evidenceAttemptErrors || [];
      failedAnalysis = analysis;
      const strictValidation = assertStrictTotalAssetAnalysis(analysis);
      failedAnalysis = null;

      patchTotalAssetKit({
        status: "generating",
        analysis,
        error: "",
        currentAssetType: "",
        currentAssetStartedAt: 0,
        ui: prepareTotalAssetPartForGeneration(state.totalAssetKit?.ui || createEmptyTotalAssetPart(), analysis.uiAnalysis || analysis),
        background: prepareTotalAssetPartForGeneration(state.totalAssetKit?.background || createEmptyTotalAssetPart(), analysis.backgroundAnalysis || analysis),
        character: prepareTotalAssetPartForGeneration(state.totalAssetKit?.character || createEmptyTotalAssetPart(), analysis.characterAnalysis || analysis)
      });
      syncUiAssetKitButtonState();
      renderDesignPromptSummary();
      renderUiAssetOutputIfActive();
      const pendingAssetTypes = getPendingTotalAssetTypesForRefresh(state.totalAssetKit);
      if (source === "manual") {
        $("#designStatus").textContent = pendingAssetTypes.length
          ? `参考图风格证据已通过校验：${strictValidation.evidence.length} 项，开始生成 ${pendingAssetTypes.map((meta) => meta.label).join("、")}`
          : "总资产已全部生成，无失败项需要重新生成";
      }

      const failures = [];
      const failureMap = new Map();
      const updatedAssetLabels = new Set();
      const runTotalAssetGenerationRound = async (assetTypes, retryAttempt = 0) => {
        const activeTypes = assetTypes.filter(Boolean);
        if (!activeTypes.length) return [];
        if (state.totalAssetKit?.requestId !== requestId) return [];
        throwIfAborted(cancelController.signal);
        const settled = await Promise.allSettled(activeTypes.map((meta) => generateTotalAssetPartWithRetryState({
          meta,
          analysis,
          referenceImages,
          referenceLabels,
          styleKeywords,
          styleTransferKeywords: buildTotalAssetRoleStyleTransferKeywords(analysis, meta.id),
          model,
          signal: cancelController.signal,
          retryAttempt,
          retryMax: TOTAL_ASSET_IMAGE_MAX_RETRIES
        })));
        if (state.totalAssetKit?.requestId !== requestId) return [];
        return settled.map((item, index) => {
          if (item.status === "fulfilled") return item.value;
          if (isAbortLikeError(item.reason)) throw item.reason;
          return {
            ok: false,
            meta: activeTypes[index],
            error: item.reason?.message || `${activeTypes[index].label}生成失败`
          };
        });
      };
      const applyTotalAssetRoundResults = (results) => {
        results.forEach((result) => {
          if (!result?.meta) return;
          if (!result.ok) {
            failureMap.set(result.meta.id, result.error);
          } else {
            failureMap.delete(result.meta.id);
            updatedAssetLabels.add(result.meta.label);
          }
        });
      };

      applyTotalAssetRoundResults(await runTotalAssetGenerationRound(pendingAssetTypes, 0));

      for (let retryAttempt = 1; retryAttempt <= TOTAL_ASSET_IMAGE_MAX_RETRIES; retryAttempt += 1) {
        const failedTypes = getFailedTotalAssetTypes(state.totalAssetKit);
        if (!failedTypes.length) break;
        applyTotalAssetRoundResults(await runTotalAssetGenerationRound(failedTypes, retryAttempt));
      }
      getFailedTotalAssetTypes(state.totalAssetKit).forEach((meta) => {
        const message = state.totalAssetKit?.[meta.id]?.error || `${meta.label}生成失败`;
        failureMap.set(meta.id, message);
      });
      failures.push(...Array.from(failureMap.entries()).map(([type, message]) => `${getTotalAssetPartMeta(type).label}：${message}`));

      const latestSourceSignature = getUiAssetKitSourceSignature(getStyleReferenceSelectionState(), getStylePromptText(), getSelectedDesignModel());
      const changedDuringGeneration = latestSourceSignature !== referenceSourceSignature;
      const readyTypes = getTotalAssetReadyTypes(state.totalAssetKit);
      const uiCoverageIncomplete = state.totalAssetKit?.ui?.status === "incomplete";
      const allAssetsReady = readyTypes.length === TOTAL_ASSET_TYPES.length;
      patchTotalAssetKit({
        status: uiCoverageIncomplete || !allAssetsReady ? "error" : "ready",
        requestId,
        referenceSignature: signature,
        referenceSourceSignature,
        referenceRequestInfo: requestInfo,
        styleKeywords,
        imageModel: model,
        analysis,
        updatedAt: Date.now(),
        currentAssetType: "",
        currentAssetStartedAt: 0,
        error: failures.join("；"),
        dirty: changedDuringGeneration,
        dirtyReason: changedDuringGeneration ? "参考图、关键词、主要界面清单、对应交互章节或模型在生成期间已变化" : ""
      });
      if (updatedAssetLabels.size) {
        unlockDesignDraftsForTotalAssetChange(`${Array.from(updatedAssetLabels).join("、")}已更新，已有设计稿需重新生成后才会使用最新总资产。`);
      }

      if (source === "manual") {
        $("#designStatus").textContent = uiCoverageIncomplete
          ? state.totalAssetKit?.ui?.error || "UI资产图缺少交互案必需组件，请重新生成总资产"
          : allAssetsReady
            ? "总资产已生成，已有设计稿不会自动刷新"
            : `总资产生成未完成：${failures.join("；") || "部分子资产失败"}`;
      }
      persistLockedTotalAssetIfNeeded();
      renderDesignPromptSummary();
      renderUiAssetOutputIfActive();
      return state.totalAssetKit;
    } catch (error) {
      const message = isClientAbortError(error)
        ? "已取消分析，未生成总资产"
        : error?.message || "总资产生成失败";
      const analysisFromError = error?.analysis || failedAnalysis || state.totalAssetKit?.analysis || null;
      if (state.totalAssetKit?.requestId !== requestId) return state.totalAssetKit;
      if (previousKit && preserveFreshAssets) {
        const restoredAnalysis = clearUiAssetCoverageFromAnalysis(analysisFromError || previousKit.analysis);
        const restoredUi = {
          ...(previousKit.ui || createEmptyTotalAssetPart()),
          uiAssetCoverage: null,
          error: previousKit.ui?.status === "incomplete" ? "" : previousKit.ui?.error || ""
        };
        if (restoredUi.status === "incomplete" && restoredUi.imageUrl) {
          restoredUi.status = "ready";
        }
        state.totalAssetKit = {
          ...previousKit,
          currentAssetType: "",
          currentAssetStartedAt: 0,
          dirty: true,
          dirtyReason: `刷新失败：${message}`,
          analysis: restoredAnalysis,
          error: message,
          ui: restoredUi
        };
        syncLegacyUiAssetKit();
        syncTotalAssetBusyRenderTimer();
        persistLockedTotalAssetIfNeeded();
      } else {
        patchTotalAssetKit({
          status: "error",
          requestId,
          referenceSignature: signature,
          referenceSourceSignature,
          referenceRequestInfo: requestInfo,
          styleKeywords,
          imageModel: model,
          analysis: analysisFromError,
          updatedAt: 0,
          currentAssetType: "",
          currentAssetStartedAt: 0,
          error: message,
          dirty: false,
          dirtyReason: "",
          ui: { ...createEmptyTotalAssetPart(), status: "error", analysis: analysisFromError?.uiAnalysis || analysisFromError, error: message, uiAssetCoverage: null },
          background: { ...createEmptyTotalAssetPart(), status: "error", analysis: analysisFromError?.backgroundAnalysis || analysisFromError, error: message },
          character: { ...createEmptyTotalAssetPart(), status: "error", analysis: analysisFromError?.characterAnalysis || analysisFromError, error: message }
        });
      }
      $("#designStatus").textContent = message;
      renderDesignPromptSummary();
      renderUiAssetOutputIfActive();
      return state.totalAssetKit;
    } finally {
      if (state.totalAssetKit?.requestId === requestId) {
        state.totalAssetKitPromise = null;
        state.uiAssetKitPromise = null;
      }
      syncUiAssetKitButtonState();
      renderDesignTabs();
      renderUiAssetOutputIfActive();
      if (state.totalAssetKit?.requestId === requestId) {
        state.totalAssetCancelController = null;
      }
    }
  })();
  state.uiAssetKitPromise = state.totalAssetKitPromise;
  return state.totalAssetKitPromise;
}

async function generateReferenceEvidenceWithApi({ referenceImages, imageSummaries, referenceLabels, referenceSignature = "", userKeywords, screen, onProgress, signal } = {}) {
  if (window.location.protocol === "file:") {
    throw new Error("请通过本地服务或部署地址访问后再分析参考图证据");
  }
  const images = Array.isArray(referenceImages) ? referenceImages : [];
  const labels = Array.isArray(referenceLabels) ? referenceLabels : [];
  const summaries = Array.isArray(imageSummaries) ? imageSummaries : [];
  const entries = new Array(images.length);
  const bestEntries = new Array(images.length);
  const attemptErrors = [];
  const progress = images.map((_, index) => ({
    index: index + 1,
    label: labels[index] || summaries[index]?.label || `图${index + 1}`,
    status: "queued",
    model: "",
    error: "",
    summary: "",
    attempts: [],
    referenceSignature
  }));

  const publishProgress = (index, patch = {}) => {
    progress[index] = {
      ...(progress[index] || { index: index + 1, label: `图${index + 1}` }),
      ...patch,
      index: index + 1,
      attempts: normalizeEvidenceAttemptItems(patch.attempts || progress[index]?.attempts),
      referenceSignature
    };
    const progressSnapshot = progress.map((item) => ({ ...item }));
    patchTotalAssetKit({
      evidenceProgress: progressSnapshot,
      analysis: {
        ...(state.totalAssetKit?.analysis || {}),
        referenceSignature,
        referenceImageCount: images.length,
        evidenceProgress: progressSnapshot
      }
    });
    onProgress?.({
      ...progress[index],
      index,
      total: images.length,
      progress: progressSnapshot
    });
  };

  const buildPayload = (index, model) => {
    const label = labels[index] || summaries[index]?.label || `图${index + 1}`;
    return {
      task: "reference-evidence-analysis",
      model,
      projectName: state.gameName || gameName.value || detectGameName(briefText.value.trim()) || "未命名小游戏",
      platform: getPlatformText($("#platform").value),
      referenceLabel: label,
      referenceIndex: index + 1,
      imageSummary: summaries[index] || null,
      referenceImages: [images[index]]
    };
  };

  const runSingleEvidenceAttempt = async (index, model, phaseStatus) => {
    throwIfAborted(signal);
    const label = labels[index] || summaries[index]?.label || `图${index + 1}`;
    const previousError = normalizeSummaryText(progress[index]?.error || "");
    const retryReason = phaseStatus === "retrying"
      ? (previousError
        ? `${isRetryableReferenceEvidenceServiceError(previousError) ? "上一轮模型请求失败，正在换模型重试" : "上一轮证据不足，正在换模型复核"}：${previousError}`
        : "上一轮未通过，正在换模型重试")
      : "";
    publishProgress(index, { label, status: phaseStatus, model, error: retryReason, summary: "" });
    try {
      const { response, data } = await fetchJsonWithClientTimeout("/api/generate-plan", buildPayload(index, model), {
        signal,
        timeoutMs: REFERENCE_EVIDENCE_TIMEOUT_MS,
        timeoutMessage: `${label} · ${model} 参考图取证超过 120 秒`
      });
      if (!response.ok) {
        throw new Error(data.error || `参考图证据分析失败：${response.status}`);
      }
      const parsed = normalizeReferenceEvidenceAnalysis(data.content || data.plan || data.analysis || "", {
        label,
        index,
        imageSummary: summaries[index] || null,
        model
      });
      if (!parsed) {
        throw new Error(`参考图证据分析未返回有效 JSON（${label}，模型 ${model}）`);
      }
      const validation = validateReferenceEvidenceEntry(parsed);
      if (!bestEntries[index] || validation.score > bestEntries[index].score) {
        bestEntries[index] = { entry: parsed, score: validation.score, validation };
      }
      if (validation.ok) {
        entries[index] = parsed;
        publishProgress(index, {
          label,
          status: "complete",
          model,
          error: "",
          summary: summarizeReferenceEvidenceEntry(parsed),
          attempts: [
            ...normalizeEvidenceAttemptItems(progress[index]?.attempts),
            { model, status: "complete", summary: summarizeReferenceEvidenceEntry(parsed) }
          ]
        });
        return { ok: true, entry: parsed, validation, model };
      }
      const message = `${label} · ${model} 证据不足：${validation.missing.join("；")}`;
      attemptErrors.push(message);
      publishProgress(index, {
        label,
        status: "insufficient",
        model,
        error: validation.missing.join("；"),
        attempts: [
          ...normalizeEvidenceAttemptItems(progress[index]?.attempts),
          { model, status: "insufficient", error: validation.missing.join("；") }
        ]
      });
      return { ok: false, entry: parsed, validation, model, error: new Error(message), status: "insufficient" };
    } catch (error) {
      if (isClientAbortError(error) && !isClientTimeoutError(error)) throw error;
      const message = error?.message || "参考图证据分析失败";
      const retryableServiceError = isRetryableReferenceEvidenceServiceError(message) || isClientTimeoutError(error);
      const status = retryableServiceError ? "model_failed" : "failed";
      attemptErrors.push(`${label} · ${model}: ${message}`);
      const progressMessage = retryableServiceError
        ? `模型请求失败，正在换模型重试：${message}`
        : message;
      publishProgress(index, {
        label,
        status,
        model,
        error: progressMessage,
        attempts: [
          ...normalizeEvidenceAttemptItems(progress[index]?.attempts),
          { model, status, error: message }
        ]
      });
      return { ok: false, entry: null, validation: null, model, error, status, retryableServiceError };
    }
  };

  const primaryModel = getPrimaryReferenceEvidenceAnalysisModel();
  progress.forEach((item, index) => publishProgress(index, {
    label: item.label,
    status: "analyzing",
    model: primaryModel,
    error: "",
    summary: ""
  }));
  const firstRound = await Promise.allSettled(images.map((_, index) => runSingleEvidenceAttempt(index, primaryModel, "analyzing")));
  const retryIndexes = [];
  firstRound.forEach((result, index) => {
    if (result.status === "rejected") {
      if (isClientAbortError(result.reason)) throw result.reason;
      retryIndexes.push(index);
      return;
    }
    if (!result.value?.ok) retryIndexes.push(index);
  });

  let pendingRetryIndexes = retryIndexes.filter((index) => !entries[index]);
  for (const retryModel of getReferenceEvidenceRetryModels()) {
    if (!pendingRetryIndexes.length) break;
    throwIfAborted(signal);
    const roundIndexes = [...pendingRetryIndexes];
    const retryRound = await Promise.allSettled(
      roundIndexes.map((index) => runSingleEvidenceAttempt(index, retryModel, "retrying"))
    );
    const nextPending = [];
    retryRound.forEach((result, roundIndex) => {
      const imageIndex = roundIndexes[roundIndex];
      if (result.status === "rejected") {
        if (isClientAbortError(result.reason)) throw result.reason;
        nextPending.push(imageIndex);
        return;
      }
      if (!result.value?.ok) nextPending.push(imageIndex);
    });
    pendingRetryIndexes = nextPending;
  }

  const skippedEvidenceSet = [];
  for (let index = 0; index < images.length; index += 1) {
    if (entries[index]) continue;
    const label = labels[index] || summaries[index]?.label || `图${index + 1}`;
    const best = bestEntries[index]?.entry || null;
    const validation = best ? validateReferenceEvidenceEntry(best) : null;
    const message = progress[index]?.error || validation?.missing?.join("；") || "参考图证据分析失败";
    const attempts = normalizeEvidenceAttemptItems(progress[index]?.attempts);
    const serviceFailed = isRetryableReferenceEvidenceServiceError(message)
      || attempts.some((item) => item.status === "model_failed" || isRetryableReferenceEvidenceServiceError(item.error));
    const skippedEntry = best || createFailedReferenceEvidenceEntry({ label, index, imageSummary: summaries[index], error: message, serviceFailed });
    skippedEvidenceSet.push({
      ...skippedEntry,
      label,
      index: index + 1,
      analysisStatus: serviceFailed ? "service_failed" : "skipped",
      skipped: true,
      skipReason: message,
      originalAnalysisStatus: skippedEntry.analysisStatus || progress[index]?.status || "insufficient",
      serviceFailed,
      attempts,
      missingEvidence: [...new Set([...normalizeAnalysisList(skippedEntry.missingEvidence), message].filter(Boolean))]
    });
    const previousStatus = progress[index]?.status || "";
    const status = ["model_failed", "timeout", "failed"].includes(previousStatus) ? previousStatus : serviceFailed ? "model_failed" : "skipped";
    publishProgress(index, {
      label,
      status,
      model: progress[index]?.model || "",
      error: message,
      attempts,
      summary: ""
    });
  }

  const usableEvidenceSet = entries.filter(Boolean);
  const minimumUsableCount = getMinimumUsableReferenceEvidenceCount(images.length);
  const serviceFailureReasons = skippedEvidenceSet
    .filter((item) => item.serviceFailed || isRetryableReferenceEvidenceServiceError(item.skipReason || normalizeSummaryText(item.missingEvidence)))
    .map((item) => `${item.label || `图${item.index || "?"}`}：模型/服务请求失败（${formatReferenceEvidenceAttemptsForReason(item.attempts) || item.skipReason || normalizeSummaryText(item.missingEvidence)}）`);
  const evidenceInsufficientReasons = skippedEvidenceSet
    .filter((item) => !(item.serviceFailed || isRetryableReferenceEvidenceServiceError(item.skipReason || normalizeSummaryText(item.missingEvidence))))
    .map((item) => `${item.label || `图${item.index || "?"}`}：证据不足（${item.skipReason || normalizeSummaryText(item.missingEvidence) || "参考图可见证据不足"}）`);
  const skippedReasons = [
    ...serviceFailureReasons,
    ...evidenceInsufficientReasons
  ]
    .filter(Boolean);
  if (usableEvidenceSet.length < minimumUsableCount) {
    const missing = [
      `有效参考图 ${usableEvidenceSet.length}/${images.length}，未达到 ${minimumUsableCount}/${images.length}，已停止生成`,
      ...skippedReasons
    ];
    const error = new Error(`${missing.join("；")}。已停止生成总资产；不会使用默认风格兜底。`);
    error.analysis = {
      analysisStatus: serviceFailureReasons.length ? "service_failed" : "insufficient",
      referenceSignature,
      referenceImageCount: usableEvidenceSet.length,
      originalReferenceImageCount: images.length,
      referenceEvidenceSet: usableEvidenceSet,
      usableEvidenceSet,
      skippedEvidenceSet,
      missingEvidence: missing,
      evidenceAttemptErrors: attemptErrors,
      evidenceProgress: progress.map((item) => ({ ...item }))
    };
    throw error;
  }
  return {
    referenceEvidenceSet: usableEvidenceSet,
    usableEvidenceSet,
    skippedEvidenceSet,
    referenceImageCount: usableEvidenceSet.length,
    originalReferenceImageCount: images.length,
    evidenceAttemptErrors: attemptErrors,
    evidenceProgress: progress.map((item) => ({ ...item }))
  };
}

function getReferenceEvidenceAnalysisModels() {
  return [...new Set([getPrimaryReferenceEvidenceAnalysisModel(), ...getReferenceEvidenceRetryModels()].filter(Boolean))];
}

function getPrimaryReferenceEvidenceAnalysisModel() {
  return getUiAssetAnalysisModel();
}

function getReferenceEvidenceRetryModels() {
  return [...new Set(["gpt-5.4", "kimi-k2-thinking", "gemini-2.5-pro"].filter(Boolean))];
}

function isRetryableReferenceEvidenceServiceError(error = "") {
  const text = String(error?.message || error || "");
  return /LLM_S_002|500|502|503|504|timeout|timed out|超时|request failed|请求失败|network|Failed to fetch|Babylon text request failed|Babylon request failed|Gemini 请求失败|returned empty content/i.test(text);
}

function formatReferenceEvidenceAttemptsForReason(attempts = []) {
  return normalizeEvidenceAttemptItems(attempts)
    .map((item) => {
      const status = getEvidenceProgressLabel(item.status);
      const detail = item.error || item.summary || "";
      return `${item.model || "未知模型"} ${status}${detail ? `：${detail}` : ""}`;
    })
    .join("；");
}

function summarizeReferenceEvidenceEntry(entry) {
  const colors = collectHexColorsFromSpec(entry?.paletteAndRatio).slice(0, 4).join(" / ");
  const keywords = normalizeSummaryText(entry?.styleKeywords).slice(0, 80);
  const material = formatStructuredSpecValue(entry?.materialAndStroke).slice(0, 80);
  const shape = formatStructuredSpecValue(entry?.shapeAndOrnament).slice(0, 80);
  return [colors ? `色彩 ${colors}` : "", keywords, material, shape].filter(Boolean).join("；").slice(0, 180);
}

function normalizeReferenceEvidenceAnalysis(raw, { label = "", index = 0, imageSummary = null, model = "" } = {}) {
  const parsedRaw = typeof raw === "string" ? parseJsonObjectFromText(raw) : raw;
  if (!parsedRaw || typeof parsedRaw !== "object") return null;
  const source = Array.isArray(parsedRaw.referenceEvidenceSet)
    ? (parsedRaw.referenceEvidenceSet[0] || parsedRaw)
    : parsedRaw.referenceEvidence && typeof parsedRaw.referenceEvidence === "object"
      ? { ...parsedRaw, ...parsedRaw.referenceEvidence }
      : parsedRaw;
  const normalized = {
    label: cleanAnalysisText(source.label || source.referenceLabel || label || `图${index + 1}`),
    index: Number(source.index || source.referenceIndex || index + 1),
    model: cleanAnalysisText(source.model || model || ""),
    analysisStatus: cleanAnalysisText(source.analysisStatus || source.status || ""),
    skipped: Boolean(source.skipped),
    skipReason: cleanAnalysisText(source.skipReason || source.skip_reason || source.reason || ""),
    originalAnalysisStatus: cleanAnalysisText(source.originalAnalysisStatus || source.originalStatus || ""),
    missingEvidence: normalizeAnalysisList(source.missingEvidence || source.missing || source.missingFields),
    styleKeywords: normalizeAnalysisList(source.styleKeywords || source.keywords),
    paletteAndRatio: source.paletteAndRatio || source.palette || source.colorEvidence || source.colors || [],
    materialAndStroke: source.materialAndStroke || source.materialEvidence || source.strokeEvidence || [],
    shapeAndOrnament: source.shapeAndOrnament || source.shapeEvidence || source.ornamentEvidence || [],
    lightingAndRendering: source.lightingAndRendering || source.lightingEvidence || source.renderingEvidence || [],
    uiEvidence: source.uiEvidence || source.ui || source.buttonEvidence || [],
    backgroundEvidence: source.backgroundEvidence || source.background || [],
    characterEvidence: source.characterEvidence || source.character || [],
    transferableRules: source.transferableRules || source.transferRules || source.rules || [],
    copyAvoidance: source.copyAvoidance || source.avoid || source.boundaries || [],
    localImageSummary: imageSummary || source.localImageSummary || null,
    attempts: normalizeEvidenceAttemptItems(source.attempts),
    raw: parsedRaw
  };
  return isMeaningfulSpecValue(normalized) ? normalized : null;
}

function createFailedReferenceEvidenceEntry({ label, index, imageSummary, error, serviceFailed = false }) {
  return {
    label: label || `图${(index || 0) + 1}`,
    index: (index || 0) + 1,
    analysisStatus: serviceFailed ? "service_failed" : "insufficient",
    missingEvidence: [error || "参考图证据分析失败"],
    paletteAndRatio: [],
    materialAndStroke: [],
    shapeAndOrnament: [],
    lightingAndRendering: [],
    uiEvidence: [],
    backgroundEvidence: [],
    characterEvidence: [],
    localImageSummary: imageSummary || null
  };
}

function validateReferenceEvidenceEntry(entry) {
  const missing = [];
  const paletteText = formatStructuredSpecValue(entry?.paletteAndRatio);
  const materialText = formatStructuredSpecValue(entry?.materialAndStroke);
  const shapeText = formatStructuredSpecValue(entry?.shapeAndOrnament);
  const lightingText = formatStructuredSpecValue(entry?.lightingAndRendering);
  const uiText = formatStructuredSpecValue(entry?.uiEvidence);
  const backgroundText = formatStructuredSpecValue(entry?.backgroundEvidence);
  const characterText = formatStructuredSpecValue(entry?.characterEvidence);
  const colors = collectHexColorsFromSpec(entry?.paletteAndRatio);
  const buckets = [
    hasConcreteStyleText(paletteText, 45) && colors.length >= 1,
    hasConcreteStyleText(materialText, 45),
    hasConcreteStyleText(shapeText, 45),
    hasConcreteStyleText(lightingText, 45)
  ];
  if (/insufficient|不足/i.test(entry?.analysisStatus || "") && normalizeSummaryText(entry?.missingEvidence)) {
    missing.push(`模型声明证据不足：${normalizeSummaryText(entry.missingEvidence).slice(0, 120)}`);
  }
  if (!buckets[0]) missing.push("色彩 HEX/比例证据不足");
  if (!buckets[1]) missing.push("材质或描边证据不足");
  if (!buckets[2]) missing.push("圆角、角饰或点线面证据不足");
  if (!buckets[3]) missing.push("光源或渲染方式证据不足");
  if (!hasConcreteStyleText(joinSpecSummary([uiText, backgroundText, characterText]), 70)) {
    missing.push("UI/背景/角色可迁移证据不足");
  }
  return {
    ok: missing.length === 0,
    missing,
    score: buckets.filter(Boolean).length
      + (hasConcreteStyleText(uiText, 30) ? 1 : 0)
      + (hasConcreteStyleText(backgroundText, 30) ? 1 : 0)
      + (hasConcreteStyleText(characterText, 30) ? 1 : 0)
  };
}

function normalizeReferenceEvidenceSet(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => normalizeReferenceEvidenceAnalysis(item, {
      label: item?.label || item?.referenceLabel || `图${index + 1}`,
      index,
      imageSummary: item?.localImageSummary || null,
      model: item?.model || ""
    }))
    .filter(Boolean);
}

function collectTotalAssetEvidenceLines(entries, field, limit = 18) {
  return entries
    .flatMap((entry) => {
      const value = entry?.[field];
      const items = Array.isArray(value) ? value : [value];
      return items.map((item) => {
        const text = formatStructuredSpecValue(item);
        return text ? `${entry.label || `图${entry.index || "?"}`}：${text}` : "";
      });
    })
    .map(cleanAnalysisText)
    .filter(Boolean)
    .filter((line) => !isLikelySchemaKeyOnlySummary(line))
    .slice(0, limit);
}

function filterEvidenceLines(lines, pattern, fallbackCount = 6) {
  const matched = lines.filter((line) => pattern.test(line));
  return (matched.length ? matched : lines).slice(0, fallbackCount);
}

function buildColorSystemFromEvidence(entries) {
  const paletteLines = collectTotalAssetEvidenceLines(entries, "paletteAndRatio", 24);
  const colors = [...new Set(paletteLines.flatMap((line) => collectHexColorsFromSpec(line)))];
  const makeEntry = (hex, index) => ({
    hex,
    usage: paletteLines.find((line) => line.includes(hex)) || paletteLines[index] || "来自逐图参考图色彩证据",
    ratio: "使用比例以逐图证据中的 approxRatio / usage 为准"
  });
  return {
    primary: colors.slice(0, 2).map(makeEntry),
    secondary: colors.slice(2, 5).map(makeEntry),
    background: colors.slice(5, 7).map(makeEntry),
    highlight: colors.slice(0, 4).map(makeEntry),
    shadow: colors.slice(-3).map(makeEntry),
    functional: [],
    rarity: [],
    colorMood: paletteLines.join("；").slice(0, 420)
  };
}

function buildTotalAssetImagePromptsFromEvidence({ projectName, projectContext, mergedStyleEvidence, colorSystem }) {
  const styleDigest = [
    ...normalizeSummaryTextList(mergedStyleEvidence.paletteAndRatio),
    ...normalizeSummaryTextList(mergedStyleEvidence.materialAndStroke),
    ...normalizeSummaryTextList(mergedStyleEvidence.shapeAndOrnament),
    ...normalizeSummaryTextList(mergedStyleEvidence.lightingAndRendering)
  ].join("; ").slice(0, 1200);
  const characterStyleDigest = removeReferenceCharacterObjectSegments(styleDigest, 1200);
  const worldAndThemeAnchor = formatWorldAndThemeForImagePrompt(2200);
  const backgroundDemand = normalizeSummaryText(projectContext.assetDemandSummary?.background).slice(0, 700);
  const characterDemand = normalizeSummaryText(projectContext.assetDemandSummary?.character).slice(0, 700);
  const hex = collectHexColorsFromSpec(colorSystem).slice(0, 8).join(", ");
  const characterPaletteAnchor = buildTotalAssetColorAnchorForPrompt({
    colorSystem,
    mergedStyleEvidence,
    referenceEvidence: { paletteAndRatio: mergedStyleEvidence.paletteAndRatio }
  }, "character", 1000);
  return {
    ui: `Create a transparent-background universal game UI control style library for ${projectName}. Use only these reference-derived visual fingerprints: ${styleDigest}. Palette anchors: ${hex}. Do not extract a hard-minimum component list from the interaction plan at this stage. Generate the fixed A-H universal control taxonomy: ${formatUniversalUiAssetTaxonomyForPrompt()}. Each control must have a tiny English label in the exact format "Control Name - function label", for example "Back Button - go back" and "Resource Token - show currency"; labels must not be copied into later screen designs. The sheet defines reusable style, material, stroke, corner, shadow, highlight, icon rendering and state language only; specific screen functions will be mapped later during normal screen generation.`,
    background: `Create a no-UI background style board for ${projectName}. Use only these reference-derived visual fingerprints: ${styleDigest}. Palette anchors: ${hex}. Background demand from the target screen list and matching interaction sections: ${backgroundDemand || "No explicit background/scene/safe-area demand was found in the selected target screens or matching interaction sections; do not infer extra gameplay spaces."}. Build new scenes only when required by the selected target screens, preserve documented UI safe zones and role stand zones, and do not copy reference scenes, logos, text or characters.`,
    character: `Create a transparent-background character, pet or NPC style board for ${projectName}. Reference images only provide low-level style; content must come from planning document and project requirements. World and theme content anchor: ${worldAndThemeAnchor}. ${characterPaletteAnchor}. Use only these reference-derived low-level visual fingerprints: ${characterStyleDigest}. If concrete reference objects appear in style analysis, read them only as evidence for material, edge rhythm, layering, color accents and ornament density; never generate the same object or costume structure unless the planning document explicitly requires it. Palette anchors: ${hex}. Character demand from the target screen list and matching interaction sections: ${characterDemand || "only define transferable character rendering rules when character evidence is visible in the references"}. Character identity, clothing direction, props, faction, occupation and temperament must come from the planning document's World and Theme section. Do not copy any reference character, logo, exact outfit, feathers/羽毛, feather ornaments/羽饰, staff/法杖, cloak/cape/披风, weapon/武器, armor/盔甲, badge/徽章, pendant/吊坠, accessories/饰品, symbol or exact silhouette. If the planning document does not explicitly mention those objects, they are forbidden even when visible in the reference.`
  };
}

function buildTotalAssetAnalysisFromEvidence({ imageSummaries, referenceEvidenceSet, skippedEvidenceSet = [], originalReferenceImageCount = 0, userKeywords, projectContext, expectedReferenceCount = 0, evidenceProgress = [], referenceSignature = "" } = {}) {
  const entries = normalizeReferenceEvidenceSet(referenceEvidenceSet);
  const skippedEntries = normalizeReferenceEvidenceSet(skippedEvidenceSet);
  const context = projectContext || buildTotalAssetProjectContext();
  const expectedCount = Math.max(Number(expectedReferenceCount || 0), entries.length);
  const originalCount = Math.max(Number(originalReferenceImageCount || 0), expectedCount, entries.length + skippedEntries.length);
  const normalizedProgress = normalizeEvidenceProgressItems(evidenceProgress);
  const progressSnapshot = normalizedProgress.length
    ? normalizedProgress
    : buildEvidenceProgressFromReferenceEvidenceSet(entries, {
      expectedCount,
      referenceSignature
    });
  const requiredUiAssetComponents = getUniversalUiAssetComponents();
  const projectName = state.gameName || gameName.value || "未命名小游戏";
  const paletteLines = collectTotalAssetEvidenceLines(entries, "paletteAndRatio", 24);
  const materialLines = collectTotalAssetEvidenceLines(entries, "materialAndStroke", 24);
  const shapeLines = collectTotalAssetEvidenceLines(entries, "shapeAndOrnament", 24);
  const lightingLines = collectTotalAssetEvidenceLines(entries, "lightingAndRendering", 24);
  const uiLines = collectTotalAssetEvidenceLines(entries, "uiEvidence", 24);
  const backgroundLines = collectTotalAssetEvidenceLines(entries, "backgroundEvidence", 18);
  const characterLines = collectTotalAssetEvidenceLines(entries, "characterEvidence", 18);
  const transferableLines = collectTotalAssetEvidenceLines(entries, "transferableRules", 18);
  const copyAvoidanceLines = collectTotalAssetEvidenceLines(entries, "copyAvoidance", 12);
  const mergedStyleEvidence = {
    paletteAndRatio: paletteLines,
    materialAndStroke: materialLines,
    shapeAndOrnament: shapeLines,
    lightingAndRendering: lightingLines,
    uiEvidence: uiLines,
    backgroundEvidence: backgroundLines,
    characterEvidence: characterLines,
    transferableRules: transferableLines
  };
  const colorSystem = buildColorSystemFromEvidence(entries);
  const buttonEvidence = filterEvidenceLines([...uiLines, ...shapeLines, ...materialLines], /按钮|button|Tab|tab|页签|关闭|标签|icon|图标|状态|selected|reward|hover|pressed/i, 10);
  const panelEvidence = filterEvidenceLines([...uiLines, ...materialLines, ...shapeLines], /面板|panel|弹窗|modal|卡片|card|底板|容器|边框|描边|9-slice/i, 10);
  const iconEvidence = filterEvidenceLines([...uiLines, ...shapeLines, ...materialLines], /图标|icon|道具|资源|头像|格|slot|resource|badge|角标/i, 10);
  const backgroundEvidence = filterEvidenceLines([...backgroundLines, ...materialLines, ...lightingLines], /背景|场景|空间|景|安全区|站位|焦点|材质|光|阴影|透视|远景|中景|前景/i, 10);
  const characterEvidence = filterEvidenceLines([...characterLines, ...materialLines, ...lightingLines], /角色|人物|宠物|NPC|头像|立绘|比例|轮廓|脸|材质|渲染|姿态|线条|表情|光影|描边/i, 16)
    .map((line) => removeReferenceCharacterObjectSegments(line, 320))
    .filter(Boolean)
    .slice(0, 10);
  const sharedFoundationText = joinSpecSummary([...paletteLines, ...materialLines, ...shapeLines, ...lightingLines]);
  const uiControlText = joinSpecSummary([...uiLines, ...buttonEvidence, ...panelEvidence, ...iconEvidence]);
  const hasSharedVisualDna = hasConcreteStyleText(sharedFoundationText, 220)
    && collectHexColorsFromSpec(paletteLines).length >= 2
    && hasConcreteStyleText(joinSpecSummary(materialLines), 55)
    && hasConcreteStyleText(joinSpecSummary(shapeLines), 55)
    && hasConcreteStyleText(joinSpecSummary(lightingLines), 55);
  const canExtrapolateUiControls = hasSharedVisualDna && hasConcreteStyleText(joinSpecSummary([...uiLines, ...buttonEvidence, ...panelEvidence, ...iconEvidence, ...materialLines, ...shapeLines]), 140);
  const directTransferTargets = [
    uiLines.length ? "UI控件：直接迁移逐图 uiEvidence 中的按钮、面板、图标、状态和布局材质证据" : "",
    backgroundLines.length ? "背景：直接迁移逐图 backgroundEvidence 中的空间、材质、焦点和安全区证据" : "",
    characterLines.length ? "角色：仅迁移逐图 characterEvidence 中的抽象比例、轮廓复杂度、材质/线条/渲染方式，不迁移服装、装备、羽毛、法杖、披风等具体物品" : ""
  ].filter(Boolean);
  const styleExtrapolationRules = [];
  const extrapolatedTargets = [];
  const missingExactComponentReference = [];
  const addStyleExtrapolationRule = (target, directEvidence, extrapolationRule) => {
    if (!directEvidence || !extrapolationRule) return;
    styleExtrapolationRules.push({
      target,
      directEvidence: directEvidence.slice(0, 520),
      extrapolationRule
    });
    extrapolatedTargets.push(target);
    missingExactComponentReference.push(target);
  };
  const addUiControlExtrapolationRule = (target, pattern, extrapolationRule) => {
    if (pattern.test(uiControlText) || !canExtrapolateUiControls) return;
    addStyleExtrapolationRule(
      target,
      joinSpecSummary([...buttonEvidence, ...panelEvidence, ...iconEvidence, ...materialLines, ...shapeLines, ...lightingLines]).slice(0, 700),
      extrapolationRule
    );
  };
  addUiControlExtrapolationRule(
    "关闭/返回/确认/领取按钮",
    /关闭|close|返回|back|确认|confirm|领取|claim/i,
    "按已观察按钮、面板边框、图标底板、圆角、描边层数、材质厚度和左上光源规则外推出同风格功能按钮，不复制参考图文字或图标"
  );
  addUiControlExtrapolationRule(
    "Tab/页签状态",
    /Tab|tab|页签|标签|selected|选中/i,
    "按已观察面板分层、按钮状态、高光边缘和描边规则外推默认/选中/禁用页签，不改变目标界面信息层级"
  );
  addUiControlExtrapolationRule(
    "图标按钮/资源图标底板",
    /图标按钮|icon button|图标底板|资源图标|resource icon|item slot|道具格/i,
    "按已观察图标底板、道具格、角标、边框和高光规则外推图标按钮容器，图标语义只来自目标界面需求"
  );
  if (!hasConcreteStyleText(joinSpecSummary(backgroundLines), 80) && hasSharedVisualDna) {
    addStyleExtrapolationRule(
      "背景设定图",
      sharedFoundationText.slice(0, 700),
      "背景题材只来自主要界面清单和对应交互章节；参考图只提供色彩、材质、光源、复杂度、焦点控制和 UI 安全区规则"
    );
  }
  if (!hasConcreteStyleText(joinSpecSummary(characterLines), 70) && hasSharedVisualDna) {
    addStyleExtrapolationRule(
      "角色设定图",
      sharedFoundationText.slice(0, 700),
      "角色题材只来自项目需求；参考图只提供轮廓复杂度、材质、描边、光影层级和渲染方式，不复制参考角色"
    );
  }
  const analysis = {
    analysisStatus: "complete",
    analysisSource: "local-evidence-synthesis",
    missingEvidence: [],
    missingVisualDNA: [],
    missingExactComponentReference,
    referenceSignature,
    referenceImageCount: expectedCount,
    originalReferenceImageCount: originalCount,
    referenceEvidenceSet: entries,
    usableEvidenceSet: entries,
    skippedEvidenceSet: skippedEntries,
    evidenceProgress: progressSnapshot,
    imageSummaries: Array.isArray(imageSummaries) ? imageSummaries : [],
    projectContext: context,
    mergedStyleEvidence,
    evidenceConflicts: [],
    styleExtrapolationRules,
    directTransferTargets,
    extrapolatedTargets,
    referenceEvidence: {
      paletteAndRatio: paletteLines,
      materialAndStroke: materialLines,
      shapeAndOrnament: shapeLines,
      lightingAndRendering: lightingLines,
      uiBackgroundCharacter: [...paletteLines, ...materialLines, ...lightingLines].slice(0, 18)
    },
    styleKeywords: entries.flatMap((entry) => normalizeAnalysisList(entry.styleKeywords)).slice(0, 20),
    styleDNA: {
      worldStyle: [...paletteLines, ...materialLines, ...lightingLines].slice(0, 3),
      mood: paletteLines.slice(0, 3),
      renderingMethod: lightingLines.slice(0, 4),
      complexity: shapeLines.slice(0, 4),
      visualSymbols: shapeLines.slice(0, 6),
      coreDescription: [...paletteLines, ...materialLines, ...lightingLines].join("；").slice(0, 600),
      keyVisualFeatures: [...materialLines, ...shapeLines, ...lightingLines].slice(0, 10),
      easyToDrift: copyAvoidanceLines
    },
    pointLinePlane: {
      pointElements: filterEvidenceLines(shapeLines, /点|高光|角标|粒子|徽章|提示|红点/i, 6),
      lineElements: filterEvidenceLines(shapeLines, /线|描边|边框|分割|轮廓|stroke|border/i, 6),
      planeElements: filterEvidenceLines(shapeLines, /面|面板|底板|卡片|容器|区域|panel|card/i, 6),
      summary: {
        pointRole: filterEvidenceLines(shapeLines, /点|高光|角标|粒子|徽章|提示|红点/i, 3).join("；"),
        lineRole: filterEvidenceLines(shapeLines, /线|描边|边框|分割|轮廓|stroke|border/i, 3).join("；"),
        planeRole: filterEvidenceLines(shapeLines, /面|面板|底板|卡片|容器|区域|panel|card/i, 3).join("；"),
        decorationVsInformation: shapeLines.slice(0, 6).join("；")
      }
    },
    shapeLanguage: {
      contour: shapeLines.slice(0, 6),
      cornerRules: filterEvidenceLines(shapeLines, /圆角|corner|切角|缺口|弧|角/i, 8),
      cutRules: filterEvidenceLines(shapeLines, /切|缺口|斜|弧|外扩|内嵌/i, 6),
      symmetry: shapeLines.slice(0, 4),
      ornaments: filterEvidenceLines(shapeLines, /装饰|角饰|纹|徽章|高光|点缀/i, 8),
      attachmentPositions: shapeLines.slice(0, 6),
      ratioNotes: filterEvidenceLines(shapeLines, /%|比例|ratio|px|高度|宽度|厚度/i, 8)
    },
    colorSystem,
    materialRules: {
      ui: [...materialLines, ...uiLines].slice(0, 14),
      background: [...materialLines, ...backgroundLines].slice(0, 12),
      character: [...materialLines, ...characterLines].slice(0, 12)
    },
    lightingHierarchy: {
      mainLightDirection: lightingLines.slice(0, 5).join("；"),
      shadowStrength: filterEvidenceLines(lightingLines, /阴影|shadow|投影|暗部/i, 6),
      glowRules: filterEvidenceLines(lightingLines, /发光|glow|高光|highlight|亮/i, 6),
      contrast: lightingLines.slice(0, 5).join("；"),
      layerRelationship: [...lightingLines, ...shapeLines].slice(0, 8),
      sharedLightRule: lightingLines.join("；").slice(0, 520)
    },
    buttonSpec: {
      primary: { structure: buttonEvidence, border: materialLines.slice(0, 5), face: paletteLines.slice(0, 5) },
      secondary: { structure: buttonEvidence, border: materialLines.slice(0, 5), face: paletteLines.slice(0, 5) },
      danger: { structure: buttonEvidence, border: materialLines.slice(0, 5), face: paletteLines.slice(0, 5) },
      small: { structure: buttonEvidence, border: materialLines.slice(0, 5), face: paletteLines.slice(0, 5) },
      icon: { structure: iconEvidence, border: materialLines.slice(0, 5), face: paletteLines.slice(0, 5) },
      close: { structure: buttonEvidence, border: materialLines.slice(0, 5), face: paletteLines.slice(0, 5) },
      tab: { structure: filterEvidenceLines(buttonEvidence, /Tab|tab|页签|标签|选中/i, 8), border: materialLines.slice(0, 5), face: paletteLines.slice(0, 5) },
      stateRules: {
        default: buttonEvidence.slice(0, 4).join("；"),
        hover: filterEvidenceLines(lightingLines, /高光|亮|glow|发光/i, 3).join("；"),
        pressed: filterEvidenceLines(materialLines, /阴影|压|暗|厚|层/i, 3).join("；"),
        selected: filterEvidenceLines(buttonEvidence, /选中|selected|高光|边框|标签/i, 4).join("；"),
        disabled: filterEvidenceLines(paletteLines, /灰|暗|低|shadow|disabled/i, 3).join("；"),
        locked: filterEvidenceLines(iconEvidence, /锁|locked|角标|图标/i, 3).join("；"),
        reward: filterEvidenceLines(iconEvidence, /奖励|reward|角标|徽章|高光/i, 3).join("；")
      }
    },
    panelModalSpec: {
      panel: { evidence: panelEvidence },
      modal: { evidence: panelEvidence },
      card: { evidence: panelEvidence },
      infoBox: { evidence: panelEvidence },
      nineSliceRules: panelEvidence
    },
    iconItemResourceSpec: {
      icons: { evidence: iconEvidence },
      itemSlots: { evidence: filterEvidenceLines(iconEvidence, /道具|格|slot|卡|头像/i, 8) },
      resourceBars: { evidence: filterEvidenceLines(iconEvidence, /资源|resource|货币|数值|栏/i, 8) }
    },
    typographySpec: {
      title: filterEvidenceLines(uiLines, /字体|文字|标题|数字|描边|阴影|typography|text/i, 8),
      safeArea: "生成资产图时保留文字区和数字区，不直接生成乱码文字"
    },
    backgroundSpec: {
      space: backgroundEvidence,
      perspective: backgroundEvidence,
      depth: backgroundEvidence,
      uiSafeAreas: context.assetDemandSummary?.background || [],
      material: [...materialLines, ...backgroundEvidence].slice(0, 10),
      focusControl: [...lightingLines, ...backgroundEvidence].slice(0, 10),
      sceneReplacementRule: "背景题材只来自主要界面清单和对应交互章节；参考图只提供画风证据"
    },
    characterSpec: {
      proportion: characterEvidence,
      faceStyle: characterEvidence,
      silhouette: characterEvidence,
      material: [...materialLines, ...characterEvidence].slice(0, 10),
      rendering: [...lightingLines, ...characterEvidence].slice(0, 10),
      pose: characterEvidence,
      effects: filterEvidenceLines(lightingLines, /发光|高光|特效|glow|highlight/i, 6)
    },
    unityRules: [
      ...transferableLines,
      "UI、背景、角色共享逐图证据中的色彩、材质、光源、描边、圆角和装饰节奏",
      "策划案主要界面清单和对应交互章节只决定资产需求，不决定参考图画风"
    ],
    designTokens: {
      colors: colorSystem,
      corner: filterEvidenceLines(shapeLines, /圆角|corner|角|切|缺口/i, 8),
      border: filterEvidenceLines([...materialLines, ...shapeLines], /描边|边框|stroke|border|厚度/i, 8),
      shadow: filterEvidenceLines(lightingLines, /阴影|shadow|投影|暗/i, 8),
      glow: filterEvidenceLines(lightingLines, /发光|glow|高光|亮/i, 8),
      material: materialLines.slice(0, 10),
      font: filterEvidenceLines(uiLines, /字体|文字|标题|数字|描边|阴影/i, 6),
      spacing: filterEvidenceLines(shapeLines, /留白|间距|密度|布局|层级|区域/i, 6)
    },
    assetRequirements: {
      ...(context.assetDemandSummary || {}),
      uiRequiredComponents: requiredUiAssetComponents
    },
    uiAnalysis: {
      evidence: [...buttonEvidence, ...panelEvidence, ...iconEvidence],
      assetDemand: context.assetDemandSummary?.ui || [],
      requiredUiAssetComponents
    },
    backgroundAnalysis: { evidence: backgroundEvidence, assetDemand: context.assetDemandSummary?.background || [] },
    characterAnalysis: { evidence: characterEvidence, assetDemand: context.assetDemandSummary?.character || [] },
    negativePrompts: [
      "modern flat app UI",
      "generic mobile app style",
      "generic golden fantasy UI",
      "generic cozy pet-simulator cream UI",
      "default rounded web cards",
      "photorealistic background",
      "inconsistent lighting",
      "mismatched color palette",
      "copied logo",
      "copied character",
      "unreadable text",
      "random letters",
      "changed gameplay layout",
      "changed interaction structure",
      "style suggestions from design document that conflict with reference images"
    ]
  };
  analysis.imagePrompts = buildTotalAssetImagePromptsFromEvidence({
    projectName,
    projectContext: context,
    mergedStyleEvidence,
    colorSystem
  });
  if (expectedCount && entries.length < expectedCount) {
    const returnedIndexes = new Set(entries.map((entry, index) => Number(entry.index || index + 1)));
    const missingLabels = Array.from({ length: expectedCount }, (_, index) => index + 1)
      .filter((index) => !returnedIndexes.has(index))
      .map((index) => `图${index}`);
    analysis.analysisStatus = "insufficient";
    analysis.missingEvidence.push(`逐图证据数量不足：期望 ${expectedCount} 张，实际 ${entries.length} 张；缺少 ${missingLabels.join("、") || "未知图号"}`);
  }
  const validation = validateStrictStyleEvidence(analysis);
  analysis.localValidationWarnings = validation.warnings || [];
  if (!validation.ok) {
    analysis.analysisStatus = "insufficient";
    analysis.localValidationMissing = validation.missing;
    analysis.missingVisualDNA = validation.missing;
  } else {
    analysis.localValidationMissing = [];
    analysis.missingVisualDNA = [];
  }
  return analysis;
}

async function generateTotalAssetAnalysisWithApi({ imageSummaries, referenceEvidenceSet, skippedEvidenceSet = [], originalReferenceImageCount = 0, userKeywords, styleTransferKeywords, screen, projectContext, signal }) {
  if (window.location.protocol === "file:") {
    throw new Error("请通过本地服务或部署地址访问后再生成总资产");
  }

  const evidenceSet = Array.isArray(referenceEvidenceSet) ? referenceEvidenceSet : [];
  const skippedSet = Array.isArray(skippedEvidenceSet) ? skippedEvidenceSet : [];
  const context = projectContext || buildTotalAssetProjectContext(screen);
  const referenceImageCount = evidenceSet.length || 0;
  const basePayload = {
    task: "total-asset-analysis",
    projectName: state.gameName || gameName.value || detectGameName(briefText.value.trim()) || "未命名小游戏",
    platform: getPlatformText($("#platform").value),
    styleKeywords: userKeywords,
    styleTransferKeywords,
    imageSummaries,
    referenceEvidenceSet: evidenceSet,
    skippedEvidenceSet: skippedSet,
    referenceImageCount,
    originalReferenceImageCount: Number(originalReferenceImageCount || referenceImageCount || skippedSet.length + referenceImageCount),
    currentScreen: context.currentScreen || null,
    targetScreens: context.targetScreens || [],
    targetScreenList: context.targetScreenList || "",
    screenInteractionSections: context.screenInteractionSections || [],
    assetDemandSummary: context.assetDemandSummary || {},
    projectAnchorPolicy: context.projectAnchorPolicy || [],
    missingInteractionSections: context.missingInteractionSections || []
  };

  let lastError = null;
  let lastAnalysis = null;
  const createFailureSnapshot = (message) => ({
    ...(state.totalAssetKit?.analysis || {}),
    analysisStatus: "failed",
    missingEvidence: [message].filter(Boolean),
    referenceImageCount,
    originalReferenceImageCount: Number(originalReferenceImageCount || referenceImageCount || skippedSet.length + referenceImageCount),
    referenceEvidenceSet: evidenceSet,
    skippedEvidenceSet: skippedSet,
    imageSummaries,
    evidenceProgress: state.totalAssetKit?.evidenceProgress || state.totalAssetKit?.analysis?.evidenceProgress || []
  });
  const startedAt = Date.now();
  for (const model of getTotalAssetAnalysisModels()) {
    throwIfAborted(signal);
    const remainingMs = TOTAL_ASSET_ANALYSIS_TIMEOUT_MS - (Date.now() - startedAt);
    if (remainingMs <= 0) {
      const error = createClientTimeoutError("综合总资产分析超过 180 秒，已停止生成总资产");
      error.analysis = lastAnalysis || createFailureSnapshot(error.message);
      throw error;
    }
    const requestPayload = { ...basePayload, model };
    try {
      const { response, data } = await fetchJsonWithClientTimeout("/api/generate-plan", requestPayload, {
        signal,
        timeoutMs: remainingMs,
        timeoutMessage: `综合总资产分析超过 180 秒（阶段：${model}）`
      });
      if (!response.ok) {
        throw new Error(data.error || `总资产分析失败：${response.status}`);
      }
      const content = data.content || data.plan || "";
      let parsed = normalizeTotalAssetAnalysis(content);
      if (!parsed) {
        parsed = await repairTotalAssetAnalysisJsonWithApi(content, requestPayload, model, {
          signal,
          timeoutMs: Math.max(1, TOTAL_ASSET_ANALYSIS_TIMEOUT_MS - (Date.now() - startedAt))
        });
      }
      if (!parsed) {
        const excerpt = getTextExcerpt(content);
        throw new Error(`总资产分析未返回有效 JSON（模型：${model}${excerpt ? `，返回：${excerpt}` : ""}）`);
      }
      if (!normalizeReferenceEvidenceSet(parsed.referenceEvidenceSet).length && Array.isArray(referenceEvidenceSet) && referenceEvidenceSet.length) {
        parsed.referenceEvidenceSet = referenceEvidenceSet;
      }
      if (!Array.isArray(parsed.evidenceProgress) || !parsed.evidenceProgress.length) {
        parsed.evidenceProgress = state.totalAssetKit?.evidenceProgress || [];
      }
      parsed.referenceImageCount ||= referenceImageCount;
      parsed.projectContext = {
        ...context,
        ...(parsed.projectContext || {}),
        projectAnchorPolicy: normalizeProjectLayoutAnchors(parsed.projectContext?.projectAnchorPolicy || context.projectAnchorPolicy || [])
      };
      parsed.assetRequirements = {
        ...(context.assetDemandSummary || {}),
        ...(parsed.assetRequirements || {}),
        uiRequiredComponents: normalizeRequiredUiAssetComponents(parsed.assetRequirements?.uiRequiredComponents || context.assetDemandSummary?.uiRequiredComponents || [])
      };
      if (parsed.uiAnalysis && typeof parsed.uiAnalysis === "object") {
        parsed.uiAnalysis.requiredUiAssetComponents = normalizeRequiredUiAssetComponents(parsed.uiAnalysis.requiredUiAssetComponents || parsed.assetRequirements.uiRequiredComponents);
      }
      lastAnalysis = parsed;
      const validation = validateStrictStyleEvidence(parsed);
      parsed.localValidationWarnings = validation.warnings || [];
      parsed.localValidationMissing = validation.ok ? [] : validation.missing;
      if (!validation.ok && !normalizeAnalysisList(parsed.missingVisualDNA).length) {
        parsed.missingVisualDNA = validation.missing;
      }
      if (validation.ok) return parsed;
      const error = new Error(`模型 ${model} 的综合参考图风格证据不足：${validation.missing.join("；")}`);
      error.analysis = parsed;
      lastError = error;
    } catch (error) {
      if (error?.analysis) lastAnalysis = error.analysis;
      lastError = error;
    }
  }

  const message = lastError?.message || "总资产分析失败";
  const strictMessage = lastAnalysis
    ? `${message}。已停止生成总资产；不会使用默认风格兜底。`
    : `${message}。未获得可用综合参考图分析；不会使用默认风格兜底。`;
  const error = new Error(strictMessage);
  error.analysis = lastAnalysis || createFailureSnapshot(strictMessage);
  throw error;
}

async function generateUiAssetAnalysisWithApi({ referenceImages, imageSummaries, userKeywords, styleTransferKeywords, screen }) {
  const totalAnalysis = await generateTotalAssetAnalysisWithApi({ referenceImages, imageSummaries, userKeywords, styleTransferKeywords, screen });
  return totalAnalysis.uiAnalysis || totalAnalysis;
}

function getUiAssetAnalysisModel() {
  return "gpt-5.2";
}

function getTotalAssetAnalysisModels() {
  return [...new Set([
    "gemini-2.5-pro",
    "gpt-5.4",
    getUiAssetAnalysisModel()
  ].filter(Boolean))];
}

async function repairUiAssetAnalysisJsonWithApi(rawContent, originalPayload) {
  const source = String(rawContent || "").trim();
  if (!source) return null;
  const response = await fetch("/api/generate-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...originalPayload,
      task: "ui-asset-json-repair",
      model: getUiAssetAnalysisModel(),
      rawContent: source.slice(0, 12000)
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return null;
  return normalizeUiAssetAnalysis(data.content || data.plan || "");
}

async function repairTotalAssetAnalysisJsonWithApi(rawContent, originalPayload, model = getUiAssetAnalysisModel(), { signal, timeoutMs = TOTAL_ASSET_ANALYSIS_TIMEOUT_MS } = {}) {
  const source = String(rawContent || "").trim();
  if (!source) return null;
  const { response, data } = await fetchJsonWithClientTimeout("/api/generate-plan", {
      ...originalPayload,
      task: "total-asset-json-repair",
      model,
      rawContent: source.slice(0, 14000)
    }, {
      signal,
      timeoutMs,
      timeoutMessage: `总资产分析 JSON 修复超过 ${Math.ceil(timeoutMs / 1000)} 秒`
  });
  if (!response.ok) return null;
  return normalizeTotalAssetAnalysis(data.content || data.plan || "");
}

function hasConcreteStyleText(value, minLength = 80) {
  const text = normalizeSummaryText(value);
  if (!text || isLikelySchemaKeyOnlySummary(text)) return false;
  if (isInsufficientStyleEvidenceText(text)) return false;
  return text.replace(/\s/g, "").length >= minLength;
}

function formatStyleExtrapolationRule(rule) {
  if (!rule || typeof rule !== "object") return cleanAnalysisText(rule);
  const target = cleanAnalysisText(rule.target || "");
  const directEvidence = cleanAnalysisText(rule.directEvidence || "");
  const extrapolationRule = cleanAnalysisText(rule.extrapolationRule || "");
  return [
    target ? `目标=${target}` : "",
    directEvidence ? `依据=${directEvidence}` : "",
    extrapolationRule ? `外推=${extrapolationRule}` : ""
  ].filter(Boolean).join("；");
}

function isExactReferenceOnlyMissingText(text) {
  const value = normalizeSummaryText(text);
  if (!value) return false;
  const exactReferencePattern = /具体|精确|直接出现|未直接|未出现|样例|exact|component|reference|控件|按钮|关闭|返回|确认|领取|Tab|tab|页签|图标|背景|角色/i;
  const foundationPattern = /色彩|HEX|比例|材质|描边|圆角|形状|点线面|光源|光影|阴影|发光|渲染|复杂度|DNA|基础|palette|material|stroke|corner|lighting|rendering/i;
  return exactReferencePattern.test(value) && !foundationPattern.test(value);
}

function hasUsableStyleExtrapolation(normalized) {
  const rules = normalizeStyleExtrapolationRules(normalized?.styleExtrapolationRules);
  const directTargets = normalizeAnalysisList(normalized?.directTransferTargets);
  const extrapolatedTargets = normalizeAnalysisList(normalized?.extrapolatedTargets);
  return rules.some((rule) => rule.directEvidence && rule.extrapolationRule)
    || directTargets.length
    || extrapolatedTargets.length;
}

function isInsufficientStyleEvidenceText(text) {
  const value = cleanAnalysisText(text);
  if (!value) return true;
  const insufficientHits = (value.match(/无法确认|无法判断|未识别|不可解析|缺失|不足|看不清|不清晰|不能确认|cannot\s+confirm|not\s+visible|not\s+enough|insufficient|missing|unclear/gi) || []).length;
  if (!insufficientHits) return false;
  const concreteHits = (value.match(/#[0-9a-f]{6}\b|%|px|比例|ratio|圆角|corner|描边|stroke|边框|border|材质|material|光源|lighting|高光|highlight|阴影|shadow|发光|glow|厚度|thickness|层|layer/gi) || []).length;
  return concreteHits < 2 || insufficientHits >= concreteHits;
}

function validateStrictStyleEvidence(analysis) {
  const normalized = normalizeStructuredStyleAnalysisForDisplay(analysis);
  const missing = [];
  const warnings = [];
  const evidence = [];
  if (!normalized) {
    return {
      ok: false,
      missing: ["参考图分析未返回可用结构化结果"],
      warnings: [],
      evidence: []
    };
  }

  const referenceEvidenceSet = normalizeReferenceEvidenceSet(normalized.referenceEvidenceSet);
  const missingVisualDNA = normalizeAnalysisList(normalized.missingVisualDNA);
  const missingExactComponentReference = normalizeAnalysisList(normalized.missingExactComponentReference);
  const extrapolationWarnings = normalizeAnalysisList(normalized.extrapolationWarnings || normalized.localValidationWarnings);
  const styleExtrapolationRules = normalizeStyleExtrapolationRules(normalized.styleExtrapolationRules);
  const extrapolationRuleLines = styleExtrapolationRules.map(formatStyleExtrapolationRule).filter(Boolean);
  const referencePaletteSummary = joinSpecSummary(collectTotalAssetEvidenceLines(referenceEvidenceSet, "paletteAndRatio", 12));
  const colors = [...new Set([
    ...collectHexColorsFromSpec(normalized.colorSystem),
    ...collectHexColorsFromSpec(referenceEvidenceSet.map((entry) => entry.paletteAndRatio))
  ])];
  const colorSummary = joinSpecSummary([
    formatColorSystemSummary(normalized.colorSystem),
    referencePaletteSummary
  ]);
  if (/insufficient|不足/i.test(normalized.analysisStatus || "") && normalized.analysisSource !== "local-evidence-synthesis") {
    const declaredMissing = normalizeSummaryText(missingVisualDNA) || normalizeSummaryText(normalized.missingEvidence);
    if (missingVisualDNA.length) {
      missing.push(`模型声明基础视觉 DNA 不足：${declaredMissing.slice(0, 160)}`);
    } else if (declaredMissing && isExactReferenceOnlyMissingText(declaredMissing) && hasUsableStyleExtrapolation(normalized)) {
      warnings.push(`模型声明具体样例缺失，按外推规则继续：${declaredMissing.slice(0, 160)}`);
    } else if (declaredMissing) {
      missing.push(`模型声明证据不足：${declaredMissing.slice(0, 160)}`);
    }
  }
  const expectedReferenceCount = Number(normalized.referenceImageCount || referenceEvidenceSet.length || 0);
  if (expectedReferenceCount && referenceEvidenceSet.length < expectedReferenceCount) {
    missing.push(`逐图证据数量不足：期望 ${expectedReferenceCount} 张，实际 ${referenceEvidenceSet.length} 张`);
  }
  const weakEntries = referenceEvidenceSet
    .map((entry) => {
      const validation = validateReferenceEvidenceEntry(entry);
      return validation.ok ? "" : `${entry.label || `图${entry.index || "?"}`}：${validation.missing.join("、")}`;
    })
    .filter(Boolean);
  if (referenceEvidenceSet.length && !weakEntries.length) {
    evidence.push(`逐图证据：${referenceEvidenceSet.map((entry) => entry.label || `图${entry.index}`).join("、")} 均已提取可迁移视觉指纹`);
  } else if (weakEntries.length) {
    missing.push(`逐图证据不足：${weakEntries.slice(0, 5).join("；")}`);
  } else {
    missing.push("逐图参考图证据缺失");
  }
  const referenceEvidenceSummary = formatStructuredSpecValue(normalized.mergedStyleEvidence || normalized.referenceEvidence);
  if (hasConcreteStyleText(referenceEvidenceSummary, 160)) {
    evidence.push(`综合参考图证据：${referenceEvidenceSummary.slice(0, 420)}`);
  } else {
    missing.push("综合参考图可见视觉指纹证据不足");
  }
  if (colors.length >= 2 && hasConcreteStyleText(colorSummary, 50)) {
    evidence.push(`色彩证据：${colors.slice(0, 6).join("、")}；${colorSummary.slice(0, 220)}`);
  } else {
    missing.push("色彩 HEX 与用途/比例不足");
  }

  const materialSummary = formatMaterialRulesSummary(normalized.materialRules);
  if (hasConcreteStyleText(materialSummary, 70)) {
    evidence.push(`材质证据：${materialSummary.slice(0, 260)}`);
  } else {
    missing.push("UI/背景/角色材质规则不足");
  }

  const lightingSummary = formatLightingHierarchySummary(normalized.lightingHierarchy);
  if (hasConcreteStyleText(lightingSummary, 60) && /光|light|shadow|阴影|glow|发光|高光/i.test(lightingSummary)) {
    evidence.push(`光影证据：${lightingSummary.slice(0, 240)}`);
  } else {
    missing.push("主光源、阴影或发光规则不足");
  }

  const pointShapeSummary = joinSpecSummary([
    formatPointLinePlaneSummary(normalized.pointLinePlane),
    joinSpecSummary(formatShapeLanguageDetailedLines(normalized.shapeLanguage))
  ]);
  if (hasConcreteStyleText(pointShapeSummary, 90) && /比例|ratio|圆角|corner|描边|stroke|线|点|面|边框|border|角/i.test(pointShapeSummary)) {
    evidence.push(`点线面/形状证据：${pointShapeSummary.slice(0, 300)}`);
  } else {
    missing.push("点线面、圆角比例、描边或形状语言不足");
  }

  const uiSummary = joinSpecSummary([
    formatButtonSpecSummary(normalized.buttonSpec),
    formatPanelModalSpecSummary(normalized.panelModalSpec),
    formatIconItemResourceSpecSummary(normalized.iconItemResourceSpec)
  ]);
  if (hasConcreteStyleText(uiSummary, 140) && /按钮|button|面板|panel|图标|icon|圆角|corner|描边|border|stroke|材质|material/i.test(uiSummary)) {
    evidence.push(`UI控件证据：${uiSummary.slice(0, 360)}`);
  } else {
    missing.push("按钮/面板/图标的可迁移规则不足");
  }

  const backgroundSummary = formatBackgroundSpecSummary(normalized.backgroundSpec);
  if (hasConcreteStyleText(backgroundSummary, 80)) {
    evidence.push(`背景证据：${backgroundSummary.slice(0, 240)}`);
  } else {
    warnings.push("背景直接样例不足：将仅按基础视觉 DNA、项目界面需求和 UI 安全区规则外推背景设定");
  }

  const characterSummary = formatCharacterSpecSummary(normalized.characterSpec);
  if (hasConcreteStyleText(characterSummary, 70)) {
    evidence.push(`角色证据：${characterSummary.slice(0, 240)}`);
  } else {
    warnings.push("角色直接样例不足：将仅按基础视觉 DNA 和项目角色需求外推角色设定");
  }
  missingExactComponentReference.forEach((item) => warnings.push(`具体样例缺失但可外推：${item}`));
  extrapolationWarnings.forEach((item) => warnings.push(item));
  extrapolationRuleLines.slice(0, 8).forEach((line) => warnings.push(`外推规则：${line}`));

  return {
    ok: missing.length === 0,
    missing,
    warnings: [...new Set(warnings)],
    evidence,
    analysis: normalized
  };
}

function assertStrictTotalAssetAnalysis(analysis) {
  const validation = validateStrictStyleEvidence(analysis);
  if (validation.ok) return validation;
  throw new Error(`参考图风格分析不足，已停止生成总资产。缺少：${validation.missing.join("；")}。请刷新参考图分析，或补充更清晰的 UI/背景/角色参考图。`);
}

function normalizeTotalAssetAnalysis(raw) {
  const parsed = typeof raw === "string" ? parseJsonObjectFromText(raw) : raw;
  if (!parsed || typeof parsed !== "object") return null;
  const imagePrompts = parsed.imagePrompts && typeof parsed.imagePrompts === "object" ? parsed.imagePrompts : {};
  const normalized = {
    analysisStatus: cleanAnalysisText(parsed.analysisStatus || parsed.status || ""),
    analysisSource: cleanAnalysisText(parsed.analysisSource || parsed.source || ""),
    missingEvidence: normalizeAnalysisList(parsed.missingEvidence || parsed.missing || parsed.missingFields),
    localValidationMissing: normalizeAnalysisList(parsed.localValidationMissing || parsed.strictValidationMissing),
    localValidationWarnings: normalizeAnalysisList(parsed.localValidationWarnings || parsed.softValidationWarnings || parsed.extrapolationWarnings),
    missingVisualDNA: normalizeAnalysisList(parsed.missingVisualDNA || parsed.missingVisualDna || parsed.visualDnaMissing),
    missingExactComponentReference: normalizeAnalysisList(parsed.missingExactComponentReference || parsed.missingExactReferences || parsed.missingExactComponentRefs),
    referenceImageCount: Number(parsed.referenceImageCount || parsed.referenceCount || (Array.isArray(parsed.referenceEvidenceSet) ? parsed.referenceEvidenceSet.length : 0) || 0),
    originalReferenceImageCount: Number(parsed.originalReferenceImageCount || parsed.totalReferenceImageCount || parsed.sentReferenceImageCount || 0),
    referenceEvidenceSet: normalizeReferenceEvidenceSet(parsed.referenceEvidenceSet || parsed.referenceEvidences || parsed.perImageEvidence),
    usableEvidenceSet: normalizeReferenceEvidenceSet(parsed.usableEvidenceSet || parsed.usableReferenceEvidenceSet || parsed.referenceEvidenceSet || []),
    skippedEvidenceSet: normalizeReferenceEvidenceSet(parsed.skippedEvidenceSet || parsed.skippedReferenceEvidenceSet || parsed.ignoredReferenceEvidenceSet || []),
    evidenceProgress: normalizeEvidenceProgressItems(parsed.evidenceProgress || parsed.referenceEvidenceProgress),
    mergedStyleEvidence: parsed.mergedStyleEvidence || parsed.mergedEvidence || parsed.styleEvidence || {},
    evidenceConflicts: normalizeAnalysisList(parsed.evidenceConflicts || parsed.conflicts || parsed.styleConflicts),
    evidenceAttemptErrors: normalizeAnalysisList(parsed.evidenceAttemptErrors || parsed.attemptErrors),
    styleExtrapolationRules: normalizeStyleExtrapolationRules(parsed.styleExtrapolationRules || parsed.extrapolationRules || parsed.styleExtrapolations),
    directTransferTargets: normalizeAnalysisList(parsed.directTransferTargets || parsed.transferTargets || parsed.directTargets),
    extrapolatedTargets: normalizeAnalysisList(parsed.extrapolatedTargets || parsed.extrapolationTargets || parsed.indirectTargets),
    referenceEvidence: parsed.referenceEvidence || parsed.evidence || {},
    styleKeywords: normalizeAnalysisList(parsed.styleKeywords || parsed.keywords || parsed["风格关键词"]),
    styleDNA: parsed.styleDNA || parsed.styleDna || parsed.dna || {},
    pointLinePlane: parsed.pointLinePlane || parsed.shapeLanguage?.pointLinePlane || {},
    shapeLanguage: parsed.shapeLanguage || {},
    colorSystem: parsed.colorSystem || parsed.palette || {},
    materialRules: parsed.materialRules || {},
    lightingHierarchy: parsed.lightingHierarchy || parsed.lighting || {},
    buttonSpec: parsed.buttonSpec || parsed.buttonMorphology || {},
    panelModalSpec: parsed.panelModalSpec || parsed.panelSpec || {},
    iconItemResourceSpec: parsed.iconItemResourceSpec || parsed.iconSpec || {},
    typographySpec: parsed.typographySpec || parsed.typography || {},
    backgroundSpec: parsed.backgroundSpec || parsed.backgroundStyle || {},
    characterSpec: parsed.characterSpec || {},
    unityRules: parsed.unityRules || parsed.unity || [],
    designTokens: parsed.designTokens || {},
    projectContext: parsed.projectContext || null,
    assetRequirements: parsed.assetRequirements || parsed.componentDemand || {},
    uiAssetCoverage: parsed.uiAssetCoverage || parsed.coverage || null,
    uiAnalysis: parsed.uiAnalysis || parsed.ui || parsed.uiAsset || null,
    backgroundAnalysis: parsed.backgroundAnalysis || parsed.background || null,
    characterAnalysis: parsed.characterAnalysis || parsed.character || null,
    imagePrompts: {
      ui: String(imagePrompts.ui || imagePrompts.uiAssetPrompt || imagePrompts.uiPrompt || parsed.uiPrompt || parsed.assetSheetPrompt || "").trim(),
      background: String(imagePrompts.background || imagePrompts.backgroundPrompt || parsed.backgroundPrompt || "").trim(),
      character: String(imagePrompts.character || imagePrompts.characterPrompt || parsed.characterPrompt || "").trim()
    },
    negativePrompts: normalizeAnalysisList(parsed.negativePrompts || parsed.negativePrompt || parsed.negativeKeywords),
    raw: parsed
  };
  return isMeaningfulSpecValue(normalized) ? normalized : null;
}

async function generateUiAssetSheetImage({ analysis, referenceImages, referenceLabels, styleKeywords, styleTransferKeywords, model }) {
  const prompt = buildUiAssetSheetPrompt(analysis, styleKeywords, styleTransferKeywords);
  const canvasSpec = getDesignCanvasSpec();
  const uiRequiredComponents = getUniversalUiAssetComponents();
  const projectAnchorPolicy = [];
  const uiAssetBoardSectionSpec = formatUiAssetBoardSectionSpecForPrompt();
  const response = await fetch("/api/generate-design", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "ui-asset-sheet",
      projectName: state.gameName || gameName.value || detectGameName(briefText.value.trim()) || "未命名小游戏",
      prompt,
      model,
      platform: getPlatformText($("#platform").value),
      aspectRatio: canvasSpec.aspectRatio,
      size: canvasSpec.generationSize,
      styleTransferKeywords,
      uiRequiredComponents,
      projectAnchorPolicy,
      uiAssetBoardSectionSpec,
      referenceImages
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `UI资产图生成失败：${response.status}`);
  }
  const imageUrl = data.imageUrl || data.images?.[0] || "";
  if (!imageUrl) throw new Error("UI资产图未返回图片");

  return {
    imageUrl,
    files: data.files || [],
    prompt: data.prompt || prompt,
    model: data.model || model,
    referenceCount: referenceImages.length,
    referenceLabels,
    uiAssetBoardSectionSpec
  };
}

function normalizeUiAssetAnalysis(raw) {
  const parsed = typeof raw === "string" ? parseJsonObjectFromText(raw) : raw;
  if (!parsed || typeof parsed !== "object") return null;

  const normalizeSection = (value) => {
    if (!value) return {};
    const normalizeEntryText = (entry) => normalizeSummaryText(entry);
    if (Array.isArray(value)) {
      const items = value.map(normalizeEntryText).filter(Boolean);
      return items.length ? { items } : {};
    }
    if (typeof value !== "object") {
      const summary = String(value || "").trim();
      return summary ? { summary } : {};
    }
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
      key,
      Array.isArray(item) ? item.map(normalizeEntryText).filter(Boolean) : normalizeEntryText(item)
    ]));
  };
  const normalizeObjectList = (value) => {
    const source = Array.isArray(value) ? value : [];
    return source.map((item) => {
      if (!item || typeof item !== "object") {
        return { name: cleanAnalysisText(item), type: "", style: "", rule: "" };
      }
      return {
        name: cleanAnalysisText(item.name || item.title || item.label || item.component || item.componentType || ""),
        type: cleanAnalysisText(item.type || item.kind || item.category || item.componentType || ""),
        style: cleanAnalysisText(item.style || item.observedStyle || item.visualStyle || item.transferableRules || item.description || ""),
        rule: cleanAnalysisText(item.rule || item.usageRule || item.replacementBoundary || item.reason || "")
      };
    }).filter((item) => item.name || item.type || item.style || item.rule);
  };
  const normalizeStyleAnchorList = (value) => {
    const source = Array.isArray(value) ? value : value ? [value] : [];
    return source.map((item) => {
      if (!item || typeof item !== "object") {
        return { target: cleanAnalysisText(item), evidence: "", rule: "", avoid: "" };
      }
      return {
        target: cleanAnalysisText(item.target || item.componentType || item.component || item.type || item.name || item.label || ""),
        evidence: cleanAnalysisText(item.referenceEvidence || item.evidence || item.observedStyle || item.description || item.summary || ""),
        rule: cleanAnalysisText(item.transferRule || item.transferableRules || item.rule || item.styleRule || item.usageRule || ""),
        avoid: cleanAnalysisText(item.doNotChange || item.avoid || item.boundary || item.replacementBoundary || item.negativeRule || "")
      };
    }).filter((item) => item.target || item.evidence || item.rule || item.avoid);
  };

  const normalized = {
    keywords: normalizeSection(parsed.keywords),
    palette: normalizeSection(parsed.palette),
    elements: normalizeSection(parsed.elements),
    style: normalizeSection(parsed.style),
    componentDemand: normalizeSection(parsed.componentDemand || parsed.controlDemand),
    referenceComponentStyleLibrary: normalizeObjectList(parsed.referenceComponentStyleLibrary || parsed.componentStyleLibrary || parsed.controlStyleLibrary),
    buttonMorphology: normalizeButtonMorphologyValue(
      parsed.buttonMorphology
      || parsed.mainButtonMorphology
      || parsed.buttonShape
      || parsed.buttonCornerProfile
      || parsed.roundedCornerProfile
      || parsed.style?.buttonMorphology
      || parsed.style?.buttonRules
      || parsed["按钮形态"]
      || parsed["主按钮形态"]
      || parsed["按钮圆角"]
    ),
    styleFidelityTargets: normalizeSection(parsed.styleFidelityTargets || parsed.fidelityTargets || parsed.styleSimilarityTargets),
    referenceStyleAnchors: normalizeStyleAnchorList(parsed.referenceStyleAnchors || parsed.styleAnchors || parsed.referenceAnchors),
    antiGenericRules: normalizeAnalysisList(parsed.antiGenericRules || parsed.genericAvoidRules || parsed.avoidGenericRules),
    assetSheetStyleLocks: normalizeSection(parsed.assetSheetStyleLocks || parsed.styleLocks || parsed.assetStyleLocks),
    themeBoundElements: normalizeAnalysisList(parsed.themeBoundElements || parsed.elements?.themeBoundElements),
    replacementThemeElements: normalizeAnalysisList(parsed.replacementThemeElements || parsed.elements?.replacementThemeElements),
    elementReplacementRules: normalizeAnalysisList(parsed.elementReplacementRules || parsed.elements?.elementReplacementRules),
    assetSheetPrompt: String(parsed.assetSheetPrompt || "").trim()
  };
  if (!normalized.assetSheetPrompt) {
    normalized.assetSheetPrompt = [
      formatUiAssetSection("关键词分析", normalized.keywords),
      formatUiAssetSection("配色分析", normalized.palette),
      formatUiAssetSection("元素分析", normalized.elements),
      formatUiAssetSection("风格分析", normalized.style),
      formatUiAssetSection("控件需求", normalized.componentDemand),
      formatUiAssetComponentLibrary(normalized.referenceComponentStyleLibrary),
      formatButtonMorphologySummary(normalized.buttonMorphology),
      formatUiAssetSection("风格贴合目标", normalized.styleFidelityTargets),
      formatUiAssetStyleAnchors(normalized.referenceStyleAnchors),
      normalized.antiGenericRules.length ? `反通用规则：${normalized.antiGenericRules.join("；")}` : "",
      formatUiAssetSection("资产图风格锁定", normalized.assetSheetStyleLocks),
      normalized.replacementThemeElements.length ? `替换主题元素：${normalized.replacementThemeElements.join("、")}` : ""
    ].filter(Boolean).join("；").slice(0, 520);
  }
  const usefulText = JSON.stringify(normalized);
  return usefulText.replace(/[{}\[\]",:\s]/g, "").length ? normalized : null;
}

function formatUiAssetSection(title, value) {
  if (!value) return "";
  if (Array.isArray(value)) return value.length ? `${title}：${value.join("、")}` : "";
  if (typeof value === "object") {
    const parts = Object.entries(value)
      .map(([key, item]) => Array.isArray(item) ? `${key}=${item.join("、")}` : `${key}=${item}`)
      .filter((item) => item && !item.endsWith("="));
    return parts.length ? `${title}：${parts.join("；")}` : "";
  }
  return `${title}：${String(value).trim()}`;
}

async function generateTotalAssetImage({ type, analysis, referenceImages, referenceLabels, styleKeywords, styleTransferKeywords, model, signal }) {
  const meta = getTotalAssetPartMeta(type);
  const safeStyleTransferKeywords = cleanTotalAssetStyleTextForImagePrompt(filterTotalAssetTextByRole(styleTransferKeywords, type), 1200);
  const prompt = buildTotalAssetPrompt(analysis, type, styleKeywords, safeStyleTransferKeywords);
  const canvasSpec = getDesignCanvasSpec();
  const uiRequiredComponents = type === "ui"
    ? getUniversalUiAssetComponents()
    : [];
  const projectAnchorPolicy = type === "ui"
    ? []
    : [];
  const uiAssetBoardSectionSpec = type === "ui"
    ? formatUiAssetBoardSectionSpecForPrompt()
    : "";
  const payload = {
    mode: meta.mode,
    projectName: state.gameName || gameName.value || detectGameName(briefText.value.trim()) || "未命名小游戏",
    prompt,
    model,
    platform: getPlatformText($("#platform").value),
    aspectRatio: canvasSpec.aspectRatio,
    size: canvasSpec.generationSize,
    styleTransferKeywords: safeStyleTransferKeywords,
    uiRequiredComponents,
    projectAnchorPolicy,
    uiAssetBoardSectionSpec,
    referenceImages
  };
  const { response, data } = await fetchJsonWithClientTimeout("/api/generate-design", payload, {
    signal,
    timeoutMs: TOTAL_ASSET_IMAGE_TIMEOUT_MS,
    timeoutMessage: `${meta.label}生成超过 ${formatMinutesForTimeout(TOTAL_ASSET_IMAGE_TIMEOUT_MS)} 分钟，已停止等待`
  });
  if (!response.ok) {
    throw new Error(data.error || `${meta.label}生成失败：${response.status}`);
  }
  const imageUrl = data.imageUrl || data.images?.[0] || "";
  if (!imageUrl) throw new Error(`${meta.label}未返回图片`);

  return {
    imageUrl,
    files: data.files || [],
    prompt: data.prompt || prompt,
    model: data.model || model,
    referenceCount: referenceImages.length,
    referenceLabels,
    uiAssetBoardSectionSpec,
    analysis
  };
}

function buildTotalAssetPrompt(analysis, type = "ui", styleKeywords = "", styleTransferKeywords = "") {
  const meta = getTotalAssetPartMeta(type);
  if (type === "ui" && (!analysis?.imagePrompts?.ui && !analysis?.styleDNA)) {
    throw new Error("缺少参考图 UI 风格分析结果，已停止生成 UI控件资产图");
  }
  assertStrictTotalAssetAnalysis(analysis);
  const projectContext = analysis?.projectContext || buildTotalAssetProjectContext(getUiAssetDesignScreen());
  const projectName = state.gameName || gameName.value || "未命名小游戏";
  const canvasSpec = getDesignCanvasSpec();
  const worldAndThemeAnchor = formatWorldAndThemeForImagePrompt(2800);
  const promptFromAnalysis = type === "ui"
    ? analysis?.imagePrompts?.ui
    : type === "background"
      ? analysis?.imagePrompts?.background
      : analysis?.imagePrompts?.character;
  const requiredUiAssetComponents = normalizeRequiredUiAssetComponents(
    type === "ui"
      ? getUniversalUiAssetComponents()
      : (analysis?.assetRequirements?.uiRequiredComponents || projectContext.assetDemandSummary?.uiRequiredComponents || [])
  );
  const requiredUiAssetComponentPrompt = formatRequiredUiAssetComponentsForPrompt(requiredUiAssetComponents);
  const projectAnchorPrompt = formatProjectLayoutAnchorsForPrompt(projectContext.projectAnchorPolicy || []);
  const uiAssetBoardSectionSpec = type === "ui"
    ? formatUiAssetBoardSectionSpecForPrompt()
    : "";
  if (["ui", "background", "character"].includes(type)) {
    return buildDetailedTotalAssetPrompt(analysis, type, styleKeywords, styleTransferKeywords);
  }
  const styleFidelityDigest = buildTotalAssetStyleFidelityDigest(analysis, type);
  const uiAssetStyleLockSummary = type === "ui" ? buildUiAssetStyleLockSummary(analysis) : "";
  const roleRule = {
    ui: [
      "Generate a transparent-background game UI control asset sheet, not a complete game screen.",
      "Style similarity is the first priority for the UI asset sheet: lock to the reference images' dominant palette ratio, line weight, panel silhouette, glow/shadow system, information density, ornament rhythm and point-line-plane balance.",
      "Do not read the interaction plan for a total-asset UI component hard minimum. This stage generates a fixed universal game UI control style library.",
      `Fixed universal UI asset taxonomy:\n${formatUniversalUiAssetTaxonomyForPrompt()}`,
      `Mandatory sectioned asset-board layout:\n${uiAssetBoardSectionSpec}`,
      "Every listed control must appear as a reusable asset with a tiny English name + function label in the exact format `Control Name - function label`; examples: `Back Button - go back`, `Close Button - dismiss modal`, `Primary Button - main action`, `Claim Button - collect reward`, `Resource Token - show currency`, `Progress Bar - show progress`, `Item Slot - hold item icon`, `Toast - temporary feedback`.",
      "These labels are asset-identification labels only and must never be copied into final normal screen UI.",
      "Include state language for default, pressed, selected, disabled, locked and reward states. Use nearest-family extrapolation when a reference lacks a specific control.",
      "Panels should be clean, stretch-friendly and suitable for 9-slice slicing; reserve empty text areas and number areas without drawing random letters.",
      "The UI asset sheet does not decide any concrete screen function, business entry, layout, title, resource list or navigation count; normal screen generation will read the current interaction section later and map its needs to this fixed control family.",
      "Do not drift into generic blue sci-fi UI, generic metallic fantasy UI, default rounded web-card UI, cream pet-simulator UI, or any unrelated asset-sheet style unless those exact traits are visible in the references.",
      uiAssetStyleLockSummary ? `UI asset reference style lock summary:\n${uiAssetStyleLockSummary}` : ""
    ],
    background: [
      "Generate a project-level background style board, not a UI screen and not a copy of the reference image scene.",
      "Create new background scenes required by the target screen list and matching interaction sections, with foreground/midground/background depth, role stand zones, and clean UI-safe areas.",
      "No UI widgets, no buttons, no menus, no text; background must stay lower contrast than UI and must not steal the gameplay or character focal point.",
      "Keep obvious breathing room and large clean areas; do not fill the whole canvas with dense buildings, props, banners, railings, foliage or repeating decoration.",
      "Use a light base, broad shapes, soft depth and controlled detail density so the scene reads as a supportive background board rather than a full key art illustration.",
      "Separate foreground, midground and far background clearly: push midground and distance backward with brighter values, softer edges, lighter haze and lower contrast.",
      "Decorations should stay sparse and peripheral; do not stack saturated, high-contrast focal objects in the center UI-safe zone.",
      "Inherit the reference image's spatial relationship, not its exact content: background stays lighter, airier and less aggressive, while warmer or more saturated focal accents belong to the foreground subject layer rather than the whole background."
    ],
    character: [
      "Generate a transparent-background character style board for this project, not copied reference characters.",
      "Show new character/pet/NPC visual rules only when required by the target screen list or matching interaction sections: proportions, face style, silhouette, costume/material logic, line/render style, sample poses or bust/avatar variants when needed.",
      "Characters must share the same color system, lighting, material logic, contour language and decoration symbols as the UI and background assets."
    ]
  }[type] || [];
  const fixedNegativePrompts = [
    "modern flat app UI",
    "generic mobile app style",
    "generic golden fantasy UI",
    "generic blue sci-fi UI",
    "generic metallic fantasy UI",
    "generic cozy pet-simulator cream UI",
    "default rounded web cards",
    "photorealistic background",
    "inconsistent lighting",
    "mismatched color palette",
    "copied logo",
    "copied character",
    "unreadable text",
    "random letters",
    "changed gameplay layout",
    "changed interaction structure"
  ];
  const negativePrompt = [...new Set([
    ...(Array.isArray(analysis?.negativePrompts) ? analysis.negativePrompts : []),
    ...fixedNegativePrompts
  ].map((item) => cleanAnalysisText(item)).filter(Boolean))].join(", ");
  return [
    `Create ${meta.label} for a game visual system.`,
    `Project: ${projectName}`,
    `Platform and canvas: ${getPlatformText($("#platform").value)}; ${canvasSpec.promptText}`,
    `User style keywords: ${styleKeywords || "none"}`,
    `World and theme content anchor from the planning document:\n${worldAndThemeAnchor}`,
    "Hard content rule: reference images only provide art style, material, palette, lighting, rendering texture and shape language. Content, background subject, character identity, faction conflict, world rules and gameplay packaging must obey the planning document's World and Theme section.",
    `Locked reference style analysis: ${styleTransferKeywords || "none"}`,
    `Model analysis English prompt for this asset: ${promptFromAnalysis || "Use the structured visual specification below."}`,
    "Reference Style Fidelity Contract:",
    "1. Match the attached reference images' visual DNA before applying project theme: palette ratios, color temperature, material thickness, stroke width, border layers, corner radius ratios, cutout/notch shapes, ornament rhythm, lighting direction, shadow softness, glow color, icon rendering, typography mood, information density and point-line-plane balance.",
    type === "ui"
      ? "2. The reference images decide only style. The total UI asset stage uses the fixed A-H universal control taxonomy; normal screen generation later reads the current interaction section and maps concrete needs to these controls."
      : "2. The reference images decide only style. Planning and interaction documents decide asset inventory, scene/character subject, gameplay, screen structure, business components and interaction logic.",
    "3. Do not drift into generic golden fantasy UI, generic cozy pet-simulator cream UI, modern flat app UI, default rounded web cards, or unrelated cartoon UI unless those exact traits are clearly present in the reference images.",
    "4. Do not copy reference logos, text, exact characters, IP marks, original resource icons, original scene composition or proprietary symbols.",
    "5. If an exact target component, background subject or character subject is absent from the references, use only the documented styleExtrapolationRules derived from visible visual DNA; do not invent a generic fallback style.",
    styleFidelityDigest ? `Role-specific style fidelity digest:\n${styleFidelityDigest}` : "",
    ...roleRule,
    type === "ui"
      ? "Priority rule: this total UI asset image is a reusable style library. It does not decide final screen structure, business entries or component count; reference images decide visual style for the fixed universal control family."
      : "Priority rule: the planning document's main screen list and matching interaction sections decide function, gameplay, UI structure, component inventory and asset needs; reference images decide only visual style.",
    "Do not copy reference logos, text, exact characters, IP symbols, original resource icons, original activity names, exact layout or original scene composition.",
    type === "ui"
      ? "Total UI asset scope: fixed universal control style library only; do not include project-specific interaction component hard minimum, business words, screen title text, resource names, activity names or page layouts."
      : `Target screens from planning document main screen list:\n${projectContext.targetScreenList || "No explicit target screens detected"}`,
    type === "ui"
      ? ""
      : `Matching interaction sections:\n${formatTotalAssetInteractionSectionsForPrompt(projectContext.screenInteractionSections) || "No matching interaction sections found; use only the main screen list rows for asset demand."}`,
    type === "ui"
      ? ""
      : `Asset demand summary from the target screen list and matching interaction sections:\n${JSON.stringify(projectContext.assetDemandSummary || {}, null, 2).slice(0, 3600)}`,
    type === "ui" ? "" : `Project anchor policy from the interaction plan:\n${projectAnchorPrompt}`,
    `Structured style specification:\n${JSON.stringify({
      referenceImageCount: analysis?.referenceImageCount,
      referenceEvidenceSet: analysis?.referenceEvidenceSet,
      mergedStyleEvidence: analysis?.mergedStyleEvidence,
      evidenceConflicts: analysis?.evidenceConflicts,
      styleExtrapolationRules: analysis?.styleExtrapolationRules,
      directTransferTargets: analysis?.directTransferTargets,
      extrapolatedTargets: analysis?.extrapolatedTargets,
      missingExactComponentReference: analysis?.missingExactComponentReference,
      localValidationWarnings: analysis?.localValidationWarnings,
      referenceEvidence: analysis?.referenceEvidence,
      styleDNA: analysis?.styleDNA,
      pointLinePlane: analysis?.pointLinePlane,
      shapeLanguage: analysis?.shapeLanguage,
      colorSystem: analysis?.colorSystem,
      materialRules: analysis?.materialRules,
      lightingHierarchy: analysis?.lightingHierarchy,
      buttonSpec: analysis?.buttonSpec,
      panelModalSpec: analysis?.panelModalSpec,
      iconItemResourceSpec: analysis?.iconItemResourceSpec,
      typographySpec: analysis?.typographySpec,
      backgroundSpec: analysis?.backgroundSpec,
      characterSpec: analysis?.characterSpec,
      unityRules: analysis?.unityRules,
      designTokens: analysis?.designTokens,
      assetRequirements: analysis?.assetRequirements,
      uiAssetCoverage: analysis?.uiAssetCoverage
    }, null, 2).slice(0, 9000)}`,
    `Negative prompt: ${negativePrompt}`
  ].filter(Boolean).join("\n");
}

function formatUiAssetComponentLibrary(items) {
  if (!Array.isArray(items) || !items.length) return "";
  const text = items
    .slice(0, 12)
    .map((item) => {
      const name = [item.name, item.type].filter(Boolean).join("/");
      const body = [item.style, item.rule].filter(Boolean).join("；");
      return [name, body].filter(Boolean).join("：");
    })
    .filter(Boolean)
    .join("；");
  return text ? `参考图同类型控件风格库：${text}` : "";
}

function formatUiAssetStyleAnchors(items) {
  if (!Array.isArray(items) || !items.length) return "";
  const text = items
    .slice(0, 12)
    .map((item) => {
      const head = item.target ? `${item.target}` : "控件锚点";
      const body = [
        item.evidence ? `证据=${item.evidence}` : "",
        item.rule ? `迁移=${item.rule}` : "",
        item.avoid ? `边界=${item.avoid}` : ""
      ].filter(Boolean).join("；");
      return [head, body].filter(Boolean).join("：");
    })
    .filter(Boolean)
    .join("；");
  return text ? `参考图风格锚点：${text}` : "";
}

function buildUiAssetStyleLockSummary(analysis) {
  const normalizedButtonSpec = normalizeButtonMorphologyValue(analysis?.buttonSpec || analysis?.buttonMorphology);
  const parts = [
    formatUiAssetSection("参考图风格贴合目标", analysis?.styleFidelityTargets),
    formatUiAssetStyleAnchors(analysis?.referenceStyleAnchors),
    formatUiAssetComponentLibrary(analysis?.referenceComponentStyleLibrary),
    formatButtonMorphologySummary(normalizedButtonSpec),
    formatUiAssetSection("面板弹窗规则", analysis?.panelModalSpec),
    formatUiAssetSection("图标道具资源规则", analysis?.iconItemResourceSpec),
    formatUiAssetSection("设计 Token", analysis?.designTokens),
    analysis?.imagePrompts?.ui ? `UI控件英文提示词：${analysis.imagePrompts.ui}` : "",
    analysis?.antiGenericRules?.length ? `反通用规则：${analysis.antiGenericRules.join("；")}` : "",
    formatUiAssetSection("资产图风格锁定", analysis?.assetSheetStyleLocks)
  ].filter(Boolean);
  return parts.join("\n").slice(0, 1800);
}

function hasStrongUiAssetStyleAnchors(analysis) {
  if (!analysis) return false;
  const anchorCount = (analysis.referenceStyleAnchors || []).length + (analysis.referenceComponentStyleLibrary || []).length;
  const lockText = buildUiAssetStyleLockSummary(analysis);
  const hasNewSchemaUiRules = Boolean(
    analysis.buttonSpec
    || analysis.panelModalSpec
    || analysis.iconItemResourceSpec
    || analysis.designTokens
    || analysis.imagePrompts?.ui
  );
  if (hasNewSchemaUiRules && lockText.length >= 120) return true;
  return anchorCount >= 2 && lockText.length >= 120;
}

function buildUiAssetSheetPrompt(analysis, styleKeywords = "", styleTransferKeywords = "") {
  const brief = getPlanningDocument();
  const projectName = state.gameName || gameName.value || detectGameName(brief) || "未命名小游戏";
  const canvasSpec = getDesignCanvasSpec();
  return buildConciseUiAssetPrompt({
    projectName,
    platformText: getPlatformText($("#platform").value),
    canvasSpec,
    styleKeywords
  });
}

async function buildStyleTransferKeywordsForDesign(referenceImages, userKeywords, screen = getDesignScreen()) {
  const targetScreenId = screen?.id || "";
  if (!targetScreenId || targetScreenId === state.activeDesignScreen) {
    state.styleTransferKeywords = "";
  }
  if (!referenceImages.length) {
    return extractStyleAnalysisResult("", "");
  }

  const modelMeta = getDesignModelMeta(getSelectedDesignModel());
  if (!targetScreenId || targetScreenId === state.activeDesignScreen) {
    $("#designStatus").textContent = `正在分析参考图画风 · ${modelMeta.label}`;
  }

  let summaries = [];
  try {
    summaries = await analyzeReferenceImageMetrics(referenceImages);
  } catch (error) {
    summaries = [];
  }

  let analysisImages = referenceImages;
  try {
    analysisImages = await prepareStyleAnalysisImages(referenceImages);
  } catch (error) {
    analysisImages = referenceImages;
  }

  const localKeywords = "";
  const styleContext = buildStyleAnalysisContext(screen);
  let apiKeywords = "";
  try {
    apiKeywords = await generateStyleTransferKeywordsWithApi({ referenceImages: analysisImages, imageSummaries: summaries, userKeywords, localKeywords, styleContext });
  } catch (error) {
    apiKeywords = "";
  }

  let normalizedKeywords = extractStyleAnalysisResult(apiKeywords, "");
  if (apiKeywords && shouldRepairStyleAnalysisResult(normalizedKeywords)) {
    try {
      const repairedRaw = await repairStyleAnalysisJsonWithApi({
        rawContent: apiKeywords,
        userKeywords,
        localKeywords,
        imageSummaries: summaries,
        styleContext
      });
      const repairedKeywords = extractStyleAnalysisResult(repairedRaw, "", { parseSource: "repaired" });
      if (isStyleAnalysisResultBetter(repairedKeywords, normalizedKeywords)) {
        normalizedKeywords = repairedKeywords;
      }
    } catch (error) {
      // Keep the best locally parsed result when repair is unavailable.
    }
  }
  if (!targetScreenId || targetScreenId === state.activeDesignScreen) {
    state.styleTransferKeywords = normalizedKeywords.styleTransferKeywords;
    renderDesignPromptSummary();
  }
  return normalizedKeywords;
}

function buildStyleAnalysisContext(screen) {
  const gameDesign = getPlanningDocument();
  const interactionPlan = getVisualPlanText();
  const screenPlan = screen ? extractScreenSection(interactionPlan, screen) : "";
  const visualAnalysis = screen ? getVisualAnalysisSource(screen) : "";
  const screenSvg = screen ? getVisualSvgForScreen(screen) : "";
  const visualSvg = screenSvg
    ? screenSvg.replace(/\s+/g, " ").slice(0, 2400)
    : "";

  return {
    gameDesign: gameDesign.slice(0, 7000),
    interactionPlan: interactionPlan.slice(0, 6000),
    currentScreen: screen ? {
      id: screen.id,
      name: screen.name,
      kind: screen.kind,
      goal: screen.goal,
      closeBehavior: getScreenCloseBehavior(screen)
    } : null,
    currentScreenPlan: screenPlan.slice(0, 3000),
    visualStructure: [visualAnalysis, visualSvg].filter(Boolean).join("\n").slice(0, 3200),
    projectKeywords: getKeywords([gameDesign, interactionPlan, screenPlan].filter(Boolean).join("\n")).slice(0, 24)
  };
}

async function generateStyleTransferKeywordsWithApi({ referenceImages, imageSummaries, userKeywords, localKeywords, styleContext }) {
  if (window.location.protocol === "file:") return "";

  const preferredModels = Array.isArray(referenceImages) && referenceImages.length
    ? ["gpt-5.4", "gemini-2.5-pro"]
    : [getSelectedTextModel("interactionModel")];
  const models = [...new Set(preferredModels.filter(Boolean))];

  for (const model of models) {
    try {
      const response = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: "style-analysis",
          model,
          projectName: state.gameName || gameName.value || detectGameName(briefText.value.trim()) || "未命名小游戏",
          platform: getPlatformText($("#platform").value),
          styleKeywords: userKeywords,
          localKeywords,
          imageSummaries,
          referenceImages,
          gameDesign: styleContext?.gameDesign || "",
          interactionPlan: styleContext?.interactionPlan || "",
          currentScreen: styleContext?.currentScreen || null,
          currentScreenPlan: styleContext?.currentScreenPlan || "",
          visualStructure: styleContext?.visualStructure || "",
          projectKeywords: styleContext?.projectKeywords || []
        })
      });

      if (!response.ok) continue;
      const data = await response.json().catch(() => ({}));
      const content = data.content || data.plan || "";
      if (content) return content;
    } catch (error) {
      continue;
    }
  }

  return "";
}

async function repairStyleAnalysisJsonWithApi({ rawContent, userKeywords, localKeywords, imageSummaries, styleContext }) {
  const source = String(rawContent || "").trim();
  if (!source || window.location.protocol === "file:") return "";
  const response = await fetch("/api/generate-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      task: "style-analysis-json-repair",
      model: "gpt-5.2",
      projectName: state.gameName || gameName.value || detectGameName(briefText.value.trim()) || "未命名小游戏",
      platform: getPlatformText($("#platform").value),
      styleKeywords: userKeywords,
      localKeywords,
      imageSummaries,
      gameDesign: styleContext?.gameDesign || "",
      interactionPlan: styleContext?.interactionPlan || "",
      currentScreen: styleContext?.currentScreen || null,
      currentScreenPlan: styleContext?.currentScreenPlan || "",
      visualStructure: styleContext?.visualStructure || "",
      projectKeywords: styleContext?.projectKeywords || [],
      rawContent: source.slice(0, 14000)
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return "";
  return data.content || data.plan || "";
}

function shouldRepairStyleAnalysisResult(result) {
  if (!result || result.styleAnalysisCompleteness === "complete") return false;
  if (result.styleAnalysisCompleteness === "insufficient") return true;
  const hasStyle = Array.isArray(result.styleAnalysisSections) && result.styleAnalysisSections.length >= 5;
  const hasBackground = result.backgroundStyleSource === "analysis";
  const hasShape = result.shapeLanguageSource === "analysis";
  const hasButtonMorphology = result.buttonMorphologySource === "analysis";
  return !(hasStyle && hasBackground && hasShape && hasButtonMorphology);
}

function isStyleAnalysisResultBetter(candidate, current) {
  if (!candidate) return false;
  const score = (item) => {
    if (!item) return 0;
    return [
      item.styleAnalysisSource === "analysis" ? 3 : item.styleAnalysisSource === "fallback" ? 1 : 0,
      item.backgroundStyleSource === "analysis" ? 3 : item.backgroundStyleSource === "fallback" ? 1 : 0,
      item.shapeLanguageSource === "analysis" ? 3 : item.shapeLanguageSource === "fallback" ? 1 : 0,
      item.buttonMorphologySource === "analysis" ? 3 : item.buttonMorphologySource === "fallback" ? 1 : 0,
      item.styleAnalysisParseSource === "repaired" ? 1 : 0,
      Array.isArray(item.styleAnalysisSections) ? Math.min(item.styleAnalysisSections.length, 9) : 0
    ].reduce((sum, value) => sum + value, 0);
  };
  return score(candidate) > score(current);
}

async function prepareStyleAnalysisImages(referenceImages) {
  const results = [];
  for (const dataUrl of referenceImages.slice(0, DESIGN_REFERENCE_LIMIT)) {
    results.push(await downscaleImageDataUrl(dataUrl, { maxSide: 1200, quality: 0.82 }));
  }
  return results;
}

function downscaleImageDataUrl(dataUrl, { maxSide = 1200, quality = 0.82 } = {}) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(image.naturalWidth || 1, image.naturalHeight || 1));
      if (scale >= 1 && dataUrl.length <= 700000) {
        resolve(dataUrl);
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round((image.naturalWidth || 1) * scale));
      canvas.height = Math.max(1, Math.round((image.naturalHeight || 1) * scale));
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    image.onerror = () => resolve(dataUrl);
    image.src = dataUrl;
  });
}

function extractStyleAnalysisResult(raw, fallback, options = {}) {
  const parsedRaw = typeof raw === "string" ? parseJsonObjectFromText(raw) : raw;
  const parsed = normalizeStyleAnalysisParsedObject(parsedRaw);
  const parseSource = options.parseSource || "analysis";

  if (parsed && typeof parsed === "object") {
    const styleTransferKeywords = normalizeStyleTransferKeywords(parsed, "");
    const structuredAnalysis = buildStructuredStyleAnalysisSpec(parsed);
    const styleKeywordSummary = normalizeSummaryText(parsed.styleKeywords || parsed.keywords || "");
    const styleAnalysisSummary = formatStyleAnalysisSections(parsed.styleAnalysis);
    const styleAnalysisSections = extractStyleAnalysisSections(parsed.styleAnalysis);
    const backgroundStyleSummary = formatBackgroundStyleSummary(parsed.backgroundStyle);
    const shapeLanguageSummary = formatShapeLanguageSummary(parsed.shapeLanguage);
    const buttonMorphologySummary = formatButtonMorphologySummary(parsed.buttonMorphology);
    const backgroundPromptText = normalizePromptText(parsed.backgroundStyle?.promptText);
    const shapeLanguagePromptText = normalizePromptText(parsed.shapeLanguage?.promptText);
    const buttonMorphologyPromptText = normalizePromptText(parsed.buttonMorphology?.promptText || buttonMorphologySummary);
    const backgroundStyleSource = backgroundStyleSummary
      ? "analysis"
      : hasOwn.call(parsed, "backgroundStyle")
        ? "insufficient"
        : "missing";
    const shapeLanguageSource = shapeLanguageSummary
      ? "analysis"
      : hasOwn.call(parsed, "shapeLanguage")
        ? "insufficient"
        : "missing";
    const buttonMorphologyInsufficient = isButtonMorphologyInsufficient(parsed.buttonMorphology, buttonMorphologySummary);
    const buttonMorphologySource = buttonMorphologySummary && !buttonMorphologyInsufficient
      ? "analysis"
      : hasOwn.call(parsed, "buttonMorphology")
        ? "insufficient"
        : "missing";
    const backgroundStyleReason = resolveAnalysisFallbackReason("backgroundStyle", parsed.backgroundStyle, backgroundStyleSummary);
    const shapeLanguageReason = resolveAnalysisFallbackReason("shapeLanguage", parsed.shapeLanguage, shapeLanguageSummary);
    const buttonMorphologyReason = buttonMorphologyInsufficient
      ? "按钮圆角分析不足：只识别到普通圆角/长圆角描述，缺少圆角比例、角部位置或分段结构"
      : resolveAnalysisFallbackReason("buttonMorphology", parsed.buttonMorphology, buttonMorphologySummary);
    const hasStructuredStyleAnalysis = parsed.styleAnalysis && typeof parsed.styleAnalysis === "object";
    const styleAnalysisCompleteness = !hasStructuredStyleAnalysis && backgroundStyleSource !== "analysis" && shapeLanguageSource !== "analysis" && buttonMorphologySource !== "analysis"
      ? "insufficient"
      : hasStructuredStyleAnalysis && backgroundStyleSource === "analysis" && shapeLanguageSource === "analysis" && buttonMorphologySource === "analysis"
        ? "complete"
        : "partial";
    return {
      styleTransferKeywords,
      styleKeywordSummary,
      styleAnalysisSummary,
      styleAnalysisSections,
      styleAnalysisSource: hasStructuredStyleAnalysis && styleAnalysisSections.length ? "analysis" : hasStructuredStyleAnalysis ? "insufficient" : "missing",
      structuredAnalysis,
      backgroundStyleSummary,
      shapeLanguageSummary,
      buttonMorphologySummary,
      backgroundPromptText,
      shapeLanguagePromptText,
      buttonMorphologyPromptText,
      backgroundStyleSource,
      shapeLanguageSource,
      buttonMorphologySource,
      backgroundStyleReason,
      shapeLanguageReason,
      buttonMorphologyReason,
      styleAnalysisCompleteness,
      styleAnalysisParseSource: parseSource
    };
  }

  return {
    styleTransferKeywords: "",
    styleKeywordSummary: "",
    styleAnalysisSummary: "",
    styleAnalysisSections: [],
    styleAnalysisSource: "insufficient",
    structuredAnalysis: null,
    backgroundStyleSummary: "",
    shapeLanguageSummary: "",
    buttonMorphologySummary: "",
    backgroundPromptText: "",
    shapeLanguagePromptText: "",
    buttonMorphologyPromptText: "",
    backgroundStyleSource: "insufficient",
    shapeLanguageSource: "insufficient",
    buttonMorphologySource: "insufficient",
    backgroundStyleReason: "参考图背景分析响应不可解析；不会用默认背景规则补齐",
    shapeLanguageReason: "参考图点线面分析响应不可解析；不会用默认点线面规则补齐",
    buttonMorphologyReason: "参考图按钮形态分析响应不可解析，未锁定圆角比例和角部结构",
    styleAnalysisCompleteness: "insufficient",
    styleAnalysisParseSource: "insufficient"
  };
}

function normalizeStyleAnalysisParsedObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const parsed = { ...value };
  parsed.styleKeywords ||= parsed.keywords || parsed.keywordSummary || parsed.promptKeywords || "";
  parsed.styleAnalysis ||= parsed.analysis || parsed.style || parsed.styleSections || parsed.nineStyleAnalysis || parsed["九类风格分析"] || buildStyleAnalysisFromArtSpec(parsed);
  parsed.backgroundStyle = normalizeBackgroundStyleValue(
    parsed.backgroundStyle ?? parsed.backgroundSpec ?? parsed.background ?? parsed.bgStyle ?? parsed.backgroundRules ?? parsed.backgroundAnalysis ?? parsed["背景风格"] ?? parsed["背景分析"]
  );
  parsed.shapeLanguage = normalizeShapeLanguageValue(
    parsed.shapeLanguage ?? parsed.pointLinePlane ?? parsed.shape ?? parsed.shapeRules ?? parsed.shapeAnalysis ?? parsed["点线面"] ?? parsed["点线面分析"]
  );
  parsed.buttonMorphology = normalizeButtonMorphologyValue(
    parsed.buttonMorphology
      ?? parsed.buttonSpec
      ?? parsed.mainButtonMorphology
      ?? parsed.buttonShape
      ?? parsed.buttonShapeLanguage
      ?? parsed.buttonCornerProfile
      ?? parsed.buttonAnalysis
      ?? parsed.styleAnalysis?.buttonMorphology
      ?? parsed.styleAnalysis?.mainButtonMorphology
      ?? parsed["按钮形态"]
      ?? parsed["主按钮形态"]
      ?? parsed["按钮圆角"]
  );
  return parsed;
}

const STYLE_SPEC_FIELD_LABELS = {
  styleKeywords: "风格关键词",
  worldStyle: "世界观风格",
  mood: "整体气质",
  renderingMethod: "渲染方式",
  complexity: "复杂度",
  visualSymbols: "统一视觉符号",
  coreDescription: "核心描述",
  keyVisualFeatures: "关键视觉特征",
  easyToDrift: "容易跑偏",
  pointElements: "点元素",
  lineElements: "线元素",
  planeElements: "面元素",
  pointRole: "点作用",
  lineRole: "线作用",
  planeRole: "面作用",
  decorationVsInformation: "装饰/信息区分",
  contour: "轮廓语言",
  cornerRules: "圆角规则",
  cutRules: "切角/缺口",
  symmetry: "对称性",
  ornaments: "装饰",
  attachmentPositions: "装饰附着位置",
  ratioNotes: "比例说明",
  primary: "主色",
  secondary: "辅助色",
  background: "背景色",
  highlight: "高光色",
  shadow: "阴影色",
  functional: "功能色",
  rarity: "品质色",
  colorMood: "色彩情绪",
  ui: "UI",
  character: "角色",
  mainLightDirection: "主光方向",
  shadowStrength: "阴影强度",
  glowRules: "发光规则",
  contrast: "明暗对比",
  layerRelationship: "层级关系",
  sharedLightRule: "统一光源",
  danger: "危险按钮",
  small: "小按钮",
  icon: "图标按钮",
  close: "关闭按钮",
  tab: "标签页按钮",
  stateRules: "状态规则",
  panel: "面板",
  modal: "弹窗",
  card: "卡片",
  infoBox: "信息框",
  nineSliceRules: "9-slice 规则",
  icons: "图标",
  itemSlots: "道具格",
  resourceBars: "资源栏",
  title: "标题",
  body: "正文",
  number: "数字",
  buttonText: "按钮文字",
  textSafety: "文字安全区",
  space: "空间",
  perspective: "透视",
  depth: "层次",
  uiSafeAreas: "UI 安全区",
  material: "材质",
  focusControl: "焦点控制",
  sceneReplacementRule: "场景替换",
  proportions: "角色比例",
  face: "脸部风格",
  costume: "服装结构",
  materials: "角色材质",
  line: "线条",
  renderStyle: "渲染方式",
  pose: "姿态",
  copyAvoidance: "复制规避",
  colors: "颜色",
  corner: "圆角",
  border: "边框",
  glow: "发光",
  font: "字体",
  spacing: "间距",
  hex: "HEX",
  usage: "用途",
  ratio: "比例",
  type: "类型",
  sizeRatio: "尺寸比例",
  thicknessRatio: "线宽比例",
  positions: "位置",
  roles: "作用",
  shape: "形状",
  effect: "效果",
  layer: "层级",
  treatment: "处理"
};

function getStyleSpecFieldLabel(key) {
  return STYLE_SPEC_FIELD_LABELS[key] || key;
}

function isPlaceholderSpecText(text) {
  const value = String(text || "").trim();
  return !value
    || /^#RRGGBB$/i.test(value)
    || /^English prompt for\b/i.test(value)
    || /^10-20\s*个/.test(value)
    || /^必须覆盖的/.test(value);
}

function isMeaningfulSpecValue(value) {
  if (value == null) return false;
  if (typeof value === "string") return !isPlaceholderSpecText(cleanAnalysisText(value));
  if (typeof value === "number" || typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.some(isMeaningfulSpecValue);
  if (typeof value === "object") return Object.values(value).some(isMeaningfulSpecValue);
  return false;
}

function pickMeaningfulSpecValue(source, keys) {
  if (!source || typeof source !== "object") return undefined;
  for (const key of keys) {
    if (isMeaningfulSpecValue(source[key])) return source[key];
  }
  return undefined;
}

function formatColorSpecEntry(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const hex = cleanAnalysisText(value.hex || value.color || value.value || "");
  if (!hex || isPlaceholderSpecText(hex)) return "";
  const name = cleanAnalysisText(value.name || value.label || value.type || "");
  const usage = formatStructuredSpecValue(value.usage || value.role || value.scene || value.purpose);
  const ratio = formatStructuredSpecValue(value.ratio || value.proportion || value.approxRatio || value.percent || value.percentage);
  const note = formatStructuredSpecValue(value.note || value.description || value.effect || value.visibleEvidence || value.evidence);
  const head = [name, hex].filter(Boolean).join(" ");
  const detail = [usage, ratio ? `比例=${ratio}` : "", note].filter(Boolean).join("，");
  return [head, detail ? `（${detail}）` : ""].filter(Boolean).join("");
}

function formatStructuredSpecValue(value, options = {}) {
  const pairSeparator = options.pairSeparator || "；";
  const itemSeparator = options.itemSeparator || "、";
  if (!isMeaningfulSpecValue(value)) return "";
  if (typeof value === "string") return cleanAnalysisText(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value
      .map((item) => formatStructuredSpecValue(item, options))
      .filter(Boolean)
      .join(itemSeparator);
  }
  if (typeof value === "object") {
    const colorText = formatColorSpecEntry(value);
    if (colorText) return colorText;
    const entries = Object.entries(value)
      .map(([key, item]) => {
        const text = formatStructuredSpecValue(item, options);
        return text ? `${getStyleSpecFieldLabel(key)}=${text}` : "";
      })
      .filter(Boolean);
    if (entries.length) return entries.join(pairSeparator);
    return cleanAnalysisText(value.label || value.name || value.title || "");
  }
  return cleanAnalysisText(String(value));
}

function formatSpecLinesFromFields(source, fields) {
  if (!source || typeof source !== "object") return [];
  return fields
    .map(([label, ...keys]) => {
      const value = pickMeaningfulSpecValue(source, keys);
      const text = formatStructuredSpecValue(value);
      return text ? `${label}：${text}` : "";
    })
    .filter(Boolean);
}

function truncateSummaryText(value, maxChars = 260) {
  const text = cleanAnalysisText(value);
  if (!text || text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 1)).trim()}...`;
}

function normalizeSummaryLineForDedupe(value) {
  return cleanAnalysisText(value)
    .replace(/^(?:图|image)\s*\d+\s*[：:，,、-]?\s*/i, "")
    .replace(/^(?:色彩与比例|材质与描边|形状与装饰|光影与渲染|UI 迁移证据|背景迁移证据|角色迁移证据|三类资产共性|统一迁移规则|点元素|线元素|面元素|点线面总结|主按钮|次按钮|小按钮|图标按钮|关闭按钮|标签页按钮|状态规则|面板|弹窗|卡片|图标|道具格|资源栏)[：:]\s*/i, "")
    .replace(/[，,。；;：:\s]/g, "")
    .toLowerCase()
    .slice(0, 240);
}

function areSummaryLinesSimilar(a, b) {
  const first = normalizeSummaryLineForDedupe(a);
  const second = normalizeSummaryLineForDedupe(b);
  if (!first || !second) return false;
  if (first === second) return true;
  const minLength = Math.min(first.length, second.length);
  if (minLength < 24) return false;
  return first.includes(second.slice(0, Math.min(90, second.length)))
    || second.includes(first.slice(0, Math.min(90, first.length)));
}

function compactRepeatedSummarySegments(value, maxChars = 260) {
  const text = cleanAnalysisText(value);
  if (!text) return "";
  const segments = text.split(/[；;]/).map((item) => item.trim()).filter(Boolean);
  if (segments.length <= 1) return truncateSummaryText(text, maxChars);

  const kept = [];
  const seen = [];
  for (const segment of segments) {
    if (seen.some((item) => areSummaryLinesSimilar(item, segment))) continue;
    kept.push(segment);
    seen.push(segment);
    if (kept.length >= 4) break;
  }
  return truncateSummaryText(kept.join("；"), maxChars);
}

function cleanDirectStyleRuleForImagePrompt(value, maxChars = 420) {
  const text = cleanAnalysisText(value)
    .replace(/(?:图|参考图|image)\s*\d+\s*[：:，,、-]?\s*/gi, "")
    .replace(/（[^（）]*(?:人物|角色|帽子|斗篷|披风|衣物|服装|森林|树|树干|天空|云|月亮|草|花|建筑|房屋|道具|物品|头发|脸|皮肤|姿态|站姿|坐姿|手持|耳朵|尾巴|帆船|船帆|船头|船尾|船体|船舱|船桅|桅杆|甲板|扬帆|船|帆)[^（）]*）/g, "")
    .replace(/\([^()]*(?:人物|角色|帽子|斗篷|披风|衣物|服装|森林|树|树干|天空|云|月亮|草|花|建筑|房屋|道具|物品|头发|脸|皮肤|姿态|站姿|坐姿|手持|耳朵|尾巴|帆船|船帆|船头|船尾|船体|船舱|船桅|桅杆|甲板|扬帆|船|帆)[^()]*\)/g, "");
  if (!text) return "";
  const concreteObjectPattern = /人物|角色|帽子|斗篷|披风|衣物|服装|森林|树木?|树干|天空|云层?|月亮|草地?|花朵?|建筑|房屋|道具|物品|头发|脸部?|皮肤|姿态|站姿|坐姿|手持|耳朵|尾巴|身体|衣领|衣袖|裙|靴|帽檐|星空|灌木|河|山|门窗|屋顶|帆船|船帆|船头|船尾|船体|船舱|船桅|桅杆|甲板|扬帆|船只?|帆|sail|boat|ship|vessel|mast|deck|cabin/i;
  const abstractDesignPattern = /色彩|比例|明度|饱和|主色|辅色|背景色|高光|阴影|材质|颗粒|纹理|描边|圆角|斜切|缺口|轮廓|边缘|发光|光影|层级|留白|密度|面板|按钮|图标|资源栏|卡片|弹窗|字体|文字|装饰|节奏|对比|渐变|透明|半透明|压暗|提亮|边框|底板|容器|构图|焦点|透视|安全区/;
  const segments = text
    .split(/[；;。]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => abstractDesignPattern.test(item) && !concreteObjectPattern.test(item));
  if (!segments.length) {
    return abstractDesignPattern.test(text) && !concreteObjectPattern.test(text)
      ? compactRepeatedSummarySegments(text, maxChars)
      : "";
  }
  return compactRepeatedSummarySegments(segments.join("；"), maxChars);
}

function cleanTotalAssetStyleTextForImagePrompt(value, maxChars = 1200) {
  const text = cleanAnalysisText(value)
    .replace(/(?:图|参考图|image)\s*\d+\s*[：:，,、-]?\s*/gi, "")
    .replace(/（[^（）]*(?:帆船|船帆|船头|船尾|船体|船舱|船桅|桅杆|甲板|扬帆|船|帆|人物|角色|帽子|斗篷|披风|衣物|服装|森林|树|树干|天空|云|月亮|草|花|建筑|房屋|道具|物品|头发|脸|皮肤|姿态|站姿|坐姿|手持|耳朵|尾巴|landmark|building|ship|boat|sail|mast|deck|cabin|character|prop)[^（）]*）/gi, "")
    .replace(/\([^()]*(?:帆船|船帆|船头|船尾|船体|船舱|船桅|桅杆|甲板|扬帆|船|帆|人物|角色|帽子|斗篷|披风|衣物|服装|森林|树|树干|天空|云|月亮|草|花|建筑|房屋|道具|物品|头发|脸|皮肤|姿态|站姿|坐姿|手持|耳朵|尾巴|landmark|building|ship|boat|sail|mast|deck|cabin|character|prop)[^()]*\)/gi, "");
  if (!text) return "";
  const concreteObjectPattern = /帆船|船帆|船头|船尾|船体|船舱|船桅|桅杆|甲板|扬帆|船只?|帆|码头|港口|航海|人物|角色|帽子|斗篷|披风|衣物|服装|森林|树木?|树干|天空|云层?|月亮|草地?|花朵?|建筑|房屋|道具|物品|头发|脸部?|皮肤|姿态|站姿|坐姿|手持|耳朵|尾巴|身体|衣领|衣袖|裙|靴|帽檐|星空|灌木|河|山|门窗|屋顶|招牌|杯子|瓶子|食物|武器|徽章|landmark|building|house|roof|window|door|ship|boat|sail|mast|deck|cabin|vessel|harbor|dock|character|person|outfit|costume|hair|face|skin|prop|weapon|badge|food|bottle|cup/i;
  const abstractDesignPattern = /色彩|颜色|比例|明度|饱和|主色|辅色|背景色|高光|阴影|材质|颗粒|纹理|描边|圆角|斜切|缺口|轮廓|边缘|发光|光影|层级|留白|密度|面板|按钮|图标|资源栏|卡片|弹窗|字体|文字|装饰|节奏|对比|渐变|透明|半透明|压暗|提亮|边框|底板|容器|构图|焦点|透视|安全区|线条|线宽|粗细|厚度|边缘|切角|网点|噪点|氛围|冷暖|调性|统一|palette|ratio|color|material|texture|stroke|corner|outline|edge|glow|shadow|lighting|gradient|contrast|composition|density|rhythm|typography|ornament|shape|silhouette|depth|perspective|safe area/i;
  const cleanedSegments = text
    .split(/[\n；;。]+/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => segment
      .replace(concreteObjectPattern, "")
      .replace(/\s{2,}/g, " ")
      .replace(/[，,、；;：:]\s*([，,、；;：:])/g, "$1")
      .trim())
    .filter((segment) => segment && abstractDesignPattern.test(segment));
  if (cleanedSegments.length) {
    const kept = [];
    const seen = [];
    for (const segment of cleanedSegments) {
      if (seen.some((item) => areSummaryLinesSimilar(item, segment))) continue;
      const next = [...kept, segment].join("；");
      if (next.length > maxChars) break;
      kept.push(segment);
      seen.push(segment);
      if (kept.length >= 14) break;
    }
    return kept.join("；").slice(0, maxChars);
  }
  const stripped = text.replace(concreteObjectPattern, "").trim();
  return abstractDesignPattern.test(stripped)
    ? compactRepeatedSummarySegments(stripped, maxChars)
    : "";
}

function compactSummaryLines(lines, { maxLines = 4, maxChars = 260, seen = [] } = {}) {
  const output = [];
  const localSeen = [];
  const source = Array.isArray(lines) ? lines : [];
  for (const line of source) {
    const compactLine = compactRepeatedSummarySegments(line, maxChars);
    if (!compactLine) continue;
    const duplicate = [...seen, ...localSeen].some((item) => areSummaryLinesSimilar(item, compactLine));
    if (duplicate) continue;
    output.push(compactLine);
    localSeen.push(compactLine);
    if (output.length >= maxLines) break;
  }
  seen.push(...localSeen);
  return output;
}

function compactEvidenceProgressLines(lines, referenceCount = 0, retryCount = 0) {
  const source = Array.isArray(lines) ? lines.filter(Boolean) : [];
  if (!source.length) return referenceCount ? [`参考图数量：${referenceCount} 张`] : [];
  const progressRetryCount = source.filter((line) => /重试|retry/i.test(line)).length;
  const totalRetryCount = Math.max(Number(retryCount || 0), progressRetryCount);
  const statusLine = source.find((line) => /完成|complete|失败|failed|不足|insufficient|超时|timeout/i.test(line)) || source[source.length - 1];
  return [
    referenceCount ? `参考图数量：${referenceCount} 张` : "",
    statusLine ? `逐图取证：${truncateSummaryText(statusLine, 180)}` : "",
    totalRetryCount ? `模型重试：已重试 ${totalRetryCount} 次` : ""
  ].filter(Boolean);
}

function compactAnalysisBlocks(blocks, { maxLines = 4, maxChars = 260 } = {}) {
  const source = Array.isArray(blocks) ? blocks : [];
  const sharedSeen = [];
  let hasMergedStyleBlock = false;

  return source
    .map((block) => {
      if (!block) return null;
      const rawLines = Array.isArray(block.lines) ? block.lines : [];
      const title = String(block.title || "").trim();
      if (!rawLines.some(Boolean) && !(title === "逐图取证进度" && block.referenceCount)) return null;
      if (title === "参考图可见证据" && hasMergedStyleBlock) return null;

      const blockMaxLines = title === "逐图证据"
        ? 6
        : title === "逐图取证进度"
          ? 3
          : maxLines;
      const blockMaxChars = title === "逐图证据" ? 300 : maxChars;
      const lines = title === "逐图取证进度"
        ? compactEvidenceProgressLines(rawLines, block.referenceCount, block.retryCount)
        : compactSummaryLines(rawLines, {
          maxLines: blockMaxLines,
          maxChars: blockMaxChars,
          seen: sharedSeen
        });

      if (!lines.length) return null;
      if (title === "综合画风指纹") hasMergedStyleBlock = true;
      return { title, lines };
    })
    .filter(Boolean);
}

function joinSpecSummary(lines) {
  return lines.filter(Boolean).join("；");
}

function isLikelySchemaKeyOnlySummary(text) {
  const value = cleanAnalysisText(text);
  if (!value) return false;
  return /(primary|secondary|colorMood).*(functional|rarity)/
    .test(value)
    || /(pointElements|lineElements|planeElements).*(decorationVsInformation|summary)/
      .test(value)
    || /(mainLightDirection|shadowStrength|glowRules).*(sharedLightRule|layerRelationship)/
      .test(value)
    || /(worldStyle|renderingMethod|visualSymbols).*(easyToDrift|keyVisualFeatures)/
      .test(value)
    || /(primary|secondary|danger|small|icon|close|tab|stateRules).*(reward|locked)/
      .test(value);
}

function chooseAnalysisSummary(primary, fallback) {
  const primaryText = normalizeSummaryText(primary);
  if (primaryText && !isLikelySchemaKeyOnlySummary(primaryText)) return primaryText;
  return normalizeSummaryText(fallback);
}

function formatStyleDnaSummaryLines(value) {
  return formatSpecLinesFromFields(value, [
    ["世界观风格", "worldStyle"],
    ["整体气质", "mood"],
    ["渲染方式", "renderingMethod"],
    ["复杂度", "complexity"],
    ["统一视觉符号", "visualSymbols"],
    ["画风核心", "coreDescription"],
    ["关键视觉特征", "keyVisualFeatures"],
    ["最容易跑偏", "easyToDrift"]
  ]);
}

function formatStyleDnaSummary(value) {
  return joinSpecSummary(formatStyleDnaSummaryLines(value));
}

function formatColorSystemSummaryLines(value) {
  return formatSpecLinesFromFields(value, [
    ["主色", "primary"],
    ["辅助色", "secondary"],
    ["背景色", "background"],
    ["高光色", "highlight"],
    ["阴影色", "shadow"],
    ["功能色", "functional"],
    ["品质色", "rarity"],
    ["色彩情绪", "colorMood"]
  ]);
}

function formatColorSystemSummary(value) {
  return joinSpecSummary(formatColorSystemSummaryLines(value));
}

function formatPointLinePlaneSummaryLines(value) {
  return formatSpecLinesFromFields(value, [
    ["点元素", "pointElements"],
    ["线元素", "lineElements"],
    ["面元素", "planeElements"],
    ["点线面总结", "summary"]
  ]);
}

function formatPointLinePlaneSummary(value) {
  return joinSpecSummary(formatPointLinePlaneSummaryLines(value));
}

function formatShapeLanguageDetailedLines(value) {
  return formatSpecLinesFromFields(value, [
    ["轮廓语言", "contour"],
    ["圆角规则", "cornerRules", "cornerProfile"],
    ["斜切/缺口", "cutRules"],
    ["对称性", "symmetry"],
    ["装饰规则", "ornaments"],
    ["装饰位置", "attachmentPositions"],
    ["比例说明", "ratioNotes"],
    ["点线面提示", "promptText"]
  ]);
}

function formatMaterialRulesSummaryLines(value) {
  return formatSpecLinesFromFields(value, [
    ["UI 材质", "ui"],
    ["背景材质", "background"],
    ["角色材质", "character"]
  ]);
}

function formatMaterialRulesSummary(value) {
  return joinSpecSummary(formatMaterialRulesSummaryLines(value));
}

function formatLightingHierarchySummaryLines(value) {
  return formatSpecLinesFromFields(value, [
    ["主光源方向", "mainLightDirection"],
    ["阴影强度", "shadowStrength"],
    ["发光规则", "glowRules"],
    ["明暗对比", "contrast"],
    ["层级关系", "layerRelationship"],
    ["统一光源", "sharedLightRule"]
  ]);
}

function formatLightingHierarchySummary(value) {
  return joinSpecSummary(formatLightingHierarchySummaryLines(value));
}

function formatButtonSpecSummaryLines(value) {
  return formatSpecLinesFromFields(value, [
    ["主按钮", "primary"],
    ["次按钮", "secondary"],
    ["危险按钮", "danger"],
    ["小按钮", "small"],
    ["图标按钮", "icon"],
    ["关闭按钮", "close"],
    ["标签页按钮", "tab"],
    ["状态规则", "stateRules"]
  ]);
}

function formatButtonSpecSummary(value) {
  return joinSpecSummary(formatButtonSpecSummaryLines(value));
}

function formatPanelModalSpecSummaryLines(value) {
  return formatSpecLinesFromFields(value, [
    ["面板", "panel"],
    ["弹窗", "modal"],
    ["卡片", "card"],
    ["信息框", "infoBox"],
    ["9-slice", "nineSliceRules"],
    ["装饰/信息区分", "decorationVsInformation"]
  ]);
}

function formatPanelModalSpecSummary(value) {
  return joinSpecSummary(formatPanelModalSpecSummaryLines(value));
}

function formatIconItemResourceSpecSummaryLines(value) {
  return formatSpecLinesFromFields(value, [
    ["图标", "icons"],
    ["道具格", "itemSlots"],
    ["资源栏", "resourceBars"]
  ]);
}

function formatIconItemResourceSpecSummary(value) {
  return joinSpecSummary(formatIconItemResourceSpecSummaryLines(value));
}

function formatTypographySpecSummaryLines(value) {
  return formatSpecLinesFromFields(value, [
    ["标题字体", "title"],
    ["正文字体", "body"],
    ["数字字体", "number"],
    ["按钮文字", "buttonText"],
    ["文字安全区", "textSafety"]
  ]);
}

function formatTypographySpecSummary(value) {
  return joinSpecSummary(formatTypographySpecSummaryLines(value));
}

function formatBackgroundSpecSummaryLines(value) {
  return formatSpecLinesFromFields(value, [
    ["场景空间", "space", "sceneType"],
    ["透视方式", "perspective"],
    ["前中远景", "depth", "depthLayers"],
    ["UI 安全区", "uiSafeAreas", "uiSafetyRules"],
    ["背景材质", "material", "textureRules"],
    ["焦点控制", "focusControl"],
    ["场景替换规则", "sceneReplacementRule"]
  ]);
}

function formatBackgroundSpecSummary(value) {
  return joinSpecSummary(formatBackgroundSpecSummaryLines(value));
}

function formatCharacterSpecSummaryLines(value) {
  return formatSpecLinesFromFields(value, [
    ["角色比例", "proportions"],
    ["脸部风格", "face"],
    ["轮廓语言", "contour"],
    ["服装结构", "costume"],
    ["材质表现", "materials"],
    ["线条规则", "line"],
    ["渲染方式", "renderStyle"],
    ["姿态", "pose"],
    ["复制规避", "copyAvoidance"]
  ]);
}

function formatCharacterSpecSummary(value) {
  return joinSpecSummary(formatCharacterSpecSummaryLines(value));
}

function formatUnityRulesSummaryLines(value) {
  const text = formatStructuredSpecValue(value);
  return text ? [text] : [];
}

function formatDesignTokensSummaryLines(value) {
  return formatSpecLinesFromFields(value, [
    ["颜色 token", "colors"],
    ["圆角 token", "corner"],
    ["边框 token", "border"],
    ["阴影 token", "shadow"],
    ["发光 token", "glow"],
    ["材质 token", "material"],
    ["字体 token", "font"],
    ["间距 token", "spacing"]
  ]);
}

function formatImagePromptsSummaryLines(value) {
  return formatSpecLinesFromFields(value, [
    ["UI asset prompt", "ui"],
    ["Background prompt", "background"],
    ["Character prompt", "character"]
  ]);
}

function formatNegativePromptsSummaryLines(value) {
  const text = formatStructuredSpecValue(value);
  return text ? [text] : [];
}

function formatReferenceEvidenceSetSummaryLines(value) {
  const entries = normalizeReferenceEvidenceSet(value);
  return entries.map((entry) => {
    const text = joinSpecSummary([
      formatStructuredSpecValue(entry.paletteAndRatio),
      formatStructuredSpecValue(entry.materialAndStroke),
      formatStructuredSpecValue(entry.shapeAndOrnament),
      formatStructuredSpecValue(entry.lightingAndRendering),
      formatStructuredSpecValue(entry.uiEvidence),
      formatStructuredSpecValue(entry.backgroundEvidence),
      formatStructuredSpecValue(entry.characterEvidence)
    ]);
    const missing = normalizeSummaryText(entry.missingEvidence);
    return `${entry.label || `图${entry.index || "?"}`}：${compactRepeatedSummarySegments(text || missing || "未提取到可展示证据", 300)}`;
  });
}

function formatMergedStyleEvidenceSummaryLines(value) {
  return formatSpecLinesFromFields(value, [
    ["色彩与比例", "paletteAndRatio"],
    ["材质与描边", "materialAndStroke"],
    ["形状与装饰", "shapeAndOrnament"],
    ["光影与渲染", "lightingAndRendering"],
    ["UI 迁移证据", "uiEvidence"],
    ["背景迁移证据", "backgroundEvidence"],
    ["角色迁移证据", "characterEvidence"],
    ["统一迁移规则", "transferableRules"]
  ]);
}

function normalizeStructuredStyleAnalysisForDisplay(value) {
  if (!value || typeof value !== "object") return null;
  const normalized = normalizeTotalAssetAnalysis(value) || value;
  return isMeaningfulSpecValue(normalized) ? normalized : null;
}

function buildStructuredStyleAnalysisSpec(parsed) {
  if (!parsed || typeof parsed !== "object") return null;
  const spec = {
    analysisStatus: parsed.analysisStatus || parsed.status,
    analysisSource: parsed.analysisSource || parsed.source,
    missingEvidence: parsed.missingEvidence || parsed.missing || parsed.missingFields,
    localValidationMissing: parsed.localValidationMissing || parsed.strictValidationMissing,
    localValidationWarnings: parsed.localValidationWarnings || parsed.softValidationWarnings || parsed.extrapolationWarnings,
    missingVisualDNA: parsed.missingVisualDNA || parsed.missingVisualDna || parsed.visualDnaMissing,
    missingExactComponentReference: parsed.missingExactComponentReference || parsed.missingExactReferences || parsed.missingExactComponentRefs,
    referenceImageCount: parsed.referenceImageCount || parsed.referenceCount,
    originalReferenceImageCount: parsed.originalReferenceImageCount || parsed.totalReferenceImageCount || parsed.sentReferenceImageCount,
    referenceEvidenceSet: parsed.referenceEvidenceSet || parsed.referenceEvidences || parsed.perImageEvidence,
    usableEvidenceSet: parsed.usableEvidenceSet || parsed.usableReferenceEvidenceSet,
    skippedEvidenceSet: parsed.skippedEvidenceSet || parsed.skippedReferenceEvidenceSet || parsed.ignoredReferenceEvidenceSet,
    evidenceProgress: parsed.evidenceProgress || parsed.referenceEvidenceProgress,
    mergedStyleEvidence: parsed.mergedStyleEvidence || parsed.mergedEvidence || parsed.styleEvidence,
    evidenceConflicts: parsed.evidenceConflicts || parsed.conflicts || parsed.styleConflicts,
    evidenceAttemptErrors: parsed.evidenceAttemptErrors || parsed.attemptErrors,
    styleExtrapolationRules: parsed.styleExtrapolationRules || parsed.extrapolationRules || parsed.styleExtrapolations,
    directTransferTargets: parsed.directTransferTargets || parsed.transferTargets || parsed.directTargets,
    extrapolatedTargets: parsed.extrapolatedTargets || parsed.extrapolationTargets || parsed.indirectTargets,
    referenceEvidence: parsed.referenceEvidence || parsed.evidence,
    styleKeywords: parsed.styleKeywords || parsed.keywords || parsed["风格关键词"],
    styleDNA: parsed.styleDNA || parsed.styleDna || parsed.dna,
    pointLinePlane: parsed.pointLinePlane || parsed.shapeLanguage?.pointLinePlane,
    shapeLanguage: parsed.shapeLanguage,
    colorSystem: parsed.colorSystem || parsed.palette,
    materialRules: parsed.materialRules,
    lightingHierarchy: parsed.lightingHierarchy || parsed.lighting,
    buttonSpec: parsed.buttonSpec || parsed.buttonMorphology,
    panelModalSpec: parsed.panelModalSpec || parsed.panelSpec,
    iconItemResourceSpec: parsed.iconItemResourceSpec || parsed.iconSpec,
    typographySpec: parsed.typographySpec || parsed.typography,
    backgroundSpec: parsed.backgroundSpec || parsed.backgroundStyle,
    characterSpec: parsed.characterSpec,
    unityRules: parsed.unityRules || parsed.unity,
    designTokens: parsed.designTokens,
    projectContext: parsed.projectContext,
    assetRequirements: parsed.assetRequirements || parsed.componentDemand,
    uiAssetCoverage: parsed.uiAssetCoverage || parsed.coverage,
    imagePrompts: parsed.imagePrompts,
    negativePrompts: parsed.negativePrompts || parsed.negativeKeywords
  };
  return normalizeStructuredStyleAnalysisForDisplay(spec);
}

function buildStructuredStyleDetailBlocks(analysis) {
  const spec = normalizeStructuredStyleAnalysisForDisplay(analysis);
  if (!spec) return [];
  const retryCount = normalizeSummaryTextList(spec.evidenceAttemptErrors).length;
  const mergedStyleLines = [
    ...formatMergedStyleEvidenceSummaryLines(spec.mergedStyleEvidence),
    ...formatSpecLinesFromFields(spec.referenceEvidence, [
      ["色彩与比例", "paletteAndRatio"],
      ["材质与描边", "materialAndStroke"],
      ["形状与装饰", "shapeAndOrnament"],
      ["光影与渲染", "lightingAndRendering"],
      ["三类资产共性", "uiBackgroundCharacter"]
    ])
  ];
  const referenceVisibleLines = mergedStyleLines.length
    ? []
    : formatSpecLinesFromFields(spec.referenceEvidence, [
      ["色彩与比例", "paletteAndRatio"],
      ["材质与描边", "materialAndStroke"],
      ["形状与装饰", "shapeAndOrnament"],
      ["光影与渲染", "lightingAndRendering"],
      ["三类资产共性", "uiBackgroundCharacter"]
    ]);
  const blocks = [
    ["逐图取证进度", formatEvidenceProgressLines(spec.evidenceProgress), spec.referenceImageCount, retryCount],
    ["逐图证据", formatReferenceEvidenceSetSummaryLines(spec.referenceEvidenceSet)],
    ["综合画风指纹", mergedStyleLines],
    ["多图冲突/缺失", [
      ...normalizeSummaryTextList(spec.evidenceConflicts),
      ...normalizeSummaryTextList(spec.missingEvidence)
    ]],
    ["严格校验失败项", [
      ...normalizeSummaryTextList(spec.missingVisualDNA),
      ...normalizeSummaryTextList(spec.localValidationMissing)
    ]],
    ["可外推项", [
      ...normalizeSummaryTextList(spec.missingExactComponentReference),
      ...normalizeSummaryTextList(spec.extrapolatedTargets),
      ...normalizeStyleExtrapolationRules(spec.styleExtrapolationRules).map(formatStyleExtrapolationRule),
      ...normalizeSummaryTextList(spec.localValidationWarnings)
    ]],
    ["直接迁移目标", normalizeSummaryTextList(spec.directTransferTargets)],
    ["需求章节未匹配", normalizeSummaryTextList(spec.projectContext?.missingInteractionSections || spec.assetRequirements?.missingInteractionSections)],
    ["UI资产必需组件", normalizeRequiredUiAssetComponents(spec.assetRequirements?.uiRequiredComponents || [])
      .map((item) => `${item.label}（${item.type}，${item.sourceScreen || "交互案"}）`)],
    ["UI资产缺失", normalizeRequiredUiAssetComponents(spec.uiAssetCoverage?.missing || [])
      .map((item) => `${item.label}（${item.type}，来源：${item.sourceScreen || "交互案"}）`)],
    ["UI资产基准待确认", normalizeRequiredUiAssetComponents(spec.uiAssetCoverage?.unconfirmed || [])
      .map((item) => `${item.label}（${item.type}，来源：${item.sourceScreen || "交互案"}）`)],
    ["资产需求", formatSpecLinesFromFields(spec.assetRequirements, [
      ["UI 控件需求", "ui"],
      ["UI 必需组件", "uiRequiredComponents"],
      ["背景需求", "background"],
      ["角色需求", "character"]
    ])],
    ["参考图可见证据", referenceVisibleLines],
    ["画风 DNA", formatStyleDnaSummaryLines(spec.styleDNA)],
    ["色彩系统", formatColorSystemSummaryLines(spec.colorSystem)],
    ["材质规则", formatMaterialRulesSummaryLines(spec.materialRules)],
    ["点线面规则", [
      ...formatPointLinePlaneSummaryLines(spec.pointLinePlane),
      ...formatShapeLanguageDetailedLines(spec.shapeLanguage)
    ]],
    ["光影层级", formatLightingHierarchySummaryLines(spec.lightingHierarchy)],
    ["按钮规格", formatButtonSpecSummaryLines(spec.buttonSpec)],
    ["面板与弹窗", formatPanelModalSpecSummaryLines(spec.panelModalSpec)],
    ["图标/道具格/资源栏", formatIconItemResourceSpecSummaryLines(spec.iconItemResourceSpec)],
    ["字体与文字安全", formatTypographySpecSummaryLines(spec.typographySpec)],
    ["背景规格", formatBackgroundSpecSummaryLines(spec.backgroundSpec)],
    ["角色规格", formatCharacterSpecSummaryLines(spec.characterSpec)],
    ["统一性规则", formatUnityRulesSummaryLines(spec.unityRules)],
    ["设计 Token", formatDesignTokensSummaryLines(spec.designTokens)]
  ];
  return blocks
    .map(([title, lines, referenceCount, retryCountValue]) => ({ title, lines: lines.filter(Boolean), referenceCount, retryCount: retryCountValue }))
    .filter((block) => block.lines.length || (block.title === "逐图取证进度" && block.referenceCount));
}

function buildTotalAssetVisibleAnalysisBlocks(type, analysis) {
  const spec = normalizeStructuredStyleAnalysisForDisplay(analysis);
  if (!spec) return [{
    title: "分析结果",
    lines: ["缺少可展示的参考图风格分析结果"]
  }];
  const retryCount = normalizeSummaryTextList(spec.evidenceAttemptErrors).length;
  const mergedStyleLines = [
    ...formatMergedStyleEvidenceSummaryLines(spec.mergedStyleEvidence),
    ...formatSpecLinesFromFields(spec.referenceEvidence, [
      ["色彩与比例", "paletteAndRatio"],
      ["材质与描边", "materialAndStroke"],
      ["形状与装饰", "shapeAndOrnament"],
      ["光影与渲染", "lightingAndRendering"],
      ["三类资产共性", "uiBackgroundCharacter"]
    ])
  ];
  const referenceVisibleLines = mergedStyleLines.length
    ? []
    : formatSpecLinesFromFields(spec.referenceEvidence, [
      ["色彩与比例", "paletteAndRatio"],
      ["材质与描边", "materialAndStroke"],
      ["形状与装饰", "shapeAndOrnament"],
      ["光影与渲染", "lightingAndRendering"],
      ["三类资产共性", "uiBackgroundCharacter"]
    ]);
  const shared = [
    ["逐图取证进度", formatEvidenceProgressLines(spec.evidenceProgress), spec.referenceImageCount, retryCount],
    ["逐图证据", formatReferenceEvidenceSetSummaryLines(spec.referenceEvidenceSet)],
    ["综合画风指纹", mergedStyleLines],
    ["多图冲突/缺失", [
      ...normalizeSummaryTextList(spec.evidenceConflicts),
      ...normalizeSummaryTextList(spec.missingEvidence)
    ]],
    ["严格校验失败项", [
      ...normalizeSummaryTextList(spec.missingVisualDNA),
      ...normalizeSummaryTextList(spec.localValidationMissing)
    ]],
    ["可外推项", [
      ...normalizeSummaryTextList(spec.missingExactComponentReference),
      ...normalizeSummaryTextList(spec.extrapolatedTargets),
      ...normalizeStyleExtrapolationRules(spec.styleExtrapolationRules).map(formatStyleExtrapolationRule),
      ...normalizeSummaryTextList(spec.localValidationWarnings)
    ]],
    ["直接迁移目标", normalizeSummaryTextList(spec.directTransferTargets)],
    ["参考图可见证据", referenceVisibleLines],
    ["画风 DNA", formatStyleDnaSummaryLines(spec.styleDNA)],
    ["色彩系统", formatColorSystemSummaryLines(spec.colorSystem)],
    ["材质规则", formatMaterialRulesSummaryLines(spec.materialRules)],
    ["光影层级", formatLightingHierarchySummaryLines(spec.lightingHierarchy)],
    ["点线面与形状", [
      ...formatPointLinePlaneSummaryLines(spec.pointLinePlane),
      ...formatShapeLanguageDetailedLines(spec.shapeLanguage)
    ]]
  ];
  const byType = {
    ui: [
      ["按钮规格", formatButtonSpecSummaryLines(spec.buttonSpec)],
      ["面板与弹窗", formatPanelModalSpecSummaryLines(spec.panelModalSpec)],
      ["图标/道具格/资源栏", formatIconItemResourceSpecSummaryLines(spec.iconItemResourceSpec)],
      ["字体与文字安全", formatTypographySpecSummaryLines(spec.typographySpec)]
    ],
    background: [
      ["背景规格", formatBackgroundSpecSummaryLines(spec.backgroundSpec)]
    ],
    character: [
      ["角色规格", formatCharacterSpecSummaryLines(spec.characterSpec)]
    ]
  };
  const validation = validateStrictStyleEvidence(spec);
  return [
    ...shared,
    ...(byType[type] || byType.ui),
    ["统一性规则", formatUnityRulesSummaryLines(spec.unityRules)],
    validation.ok ? ["严格校验", ["参考图风格证据充足，可用于生成总资产"]] : ["严格校验缺失项", validation.missing]
  ]
    .map(([title, lines, referenceCount, retryCountValue]) => ({ title, lines: lines.filter(Boolean), referenceCount, retryCount: retryCountValue }))
    .filter((block) => block.lines.length || (block.title === "逐图取证进度" && block.referenceCount));
}

function renderAnalysisBlocksHtml(blocks) {
  return compactAnalysisBlocks(blocks)
    .map((block) => `
      <section class="summary-detail-block">
        <h4>${escapeHtml(block.title)}</h4>
        <div class="summary-detail-list">
          ${block.lines.filter(Boolean).map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
        </div>
      </section>
    `)
    .join("");
}

function buildStyleAnalysisFromArtSpec(parsed) {
  if (!parsed || typeof parsed !== "object") return null;
  const hasSpec = parsed.styleDNA
    || parsed.pointLinePlane
    || parsed.colorSystem
    || parsed.materialRules
    || parsed.lightingHierarchy
    || parsed.buttonSpec
    || parsed.panelModalSpec
    || parsed.iconItemResourceSpec
    || parsed.typographySpec
    || parsed.backgroundSpec
    || parsed.characterSpec;
  if (!hasSpec) return null;
  return {
    overallStyle: formatStyleDnaSummary(parsed.styleDNA),
    colorAnalysis: formatColorSystemSummary(parsed.colorSystem),
    materialTexture: formatMaterialRulesSummary(parsed.materialRules),
    layoutComposition: joinSpecSummary([
      formatPointLinePlaneSummary(parsed.pointLinePlane),
      joinSpecSummary(formatShapeLanguageDetailedLines(parsed.shapeLanguage))
    ]),
    iconDesign: formatIconItemResourceSpecSummary(parsed.iconItemResourceSpec),
    buttonsComponents: joinSpecSummary([
      formatButtonSpecSummary(parsed.buttonSpec),
      formatPanelModalSpecSummary(parsed.panelModalSpec)
    ]),
    typography: formatTypographySpecSummary(parsed.typographySpec),
    decorativeElements: joinSpecSummary(formatUnityRulesSummaryLines(parsed.unityRules)),
    lightingAtmosphere: formatLightingHierarchySummary(parsed.lightingHierarchy)
  };
}

function joinAnalysisSummaryParts(parts) {
  return parts.map(normalizeSummaryText).filter(Boolean).join("；");
}

function getPointLinePlaneSummaryText(value) {
  if (!value || typeof value !== "object") return "";
  const summary = value.summary && typeof value.summary === "object" ? value.summary : null;
  if (!summary) return normalizeSummaryText(value.summary);
  return joinAnalysisSummaryParts([
    summary.pointRole ? `点元素作用=${summary.pointRole}` : "",
    summary.lineRole ? `线元素作用=${summary.lineRole}` : "",
    summary.planeRole ? `面元素作用=${summary.planeRole}` : "",
    summary.decorationVsInformation ? `装饰与信息区分=${summary.decorationVsInformation}` : ""
  ]);
}

function normalizeBackgroundStyleValue(value) {
  if (value == null || value === "") return undefined;
  if (typeof value === "object" && !Array.isArray(value)) {
    const promptText = value.promptText || value.prompt || value.summary || value.description || value["提示词"] || joinAnalysisSummaryParts([
      value.space ? `空间=${value.space}` : "",
      value.perspective ? `透视=${value.perspective}` : "",
      value.focusControl ? `焦点控制=${value.focusControl}` : "",
      value.sceneReplacementRule ? `场景替换=${value.sceneReplacementRule}` : ""
    ]);
    return {
      ...value,
      sceneType: value.sceneType || value.type || value.backgroundType || value.space || value["背景类型"] || "",
      perspective: value.perspective || value.view || value.camera || value["透视"] || "",
      depthLayers: value.depthLayers || value.depth || value.layers || value.spatialLayers || value["背景层次"] || value["层次"],
      textureRules: value.textureRules || value.texture || value.material || value.materialRules || value["背景材质"] || value["材质"],
      decorativeMotifs: value.decorativeMotifs || value.decorations || value.motifs || value["背景装饰"] || value["装饰"],
      lightingMood: value.lightingMood || value.lighting || value.mood || value["光影氛围"] || value["氛围"],
      avoidRules: value.avoidRules || value.avoid || value.negativeRules || value["避免"],
      uiSafetyRules: value.uiSafetyRules || value.uiSafeAreas || value.safetyRules || value.readabilityRules || value["UI安全规则"] || value["可读性规则"],
      focusControl: value.focusControl || value.focus || value.visualFocus || value["焦点控制"] || "",
      sceneReplacementRule: value.sceneReplacementRule || value.replacementRule || value.copyAvoidance || value["场景替换规则"] || "",
      promptText
    };
  }
  const text = normalizeSummaryText(value);
  return text ? { textureRules: [text], promptText: text } : undefined;
}

function normalizeShapeLanguageValue(value) {
  if (value == null || value === "") return undefined;
  if (typeof value === "object" && !Array.isArray(value)) {
    const pointLineSummary = getPointLinePlaneSummaryText(value);
    const promptText = value.promptText || value.prompt || value.description || value["提示词"] || pointLineSummary;
    return {
      ...value,
      pointElements: value.pointElements || value.points || value.point || value["点元素"] || value["点"],
      lineElements: value.lineElements || value.lines || value.line || value["线元素"] || value["线"],
      planeElements: value.planeElements || value.planes || value.plane || value.surfaceElements || value["面元素"] || value["面"],
      proportionGuidance: value.proportionGuidance || value.proportion || value.ratio || value.balance || pointLineSummary || value["比例"] || value["主次关系"],
      panelWeightRules: value.panelWeightRules || value.panelWeight || value.panelRules || value["面板重量"] || value["面板规则"],
      transparencyRules: value.transparencyRules || value.transparency || value.opacityRules || value["透明度"],
      edgeTreatmentRules: value.edgeTreatmentRules || value.edgeRules || value.borderRules || value["边缘处理"] || value["描边规则"],
      avoidRules: value.avoidRules || value.avoid || value.negativeRules || value["避免"],
      promptText
    };
  }
  const text = normalizeSummaryText(value);
  return text ? { proportionGuidance: [text], promptText: text } : undefined;
}

function getButtonSpecEntries(value) {
  if (!value || typeof value !== "object") return [];
  const labels = {
    primary: "主按钮",
    secondary: "次按钮",
    danger: "危险按钮",
    small: "小按钮",
    icon: "图标按钮",
    close: "关闭按钮",
    tab: "标签页按钮"
  };
  return Object.entries(labels)
    .map(([key, label]) => [key, label, value[key]])
    .filter(([, , spec]) => spec && typeof spec === "object");
}

function summarizeButtonSpecEntries(value) {
  return getButtonSpecEntries(value)
    .map(([, label, spec]) => `${label}：${normalizeSummaryText(spec)}`)
    .filter(Boolean);
}

function summarizeButtonStateRules(value) {
  const stateRules = value?.stateRules || value?.states || value?.stateVariants;
  if (!stateRules || typeof stateRules !== "object") return [];
  return Object.entries(stateRules)
    .map(([key, item]) => `${key}=${normalizeSummaryText(item)}`)
    .filter((item) => item && !item.endsWith("="));
}

function normalizeButtonMorphologyValue(value) {
  if (value == null || value === "") return undefined;
  if (typeof value === "object" && !Array.isArray(value)) {
    const buttonSpecSummaries = summarizeButtonSpecEntries(value);
    const buttonStateSummaries = summarizeButtonStateRules(value);
    const cornerSummaries = buttonSpecSummaries.filter((item) => /圆角|corner|radius|斜切|切角|缺口|角部/i.test(item));
    const structureSummaries = buttonSpecSummaries.filter((item) => /结构|分段|图标腔|文字区|角标|slot|segment/i.test(item));
    const edgeSummaries = buttonSpecSummaries.filter((item) => /描边|边框|边缘|border|stroke|切角/i.test(item));
    const materialSummaries = buttonSpecSummaries.filter((item) => /材质|高光|阴影|渐变|texture|material|shadow|highlight/i.test(item));
    const promptText = value.promptText || value.prompt || value.summary || value.description || value["提示词"] || joinAnalysisSummaryParts([
      ...buttonSpecSummaries.slice(0, 4),
      buttonStateSummaries.length ? `状态=${buttonStateSummaries.join("；")}` : ""
    ]);
    return {
      ...value,
      silhouette: value.silhouette || value.outline || value.shape || value.form || (buttonSpecSummaries.length ? buttonSpecSummaries : undefined) || value["整体外轮廓"] || value["外轮廓"] || value["形态"],
      cornerProfile: value.cornerProfile || value.corner || value.cornerRules || value.cornerRadius || value.radiusRatio || value.radiusProfile || value.roundness || (cornerSummaries.length ? cornerSummaries : undefined) || value["圆角细节"] || value["圆角"] || value["角部处理"],
      segmentation: value.segmentation || value.structure || value.composition || value.sections || (structureSummaries.length ? structureSummaries : undefined) || value["分段结构"] || value["结构"],
      edgeProfile: value.edgeProfile || value.edge || value.border || value.stroke || value.cutCorner || (edgeSummaries.length ? edgeSummaries : undefined) || value["边缘处理"] || value["描边"] || value["切角"],
      materialLayers: value.materialLayers || value.material || value.buttonFace || value.layers || value.texture || (materialSummaries.length ? materialSummaries : undefined) || value["材质层"] || value["材质"],
      ornamentSlots: value.ornamentSlots || value.ornaments || value.badges || value.decorationSlots || value["装饰槽位"] || value["角标"],
      stateVariants: value.stateVariants || value.states || value.variants || (buttonStateSummaries.length ? buttonStateSummaries : undefined) || value["状态变体"] || value["状态"],
      negativeSimplifications: value.negativeSimplifications || value.avoid || value.avoidRules || value["禁止简化"] || value["避免"],
      promptText
    };
  }
  const text = normalizeSummaryText(value);
  return text ? { silhouette: [text], promptText: text } : undefined;
}

function normalizeSummaryText(value) {
  if (value == null) return "";
  if (typeof value === "string") return cleanAnalysisText(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((item) => normalizeSummaryText(item)).filter(Boolean).join("、");
  if (typeof value === "object") {
    const structuredText = typeof formatStructuredSpecValue === "function" ? formatStructuredSpecValue(value) : "";
    if (structuredText) return structuredText;
    if (typeof value.label === "string") return cleanAnalysisText(value.label);
    if (typeof value.name === "string") return cleanAnalysisText(value.name);
    if (typeof value.title === "string") return cleanAnalysisText(value.title);
    try {
      return cleanAnalysisText(JSON.stringify(value));
    } catch {
      return "";
    }
  }
  return cleanAnalysisText(String(value));
}

function normalizeSummaryTextList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => normalizeSummaryText(item)).filter(Boolean);
}

function resolveAnalysisFallbackReason(kind, rawValue, summary) {
  if (summary) return "";
  const label = kind === "shapeLanguage"
    ? "点线面分析"
    : kind === "buttonMorphology"
      ? "按钮形态分析"
      : "背景分析";
  if (typeof rawValue === "undefined") {
    return `后端未返回 ${kind}，${label}缺失；不会用默认规则补齐`;
  }
  if (!rawValue || typeof rawValue !== "object") {
    return `${kind} 结构不完整，${label}缺失；不会用默认规则补齐`;
  }
  const returnedFields = Object.keys(rawValue).filter(Boolean).slice(0, 8).join("、") || "无可用字段";
  return `${label}分析字段不足（已返回：${returnedFields}），缺少可展示的结构化规则`;
}

function normalizeStyleTransferKeywords(raw, fallback) {
  const text = String(raw || "").trim();
  if (!text) return fallback || "";

  const parsed = typeof raw === "object" && raw ? raw : parseJsonObjectFromText(text);
  if (parsed) {
    const styleParsed = normalizeStyleAnalysisParsedObject(parsed) || parsed;
    const buttonMorphologySummary = formatButtonMorphologySummary(styleParsed.buttonMorphology);
    const parts = [
      normalizeSummaryText(styleParsed.styleKeywords || styleParsed.keywords || ""),
      formatStyleAnalysisSections(styleParsed.styleAnalysis),
      Array.isArray(parsed.palette) && parsed.palette.length ? `参考图主色：${parsed.palette.map((item) => normalizeSummaryText(item)).filter(Boolean).join("、")}` : "",
      Array.isArray(parsed.styleRules) && parsed.styleRules.length ? `迁移规则：${parsed.styleRules.map((item) => normalizeSummaryText(item)).filter(Boolean).join("；")}` : "",
      Array.isArray(parsed.themeBoundElements) && parsed.themeBoundElements.length ? `不可迁移的参考图主题元素：${parsed.themeBoundElements.map((item) => normalizeSummaryText(item)).filter(Boolean).join("、")}` : "",
      Array.isArray(parsed.replacementThemeElements) && parsed.replacementThemeElements.length ? `本项目替换主题元素：${parsed.replacementThemeElements.map((item) => normalizeSummaryText(item)).filter(Boolean).join("、")}` : "",
      Array.isArray(parsed.elementReplacementRules) && parsed.elementReplacementRules.length ? `主题元素替换规则：${parsed.elementReplacementRules.map((item) => normalizeSummaryText(item)).filter(Boolean).join("；")}` : "",
      formatBackgroundStyleSummary(styleParsed.backgroundStyle),
      formatShapeLanguageSummary(styleParsed.shapeLanguage),
      buttonMorphologySummary && !isButtonMorphologyInsufficient(styleParsed.buttonMorphology, buttonMorphologySummary) ? buttonMorphologySummary : "",
      parsed.negativeKeywords ? `避免：${normalizeSummaryText(parsed.negativeKeywords)}` : ""
    ].filter(Boolean);
    if (parts.length) return parts.join("；").slice(0, 4200);
  }

  return text.replace(/^```(?:json)?|```$/g, "").trim().slice(0, 4200);
}

function formatStyleAnalysisSections(styleAnalysis) {
  const sections = extractStyleAnalysisSections(styleAnalysis);
  return sections.length ? `参考图九类分析：${sections.join("；")}` : "";
}

function extractStyleAnalysisSections(styleAnalysis) {
  if (!styleAnalysis || typeof styleAnalysis !== "object") return [];

  return [
    ["整体画风定位", styleAnalysis.overallStyle],
    ["色彩分析", styleAnalysis.colorAnalysis],
    ["材质与质感分析", styleAnalysis.materialTexture],
    ["版式与构图分析", styleAnalysis.layoutComposition],
    ["图标设计分析", styleAnalysis.iconDesign],
    ["按钮与组件分析", styleAnalysis.buttonsComponents],
    ["文字与字体风格分析", styleAnalysis.typography],
    ["装饰元素分析", styleAnalysis.decorativeElements],
    ["光影与氛围分析", styleAnalysis.lightingAtmosphere]
  ]
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}：${normalizeSummaryText(value)}`)
    .filter((item) => item && !item.endsWith("："));
}

function formatBackgroundStyleSummary(backgroundStyle) {
  if (!backgroundStyle) return "";
  if (typeof backgroundStyle !== "object") return normalizeSummaryText(backgroundStyle);
  const parts = [
    backgroundStyle.sceneType ? `背景类型：${cleanAnalysisText(backgroundStyle.sceneType)}` : "",
    backgroundStyle.perspective ? `背景透视：${cleanAnalysisText(backgroundStyle.perspective)}` : "",
    normalizeAnalysisList(backgroundStyle.depthLayers).length ? `背景层次：${normalizeAnalysisList(backgroundStyle.depthLayers).join("；")}` : "",
    normalizeAnalysisList(backgroundStyle.textureRules).length ? `背景材质：${normalizeAnalysisList(backgroundStyle.textureRules).join("；")}` : "",
    normalizeAnalysisList(backgroundStyle.decorativeMotifs).length ? `背景装饰：${normalizeAnalysisList(backgroundStyle.decorativeMotifs).join("；")}` : "",
    normalizeAnalysisList(backgroundStyle.uiSafetyRules).length ? `背景安全规则：${normalizeAnalysisList(backgroundStyle.uiSafetyRules).join("；")}` : "",
    backgroundStyle.focusControl ? `背景焦点控制：${cleanAnalysisText(backgroundStyle.focusControl)}` : "",
    backgroundStyle.sceneReplacementRule ? `场景替换规则：${cleanAnalysisText(backgroundStyle.sceneReplacementRule)}` : "",
    !normalizeAnalysisList(backgroundStyle.textureRules).length && backgroundStyle.promptText ? `背景提示：${cleanAnalysisText(backgroundStyle.promptText)}` : ""
  ].filter(Boolean);
  return parts.length ? parts.join("；") : normalizeSummaryText(backgroundStyle).slice(0, 1200);
}

function formatShapeLanguageSummary(shapeLanguage) {
  if (!shapeLanguage) return "";
  if (typeof shapeLanguage !== "object") return normalizeSummaryText(shapeLanguage);
  const parts = [
    normalizeAnalysisList(shapeLanguage.pointElements).length ? `点元素观察：${normalizeAnalysisList(shapeLanguage.pointElements).join("；")}` : "",
    normalizeAnalysisList(shapeLanguage.lineElements).length ? `线元素观察：${normalizeAnalysisList(shapeLanguage.lineElements).join("；")}` : "",
    normalizeAnalysisList(shapeLanguage.planeElements).length ? `面元素观察：${normalizeAnalysisList(shapeLanguage.planeElements).join("；")}` : "",
    normalizeAnalysisList(shapeLanguage.proportionGuidance).length ? `参考图点线面主次：${normalizeAnalysisList(shapeLanguage.proportionGuidance).join("；")}` : "",
    normalizeAnalysisList(shapeLanguage.panelWeightRules).length ? `面板重量观察：${normalizeAnalysisList(shapeLanguage.panelWeightRules).join("；")}` : "",
    normalizeAnalysisList(shapeLanguage.avoidRules).length ? `应避免：${normalizeAnalysisList(shapeLanguage.avoidRules).join("；")}` : "",
    !normalizeAnalysisList(shapeLanguage.proportionGuidance).length && shapeLanguage.promptText ? `点线面提示：${cleanAnalysisText(shapeLanguage.promptText)}` : ""
  ].filter(Boolean);
  return parts.length ? parts.join("；") : normalizeSummaryText(shapeLanguage).slice(0, 1200);
}

function formatButtonMorphologySummary(buttonMorphology) {
  if (!buttonMorphology) return "";
  if (typeof buttonMorphology !== "object") return normalizeSummaryText(buttonMorphology);
  const parts = [
    normalizeAnalysisList(buttonMorphology.silhouette).length ? `外轮廓：${normalizeAnalysisList(buttonMorphology.silhouette).join("；")}` : "",
    normalizeAnalysisList(buttonMorphology.cornerProfile).length ? `圆角与角部处理：${normalizeAnalysisList(buttonMorphology.cornerProfile).join("；")}` : "",
    normalizeAnalysisList(buttonMorphology.segmentation).length ? `分段结构：${normalizeAnalysisList(buttonMorphology.segmentation).join("；")}` : "",
    normalizeAnalysisList(buttonMorphology.edgeProfile).length ? `边缘与描边：${normalizeAnalysisList(buttonMorphology.edgeProfile).join("；")}` : "",
    normalizeAnalysisList(buttonMorphology.materialLayers).length ? `材质层：${normalizeAnalysisList(buttonMorphology.materialLayers).join("；")}` : "",
    normalizeAnalysisList(buttonMorphology.ornamentSlots).length ? `装饰插槽：${normalizeAnalysisList(buttonMorphology.ornamentSlots).join("；")}` : "",
    normalizeAnalysisList(buttonMorphology.stateVariants).length ? `状态差异：${normalizeAnalysisList(buttonMorphology.stateVariants).join("；")}` : "",
    normalizeAnalysisList(buttonMorphology.negativeSimplifications).length ? `禁止简化：${normalizeAnalysisList(buttonMorphology.negativeSimplifications).join("；")}` : "",
    !normalizeAnalysisList(buttonMorphology.cornerProfile).length && buttonMorphology.promptText ? `按钮形态提示：${cleanAnalysisText(buttonMorphology.promptText)}` : ""
  ].filter(Boolean);
  return parts.length ? parts.join("；") : normalizeSummaryText(buttonMorphology).slice(0, 1200);
}

function isButtonMorphologyInsufficient(buttonMorphology, summary) {
  const text = normalizeSummaryText(summary || buttonMorphology?.promptText || "");
  if (!text) return false;
  const hasCornerDetail = normalizeAnalysisList(buttonMorphology?.cornerProfile).length > 0;
  const hasStructureDetail = [
    buttonMorphology?.segmentation,
    buttonMorphology?.edgeProfile,
    buttonMorphology?.materialLayers,
    buttonMorphology?.ornamentSlots,
    buttonMorphology?.stateVariants
  ].some((value) => normalizeAnalysisList(value).length > 0);
  const hasRadiusGrade = /micro|small|medium|large|pill|极小圆角|小圆角|中圆角|大圆角|胶囊|硬边/i.test(text);
  const hasCornerPosition = /左|右|上|下|顶部|底部|角部|角标|斜切|切角|缺口|凸起|图标腔|分段|内外边|描边|插槽/.test(text);
  const isGenericRound = /普通.{0,6}圆角|长圆角矩形|圆角矩形|圆角按钮|胶囊按钮/.test(text);
  if (isGenericRound && (!hasCornerDetail || !hasStructureDetail) && !hasRadiusGrade && !hasCornerPosition) return true;
  if (text.length < 24 && /圆角|按钮/.test(text) && (!hasCornerDetail || !hasStructureDetail)) return true;
  return false;
}

function normalizePromptText(value) {
  return cleanAnalysisText(value || "").slice(0, 280);
}

function getDesignCompositionSummary(screen, composition, { gameDesignReady = false, interactionReady = false } = {}) {
  if (!screen) {
    return {
      status: "idle",
      summary: "未选择目标界面"
    };
  }
  if (composition) {
    if (composition.fallback) {
      return {
        status: "ready",
        summary: `使用保守组件裁剪：必需组件 ${(composition.requiredComponents || []).length} 个，禁止组件 ${(composition.forbiddenComponents || []).length} 个${composition.fallbackReason ? `；${composition.fallbackReason}` : ""}`
      };
    }
    return {
      status: "ready",
      summary: `已分析：必需组件 ${(composition.requiredComponents || []).length} 个，禁止组件 ${(composition.forbiddenComponents || []).length} 个，可选组件 ${(composition.optionalComponents || []).length} 个`
    };
  }
  if (!gameDesignReady || !interactionReady) {
    return {
      status: "blocked",
      summary: "等待策划案和交互案完成后生成当前界面组件裁剪"
    };
  }
  return {
    status: "missing",
    summary: "当前界面组件裁剪未生成"
  };
}

function buildFallbackBackgroundStyleSummary() {
  return "";
}

function buildFallbackShapeLanguageSummary() {
  return "";
}

function buildFallbackBackgroundPromptText() {
  return "";
}

function buildFallbackShapeLanguagePromptText() {
  return "";
}

function buildFallbackStyleAnalysisSummary(fallbackKeywords) {
  const safeFallback = normalizeSummaryText(fallbackKeywords);
  return safeFallback ? `参考图风格迁移摘要：${safeFallback}` : "";
}

async function analyzeReferenceImageMetrics(referenceImages) {
  const results = [];
  for (let index = 0; index < referenceImages.length; index += 1) {
    results.push(await analyzeReferenceImageMetric(referenceImages[index], index));
  }
  return results;
}

function analyzeReferenceImageMetric(dataUrl, index) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const size = 72;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(image, 0, 0, size, size);
      const pixels = context.getImageData(0, 0, size, size).data;
      const colors = new Map();
      const luminances = [];
      let rTotal = 0;
      let gTotal = 0;
      let bTotal = 0;
      let saturationTotal = 0;
      let count = 0;
      let edgeHits = 0;

      for (let offset = 0; offset < pixels.length; offset += 4) {
        if (pixels[offset + 3] < 24) continue;
        const r = pixels[offset];
        const g = pixels[offset + 1];
        const b = pixels[offset + 2];
        const hsl = rgbToHsl(r, g, b);
        const luminance = getRelativeLuminance(r, g, b);
        const key = `${Math.round(r / 32) * 32},${Math.round(g / 32) * 32},${Math.round(b / 32) * 32}`;
        colors.set(key, (colors.get(key) || 0) + 1);
        luminances.push(luminance);
        rTotal += r;
        gTotal += g;
        bTotal += b;
        saturationTotal += hsl.s;
        count += 1;
      }

      for (let y = 1; y < size; y += 1) {
        for (let x = 1; x < size; x += 1) {
          const current = ((y * size) + x) * 4;
          const left = ((y * size) + x - 1) * 4;
          const top = (((y - 1) * size) + x) * 4;
          const currentLum = getRelativeLuminance(pixels[current], pixels[current + 1], pixels[current + 2]);
          const leftLum = getRelativeLuminance(pixels[left], pixels[left + 1], pixels[left + 2]);
          const topLum = getRelativeLuminance(pixels[top], pixels[top + 1], pixels[top + 2]);
          if (Math.abs(currentLum - leftLum) > 0.18 || Math.abs(currentLum - topLum) > 0.18) edgeHits += 1;
        }
      }

      const avg = {
        r: Math.round(rTotal / Math.max(count, 1)),
        g: Math.round(gTotal / Math.max(count, 1)),
        b: Math.round(bTotal / Math.max(count, 1))
      };
      const brightness = luminances.reduce((sum, item) => sum + item, 0) / Math.max(luminances.length, 1);
      const variance = luminances.reduce((sum, item) => sum + ((item - brightness) ** 2), 0) / Math.max(luminances.length, 1);
      const saturation = saturationTotal / Math.max(count, 1);
      const contrast = Math.sqrt(variance);
      const edgeDensity = edgeHits / Math.max((size - 1) * (size - 1), 1);
      const palette = Array.from(colors.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([key]) => {
          const [r, g, b] = key.split(",").map((value) => Math.max(0, Math.min(255, Number(value))));
          return rgbToHex(r, g, b);
        });

      resolve({
        label: `图${index + 1}`,
        width: image.naturalWidth,
        height: image.naturalHeight,
        averageColor: rgbToHex(avg.r, avg.g, avg.b),
        palette,
        brightness: Number(brightness.toFixed(3)),
        saturation: Number(saturation.toFixed(3)),
        contrast: Number(contrast.toFixed(3)),
        edgeDensity: Number(edgeDensity.toFixed(3)),
        descriptors: buildImageMetricDescriptors({ avg, brightness, saturation, contrast, edgeDensity })
      });
    };
    image.onerror = () => reject(new Error("reference image failed to load"));
    image.src = dataUrl;
  });
}

function buildImageMetricDescriptors({ avg, brightness, saturation, contrast, edgeDensity }) {
  const hue = rgbToHsl(avg.r, avg.g, avg.b).h;
  const tone = hue < 28 || hue >= 330 ? "偏暖红橙色调"
    : hue < 70 ? "暖黄木质色调"
      : hue < 165 ? "自然绿/青绿色调"
        : hue < 245 ? "冷蓝青色调"
          : hue < 300 ? "紫蓝幻想色调"
            : "粉紫梦幻色调";

  return [
    tone,
    brightness > 0.68 ? "高明度" : brightness < 0.34 ? "低明度" : "中明度",
    saturation > 0.52 ? "高饱和" : saturation < 0.22 ? "低饱和" : "中等饱和",
    contrast > 0.28 ? "高对比光影" : contrast < 0.14 ? "柔和低对比" : "适中对比",
    edgeDensity > 0.26 ? "细节密集、边缘清晰" : edgeDensity < 0.12 ? "大色块、留白感强" : "细节适中"
  ];
}

function buildLocalStyleTransferKeywords(summaries, userKeywords) {
  const valid = Array.isArray(summaries) ? summaries.filter(Boolean) : [];
  if (!valid.length) {
    return userKeywords ? `用户画风关键词：${userKeywords}` : "";
  }

  const palette = [...new Set(valid.flatMap((item) => item.palette || []).slice(0, 10))];

  return [
    userKeywords ? `用户画风关键词：${userKeywords}` : "",
    "参考图本地指标只用于校验基础色彩，不根据颜色摘要推断题材、角色、场景或原始布局",
    palette.length ? `参考图主色板：${palette.join("、")}` : "",
    "重点迁移：面板材质、按钮质感、图标渲染、描边与投影、光影层次、信息密度、整体商业游戏UI精度",
    "背景规则：背景要吸收参考图的材质、层次、轻装饰和光影，不使用单一纯色铺底，同时保证资源栏、按钮、标题和正文可读",
    "点线面规则：用细线、浅面、半透明、点状节奏和留白替代厚重块面；信息型界面尤其减少多个大矩形卡片的叠加",
    "限制：只迁移画风，不复制参考图中的具体文字、角色、商品、场景或原始布局",
    "主题元素规则：参考图中的角色、道具、徽章、货币符号和装饰语义不要迁移；图标对象必须来自当前策划案、交互案或当前界面"
  ].filter(Boolean).join("；");
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b].map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0")).join("")}`;
}

function getRelativeLuminance(r, g, b) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function rgbToHsl(r, g, b) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case red:
        h = ((green - blue) / d + (green < blue ? 6 : 0)) * 60;
        break;
      case green:
        h = ((blue - red) / d + 2) * 60;
        break;
      default:
        h = ((red - green) / d + 4) * 60;
    }
  }

  return { h, s, l };
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error(`无法读取参考图：${file.name}`));
    reader.readAsDataURL(file);
  });
}

function getStoredDesignCompositionAnalysis(screen) {
  if (!screen || !state.designCompositionAnalyses || typeof state.designCompositionAnalyses !== "object") return null;
  return state.designCompositionAnalyses[screen.id] || null;
}

async function ensureDesignCompositionAnalysis(screen, { force = true, timeoutMs = getDesignCompositionAnalysisTimeoutMs(), useModel = false } = {}) {
  if (!screen) throw new Error("界面组件分析失败：缺少目标界面。");
  const existing = getStoredDesignCompositionAnalysis(screen);
  if (existing && !force && existing.analysisSource === "interaction-plan-local") return existing;

  if (!useModel) {
    const localAnalysis = buildInteractionPlanDesignCompositionAnalysis(screen);
    state.designCompositionAnalyses[screen.id] = localAnalysis;
    return localAnalysis;
  }

  let raw = "";
  let fallbackReason = "";
  try {
    raw = await generateDesignCompositionAnalysisWithApi(screen, { timeoutMs });
  } catch (error) {
    if (isDesignCompositionInputError(error)) throw error;
    fallbackReason = error?.message || "界面组件分析失败";
  }

  let analysis = fallbackReason ? null : normalizeDesignCompositionAnalysis(raw, screen);
  if (!analysis && !fallbackReason) {
    const job = state.designJobs?.[screen.id];
    if (job?.status === "generating") {
      job.phase = "修复界面组件分析 JSON 中...";
      syncDesignGenerateButtonState();
    }
    try {
      const repairedRaw = await repairDesignCompositionAnalysisWithApi(screen, raw);
      analysis = normalizeDesignCompositionAnalysis(repairedRaw, screen);
      if (analysis) {
        analysis.repaired = true;
        analysis.rawResponseExcerpt = getTextExcerpt(raw, 500);
      } else {
        fallbackReason = `界面组件分析 JSON 修复后仍无效${getTextExcerpt(raw, 180) ? `：${getTextExcerpt(raw, 180)}` : ""}`;
      }
    } catch (error) {
      if (isDesignCompositionInputError(error)) throw error;
      fallbackReason = error?.message || "界面组件分析 JSON 修复失败";
    }
  }

  if (!analysis) {
    const normalizedReason = normalizeDesignCompositionFallbackReason(fallbackReason || "界面组件分析未返回有效 JSON");
    analysis = buildFallbackDesignCompositionAnalysis(screen, normalizedReason);
  }

  state.designCompositionAnalyses[screen.id] = analysis;
  return analysis;
}

function isDesignCompositionInputError(error) {
  const message = String(error?.message || "");
  return /缺少完整策划案|缺少交互设计方案|缺少目标界面|file:\/\/|请通过 http/i.test(message);
}

function normalizeDesignCompositionFallbackReason(reason = "") {
  const text = String(reason || "").trim();
  if (/Failed to fetch|NetworkError|Load failed|Network request failed/i.test(text)) {
    return "组件分析请求中断，已使用保守组件裁剪继续";
  }
  if (/超时|timeout/i.test(text)) {
    return text || "组件裁剪分析超时，已使用保守规则继续";
  }
  return text || "界面组件分析未返回有效 JSON，已使用保守规则继续";
}

function createCompositionItem(name, type, reason, source = "本地保守裁剪", priority = "") {
  return {
    name: cleanAnalysisText(name),
    type: cleanAnalysisText(type),
    reason: cleanAnalysisText(reason),
    source: cleanAnalysisText(source),
    priority: cleanAnalysisText(priority)
  };
}

function addUniqueCompositionItem(list, item) {
  if (!item?.name && !item?.reason) return;
  const key = `${item.name}|${item.type}`.toLowerCase();
  if (list.some((existing) => `${existing.name}|${existing.type}`.toLowerCase() === key)) return;
  list.push(item);
}

function isExcludedImagePromptSectionHeading(line) {
  const heading = String(line || "")
    .replace(/^#{1,6}\s*/, "")
    .replace(/^\s*[-*]\s*/, "")
    .replace(/^\s*\d+(?:\.\d+)*[、.)]?\s*/, "")
    .trim();
  if (!heading || heading.length > 80) return false;
  return /异常状态|异常处理|错误处理|网络失败|失败处理|Figma\s*交付|Figma交付|交付建议|交付清单|程序关注点/i.test(heading);
}

function stripScreenDesignPromptNoise(section) {
  const lines = String(section || "").replace(/\r/g, "").split("\n");
  const kept = [];
  let skipping = false;
  const excludedLinePattern = /异常状态|异常处理|错误处理|网络失败|失败处理|Figma\s*交付|Figma交付|交付清单|交付建议|程序关注点/i;
  lines.forEach((line) => {
    const trimmed = line.trim();
    const headingLike = /^#{1,6}\s/.test(trimmed)
      || /^\d+(?:\.\d+)*[、.)]?\s*\S+/.test(trimmed)
      || /^[一二三四五六七八九十]+[、.)]\s*\S+/.test(trimmed);
    if (isExcludedImagePromptSectionHeading(trimmed)) {
      skipping = true;
      return;
    }
    if (skipping && headingLike) {
      skipping = false;
    }
    if (skipping) return;
    if (excludedLinePattern.test(trimmed)) return;
    kept.push(line);
  });
  return kept.join("\n").trim();
}

function normalizeScreenPromptLine(line) {
  const trimmed = String(line || "").trim();
  if (!trimmed) return "";
  if (/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(trimmed)) return "";
  if (/^\|.*\|$/.test(trimmed)) {
    const cells = trimmed
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean);
    return cells.join("：");
  }
  return trimmed
    .replace(/^#{1,6}\s*/, "")
    .replace(/^\s*[-*]\s*/, "")
    .replace(/^\s*\d+(?:\.\d+)*[、.)]?\s*/, "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .trim();
}

function mapScreenPromptFieldBucket(title = "") {
  const normalized = normalizeLabel(title);
  if (!normalized) return "";
  if (/页面目标|界面目标|界面用途|页面用途|目标|用途|定位/.test(normalized)) return "goal";
  if (/布局结构|界面结构|布局|结构|区域/.test(normalized)) return "layout";
  if (/关键交互|交互要点|核心操作|操作路径|入口来源|入口/.test(normalized)) return "actions";
  if (/状态反馈|状态说明|状态与异常|异常状态|关键状态|状态/.test(normalized)) return "states";
  if (/按钮层级|文案|文字|标题|副标题|tab|标签|筛选|资源名|奖励名|栏目|区块标题|页签/.test(normalized)) return "texts";
  return "";
}

function collectScreenFieldFacts(section, bucket = "", limit = 4) {
  const lines = String(section || "").replace(/\r/g, "").split("\n");
  const picked = [];
  let currentBucket = "";
  lines.forEach((line) => {
    const title = getInteractionSubsectionHeadingTitle(line);
    if (title) {
      currentBucket = mapScreenPromptFieldBucket(title);
      return;
    }
    if (currentBucket !== bucket || picked.length >= limit) return;
    const normalized = normalizeScreenPromptLine(line);
    if (!normalized || picked.includes(normalized)) return;
    if (/异常状态|异常处理|错误处理|网络失败|Figma|交付建议|程序关注点/i.test(normalized)) return;
    picked.push(normalized);
  });
  return picked;
}

function isAllowedUiTextCandidate(token = "") {
  const text = cleanAnalysisText(String(token || "")
    .replace(/^[“"「『【(（]+/, "")
    .replace(/[”"」』】)）]+$/, "")
    .replace(/^[：:、,，;；\-—\s]+/, "")
    .replace(/[：:、,，;；\-—\s]+$/, ""));
  if (!text || text.length > 18) return false;
  if (/[。！？.!?]/.test(text)) return false;
  if (/页面目标|界面目标|页面定位|界面定位|页面用途|界面用途|布局结构|界面结构|核心组件|关键操作|状态反馈|异常状态|交付建议|程序关注点|模块职责|流程描述|设计建议/i.test(text)) return false;
  if (/玩家|点击|进入|用于|需要|建议|参考|表现|展示|承载|负责|用于|说明|状态|流程|异常|系统入口|无关入口|核心功能/i.test(text)) return false;
  return /[\u4e00-\u9fa5A-Za-z0-9]/.test(text);
}

function extractAllowedUiTextsFromLine(line = "") {
  const results = [];
  const normalized = normalizeScreenPromptLine(line);
  if (!normalized) return results;
  const matches = normalized.match(/[“"「『]([^”"」』]{1,18})[”"」』]/g) || [];
  matches.forEach((item) => {
    const candidate = item.slice(1, -1).trim();
    if (isAllowedUiTextCandidate(candidate)) results.push(candidate);
  });
  const splitSource = normalized.includes("：") ? normalized.split(/：/).slice(1).join("：") : "";
  if (splitSource) {
    splitSource
      .split(/[、,，/｜|；;]+/)
      .map((item) => item.trim())
      .forEach((item) => {
        if (isAllowedUiTextCandidate(item)) results.push(item);
      });
  }
  return results;
}

function extractAllowedScreenUiTexts(section = "", screen = null) {
  const lines = String(section || "").replace(/\r/g, "").split("\n");
  const picked = [];
  let currentBucket = "";
  lines.forEach((line) => {
    const title = getInteractionSubsectionHeadingTitle(line);
    if (title) {
      currentBucket = mapScreenPromptFieldBucket(title);
      return;
    }
    if (currentBucket !== "texts") return;
    extractAllowedUiTextsFromLine(line).forEach((item) => {
      if (!picked.includes(item)) picked.push(item);
    });
  });
  const screenName = cleanAnalysisText(screen?.name || "");
  if (screenName && isAllowedUiTextCandidate(screenName) && !picked.includes(screenName)) {
    picked.unshift(screenName);
  }
  return picked.slice(0, 12);
}

function collectScreenPromptFacts(lines, pattern, limit = 4) {
  const picked = [];
  lines.forEach((line) => {
    if (picked.length >= limit) return;
    if (pattern.test(line) && !picked.includes(line)) picked.push(line);
  });
  return picked;
}

function joinPromptFacts(facts, fallback = "按当前界面章节执行，不添加其他界面内容。") {
  return facts.length ? facts.join("；") : fallback;
}

function getScreenDesignPromptSection(screen) {
  const plan = getVisualPlanText();
  const raw = extractScreenSection(plan, screen)
    || buildScreenSection(screen, 1, getSelectedDepth(), getGenreReferenceProfile(getPlanningDocument()));
  return stripScreenDesignPromptNoise(raw);
}

function summarizeScreenSectionForImagePrompt(section, screen, composition = null) {
  const cleaned = stripScreenDesignPromptNoise(section);
  const lines = cleaned
    .split("\n")
    .map(normalizeScreenPromptLine)
    .filter((line) => line && line.length > 1)
    .filter((line, index, list) => list.indexOf(line) === index);
  const normalizedComposition = normalizeDesignCompositionAnalysis(composition || getStoredDesignCompositionAnalysis(screen), screen);
  const closeBehavior = formatScreenCloseBehaviorForPrompt(screen, "按当前界面章节判断，不默认添加返回/关闭/主页控件。");
  const goal = collectScreenFieldFacts(cleaned, "goal", 2).length
    ? collectScreenFieldFacts(cleaned, "goal", 2)
    : collectScreenPromptFacts(lines, /目标|定位|用途|核心|页面|界面/i, 2);
  const layout = normalizedComposition?.layoutSlots?.length
    ? normalizedComposition.layoutSlots.slice(0, 4).map((item) => item.name).filter(Boolean)
    : collectScreenFieldFacts(cleaned, "layout", 4).length
      ? collectScreenFieldFacts(cleaned, "layout", 4)
      : collectScreenPromptFacts(lines, /布局|结构|区域|顶部|中部|底部|左侧|右侧|主内容|安全区|面板/i, 4);
  const components = normalizedComposition?.requiredComponents?.length
    ? normalizedComposition.requiredComponents.slice(0, 6).map((item) => item.name).filter(Boolean)
    : collectScreenPromptFacts(lines, /组件|按钮|卡片|列表|Tab|标签|资源|标题|入口|弹窗|面板|导航|图标|进度|状态/i, 5);
  const actions = normalizedComposition?.primaryActions?.length
    ? normalizedComposition.primaryActions.slice(0, 5).map((item) => item.name).filter(Boolean)
    : collectScreenFieldFacts(cleaned, "actions", 4).length
      ? collectScreenFieldFacts(cleaned, "actions", 4)
      : collectScreenPromptFacts(lines, /点击|进入|切换|选择|领取|购买|拖拽|返回|关闭|确认|查看|跳转|操作|展示/i, 4);
  const states = normalizedComposition?.stateWidgets?.length
    ? normalizedComposition.stateWidgets.slice(0, 4).map((item) => item.name).filter(Boolean)
    : collectScreenFieldFacts(cleaned, "states", 3).length
      ? collectScreenFieldFacts(cleaned, "states", 3)
      : collectScreenPromptFacts(lines, /状态反馈|状态|选中|默认|禁用|锁定|未解锁|红点|角标|进度|倒计时|完成|可领取/i, 3);
  const allowedTexts = extractAllowedScreenUiTexts(cleaned, screen);
  const forbidden = isNoNavigationCloseBehavior(closeBehavior)
    ? "禁止出现返回按钮、关闭按钮、主页按钮；禁止带入其他界面入口、异常处理说明和 Figma 交付内容。"
    : "只允许当前章节和关闭方式要求的导航/关闭控件；禁止带入其他界面入口、异常处理说明和 Figma 交付内容。";
  return [
    `界面目标：${joinPromptFacts(goal, screen?.goal || `${screen?.name || "当前界面"}核心功能`)}`,
    `布局结构：${joinPromptFacts(layout)}`,
    `必须出现组件：${joinPromptFacts(components)}`,
    `关键操作：${joinPromptFacts(actions)}`,
    `必要状态：${joinPromptFacts(states, "只绘制当前界面正常可见状态和必要反馈，不展开异常处理流程。")}`,
    `允许出现的界面文案：${allowedTexts.length ? allowedTexts.join("、") : "仅保留交互案中明确写死的页面标题、按钮字、Tab名、奖励名、资源名和状态短标签；未明确写出的句子不要上屏。"}`,
    `关闭方式：${closeBehavior}`,
    `禁止出现：${forbidden}`
  ].join("\n").slice(0, 1200);
}

function buildInteractionPlanDesignCompositionAnalysis(screen) {
  const plan = getVisualPlanText();
  const rawScreenPlan = extractScreenSection(plan, screen) || "";
  if (!rawScreenPlan.trim()) {
    return buildFallbackDesignCompositionAnalysis(screen, "未匹配到交互案当前界面段落，已使用保守组件裁剪继续");
  }
  const screenPlan = stripScreenDesignPromptNoise(rawScreenPlan);

  const visual = buildLocalVisualAnalysisPayload(screen);
  const closeBehavior = getScreenCloseBehavior(screen);
  const closeComponentTypes = getCloseBehaviorComponentTypes(closeBehavior);
  const evidenceText = [screen?.name, screen?.goal, closeBehavior, screenPlan, JSON.stringify(visual)].filter(Boolean).join("\n");
  const requiredComponents = [];
  const optionalComponents = [];
  const forbiddenComponents = [];
  const layoutSlots = [];
  const primaryActions = [];
  const stateWidgets = [];
  const systemEntrances = [];
  const persistentAnchors = [];
  const negativePromptRules = [];

  addUniqueCompositionItem(requiredComponents, createCompositionItem(`${screen?.name || "当前界面"}标题区`, "title", "交互案当前界面段落需要明确页面身份", "交互案当前界面段落", "must"));
  addUniqueCompositionItem(requiredComponents, createCompositionItem("主内容区", "panel", "承载当前界面的核心信息和交互内容", "交互案当前界面段落", "must"));
  addUniqueCompositionItem(layoutSlots, createCompositionItem("顶部标题与锚点区", "top", "放置当前界面标题和关闭方式允许的固定控件", "交互案当前界面段落"));
  addUniqueCompositionItem(layoutSlots, createCompositionItem("中部主内容区", "center", "承载当前界面的核心内容、列表、卡片或详情", "交互案当前界面段落"));

  const addByPattern = (pattern, list, name, type, reason, priority = "must") => {
    if (pattern.test(evidenceText)) {
      addUniqueCompositionItem(list, createCompositionItem(name, type, reason, "交互案当前界面段落", priority));
    }
  };

  addByPattern(/列表|排行|好友|任务|成就|商店|商品|卡片|管理|图鉴|详情|背包|仓库|装饰|皮肤|关卡|章节|邮件|公告/i, requiredComponents, "内容列表/卡片组", "list", "当前界面段落包含列表、卡片、详情或管理内容");
  addByPattern(/商品|商店|购买|价格|售罄|折扣|兑换|货币|资源不足/i, requiredComponents, "商品/价格卡片", "shop_item", "当前界面段落包含商品展示、购买、价格或资源不足状态");
  addByPattern(/任务|每日|周常|成就|活跃|奖励|领取|前往|完成/i, requiredComponents, "任务/奖励条目", "task_item", "当前界面段落包含任务、活跃、奖励、领取或前往操作");
  addByPattern(/背包|仓库|道具|物品|装备|材料|碎片|格子|数量/i, requiredComponents, "道具格/物品卡片", "item_slot", "当前界面段落包含背包、道具、物品、装备或数量信息");
  addByPattern(/图鉴|角色|宠物|头像|立绘|属性|详情|等级|稀有度/i, requiredComponents, "角色/图鉴信息卡", "profile_card", "当前界面段落包含角色、宠物、图鉴、属性或详情信息");
  addByPattern(/弹窗|确认|取消|二次确认|提示框|对话框|结算/i, requiredComponents, "弹窗/确认区域", "modal", "当前界面段落包含弹窗、确认、取消或结算流程");
  addByPattern(/Tab|标签|分类|切换|分页|筛选|排序|分段|顶部导航|侧边导航/i, requiredComponents, "分类 Tab/筛选切换", "tab", "当前界面段落包含分类、标签、切换、筛选或排序");
  addByPattern(/进度|状态|等级|经验|倒计时|剩余|冷却|活跃度|完成度|血量|体力/i, stateWidgets, "进度/状态反馈", "progress", "当前界面段落包含进度、状态、等级、倒计时或完成度");
  addByPattern(/按钮|点击|领取|购买|确认|取消|保存|邀请|分享|查看|前往|切换|修改|使用|装备|升级|开始|挑战/i, primaryActions, "当前界面主操作按钮", "button", "当前界面段落包含明确点击、领取、购买、确认、前往或使用等操作");
  addByPattern(/资源|金币|货币|Token|爱心|钻石|体力|数值|价格|消耗/i, optionalComponents, "资源数值胶囊", "resource", "仅在当前界面段落需要展示资源、价格或消耗时出现", "optional");
  addByPattern(/搜索|输入|命名|兑换码|留言|文本框/i, optionalComponents, "输入/搜索框", "input", "当前界面段落包含搜索、输入、命名或兑换码", "optional");
  addByPattern(/空状态|暂无|未解锁|锁定|加载|失败|异常|网络/i, optionalComponents, "空态/异常提示", "empty_state", "当前界面段落包含空态、锁定、加载、失败或异常状态", "optional");
  addByPattern(/红点|角标|徽章|新|可领取|提示/i, optionalComponents, "红点/角标提示", "badge", "当前界面段落包含红点、角标、徽章或可领取提示", "optional");

  const systemEntrancePatterns = [
    ["设置按钮", /设置|音效|音乐|震动|画质/i],
    ["帮助按钮", /帮助|说明|规则|问号|教程/i],
    ["邮件入口", /邮件|信箱/i],
    ["公告入口", /公告|新闻/i],
    ["活动入口", /活动|限时|运营/i],
    ["好友入口", /好友|社交|拜访|邀请/i]
  ];
  systemEntrancePatterns.forEach(([name, pattern]) => {
    if (pattern.test(screenPlan)) {
      addUniqueCompositionItem(systemEntrances, createCompositionItem(name, "system", "当前界面段落明确要求该系统入口", "交互案当前界面段落", "optional"));
    }
  });

  const closeTypeLabelMap = {
    back_button: "返回按钮",
    close_button: "关闭按钮",
    home_button: "主页按钮"
  };
  Object.entries(closeTypeLabelMap).forEach(([type, label]) => {
    const simpleType = type.replace("_button", "");
    if (closeComponentTypes.includes(type)) {
      addUniqueCompositionItem(persistentAnchors, createCompositionItem(label, simpleType, `关闭方式要求：${closeBehavior}`, "目标界面关闭方式", "fixed"));
    } else {
      addUniqueCompositionItem(forbiddenComponents, createCompositionItem(label, simpleType, "当前界面关闭方式未要求该控件，禁止通用模板自动补齐", closeBehavior || "关闭方式未指定", "hide"));
    }
  });

  ["设置按钮", "帮助按钮", "邮件入口", "公告入口", "收藏入口", "无关活动入口", "无关商店入口"].forEach((name) => {
    const explicitlyAllowed = systemEntrances.some((item) => item.name === name || (name.includes("活动") && item.name.includes("活动")));
    if (!explicitlyAllowed) {
      addUniqueCompositionItem(forbiddenComponents, createCompositionItem(name, "system", "当前界面段落未明确要求，禁止误加", "交互案当前界面段落", "hide"));
    }
  });

  if (isNoNavigationCloseBehavior(closeBehavior)) {
    negativePromptRules.push("关闭方式为无关闭/无返回；不要出现返回按钮、关闭按钮、主页按钮。");
  } else if (closeComponentTypes.length) {
    negativePromptRules.push(`只允许关闭/返回控件：${closeComponentTypes.map((type) => closeTypeLabelMap[type] || type).join("、")}；不要额外补其他导航控件。`);
  } else {
    negativePromptRules.push("不要添加当前界面未要求的返回、关闭、主页、设置、帮助、邮件、公告或活动入口。");
  }
  negativePromptRules.push("组件清单只来自当前界面交互段落，不要把其他界面的入口、按钮或系统自动带入。");

  const defaultPolicy = getDefaultPersistentAnchorPolicy(screen);
  return {
    screenGoal: cleanAnalysisText(screen?.goal || visual.goal || `${screen?.name || "当前界面"}核心功能`),
    requiredComponents,
    optionalComponents,
    forbiddenComponents,
    layoutSlots,
    primaryActions,
    stateWidgets,
    systemEntrances,
    persistentAnchors,
    titlePolicy: defaultPolicy.titlePolicy,
    anchorExceptions: [defaultPolicy.anchorExceptions],
    resourceBarPolicy: /资源|金币|货币|Token|爱心|钻石|体力|数值|价格|消耗/i.test(evidenceText)
      ? "minimal：仅在当前界面段落明确需要资源展示、价格或消耗时显示资源数值胶囊。"
      : "none：当前界面段落未明确要求资源栏，禁止通用模板自动补资源栏。",
    negativePromptRules,
    analysisSource: "interaction-plan-local",
    sourceExcerpt: cleanAnalysisText(screenPlan).slice(0, 600),
    fallback: false,
    fallbackReason: "",
    updatedAt: Date.now()
  };
}

function buildFallbackDesignCompositionAnalysis(screen, reason = "") {
  const brief = getPlanningDocument();
  const plan = getVisualPlanText();
  const screenPlan = stripScreenDesignPromptNoise(extractScreenSection(plan, screen) || "");
  const visual = buildLocalVisualAnalysisPayload(screen);
  const closeBehavior = getScreenCloseBehavior(screen);
  const closeComponentTypes = getCloseBehaviorComponentTypes(closeBehavior);
  const evidenceText = [screen?.name, screen?.goal, closeBehavior, screenPlan, JSON.stringify(visual)].filter(Boolean).join("\n");
  const requiredComponents = [];
  const optionalComponents = [];
  const forbiddenComponents = [];
  const layoutSlots = [];
  const primaryActions = [];
  const stateWidgets = [];
  const systemEntrances = [];
  const persistentAnchors = [];
  const negativePromptRules = [];

  addUniqueCompositionItem(requiredComponents, createCompositionItem(`${screen?.name || "当前界面"}标题区`, "title", "普通界面需要明确当前页面身份", "目标界面名称", "must"));
  addUniqueCompositionItem(requiredComponents, createCompositionItem("主内容区", "panel", "承载当前界面的核心信息和交互内容", "当前界面目标/交互段落", "must"));
  addUniqueCompositionItem(layoutSlots, createCompositionItem("顶部标题与锚点区", "top", "放置标题和允许出现的返回/关闭/资源等固定控件", "本地保守裁剪"));
  addUniqueCompositionItem(layoutSlots, createCompositionItem("中部主内容区", "center", "承载当前界面主要内容", "本地保守裁剪"));

  if (/列表|排行|好友|任务|商店|商品|卡片|管理|图鉴|详情|背包|装饰/i.test(evidenceText)) {
    addUniqueCompositionItem(requiredComponents, createCompositionItem("内容列表/卡片组", "list", "当前界面目标或交互段落包含列表、卡片、详情或管理内容", "策划案/交互案关键词", "must"));
  }
  if (/Tab|标签|分类|切换|筛选/i.test(evidenceText)) {
    addUniqueCompositionItem(requiredComponents, createCompositionItem("分类 Tab", "tab", "当前界面存在分类、标签、切换或筛选需求", "策划案/交互案关键词", "must"));
  }
  if (/进度|状态|等级|经验|倒计时|剩余|奖励|完成/i.test(evidenceText)) {
    addUniqueCompositionItem(stateWidgets, createCompositionItem("进度/状态反馈", "progress", "当前界面需要展示进度、状态、等级、奖励或倒计时", "策划案/交互案关键词", "must"));
  }
  if (/按钮|点击|领取|购买|确认|取消|保存|邀请|分享|查看|前往|切换|修改/i.test(evidenceText)) {
    addUniqueCompositionItem(primaryActions, createCompositionItem("当前界面主操作按钮", "button", "交互段落包含点击、领取、购买、保存、邀请、分享或查看等主操作", "交互案关键词", "must"));
  }
  if (/资源|金币|货币|Token|爱心|钻石|数值/i.test(evidenceText)) {
    addUniqueCompositionItem(optionalComponents, createCompositionItem("资源数值胶囊", "resource", "仅在当前界面需要展示资源或消费时出现", "策划案/交互案关键词", "optional"));
  }

  const closeTypeLabelMap = {
    back_button: "返回按钮",
    close_button: "关闭按钮",
    home_button: "主页按钮"
  };
  Object.entries(closeTypeLabelMap).forEach(([type, label]) => {
    if (closeComponentTypes.includes(type)) {
      addUniqueCompositionItem(persistentAnchors, createCompositionItem(label, type.replace("_button", ""), `关闭方式要求：${closeBehavior}`, "目标界面关闭方式", "fixed"));
    } else {
      addUniqueCompositionItem(forbiddenComponents, createCompositionItem(label, type.replace("_button", ""), "当前界面关闭方式未要求该控件，保守禁止通用模板自动补齐", closeBehavior || "关闭方式未指定", "hide"));
    }
  });

  ["设置按钮", "帮助按钮", "邮件入口", "公告入口", "收藏入口", "无关活动入口", "无关商店入口"].forEach((name) => {
    addUniqueCompositionItem(forbiddenComponents, createCompositionItem(name, "system", "当前界面文档未明确要求，保守禁止误加", "本地保守裁剪", "hide"));
  });

  if (isNoNavigationCloseBehavior(closeBehavior)) {
    negativePromptRules.push("关闭方式为无关闭/无返回；不要出现返回按钮、关闭按钮、主页按钮。");
  } else if (closeComponentTypes.length) {
    negativePromptRules.push(`只允许关闭/返回控件：${closeComponentTypes.map((type) => closeTypeLabelMap[type] || type).join("、")}；不要额外补其他导航控件。`);
  } else {
    negativePromptRules.push("不要添加当前界面未要求的返回、关闭、主页、设置、帮助、邮件、公告或活动入口。");
  }

  const defaultPolicy = getDefaultPersistentAnchorPolicy(screen);
  const fallbackReason = cleanAnalysisText(reason).slice(0, 180);
  return {
    screenGoal: cleanAnalysisText(screen?.goal || visual.goal || `${screen?.name || "当前界面"}核心功能`),
    requiredComponents,
    optionalComponents,
    forbiddenComponents,
    layoutSlots,
    primaryActions,
    stateWidgets,
    systemEntrances,
    persistentAnchors,
    titlePolicy: defaultPolicy.titlePolicy,
    anchorExceptions: [defaultPolicy.anchorExceptions],
    resourceBarPolicy: /资源|金币|货币|Token|爱心|钻石|数值/i.test(evidenceText)
      ? "minimal：仅在当前界面确实需要资源展示或消费时显示资源数值胶囊。"
      : "none：当前界面文档未明确要求资源栏，禁止通用模板自动补资源栏。",
    negativePromptRules,
    fallback: true,
    fallbackReason: fallbackReason || "界面组件分析超时或返回无效 JSON，使用本地保守裁剪继续。",
    updatedAt: Date.now()
  };
}

async function generateDesignCompositionAnalysisWithApi(screen, { timeoutMs = getDesignCompositionAnalysisTimeoutMs() } = {}) {
  if (window.location.protocol === "file:") {
    throw new Error(`界面组件分析失败：请通过 ${getLocalAccessHint()} 或部署地址访问。`);
  }

  const gameDesign = getPlanningDocument();
  const interactionPlan = getVisualPlanText();
  if (!gameDesign.trim()) {
    throw new Error("界面组件分析失败：缺少完整策划案。");
  }
  if (!interactionPlan.trim()) {
    throw new Error("界面组件分析失败：缺少交互设计方案。");
  }

  const currentScreenPlan = extractScreenSection(interactionPlan, screen) || "";
  const visualStructure = getVisualAnalysisSource(screen);
  const { response, data } = await fetchJsonWithClientTimeout("/api/generate-plan", {
      task: "design-composition-analysis",
      model: getSelectedTextModel("interactionModel"),
      projectName: state.gameName || gameName.value || detectGameName(gameDesign) || "未命名小游戏",
      platform: getPlatformText($("#platform").value),
      screen: {
        id: screen.id,
        name: screen.name,
        kind: screen.kind,
        goal: screen.goal,
        closeBehavior: getScreenCloseBehavior(screen)
      },
      screens: getSelectedScreens().map((item) => ({
        id: item.id,
        name: item.name,
        kind: item.kind,
        goal: item.goal,
        closeBehavior: getScreenCloseBehavior(item)
      })),
      brief: gameDesign,
      interactionPlan,
      currentScreenPlan,
      visualStructure,
      localVisual: buildLocalVisualAnalysisPayload(screen)
  }, {
    timeoutMs,
    timeoutMessage: `界面组件分析超过 ${Math.ceil(timeoutMs / 1000)} 秒，使用保守组件裁剪继续`
  });

  if (!response.ok) {
    throw new Error(`界面组件分析失败：${data.error || response.status}`);
  }
  return data.analysis || data.content || data.plan || "";
}

async function repairDesignCompositionAnalysisWithApi(screen, rawContent) {
  if (window.location.protocol === "file:") {
    throw new Error(`界面组件分析 JSON 修复失败：请通过 ${getLocalAccessHint()} 或部署地址访问。`);
  }

  const gameDesign = getPlanningDocument();
  const interactionPlan = getVisualPlanText();
  const currentScreenPlan = extractScreenSection(interactionPlan, screen) || "";
  const visualStructure = getVisualAnalysisSource(screen);
  const { response, data } = await fetchJsonWithClientTimeout("/api/generate-plan", {
      task: "design-composition-json-repair",
      model: "gpt-5.2",
      projectName: state.gameName || gameName.value || detectGameName(gameDesign) || "未命名小游戏",
      platform: getPlatformText($("#platform").value),
      screen: {
        id: screen.id,
        name: screen.name,
        kind: screen.kind,
        goal: screen.goal,
        closeBehavior: getScreenCloseBehavior(screen)
      },
      brief: gameDesign,
      interactionPlan,
      currentScreenPlan,
      visualStructure,
      localVisual: buildLocalVisualAnalysisPayload(screen),
      rawContent
  }, {
    timeoutMs: DESIGN_COMPOSITION_REPAIR_TIMEOUT_MS,
    timeoutMessage: "界面组件分析 JSON 修复超过 30 秒，使用保守组件裁剪继续"
  });

  if (!response.ok) {
    throw new Error(`界面组件分析 JSON 修复失败：${data.error || response.status}`);
  }
  return data.analysis || data.content || data.plan || "";
}

function normalizeCompositionItems(value) {
  if (!value) return [];
  const source = Array.isArray(value) ? value : normalizeAnalysisList(value);
  return source.map((item) => {
    if (item && typeof item === "object") {
      const name = cleanAnalysisText(item.name || item.title || item.label || item.component || item.region || item.slot || "");
      const type = cleanAnalysisText(item.type || item.kind || item.category || "");
      const reason = cleanAnalysisText(item.reason || item.purpose || item.description || item.body || item.rule || "");
      const sourceText = cleanAnalysisText(item.source || item.evidence || "");
      const priority = cleanAnalysisText(item.priority || item.level || "");
      return { name, type, reason, source: sourceText, priority };
    }
    return { name: cleanAnalysisText(item), type: "", reason: "", source: "", priority: "" };
  }).filter((item) => item.name || item.reason);
}

function normalizeDesignCompositionAnalysis(raw, screen) {
  const parsed = typeof raw === "string" ? parseJsonObjectFromText(raw) : raw;
  if (!parsed || typeof parsed !== "object") return null;

  const requiredComponents = normalizeCompositionItems(parsed.requiredComponents || parsed.required || parsed.mustHave);
  const forbiddenComponents = normalizeCompositionItems(parsed.forbiddenComponents || parsed.forbidden || parsed.doNotUse);
  const layoutSlots = normalizeCompositionItems(parsed.layoutSlots || parsed.regions || parsed.layout);

  if (!requiredComponents.length && !layoutSlots.length && !forbiddenComponents.length) return null;

  return {
    screenGoal: cleanAnalysisText(parsed.screenGoal || parsed.goal || screen?.goal || ""),
    requiredComponents,
    optionalComponents: normalizeCompositionItems(parsed.optionalComponents || parsed.optional || parsed.niceToHave),
    forbiddenComponents,
    layoutSlots,
    primaryActions: normalizeCompositionItems(parsed.primaryActions || parsed.actions || parsed.buttons),
    stateWidgets: normalizeCompositionItems(parsed.stateWidgets || parsed.states || parsed.statusWidgets),
    systemEntrances: normalizeCompositionItems(parsed.systemEntrances || parsed.entryPoints || parsed.navItems),
    persistentAnchors: normalizeCompositionItems(parsed.persistentAnchors || parsed.anchorComponents || parsed.fixedAnchors),
    titlePolicy: cleanAnalysisText(parsed.titlePolicy || parsed.headerPolicy || parsed.titleRule || ""),
    anchorExceptions: normalizeAnalysisList(parsed.anchorExceptions || parsed.specialCases || parsed.exceptionRules),
    resourceBarPolicy: cleanAnalysisText(parsed.resourceBarPolicy || parsed.resourcePolicy || ""),
    negativePromptRules: normalizeAnalysisList(parsed.negativePromptRules || parsed.negativeRules || parsed.forbiddenRules),
    analysisSource: cleanAnalysisText(parsed.analysisSource || parsed.source || ""),
    sourceExcerpt: cleanAnalysisText(parsed.sourceExcerpt || parsed.currentScreenPlan || ""),
    fallback: parsed.fallback === true,
    fallbackReason: cleanAnalysisText(parsed.fallbackReason || parsed.reason || ""),
    updatedAt: Date.now()
  };
}

function formatCompositionItemsForPrompt(label, items, limit = 12) {
  const list = (items || []).slice(0, limit);
  if (!list.length) return `${label}：无`;
  return `${label}：${list.map((item) => {
    const parts = [
      item.name,
      item.type ? `类型=${item.type}` : "",
      item.reason ? `原因=${item.reason}` : "",
      item.source ? `来源=${item.source}` : ""
    ].filter(Boolean);
    return parts.join(" / ");
  }).join("；")}`;
}

function formatDesignCompositionForPrompt(analysis) {
  if (!analysis) {
    return "未生成组件裁剪分析；此时必须以当前界面的策划案、交互案和 SVG 信息作为控件需求下限，只允许补充服务页面目标的状态变体，不得套用通用导航或按钮模板。";
  }
  return [
    analysis.analysisSource ? `组件裁剪来源：${analysis.analysisSource}` : "",
    analysis.sourceExcerpt ? `当前界面交互案摘录：${analysis.sourceExcerpt.slice(0, 500)}` : "",
    analysis.fallback ? `组件裁剪来源：保守兜底（${analysis.fallbackReason || "模型分析超时或返回无效 JSON"}）` : "",
    Array.isArray(analysis.uiAssetReadinessWarnings) && analysis.uiAssetReadinessWarnings.length
      ? `UI资产基准提示（非阻断）：${analysis.uiAssetReadinessWarnings.join("；")}`
      : "",
    `页面目标：${analysis.screenGoal || "未明确"}`,
    formatCompositionItemsForPrompt("必须出现组件", analysis.requiredComponents),
    formatCompositionItemsForPrompt("可选组件", analysis.optionalComponents),
    formatCompositionItemsForPrompt("禁止出现组件", analysis.forbiddenComponents),
    formatCompositionItemsForPrompt("布局槽位", analysis.layoutSlots),
    formatCompositionItemsForPrompt("主操作", analysis.primaryActions),
    formatCompositionItemsForPrompt("状态组件", analysis.stateWidgets),
    formatCompositionItemsForPrompt("系统入口", analysis.systemEntrances),
    formatCompositionItemsForPrompt("跨界面固定锚点", analysis.persistentAnchors),
    `标题策略：${analysis.titlePolicy || "普通功能界面保持统一标题区；特殊活动/剧情/封面页才允许大幅偏离。"}`,
    `锚点例外：${(analysis.anchorExceptions || []).join("；") || "无特殊例外时，返回/设置/主页/资源栏/主标题沿用项目级固定位置。"}`,
    `资源栏策略：${analysis.resourceBarPolicy || "只有当前界面文档明确要求时才显示资源栏"}`,
    `负向规则：${(analysis.negativePromptRules || []).join("；") || "不要添加当前界面未要求的按钮、入口、图标和资源栏"}`
  ].filter(Boolean).join("\n");
}

function getDefaultPersistentAnchorPolicy(screen) {
  const kind = String(screen?.kind || "").toLowerCase();
  const closeBehavior = getScreenCloseBehavior(screen);
  if (isNoNavigationCloseBehavior(closeBehavior)) {
    return {
      titlePolicy: "该界面关闭方式明确为无关闭/无返回；标题区可保留统一位置，但不得因此新增返回、关闭或主页按钮。",
      anchorExceptions: `关闭方式：${closeBehavior}；禁止使用通用模板自动补返回/关闭/主页控件。`
    };
  }
  const special = ["login", "splash", "cover", "story", "cutscene", "activity", "event", "popup", "modal"];
  if (special.includes(kind)) {
    return {
      titlePolicy: "该界面允许在保留项目视觉语言的前提下对标题区和顶部按钮做特殊构图，但必须有明确的主标题和返回/关闭逻辑。",
      anchorExceptions: "可偏离普通功能页的标题区与顶部按钮锚点，但不能让返回、关闭和主要操作失去可识别性。"
    };
  }
  return {
    titlePolicy: "普通功能界面必须沿用统一标题区：主标题位于顶部主内容区的稳定位置，与返回按钮、资源栏和工具按钮保持固定关系。",
    anchorExceptions: "除非当前界面明确属于活动主视觉页、剧情页、登录页或全屏特殊页，否则返回/设置/主页/资源栏/主标题不得随意漂移。"
  };
}

function collectDirectScreenDesignReferences(screen = getDesignScreen(), referenceLimit = getDesignReferenceLimit()) {
  const kit = state.totalAssetKit || {};
  const references = [];
  const pushTotalAsset = (type) => {
    const part = kit[type] || {};
    if (part.status !== "ready" || !part.imageUrl) return;
    const meta = getTotalAssetPartMeta(type);
    references.push({
      imageUrl: part.imageUrl,
      label: meta.label,
      role: type,
      sourceType: "asset-url"
    });
  };

  pushTotalAsset("ui");
  pushTotalAsset("background");
  pushTotalAsset("character");

  const selectedReferences = references.slice(0, referenceLimit);
  if (selectedReferences.length) {
    return {
      referenceImages: selectedReferences.map((item) => item.imageUrl),
      referenceLabels: selectedReferences.map((item, index) => `图${index + 1} ${item.label}`),
      totalAssetReferenceCount: selectedReferences.length,
      styleReferenceCount: 0,
      usedTotalAsset: references.length > 0,
      referenceRequestInfo: null
    };
  }

  return {
    referenceImages: [],
    referenceLabels: [],
    totalAssetReferenceCount: 0,
    styleReferenceCount: 0,
    usedTotalAsset: false
  };
}

function collectExperimentalScreenDesignReferences(screen = getDesignScreen()) {
  if (!DESIGN_DRAFT_REFERENCE_EXPERIMENT) return collectDirectScreenDesignReferences(screen);

  const kit = state.totalAssetKit || {};
  const selection = getStyleReferenceSelectionState();
  const assetReferenceSelection = getDesignDraftAssetReferenceSelection();
  const totalAssetTypes = ["ui", "background", "character"];
  const readyTotalAssetItems = totalAssetTypes.map((type) => {
    const part = kit[type] || {};
    if (part.status !== "ready" || !part.imageUrl) return null;
    return {
      imageUrl: part.imageUrl,
      label: getTotalAssetPartMeta(type).label,
      role: type,
      sourceType: "asset-url"
    };
  });

  if (readyTotalAssetItems.some((item) => !item)) {
    return collectDirectScreenDesignReferences(screen);
  }
  const selectedTotalAssetItems = readyTotalAssetItems
    .filter((item) => assetReferenceSelection[item.role] !== false)
    .map((item, index) => ({
      ...item,
      label: `图${index + 1} ${item.label}`
    }));
  const skippedTotalAssetItems = readyTotalAssetItems
    .filter((item) => assetReferenceSelection[item.role] === false)
    .map((item) => ({
      label: item.label,
      role: item.role,
      reason: "未勾选，普通界面生图不发送该总资产"
    }));

  const styleItems = selection.sendableReferences
    .slice(0, DESIGN_REFERENCE_LIMIT)
    .map((item, index) => ({
      imageUrl: item.dataUrl,
      label: `图${selectedTotalAssetItems.length + index + 1} 原参考图${index + 1}`,
      role: "style-reference",
      sourceType: "style-reference"
    }))
    .filter((item) => item.imageUrl);

  const selectedReferences = [...selectedTotalAssetItems, ...styleItems];
  return {
    referenceImages: selectedReferences.map((item) => item.imageUrl),
    referenceLabels: selectedReferences.map((item) => item.label),
    totalAssetReferenceCount: selectedTotalAssetItems.length,
    styleReferenceCount: styleItems.length,
    usedTotalAsset: selectedTotalAssetItems.length > 0,
    isReferenceExperiment: true,
    selectedTotalAssetRoles: selectedTotalAssetItems.map((item) => item.role),
    skippedTotalAssetRoles: skippedTotalAssetItems.map((item) => item.role),
    referenceRequestInfo: {
      mode: "selected-total-assets-plus-style-references",
      totalAssetLabels: selectedTotalAssetItems.map((item) => item.label),
      styleReferenceLabels: styleItems.map((item) => item.label),
      selectedTotalAssetRoles: selectedTotalAssetItems.map((item) => item.role),
      skippedTotalAssetRoles: skippedTotalAssetItems.map((item) => item.role),
      uploadedCount: state.styleReferences.length,
      explicitSelection: selection.explicitSelection,
      sentLabels: selectedReferences.map((item) => item.label),
      skippedItems: [
        ...skippedTotalAssetItems,
        ...selection.limitedReferences.map((item) => ({
          label: item.label,
          reason: `超过 ${DESIGN_REFERENCE_LIMIT} 张原参考图上限未发送`
        }))
      ]
    }
  };
}

function buildDirectReferenceTemperamentSummary() {
  const analysis = state.totalAssetKit?.analysis || {};
  const cache = state.styleAnalysisCache || {};
  const evidenceLines = [
    formatStructuredSpecValue(analysis.colorSystem),
    formatStructuredSpecValue(analysis.materialRules),
    formatStructuredSpecValue(analysis.lightingHierarchy),
    formatStructuredSpecValue(analysis.buttonSpec),
    formatStructuredSpecValue(analysis.backgroundSpec),
    formatStructuredSpecValue(analysis.characterSpec)
  ].map((line) => cleanDirectStyleRuleForImagePrompt(line, 260)).filter(Boolean);
  const totalAssetTemperament = buildTotalAssetTemperamentAnalysis(analysis);
  const cacheLines = [
    cache.styleTransferKeywords ? `画风迁移关键词：${cleanAnalysisText(cache.styleTransferKeywords)}` : "",
    cache.backgroundStyleSummary ? `背景气质：${cleanAnalysisText(cache.backgroundStyleSummary)}` : "",
    cache.shapeLanguageSummary ? `点线面气质：${cleanAnalysisText(cache.shapeLanguageSummary)}` : "",
    cache.buttonMorphologySummary ? `按钮/面板气质：${cleanAnalysisText(cache.buttonMorphologySummary)}` : ""
  ].filter(Boolean);
  const summary = [
    totalAssetTemperament,
    evidenceLines.length ? `抽象风格规则：${evidenceLines.join("；")}` : "",
    !totalAssetTemperament && cacheLines.length ? cacheLines.join("；") : ""
  ].filter(Boolean).join("\n");
  return cleanDirectStyleRuleForImagePrompt(summary, 1800);
}

function buildDirectDetailedReferenceAnalysisPrompt() {
  const analysis = normalizeStructuredStyleAnalysisForDisplay(state.totalAssetKit?.analysis || {});
  if (!analysis) return "";
  const blocks = [
    ["综合画风指纹", [
      ...formatSpecLinesFromFields(analysis.referenceEvidence, [
        ["色彩与比例", "paletteAndRatio"],
        ["材质与描边", "materialAndStroke"],
        ["形状与装饰", "shapeAndOrnament"],
        ["光影与渲染", "lightingAndRendering"]
      ])
    ]],
    ["画风 DNA", formatStyleDnaSummaryLines(analysis.styleDNA)],
    ["色彩系统", formatColorSystemSummaryLines(analysis.colorSystem)],
    ["材质规则", formatMaterialRulesSummaryLines(analysis.materialRules)],
    ["光影层级", formatLightingHierarchySummaryLines(analysis.lightingHierarchy)],
    ["点线面/形状语言", [
      ...formatPointLinePlaneSummaryLines(analysis.pointLinePlane),
      ...formatShapeLanguageDetailedLines(analysis.shapeLanguage)
    ]],
    ["按钮规格", formatButtonSpecSummaryLines(analysis.buttonSpec)],
    ["面板与弹窗", formatPanelModalSpecSummaryLines(analysis.panelModalSpec)],
    ["图标/道具格/资源栏", formatIconItemResourceSpecSummaryLines(analysis.iconItemResourceSpec)],
    ["字体与文字安全", formatTypographySpecSummaryLines(analysis.typographySpec)],
    ["背景规格", formatBackgroundSpecSummaryLines(analysis.backgroundSpec)],
    ["角色规格", formatCharacterSpecSummaryLines(analysis.characterSpec)],
    ["统一性规则", formatUnityRulesSummaryLines(analysis.unityRules)],
    ["设计 Token", formatDesignTokensSummaryLines(analysis.designTokens)],
    ["禁止偏差", formatNegativePromptsSummaryLines(analysis.negativePrompts)]
  ];
  const text = blocks
    .map(([title, lines]) => {
      const visible = (lines || [])
        .map((line) => cleanDirectStyleRuleForImagePrompt(line, 420))
        .filter(Boolean)
        .slice(0, 8);
      return visible.length ? `${title}：\n${visible.map((line) => `- ${compactRepeatedSummarySegments(line, 520)}`).join("\n")}` : "";
    })
    .filter(Boolean)
    .join("\n\n");
  return text.slice(0, 6800);
}

function buildDirectUiAssetComponentConstraintSummary(screen = getDesignScreen()) {
  const baselinePrompt = formatUiComponentBaselineForImagePrompt(screen, null);
  return [
    "UI资产组件继承硬约束：UI控件资产图是所有按钮、资源 token、Tab、面板、弹窗、道具格、图标按钮、状态组件的唯一形态来源。",
    "原始参考图只用于校准色彩、材质、光影、信息密度和装饰气质，不能覆盖 UI资产图里的控件轮廓、描边层级、圆角、按钮底板、图标承载和状态差异。",
    "如果当前界面需要的控件没有被基准明确识别，只能从 UI资产图中最近邻控件外推；禁止使用默认网页控件、通用手游模板控件或重新发明按钮。",
    "返回、关闭、主页控件必须遵守当前界面关闭方式；根界面不得因为 UI资产图里有返回/关闭按钮而添加返回、关闭或主页控件。",
    baselinePrompt
  ].filter(Boolean).join("\n").slice(0, 2600);
}

function buildDirectScreenDesignPrompt(screen, { styleKeywords = "", referenceLabels = [], usedTotalAsset = false, uiAssetComponentConstraintSummary = "" } = {}) {
  const brief = getPlanningDocument();
  const screenDesignSection = getScreenDesignPromptSection(screen);
  const screenDesignPrompt = summarizeScreenSectionForImagePrompt(screenDesignSection, screen, getStoredDesignCompositionAnalysis(screen));
  const platform = getPlatformText($("#platform").value);
  const canvasSpec = getDesignCanvasSpec();
  const keywords = getKeywords(brief).slice(0, 10).join("、");
  const closeBehavior = formatScreenCloseBehaviorForPrompt(screen, "未明确；不要默认补返回、关闭或主页控件。");
  const worldAndThemeAnchor = formatWorldAndThemeForImagePrompt(2800);
  const referenceRule = usedTotalAsset && referenceLabels.length
    ? `请按随请求附带的项目总资产图生成：${referenceLabels.join("，")}。图1 为游戏 UI资产图，图2 为游戏背景资产图，图3 为角色资产图。若某张图未附带，则忽略对应说明。UI控件只参考图1，背景气质只参考图2，角色语言只参考图3；不要复制资产板布局、标签文字、Logo、无关按钮或无关业务入口。`
    : "本次没有可用总资产图；按策划案、交互案和用户关键词生成可落地的游戏 UI。";

  return [
    "请生成一张正式游戏界面视觉设计稿，不是线框图、不是说明文档、不是资产板。",
    `项目名称：${state.gameName || gameName.value || detectGameName(brief) || "未命名小游戏"}`,
    `目标界面：${screen?.name || "当前界面"}`,
    `界面类型：${screen?.kind || "generic"}`,
    `页面目标：${screen?.goal || screen?.coreAction || "承载当前界面的核心操作和状态展示"}`,
    `目标平台：${platform}`,
    `画布规格：${canvasSpec.promptText}，完整 UI 截图视角。`,
    `用户输入画风关键词：${styleKeywords || "未填写，按策划案自动提炼风格"}`,
    `游戏关键词：${keywords || "未提取"}`,
    `当前界面关闭方式：${closeBehavior}`,
    `世界观与题材内容锚点（内容必须服从这里，不得被参考图带偏）：\n${worldAndThemeAnchor}`,
    `当前界面精简生图指令：\n${screenDesignPrompt}`,
    `参考图使用规则：${referenceRule}`,
    "参考图硬约束：参考图只负责美术风格，内容必须服从策划案世界观与题材；不得用参考图覆盖项目题材、世界背景、主角设定、主要角色、阵营冲突或玩法包装。",
    "当前界面执行规则：普通界面结构只由策划案和交互案决定；图1 决定控件形态，图2 决定背景场景语言，图3 只在当前界面需要角色内容时决定角色语言。",
    uiAssetComponentConstraintSummary ? `UI资产组件基准/控件形态硬约束：\n${uiAssetComponentConstraintSummary}` : "",
    "布局要求：保留当前界面的信息层级、主要入口、核心操作、状态反馈和页面目标；只生成当前界面需要的 UI，不要额外添加其他系统入口。",
    "交互案文案边界硬约束：页面目标、模块职责、流程描述、状态说明、设计建议只用于理解界面结构，不得原样写进最终界面。",
    "上屏文案硬约束：只有“允许出现的界面文案”里明确列出的标题、按钮字、Tab 名、奖励名、资源名和状态短标签可以直接上屏；未列出的说明句、流程句、建议句不要作为标题、栏目名、卡片名、按钮文案或信息文案绘制。",
    "视觉要求：超高品质，高保真游戏 UI；按钮、卡片、Tab、资源展示、弹窗和提示需要统一材质、描边、圆角、光影和图标语言。",
    "禁止：不要输出说明文字、Figma 工作区、流程图、多张拼图、参考图原 Logo、原角色、原文案、无关玩法入口或随机乱码。"
  ].filter(Boolean).join("\n");
}

function buildExperimentalScreenDesignPrompt(screen, { referenceLabels = [], styleReferenceCount = 0, selectedTotalAssetRoles = [], skippedTotalAssetRoles = [], roleAnalysisText = "" } = {}) {
  const brief = getPlanningDocument();
  const screenDesignSection = getScreenDesignPromptSection(screen);
  const screenDesignPrompt = summarizeScreenSectionForImagePrompt(screenDesignSection, screen, getStoredDesignCompositionAnalysis(screen));
  const platform = getPlatformText($("#platform").value);
  const canvasSpec = getDesignCanvasSpec();
  const closeBehavior = formatScreenCloseBehaviorForPrompt(screen, "未明确；只按当前交互案判断，不要默认添加返回、关闭或主页控件。");
  const worldAndThemeAnchor = formatWorldAndThemeForImagePrompt(2800);
  const selectedRoles = new Set(selectedTotalAssetRoles || []);
  const skippedRoles = new Set(skippedTotalAssetRoles || []);
  const findRoleLabel = (role) => referenceLabels.find((label) => {
    if (role === "ui") return /UI|控件/.test(label);
    if (role === "background") return /背景/.test(label);
    if (role === "character") return /角色/.test(label);
    return false;
  }) || "";
  const styleReferenceLabels = referenceLabels.filter((label) => /原参考图/.test(label));
  const styleReferenceRule = styleReferenceCount
    ? `${styleReferenceLabels.join("、")} 是原始风格参考图。生成界面的整体风格气质、色彩、材质、光影、信息密度和装饰语言要尽量与这些参考图完全一致。`
    : "本次没有附带原始风格参考图；只使用已勾选发送的项目总资产与当前交互案生成。";
  const uiRule = selectedRoles.has("ui")
    ? `${findRoleLabel("ui")} 是 UI资产图：当前界面上的按钮、资源 token、Tab、面板、弹窗、道具格、图标按钮、状态组件等 UI 组件，必须从这张图中找对应控件或最近邻控件外推；不得使用默认网页控件、通用手游模板，也不得用原参考图里的控件覆盖 UI资产图的控件形态。`
    : "本次未发送 UI资产图：不要声称从 UI资产图取控件；只能按当前交互案和原参考图外推 UI 组件，但仍禁止默认网页控件和无关通用模板。";
  const backgroundRule = selectedRoles.has("background")
    ? `${findRoleLabel("background")} 是背景资产图：只用于背景空间、材质、光影、场景气氛和 UI 安全区，不决定当前界面的业务组件清单。`
    : "本次未发送背景资产图：背景空间、材质、光影、场景气氛和 UI 安全区只能从原参考图和当前交互案推导。";
  const characterRule = selectedRoles.has("character")
    ? `${findRoleLabel("character")} 是角色资产图：只在当前界面交互案明确需要角色、宠物、NPC、头像或立绘时使用；否则不要因为角色资产图存在而新增角色内容。`
    : "本次未发送角色资产图：角色、宠物、NPC、头像或立绘只在当前交互案明确需要时才出现，并从原参考图和当前交互案推导；不得凭空新增角色。";
  const skippedRule = skippedRoles.size
    ? `未发送的总资产角色：${Array.from(skippedRoles).map((role) => getTotalAssetPartMeta(role).label).join("、")}；不要按这些未发送资产编造图像细节。`
    : "";

  return [
    "请生成一张正式游戏界面视觉设计稿，不是线框图、不是说明文档、不是资产板。",
    `项目名称：${state.gameName || gameName.value || detectGameName(brief) || "未命名小游戏"}`,
    `目标界面：${screen?.name || "当前界面"}`,
    `界面类型：${screen?.kind || "generic"}`,
    `目标平台：${platform}`,
    `画布规格：${canvasSpec.promptText}，完整 UI 截图视角。`,
    `当前界面关闭方式：${closeBehavior}`,
    `世界观与题材内容锚点（内容必须服从这里，不得被参考图带偏）：\n${worldAndThemeAnchor}`,
    `附带图片顺序：${referenceLabels.join("，")}。`,
    uiRule,
    backgroundRule,
    characterRule,
    skippedRule,
    styleReferenceRule,
    "参考图硬约束：参考图只负责美术风格，内容必须服从策划案世界观与题材；不得用参考图覆盖项目题材、世界背景、主角设定、主要角色、阵营冲突或玩法包装。",
    roleAnalysisText,
    "当前界面的具体布局、组件清单、文案层级、状态反馈、入口和内容，只能从下面的当前界面结构约束摘要读取；不要从总资产图或参考图补无关玩法入口。",
    `当前界面结构约束摘要：\n${screenDesignPrompt}`,
    "交互案文案边界硬约束：页面目标、模块职责、流程描述、状态说明、设计建议只用于理解界面结构，不得原样写进最终界面。",
    "上屏文案硬约束：只有“允许出现的界面文案”里明确列出的标题、按钮字、Tab 名、奖励名、资源名和状态短标签可以直接上屏；未列出的说明句、流程句、建议句不要作为标题、栏目名、卡片名、按钮文案或信息文案绘制。",
    "生成要求：输出一张可直接用于游戏 UI 的超高品质，高保真当前界面；保留交互案要求的信息层级和核心操作；整体风格气质贴近原始参考图。",
    "参考图构图关系硬约束：继承参考图的视觉组织方式，而不是复制具体内容。背景主要承担浅底、轻空间、留白和弱对比；前景焦点由角色、主 UI、主奖励或暖色重点物件承担。留白和前后景对比是主要分层手段，不要靠堆更多装饰制造丰富感。",
    "禁止：不要复制参考图原角色、Logo、文案、IP 元素、具体商品、原始布局或无关玩法入口；不要输出标注、说明文字、Figma 工作区、多张拼图或资产板。"
  ].filter(Boolean).join("\n");
}

async function generateScreenDesignImageDirect(screen, { model, requestId, timeoutMs = getDesignDraftImageTimeoutMs() } = {}) {
  const styleKeywords = getStylePromptText();
  const references = collectExperimentalScreenDesignReferences(screen);
  const referenceImages = references.referenceImages || [];
  const referenceLabels = references.referenceLabels || [];
  const directWarnings = references.isReferenceExperiment
    ? [`实验引用包：按勾选发送总资产 ${references.totalAssetReferenceCount || 0} 张、原始参考图 ${references.styleReferenceCount || 0} 张；本次共发送 ${referenceImages.length} 张`]
    : references.usedTotalAsset
      ? [`直连生图模式：使用总资产图 ${referenceImages.length} 张，不发送原始参考图分析`]
      : ["直连生图模式：未使用总资产图，也不发送原始参考图分析"];
  const job = getDesignJob(screen.id);

  if (job?.status === "generating") {
    Object.assign(job, {
      phase: "构建直连 prompt...",
      phaseStartedAt: Date.now(),
      phaseTimeoutMs: timeoutMs,
      phaseMaxWaitLabel: `${formatMinutesForTimeout(timeoutMs)} 分钟`,
      requestStatus: "building-prompt",
      model,
      referenceCount: referenceImages.length,
      referenceLabels,
      totalAssetReferenceCount: references.totalAssetReferenceCount,
      styleReferenceCount: references.styleReferenceCount || 0,
      styleReferenceRequestInfo: references.referenceRequestInfo || null,
      totalAssetVersion: getTotalAssetVersion(),
      totalAssetRoles: references.selectedTotalAssetRoles || [],
      preflightWarnings: directWarnings,
      requestAttempts: []
    });
    ensureDesignJobProgressTimer(screen.id, requestId);
    startDesignRequestStatusPolling(screen.id, requestId);
    if (state.activeDesignScreen === screen.id) {
      renderDesignOutput();
    }
  }

  if (job?.status === "generating") {
    Object.assign(job, {
      phase: "应用 UI资产组件规则...",
      phaseStartedAt: Date.now(),
      requestStatus: "building-ui-asset-constraints"
    });
    if (state.activeDesignScreen === screen.id) {
      renderDesignOutput();
    }
  }

  let uiAssetComponentConstraintSummary = "";
  let roleAnalysisText = "";
  const baselines = getLockedUiComponentBaselines();
  if (references.isReferenceExperiment) {
    roleAnalysisText = buildScreenDesignRoleAnalysisBundle(references.selectedTotalAssetRoles || []);
    directWarnings.push(
      roleAnalysisText
        ? "实验 prompt：已按实际发送的总资产角色附加 UI/背景/角色隔离分析；未发送的角色不附加分析"
        : "实验 prompt：未找到可附加的总资产分角色分析，本次仅按已发送图片和交互案生成当前界面"
    );
  } else {
    try {
      uiAssetComponentConstraintSummary = buildDirectUiAssetComponentConstraintSummary(screen);
      directWarnings.push(
        baselines.length
          ? `已应用已缓存 UI资产组件基准：${baselines.length} 项`
          : "未检测到已缓存 UI资产组件基准，本次仅按 UI资产图最近邻外推，不额外调用 BBL 分析"
      );
    } catch (error) {
      uiAssetComponentConstraintSummary = [
        "UI资产组件继承硬约束：按随请求附带的 UI控件资产图最近邻外推控件形态。",
        "不得使用默认网页控件、通用手游模板控件或重新发明按钮。",
        "原始参考图只校准色彩、材质、光影和装饰气质，不能覆盖 UI控件资产图的控件形态。"
      ].join("\n");
      directWarnings.push(`UI资产组件规则整理失败，已降级为最近邻外推并继续生图：${error?.message || error || "未知原因"}`);
    }
  }

  if (job?.status === "generating") {
    Object.assign(job, {
      preflightWarnings: directWarnings
    });
    if (state.activeDesignScreen === screen.id) {
      renderDesignOutput();
    }
  }

  const prompt = references.isReferenceExperiment
    ? buildExperimentalScreenDesignPrompt(screen, {
      referenceLabels,
      styleReferenceCount: references.styleReferenceCount || 0,
      selectedTotalAssetRoles: references.selectedTotalAssetRoles || [],
      skippedTotalAssetRoles: references.skippedTotalAssetRoles || [],
      roleAnalysisText
    })
    : buildDirectScreenDesignPrompt(screen, {
      styleKeywords,
      referenceLabels,
      usedTotalAsset: references.usedTotalAsset,
      uiAssetComponentConstraintSummary
    });
  const canvasSpec = getDesignCanvasSpec();

  if (job?.status === "generating") {
    Object.assign(job, {
      phase: "发送直连生图请求...",
      phaseStartedAt: Date.now(),
      requestDispatchedAt: Date.now(),
      requestStatus: "dispatching"
    });
    if (state.activeDesignScreen === screen.id) {
      renderDesignOutput();
    }
  }

  const payload = {
    mode: "screen-draft-direct",
    requestId,
    projectName: state.gameName || gameName.value || detectGameName(briefText.value.trim()) || "未命名小游戏",
    screen: {
      id: screen.id,
      name: screen.name,
      kind: screen.kind,
      goal: screen.goal
    },
    prompt,
    model,
    platform: getPlatformText($("#platform").value),
    aspectRatio: canvasSpec.aspectRatio,
    size: canvasSpec.generationSize,
    timeoutSeconds: Math.ceil(timeoutMs / 1000),
    styleTransferKeywords: "",
    referenceImages
  };
  const { response, data } = await fetchJsonWithClientTimeout("/api/generate-design", payload, {
    signal: getDesignJobSignal(screen.id),
    timeoutMs,
    timeoutMessage: `界面直连生图超过 ${formatMinutesForTimeout(timeoutMs)} 分钟，已停止等待，可重新生成。`
  });
  if (!response.ok) {
    const backendWarnings = Array.isArray(data.referenceWarnings) ? data.referenceWarnings.filter(Boolean) : [];
    const error = new Error(data.error || data.message || `设计稿生成失败：${response.status}`);
    error.code = data.code || "";
    error.model = data.model || model;
    error.durationMs = data.durationMs || 0;
    error.rawStatus = data.rawStatus || response.status;
    error.draftMeta = {
      prompt,
      referenceCount: referenceImages.length,
      referenceLabels,
      preflightWarnings: [...directWarnings, ...backendWarnings]
    };
    throw error;
  }

  const imageUrl = data.imageUrl || data.images?.[0] || "";
  const backendWarnings = Array.isArray(data.referenceWarnings) ? data.referenceWarnings.filter(Boolean) : [];
  const usableReferenceCount = Number.isFinite(Number(data.referenceCount)) ? Number(data.referenceCount) : referenceImages.length;
  if (!imageUrl) {
    const error = new Error("界面直连生图未返回图片");
    error.draftMeta = {
      prompt,
      referenceCount: usableReferenceCount,
      referenceLabels,
      preflightWarnings: [...directWarnings, ...backendWarnings]
    };
    throw error;
  }

  return {
    imageUrl,
    files: data.files || [],
    prompt: data.prompt || prompt,
    requestId: data.requestId || requestId,
    model: data.model || model,
    durationMs: data.durationMs || 0,
    referenceCount: usableReferenceCount,
    referenceLabels,
    designComposition: null,
    preflightWarnings: [...directWarnings, ...backendWarnings],
    styleReferenceRequestInfo: references.referenceRequestInfo || null,
    styleTransferKeywords: "",
    uiAssetVersion: getUiAssetVersion(),
    totalAssetVersion: getTotalAssetVersion(),
    totalAssetRoles: references.selectedTotalAssetRoles || [],
    usedUiAsset: (references.selectedTotalAssetRoles || []).includes("ui"),
    usedTotalAsset: references.usedTotalAsset,
    directMode: true
  };
}

async function generateSingleDesignDraft(screen, { referenceImages, referenceLabels = [], styleKeywords, styleTransferKeywords, model, designComposition = null, timeoutMs = getDesignDraftImageTimeoutMs(), preflightWarnings = [] }) {
  const prompt = buildDesignGenerationPrompt(screen, styleKeywords, styleTransferKeywords, referenceLabels, designComposition);
  const canvasSpec = getDesignCanvasSpec();
  const job = getDesignJob(screen.id);
  const requestId = job?.requestId || createDesignRequestId(screen.id);
  if (job?.status === "generating") {
    Object.assign(job, {
      requestStatus: "dispatching",
      requestDispatchedAt: job.requestDispatchedAt || Date.now()
    });
    startDesignRequestStatusPolling(screen.id, requestId);
    if (state.activeDesignScreen === screen.id) {
      renderDesignOutput();
    }
  }
  const { response, data } = await fetchJsonWithClientTimeout("/api/generate-design", {
      requestId,
      projectName: state.gameName || gameName.value || detectGameName(briefText.value.trim()) || "未命名小游戏",
      screen: {
        id: screen.id,
        name: screen.name,
        kind: screen.kind,
        goal: screen.goal
      },
      prompt,
      model,
      platform: getPlatformText($("#platform").value),
      aspectRatio: canvasSpec.aspectRatio,
      size: canvasSpec.generationSize,
      styleTransferKeywords,
      designComposition,
      lockedUiComponentBaselines: getRelevantUiComponentBaselines(screen, designComposition),
      lockedLayoutAnchors: getLockedProjectLayoutAnchors(screen, designComposition),
      referenceImages
  }, {
    signal: getDesignJobSignal(screen.id),
    timeoutMs,
    timeoutMessage: `界面生图超过 ${formatMinutesForTimeout(timeoutMs)} 分钟，已停止等待，可重新生成。`
  });

  if (!response.ok) {
    const error = new Error(data.error || data.message || `设计稿生成失败：${response.status}`);
    error.code = data.code || "";
    error.model = data.model || model;
    error.durationMs = data.durationMs || 0;
    error.rawStatus = data.rawStatus || response.status;
    throw error;
  }

  return {
    imageUrl: data.imageUrl || data.images?.[0] || "",
    files: data.files || [],
    prompt: data.prompt || prompt,
    requestId: data.requestId || requestId,
    model: data.model || model,
    durationMs: data.durationMs || 0,
    referenceCount: referenceImages.length,
    referenceLabels,
    designComposition,
    preflightWarnings,
    styleTransferKeywords,
    uiAssetVersion: getUiAssetVersion(),
    totalAssetVersion: getTotalAssetVersion(),
    totalAssetRoles: getTotalAssetReferencesForDesign(screen, designComposition).map((item) => item.role),
    usedUiAsset: Boolean(getUiAssetVersion()),
    usedTotalAsset: Boolean(getTotalAssetVersion())
  };
}

function buildDesignGenerationPrompt(screen, styleKeywords = "", styleTransferKeywords = "", referenceLabels = null, designComposition = null) {
  const brief = getPlanningDocument();
  const screenDesignSection = getScreenDesignPromptSection(screen);
  const screenDesignPrompt = summarizeScreenSectionForImagePrompt(screenDesignSection, screen, designComposition);
  const keywords = getKeywords(brief).slice(0, 12).join("、");
  const platform = getPlatformText($("#platform").value);
  const canvasSpec = getDesignCanvasSpec();
  const totalAssetReferences = getTotalAssetReferencesForDesign(screen, designComposition);
  const hasTotalAsset = totalAssetReferences.length > 0;
  const usesCharacterAsset = totalAssetReferences.some((item) => item.role === "character");
  const composition = normalizeDesignCompositionAnalysis(designComposition || getStoredDesignCompositionAnalysis(screen), screen);
  const compositionPrompt = formatDesignCompositionForPrompt(composition);
  const componentBaselinePrompt = buildUiComponentBaselinePrompt(screen, composition);
  const lockedAnchorPrompt = formatProjectLayoutAnchorsForPrompt(getLockedProjectLayoutAnchors(screen, composition));
  const closeBehavior = formatScreenCloseBehaviorForPrompt(screen, "策划案未明确；按当前交互案段落判断，不能默认加返回/关闭/主页控件。");
  const closeBehaviorRule = isNoNavigationCloseBehavior(closeBehavior)
    ? "当前界面关闭方式明确为无关闭/无返回：画面中不得出现返回按钮、关闭按钮、主页按钮或额外通用导航控件。"
    : `当前界面关闭方式为：${closeBehavior}。只绘制该关闭方式明确需要的返回、关闭或主页控件；如果没有提到某类控件，就不要因为通用模板或总资产参考图自动添加。`;
  const totalAssetRule = hasTotalAsset
    ? `请求参考图中包含项目级总资产：${totalAssetReferences.map((item) => item.label).join("、")}。UI 控件只参考 UI控件资产图；背景只参考背景设定图；${usesCharacterAsset ? "角色/宠物/NPC/头像/立绘只参考角色设定图。" : "当前界面未要求角色内容，不得因为角色设定图存在而新增角色。"}这些资产只定义同角色资产的画风、材质、光影和状态，不定义当前界面的组件清单或业务入口。`
    : "当前尚未生成总资产；本次可按策划案、交互案、用户关键词和画风参考生成普通界面，但本图不得沉淀为后续项目级资产基准。";
  const stylePriorityRule = hasTotalAsset
    ? "总资产图片是本次唯一视觉参考来源；不要再依据原始参考图分析文本或上传参考图重新解释画风。"
    : "当前没有可用总资产时，只把上传参考图作为视觉参考，不发送参考图分析长文本。";
  const persistentAnchorPrompt = formatCompositionItemsForPrompt("项目级固定锚点", composition?.persistentAnchors || []);
  const defaultAnchorPolicy = getDefaultPersistentAnchorPolicy(screen);
  const titlePolicy = composition?.titlePolicy || defaultAnchorPolicy.titlePolicy;
  const anchorExceptions = (composition?.anchorExceptions || []).join("；") || defaultAnchorPolicy.anchorExceptions;
  const screenKind = String(screen?.kind || "").toLowerCase();
  const backgroundTypeRule = screenKind === "main" || screenKind === "lobby"
    ? "主界面/大厅背景可以更完整地承载世界观，但中景和远景都要弱化，确保主操作区和资源栏优先级最高。"
    : ["list", "inventory", "shop", "detail", "task", "collection"].includes(screenKind)
      ? "列表、背包、商店、详情、任务等信息型界面的背景必须更克制，优先使用材质层、浅渐层、轻纹理和弱景深，不要用大片重装饰抢信息层级。"
      : ["modal", "dialog", "popup"].includes(screenKind)
        ? "弹窗和局部功能页背景主要负责衬托主体容器，不新增强视觉焦点，不堆叠多块重面板。"
        : "背景需要根据当前界面功能控制装饰密度：展示型界面可稍丰富，信息型界面更克制。";

  return [
    `请生成一张正式游戏界面视觉设计稿，而不是线框图。`,
    `项目名称：${state.gameName || gameName.value || detectGameName(brief) || "未命名小游戏"}`,
    `目标界面：${screen.name}`,
    `当前界面关闭方式：${closeBehavior}`,
    `目标平台：${platform}`,
    `画布规格：${canvasSpec.promptText}，完整 UI 截图视角。`,
    `用户输入画风关键词：${styleKeywords || "未填写，按策划案自动提炼风格"}`,
    `游戏关键词：${keywords}`,
    `当前界面精简生图指令（只来自目标界面章节，已移除异常处理和 Figma 交付内容）：\n${screenDesignPrompt}`,
    `当前界面组件裁剪分析（最高优先级）：\n${compositionPrompt}`,
    `已锁定组件基准（来自 UI控件资产图）：\n${componentBaselinePrompt}`,
    `已锁定项目级位置锚点（最高优先级）：\n${lockedAnchorPrompt}`,
    `控件需求硬约束：策划案、交互案和当前界面组件裁剪里的“必须出现组件”是下限，不能漏掉或用别的控件替代；“可选组件”和合理状态变体可以出现，但必须服务当前页面目标。`,
    `组件延伸边界：可以补充红点、角标、空态、禁用态、加载态、二级按钮、列表项变体、弹窗确认/取消等辅助状态；不得为了填充画面额外增加无关导航、系统入口、资源栏或装饰按钮。`,
    `组件黑名单硬约束：“禁止出现组件”和“负向规则”中列出的按钮、入口、资源栏、图标、系统功能不得出现在画面中，即使总资产或参考图里有这些控件也不能复制。`,
    `关闭/返回控件硬约束：${closeBehaviorRule}`,
    `交互案文案边界硬约束：页面目标、模块职责、流程描述、状态说明、设计建议只用于理解界面结构，不得原样写进最终界面。`,
    `上屏文案硬约束：只有“允许出现的界面文案”里明确列出的标题、按钮字、Tab 名、奖励名、资源名和状态短标签可以直接上屏；未列出的说明句、流程句、建议句不要作为标题、栏目名、卡片名、按钮文案或信息文案绘制。`,
    `设计要求：保留交互稿中的信息层级、入口位置、当前界面必需操作、状态反馈和页面目标；视觉上提升为超高品质，高保真游戏 UI；按钮、卡片、资源栏、Tab、弹窗和状态提示必须以当前界面组件裁剪分析为准；不要输出说明文字或设计文档，只输出界面视觉稿。`,
    `跨界面固定锚点规则：${persistentAnchorPrompt}`,
    `通用控件位置一致性硬约束：同一套 UI控件资产图里的返回、关闭、设置、主页、资源栏、主要界面标题等通用控件，在普通界面中必须保持稳定位置和统一样式。不要为了构图好看把这些控件在每个界面随意改到不同角落。`,
    `标题区一致性硬约束：${titlePolicy}`,
    `锚点例外规则：${anchorExceptions}`,
    `画风迁移优先级：${stylePriorityRule}`,
    `背景克制度规则：${backgroundTypeRule}`,
    `背景安全硬约束：背景只负责世界观、材质、空间层次、轻装饰和光影氛围，不允许与主按钮、主卡片、关键数值、资源栏或正文区形成竞争对比。`,
    `视觉层级硬约束：UI层和角色层必须明显前于背景层；背景只能作为后景承托，必须主动拉开与前景的视觉层级，不能在亮度峰值、对比度、装饰密度、细节密度或焦点上干扰前面的 UI 层和角色层，也不能与主按钮、主卡片、关键数值、资源栏或角色立绘形成竞争焦点。`,
    `背景留白与焦点分工硬约束：最终界面必须保留像参考图那样的浅背景、明显留白和前景聚焦关系。背景需要通过更浅的底色、更低的饱和度、更弱的边缘清晰度和更稀疏的装饰退后；角色、标题区、主卡片、通行证主奖励、资源栏和主按钮要比背景更集中、更清晰、更有视觉优先级。`,
    `信息型页面背景附加约束：通行证、列表、任务、商店、背包、详情等信息型页面的背景必须更偏浅底、弱装饰、低中心竞争，不能画成完整场景海报，也不能让建筑、旗帜、器具、地面纹理与正文和奖励区争抢视觉中心。`,
    `总资产优先级硬约束：${totalAssetRule}`,
    `总资产使用限制：UI控件资产图只用于继承“已被组件裁剪分析允许出现或合理延伸”的同类型控件语言、按钮层级、面板材质、Tab样式、弹窗样式、图标渲染和角标规则；背景设定图只定义场景材质、空间层次、光影和 UI 安全区；角色设定图只在当前界面需要角色内容时定义角色画风。不得把任何资产图当成完整界面布局照抄，也不得无差别复制资产图里的所有控件或角色。`,
    `通用 UI资产映射规则：UI控件资产图是一套固定 A-H 通用控件族，不是当前界面的控件清单。生成当前界面前必须以本界面交互案和组件裁剪分析抽取需要的功能，再按资产图里的英文标签映射到最接近控件，例如 Back Button - go back、Resource Token - show currency、Top Tab - switch top category、Item Card - display item reward、Confirm Bar Button - confirm action；没有直接对应项时使用最近邻控件外推，并保持材质、描边、圆角、阴影、状态语言一致。资产图里的英文小标签只用于识别，不得出现在最终界面。`,
    `UI资产基准缺失恢复规则：如果“已锁定组件基准”缺少当前界面需要的控件，不要停止生成，也不要改用默认网页控件；必须直接查看 UI控件资产图，按 Control Name - function label 找最近邻控件并外推材质、描边、圆角、阴影和状态语言。`,
    `UI组件来源硬约束：当 UI控件资产图存在时，返回按钮、关闭按钮、设置按钮、资源 token、Tab 默认/选中态、底部导航默认/选中态、界面标题区、进度条和图标按钮只能从 UI控件资产图及其已锁定组件基准继承；原始参考图不得覆盖这些控件的外轮廓、描边层、材质、高光、图标承载和状态差异。`,
    `返回按钮特别硬约束：如果当前界面需要返回按钮，必须复用 UI资产图中箭头返回按钮的同类形态：粗黑白外框、红/白箭头状态、斜切碎片轮廓、半调纹理、强描边和图标承载比例；不得生成横向普通矩形“返回”条、不得改箭头底板、不得把返回按钮每页放在不同位置。`,
    `一级界面标题硬约束：一级界面名称必须使用已锁定标题锚点；标题区相对返回/资源栏/底部导航的位置在不同一级界面保持一致，只有交互案明确特殊页时才允许偏离。`,
    `控件一致性硬约束：不要再以任何普通界面作为控件基准；只有总资产里的 UI控件资产图可以定义跨界面控件风格。普通界面生成时不得重新发明返回按钮、资源 token、Tab 选中态、底部导航选中态或同类状态组件。`,
    `主题元素替换硬约束：参考图只提供视觉表达方式；不要迁移参考图原游戏的主题绑定元素，例如角色、IP头像、道具、徽章、货币图案、资源符号、装饰图标和主题文案。`,
    `图标语义硬约束：图标表达对象必须来自当前界面精简指令、组件裁剪分析或总资产图；不要迁移参考图原游戏的主题绑定符号。`,
    `迁移限制：不要复制参考图中的具体角色、商品、文字、原始布局或无关玩法；不要输出说明文字、标注稿、Figma面板或多张拼图。`
  ].join("\n");
}

function createInterfaceSvg(screen) {
  const brief = getPlanningDocument();
  const genreProfile = getGenreReferenceProfile(brief);
  const projectName = escapeXml(state.gameName || gameName.value || detectGameName(brief) || "未命名小游戏");
  const platform = escapeXml(getPlatformText($("#platform").value));
  const data = getScreenVisualData(screen);
  const manual = getManualVisualData(screen);
  const storedAnalysis = getStoredVisualAnalysis(screen);
  const analysisTerms = [
    ...(storedAnalysis?.layoutRegions || []).map((item) => item.name),
    ...(storedAnalysis?.components || []).map((item) => item.name),
    ...(storedAnalysis?.flows || [])
  ];
  const keywords = [...new Set([...(manual.terms || []), ...analysisTerms, ...getKeywords(brief)])];
  const annotationsData = manual.annotations.length ? manual.annotations : data.annotations.slice(0, 4);
  const screenGoal = manual.goal || screen.goal;
  const closeBehavior = manual.closeBehavior || getScreenCloseBehavior(screen);
  const mockup = buildAnalysisDrivenMockup(screen, storedAnalysis) || buildScreenMockup(screen);
  const annotations = annotationsData.slice(0, 4).map((item, index) => annotationStripBlock(110 + index * 424, 216, 400, index + 1, item.title, item.body)).join("");
  const metadata = storedAnalysis
    ? [
        screen.name,
        screenGoal,
        closeBehavior,
        storedAnalysis.layoutType,
        ...(storedAnalysis.layoutRegions || []).map((item) => item.name),
        ...(storedAnalysis.components || []).map((item) => item.name),
        storedAnalysis.primaryAction?.label
      ].filter(Boolean).join(" / ")
    : "";

  return `<svg viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
  ${metadata ? `<desc>${escapeXml(metadata)}</desc>` : ""}
  <rect width="1920" height="1080" fill="#f4f6f7"/>
  <rect x="46" y="42" width="1828" height="996" fill="#fffefd" stroke="#cbd7dc" stroke-width="2"/>
  <rect x="46" y="42" width="1828" height="92" fill="#eef8fb" stroke="#cbd7dc" stroke-width="2"/>
  ${svgText(82, 98, `${projectName} / ${screen.name} 交互设计方案`, 30, "#1f272b", 1180, 34, "700")}
  ${svgText(1442, 96, platform, 17, "#66757d", 360, 24)}

  <rect x="82" y="156" width="1748" height="212" fill="#ffffff" stroke="#cbd7dc" stroke-width="2"/>
  <text x="110" y="196" font-family="Microsoft YaHei, Arial" font-size="24" font-weight="700" fill="#1f272b">交互标注</text>
  ${annotations}

  <rect x="82" y="392" width="1748" height="560" fill="#fffaf7" stroke="#d8c5b8" stroke-width="2"/>
  <text x="110" y="430" font-family="Microsoft YaHei, Arial" font-size="20" font-weight="700" fill="#1f272b">界面结构稿 / 1920×1080 / 16:9</text>
  <g transform="translate(404 270) scale(0.74)">
    ${mockup}
  </g>

  <rect x="82" y="972" width="1748" height="44" fill="#fffaf4" stroke="#d8c5b8" stroke-width="2"/>
  ${svgText(110, 1000, `关键词：${keywords.slice(0, 8).join(" / ")}　｜　页面目标：${screenGoal}${closeBehavior ? `　｜　关闭方式：${closeBehavior}` : ""}`, 16, "#66757d", 1630, 22)}
  </svg>`;
}

function getManualVisualData(screen) {
  const stored = getStoredVisualAnalysis(screen);
  if (stored) {
    return {
      goal: stored.goal || "",
      closeBehavior: stored.closeBehavior || getScreenCloseBehavior(screen),
      annotations: Array.isArray(stored.annotations) ? stored.annotations : [],
      terms: Array.isArray(stored.terms) ? stored.terms : []
    };
  }

  return getManualVisualDataFromPlan(screen);
}

function getStoredVisualAnalysis(screen) {
  if (!screen || !state.visualAnalyses) return null;
  return state.visualAnalyses[screen.id] || null;
}

function getManualVisualDataFromPlan(screen) {
  const plan = getVisualPlanText();
  if (!plan) return { goal: "", closeBehavior: getScreenCloseBehavior(screen), annotations: [] };

  const section = extractScreenSection(plan, screen);
  if (!section) return { goal: "", closeBehavior: getScreenCloseBehavior(screen), annotations: [] };

  const goal = extractAfterHeading(section, "页面目标") || extractFirstMeaningfulLine(section);
  const closeBehavior = extractAfterHeadings(section, ["关闭/返回方式", "关闭方式", "返回方式", "关闭/返回控件"]) || getScreenCloseBehavior(screen);
  const annotations = [];

  [
    [["布局结构", "界面结构"], "布局结构"],
    [["关键交互", "交互要点"], "关键交互"],
    [["状态反馈", "状态说明"], "状态反馈"],
    [["程序关注点", "交付建议"], "程序关注点"]
  ].forEach(([headings, title]) => {
    const body = extractAfterHeadings(section, headings);
    if (body) annotations.push({ title, body });
  });

  if (!annotations.length) {
    splitManualBullets(section).slice(0, 4).forEach((body, index) => {
      annotations.push({ title: ["交互重点", "界面结构", "状态说明", "交付建议"][index] || `要点 ${index + 1}`, body });
    });
  }

  return { goal, closeBehavior, annotations };
}

function getVisualAnalysisSource(screen) {
  const stored = getStoredVisualAnalysis(screen);
  if (!stored) return "";

  return [
    stored.goal,
    stored.closeBehavior ? `关闭方式：${stored.closeBehavior}` : "",
    ...(stored.annotations || []).map((item) => `${item.title}：${item.body}`),
    ...(stored.layoutRegions || []).map((item) => `${item.name}：${item.role || item.elements?.join("、") || ""}`),
    ...(stored.components || []).map((item) => `${item.name}：${item.role || item.type || ""}`),
    ...(stored.flows || []),
    ...(stored.states || []),
    ...(stored.terms || [])
  ].filter(Boolean).join("\n");
}

function getVisualPlanText() {
  return [planOutput.value.trim(), state.fullPlan, state.plan]
    .filter(Boolean)
    .map((item) => item.replace(/\r/g, ""))
    .filter((item, index, list) => list.indexOf(item) === index)
    .join("\n\n");
}

function extractScreenSection(plan, screen) {
  const aliases = getScreenAliases(screen);

  for (const alias of aliases) {
    const escaped = escapeRegExp(alias);
    const regex = new RegExp(`(^|\\n)#{2,5}[^\\n]*${escaped}[^\\n]*\\n([\\s\\S]*?)(?=\\n#{2,5}\\s|$)`, "i");
    const match = plan.match(regex);
    if (match) return match[2].trim();
  }

  const lines = plan.split("\n");
  const start = lines.findIndex((line) => isScreenHeadingLine(line, aliases));
  if (start < 0) {
    const block = findBestScreenSectionBlock(plan, screen, aliases);
    return block?.body || "";
  }

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (isAnyScreenHeadingLine(lines[index])) {
      end = index;
      break;
    }
  }

  return lines.slice(start + 1, end).join("\n").trim();
}

function getScreenAliases(screen) {
  const ruleAliases = screenKeywordRules
    .filter((rule) => rule.kind === screen.kind || normalizeBriefForScreenDetect(rule.name) === normalizeBriefForScreenDetect(screen.name))
    .flatMap((rule) => [rule.name, ...rule.aliases]);
  const mainAliases = screen.kind === "main" || /主场景|主界面|首页|大厅|主页|home|lobby/i.test(screen.name || "")
    ? ["主场景界面", "主界面", "首页", "大厅", "主大厅", "主页", "Home", "Lobby"]
    : [];
  return [...new Set([screen.name, getScreenCloseBehavior(screen), ...(screen.aliases || []), ...ruleAliases, ...mainAliases].filter(Boolean))];
}

function findBestScreenSectionBlock(plan, screen, aliases = getScreenAliases(screen)) {
  const blocks = buildInteractionHeadingBlocks(plan);
  if (!blocks.length) return null;
  const scored = blocks
    .map((block) => ({
      block,
      score: scoreScreenSectionHeading(block.heading, screen, aliases)
    }))
    .filter((item) => item.score >= 6)
    .sort((left, right) => right.score - left.score);
  return scored[0]?.block || null;
}

function buildInteractionHeadingBlocks(plan) {
  const lines = String(plan || "").replace(/\r/g, "").split("\n");
  const headings = [];
  lines.forEach((line, index) => {
    if (!isPotentialScreenSectionHeading(line)) return;
    headings.push({
      index,
      heading: line.trim(),
      level: getMarkdownHeadingLevel(line)
    });
  });
  return headings.map((heading, headingIndex) => {
    let end = lines.length;
    for (let index = headingIndex + 1; index < headings.length; index += 1) {
      const next = headings[index];
      if (!heading.level || !next.level || next.level <= heading.level) {
        end = next.index;
        break;
      }
    }
    return {
      heading: heading.heading,
      body: lines.slice(heading.index + 1, end).join("\n").trim()
    };
  }).filter((block) => block.heading && block.body);
}

function isPotentialScreenSectionHeading(line) {
  const trimmed = String(line || "").trim();
  if (!trimmed || /^[-*]\s/.test(trimmed) || trimmed.length > 96) return false;
  return /^#{1,6}\s/.test(trimmed)
    || /^\d+(?:\.\d+)*[\.、]?\s*/.test(trimmed)
    || /^[一二三四五六七八九十]+[、.]\s*/.test(trimmed)
    || /界面|页面|HUD|详情|系统|装饰|大厅|主场景|面板/.test(trimmed);
}

function getMarkdownHeadingLevel(line) {
  const match = String(line || "").match(/^(#{1,6})\s/);
  return match ? match[1].length : 0;
}

function scoreScreenSectionHeading(heading, screen, aliases = []) {
  const normalizedHeading = normalizeLabel(heading);
  const normalizedKind = normalizeBriefForScreenDetect(screen?.kind || "");
  let score = 0;
  aliases.forEach((alias) => {
    const normalizedAlias = normalizeLabel(alias);
    if (!normalizedAlias) return;
    if (normalizedHeading.includes(normalizedAlias)) score += Math.min(12, normalizedAlias.length + 4);
    else if (normalizedAlias.includes(normalizedHeading) && normalizedHeading.length >= 3) score += 5;
  });
  if (screen?.kind === "main" && /主场景|主界面|首页|大厅|主页|home|lobby/i.test(heading)) score += 8;
  if (screen?.kind === "character" && /角色|宠物|伙伴|英雄|头像|立绘/i.test(heading)) score += 8;
  if (screen?.kind === "task" && /任务|成就|目标/i.test(heading)) score += 8;
  if (screen?.kind === "shop" && /商店|商城|购买|礼包/i.test(heading)) score += 8;
  if (screen?.kind === "social" && /社交|好友|聊天|公会/i.test(heading)) score += 8;
  if (screen?.kind === "settings" && /设置|选项/i.test(heading)) score += 8;
  if (normalizedKind && normalizedHeading.includes(normalizedKind)) score += 3;
  return score;
}

function isAnyScreenHeadingLine(line) {
  return screens.some((screen) => isScreenHeadingLine(line, getScreenAliases(screen)));
}

function isScreenHeadingLine(line, aliases) {
  const trimmed = line.trim();
  if (!trimmed || /^[-*]\s/.test(trimmed) || trimmed.length > 72) return false;

  const headingLike = /^#{1,6}\s/.test(trimmed)
    || /^\d+(?:\.\d+)*[\.、]?\s*/.test(trimmed)
    || /^[一二三四五六七八九十]+[、.]\s*/.test(trimmed)
    || /界面|HUD|详情|系统|装饰/.test(trimmed);

  if (!headingLike) return false;

  const normalized = normalizeLabel(trimmed);
  return aliases.some((alias) => normalized.includes(normalizeLabel(alias)));
}

function normalizeLabel(value) {
  return String(value).replace(/[\s#（）()：:、.《》<>]/g, "").toLowerCase();
}

function extractAfterHeading(section, heading) {
  return extractAfterHeadings(section, [heading]);
}

function extractAfterHeadings(section, headings) {
  for (const heading of headings) {
    const regex = new RegExp(`(^|\\n)#{3,6}\\s*${escapeRegExp(heading)}\\s*\\n([\\s\\S]*?)(?=\\n#{3,6}\\s|\\n###\\s|$)`, "i");
    const match = section.match(regex);
    if (match) return cleanMarkdownText(match[2]);
  }

  const lines = section.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const match = matchPlainFieldHeading(lines[index], headings);
    if (!match) continue;

    const content = [];
    if (match.trailing) content.push(match.trailing);

    for (let next = index + 1; next < lines.length; next += 1) {
      if (isAnyFieldHeadingLine(lines[next]) || isAnyScreenHeadingLine(lines[next])) break;
      content.push(lines[next]);
    }

    return cleanMarkdownText(content.join("\n"));
  }

  return "";
}

function matchPlainFieldHeading(line, headings) {
  const trimmed = line.trim();
  for (const heading of headings) {
    const regex = new RegExp(`^(?:[-*]\\s*)?${escapeRegExp(heading)}(?:\\s*[：:]\\s*(.*)|\\s*)$`);
    const match = trimmed.match(regex);
    if (match) return { trailing: (match[1] || "").trim() };
  }
  return null;
}

function isAnyFieldHeadingLine(line) {
  return matchPlainFieldHeading(line, INTERACTION_PLAN_FIELD_HEADINGS);
}

function extractFirstMeaningfulLine(text) {
  const line = text.split("\n").map(cleanMarkdownText).find((item) => item.length > 8);
  return line || "";
}

function splitManualBullets(text) {
  return text
    .split(/\n+/)
    .map(cleanMarkdownText)
    .filter((line) => line.length > 10 && !line.startsWith("#"))
    .slice(0, 8);
}

function cleanMarkdownText(text) {
  return text
    .replace(/^[-*]\s+/gm, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createInteractionSvg() {
  const selectedScreens = getSelectedScreens();
  const brief = briefText.value.trim();
  const keywords = getKeywords(brief);
  const projectName = escapeXml(state.gameName || gameName.value || detectGameName(brief) || "未命名小游戏");
  const platform = escapeXml(getPlatformText($("#platform").value));
  const screenNodes = selectedScreens.slice(0, 8).map((screen, index) => {
    const col = index % 4;
    const row = Math.floor(index / 4);
    const x = 110 + col * 250;
    const y = 420 + row * 170;
    return screenCardSvg(x, y, screen, index + 1);
  }).join("");
  const links = selectedScreens.slice(1, 8).map((screen, index) => {
    const fromIndex = index;
    const toIndex = index + 1;
    const fromCol = fromIndex % 4;
    const fromRow = Math.floor(fromIndex / 4);
    const toCol = toIndex % 4;
    const toRow = Math.floor(toIndex / 4);
    const x1 = 110 + fromCol * 250 + 210;
    const y1 = 420 + fromRow * 170 + 58;
    const x2 = 110 + toCol * 250;
    const y2 = 420 + toRow * 170 + 58;
    return `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="#8aa1aa" stroke-width="2" marker-end="url(#arrow)"/>`;
  }).join("");

  return `<svg viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L9,3 z" fill="#8aa1aa"/>
    </marker>
  </defs>
  <rect width="1920" height="1080" fill="#f8fbfc"/>
  <rect x="60" y="50" width="1800" height="980" fill="#fffefd" stroke="#cbd7dc" stroke-width="2"/>
  <rect x="60" y="50" width="1800" height="96" fill="#eef8fb" stroke="#cbd7dc" stroke-width="2"/>
  ${svgText(100, 110, `${projectName} 交互设计方案可视化`, 34, "#1f272b", 1180, 38, "700")}
  ${svgText(1420, 110, platform, 18, "#66757d", 360, 24)}

  <rect x="100" y="190" width="520" height="170" fill="#ffffff" stroke="#cbd7dc" stroke-width="2"/>
  <text x="130" y="236" font-family="Microsoft YaHei, Arial" font-size="24" font-weight="700" fill="#1f272b">项目关键词</text>
  ${keywords.slice(0, 6).map((keyword, index) => `<rect x="${130 + (index % 3) * 150}" y="${260 + Math.floor(index / 3) * 44}" width="120" height="30" fill="${index % 2 ? "#cfeeff" : "#fff0b2"}" stroke="#9eb3bc" stroke-width="2"/><text x="${190 + (index % 3) * 150}" y="${281 + Math.floor(index / 3) * 44}" text-anchor="middle" font-family="Microsoft YaHei, Arial" font-size="15" fill="#1f272b">${escapeXml(keyword)}</text>`).join("")}

  <rect x="680" y="190" width="520" height="170" fill="#ffffff" stroke="#cbd7dc" stroke-width="2"/>
  <text x="710" y="236" font-family="Microsoft YaHei, Arial" font-size="24" font-weight="700" fill="#1f272b">核心流程</text>
  <text x="710" y="282" font-family="Microsoft YaHei, Arial" font-size="18" fill="#66757d">进入游戏 → 查看状态 → 执行操作 → 获得反馈</text>
  <text x="710" y="318" font-family="Microsoft YaHei, Arial" font-size="18" fill="#66757d">消费资源 → 解锁目标 → 按关闭方式回到主流程</text>

  <rect x="1260" y="190" width="520" height="170" fill="#ffffff" stroke="#cbd7dc" stroke-width="2"/>
  <text x="1290" y="236" font-family="Microsoft YaHei, Arial" font-size="24" font-weight="700" fill="#1f272b">状态规范</text>
  <text x="1290" y="282" font-family="Microsoft YaHei, Arial" font-size="18" fill="#66757d">默认 / 高亮 / 禁用 / 完成 / 空状态 / 错误</text>
  <text x="1290" y="318" font-family="Microsoft YaHei, Arial" font-size="18" fill="#66757d">按钮状态与系统数据字段一一对应</text>

  <text x="100" y="400" font-family="Microsoft YaHei, Arial" font-size="26" font-weight="700" fill="#1f272b">页面结构与引用关系</text>
  ${links}
  ${screenNodes}

  <rect x="1120" y="420" width="660" height="360" fill="#ffffff" stroke="#cbd7dc" stroke-width="2"/>
  <text x="1160" y="470" font-family="Microsoft YaHei, Arial" font-size="26" font-weight="700" fill="#1f272b">组件拆分建议</text>
  ${componentLine(1160, 520, "TopBar：玩家信息 / 关闭方式控件 / 资源展示")}
  ${componentLine(1160, 566, "Button：主操作 / 次操作 / 禁用 / 可领取")}
  ${componentLine(1160, 612, "Tab：分类切换 / 任务页签 / 筛选")}
  ${componentLine(1160, 658, "Card：商品 / 角色 / 道具 / 任务")}
  ${componentLine(1160, 704, "Panel：详情区 / 弹窗 / 状态提示")}

  <rect x="100" y="830" width="1680" height="140" fill="#fffaf4" stroke="#d8c5b8" stroke-width="2"/>
  <text x="130" y="878" font-family="Microsoft YaHei, Arial" font-size="24" font-weight="700" fill="#1f272b">交付说明</text>
  ${svgText(130, 920, "这张 SVG 用于 Figma 中的交互设计方案页，展示页面关系、核心流程、状态体系和组件拆分方向。", 18, "#66757d", 1540, 26)}
  ${svgText(130, 950, "后续 UI 设计可基于此图继续拆画板、建组件、补状态标注和原型连线。", 18, "#66757d", 1540, 26)}
  </svg>`;
}

function getScreenVisualData(screen) {
  const screenObj = typeof screen === "string"
    ? screens.find((item) => item.id === screen) || { id: screen, name: screen, kind: inferScreenKind(screen) }
    : screen;
  const profile = getScreenProfile(screenObj.kind);
  const id = screenObj.id;

  if (!["hud", "shop", "codex", "bag", "tasks", "detail", "social", "home"].includes(id)) {
    return { annotations: profile.annotations };
  }

  const map = {
    hud: {
      annotations: [
        { title: "状态驱动", body: "状态提醒与底部核心操作一一对应，关键需求高亮主按钮，次要需求进入二级入口。" },
        { title: "主操作层级", body: "高频操作位于底部中央；商店、图鉴、背包、任务、好友等低频系统入口分区展示。" },
        { title: "对象反馈", body: "核心对象动画、数值和提示即时响应；Babylon 只用于生成方案文本，不参与本地点击反馈。" },
        { title: "信息常驻", body: "顶部常驻玩家等级、金币、爱心和设置入口，方便任务、商店、成长反馈与系统设置联动。" }
      ]
    },
    shop: {
      annotations: [
        { title: "购买路径", body: "点击商品卡刷新右侧详情，确认效果、库存与价格后执行购买或立即使用。" },
        { title: "分类筛选", body: "一级分类控制商品池，二级筛选控制推荐、价格、稀有度和新品排序。" },
        { title: "资源状态", body: "金币和爱心常驻右上角；资源不足时购买按钮禁用并提示获取来源。" },
        { title: "商品状态", body: "商品卡支持推荐、限时、已拥有、售罄、不可购买等状态，便于后续扩展。" }
      ]
    },
    codex: {
      annotations: [
        { title: "收集目标", body: "顶部展示总收集进度，强化长期目标；筛选区支持已解锁、未解锁和稀有类型。" },
        { title: "卡片状态", body: "已解锁显示完整形象和等级/状态；未解锁显示剪影、问号和解锁条件。" },
        { title: "详情承接", body: "点击条目卡后右侧刷新属性、来源、记录和解锁条件，支持进入详情页。" },
        { title: "目标提示", body: "未解锁信息不完全隐藏，保留关键条件，形成明确追求路径。" }
      ]
    },
    bag: {
      annotations: [
        { title: "道具管理", body: "按食物、玩具、材料、装饰分类，降低高密度道具检索成本。" },
        { title: "选中反馈", body: "点击道具格后右侧显示详情；选中道具高亮，新道具显示 NEW 角标。" },
        { title: "使用逻辑", body: "可直接作用于当前目标；若存在多个目标，则弹出目标选择框。" },
        { title: "出售安全", body: "出售为二级行为，需二次确认，避免误操作造成资源损失。" }
      ]
    },
    tasks: {
      annotations: [
        { title: "目标驱动", body: "每日任务驱动短期行为，成就任务承接长期成长与收集目标。" },
        { title: "奖励回收", body: "可领取任务使用一级按钮，前往和查看使用二级按钮，减少视觉干扰。" },
        { title: "活跃度", body: "阶段奖励节点展示未达成、可领取、已领取三种状态。" },
        { title: "跳转闭环", body: "点击前往应直达对应系统，并高亮目标操作，减少路径损耗。" }
      ]
    },
    detail: {
      annotations: [
        { title: "资料承接", body: "展示对象资料、等级状态、故事档案或历史记录，强调玩家与核心对象关系。" },
        { title: "成长节点", body: "成长节点展示解锁动作、外观、剧情或功能奖励，形成成长预期。" },
        { title: "预览确认", body: "外观、装备或状态变化支持即时预览，确认后再消耗资源。" },
        { title: "资料组织", body: "资料、外观、互动档案和记录使用页签切换，保持信息清晰。" }
      ]
    },
    social: {
      annotations: [
        { title: "好友入口", body: "好友列表显示在线、可拜访、可互动和奖励状态。" },
        { title: "拜访流程", body: "点击好友进入好友家园，可轻互动并获得社交奖励。" },
        { title: "状态提醒", body: "可领取奖励和新拜访记录通过角标提示，避免强弹窗打断。" },
        { title: "隐私边界", body: "好友互动仅影响社交奖励和轻量反馈，不影响核心养成资产。" }
      ]
    },
    home: {
      annotations: [
        { title: "装饰编辑", body: "左侧或底部为装饰物品栏，中间为家园预览和摆放区域。" },
        { title: "编辑操作", body: "支持拖拽摆放、旋转、撤销、保存，保证布置过程可控。" },
        { title: "限制反馈", body: "空间不足、未拥有、不可摆放时需要即时提示原因。" },
        { title: "展示价值", body: "装饰会反映到主界面或好友拜访场景，增强个性化表达。" }
      ]
    }
  };

  return map[id] || map.hud;
}

function buildScreenMockup(screen) {
  const screenObj = typeof screen === "string"
    ? screens.find((item) => item.id === screen) || { id: screen, name: screen, kind: inferScreenKind(screen) }
    : screen;
  const builders = {
    hud: buildHudMockup,
    shop: buildShopMockup,
    codex: buildCodexMockup,
    bag: buildBagMockup,
    tasks: buildTasksMockup,
    detail: buildDetailMockup,
    social: buildSocialMockup,
    home: buildHomeMockup
  };

  if (builders[screenObj.id]) return builders[screenObj.id](screenObj);
  if (screenObj.kind === "main") return buildMainGenericMockup(screenObj);
  if (screenObj.kind === "gameplay") return buildGameplayMockup(screenObj);
  if (screenObj.kind === "level") return buildLevelMapMockup(screenObj);
  if (screenObj.kind === "character") return buildCharacterPanelMockup(screenObj);
  if (screenObj.kind === "inventory") return buildBagMockup(screenObj);
  if (screenObj.kind === "shop") return buildShopMockup(screenObj);
  if (screenObj.kind === "task") return buildTasksMockup(screenObj);
  if (screenObj.kind === "collection") return buildCodexMockup(screenObj);
  if (screenObj.kind === "social") return buildSocialMockup(screenObj);
  if (screenObj.kind === "boss") return buildBossMockup(screenObj);
  if (screenObj.kind === "story") return buildStoryMockup(screenObj);
  if (screenObj.kind === "leaderboard") return buildLeaderboardMockup(screenObj);
  if (screenObj.kind === "settings") return buildSettingsMockup(screenObj);
  if (screenObj.kind === "result") return buildResultMockup(screenObj);
  if (screenObj.kind === "event") return buildEventMockup(screenObj);
  if (screenObj.kind === "gacha") return buildGachaMockup(screenObj);
  if (screenObj.kind === "room") return buildRoomMockup(screenObj);
  if (screenObj.kind === "base") return buildBaseMockup(screenObj);
  return buildGenericMockup(screenObj);
}

function buildAnalysisDrivenMockup(screen, analysis) {
  if (!analysis || typeof analysis !== "object") return "";
  const regions = (analysis.layoutRegions || []).filter((item) => item.name || item.role || item.elements?.length);
  const components = (analysis.components || []).filter((item) => item.name || item.role);

  if (!regions.length && !components.length) return "";

  const layoutType = normalizeVisualLayoutType(analysis.layoutType, screen);
  if (layoutType === "main") return buildVisualMainMockup(screen, analysis);
  if (layoutType === "shop-grid") return buildVisualShopGridMockup(screen, analysis);
  if (layoutType === "task-progress") return buildVisualTaskProgressMockup(screen, analysis);
  if (layoutType === "form-flow") return buildVisualFormFlowMockup(screen, analysis);
  if (layoutType === "list-detail") return buildVisualListDetailMockup(screen, analysis);
  return buildVisualSlotMockup(screen, analysis);
}

function getVisualAnalysisRegions(analysis = {}) {
  return (analysis.layoutRegions || []).filter((item) => item.name || item.role || item.elements?.length);
}

function getVisualAnalysisComponents(analysis = {}) {
  return (analysis.components || []).filter((item) => item.name || item.role || item.type);
}

function getRegionBySlot(regions = [], slot = "", fallbackIndex = 0) {
  const normalizedSlot = cleanAnalysisText(slot).toLowerCase();
  return regions.find((item) => cleanAnalysisText(item.slot).toLowerCase().includes(normalizedSlot))
    || regions[fallbackIndex]
    || { name: "内容区域", role: "承载当前界面核心内容", elements: [] };
}

function getComponentsForRegion(components = [], region = {}, limit = 4) {
  const regionName = normalizeLabel(region.name || "");
  const matched = components.filter((item) => {
    const belongsTo = normalizeLabel(item.belongsTo || "");
    return belongsTo && regionName && (belongsTo.includes(regionName) || regionName.includes(belongsTo));
  });
  return (matched.length ? matched : components).slice(0, limit);
}

function getVisualPrimaryActionLabel(analysis = {}) {
  return analysis.primaryAction?.label || analysis.primaryAction?.name || "主操作";
}

function visualRegionPanel(x, y, width, height, region = {}, components = [], options = {}) {
  const fill = options.fill || "#fffdfb";
  const title = shortVisualLabel(region.name || "内容区域", options.titleLength || 12);
  const desc = region.role || region.elements?.join("、") || "承载当前界面核心信息与操作状态";
  const componentLines = components.slice(0, options.componentLimit || 4)
    .map((item, index) => mockText(x + 24, y + 86 + index * 30, 13, `• ${shortVisualLabel(item.name || item.type, 12)}`, "#66757d"))
    .join("");
  return `
  <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}" stroke="#d8c5b8" stroke-width="2"/>
  ${mockText(x + 24, y + 38, 18, title, "#5c4b45", "700")}
  ${svgText(x + 24, y + 64, desc, 12, "#66757d", width - 48, 16, "400", 2)}
  ${componentLines}`;
}

function visualHeaderBar(screen, analysis) {
  const navLabel = getCloseBehaviorControlLabel({ ...screen, closeBehavior: analysis.closeBehavior || getScreenCloseBehavior(screen) }, "");
  return `
  <rect x="116" y="222" width="1100" height="74" fill="#fff8f3" stroke="#d8c5b8" stroke-width="2"/>
  ${navLabel ? mockText(154, 268, 18, navLabel) : ""}
  ${mockText(556, 268, 24, screen.name, "#5c4b45", "700")}
  ${mockText(1010, 268, 16, "状态 / 资源")}`;
}

function visualStatusStrip(analysis, y = 842) {
  const items = [...(analysis.states || []), ...(analysis.flows || [])].slice(0, 4);
  const list = items.length ? items : ["default", "loading", "empty", "disabled"];
  return `
  <rect x="116" y="${y}" width="1100" height="78" fill="#fff8f3" stroke="#d8c5b8" stroke-width="2"/>
  ${list.map((item, index) => {
    const x = 154 + index * 258;
    return `<rect x="${x}" y="${y + 16}" width="220" height="44" fill="#fbfdfe" stroke="#cbd7dc" stroke-width="2"/>
    <rect x="${x + 14}" y="${y + 26}" width="20" height="20" fill="#cfeeff" stroke="#7e9eb4" stroke-width="2"/>
    ${mockText(x + 46, y + 44, 13, shortVisualLabel(item, 12))}`;
  }).join("")}`;
}

function visualPrimaryAction(analysis, x, y, width = 180) {
  const label = shortVisualLabel(getVisualPrimaryActionLabel(analysis), 10);
  const result = analysis.primaryAction?.result || analysis.primaryAction?.state || "";
  return `
  <rect x="${x}" y="${y}" width="${width}" height="42" fill="#ffb8a5" stroke="#c98878" stroke-width="2"/>
  ${mockText(x + width / 2 - 34, y + 27, 14, label, "#5c4b45", "700")}
  ${result ? svgText(x, y + 66, result, 11, "#66757d", width + 60, 15, "400", 2) : ""}`;
}

function buildVisualMainMockup(screen, analysis) {
  const regions = getVisualAnalysisRegions(analysis);
  const components = getVisualAnalysisComponents(analysis);
  const center = getRegionBySlot(regions, "center", 0);
  const bottom = getRegionBySlot(regions, "bottom", 1);
  const sideRegions = regions.filter((item) => ![center.name, bottom.name].includes(item.name)).slice(0, 4);
  return `
  ${visualHeaderBar(screen, analysis)}
  <rect x="338" y="340" width="556" height="330" fill="#f7fcff" stroke="#a9c8d8" stroke-width="2" stroke-dasharray="10 10"/>
  ${mockText(500, 506, 26, shortVisualLabel(center.name || "核心场景", 14), "#5c4b45", "700")}
  ${svgText(424, 548, center.role || center.elements?.join("、") || analysis.goal || screen.goal, 14, "#66757d", 400, 20, "400", 3)}
  ${sideRegions.map((region, index) => {
    const x = index % 2 ? 920 : 140;
    const y = 340 + Math.floor(index / 2) * 144;
    return visualRegionPanel(x, y, 176, 112, region, getComponentsForRegion(components, region, 2), { componentLimit: 1, titleLength: 7 });
  }).join("")}
  <rect x="116" y="718" width="1100" height="86" fill="#fffdfb" stroke="#d8c5b8" stroke-width="2"/>
  ${getComponentsForRegion(components, bottom, 6).map((item, index) => {
    const x = 150 + index * 164;
    return `<rect x="${x}" y="738" width="128" height="44" fill="${index === 0 ? "#ffb8a5" : "#ffffff"}" stroke="#d8c5b8" stroke-width="2"/>
    ${mockText(x + 24, 766, 14, shortVisualLabel(item.name || item.type, 6))}`;
  }).join("")}
  ${visualStatusStrip(analysis, 824)}`;
}

function buildVisualShopGridMockup(screen, analysis) {
  const regions = getVisualAnalysisRegions(analysis);
  const components = getVisualAnalysisComponents(analysis);
  const left = getRegionBySlot(regions, "left", 0);
  const center = getRegionBySlot(regions, "center", 1);
  const right = getRegionBySlot(regions, "right", 2);
  return `
  ${visualHeaderBar(screen, analysis)}
  ${visualRegionPanel(116, 326, 214, 470, left, getComponentsForRegion(components, left, 6), { fill: "#fff8f3", componentLimit: 6, titleLength: 8 })}
  <rect x="354" y="326" width="526" height="470" fill="#fffdfb" stroke="#d8c5b8" stroke-width="2"/>
  ${mockText(386, 366, 20, shortVisualLabel(center.name || "商品网格", 10), "#5c4b45", "700")}
  ${Array.from({ length: 6 }).map((_, index) => {
    const x = 386 + (index % 3) * 158;
    const y = 396 + Math.floor(index / 3) * 150;
    const component = components[index] || { name: `商品${index + 1}` };
    return `<rect x="${x}" y="${y}" width="126" height="116" fill="#f7fcff" stroke="#a9c8d8" stroke-width="2"/>
    <rect x="${x + 22}" y="${y + 20}" width="82" height="42" fill="#ffffff" stroke="#d8c5b8" stroke-width="2" stroke-dasharray="6 6"/>
    ${mockText(x + 18, y + 88, 13, shortVisualLabel(component.name, 8))}`;
  }).join("")}
  ${visualRegionPanel(904, 326, 312, 470, right, getComponentsForRegion(components, right, 4), { fill: "#ffffff", componentLimit: 3, titleLength: 10 })}
  ${visualPrimaryAction(analysis, 968, 720, 180)}
  ${visualStatusStrip(analysis, 824)}`;
}

function buildVisualListDetailMockup(screen, analysis) {
  const regions = getVisualAnalysisRegions(analysis);
  const components = getVisualAnalysisComponents(analysis);
  const list = getRegionBySlot(regions, "left", 0);
  const center = getRegionBySlot(regions, "center", 1);
  const detail = getRegionBySlot(regions, "right", 2);
  return `
  ${visualHeaderBar(screen, analysis)}
  ${visualRegionPanel(116, 326, 300, 470, list, getComponentsForRegion(components, list, 6), { fill: "#fff8f3", componentLimit: 5, titleLength: 9 })}
  ${visualRegionPanel(438, 326, 420, 470, center, getComponentsForRegion(components, center, 6), { fill: "#fffdfb", componentLimit: 5, titleLength: 10 })}
  ${visualRegionPanel(880, 326, 336, 470, detail, getComponentsForRegion(components, detail, 4), { fill: "#ffffff", componentLimit: 3, titleLength: 10 })}
  ${visualPrimaryAction(analysis, 960, 720, 176)}
  ${visualStatusStrip(analysis, 824)}`;
}

function buildVisualTaskProgressMockup(screen, analysis) {
  const regions = getVisualAnalysisRegions(analysis);
  const components = getVisualAnalysisComponents(analysis);
  const progress = getRegionBySlot(regions, "top", 0);
  const list = getRegionBySlot(regions, "center", 1);
  const reward = getRegionBySlot(regions, "bottom", 2);
  return `
  ${visualHeaderBar(screen, analysis)}
  ${visualRegionPanel(116, 326, 1100, 110, progress, getComponentsForRegion(components, progress, 4), { fill: "#fffdf3", componentLimit: 3, titleLength: 14 })}
  <rect x="154" y="398" width="1000" height="18" fill="#ffffff" stroke="#d8c5b8" stroke-width="2"/>
  <rect x="154" y="398" width="540" height="18" fill="#cbe8cf" stroke="#7fa989" stroke-width="2"/>
  ${visualRegionPanel(116, 460, 760, 330, list, getComponentsForRegion(components, list, 6), { fill: "#fffdfb", componentLimit: 5, titleLength: 12 })}
  ${visualRegionPanel(900, 460, 316, 330, reward, getComponentsForRegion(components, reward, 4), { fill: "#ffffff", componentLimit: 3, titleLength: 10 })}
  ${visualPrimaryAction(analysis, 968, 710, 180)}
  ${visualStatusStrip(analysis, 824)}`;
}

function buildVisualFormFlowMockup(screen, analysis) {
  const regions = getVisualAnalysisRegions(analysis);
  const components = getVisualAnalysisComponents(analysis);
  const flowItems = (analysis.flows || []).slice(0, 4);
  const formRegion = getRegionBySlot(regions, "center", 0);
  const actionRegion = getRegionBySlot(regions, "bottom", 1);
  return `
  ${visualHeaderBar(screen, analysis)}
  <rect x="116" y="326" width="1100" height="92" fill="#fffdf3" stroke="#e2d2a9" stroke-width="2"/>
  ${(flowItems.length ? flowItems : ["进入", "填写", "确认", "完成"]).map((item, index) => {
    const x = 166 + index * 250;
    return `<circle cx="${x}" cy="372" r="24" fill="#cfeeff" stroke="#7e9eb4" stroke-width="2"/>
    ${mockText(x - 8, 378, 14, `${index + 1}`)}
    ${svgText(x + 36, 378, item, 13, "#66757d", 160, 16, "400", 1)}`;
  }).join("")}
  ${visualRegionPanel(236, 454, 760, 290, formRegion, getComponentsForRegion(components, formRegion, 6), { fill: "#fffdfb", componentLimit: 5, titleLength: 14 })}
  ${visualPrimaryAction(analysis, 526, 774, 180)}
  ${visualRegionPanel(116, 824, 1100, 96, actionRegion, getComponentsForRegion(components, actionRegion, 4), { fill: "#fff8f3", componentLimit: 3, titleLength: 14 })}`;
}

function buildVisualSlotMockup(screen, analysis) {
  const regions = getVisualAnalysisRegions(analysis);
  const components = getVisualAnalysisComponents(analysis);
  const top = getRegionBySlot(regions, "top", 0);
  const left = getRegionBySlot(regions, "left", 1);
  const center = getRegionBySlot(regions, "center", 2);
  const right = getRegionBySlot(regions, "right", 3);
  const bottom = getRegionBySlot(regions, "bottom", 4);
  return `
  ${visualHeaderBar(screen, analysis)}
  ${visualRegionPanel(116, 316, 1100, 88, top, getComponentsForRegion(components, top, 4), { fill: "#fffdf3", componentLimit: 3, titleLength: 16 })}
  ${visualRegionPanel(116, 426, 270, 360, left, getComponentsForRegion(components, left, 4), { fill: "#fff8f3", componentLimit: 4, titleLength: 9 })}
  ${visualRegionPanel(410, 426, 466, 360, center, getComponentsForRegion(components, center, 5), { fill: "#fffdfb", componentLimit: 4, titleLength: 12 })}
  ${visualRegionPanel(900, 426, 316, 360, right, getComponentsForRegion(components, right, 4), { fill: "#ffffff", componentLimit: 3, titleLength: 10 })}
  ${visualRegionPanel(116, 812, 1100, 108, bottom, getComponentsForRegion(components, bottom, 5), { fill: "#fff8f3", componentLimit: 4, titleLength: 14 })}
  ${visualPrimaryAction(analysis, 968, 722, 180)}`;
}

function buildMainGenericMockup(screen) {
  const entranceScreens = screens.filter((item) => item.id !== screen.id).slice(0, 6);
  const entrances = entranceScreens.length
    ? entranceScreens
    : [
      { name: "玩法入口" },
      { name: "角色" },
      { name: "背包" },
      { name: "任务" }
    ];

  return `
  <rect x="116" y="222" width="1100" height="92" fill="#fff8f3" stroke="#d8c5b8" stroke-width="2"/>
  ${mockText(154, 272, 22, "玩家信息 / 等级")}
  <rect x="890" y="246" width="90" height="32" fill="#fff0b2" stroke="#c6a85a" stroke-width="2"/>
  <rect x="998" y="246" width="90" height="32" fill="#ffdce8" stroke="#c78fa3" stroke-width="2"/>
  <rect x="1106" y="246" width="72" height="32" fill="#e7f3ff" stroke="#8cb6ce" stroke-width="2"/>
  ${mockText(906, 268, 14, "货币A")}
  ${mockText(1014, 268, 14, "货币B")}
  ${mockText(1122, 268, 14, "设置")}
  <rect x="430" y="350" width="440" height="56" fill="#ffe7b8" stroke="#d6b16a" stroke-width="2"/>
  ${mockText(522, 386, 20, "当前目标 / 活动提醒 / 下一步")}
  <rect x="270" y="440" width="760" height="300" fill="#f7fcff" stroke="#a9c8d8" stroke-width="2" stroke-dasharray="10 10"/>
  <circle cx="650" cy="590" r="78" fill="#fff1f6" stroke="#d9a9b7" stroke-width="2"/>
  ${mockText(574, 598, 28, "主视觉 / 核心对象")}
  <rect x="116" y="862" width="1100" height="58" fill="#fff8f3" stroke="#d8c5b8" stroke-width="2"/>
  ${entrances.map((item, index) => {
    const x = 150 + index * 164;
    return `<rect x="${x}" y="872" width="128" height="38" fill="${index === 0 ? "#ffb8a5" : "#ffffff"}" stroke="#d8c5b8" stroke-width="2"/>
  ${mockText(x + 26, 897, 15, item.name.slice(0, 5))}`;
  }).join("")}`;
}

function buildGameplayMockup(screen) {
  return `
  <rect x="116" y="222" width="1100" height="74" fill="#f7fcff" stroke="#a9c8d8" stroke-width="2"/>
  ${mockText(154, 268, 18, "目标 / 波次 / 时间")}
  ${mockText(560, 268, 24, screen.name, "#5c4b45", "700")}
  ${mockText(1030, 268, 16, "暂停")}
  <rect x="116" y="330" width="790" height="470" fill="#f4fbff" stroke="#a9c8d8" stroke-width="2" stroke-dasharray="10 10"/>
  ${mockText(430, 570, 30, "核心玩法舞台")}
  <rect x="930" y="330" width="286" height="470" fill="#fffdfb" stroke="#d8c5b8" stroke-width="2"/>
  ${mockText(976, 382, 22, "操作 / 技能区", "#5c4b45", "700")}
  <circle cx="1010" cy="474" r="42" fill="#ffb8a5" stroke="#c98878" stroke-width="2"/>
  <circle cx="1110" cy="474" r="42" fill="#cfeeff" stroke="#7e9eb4" stroke-width="2"/>
  <circle cx="1010" cy="590" r="42" fill="#cbe8cf" stroke="#7fa989" stroke-width="2"/>
  <circle cx="1110" cy="590" r="42" fill="#fff0b2" stroke="#c6a85a" stroke-width="2"/>
  ${mockText(985, 480, 14, "技能1")}
  ${mockText(1085, 480, 14, "技能2")}
  ${mockText(985, 596, 14, "道具")}
  ${mockText(1085, 596, 14, "必杀")}
  <rect x="116" y="836" width="1100" height="84" fill="#fff8f3" stroke="#d8c5b8" stroke-width="2"/>
  ${mockText(160, 886, 18, "状态条 / 冷却 / 提示 / 快捷操作")}`;
}

function buildLevelMapMockup(screen) {
  return `
  <rect x="116" y="222" width="1100" height="74" fill="#fffdf3" stroke="#e2d2a9" stroke-width="2"/>
  ${mockText(154, 268, 18, "章节进度 8/24")}
  ${mockText(580, 268, 24, screen.name, "#5c4b45", "700")}
  <rect x="116" y="330" width="760" height="520" fill="#f7fcff" stroke="#a9c8d8" stroke-width="2"/>
  <path d="M220 720 C340 610, 300 510, 450 470 S650 430, 720 300" fill="none" stroke="#d8c5b8" stroke-width="8" stroke-dasharray="18 16"/>
  ${levelNode(220, 720, "1", "#cbe8cf")}
  ${levelNode(360, 600, "2", "#cbe8cf")}
  ${levelNode(470, 470, "3", "#fff0b2")}
  ${levelNode(620, 410, "4", "#ffffff")}
  ${levelNode(720, 300, "B", "#ffb8a5")}
  <rect x="910" y="330" width="306" height="520" fill="#fffdfb" stroke="#d8c5b8" stroke-width="2"/>
  ${mockText(968, 386, 23, "关卡详情", "#5c4b45", "700")}
  ${mockText(944, 450, 16, "目标 / 消耗 / 推荐条件")}
  ${mockText(944, 500, 16, "首通奖励 / 掉落预览")}
  <rect x="960" y="730" width="120" height="42" fill="#ffb8a5" stroke="#c98878" stroke-width="2"/>
  <rect x="1090" y="730" width="86" height="42" fill="#ffffff" stroke="#d8c5b8" stroke-width="2"/>
  ${mockText(994, 758, 16, "挑战")}
  ${mockText(1114, 758, 16, "扫荡")}`;
}

function levelNode(x, y, label, fill) {
  return `<circle cx="${x}" cy="${y}" r="38" fill="${fill}" stroke="#9eb3bc" stroke-width="3"/>
  <text x="${x}" y="${y + 8}" text-anchor="middle" font-family="Microsoft YaHei, Arial" font-size="22" font-weight="700" fill="#1f272b">${escapeXml(label)}</text>`;
}

function buildCharacterPanelMockup(screen) {
  return `
  <rect x="116" y="222" width="1100" height="74" fill="#fdf3ff" stroke="#d9c7e8" stroke-width="2"/>
  ${mockCloseControl(screen, 154, 268, 20)}
  ${mockText(590, 268, 24, screen.name, "#5c4b45", "700")}
  <rect x="116" y="330" width="460" height="520" fill="#fff8f3" stroke="#d8c5b8" stroke-width="2"/>
  <circle cx="346" cy="520" r="120" fill="#fff1f6" stroke="#d9a9b7" stroke-width="2"/>
  ${mockText(270, 530, 30, "角色预览")}
  <rect x="610" y="330" width="606" height="520" fill="#ffffff" stroke="#d8c5b8" stroke-width="2"/>
  ${mockText(650, 386, 23, "属性 / 技能 / 装备", "#5c4b45", "700")}
  ${characterSlot(650, 440, "等级 / 战力")}
  ${characterSlot(650, 510, "技能升级")}
  ${characterSlot(650, 580, "装备槽位")}
  ${characterSlot(650, 650, "材料缺口")}
  <rect x="880" y="760" width="120" height="42" fill="#ffb8a5" stroke="#c98878" stroke-width="2"/>
  ${mockText(914, 788, 16, "升级")}`;
}

function characterSlot(x, y, text) {
  return `<rect x="${x}" y="${y}" width="500" height="48" fill="#fbfdfe" stroke="#cbd7dc" stroke-width="2"/>
  ${mockText(x + 28, y + 31, 16, text)}`;
}

function buildBossMockup(screen) {
  return `
  <rect x="116" y="222" width="1100" height="74" fill="#fff0f0" stroke="#d8a4a4" stroke-width="2"/>
  ${mockCloseControl(screen, 154, 268, 18)}
  ${mockText(560, 268, 24, screen.name, "#5c4b45", "700")}
  ${mockText(1020, 268, 16, "推荐战力")}
  <rect x="116" y="330" width="520" height="520" fill="#fff8f3" stroke="#d8c5b8" stroke-width="2"/>
  <circle cx="376" cy="520" r="128" fill="#ffe3e3" stroke="#c98878" stroke-width="3"/>
  ${mockText(300, 530, 30, "BOSS形象")}
  <rect x="676" y="330" width="540" height="520" fill="#fffdfb" stroke="#d8c5b8" stroke-width="2"/>
  ${mockText(716, 386, 23, "机制 / 弱点 / 剧情", "#5c4b45", "700")}
  ${bossInfoRow(716, 442, "阶段机制：召唤 / 狂暴 / 护盾")}
  ${bossInfoRow(716, 508, "弱点提示：元素 / 部位 / 打断")}
  ${bossInfoRow(716, 574, "隐藏剧情：首次遭遇 / 击败后解锁")}
  ${bossInfoRow(716, 640, "奖励预览：稀有道具 / 剧情碎片")}
  <rect x="826" y="752" width="138" height="42" fill="#ffb8a5" stroke="#c98878" stroke-width="2"/>
  <rect x="988" y="752" width="116" height="42" fill="#ffffff" stroke="#d8c5b8" stroke-width="2"/>
  ${mockText(862, 780, 16, "挑战")}
  ${mockText(1018, 780, 16, "查看剧情")}`;
}

function bossInfoRow(x, y, text) {
  return `<rect x="${x}" y="${y}" width="430" height="48" fill="#fbfdfe" stroke="#cbd7dc" stroke-width="2"/>
  ${mockText(x + 24, y + 31, 15, text)}`;
}

function buildStoryMockup(screen) {
  return `
  <rect x="116" y="222" width="1100" height="74" fill="#f7f1ff" stroke="#d9c7e8" stroke-width="2"/>
  ${mockText(154, 268, 18, "日志")}
  ${mockText(570, 268, 24, screen.name, "#5c4b45", "700")}
  ${mockText(1030, 268, 16, "跳过 / 自动")}
  <rect x="116" y="326" width="1100" height="360" fill="#f7fcff" stroke="#a9c8d8" stroke-width="2" stroke-dasharray="10 10"/>
  ${mockText(520, 516, 30, "剧情画面 / 插图")}
  <rect x="116" y="710" width="760" height="140" fill="#fff8f3" stroke="#d8c5b8" stroke-width="2"/>
  ${mockText(154, 758, 20, "角色名", "#5c4b45", "700")}
  ${mockText(154, 808, 18, "对白文本区域，支持点击推进、自动播放和回看。")}
  <rect x="910" y="710" width="306" height="140" fill="#ffffff" stroke="#d8c5b8" stroke-width="2"/>
  ${mockText(944, 754, 18, "分支选择 A")}
  ${mockText(944, 804, 18, "分支选择 B")}`;
}

function buildLeaderboardMockup(screen) {
  return `
  <rect x="116" y="222" width="1100" height="74" fill="#fffdf3" stroke="#e2d2a9" stroke-width="2"/>
  ${mockCloseControl(screen, 154, 268, 20)}
  ${mockText(590, 268, 24, screen.name, "#5c4b45", "700")}
  <rect x="116" y="320" width="1100" height="52" fill="#ffffff" stroke="#d8c5b8" stroke-width="2"/>
  ${mockText(154, 352, 16, "全服榜")}
  ${mockText(274, 352, 16, "好友榜")}
  ${mockText(394, 352, 16, "赛季榜")}
  <rect x="116" y="400" width="720" height="450" fill="#ffffff" stroke="#d8c5b8" stroke-width="2"/>
  ${rankRow(150, 450, "1", "玩家A", "9999")}
  ${rankRow(150, 530, "2", "玩家B", "9200")}
  ${rankRow(150, 610, "3", "玩家C", "8800")}
  ${rankRow(150, 690, "42", "我的排名", "5200")}
  <rect x="860" y="400" width="356" height="450" fill="#fffdfb" stroke="#d8c5b8" stroke-width="2"/>
  ${mockText(934, 462, 22, "个人排名 / 奖励", "#5c4b45", "700")}
  ${mockText(924, 536, 16, "赛季倒计时 / 奖励区间")}
  ${mockText(924, 590, 16, "上升/下降趋势")}
  <rect x="960" y="740" width="120" height="42" fill="#ffb8a5" stroke="#c98878" stroke-width="2"/>
  ${mockText(994, 768, 16, "领奖")}`;
}

function rankRow(x, y, rank, name, score) {
  return `<rect x="${x}" y="${y}" width="620" height="56" fill="#fbfdfe" stroke="#cbd7dc" stroke-width="2"/>
  ${mockText(x + 26, y + 36, 18, rank)}
  ${mockText(x + 106, y + 36, 18, name)}
  ${mockText(x + 500, y + 36, 18, score)}`;
}

function buildSettingsMockup(screen) {
  return `
  <rect x="116" y="222" width="1100" height="74" fill="#f4fbff" stroke="#a9c8d8" stroke-width="2"/>
  ${mockCloseControl(screen, 154, 268, 20, "关闭")}
  ${mockText(590, 268, 24, screen.name, "#5c4b45", "700")}
  <rect x="116" y="330" width="260" height="520" fill="#ffffff" stroke="#d8c5b8" stroke-width="2"/>
  ${mockText(154, 384, 18, "画面")}
  ${mockText(154, 444, 18, "声音")}
  ${mockText(154, 504, 18, "操作")}
  ${mockText(154, 564, 18, "账号")}
  <rect x="420" y="330" width="796" height="520" fill="#fffdfb" stroke="#d8c5b8" stroke-width="2"/>
  ${settingRow(464, 400, "音乐音量", "滑杆")}
  ${settingRow(464, 470, "音效开关", "开关")}
  ${settingRow(464, 540, "画质等级", "下拉")}
  ${settingRow(464, 610, "震动反馈", "开关")}
  <rect x="850" y="760" width="126" height="42" fill="#ffffff" stroke="#d8c5b8" stroke-width="2"/>
  <rect x="996" y="760" width="126" height="42" fill="#ffb8a5" stroke="#c98878" stroke-width="2"/>
  ${mockText(876, 788, 16, "恢复默认")}
  ${mockText(1030, 788, 16, "保存")}`;
}

function settingRow(x, y, label, control) {
  return `<rect x="${x}" y="${y}" width="620" height="46" fill="#fbfdfe" stroke="#cbd7dc" stroke-width="2"/>
  ${mockText(x + 24, y + 30, 16, label)}
  ${mockText(x + 470, y + 30, 16, control)}`;
}

function buildResultMockup(screen) {
  return `
  <rect x="116" y="222" width="1100" height="92" fill="#fffdf3" stroke="#e2d2a9" stroke-width="2"/>
  ${mockText(520, 278, 34, "胜利 / 失败 / 评级", "#5c4b45", "700")}
  <rect x="180" y="360" width="420" height="320" fill="#ffffff" stroke="#d8c5b8" stroke-width="2"/>
  ${mockText(300, 430, 24, "奖励列表")}
  ${mockText(250, 500, 18, "金币 / 道具 / 经验")}
  ${mockText(250, 560, 18, "新解锁 / 成长变化")}
  <rect x="660" y="360" width="420" height="320" fill="#f7fcff" stroke="#a9c8d8" stroke-width="2"/>
  ${mockText(760, 430, 24, "表现数据")}
  ${mockText(730, 500, 18, "得分 / 时间 / 命中")}
  ${mockText(730, 560, 18, "失败原因 / 提升建议")}
  <rect x="350" y="760" width="140" height="44" fill="#ffffff" stroke="#d8c5b8" stroke-width="2"/>
  <rect x="530" y="760" width="140" height="44" fill="#ffb8a5" stroke="#c98878" stroke-width="2"/>
  <rect x="710" y="760" width="140" height="44" fill="#cfeeff" stroke="#7e9eb4" stroke-width="2"/>
  ${mockText(384, 789, 16, getCloseBehaviorControlLabel(screen, "返回") || "下一步")}
  ${mockText(564, 789, 16, "下一步")}
  ${mockText(744, 789, 16, "再来一次")}`;
}

function buildEventMockup(screen) {
  return `
  <rect x="116" y="222" width="1100" height="74" fill="#fff8f3" stroke="#d8c5b8" stroke-width="2"/>
  ${mockCloseControl(screen, 154, 268, 20)}
  ${mockText(590, 268, 24, screen.name, "#5c4b45", "700")}
  <rect x="116" y="330" width="300" height="520" fill="#ffffff" stroke="#d8c5b8" stroke-width="2"/>
  ${mockText(154, 386, 18, "活动A")}
  ${mockText(154, 456, 18, "活动B")}
  ${mockText(154, 526, 18, "即将结束")}
  <rect x="456" y="330" width="760" height="520" fill="#fffdfb" stroke="#d8c5b8" stroke-width="2"/>
  <rect x="500" y="378" width="672" height="170" fill="#f7fcff" stroke="#a9c8d8" stroke-width="2" stroke-dasharray="8 8"/>
  ${mockText(734, 470, 28, "活动海报 / 规则")}
  ${mockText(520, 610, 18, "进度条 / 阶段奖励 / 倒计时")}
  <rect x="840" y="746" width="140" height="42" fill="#ffb8a5" stroke="#c98878" stroke-width="2"/>
  ${mockText(874, 774, 16, "参与活动")}`;
}

function buildGachaMockup(screen) {
  return `
  <rect x="116" y="222" width="1100" height="74" fill="#fdf3ff" stroke="#d9c7e8" stroke-width="2"/>
  ${mockCloseControl(screen, 154, 268, 20)}
  ${mockText(590, 268, 24, screen.name, "#5c4b45", "700")}
  ${mockText(1000, 268, 16, "资源 / 保底")}
  <rect x="180" y="350" width="560" height="420" fill="#fff1f6" stroke="#d9a9b7" stroke-width="2"/>
  ${mockText(340, 560, 32, "卡池主视觉")}
  <rect x="800" y="350" width="330" height="420" fill="#ffffff" stroke="#d8c5b8" stroke-width="2"/>
  ${mockText(850, 410, 20, "概率 / UP / 规则")}
  ${mockText(850, 470, 16, "保底进度 72/90")}
  ${mockText(850, 530, 16, "稀有预览")}
  <rect x="360" y="820" width="160" height="44" fill="#ffffff" stroke="#d8c5b8" stroke-width="2"/>
  <rect x="560" y="820" width="160" height="44" fill="#ffb8a5" stroke="#c98878" stroke-width="2"/>
  ${mockText(404, 849, 16, "单抽")}
  ${mockText(604, 849, 16, "十连")}`;
}

function buildRoomMockup(screen) {
  return `
  <rect x="116" y="222" width="1100" height="74" fill="#f4fbff" stroke="#a9c8d8" stroke-width="2"/>
  ${mockCloseControl(screen, 154, 268, 20)}
  ${mockText(590, 268, 24, screen.name, "#5c4b45", "700")}
  <rect x="116" y="330" width="720" height="520" fill="#ffffff" stroke="#d8c5b8" stroke-width="2"/>
  ${roomSeat(170, 400, "玩家1", "已准备")}
  ${roomSeat(450, 400, "玩家2", "未准备")}
  ${roomSeat(170, 600, "空位", "邀请")}
  ${roomSeat(450, 600, "空位", "邀请")}
  <rect x="880" y="330" width="336" height="520" fill="#fffdfb" stroke="#d8c5b8" stroke-width="2"/>
  ${mockText(934, 390, 22, "模式 / 规则", "#5c4b45", "700")}
  ${mockText(920, 462, 16, "地图 / 人数 / 奖励")}
  <rect x="960" y="746" width="140" height="42" fill="#ffb8a5" stroke="#c98878" stroke-width="2"/>
  ${mockText(994, 774, 16, "开始匹配")}`;
}

function roomSeat(x, y, name, state) {
  return `<rect x="${x}" y="${y}" width="220" height="130" fill="#fbfdfe" stroke="#cbd7dc" stroke-width="2"/>
  ${mockText(x + 68, y + 62, 18, name)}
  ${mockText(x + 72, y + 100, 15, state, "#66757d")}`;
}

function buildBaseMockup(screen) {
  return `
  <rect x="116" y="222" width="1100" height="74" fill="#f1fbf4" stroke="#c9e3d2" stroke-width="2"/>
  ${mockText(154, 268, 18, "资源 / 队列 / 任务")}
  ${mockText(590, 268, 24, screen.name, "#5c4b45", "700")}
  <rect x="116" y="330" width="820" height="460" fill="#f7fcff" stroke="#a9c8d8" stroke-width="2" stroke-dasharray="10 10"/>
  ${mockText(430, 560, 30, "基地 / 场景预览")}
  ${genericCard(180, 430, "建筑A", "#fff8e8")}
  ${genericCard(410, 560, "生产中", "#f1fbf4")}
  <rect x="970" y="330" width="246" height="460" fill="#fffdfb" stroke="#d8c5b8" stroke-width="2"/>
  ${mockText(1004, 390, 20, "建筑详情")}
  ${mockText(1004, 456, 16, "升级 / 生产 / 收取")}
  <rect x="116" y="820" width="1100" height="68" fill="#fff8f3" stroke="#d8c5b8" stroke-width="2"/>
  ${mockText(154, 862, 16, "建造栏 / 装饰栏 / 编辑模式 / 保存")}`;
}

function buildGenericMockup(screen) {
  const profile = getScreenProfile(screen.kind);
  const title = screen.name || profile.label;
  const contentLabel = getGenericContentLabel(screen.kind);
  const primaryAction = getGenericPrimaryAction(screen.kind);
  const secondaryAction = getGenericSecondaryAction(screen.kind);

  return `
  <rect x="116" y="222" width="1100" height="74" fill="#fff8f3" stroke="#d8c5b8" stroke-width="2"/>
  ${mockCloseControl(screen, 154, 268, 20)}
  ${mockText(590, 268, 24, title, "#5c4b45", "700")}
  ${mockText(1010, 268, 16, "资源 / 状态")}

  <rect x="116" y="318" width="1100" height="52" fill="#ffffff" stroke="#d8c5b8" stroke-width="2"/>
  <rect x="140" y="328" width="116" height="32" fill="#cfeeff" stroke="#7e9eb4" stroke-width="2"/>
  ${mockText(170, 350, 15, "全部")}
  ${mockText(298, 350, 15, "推荐")}
  ${mockText(420, 350, 15, "筛选")}
  ${mockText(1010, 350, 15, "排序")}

  <rect x="116" y="400" width="720" height="450" fill="#ffffff" stroke="#d8c5b8" stroke-width="2"/>
  <rect x="860" y="400" width="356" height="450" fill="#fffdfb" stroke="#d8c5b8" stroke-width="2"/>
  ${genericCard(150, 440, contentLabel + " A", "#fff5ee")}
  ${genericCard(382, 440, contentLabel + " B", "#f4fbff")}
  ${genericCard(614, 440, contentLabel + " C", "#fff8e8")}
  ${genericCard(150, 640, "未解锁/禁用", "#f6f1ef")}
  ${genericCard(382, 640, "可领取/可用", "#f1fbf4")}
  ${mockText(940, 462, 24, "详情与操作区", "#5c4b45", "700")}
  <rect x="924" y="508" width="226" height="128" fill="#f7fcff" stroke="#a9c8d8" stroke-width="2" stroke-dasharray="8 8"/>
  ${mockText(948, 680, 17, "名称 / 状态 / 条件")}
  ${mockText(948, 714, 14, "说明核心信息、消耗与结果", "#66757d")}
  <rect x="930" y="760" width="122" height="38" fill="#ffb8a5" stroke="#c98878" stroke-width="2"/>
  <rect x="1068" y="760" width="102" height="38" fill="#ffffff" stroke="#d8c5b8" stroke-width="2"/>
  ${mockText(960, 785, 15, primaryAction)}
  ${mockText(1092, 785, 15, secondaryAction)}`;
}

function genericCard(x, y, title, fill) {
  return `<rect x="${x}" y="${y}" width="180" height="150" fill="${fill}" stroke="#d8c5b8" stroke-width="2"/>
  <rect x="${x + 28}" y="${y + 28}" width="124" height="54" fill="#ffffff" stroke="#d8c5b8" stroke-width="2" stroke-dasharray="6 6"/>
  <text x="${x + 90}" y="${y + 112}" text-anchor="middle" font-family="Microsoft YaHei, Arial" font-size="16" fill="#5c4b45">${escapeXml(title)}</text>`;
}

function getGenericContentLabel(kind) {
  const map = {
    gameplay: "目标",
    level: "关卡",
    character: "角色",
    inventory: "道具",
    shop: "商品",
    task: "任务",
    collection: "条目",
    social: "对象",
    main: "入口",
    boss: "机制",
    story: "剧情",
    leaderboard: "排名",
    settings: "设置项",
    result: "奖励",
    event: "活动",
    gacha: "卡池",
    room: "席位",
    base: "建筑"
  };
  return map[kind] || "内容";
}

function getGenericPrimaryAction(kind) {
  const map = {
    gameplay: "开始",
    level: "挑战",
    character: "升级",
    inventory: "使用",
    shop: "购买",
    task: "领取",
    collection: "查看",
    social: "邀请",
    main: "进入",
    boss: "挑战",
    story: "选择",
    leaderboard: "领奖",
    settings: "保存",
    result: "下一步",
    event: "参与",
    gacha: "十连",
    room: "准备",
    base: "升级"
  };
  return map[kind] || "确认";
}

function getGenericSecondaryAction(kind) {
  const map = {
    gameplay: "暂停",
    level: "扫荡",
    character: "预览",
    inventory: "来源",
    shop: "详情",
    task: "前往",
    collection: "来源",
    social: "聊天",
    main: "更多",
    boss: "剧情",
    story: "跳过",
    leaderboard: "规则",
    settings: "默认",
    result: "返回",
    event: "规则",
    gacha: "概率",
    room: "邀请",
    base: "收取"
  };
  return map[kind] || "取消";
}

function mockText(x, y, size, text, color = "#5c4b45", weight = "400", maxWidth = 0) {
  if (maxWidth) {
    return svgText(x, y, text, size, color, maxWidth, Math.round(size * 1.45), weight, 2);
  }
  return `<text x="${x}" y="${y}" font-family="Microsoft YaHei, Arial" font-size="${size}" font-weight="${weight}" fill="${color}">${escapeXml(text)}</text>`;
}

function getCloseBehaviorControlLabel(screen = {}, fallbackLabel = "返回") {
  const closeBehavior = getScreenCloseBehavior(screen);
  if (!closeBehavior) {
    const kind = String(screen?.kind || "").toLowerCase();
    if (kind === "main" || kind === "hud" || /主界面|首页|主页|大厅|hud/i.test(screen?.name || "")) return "";
    if (kind === "settings" || kind === "modal" || kind === "popup" || /弹窗|设置/i.test(screen?.name || "")) return "关闭";
    return fallbackLabel;
  }
  if (isNoNavigationCloseBehavior(closeBehavior)) return "";
  const types = getCloseBehaviorComponentTypes(closeBehavior);
  const kind = String(screen?.kind || "").toLowerCase();
  const prefersClose = (kind === "settings" || kind === "modal" || kind === "popup" || /弹窗|浮层|设置/i.test(screen?.name || ""))
    && types.includes("close_button");
  if (prefersClose) return "关闭";
  if (types.includes("back_button")) return "返回";
  if (types.includes("close_button")) return "关闭";
  if (types.includes("home_button")) return "主页";
  return "";
}

function mockCloseControl(screen, x = 154, y = 268, size = 20, fallbackLabel = "返回") {
  const label = getCloseBehaviorControlLabel(screen, fallbackLabel);
  return label ? mockText(x, y, size, label) : "";
}

function getScreenContentTerms(screen, fallbackPrefix = "内容", count = 5) {
  const plan = getVisualPlanText();
  const section = extractScreenSection(plan, screen);
  const analysisSource = getVisualAnalysisSource(screen);
  const source = [analysisSource, section, plan, getPlanningDocument()].filter(Boolean).join("\n");
  const terms = collectVisualTerms(source, screen);
  const result = [];

  for (const term of terms) {
    if (!result.includes(term)) result.push(term);
    if (result.length >= count) break;
  }

  while (result.length < count) {
    result.push(`${fallbackPrefix}${String.fromCharCode(65 + result.length)}`);
  }

  return result.slice(0, count);
}

function collectVisualTerms(source, screen) {
  const candidates = [];
  const stopwords = new Set([
    "界面", "页面", "系统", "模块", "区域", "内容", "详情", "状态", "按钮", "入口", "返回", "全部", "推荐", "筛选", "排序",
    "点击", "显示", "支持", "需要", "当前", "目标", "交互", "布局", "结构", "说明", "信息", "操作", "确认", "取消",
    "商品", "商品卡", "购买", "资源", "金币", "道具", "任务", "角色", "玩家", "奖励", "条件", "名称", "效果",
    screen?.name || "", screen?.kind || "", state.gameName || "", gameName.value || ""
  ].filter(Boolean));

  const push = (value) => {
    const term = sanitizeVisualTerm(value);
    if (!term || stopwords.has(term) || candidates.includes(term)) return;
    candidates.push(term);
  };

  String(source || "").replace(/[「『“《](.{2,20}?)[」』”》]/g, (_, term) => {
    push(term);
    return _;
  });

  String(source || "").split("\n").forEach((line) => {
    const cleaned = cleanMarkdownText(line).replace(/[|]/g, "，");
    cleaned.split(/[，,、；;：:\/（）()【】\[\]\s]+/).forEach(push);
  });

  const suffixPattern = /[\u4e00-\u9fa5A-Za-z0-9]{2,16}(?:剧情|任务|道具|商品|角色|技能|关卡|活动|玩法|模式|资源|货币|卡牌|关系|结算|排行|城市|顾客|情绪|升级|酒馆|订单|农场|平台|系统)/g;
  for (const match of String(source || "").matchAll(suffixPattern)) {
    push(match[0]);
  }

  return candidates.filter((term) => isUsefulVisualTerm(term, stopwords));
}

function sanitizeVisualTerm(value) {
  return String(value || "")
    .replace(/^[#>\-*•\d.\s]+/, "")
    .replace(/[《》「」『』“”"'`*_]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

function isUsefulVisualTerm(term, stopwords) {
  if (!term || stopwords.has(term)) return false;
  const length = Array.from(term).length;
  if (length < 2 || length > 12) return false;
  if (/^\d+$/.test(term)) return false;
  if (/^(UI|HUD|PC|API|SVG|Figma)$/i.test(term)) return false;
  return /[\u4e00-\u9fa5A-Za-z]/.test(term);
}

function shortVisualLabel(value, maxLength = 8) {
  const chars = Array.from(String(value || ""));
  return chars.length > maxLength ? `${chars.slice(0, maxLength).join("")}…` : chars.join("");
}

function isPetProject() {
  return /宠物|萌宠|养宠|猫|狗/.test(getPlanningDocument());
}

function localCatSvg(x, y, scale = 1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})" data-asset="local-cat">
  <ellipse cx="120" cy="196" rx="88" ry="18" fill="#f4d9c8" opacity=".36"/>
  <path d="M56 92 C38 42 45 30 88 62 C108 54 134 54 154 62 C197 30 204 42 184 92 C194 108 198 128 192 148 C182 184 150 204 120 204 C90 204 58 184 48 148 C42 128 46 108 56 92Z" fill="#fff4df" stroke="#6b3c32" stroke-width="8" stroke-linejoin="round"/>
  <path d="M68 70 C61 52 64 48 82 62" fill="#ffc6c6" stroke="#6b3c32" stroke-width="5" stroke-linecap="round"/>
  <path d="M172 62 C190 48 193 52 184 70" fill="#ffc6c6" stroke="#6b3c32" stroke-width="5" stroke-linecap="round"/>
  <path d="M96 58 C104 78 112 86 122 88" fill="none" stroke="#f6a65e" stroke-width="8" stroke-linecap="round"/>
  <path d="M122 56 C124 76 132 84 142 86" fill="none" stroke="#f6a65e" stroke-width="8" stroke-linecap="round"/>
  <path d="M176 116 C190 118 198 122 205 130" fill="none" stroke="#f6a65e" stroke-width="7" stroke-linecap="round"/>
  <path d="M64 116 C50 118 42 122 35 130" fill="none" stroke="#f6a65e" stroke-width="7" stroke-linecap="round"/>
  <ellipse cx="88" cy="124" rx="18" ry="23" fill="#7c4736"/>
  <ellipse cx="152" cy="124" rx="18" ry="23" fill="#7c4736"/>
  <circle cx="82" cy="116" r="6" fill="#fff"/>
  <circle cx="146" cy="116" r="6" fill="#fff"/>
  <path d="M116 148 C119 145 121 145 124 148 C123 153 117 153 116 148Z" fill="#df7f76" stroke="#6b3c32" stroke-width="3" stroke-linejoin="round"/>
  <path d="M120 153 C116 162 106 162 102 154" fill="none" stroke="#6b3c32" stroke-width="4" stroke-linecap="round"/>
  <path d="M120 153 C124 162 134 162 138 154" fill="none" stroke="#6b3c32" stroke-width="4" stroke-linecap="round"/>
  <ellipse cx="66" cy="148" rx="18" ry="10" fill="#ffb7ae" opacity=".52"/>
  <ellipse cx="174" cy="148" rx="18" ry="10" fill="#ffb7ae" opacity=".52"/>
  </g>`;
}

function annotationBlock(x, y, index, title, body) {
  return `<rect x="${x}" y="${y}" width="470" height="120" fill="#fbfdfe" stroke="#cbd7dc" stroke-width="2"/>
  <rect x="${x + 18}" y="${y + 18}" width="34" height="34" fill="#cfeeff" stroke="#7e9eb4" stroke-width="2"/>
  <text x="${x + 35}" y="${y + 42}" text-anchor="middle" font-family="Microsoft YaHei, Arial" font-size="18" font-weight="700" fill="#1f272b">${index}</text>
  <text x="${x + 66}" y="${y + 42}" font-family="Microsoft YaHei, Arial" font-size="19" font-weight="700" fill="#1f272b">${escapeXml(title)}</text>
  ${svgText(x + 66, y + 76, body, 14, "#66757d", 350, 22, "400", 2)}`;
}

function annotationStripBlock(x, y, width, index, title, body) {
  return `<rect x="${x}" y="${y}" width="${width}" height="118" fill="#fbfdfe" stroke="#cbd7dc" stroke-width="2"/>
  <rect x="${x + 18}" y="${y + 18}" width="32" height="32" fill="#cfeeff" stroke="#7e9eb4" stroke-width="2"/>
  <text x="${x + 34}" y="${y + 41}" text-anchor="middle" font-family="Microsoft YaHei, Arial" font-size="17" font-weight="700" fill="#1f272b">${index}</text>
  <text x="${x + 62}" y="${y + 40}" font-family="Microsoft YaHei, Arial" font-size="17" font-weight="700" fill="#1f272b">${escapeXml(title)}</text>
  ${svgText(x + 62, y + 72, body, 12, "#66757d", width - 86, 18, "400", 2)}`;
}

function buildHudMockup(screen = {}) {
  const isPet = isPetProject();
  const subject = shortVisualLabel(getScreenContentTerms(screen, "对象", 1)[0], 10);
  const coreVisual = isPet
    ? `${localCatSvg(552, 482, 0.82)}${mockText(566, 708, 18, "本地宠物素材 / 点击即时反馈", "#66757d")}`
    : `<circle cx="650" cy="590" r="78" fill="#fff1f6" stroke="#d9a9b7" stroke-width="2"/>${mockText(550, 598, 28, "主视觉 / 核心对象")}`;
  const relationText = isPet ? `${subject}  ❤ ❤ ❤ ♡ ♡` : `${subject} / 状态 / 进度`;
  return `
  <rect x="116" y="222" width="1100" height="92" fill="#fff8f3" stroke="#d8c5b8" stroke-width="2"/>
  ${mockText(154, 272, 22, "玩家昵称  Lv.5")}
  <rect x="940" y="246" width="90" height="32" fill="#fff0b2" stroke="#c6a85a" stroke-width="2"/>
  <rect x="1048" y="246" width="90" height="32" fill="#ffdce8" stroke="#c78fa3" stroke-width="2"/>
  <rect x="1154" y="246" width="48" height="32" fill="#e7f3ff" stroke="#8cb6ce" stroke-width="2"/>
  ${mockText(956, 268, 14, "金币")}
  ${mockText(1064, 268, 14, "爱心")}
  ${mockText(1164, 268, 14, "设置")}
  <rect x="430" y="350" width="440" height="56" fill="#ffe7b8" stroke="#d6b16a" stroke-width="2"/>
  ${mockText(520, 386, 20, isPet ? "状态提示：肚子饿了 / 需要清洁" : "状态提示：当前目标 / 下一步操作")}
  <rect x="310" y="440" width="680" height="300" fill="#f7fcff" stroke="#a9c8d8" stroke-width="2" stroke-dasharray="10 10"/>
  ${coreVisual}
  <rect x="480" y="764" width="340" height="70" fill="#fff8f4" stroke="#d8c5b8" stroke-width="2"/>
  ${mockText(520, 806, 20, relationText)}
  <rect x="116" y="862" width="1100" height="58" fill="#fff8f3" stroke="#d8c5b8" stroke-width="2"/>
  <rect x="148" y="872" width="82" height="38" fill="#ffffff" stroke="#d8c5b8" stroke-width="2"/>
  <rect x="248" y="872" width="82" height="38" fill="#ffffff" stroke="#d8c5b8" stroke-width="2"/>
  <rect x="348" y="872" width="82" height="38" fill="#ffffff" stroke="#d8c5b8" stroke-width="2"/>
  <rect x="520" y="872" width="120" height="38" fill="#ffb8a5" stroke="#c98878" stroke-width="2"/>
  <rect x="660" y="872" width="120" height="38" fill="#cbe8cf" stroke="#7fa989" stroke-width="2"/>
  <rect x="800" y="872" width="120" height="38" fill="#cfeeff" stroke="#7e9eb4" stroke-width="2"/>
  <rect x="990" y="872" width="82" height="38" fill="#fff0b2" stroke="#c6a85a" stroke-width="2"/>
  <rect x="1090" y="872" width="82" height="38" fill="#ffffff" stroke="#d8c5b8" stroke-width="2"/>
  ${mockText(172, 897, 16, "商店")}
  ${mockText(272, 897, 16, "图鉴")}
  ${mockText(372, 897, 16, "背包")}
  ${mockText(560, 897, 16, isPet ? "喂食" : "操作")}
  ${mockText(700, 897, 16, isPet ? "清洁" : "管理")}
  ${mockText(840, 897, 16, isPet ? "玩耍" : "互动")}
  ${mockText(1014, 897, 16, "任务")}
  ${mockText(1114, 897, 16, "好友")}`;
}

function buildShopMockup(screen = {}) {
  const items = getScreenContentTerms(screen, "商品", 5).map((item) => shortVisualLabel(item, 8));
  const selectedItem = items[0] || "商品A";
  return `
  <rect x="116" y="222" width="1100" height="74" fill="#fdf3ff" stroke="#d9c7e8" stroke-width="2"/>
  ${mockCloseControl(screen, 154, 268, 22)}
  ${mockText(650, 268, 24, screen.name || "商店", "#5c4b45", "700")}
  <rect x="116" y="320" width="1100" height="52" fill="#ffffff" stroke="#d9c7e8" stroke-width="2"/>
  <rect x="140" y="330" width="104" height="32" fill="#ffb8a5" stroke="#c98878" stroke-width="2"/>
  ${mockText(174, 351, 15, "分类A")}
  ${mockText(292, 351, 15, "分类B")}
  ${mockText(410, 351, 15, "分类C")}
  <rect x="116" y="400" width="720" height="450" fill="#ffffff" stroke="#d9c7e8" stroke-width="2"/>
  <rect x="860" y="400" width="356" height="450" fill="#fffdfb" stroke="#d9c7e8" stroke-width="2"/>
  ${shopVisualCard(150, 440, items[0], "#fff5ee")}
  ${shopVisualCard(382, 440, items[1], "#f4fbff")}
  ${shopVisualCard(614, 440, items[2], "#fff8e8")}
  ${shopVisualCard(150, 640, items[3], "#fff1f6")}
  ${shopVisualCard(382, 640, items[4], "#f4fbff")}
  ${mockText(970, 462, 24, "商品详情区", "#5c4b45", "700")}
  <rect x="924" y="500" width="226" height="130" fill="#f7fcff" stroke="#a9c8d8" stroke-width="2" stroke-dasharray="8 8"/>
  ${mockText(966, 676, 18, `名称：${selectedItem}`)}
  ${mockText(966, 710, 14, "效果：按交互案配置")}
  <rect x="946" y="760" width="110" height="38" fill="#ffb8a5" stroke="#c98878" stroke-width="2"/>
  ${mockText(984, 785, 15, "购买")}`;
}

function shopVisualCard(x, y, title, fill) {
  return `<rect x="${x}" y="${y}" width="180" height="150" fill="${fill}" stroke="#d8c5b8" stroke-width="2"/>
  <text x="${x + 90}" y="${y + 78}" text-anchor="middle" font-family="Microsoft YaHei, Arial" font-size="18" fill="#5c4b45">${escapeXml(title)}</text>`;
}

function buildCodexMockup(screen = {}) {
  const items = getScreenContentTerms(screen, "条目", 3).map((item) => shortVisualLabel(item, 8));
  return `
  <rect x="116" y="222" width="1100" height="74" fill="#f1fbf4" stroke="#c9e3d2" stroke-width="2"/>
  ${mockCloseControl(screen, 154, 268, 22)}
  ${mockText(620, 268, 24, screen.name || "收集图鉴", "#5c4b45", "700")}
  ${mockText(1010, 268, 18, "12 / 48")}
  <rect x="116" y="320" width="1100" height="52" fill="#ffffff" stroke="#c9e3d2" stroke-width="2"/>
  <rect x="140" y="330" width="92" height="32" fill="#cbe8cf" stroke="#7fa989" stroke-width="2"/>
  ${mockText(170, 351, 15, "全部")}
  ${mockText(276, 351, 15, "已解锁")}
  ${mockText(390, 351, 15, "未解锁")}
  <rect x="116" y="400" width="720" height="450" fill="#ffffff" stroke="#c9e3d2" stroke-width="2"/>
  <rect x="860" y="400" width="356" height="450" fill="#fffdfb" stroke="#c9e3d2" stroke-width="2"/>
  ${petVisualCard(150, 440, items[0], "#fff5ee")}
  ${petVisualCard(382, 440, items[1], "#fff1f6")}
  ${petVisualCard(614, 440, items[2], "#f1f3f5")}
  ${mockText(972, 462, 24, "条目详情", "#5c4b45", "700")}
  <rect x="926" y="500" width="220" height="150" fill="#f7fcff" stroke="#a9c8d8" stroke-width="2"/>
  ${mockText(950, 700, 17, "状态：已解锁 / 未解锁")}
  ${mockText(950, 730, 17, "条件：按策划案配置")}
  <rect x="946" y="770" width="126" height="38" fill="#cbe8cf" stroke="#7fa989" stroke-width="2"/>
  ${mockText(980, 795, 15, "查看详情")}`;
}

function petVisualCard(x, y, title, fill) {
  return `<rect x="${x}" y="${y}" width="180" height="150" fill="${fill}" stroke="#d8c5b8" stroke-width="2"/>
  ${isPetProject() && title.includes("猫") ? localCatSvg(x + 38, y + 14, 0.43) : `<circle cx="${x + 90}" cy="${y + 58}" r="34" fill="#fff8fb" stroke="#d9a9b7" stroke-width="2"/>`}
  <text x="${x + 90}" y="${y + 122}" text-anchor="middle" font-family="Microsoft YaHei, Arial" font-size="18" fill="#5c4b45">${escapeXml(title)}</text>`;
}

function buildBagMockup(screen = {}) {
  const items = getScreenContentTerms(screen, "道具", 1).map((item) => shortVisualLabel(item, 8));
  return `
  <rect x="116" y="222" width="1100" height="74" fill="#fff8e8" stroke="#e2d2a9" stroke-width="2"/>
  ${mockCloseControl(screen, 154, 268, 22)}
  ${mockText(650, 268, 24, "背包", "#5c4b45", "700")}
  ${mockText(1010, 268, 18, "24 / 60")}
  <rect x="116" y="320" width="1100" height="52" fill="#ffffff" stroke="#e2d2a9" stroke-width="2"/>
  <rect x="140" y="330" width="92" height="32" fill="#fff0b2" stroke="#c6a85a" stroke-width="2"/>
  ${mockText(170, 351, 15, "食物")}
  ${mockText(276, 351, 15, "玩具")}
  ${mockText(382, 351, 15, "材料")}
  <rect x="116" y="400" width="720" height="450" fill="#ffffff" stroke="#e2d2a9" stroke-width="2"/>
  <rect x="860" y="400" width="356" height="450" fill="#fffdfb" stroke="#e2d2a9" stroke-width="2"/>
  ${inventoryVisualGrid()}
  ${mockText(972, 462, 24, "道具详情", "#5c4b45", "700")}
  <rect x="930" y="510" width="214" height="128" fill="#f7fcff" stroke="#a9c8d8" stroke-width="2"/>
  ${mockText(950, 690, 17, `名称：${items[0]}`)}
  ${mockText(950, 720, 17, "数量：3")}
  <rect x="946" y="770" width="100" height="38" fill="#ffb8a5" stroke="#c98878" stroke-width="2"/>
  <rect x="1060" y="770" width="100" height="38" fill="#ffffff" stroke="#bda89d" stroke-width="2"/>
  ${mockText(980, 795, 15, "使用")}
  ${mockText(1094, 795, 15, "出售")}`;
}

function inventoryVisualGrid() {
  let svg = "";
  const fills = ["#fff5ee", "#f4fbff", "#fff8e8", "#fff1f6", "#f1fbf4"];
  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      const x = 150 + col * 150;
      const y = 450 + row * 150;
      svg += `<rect x="${x}" y="${y}" width="112" height="112" fill="${fills[(row * 4 + col) % fills.length]}" stroke="#d8c5b8" stroke-width="2"/>
      <text x="${x + 56}" y="${y + 62}" text-anchor="middle" font-family="Microsoft YaHei, Arial" font-size="14" fill="#5c4b45">道具 x${row * 4 + col + 1}</text>`;
    }
  }
  return svg;
}

function buildTasksMockup(screen = {}) {
  const taskItems = getScreenContentTerms(screen, "任务", 3).map((item) => shortVisualLabel(item, 10));
  return `
  <rect x="116" y="222" width="1100" height="74" fill="#f4fbff" stroke="#bfd8e6" stroke-width="2"/>
  ${mockCloseControl(screen, 154, 268, 22)}
  ${mockText(650, 268, 24, "任务", "#5c4b45", "700")}
  <rect x="116" y="320" width="1100" height="52" fill="#ffffff" stroke="#bfd8e6" stroke-width="2"/>
  <rect x="140" y="330" width="112" height="32" fill="#cfeeff" stroke="#7e9eb4" stroke-width="2"/>
  ${mockText(164, 351, 15, "每日任务")}
  ${mockText(292, 351, 15, "成就任务")}
  <rect x="116" y="392" width="1100" height="100" fill="#fffdf3" stroke="#e2d2a9" stroke-width="2"/>
  ${mockText(154, 448, 22, "今日活跃度：60 / 100")}
  <rect x="430" y="436" width="500" height="18" fill="#f2e3d7"/>
  <rect x="430" y="436" width="300" height="18" fill="#ffb8a5"/>
  ${taskVisualRow(116, 530, taskItems[0], "进度 2/3 ｜ 奖励 x100", "前往", "#cfeeff")}
  ${taskVisualRow(116, 640, taskItems[1], "进度 1/1 ｜ 奖励 x10", "领取", "#ffb8a5")}
  ${taskVisualRow(116, 750, taskItems[2], "进度 3/5 ｜ 奖励 x150", "前往", "#cfeeff")}`;
}

function taskVisualRow(x, y, title, desc, button, fill) {
  return `<rect x="${x}" y="${y}" width="1100" height="82" fill="#fffefd" stroke="#d8c5b8" stroke-width="2"/>
  ${mockText(x + 38, y + 36, 19, title)}
  ${mockText(x + 38, y + 62, 14, desc, "#66757d")}
  <rect x="${x + 920}" y="${y + 22}" width="110" height="38" fill="${fill}" stroke="#8aa1aa" stroke-width="2"/>
  ${mockText(x + 956, y + 47, 15, button)}`;
}

function buildDetailMockup(screen = {}) {
  const subject = shortVisualLabel(getScreenContentTerms(screen, "对象", 1)[0], 10);
  const previewVisual = isPetProject()
    ? localCatSvg(226, 420, 1.03)
    : `<circle cx="350" cy="560" r="92" fill="#fff1f6" stroke="#d9a9b7" stroke-width="2"/>${mockText(258, 568, 28, "对象预览")}`;
  return `
  <rect x="116" y="222" width="1100" height="74" fill="#fff8f3" stroke="#d8c5b8" stroke-width="2"/>
  ${mockCloseControl(screen, 154, 268, 22)}
  ${mockText(610, 268, 24, screen.name || "详情界面", "#5c4b45", "700")}
  <rect x="116" y="330" width="470" height="520" fill="#f7fcff" stroke="#a9c8d8" stroke-width="2"/>
  ${previewVisual}
  <rect x="630" y="330" width="586" height="520" fill="#fffdfb" stroke="#d8c5b8" stroke-width="2"/>
  ${mockText(670, 390, 28, subject)}
  ${mockText(670, 434, 18, "等级 / 状态 / 进度")}
  ${mockText(670, 500, 18, "资料 / 外观 / 互动档案 / 记录")}
  <rect x="670" y="560" width="440" height="18" fill="#f2e3d7"/>
  <rect x="670" y="560" width="250" height="18" fill="#ffb8a5"/>
  <rect x="670" y="720" width="150" height="42" fill="#cbe8cf" stroke="#7fa989" stroke-width="2"/>
  ${mockText(712, 748, 16, "确认使用")}`;
}

function buildSocialMockup(screen = {}) {
  return `
  <rect x="116" y="222" width="1100" height="74" fill="#f4fbff" stroke="#bfd8e6" stroke-width="2"/>
  ${mockCloseControl(screen, 154, 268, 22)}
  ${mockText(640, 268, 24, "好友", "#5c4b45", "700")}
  <rect x="116" y="330" width="420" height="520" fill="#ffffff" stroke="#bfd8e6" stroke-width="2"/>
  <rect x="576" y="330" width="640" height="520" fill="#fffdfb" stroke="#bfd8e6" stroke-width="2"/>
  ${friendRow(150, 380, "好友A", "可拜访")}
  ${friendRow(150, 470, "好友B", "已互动")}
  ${friendRow(150, 560, "好友C", "可领取")}
  ${mockText(800, 430, 28, "好友家园预览")}
  <rect x="720" y="500" width="360" height="210" fill="#f7fcff" stroke="#a9c8d8" stroke-width="2" stroke-dasharray="8 8"/>
  <rect x="820" y="750" width="150" height="42" fill="#cfeeff" stroke="#7e9eb4" stroke-width="2"/>
  ${mockText(862, 778, 16, "拜访")}`;
}

function friendRow(x, y, name, status) {
  return `<rect x="${x}" y="${y}" width="320" height="64" fill="#fffefd" stroke="#d8c5b8" stroke-width="2"/>
  ${mockText(x + 24, y + 38, 18, name)}
  ${mockText(x + 220, y + 38, 14, status, "#66757d")}`;
}

function buildHomeMockup(screen = {}) {
  return `
  <rect x="116" y="222" width="1100" height="74" fill="#fff8e8" stroke="#e2d2a9" stroke-width="2"/>
  ${mockCloseControl(screen, 154, 268, 22)}
  ${mockText(620, 268, 24, "家园装饰", "#5c4b45", "700")}
  <rect x="116" y="330" width="780" height="520" fill="#f7fcff" stroke="#a9c8d8" stroke-width="2"/>
  <rect x="140" y="640" width="730" height="180" fill="#eaf5d8" stroke="#cbe8cf" stroke-width="2"/>
  <rect x="360" y="520" width="160" height="120" fill="#fff8e8" stroke="#e2d2a9" stroke-width="2"/>
  <rect x="940" y="330" width="276" height="520" fill="#fffdfb" stroke="#e2d2a9" stroke-width="2"/>
  ${mockText(990, 386, 22, "装饰列表")}
  <rect x="980" y="430" width="90" height="90" fill="#fff5ee" stroke="#d8c5b8" stroke-width="2"/>
  <rect x="1090" y="430" width="90" height="90" fill="#f4fbff" stroke="#d8c5b8" stroke-width="2"/>
  <rect x="980" y="550" width="90" height="90" fill="#fff8e8" stroke="#d8c5b8" stroke-width="2"/>
  <rect x="1010" y="760" width="130" height="42" fill="#ffb8a5" stroke="#c98878" stroke-width="2"/>
  ${mockText(1048, 788, 16, "保存")}`;
}

function screenCardSvg(x, y, screen, index) {
  const fills = ["#fff4ed", "#edf8ff", "#f2fbf4", "#fff8e8", "#fff1f6", "#f7f7f7", "#eef5ff", "#f9fff2"];
  const fill = fills[(index - 1) % fills.length];
  const detail = [screen.goal, getScreenCloseBehavior(screen) ? `关闭：${getScreenCloseBehavior(screen)}` : ""].filter(Boolean).join(" / ");
  return `<rect x="${x}" y="${y}" width="210" height="116" fill="${fill}" stroke="#b8c8cf" stroke-width="2"/>
  <text x="${x + 20}" y="${y + 34}" font-family="Microsoft YaHei, Arial" font-size="14" font-weight="700" fill="#2c7a9f">${String(index).padStart(2, "0")}</text>
  <text x="${x + 20}" y="${y + 64}" font-family="Microsoft YaHei, Arial" font-size="22" font-weight="700" fill="#1f272b">${escapeXml(screen.name)}</text>
  ${svgText(x + 20, y + 92, detail, 13, "#66757d", 168, 18, "400", 1)}`;
}

function componentLine(x, y, text) {
  return `<rect x="${x}" y="${y - 22}" width="18" height="18" fill="#cbe8cf" stroke="#7fa989" stroke-width="2"/>${svgText(x + 34, y - 6, text, 18, "#66757d", 560, 24)}`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function svgText(x, y, value, size, color, maxWidth, lineHeight = 22, weight = "400", maxLines = 3) {
  const lines = wrapText(String(value), maxWidth, size, maxLines);
  const tspans = lines.map((line, index) => {
    const dy = index === 0 ? 0 : lineHeight;
    return `<tspan x="${x}" dy="${dy}">${escapeXml(line)}</tspan>`;
  }).join("");
  return `<text x="${x}" y="${y}" font-family="Microsoft YaHei, Arial" font-size="${size}" font-weight="${weight}" fill="${color}">${tspans}</text>`;
}

function wrapText(value, maxWidth, fontSize, maxLines = 3) {
  const text = value.replace(/\s+/g, " ").trim();
  if (!text) return [""];

  const maxUnits = Math.max(6, Math.floor(maxWidth / fontSize));
  const chunks = [];
  let line = "";
  let lineUnits = 0;

  Array.from(text).forEach((char) => {
    const units = getCharUnits(char);
    if (lineUnits + units > maxUnits && line) {
      chunks.push(line);
      line = char.trimStart();
      lineUnits = getTextUnits(line);
    } else {
      line += char;
      lineUnits += units;
    }
  });

  if (line) chunks.push(line);

  if (chunks.length > maxLines) {
    const visible = chunks.slice(0, maxLines);
    visible[maxLines - 1] = trimToUnits(visible[maxLines - 1], Math.max(3, maxUnits - 1)) + "…";
    return visible;
  }

  return chunks;
}

function getCharUnits(char) {
  if (/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(char)) return 1;
  if (/[A-Z0-9]/.test(char)) return 0.68;
  if (/[a-z]/.test(char)) return 0.56;
  if (/\s/.test(char)) return 0.32;
  return 0.5;
}

function getTextUnits(text) {
  return Array.from(text).reduce((sum, char) => sum + getCharUnits(char), 0);
}

function trimToUnits(text, maxUnits) {
  let output = "";
  let units = 0;
  for (const char of Array.from(text)) {
    const next = getCharUnits(char);
    if (units + next > maxUnits) break;
    output += char;
    units += next;
  }
  return output.trimEnd();
}

init();
