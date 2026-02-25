from flask import Flask, request

app = Flask(__name__)

@app.route("/")
def home():
    return "Health Line App is running"

@app.route("/webhook", methods=["POST"])
def webhook():
    data = request.json
    print("Received:", data)
    return "OK", 200

if __name__ == "__main__":
    app.run()
