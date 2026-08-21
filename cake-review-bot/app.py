"""杀糕测评机器人：SeaTalk 回调服务（零第三方依赖）。"""
from __future__ import annotations

import base64
import hashlib
import hmac
import io
import json
import os
import re
import sqlite3
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from urllib.request import Request, urlopen

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent
DB_PATH = Path(os.getenv("CAKE_BOT_DB", ROOT / "cake_reviews.sqlite3"))
SIGNING_SECRET = os.getenv("SEATALK_SIGNING_SECRET", "")
ADMIN_IDS = {x.strip() for x in os.getenv("CAKE_BOT_ADMIN_IDS", "").split(",") if x.strip()}
PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "").rstrip("/")
RATINGS = ("夯", "顶级", "人上人", "NPC", "拉完了")
SCORES = {"夯": 5, "顶级": 4, "人上人": 3, "NPC": 2, "拉完了": 1}


def now() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


class ClosingConnection(sqlite3.Connection):
    """让 `with connect()` 在 Windows 上也释放 SQLite 文件句柄。"""
    def __exit__(self, exc_type, exc_value, traceback):
        result = super().__exit__(exc_type, exc_value, traceback)
        self.close()
        return result


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, factory=ClosingConnection)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with connect() as db:
        db.executescript("""
            CREATE TABLE IF NOT EXISTS periods (id INTEGER PRIMARY KEY AUTOINCREMENT, conversation_id TEXT NOT NULL, title TEXT NOT NULL, display_title TEXT NOT NULL DEFAULT '本期蛋糕测评', review_date TEXT NOT NULL DEFAULT '', starts_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open', created_by TEXT NOT NULL, UNIQUE(conversation_id, title));
            CREATE TABLE IF NOT EXISTS cakes (id INTEGER PRIMARY KEY AUTOINCREMENT, period_id INTEGER NOT NULL REFERENCES periods(id) ON DELETE CASCADE, name TEXT NOT NULL, position INTEGER NOT NULL, UNIQUE(period_id, name));
            CREATE TABLE IF NOT EXISTS reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, cake_id INTEGER NOT NULL REFERENCES cakes(id) ON DELETE CASCADE, reviewer_id TEXT NOT NULL, rating TEXT NOT NULL CHECK(rating IN ('夯','顶级','人上人','NPC','拉完了')), updated_at TEXT NOT NULL, UNIQUE(cake_id, reviewer_id));
        """)
        columns = {row["name"] for row in db.execute("PRAGMA table_info(cakes)")}
        if "brand" not in columns: db.execute("ALTER TABLE cakes ADD COLUMN brand TEXT NOT NULL DEFAULT ''")
        if "image_url" not in columns: db.execute("ALTER TABLE cakes ADD COLUMN image_url TEXT NOT NULL DEFAULT ''")
        period_columns = {row["name"] for row in db.execute("PRAGMA table_info(periods)")}
        if "review_date" not in period_columns:
            db.execute("ALTER TABLE periods ADD COLUMN review_date TEXT NOT NULL DEFAULT ''")
        if "display_title" not in period_columns:
            db.execute("ALTER TABLE periods ADD COLUMN display_title TEXT NOT NULL DEFAULT '本期蛋糕测评'")


def create_period(conversation_id: str, title: str, cakes: list[dict] | list[str], creator_id: str, review_date: str = "", display_title: str = "本期蛋糕测评") -> int:
    normalized = [{"name": item, "brand": "", "image_url": ""} if isinstance(item, str) else item for item in cakes]
    normalized = [{"name": str(item.get("name", "")).strip(), "brand": str(item.get("brand", "")).strip(), "image_url": str(item.get("image_url", "")).strip()} for item in normalized]
    normalized = [item for item in normalized if item["name"]]
    if not title.strip() or not normalized:
        raise ValueError("请填写期数和至少一款蛋糕")
    if len(normalized) > 20 or len({item["name"] for item in normalized}) != len(normalized):
        raise ValueError("单期最多 20 款蛋糕，且名称不能重复")
    with connect() as db:
        db.execute("UPDATE periods SET status='closed' WHERE conversation_id=? AND status='open'", (conversation_id,))
        period_id = db.execute("INSERT INTO periods(conversation_id,title,display_title,review_date,starts_at,created_by) VALUES(?,?,?,?,?,?)", (conversation_id, title, display_title.strip() or "本期蛋糕测评", review_date.strip(), now(), creator_id)).lastrowid
        db.executemany("INSERT INTO cakes(period_id,name,brand,image_url,position) VALUES(?,?,?,?,?)", [(period_id, item["name"], item["brand"], item["image_url"], i) for i, item in enumerate(normalized, 1)])
    return int(period_id)


