const timerPanel = document.querySelector(".timer-panel");
const timerEl = document.getElementById("timer");
const timerDisplayBtn = document.getElementById("timerDisplayBtn");
const timeEditor = document.getElementById("timeEditor");
const hoursInput = document.getElementById("hoursInput");
const minutesInput = document.getElementById("minutesInput");
const secondsInput = document.getElementById("secondsInput");
const saveTimeBtn = document.getElementById("saveTimeBtn");
const cancelTimeBtn = document.getElementById("cancelTimeBtn");
const modeLabelEl = document.getElementById("modeLabel");
const modeMiniEl = document.getElementById("modeMini");
const statusTextEl = document.getElementById("statusText");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");
const modeButtons = document.querySelectorAll(".mode-btn");
const progressFill = document.getElementById("progressFill");
const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");
const taskInput = document.getElementById("taskInput");
const addTaskBtn = document.getElementById("addTaskBtn");
const taskList = document.getElementById("taskList");
const taskPendingCountEl = document.getElementById("taskPendingCount");
const playlistInput = document.getElementById("playlistInput");
const updatePlaylistBtn = document.getElementById("updatePlaylistBtn");
const spotifyEmbed = document.getElementById("spotifyEmbed");
const alarmSound = document.getElementById("alarmSound");
const alarmSelect = document.getElementById("alarmSelect");
const previewSoundBtn = document.getElementById("previewSoundBtn");
const canvas = document.getElementById("bgCanvas");
const ctx = canvas.getContext("2d", { alpha: true });

const MODE_LABELS = {
  focus: "Focus Session",
  shortBreak: "Short Break",
  longBreak: "Long Break",
};

const MODE_MINI = {
  focus: "Focus",
  shortBreak: "Short Break",
  longBreak: "Long Break",
};

