// VHDS V3 - App wiring (true i18n rendering)
(function () {
  const $ = (id) => document.getElementById(id);

  const el = {
    age: $("age"),
    height: $("height"),
    weight: $("weight"),
    waist: $("waist"),
    mode: $("mode"),
    photos: $("photos"),
    preview: $("photoPreview"),
    analyze: $("analyze"),
    reset: $("reset"),
    alert: $("alert"),

    summary: $("summary"),
    vhdsScore: $("vhdsScore"),
    vhdsLabel: $("vhdsLabel"),
    needle: $("needle"),
    trend: $("trend"),
    confidence: $("confidence"),
    todayState: $("todayState"),
    bioAge: $("bioAge"),
    potentialFill: $("potentialFill"),
    potentialPct: $("potentialPct"),
    window: $("window"),
    priorityAction: $("priorityAction"),
    expectedLift: $("expectedLift"),
    top3: $("top3"),
    execSummary: $("execSummary"),
    metrics: $("metrics"),
  };

  let currentResult = null; // 用於語言切換時直接重渲染

  function showAlert(msg) {
    el.alert.textContent = msg;
    el.alert.classList.remove("hidden");
  }
  function hideAlert() {
    el.alert.classList.add("hidden");
    el.alert.textContent = "";
  }

  function readInputs() {
    return {
      age: el.age.value,
      height: el.height.value,
      weight: el.weight.value,
      waist: el.waist.value,
    };
  }

  function hydrateFromState() {
    const s = VHDSState.get();
    el.mode.value = s.mode || "health";
    el.age.value = s.inputs?.age ?? "";
    el.height.value = s.inputs?.height ?? "";
    el.weight.value = s.inputs?.weight ?? "";
    el.waist.value = s.inputs?.waist ?? "";
    renderPreview(s.photos || []);
  }

  async function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handlePhotos(files) {
    const list = [];
    for (const f of files) {
      const dataUrl = await fileToDataUrl(f);
      list.push({ name: f.name, type: f.type, size: f.size, dataUrl });
    }
    const s = VHDSState.get();
    const merged = [...(s.photos || []), ...list].slice(0, 10);
    VHDSState.setPhotos(merged);
    renderPreview(merged);
  }

  function renderPreview(photos) {
    el.preview.innerHTML = "";
    for (const p of photos) {
      const img = document.createElement("img");
      img.className = "thumb";
      img.src = p.dataUrl;
      img.alt = p.name;
      el.preview.appendChild(img);
    }
  }

  function setGauge(idx) {
    el.vhdsScore.textContent = String(idx);
    const deg = -90 + (idx / 100) * 180;
    el.needle.style.transform = `translateX(-50%) rotate(${deg}deg)`;
  }

  function trendText(delta) {
    if (delta > 0) return VHDSLang.t("text.trend.up", { d: delta });
    if (delta < 0) return VHDSLang.t("text.trend.down", { d: delta });
    return VHDSLang.t("text.trend.flat");
  }

  function renderTop3(cards) {
    el.top3.innerHTML = "";
    cards.forEach((c) => {
      const div = document.createElement("div");
      div.className = "topcard";
      div.innerHTML = `
        <div class="badge">${c.rank}</div>
        <div class="icon">${c.icon}</div>
        <div class="topinfo">
          <div class="topname">${VHDSLang.get(c.name)}</div>
          <div class="topscore">${VHDSLang.t("top.score", { n: c.concernScore })}</div>
          <div class="topmeta">${VHDSLang.t("top.reason", { s: VHDSLang.get(c.reason) })}</div>
          <div class="topmeta">${VHDSLang.t("top.suggest", { s: VHDSLang.get(c.suggestion) })}</div>
          <div class="toplift">${VHDSLang.t("top.lift", { n: c.expectedLiftPct })}</div>
        </div>
      `;
      el.top3.appendChild(div);
    });
  }

  function renderMetrics(metrics) {
    el.metrics.innerHTML = "";
    metrics.forEach((m) => {
      const div = document.createElement("div");
      div.className = "metric";
      div.innerHTML = `
        <div class="metricHead">
          <div class="metricName">${VHDSLang.get(m.name)}</div>
          <div class="metricScore">${m.score}</div>
        </div>
        <div class="metricDesc">${VHDSLang.get(m.description)}</div>
      `;
      el.metrics.appendChild(div);
    });
  }

  function translateStatusLabel(labelZh) {
    // 將引擎產生的中文標籤映射成 i18n key（若沒對到就回傳原文）
    const map = {
      "卓越狀態": "label.excellent",
      "優化提升期": "label.optimize",
      "可改善區": "label.improvable",
      "警示區": "label.warning",
      "失衡區": "label.imbalanced",
      "高效率日": "today.high",
      "恢復良好日": "today.recoverGood",
      "可提升日": "today.improve",
      "需恢復日": "today.needRecover",
      "需調整日": "today.adjust",
    };
    const key = map[labelZh];
    return key ? VHDSLang.t(key) : VHDSLang.get(labelZh);
  }

  function renderSummary(result) {
    currentResult = result;
    el.summary.classList.remove("hidden");

    setGauge(result.idx);
    el.vhdsLabel.textContent = translateStatusLabel(result.label);
    el.trend.textContent = trendText(result.delta);
    el.confidence.textContent = VHDSLang.t("text.confidence", { pct: result.confidence });

    el.todayState.textContent = translateStatusLabel(result.todayState);
    el.bioAge.textContent = VHDSLang.get(`${result.bioAge} 歲`);
    // 若想顯示「years」：可改用 t() key 方式

    el.potentialFill.style.width = `${result.potential}%`;
    el.potentialPct.textContent = `${result.potential}%`;
    el.window.textContent = VHDSLang.t("text.windowDays", { days: result.windowDays });

    el.priorityAction.textContent = VHDSLang.get(result.priorityAction);
    el.expectedLift.textContent = VHDSLang.t("text.expectedLift", { lift: result.expectedLift });

    renderTop3(result.top3Cards);
    VHDSRadar.renderRadar("radar", result.radarAxes.map(VHDSLang.get), result.radarVals);

    // Executive Summary：逐行做 get() 轉換（如果字典有對應就會翻）
    const execLines = String(result.execSummary || "")
      .split("\n")
      .map((line) => VHDSLang.get(line))
      .join("\n");
    el.execSummary.textContent = execLines;

    renderMetrics(result.metrics);
  }

  async function doAnalyze() {
    hideAlert();

    const inputs = readInputs();
    VHDSState.setInputs(inputs);

    const s = VHDSState.get();
    const photos = s.photos || [];
    if (!photos.length) {
      showAlert(VHDSLang.t("alert.needPhoto"));
      return;
    }

    const faceRes = await VHDSFaceValidation.validatePhotos(photos);
    if (!faceRes.ok) {
      if (faceRes.reason === "FACE_DETECTOR_UNAVAILABLE") {
        showAlert(VHDSLang.t("alert.detectorUnavailable"));
      } else {
        showAlert(VHDSLang.t("alert.photoInvalid"));
      }
      el.summary.classList.add("hidden");
      return;
    }

    const prev = s.lastResult?.idx;
    const result = VHDSEngine.analyze({
      mode: s.mode,
      inputs,
      photos,
      faceConfidence: faceRes.confidence,
      prevIndex: typeof prev === "number" ? prev : undefined,
    });

    VHDSState.setLastResult({ idx: result.idx, t: Date.now() });
    renderSummary(result);
    el.summary.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function bindLangButtons() {
    document.querySelectorAll(".glass[data-lang]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".glass[data-lang]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        VHDSState.setLang(btn.dataset.lang);

        // 語言切換後：直接重渲染（不清空、不重算）
        if (currentResult) renderSummary(currentResult);
      });
    });

    const s = VHDSState.get();
    const active = document.querySelector(`.glass[data-lang="${s.lang || "zh"}"]`);
    if (active) active.classList.add("active");
  }

  function bind() {
    el.mode.addEventListener("change", () => {
      VHDSState.setMode(el.mode.value);
    });

    ["age", "height", "weight", "waist"].forEach((k) => {
      el[k].addEventListener("input", () => {
        VHDSState.setInputs(readInputs());
      });
    });

    el.photos.addEventListener("change", async (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length) await handlePhotos(files);
      el.photos.value = "";
    });

    el.analyze.addEventListener("click", doAnalyze);

    el.reset.addEventListener("click", () => {
      VHDSState.resetAll();
      hydrateFromState();
      currentResult = null;
      el.summary.classList.add("hidden");
      hideAlert();
    });

    bindLangButtons();
  }

  document.addEventListener("DOMContentLoaded", () => {
    hydrateFromState();
    bind();
  });
})();
