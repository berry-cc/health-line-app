from flask import Flask, render_template, request
import os
import base64
import io
from PIL import Image
import httpx
from openai import OpenAI

app = Flask(__name__)

# ====== OpenAI Client (加速/避免卡太久) ======
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "").strip()

# 盡量讓請求在 9 秒內結束（含連線/讀取）
http_client = httpx.Client(timeout=httpx.Timeout(9.0, connect=5.0, read=9.0, write=9.0))
client = OpenAI(api_key=OPENAI_API_KEY, http_client=http_client)

# ====== 可調參數（越小越快） ======
MAX_SIDE = 768          # 圖片最大邊長（越小越快）
JPEG_QUALITY = 70       # 壓縮品質（越小越快）
MODEL = "gpt-4o-mini"   # 速度快、成本低
# =================================

SYSTEM_PROMPT = """你是健康管理AI助手（繁體中文）。
你可以根據使用者上傳的照片做「一般性、非診斷」的健康/體態/皮膚觀察與建議。
你不提供醫療診斷、不下結論（例如：得了什麼病），不取代醫師。

重要規則：
- 不要因為照片不是全身照就拒絕或要求重傳才回答。
- 你必須先根據「目前照片可觀察到的內容」給出結果。
- 若照片資訊不足（例如不是全身、光線不足、角度不佳），請在最後用很短一句話說明「若要更準確，建議補拍哪些照片」。
- 回覆以條列為主，量化指標優先（例如 0~10 分、低/中/高、百分比區間），每點最多 1~2 句。

固定輸出格式（務必遵守）：
A) 可觀察資訊（最多6點）
- 以照片「看得到」的為主，每點包含【指標：數值】＋一句短說明
B) 初步評分（0~10，最多6項）
- 皮膚狀態、體態比例、姿勢/對稱、精神/疲勞感線索、生活型態線索、照片品質
C) 建議（最多8點）
- 以可執行的動作為主，能量化就量化（頻率/時間/份量）
D) 需要注意的警訊（最多6點）
最後一行：
補充更準確評估：建議補拍【正面全身/側面全身/背面全身】（自然站姿、鏡頭與肚臍同高、光線充足、無濾鏡）。
"""

def compress_and_resize_image(file_storage) -> str:
    """
    讀取上傳圖片 -> 縮放壓縮 -> 轉成 base64 data URL (image/jpeg)
    回傳：data:image/jpeg;base64,....
    """
    img = Image.open(file_storage.stream).convert("RGB")

    w, h = img.size
    scale = min(MAX_SIDE / max(w, h), 1.0)
    if scale < 1.0:
        img = img.resize((int(w * scale), int(h * scale)))

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    return f"data:image/jpeg;base64,{b64}"

def call_openai_with_image(data_url: str, user_note: str) -> str:
    """
    把圖片+文字送給模型，回傳純文字結果
    """
    user_text = """請根據照片做一般性健康/體態/皮膚狀況的觀察與建議。
請先判斷這張照片屬於【全身/半身/局部/不清楚】其中之一，並依規則輸出。
"""
    if user_note:
        user_text += f"\n使用者補充：{user_note}"

    # 使用 Chat Completions：文字 + 圖片
    resp = client.chat.completions.create(
        model=MODEL,
        temperature=0.2,
        max_tokens=650,  # 控制輸出長度 -> 更快
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": user_text},
                    {"type": "image_url", "image_url": {"url": data_url}},
                ],
            },
        ],
    )

    return resp.choices[0].message.content.strip()

@app.route("/", methods=["GET"])
def home():
    return render_template("index.html", result=None)

@app.route("/analyze", methods=["POST"])
def analyze():
    if not OPENAI_API_KEY:
        return render_template("index.html", result="❌ 伺服器未設定 OPENAI_API_KEY"), 500

    if "photo" not in request.files:
        return render_template("index.html", result="❌ 沒有收到檔案"), 400

    file = request.files["photo"]
    if file.filename == "":
        return render_template("index.html", result="❌ 請選擇一張圖片再上傳"), 400

    user_note = request.form.get("note", "").strip()

    try:
        data_url = compress_and_resize_image(file)
        result_text = call_openai_with_image(data_url, user_note)
        return render_template("index.html", result=result_text)

    except httpx.TimeoutException:
        return render_template(
            "index.html",
            result="⚠️ 本次分析逾時（>9秒）。建議：縮小圖片、光線清楚、避免超大檔案再試一次。"
        ), 504

    except Exception as e:
        return render_template("index.html", result=f"❌ 發生錯誤：{str(e)}"), 500

# Render 用 gunicorn 啟動，不需要 app.run()
# 本機要跑才用：python app.py
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 10000)), debug=True)