const DEFAULT_SECONDS = {
  focus: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

const DEFAULT_PLAYLIST =
  "https://open.spotify.com/embed/playlist/1u4F50HA53L3Jwxbnk9IeO?utm_source=generator&theme=0";

const DEFAULT_ALARM = "fahh";

const state = {
  currentMode: "focus",
  durations: { ...DEFAULT_SECONDS },
  remainingSeconds: DEFAULT_SECONDS.focus,
  totalSeconds: DEFAULT_SECONDS.focus,
  isRunning: false,
  intervalId: null,
  resetTimeoutId: null,
  theme: "dark",
  status: "ready",
  tasks: [],
  alarm: DEFAULT_ALARM,
};

const meshState = {
  points: [],
  cols: 0,
  rows: 0,
  spacing: 96,
  moveAmount: 10,
  speed: 0.0012,
  dotRadius: 1.55,
  lastFrameTime: 0,
  frameInterval: 1000 / 30,
  pixelRatio: 1,
};

function formatTime(totalSeconds) {
  const safe = Math.max(0, totalSeconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatField(value) {
  return String(value).padStart(2, "0");
}

function sanitizeFieldValue(raw, max) {
  const digitsOnly = raw.replace(/\D/g, "").slice(0, 2);
  if (digitsOnly === "") {
    return "";
  }

  return String(Math.min(max, Number(digitsOnly)));
}

function getInputNumber(input, max) {
  const cleaned = sanitizeFieldValue(input.value, max);
  return cleaned === "" ? 0 : Math.min(max, Number(cleaned));
}

function secondsFromInputs() {
  const hours = getInputNumber(hoursInput, 999);
  const minutes = getInputNumber(minutesInput, 59);
  const seconds = getInputNumber(secondsInput, 59);
  return hours * 3600 + minutes * 60 + seconds;
}

function fillInputsFromSeconds(totalSeconds) {
  const safe = Math.max(0, totalSeconds);
  hoursInput.value = formatField(Math.floor(safe / 3600));
  minutesInput.value = formatField(Math.floor((safe % 3600) / 60));
  secondsInput.value = formatField(safe % 60);
}

function normalizeTimeInput(input, max) {
  input.value = sanitizeFieldValue(input.value, max);
}

function finalizeTimeInput(input, max) {
  const normalized = sanitizeFieldValue(input.value, max);
  input.value = normalized === "" ? "00" : formatField(Number(normalized));
}

function getThemeIconMarkup(theme) {
  if (theme === "light") {
    return [
      "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\">",
      "<path d=\"M12 4.5v2.2\" />",
      "<path d=\"M12 17.3v2.2\" />",
      "<path d=\"M4.5 12h2.2\" />",
      "<path d=\"M17.3 12h2.2\" />",
      "<path d=\"M6.7 6.7l1.6 1.6\" />",
      "<path d=\"M15.7 15.7l1.6 1.6\" />",
      "<path d=\"M17.3 6.7l-1.6 1.6\" />",
      "<path d=\"M8.3 15.7l-1.6 1.6\" />",
      "<circle cx=\"12\" cy=\"12\" r=\"4.1\" />",
      "</svg>",
    ].join("");
  }

  return [
    "<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\">",
    "<path d=\"M18.5 14.8A7 7 0 0 1 9.2 5.5a7.5 7.5 0 1 0 9.3 9.3Z\" />",
    "</svg>",
  ].join("");
}

function applyTheme(theme) {
  document.body.classList.toggle("light-theme", theme === "light");
  themeIcon.innerHTML = getThemeIconMarkup(theme);

  const themeValue = theme === "light" ? "1" : "0";
  const source = spotifyEmbed.src || DEFAULT_PLAYLIST;

  if (source.includes("theme=")) {
    spotifyEmbed.src = source.replace(/theme=\d/, `theme=${themeValue}`);
  } else {
    const separator = source.includes("?") ? "&" : "?";
    spotifyEmbed.src = `${source}${separator}theme=${themeValue}`;
  }
}

function playTone({
  type = "sine",
  startFreq = 440,
  endFreq = 440,
  duration = 0.1,
  volume = 0.028,
} = {}) {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, audioCtx.currentTime + duration);

    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(volume, audioCtx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (error) {}
}

function playClickSound() {
  playTone({ type: "triangle", startFreq: 520, endFreq: 320, duration: 0.055, volume: 0.018 });
}

function playStartSound() {
  playTone({ type: "sine", startFreq: 410, endFreq: 670, duration: 0.13, volume: 0.026 });
}

function playSynthAlarm(type) {
  if (type === "none") {
    return;
  }

  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const patterns = {
      chime: {
        notes: [520, 659, 784],
        tone: "sine",
        spacing: 0.16,
        duration: 0.24,
        peak: 0.045,
      },
      bell: {
        notes: [659, 880, 988],
        tone: "triangle",
        spacing: 0.16,
        duration: 0.24,
        peak: 0.05,
      },
      alarmPulse: {
        notes: [740, 740, 660, 740],
        tone: "square",
        spacing: 0.12,
        duration: 0.18,
        peak: 0.04,
      },
      digital: {
        notes: [880, 1174, 880, 1174],
        tone: "square",
        spacing: 0.1,
        duration: 0.12,
        peak: 0.03,
      },
      beacon: {
        notes: [392, 523, 698, 932],
        tone: "triangle",
        spacing: 0.15,
        duration: 0.22,
        peak: 0.046,
      },
      goofy: {
        notes: [330, 262, 392, 294],
        tone: "triangle",
        spacing: 0.11,
        duration: 0.16,
        peak: 0.04,
      },
      dramatic: {
        notes: [220, 220, 165, 131],
        tone: "sawtooth",
        spacing: 0.18,
        duration: 0.28,
        peak: 0.035,
      },
      arcade: {
        notes: [523, 659, 784, 1046],
        tone: "square",
        spacing: 0.09,
        duration: 0.14,
        peak: 0.032,
      },
    };
    const pattern = patterns[type] || patterns.chime;

    pattern.notes.forEach((freq, index) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const start = audioCtx.currentTime + index * pattern.spacing;

      osc.type = pattern.tone;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(pattern.peak, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + pattern.duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + pattern.duration + 0.02);
    });
  } catch (error) {}
}

function playAlarm(selection = state.alarm) {
  if (selection === "none") {
    return;
  }

  if (selection === "fahh") {
    try {
      alarmSound.currentTime = 0;
      const maybePromise = alarmSound.play();

      if (maybePromise && typeof maybePromise.catch === "function") {
        maybePromise.catch(() => {
          playSynthAlarm("chime");
        });
      }
      return;
    } catch (error) {
      playSynthAlarm("chime");
      return;
    }
  }

  playSynthAlarm(selection);
}

function clearResetTimeout() {
  if (state.resetTimeoutId !== null) {
    clearTimeout(state.resetTimeoutId);
    state.resetTimeoutId = null;
  }
}

function updateActiveModeButton() {
  modeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === state.currentMode);
  });
}

