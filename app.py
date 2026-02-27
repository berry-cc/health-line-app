from flask import Flask, render_template, request
import random

app = Flask(__name__)

APP_NAME = "VHDS Health自我健康管理"

INDICATOR_NAMES = {
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
    ],
}

@app.route("/")
def index():
    # 首頁一律回空白（正常）
    return render_template(
        "index.html",
        result=None,
        heat_scores=None,
        age="", height="", weight="", waist="",
        mode_selected="health",
        server_msg="HOME OK"
    )

# ✅ 除錯用：GET /analyze 直接回字串，讓你用手機驗證路由有沒有存在
@app.route("/analyze", methods=["GET", "POST"])
def analyze():
    if request.method == "GET":
        return "ANALYZE ROUTE OK"

    # ===== 接收表單 =====
    age = request.form.get("age","")
    height = request.form.get("height","")
    weight = request.form.get("weight","")
    waist = request.form.get("waist","")
    mode = (request.form.get("mode","health") or "health").strip()

    # ===== 接收照片（可以先不強制，用於排除問題）=====
    photos = request.files.getlist("photo")

    try:
        names = INDICATOR_NAMES.get(mode, INDICATOR_NAMES["health"])
        items = []
        for name in names:
            score = random.randint(70,95)
            items.append({"name":name, "score":score, "desc":"分數越高代表狀態越佳；可持續追蹤變化"})

        overall = sum(i["score"] for i in items)//len(items)

        result = {"overall":overall, "mode":mode, "items":items}
        heat_scores = items

        return render_template(
            "index.html",
            result=result,
            heat_scores=heat_scores,
            age=age, height=height, weight=weight, waist=waist,
            mode_selected=mode,
            server_msg=f"ANALYZE OK | photos={len(photos)}"
        )

    except Exception as e:
        # ✅ 把錯誤直接顯示到頁面上（你不用看 Render logs 也能知道哪裡爆）
        return render_template(
            "index.html",
            result=None,
            heat_scores=None,
            age=age, height=height, weight=weight, waist=waist,
            mode_selected=mode,
            server_msg=f"ANALYZE ERROR: {repr(e)}"
        )

if __name__ == "__main__":
    app.run(debug=True)
