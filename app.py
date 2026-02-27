from flask import Flask, render_template, request
import random

app = Flask(__name__)

############################################################
# 指標定義
############################################################

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
    ]

}

############################################################
# 首頁
############################################################

@app.route("/", methods=["GET"])
def index():

    print("首頁載入")

    return render_template(
        "index.html",
        result=None,
        age="",
        height="",
        weight="",
        waist="",
        mode_selected="health",
        server_msg="HOME OK"
    )


############################################################
# 分析
############################################################

@app.route("/analyze", methods=["POST"])
def analyze():

    print("收到 analyze POST")

    age = request.form.get("age","")
    height = request.form.get("height","")
    weight = request.form.get("weight","")
    waist = request.form.get("waist","")

    mode = request.form.get("mode","health")

    photos = request.files.getlist("photo")

    print("照片數:", len(photos))

    names = INDICATOR_NAMES.get(mode, INDICATOR_NAMES["health"])

    items = []

    for name in names:

        score = random.randint(70,95)

        items.append({
            "name":name,
            "score":score,
            "desc":"測試說明"
        })

    overall = sum(i["score"] for i in items)//len(items)

    result = {
        "overall":overall,
        "items":items
    }

    return render_template(
        "index.html",
        result=result,
        age=age,
        height=height,
        weight=weight,
        waist=waist,
        mode_selected=mode,
        server_msg=f"ANALYZE OK | photos={len(photos)}"
    )


############################################################

if __name__ == "__main__":
    app.run(debug=True)
