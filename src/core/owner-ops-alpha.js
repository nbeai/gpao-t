import {
  buildOwnerOpsMarketListingDraft,
  buildOwnerOpsPluginPackageManifest,
  verifyOwnerOpsPluginPackage,
} from "./owner-ops-package.js";
import { buildOwnerOpsFirstOwnerScenarioFixture } from "./owner-ops-scenarios.js";

export function buildOwnerOpsTeamAlphaGuide() {
  const manifest = buildOwnerOpsPluginPackageManifest();
  const scenario = buildOwnerOpsFirstOwnerScenarioFixture();

  return {
    schema: "gpao_t.owner_ops_team_alpha_guide.v0_1",
    status: "ready",
    title: "Owner Ops 팀원 Alpha 테스트 안내서",
    packageId: manifest.packageId,
    audience: [
      "OpenClaw/Codex/Claude Code를 이미 쓰는 내부 팀원",
      "한국 자영업자 업무를 대신 관찰해 줄 수 있는 테스트 협력자",
    ],
    alphaGoal:
      "사장님 자동화 도우미가 실제 자영업자 언어, CSV/붙여넣기 자료, 안전한 초안, 로컬 기록, replay를 자연스럽게 이어 주는지 확인한다.",
    beforeStart: [
      "실제 고객 개인정보, 전화번호, 계좌, 민감한 주문 정보는 넣지 않는다.",
      "실제 고객에게 전송하지 않는다.",
      "OAuth/API 계정 연결을 시도하지 않는다.",
      "테스트 자료는 샘플 CSV나 비식별화된 붙여넣기 문장으로 시작한다.",
    ],
    happyPath: [
      {
        step: 1,
        label: "패키지 상태 확인",
        command: "node bin/gpao-t.js owner-ops plugin-package-check",
        expected: "status: ready, publicRelease: not_published",
      },
      {
        step: 2,
        label: "첫 사장님 시나리오 확인",
        command: "node bin/gpao-t.js owner-ops first-owner-scenario-check",
        expected: "스마트스토어 CSV 시나리오와 MCP smoke가 ready",
      },
      {
        step: 3,
        label: "샘플 workflow 보기",
        command:
          'node bin/gpao-t.js owner-ops workflow shopping_inquiry "배송 언제 출발하나요?\\n교환 가능한가요?"',
        expected: "문의 분류, 답변 초안, external_send 잠금 표시",
      },
      {
        step: 4,
        label: "로컬 기록과 replay 확인",
        command: "node bin/gpao-t.js owner-ops run-first-owner-scenario",
        expected: "written_local_only 기록과 replay totalRecords >= 1",
      },
      {
        step: 5,
        label: "MCP 서버 smoke",
        command: "node bin/gpao-t-owner-ops-mcp.js",
        expected: "initialize, tools/list, owner_ops.intake_preview 호출 가능",
      },
    ],
    testerQuestions: [
      "사장님 입장에서 무엇을 넣어야 하는지 바로 이해되는가?",
      "답변 초안이 실제 업무에 복사해 고칠 만한가?",
      "자동 전송되지 않는다는 점이 충분히 명확한가?",
      "결과가 마음에 안 들 때 보류/수정해야 한다는 느낌이 드는가?",
      "MCP로 연결했을 때 같은 도구처럼 느껴지는가?",
    ],
    acceptanceSignals: [
      "비개발자도 첫 시나리오의 목적을 1분 안에 설명할 수 있다.",
      "팀원이 고객 발송/환불/주문 취소가 잠겨 있음을 명확히 확인한다.",
      "샘플 자료로 초안과 replay가 재현된다.",
      "OpenClaw/Codex/Claude Code 중 최소 한 호스트에서 stdio MCP 등록 전 smoke를 이해한다.",
    ],
    blockedActions: manifest.authorityBoundary.blockedNow,
    firstScenario: scenario.scenario,
    nextSafeAction:
      "Alpha 피드백을 owner-facing UX copy와 first scenario fixture에 반영한 뒤, install/update/rollback packaging과 실제 host registration guide로 넘어간다.",
  };
}

