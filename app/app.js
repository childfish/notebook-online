const STORAGE_KEY = "notebook-online-state-v2";

const dom = {
  notesList: document.querySelector("#notes-list"),
  noteTitle: document.querySelector("#note-title"),
  editor: document.querySelector("#editor"),
  saveStatus: document.querySelector("#save-status"),
  newNoteButton: document.querySelector("#new-note-button"),
  saveNoteButton: document.querySelector("#save-note-button"),
  stopwatchDisplay: document.querySelector("#stopwatch-display"),
  stopwatchToggleButton: document.querySelector("#stopwatch-toggle-button"),
  stopwatchResetButton: document.querySelector("#stopwatch-reset-button"),
  stopwatchToggleIconPlay: document.querySelector("#stopwatch-toggle-icon-play"),
  stopwatchToggleIconPause: document.querySelector("#stopwatch-toggle-icon-pause"),
  noteItemTemplate: document.querySelector("#note-item-template"),
};

const defaultState = {
  notes: [],
  activeNoteId: null,
};

let state = loadState();
let saveTimer = null;
let draggedImage = null;
let savedRange = null;
let stopwatchElapsedMs = 0;
let stopwatchStartedAt = null;
let stopwatchTimer = null;

bootstrap();

function bootstrap() {
  ensureInitialNote();
  bindToolbar();
  bindEvents();
  renderStopwatch();
  render();
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    return { ...structuredClone(defaultState), ...JSON.parse(raw) };
  } catch (error) {
    console.error("Failed to load state", error);
    return structuredClone(defaultState);
  }
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function createNote() {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: "未命名笔记",
    content: "<p>在这里开始写笔记。</p>",
    createdAt: now,
    updatedAt: now,
  };
}

function ensureInitialNote() {
  if (state.notes.length > 0 && state.activeNoteId) return;
  const note = createNote();
  state.notes.unshift(note);
  state.activeNoteId = note.id;
  persistState();
}

function getActiveNote() {
  return state.notes.find((note) => note.id === state.activeNoteId) || state.notes[0];
}

function bindEvents() {
  dom.newNoteButton.addEventListener("click", () => {
    const note = createNote();
    state.notes.unshift(note);
    state.activeNoteId = note.id;
    persistState();
    render();
    setDirtyStatus("已创建新笔记");
  });

  dom.noteTitle.addEventListener("input", () => {
    updateActiveNoteFromEditor();
    queueAutosave();
  });

  dom.editor.addEventListener("input", () => {
    updateActiveNoteFromEditor();
    queueAutosave();
  });

  dom.saveNoteButton.addEventListener("click", async () => {
    await saveCurrentNote();
  });

  dom.stopwatchToggleButton.addEventListener("click", toggleStopwatch);
  dom.stopwatchResetButton.addEventListener("click", resetStopwatch);

  dom.editor.addEventListener("paste", async (event) => {
    const imageFile = extractImageFromClipboard(event.clipboardData);
    if (!imageFile) return;
    event.preventDefault();
    await insertImageFromFile(imageFile);
  });

  dom.editor.addEventListener("dragover", (event) => {
    if (!hasImageFile(event.dataTransfer) && !draggedImage) return;
    event.preventDefault();
    dom.editor.classList.add("is-drop-target");
  });

  dom.editor.addEventListener("dragleave", () => {
    dom.editor.classList.remove("is-drop-target");
  });

  dom.editor.addEventListener("drop", async (event) => {
    dom.editor.classList.remove("is-drop-target");
    if (draggedImage) {
      event.preventDefault();
      moveDraggedImage(event.clientX, event.clientY);
      return;
    }

    const imageFile = extractImageFromFileList(event.dataTransfer?.files);
    if (!imageFile) return;
    event.preventDefault();
    placeCaretFromPoint(event.clientX, event.clientY);
    await insertImageFromFile(imageFile);
  });

  document.addEventListener("selectionchange", rememberSelection);
}

