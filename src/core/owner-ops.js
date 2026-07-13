import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { runtimePaths } from "./storage.js";

const RECORD_FILE = "owner-ops/owner-ops-records.jsonl";

const INDUSTRIES = [
  {
    id: "restaurant_cafe",
    label: "음식점 / 카페",
    repeatedWork: ["리뷰 답변", "예약 문의", "단골 안내", "불만 응대", "메뉴/영업시간 안내"],
  },
  {
    id: "beauty_salon",
    label: "미용 / 네일 / 피부관리",
    repeatedWork: ["예약 문의", "시술 전 확인", "노쇼 방지 안내", "가격 안내", "후기 답변"],
  },
  {
    id: "academy_lesson",
    label: "학원 / 레슨 / 코칭",
    repeatedWork: ["상담 문의", "수업 일정 안내", "결석/보강 안내", "결제 전 확인", "학부모 응대"],
  },
  {
    id: "smartstore_shop",
    label: "쇼핑몰 / 스마트스토어",
    repeatedWork: ["배송 문의", "교환/환불 문의", "재입고 문의", "상품 정보 문의", "리뷰 답변"],
  },
  {
    id: "clinic_booking",
    label: "병원 / 상담 / 예약 기반 서비스",
    repeatedWork: ["예약 문의", "준비물 안내", "주의사항 안내", "상담 전 문진", "변경/취소 문의"],
  },
  {
    id: "studio_freelance",
    label: "공방 / 스튜디오 / 프리랜서",
    repeatedWork: ["견적 문의", "예약 가능일", "작업 범위 확인", "시안/수정 안내", "입금/납기 안내"],
  },
];

const AUTHORITY_LEVELS = [
  {
    id: "level_1_read_only",
    label: "보기만 함",
    allowed: true,
    userMeaning: "자료를 읽고 놓친 부분을 정리합니다.",
  },
  {
    id: "level_2_summarize",
    label: "요약함",
    allowed: true,
    userMeaning: "붙여넣은 내용이나 파일을 분류하고 요약합니다.",
  },
  {
    id: "level_3_draft",
    label: "초안 만듦",
    allowed: true,
    userMeaning: "사장님이 확인하고 쓸 수 있는 답변 초안을 만듭니다.",
  },
  {
    id: "level_4_approval_execute",
    label: "승인 후 실행",
    allowed: false,
    userMeaning: "외부 저장이나 전송은 아직 열지 않습니다.",
  },
  {
    id: "level_5_limited_auto",
    label: "조건부 자동 실행",
    allowed: false,
    userMeaning: "반복 자동 실행은 정책/권한/롤백 검증 전까지 잠급니다.",
  },
];

const WORKFLOWS = [
  {
    id: "review_reply",
    title: "리뷰 답변 도우미",
    industries: ["restaurant_cafe", "beauty_salon", "smartstore_shop"],
    inputSources: ["paste", "csv", "excel"],
    outputs: ["review_summary", "reply_drafts", "improvement_points"],
    authorityLevel: "level_3_draft",
    blockedActions: ["auto_post", "external_send", "delete", "refund"],
  },
  {
    id: "shopping_inquiry",
    title: "쇼핑몰 문의 분류",
    industries: ["smartstore_shop"],
    inputSources: ["paste", "csv", "excel"],
    outputs: ["inquiry_categories", "reply_drafts", "urgent_list"],
    authorityLevel: "level_3_draft",
    blockedActions: ["external_send", "refund", "cancel_order", "bulk_message"],
  },
  {
    id: "reservation_inquiry",
    title: "예약 문의 초안",
    industries: ["restaurant_cafe", "beauty_salon", "academy_lesson", "clinic_booking", "studio_freelance"],
    inputSources: ["paste"],
    outputs: ["reservation_check", "missing_questions", "reply_draft"],
    authorityLevel: "level_3_draft",
    blockedActions: ["external_send", "calendar_write", "payment", "booking_change"],
  },
];

