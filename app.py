from flask import Flask, request
import os
import requests
import base64
from openai import OpenAI

app = Flask(__name__)

LINE_CHANNEL_ACCESS_TOKEN = os.environ.get("LINE_CHANNEL_ACCESS_TOKEN")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")

client = OpenAI(api_key=OPENAI_API_KEY)

def line_reply(reply_token: str, text: str):
    headers = {
        "Authorization": f"Bearer {LINE_CHANNEL_ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    body = {
        "replyToken": reply_token,
        "messages": [{"type": "text", "text": text}]
    }
    requests.post("https://api.line.me/v2/bot/message/reply", headers=headers, json=body)

def download_line_image(message_id: str) -> bytes:
    # 下載 LINE 圖片二進位
    url = f"https://api-data.line.me/v2/bot/message/{message_id}/content"
    headers = {"Authorization": f"Bearer {LINE_CHANNEL_ACCESS_TOKEN}"}
    r = requests.get(url, headers=headers, timeout=30)
    r.raise_for_status()
    return r.content

@app.route("/")
def home():
    return "Health Line AI Bot Running"

@app.route("/webhook", methods=["POST"])
def webhook():
    data = request.json
    events = data.get("events", [])

    for event in events:
        if event.get("type") != "message":
            continue

        reply_token = event.get("replyToken")
        message = event.get("message", {})
        mtype = message.get("type")

        # 1) 文字訊息
        if mtype == "text":
            user_message = message.get("text", "").strip()

            ai = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": (
                        "你是 HealthLine 健康管理 AI 助手，用繁體中文回答。"
                        "你提供的是一般健康資訊，不替代醫師診斷；遇到危急症狀請就醫。"
                        "回答要：先給結論，再用條列說明，最後給下一步建議。"
                    )},
                    {"role": "user", "content": user_message}
                ]
            )
            reply_text = ai.choices[0].message.content
            line_reply(reply_token, reply_text)
            continue

        # 2) 圖片訊息（使用者傳照片）
        if mtype == "image":
            message_id = message.get("id")
            try:
                img_bytes = download_line_image(message_id)
                b64 = base64.b64encode(img_bytes).decode("utf-8")

                ai = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": (
                            "你是 HealthLine 健康管理 AI 助手，用繁體中文回答。"
                            "你要根據使用者上傳的圖片做『一般健康/體態/皮膚狀況』觀察，"
                            "務必保守、不誇大，不做醫療診斷。"
                            "輸出格式：\n"
                            "1) 你看到的重點（3-6點）\n"
                            "2) 可能原因（分高/中/低可能）\n"
                            "3) 建議（飲食/作息/運動/就醫警訊）\n"
                        )},
                        {"role": "user", "content": [
                            {"type": "text", "text": "請分析這張照片的健康/體態/皮膚狀況，給我保守且可執行的建議。"},
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}}
                        ]}
                    ]
                )

                reply_text = ai.choices[0].message.content
                line_reply(reply_token, reply_text)

            except Exception as e:
                # 避免 LINE 端無回應
                line_reply(reply_token, f"圖片分析失敗，可能是圖片下載或AI額度/設定問題。錯誤：{str(e)[:120]}")
            continue

        # 其他類型先忽略
        line_reply(reply_token, "我目前支援文字與圖片。你可以直接傳一張照片給我分析。")

    return "OK"