function bindToolbar() {
  document.querySelectorAll("[data-command]").forEach((button) => {
    button.addEventListener("click", () => {
      restoreSelection();
      document.execCommand(button.dataset.command, false, button.dataset.value || null);
      dom.editor.focus();
      updateActiveNoteFromEditor();
      queueAutosave();
    });
  });

  document.querySelectorAll("[data-font-size]").forEach((button) => {
    button.addEventListener("click", () => {
      restoreSelection();
      document.execCommand("fontSize", false, button.dataset.fontSize);
      dom.editor.focus();
      updateActiveNoteFromEditor();
      queueAutosave();
    });
  });
}

function render() {
  const activeNote = getActiveNote();
  dom.notesList.innerHTML = "";

  state.notes
    .slice()
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .forEach((note) => {
      const fragment = dom.noteItemTemplate.content.cloneNode(true);
      const button = fragment.querySelector(".note-item");
      const title = fragment.querySelector(".note-item-title");
      const date = fragment.querySelector(".note-item-date");

      title.textContent = note.title || "未命名笔记";
      date.textContent = formatDate(note.updatedAt);
      if (note.id === activeNote.id) button.classList.add("active");

      button.addEventListener("click", () => {
        state.activeNoteId = note.id;
        persistState();
        render();
      });

      dom.notesList.appendChild(fragment);
    });

  dom.noteTitle.value = activeNote.title === "未命名笔记" ? "" : activeNote.title;
  dom.editor.innerHTML = activeNote.content;
  setupEditorImages();
}

function updateActiveNoteFromEditor() {
  const activeNote = getActiveNote();
  activeNote.title = dom.noteTitle.value.trim() || "未命名笔记";
  activeNote.content = sanitizeEditorHtml(dom.editor.innerHTML);
  activeNote.updatedAt = new Date().toISOString();
  persistState();
}

function queueAutosave() {
  setDirtyStatus("编辑中...");
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    saveCurrentNote();
  }, 600);
}

async function saveCurrentNote() {
  updateActiveNoteFromEditor();
  persistState();
  render();

  try {
    const savedPath = await saveCurrentNoteToDisk();
    setSavedStatus(`已保存为 ${savedPath.split("/").pop()}`);
  } catch (error) {
    console.error(error);
    setDirtyStatus(`本地保存失败：${error.message}`);
  }
}

async function saveCurrentNoteToDisk() {
  const response = await fetch("/api/save-note", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(getActiveNote()),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    throw new Error(data.message || `接口返回 ${response.status}`);
  }
  return data.paths.docx;
}

function sanitizeEditorHtml(html) {
  return html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
}

function formatDate(value) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("图片读取失败"));
    reader.readAsDataURL(file);
  });
}

function extractImageFromClipboard(clipboardData) {
  if (!clipboardData?.items) return null;
  for (const item of clipboardData.items) {
    if (item.type.startsWith("image/")) return item.getAsFile();
  }
  return null;
}

function extractImageFromFileList(files) {
  if (!files?.length) return null;
  for (const file of files) {
    if (file.type.startsWith("image/")) return file;
  }
  return null;
}

function hasImageFile(dataTransfer) {
  return Boolean(extractImageFromFileList(dataTransfer?.files));
}

async function insertImageFromFile(file) {
  const dataUrl = await readFileAsDataUrl(file);
  insertImageAtSelection(dataUrl);
  setupEditorImages();
  updateActiveNoteFromEditor();
  queueAutosave();
}

function insertImageAtSelection(src) {
  restoreSelection();
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    dom.editor.focus();
    document.execCommand("insertImage", false, src);
    return;
  }

  const range = selection.getRangeAt(0);
  const image = document.createElement("img");
  image.src = src;
  range.deleteContents();
  range.insertNode(image);
  range.setStartAfter(image);
  range.setEndAfter(image);
  selection.removeAllRanges();
  selection.addRange(range);
}

function setupEditorImages() {
  dom.editor.querySelectorAll("img").forEach((image) => {
    image.draggable = true;
    if (image.dataset.bound === "true") return;
    image.dataset.bound = "true";

    image.addEventListener("dragstart", (event) => {
      draggedImage = image;
      image.classList.add("is-dragging");
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", "notebook-image");
      }
    });

    image.addEventListener("dragend", clearDraggedImageState);
  });
}