const DEFAULT_INPUT = {
  review_reply:
    "음식은 맛있었는데 대기 시간이 너무 길었어요.\n사장님이 친절하고 커피가 정말 좋았습니다.\n위생이 조금 걱정됐어요. 다음에는 개선됐으면 좋겠습니다.",
  shopping_inquiry:
    "배송 언제 출발하나요?\n사이즈가 안 맞으면 교환 가능한가요?\n블랙 색상 재입고 언제 되나요?",
  reservation_inquiry:
    "이번 주 토요일 오후 3시에 네일 예약 가능한가요? 가격도 궁금해요.",
};

export function buildOwnerOpsSkillPack() {
  return {
    schema: "gpao_t.owner_ops_skill_pack.v0_1",
    status: "ready",
    id: "gpao-owner-ops-pack",
    title: "GPAO-T Owner Ops Pack",
    koreanNames: ["사장님 자동화 도우미", "사장님 업무판", "한국 자영업 운영팩"],
    targetUserProblem:
      "한국 자영업자와 1인/소규모 사업자가 반복 업무를 직접 자동화 도구로 설계하지 않아도, 사업 문제를 말하면 안전한 초안과 자동화 후보를 받아야 한다.",
    tcellPrinciple:
      "Owner Ops turns repeated business pressure into bounded automation candidates: business problem -> workflow candidate -> authority ladder -> local draft -> record -> replay/growth signal.",
    supportedIndustries: INDUSTRIES,
    workflows: WORKFLOWS,
    automationLadder: AUTHORITY_LEVELS,
    v01Policy: {
      allowedLevels: ["level_1_read_only", "level_2_summarize", "level_3_draft"],
      blockedLevels: ["level_4_approval_execute", "level_5_limited_auto"],
      connectorPolicy: "no_api_first_read_only_later",
      pluginPolicy: "package_after_skill_and_connector_replay",
    },
    outputArtifacts: [
      "automation_candidates",
      "workflow_preview",
      "reply_drafts",
      "local_record",
      "effect_replay_summary",
    ],
    qualityGates: [
      "사용자 화면은 자동화 용어보다 사업 문제 언어를 먼저 보여준다.",
      "외부 발송, 삭제, 결제, 환불, 대량 발송은 기본 잠금이다.",
      "각 workflow는 empty, malformed, long, sensitive input 상태를 가진다.",
      "초안은 사장님 확인 전제이며 고객에게 자동 전송되지 않는다.",
      "로컬 기록은 효과 측정과 다음 자동화 후보 제안에만 사용된다.",
    ],
    nextSafeAction:
      "Run owner-ops workflow for review_reply, shopping_inquiry, and reservation_inquiry before adding MCP/connectors.",
  };
}

export function buildOwnerOpsFieldCasebook() {
  return {
    schema: "gpao_t.owner_ops_field_casebook.v0_1",
    status: "ready",
    industries: INDUSTRIES.map((industry) => ({
      ...industry,
      safeStart: "붙여넣기/CSV/Excel 기반 요약과 초안 생성",
      firstAutomationCandidates: industry.repeatedWork.slice(0, 3),
      riskNotes: [
        "고객에게 바로 보내는 행동은 승인 전까지 차단한다.",
        "환불, 결제, 삭제, 대량 메시지는 v0.1에서 자동화하지 않는다.",
        "개인정보는 필요한 최소 맥락만 초안에 반영한다.",
      ],
    })),
    firstUserSentences: [
      "리뷰 답변이 밀려요.",
      "예약 문의가 계속 와서 놓쳐요.",
      "스마트스토어 문의를 분류하고 답장 초안을 만들고 싶어요.",
      "부정 리뷰만 따로 보고 싶어요.",
      "이번 주에 반복된 고객 불만을 보고 싶어요.",
    ],
    completionRule:
      "최소 6개 업종의 반복 업무, 안전 시작 단계, 금지 행동, 첫 입력 문장이 제품 언어로 설명되어야 한다.",
  };
}