function updateProgress() {
  const percent = state.totalSeconds > 0
    ? state.remainingSeconds / state.totalSeconds
    : 0;
  const clamped = Math.max(0, Math.min(1, percent));
  progressFill.style.transform = `scaleX(${clamped})`;
}

function updateStatusText() {
  statusTextEl.classList.remove("running", "completed");
  timerPanel.classList.remove("running");

  if (state.status === "running") {
    statusTextEl.textContent = "Running";
    statusTextEl.classList.add("running");
    timerPanel.classList.add("running");
    return;
  }

  if (state.status === "paused") {
    statusTextEl.textContent = "Paused";
    return;
  }

  if (state.status === "completed") {
    statusTextEl.textContent = "Completed";
    statusTextEl.classList.add("completed");
    return;
  }

  statusTextEl.textContent = "Ready";
}

function renderTasks() {
  taskList.innerHTML = "";

  if (state.tasks.length === 0) {
    const li = document.createElement("li");
    li.className = "empty-tasks";
    li.textContent = "No tasks yet.";
    taskList.appendChild(li);
  } else {
    state.tasks.forEach((task) => {
      const li = document.createElement("li");
      li.className = `task-item${task.completed ? " completed" : ""}`;

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "task-checkbox";
      checkbox.checked = task.completed;
      checkbox.addEventListener("change", () => {
        playClickSound();
        task.completed = checkbox.checked;
        saveTasks();
        renderTasks();
      });

      const text = document.createElement("span");
      text.className = "task-text";
      text.textContent = task.text;

      const actions = document.createElement("div");
      actions.className = "task-actions";

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "task-action-btn delete";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", () => {
        playClickSound();
        state.tasks = state.tasks.filter((entry) => entry.id !== task.id);
        saveTasks();
        renderTasks();
      });

      actions.appendChild(deleteBtn);
      li.appendChild(checkbox);
      li.appendChild(text);
      li.appendChild(actions);
      taskList.appendChild(li);
    });
  }

  taskPendingCountEl.textContent = state.tasks.filter((task) => !task.completed).length;
}

function render() {
  timerEl.textContent = formatTime(state.remainingSeconds);
  modeLabelEl.textContent = MODE_LABELS[state.currentMode];
  modeMiniEl.textContent = MODE_MINI[state.currentMode];
  updateStatusText();
  updateActiveModeButton();
  updateProgress();
  alarmSelect.value = state.alarm;
  document.title = `${formatTime(state.remainingSeconds)} - ${MODE_LABELS[state.currentMode]}`;
}

function clearTimerInterval() {
  if (state.intervalId !== null) {
    clearInterval(state.intervalId);
    state.intervalId = null;
  }
}

function resetToModeDuration(status = "ready") {
  state.remainingSeconds = state.durations[state.currentMode];
  state.totalSeconds = state.durations[state.currentMode];
  state.status = status;
  fillInputsFromSeconds(state.durations[state.currentMode]);
}

