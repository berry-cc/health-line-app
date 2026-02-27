// static/heatmap.js
(function(){
  const FPS = 12;                 // ✅ 優化：從 60fps 降到 12fps
  const GLOW_BLUR = 12;           // ✅ 優化：降低 blur 但保留醫療級光暈
  const BASE_R = 10;              // 熱點半徑
  const TEXT_SIZE = 12;

  function setupCanvas(canvas){
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const cssW = canvas.clientWidth || canvas.width;
    const cssH = canvas.clientHeight || canvas.height;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr,0,0,dpr,0,0);
    return ctx;
  }

  function drawBodySilhouette(ctx, w, h){
    // 簡化醫療人體輪廓（高效、好看）
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = "rgba(255,255,255,0.30)";
    ctx.lineWidth = 2;

    const cx = w/2;
    const top = 26;
    const headR = 18;

    // head
    ctx.beginPath();
    ctx.arc(cx, top+headR, headR, 0, Math.PI*2);
    ctx.stroke();

    // torso
    ctx.beginPath();
    ctx.moveTo(cx, top+headR*2+8);
    ctx.bezierCurveTo(cx-60, top+120, cx-44, top+220, cx-22, top+300);
    ctx.moveTo(cx, top+headR*2+8);
    ctx.bezierCurveTo(cx+60, top+120, cx+44, top+220, cx+22, top+300);
    ctx.stroke();

    // shoulders line
    ctx.beginPath();
    ctx.moveTo(cx-70, top+headR*2+30);
    ctx.lineTo(cx+70, top+headR*2+30);
    ctx.stroke();

    // legs
    ctx.beginPath();
    ctx.moveTo(cx-22, top+300);
    ctx.lineTo(cx-34, top+390);
    ctx.moveTo(cx+22, top+300);
    ctx.lineTo(cx+34, top+390);
    ctx.stroke();

    ctx.restore();
  }

  function defaultPoints(items, w, h){
    // 10 熱點固定位置（醫療常見區）
    const cx = w/2;
    const y0 = 70;

    const pts = [
      {k:0, x: cx,     y: y0+10},   // 1 眉心/頭部
      {k:1, x: cx-42,  y: y0+60},   // 2 左眼/顴
      {k:2, x: cx+42,  y: y0+60},   // 3 右眼/顴
      {k:3, x: cx,     y: y0+105},  // 4 咽喉
      {k:4, x: cx,     y: y0+150},  // 5 心肺
      {k:5, x: cx-38,  y: y0+185},  // 6 左肋/肝脾
      {k:6, x: cx+38,  y: y0+185},  // 7 右肋/胃
      {k:7, x: cx,     y: y0+235},  // 8 腹部/代謝
      {k:8, x: cx-26,  y: y0+290},  // 9 左膝/下肢
      {k:9, x: cx+26,  y: y0+290},  // 10 右膝/下肢
    ];

    return pts.map(p=>{
      const it = items[p.k] || {name:`指標${p.k+1}`, score:80};
      return { x:p.x, y:p.y, name: it.name, score: Number(it.score||0) };
    });
  }

  function scoreColor(score){
    // score 0-100 -> color
    if(score >= 85) return "rgba(80,220,180,0.95)";
    if(score >= 70) return "rgba(120,220,255,0.95)";
    if(score >= 55) return "rgba(255,204,102,0.95)";
    return "rgba(255,107,107,0.95)";
  }

  function drawGlowPoint(ctx, x, y, label, value, t){
    const pulse = 0.65 + 0.35*Math.sin(t);       // 呼吸
    const r = BASE_R + 6*pulse;

    const col = scoreColor(value);

    // glow
    ctx.save();
    ctx.shadowColor = col;
    ctx.shadowBlur = GLOW_BLUR;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI*2);
    ctx.fill();

    // core
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.beginPath();
    ctx.arc(x, y, 3.2, 0, Math.PI*2);
    ctx.fill();

    // text (name + value)
    ctx.globalAlpha = 0.95;
    ctx.font = `700 ${TEXT_SIZE}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial`;
    ctx.fillStyle = "rgba(234,240,255,0.92)";
    ctx.textBaseline = "middle";
    const text = `${label}  ${value}`;
    ctx.fillText(text, x + 14, y);

    ctx.restore();
  }

  function render(canvasId, items){
    const canvas = document.getElementById(canvasId);
    if(!canvas) return;
    const ctx = setupCanvas(canvas);

    const w = canvas.clientWidth || 520;
    const h = canvas.clientHeight || 420;

    const pts = defaultPoints(items, w, h);

    let running = true;
    let tick = 0;

    function frame(){
      if(!running) return;

      // background
      ctx.clearRect(0,0,w,h);
      // subtle grid
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      for(let i=1;i<6;i++){
        const y = (h/6)*i;
        ctx.beginPath(); ctx.moveTo(10,y); ctx.lineTo(w-10,y); ctx.stroke();
      }
      ctx.restore();

      // body
      drawBodySilhouette(ctx, w, h);

      // points
      const t = tick * 0.22;
      pts.forEach((p, idx)=>{
        const phase = t + idx*0.55;
        drawGlowPoint(ctx, p.x, p.y, p.name, p.score, phase);
      });

      tick++;
      setTimeout(frame, Math.floor(1000/FPS)); // ✅ 優化：節流
    }

    frame();

    return ()=>{ running = false; };
  }

  window.VHDSHeatmap = {
    start(canvasId, items){
      try{
        // stop previous if any
        if(window.__vhds_heat_stop) window.__vhds_heat_stop();
      }catch(e){}
      window.__vhds_heat_stop = render(canvasId, items||[]);
    }
  };
})();