export function buildOwnerOpsAuthorityMatrix() {
  return {
    schema: "gpao_t.owner_ops_authority_matrix.v0_1",
    status: "ready",
    automationLadder: AUTHORITY_LEVELS,
    allowedNow: [
      "local parsing",
      "local summary",
      "local draft",
      "local JSONL record",
      "local replay summary",
    ],
    reviewRequiredLater: [
      "connector credential setup",
      "read-only external account access",
      "saving draft to external workspace",
    ],
    blockedInV01: [
      "external send",
      "customer message send",
      "review posting",
      "payment",
      "refund",
      "deletion",
      "bulk messaging",
      "legal/tax final advice",
      "durable memory promotion",
      "live skill mutation",
    ],
  };
}

export function buildOwnerOpsFirstScenarios() {
  return {
    schema: "gpao_t.owner_ops_first_scenarios.v0_1",
    status: "ready",
    scenarios: WORKFLOWS.map((workflow) => ({
      id: workflow.id,
      title: workflow.title,
      firstInput: DEFAULT_INPUT[workflow.id],
      successPath:
        "사용자가 내용을 붙여넣으면 GPAO-T가 분류, 초안, 확인 필요 항목, 잠긴 행동, 로컬 기록 후보를 보여준다.",
      emptyState: "입력이 없으면 예시 입력과 필요한 자료를 사장님 언어로 안내한다.",
      malformedState: "줄이 섞이거나 형식이 이상하면 가능한 단위로 나누고 확인 필요 상태로 둔다.",
      sensitiveState: "전화번호, 계좌, 주민번호처럼 민감해 보이는 값은 기록/초안에서 주의 표시를 남긴다.",
      blockedActions: workflow.blockedActions,
    })),
  };
}

export function buildOwnerOpsAutomationCandidates({ request = "", businessType } = {}) {
  const text = String(request || "").trim();
  const detectedBusinessType = businessType || inferBusinessType(text);
  const candidates = WORKFLOWS
    .map((workflow) => ({
      ...workflow,
      score: scoreWorkflow({ workflow, text, businessType: detectedBusinessType }),
      reason: explainWorkflowFit({ workflow, text, businessType: detectedBusinessType }),
    }))
    .filter((workflow) => workflow.score > 0)
    .toSorted((a, b) => b.score - a.score)
    .slice(0, 3);

  const selected = candidates.length ? candidates : [WORKFLOWS[0]];

  return {
    schema: "gpao_t.owner_ops_automation_candidates.v0_1",
    status: "ready",
    request: text || "반복 업무를 자동화하고 싶어요.",
    detectedBusinessType,
    candidates: selected.map((workflow) => ({
      id: workflow.id,
      title: workflow.title,
      score: workflow.score || 1,
      reason: workflow.reason || ["safe_default_review_reply"],
      authorityLevel: workflow.authorityLevel,
      inputSources: workflow.inputSources,
      outputs: workflow.outputs,
      blockedActions: workflow.blockedActions,
      firstSafeStep: "붙여넣기 기반 로컬 요약/초안 생성",
    })),
    authorityBoundary: buildOwnerOpsAuthorityMatrix(),
    nextSafeAction: "Pick the top candidate and run a no-API workflow preview.",
  };
}

export function buildOwnerOpsWorkflowPreview({
  workflowType = "review_reply",
  inputText,
  businessType,
} = {}) {
  const workflow = WORKFLOWS.find((item) => item.id === workflowType) || WORKFLOWS[0];
  const sourceText = String(inputText || DEFAULT_INPUT[workflow.id] || "").trim();
  const lines = normalizeInputLines(sourceText);
  const sensitiveFindings = detectSensitiveSignals(sourceText);
  const output = buildWorkflowOutput({ workflow, lines, sourceText });

  return {
    schema: "gpao_t.owner_ops_workflow_preview.v0_1",
    status: lines.length ? "ready" : "empty",
    workflow: {
      id: workflow.id,
      title: workflow.title,
      businessType: businessType || inferBusinessType(sourceText),
      authorityLevel: workflow.authorityLevel,
      blockedActions: workflow.blockedActions,
    },
    input: {
      source: "local_text_only",
      lineCount: lines.length,
      preview: lines.slice(0, 5),
      sensitiveFindings,
    },
    output,
    userConfirmation: {
      message: "이 결과는 사장님 확인용 초안입니다. 고객에게 자동 전송하지 않습니다.",
      allowedNow: ["copy_draft", "local_record", "replay_summary"],
      stillLocked: workflow.blockedActions,
    },
    nextSafeAction: "If the preview fits the intent, write a local Owner Ops record.",
  };
}

