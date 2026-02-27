// static/state_manager.js
(function (global) {
  const KEY = "vhds_v3_state";

  const DEFAULT = {
    lang: "zh",
    mode: "health",
    inputs: { age: "", height: "", weight: "", waist: "" },
    photos: [], // [{name,type,size,dataUrl}]
    lastResult: null, // { idx:number, t:number }
  };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return structuredClone(DEFAULT);
      const parsed = JSON.parse(raw);
      return {
        ...structuredClone(DEFAULT),
        ...parsed,
        inputs: { ...structuredClone(DEFAULT.inputs), ...(parsed.inputs || {}) },
        photos: Array.isArray(parsed.photos) ? parsed.photos : [],
      };
    } catch {
      return structuredClone(DEFAULT);
    }
  }

  function save(state) {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  const store = load();

  const VHDSState = {
    get() {
      return store;
    },

    setLang(lang) {
      store.lang = lang || "zh";
      save(store);
    },

    setMode(mode) {
      store.mode = mode || "health";
      save(store);
    },

    setInputs(inputs) {
      store.inputs = { ...store.inputs, ...(inputs || {}) };
      save(store);
    },

    setPhotos(photos) {
      store.photos = Array.isArray(photos) ? photos : [];
      save(store);
    },

    setLastResult(lastResult) {
      store.lastResult = lastResult || null;
      save(store);
    },

    resetAll() {
      const fresh = structuredClone(DEFAULT);
      Object.keys(store).forEach((k) => delete store[k]);
      Object.assign(store, fresh);
      save(store);
    },
  };

  global.VHDSState = VHDSState;
})(window);
