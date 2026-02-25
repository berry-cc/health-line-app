from flask import Flask, request
import os
import requests
from openai import OpenAI

app = Flask(__name__)

LINE_CHANNEL_ACCESS_TOKEN = os.environ.get("LINE_CHANNEL_ACCESS_TOKEN")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")

client = OpenAI(api_key=OPENAI_API_KEY)

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

        message = event.get("message", {})
        if message.get("type") != "text":
            continue

        user_message = message.get("text", "")
        reply_token = event.get("replyToken")

        # 安全呼叫 OpenAI
        try:
            ai = client.chat.completions.create(
                model="gpt-4.1-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "你是HealthLine健康管理AI助手，用繁體中文回答。"
                    },
                    {
                        "role": "user",
                        "content": user_message
                    }
                ]
            )

            reply_text = ai.choices[0].message.content

        except Exception as e:
            print("OpenAI error:", str(e))

            reply_text = (
                "⚠️ 健康管理系統暫時忙碌\n\n"
                "請稍後再試。\n\n"
                "HealthLine AI"
            )

        headers = {
            "Authorization": f"Bearer {LINE_CHANNEL_ACCESS_TOKEN}",
            "Content-Type": "application/json"
        }

        body = {
            "replyToken": reply_token,
            "messages": [
                {
                    "type": "text",
                    "text": reply_text
                }
            ]
        }

        requests.post(
            "https://api.line.me/v2/bot/message/reply",
            headers=headers,
            json=body
        )

    return "OK"
