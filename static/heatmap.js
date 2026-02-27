// static/heatmap.js
// VHDS V2.2 - Medical-grade Heatmap (body.png + glowing breathing hotspots)
// API:
//   window.VHDSHeatmap.start(canvasId, heatScores, labels, options?)
// heatScores: object { z_head, z_face, z_chest, z_upper_abd, z_lower_abd, z_pelvis, z_arm_l, z_arm_r, z_leg_l, z_leg_r }
// labels: array length 10 (indicator names)

(function () {
  "use strict";

  const FPS = 12;                 // performance throttle
  const BASE_R = 10;              // base dot radius
  const PULSE_R = 12;              // pulse radius add
  const GLOW_BLUR = 22;           // glow softness
  const LABEL_FONT = 12;          // label font size
  const VALUE_FONT = 13;          // value font size
  const LINE_W = 1.2;             // stroke width

  const KEY_ORDER = [
    "z_head",
    "z_face",
    "z_chest",
    "z_upper_abd",
    "z_lower_abd",
    "z_pelvis",
    "z_arm_l",
    "z_arm_r",
    "z_leg_l",
    "z_leg_r",
  ];

  // Normalized positions (0..1) tuned for a front-body silhouette canvas
  // These are "good defaults" across 320x360 / 360x420, etc.
  const HOTSPOTS_N = [
    { id: "z_head",      x: 0.50, y: 0.13 },
    { id: "z_face",      x: 0.50, y: 0.20 },
    { id: "z_chest",     x: 0.50, y: 0.33 },
    { id: "z_upper_abd", x: 0.50, y: 0.45 },
    { id: "z_lower_abd", x: 0.50, y: 0.56 },
    { id: "z_pelvis",    x: 0.50, y: 0.66 },
    { id: "z_arm_l",     x: 0.26, y: 0.44 },
    { id: "z_arm_r",     x: 0.74, y: 0.44 },
    { id: "z_leg_l",     x: 0.40, y: 0.83 },
    { id: "z_leg_r",     x: 0.60, y: 0.83 },
  ];

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function getScore(heatScores, key, fallback) {
    if (!heatScores) return fallback;
    const v = heatScores[key];
    const num = Number(v);
    return Number.isFinite(num) ? num : fallback;
  }

  // Map score to glow intensity / color tint (medical neon)
  function scoreToStyle(score) {
    // score expected 0..100-ish
    const s = clamp(score, 0, 100);
    const t = s / 100;

    // color: cyan -> electric blue as score increases
    // We'll use rgba with varying alpha; actual glow comes from shadowBlur.
    const coreA = 0.85;
    const ringA = 0.55 + 0.35 * t;
    const textA = 0.85;

    // Slightly shift hue feel by mixing two blues
    const core = `rgba(${Math.round(120 + 80 * t)}, ${Math.round(210 + 35 * t)}, 255, ${coreA})`; // bright core
    const ring = `rgba(${Math.round(60 + 80 * t)}, ${Math.round(170 + 60 * t)}, 255, ${ringA})`; // outer ring
    const glow = `rgba(${Math.round(70 + 60 * t)}, ${Math.round(190 + 50 * t)}, 255, ${0.55 + 0.35 * t})`;
    const text = `rgba(220, 245, 255, ${textA})`;

    return { core, ring, glow, text };
  }

  function setupCanvas(canvas) {
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const cssW = canvas.clientWidth || Number(canvas.getAttribute("width")) || 320;
    const cssH = canvas.clientHeight || Number(canvas.getAttribute("height")) || 520;

    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, cssW, cssH, dpr };
  }

  function drawBodyImage(ctx, img, w, h) {
    // Cover fit with safe padding
    const pad = 6;
    const tw = w - pad * 2;
    const th = h - pad * 2;

    const ir = img.width / img.height;
    const tr = tw / th;

    let dw, dh, dx, dy;
    if (ir > tr) {
      // image wider -> fit width
      dw = tw;
      dh = tw / ir;
      dx = pad;
      dy = pad + (th - dh) / 2;
    } else {
      // image taller -> fit height
      dh = th;
      dw = th * ir;
      dx = pad + (tw - dw) / 2;
      dy = pad;
    }

    // soft background glow behind body
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.shadowColor = "rgba(90,190,255,.55)";
    ctx.shadowBlur = 26;
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();

    // crisp body
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();
  }

  function drawHotspot(ctx, x, y, label, score, t) {
    const style = scoreToStyle(score);

    // pulse
    const pulse = 0.5 + 0.5 * Math.sin(t); // 0..1
    const r = BASE_R + PULSE_R * pulse;

    // glow ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r + 6, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0)";

    ctx.shadowColor = style.glow;
    ctx.shadowBlur = GLOW_BLUR + 10 * pulse;
    ctx.fill();
    ctx.restore();

    // outer ring stroke
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r + 2, 0, Math.PI * 2);
    ctx.strokeStyle = style.ring;
    ctx.lineWidth = LINE_W;
    ctx.shadowColor = style.glow;
    ctx.shadowBlur = 10 + 10 * pulse;
    ctx.stroke();
    ctx.restore();

    // core dot
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = style.core;
    ctx.shadowColor = style.glow;
    ctx.shadowBlur = 12 + 12 * pulse;
    ctx.fill();
    ctx.restore();

    // Label pill: "Name  88"
    const safeLabel = (label || "—").toString();
    const safeScore = Number.isFinite(Number(score)) ? Math.round(Number(score)) : 0;
    const text = `${safeLabel}  ${safeScore}`;

    ctx.save();
    ctx.font = `600 ${VALUE_FONT}px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans TC","Noto Sans JP",sans-serif`;
    const metrics = ctx.measureText(text);
    const tw = metrics.width;

    const padX = 10, padY = 7;
    const bw = tw + padX * 2;
    const bh = VALUE_FONT + padY * 2;

    // default: right side label; if too close to right edge -> put left
    const offset = 14;
    let bx = x + offset;
    let by = y - bh / 2;

    const W = ctx.canvas.clientWidth || ctx.canvas.width;
    // We can't rely on clientWidth here, use large safe bound with canvas actual scale:
    // We'll clamp by using current transform in setupCanvas (css coords), so assume cssW approx:
    // We'll just keep within 0..(canvas.width/dpr) by passing cssW externally if needed.
    // For safety, adjust by simple heuristics:
    if (bx + bw > 320) bx = x - offset - bw;

    // pill background
    ctx.globalAlpha = 0.90;
    ctx.fillStyle = "rgba(8, 18, 30, 0.65)";
    ctx.strokeStyle = "rgba(120, 210, 255, 0.35)";
    ctx.lineWidth = 1;

    // glow edge
    ctx.shadowColor = "rgba(90,190,255,0.45)";
    ctx.shadowBlur = 14 + 10 * pulse;

    roundRect(ctx, bx, by, bw, bh, 10);
    ctx.fill();
    ctx.shadowBlur = 0;
    roundRect(ctx, bx, by, bw, bh, 10);
    ctx.stroke();

    // text
    ctx.shadowColor = "rgba(90,190,255,0.55)";
    ctx.shadowBlur = 10 + 6 * pulse;
    ctx.fillStyle = style.text;
    ctx.textBaseline = "middle";
    ctx.fillText(text, bx + padX, y);

    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function normalizeLabels(labels) {
    if (Array.isArray(labels) && labels.length) {
      // ensure length 10
      const out = [];
      for (let i = 0; i < 10; i++) out.push(labels[i] ?? `指標${i + 1}`);
      return out;
    }
    // fallback
    return Array.from({ length: 10 }, (_, i) => `指標${i + 1}`);
  }

  // Public API
  window.VHDSHeatmap = {
    start: function (canvasId, heatScores, labels, options) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) {
        console.error("VHDSHeatmap: canvas not found:", canvasId);
        return;
      }

      const { ctx, cssW, cssH } = setupCanvas(canvas);
      const labs = normalizeLabels(labels);

      const bodySrc = (options && options.bodyImageSrc) ? options.bodyImageSrc : "/static/body.png";

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        // animation loop (FPS throttled)
        let last = 0;
        let tick = 0;

        function frame(ts) {
          if (!last) last = ts;
          const dt = ts - last;
          if (dt < (1000 / FPS)) {
            requestAnimationFrame(frame);
            return;
          }
          last = ts;
          tick += dt;

          // background
          ctx.clearRect(0, 0, cssW, cssH);

          // dark gradient base (medical screen feel)
          const g = ctx.createRadialGradient(cssW * 0.5, cssH * 0.2, 10, cssW * 0.5, cssH * 0.6, cssH);
          g.addColorStop(0, "rgba(20,40,70,0.55)");
          g.addColorStop(0.55, "rgba(8,18,30,0.85)");
          g.addColorStop(1, "rgba(5,10,18,1)");
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, cssW, cssH);

          // body
          drawBodyImage(ctx, img, cssW, cssH);

          // hotspots
          const t = tick / 450; // pulse speed
          for (let i = 0; i < HOTSPOTS_N.length; i++) {
            const hs = HOTSPOTS_N[i];
            const x = hs.x * cssW;
            const y = hs.y * cssH;

            const score = getScore(heatScores, hs.id, 80);
            const label = labs[i] || hs.id;

            drawHotspot(ctx, x, y, label, score, t + i * 0.35);
          }

          requestAnimationFrame(frame);
        }

        requestAnimationFrame(frame);
      };

      img.onerror = () => {
        console.error("VHDSHeatmap: body image not found:", bodySrc, "請確認 static/body.png 已存在");
      };

      img.src = bodySrc;
    }
  };
})();
