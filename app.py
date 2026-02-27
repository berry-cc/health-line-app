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

@app.route("/", methods=["GET"])
def home():
    form = {
        "lang": "zh",
        "mode": "health",
        "user_id": "",
        "age": "",
        "height": "",
        "weight": "",
        "waist": "",
    }

    return render_template(
        "index.html",
        form=form,
        result=None,
        heat_scores=None,
        photo_previews=None
    )

# =========================
# 分析API
# =========================

@app.route("/analyze", methods=["POST"])
def analyze():
    import random

    # ===== 接收表單資料（保留用）=====
    age = request.form.get("age", "")
    height = request.form.get("height", "")
    weight = request.form.get("weight", "")
    waist = request.form.get("waist", "")
    mode = (request.form.get("mode", "health") or "health").strip()

    # ===== 接收照片（允許多張）=====
    photos = request.files.getlist("photo")

    # ===== 每個模式 10 指標名稱（V2.2）=====
    indicator_names = {
        "health":[
            "心肺負荷","代謝風險","體脂分布","姿態穩定","疲勞訊號",
            "睡眠恢復","壓力負荷","活動量","循環狀態","疼痛風險"
        ],
        "skin":[
            "保水度","油脂平衡","毛孔狀態","色素均勻","泛紅敏感",
            "細紋趨勢","彈性緊緻","屏障健康","暗沉疲態","痘痘風險"
        ],
        "face":[
            "財運能量","事業運勢","人緣磁場","貴人指數","桃花魅力",
            "抗壓韌性","決策魄力","守成能力","機會敏感度","波動風險"
        ],
        "psy":[
            "溝通清晰","同理強度","界線感","衝突處理","信任建立",
            "情緒穩定","合作意願","主動性","關係修復","壓力反應"
        ]
    }

    names = indicator_names.get(mode, indicator_names["health"])

    # ===== 生成 10 指標（測試版：有名稱+分數+<=60字說明）=====
    items = []
    for name in names:
        score = random.randint(70, 95)
        items.append({
            "name": name,
            "score": score,
            "desc": "分數越高代表狀態越佳；可持續追蹤變化"
        })

    overall = sum(i["score"] for i in items) // len(items)

    result = {
        "overall": overall,
        "mode": mode,
        "items": items
    }

    # ===== 熱區圖：直接用同一批 items（前端會畫 10 熱點）=====
    heat_scores = items

    # ===== 回傳 index.html 並保留輸入（關鍵）=====
    return render_template(
        "index.html",
        result=result,
        heat_scores=heat_scores,

        # 這些是「防止資料消失」的關鍵
        age=age,
        height=height,
        weight=weight,
        waist=waist,
        mode_selected=mode
    )