function startTimer() {
  if (state.isRunning || state.remainingSeconds <= 0) {
    return;
  }

  clearResetTimeout();
  closeTimeEditor();
  state.isRunning = true;
  state.status = "running";
  playStartSound();
  render();

  state.intervalId = setInterval(() => {
    state.remainingSeconds = Math.max(0, state.remainingSeconds - 1);
    render();

    if (state.remainingSeconds <= 0) {
      handleTimerComplete();
    }
  }, 1000);
}

function pauseTimer() {
  if (!state.isRunning) {
    return;
  }

  clearTimerInterval();
  state.isRunning = false;
  state.status = "paused";
  render();
}

function resetTimer() {
  clearTimerInterval();
  clearResetTimeout();
  state.isRunning = false;
  resetToModeDuration("ready");
  render();
}

function switchMode(mode) {
  clearTimerInterval();
  clearResetTimeout();
  state.isRunning = false;
  state.currentMode = mode;
  state.durations[mode] = DEFAULT_SECONDS[mode];
  resetToModeDuration("ready");
  setMeshMode(mode);
  saveTimerConfig();
  render();
}

function handleTimerComplete() {
  clearTimerInterval();
  clearResetTimeout();
  state.isRunning = false;
  state.remainingSeconds = 0;
  state.status = "completed";
  render();
  playAlarm();
  saveTimerConfig();

  state.resetTimeoutId = setTimeout(() => {
    resetToModeDuration("ready");
    render();
    state.resetTimeoutId = null;
  }, 900);
}

function openTimeEditor() {
  if (state.isRunning) {
    return;
  }

  hoursInput.value = "000";
  minutesInput.value = "00";
  secondsInput.value = "00";
  timeEditor.classList.add("show");
  requestAnimationFrame(() => {
    hoursInput.focus();
    hoursInput.select();
  });
}

function closeTimeEditor() {
  timeEditor.classList.remove("show");
}

function saveEditedTime() {
  const newSeconds = secondsFromInputs();

  if (newSeconds <= 0) {
    alert("Please set a time greater than 0.");
    return;
  }

  clearResetTimeout();
  state.durations[state.currentMode] = newSeconds;
  state.remainingSeconds = newSeconds;
  state.totalSeconds = newSeconds;
  state.status = "ready";
  closeTimeEditor();
  saveTimerConfig();
  render();
}

function addTask() {
  const text = taskInput.value.trim();
  if (!text) {
    return;
  }

  state.tasks.unshift({
    id: Date.now().toString(),
    text,
    completed: false,
  });

  taskInput.value = "";
  localStorage.removeItem("aura-task-draft");
  saveTasks();
  renderTasks();
}

