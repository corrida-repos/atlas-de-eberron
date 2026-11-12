"use strict";
const byId = (id) => document.getElementById(id);
const viewport = byId("viewport");
const mapImage = byId("map-image");
const markerLayer = byId("markers");
const editor = byId("editor");
const form = byId("event-form");
const search = byId("search");
const snapshot = window.atlasSnapshot;
const storageKey = "atlas-eberron-events-v2";
const legacyStorageKey = "atlas-eberron-events-v1";
const labels = { campaign: "Campanha", history: "História de Eberron", arix: "Arix", isadora: "Isadora", bear: "Bear Lee", dm: "Notas do DM" };
const category = byId("event-group");
const maps = {
  mundo: { caption: "Mapa-múndi de Eberron", width: 1600, height: 1231, alt: "Mapa-múndi de Eberron, com Khorvaire, Aerenal, Xen’drik, Argonnessen e Sarlona" },
  khorvaire: { caption: "Continente de Khorvaire", width: 7680, height: 4837, alt: "Mapa de Khorvaire com cidades, nações, rios, montanhas e linhas do Lightning Rail" },
  sharn: { caption: "Sharn · Lower Wards", width: 2500, height: 3000, alt: "Mapa dos bairros inferiores de Sharn, incluindo a frente ribeirinha" }
};

function validEvents(records) {
  if (!Array.isArray(records) || records.length > 2000) throw new Error("Invalid event list");
  const ids = new Set();
  return records.map((record) => {
    if (!record || typeof record.id !== "string" || !record.id || ids.has(record.id)) throw new Error("Invalid event ID");
    ids.add(record.id);
    for (const field of ["title", "place", "date", "description"]) {
      if (typeof record[field] !== "string" || record[field].length > 2400) throw new Error("Invalid event text");
    }
    if (!record.title.trim() || !record.place.trim()) throw new Error("Missing title or place");
    const points = Object.fromEntries(Object.entries(record.points || {}).filter(([map, p]) =>
      Object.hasOwn(maps, map) && Array.isArray(p) && p.length === 2 && p.every(n => Number.isFinite(n) && n >= 0 && n <= 1)
    ));
    return {
      id: record.id, title: record.title, place: record.place, date: record.date, description: record.description,
      visible: record.visible === true, approx: record.approx === true, points,
      group: Object.hasOwn(labels, record.group) ? record.group : "campaign"
    };
  });
}

function loadBrowserEvents() {
  try {
    const stored = localStorage.getItem(storageKey) || localStorage.getItem(legacyStorageKey);
    return stored ? validEvents(JSON.parse(stored)) : [];
  } catch {
    return [];
  }
}

let events = snapshot ? validEvents(snapshot.events).filter(event => canShare(event, snapshot.recipient)) : [];
let hostedRole = "group";
let revision;
let saving = false;
const canManage = () => !snapshot && hostedRole === "dm";
const playerRecipient = () => snapshot?.recipient ?? (hostedRole === "dm" ? "group" : hostedRole);
let selectedId = events[0]?.id ?? null;
let playerView = true;
let currentMap = "khorvaire";
let draft = null;
let picking = false;
let toastTimer;
let state = { scale: 1, x: 0, y: 0, fit: 1, width: 0, height: 0 };
const pointers = new Map();
let gesture = null;

const icon = (name) => '<svg aria-hidden="true"><use href="#i-' + name + '"/></svg>';
const make = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function toast(message) {
  const node = byId("toast");
  node.textContent = message;
  node.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { node.hidden = true; }, 4300);
}

