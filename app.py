from flask import Flask, request
import os
import requests
from openai import OpenAI

app = Flask(__name__)

LINE_CHANNEL_ACCESS_TOKEN = os.environ.get("LINE_CHANNEL_ACCESS_TOKEN")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")

client = OpenAI(api_key=OPENAI_API_KEY)

# 健康檢查
@app.route("/")
def home():
    return "HealthLine AI Bot Running OK"

# LINE webhook
@app.route("/webhook", methods=["POST"])
def webhook():
    try:
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

            # 呼叫 OpenAI
            ai_response = client.chat.completions.create(
                model="gpt-4o-mini",
                temperature=0.6,
                max_tokens=300,
                messages=[
                    {
                        "role": "system",
                        "content": """
你是 HealthLine 專業健康管理AI助手。

規則：
- 使用繁體中文
- 回答專業但親切
- 簡潔清楚
- 像真人健康顧問
- 避免過長回答
"""
                    },
                    {
                        "role": "user",
                        "content": user_message
                    }
                ]
            )

            reply_text = ai_response.choices[0].message.content

            if not reply_text:
                reply_text = "抱歉，我暫時無法回覆，請稍後再試。"

            # 回覆 LINE
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
                json=body,
                timeout=10
            )

        return "OK"

    except Exception as e:
        print("Error:", str(e))
        return "ERROR"
