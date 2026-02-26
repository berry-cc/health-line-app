function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function scoreToColor(score) {
  const s = clamp(score, 0, 100);

  // 藍 → 綠 → 黃 → 紅（高級醫療風格）
  const hue =
    s < 50
      ? 200 - (s * 2)
      : 100 - ((s - 50) * 2);

  return `hsl(${hue}, 85%, 55%)`;
}

function applyHeatmap(scores) {

  const zones = [
    "z_head",
    "z_face",
    "z_chest",
    "z_upper_abd",
    "z_lower_abd",
    "z_pelvis",
    "z_arm_l",
    "z_arm_r",
    "z_leg_l",
    "z_leg_r"
  ];

  zones.forEach(id => {

    const el = document.getElementById(id);

    if (!el) return;

    const score = scores[id] ?? 50;

    el.setAttribute("fill", scoreToColor(score));
    el.setAttribute("data-score", score);

  });

}

document.addEventListener("DOMContentLoaded", function(){

  if(typeof HEAT_SCORES !== "undefined"){

    applyHeatmap(HEAT_SCORES);

  }

});