async function atlasRequest(path, body) {
  const options = body === undefined ? {} : {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  };
  const response = await fetch("/api/atlas" + path, { ...options, cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "O serviço do atlas está temporariamente indisponível.");
  return data;
}

async function persist(updated) {
  if (!canManage() || saving) return false;
  saving = true;
  try {
    const saved = await atlasRequest("", { revision, events: updated });
    revision = saved.revision;
    events = updated;
    return true;
  } catch (error) {
    toast(error.message);
    return false;
  } finally {
    saving = false;
  }
}

function canShare(event, recipient = "group") {
  return event.visible && (event.group === "campaign" || event.group === "history" ||
    (["arix", "isadora", "bear"].includes(recipient) && event.group === recipient));
}

function visibleEvents() {
  return playerView ? events.filter(event => canShare(event, playerRecipient())) : events;
}

function syncCategories() {
  const recipient = playerRecipient();
  const before = category.value || (Object.hasOwn(labels, recipient) ? recipient : "campaign");
  const allowed = playerView ? new Set(["campaign", "history", recipient]) : new Set(Object.keys(labels));
  category.replaceChildren();
  for (const [value, label] of Object.entries(labels)) {
    if (!allowed.has(value)) continue;
    const option = make("option", "", label);
    option.value = value;
    category.append(option);
  }
  category.value = allowed.has(before) ? before : "campaign";
}

function filteredEvents() {
  const normalize = (s) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const term = normalize(search.value.trim());
  return visibleEvents().filter(event => event.group === category.value && normalize([event.title, event.place, event.date, event.description].join(" ")).includes(term));
}

function positionFor(event, map = currentMap) {
  return Object.hasOwn(event.points, map) ? event.points[map] : null;
}

function drawMarkers() {
  const groups = new Map();
  const all = visibleEvents().filter(event => event.group === category.value);
  for (const event of filteredEvents()) {
    const point = positionFor(event);
    if (!point) continue;
    const key = point.join(",");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(event);
  }
  const active = document.activeElement?.closest?.(".marker");
  const keepFocus = active?.dataset.point;
  const existing = new Map([...markerLayer.children].map(node => [node.dataset.point, node]));
  for (const [key, group] of groups) {
    const selected = group.find(event => event.id === selectedId);
    const [x, y] = positionFor(group[0]);
    const city = group[0].place.split(" · ")[0];
    const sameCity = group.every(event => event.place.split(" · ")[0] === city);
    const groupLabel = group.length > 1 ? group.length + " eventos" + (sameCity ? " em " + city : " neste local") : group[0].title;
    const marker = existing.get(key) ?? make("button");
    existing.delete(key);
    marker.dataset.point = key;
    marker.className = "marker" + (selected ? " active" : "") + (group.every(event => event.approx) ? " approx" : "") + (group.length > 1 ? " cluster" : "");
    marker.style.left = state.x + x * state.width * state.scale + "px";
    marker.style.top = state.y + y * state.height * state.scale - 5 + "px";
    marker.title = groupLabel;
    marker.setAttribute("aria-label", groupLabel);
    marker.replaceChildren(document.createTextNode(group.length > 1 ? group.length : all.indexOf(group[0]) + 1));
    if (selected) marker.append(make("span", "marker-label", group.length > 1 ? selected.place.split(" · ")[0] : selected.title));
    marker.onclick = () => {
      if (picking) return;
      const next = selected ? group[(group.indexOf(selected) + 1) % group.length] : group[0];
      choose(next, false);
      if (window.matchMedia("(max-width: 790px)").matches) byId("detail").scrollIntoView({ block: "nearest" });
    };
    if (!marker.isConnected) markerLayer.append(marker);
  }
  for (const node of existing.values()) node.remove();
  if (keepFocus && document.activeElement !== active && active.isConnected) active.focus({ preventScroll: true });
}

function drawMap() {
  const width = state.width * state.scale;
  const height = state.height * state.scale;
  const viewWidth = viewport.clientWidth;
  const viewHeight = viewport.clientHeight;
  state.x = width > viewWidth ? clamp(state.x, viewWidth - width, 0) : (viewWidth - width) / 2;
  state.y = height > viewHeight ? clamp(state.y, viewHeight - height, 0) : (viewHeight - height) / 2;
  mapImage.style.transform = "translate(" + state.x + "px," + state.y + "px) scale(" + state.scale + ")";
  byId("zoom-value").textContent = Math.round(state.scale / state.fit * 100) + "%";
  byId("zoom-out").disabled = state.scale <= state.fit * 1.001;
  byId("zoom-in").disabled = state.scale >= state.fit * 12;
  drawMarkers();
}

function resetMap() {
  const map = maps[currentMap];
  state.width = map.width;
  state.height = map.height;
  mapImage.style.width = map.width + "px";
  mapImage.style.height = map.height + "px";
  state.fit = Math.min(viewport.clientWidth / map.width, viewport.clientHeight / map.height);
  if (!state.fit) return;
  state.scale = state.fit;
  state.x = (viewport.clientWidth - map.width * state.fit) / 2;
  state.y = (viewport.clientHeight - map.height * state.fit) / 2;
  drawMap();
}

function setMap(key) {
  currentMap = key;
  mapImage.src = snapshot?.images[key] ?? key + ".webp";
  mapImage.alt = maps[key].alt;
  byId("map-caption").textContent = maps[key].caption;
  for (const tab of byId("map-tabs").querySelectorAll("button")) tab.setAttribute("aria-pressed", String(tab.dataset.map === key));
  resetMap();
}

function zoomTo(scale, x, y, fromX = x, fromY = y) {
  const newScale = clamp(scale, state.fit, state.fit * 12);
  const ratio = newScale / state.scale;
  state.x = x - (fromX - state.x) * ratio;
  state.y = y - (fromY - state.y) * ratio;
  state.scale = newScale;
  drawMap();
}

function centerZoom(factor) {
  zoomTo(state.scale * factor, viewport.clientWidth / 2, viewport.clientHeight / 2);
}

function focusEvent(event) {
  const map = positionFor(event) ? currentMap : ["sharn", "khorvaire", "mundo"].find(key => positionFor(event, key));
  if (!map) return;
  if (map !== currentMap) setMap(map);
  const [x, y] = positionFor(event);
  state.scale = Math.max(state.scale, state.fit * (currentMap === "sharn" ? 2.4 : 2.8));
  state.x = viewport.clientWidth / 2 - x * state.width * state.scale;
  state.y = viewport.clientHeight / 2 - y * state.height * state.scale;
  drawMap();
}

function choose(event, focus) {
  selectedId = event.id;
  if (focus) focusEvent(event);
  render();
}

function action(label, fn, cls = "link", symbol = "") {
  const button = make("button", cls);
  button.type = "button";
  if (symbol) button.innerHTML = icon(symbol);
  if (cls.includes("icon-button")) {
    button.title = label;
    button.setAttribute("aria-label", label);
  } else button.append(document.createTextNode(label));
  button.addEventListener("click", fn);
  return button;
}

function renderDetail(event) {
  const detail = byId("detail");
  detail.hidden = !event;
  detail.replaceChildren();
  if (!event) return;
  const hasPoint = Object.keys(event.points).length > 0;
  const tag = !hasPoint ? "Sem marcador" : event.approx ? "Local aproximado" : "Local marcado";
  detail.append(make("p", "detail-tag", tag), make("h3", "", event.title));
  for (const [symbol, label] of [["pin", event.place], ["clock", event.date || "Data por confirmar"]]) {
    const p = make("p", "meta");
    p.innerHTML = icon(symbol);
    p.append(document.createTextNode(label));
    detail.append(p);
  }
  if (event.description) detail.append(make("p", "description", event.description));
  const buttons = make("div", "event-actions");
  if (positionFor(event, "sharn") && currentMap !== "sharn") {
    buttons.append(action("Ver em Sharn", () => { setMap("sharn"); focusEvent(event); renderDetail(event); }, "link jump"));
  } else if (hasPoint) {
    buttons.append(action("Centrar no mapa", () => focusEvent(event), "link jump"));
  }
  if (!playerView) {
    const group = events.filter(item => item.group === event.group);
    const index = group.indexOf(event);
    const up = action("Mover para antes na cronologia", () => reorder(event, -1), "icon-button", "up");
    const down = action("Mover para depois na cronologia", () => reorder(event, 1), "icon-button", "down");
    up.disabled = index === 0;
    down.disabled = index === group.length - 1;
    buttons.append(up, down, action("Editar", () => openEditor(event)), action("Apagar", async () => {
      if (confirm("Apagar o evento «" + event.title + "»?") && await persist(events.filter(item => item !== event))) {
        selectedId = visibleEvents()[0]?.id ?? null;
        render();
        toast("Evento apagado.");
      }
    }, "link delete"));
  }
  detail.append(buttons);
}

function render() {
  const shown = filteredEvents();
  const all = visibleEvents().filter(event => event.group === category.value);
  const timeline = byId("timeline");
  const activeRow = document.activeElement?.closest?.(".timeline-item")?.dataset.id;
  timeline.replaceChildren();
  if (!shown.some(event => event.id === selectedId)) selectedId = shown[0]?.id ?? null;
  byId("count").textContent = all.length + (all.length === 1 ? " evento" : " eventos");
  for (const event of shown) {
    const row = make("button", "timeline-item");
    row.type = "button";
    row.dataset.id = event.id;
    row.setAttribute("aria-current", String(event.id === selectedId));
    row.append(make("span", "timeline-index", String(all.indexOf(event) + 1)));
    const label = make("span", "timeline-text");
    label.append(make("strong", "", event.title), make("small", "", event.date || "Data por confirmar"));
    row.append(label);
    row.insertAdjacentHTML("beforeend", icon(canShare(event) || playerView ? "arrow" : "lock"));
    row.addEventListener("click", () => choose(event, true));
    timeline.append(row);
    if (activeRow === event.id) row.focus({ preventScroll: true });
  }
  if (!shown.length) timeline.append(make("p", "empty", search.value ? "Nenhum evento corresponde à pesquisa." : "Ainda não há eventos na cronologia."));
  renderDetail(shown.find(event => event.id === selectedId));
  drawMarkers();
}

async function reorder(event, offset) {
  const index = events.indexOf(event);
  const group = events.filter(item => item.group === event.group);
  const adjacent = group[group.indexOf(event) + offset];
  if (!adjacent) return;
  const target = events.indexOf(adjacent);
  const updated = [...events];
  [updated[index], updated[target]] = [updated[target], updated[index]];
  if (await persist(updated)) {
    render();
    toast("Ordem da cronologia atualizada.");
  }
}

function setPlayerView(enabled) {
  enabled = enabled || !canManage();
  playerView = enabled;
  search.value = "";
  document.body.classList.toggle("player-view", enabled);
  byId("exit-player").hidden = !enabled || !canManage();
  byId("view-label").hidden = !enabled;
  byId("view-label-text").textContent = labels[playerRecipient()] ? "Vista de " + labels[playerRecipient()] : "Vista dos jogadores";
  syncCategories();
  if (!visibleEvents().some(event => event.id === selectedId)) selectedId = visibleEvents()[0]?.id ?? null;
  render();
}

function openEditor(event = null) {
  if (playerView) return;
  draft = event ? { ...event, points: { ...event.points } } : { points: {}, visible: false, approx: false, group: category.value };
  byId("form-title").textContent = event ? "Editar evento" : "Novo evento";
  form.reset();
  for (const field of ["title", "place", "date", "description"]) form.elements[field].value = draft[field] ?? "";
  form.elements.group.value = draft.group;
  form.elements.visible.checked = draft.visible;
  updateVisibilityControl();
  form.elements.approx.checked = draft.approx;
  byId("form-error").hidden = true;
  updatePosition();
  editor.showModal();
}

function updateVisibilityControl() {
  form.elements.visible.disabled = form.elements.group.value === "dm";
}

function updatePosition() {
  const captions = Object.keys(draft.points).map(key => ({ mundo: "Mundo", khorvaire: "Khorvaire", sharn: "Sharn" })[key]);
  byId("position-status").textContent = captions.length ? "Marcado em " + captions.join(", ") : "Sem ponto no mapa";
}

function endPick(point) {
  if (!picking) return;
  if (point) {
    const [x, y] = point;
    const nx = (x - state.x) / (state.width * state.scale);
    const ny = (y - state.y) / (state.height * state.scale);
    if (nx < 0 || nx > 1 || ny < 0 || ny > 1) {
      toast("Escolhe um ponto dentro do mapa.");
      return;
    }
    draft.points[currentMap] = [nx, ny];
  }
  picking = false;
  viewport.classList.remove("picking");
  byId("pick-hint").hidden = true;
  updatePosition();
  editor.showModal();
}

function localPoint(event) {
  const rect = viewport.getBoundingClientRect();
  return [event.clientX - rect.left, event.clientY - rect.top];
}

function pinch(points) {
  const [a, b] = points;
  return { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, distance: Math.hypot(a[0] - b[0], a[1] - b[1]) };
}

viewport.addEventListener("pointerdown", event => {
  if (event.target.closest("button") || event.button !== 0 || pointers.size >= 2) return;
  const point = localPoint(event);
  viewport.setPointerCapture(event.pointerId);
  pointers.set(event.pointerId, point);
  gesture = { start: point, moved: pointers.size > 1 || Boolean(gesture?.moved) };
});
viewport.addEventListener("pointermove", event => {
  if (!pointers.has(event.pointerId)) return;
  const previous = pointers.get(event.pointerId);
  const point = localPoint(event);
  const before = [...pointers.values()];
  pointers.set(event.pointerId, point);
  if (pointers.size === 2) {
    const from = pinch(before);
    const to = pinch([...pointers.values()]);
    if (from.distance > 0) zoomTo(state.scale * to.distance / from.distance, to.x, to.y, from.x, from.y);
    return;
  }
  const [sx, sy] = gesture.start;
  if (!gesture.moved && Math.hypot(point[0] - sx, point[1] - sy) < 4) return;
  gesture.moved = true;
  viewport.classList.add("dragging");
  state.x += point[0] - previous[0];
  state.y += point[1] - previous[1];
  drawMap();
});
for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
  viewport.addEventListener(type, event => {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    if (!pointers.size) {
      if (type === "pointerup" && picking && !gesture.moved) endPick(localPoint(event));
      gesture = null;
      viewport.classList.remove("dragging");
    }
  });
}
viewport.addEventListener("wheel", event => {
  event.preventDefault();
  const [x, y] = localPoint(event);
  zoomTo(state.scale * (event.deltaY > 0 ? 1 / 1.18 : 1.18), x, y);
}, { passive: false });
viewport.addEventListener("keydown", event => {
  if (event.target !== viewport) return;
  const shifts = { ArrowLeft: [55, 0], ArrowRight: [-55, 0], ArrowUp: [0, 55], ArrowDown: [0, -55] };
  if (Object.hasOwn(shifts, event.key)) {
    event.preventDefault();
    state.x += shifts[event.key][0];
    state.y += shifts[event.key][1];
    drawMap();
  } else if (event.key === "+" || event.key === "=") centerZoom(1.25);
  else if (event.key === "-") centerZoom(1 / 1.25);
  else if (event.key === "Escape") endPick(null);
  else if (picking && event.key === "Enter") {
    event.preventDefault();
    endPick([viewport.clientWidth / 2, viewport.clientHeight / 2]);
  }
});