def current_period(conversation_id: str) -> sqlite3.Row | None:
    with connect() as db:
        return db.execute("SELECT * FROM periods WHERE conversation_id=? AND status='open' ORDER BY id DESC LIMIT 1", (conversation_id,)).fetchone()


def period_by_id(conversation_id: str, period_id: int) -> sqlite3.Row | None:
    with connect() as db:
        return db.execute("SELECT * FROM periods WHERE conversation_id=? AND id=?", (conversation_id, period_id)).fetchone()


def list_periods(conversation_id: str) -> list[sqlite3.Row]:
    with connect() as db:
        return db.execute("SELECT * FROM periods WHERE conversation_id=? ORDER BY id DESC", (conversation_id,)).fetchall()


def record_review(period_id: int, cake_id: int, reviewer_id: str, rating: str) -> None:
    if rating not in SCORES:
        raise ValueError("无效评分")
    with connect() as db:
        cake = db.execute("SELECT period_id FROM cakes WHERE id=?", (cake_id,)).fetchone()
        if not cake or cake["period_id"] != period_id:
            raise ValueError("蛋糕不属于该期")
        db.execute("""INSERT INTO reviews(cake_id,reviewer_id,rating,updated_at) VALUES(?,?,?,?)
            ON CONFLICT(cake_id,reviewer_id) DO UPDATE SET rating=excluded.rating, updated_at=excluded.updated_at""", (cake_id, reviewer_id, rating, now()))


def ranking(conversation_id: str, period_id: int | None = None) -> list[dict]:
    where, values = "p.conversation_id=?", [conversation_id]
    if period_id is not None:
        where += " AND p.id=?"; values.append(period_id)
    query = f"""SELECT c.id,c.name,c.brand,c.image_url,COUNT(r.id) votes,COALESCE(SUM(CASE r.rating WHEN '夯' THEN 5 WHEN '顶级' THEN 4 WHEN '人上人' THEN 3 WHEN 'NPC' THEN 2 WHEN '拉完了' THEN 1 END),0) points,SUM(r.rating='夯') good,SUM(r.rating='顶级') elite,SUM(r.rating='人上人') above,SUM(r.rating='NPC') npc,SUM(r.rating='拉完了') bad FROM cakes c JOIN periods p ON p.id=c.period_id LEFT JOIN reviews r ON r.cake_id=c.id WHERE {where} GROUP BY c.id ORDER BY (CAST(points AS REAL)/NULLIF(COUNT(r.id),0)) DESC,votes DESC,c.name COLLATE NOCASE"""
    with connect() as db:
        rows = db.execute(query, values).fetchall()
    return [dict(row) | {"average": round(row["points"] / row["votes"], 2) if row["votes"] else 0} for row in rows]


def format_ranking(title: str, rows: list[dict]) -> str:
    if not rows:
        return f"🍰 {title}\n暂无评分"
    lines = [f"🍰 {title}"]
    for n, row in enumerate(rows, 1):
        counts = " / ".join(f"{label}{row[key] or 0}" for label, key in [("夯", "good"), ("顶", "elite"), ("人", "above"), ("NPC", "npc"), ("拉", "bad")])
        lines.append(f"{n}. {row['name']}｜{row['average']:.2f} 分｜{row['votes']} 人｜{counts}")
    return "\n".join(lines)


TIER_STYLES = [("夯", "#ee4a35"), ("顶级", "#f9dc60"), ("人上人", "#fff51b"), ("NPC", "#fffbe7"), ("拉完了", "#ffffff")]


