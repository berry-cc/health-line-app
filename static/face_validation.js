// static/face_validation.js
// 目標：非人像不輸出（偵測不到臉 => ok=false）
(function (global) {
  async function tryFaceApiDetect(imgEl) {
    // 需要你在 /static/models 放 face-api 模型檔
    // 最少：tiny_face_detector_model-weights_manifest.json + .bin
    if (!global.faceapi) return { ok: false, reason: "FACE_DETECTOR_UNAVAILABLE" };

    try {
      // lazy load once
      if (!tryFaceApiDetect._loaded) {
        const base = "/static/models";
        await global.faceapi.nets.tinyFaceDetector.loadFromUri(base);
        tryFaceApiDetect._loaded = true;
      }

      const opt = new global.faceapi.TinyFaceDetectorOptions({
        inputSize: 256,
        scoreThreshold: 0.5,
      });

      const det = await global.faceapi.detectSingleFace(imgEl, opt);
      if (!det) return { ok: false, reason: "NO_FACE" };

      const score = det?.score ?? 0.6;
      return { ok: true, confidence: Math.round(score * 100) };
    } catch {
      return { ok: false, reason: "FACE_DETECTOR_UNAVAILABLE" };
    }
  }

  async function validatePhotos(photos) {
    if (!Array.isArray(photos) || photos.length === 0) {
      return { ok: false, reason: "NO_PHOTO" };
    }

    // 檢查前 2 張即可（效率與穩定）
    const checkCount = Math.min(2, photos.length);
    let best = 0;

    for (let i = 0; i < checkCount; i++) {
      const p = photos[i];
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = p.dataUrl;

      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
      }).catch(() => null);

      const r = await tryFaceApiDetect(img);
      if (r.ok) {
        best = Math.max(best, r.confidence || 70);
      } else if (r.reason === "FACE_DETECTOR_UNAVAILABLE") {
        // 無偵測能力：直接回報不可用（讓 UI 提示放模型）
        return { ok: false, reason: "FACE_DETECTOR_UNAVAILABLE" };
      }
    }

    if (best <= 0) return { ok: false, reason: "NO_FACE" };
    return { ok: true, confidence: best };
  }

  global.VHDSFaceValidation = { validatePhotos };
})(window);
