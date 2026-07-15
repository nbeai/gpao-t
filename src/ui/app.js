const state = { sessions: [], messengerSessions: [], activeId: null, activeKind: "workspace", sessionAction: null, sessionMenuId: null, sessionSearch: "", pendingChannelSend: null, activeTurn: null, surfaceEventIds:new Set(), streamText:new Map(), connections: null, channels: null, connectionCells: null, tools: null, influence: null, memoryWiki: null, doctor: null, panel: { sessionId:null, open:false, userClosed:false, view:"activity", notices:0 } };
const $ = selector => document.querySelector(selector);
function refreshIcons(root = document) { globalThis.lucide?.createIcons?.({ root, attrs:{ "stroke-width":1.8 } }); }
const localConnector = connector => (connector.compatibility?.transport || connector.transport) === "builtin";
const managedChannel = connector => connector.id === "channel.telegram";
const userFacingProvider = provider => provider.adapter !== "native-deterministic-emulator";
let panelReturnFocus = null;

function active() { return (state.activeKind === "messenger" ? state.messengerSessions : state.sessions).find(session => session.sessionId === state.activeId); }
const panelTitles = { activity:"진행 상황", tools:"도구와 결과", memory:"기억", recovery:"문제 해결" };
function panelStorageKey(sessionId = state.activeId) { return `gpao-t3:assistant-panel:${sessionId || "new"}`; }
function readPanelState(sessionId) {
  try { return JSON.parse(sessionStorage.getItem(panelStorageKey(sessionId))) || {}; }
  catch { return {}; }
}
function savePanelState() {
  if (!state.activeId) return;
  sessionStorage.setItem(panelStorageKey(), JSON.stringify({ open:state.panel.open, userClosed:state.panel.userClosed, view:state.panel.view }));
}
function renderPanelState() {
  const workbench = $(".workbench");
  workbench.classList.toggle("panel-open", state.panel.open);
  $("#assistant-panel").setAttribute("aria-hidden", String(!state.panel.open));
  $("#panel-toggle").setAttribute("aria-expanded", String(state.panel.open));
  const panel = $("#assistant-panel");
  const modal = state.panel.open && window.innerWidth <= 980;
  if (modal) { panel.setAttribute("role", "dialog"); panel.setAttribute("aria-modal", "true"); }
  else { panel.removeAttribute("role"); panel.removeAttribute("aria-modal"); }
  $("#panel-title").textContent = panelTitles[state.panel.view] || panelTitles.activity;
  document.querySelectorAll("[data-panel-view]").forEach(button => button.setAttribute("aria-current", String(button.dataset.panelView === state.panel.view)));
  document.querySelectorAll("[data-panel-content]").forEach(section => { section.hidden = section.dataset.panelContent !== state.panel.view; });
  const badge = $("#panel-badge");
  badge.textContent = String(state.panel.notices);
  badge.hidden = state.panel.notices === 0;
}
function restorePanelForSession(sessionId) {
  const saved = readPanelState(sessionId);
  state.panel = { sessionId, open:saved.open === true, userClosed:saved.userClosed === true, view:panelTitles[saved.view] ? saved.view : "activity", notices:0 };
  renderPanelState();
}
function setPanelOpen(open, { userClosed = false } = {}) {
  const wasModal = $("#assistant-panel").getAttribute("aria-modal") === "true";
  if (open && !state.panel.open) panelReturnFocus = document.activeElement;
  state.panel.open = open;
  state.panel.userClosed = !open && userClosed;
  if (open) state.panel.notices = 0;
  savePanelState();
  renderPanelState();
  if (open && window.innerWidth <= 980) setTimeout(() => $("#panel-close").focus(), 200);
  if (!open && wasModal) setTimeout(() => (panelReturnFocus?.isConnected ? panelReturnFocus : $("#panel-toggle")).focus(), 0);
}
function setPanelView(view) {
  if (!panelTitles[view]) return;
  state.panel.view = view;
  savePanelState();
  renderPanelState();
}
function setPanelActivity(title, detail, { notice = false, view = "activity" } = {}) {
  $("#panel-activity-title").textContent = title;
  $("#panel-activity-detail").textContent = detail;
  if (panelTitles[view]) state.panel.view = view;
  if (notice && !state.panel.open) state.panel.notices += 1;
  savePanelState();
  renderPanelState();
}

const SURFACE_EVENT_COPY = {
  "turn.accepted":["요청 확인", "요청을 안전하게 접수했습니다."],
  "tool.proposed":["도구 선택", "필요한 도구를 확인했습니다."],
  "tool.running":["도구 실행", "도구가 작업을 진행하고 있습니다."],
  "tool.completed":["도구 완료", "도구 결과를 답변에 반영했습니다."],
  "tool.failed":["도구 확인 필요", "문제를 진단하고 복구 방법을 준비했습니다."],
  "memory.referenced":["기억 확인", "승인된 기억과 맥락을 참고했습니다."],
  "text.delta":["답변 작성", "답변을 작성하고 있습니다."],
  "text.complete":["답변 정리", "최종 답변을 안전하게 확정했습니다."],
  "stream.reconnecting":["연결 복구", "진행 상태를 다시 연결하고 있습니다."],
  "recovery.started":["문제 진단", "원인과 안전한 다음 행동을 확인하고 있습니다."],
  "recovery.completed":["복구 안내 준비", "사용자가 확인할 수 있는 해결 방법을 준비했습니다."],
  "recovery.failed":["복구 확인 필요", "자동 복구 대신 사용자의 확인이 필요합니다."],
  "turn.completed":["작업 완료", "답변과 작업 기록을 모두 반영했습니다."],
  "turn.failed":["복구 필요", "문제를 확인하고 다음 행동을 준비했습니다."],
  "turn.cancelled":["작업 중단", "요청한 작업을 중단했습니다."]
};

function showSurfaceEvent(event) {
  if (state.surfaceEventIds.has(event.eventId)) return;
  state.surfaceEventIds.add(event.eventId);
  const copy = SURFACE_EVENT_COPY[event.type] || ["진행", "작업 상태가 갱신됐습니다."];
  setPanelActivity(copy[0], copy[1], { notice:true, view:event.type.includes("failed") || event.type.startsWith("recovery.") ? "recovery" : "activity" });
  const list = $("#activity-event-list");
  if (!list || list.querySelector(`[data-event-id="${CSS.escape(event.eventId)}"]`)) return;
  const item = document.createElement("li");
  item.dataset.eventId = event.eventId;
  item.className = event.terminal ? "terminal" : "";
  const title = document.createElement("strong");
  title.textContent = copy[0];
  const detail = document.createElement("span");
  detail.textContent = copy[1];
  item.append(title, detail);
  list.append(item);
  while (list.children.length > 30) list.firstElementChild.remove();
  if (event.type === "text.delta") renderStreamingDelta(event);
}

function renderStreamingDelta(event) {
  if (state.activeTurn?.turnId !== event.turnId || typeof event.payload?.text !== "string") return;
  const text = `${state.streamText.get(event.turnId) || ""}${event.payload.text}`;
  state.streamText.set(event.turnId, text);
  const messages = $("#messages");
  let article = messages.querySelector(`[data-stream-turn="${CSS.escape(event.turnId)}"]`);
  if (!article) {
    article = document.createElement("article");
    article.className = "message assistant streaming";
    article.dataset.streamTurn = event.turnId;
    const who = document.createElement("span");
    who.className = "who";
    who.textContent = "GPAO-T3";
    article.append(who);
    messages.append(article);
  }
  article.querySelector(".response-prose")?.remove();
  article.append(renderMarkdown(text));
  messages.scrollTop = messages.scrollHeight;
}