def tier_for(average: float) -> str:
    """平均分按四舍五入落入五档；没有评分的蛋糕归入 NPC，等待群员评价。"""
    return RATINGS[4 - max(0, min(4, round(average) - 1))] if average else "NPC"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        Path("C:/Windows/Fonts/msyhbd.ttc" if bold else "C:/Windows/Fonts/msyh.ttc"),
        Path("C:/Windows/Fonts/simhei.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists(): return ImageFont.truetype(str(candidate), size=size)
    return ImageFont.load_default()


def cake_image(image_url: str, size: tuple[int, int]) -> Image.Image:
    fallback = Image.new("RGB", size, "#e7e7e7")
    if not image_url or not image_url.startswith(("https://", "http://")):
        return fallback


def wrap_text(draw: ImageDraw.ImageDraw, text: str, text_font: ImageFont.FreeTypeFont, max_width: int, max_lines: int = 2) -> str:
    lines, current = [], ""
    for character in text:
        candidate = current + character
        if current and draw.textbbox((0, 0), candidate, font=text_font)[2] > max_width:
            lines.append(current); current = character
            if len(lines) == max_lines: return "\n".join(lines)
        else: current = candidate
    if current and len(lines) < max_lines: lines.append(current)
    return "\n".join(lines)
    try:
        request = Request(image_url, headers={"User-Agent": "CakeReviewBot/1.0"})
        with urlopen(request, timeout=5) as response:
            image = Image.open(response).convert("RGB")
        return ImageOps.fit(image, size, method=Image.Resampling.LANCZOS)
    except Exception:
        return fallback


def report_image(conversation_id: str, period_id: int | None = None) -> Image.Image:
    period = current_period(conversation_id) if period_id is None else period_by_id(conversation_id, period_id)
    target_period = period_id or (period["id"] if period else None)
    rows = ranking(conversation_id, target_period)
    grouped = {tier: [] for tier, _ in TIER_STYLES}
    for row in rows: grouped[tier_for(row["average"])].append(row)
    card_w, card_h, left_w, pad = 220, 264, 160, 24
    max_cards = max(1, *(len(items) for items in grouped.values()))
    title = period["display_title"] if period else "历史总榜"
    date_label = f" · {period['review_date']}" if period and period["review_date"] else ""
    header_text = f"杀糕测评 · {title}{date_label}"
    width = max(left_w + pad + max_cards * (card_w + pad) + pad, ImageDraw.Draw(Image.new("RGB", (1, 1))).textbbox((0, 0), header_text, font=font(32, True))[2] + 48)
    row_h = card_h + pad * 2
    header_h = 92
    canvas = Image.new("RGB", (width, header_h + row_h * 5), "#f2f2f2")
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, width, header_h), fill="#1d1d1f")
    draw.text((24, 18), header_text, font=font(32, True), fill="white")
    draw.text((24, 58), "按平均分归档｜同分按评分人数排序", font=font(15), fill="#d7d7d7")
    for index, (tier, color) in enumerate(TIER_STYLES):
        top, bottom = header_h + index * row_h, header_h + (index + 1) * row_h
        draw.rectangle((0, top, left_w, bottom), fill=color, outline="#1d1d1f", width=3)
        label_box = draw.textbbox((0, 0), tier, font=font(42, True))
        draw.text(((left_w - (label_box[2] - label_box[0])) / 2, top + (row_h - (label_box[3] - label_box[1])) / 2 - 6), tier, font=font(42, True), fill="#111111")
        draw.rectangle((left_w, top, width, bottom), fill="#dedede", outline="#1d1d1f", width=3)
        items = grouped[tier]
        if not items:
            draw.text((left_w + pad, top + row_h / 2 - 12), "暂无蛋糕", font=font(18), fill="#858585")
        for i, row in enumerate(items):
            x, y = left_w + pad + i * (card_w + pad), top + pad
            draw.rounded_rectangle((x, y, x + card_w, y + card_h), radius=12, fill="white")
            image = cake_image(row["image_url"], (card_w - 20, 142))
            canvas.paste(image, (x + 10, y + 10))
            name_font = font(19, True)
            draw.multiline_text((x + 12, y + 163), wrap_text(draw, row["name"], name_font, card_w - 24), font=name_font, fill="#151515", spacing=2)
            draw.text((x + 12, y + 218), row["brand"][:16] or "品牌待补充", font=font(15), fill="#626262")
            draw.text((x + 12, y + 242), f"{row['average']:.2f} 分 · {row['votes']} 人评分", font=font(13), fill="#626262")
    return canvas


def encode_action(period_id: int, cake_id: int, rating: str) -> str:
    return base64.urlsafe_b64encode(json.dumps({"p": period_id, "c": cake_id, "r": rating}, ensure_ascii=False).encode()).decode().rstrip("=")


def decode_action(value: str) -> dict:
    return json.loads(base64.urlsafe_b64decode(value + "=" * (-len(value) % 4)))


def encode_payload(payload: dict) -> str:
    return base64.urlsafe_b64encode(json.dumps(payload, ensure_ascii=False).encode()).decode().rstrip("=")


def history_menu(conversation_id: str) -> dict:
    """供 SeaTalk 消息卡片渲染的往期选择按钮。"""
    options = []
    for period in list_periods(conversation_id):
        label = f"{period['display_title']} · {period['review_date'] or period['starts_at'][:10]}"
        options.append({"text": label[:50], "value": encode_payload({"type": "history", "p": period["id"]})})
    return {"title": "选择往期测评", "options": options}


