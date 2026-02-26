from flask import Flask, render_template, request, redirect, url_for
import os, io, base64, json, hashlib, random, sqlite3, datetime
from PIL import Image
from openai import OpenAI

app = Flask(__name__)

@app.route("/")
def home():
    return render_template("index.html", result=None)
heat_scores = {
  "z_head": 72,
  "z_face": 55,
  "z_chest": 48,
  "z_upper_abd": 62,
  "z_lower_abd": 58,
  "z_pelvis": 45,
  "z_arm_l": 40,
  "z_arm_r": 52,
  "z_leg_l": 60,
  "z_leg_r": 66
}

return render_template("index.html", result=result, heat_scores=heat_scores)
# --------------------
# 基本設定
# --------------------
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "").strip()
MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")

client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

# 圖片壓縮：越小越快越省
MAX_SIDE = 768
JPEG_QUALITY = 70

DB_PATH = os.environ.get("VHDS_DB_PATH", "vhds.sqlite3")

# --------------------
# 指標定義（10項）
# --------------------
INDICATORS = {
    "health": [
        "體脂風險指數","內臟脂肪風險指數","肌肉量充足度指數","基礎代謝效率指數","姿勢平衡指數",
        "循環與水腫指數","壓力負荷指數","疲勞累積指數","活動能力指數","生理年齡指數"
    ],
    "skin": [
        "皮膚水合度指數","皮膚彈性指數","皮膚光澤指數","皺紋風險指數","毛孔健康指數",
        "色素均勻指數","油脂平衡指數","發炎風險指數","修復能力指數","皮膚生理年齡指數"
    ],
    "fortune": [
        "事業運勢指數","財富能量指數","貴人助力指數","人際吸引指數","領導影響指數",
        "決策成功指數","感情桃花指數","機會出現指數","轉運突破指數","氣場能量指數"
    ],
    "social_psy": [
        "人際吸引力指數","信任建立指數","溝通影響力指數","情緒控制指數","同理理解指數",
        "領導統御指數","社交主導指數","衝突處理指數","關係維持指數","個人魅力指數"
    ]
}

def grade(score: int) -> str:
    if score >= 85: return "A"
    if score >= 70: return "B"
    if score >= 55: return "C"
    return "D"

