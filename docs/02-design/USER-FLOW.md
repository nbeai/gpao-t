# User Flow

Map the first visible entry point, first workflow, result, and next action before implementation.

## First Visible Entry

The user opens the GPAO-T core work surface and sees a draft task input area rather than a dashboard-only status wall.

## First Workflow

1. User reads or edits the draft task request.
2. GPAO-T shows a preview thread and current task state without submitting anything.
3. User scans the read-only task understanding summary: understood work, context source, skill route, and execution boundary.
4. User opens native no-script readability details for the task brief, context/skill route, and authority boundary.
5. GPAO-T previews Context Mesh / Memory Wiki / T-cell candidates for the request.
6. GPAO-T previews Skill Pack routing and model/tool route intent.
7. GPAO-T shows authority/approval status and the closed execution boundary.
8. GPAO-T shows an execution proposal confirmation card before any future execution.
9. The card explains the proposed tool kind, action type, authority level, expected effect, risk, rollback reference, and required approval packet checks.
10. GPAO-T gives the next safe action.

## Current Result

The first slice is read-only and no-script. It now includes a compact task understanding summary plus native details/summary readability sections so the user can inspect the understood task, context/skill route, and authority boundary without submitting anything. It proves the work surface shape before live chat, external model connectors, tool execution, connector activation, durable memory promotion, self-growth apply, deployment, messenger, or automation exist.

## Next Action

The core work surface substrate is closed for the current read-only preview phase. The user can see the understood task, expected output, context to use, skill route, locked execution state, whether the preview is `의도와 맞음`, `수정 필요`, or `보류`, and what execution proposal would need confirmation before anything can run.

The current major axis is Execution Proposal Confirmation / Approval Packet Validation. The user should be able to inspect which model/skill/user-request output became an execution proposal, which product-language authority tier it belongs to, which approval packet fields are required, which validation rules would reject unsafe packets, and which audit/replay/rollback references must exist before future invocation. Authority levels use short Korean default labels: `읽기 전용`, `미리보기만`, `저장 전 확인`, `외부 전송 전 확인`, `되돌리기 어려움`, and `비용 발생 가능`.

Model output remains proposal material only. Actual tool/CLI/MCP execution, connector activation, external network/send, credential read/write, paid action, destructive action, approval record write, install/update/rollback, and durable memory promotion remain blocked.