def card_spec(conversation_id: str) -> dict:
    period = current_period(conversation_id)
    if not period: raise ValueError("当前没有进行中的测评")
    with connect() as db:
        cakes = db.execute("SELECT id,name,brand,image_url FROM cakes WHERE period_id=? ORDER BY position", (period["id"],)).fetchall()
    return {"period": dict(period), "cards": [{"cake_id": cake["id"], "title": f"{period['title']}｜{cake['name']}", "brand": cake["brand"], "image_url": cake["image_url"], "buttons": [{"text": r, "value": encode_action(period["id"], cake["id"], r)} for r in RATINGS]} for cake in cakes]}


def signature_ok(raw: bytes, supplied: str | None) -> bool:
    if not SIGNING_SECRET: return True
    return bool(supplied) and hmac.compare_digest(hashlib.sha256(raw + SIGNING_SECRET.encode()).hexdigest(), supplied)


def event_fields(payload: dict) -> tuple[str, str, str, str]:
    data = payload.get("data", payload.get("event", payload))
    if isinstance(data, str): data = json.loads(data)
    sender = str(data.get("client_id") or data.get("sender_id") or data.get("sender", {}).get("seatalk_id") or "")
    conversation = str(data.get("conversation_id") or data.get("group", {}).get("group_id") or "")
    action = data.get("action") or data.get("action_value") or data.get("value") or ""
    if isinstance(action, dict): action = action.get("value") or action.get("action_value") or ""
    return sender, conversation, str(action), str(data.get("text") or data.get("content") or data.get("message", {}).get("content") or "")


def process_event(payload: dict) -> str:
    sender, conversation, action, text = event_fields(payload)
    if action:
        try:
            choice = decode_action(action)
            if choice.get("type") == "history":
                period = period_by_id(conversation, int(choice["p"]))
                if not period: return "该期测评已不存在。"
                suffix = f"/api/report.png?conversation_id={conversation}&period_id={period['id']}"
                return f"{period['display_title']} · {period['review_date']}：{PUBLIC_BASE_URL + suffix if PUBLIC_BASE_URL else suffix}"
            record_review(int(choice["p"]), int(choice["c"]), sender, choice["r"])
            return "已记录你的评分（重复点击会更新为最后一次选择）。"
        except (ValueError, KeyError, json.JSONDecodeError, UnicodeDecodeError): return "评分按钮已失效，请让管理员重新发布本期测评。"
    text = text.strip()
    if text in ("本期榜单", "本期排名"):
        period = current_period(conversation); return format_ranking(f"{period['title']}｜本期排名" if period else "本期排名", ranking(conversation, period["id"] if period else None))
    if text in ("总榜", "历史总榜"): return format_ranking("历史总榜", ranking(conversation))
    if text in ("往期", "往期列表"):
        periods = list_periods(conversation)
        if not periods: return "暂无往期测评。"
        return "📚 往期测评\n" + "\n".join(f"{row['id']}. {row['display_title']} · {row['review_date'] or row['starts_at'][:10]}｜{'进行中' if row['status'] == 'open' else '已结束'}" for row in periods)
    if text in ("选择往期", "往期选择"):
        return "请发布往期选择卡片：/api/history-menu?conversation_id=" + conversation
    past_match = re.fullmatch(r"查看往期\s+(\d+)", text)
    if past_match:
        period = period_by_id(conversation, int(past_match.group(1)))
        if not period: return "找不到该期测评。"
        suffix = f"/api/report.png?conversation_id={conversation}&period_id={period['id']}"
        return f"{period['review_date']} 测评图：{PUBLIC_BASE_URL + suffix if PUBLIC_BASE_URL else suffix}"
    past_image_match = re.fullmatch(r"往期测评图\s+(\d+)", text)
    if past_image_match:
        period = period_by_id(conversation, int(past_image_match.group(1)))
        if not period: return "找不到该期测评。"
        suffix = f"/api/report.png?conversation_id={conversation}&period_id={period['id']}"
        return f"{period['review_date']} 测评图：{PUBLIC_BASE_URL + suffix if PUBLIC_BASE_URL else suffix}"
    if text in ("生成测评图", "本期测评图"):
        suffix = f"/api/report.png?conversation_id={conversation}"
        return f"本期测评图已生成：{PUBLIC_BASE_URL + suffix if PUBLIC_BASE_URL else suffix}"
    date_match = re.fullmatch(r"设日期\s+(.+)", text)
    if date_match:
        if ADMIN_IDS and sender not in ADMIN_IDS: return "只有管理员可以修改本期日期。"
        period = current_period(conversation)
        if not period: return "当前没有进行中的测评。"
        review_date = date_match.group(1).strip()
        with connect() as db: db.execute("UPDATE periods SET review_date=? WHERE id=?", (review_date, period["id"]))
        return f"已将本期测评图日期改为：{review_date}"
    title_match = re.fullmatch(r"设标题\s+(.+)", text)
    if title_match:
        if ADMIN_IDS and sender not in ADMIN_IDS: return "只有管理员可以修改本期标题。"
        period = current_period(conversation)
        if not period: return "当前没有进行中的测评。"
        display_title = title_match.group(1).strip()
        with connect() as db: db.execute("UPDATE periods SET display_title=? WHERE id=?", (display_title, period["id"]))
        return f"已将本期测评图标题改为：{display_title}"
    match = re.fullmatch(r"开期\s+(.+?)\s*[:：]\s*(.+)", text)
    if match:
        if ADMIN_IDS and sender not in ADMIN_IDS: return "只有管理员可以开新一期测评。"
        cakes = []
        for item in re.split(r"[,，]", match.group(2)):
            parts = [part.strip() for part in item.split("|")]
            cakes.append({"name": parts[0], "brand": parts[1] if len(parts) > 1 else "", "image_url": parts[2] if len(parts) > 2 else ""})
        review_date = match.group(1).strip()
        period_id = create_period(conversation, review_date, cakes, sender, review_date)
        return f"已创建第 {period_id} 期「{match.group(1)}」。请发布本期评分卡片。"
    return "指令：开期 2026.08.19: 名称|品牌|图片URL｜设标题 标题｜设日期 日期｜选择往期｜本期榜单｜总榜"


