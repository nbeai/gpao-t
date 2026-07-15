const storageKey = "gpao-t-native.sessions.v1";
const state = { sessions: JSON.parse(localStorage.getItem(storageKey) || "[]"), activeId: null, connections: null };
const $ = selector => document.querySelector(selector);

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
  if (provider.connection?.state === "verifying") return "연결 확인 필요";
  if (provider.auth.state === "auth_required") return "연결 필요";
  return "현재 사용할 수 없음";
}
function providerAction(provider) {
  if (provider.id === "codex-oauth") return "Codex 로그인 확인";
  if (provider.display.authMethods.includes("api_key")) return provider.auth.state === "configured" ? "다시 연결" : "API 키 연결";
  return "상태 확인";
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
  $("#provider-list").innerHTML = connections.providers.filter(provider => provider.id !== "gpao-t-emulator").map(provider => `<article class="provider-row"><div><strong>${escape(provider.display.name)}</strong><p>${escape(provider.display.description)}</p></div><div class="provider-state"><span>${providerState(provider)}</span><button type="button" data-provider="${escape(provider.id)}">${providerAction(provider)}</button></div></article>`).join("");
  $("#provider-list").querySelectorAll("button[data-provider]").forEach(button => button.addEventListener("click", () => openProviderAction(button.dataset.provider)));
}
async function openProviderAction(providerId) {
  const provider = state.connections?.providers.find(item => item.id === providerId);
  if (!provider) return;
  if (provider.id === "codex-oauth") {
    $("#model-selection-status").textContent = "이 Mac의 Codex 로그인 상태를 확인하고 있습니다.";
    try {
      const result = await request("/v1/connections/codex-oauth/recheck", { method:"POST", body:"{}" });
      $("#model-selection-status").textContent = result.connection.state === "ready" ? "ChatGPT / Codex 연결을 확인했습니다." : "Codex 연결을 확인하지 못했습니다.";
      await refreshConnections();
    } catch (error) { $("#model-selection-status").textContent = error.message; }
    return;
  }
  if (!provider.display.authMethods.includes("api_key")) return;
  $("#api-provider-id").value = provider.id;
  $("#api-key-label").textContent = `${provider.display.name} API 키`;
  $("#api-key-input").value = "";
  $("#api-key-status").textContent = "키는 GPAO-T 기록에 남지 않습니다.";
  $("#api-key-form").hidden = false;
  $("#api-key-input").focus();
}
$("#models").addEventListener("click", async () => {
  $("#connection-dialog").showModal();
  $("#model-selection-status").textContent = "";
  try { await refreshConnections(); } catch { $("#model-selection-status").textContent = "연결 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."; }
});
$("#close-connections").addEventListener("click", () => $("#connection-dialog").close());
$("#save-default-model").addEventListener("click", async () => {
  const [providerId, modelId] = $("#default-model").value.split(":");
  if (!providerId || !modelId) return;
  try {
    await request("/v1/model-selection/default", { method:"PUT", body:JSON.stringify({ providerId, modelId }) });
    $("#model-selection-status").textContent = "이제 새 대화에서 이 모델을 기본으로 사용합니다.";
    await refreshConnections();
  } catch (error) { $("#model-selection-status").textContent = error.message; }
});
$("#api-key-form").addEventListener("submit", async event => {
  event.preventDefault();
  const providerId = $("#api-provider-id").value;
  const secret = $("#api-key-input").value;
  if (!providerId || !secret) return;
  const status = $("#api-key-status");
  status.textContent = "연결을 안전하게 확인하고 있습니다.";
  $("#save-api-key").disabled = true;
  try {
    await request(`/v1/connections/${encodeURIComponent(providerId)}/api-key`, { method:"PUT", body:JSON.stringify({ secret }) });
    $("#api-key-input").value = "";
    const verified = await request(`/v1/connections/${encodeURIComponent(providerId)}/verify`, { method:"POST", body:"{}" });
    status.textContent = verified.connection.state === "ready" ? "연결되었습니다. 이제 기본 모델로 선택할 수 있습니다." : "연결을 확인하지 못했습니다. 키와 연결 상태를 다시 확인해 주세요.";
    await refreshConnections();
  } catch (error) { $("#api-key-input").value = ""; status.textContent = error.message; }
  finally { $("#save-api-key").disabled = false; }
});
$("#new-chat").addEventListener("click", createSession);
$("#status").addEventListener("click", async () => { await refreshHealth(); $("#turn-status").textContent = $("#runtime-state").textContent; });
$("#composer").addEventListener("submit", async event => {
  event.preventDefault(); const input = $("#message").value.trim(); if (!input) return;
  const session = active(); session.messages.push({ role:"user", text:input }); if (session.messages.length === 1) session.title = input.slice(0, 36); persist(); $("#message").value=""; render();
  $("#send").disabled = true; $("#turn-status").textContent = "GPAO-T가 답변을 준비하고 있습니다.";
  try {
    const turn = await request("/v1/os-turns", { method:"POST", body:JSON.stringify({ requestId:crypto.randomUUID(), sessionId:session.id, input }) });
    const answer = turn.turn?.receipt?.result?.echo || "요청을 처리했습니다.";
    session.messages.push({ role:"assistant", text:answer }); persist(); render(); $("#turn-status").textContent = "";
  } catch (error) { const recovery = error.repairPlan ? `\n\n${error.repairPlan.title}\n${error.repairPlan.detail}\n${error.repairPlan.action}` : ""; session.messages.push({ role:"assistant", text:`지금은 요청을 끝내지 못했습니다.${recovery}` }); persist(); render(); $("#turn-status").textContent = ""; }
  finally { $("#send").disabled = false; $("#message").focus(); }
});
render(); refreshHealth();