# --------------------
# DB
# --------------------
def db_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = db_conn()
    conn.execute("""
    CREATE TABLE IF NOT EXISTS analyses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        mode_key TEXT NOT NULL,
        created_at TEXT NOT NULL,
        overall INTEGER NOT NULL,
        items_json TEXT NOT NULL
    );
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_user_mode_time ON analyses(user_id, mode_key, created_at);")
    conn.commit()
    conn.close()

init_db()

def save_analysis(user_id: str, mode_key: str, overall: int, items: list):
    conn = db_conn()
    conn.execute(
        "INSERT INTO analyses (user_id, mode_key, created_at, overall, items_json) VALUES (?, ?, ?, ?, ?)",
        (user_id, mode_key, datetime.datetime.utcnow().isoformat(), int(overall), json.dumps(items, ensure_ascii=False))
    )
    conn.commit()
    conn.close()

def get_last_two(user_id: str, mode_key: str):
    conn = db_conn()
    rows = conn.execute(
        "SELECT * FROM analyses WHERE user_id=? AND mode_key=? ORDER BY created_at DESC LIMIT 2",
        (user_id, mode_key)
    ).fetchall()
    conn.close()
    return rows  # [latest, previous] 或 [latest] 或 []

def get_recent(user_id: str, limit: int = 20):
    conn = db_conn()
    rows = conn.execute(
        "SELECT * FROM analyses WHERE user_id=? ORDER BY created_at DESC LIMIT ?",
        (user_id, limit)
    ).fetchall()
    conn.close()
    return rows

# --------------------
# 圖片處理
# --------------------
def compress_image_to_data_url(file_storage) -> str:
    img = Image.open(file_storage.stream).convert("RGB")
    w, h = img.size
    scale = min(MAX_SIDE / max(w, h), 1.0)
    if scale < 1.0:
        img = img.resize((int(w * scale), int(h * scale)))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    return f"data:image/jpeg;base64,{b64}"

# --------------------
# 無OpenAI時：可重現示範數據
# --------------------
def stable_fake_result(mode_key: str, seed_text: str):
    seed = int(hashlib.md5(seed_text.encode("utf-8")).hexdigest()[:8], 16)
    rng = random.Random(seed)
    labels = INDICATORS[mode_key]
    items, scores = [], []
    for name in labels:
        s = rng.randint(62, 90)
        scores.append(s)
        items.append({
            "name": name,
            "score": s,
            "grade": grade(s),
            "desc": "趨勢正常，建議持續追蹤"
        })
    overall = round(sum(scores) / len(scores))
    return {"overall": overall, "items": items, "note": "（測試示範：未串OpenAI）"}

# --------------------
# OpenAI JSON輸出
# --------------------
def build_system_prompt(mode_key: str) -> str:
    labels = INDICATORS[mode_key]
    label_text = "、".join(labels)
    return f"""你是「VHDS」分析助手（繁體中文）。只輸出JSON，不要多餘文字。
任務：根據使用者上傳的照片 + 使用者輸入資料，生成「10項量化指標」報告。

規則：
- 不做醫療診斷、不下疾病結論，不替代醫師。
- 每項 score 為 0~100 的整數。
- 每項 grade 為 A/B/C/D（A最高）。
- 每項 desc 繁體中文 <=80字，務實、非診斷。
- overall 為 0~100 整數。

必須輸出以下JSON格式（嚴格一致）：
{{
  "overall": 0,
  "items": [
    {{"name":"{labels[0]}", "score": 0, "grade":"A", "desc":"...<=80字"}},
    ...
    {{"name":"{labels[-1]}", "score": 0, "grade":"A", "desc":"...<=80字"}}
  ],
  "note": "一句提醒：若要更準確請提供全身照/更多資料（<=80字）"
}}

10個指標名稱只能從這些裡面選，且必須全部包含一次：{label_text}
"""

def call_openai(mode_key: str, data_url: str, user_context: str):
    sys = build_system_prompt(mode_key)
    user = f"使用者資料：{user_context}\n請依規則輸出JSON。"
    resp = client.chat.completions.create(
        model=MODEL,
        temperature=0.2,
        messages=[
            {"role": "system", "content": sys},
            {"role": "user", "content": [
                {"type": "text", "text": user},
                {"type": "image_url", "image_url": {"url": data_url}}
            ]}
        ]
    )
    text = resp.choices[0].message.content.strip()
    # 容錯：去掉 ```json
    if text.startswith("```"):
        text = text.strip("`").replace("json", "", 1).strip()
    return json.loads(text)

def normalize_result(mode_key: str, result: dict):
    labels = INDICATORS[mode_key]
    items_by_name = {it.get("name"): it for it in result.get("items", []) if isinstance(it, dict)}
    items = []
    for name in labels:
        it = items_by_name.get(name, {"name": name, "score": 70, "grade": "B", "desc": "趨勢正常，建議追蹤"})
        s = int(max(0, min(100, int(it.get("score", 70)))))
        items.append({
            "name": name,
            "score": s,
            "grade": it.get("grade", grade(s)),
            "desc": (it.get("desc") or "趨勢正常，建議追蹤")[:30]
        })
    overall = int(max(0, min(100, int(result.get("overall", round(sum(i["score"] for i in items)/10))))))
    note = (result.get("note") or "若要更準確，建議補充全身照")[:30]
    return {"overall": overall, "items": items, "note": note}

# --------------------
# 人體熱區（示意）
# --------------------
def heat_color(score: int) -> str:
    if score < 55: return "#ef4444"
    if score < 70: return "#f97316"
    if score < 85: return "#f59e0b"
    return "#22c55e"

def build_heatmap_regions(mode_key: str, items: list):
    def get(name):
        for it in items:
            if it["name"] == name:
                return it["score"]
        return 70

    if mode_key == "health":
        head = get("壓力負荷指數")
        chest = get("活動能力指數")
        belly = get("內臟脂肪風險指數")
        pelvis = get("姿勢平衡指數")
        arms = get("肌肉量充足度指數")
        legs = get("循環與水腫指數")
    elif mode_key == "skin":
        head = get("皮膚光澤指數")
        chest = get("皮膚彈性指數")
        belly = get("油脂平衡指數")
        pelvis = get("修復能力指數")
        arms = get("色素均勻指數")
        legs = get("皮膚水合度指數")
    elif mode_key == "fortune":
        head = get("決策成功指數")
        chest = get("事業運勢指數")
        belly = get("財富能量指數")
        pelvis = get("轉運突破指數")
        arms = get("貴人助力指數")
        legs = get("機會出現指數")
    else:  # social_psy
        head = get("情緒控制指數")
        chest = get("溝通影響力指數")
        belly = get("信任建立指數")
        pelvis = get("衝突處理指數")
        arms = get("社交主導指數")
        legs = get("關係維持指數")

    return {
        "head": heat_color(head),
        "chest": heat_color(chest),
        "belly": heat_color(belly),
        "pelvis": heat_color(pelvis),
        "arms": heat_color(arms),
        "legs": heat_color(legs),
    }

# --------------------
# 比較：本次 vs 上次
# --------------------
def compute_delta(current_items, prev_items):
    prev_map = {it["name"]: it["score"] for it in prev_items} if prev_items else {}
    out = []
    for it in current_items:
        prev = prev_map.get(it["name"])
        delta = None if prev is None else (it["score"] - prev)
        out.append({
            **it,
            "prev": prev,
            "delta": delta
        })
    return out

# --------------------
# Routes
# --------------------
@app.route("/", methods=["GET"])
def index():
    return render_template("index.html")

@app.route("/history", methods=["GET"])
def history():
    user_id = request.args.get("uid", "").strip()
    if not user_id:
        return redirect(url_for("index"))
    rows = get_recent(user_id, 30)
    # 解析 items
    records = []
    for r in rows:
        items = json.loads(r["items_json"])
        records.append({
            "created_at": r["created_at"],
            "mode_key": r["mode_key"],
            "overall": r["overall"],
            "items": items
        })
    return render_template("history.html", records=records, user_id=user_id)

@app.route("/analyze", methods=["POST"])
def analyze():
    # 必須有 user_id（前端用localStorage自動生成）
    user_id = request.form.get("user_id", "").strip()
    if not user_id:
        return render_template("index.html", error="缺少使用者識別碼（請刷新頁面再試）。")

    mode = request.form.get("mode", "").strip()
    mode_key = {"1": "health", "2": "skin", "3": "fortune", "4": "social_psy"}.get(mode)
    if not mode_key:
        return render_template("index.html", error="請選擇分析類型。")

    # 取得照片（可選）
    photo = request.files.get("photo")
    has_photo = photo and photo.filename

    # 輸入欄位（單一欄位，不重複name，避免表單覆蓋）
    age = request.form.get("age", "").strip()
    sex = request.form.get("sex", "").strip()       # 1男 2女
    height = request.form.get("height", "").strip()
    weight = request.form.get("weight", "").strip()
    job = request.form.get("job", "").strip()
    extro = request.form.get("extro", "").strip()   # 1-5

    # 必填規則（依你流程）
    if mode_key == "health":
        if not (age and sex and height and weight):
            return render_template("index.html", error="健康管理需填：年齡、性別、身高、體重。")
    # 建立 user_context（給OpenAI用）
    ctx_parts = []
    if age: ctx_parts.append(f"年齡:{age}")
    if sex: ctx_parts.append(f"性別:{'男' if sex=='1' else ('女' if sex=='2' else sex)}")
    if height: ctx_parts.append(f"身高:{height}cm")
    if weight: ctx_parts.append(f"體重:{weight}kg")
    if job: ctx_parts.append(f"職業:{job}")
    if extro: ctx_parts.append(f"外向程度:{extro}/5")
    user_context = "、".join(ctx_parts) if ctx_parts else "未提供"

    data_url = None
    if has_photo:
        try:
            data_url = compress_image_to_data_url(photo)
        except Exception:
            data_url = None

    seed_text = f"{user_id}|{mode_key}|{user_context}|{'has_photo' if data_url else 'no_photo'}"

    # 取得結果
    try:
        if client and data_url:
            raw = call_openai(mode_key, data_url, user_context)
            result = normalize_result(mode_key, raw)
        else:
            result = stable_fake_result(mode_key, seed_text)
            if not data_url:
                result["note"] = "缺照片：先依輸入推估，補照片更準"
    except Exception:
        result = stable_fake_result(mode_key, seed_text)
        result["note"] = "暫時無法AI分析，已給示範結果"

    # 儲存到DB（歷史追蹤）
    save_analysis(user_id, mode_key, result["overall"], result["items"])

    # 取得最近兩筆，做比較
    rows = get_last_two(user_id, mode_key)
    latest = rows[0]
    prev = rows[1] if len(rows) > 1 else None

    prev_items = json.loads(prev["items_json"]) if prev else None
    items_with_delta = compute_delta(result["items"], prev_items)

    # 熱區顏色
    heat = build_heatmap_regions(mode_key, result["items"])

    # radar資料
    labels = [it["name"] for it in result["items"]]
    scores = [it["score"] for it in result["items"]]

    # 顯示標題
    title = {
        "health": "健康管理分析報告",
        "skin": "肌膚管理分析報告",
        "fortune": "面相運勢分析報告",
        "social_psy": "人際心理管理分析報告"
    }[mode_key]

    photo_hint = "若要更準確建議補充：正面全身照（自然光、無濾鏡）。"

    prev_overall = int(prev["overall"]) if prev else None
    overall_delta = None if prev_overall is None else (int(result["overall"]) - prev_overall)

    return render_template(
        "report.html",
        title=title,
        overall=result["overall"],
        prev_overall=prev_overall,
        overall_delta=overall_delta,
        note=result.get("note", ""),
        items=items_with_delta,
        labels=json.dumps(labels, ensure_ascii=False),
        scores=json.dumps(scores),
        heat=heat,
        photo_hint=photo_hint,
        user_id=user_id
    )

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)