export function buildOwnerOpsOwnerFacingUxCopy() {
  const listing = buildOwnerOpsMarketListingDraft();
  return {
    schema: "gpao_t.owner_ops_owner_facing_ux_copy.v0_1",
    status: "ready",
    title: "사장님 자동화 도우미",
    oneLine: "리뷰, 문의, 예약처럼 매일 반복되는 일을 먼저 초안으로 정리해 드립니다.",
    firstScreen: {
      headline: "오늘 밀린 문의를 붙여넣어 보세요.",
      subcopy:
        "고객에게 바로 보내지 않습니다. 먼저 분류하고, 답변 초안을 만들고, 사장님 확인용 기록만 남깁니다.",
      primaryAction: "샘플 문의로 시작",
      secondaryAction: "CSV 붙여넣기",
    },
    emptyState: {
      title: "아직 넣은 자료가 없습니다.",
      body: "리뷰, 배송 문의, 예약 문의를 복사해 붙여넣거나 CSV 내용을 넣으면 초안을 만들어 볼 수 있습니다.",
      example: "배송 언제 출발하나요?\n사이즈가 안 맞으면 교환 가능한가요?",
    },
    previewState: {
      title: "이렇게 처리될 예정입니다.",
      bullets: [
        "문의 유형을 먼저 나눕니다.",
        "바로 보낼 답장이 아니라 사장님 확인용 초안을 만듭니다.",
        "환불, 주문 취소, 외부 전송은 하지 않습니다.",
      ],
    },
    localRecordState: {
      title: "로컬 기록만 남겼습니다.",
      body: "이번 초안과 확인 필요 항목을 나중에 다시 볼 수 있게 로컬 기록으로만 저장했습니다.",
    },
    safetyLabels: [
      "자동 전송 안 함",
      "계정 연결 안 함",
      "환불/취소 안 함",
      "로컬 기록만",
    ],
    lockedActionCopy: {
      customer_message_send: "고객에게 보내기는 아직 잠겨 있습니다.",
      oauth_or_credentials: "외부 계정 연결은 아직 사용하지 않습니다.",
      payment_refund_delete: "결제, 환불, 삭제는 자동으로 하지 않습니다.",
      background_automation: "반복 자동 실행은 아직 켜지지 않습니다.",
    },
    trustNote: listing.safetyCopy,
    toneRules: [
      "전문 자동화 용어보다 사장님 업무 언어를 먼저 쓴다.",
      "불안하게 겁주는 문구보다 잠긴 행동을 차분히 보여준다.",
      "초안, 확인, 로컬 기록, 잠김 상태를 반복해서 일관되게 말한다.",
    ],
  };
}

export function verifyOwnerOpsTeamAlphaReadiness({ root } = {}) {
  const guide = buildOwnerOpsTeamAlphaGuide();
  const copy = buildOwnerOpsOwnerFacingUxCopy();
  const packageCheck = verifyOwnerOpsPluginPackage({ root });
  const findings = [];

  if (guide.status !== "ready") findings.push("guide_not_ready");
  if (copy.status !== "ready") findings.push("copy_not_ready");
  if (packageCheck.status !== "ready") findings.push("package_not_ready");
  if (guide.happyPath.length < 5) findings.push("alpha_happy_path_too_short");
  if (!copy.safetyLabels.includes("자동 전송 안 함")) findings.push("missing_customer_send_safety_label");
  if (!copy.lockedActionCopy.customer_message_send) findings.push("missing_customer_send_locked_copy");
  if (!guide.blockedActions.includes("customer_message_send")) findings.push("customer_send_not_blocked");
  if (guide.beforeStart.some((item) => /실제 고객에게 전송하지 않는다/.test(item)) !== true) {
    findings.push("missing_no_customer_send_instruction");
  }

  return {
    schema: "gpao_t.owner_ops_team_alpha_readiness_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedSurfaces: ["team alpha guide", "owner-facing UX copy", "plugin package", "first scenario"],
    publicRelease: "not_published",
    externalActionsRemainBlocked: true,
    nextSafeAction: findings.length
      ? "Fix alpha readiness findings before team handoff."
      : "Prepare local host registration guide and alpha feedback form; do not publish or connect live accounts yet.",
  };
}
