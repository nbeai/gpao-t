const STATUS = {
  ready: { title: "연결되어 있습니다", action: "none", detail: "지금 바로 대화를 시작할 수 있습니다." },
  not_configured: { title: "사용할 AI 모델을 연결해 주세요", action: "open_connection_center", detail: "연결 센터에서 모델을 선택할 수 있습니다." },
  verifying: { title: "연결을 확인하고 있습니다", action: "wait_or_cancel", detail: "확인이 끝나면 바로 알려드립니다." },
  auth_required: { title: "연결 권한이 필요합니다", action: "reconnect_provider", detail: "연결 센터에서 다시 인증해 주세요." },
  expired: { title: "연결이 만료되었습니다", action: "reconnect_provider", detail: "다시 연결하면 이어서 사용할 수 있습니다." },
  rate_limited: { title: "잠시 사용량이 많습니다", action: "wait_or_choose_alternate", detail: "잠시 후 다시 시도하거나 다른 모델을 선택해 주세요." },
  provider_unavailable: { title: "현재 연결할 수 없습니다", action: "retry_or_view_status", detail: "GPAO-T가 연결 상태를 계속 확인하고 있습니다." },
  content_blocked: { title: "이 요청은 모델의 안전 기준으로 처리되지 않았습니다", action: "revise_request", detail: "표현을 바꿔 다시 요청하거나 다른 모델을 선택해 주세요." },
  outcome_unknown: { title: "요청 결과를 확인 중입니다", action: "reconcile_before_retry", detail: "중복 실행을 막기 위해 먼저 결과를 확인합니다." }
};

export function presentRuntimeStatus(state) {
  return { state, ...(STATUS[state] || STATUS.provider_unavailable) };
}