function extractPlaylistId(url) {
  const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

function loadPlaylistFromInput() {
  const raw = playlistInput.value.trim();

  if (!raw) {
    const themeValue = state.theme === "light" ? "1" : "0";
    const fallback = DEFAULT_PLAYLIST.replace(/theme=\d/, `theme=${themeValue}`);
    spotifyEmbed.src = fallback;
    localStorage.setItem("aura-playlist", fallback);
    return;
  }

  const playlistId = extractPlaylistId(raw);
  if (!playlistId) {
    alert("Please paste a valid Spotify playlist link.");
    return;
  }

  const themeValue = state.theme === "light" ? "1" : "0";
  const embedUrl = `https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator&theme=${themeValue}`;
  spotifyEmbed.src = embedUrl;
  localStorage.setItem("aura-playlist", embedUrl);
}

function savePreferences() {
  localStorage.setItem("aura-theme", state.theme);
  localStorage.setItem("aura-alarm", state.alarm);
}

function saveTimerConfig() {
  localStorage.setItem("aura-mode", state.currentMode);
  localStorage.setItem("aura-durations", JSON.stringify(state.durations));
}

function saveTasks() {
  localStorage.setItem("aura-tasks", JSON.stringify(state.tasks));
}

function saveState() {
  savePreferences();
  saveTimerConfig();
  saveTasks();
}

function restoreState() {
  const savedTheme = localStorage.getItem("aura-theme");
  const savedMode = localStorage.getItem("aura-mode");
  const savedDurations = localStorage.getItem("aura-durations");
  const savedTasks = localStorage.getItem("aura-tasks");
  const savedTaskDraft = localStorage.getItem("aura-task-draft");
  const savedPlaylist = localStorage.getItem("aura-playlist");
  const savedAlarm = localStorage.getItem("aura-alarm");

  if (savedTheme === "light" || savedTheme === "dark") {
    state.theme = savedTheme;
  }

  state.durations = { ...DEFAULT_SECONDS };

  if (savedDurations) {
    try {
      const parsed = JSON.parse(savedDurations);
      state.durations = {
        focus: Number(parsed.focus) || DEFAULT_SECONDS.focus,
        shortBreak: Number(parsed.shortBreak) || DEFAULT_SECONDS.shortBreak,
        longBreak: Number(parsed.longBreak) || DEFAULT_SECONDS.longBreak,
      };
    } catch (error) {
      state.durations = { ...DEFAULT_SECONDS };
    }
  }

  if (savedMode && state.durations[savedMode]) {
    state.currentMode = savedMode;
  }

  if (savedAlarm && ["fahh", "chime", "bell", "alarmPulse", "digital", "beacon", "goofy", "dramatic", "arcade", "none"].includes(savedAlarm)) {
    state.alarm = savedAlarm;
  }

  if (savedTasks) {
    try {
      const parsedTasks = JSON.parse(savedTasks);
      if (Array.isArray(parsedTasks)) {
        state.tasks = parsedTasks;
      }
    } catch (error) {}
  }

  if (savedTaskDraft) {
    taskInput.value = savedTaskDraft;
  }

  state.remainingSeconds = state.durations[state.currentMode];
  state.totalSeconds = state.durations[state.currentMode];

  if (savedPlaylist) {
    spotifyEmbed.src = savedPlaylist;
  } else {
    spotifyEmbed.src = DEFAULT_PLAYLIST;
  }
}

themeToggle.addEventListener("click", () => {
  playClickSound();
  state.theme = state.theme === "dark" ? "light" : "dark";
  applyTheme(state.theme);
  savePreferences();
});

timerDisplayBtn.addEventListener("click", () => {
  playClickSound();

  if (timeEditor.classList.contains("show")) {
    closeTimeEditor();
  } else {
    openTimeEditor();
  }
});

saveTimeBtn.addEventListener("click", () => {
  playClickSound();
  saveEditedTime();
});

cancelTimeBtn.addEventListener("click", () => {
  playClickSound();
  closeTimeEditor();
  fillInputsFromSeconds(state.durations[state.currentMode]);
});

[hoursInput, minutesInput, secondsInput].forEach((input, index) => {
  const max = index === 0 ? 999 : 59;

  input.addEventListener("input", () => {
    normalizeTimeInput(input, max);
  });

  input.addEventListener("focus", () => {
    input.select();
  });

  input.addEventListener("blur", () => {
    finalizeTimeInput(input, max);
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      playClickSound();
      saveEditedTime();
    }
  });
});

startBtn.addEventListener("click", () => {
  playClickSound();
  startTimer();
});

pauseBtn.addEventListener("click", () => {
  playClickSound();
  pauseTimer();
});

resetBtn.addEventListener("click", () => {
  playClickSound();
  resetTimer();
});

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    playClickSound();
    switchMode(button.dataset.mode);
  });
});

addTaskBtn.addEventListener("click", () => {
  playClickSound();
  addTask();
});

taskInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    playClickSound();
    addTask();
  }
});

taskInput.addEventListener("input", () => {
  localStorage.setItem("aura-task-draft", taskInput.value);
});

updatePlaylistBtn.addEventListener("click", () => {
  playClickSound();
  loadPlaylistFromInput();
});

playlistInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    playClickSound();
    loadPlaylistFromInput();
  }
});

alarmSelect.addEventListener("change", () => {
  playClickSound();
  state.alarm = alarmSelect.value;
  savePreferences();
});

previewSoundBtn.addEventListener("click", () => {
  playClickSound();
  playAlarm(alarmSelect.value);
});