function moveDraggedImage(x, y) {
  if (!draggedImage) return;
  const targetRange = getRangeFromPoint(x, y);
  if (!targetRange) {
    clearDraggedImageState();
    return;
  }

  const targetImage =
    targetRange.startContainer.nodeType === Node.ELEMENT_NODE
      ? targetRange.startContainer.closest?.("img")
      : targetRange.startContainer.parentElement?.closest("img");

  if (targetImage && targetImage !== draggedImage) {
    const rect = targetImage.getBoundingClientRect();
    if (y < rect.top + rect.height / 2) {
      targetImage.before(draggedImage);
    } else {
      targetImage.after(draggedImage);
    }
  } else {
    const block = ensureBlockContainer(targetRange);
    if (block) {
      const rect = block.getBoundingClientRect();
      if (y < rect.top + rect.height / 2) {
        block.before(draggedImage);
      } else {
        block.after(draggedImage);
      }
    } else {
      dom.editor.append(draggedImage);
    }
  }

  clearDraggedImageState();
  updateActiveNoteFromEditor();
  queueAutosave();
}

function ensureBlockContainer(range) {
  let node = range.startContainer;
  if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;

  while (node && node !== dom.editor) {
    if (node.nodeType === Node.ELEMENT_NODE && ["P", "DIV", "H1", "H2", "H3", "UL", "OL", "BLOCKQUOTE"].includes(node.tagName)) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

function getRangeFromPoint(x, y) {
  if (document.caretRangeFromPoint) return document.caretRangeFromPoint(x, y);
  if (document.caretPositionFromPoint) {
    const position = document.caretPositionFromPoint(x, y);
    if (!position) return null;
    const range = document.createRange();
    range.setStart(position.offsetNode, position.offset);
    range.collapse(true);
    return range;
  }
  return null;
}

function clearDraggedImageState() {
  if (draggedImage) draggedImage.classList.remove("is-dragging");
  draggedImage = null;
  dom.editor.classList.remove("is-drop-target");
}

function placeCaretFromPoint(x, y) {
  dom.editor.focus();
  const range = getRangeFromPoint(x, y);
  if (!range) return;
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  savedRange = range;
}

function rememberSelection() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  if (!dom.editor.contains(range.commonAncestorContainer)) return;
  savedRange = range;
}

function restoreSelection() {
  if (!savedRange) {
    dom.editor.focus();
    return;
  }
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(savedRange);
}

function setDirtyStatus(message) {
  dom.saveStatus.textContent = message;
}

function setSavedStatus(message) {
  dom.saveStatus.textContent = message;
}

function toggleStopwatch() {
  if (stopwatchTimer) {
    stopwatchElapsedMs += Date.now() - stopwatchStartedAt;
    stopwatchStartedAt = null;
    window.clearInterval(stopwatchTimer);
    stopwatchTimer = null;
    renderStopwatch();
    return;
  }
  stopwatchStartedAt = Date.now();
  stopwatchTimer = window.setInterval(renderStopwatch, 100);
  renderStopwatch();
}

function resetStopwatch() {
  stopwatchElapsedMs = 0;
  stopwatchStartedAt = stopwatchTimer ? Date.now() : null;
  renderStopwatch();
}

function getStopwatchElapsedMs() {
  if (!stopwatchTimer || stopwatchStartedAt === null) return stopwatchElapsedMs;
  return stopwatchElapsedMs + (Date.now() - stopwatchStartedAt);
}

function renderStopwatch() {
  const elapsedMs = getStopwatchElapsedMs();
  dom.stopwatchDisplay.textContent = formatStopwatch(elapsedMs);
  dom.stopwatchToggleIconPlay.classList.toggle("hidden", Boolean(stopwatchTimer));
  dom.stopwatchToggleIconPause.classList.toggle("hidden", !stopwatchTimer);
}

function formatStopwatch(elapsedMs) {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
