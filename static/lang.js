// static/lang.js
(function (global) {
  const DICT = {
    zh: {
      "ui.input": "輸入資料",
      "ui.age": "年齡",
      "ui.height": "身高 (cm)",
      "ui.weight": "體重 (kg)",
      "ui.waist": "腰圍 (吋)",
      "ui.mode": "分析模式",
      "ui.upload": "上傳照片（可多張）",
      "ui.hint": "建議：清晰人像、光線充足、臉部占畫面適中。",
      "ui.analyze": "開始分析",
      "ui.reset": "清除（不建議）",

      "ui.summary": "綜合狀態總結",
      "ui.vhdsIndex": "VHDS 指數",
      "ui.todayState": "今日狀態",
      "ui.bioAge": "VHDS 生理年齡",
      "ui.potential": "改善潛力",
      "ui.priorityAction": "今日優先行動",
      "ui.top3": "需關注部位 TOP 3",
      "ui.radar": "狀態輪廓（雷達圖）",
      "ui.exec": "Executive Summary",
      "ui.metrics": "十大指標（名稱 + 分數 + 說明）",

      "mode.health": "健康",
      "mode.skin": "肌膚",
      "mode.fortune": "面相運勢",
      "mode.psy": "人際心理",

      "label.excellent": "卓越狀態",
      "label.optimize": "優化提升期",
      "label.improvable": "可改善區",
      "label.warning": "警示區",
      "label.imbalanced": "失衡區",

      "today.high": "高效率日",
      "today.recoverGood": "恢復良好日",
      "today.improve": "可提升日",
      "today.needRecover": "需恢復日",
      "today.adjust": "需調整日",

      "text.confidence": "分析信心 {pct}%",
      "text.windowDays": "最佳提升期剩餘 {days} 天",
      "text.expectedLift": "預期提升：{lift}",
      "text.trend.up": "↑ +{d}（較上次）",
      "text.trend.down": "↓ {d}（較上次）",
      "text.trend.flat": "—（首次/持平）",

      "alert.needPhoto": "請先上傳至少 1 張清晰人像照片。",
      "alert.photoInvalid": "照片不符合規定：請上傳清晰人像照片（需可偵測到人臉）。",
      "alert.detectorUnavailable": "無法偵測人臉：請使用支援的瀏覽器，或放入 face-api 模型檔（/static/models）。",
    },

    en: {
      "ui.input": "Inputs",
      "ui.age": "Age",
      "ui.height": "Height (cm)",
      "ui.weight": "Weight (kg)",
      "ui.waist": "Waist (inch)",
      "ui.mode": "Mode",
      "ui.upload": "Upload photos (multiple)",
      "ui.hint": "Tip: clear portrait, good light, face at medium size.",
      "ui.analyze": "Analyze",
      "ui.reset": "Clear (not recommended)",

      "ui.summary": "Summary",
      "ui.vhdsIndex": "VHDS Index",
      "ui.todayState": "Today",
      "ui.bioAge": "VHDS Bio Age",
      "ui.potential": "Improvement Potential",
      "ui.priorityAction": "Top Action Today",
      "ui.top3": "Top 3 Areas to Watch",
      "ui.radar": "Profile (Radar)",
      "ui.exec": "Executive Summary",
      "ui.metrics": "Top 10 Metrics (name + score + note)",

      "mode.health": "Health",
      "mode.skin": "Skin",
      "mode.fortune": "Face & Fortune",
      "mode.psy": "Social & Psychology",

      "label.excellent": "Excellent",
      "label.optimize": "Optimization Window",
      "label.improvable": "Improvable",
      "label.warning": "Warning",
      "label.imbalanced": "Imbalanced",

      "today.high": "High-Performance Day",
      "today.recoverGood": "Well-Recovered Day",
      "today.improve": "Improvement Day",
      "today.needRecover": "Recovery Needed",
      "today.adjust": "Needs Adjustment",

      "text.confidence": "Confidence {pct}%",
      "text.windowDays": "Best window: {days} days left",
      "text.expectedLift": "Expected lift: {lift}",
      "text.trend.up": "↑ +{d} (vs last)",
      "text.trend.down": "↓ {d} (vs last)",
      "text.trend.flat": "— (first/flat)",

      "alert.needPhoto": "Please upload at least 1 clear portrait photo.",
      "alert.photoInvalid": "Invalid photo: please upload a clear portrait (a detectable face is required).",
      "alert.detectorUnavailable": "Face detection unavailable: use a supported browser or add face-api models in /static/models.",
    },

    ja: {
      "ui.input": "入力",
      "ui.age": "年齢",
      "ui.height": "身長 (cm)",
      "ui.weight": "体重 (kg)",
      "ui.waist": "ウエスト (インチ)",
      "ui.mode": "分析モード",
      "ui.upload": "写真アップロード（複数可）",
      "ui.hint": "ヒント：明るい場所で、はっきりした顔写真を。",
      "ui.analyze": "分析開始",
      "ui.reset": "クリア（非推奨）",

      "ui.summary": "総合サマリー",
      "ui.vhdsIndex": "VHDS 指数",
      "ui.todayState": "今日の状態",
      "ui.bioAge": "VHDS 生理年齢",
      "ui.potential": "改善ポテンシャル",
      "ui.priorityAction": "今日の優先行動",
      "ui.top3": "注目部位 TOP 3",
      "ui.radar": "プロファイル（レーダー）",
      "ui.exec": "Executive Summary",
      "ui.metrics": "10 指標（名前 + スコア + 説明）",

      "mode.health": "健康",
      "mode.skin": "肌",
      "mode.fortune": "顔相・運勢",
      "mode.psy": "対人・心理",

      "label.excellent": "優秀",
      "label.optimize": "最適化期",
      "label.improvable": "改善可能",
      "label.warning": "注意",
      "label.imbalanced": "不均衡",

      "today.high": "高効率の日",
      "today.recoverGood": "回復良好の日",
      "today.improve": "改善の日",
      "today.needRecover": "回復が必要",
      "today.adjust": "調整が必要",

      "text.confidence": "信頼度 {pct}%",
      "text.windowDays": "最適化期間：残り {days} 日",
      "text.expectedLift": "予測上昇：{lift}",
      "text.trend.up": "↑ +{d}（前回比）",
      "text.trend.down": "↓ {d}（前回比）",
      "text.trend.flat": "—（初回/横ばい）",

      "alert.needPhoto": "顔がはっきり写った写真を1枚以上アップロードしてください。",
      "alert.photoInvalid": "写真が不適切です：顔が検出できる写真をアップロードしてください。",
      "alert.detectorUnavailable": "顔検出が利用できません：/static/models にモデルが必要です。",
    },

    ko: {
      "ui.input": "입력",
      "ui.age": "나이",
      "ui.height": "키 (cm)",
      "ui.weight": "몸무게 (kg)",
      "ui.waist": "허리 (inch)",
      "ui.mode": "분석 모드",
      "ui.upload": "사진 업로드(여러 장)",
      "ui.hint": "팁: 선명한 인물 사진, 충분한 조명, 얼굴 크기 적당.",
      "ui.analyze": "분석 시작",
      "ui.reset": "초기화(비권장)",

      "ui.summary": "종합 요약",
      "ui.vhdsIndex": "VHDS 지수",
      "ui.todayState": "오늘 상태",
      "ui.bioAge": "VHDS 생체 나이",
      "ui.potential": "개선 잠재력",
      "ui.priorityAction": "오늘 최우선 행동",
      "ui.top3": "주의 부위 TOP 3",
      "ui.radar": "프로필(레이더)",
      "ui.exec": "Executive Summary",
      "ui.metrics": "10개 지표(이름 + 점수 + 설명)",

      "mode.health": "건강",
      "mode.skin": "피부",
      "mode.fortune": "관상·운세",
      "mode.psy": "대인·심리",

      "label.excellent": "우수",
      "label.optimize": "최적화 기간",
      "label.improvable": "개선 가능",
      "label.warning": "경고",
      "label.imbalanced": "불균형",

      "today.high": "고효율 day",
      "today.recoverGood": "회복 양호 day",
      "today.improve": "개선 day",
      "today.needRecover": "회복 필요",
      "today.adjust": "조정 필요",

      "text.confidence": "신뢰도 {pct}%",
      "text.windowDays": "최적화 기간: {days}일 남음",
      "text.expectedLift": "예상 상승: {lift}",
      "text.trend.up": "↑ +{d}(이전 대비)",
      "text.trend.down": "↓ {d}(이전 대비)",
      "text.trend.flat": "—(첫/동일)",

      "alert.needPhoto": "선명한 인물 사진을 최소 1장 업로드하세요.",
      "alert.photoInvalid": "사진이 부적절합니다: 얼굴이 감지되는 인물 사진이 필요합니다.",
      "alert.detectorUnavailable": "얼굴 감지를 사용할 수 없습니다: /static/models 에 모델이 필요합니다.",
    },
  };

  function safeGetStateLang() {
    try {
      return global.VHDSState?.get?.().lang || "zh";
    } catch {
      return "zh";
    }
  }

  function fmt(template, vars = {}) {
    return String(template).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
  }

  function t(key, vars) {
    const lang = safeGetStateLang();
    const table = DICT[lang] || DICT.zh;
    const base = DICT.zh;
    const raw = table[key] ?? base[key] ?? key;
    return fmt(raw, vars);
  }

  global.VHDSLang = { t, _DICT: DICT };
})(window);
