import os, sys, tempfile, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import app

class CakeReviewTest(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory(); self.path = str(Path(self.dir.name) / "reviews.sqlite3"); app.DB_PATH = Path(self.path); app.init_db()
    def tearDown(self): self.dir.cleanup()
    def test_last_rating_wins_and_ranking_is_sorted(self):
        period = app.create_period("group-a", "第 1 期", ["抹茶", "草莓"], "admin")
        with app.connect() as db: cakes = db.execute("SELECT id,name FROM cakes WHERE period_id=? ORDER BY position", (period,)).fetchall()
        app.record_review(period, cakes[0]["id"], "u1", "NPC"); app.record_review(period, cakes[0]["id"], "u1", "夯"); app.record_review(period, cakes[1]["id"], "u2", "顶级")
        rows = app.ranking("group-a", period)
        self.assertEqual((rows[0]["name"], rows[0]["votes"], rows[0]["average"]), ("抹茶", 1, 5))
    def test_action_round_trip(self): self.assertEqual(app.decode_action(app.encode_action(7, 9, "人上人")), {"p": 7, "c": 9, "r": "人上人"})
    def test_group_command_creates_a_period(self):
        text = "\u5f00\u671f 2026-08-19: \u62b9\u8336, \u8349\u8393"
        reply = app.process_event({"data": {"client_id": "admin", "conversation_id": "group-a", "content": text}})
        self.assertIn("2026-08-19", reply)
        self.assertEqual(app.current_period("group-a")["review_date"], "2026-08-19")
    def test_admin_can_edit_current_period_date(self):
        app.create_period("group-a", "本期蛋糕测评", ["抹茶"], "admin", "2026.08.19")
        reply = app.process_event({"data": {"client_id": "admin", "conversation_id": "group-a", "content": "\u8bbe\u65e5\u671f 2026.08.20"}})
        self.assertIn("2026.08.20", reply)
        self.assertEqual(app.current_period("group-a")["review_date"], "2026.08.20")
    def test_past_period_can_be_listed_and_ranked(self):
        first = app.create_period("group-a", "2026.08.19", ["抹茶"], "admin", "2026.08.19")
        app.create_period("group-a", "2026.08.20", ["草莓"], "admin", "2026.08.20")
        listing = app.process_event({"data": {"client_id": "u1", "conversation_id": "group-a", "content": "\u5f80\u671f\u5217\u8868"}})
        self.assertIn(str(first), listing)
        detail = app.process_event({"data": {"client_id": "u1", "conversation_id": "group-a", "content": f"\u67e5\u770b\u5f80\u671f {first}"}})
        self.assertIn("2026.08.19", detail)
    def test_report_is_a_png_with_fixed_five_tiers(self):
        period = app.create_period("group-a", "第 1 期", [{"name": "抹茶", "brand": "测试品牌", "image_url": ""}], "admin")
        with app.connect() as db: cake_id = db.execute("SELECT id FROM cakes WHERE period_id=?", (period,)).fetchone()["id"]
        app.record_review(period, cake_id, "u1", "夯")
        image = app.report_image("group-a")
        self.assertEqual(image.mode, "RGB")
        self.assertEqual(image.height, 92 + 5 * 312)
if __name__ == "__main__": unittest.main()
