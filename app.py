<!-- templates/index.html
============================================================
VHDS V3（Flask 表單版：最穩定）
目的：
1) 上傳照片立即顯示縮圖（讓使用者知道成功）
2) 按「開始分析」一定送出 POST /analyze（避免 iPhone 點了沒反應）
3) 後端回傳 result 後顯示總分與指標清單
4) 使用 radar.js 將 10 指標畫成雷達圖
============================================================
-->

<!doctype html>
<html lang="zh-Hant">
<head>
  <!-- =========================
  (A) 基本設定
  ========================== -->
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>VHDS V3</title>

  <!-- =========================
  (B) 極簡樣式（可刪、可換你自己的 CSS）
  - 不影響功能
  ========================== -->
  <style>
    body{
      background:#0b1020; color:white; font-family:sans-serif; padding:20px;
    }
    input,select,button{
      padding:10px; margin:6px 0; width:100%; max-width:420px;
    }
    #photoPreview{
      display:flex; gap:8px; flex-wrap:wrap; margin:10px 0;
    }
    #photoPreview img{
      width:80px; height:80px; object-fit:cover; border-radius:8px;
    }
    button{
      background:#22c55e; color:white; border:none; border-radius:10px; font-weight:800;
      cursor:pointer;
    }
    hr{border:0; border-top:1px solid rgba(255,255,255,.15); margin:18px 0;}
  </style>
</head>

<body>

  <!-- =========================
  (C) 標題區
  ========================== -->
  <h2>VHDS V3 分析</h2>

  <!-- =========================
  (D) 表單區（最重要）
  ✅ 若按鈕沒反應，先檢查這段：
  1) method="POST" 是否存在
  2) action="/analyze" 是否存在
  3) enctype="multipart/form-data" 是否存在（上傳檔案必須）
  4) <button type="submit"> 是否存在
  ========================== -->
  <form id="vhdsForm" method="POST" action="/analyze" enctype="multipart/form-data">

    <!-- ===== 使用者輸入（後端用 request.form.get(...) 讀取） ===== -->
    <label>年齡
      <input name="age" id="age" type="number" inputmode="numeric">
    </label>

    <label>身高
      <input name="height" id="height" type="number" inputmode="numeric">
    </label>

    <label>體重
      <input name="weight" id="weight" type="number" inputmode="numeric">
    </label>

    <label>腰圍
      <input name="waist" id="waist" type="number" inputmode="numeric">
    </label>

    <!-- ===== 模式（後端用 request.form.get("mode") 讀取） ===== -->
    <label>模式
      <select name="mode" id="mode">
        <option value="health">健康</option>
        <option value="skin">肌膚</option>
        <option value="face">面相</option>
        <option value="psy">心理</option>
      </select>
    </label>

    <!-- =========================
    (E) 照片上傳（最重要）
    ✅ 後端用 request.files.getlist("photo") 讀取
    所以 name="photo" 必須存在
    ========================== -->
    <label>上傳照片
      <input type="file" name="photo" id="photos" accept="image/*" multiple>
    </label>

    <!-- ===== 縮圖預覽區（JS 會把縮圖塞進來） ===== -->
    <div id="photoPreview"></div>

    <!-- =========================
    (F) 提交按鈕（最重要）
    ✅ type="submit" 必須存在
    iPhone 若還是偶爾不送，我們下面有保底 form.submit()
    ========================== -->
    <button id="submitBtn" type="submit">開始分析</button>

  </form>

  <hr>

  <!-- =========================
  (G) 結果區（由 Flask render_template 傳回 result）
  ✅ 若你按分析後頁面有刷新但沒顯示結果：
  - 檢查 app.py 的 /analyze 是否有 return render_template(..., result=result)
  ========================== -->
  {% if result %}
    <h3>總分: {{result.overall}}</h3>

    <!-- 雷達圖 canvas：radar.js 會畫在這裡 -->
    <canvas id="radarCanvas" width="400" height="400"></canvas>

    <!-- 10 指標清單 -->
    {% for item in result.items %}
      <div>{{item.name}} : {{item.score}}</div>
    {% endfor %}
  {% endif %}

  <!-- =========================
  (H) 前端 JS：縮圖預覽（確認使用者上傳成功）
  ✅ 若縮圖不出現：
  - 檢查 input id="photos" 是否存在
  - 檢查 div id="photoPreview" 是否存在
  ========================== -->
  <script>
    document.getElementById("photos").addEventListener("change", function(e){
      const preview = document.getElementById("photoPreview");
      preview.innerHTML = "";
      for (const file of e.target.files) {
        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        preview.appendChild(img);
      }
    });
  </script>

  <!-- =========================
  (I) iPhone 保底：避免點了按鈕「偶爾不送出」
  ✅ 若你遇到按按鈕沒反應，這段是核心保護
  ========================== -->
  <script>
    (function () {
      const form = document.getElementById("vhdsForm");
      const btn = document.getElementById("submitBtn");
      if (!form || !btn) return;
      btn.addEventListener("click", function () {
        setTimeout(() => {
          try { form.submit(); } catch (_) {}
        }, 0);
      });
    })();
  </script>

  <!-- =========================
  (J) 雷達圖 JS
  ✅ 若雷達圖不出現：
  1) 打開 /static/radar.js 看是否 404
  2) 確認 radar.js 有 window.VHDSRadar.start(...)
  ========================== -->
  <script src="{{ url_for('static', filename='radar.js') }}"></script>

  <!-- =========================
  (K) 將 result.items 丟給 radar.js 畫圖
  ✅ 若 console 出錯，多半是 items 格式不對
  ========================== -->
  <script>
    {% if result %}
      const items = {{ result.items | tojson }};
      if (window.VHDSRadar && typeof VHDSRadar.start === "function") {
        VHDSRadar.start("radarCanvas", items);
      }
    {% endif %}
  </script>

</body>
</html>