export function writeOwnerOpsLocalRecord({
  root,
  workflowType = "review_reply",
  inputText,
  businessType,
  userDecision = "preview_accepted_for_local_record",
  now = new Date().toISOString(),
} = {}) {
  const preview = buildOwnerOpsWorkflowPreview({ workflowType, inputText, businessType });
  const record = {
    schema: "gpao_t.owner_ops_local_record.v0_1",
    id: buildRecordId(preview.workflow.id, now),
    createdAt: now,
    workflowType: preview.workflow.id,
    businessType: preview.workflow.businessType,
    inputSource: preview.input.source,
    generatedDraftCount: preview.output.drafts?.length || 0,
    reviewNeededCount: preview.output.reviewNeeded?.length || 0,
    acceptedCount: userDecision === "preview_accepted_for_local_record" ? 1 : 0,
    rejectedCount: userDecision === "rejected" ? 1 : 0,
    commonCorrections: preview.output.improvementPoints || [],
    nextAutomationCandidates: buildOwnerOpsAutomationCandidates({
      request: `${preview.workflow.businessType} ${preview.workflow.title}`,
      businessType: preview.workflow.businessType,
    }).candidates.map((candidate) => candidate.id),
    authorityLevel: preview.workflow.authorityLevel,
    userDecision,
    blockedActions: preview.workflow.blockedActions,
    replayReference: `owner_ops_replay.${preview.workflow.id}.${now}`,
    rollbackReference: "로컬 JSONL 기록만 남겼으므로 외부 되돌리기 작업은 없습니다.",
  };
  appendJsonlRecord(record, ownerOpsRecordPaths({ root }).recordFile);
  return {
    schema: "gpao_t.owner_ops_local_record_write.v0_1",
    status: "written_local_only",
    record,
    replay: buildOwnerOpsEffectReplay({ root }),
    boundaryState: {
      externalSend: false,
      connectorActivation: false,
      paymentRefundDeletion: false,
      localJsonlRecordWrite: true,
    },
  };
}

export function readOwnerOpsRecords({ root, limit = 50 } = {}) {
  return readJsonlRecords(ownerOpsRecordPaths({ root }).recordFile, limit);
}

export function buildOwnerOpsEffectReplay({ root } = {}) {
  const records = readOwnerOpsRecords({ root, limit: 100 });
  const workflowCounts = countBy(records, "workflowType");
  const draftCount = records.reduce((sum, record) => sum + (record.generatedDraftCount || 0), 0);
  const reviewNeeded = records.reduce((sum, record) => sum + (record.reviewNeededCount || 0), 0);

  return {
    schema: "gpao_t.owner_ops_effect_replay.v0_1",
    status: records.length ? "ready" : "empty",
    totalRecords: records.length,
    workflowCounts,
    draftCount,
    reviewNeeded,
    latestRecord: records[0] || null,
    weeklySummaryDraft: records.length
      ? [
          `이번 기록 기준으로 ${draftCount}개의 초안이 생성됐습니다.`,
          `${reviewNeeded}개 항목은 사장님 확인이 필요합니다.`,
          "외부 전송과 자동 실행은 열리지 않았습니다.",
        ]
      : ["아직 Owner Ops 로컬 기록이 없습니다."],
    nextGrowthCandidates: [
      "자주 반복되는 문의 유형을 업종별 템플릿으로 승격",
      "반복 수정되는 문장을 말투/응대 정책으로 저장 후보화",
      "read-only 커넥터가 필요한 입력 채널 식별",
    ],
  };
}

