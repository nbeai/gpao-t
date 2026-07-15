const storageKey = "gpao-t-native.sessions.v1";
const state = { sessions: JSON.parse(localStorage.getItem(storageKey) || "[]"), activeId: null };
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
$("#new-chat").addEventListener("click", createSession);
$("#status").addEventListener("click", async () => { await refreshHealth(); $("#turn-status").textContent = $("#runtime-state").textContent; });
$("#composer").addEventListener("submit", async event => {
  event.preventDefault(); const input = $("#message").value.trim(); if (!input) return;
  const session = active(); session.messages.push({ role:"user", text:input }); if (session.messages.length === 1) session.title = input.slice(0, 36); persist(); $("#message").value=""; render();
  $("#send").disabled = true; $("#turn-status").textContent = "GPAO-T가 답변을 준비하고 있습니다.";
  try {
    const turn = await request("/v1/os-turns", { method:"POST", body:JSON.stringify({ requestId:crypto.randomUUID(), sessionId:session.id, input }) });
    const answer = turn.turn?.receipt?.result?.echo ? `연결 검증 응답입니다. ${turn.turn.receipt.result.echo}` : "요청을 처리했습니다.";
    session.messages.push({ role:"assistant", text:answer }); persist(); render(); $("#turn-status").textContent = "";
  } catch (error) { const recovery = error.repairPlan ? `\n\n${error.repairPlan.title}\n${error.repairPlan.detail}\n${error.repairPlan.action}` : ""; session.messages.push({ role:"assistant", text:`지금은 요청을 끝내지 못했습니다.${recovery}` }); persist(); render(); $("#turn-status").textContent = ""; }
  finally { $("#send").disabled = false; $("#message").focus(); }
});
render(); refreshHealth();
