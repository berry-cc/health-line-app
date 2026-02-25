from flask import Flask, request
import os
import requests
import base64
from openai import OpenAI

app = Flask(__name__)

LINE_CHANNEL_ACCESS_TOKEN = os.environ.get("LINE_CHANNEL_ACCESS_TOKEN")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")

# 你可以在 Render 設定 OPENAI_MODEL（可不設，預設 gpt-4o）
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o")

client = OpenAI(api_key=OPENAI_API_KEY)


def reply_to_line(reply_token: str, text: str):
    """回覆 LINE 訊息"""
    if not reply_token:
        return

    headers = {
        "Authorization": f"Bearer {LINE_CHANNEL_ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    body = {
        "replyToken": reply_token,
        "messages": [{"type": "text", "text": text[:4900]}]  # LINE 單則文字長度限制，保守截斷
    }

    try:
        requests.post(
            "https://api.line.me/v2/bot/message/reply",
            headers=headers,
            json=body,
            timeout=15
        )
    except Exception:
        # 回覆失敗就略過（避免 webhook 500）
        pass


def get_line_image_bytes(message_id: str) -> bytes:
    """從 LINE 下載使用者上傳的圖片 bytes"""
    headers = {"Authorization": f"Bearer {LINE_CHANNEL_ACCESS_TOKEN}"}
    r = requests.get(
        f"https://api-data.line.me/v2/bot/message/{message_id}/content",
        headers=headers,
        timeout=30
    )
    r.raise_for_status()
    return r.content


def analyze_text_with_openai(user_text: str) -> str:
    """純文字對話"""
    resp = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": "你是 HealthLine 健康管理 AI 助手。用繁體中文回答，務實、可執行、不要廢話。"},
            {"role": "user", "content": user_text}
        ],
        max_tokens=500
    )
    return resp.choices[0].message.content.strip()


def analyze_image_with_openai(image_bytes: bytes) -> str:
    """照片健康分析（Vision）"""
    b64 = base64.b64encode(image_bytes).decode("utf-8")

    prompt = """
你是 HealthLine 健康評估助手。請根據使用者上傳的「人體照片」做一般性評估與建議。
注意：
- 只能做一般性健康/體態觀察與生活建議，不可宣稱醫療診斷或取代醫師。
- 若照片不足以判斷，請直接說「資訊不足」，並告訴使用者如何補拍（正面全身、側面全身、充足光線、無濾鏡、站直、鏡頭與肚臍同高）。

請用以下格式輸出（一定要照格式）：

【整體評分】
健康分數（0-100）：
體態風險（低/中/高）：
肌肉量推測（偏低/普通/偏高）：
體脂推測（偏低/普通/偏高）：
姿勢/對稱觀察（簡述）：

【可能的重點】
1)
2)
3)

【3個最有效的改善動作（可在7天內開始）】
1)
2)
3)

【追蹤建議】
- 建議補拍：正面/側面/背面（可選）
- 建議追蹤指標：體重、腰圍、睡眠、步數（擇要）
"""

    resp = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt.strip()},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{b64}"}
                    }
                ],
            }
        ],
        max_tokens=700
    )
    return resp.choices[0].message.content.strip()


@app.route("/")
def home():
    return "Health Line AI Bot Running"


@app.route("/webhook", methods=["POST"])
def webhook():
    data = request.json or {}
    events = data.get("events", [])

    # 防呆：環境變數沒設好直接回應
    if not LINE_CHANNEL_ACCESS_TOKEN or not OPENAI_API_KEY:
        return "Missing env vars", 200

    for event in events:
        try:
            if event.get("type") != "message":
                continue

            reply_token = event.get("replyToken")
            message = event.get("message", {})
            mtype = message.get("type")

            # 文字訊息
            if mtype == "text":
                user_text = message.get("text", "").strip()
                if not user_text:
                    reply_to_line(reply_token, "我沒有收到文字內容，你可以再傳一次。")
                    continue

                try:
                    result = analyze_text_with_openai(user_text)
                except Exception:
                    result = "目前 AI 服務忙碌或額度不足，請稍後再試（或到 OpenAI 平台確認餘額/預算）。"

                reply_to_line(reply_token, result)
                continue

            # 圖片訊息（關鍵：用 Vision 分析）
            if mtype == "image":
                message_id = message.get("id")
                if not message_id:
                    reply_to_line(reply_token, "我沒有拿到圖片 id，請你再傳一次照片。")
                    continue

                try:
                    img_bytes = get_line_image_bytes(message_id)
                except Exception:
                    reply_to_line(reply_token, "圖片下載失敗，請確認你傳的是原圖（不要用貼圖/連結）。")
                    continue

                try:
                    result = analyze_image_with_openai(img_bytes)
                except Exception:
                    result = "目前 AI 圖片分析服務忙碌或額度不足，請稍後再試（或到 OpenAI 平台確認餘額/預算）。"

                reply_to_line(reply_token, result)
                continue

            # 其他類型：貼圖、影片、音訊等
            reply_to_line(reply_token, "我目前只支援文字與照片分析。你可以直接傳文字或上傳照片。")

        except Exception:
            # 保證 webhook 不要 500
            try:
                reply_to_line(event.get("replyToken"), "系統剛剛發生小錯誤，請再試一次。")
            except Exception:
                pass

    return "OK", 200


if __name__ == "__main__":
    # 本機測試用；Render 會用 gunicorn 啟動
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))
