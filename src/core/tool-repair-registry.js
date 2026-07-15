const REPAIRS = Object.freeze({
  invalid_input: { id: "review_input", label: "입력 내용을 확인하세요", mode: "user_action", recoverable: true },
  not_installed: { id: "open_tool_catalog", label: "도구 목록에서 설치 상태를 확인하세요", mode: "user_action", recoverable: true },
  not_ready: { id: "run_tool_preflight", label: "도구 상태를 다시 확인하세요", mode: "safe_local", recoverable: true },
  authority_required: { id: "request_approval", label: "요청 내용을 확인하고 승인하세요", mode: "user_action", recoverable: true },
  dependency_missing: { id: "repair_dependency", label: "필요한 구성 요소를 복구하세요", mode: "safe_local", recoverable: true },
  permission_denied: { id: "open_permission_settings", label: "이 도구의 접근 권한을 확인하세요", mode: "user_action", recoverable: true },
  not_found: { id: "choose_existing_target", label: "대상을 다시 선택하세요", mode: "user_action", recoverable: true },
  conflict: { id: "refresh_and_review", label: "최신 상태를 확인한 뒤 다시 시도하세요", mode: "user_action", recoverable: true },
  rate_limited: { id: "wait_for_provider", label: "잠시 기다린 뒤 다시 시도하세요", mode: "wait", recoverable: true },
  timeout_before_effect: { id: "retry_bounded_local", label: "상태 확인 후 다시 시도하세요", mode: "safe_local", recoverable: true },
  outcome_unknown: { id: "reconcile_before_retry", label: "실행 결과를 확인한 뒤 다시 시도하세요", mode: "manual_review", recoverable: true },
  external_unavailable: { id: "check_connection", label: "연결 상태를 확인하세요", mode: "user_action", recoverable: true },
  content_blocked: { id: "review_content_policy", label: "요청 내용을 수정하세요", mode: "user_action", recoverable: true },
  execution_failed: { id: "run_tool_doctor", label: "도구 진단을 실행하세요", mode: "safe_local", recoverable: true }
});

export class ToolRepairRegistry {
  constructor({ entries = REPAIRS } = {}) { this.entries = new Map(Object.entries(entries)); }
  resolve(failureClass) { const repair = this.entries.get(failureClass); return repair ? Object.freeze({ ...repair }) : null; }
  coverage(failureClasses) {
    const unique = [...new Set(failureClasses)];
    const mapped = unique.filter(failureClass => this.entries.has(failureClass));
    const recoverable = mapped.filter(failureClass => this.entries.get(failureClass).recoverable);
    return { total: unique.length, mapped: mapped.length, recoverable: recoverable.length, mappingRate: unique.length ? mapped.length / unique.length : 1, recoverableRate: unique.length ? recoverable.length / unique.length : 1 };
  }
}

export const TOOL_FAILURE_CLASSES = Object.freeze(Object.keys(REPAIRS));