window.addEventListener("keydown", (event) => {
  const activeTag = document.activeElement ? document.activeElement.tagName : "";
  const isTypingTarget = ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(activeTag);

  if (event.code !== "Space" || isTypingTarget) {
    return;
  }

  event.preventDefault();
  playClickSound();

  if (state.isRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
});

window.addEventListener("beforeunload", saveState);

function resizeCanvas() {
  meshState.pixelRatio = Math.min(window.devicePixelRatio || 1, 1.25);
  canvas.width = Math.floor(window.innerWidth * meshState.pixelRatio);
  canvas.height = Math.floor(window.innerHeight * meshState.pixelRatio);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(meshState.pixelRatio, 0, 0, meshState.pixelRatio, 0, 0);
  createMesh();
}

function createMesh() {
  meshState.points = [];
  meshState.cols = Math.ceil(window.innerWidth / meshState.spacing) + 2;
  meshState.rows = Math.ceil(window.innerHeight / meshState.spacing) + 2;

  for (let y = 0; y < meshState.rows; y += 1) {
    for (let x = 0; x < meshState.cols; x += 1) {
      meshState.points.push({
        baseX: x * meshState.spacing,
        baseY: y * meshState.spacing,
        offset: Math.random() * Math.PI * 2,
        x: x * meshState.spacing,
        y: y * meshState.spacing,
      });
    }
  }
}

function setMeshMode(mode) {
  if (mode === "focus") {
    meshState.spacing = 102;
    meshState.moveAmount = 9;
    meshState.speed = 0.00115;
    meshState.dotRadius = 1.55;
  } else if (mode === "shortBreak") {
    meshState.spacing = 96;
    meshState.moveAmount = 12;
    meshState.speed = 0.00145;
    meshState.dotRadius = 1.75;
  } else {
    meshState.spacing = 108;
    meshState.moveAmount = 8;
    meshState.speed = 0.00095;
    meshState.dotRadius = 1.45;
  }

  createMesh();
}

function drawMesh(time) {
  if (time - meshState.lastFrameTime < meshState.frameInterval) {
    requestAnimationFrame(drawMesh);
    return;
  }

  meshState.lastFrameTime = time;

  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  const isLight = document.body.classList.contains("light-theme");
  const lineColor = isLight ? "rgba(40, 54, 68, 0.12)" : "rgba(255, 255, 255, 0.15)";
  const dotColor = isLight ? "rgba(40, 54, 68, 0.16)" : "rgba(255, 255, 255, 0.18)";

  for (let i = 0; i < meshState.points.length; i += 1) {
    const point = meshState.points[i];
    point.x = point.baseX + Math.sin(time * meshState.speed + point.offset) * meshState.moveAmount;
    point.y = point.baseY + Math.cos(time * meshState.speed + point.offset) * meshState.moveAmount;
  }

  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 1;
  ctx.beginPath();

  for (let i = 0; i < meshState.points.length; i += 1) {
    const point = meshState.points[i];

    if ((i + 1) % meshState.cols !== 0) {
      const right = meshState.points[i + 1];
      ctx.moveTo(point.x, point.y);
      ctx.lineTo(right.x, right.y);
    }

    const down = meshState.points[i + meshState.cols];
    if (down) {
      ctx.moveTo(point.x, point.y);
      ctx.lineTo(down.x, down.y);
    }
  }

  ctx.stroke();
  ctx.fillStyle = dotColor;

  for (let i = 0; i < meshState.points.length; i += 1) {
    const point = meshState.points[i];
    ctx.beginPath();
    ctx.arc(point.x, point.y, meshState.dotRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  requestAnimationFrame(drawMesh);
}

restoreState();
applyTheme(state.theme);
fillInputsFromSeconds(state.durations[state.currentMode]);
setMeshMode(state.currentMode);
resizeCanvas();
render();
renderTasks();

window.addEventListener("resize", resizeCanvas);
requestAnimationFrame(drawMesh);



