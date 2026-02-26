from flask import Flask, render_template, request
import os, io, base64, json, hashlib, random
from PIL import Image
from openai import OpenAI

app = Flask(__name__)

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "").strip()
client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

# 圖片壓縮：越小越快越省
MAX_SIDE = 768
JPEG_QUALITY = 70
MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")

# ---------------------------
# 指標定義（10項）
# ---------------------------
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

def stable_fake_result(mode_key: str, seed_text: str):
    """沒有 OpenAI Key 時，依 seed 產生可重現的測試結果"""
    seed = int(hashlib.md5(seed_text.encode("utf-8")).hexdigest()[:8], 16)
    rng = random.Random(seed)
    labels = INDICATORS[mode_key]
    items = []
    scores = []
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
    return {"overall": overall, "items": items, "note": "（測試版：未串OpenAI，為示範數據）"}

def build_system_prompt(mode_key: str) -> str:
    labels = INDICATORS[mode_key]
    label_text = "、".join(labels)
    return f"""你是「VHDS」分析助手（繁體中文）。只輸出JSON，不要多餘文字。
任務：根據使用者上傳的照片 + 使用者輸入資料，生成「10項量化指標」報告。
重要規則：
- 不做醫療診斷、不下疾病結論，不替代醫師。
- 每項指標分數為 0~100 的整數，並給等級 A/B/C/D（A最高）。
- 每項指標 desc 為繁體中文，<=30個字，簡短、務實、非診斷。
- overall 為 0~100 整數（可取平均或綜合）。

你必須輸出符合以下JSON格式（嚴格一致）：
{{
  "overall": 0,
  "items": [
    {{"name":"{labels[0]}", "score": 0, "grade":"A", "desc":"...<=30字"}},
    ...
    {{"name":"{labels[-1]}", "score": 0, "grade":"A", "desc":"...<=30字"}}
  ],
  "note": "一句提醒：若要更準確請提供全身照/更多資料（<=30字）"
}}

本次允許的10個指標名稱只能從這些裡面選，且必須全部包含一次：{label_text}
"""

def call_openai(mode_key: str, data_url: str, user_context: str):
    sys = build_system_prompt(mode_key)
    user = f"使用者補充資料：{user_context}\n請依規則輸出JSON。"
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
    # 容錯：去掉可能包在 
json 
 的情況
    if text.startswith("```"):
        text = text.strip("`")
        text = text.replace("json", "", 1).strip()
    return json.loads(text)

def normalize_result(mode_key: str, result: dict):
    """確保items順序/名稱正確，補缺漏"""
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

def heat_color(score: int) -> str:
    # 簡單四段色：紅/橘/黃/綠
    if score < 55: return "#ef4444"
    if score < 70: return "#f97316"
    if score < 85: return "#f59e0b"
    return "#22c55e"

def build_heatmap_regions(mode_key: str, items: list):
    """
    回傳人體熱區顏色（簡版示意，不診斷）
    用幾個指標映射到頭/胸/腹/骨盆/四肢等區域
    """
    # 取分數用（找不到就70）
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

@app.route("/", methods=["GET"])
def index():
    return render_template("index.html")

@app.route("/analyze", methods=["POST"])
def analyze():
    # mode: 1 health, 2 skin, 3 fortune, 4 social_psy
    mode = request.form.get("mode", "").strip()
    mode_key = {"1": "health", "2": "skin", "3": "fortune", "4": "social_psy"}.get(mode)
    if not mode_key:
        return render_template("index.html", error="請選擇分析類型。")

    # photo (可選：若沒有照片也能先生成，但會提示補照片)
    photo = request.files.get("photo")
    has_photo = photo and photo.filename

    # 收集輸入欄位（依你設計流程）
    age = request.form.get("age", "").strip()
    sex = request.form.get("sex", "").strip()       # 1男 2女
    height = request.form.get("height", "").strip()
    weight = request.form.get("weight", "").strip()
    job = request.form.get("job", "").strip()
    extro = request.form.get("extro", "").strip()   # 1-5

    # 建立 user_context（給OpenAI用）
    ctx_parts = []
    if age: ctx_parts.append(f"年齡:{age}")
    if sex: ctx_parts.append(f"性別:{'男' if sex=='1' else ('女' if sex=='2' else sex)}")
    if height: ctx_parts.append(f"身高:{height}cm")
    if weight: ctx_parts.append(f"體重:{weight}kg")
    if job: ctx_parts.append(f"職業:{job}")
    if extro: ctx_parts.append(f"外向程度:{extro}/5")
    user_context = "、".join(ctx_parts) if ctx_parts else "未提供"

    # 檢查必填（你要的流程）
    if mode_key == "health":
        if not (age and height and weight and sex):
            return render_template("index.html", error="健康管理需填：年齡、性別、身高、體重。")
    if mode_key == "fortune":
        if not (age and sex):
            return render_template("index.html", error="面相運勢需填：年齡、性別。")
    if mode_key == "social_psy":
        if not (age and sex and job and extro):
            return render_template("index.html", error="人際心理需填：年齡、性別、職業、外向程度。")

    # 取得圖片 data_url（若沒有照片，就用空）
    data_url = None
    if has_photo:
        try:
            data_url = compress_image_to_data_url(photo)
        except Exception:
            data_url = None

    # 產生結果：有Key就用OpenAI；沒有就用測試資料
    seed_text = f"{mode_key}|{user_context}|{'has_photo' if data_url else 'no_photo'}"
    try:
        if client and data_url:
            raw = call_openai(mode_key, data_url, user_context)
            result = normalize_result(mode_key, raw)
        else:
            # 沒有Key或沒有照片：給示範資料，但提醒補照片
            result = stable_fake_result(mode_key, seed_text)
            if not data_url:
                result["note"] = "缺照片：先依輸入推估，補照片更準"
    except Exception:
        result = stable_fake_result(mode_key, seed_text)
        result["note"] = "暫時無法AI分析，已給示範結果"

    # 熱區顏色
    heat = build_heatmap_regions(mode_key, result["items"])

    # 給前端：labels, scores
    labels = [it["name"] for it in result["items"]]
    scores = [it["score"] for it in result["items"]]

    # 顯示標題
    title = {
        "health": "健康管理分析報告",
        "skin": "肌膚管理分析報告",
        "fortune": "面相運勢分析報告",
        "social_psy": "人際心理管理分析報告"
    }[mode_key]

    # 額外提示：若不是全身照（我們無法100%判斷），但你要提示，就固定用一句不強制
    photo_hint = "若要更準確建議補充：正面全身照（自然光、無濾鏡）。"

    return render_template(
        "report.html",
        title=title,
        overall=result["overall"],
        note=result.get("note", ""),
        items=result["items"],
        labels=json.dumps(labels, ensure_ascii=False),
        scores=json.dumps(scores),
        heat=heat,
        photo_hint=photo_hint
    )

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)
