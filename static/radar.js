// static/radar.js
(function(){
  const FPS = 12;
  const GLOW_BLUR = 12;
  const LABEL_SIZE = 12;

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

  function render(canvasId, items){
    const canvas = document.getElementById(canvasId);
    if(!canvas) return;
    const ctx = setupCanvas(canvas);

    const w = canvas.clientWidth || 520;
    const h = canvas.clientHeight || 420;
    const cx = w/2, cy = h/2 + 8;
    const R = Math.min(w,h)*0.34;

    // normalize to 10 items
    const arr = (items||[]).slice(0,10);
    while(arr.length<10) arr.push({name:`指標${arr.length+1}`, score:80, desc:""});

    let running = true;
    let tick = 0;

    function draw(){
      if(!running) return;

      ctx.clearRect(0,0,w,h);

      // rings
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 1;
      for(let k=1;k<=4;k++){
        ctx.beginPath();
        ctx.arc(cx, cy, (R/4)*k, 0, Math.PI*2);
        ctx.stroke();
      }
      ctx.restore();

      // axes
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.16)";
      for(let i=0;i<10;i++){
        const a = (Math.PI*2/10)*i - Math.PI/2;
        ctx.beginPath();
        ctx.moveTo(cx,cy);
        ctx.lineTo(cx + R*Math.cos(a), cy + R*Math.sin(a));
        ctx.stroke();
      }
      ctx.restore();

      // polygon
      const t = tick*0.22;
      const pulse = 0.65 + 0.35*Math.sin(t);

      const pts = arr.map((it,i)=>{
        const a = (Math.PI*2/10)*i - Math.PI/2;
        const s = Math.max(0, Math.min(100, Number(it.score||0)));
        const rr = (R * (s/100)) * (0.96 + 0.04*pulse);
        return { x: cx + rr*Math.cos(a), y: cy + rr*Math.sin(a), name: it.name, score:s, a };
      });

      // glow fill
      ctx.save();
      ctx.shadowColor = "rgba(120,220,255,0.55)";
      ctx.shadowBlur = GLOW_BLUR;
      ctx.fillStyle = "rgba(120,220,255,0.12)";
      ctx.strokeStyle = "rgba(120,220,255,0.55)";
      ctx.lineWidth = 2;

      ctx.beginPath();
      pts.forEach((p,idx)=> idx===0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y));
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.stroke();
      ctx.restore();

      // points + labels (name + value)
      ctx.save();
      pts.forEach((p,idx)=>{
        const phase = t + idx*0.55;
        const pp = 0.65 + 0.35*Math.sin(phase);
        const r = 4 + 3*pp;

        ctx.shadowColor = "rgba(120,220,255,0.75)";
        ctx.shadowBlur = GLOW_BLUR;
        ctx.fillStyle = "rgba(120,220,255,0.85)";
        ctx.beginPath();
        ctx.arc(p.x,p.y,r,0,Math.PI*2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.beginPath();
        ctx.arc(p.x,p.y,2.4,0,Math.PI*2);
        ctx.fill();

        // label position
        const lx = cx + (R+18)*Math.cos(p.a);
        const ly = cy + (R+18)*Math.sin(p.a);

        ctx.font = `700 ${LABEL_SIZE}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial`;
        ctx.fillStyle = "rgba(234,240,255,0.92)";
        ctx.textBaseline = "middle";

        const text = `${p.name} ${p.score}`;
        // align left/right
        ctx.textAlign = (Math.cos(p.a) >= 0) ? "left" : "right";
        ctx.fillText(text, lx, ly);
      });
      ctx.restore();

      tick++;
      setTimeout(draw, Math.floor(1000/FPS));
    }

    draw();
    return ()=>{ running=false; };
  }

  window.VHDSRadar = {
    start(canvasId, items){
      try{
        if(window.__vhds_radar_stop) window.__vhds_radar_stop();
      }catch(e){}
      window.__vhds_radar_stop = render(canvasId, items||[]);
    }
  };
})();
