(() => {
  "use strict";

  // ---- Presets: researched top 5 most-cited Pomodoro interval variants ----
  // 1. Classic: Francesco Cirillo's original Pomodoro Technique (1980s/2006 book).
  // 2. 52/17: widely cited DeskTime 2014 analysis of its most-productive users.
  // 3. 50/10: common "deep work" / writing variant built on the classic ratio.
  // 4. 90/20: ultradian-rhythm-based deep work block, popular in productivity writing.
  // 5. 15/5: low-friction "starter" ratio recommended for ADHD / building the habit.
  const PRESETS = [
    {
      id: "classic",
      name: "The Classic Rite",
      work: 25, short: 5, long: 15, cycles: 4,
      source: "Cirillo's original Pomodoro Technique",
    },
    {
      id: "golden",
      name: "The Golden Ratio",
      work: 52, short: 17, long: 17, cycles: 4,
      source: "DeskTime 2014 top-performer study",
    },
    {
      id: "scribe",
      name: "The Scribe's Hour",
      work: 50, short: 10, long: 20, cycles: 4,
      source: "popular deep-work / writing variant",
    },
    {
      id: "vigil",
      name: "The Ultradian Vigil",
      work: 90, short: 20, long: 20, cycles: 2,
      source: "ultradian-rhythm deep work blocks",
    },
    {
      id: "novice",
      name: "The Novice's Trial",
      work: 15, short: 5, long: 10, cycles: 4,
      source: "low-friction starter ratio",
    },
    {
      id: "custom",
      name: "Forge Your Own",
      custom: true,
      source: "your own ratio",
    },
  ];

  const PHASE_LABELS = {
    work: "The Grind",
    short: "Respite",
    long: "The Long Night",
  };

  const $ = (id) => document.getElementById(id);
  const els = {
    app: document.querySelector(".app"),
    phaseLabel: $("phaseLabel"),
    timeLeft: $("timeLeft"),
    cycleLabel: $("cycleLabel"),
    ring: $("ringProgress"),
    btnStart: $("btnStart"),
    btnPause: $("btnPause"),
    btnReset: $("btnReset"),
    btnSkip: $("btnSkip"),
    tally: $("tallyCount"),
    presetGrid: $("presetGrid"),
    customPanel: $("customPanel"),
    customWork: $("customWork"),
    customShort: $("customShort"),
    customLong: $("customLong"),
    customCycles: $("customCycles"),
    customApply: $("customApply"),
    toggleSound: $("toggleSound"),
    toggleWakeLock: $("toggleWakeLock"),
    btnInstall: $("btnInstall"),
  };

  const RING_CIRC = 2 * Math.PI * 142;

  const STORAGE_KEY = "potd_state_v1";
  function loadStorage() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch { return {}; }
  }
  function saveStorage(patch) {
    const cur = loadStorage();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...cur, ...patch }));
  }

  const state = {
    presetId: "classic",
    work: 25, short: 5, long: 15, cycles: 4,
    phase: "work",
    cycleIndex: 1,
    secondsLeft: 25 * 60,
    totalSeconds: 25 * 60,
    running: false,
    endTime: null,
    tally: 0,
    soundOn: true,
    wakeLockOn: true,
  };

  let tickHandle = null;
  let wakeLockRef = null;
  let audioCtx = null;

  function applyPreset(preset, custom) {
    state.presetId = preset.id;
    if (preset.custom) {
      state.work = custom.work;
      state.short = custom.short;
      state.long = custom.long;
      state.cycles = custom.cycles;
    } else {
      state.work = preset.work;
      state.short = preset.short;
      state.long = preset.long;
      state.cycles = preset.cycles;
    }
    resetCycle();
    saveStorage({
      presetId: state.presetId,
      custom: preset.custom ? custom : loadStorage().custom,
      work: state.work, short: state.short, long: state.long, cycles: state.cycles,
    });
    renderPresets();
  }

  function resetCycle() {
    stopTicking();
    state.phase = "work";
    state.cycleIndex = 1;
    state.running = false;
    setPhaseSeconds();
    render();
  }

  function setPhaseSeconds() {
    const mins = state.phase === "work" ? state.work : state.phase === "short" ? state.short : state.long;
    state.secondsLeft = mins * 60;
    state.totalSeconds = mins * 60;
  }

  function renderPresets() {
    els.presetGrid.innerHTML = "";
    PRESETS.forEach((p) => {
      const btn = document.createElement("button");
      btn.className = "preset-card" + (p.id === state.presetId ? " active" : "");
      btn.innerHTML = p.custom
        ? `<span class="name">${p.name}</span><span class="ratio">custom minutes</span><span class="source">${p.source}</span>`
        : `<span class="name">${p.name}</span><span class="ratio">${p.work} / ${p.short} min</span><span class="source">${p.source}</span>`;
      btn.addEventListener("click", () => {
        if (p.custom) {
          els.customPanel.hidden = false;
          els.customPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
          markActivePreset("custom");
        } else {
          els.customPanel.hidden = true;
          applyPreset(p);
        }
      });
      els.presetGrid.appendChild(btn);
    });
  }

  function markActivePreset(id) {
    state.presetId = id;
    [...els.presetGrid.children].forEach((c, i) => c.classList.toggle("active", PRESETS[i].id === id));
  }

  function fmtTime(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = Math.floor(sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function render() {
    els.app.dataset.phase = state.phase;
    els.phaseLabel.textContent = PHASE_LABELS[state.phase];
    els.timeLeft.textContent = fmtTime(state.secondsLeft);
    els.cycleLabel.textContent = state.phase === "work"
      ? `Trial ${state.cycleIndex} of ${state.cycles}`
      : state.phase === "long" ? "The long night falls" : "Catch your breath";
    const frac = state.totalSeconds > 0 ? state.secondsLeft / state.totalSeconds : 0;
    els.ring.style.strokeDashoffset = String(RING_CIRC * (1 - frac));
    els.app.dataset.urgent = (state.running && state.secondsLeft <= 10 && state.secondsLeft > 0) ? "1" : "0";
    els.tally.textContent = state.tally;
    els.btnStart.hidden = state.running;
    els.btnPause.hidden = !state.running;
  }

  function stopTicking() {
    if (tickHandle) { clearInterval(tickHandle); tickHandle = null; }
  }

  function tick() {
    const remainingMs = state.endTime - Date.now();
    state.secondsLeft = Math.max(0, Math.round(remainingMs / 1000));
    if (remainingMs <= 0) {
      advancePhase();
    }
    render();
  }

  function start() {
    if (state.running) return;
    state.running = true;
    state.endTime = Date.now() + state.secondsLeft * 1000;
    stopTicking();
    tickHandle = setInterval(tick, 250);
    requestWakeLock();
    render();
  }

  function pause() {
    state.running = false;
    stopTicking();
    releaseWakeLock();
    render();
  }

  function reset() {
    resetCycle();
    releaseWakeLock();
  }

  function skip() {
    advancePhase(true);
  }

  function advancePhase(manualSkip) {
    playBell();
    if (navigator.vibrate) navigator.vibrate(state.phase === "work" ? [120, 60, 120] : 80);

    if (state.phase === "work") {
      state.tally += 1;
      saveStorage({ tally: state.tally });
      if (state.cycleIndex >= state.cycles) {
        state.phase = "long";
      } else {
        state.phase = "short";
      }
    } else if (state.phase === "short") {
      state.cycleIndex += 1;
      state.phase = "work";
    } else {
      state.cycleIndex = 1;
      state.phase = "work";
    }

    setPhaseSeconds();

    if (state.running && !manualSkip) {
      state.endTime = Date.now() + state.secondsLeft * 1000;
    } else if (manualSkip && state.running) {
      state.endTime = Date.now() + state.secondsLeft * 1000;
    } else {
      stopTicking();
      state.running = false;
    }
    render();
  }

  function playBell() {
    if (!state.soundOn) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const now = audioCtx.currentTime;
      [220, 164.81].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + i * 0.18);
        gain.gain.linearRampToValueAtTime(0.35, now + i * 0.18 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.18 + 1.6);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(now + i * 0.18);
        osc.stop(now + i * 0.18 + 1.7);
      });
    } catch { /* audio unavailable; stay silent */ }
  }

  async function requestWakeLock() {
    if (!state.wakeLockOn || !("wakeLock" in navigator)) return;
    try {
      wakeLockRef = await navigator.wakeLock.request("screen");
    } catch { /* wake lock refused; app still works */ }
  }

  function releaseWakeLock() {
    if (wakeLockRef) { wakeLockRef.release().catch(() => {}); wakeLockRef = null; }
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && state.running) requestWakeLock();
  });

  function initControls() {
    els.btnStart.addEventListener("click", start);
    els.btnPause.addEventListener("click", pause);
    els.btnReset.addEventListener("click", reset);
    els.btnSkip.addEventListener("click", skip);

    els.toggleSound.addEventListener("change", (e) => {
      state.soundOn = e.target.checked;
      saveStorage({ soundOn: state.soundOn });
    });
    els.toggleWakeLock.addEventListener("change", (e) => {
      state.wakeLockOn = e.target.checked;
      saveStorage({ wakeLockOn: state.wakeLockOn });
      if (!state.wakeLockOn) releaseWakeLock();
      else if (state.running) requestWakeLock();
    });

    els.customApply.addEventListener("click", () => {
      const custom = {
        work: clampNum(els.customWork.value, 1, 180, 25),
        short: clampNum(els.customShort.value, 1, 60, 5),
        long: clampNum(els.customLong.value, 1, 90, 15),
        cycles: clampNum(els.customCycles.value, 1, 12, 4),
      };
      applyPreset(PRESETS.find((p) => p.custom), custom);
    });
  }

  function clampNum(v, min, max, fallback) {
    const n = parseInt(v, 10);
    if (Number.isNaN(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  function initInstallPrompt() {
    let deferredPrompt = null;
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      els.btnInstall.hidden = false;
    });
    els.btnInstall.addEventListener("click", async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      els.btnInstall.hidden = true;
    });
    window.addEventListener("appinstalled", () => { els.btnInstall.hidden = true; });
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js").catch(() => {});
      });
    }
  }

  function restoreFromStorage() {
    const saved = loadStorage();
    if (saved.soundOn !== undefined) { state.soundOn = saved.soundOn; els.toggleSound.checked = saved.soundOn; }
    if (saved.wakeLockOn !== undefined) { state.wakeLockOn = saved.wakeLockOn; els.toggleWakeLock.checked = saved.wakeLockOn; }
    if (saved.tally !== undefined) state.tally = saved.tally;

    const presetId = saved.presetId || "classic";
    const preset = PRESETS.find((p) => p.id === presetId) || PRESETS[0];
    if (preset.custom) {
      const custom = saved.custom || { work: 25, short: 5, long: 15, cycles: 4 };
      els.customWork.value = custom.work;
      els.customShort.value = custom.short;
      els.customLong.value = custom.long;
      els.customCycles.value = custom.cycles;
      els.customPanel.hidden = false;
      applyPreset(preset, custom);
    } else {
      applyPreset(preset);
    }
  }

  function init() {
    renderPresets();
    initControls();
    initInstallPrompt();
    registerServiceWorker();
    restoreFromStorage();
    render();
  }

  init();
})();