export function verifyOwnerOpsPack({ root } = {}) {
  const skillPack = buildOwnerOpsSkillPack();
  const casebook = buildOwnerOpsFieldCasebook();
  const authority = buildOwnerOpsAuthorityMatrix();
  const scenarios = buildOwnerOpsFirstScenarios();
  const previews = WORKFLOWS.map((workflow) =>
    buildOwnerOpsWorkflowPreview({ workflowType: workflow.id }));
  const findings = [];

  if (skillPack.id !== "gpao-owner-ops-pack") findings.push("skill_pack_id_missing");
  if (casebook.industries.length < 6) findings.push("field_casebook_needs_six_industries");
  if (scenarios.scenarios.length < 3) findings.push("first_scenarios_need_three_workflows");
  if (!authority.blockedInV01.includes("external send")) findings.push("external_send_not_blocked");
  if (previews.some((preview) => preview.status !== "ready")) findings.push("workflow_preview_not_ready");
  if (previews.some((preview) => !preview.userConfirmation.stillLocked.includes("external_send"))) {
    findings.push("external_send_not_locked_in_workflow");
  }
  if (buildOwnerOpsEffectReplay({ root }).schema !== "gpao_t.owner_ops_effect_replay.v0_1") {
    findings.push("effect_replay_missing");
  }

  return {
    schema: "gpao_t.owner_ops_pack_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedWorkflows: WORKFLOWS.map((workflow) => workflow.id),
    checkedBoundaries: authority.blockedInV01,
    nextSafeAction: findings.length
      ? "Fix findings before connecting Owner Ops Pack to MCP/connectors."
      : "Use no-API workflows in a first user scenario before adding read-only connectors.",
  };
}

function ownerOpsRecordPaths({ root } = {}) {
  const paths = runtimePaths({ root });
  return {
    ...paths,
    recordFile: resolve(paths.runtimeRoot, RECORD_FILE),
  };
}

function buildWorkflowOutput({ workflow, lines }) {
  if (!lines.length) {
    return {
      state: "empty",
      drafts: [],
      reviewNeeded: ["붙여넣을 리뷰, 문의, 예약 메시지를 먼저 넣어주세요."],
      improvementPoints: [],
    };
  }
  if (workflow.id === "shopping_inquiry") return buildShoppingInquiryOutput(lines);
  if (workflow.id === "reservation_inquiry") return buildReservationInquiryOutput(lines);
  return buildReviewReplyOutput(lines);
}

function buildReviewReplyOutput(lines) {
  const classified = lines.map((line, index) => {
    const sentiment = classifyReviewSentiment(line);
    return {
      id: `review.${index + 1}`,
      text: line,
      sentiment,
      urgency: /위생|아프|환불|컴플레인|불친절|화났|최악/.test(line) ? "review_needed" : "normal",
    };
  });
  return {
    state: "preview_ready",
    summary: {
      positive: classified.filter((item) => item.sentiment === "positive").length,
      negative: classified.filter((item) => item.sentiment === "negative").length,
      mixed: classified.filter((item) => item.sentiment === "mixed").length,
    },
    reviewNeeded: classified.filter((item) => item.urgency === "review_needed").map((item) => item.text),
    drafts: classified.map((item) => ({
      source: item.text,
      draft: buildReviewDraft(item),
    })),
    improvementPoints: [
      classified.some((item) => /대기|늦/.test(item.text)) ? "대기 시간 안내 문구 개선" : null,
      classified.some((item) => /위생|걱정/.test(item.text)) ? "위생 관련 내부 점검 필요" : null,
      classified.some((item) => /친절|좋/.test(item.text)) ? "긍정 리뷰에는 재방문 감사 문구 유지" : null,
    ].filter(Boolean),
  };
}

