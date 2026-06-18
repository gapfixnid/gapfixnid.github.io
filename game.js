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
    startLoad: document.getElementById("startLoadButton")
  };

  let state = freshState();
  let toastTimer = null;

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
      state.stats[key] = Math.max(0, Math.min(9, state.stats[key]));
    }
  }

  function render() {
    clampStats();

    // Update stats UI
    els.statFaith.textContent = state.stats.faith || 0;
    els.statDoubt.textContent = state.stats.doubt || 0;
    els.statWound.textContent = state.stats.wound || 0;
    els.statMemory.textContent = state.stats.memory || 0;

    // Update clues UI
    if (state.clues.length > 0) {
      els.cluesList.textContent = state.clues.map((c) => data.clueNames[c] || c).join(", ");
      els.cluesList.style.color = "var(--gold)";
    } else {
      els.cluesList.textContent = "없음";
      els.cluesList.style.color = "var(--faint)";
    }

    const event = data.events[state.eventId];
    if (!event) {
      state.eventId = data.start;
      return render();
    }

    els.chapter.textContent = event.chapter;
    els.location.textContent = event.location;
    els.title.textContent = event.title;
    els.story.innerHTML = event.text.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
    renderChoices(event);
  }

  function renderChoices(event) {
    els.choices.innerHTML = "";
    for (const choice of event.choices) {
      const button = document.createElement("button");
      button.className = "choice";
      button.type = "button";
      button.textContent = choice.label;

      const missing = getMissing(choice.requires);
      if (missing.length) {
        button.disabled = true;
        const small = document.createElement("small");
        small.textContent = `필요: ${missing.join(", ")}`;
        button.appendChild(small);
      }

      button.addEventListener("click", () => choose(choice));
      els.choices.appendChild(button);
    }
  }

  function choose(choice) {
    if (choice.action === "restart") {
      state = freshState();
      save();
      showToast("처음으로 돌아왔습니다.");
      render();
      return;
    }

    applyEffects(choice.effects);
    state.eventId = resolveNext(choice);

    if (choice.label !== "다음") {
      save();
      showToast("자동 저장되었습니다.", 1000);
    }

    render();
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
  }

  function load() {
    const raw = localStorage.getItem(STORAGE_KEY);
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
    localStorage.removeItem(STORAGE_KEY);
    showToast("저장된 진행을 지웠습니다.");
    initStartScreen();
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

  els.load.addEventListener("click", () => {
    const proceed = confirm("마지막 저장 지점(최근 분기 선택지)으로 되돌아가시겠습니까?");
    if (proceed) load();
  });

  els.reset.addEventListener("click", () => {
    const proceed = confirm("현재까지의 진행 상황과 저장 데이터가 모두 삭제됩니다. 정말 처음부터 다시 시작하시겠습니까?");
    if (proceed) reset();
  });

  els.startGame.addEventListener("click", () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const proceed = confirm("이미 기존 저장 데이터가 존재합니다. 새로 시작하면 기존 데이터는 삭제됩니다. 정말 새로 시작하시겠습니까?");
      if (!proceed) return;
    }
    state = freshState();
    save();
    els.startScreen.style.display = "none";
    els.storyPanel.style.display = "flex";
    render();
  });

  els.startLoad.addEventListener("click", () => {
    if (load()) {
      els.startScreen.style.display = "none";
      els.storyPanel.style.display = "flex";
    }
  });

  initStartScreen();
})();
