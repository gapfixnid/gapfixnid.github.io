import { STORY_DATA } from "./story-data.js?v=20260619";

const STORAGE_KEY = "unnamed-full-save";
const LEGACY_STORAGE_KEYS = ["unnamed-act1-save"];
const STAT_MAX = 9;

const data = STORY_DATA;

const els = {
  chapter: document.getElementById("chapterLabel"),
  location: document.getElementById("locationText"),
  title: document.getElementById("eventTitle"),
  story: document.getElementById("storyText"),
  choices: document.getElementById("choices"),
  load: document.getElementById("loadButton"),
  reset: document.getElementById("resetButton"),
  toast: document.getElementById("toast"),
  startScreen: document.getElementById("startScreen"),
  storyPanel: document.getElementById("storyPanel"),
  startGame: document.getElementById("startGameButton"),
  startLoad: document.getElementById("startLoadButton"),
  dialog: document.getElementById("confirmDialog"),
  dialogTitle: document.getElementById("confirmTitle"),
  dialogMessage: document.getElementById("confirmMessage"),
  dialogCancel: document.getElementById("confirmCancel"),
  dialogOk: document.getElementById("confirmOk")
};

let state = freshState();
let toastTimer = null;
let pendingDialog = null;

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
    state.stats[key] = Math.max(0, Math.min(STAT_MAX, state.stats[key]));
  }
}

function showStartScreen() {
  const hasSave = Boolean(findSavedState());
  els.startLoad.disabled = !hasSave;
  els.startLoad.textContent = hasSave ? "불러오기" : "불러올 데이터가 없습니다";
  els.startScreen.hidden = false;
  els.storyPanel.hidden = true;
}

function showStoryPanel() {
  els.startScreen.hidden = true;
  els.storyPanel.hidden = false;
}

function render() {
  clampStats();
  const event = data.events[state.eventId];
  if (!event) {
    state.eventId = data.start;
    return render();
  }

  els.chapter.textContent = event.chapter;
  els.location.textContent = event.location;
  els.title.textContent = event.title;
  els.story.innerHTML = event.text.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
  els.story.scrollTop = 0;
  renderChoices(event);
}

function renderChoices(event) {
  els.choices.innerHTML = "";
  for (const choice of event.choices) {
    const button = document.createElement("button");
    const label = document.createElement("span");
    const missing = getMissing(choice.requires);

    button.className = "choice";
    button.type = "button";
    label.className = "choice-label";
    label.textContent = choice.label;
    button.appendChild(label);

    if (missing.length) {
      const requirement = document.createElement("span");
      button.disabled = true;
      requirement.className = "choice-requirement";
      requirement.textContent = `필요: ${missing.join(", ")}`;
      button.appendChild(requirement);
    }

    button.addEventListener("click", () => choose(choice));
    els.choices.appendChild(button);
  }
}

function choose(choice) {
  if (choice.action === "restart") {
    state = freshState();
    saveState({ silent: true });
    showStoryPanel();
    showToast("처음으로 돌아왔습니다.");
    render();
    return;
  }

  applyEffects(choice.effects);
  state.eventId = resolveNext(choice);

  if (choice.label !== "다음") {
    saveState({ silent: true });
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

function saveState({ silent = false } = {}) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    for (const key of LEGACY_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }
    return true;
  } catch {
    if (!silent) showToast("진행을 저장하지 못했습니다.");
    return false;
  }
}

function findSavedState() {
  const keys = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS];
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return { key, raw };
    } catch {
      return null;
    }
  }
  return null;
}

function clearSavedState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    for (const key of LEGACY_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }
  } catch {
    showToast("저장 데이터를 지우지 못했습니다.");
  }
}

function restoreSavedState(saved, { silent = false } = {}) {
  if (!saved) {
    if (!silent) showToast("저장된 진행이 없습니다.");
    return false;
  }

  try {
    const parsed = JSON.parse(saved.raw);
    state = {
      eventId: data.events[parsed.eventId] ? parsed.eventId : data.start,
      stats: { ...data.stats, ...(parsed.stats || {}) },
      clues: Array.isArray(parsed.clues) ? parsed.clues : [],
      flags: Array.isArray(parsed.flags) ? parsed.flags : []
    };
    clampStats();
    saveState({ silent: true });
    if (!silent) showToast("진행을 불러왔습니다.");
    showStoryPanel();
    render();
    return true;
  } catch {
    clearSavedState();
    if (!silent) showToast("저장 데이터를 읽지 못했습니다.");
    showStartScreen();
    return false;
  }
}

async function requestStartGame() {
  if (findSavedState()) {
    const shouldStart = await openDialog({
      title: "새로 시작",
      message: "기존 저장 데이터가 존재합니다. 새로 시작하면 기존 데이터가 삭제됩니다.",
      confirmText: "새로 시작",
      cancelText: "취소",
      danger: true
    });

    if (!shouldStart) return;
  }

  clearSavedState();
  state = freshState();
  saveState({ silent: true });
  showStoryPanel();
  render();
}

async function requestLoad() {
  const saved = findSavedState();
  if (!saved) {
    showToast("저장된 진행이 없습니다.");
    showStartScreen();
    return;
  }

  const shouldLoad = await openDialog({
    title: "저장 지점으로 돌아가기",
    message: "현재 화면의 진행은 마지막 저장 지점으로 되돌아갑니다.",
    confirmText: "불러오기",
    cancelText: "취소"
  });

  if (shouldLoad) restoreSavedState(saved);
}

async function requestReset() {
  const shouldReset = await openDialog({
    title: "처음부터 시작",
    message: "진행 상황과 저장 데이터가 모두 삭제됩니다.",
    confirmText: "삭제",
    cancelText: "취소",
    danger: true
  });

  if (!shouldReset) return;
  state = freshState();
  clearSavedState();
  showToast("저장된 진행을 지웠습니다.");
  showStartScreen();
}

function openDialog({ title, message, confirmText = "확인", cancelText = "취소", danger = false }) {
  if (pendingDialog) pendingDialog(false);

  els.dialogTitle.textContent = title;
  els.dialogMessage.textContent = message;
  els.dialogOk.textContent = confirmText;
  els.dialogCancel.textContent = cancelText;
  els.dialogOk.classList.toggle("danger", danger);
  els.dialog.hidden = false;
  els.dialogCancel.focus();

  return new Promise((resolve) => {
    pendingDialog = resolve;
  });
}

function closeDialog(result) {
  if (!pendingDialog) return;
  const resolve = pendingDialog;
  pendingDialog = null;
  els.dialog.hidden = true;
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

els.startGame.addEventListener("click", requestStartGame);
els.startLoad.addEventListener("click", () => restoreSavedState(findSavedState()));
els.load.addEventListener("click", requestLoad);
els.reset.addEventListener("click", requestReset);
els.dialogOk.addEventListener("click", () => closeDialog(true));
els.dialogCancel.addEventListener("click", () => closeDialog(false));
els.dialog.addEventListener("click", (event) => {
  if (event.target === els.dialog) closeDialog(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !els.dialog.hidden) closeDialog(false);
});

showStartScreen();
