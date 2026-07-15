import { buildOwnerOpsFirstOwnerScenarioFixture } from "./owner-ops-scenarios.js";
import {
  buildOwnerOpsInternalAcceptanceFeedbackForm,
  verifyOwnerOpsHostInternalAcceptanceHandoff,
} from "./owner-ops-alpha-handoff.js";

export function buildOwnerOpsSampleDataKit() {
  return {
    schema: "gpao_t.owner_ops_sample_data_kit.v0_1",
    status: "ready",
    title: "Owner Ops 사장님 수용 검토 샘플 데이터 키트",
    purpose:
      "실제 고객 개인정보를 넣기 전에 리뷰, 문의, 예약 흐름을 안전하게 체감하도록 만든 비식별 샘플 자료다.",
    samples: [
      {
        id: "smartstore_inquiry_csv",
        label: "스마트스토어 문의 CSV",
        workflowType: "shopping_inquiry",
        filename: "owner-ops-smartstore-sample.csv",
        content: "문의,상태\n배송 언제 출발하나요?,신규\n사이즈가 안 맞으면 교환 가능한가요?,신규\n오늘 주문하면 금요일 전에 받을 수 있나요?,신규\n",
      },
      {
        id: "review_reply_text",
        label: "리뷰 답변 텍스트",
        workflowType: "review_reply",
        filename: "owner-ops-review-sample.txt",
        content: "음식은 맛있었는데 대기 시간이 길었어요.\n친절했지만 포장이 조금 아쉬웠어요.\n다음에도 주문하고 싶어요.",
      },
      {
        id: "reservation_inquiry_text",
        label: "예약 문의 텍스트",
        workflowType: "reservation_inquiry",
        filename: "owner-ops-reservation-sample.txt",
        content: "이번 주 토요일 오후 3시에 네일 예약 가능한가요?\n가격과 소요 시간도 궁금합니다.",
      },
    ],
    redactionRules: [
      "실명, 전화번호, 주소, 계좌번호, 주문번호는 샘플로 바꾼다.",
      "민감한 고객 불만은 의미만 남기고 식별 가능한 상황 설명은 제거한다.",
      "실제 플랫폼 계정이나 API 키는 절대 넣지 않는다.",
      "첫 수용 검토는 반드시 샘플 데이터로 시작한다.",
    ],
    blockedActions: [
      "customer_message_send",
      "oauth_or_credentials",
      "payment_refund_delete",
      "background_automation",
      "public_market_publish",
    ],
  };
}

export function buildOwnerOpsOwnerAcceptanceGuide() {
  const scenario = buildOwnerOpsFirstOwnerScenarioFixture();
  const feedback = buildOwnerOpsInternalAcceptanceFeedbackForm();

  return {
    schema: "gpao_t.owner_ops_owner_acceptance_guide.v0_1",
    status: "ready",
    title: "Owner Ops 사장님 수용 검토 안내서",
    audience: ["한국 자영업자", "1인/소규모 사업 운영자", "AI 도구 초심자"],
    goal:
      "사장님이 샘플 또는 비식별 자료를 넣고, 분류와 답변 초안을 확인한 뒤, 고객에게 직접 보낼지 판단할 수 있게 한다.",
    firstScenario: scenario.scenario,
    ownerScript: [
      "오늘 밀린 문의를 붙여넣어 보세요.",
      "고객에게 바로 보내지 않습니다.",
      "먼저 분류하고, 답변 초안을 만들고, 확인용 기록만 남깁니다.",
      "초안이 마음에 들면 사장님이 직접 복사해서 고쳐 쓰면 됩니다.",
    ],
    acceptanceFlow: [
      "샘플 CSV 또는 비식별 문의를 붙여넣는다.",
      "문의 유형 분류와 답변 초안을 확인한다.",
      "환불/취소/외부 전송이 잠겨 있는지 확인한다.",
      "마음에 드는 초안과 마음에 들지 않는 초안을 표시한다.",
      "로컬 기록과 replay가 남는지 확인한다.",
    ],
    ownerQuestions: feedback.sections.flatMap((section) => section.questions).slice(0, 8),
    successSignals: [
      "사장님이 무엇을 붙여넣어야 하는지 바로 이해한다.",
      "초안 중 하나 이상을 실제 업무에 고쳐 쓸 수 있다고 말한다.",
      "자동 전송이 되지 않는다는 점을 명확히 이해한다.",
      "다음으로 본인 업종 템플릿이 필요하다는 구체적 요구가 나온다.",
    ],
    stopConditions: [
      "실제 고객 개인정보를 넣으려 한다.",
      "고객 자동 발송이나 리뷰 자동 게시를 요구한다.",
      "환불, 주문 취소, 결제 처리 자동화를 요구한다.",
      "사장님이 초안과 실제 전송의 차이를 이해하지 못한다.",
    ],
    stillBlocked: [
      "고객 자동 발송",
      "OAuth/API 계정 연결",
      "환불/취소/삭제",
      "반복 자동 실행",
      "공개 마켓 게시",
    ],
    nextSafeAction:
      "사장님 수용 피드백을 업종별 템플릿 후보와 owner-facing UX copy에 반영한 뒤, 필요한 감독형 검토를 반복한다.",
  };
}

export function verifyOwnerOpsOwnerAcceptanceReadiness({ root } = {}) {
  const internalAcceptance = verifyOwnerOpsHostInternalAcceptanceHandoff({ root });
  const kit = buildOwnerOpsSampleDataKit();
  const guide = buildOwnerOpsOwnerAcceptanceGuide();
  const findings = [];

  if (internalAcceptance.status !== "ready") findings.push("host_internal_acceptance_handoff_not_ready");
  if (kit.status !== "ready") findings.push("sample_data_kit_not_ready");
  if (guide.status !== "ready") findings.push("owner_acceptance_guide_not_ready");
  if (kit.samples.length < 3) findings.push("not_enough_sample_data");
  if (!kit.redactionRules.some((rule) => rule.includes("전화번호"))) findings.push("missing_pii_redaction_rule");
  if (!guide.stopConditions.some((condition) => condition.includes("개인정보"))) {
    findings.push("missing_owner_pii_stop_condition");
  }
  if (!guide.stillBlocked.includes("고객 자동 발송")) findings.push("missing_customer_send_block");

  return {
    schema: "gpao_t.owner_ops_owner_acceptance_readiness_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedSurfaces: [
      "host internal acceptance handoff",
      "sample data kit",
      "owner acceptance guide",
      "owner stop conditions",
      "blocked live actions",
    ],
    acceptanceStage: "owner_acceptance",
    publicRelease: "not_published",
    liveAccountConnection: "blocked",
    externalActionsRemainBlocked: true,
    nextSafeAction: findings.length
      ? "Fix owner acceptance readiness findings before inviting a real owner."
      : "Run one supervised owner acceptance with sample or de-identified data only; do not publish or connect live accounts.",
  };
}

// One-cycle API compatibility aliases. Canonical output remains internal-production terminology.
export const buildOwnerOpsFirstOwnerBetaGuide = buildOwnerOpsOwnerAcceptanceGuide;
export const verifyOwnerOpsFirstOwnerBetaReadiness = verifyOwnerOpsOwnerAcceptanceReadiness;