function buildShoppingInquiryOutput(lines) {
  const categories = lines.map((line, index) => ({
    id: `inquiry.${index + 1}`,
    text: line,
    category: classifyShoppingInquiry(line),
  }));
  return {
    state: "preview_ready",
    categories,
    reviewNeeded: categories
      .filter((item) => ["exchange_refund", "urgent_shipping"].includes(item.category))
      .map((item) => item.text),
    drafts: categories.map((item) => ({
      source: item.text,
      draft: buildShoppingDraft(item),
    })),
    improvementPoints: [
      "배송/교환/재입고 문의를 먼저 나누면 응대 시간이 줄어듭니다.",
      "환불/교환 정책은 자동 확정하지 말고 사장님 확인 상태로 둡니다.",
    ],
  };
}

function buildReservationInquiryOutput(lines) {
  const text = lines.join(" ");
  const missing = [];
  if (!/(월|화|수|목|금|토|일|오늘|내일|이번 주|다음 주|\d{1,2}일)/.test(text)) missing.push("희망 날짜");
  if (!/(오전|오후|\d{1,2}시)/.test(text)) missing.push("희망 시간");
  if (!/(명|분|인|사람)/.test(text)) missing.push("인원/대상");
  if (!/(가격|비용|얼마|메뉴|시술|수업|상담)/.test(text)) missing.push("서비스 종류 또는 가격 문의");
  return {
    state: "preview_ready",
    reservationCheck: {
      requestedDateOrTime: /(오전|오후|\d{1,2}시|이번 주|다음 주|오늘|내일)/.test(text),
      needsOwnerScheduleCheck: true,
    },
    reviewNeeded: ["실제 예약 가능 여부는 사장님 일정 확인이 필요합니다."],
    missingQuestions: missing,
    drafts: [
      {
        source: text,
        draft: `문의 감사합니다. 요청하신 일정은 확인 후 안내드리겠습니다.${missing.length ? ` 정확한 안내를 위해 ${missing.join(", ")}를 알려주시면 더 빠르게 도와드릴 수 있습니다.` : " 가능 여부와 상세 안내를 곧 전달드리겠습니다."}`,
      },
    ],
    improvementPoints: ["예약 가능 여부는 자동 확정하지 않고 확인 전 초안으로만 둡니다."],
  };
}

function classifyReviewSentiment(text) {
  const hasPositive = /맛있|친절|좋|추천|최고|만족|감사|깨끗/.test(text);
  const hasNegative = /별로|불친절|늦|차갑|실망|나쁨|아쉬|위생|걱정|기다/.test(text);
  if (hasPositive && hasNegative) return "mixed";
  if (hasPositive) return "positive";
  if (hasNegative) return "negative";
  return "mixed";
}

function buildReviewDraft(item) {
  if (item.sentiment === "positive") {
    return "소중한 리뷰 감사합니다. 만족하셨다니 정말 기쁩니다. 다음 방문에도 좋은 경험을 드릴 수 있도록 잘 준비하겠습니다.";
  }
  if (item.sentiment === "negative") {
    return "불편을 드려 죄송합니다. 남겨주신 내용을 확인해 개선하겠습니다. 정확한 상황을 한 번 더 확인한 뒤 더 나은 응대로 보답하겠습니다.";
  }
  return "소중한 의견 감사합니다. 좋았던 부분은 더 살리고, 아쉬웠던 부분은 확인해 개선하겠습니다.";
}

function classifyShoppingInquiry(text) {
  if (/배송|출발|도착|운송|택배/.test(text)) return /언제|급|오늘|내일/.test(text) ? "urgent_shipping" : "shipping";
  if (/교환|환불|반품|취소/.test(text)) return "exchange_refund";
  if (/재입고|품절|입고/.test(text)) return "restock";
  if (/사이즈|색상|소재|무게|길이|정보/.test(text)) return "product_info";
  return "general";
}

