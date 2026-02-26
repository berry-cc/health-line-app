// VHDS Health 人體熱區圖 — 醫療級發光＋呼吸動畫版本
// Version: Medical Grade Pulse Glow

let vhdsAnimationFrame = null;

function drawHeatmap(data) {

    const canvas = document.getElementById("heatmapCanvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    canvas.width = 320;
    canvas.height = 600;

    let time = 0;

    function animate() {

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 呼吸脈動參數
        const pulse = (Math.sin(time) + 1) / 2;

        drawBody(ctx);

        drawZone(ctx, 160, 90, 30, data.head, pulse);
        drawZone(ctx, 160, 190, 45, data.chest, pulse);
        drawZone(ctx, 160, 300, 45, data.core, pulse);
        drawZone(ctx, 90, 220, 30, data.left_arm, pulse);
        drawZone(ctx, 230, 220, 30, data.right_arm, pulse);
        drawZone(ctx, 140, 440, 35, data.left_leg, pulse);
        drawZone(ctx, 180, 440, 35, data.right_leg, pulse);

        time += 0.05;

        vhdsAnimationFrame = requestAnimationFrame(animate);
    }

    animate();
}


function drawBody(ctx) {

    ctx.save();

    ctx.strokeStyle = "rgba(0,255,255,0.15)";
    ctx.lineWidth = 2;

    // 頭
    ctx.beginPath();
    ctx.arc(160, 90, 35, 0, Math.PI * 2);
    ctx.stroke();

    // 身體
    ctx.beginPath();
    ctx.moveTo(160, 125);
    ctx.lineTo(160, 350);
    ctx.stroke();

    // 手
    ctx.beginPath();
    ctx.moveTo(160, 180);
    ctx.lineTo(90, 250);
    ctx.moveTo(160, 180);
    ctx.lineTo(230, 250);
    ctx.stroke();

    // 腿
    ctx.beginPath();
    ctx.moveTo(160, 350);
    ctx.lineTo(130, 500);
    ctx.moveTo(160, 350);
    ctx.lineTo(190, 500);
    ctx.stroke();

    ctx.restore();
}


function drawZone(ctx, x, y, radius, value, pulse) {

    const intensity = value / 100;

    const glowSize = radius + 20 * intensity + pulse * 8;

    const gradient = ctx.createRadialGradient(
        x, y, radius * 0.2,
        x, y, glowSize
    );

    const alphaCore = 0.6 + intensity * 0.4;
    const alphaGlow = 0.1 + intensity * 0.3;

    gradient.addColorStop(0, `rgba(0,255,255,${alphaCore})`);
    gradient.addColorStop(0.4, `rgba(0,200,255,${alphaGlow})`);
    gradient.addColorStop(1, "rgba(0,255,255,0)");

    ctx.save();

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, glowSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}


// 停止動畫（切換模式時使用）
function stopHeatmap() {

    if (vhdsAnimationFrame) {

        cancelAnimationFrame(vhdsAnimationFrame);

        vhdsAnimationFrame = null;
    }
}