function awaitOsTurn(acceptance) {
  return new Promise((resolve, reject) => {
    state.surfaceEventIds.clear();
    state.streamText.set(acceptance.turnId, "");
    let terminal = false;
    const source = new EventSource(`${acceptance.eventUrl}?cursor=${encodeURIComponent(`${acceptance.turnId}:0`)}`);
    const timer = setTimeout(() => { source.close(); reject(new Error("응답 시간이 길어지고 있습니다. 진행 상태는 작업 패널에서 이어서 확인할 수 있습니다.")); }, 120_000);
    const finish = async event => {
      showSurfaceEvent(event);
      if (!event.terminal || terminal) return;
      terminal = true;
      clearTimeout(timer);
      source.close();
      try { resolve(await request(`/v2/os-turns/${encodeURIComponent(acceptance.turnId)}`)); }
      catch (error) { reject(error); }
    };
    source.addEventListener("snapshot", message => {
      try { for (const event of JSON.parse(message.data).events || []) void finish(event); }
      catch { source.close(); clearTimeout(timer); reject(new Error("진행 기록을 읽지 못했습니다.")); }
    });
    source.addEventListener("surface", message => {
      try { void finish(JSON.parse(message.data)); }
      catch { source.close(); clearTimeout(timer); reject(new Error("진행 상태를 읽지 못했습니다.")); }
    });
    source.onerror = () => {
      if (terminal) return;
      setPanelActivity("연결을 복구하고 있습니다", "저장된 진행 위치부터 다시 연결합니다.", { notice:true });
    };
  });
}
async function createSession() {
  closeSessionContextMenu();
  const sessionId = crypto.randomUUID();
  const session = await request("/v1/workspaces", { method:"POST", body:JSON.stringify({ sessionId, title:"새 대화" }) });
  session.messages = []; state.sessions.unshift(session); state.activeKind = "workspace"; state.activeId = sessionId; render();
}
async function loadWorkspace(sessionId) {
  closeSessionContextMenu();
  const workspace = await request(`/v1/workspaces/${encodeURIComponent(sessionId)}`);
  const index = state.sessions.findIndex(item => item.sessionId === sessionId);
  if (index >= 0) state.sessions[index] = workspace; else state.sessions.unshift(workspace);
  state.activeKind = "workspace"; state.activeId = sessionId; closeSessionMenu(); render();
}
function loadMessengerSession(sessionId) { state.activeKind = "messenger"; state.activeId = sessionId; closeSessionMenu(); render(); }
function closeSessionMenu() {
  $(".rail").classList.remove("sessions-open");
  $("#session-backdrop").classList.remove("open");
  $("#session-menu").setAttribute("aria-expanded", "false");
}
function closeSessionContextMenu() {
  const closingId = state.sessionMenuId;
  state.sessionMenuId = null;
  document.querySelectorAll(".session-context-menu").forEach(menu => { menu.hidden = true; });
  document.querySelectorAll(".session-row.menu-open").forEach(row => row.classList.remove("menu-open"));
  document.querySelectorAll("[data-session-menu]").forEach(button => button.setAttribute("aria-expanded", "false"));
  if (closingId) queueMicrotask(() => document.querySelector(`[data-session-menu="${CSS.escape(closingId)}"]`)?.focus());
}
function positionSessionContextMenu() {
  const menu = document.querySelector(".session-context-menu:not([hidden])");
  const row = menu?.closest(".session-row");
  if (!menu || !row) return;
  if (window.innerWidth <= 760) { menu.style.removeProperty("top"); menu.style.removeProperty("left"); return; }
  const rowBox = row.getBoundingClientRect();
  const top = Math.max(10, Math.min(rowBox.top + 34, window.innerHeight - menu.offsetHeight - 10));
  const left = Math.max(10, Math.min(rowBox.right - 36, window.innerWidth - menu.offsetWidth - 10));
  menu.style.top = `${top}px`;
  menu.style.left = `${left}px`;
}
function closeSessionDialog() { state.sessionAction = null; $("#session-dialog").close(); $("#session-dialog-status").textContent = ""; }
function openSessionDialog(mode, sessionId) {
  const item = state.sessions.find(entry => entry.sessionId === sessionId);
  if (!item) return;
  closeSessionContextMenu();
  state.sessionAction = { mode, sessionId };
  const rename = mode === "rename";
  $("#session-dialog-title").textContent = rename ? "대화 이름 변경" : "대화 삭제";
  $("#session-dialog-detail").textContent = rename ? "작업공간 목록에서 알아보기 쉬운 이름을 사용합니다." : `“${item.title}” 대화와 기록을 삭제합니다.`;
  $("#session-title-field").hidden = !rename;
  $("#session-title-input").value = item.title;
  $("#confirm-session-action").textContent = rename ? "저장" : "삭제";
  $("#session-dialog-status").textContent = "";
  $("#session-dialog").showModal();
  if (rename) $("#session-title-input").focus();
}
async function refreshSessions() {
  const [payload, messenger] = await Promise.all([request("/v1/workspaces"), request("/v1/messenger/sessions")]);
  state.sessions = payload.workspaces.map(item => ({ ...item, messages: state.sessions.find(current => current.sessionId === item.sessionId)?.messages || [] }));
  state.messengerSessions = messenger.sessions || [];
  if (!state.sessions.length) return createSession();
  if (state.activeKind === "messenger" && state.messengerSessions.some(item => item.sessionId === state.activeId)) return render();
  const next = state.sessions.some(item => item.sessionId === state.activeId) ? state.activeId : state.sessions[0].sessionId;
  return loadWorkspace(next);
}
async function updateSession(sessionId, changes) {
  state.sessionMenuId = null;
  await request(`/v1/workspaces/${encodeURIComponent(sessionId)}`, { method:"PATCH", body:JSON.stringify(changes) });
  await refreshSessions();
}
async function deleteSession(sessionId) {
  await request(`/v1/workspaces/${encodeURIComponent(sessionId)}`, { method:"DELETE" });
  if (state.activeId === sessionId) state.activeId = null;
  await refreshSessions();
}
function escape(text) { const node = document.createElement("div"); node.textContent = text; return node.innerHTML; }
const MARKDOWN_TAGS = ["p", "br", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "blockquote", "pre", "code", "strong", "em", "del", "a", "table", "thead", "tbody", "tr", "th", "td", "hr"];
const MARKDOWN_ATTRIBUTES = ["href", "title", "class"];

function neutralizeRawHtml(nodes = []) {
  const childKey = "to" + "kens";
  for (const node of nodes) {
    if (node.type === "html") {
      node.type = "text";
      node.text = escape(node.raw || node.text || "");
      delete node[childKey];
      continue;
    }
    if (Array.isArray(node[childKey])) neutralizeRawHtml(node[childKey]);
    if (Array.isArray(node.items)) for (const item of node.items) neutralizeRawHtml(item[childKey] || []);
  }
  return nodes;
}