class Handler(BaseHTTPRequestHandler):
    def json_response(self, data: dict, status: int = 200) -> None:
        raw = json.dumps(data, ensure_ascii=False).encode(); self.send_response(status); self.send_header("Content-Type", "application/json; charset=utf-8"); self.send_header("Content-Length", str(len(raw))); self.end_headers(); self.wfile.write(raw)
    def do_GET(self) -> None:
        parsed, query = urlparse(self.path), parse_qs(urlparse(self.path).query); conversation = query.get("conversation_id", [""])[0]
        if parsed.path == "/healthz": return self.json_response({"ok": True})
        if parsed.path == "/api/card-spec":
            try: return self.json_response(card_spec(conversation))
            except ValueError as err: return self.json_response({"error": str(err)}, 404)
        if parsed.path == "/api/ranking":
            period_id = int(query["period_id"][0]) if query.get("period_id", [""])[0].isdigit() else None
            period = period_by_id(conversation, period_id) if period_id else current_period(conversation)
            return self.json_response({"current": ranking(conversation, period["id"] if period else None), "overall": ranking(conversation)})
        if parsed.path == "/api/periods":
            return self.json_response({"periods": [dict(period) for period in list_periods(conversation)]})
        if parsed.path == "/api/history-menu":
            return self.json_response(history_menu(conversation))
        if parsed.path == "/api/report.png":
            period_id = int(query["period_id"][0]) if query.get("period_id", [""])[0].isdigit() else None
            output = io.BytesIO(); report_image(conversation, period_id).save(output, format="PNG")
            raw = output.getvalue(); self.send_response(200); self.send_header("Content-Type", "image/png"); self.send_header("Content-Length", str(len(raw))); self.end_headers(); self.wfile.write(raw); return
        return self.json_response({"error": "not found"}, 404)
    def do_POST(self) -> None:
        if urlparse(self.path).path != "/callback": return self.json_response({"error": "not found"}, 404)
        raw = self.rfile.read(int(self.headers.get("Content-Length", "0")))
        if not signature_ok(raw, self.headers.get("X-SeaTalk-Signature") or self.headers.get("signature256")): return self.json_response({"error": "invalid signature"}, HTTPStatus.UNAUTHORIZED)
        try: payload = json.loads(raw)
        except json.JSONDecodeError: return self.json_response({"error": "invalid JSON"}, HTTPStatus.BAD_REQUEST)
        if "seatalk_challenge" in payload: return self.json_response({"seatalk_challenge": payload["seatalk_challenge"]})
        return self.json_response({"text": process_event(payload)})
    def log_message(self, fmt: str, *args) -> None: print("[cake-bot]", fmt % args)


if __name__ == "__main__":
    init_db(); host, port = os.getenv("HOST", "127.0.0.1"), int(os.getenv("PORT", "8088")); print(f"Cake review bot listening on http://{host}:{port}"); ThreadingHTTPServer((host, port), Handler).serve_forever()
