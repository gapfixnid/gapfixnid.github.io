(function () {
  const STORAGE_KEY = "unnamed-act1-save";
  const data = window.UNNAMED_STORY;

  const els = {
    chapter: document.getElementById("chapterLabel"),
    location: document.getElementById("locationText"),
    title: document.getElementById("eventTitle"),
    story: document.getElementById("storyText"),
    choices: document.getElementById("choices"),
    load: document.getElementById("loadButton"),
    reset: document.getElementById("resetButton"),
    toast: document.getElementById("toast"),
    statFaith: document.getElementById("stat-faith"),
    statDoubt: document.getElementById("stat-doubt"),
    statWound: document.getElementById("stat-wound"),
    statMemory: document.getElementById("stat-memory"),
    cluesBar: document.getElementById("cluesBar"),
    cluesList: document.getElementById("cluesList"),
    startScreen: document.getElementById("startScreen"),
    storyPanel: document.getElementById("storyPanel"),
    startGame: document.getElementById("startGameButton"),
    startLoad: document.getElementById("startLoadButton"),
    dialog: document.getElementById("confirmDialog"),
    dialogTitle: document.getElementById("confirmTitle"),
    dialogMessage: document.getElementById("confirmMessage"),
    dialogCancel: document.getElementById("confirmCancel"),
    dialogOk: document.getElementById("confirmOk"),
    
    // New game elements
    soundToggle: document.getElementById("soundToggle"),
    soundIcon: document.getElementById("soundIcon"),
    logOpen: document.getElementById("logOpenButton"),
    logClose: document.getElementById("logClose"),
    logModal: document.getElementById("logModal"),
    logContent: document.getElementById("logContent")
  };

  // State Management
  let state = freshState();
  let toastTimer = null;
  let pendingDialog = null;
  let historyLog = [];

  // Typewriter Variables
  let typingActive = false;
  let typingTimeout = null;
  let currentLines = [];
  let currentLineIndex = 0;
  let currentCharIndex = 0;
  let currentParaElement = null;

  // Web Audio API Engine
  const AudioEngine = {
    ctx: null,
    enabled: true,
    noiseBuffer: null,
    init() {
      if (this.ctx) return;
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Generate a 1-second white noise buffer for mechanical click synthesis
        const sampleRate = this.ctx.sampleRate;
        this.noiseBuffer = this.ctx.createBuffer(1, sampleRate, sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < sampleRate; i++) {
          data[i] = Math.random() * 2 - 1;
        }
      } catch (e) {
        console.warn("Web Audio API not supported", e);
      }
    },
    toggle() {
      this.enabled = !this.enabled;
      if (this.enabled) {
        this.init();
        if (this.ctx && this.ctx.state === "suspended") {
          this.ctx.resume();
        }
      }
      return this.enabled;
    },
    playTyping() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx || !this.noiseBuffer) return;

      const now = this.ctx.currentTime;
      const out = this.ctx.destination;

      // 타자기 키의 마른 금속성 타격
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const band = this.ctx.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.setValueAtTime(2600 + Math.random() * 900, now);
      band.Q.setValueAtTime(5.5 + Math.random() * 2, now);

      const clickGain = this.ctx.createGain();
      clickGain.gain.setValueAtTime(0.018 + Math.random() * 0.008, now);
      clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);

      noise.connect(band);
      band.connect(clickGain);
      clickGain.connect(out);

      noise.start(now, Math.random() * 0.8, 0.02);

      // 키가 바닥을 치는 낮은 몸통 공명
      const body = this.ctx.createOscillator();
      const bodyGain = this.ctx.createGain();

      body.type = "triangle";
      body.frequency.setValueAtTime(115 + Math.random() * 35, now);

      bodyGain.gain.setValueAtTime(0.012 + Math.random() * 0.006, now);
      bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

      body.connect(bodyGain);
      bodyGain.connect(out);

      body.start(now);
      body.stop(now + 0.05);
    },
    playClick() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx || !this.noiseBuffer) return;

      const now = this.ctx.currentTime;
      const out = this.ctx.destination;

      // 산뜻하고 마른 나무/키캡 느낌의 UI 클릭
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(170, now + 0.045);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

      osc.connect(gain);
      gain.connect(out);

      osc.start(now);
      osc.stop(now + 0.055);

      // 아주 짧은 표면 마찰음
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const high = this.ctx.createBiquadFilter();
      high.type = "highpass";
      high.frequency.setValueAtTime(1800, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.008, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);

      noise.connect(high);
      high.connect(noiseGain);
      noiseGain.connect(out);

      noise.start(now, Math.random() * 0.8, 0.018);
    },
    playError() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx || !this.noiseBuffer) return;

      const now = this.ctx.currentTime;
      const out = this.ctx.destination;

      // 실패감 있는 낮은 하강음
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(155, now);
      osc.frequency.exponentialRampToValueAtTime(72, now + 0.42);

      gain.gain.setValueAtTime(0.075, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);

      osc.connect(gain);
      gain.connect(out);

      osc.start(now);
      osc.stop(now + 0.5);

      // 둔탁한 충격감
      const thud = this.ctx.createOscillator();
      const thudGain = this.ctx.createGain();

      thud.type = "sine";
      thud.frequency.setValueAtTime(58, now + 0.035);

      thudGain.gain.setValueAtTime(0.06, now + 0.035);
      thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

      thud.connect(thudGain);
      thudGain.connect(out);

      thud.start(now + 0.035);
      thud.stop(now + 0.26);

      // 거슬리지 않는 어두운 노이즈 잔향
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const lowpass = this.ctx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.setValueAtTime(520, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.025, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

      noise.connect(lowpass);
      lowpass.connect(noiseGain);
      noiseGain.connect(out);

      noise.start(now, Math.random() * 0.7, 0.28);
    },
    playSuccess() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx || !this.noiseBuffer) return;

      const now = this.ctx.currentTime;
      const out = this.ctx.destination;

      // 맑고 울림 있는 1도-5도 맑은 Chime 화음
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      const gain2 = this.ctx.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(330, now); // E4
      osc1.frequency.exponentialRampToValueAtTime(396, now + 0.3); // G4

      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(495, now + 0.05); // B4 (완전 5도)

      gain1.gain.setValueAtTime(0.06, now);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      gain2.gain.setValueAtTime(0.04, now + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

      osc1.connect(gain1);
      gain1.connect(out);

      osc2.connect(gain2);
      gain2.connect(out);

      osc1.start(now);
      osc1.stop(now + 0.4);

      osc2.start(now + 0.05);
      osc2.stop(now + 0.5);

      // 부드러운 고주파 Chime Shimmer
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const band = this.ctx.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.setValueAtTime(3000, now);
      band.Q.setValueAtTime(4.0, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.01, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

      noise.connect(band);
      band.connect(noiseGain);
      noiseGain.connect(out);

      noise.start(now, Math.random() * 0.8, 0.15);
    }
  };

  // Virtual Game Over Event
  const GAME_OVER_EVENT = {
    chapter: "종막",
    location: "빛바랜 심연",
    title: "이름 없는 묘비",
    text: [
      "네 육신과 영혼에 누적된 상처가 임계치를 넘어섰다. 날개는 꺾였고, 시야는 서서히 어둠에 잠식당한다.",
      "천계의 찬란했던 광휘도, 너를 괴롭히던 의심의 잔상도 희미해진다. 마침내 차가운 대지 위로 쓰러진 네 시신에는 그 어떤 이름표도 남겨지지 않았다.",
      "너는 그렇게 소리도 흔적도 없이, 역사 속의 무명(無名)으로 잊혀 갔다."
    ],
    choices: [
      {
        label: "처음부터 다시 시작하기 (새로운 운명)",
        action: "restart"
      }
    ]
  };

  function freshState() {
    return {
      eventId: data.start,
      stats: { ...data.stats },
      clues: [],
      flags: []
    };
  }

  function clampStats() {
    for (const key of Object.keys(state.stats)) {
      const maxVal = key === "wound" ? 7 : 9;
      state.stats[key] = Math.max(0, Math.min(maxVal, state.stats[key]));
    }
  }

  function updateStatBars() {
    const keys = ["faith", "doubt", "wound", "memory"];
    keys.forEach((key) => {
      const val = state.stats[key] || 0;
      const textEl = document.getElementById(`stat-${key}`);
      const barInner = document.getElementById(`bar-${key}`);
      
      if (textEl) textEl.textContent = val;
      if (barInner) {
        // Max value: 7 for wound, 9 for others
        const maxVal = key === "wound" ? 7 : 9;
        const pct = Math.min(100, (val / maxVal) * 100);
        barInner.style.width = `${pct}%`;
      }
    });
  }

  function render() {
    clampStats();
    updateStatBars();

    // Check for Game Over (Wound >= 7)
    if (state.stats.wound >= 7 && state.eventId !== "game_over") {
      state.eventId = "game_over";
    }

    // Update clues UI
    if (state.clues.length > 0) {
      els.cluesList.textContent = state.clues.map((c) => data.clueNames[c] || c).join(", ");
      els.cluesList.style.color = "var(--gold)";
    } else {
      els.cluesList.textContent = "없음";
      els.cluesList.style.color = "var(--faint)";
    }

    const event = state.eventId === "game_over" ? GAME_OVER_EVENT : data.events[state.eventId];
    if (!event) {
      state.eventId = data.start;
      return render();
    }

    els.chapter.textContent = event.chapter;
    els.location.textContent = event.location;
    els.title.textContent = event.title;

    // Remove legacy displaying to allow typewriter
    els.choices.innerHTML = "";
    
    // Start typewriter rendering
    typewriteText(event.text, () => {
      renderChoices(event);
    });
  }

  function typewriteText(lines, onComplete) {
    if (typingActive) {
      clearTimeout(typingTimeout);
    }
    
    els.story.innerHTML = "";
    currentLines = lines;
    currentLineIndex = 0;
    currentCharIndex = 0;
    typingActive = true;

    function nextLine() {
      if (currentLineIndex >= currentLines.length) {
        typingActive = false;
        if (onComplete) onComplete();
        return;
      }

      currentParaElement = document.createElement("p");
      currentParaElement.className = "typing";
      els.story.appendChild(currentParaElement);
      currentCharIndex = 0;
      typeChar();
    }

    function typeChar() {
      if (!typingActive) return;

      const fullText = currentLines[currentLineIndex];
      if (currentCharIndex >= fullText.length) {
        currentParaElement.classList.remove("typing");
        currentParaElement.textContent = fullText;
        currentLineIndex++;
        nextLine();
        return;
      }

      const char = fullText[currentCharIndex];
      currentParaElement.textContent += char;

      if (!/\s/.test(char)) {
        AudioEngine.playTyping();
      }

      currentCharIndex++;

      const pause =
        /[.!?。！？]/.test(char) ? 180 :
        /[,，、;]/.test(char) ? 90 :
        28 + Math.random() * 38;

      typingTimeout = setTimeout(typeChar, pause);
    }

    nextLine();
  }

  // Story click triggers skip typewriter
  els.story.addEventListener("click", () => {
    if (typingActive) {
      clearTimeout(typingTimeout);
      typingActive = false;
      
      // Instantly render all lines
      els.story.innerHTML = currentLines.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
      
      const event = state.eventId === "game_over" ? GAME_OVER_EVENT : data.events[state.eventId];
      renderChoices(event);
    }
  });

  function renderChoices(event) {
    els.choices.innerHTML = "";
    for (const choice of event.choices) {
      const button = document.createElement("button");
      button.className = "choice";
      button.type = "button";
      
      // Determine label based on check availability
      if (choice.check) {
        const statVal = state.stats[choice.check.stat] || 0;
        const targetDice = Math.max(2, 8 - statVal);
        button.innerHTML = `<span>${choice.label}</span> <small style="color:var(--blue)">🎲 주사위 ${targetDice} 이상</small>`;
      } else {
        button.textContent = choice.label;
      }

      const missing = getMissing(choice.requires);
      if (missing.length) {
        button.disabled = true;
        const small = document.createElement("small");
        small.textContent = `필요: ${missing.join(", ")}`;
        button.appendChild(small);
      }

      button.addEventListener("click", () => {
        AudioEngine.playClick();
        choose(choice);
      });
      els.choices.appendChild(button);
    }
  }

  async function choose(choice) {
    if (choice.action === "restart") {
      state = freshState();
      historyLog = [];
      save();
      showToast("처음으로 돌아왔습니다.");
      render();
      return;
    }

    let checkSuccess = true;
    if (choice.check) {
      const result = await runStatCheck(choice);
      if (result === null) return;
      checkSuccess = result;
    }

    // Record this step to history log before resolving next
    const currentEvent = state.eventId === "game_over" ? GAME_OVER_EVENT : data.events[state.eventId];
    recordHistory(currentEvent, choice.label);

    if (choice.check) {
      // Resolve conditional path for check
      const checkNode = choice.check;
      const targetResult = checkSuccess ? checkNode.success : checkNode.failure;
      
      // Temporarily inject check result text into next event rendering
      applyEffects(targetResult.effects);
      state.eventId = targetResult.next;
    } else {
      applyEffects(choice.effects);
      state.eventId = resolveNext(choice);
    }

    if (choice.label !== "다음") {
      save();
      showToast("자동 저장되었습니다.", 1000);
    }

    render();
  }

  function runStatCheck(choice) {
    return new Promise((resolve) => {
      const check = choice.check;
      const statVal = state.stats[check.stat] || 0;
      const targetDice = Math.max(2, 8 - statVal);
      
      const checkModal = document.getElementById("checkModal");
      const checkDice = document.getElementById("checkDice");
      const checkDetail = document.getElementById("checkDetail");
      const checkResult = document.getElementById("checkResult");
      const checkProceed = document.getElementById("checkProceed");
      const checkCancel = document.getElementById("checkCancel");
      const checkEyebrow = document.getElementById("checkEyebrow");
      const checkTitle = document.getElementById("checkTitle");

      const statNames = { faith: "신앙", doubt: "의심", wound: "상처", memory: "기억" };

      checkEyebrow.textContent = `${statNames[check.stat] || check.stat} 판정`;
      checkTitle.textContent = choice.label;
      checkDetail.innerHTML = `스탯: <b>${statNames[check.stat] || check.stat}</b> (수치: ${statVal})<br>목표: <b>정팔면체 주사위 ${targetDice} 이상</b>`;
      
      checkResult.textContent = "";
      checkResult.className = "check-result-text";
      checkDice.innerHTML = "<span>?</span>";
      checkDice.className = "check-dice roll";
      checkProceed.disabled = false;
      checkCancel.disabled = false;

      checkModal.hidden = false;

      const onCancel = () => {
        checkModal.hidden = true;
        checkCancel.removeEventListener("click", onCancel);
        checkProceed.removeEventListener("click", onProceed);
        resolve(null);
      };

      const onProceed = () => {
        checkProceed.disabled = true;
        checkCancel.disabled = true;
        checkProceed.removeEventListener("click", onProceed);
        checkCancel.removeEventListener("click", onCancel);
        
        let rolls = 0;
        const rollInterval = setInterval(() => {
          checkDice.innerHTML = `<span>${Math.floor(Math.random() * 8) + 1}</span>`;
          rolls++;
          if (rolls > 7) {
            clearInterval(rollInterval);
            
            const rollValue = Math.floor(Math.random() * 8) + 1;
            const isSuccess = rollValue >= targetDice;
            
            checkDice.classList.remove("roll");
            checkDice.innerHTML = `<span>${rollValue}</span>`;

            if (isSuccess) {
              checkDice.classList.add("success");
              checkResult.textContent = `성공! (결과: ${rollValue} >= 목표: ${targetDice})`;
              checkResult.classList.add("success");
              AudioEngine.playSuccess();
            } else {
              checkDice.classList.add("failure");
              checkResult.textContent = `실패 (결과: ${rollValue} < 목표: ${targetDice})`;
              checkResult.classList.add("failure");
              AudioEngine.playError();
            }
            
            setTimeout(() => {
              checkModal.hidden = true;
              resolve(isSuccess);
            }, 1500);
          }
        }, 140);
      };

      checkProceed.addEventListener("click", onProceed);
      checkCancel.addEventListener("click", onCancel);
    });
  }

  function recordHistory(event, chosenLabel) {
    if (historyLog.length > 0 && historyLog[historyLog.length - 1].eventId === state.eventId) {
      return;
    }
    historyLog.push({
      eventId: state.eventId,
      chapter: event.chapter,
      location: event.location,
      title: event.title,
      text: event.text,
      choice: chosenLabel
    });
  }

  function renderHistory() {
    els.logContent.innerHTML = "";
    if (historyLog.length === 0) {
      els.logContent.innerHTML = "<p style='color: var(--faint); text-align: center; margin-top: 30px;'>아직 쓰여진 기록이 없습니다.</p>";
      return;
    }

    historyLog.forEach((item) => {
      const itemEl = document.createElement("div");
      itemEl.className = "log-item";
      
      const meta = document.createElement("div");
      meta.className = "log-meta";
      meta.textContent = `${item.chapter} · ${item.location}`;
      itemEl.appendChild(meta);

      const title = document.createElement("div");
      title.className = "log-title";
      title.textContent = item.title;
      itemEl.appendChild(title);

      const text = document.createElement("div");
      text.className = "log-text";
      text.innerHTML = item.text.map(t => `<p>${escapeHtml(t)}</p>`).join("");
      itemEl.appendChild(text);

      if (item.choice) {
        const choice = document.createElement("div");
        choice.className = "log-choice";
        choice.textContent = `선택지: ${item.choice}`;
        itemEl.appendChild(choice);
      }

      els.logContent.appendChild(itemEl);
    });
  }

  function resolveNext(choice) {
    if (!choice.conditionNext) {
      return choice.next;
    }

    for (const branch of choice.conditionNext) {
      if (!branch.if || matches(branch.if)) {
        return branch.next;
      }
    }

    return choice.next;
  }

  function matches(rule) {
    if (rule.statAtLeast) {
      for (const [key, value] of Object.entries(rule.statAtLeast)) {
        if ((state.stats[key] || 0) < value) return false;
      }
    }

    if (rule.statBelow) {
      for (const [key, value] of Object.entries(rule.statBelow)) {
        if ((state.stats[key] || 0) >= value) return false;
      }
    }

    if (rule.clues) {
      for (const clue of rule.clues) {
        if (!state.clues.includes(clue)) return false;
      }
    }

    if (rule.flags) {
      for (const flag of rule.flags) {
        if (!state.flags.includes(flag)) return false;
      }
    }

    return true;
  }

  function applyEffects(effects) {
    if (!effects) return;

    if (effects.stats) {
      for (const [key, value] of Object.entries(effects.stats)) {
        state.stats[key] = (state.stats[key] || 0) + value;
      }
    }

    for (const clue of effects.clues || []) {
      if (!state.clues.includes(clue)) state.clues.push(clue);
    }

    for (const flag of effects.flags || []) {
      if (!state.flags.includes(flag)) state.flags.push(flag);
    }

    clampStats();
  }

  function getMissing(requires) {
    if (!requires) return [];
    const missing = [];

    for (const clue of requires.clues || []) {
      if (!state.clues.includes(clue)) {
        missing.push(data.clueNames[clue] || clue);
      }
    }

    for (const flag of requires.flags || []) {
      if (!state.flags.includes(flag)) {
        missing.push(data.flagNames[flag] || flag);
      }
    }

    return missing;
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.setItem(STORAGE_KEY + "-history", JSON.stringify(historyLog));
  }

  function load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    const rawHistory = localStorage.getItem(STORAGE_KEY + "-history");
    if (!raw) {
      showToast("저장된 진행이 없습니다.");
      return false;
    }

    try {
      const parsed = JSON.parse(raw);
      state = {
        eventId: parsed.eventId || data.start,
        stats: { ...data.stats, ...(parsed.stats || {}) },
        clues: Array.isArray(parsed.clues) ? parsed.clues : [],
        flags: Array.isArray(parsed.flags) ? parsed.flags : []
      };
      
      if (rawHistory) {
        historyLog = JSON.parse(rawHistory);
      } else {
        historyLog = [];
      }
      
      showToast("진행을 불러왔습니다.");
      render();
      return true;
    } catch {
      showToast("저장 데이터를 읽지 못했습니다.");
      return false;
    }
  }

  function initStartScreen() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      els.startLoad.disabled = false;
      els.startLoad.textContent = "불러오기";
    } else {
      els.startLoad.disabled = true;
      els.startLoad.textContent = "불러올 데이터가 없습니다";
    }
    els.startScreen.style.display = "grid";
    els.storyPanel.style.display = "none";
  }

  function reset() {
    state = freshState();
    historyLog = [];
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY + "-history");
    showToast("저장된 진행을 지웠습니다.");
    initStartScreen();
  }

  function openDialog({ title, message, confirmText = "확인", cancelText = "취소", danger = false }) {
    if (pendingDialog) closeDialog(false);

    els.dialogTitle.textContent = title;
    els.dialogMessage.textContent = message;
    els.dialogOk.textContent = confirmText;
    els.dialogCancel.textContent = cancelText;
    els.dialogOk.classList.toggle("danger", danger);
    els.dialog.hidden = false;

    return new Promise((resolve) => {
      pendingDialog = {
        resolve,
        previousFocus: document.activeElement
      };
      els.dialogCancel.focus();
    });
  }

  function closeDialog(result) {
    if (!pendingDialog) return;
    const { resolve, previousFocus } = pendingDialog;
    pendingDialog = null;
    els.dialog.hidden = true;

    if (previousFocus && typeof previousFocus.focus === "function") {
      previousFocus.focus();
    }

    resolve(result);
  }

  function showToast(message, duration = 1600) {
    clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.classList.add("show");
    toastTimer = setTimeout(() => els.toast.classList.remove("show"), duration);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // Bind new game UI events
  els.soundToggle.addEventListener("click", () => {
    const isEnabled = AudioEngine.toggle();
    els.soundIcon.textContent = isEnabled ? "🔊" : "🔇";
    showToast(isEnabled ? "소리가 켜졌습니다." : "소리가 꺼졌습니다.", 1000);
    AudioEngine.playClick();
  });

  els.logOpen.addEventListener("click", () => {
    AudioEngine.playClick();
    renderHistory();
    els.logModal.hidden = false;
  });

  els.logClose.addEventListener("click", () => {
    AudioEngine.playClick();
    els.logModal.hidden = true;
  });

  els.logModal.addEventListener("click", (e) => {
    if (e.target === els.logModal) {
      AudioEngine.playClick();
      els.logModal.hidden = true;
    }
  });

  els.load.addEventListener("click", async () => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      showToast("저장된 진행이 없습니다.");
      return;
    }

    const proceed = await openDialog({
      title: "저장 지점으로 돌아가기",
      message: "현재 화면의 진행은 마지막 저장 지점으로 되돌아갑니다.",
      confirmText: "불러오기",
      cancelText: "취소"
    });

    if (proceed) load();
  });

  els.reset.addEventListener("click", async () => {
    const proceed = await openDialog({
      title: "처음부터 시작",
      message: "현재까지의 진행 상황과 저장 데이터가 모두 삭제됩니다.",
      confirmText: "삭제",
      cancelText: "취소",
      danger: true
    });

    if (proceed) reset();
  });

  els.startGame.addEventListener("click", async () => {
    // Attempt to start audio engine context on first user click
    AudioEngine.init();
    
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const proceed = await openDialog({
        title: "새 게임 시작",
        message: "이미 기존 저장 데이터가 존재합니다. 새로 시작하면 기존 데이터가 삭제됩니다.",
        confirmText: "새로 시작",
        cancelText: "취소",
        danger: true
      });
      if (!proceed) return;
    }
    state = freshState();
    historyLog = [];
    save();
    els.startScreen.style.display = "none";
    els.storyPanel.style.display = "flex";
    render();
  });

  els.startLoad.addEventListener("click", () => {
    AudioEngine.init();
    if (load()) {
      els.startScreen.style.display = "none";
      els.storyPanel.style.display = "flex";
    }
  });

  els.dialogOk.addEventListener("click", () => closeDialog(true));
  els.dialogCancel.addEventListener("click", () => closeDialog(false));
  els.dialog.addEventListener("click", (event) => {
    if (event.target === els.dialog) closeDialog(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (!els.dialog.hidden) closeDialog(false);
      if (!els.logModal.hidden) els.logModal.hidden = true;
    }
  });

  initStartScreen();
})();
