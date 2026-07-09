# Screen Map

List screens or command surfaces and what each one must make obvious.

Design reference bridge:

- Use `CODEX-LEVEL-DESIGN-REFERENCE.md` before first-production design readiness or work-chat UX hardening.
- Codex is a quality bar for clarity, rhythm, and product confidence, not a layout to copy.
- Use `CLAUDE-CODE-LEVEL-OPERATING-UX-REFERENCE.md` before first-production operating UX readiness, model/router work, connector/tool governance, approval UX, app-shell, packaged desktop, install/update/rollback, or automation work.
- Claude Code is a quality bar for permission, execution governance, multi-surface continuity, memory/instruction discipline, hooks, skills, MCP, and review-before-action, not a product to copy.

## Core Work Surface

- Purpose: the first place where a user can feel "I can ask GPAO-T to work from here."
- Must show: draft task input, preview thread, compact read-only task understanding summary, native no-script task readability details, confirmation card, first local draft preview, intent-match / needs-changes / hold confirmation flow, empty/blocked/review-needed preview states, execution proposal confirmation, approval packet validation summary, audit write design boundary, current task state, Context Mesh / Memory Wiki / T-cell preview, Skill Pack route preview, authority/approval summary, closed execution boundary, and next safe action.
- Must not show as available: live send, external model call, tool execution, connector activation, approval-record write, dry-run invocation, durable memory promotion, self-growth apply, deployment, messenger send, or recurring automation.

## Local Control Center

- Purpose: inspect GPAO-T runtime, context, recovery, growth, authority, approval/preview, and work-surface readiness.
- Must show: panel navigation, inspector evidence, Model Router boundary, mobile action visibility, authority boundary, and next safe action without script or external activation.

## Model Router Boundary

- Purpose: show how GPAO-T would choose a model path before any provider call exists.
- Must show: route profile, request-type policy, selected preview adapter, provider boundary, speed/quality/cost/risk criteria, latency budget, cost policy, fallback chain, failure states, Context Mesh task-packet candidate conditions, model-output-to-tool boundary, blocked model actions, and audit/replay/rollback references.
- Must not show as available: live provider call, credential access, network send, token spend, model output persistence, tool/CLI/MCP activation from model output, connector activation, or durable memory promotion.

## Connector / Tool Governance

- Purpose: show how model output can become a tool, CLI, MCP, or connector execution proposal before any invocation exists.
- Must show: execution candidate classes, selected candidate class, read-only / dry-run / write / external-send / destructive / paid authority tiers, proposal conditions, approval boundary, audit/replay/rollback references, OpenClaw-inspired substrate, GPAO-T authority precedence, blocked actions, and safety invariants.
- Must not show as available: actual tool execution, CLI command execution, MCP invocation, connector activation, external network/send, credential read/write, paid action, destructive action, approval record write, or durable memory promotion.

## Execution Approval

- Purpose: let the user confirm what is being proposed before any model/skill/tool output can become execution.
- Must show: proposal source, tool kind, action type, authority level, expected effect, risk, rollback reference, required approval packet fields, validation rules, planned audit items, audit/replay reference, blocked actions, and next safe action.
- Must show authority levels in Korean product language with icon, color, label, and short explanation: `읽기 전용`, `미리보기만`, `저장 전 확인`, `외부 전송 전 확인`, `되돌리기 어려움`, and `비용 발생 가능`.
- Must show audit write design in Korean product language: `기록 예정 항목`, `제안 ID`, `출처`, `요청 행동`, `권한 단계`, `예상 효과`, `위험`, `되돌리기 기준`, and `사용자 확인`.
- Must keep language calm and direct: risk is visible, but warnings should not read like a threat when the action is still only a preview.
- Must not show as available: actual tool execution, CLI/MCP invocation, connector activation, external network/send, credential read/write, paid action, destructive action, approval record write, audit write, durable memory promotion, or execution from model output.

## Browser-Local App Shell

- Purpose: prove the same read-only surfaces can be served through `127.0.0.1` before packaged desktop work.
- Must show: GET-only state, failure/recovery state, evidence inspection, and screenshot QA anchors.
