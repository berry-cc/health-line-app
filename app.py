from flask import Flask, render_template, request, jsonify
import random

app = Flask(__name__)

APP_NAME = "VHDS Health自我健康管理"

# =========================
# 指標定義（四模式）
# =========================

MODES = {

"health": {
"name": {
"zh":"健康管理",
"en":"Health",
"ja":"健康管理",
"ko":"건강관리"
},
"indices":[
"代謝效率","心肺能力","肌肉狀態","體脂風險","疲勞指數",
"壓力負荷","循環狀態","活動能力","恢復能力","老化速度"
]
},

"skin":{
"name":{
"zh":"肌膚管理",
"en":"Skin",
"ja":"肌管理",
"ko":"피부관리"
},
"indices":[
"水分含量","彈性程度","皺紋風險","色素風險","毛孔狀態",
"油脂平衡","敏感風險","修復能力","光澤度","老化速度"
]
},

"face":{
"name":{
"zh":"面相分析",
"en":"Face",
"ja":"顔分析",
"ko":"얼굴분석"
},
"indices":[
"事業運","財運","人際運","領導運","機會運",
"穩定度","決策力","貴人運","發展潛力","整體運勢"
]
},

"mind":{
"name":{
"zh":"心理分析",
"en":"Psychology",
"ja":"心理分析",
"ko":"심리분석"
},
"indices":[
"信任能力","社交能力","領導傾向","合作能力","穩定性",
"情緒管理","抗壓能力","決策能力","開放程度","影響力"
]
}

}

# =========================
# 說明文字（多語言）
# =========================

def get_desc(score, lang):

    zh = f"目前指標為{score}分，屬於可優化區間，建議持續改善生活習慣與活動頻率以提升整體表現。"
    en = f"Score {score}. Moderate level. Improving lifestyle and activity may enhance overall condition."
    ja = f"スコア{score}。中程度。生活習慣改善で向上可能。"
    ko = f"{score}점 수준. 생활습관 개선으로 향상 가능."

    return {
        "zh":zh,
        "en":en,
        "ja":ja,
        "ko":ko
    }[lang]

# =========================
# 首頁
# =========================

@app.route("/")
def home():
    return render_template("index.html", app_name=APP_NAME)

# =========================
# 分析API
# =========================

@app.route("/analyze", methods=["POST"])
def analyze():

    # 正確：用 form 接收
    user_id = request.form.get("user_id", "").strip()

    if not user_id:
        return render_template("index.html", error="缺少 user_id")

    mode = request.form.get("mode", "health").strip()

    # 正確：用 files 接收照片
    photo = request.files.get("photo")

    if not photo:
        return render_template("index.html", error="請上傳照片")

    # ===== 測試用假資料 =====
    import random

    result = {
        "overall": random.randint(70, 95),
        "mode": mode,
        "items": [
            {"name": "指標1", "score": random.randint(60, 95)},
            {"name": "指標2", "score": random.randint(60, 95)},
            {"name": "指標3", "score": random.randint(60, 95)},
            {"name": "指標4", "score": random.randint(60, 95)},
            {"name": "指標5", "score": random.randint(60, 95)},
            {"name": "指標6", "score": random.randint(60, 95)},
            {"name": "指標7", "score": random.randint(60, 95)},
            {"name": "指標8", "score": random.randint(60, 95)},
            {"name": "指標9", "score": random.randint(60, 95)},
            {"name": "指標10", "score": random.randint(60, 95)}
        ]
    }

    return render_template(
        "result.html",
        result=result
    )

# =========================

if __name__ == "__main__":
    app.run(debug=True)
