# What We Are Building

GPAO-T is building a local, channel-agnostic personal AI operating system with a Codex-like work rhythm, OpenClaw-grade local runtime stability, and GPAO-owned Context Mesh / T-cell / Memory Wiki / authority / self-growth semantics.

## Current Phase

- Phase: Model Router replay/policy read-only proof
- Surface: CLI, Gateway, Local Control Center adapter panel
- Status: deeper Model Router policy contract implemented and verified without live provider execution

## Current User-Facing Goal

After the work surface understands and previews a task, the user should see not only which model path GPAO-T would choose, but why that route fits the request type, speed, quality, cost, risk, Context Mesh task-packet state, and fallback/failure condition.

The Model Router policy now shows:

- request-type route profiles
- speed / quality / cost / risk decision matrix
- Context Mesh task-packet model input candidate conditions
- fallback chain
- failure states
- model-output-to-tool boundary
- replay/audit criteria

## Current Contract

- Model router policy schema: `gpao_t.model_router_policy.v0_1`
- Verification schema: `gpao_t.model_router_policy_verification.v0_1`
- Surface: `read_only_replay_policy_contract`
- Model output is not action authority.
- Tool/CLI/MCP execution from model output is blocked.
- Replay/audit criteria are design-only and not invoked/written in this slice.
- Live provider calls, credentials, external network, paid token spend, output persistence, connector activation, and durable memory promotion: blocked

## Evidence

- `node bin/gpao-t.js adapters model-router-policy "후속 질문의 route policy를 보여줘"`: returns read-only router policy.
- `node bin/gpao-t.js adapters model-router-policy-check`: ready, no findings.
- `GET /adapters/model-router-policy`: exposed through Gateway.
- `GET /adapters/model-router-policy/verify`: exposed through Gateway.
- `control summary`: exposes `modelRouterProfiles`, `modelRouterFailureStates`, and `modelRouterReplayCriteria`.
- `npm run verify`: pass, 106 tests.
- `beai verify --cwd '/Users/jyp/Documents/Playground 2/gpao-t' --run --scenario --meaning`: ready/pass.

## User Authority

AI does local reversible implementation and verification. The user keeps authority over real provider setup, secrets, external model calls, token spend, connector/model/tool activation, installation, update, rollback, deployment, messenger, recurring automation, and product direction.
