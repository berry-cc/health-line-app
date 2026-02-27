// static/vhds_engine.js
// VHDS V3 引擎：四大模式、10 指標、總結、TOP3、雷達
(function (global) {
  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function seededRand(seed) {
    let x = seed || 123456789;
    return function () {
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      return (x >>> 0) / 4294967295;
    };
  }

  // ✅ 你之後要把「V2.2 的 40 指標（各模式 10 個）」貼到這裡
  // 現在先用穩定 placeholder（不會亂跑，輸入同樣就同樣）
  const METRICS = {
    health: [
      { name: "恢復效率", description: "身體恢復與疲勞累積速度" },
      { name: "循環狀態", description: "血液循環與氧氣供應效率" },
      { name: "代謝節奏", description: "能量消耗與代謝穩定度" },
      { name: "睡眠品質", description: "睡眠深度與恢復效果" },
      { name: "壓力負荷", description: "壓力累積與釋放能力" },
      { name: "體力續航", description: "體力持續與穩定度" },
      { name: "關節靈活", description: "關節活動與靈活程度" },
      { name: "免疫活性", description: "免疫反應與恢復速度" },
      { name: "核心穩定", description: "核心肌群穩定程度" },
      { name: "整體健康", description: "身體整體健康狀態" },
    ],
    skin: [
      { name: "水分平衡", description: "肌膚含水與保濕能力" },
      { name: "彈性程度", description: "肌膚彈性與緊實度" },
      { name: "光澤狀態", description: "肌膚亮度與反光均勻度" },
      { name: "細紋程度", description: "細紋生成與可見度" },
      { name: "膚色均勻", description: "膚色一致與均勻度" },
      { name: "毛孔狀態", description: "毛孔細緻與緊實程度" },
      { name: "修復能力", description: "肌膚修復與再生能力" },
      { name: "老化速度", description: "肌膚老化進程速度" },
      { name: "油水平衡", description: "油脂與水分平衡" },
      { name: "整體膚質", description: "肌膚整體健康品質" },
    ],
    fortune: [
      { name: "氣場強度", description: "整體氣場與能量強度" },
      { name: "決策穩定", description: "決策判斷穩定程度" },
      { name: "機會吸引", description: "吸引機會與資源能力" },
      { name: "人際吸引", description: "吸引他人互動能力" },
      { name: "財運流動", description: "財務流動穩定性" },
      { name: "事業推進", description: "事業推進順暢程度" },
      { name: "運勢穩定", description: "整體運勢穩定性" },
      { name: "風險敏感", description: "對風險察覺能力" },
      { name: "環境適應", description: "適應環境變化能力" },
      { name: "整體運勢", description: "整體運勢強度" },
    ],
    psy: [
      { name: "情緒穩定", description: "情緒波動穩定程度" },
      { name: "專注能力", description: "專注與注意力持續度" },
      { name: "壓力調節", description: "壓力調節能力" },
      { name: "心理彈性", description: "心理恢復能力" },
      { name: "社交能量", description: "社交互動能量" },
      { name: "表達能力", description: "表達與溝通能力" },
      { name: "決策信心", description: "決策信心程度" },
      { name: "心理耐力", description: "心理承受能力" },
      { name: "思維清晰", description: "思維清晰程度" },
      { name: "整體心理", description: "心理整體健康" },
    ],
  };

  function scoreMetrics(mode, seedStr) {
    const base = METRICS[mode] || METRICS.health;
    const rng = seededRand(hashStr(seedStr + ":" + mode));
    return base.map((m) => {
      const score = clamp(Math.round(55 + rng() * 35), 40, 95);
      return { name: m.name, score, description: m.description };
    });
  }

  function avg(arr) {
    if (!arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  function statusLabel(idx) {
    if (idx >= 85) return "卓越狀態";
    if (idx >= 70) return "優化提升期";
    if (idx >= 55) return "可改善區";
    if (idx >= 40) return "警示區";
    return "失衡區";
  }

  function todayState(idx, delta) {
    if (idx >= 80 && delta >= 0) return "高效率日";
    if (idx >= 70) return "恢復良好日";
    if (idx >= 55) return "可提升日";
    if (idx >= 40) return "需恢復日";
    return "需調整日";
  }

  function computeIndex(axes) {
    // axes: [health, skin, fortune, psy]
    const w = [0.35, 0.2, 0.2, 0.25];
    const idx = axes.reduce((s, v, i) => s + v * w[i], 0);
    return clamp(Math.round(idx), 0, 100);
  }

  function computeBioAge(age, idx) {
    const a = Number(age) || 40;
    // idx越高，生理年齡越低
    const delta = (70 - idx) / 4;
    return clamp(Math.round(a + delta), 18, 90);
  }

  function computePotential(idx) {
    // 50~90 範圍內較直覺
    return clamp(Math.round(85 - Math.abs(70 - idx) * 1.2), 35, 85);
  }

  function computeWindowDays(potential) {
    return clamp(Math.round(3 + (potential - 35) / 7), 3, 10);
  }

  function pickPriority(metrics) {
    // 分數最低的一項當作今日優先行動
    const sorted = [...metrics].sort((a, b) => a.score - b.score);
    const m = sorted[0];
    return `優先拉升「${m.name}」：以小動作堆疊改善（睡眠/補水/伸展/走路）`;
  }

  function expectedLiftText(idx, potential) {
    // 給一個可理解的文字
    const lift = clamp(Math.round((potential - 35) / 2), 3, 25);
    return `+${lift}%（7～14天）`;
  }

  function top3Cards(idx) {
    // 先用穩定輸出（你可換成 V2.2 熱區邏輯或取消）
    const base = [
      { rank: 1, icon: "🟧", name: "肩頸緊繃", reason: "久坐與壓力累積", suggestion: "每日伸展 10 分鐘 + 走路 15 分鐘", expectedLiftPct: clamp(Math.round(18 - (idx - 60) * 0.12), 6, 18) },
      { rank: 2, icon: "🟨", name: "腰背疲勞", reason: "核心支撐不足", suggestion: "每小時起身 2 分鐘 + 站立工作", expectedLiftPct: clamp(Math.round(16 - (idx - 60) * 0.10), 5, 16) },
      { rank: 3, icon: "🟩", name: "腸胃負擔", reason: "飲食節奏與油糖偏高", suggestion: "晚餐提早 + 增加蛋白與蔬菜", expectedLiftPct: clamp(Math.round(14 - (idx - 60) * 0.08), 4, 14) },
    ];

    // concernScore 越高越需要注意（反向）
    return base.map((c) => ({
      ...c,
      concernScore: clamp(Math.round(80 - idx * 0.3 + c.rank * 2), 35, 85),
    }));
  }

  function execSummaryText(idx, delta, mode) {
    const s1 = `本次 VHDS 指數為 ${idx}（${statusLabel(idx)}）。`;
    const s2 = delta === 0 ? "本次為首次或與上次持平。" : `較上次變化 ${delta > 0 ? "+" : ""}${delta}。`;
    const s3 = `目前模式：${mode === "health" ? "健康" : mode === "skin" ? "肌膚" : mode === "fortune" ? "面相運勢" : "人際心理"}。`;
    const s4 = "建議：先抓 1 個最弱指標做 7～14 天微改變，最容易累積體感。";
    return [s1, s2, s3, s4].join("\n");
  }

  function analyze(payload) {
    const mode = payload.mode || "health";
    const inputs = payload.inputs || {};
    const photos = payload.photos || [];
    const faceConfidence = Number(payload.faceConfidence || 80);

    const seedStr = JSON.stringify({ mode, inputs, photoCount: photos.length });
    const mh = scoreMetrics("health", seedStr);
    const ms = scoreMetrics("skin", seedStr);
    const mf = scoreMetrics("fortune", seedStr);
    const mp = scoreMetrics("psy", seedStr);

    const axes = [
      avg(mh.map((x) => x.score)),
      avg(ms.map((x) => x.score)),
      avg(mf.map((x) => x.score)),
      avg(mp.map((x) => x.score)),
    ].map((v) => clamp(Math.round(v), 0, 100));

    const idx = computeIndex(axes);
    const prev = typeof payload.prevIndex === "number" ? payload.prevIndex : null;
    const delta = prev == null ? 0 : clamp(idx - prev, -25, 25);

    const metrics = scoreMetrics(mode, seedStr);

    const potential = computePotential(idx);
    const windowDays = computeWindowDays(potential);

    return {
      idx,
      delta,
      label: statusLabel(idx),
      todayState: todayState(idx, delta),
      confidence: clamp(Math.round((faceConfidence * 0.55 + 45)), 60, 95),

      bioAge: computeBioAge(inputs.age, idx),
      potential,
      windowDays,
      priorityAction: pickPriority(metrics),
      expectedLift: expectedLiftText(idx, potential),

      radarAxes: ["健康", "肌膚", "面相運勢", "人際心理"],
      radarVals: axes,

      top3Cards: top3Cards(idx),

      execSummary: execSummaryText(idx, delta, mode),

      metrics,
    };
  }

  global.VHDSEngine = { analyze };
})(window);
