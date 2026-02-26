/* static/heatmap.js
   醫療級「發光 + 呼吸脈動」人體熱區（Canvas 版）
   需求（你的 index.html 只要做到其中一種）：
   A) <div id="heatmapContainer"><img id="bodyBase" ...></div>
      並在頁面先放：window.HEAT_SCORES = {...};
   或
   B) <canvas id="heatmapCanvas"></canvas>（你自己鋪底圖/底色）
*/

(() => {
  "use strict";

  // 你在 index.html 建議加這行（Flask）：
  // <script>window.HEAT_SCORES = {{ heat_scores|tojson }};</script>
  const getScores = () => (window.HEAT_SCORES && typeof window.HEAT_SCORES === "object")
    ? window.HEAT_SCORES
    : {};

  // 熱區位置（相對於容器寬高的比例座標 0~1）
  // 你之後如果覺得位置不準，只要改這裡的 x/y
  const ZONES = {
    z_head:      { x: 0.50, y: 0.12, r: 0.13 },
    z_face:      { x: 0.50, y: 0.18, r: 0.12 },
    z_chest:     { x: 0.50, y: 0.32, r: 0.16 },
    z_upper_abd: { x: 0.50, y: 0.44, r: 0.16 },
    z_lower_abd: { x: 0.50, y: 0.54, r: 0.16 },
    z_pelvis:    { x: 0.50, y: 0.62, r: 0.15 },

    z_arm_l:     { x: 0.34, y: 0.40, r: 0.13 },
    z_arm_r:     { x: 0.66, y: 0.40, r: 0.13 },

    z_leg_l:     { x: 0.46, y: 0.80, r: 0.17 },
    z_leg_r:     { x: 0.54, y: 0.80, r: 0.17 },
  };

  // 分數 → 顏色（醫療掃描感：冷→熱）
  // 0=冷藍, 100=熱紅；中間帶青/黃
  function scoreToRGBA(score, alpha = 1) {
    const s = clamp(score, 0, 100) / 100;
    // Hue: 210(藍) → 0(紅)
    const hue = 210 - (210 * s);
    // 稍微提高飽和/亮度讓看起來更科技
    const sat = 95;
    const light = 55 + (10 * s);
    const { r, g, b } = hslToRgb(hue / 360, sat / 100, light / 100);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }

  function ensureCanvas(container) {
    let canvas = container.querySelector("canvas#heatmapCanvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "heatmapCanvas";
      container.appendChild(canvas);
    }
    canvas.style.position = "absolute";
    canvas.style.left = "0";
    canvas.style.top = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";
    canvas.style.mixBlendMode = "screen"; // 讓發光更像掃描
    return canvas;
  }

  function ensureContainer() {
    // 優先找 heatmapContainer；沒有就退而求其次找 bodyBase 的父層
    let container = document.getElementById("heatmapContainer");
    if (!container) {
      const base = document.getElementById("bodyBase") || document.getElementById("bodyImage");
      if (base && base.parentElement) container = base.parentElement;
    }
    // 再沒有就找整頁第一個 .heatmap-wrap
    if (!container) container = document.querySelector(".heatmap-wrap");

    return container;
  }

  function setupLayout(container) {
    // 讓 canvas 疊在底圖上方
    const style = getComputedStyle(container);
    if (style.position === "static") {
      container.style.position = "relative";
    }
  }

  function resizeCanvasToContainer(canvas, container) {
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // 用 CSS px 畫
    return { w, h, dpr };
  }

  function drawGlow(ctx, x, y, radiusPx, score, pulseK) {
    // pulseK: 0.85~1.15
    const s = clamp(score, 0, 100);
    const strength = s / 100;

    // 3 層：核心亮點 + 中層暈光 + 外層柔光
    const coreR = radiusPx * 0.35 * pulseK;
    const midR  = radiusPx * 0.70 * pulseK;
    const outR  = radiusPx * 1.10 * pulseK;

    // 外層柔光
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.35 + 0.35 * strength;
    ctx.shadowColor = scoreToRGBA(s, 0.9);
    ctx.shadowBlur = 40 + 60 * strength;
    radialFill(ctx, x, y, outR, scoreToRGBA(s, 0.00), scoreToRGBA(s, 0.35));
    ctx.restore();

    // 中層暈光
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.55 + 0.25 * strength;
    ctx.shadowColor = scoreToRGBA(s, 1);
    ctx.shadowBlur = 18 + 30 * strength;
    radialFill(ctx, x, y, midR, scoreToRGBA(s, 0.00), scoreToRGBA(s, 0.55));
    ctx.restore();

    // 核心亮點
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.75 + 0.20 * strength;
    ctx.shadowColor = "rgba(255,255,255,0.55)";
    ctx.shadowBlur = 10 + 10 * strength;
    radialFill(ctx, x, y, coreR, "rgba(255,255,255,0.95)", scoreToRGBA(s, 0.85));
    ctx.restore();
  }

  function radialFill(ctx, x, y, r, innerColor, outerColor) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0.0, innerColor);
    g.addColorStop(1.0, outerColor);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function clear(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
  }

  function renderLoop(state) {
    const { canvas, ctx, container } = state;
    const { w, h } = state.size;

    const scores = getScores();
    const t = performance.now() / 1000;

    clear(ctx, w, h);

    // 整體淡淡掃描霧（讓背景更高級）
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = "rgba(0, 220, 255, 1)";
    // 一條會移動的掃描帶
    const bandY = (Math.sin(t * 0.6) * 0.5 + 0.5) * h;
    ctx.fillRect(0, bandY - 18, w, 36);
    ctx.restore();

    // 每個熱區：依分數發光 + 呼吸脈動
    for (const [key, meta] of Object.entries(ZONES)) {
      const score = Number(scores[key] ?? 0);
      if (!Number.isFinite(score) || score <= 0) continue;

      const x = meta.x * w;
      const y = meta.y * h;

      // radius：基礎 r + 分數增益
      const baseR = meta.r * Math.min(w, h);
      const r = baseR * (0.75 + (score / 100) * 0.55);

      // 呼吸脈動（每區略有相位差）
      const phase = (hashCode(key) % 100) / 100;
      const pulse = 1 + 0.10 * Math.sin((t * 2.2) + phase * Math.PI * 2);

      drawGlow(ctx, x, y, r, score, pulse);
    }

    state.raf = requestAnimationFrame(() => renderLoop(state));
  }

  function hashCode(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i), h |= 0;
    return Math.abs(h);
  }

  function start() {
    const container = ensureContainer();
    if (!container) {
      console.warn("[heatmap] 找不到容器：請在頁面放 #heatmapContainer 或底圖 #bodyBase");
      return;
    }

    setupLayout(container);
    const canvas = ensureCanvas(container);
    const ctx = canvas.getContext("2d");

    const state = { container, canvas, ctx, size: { w: 1, h: 1 }, raf: null };

    const doResize = () => {
      state.size = resizeCanvasToContainer(canvas, container);
    };
    doResize();

    // Resize Observer：容器大小變動就重算
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => doResize());
      ro.observe(container);
      state._ro = ro;
    } else {
      window.addEventListener("resize", doResize);
    }

    renderLoop(state);

    // 提供外部更新分數的方法：window.updateHeatScores({z_head:80,...})
    window.updateHeatScores = (next) => {
      if (next && typeof next === "object") window.HEAT_SCORES = next;
    };
  }

  // 啟動
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