function renderMarkdown(markdown) {
  if (!globalThis.marked?.lexer || !globalThis.DOMPurify) {
    const fallback = document.createElement("div");
    fallback.className = "response-prose";
    fallback.textContent = markdown;
    return fallback;
  }
  const nodes = neutralizeRawHtml(globalThis.marked.lexer(String(markdown || ""), { gfm:true }));
  const parsed = globalThis.marked.parser(nodes, { gfm:true });
  const clean = globalThis.DOMPurify.sanitize(parsed, {
    ALLOWED_TAGS: MARKDOWN_TAGS,
    ALLOWED_ATTR: MARKDOWN_ATTRIBUTES,
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[#/])/i
  });
  const content = document.createElement("div");
  content.className = "response-prose";
  content.innerHTML = clean;
  content.querySelectorAll("a[href]").forEach(link => {
    const href = link.getAttribute("href") || "";
    if (/^https?:/i.test(href)) {
      link.target = "_blank";
      link.rel = "noopener noreferrer nofollow";
    }
  });
  return content;
}

function renderMessages(messages, session, messenger) {
  messages.replaceChildren();
  if (!session.messages?.length) {
    const welcome = document.createElement("div");
    welcome.className = "welcome";
    welcome.innerHTML = `<img class="welcome-logo" src="/assets/gpao-t3-logo.jpeg" alt=""><h2>${messenger ? "메신저 대화" : "무엇을 함께 해볼까요?"}</h2><p>${messenger ? "연결된 메신저 대화를 여기서 이어갑니다." : "대화하듯 시작하면 필요한 모델과 도구를 연결합니다."}</p>${messenger ? "" : `<div class="welcome-suggestions"><button type="button" data-suggestion="오늘 해야 할 일을 정리해줘">오늘 해야 할 일을 정리해줘</button><button type="button" data-suggestion="최근 대화를 이어서 진행해줘">최근 대화를 이어서 진행해줘</button><button type="button" data-suggestion="문서를 읽고 핵심을 정리해줘">문서를 읽고 핵심을 정리해줘</button><button type="button" data-suggestion="시스템 상태를 확인해줘">시스템 상태를 확인해줘</button></div>`}`;
    messages.append(welcome);
    welcome.querySelectorAll("[data-suggestion]").forEach(button => button.addEventListener("click", () => { $("#message").value = button.dataset.suggestion; $("#message").focus(); }));
    return;
  }
  for (const item of session.messages) {
    const article = document.createElement("article");
    article.className = `message ${item.role === "user" ? "user" : "assistant"}`;
    const who = document.createElement("span");
    who.className = "who";
    who.textContent = item.role === "user" ? (messenger ? "상대방" : "나") : "GPAO-T3";
    article.append(who);
    if (item.role === "assistant") article.append(renderMarkdown(item.text));
    else {
      const body = document.createElement("div");
      body.className = "message-plain";
      body.textContent = item.text;
      article.append(body);
    }
    if (messenger && item.status) {
      const status = document.createElement("small");
      status.className = "message-state";
      status.textContent = item.status;
      article.append(status);
    }
    messages.append(article);
  }
}
function setCard(id, { tone = "", summary, detail }) {
  const card = $(`#${id}-card`);
  card.classList.remove("ok", "warn", "hold");
  if (tone) card.classList.add(tone);
  $(`#${id}-summary`).textContent = summary;
  $(`#${id}-detail`).textContent = detail;
}
function renderSessions() {
  const matchesSearch = item => !state.sessionSearch || `${item.title || ""} ${item.channelId || ""} ${item.peer?.id || ""}`.toLocaleLowerCase("ko").includes(state.sessionSearch);
  const visibleWorkspaces = state.sessions.filter(matchesSearch);
  const visibleMessengers = state.messengerSessions.filter(matchesSearch);
  const workRows = visibleWorkspaces.map(item => {
    const id = escape(item.sessionId);
    const menuOpen = state.sessionMenuId === item.sessionId;
    return `<div class="session-row ${item.pinned ? "pinned" : ""} ${menuOpen ? "menu-open" : ""}" aria-current="${state.activeKind === "workspace" && item.sessionId === state.activeId}"><button class="session" type="button" data-session-open="${id}" title="대화 열기">${escape(item.title)}</button><div class="session-actions"><button class="session-pin" type="button" data-session-pin="${id}" title="${item.pinned ? "고정 해제" : "대화 고정"}" aria-label="${item.pinned ? "고정 해제" : "대화 고정"}"><i data-lucide="${item.pinned ? "pin" : "pin"}" aria-hidden="true"></i></button><button class="session-more" type="button" data-session-menu="${id}" title="대화 관리" aria-label="대화 관리" aria-expanded="${menuOpen}"><i data-lucide="ellipsis" aria-hidden="true"></i></button></div><div class="session-context-menu" role="menu" ${menuOpen ? "" : "hidden"}><button type="button" role="menuitem" data-session-open="${id}"><i data-lucide="message-square" aria-hidden="true"></i><span>대화 열기</span></button><button type="button" role="menuitem" data-session-pin="${id}"><i data-lucide="${item.pinned ? "pin-off" : "pin"}" aria-hidden="true"></i><span>${item.pinned ? "고정 해제" : "대화 고정"}</span></button><button type="button" role="menuitem" data-session-rename="${id}" aria-label="이름 변경"><i data-lucide="pencil" aria-hidden="true"></i><span>이름 바꾸기</span></button><button type="button" role="menuitem" data-session-archive="${id}"><i data-lucide="archive" aria-hidden="true"></i><span>대화 보관</span></button><div class="session-context-separator"></div><button class="danger" type="button" role="menuitem" data-session-delete="${id}"><i data-lucide="trash-2" aria-hidden="true"></i><span>삭제</span></button></div></div>`;
  }).join("");
  const messengerRows = visibleMessengers.map(item => `<div class="session-row" aria-current="${state.activeKind === "messenger" && item.sessionId === state.activeId}"><button class="session" type="button" data-messenger-open="${escape(item.sessionId)}" title="메신저 대화 열기">${escape(`${item.channelId === "telegram" ? "Telegram" : item.channelId} · ${item.peer.id}`)}</button></div>`).join("");
  $("#sessions").innerHTML = `<h2 class="session-group-title">작업 대화</h2>${workRows || `<p class="session-group-empty">일치하는 대화 없음</p>`}<h2 class="session-group-title">메신저 대화</h2>${messengerRows || `<p class="session-group-empty">연결된 대화 없음</p>`}`;
  $("#sessions").querySelectorAll("[data-session-open]").forEach(button => button.addEventListener("click", () => loadWorkspace(button.dataset.sessionOpen)));
  $("#sessions").querySelectorAll("[data-messenger-open]").forEach(button => button.addEventListener("click", () => loadMessengerSession(button.dataset.messengerOpen)));
  $("#sessions").querySelectorAll("[data-session-pin]").forEach(button => button.addEventListener("click", () => { const item = state.sessions.find(entry => entry.sessionId === button.dataset.sessionPin); updateSession(item.sessionId, { pinned:!item.pinned }); }));
  $("#sessions").querySelectorAll("[data-session-menu]").forEach(button => button.addEventListener("click", event => { event.stopPropagation(); state.sessionMenuId = state.sessionMenuId === button.dataset.sessionMenu ? null : button.dataset.sessionMenu; renderSessions(); if (state.sessionMenuId) queueMicrotask(() => document.querySelector(".session-context-menu:not([hidden]) [role=menuitem]")?.focus()); }));
  $("#sessions").querySelectorAll("[data-session-rename]").forEach(button => button.addEventListener("click", () => openSessionDialog("rename", button.dataset.sessionRename)));
  $("#sessions").querySelectorAll("[data-session-archive]").forEach(button => button.addEventListener("click", () => updateSession(button.dataset.sessionArchive, { archived:true })));
  $("#sessions").querySelectorAll("[data-session-delete]").forEach(button => button.addEventListener("click", () => openSessionDialog("delete", button.dataset.sessionDelete)));
  refreshIcons($("#sessions"));
  positionSessionContextMenu();
}
function render() {
  const session = active();
  if (!session) return;
  if (state.panel.sessionId !== state.activeId) restorePanelForSession(state.activeId);
  const messenger = state.activeKind === "messenger";
  $("#chat-title").textContent = messenger ? `${session.channelId === "telegram" ? "Telegram" : session.channelId} · ${session.peer.id}` : session.title;
  renderSessions();
  const messages = $("#messages");
  renderMessages(messages, session, messenger);
  refreshIcons();
  messages.scrollTop = messages.scrollHeight;
}
async function request(path, init = {}) {
  const response = await fetch(path, { credentials:"same-origin", ...init, headers: { "content-type":"application/json", ...(init.headers || {}) } });
  const body = await response.json();
  if (response.status === 401 && !init.reconnected) {
    await fetch("/", { credentials:"same-origin", cache:"no-store" });
    return request(path, { ...init, reconnected:true });
  }
  if (!response.ok) {
    const error = new Error(body?.repairPlan?.detail || body?.message || "요청을 처리하지 못했습니다.");
    error.code = body?.code || null;
    error.repairPlan = body?.repairPlan || null;
    throw error;
  }
  return body;
}
async function refreshHealth() {
  try { const health = await request("/health"); $("#runtime-state").textContent = health.status === "ready" ? "런타임 준비됨" : "런타임 확인 필요"; }
  catch { $("#runtime-state").textContent = "연결을 확인하고 있습니다"; }
}
function connectionOverview(connections) {
  const ready = readyModels(connections);
  const externalReady = ready.filter(item => userFacingProvider(item.provider) && item.provider.id !== "local-ollama");
  const localReady = ready.some(item => item.provider.id === "local-ollama");
  const emulatorReady = ready.some(item => !userFacingProvider(item.provider));
  const selected = connections.defaultSelection;
  if (selected?.preferredProviderId) return { tone:"ok", summary:"기본 모델 선택됨", detail:`${selected.preferredProviderId} / ${selected.preferredModelId}` };
  if (externalReady.length) return { tone:"ok", summary:"외부 모델 연결됨", detail:`${externalReady[0].provider.display.name} 사용 가능` };
  if (localReady) return { tone:"hold", summary:"로컬 모델 사용 가능", detail:"외부 연결 없이 대화할 수 있습니다" };
  if (emulatorReady) return { tone:"hold", summary:"기본 응답 준비됨", detail:"실제 AI 답변을 받으려면 AI를 연결하세요" };
  return { tone:"warn", summary:"연결 필요", detail:"AI 연결에서 계정이나 키를 연결하세요" };
}
function updateComposerModelLabel(connections) {
  const ready = readyModels(connections).filter(item => userFacingProvider(item.provider));
  const selected = connections.defaultSelection;
  const selectedProvider = connections.providers.find(provider => provider.id === selected?.preferredProviderId);
  $("#composer-model-label").textContent = selected?.preferredModelId ? `${providerName(selectedProvider || { display:{ name:selected.preferredProviderId } })} · ${selected.preferredModelId}` : ready[0] ? `${providerName(ready[0].provider)} · ${ready[0].model.id}` : "AI 연결 필요";
}
function toolOverview(cells) {
  const list = cells?.cells || [];
  const usable = list.filter(cell => cell.seamlessState === "usable_read").length;
  const approval = list.filter(cell => cell.seamlessState === "approval_required").length;
  const setup = list.filter(cell => cell.seamlessState === "needs_setup_review").length;
  if (usable) return { tone:"ok", summary:`읽기 도구 ${usable}개`, detail:approval ? `승인 필요한 실행 ${approval}개` : "바로 쓸 수 있는 읽기 흐름" };
  if (approval || setup) return { tone:"hold", summary:"승인 후 사용", detail:`검토 필요한 연결 ${approval + setup}개` };
  return { tone:"warn", summary:"도구 확인 필요", detail:"도구 연결 상태를 불러오지 못했습니다" };
}
function memoryOverview(influence) {
  if (!influence) return { tone:"hold", summary:"확인 중", detail:"기억 상태를 불러오고 있습니다" };
  if (influence.activeCount > 0) return { tone:"ok", summary:`영향 ${influence.activeCount}개`, detail:`되돌림 ${influence.rolledBackCount || 0}개 · 자동 승격 없음` };
  return { tone:"hold", summary:"승인된 영향 없음", detail:"기억은 검토 전까지 답변 기준이 아닙니다" };
}
function recoveryOverview(doctor) {
  const recovery = doctor?.recovery || doctor;
  if (!recovery) return { tone:"hold", summary:"확인 중", detail:"복구 상태를 불러오고 있습니다" };
  if (recovery.status === "ready") return { tone:"ok", summary:"정상", detail:"알 수 없는 결과는 자동으로 반복하지 않습니다" };
  if (recovery.status === "review") return { tone:"hold", summary:"검토 필요", detail:`확인할 항목 ${recovery.summary?.review || recovery.nextActions?.length || 0}개` };
  return { tone:"warn", summary:"복구 필요", detail:"새 실행보다 복구 확인이 먼저입니다" };
}
async function refreshOperations() {
  const channelsRequest = request("/v1/channels").catch(() => null);
  try {
    const [connections, cells, tools, influence, memoryWiki, doctor] = await Promise.all([
      request("/v1/connection-center"),
      request("/v1/connection-cells"),
      request("/v1/tools"),
      request("/v1/context-influence"),
      request("/v1/memory-wiki"),
      request("/v1/doctor")
    ]);
    state.connections = connections;
    state.connectionCells = cells;
    state.tools = tools;
    state.influence = influence;
    state.memoryWiki = memoryWiki;
    state.doctor = doctor;
    updateComposerModelLabel(connections);
    setCard("model", connectionOverview(connections));
    setCard("tool", toolOverview(cells));
    setCard("memory", memoryOverview(influence));
    setCard("recovery", recoveryOverview(doctor));
    $("#runtime-state").textContent = doctor.status === "ready" ? "런타임 준비됨" : "런타임 확인 필요";
  } catch {
    setCard("model", { tone:"warn", summary:"확인 필요", detail:"연결 상태를 불러오지 못했습니다" });
    setCard("tool", { tone:"warn", summary:"확인 필요", detail:"도구 상태를 불러오지 못했습니다" });
    setCard("memory", { tone:"warn", summary:"확인 필요", detail:"기억 상태를 불러오지 못했습니다" });
    setCard("recovery", { tone:"warn", summary:"확인 필요", detail:"복구 상태를 불러오지 못했습니다" });
  }
  const channels = await channelsRequest;
  if (!channels) { $("#channel-shortcut-state").textContent = "상태 확인 필요"; return; }
  state.channels = channels;
  const telegram = channels.channels?.find(item => item.channelId === "telegram");
  $("#channel-shortcut-state").textContent = telegram?.connection?.state === "connected" ? "연결됨" : "연결 필요";
}
function providerState(provider) {
  if (provider.auth.state === "configured" && provider.health.state === "ready") return "연결됨";
  if (["verifying", "connecting"].includes(provider.connection?.state)) return "연결 확인 중";
  if (["expired", "auth_required"].includes(provider.connection?.state)) return "다시 연결 필요";
  if (provider.auth.state === "auth_required") return "연결 필요";
  return "현재 사용할 수 없음";
}
function providerName(provider) { return provider.display.name.replace(/\s*API$/i, ""); }
function providerDescription(provider) {
  return provider.display.description || "이 AI 서비스를 GPAO-T3에 안전하게 연결합니다.";
}
function connectionMethodLabel(authMethod) {
  if (authMethod === "api_key") return "API 키로 연결";
  if (authMethod === "oauth") return "계정으로 연결";
  if (authMethod === "local") return "로컬 모델 연결";
  return "연결";
}
function providerControls(provider) {
  const connected = provider.connection?.state === "ready" || (provider.auth.state === "configured" && provider.health.state === "ready");
  if (connected) {
    return `<div class="provider-actions"><button type="button" data-provider-refresh="${escape(provider.id)}">연결 확인</button><button type="button" class="subtle-action" data-provider-disconnect="${escape(provider.id)}">연결 해제</button></div>`;
  }
  return `<div class="provider-actions">${provider.display.authMethods.map(authMethod => `<button type="button" data-provider-connect="${escape(provider.id)}" data-auth-method="${escape(authMethod)}">${escape(connectionMethodLabel(authMethod))}</button>`).join("")}</div>`;
}
function connectionRecoveryMessage(error, providerNameText) {
  if (error?.repairPlan?.detail) return error.repairPlan.detail;
  if (["protected_connection_agent_unavailable", "protected_connection_unavailable"].includes(error?.code)) {
    return `${providerNameText} 연결을 시작할 준비가 아직 끝나지 않았습니다. GPAO-T3를 최신 상태로 유지한 뒤 다시 시도해 주세요.`;
  }
  if (["protected_connection_outcome_unknown", "external_outcome_unknown"].includes(error?.code)) {
    return "연결 결과를 확인하지 못했습니다. 같은 요청을 반복하지 않고, 잠시 후 연결 확인을 눌러 주세요.";
  }
  return `${providerNameText} 연결을 마치지 못했습니다. 잠시 후 다시 시도해 주세요.`;
}
function connectorState(connector, channel = null) {
  if (managedChannel(connector)) {
    if (channel?.connection?.state === "connected") return "연결됨";
    if (channel?.connection?.state === "unavailable") return "상태 확인 필요";
    return "연결 필요";
  }
  if (!localConnector(connector)) return "연결 준비 필요";
  if (!connector.enabled) return "사용 안 함";
  if (connector.health?.state === "ready") return "사용 중";
  return "사용 가능";
}
function cellState(cell) {
  if (cell.seamlessState === "usable_read") return "바로 읽기 가능";
  if (cell.seamlessState === "approval_required") return "승인 후 실행";
  if (cell.seamlessState === "needs_setup_review") return "설정 검토 필요";
  if (cell.seamlessState === "disabled") return "사용 안 함";
  if (cell.seamlessState === "degraded") return "상태 확인 필요";
  return "확인 중";
}
function connectorDescription(connector, channel = null) {
  if (managedChannel(connector)) {
    const username = channel?.connection?.bot?.username;
    return username ? `@${username} 계정으로 메시지를 주고받습니다.` : "Telegram Bot을 안전하게 연결해 전용 대화에서 메시지를 주고받습니다.";
  }
  return localConnector(connector) ? connector.description : "연결을 준비하는 동안 이 도구는 사용되지 않습니다.";
}
function connectorName(connector) { return connector.id === "mcp.external" ? "외부 도구 연결" : connector.name; }
function connectorControl(connector, channel = null) {
  if (managedChannel(connector)) {
    const connected = channel?.connection?.state === "connected";
    return `<div class="provider-actions"><button type="button" data-channel-connect="telegram">${connected ? "수신 확인" : "연결"}</button>${connected ? `<button type="button" class="subtle-action" data-channel-disconnect="telegram">연결 해제</button>` : ""}</div>`;
  }
  if (!localConnector(connector)) return `<span class="connector-note">준비 중</span>`;
  const action = connector.enabled ? "사용 안 함" : "사용";
  return `<label class="toggle-control"><input type="checkbox" data-connector="${escape(connector.id)}" ${connector.enabled ? "checked" : ""}><span aria-hidden="true"></span><b class="sr-only">${escape(connectorName(connector))} ${action}</b></label>`;
}
function connectionProposalText(proposals) {
  const labels = proposals.map(proposal => {
    if (proposal.providerId === "codex-oauth") return "ChatGPT / Codex";
    if (proposal.providerId === "openai") return "OpenAI";
    if (proposal.providerId === "anthropic") return "Claude";
    if (proposal.providerId === "google-gemini") return "Gemini";
    if (proposal.connectorId === "web.search") return "웹 검색";
    if (proposal.connectorId === "mcp.external") return "외부 도구";
    if (proposal.connectorId === "channel.telegram") return "Telegram";
    if (proposal.connectorId === "channel.document-export") return "문서 내보내기";
    return null;
  }).filter(Boolean);
  return labels.length ? `${labels.join(", ")} 연결을 준비할게요. 연결 정보를 검토한 뒤에만 사용할 수 있습니다.` : null;
}
async function proposeConnection(input) {
  const proposal = await request("/v1/connection-proposals", { method:"POST", body:JSON.stringify({ input }) });
  if (proposal.status === "not_supported") {
    return { text:"아직 지원되는 연결 항목에서 찾지 못했습니다. AI 연결에서 현재 연결할 수 있는 항목을 확인해 주세요.", proposal, openDialog:false };
  }
  if (proposal.status === "rejected" && proposal.reason === "secret_like_input") {
    return { text:"연결 정보는 대화에 입력하지 마세요. AI 연결 화면에서 안전하게 입력해 주세요.", proposal, openDialog:true };
  }
  if (proposal.status !== "proposed") return null;
  const text = connectionProposalText(proposal.proposals || []);
  if (!text) return null;
  return { text, proposal, openDialog:true };
}
function renderConnectors(connectors, channels = []) {
  const list = $("#connector-list");
  list.innerHTML = connectors.map(connector => {
    const channel = channels.find(item => `channel.${item.channelId}` === connector.id);
    const visibleState = managedChannel(connector) ? connectorState(connector, channel) : cellState(connector);
    return `<article class="connector-row ${localConnector(connector) || managedChannel(connector) ? "" : "needs-setup"}"><div><strong>${escape(connectorName(connector))}</strong><p>${escape(connectorDescription(connector, channel))}</p></div><div class="connector-state"><span>${escape(visibleState)}</span>${connectorControl(connector, channel)}</div></article>`;
  }).join("");
  list.querySelectorAll("input[data-connector]").forEach(input => input.addEventListener("change", () => setConnectorEnabled(input.dataset.connector, input.checked, input)));
  list.querySelectorAll("button[data-channel-connect]").forEach(button => button.addEventListener("click", () => connectOrPollChannel(button.dataset.channelConnect)));
  list.querySelectorAll("button[data-channel-disconnect]").forEach(button => button.addEventListener("click", () => disconnectChannel(button.dataset.channelDisconnect)));
}
function renderTools(tools) {
  const list = $("#tool-list");
  list.innerHTML = tools.map(tool => `<article class="connector-row"><div><strong>${escape(tool.id)}</strong><p>${escape(tool.effect === "read" ? "읽기 전용 · 자동 사전점검" : "실행 전 사용자 승인 필요")}</p></div><div class="connector-state"><span>${escape(tool.readiness === "ready" ? "사용 가능" : "사용 안 함")}</span><label class="toggle-control"><input type="checkbox" data-tool="${escape(tool.id)}" ${tool.readiness === "ready" ? "checked" : ""}><span aria-hidden="true"></span><b class="sr-only">${escape(tool.id)} 사용 설정</b></label></div></article>`).join("");
  list.querySelectorAll("input[data-tool]").forEach(input => input.addEventListener("change", () => setToolEnabled(input.dataset.tool, input.checked, input)));
}
async function setToolEnabled(toolId, enabled, input) {
  input.disabled = true;
  try { await request(`/v1/tools/${encodeURIComponent(toolId)}/enabled`, { method:"PUT", body:JSON.stringify({ enabled }) }); await refreshConnectors(); }
  catch { input.checked = !enabled; $("#connector-status").textContent = "도구 상태를 저장하지 못했습니다."; }
  finally { input.disabled = false; }
}
async function refreshConnectors() {
  const [payload, tools, channels] = await Promise.all([request("/v1/connection-cells"), request("/v1/tools"), request("/v1/channels")]);
  state.connectionCells = payload;
  state.tools = tools;
  state.channels = channels;
  const telegram = channels.channels?.find(item => item.channelId === "telegram");
  $("#channel-shortcut-state").textContent = telegram?.connection?.state === "connected" ? "연결됨" : "연결 필요";
  renderConnectors(Array.isArray(payload.cells) ? payload.cells.filter(cell => cell.kind !== "tool") : [], channels.channels || []);
  renderTools(tools.tools || []);
  setCard("tool", toolOverview(payload));
}
async function connectOrPollChannel(channelId) {
  const status = $("#connector-status");
  const current = state.channels?.channels?.find(item => item.channelId === channelId);
  status.textContent = current?.connection?.state === "connected" ? "새 메시지를 확인하고 있습니다." : "안전한 Telegram 연결 창을 열고 있습니다.";
  try {
    if (current?.connection?.state === "connected") {
      const result = await request(`/v1/channels/${encodeURIComponent(channelId)}/poll`, { method:"POST", body:"{}" });
      status.textContent = result.received ? `새 메시지 ${result.received}건을 전용 대화로 가져왔습니다.` : "새 Telegram 메시지가 없습니다.";
    } else {
      const result = await request(`/v1/channels/${encodeURIComponent(channelId)}`, { method:"POST", body:"{}" });
      status.textContent = result.connection?.state === "connected" ? "Telegram 연결을 확인했습니다." : "Telegram 연결 상태를 다시 확인해 주세요.";
    }
    await refreshConnectors(); await refreshOperations();
  } catch (error) { status.textContent = error.message || "Telegram 연결을 마치지 못했습니다. 복구 상태를 확인해 주세요."; }
}
async function disconnectChannel(channelId) {
  const status = $("#connector-status"); status.textContent = "Telegram 연결을 해제하고 있습니다.";
  try { await request(`/v1/channels/${encodeURIComponent(channelId)}`, { method:"DELETE" }); status.textContent = "Telegram 연결을 해제했습니다."; await refreshConnectors(); await refreshOperations(); }
  catch (error) { status.textContent = error.message || "Telegram 연결을 해제하지 못했습니다."; }
}
async function setConnectorEnabled(connectorId, enabled, input) {
  const status = $("#connector-status");
  input.disabled = true;
  status.textContent = "선택을 저장하고 있습니다.";
  try {
    const result = await request(`/v1/connectors/${encodeURIComponent(connectorId)}/enabled`, { method:"PUT", body:JSON.stringify({ enabled }) });
    status.textContent = result.connector?.enabled ? "이 도구를 사용할 수 있습니다." : "이 도구를 사용하지 않습니다.";
    await refreshConnectors();
    await refreshOperations();
  } catch {
    status.textContent = "선택을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.";
    await refreshConnectors().catch(() => { input.checked = !enabled; });
  } finally { input.disabled = false; }
}
function readyModels(connections) {
  return connections.providers.flatMap(provider => provider.auth.state === "configured" && provider.health.state === "ready"
    ? provider.models.map(model => ({ provider, model })) : []);
}
function routeStatusText(turn) {
  const route = turn?.providerRoute;
  if (!route?.providerId || !route?.modelId) return "";
  const fallback = route.fallbackUsed ? " · 안정적인 대체 연결 사용" : "";
  const tools = turn?.toolFlow?.state === "succeeded" ? ` · 검색 결과 ${turn.toolFlow.resultCount}건 반영` : "";
  return `답변 완료${tools}${fallback}`;
}
async function refreshConnections() {
  state.connections = await request("/v1/connection-center");
  const connections = state.connections;
  setCard("model", connectionOverview(connections));
  const ready = readyModels(connections).filter(item => userFacingProvider(item.provider));
  const select = $("#default-model");
  const selected = connections.defaultSelection;
  updateComposerModelLabel(connections);
  select.innerHTML = ready.length ? ready.map(({ provider, model }) => `<option value="${escape(`${provider.id}:${model.id}`)}" ${selected?.preferredProviderId === provider.id && selected?.preferredModelId === model.id ? "selected" : ""}>${escape(provider.display.name)} · ${escape(model.id)}</option>`).join("") : `<option value="">연결된 외부 모델이 없습니다</option>`;
  $("#save-default-model").disabled = ready.length === 0;
  $("#provider-list").innerHTML = connections.providers.filter(userFacingProvider).map(provider => `<article class="provider-row"><div><strong>${escape(providerName(provider))}</strong><p>${escape(providerDescription(provider))}</p></div><div class="provider-state"><span>${providerState(provider)}</span>${providerControls(provider)}</div></article>`).join("");
  $("#provider-list").querySelectorAll("button[data-provider-connect]").forEach(button => button.addEventListener("click", () => beginProviderConnection(button.dataset.providerConnect, button.dataset.authMethod)));
  $("#provider-list").querySelectorAll("button[data-provider-refresh]").forEach(button => button.addEventListener("click", () => refreshProviderConnection(button.dataset.providerRefresh)));
  $("#provider-list").querySelectorAll("button[data-provider-disconnect]").forEach(button => button.addEventListener("click", () => disconnectProvider(button.dataset.providerDisconnect)));
}
function renderMemoryLedger(influence) {
  $("#ledger-summary").innerHTML = [
    ["현재 영향", influence.activeCount],
    ["되돌림", influence.rolledBackCount],
    ["자동 승격", influence.durableMemoryPromotion ? "허용" : "차단"]
  ].map(([label, value]) => `<div class="metric"><span>${escape(label)}</span><strong>${escape(value)}</strong></div>`).join("");
  const entries = influence.entries || [];
  $("#ledger-list").innerHTML = entries.length ? entries.map(entry => {
    const active = entry.state === "applied";
    return `<article class="ledger-row"><div><strong>${escape(entry.useState === "answer_anchor" ? "답변 기준 영향" : "검토된 맥락")}</strong><p>${escape(entry.traceRef || entry.taskPacketId || entry.id)}</p></div><div class="ledger-actions"><span class="state-pill ${active ? "ok" : "warn"}">${escape(active ? "적용 중" : "되돌림")}</span>${active ? `<button class="rollback-button" type="button" data-rollback="${escape(entry.id)}">되돌리기</button>` : ""}</div></article>`;
  }).join("") : `<p class="empty-ledger">아직 다음 행동에 영향을 주는 승인된 맥락이 없습니다.</p>`;
  $("#ledger-list").querySelectorAll("button[data-rollback]").forEach(button => button.addEventListener("click", () => rollbackInfluence(button.dataset.rollback)));
}
function renderMemoryCandidates(memoryWiki) {
  const entries = memoryWiki?.entries || [];
  $("#memory-candidate-list").innerHTML = entries.length ? entries.map(entry => `<article class="ledger-row"><div><strong>${escape(entry.text.slice(0, 120))}</strong><p>${escape(entry.reviewState === "candidate" ? "검토 전 · 행동 영향 없음" : entry.reviewState === "reviewed" ? "검토됨 · 다음 사용 전 안전 확인" : "사용하지 않음")}</p></div><div class="ledger-actions"><span class="state-pill ${entry.reviewState === "reviewed" ? "ok" : "review"}">${escape(entry.reviewState === "candidate" ? "검토 필요" : entry.reviewState === "reviewed" ? "검토됨" : "거절됨")}</span>${entry.reviewState === "candidate" ? `<div><button class="rollback-button" type="button" data-memory-review="${escape(entry.id)}" data-decision="reviewed">승인</button> <button class="rollback-button" type="button" data-memory-review="${escape(entry.id)}" data-decision="rejected">거절</button></div>` : ""}</div></article>`).join("") : `<p class="empty-ledger">아직 검토할 기억 후보가 없습니다.</p>`;
  $("#memory-candidate-list").querySelectorAll("button[data-memory-review]").forEach(button => button.addEventListener("click", () => reviewMemoryCandidate(button.dataset.memoryReview, button.dataset.decision)));
}
async function reviewMemoryCandidate(id, decision) {
  $("#memory-status").textContent = "기억 후보의 사용 경계를 저장하고 있습니다.";
  try { await request(`/v1/memory-wiki/${encodeURIComponent(id)}/review`, { method:"POST", body:JSON.stringify({ decision, durablePromotion: decision === "reviewed" }) }); $("#memory-status").textContent = decision === "reviewed" ? "승인했습니다. 관련 대화에서 안전성이 확인된 뒤 사용됩니다." : "이 후보는 다음 행동에 사용하지 않습니다."; await refreshMemoryLedger(); }
  catch { $("#memory-status").textContent = "기억 후보 상태를 저장하지 못했습니다."; }
}
async function refreshMemoryLedger() {
  const [influence, memoryWiki] = await Promise.all([request("/v1/context-influence"), request("/v1/memory-wiki")]);
  state.influence = influence;
  state.memoryWiki = memoryWiki;
  renderMemoryLedger(influence);
  renderMemoryCandidates(memoryWiki);
  setCard("memory", memoryOverview(influence));
}
async function rollbackInfluence(id) {
  $("#memory-status").textContent = "영향을 되돌리고 있습니다.";
  try {
    const result = await request(`/v1/context-influence/${encodeURIComponent(id)}/rollback`, { method:"POST", body:JSON.stringify({ reason:"local_dashboard_requested" }) });
    $("#memory-status").textContent = result.rolledBack ? "이 영향은 다음 대화부터 사용하지 않습니다." : "이미 되돌렸거나 찾을 수 없습니다.";
    await refreshMemoryLedger();
  } catch {
    $("#memory-status").textContent = "되돌리지 못했습니다. 잠시 후 다시 확인해 주세요.";
  }
}
function nextActionLabel(action) {
  const labels = {
    open_connection_center: "AI 연결을 열어 상태를 확인하세요",
    restore_last_verified_snapshot: "마지막 정상 스냅샷으로 복구하세요",
    restart_runtime_or_run_doctor: "런타임을 다시 시작한 뒤 복구 상태를 확인하세요",
    restart_runtime_or_wait_for_worker_recovery: "잠시 기다린 뒤 런타임 상태를 다시 확인하세요",
    request_explicit_approval_before_external_action: "외부 실행 전 승인을 먼저 확인하세요",
    open_memory_ledger: "기억 장부를 열어 영향 항목을 확인하세요",
    disable_durable_memory_promotion: "자동 기억 승격을 끄고 장부를 확인하세요",
    open_local_dashboard: "대시보드를 다시 열어 세션을 갱신하세요",
    continue_to_distribution_gate: "다음 배포 단계에서 설치와 롤백을 검증하세요",
    keep_local_only_boundary: "로컬 권한 경계를 유지하세요",
    run_doctor_before_new_work: "새 작업 전에 복구 상태를 먼저 확인하세요"
  };
  return labels[action] || "복구 패널에서 상태를 확인하세요";
}
function renderRecovery(doctor) {
  const recovery = doctor.recovery || doctor;
  const items = recovery.items || [];
  const label = status => status === "ok" ? "정상" : status === "review" ? "검토" : "복구";
  $("#recovery-list").innerHTML = items.map(entry => `<article class="recovery-row"><div><strong>${escape(entry.title)}</strong><p>${escape(entry.detail)}${entry.nextAction && entry.nextAction !== "none" ? ` · 다음 행동: ${escape(nextActionLabel(entry.nextAction))}` : ""}</p></div><span class="state-pill ${escape(entry.status)}">${escape(label(entry.status))}</span></article>`).join("");
  $("#recovery-status").textContent = recovery.noAutomaticRetryForUnknownOutcome ? "알 수 없는 결과는 먼저 확인하고, 자동으로 반복하지 않습니다." : "";
}
async function refreshRecovery() {
  const recovery = await request("/v1/recovery");
  state.doctor = { ...(state.doctor || {}), recovery };
  renderRecovery({ recovery });
  setCard("recovery", recoveryOverview(recovery));
}
async function beginProviderConnection(providerId, authMethod) {
  const provider = state.connections?.providers.find(item => item.id === providerId);
  if (!provider) return;
  const status = $("#model-selection-status");
  status.textContent = `${providerName(provider)} 연결을 시작하고 있습니다.`;
  try {
    const result = await request(`/v1/connections/${encodeURIComponent(providerId)}`, { method:"POST", body:JSON.stringify({ authMethod }) });
    status.textContent = result.connection?.state === "ready" ? `${providerName(provider)} 연결을 확인했습니다.` : "연결을 계속 확인하고 있습니다. 잠시 후 연결 확인을 눌러 주세요.";
    await refreshConnections();
  } catch (error) { status.textContent = connectionRecoveryMessage(error, providerName(provider)); }
}
async function refreshProviderConnection(providerId) {
  const provider = state.connections?.providers.find(item => item.id === providerId);
  if (!provider) return;
  const status = $("#model-selection-status");
  status.textContent = `${providerName(provider)} 연결을 확인하고 있습니다.`;
  try {
    const result = await request(`/v1/connections/${encodeURIComponent(providerId)}/refresh`, { method:"POST", body:"{}" });
    status.textContent = result.connection?.state === "ready" ? `${providerName(provider)} 연결이 정상입니다.` : "연결 상태를 다시 확인해 주세요.";
    await refreshConnections();
  } catch (error) { status.textContent = connectionRecoveryMessage(error, providerName(provider)); }
}
async function disconnectProvider(providerId) {
  const provider = state.connections?.providers.find(item => item.id === providerId);
  if (!provider) return;
  const status = $("#model-selection-status");
  status.textContent = `${providerName(provider)} 연결을 해제하고 있습니다.`;
  try {
    await request(`/v1/connections/${encodeURIComponent(providerId)}`, { method:"DELETE" });
    status.textContent = `${providerName(provider)} 연결을 해제했습니다.`;
    await refreshConnections();
  } catch (error) { status.textContent = connectionRecoveryMessage(error, providerName(provider)); }
}
async function openConnectionCenter(target = "models") {
  $("#connection-dialog").showModal();
  $("#model-selection-status").textContent = "";
  $("#connector-status").textContent = "";
  const [connections, connectors] = await Promise.allSettled([refreshConnections(), refreshConnectors()]);
  if (connections.status === "rejected") $("#model-selection-status").textContent = "연결 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
  if (connectors.status === "rejected") $("#connector-status").textContent = "도구 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
  await refreshOperations().catch(() => {});
  const section = target === "tools" ? $(".tool-connections") : $(".default-model");
  section?.scrollIntoView({ block:"start" });
}
$("#models").addEventListener("click", () => openConnectionCenter("models"));
$("#top-new-chat").addEventListener("click", createSession);
$("#composer-model").addEventListener("click", () => openConnectionCenter("models"));
$("#composer-add").addEventListener("click", () => openConnectionCenter("tools"));
$("#channel-shortcut").addEventListener("click", () => openConnectionCenter("tools"));
$("#connections-shortcut").addEventListener("click", () => openConnectionCenter("tools"));
function openSettings() { if (!$("#settings-dialog").open) $("#settings-dialog").showModal(); }
$("#settings").addEventListener("click", openSettings);
$("#composer-settings").addEventListener("click", openSettings);
$("#close-settings").addEventListener("click", () => $("#settings-dialog").close());
document.querySelectorAll("[data-settings-target]").forEach(button => button.addEventListener("click", () => {
  const target = button.dataset.settingsTarget;
  $("#settings-dialog").close();
  if (["models", "tools"].includes(target)) return openConnectionCenter(target);
  if (target === "memory") return $("#memory").click();
  if (target === "recovery") return $("#status").click();
  if (target === "authority") { setPanelView("activity"); setPanelOpen(true); }
}));
$("#overview").addEventListener("click", () => { setPanelView("activity"); setPanelOpen(true); });
$("#panel-toggle").addEventListener("click", () => setPanelOpen(!state.panel.open));
$("#panel-close").addEventListener("click", () => setPanelOpen(false, { userClosed:true }));
$("#panel-backdrop").addEventListener("click", () => setPanelOpen(false, { userClosed:true }));
document.querySelectorAll("[data-panel-view]").forEach(button => button.addEventListener("click", () => setPanelView(button.dataset.panelView)));
$("#model-card").addEventListener("click", () => $("#models").click());
$("#tool-card").addEventListener("click", () => openConnectionCenter("tools"));
$("#open-tools").addEventListener("click", () => openConnectionCenter("tools"));
$("#close-connections").addEventListener("click", () => $("#connection-dialog").close());
$("#memory").addEventListener("click", async () => {
  $("#memory-dialog").showModal();
  $("#memory-status").textContent = "";
  try { await refreshMemoryLedger(); }
  catch { $("#memory-status").textContent = "기억 상태를 불러오지 못했습니다."; }
});
$("#memory-card").addEventListener("click", () => $("#memory").click());
$("#close-memory").addEventListener("click", () => $("#memory-dialog").close());
$("#status").addEventListener("click", async () => {
  $("#recovery-dialog").showModal();
  $("#recovery-status").textContent = "";
  try { await refreshRecovery(); }
  catch { $("#recovery-status").textContent = "복구 상태를 불러오지 못했습니다."; }
});
$("#recovery-card").addEventListener("click", () => $("#status").click());
$("#close-recovery").addEventListener("click", () => $("#recovery-dialog").close());
$("#save-default-model").addEventListener("click", async () => {
  const [providerId, modelId] = $("#default-model").value.split(":");
  if (!providerId || !modelId) return;
  try {
    await request("/v1/model-selection/default", { method:"PUT", body:JSON.stringify({ providerId, modelId }) });
    $("#model-selection-status").textContent = "이제 새 대화에서 이 모델을 기본으로 사용합니다.";
    await refreshConnections();
    await refreshOperations();
  } catch { $("#model-selection-status").textContent = "기본 모델을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요."; }
});
$("#new-chat").addEventListener("click", createSession);
function applyRailPreference() {
  const mobile = window.innerWidth <= 760;
  const collapsed = !mobile && localStorage.getItem("gpao-t3:rail-collapsed") === "true";
  $(".app-shell").classList.toggle("rail-collapsed", collapsed);
  $("#rail-collapse").setAttribute("aria-expanded", String(!collapsed));
  $("#rail-collapse").setAttribute("aria-label", mobile ? "대화 목록 닫기" : collapsed ? "사이드바 펼치기" : "사이드바 접기");
  $("#rail-collapse").setAttribute("title", mobile ? "대화 목록 닫기" : collapsed ? "사이드바 펼치기" : "사이드바 접기");
  $("#rail-collapse i, #rail-collapse svg")?.setAttribute("data-lucide", collapsed ? "panel-left-open" : "panel-left-close");
  refreshIcons($("#rail-collapse"));
}
$("#rail-collapse").addEventListener("click", () => {
  if (window.innerWidth <= 760) { closeSessionMenu(); return; }
  const collapsed = $(".app-shell").classList.toggle("rail-collapsed");
  localStorage.setItem("gpao-t3:rail-collapsed", String(collapsed));
  applyRailPreference();
});
function setSessionSearchOpen(open) {
  $("#session-search-wrap").hidden = !open;
  $("#session-search-toggle").setAttribute("aria-expanded", String(open));
  if (open) $("#session-search").focus();
  else { $("#session-search").value = ""; state.sessionSearch = ""; renderSessions(); }
}
$("#session-search-toggle").addEventListener("click", () => setSessionSearchOpen($("#session-search-wrap").hidden));
$("#session-search-close").addEventListener("click", () => setSessionSearchOpen(false));
$("#session-search").addEventListener("input", event => { state.sessionSearch = event.target.value.trim().toLocaleLowerCase("ko"); renderSessions(); });
$("#session-menu").addEventListener("click", () => {
  const open = $(".rail").classList.toggle("sessions-open");
  $("#session-backdrop").classList.toggle("open", open);
  $("#session-menu").setAttribute("aria-expanded", String(open));
});
$("#session-backdrop").addEventListener("click", closeSessionMenu);
$("#sessions").addEventListener("scroll", closeSessionContextMenu, { passive:true });
document.addEventListener("click", event => { if (!event.target.closest("[data-session-menu]") && !event.target.closest(".session-context-menu")) closeSessionContextMenu(); });
document.addEventListener("keydown", event => {
  const menu = document.querySelector(".session-context-menu:not([hidden])");
  if (menu && ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
    const items = [...menu.querySelectorAll('[role="menuitem"]:not([disabled])')];
    if (!items.length) return;
    event.preventDefault();
    const current = Math.max(0, items.indexOf(document.activeElement));
    const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : event.key === "ArrowDown" ? (current + 1) % items.length : (current - 1 + items.length) % items.length;
    items[next].focus();
    return;
  }
  const panel = $("#assistant-panel");
  if (event.key === "Tab" && panel.getAttribute("aria-modal") === "true") {
    const focusable = [...panel.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter(item => item.getClientRects().length > 0);
    if (!focusable.length) return;
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    return;
  }
  if (event.key === "Escape") {
    if (menu) closeSessionContextMenu();
    else if (panel.getAttribute("aria-modal") === "true") setPanelOpen(false, { userClosed:true });
  }
});
$("#close-session-dialog").addEventListener("click", closeSessionDialog);
$("#cancel-session-action").addEventListener("click", closeSessionDialog);
$("#confirm-session-action").addEventListener("click", async () => {
  const action = state.sessionAction;
  if (!action) return;
  $("#confirm-session-action").disabled = true;
  try {
    if (action.mode === "rename") {
      const title = $("#session-title-input").value.trim();
      if (!title) { $("#session-dialog-status").textContent = "대화 이름을 입력해 주세요."; return; }
      await updateSession(action.sessionId, { title });
    } else {
      await deleteSession(action.sessionId);
    }
    closeSessionDialog();
  } catch { $("#session-dialog-status").textContent = "변경을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요."; }
  finally { $("#confirm-session-action").disabled = false; }
});
$("#cancel-turn").addEventListener("click", async () => {
  if (!state.activeTurn) return;
  $("#cancel-turn").disabled = true;
  $("#turn-status").textContent = "응답을 중단하고 있습니다.";
  try { await request(state.activeTurn.cancelUrl, { method:"POST", body:"{}" }); }
  catch { $("#turn-status").textContent = "중단 결과를 확인하고 있습니다."; }
});
$("#composer").addEventListener("submit", async event => {
  event.preventDefault(); const input = $("#message").value.trim(); if (!input) return;
  const session = active(); session.messages ||= []; session.messages.push({ role:"user", text:input }); $("#message").value=""; render();
  if (state.activeKind === "messenger") {
    session.messages.pop(); state.pendingChannelSend = { sessionId:session.sessionId, text:input };
    $("#channel-send-preview").textContent = input; $("#channel-send-status").textContent = ""; $("#channel-send-dialog").showModal(); render(); return;
  }
  $("#send").disabled = true; $("#turn-status").textContent = "답변을 준비하고 있습니다.";
  setPanelActivity("요청을 확인하고 있습니다", "필요한 모델과 도구를 고르고 있습니다.", { notice:true });
  try {
    const connection = await proposeConnection(input);
    if (connection) {
      session.messages.push({ role:"assistant", text:connection.text }); render();
      if (connection.openDialog) {
        $("#connection-dialog").showModal();
        $("#model-selection-status").textContent = "연결할 항목을 확인한 뒤 진행해 주세요.";
        const [connections, connectors] = await Promise.allSettled([refreshConnections(), refreshConnectors()]);
        if (connections.status === "rejected") $("#model-selection-status").textContent = "연결 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
        if (connectors.status === "rejected") $("#connector-status").textContent = "도구 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
      }
      setPanelActivity("연결 확인이 필요합니다", "사용할 AI 또는 도구를 연결하면 대화를 이어갈 수 있습니다.", { notice:true, view:"tools" });
      $("#turn-status").textContent = "";
      return;
    }
    const acceptance = await request("/v2/os-turns", { method:"POST", body:JSON.stringify({ requestId:crypto.randomUUID(), sessionId:session.sessionId, input }) });
    state.activeTurn = acceptance;
    $("#cancel-turn").hidden = false;
    $("#cancel-turn").disabled = false;
    const turn = await awaitOsTurn(acceptance);
    await loadWorkspace(session.sessionId); $("#turn-status").textContent = turn.status === "completed" ? "답변 완료" : "복구 확인 필요"; await refreshOperations();
    if (turn.status === "cancelled") { $("#turn-status").textContent = "응답을 중단했습니다."; return; }
    if (turn.status !== "completed") throw new Error("요청을 끝내지 못했습니다. 문제 해결 보기에서 다음 행동을 확인해 주세요.");
  } catch (error) { const recovery = error.repairPlan ? `\n\n${error.repairPlan.title}\n${error.repairPlan.detail}\n${error.repairPlan.action}` : ""; session.messages.push({ role:"assistant", text:`지금은 요청을 끝내지 못했습니다.${recovery}` }); render(); $("#turn-status").textContent = ""; setPanelActivity("확인이 필요한 문제가 있습니다", "문제 해결 보기에서 원인과 다음 행동을 확인할 수 있습니다.", { notice:true, view:"recovery" }); }
  finally { state.activeTurn = null; $("#cancel-turn").hidden = true; $("#send").disabled = false; $("#message").focus(); }
});
$("#cancel-channel-send").addEventListener("click", () => { state.pendingChannelSend = null; $("#channel-send-dialog").close(); });
$("#confirm-channel-send").addEventListener("click", async () => {
  const pending = state.pendingChannelSend; if (!pending) return;
  $("#confirm-channel-send").disabled = true; $("#channel-send-status").textContent = "승인된 메시지를 전송하고 있습니다.";
  try {
    await request(`/v1/messenger/sessions/${encodeURIComponent(pending.sessionId)}/send`, { method:"POST", body:JSON.stringify({ text:pending.text, approved:true }) });
    state.pendingChannelSend = null; $("#channel-send-dialog").close(); await refreshSessions();
  } catch (error) { $("#channel-send-status").textContent = error.message || "전송 결과를 확인하지 못했습니다. 자동으로 다시 보내지 않습니다."; }
  finally { $("#confirm-channel-send").disabled = false; }
});
applyRailPreference();
refreshSessions().catch(() => createSession()).then(() => { refreshHealth(); refreshOperations(); });
const syncViewportHeight = () => document.documentElement.style.setProperty("--visual-viewport-height", `${window.visualViewport?.height || window.innerHeight}px`);
window.visualViewport?.addEventListener("resize", syncViewportHeight);
window.visualViewport?.addEventListener("scroll", syncViewportHeight);
window.addEventListener("resize", () => {
  syncViewportHeight();
  closeSessionContextMenu();
  applyRailPreference();
  renderPanelState();
});
syncViewportHeight();
refreshIcons();
