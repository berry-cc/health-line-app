from flask import Flask, request
import os
import requests

app = Flask(__name__)

LINE_CHANNEL_ACCESS_TOKEN = os.environ.get("LINE_CHANNEL_ACCESS_TOKEN")

@app.route("/")
def home():
    return "Health Line App is running"

@app.route("/webhook", methods=["POST"])
def webhook():
    data = request.json
    print("Received:", data)

    try:
        events = data["events"]

        for event in events:
            if event["type"] == "message":
                reply_token = event["replyToken"]
                user_message = event["message"]["text"]

                reply(reply_token, f"你剛剛說：{user_message}")

    except Exception as e:
        print("Error:", e)

    return "OK", 200


def reply(reply_token, text):

    url = "https://api.line.me/v2/bot/message/reply"

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {LINE_CHANNEL_ACCESS_TOKEN}"
    }

    data = {
        "replyToken": reply_token,
        "messages": [
            {
                "type": "text",
                "text": text
            }
        ]
    }

    response = requests.post(url, headers=headers, json=data)

    print(response.status_code, response.text)


if __name__ == "__main__":
    app.run()
