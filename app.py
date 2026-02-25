from flask import Flask, request
import os
import requests
import openai

app = Flask(__name__)

LINE_CHANNEL_ACCESS_TOKEN = os.environ.get("LINE_CHANNEL_ACCESS_TOKEN")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")

openai.api_key = OPENAI_API_KEY


@app.route("/")
def home():
    return "Health Line AI Bot Running"


@app.route("/webhook", methods=["POST"])
def webhook():
    data = request.json

    events = data.get("events", [])

    for event in events:
        if event["type"] == "message":

            user_message = event["message"]["text"]
            reply_token = event["replyToken"]

            # 呼叫 OpenAI
            ai_response = openai.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "你是HealthLine健康管理AI助手"},
                    {"role": "user", "content": user_message}
                ]
            )

            reply_text = ai_response.choices[0].message.content

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
                json=body
            )

    return "OK"