byId("zoom-in").onclick = () => centerZoom(1.25);
byId("zoom-out").onclick = () => centerZoom(1 / 1.25);
byId("reset").onclick = resetMap;
byId("home").onclick = event => {
  event.preventDefault();
  setMap("khorvaire");
  renderDetail(filteredEvents().find(item => item.id === selectedId));
};
byId("add").onclick = () => openEditor();
byId("player").onclick = () => setPlayerView(true);
byId("exit-player").onclick = () => setPlayerView(false);
byId("share").onclick = () => byId("sharing").showModal();
byId("backup").onclick = () => byId("backup-dialog").showModal();
byId("credits").onclick = () => byId("credits-dialog").showModal();
byId("cancel-pick").onclick = () => endPick(null);
byId("pick").onclick = () => {
  editor.close();
  picking = true;
  viewport.classList.add("picking");
  byId("pick-hint").hidden = false;
  viewport.focus({ preventScroll: true });
  if (window.matchMedia("(max-width: 790px)").matches) viewport.scrollIntoView({ block: "center" });
};
for (const button of document.querySelectorAll(".dismiss")) button.onclick = () => button.closest("dialog").close();
for (const tab of byId("map-tabs").querySelectorAll("button")) tab.onclick = () => { setMap(tab.dataset.map); renderDetail(filteredEvents().find(event => event.id === selectedId)); };
search.addEventListener("input", render);
category.addEventListener("change", () => { search.value = ""; render(); });
form.elements.group.addEventListener("change", updateVisibilityControl);

