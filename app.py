from flask import Flask, request
import os
import base64
import io
import requests
from PIL import Image
from openai import OpenAI

app = Flask(__name__)

# ===== API Keys =====

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
LINE_CHANNEL_ACCESS_TOKEN = os.environ.get("LINE_CHANNEL_ACCESS_TOKEN")

client = OpenAI(api_key=OPENAI_API_KEY)

# ===== 速度優化 =====

MAX_SIDE = 768
JPEG_QUALITY = 70
MODEL = "gpt-4o-mini"

# ===== Prompt =====

SYSTEM_PROMPT = """
你是健康分析AI。

只允許輸出健康分析。

禁止：

醫療診斷
疾病名稱
免責聲明
任何多餘說明

輸出格式：

【健康分析結果】

健康指數：XX / 100

代謝：XX%
肌肉：XX%
循環：XX%

修復年齡：XX歲

風險熱區：
- 部位：說明
- 部位：說明

限制：

條列
量化
≤150字
"""

# ===== 圖片壓縮 =====

def compress_image_from_url(image_url):

    headers = {
        "Authorization": f"Bearer {LINE_CHANNEL_ACCESS_TOKEN}"
    }

    response = requests.get(image_url, headers=headers)

    img = Image.open(io.BytesIO(response.content)).convert("RGB")

    w, h = img.size

    scale = min(MAX_SIDE / max(w, h), 1)

    if scale < 1:
        img = img.resize((int(w*scale), int(h*scale)))

    buffer = io.BytesIO()

    img.save(
        buffer,
        format="JPEG",
        quality=JPEG_QUALITY,
        optimize=True
    )

    b64 = base64.b64encode(buffer.getvalue()).decode()

    return f"data:image/jpeg;base64,{b64}"

# ===== 健康分析 =====

def analyze_health(image_url):

    image_data = compress_image_from_url(image_url)

    response = client.chat.completions.create(

        model=MODEL,

        temperature=0.2,

        max_tokens=200,

        messages=[

            {
                "role": "system",
                "content": SYSTEM_PROMPT
            },

            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "分析健康"},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": image_data
                        }
                    }
                ]
            }

        ]

    )

    return response.choices[0].message.content


# ===== LINE webhook =====

@app.route("/webhook", methods=["POST"])
def webhook():

    data = request.json

    for event in data["events"]:

        if event["type"] != "message":
            continue

        message = event["message"]

        reply_token = event["replyToken"]

        # ===== 圖片訊息 =====

        if message["type"] == "image":

            message_id = message["id"]

            image_url = f"https://api-data.line.me/v2/bot/message/{message_id}/content"

            result = analyze_health(image_url)

            reply(reply_token, result)

        # ===== 文字訊息 =====

        elif message["type"] == "text":

            reply(reply_token, "請上傳照片進行健康分析")

    return "OK"


# ===== LINE 回覆 =====

def reply(reply_token, text):

    headers = {

        "Authorization": f"Bearer {LINE_CHANNEL_ACCESS_TOKEN}",
        "Content-Type": "application/json"

    }

    body = {

        "replyToken": reply_token,

        "messages": [
            {
                "type": "text",
                "text": text
            }
        ]

    }

    requests.post(
        "https://api.line.me/v2/bot/message/reply",
        headers=headers,
        json=body
    )


# ===== Render start =====

if __name__ == "__main__":

    port = int(os.environ.get("PORT", 10000))

    app.run(
        host="0.0.0.0",
        port=port
    )
