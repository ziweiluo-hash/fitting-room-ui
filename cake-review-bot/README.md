# 杀糕测评机器人（SeaTalk）

可部署的 SeaTalk 群机器人后端：每期蛋糕、群员评分会保存到 SQLite；同时输出**本期排名**和**历史总榜**。评分从高到低：`夯(5)`、`顶级(4)`、`人上人(3)`、`NPC(2)`、`拉完了(1)`。同一群员重复评价同一蛋糕时，以最后一次选择为准。

## 启动

Python 3.10+：

```powershell
cd "C:\Users\ziwei.luo\Documents\New project\cake-review-bot"
pip install -r requirements.txt
$env:SEATALK_SIGNING_SECRET = "SeaTalk Open Platform 中的 Signing Secret"
$env:CAKE_BOT_ADMIN_IDS = "管理员SeaTalk ID,另一个管理员ID"
$env:HOST = "0.0.0.0"
python app.py
```

将公网 HTTPS 地址的 `/callback` 填入 SeaTalk Open Platform 的 Event Callback URL，并开启群聊 @消息与消息按钮回调。SeaTalk Bot 支持在群聊中收、发消息；官方框架也要求配置 `app_id`、`app_secret`、`signing_secret` 和回调 URL。[SeaTalk Bot 官方说明](https://help.seatalk.io/categories/16/article/761) [官方示例](https://github.com/seatalk-io/cs-bot)

生产环境必须设置 `SEATALK_SIGNING_SECRET`；未设置时仅为方便本地联调，签名校验会跳过。

## 群内操作

管理员 @机器人发送：

```text
开期 2026.08.19: 花香诞生石麝香葡萄柑橘咸风（6寸）|ApplePicker|https://图片地址, 抹茶千层|品牌|https://图片地址
```

每款蛋糕采用 `名称|品牌|图片URL`；名称必填，后两项可暂留空。此操作会自动结束同群上一期未结束测评，创建新一期，并写入开始时间。然后请求：

```text
GET /api/card-spec?conversation_id=群ID
```

把 `cards[].buttons[]` 映射进 SeaTalk 消息卡片的五个 callback 按钮：按钮展示文字取 `text`，按钮回调值取 `value`。每个蛋糕一张卡，群员直接点击夯、顶级、人上人、NPC、拉完了即可评分。

群员可随时 @机器人发送：

```text
本期榜单
总榜
往期列表
查看往期 3
往期测评图 3
生成测评图
设日期 2026.08.20
设标题 夏日杀糕
```

`GET /api/ranking?conversation_id=群ID` 会实时返回 `current`（本期）和 `overall`（总榜），可接到 SeaTalk H5 管理页。

发送 `选择往期` 可发布 SeaTalk 选择卡片：每项都是“管理员标题 · 日期”，点击后直接生成该期分档图片。管理员可用 `设标题 夏日杀糕` 和 `设日期 2026.08.20` 修改当前期的标题及日期。卡片数据接口为 `GET /api/history-menu?conversation_id=群ID`；把 `options[]` 映射为 SeaTalk callback 按钮即可。`查看往期 编号` 仍可直接生成该期图片。

`GET /api/report.png?conversation_id=群ID` 会直接生成可发群的 PNG 分档表。顶部固定显示“杀糕测评 · 本期蛋糕测评 · 日期”；左侧固定为夯、顶级、人上人、NPC、拉完了；右侧自动按平均分放置蛋糕图片、名称、品牌、分数和参与评分人数。平均分会四舍五入映射到五档，未评分蛋糕归入 NPC。管理员可用 `设日期 日期` 随时修改图片展示日期，不会影响评分。

SeaTalk 不同租户/版本的卡片发送 API 与模板外壳可能不同，所以本项目将易变的卡片外壳放在 SeaTalk 后台/发送层；评分的 callback 值、身份、覆盖规则和统计都由这个服务端固定处理。

## 验证

```powershell
python -m unittest discover -s tests -p "cake_review_test.py"
```