form.addEventListener("submit", async event => {
  event.preventDefault();
  if (playerView || !draft) return;
  const error = byId("form-error");
  const values = new FormData(form);
  const record = { ...draft, id: draft.id ?? (globalThis.crypto?.randomUUID?.() || Date.now() + "-" + Math.random()) };
  for (const field of ["title", "place", "date", "description"]) record[field] = values.get(field).trim();
  record.group = values.get("group");
  record.visible = record.group !== "dm" && values.has("visible");
  record.approx = values.has("approx");
  if (!record.title || !record.place) {
    error.textContent = "Preenche o título e o local.";
    error.hidden = false;
    return;
  }
  const updated = draft.id ? events.map(item => item.id === draft.id ? record : item) : [...events, record];
  if (await persist(updated)) {
    editor.close();
    draft = null;
    search.value = "";
    category.value = record.group;
    choose(record, true);
    toast("Evento guardado.");
  }
});

function download(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

byId("export").onclick = () => canManage() && download("eberron-campanha.json", JSON.stringify({ version: 1, events }, null, 2), "application/json");
byId("import").onclick = () => byId("import-file").click();
byId("import-file").onchange = async event => {
  const file = event.target.files[0];
  event.target.value = "";
  if (!file || !canManage()) return;
  try {
    if (file.size > 6_000_000) throw new Error("File too large");
    const backup = JSON.parse(await file.text());
    if (backup.version !== 1) throw new Error("Unsupported format");
    const imported = validEvents(backup.events);
    const privateTimelines = backup.kind === "private-timelines";
    if (privateTimelines && imported.some(item => !["arix", "isadora", "bear", "dm"].includes(item.group))) {
      throw new Error("Invalid private timeline");
    }
    const existingIds = new Set(events.map(item => item.id));
    const additions = imported.filter(item => !existingIds.has(item.id));
    if (!privateTimelines && !confirm("Substituir os eventos deste navegador pelos " + imported.length + " eventos da cópia?")) return;
    if (await persist(privateTimelines ? [...events, ...additions] : imported)) {
      if (privateTimelines) category.value = (additions[0] ?? imported[0])?.group ?? "campaign";
      selectedId = events[0]?.id ?? null;
      search.value = "";
      byId("backup-dialog").close();
      render();
      toast(privateTimelines ? (additions.length ? additions.length + " entradas privadas importadas." :
        "As cronologias privadas já estão neste navegador.") : "Cópia importada.");
    }
  } catch {
    toast("O ficheiro escolhido não é uma cópia válida do atlas.");
  }
};

async function getFile(path, asDataUrl = false) {
  const response = await fetch(path);
  if (!response.ok) throw new Error("Download failed");
  if (!asDataUrl) return response.text();
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

byId("download-player").onclick = async event => {
  if (!canManage()) return;
  const button = event.currentTarget;
  button.disabled = true;
  toast("A preparar a cópia dos jogadores…");
  try {
    const mapKeys = Object.keys(maps);
    const recipient = byId("share-recipient").value;
    const sharedEvents = events.filter(item => canShare(item, recipient));
    const [template, css, js, instrument, spectral, ...mapImages] = await Promise.all([
      getFile("index.html"), getFile("atlas.css"), getFile("atlas.js"), getFile("instrument.woff2", true), getFile("spectral.woff2", true),
      ...mapKeys.map(key => getFile(key + ".webp", true))
    ]);
    const images = Object.fromEntries(mapKeys.map((key, index) => [key, mapImages[index]]));
    const payload = JSON.stringify({ events: sharedEvents, images, recipient }).replace(/</g, "\\u003c");
    const styles = css.replace("url(instrument.woff2)", 'url("' + instrument + '")').replace("url(spectral.woff2)", 'url("' + spectral + '")');
    const html = template
      .replace('<link rel="stylesheet" href="atlas.css">', () => "<style>" + styles + "</style>")
      .replace('<script defer src="atlas.js"></' + 'script>', "")
      .replace("</" + "body>", () => "<" + "script>window.atlasSnapshot=" + payload + ";\n" + js + "</" + "script></" + "body>");
    const names = { group: "grupo", arix: "arix", isadora: "isadora", bear: "bear-lee" };
    download("atlas-de-eberron-" + names[recipient] + ".html", html, "text/html;charset=utf-8");
    byId("sharing").close();
    toast("Cópia dos jogadores descarregada.");
  } catch {
    toast("Não foi possível gerar a cópia. Tenta novamente.");
  } finally {
    button.disabled = false;
  }
};

let viewportSize = [viewport.clientWidth, viewport.clientHeight];
new ResizeObserver(() => {
  const [width, height] = [viewport.clientWidth, viewport.clientHeight];
  if (!width || !height || (width === viewportSize[0] && height === viewportSize[1])) return;
  const [oldWidth, oldHeight] = viewportSize;
  viewportSize = [width, height];
  const x = (oldWidth / 2 - state.x) / state.scale;
  const y = (oldHeight / 2 - state.y) / state.scale;
  const relativeZoom = state.scale / state.fit;
  state.fit = Math.min(width / state.width, height / state.height);
  state.scale = state.fit * relativeZoom;
  state.x = width / 2 - x * state.scale;
  state.y = height / 2 - y * state.scale;
  drawMap();
}).observe(viewport);

setMap("khorvaire");
setPlayerView(playerView);
if (!snapshot) void connectAtlas();

async function connectAtlas() {
  const notice = byId("account-notice");
  let token;
  try {
    const invite = new URLSearchParams(location.hash.slice(1)).get("convite");
    if (invite && /^[a-f0-9]{48}$/.test(invite)) {
      sessionStorage.setItem("atlas-convite", invite);
      history.replaceState(null, "", location.pathname + location.search);
    }
    token = sessionStorage.getItem("atlas-convite");
  } catch {
    // Public events remain available when browser storage is disabled.
  }
  byId("signin").hidden = false;
  try {
    let state = await atlasRequest("");
    if (token && state.authenticated) {
      sessionStorage.removeItem("atlas-convite");
      try {
        await atlasRequest("/claim", { token });
        state = await atlasRequest("");
        notice.textContent = "A tua conta está ligada a " + labels[state.role] + ".";
      } catch (error) {
        notice.textContent = error.message;
      }
      notice.hidden = false;
    } else if (token) {
      notice.textContent = "Inicia sessão com a tua conta ChatGPT para aceitar o convite.";
      notice.hidden = false;
    }
    hostedRole = state.role;
    revision = state.revision;
    events = validEvents(state.events);
    byId("signin").hidden = state.authenticated;
    byId("signout").hidden = !state.authenticated;
    setPlayerView(!canManage());
    if (labels[hostedRole] && hostedRole !== "dm") {
      category.value = hostedRole;
      render();
    }
    if (canManage()) {
      byId("import-local").hidden = !localStorage.getItem(storageKey) && !localStorage.getItem(legacyStorageKey);
    }
  } catch {
    notice.textContent = "Não foi possível carregar a cronologia. Atualiza a página para voltar a tentar.";
    notice.hidden = false;
  }
}

byId("import-local").onclick = async () => {
  if (!canManage()) return;
  const local = loadBrowserEvents();
  if (!local.length) { toast("Não foram encontrados eventos neste navegador."); return; }
  if (!confirm("Importar os eventos guardados neste navegador? As versões locais com o mesmo ID substituem as do atlas.")) return;
  const merged = new Map(events.map(event => [event.id, event]));
  for (const event of local) merged.set(event.id, event);
  if (await persist([...merged.values()])) {
    byId("backup-dialog").close();
    render();
    toast("Eventos do navegador importados.");
  }
};

async function showInvites() {
  const slots = byId("invite-slots");
  const { slots: access } = await atlasRequest("/invites");
  slots.replaceChildren();
  for (const slot of access) {
    const row = make("div", "invite-row");
    const status = make("span", "", labels[slot.role]);
    status.append(make("small", "", slot.claimed ? "Conta ligada" : slot.pending ? "Convite pendente" : "Sem acesso"));
    const controls = make("div");
    if (!slot.claimed) controls.append(action(slot.pending ? "Novo convite" : "Criar convite", async () => {
      try {
        const { token } = await atlasRequest("/invites", { action: "invite", role: slot.role });
        byId("invite-link").value = new URL("/#convite=" + token, location.origin).href;
        byId("invite-output").hidden = false;
        await showInvites();
        byId("invite-link").focus();
        byId("invite-link").select();
      } catch (error) { toast(error.message); }
    }, "outline"));
    if (slot.claimed || slot.pending) controls.append(action("Revogar", async () => {
      if (!confirm("Revogar o acesso ou convite de " + labels[slot.role] + "?")) return;
      try {
        await atlasRequest("/invites", { action: "revoke", role: slot.role });
        byId("invite-output").hidden = true;
        byId("invite-link").value = "";
        await showInvites();
      } catch (error) { toast(error.message); }
    }, "outline"));
    row.append(status, controls);
    slots.append(row);
  }
}

byId("invites").onclick = async () => {
  if (!canManage()) return;
  byId("invite-output").hidden = true;
  byId("invite-link").value = "";
  try {
    await showInvites();
    byId("invite-dialog").showModal();
  } catch (error) { toast(error.message); }
};
byId("copy-invite").onclick = async () => {
  try {
    await navigator.clipboard.writeText(byId("invite-link").value);
    toast("Link copiado.");
  } catch {
    byId("invite-link").select();
  }
};
