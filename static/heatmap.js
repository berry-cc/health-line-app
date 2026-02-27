/* static/heatmap.js
   VHDS V2.2 - Medical-grade Heatmap (10 hotspots + glow + breathing pulse + label+score)
*/
(function () {
  "use strict";

  const DPR = () => Math.max(1, Math.min(3, window.devicePixelRatio || 1));

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function toNum(v, d = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
  }

  function normalizeItems(items) {
    // items: [{name, score, desc}, ...]
    if (!Array.isArray(items)) return [];
    return items.slice(0, 10).map((it, idx) => ({
      name: (it && it.name) ? String(it.name) : `指標${idx + 1}`,
      score: clamp(toNum(it && it.score, 0), 0, 100),
      desc: (it && it.desc) ? String(it.desc) : ""
    }));
  }

  function fitCanvas(canvas) {
    const dpr = DPR();
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(10, Math.floor(rect.width));
    const h = Math.max(10, Math.floor(rect.height));

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels
    return { ctx, w, h };
  }

  function drawBackdrop(ctx, w, h) {
    // medical dark glass panel
    ctx.clearRect(0, 0, w, h);

    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "rgba(10,18,35,1)");
    bg.addColorStop(1, "rgba(6,12,26,1)");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // subtle grid
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = "rgba(120,160,255,0.35)";
    ctx.lineWidth = 1;
    const step = 24;
    for (let x = 0; x <= w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.restore();

    // vignette
    ctx.save();
    const vg = ctx.createRadialGradient(w * 0.5, h * 0.55, Math.min(w, h) * 0.1, w * 0.5, h * 0.55, Math.min(w, h) * 0.75);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  function drawSilhouette(ctx, w, h) {
    // simple medical silhouette (front view)
    const cx = w * 0.5;
    const top = h * 0.12;
    const bodyTop = h * 0.22;
    const bodyBottom = h * 0.86;

    ctx.save();
    ctx.strokeStyle = "rgba(180,210,255,0.35)";
    ctx.lineWidth = 2;
    ctx.shadowColor = "rgba(0,255,220,0.22)";
    ctx.shadowBlur = 12;

    // head
    const headR = Math.min(w, h) * 0.07;
    ctx.beginPath();
    ctx.arc(cx, top + headR, headR, 0, Math.PI * 2);
    ctx.stroke();

    // torso (rounded rect)
    const bw = w * 0.28;
    const bh = bodyBottom - bodyTop;
    const bx = cx - bw / 2;
    const br = Math.min(24, bw * 0.18);
    roundRect(ctx, bx, bodyTop, bw, bh, br);
    ctx.stroke();

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

  function hotspotLayout(w, h) {
    // 10 hotspots: head, face, chest, upper abd, lower abd, pelvis, arm L/R, leg L/R
    // positions are relative to silhouette
    const cx = w * 0.5;
    return [
      { key: "z_head",  x: cx,        y: h * 0.18, side: "C" },
      { key: "z_face",  x: cx,        y: h * 0.22, side: "C" },
      { key: "z_chest", x: cx,        y: h * 0.36, side: "C" },
      { key: "z_upper_abd", x: cx,    y: h * 0.48, side: "C" },
      { key: "z_lower_abd", x: cx,    y: h * 0.56, side: "C" },
      { key: "z_pelvis", x: cx,       y: h * 0.66, side: "C" },
      { key: "z_arm_l", x: cx - w*0.18, y: h * 0.46, side: "L" },
      { key: "z_arm_r", x: cx + w*0.18, y: h * 0.46, side: "R" },
      { key: "z_leg_l", x: cx - w*0.10, y: h * 0.82, side: "L" },
      { key: "z_leg_r", x: cx + w*0.10, y: h * 0.82, side: "R" },
    ];
  }

  function scoreToGlow(score) {
    // 0..100 -> intensity & radius
    const s = clamp(score, 0, 100);
    const intensity = 0.25 + (s / 100) * 0.75;
    const radius = 16 + (s / 100) * 20;
    return { intensity, radius };
  }

  function drawHotspot(ctx, x, y, score, pulse) {
    const { intensity, radius } = scoreToGlow(score);
    const r = radius * (1 + 0.10 * pulse);

    // outer glow
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowColor = "rgba(0,255,220,0.55)";
    ctx.shadowBlur = 22;

    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,80,120,${0.85 * intensity})`);
    g.addColorStop(0.45, `rgba(255,80,120,${0.35 * intensity})`);
    g.addColorStop(1, "rgba(255,80,120,0)");

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // core
    ctx.shadowBlur = 0;
    ctx.fillStyle = `rgba(255,120,170,${0.85 * intensity})`;
    ctx.beginPath();
    ctx.arc(x, y, 5.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawLabel(ctx, x, y, name, score, side) {
    ctx.save();
    ctx.font = "12px Arial";
    ctx.textBaseline = "middle";

    const txt = `${name} ${score}`;
    const pad = 7;
    const tw = ctx.measureText(txt).width;
    const boxW = tw + pad * 2;
    const boxH = 22;

    // place label next to point
    let bx = x + 14;
    if (side === "L") bx = x - 14 - boxW;
    if (side === "C") bx = x - boxW / 2;

    let by = y - boxH / 2;
    bx = clamp(bx, 6, Math.max(6, ctx.canvas.width / DPR() - boxW - 6));
    by = clamp(by, 6, Math.max(6, ctx.canvas.height / DPR() - boxH - 6));

    // glass pill
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = "rgba(10,22,45,0.70)";
    ctx.strokeStyle = "rgba(120,200,255,0.35)";
    ctx.lineWidth = 1;

    roundRect(ctx, bx, by, boxW, boxH, 10);
    ctx.fill();
    ctx.stroke();

    // text
    ctx.fillStyle = "rgba(235,245,255,0.95)";
    ctx.textAlign = "center";
    ctx.fillText(txt, bx + boxW / 2, by + boxH / 2);

    ctx.restore();
  }

  function drawHeatmapFrame(ctx, w, h, items, t) {
    drawBackdrop(ctx, w, h);
    drawSilhouette(ctx, w, h);

    const pts = hotspotLayout(w, h);

    // If items < 10, still show with defaults
    const safeItems = [];
    for (let i = 0; i < 10; i++) {
      safeItems.push(items[i] || { name: `指標${i + 1}`, score: 0 });
    }

    // breathing pulse 0..1
    const pulse = 0.85 + 0.15 * Math.sin(t / 420);

    // hotspots
    for (let i = 0; i < 10; i++) {
      const p = pts[i];
      const it = safeItems[i];
      drawHotspot(ctx, p.x, p.y, it.score, pulse);
    }

    // labels on top (ensure readable)
    for (let i = 0; i < 10; i++) {
      const p = pts[i];
      const it = safeItems[i];
      drawLabel(ctx, p.x, p.y, it.name, it.score, p.side);
    }
  }

  let anim = null;

  function start(canvasId, items) {
    const c = document.getElementById(canvasId);
    if (!c) return;

    const list = normalizeItems(items);

    // stop previous
    if (anim) cancelAnimationFrame(anim);
    let lastW = 0, lastH = 0;

    const loop = (ts) => {
      const { ctx, w, h } = fitCanvas(c);

      // avoid extra work if hidden
      if (w !== lastW || h !== lastH) {
        lastW = w; lastH = h;
      }

      drawHeatmapFrame(ctx, w, h, list, ts);
      anim = requestAnimationFrame(loop);
    };

    anim = requestAnimationFrame(loop);
  }

  function stop() {
    if (anim) cancelAnimationFrame(anim);
    anim = null;
  }

  window.VHDSHeatmap = { start, stop };
})();
