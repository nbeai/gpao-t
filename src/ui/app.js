const storageKey = "gpao-t-native.sessions.v1";
const state = { sessions: JSON.parse(localStorage.getItem(storageKey) || "[]"), activeId: null, connections: null };
const $ = selector => document.querySelector(selector);
const localConnector = connector => connector.transport === "builtin";

function persist() { localStorage.setItem(storageKey, JSON.stringify(state.sessions)); }
function active() { return state.sessions.find(session => session.id === state.activeId); }
function createSession() {
  const session = { id: crypto.randomUUID(), title: "새 대화", messages: [] };
  state.sessions.unshift(session); state.activeId = session.id; persist(); render();
}
function escape(text) { const node = document.createElement("div"); node.textContent = text; return node.innerHTML; }
function render() {
  if (!state.activeId) createSession();
  const session = active();
  $("#chat-title").textContent = session.title;
  $("#sessions").innerHTML = state.sessions.map(item => `<button class="session" type="button" data-id="${item.id}" aria-current="${item.id === state.activeId}">${escape(item.title)}</button>`).join("");
  $("#sessions").querySelectorAll("button").forEach(button => button.addEventListener("click", () => { state.activeId = button.dataset.id; render(); }));
  const messages = $("#messages");
  messages.innerHTML = session.messages.length ? session.messages.map(item => `<article class="message ${item.role}"><span class="who">${item.role === "user" ? "나" : "GPAO-T"}</span>${escape(item.text)}</article>`).join("") : `<div class="welcome"><span class="mark" aria-hidden="true">∞</span><h2>무엇을 함께 해볼까요?</h2><p>대화를 시작하면 이 대화 안에서 필요한 맥락과 실행 흐름을 안전하게 정리합니다.</p></div>`;
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
function providerState(provider) {
  if (provider.auth.state === "configured" && provider.health.state === "ready") return "연결됨";
  if (["verifying", "connecting"].includes(provider.connection?.state)) return "연결 확인 중";
  if (["expired", "auth_required"].includes(provider.connection?.state)) return "다시 연결 필요";
  if (provider.auth.state === "auth_required") return "연결 필요";
  return "현재 사용할 수 없음";
}
function providerName(provider) { return provider.display.name.replace(/\s*API$/i, ""); }
function providerDescription(provider) {
  return provider.display.description || "이 AI 서비스를 GPAO-T에 안전하게 연결합니다.";
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
    return `${providerNameText} 연결을 시작할 준비가 아직 끝나지 않았습니다. GPAO-T를 최신 상태로 유지한 뒤 다시 시도해 주세요.`;
  }
  if (["protected_connection_outcome_unknown", "external_outcome_unknown"].includes(error?.code)) {
    return "연결 결과를 확인하지 못했습니다. 같은 요청을 반복하지 않고, 잠시 후 연결 확인을 눌러 주세요.";
  }
  return `${providerNameText} 연결을 마치지 못했습니다. 잠시 후 다시 시도해 주세요.`;
}
function connectorState(connector) {
  if (!localConnector(connector)) return "연결 준비 필요";
  if (!connector.enabled) return "사용 안 함";
  if (connector.health?.state === "ready") return "사용 중";
  return "사용 가능";
}
function connectorDescription(connector) {
  return localConnector(connector) ? connector.description : "연결을 준비하는 동안 이 도구는 사용되지 않습니다.";
}
function connectorName(connector) { return connector.id === "mcp.external" ? "외부 도구 연결" : connector.name; }
function connectorControl(connector) {
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
function renderConnectors(connectors) {
  const list = $("#connector-list");
  list.innerHTML = connectors.map(connector => `<article class="connector-row ${localConnector(connector) ? "" : "needs-setup"}"><div><strong>${escape(connectorName(connector))}</strong><p>${escape(connectorDescription(connector))}</p></div><div class="connector-state"><span>${connectorState(connector)}</span>${connectorControl(connector)}</div></article>`).join("");
  list.querySelectorAll("input[data-connector]").forEach(input => input.addEventListener("change", () => setConnectorEnabled(input.dataset.connector, input.checked, input)));
}
async function refreshConnectors() {
  const payload = await request("/v1/connectors");
  renderConnectors(Array.isArray(payload.connectors) ? payload.connectors : []);
}
async function setConnectorEnabled(connectorId, enabled, input) {
  const status = $("#connector-status");
  input.disabled = true;
  status.textContent = "선택을 저장하고 있습니다.";
  try {
    const result = await request(`/v1/connectors/${encodeURIComponent(connectorId)}/enabled`, { method:"PUT", body:JSON.stringify({ enabled }) });
    status.textContent = result.connector?.enabled ? "이 도구를 사용할 수 있습니다." : "이 도구를 사용하지 않습니다.";
    await refreshConnectors();
  } catch {
    status.textContent = "선택을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.";
    await refreshConnectors().catch(() => { input.checked = !enabled; });
  } finally { input.disabled = false; }
}
function readyModels(connections) {
  return connections.providers.flatMap(provider => provider.auth.state === "configured" && provider.health.state === "ready"
    ? provider.models.map(model => ({ provider, model })) : []);
}
async function refreshConnections() {
  state.connections = await request("/v1/connection-center");
  const connections = state.connections;
  const ready = readyModels(connections).filter(item => item.provider.id !== "gpao-t-emulator");
  const select = $("#default-model");
  const selected = connections.defaultSelection;
  select.innerHTML = ready.length ? ready.map(({ provider, model }) => `<option value="${escape(`${provider.id}:${model.id}`)}" ${selected?.preferredProviderId === provider.id && selected?.preferredModelId === model.id ? "selected" : ""}>${escape(provider.display.name)} · ${escape(model.id)}</option>`).join("") : `<option value="">연결된 외부 모델이 없습니다</option>`;
  $("#save-default-model").disabled = ready.length === 0;
  $("#provider-list").innerHTML = connections.providers.filter(provider => provider.id !== "gpao-t-emulator").map(provider => `<article class="provider-row"><div><strong>${escape(providerName(provider))}</strong><p>${escape(providerDescription(provider))}</p></div><div class="provider-state"><span>${providerState(provider)}</span>${providerControls(provider)}</div></article>`).join("");
  $("#provider-list").querySelectorAll("button[data-provider-connect]").forEach(button => button.addEventListener("click", () => beginProviderConnection(button.dataset.providerConnect, button.dataset.authMethod)));
  $("#provider-list").querySelectorAll("button[data-provider-refresh]").forEach(button => button.addEventListener("click", () => refreshProviderConnection(button.dataset.providerRefresh)));
  $("#provider-list").querySelectorAll("button[data-provider-disconnect]").forEach(button => button.addEventListener("click", () => disconnectProvider(button.dataset.providerDisconnect)));
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
$("#models").addEventListener("click", async () => {
  $("#connection-dialog").showModal();
  $("#model-selection-status").textContent = "";
  $("#connector-status").textContent = "";
  const [connections, connectors] = await Promise.allSettled([refreshConnections(), refreshConnectors()]);
  if (connections.status === "rejected") $("#model-selection-status").textContent = "연결 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
  if (connectors.status === "rejected") $("#connector-status").textContent = "도구 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
});
$("#close-connections").addEventListener("click", () => $("#connection-dialog").close());
$("#save-default-model").addEventListener("click", async () => {
  const [providerId, modelId] = $("#default-model").value.split(":");
  if (!providerId || !modelId) return;
  try {
    await request("/v1/model-selection/default", { method:"PUT", body:JSON.stringify({ providerId, modelId }) });
    $("#model-selection-status").textContent = "이제 새 대화에서 이 모델을 기본으로 사용합니다.";
    await refreshConnections();
  } catch { $("#model-selection-status").textContent = "기본 모델을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요."; }
});
$("#new-chat").addEventListener("click", createSession);
$("#status").addEventListener("click", async () => { await refreshHealth(); $("#turn-status").textContent = $("#runtime-state").textContent; });
$("#composer").addEventListener("submit", async event => {
  event.preventDefault(); const input = $("#message").value.trim(); if (!input) return;
  const session = active(); session.messages.push({ role:"user", text:input }); if (session.messages.length === 1) session.title = input.slice(0, 36); persist(); $("#message").value=""; render();
  $("#send").disabled = true; $("#turn-status").textContent = "GPAO-T가 답변을 준비하고 있습니다.";
  try {
    const connection = await proposeConnection(input);
    if (connection) {
      session.messages.push({ role:"assistant", text:connection.text }); persist(); render();
      if (connection.openDialog) {
        $("#connection-dialog").showModal();
        $("#model-selection-status").textContent = "연결할 항목을 확인한 뒤 진행해 주세요.";
        const [connections, connectors] = await Promise.allSettled([refreshConnections(), refreshConnectors()]);
        if (connections.status === "rejected") $("#model-selection-status").textContent = "연결 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
        if (connectors.status === "rejected") $("#connector-status").textContent = "도구 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
      }
      $("#turn-status").textContent = "";
      return;
    }
    const turn = await request("/v1/os-turns", { method:"POST", body:JSON.stringify({ requestId:crypto.randomUUID(), sessionId:session.id, input }) });
    const answer = turn.turn?.receipt?.result?.echo || "요청을 처리했습니다.";
    session.messages.push({ role:"assistant", text:answer }); persist(); render(); $("#turn-status").textContent = "";
  } catch (error) { const recovery = error.repairPlan ? `\n\n${error.repairPlan.title}\n${error.repairPlan.detail}\n${error.repairPlan.action}` : ""; session.messages.push({ role:"assistant", text:`지금은 요청을 끝내지 못했습니다.${recovery}` }); persist(); render(); $("#turn-status").textContent = ""; }
  finally { $("#send").disabled = false; $("#message").focus(); }
});
render(); refreshHealth();
