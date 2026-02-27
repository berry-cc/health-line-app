// /static/heatmap.js
(function () {
  "use strict";

  // === Tuning (醫療級視覺 + 效能) ===
  const FPS = 24;                 // 呼吸動畫更新率（24fps 很順也不重）
  const DPR_CAP = 2;              // 裝置像素比上限（避免太吃效能）
  const GLOW_BLUR = 16;           // 熱點光暈 blur
  const HOT_BASE_R = 10;          // 熱點基礎半徑
  const HOT_PULSE_R = 8;          // 呼吸放大幅度
  const TEXT_SIZE = 12;           // 標籤字體
  const PANEL_ALPHA = 0.25;       // 面板透明度

  // 10 熱區 key（需與 app.py 的 heat_scores key 對應）
  const ZONES = [
    { key: "z_head",      name: "頭部",   nx: 0.50, ny: 0.12 },
    { key: "z_face",      name: "臉部",   nx: 0.50, ny: 0.18 },
    { key: "z_chest",     name: "胸腔",   nx: 0.50, ny: 0.33 },
    { key: "z_upper_abd", name: "上腹",   nx: 0.50, ny: 0.44 },
    { key: "z_lower_abd", name: "下腹",   nx: 0.50, ny: 0.52 },
    { key: "z_pelvis",    name: "骨盆",   nx: 0.50, ny: 0.60 },
    { key: "z_arm_l",     name: "左臂",   nx: 0.33, ny: 0.38 },
    { key: "z_arm_r",     name: "右臂",   nx: 0.67, ny: 0.38 },
    { key: "z_leg_l",     name: "左腿",   nx: 0.44, ny: 0.82 },
    { key: "z_leg_r",     name: "右腿",   nx: 0.56, ny: 0.82 },
  ];

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function setupCanvas(canvas) {
    const dpr = Math.min(DPR_CAP, window.devicePixelRatio || 1);
    const cssW = canvas.clientWidth || canvas.width || 320;
    const cssH = canvas.clientHeight || canvas.height || 360;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w: cssW, h: cssH };
  }

  // 醫療全息底色
  function drawBackground(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);

    // 深藍底漸層
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "#071429");
    bg.addColorStop(0.55, "#061025");
    bg.addColorStop(1, "#040b18");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // 輕微網格（醫療 UI 感）
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = "#1fd3ff";
    ctx.lineWidth = 1;

    const step = 22;
    for (let x = 0; x <= w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
      ctx.stroke();
    }
    ctx.restore();

    // 中央光束
    ctx.save();
    ctx.globalAlpha = 0.22;
    const beam = ctx.createRadialGradient(w * 0.5, h * 0.35, 20, w * 0.5, h * 0.35, h * 0.7);
    beam.addColorStop(0, "#2ef0ff");
    beam.addColorStop(0.35, "rgba(46,240,255,0.25)");
    beam.addColorStop(1, "rgba(46,240,255,0)");
    ctx.fillStyle = beam;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // 簡潔人體輪廓（藍色全息線框風）
  function drawHoloHuman(ctx, w, h) {
    const cx = w * 0.5;
    const top = h * 0.08;
    const bottom = h * 0.94;

    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 2;

    // 外輪廓光暈
    ctx.shadowColor = "#2ef0ff";
    ctx.shadowBlur = 22;

    const stroke = ctx.createLinearGradient(0, top, 0, bottom);
    stroke.addColorStop(0, "#baf9ff");
    stroke.addColorStop(0.35, "#2ef0ff");
    stroke.addColorStop(1, "#167bff");
    ctx.strokeStyle = stroke;

    // 頭
    const headR = Math.min(w, h) * 0.08;
    ctx.beginPath();
    ctx.arc(cx, top + headR, headR, 0, Math.PI * 2);
    ctx.stroke();

    // 身體輪廓（簡化）
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.12, top + headR * 2.2);     // 左肩
    ctx.quadraticCurveTo(cx, top + headR * 1.9, cx + w * 0.12, top + headR * 2.2); // 右肩
    ctx.lineTo(cx + w * 0.14, h * 0.55);             // 右腰
    ctx.quadraticCurveTo(cx + w * 0.12, h * 0.72, cx + w * 0.08, h * 0.9); // 右腿外
    ctx.lineTo(cx + w * 0.02, h * 0.9);              // 右腳內
    ctx.lineTo(cx, h * 0.68);                        // 兩腿交界
    ctx.lineTo(cx - w * 0.02, h * 0.9);              // 左腳內
    ctx.lineTo(cx - w * 0.08, h * 0.9);              // 左腿外
    ctx.quadraticCurveTo(cx - w * 0.12, h * 0.72, cx - w * 0.14, h * 0.55); // 左腰
    ctx.closePath();
    ctx.stroke();

    // 手臂線（簡化）
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.12, top + headR * 2.2);
    ctx.quadraticCurveTo(cx - w * 0.26, h * 0.36, cx - w * 0.22, h * 0.52);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + w * 0.12, top + headR * 2.2);
    ctx.quadraticCurveTo(cx + w * 0.26, h * 0.36, cx + w * 0.22, h * 0.52);
    ctx.stroke();

    // 內部骨架線（淡）
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#9cf6ff";
    ctx.beginPath();
    ctx.moveTo(cx, top + headR * 2.2);
    ctx.lineTo(cx, h * 0.88);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  // 面板（左右資訊框）
  function drawInfoPanels(ctx, w, h, rows) {
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.font = `${TEXT_SIZE}px Arial`;
    ctx.textBaseline = "middle";

    const leftX = w * 0.05;
    const rightX = w * 0.65;
    const y0 = h * 0.18;
    const gap = 46;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const side = (i % 2 === 0) ? "left" : "right";
      const x = (side === "left") ? leftX : rightX;
      const y = y0 + Math.floor(i / 2) * gap;

      // 面板框
      ctx.save();
      ctx.globalAlpha = PANEL_ALPHA;
      ctx.fillStyle = "#2ef0ff";
      ctx.shadowColor = "#2ef0ff";
      ctx.shadowBlur = 16;
      roundRect(ctx, x, y, w * 0.30, 34, 10);
      ctx.fill();
      ctx.restore();

      // 面板內文字
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#e8feff";
      const title = `${r.name}`;
      const val = `${r.score}`;
      ctx.fillText(title, x + 10, y + 11);
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = "#9ff7ff";
      ctx.fillText(val, x + 10, y + 24);
      ctx.restore();
    }

    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // 熱點：發光 + 呼吸脈動 + 文字(name + score)
  function drawHotspots(ctx, w, h, heatScores, labels, t) {
    const itemsName = Array.isArray(labels) ? labels : [];

    // 把 items 的 name 優先用在面板上（看起來更專業）
    const panelRows = ZONES.map((z, idx) => ({
      name: itemsName[idx] || z.name,
      score: Number(heatScores?.[z.key] ?? 0) || 0
    })).slice(0, 8); // 面板顯示 8 個就很有醫療 UI 感

    drawInfoPanels(ctx, w, h, panelRows);

    // 熱點繪製
    ctx.save();
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${TEXT_SIZE}px Arial`;

    ZONES.forEach((z, idx) => {
      const score = clamp(Number(heatScores?.[z.key] ?? 0) || 0, 0, 100);
      const name = itemsName[idx] || z.name;

      const x = w * z.nx;
      const y = h * z.ny;

      // 分數越高越亮（顏色更偏熱：青 -> 桃紅）
      const hot = score / 100;
      const glowColor = lerpColor("#2ef0ff", "#ff4fd8", hot);

      // 呼吸脈動（0.7~1.3）
      const pulse = 1 + 0.28 * Math.sin(t * 2.2 + idx);
      const r = HOT_BASE_R + HOT_PULSE_R * hot * pulse;

      // 外光暈
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = GLOW_BLUR + 18 * hot;
      ctx.globalAlpha = 0.85;

      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2);
      g.addColorStop(0, hexToRgba(glowColor, 0.85));
      g.addColorStop(0.35, hexToRgba(glowColor, 0.35));
      g.addColorStop(1, hexToRgba(glowColor, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r * 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 內核（亮點）
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 10 + 10 * hot;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(3, r * 0.45), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 標籤（name + score）
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.shadowBlur = 8;
      ctx.shadowColor = "#2ef0ff";
      ctx.fillStyle = "#eaffff";
      const label = `${name} ${score}`;
      // label 放右側、避免擋住熱點
      ctx.fillText(label, x + r * 1.6, y);
      ctx.restore();
    });

    ctx.restore();
  }

  function lerpColor(a, b, t) {
    t = clamp(t, 0, 1);
    const ar = parseInt(a.slice(1, 3), 16);
    const ag = parseInt(a.slice(3, 5), 16);
    const ab = parseInt(a.slice(5, 7), 16);
    const br = parseInt(b.slice(1, 3), 16);
    const bg = parseInt(b.slice(3, 5), 16);
    const bb = parseInt(b.slice(5, 7), 16);
    const rr = Math.round(ar + (br - ar) * t);
    const rg = Math.round(ag + (bg - ag) * t);
    const rb = Math.round(ab + (bb - ab) * t);
    return "#" + [rr, rg, rb].map(n => n.toString(16).padStart(2, "0")).join("");
  }

  function hexToRgba(hex, a) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  // === Public API ===
  // window.VHDSHeatmap.start("heatCanvas", heat_scores, labels)
  let anim = null;
  function start(canvasId, heatScores, labels) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const { ctx, w, h } = setupCanvas(canvas);

    // 動畫節流
    let last = 0;
    function loop(ts) {
      anim = requestAnimationFrame(loop);

      if (ts - last < (1000 / FPS)) return;
      last = ts;

      const t = ts / 1000;

      drawBackground(ctx, w, h);
      drawHoloHuman(ctx, w, h);
      drawHotspots(ctx, w, h, heatScores || {}, labels || [], t);
    }

    stop();
    anim = requestAnimationFrame(loop);
  }

  function stop() {
    if (anim) cancelAnimationFrame(anim);
    anim = null;
  }

  window.VHDSHeatmap = { start, stop };
})();