function buildShoppingDraft(item) {
  const drafts = {
    urgent_shipping: "문의 감사합니다. 배송 일정은 주문 정보를 확인한 뒤 정확히 안내드리겠습니다.",
    shipping: "문의 감사합니다. 배송 상태를 확인해 안내드리겠습니다.",
    exchange_refund: "문의 감사합니다. 교환/환불 가능 여부는 주문 상태와 상품 상태 확인 후 안내드리겠습니다.",
    restock: "문의 감사합니다. 재입고 일정은 확인 후 안내드리겠습니다.",
    product_info: "문의 감사합니다. 상품 정보를 확인해 자세히 안내드리겠습니다.",
    general: "문의 감사합니다. 확인 후 안내드리겠습니다.",
  };
  return drafts[item.category] || drafts.general;
}

function normalizeInputLines(text) {
  return String(text || "")
    .split(/\r?\n|•|-/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 100);
}

function detectSensitiveSignals(text) {
  const findings = [];
  if (/\d{2,3}-\d{3,4}-\d{4}/.test(text)) findings.push("phone_number_like");
  if (/\d{2,6}-\d{2,6}-\d{2,8}/.test(text)) findings.push("account_or_id_like");
  if (/\d{6}-\d{7}/.test(text)) findings.push("resident_id_like");
  return findings;
}

function inferBusinessType(text) {
  if (/리뷰|음식|카페|커피|맛|위생|대기/.test(text)) return "restaurant_cafe";
  if (/네일|미용|피부|시술/.test(text)) return "beauty_salon";
  if (/학원|수업|레슨|보강|학생|학부모/.test(text)) return "academy_lesson";
  if (/스마트스토어|쇼핑몰|배송|교환|환불|재입고|상품/.test(text)) return "smartstore_shop";
  if (/병원|상담|예약|진료/.test(text)) return "clinic_booking";
  if (/공방|스튜디오|촬영|프리랜서|견적/.test(text)) return "studio_freelance";
  return "unknown_owner_business";
}

function scoreWorkflow({ workflow, text, businessType }) {
  let score = workflow.industries.includes(businessType) ? 20 : 0;
  if (workflow.id === "review_reply" && /리뷰|후기|별점|불만|칭찬/.test(text)) score += 30;
  if (workflow.id === "shopping_inquiry" && /쇼핑몰|스마트스토어|배송|교환|환불|재입고|상품/.test(text)) score += 30;
  if (workflow.id === "reservation_inquiry" && /예약|문의|상담|가능|일정|시간/.test(text)) score += 30;
  if (/자동화|반복|밀려|놓쳐|답변|초안/.test(text)) score += 10;
  return score;
}

function explainWorkflowFit({ workflow, text, businessType }) {
  const reasons = [];
  if (workflow.industries.includes(businessType)) reasons.push("matched_business_type");
  if (scoreWorkflow({ workflow, text, businessType }) >= 30) reasons.push("matched_repeated_work_signal");
  if (/자동화|반복|밀려|놓쳐|답변|초안/.test(text)) reasons.push("matched_automation_pressure");
  return reasons;
}

function appendJsonlRecord(record, filePath) {
  mkdirSync(dirname(filePath), { recursive: true });
  const line = `${JSON.stringify(record)}\n`;
  const current = existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
  if (!record.id) {
    writeFileSync(filePath, `${line}${current}`, "utf8");
    return;
  }
  const remaining = current
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((item) => {
      try {
        return JSON.parse(item)?.id !== record.id;
      } catch {
        return true;
      }
    });
  writeFileSync(filePath, `${line}${remaining.join("\n")}${remaining.length ? "\n" : ""}`, "utf8");
}

function readJsonlRecords(filePath, limit) {
  if (!existsSync(filePath)) return [];
  return readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(0, limit)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function countBy(records, key) {
  return records.reduce((acc, record) => {
    const value = record[key] || "unknown";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function buildRecordId(workflowType, now) {
  return `owner_ops.${workflowType}.${now.replace(/[-:.TZ]/g, "").slice(0, 14)}`;
}
