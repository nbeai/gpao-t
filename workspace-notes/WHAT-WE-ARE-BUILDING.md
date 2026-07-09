# What We Are Building

GPAO-T is building a local, channel-agnostic personal AI operating system with a Codex-like work rhythm, OpenClaw-grade local runtime stability, and GPAO-owned Context Mesh / T-cell / Memory Wiki / authority / self-growth semantics.

## Current Phase

- Phase: model/router boundary read-only proof
- Surface: CLI, Gateway, Local Control Center adapter panel
- Status: first Model Router boundary contract implemented and verified without live provider execution

## Current User-Facing Goal

After the work surface understands and previews a task, the user should see which model path GPAO-T would choose, why that route fits the task, and which provider actions are still blocked.

The Model Router boundary now shows:

- route profile
- selected preview adapter
- provider boundary
- latency budget
- cost policy
- fallback chain
- blocked model actions
- audit/replay/rollback references

## Current Contract

- Model route schema: `gpao_t.model_route.v0_1`
- Model router boundary schema: `gpao_t.model_router_boundary.v0_1`
- Verification schema: `gpao_t.model_router_boundary_verification.v0_1`
- Surface: `read_only_router_contract`
- Live provider calls: `false`
- Credential access, network access, paid token spend, model output persistence, tool activation, and durable memory promotion: blocked

## Evidence

- `node bin/gpao-t.js adapters model-router-boundary "GPAO-T 작업 표면 preview를 라우팅해줘"`: returns read-only router contract.
- `node bin/gpao-t.js adapters model-router-boundary-check`: ready, no findings.
- `GET /adapters/model-router-boundary`: exposed through Gateway.
- `GET /adapters/model-router-boundary/verify`: exposed through Gateway.
- `control summary`: exposes `modelRouterProfiles`, `modelRouterBlockedActions`, and `modelRouterBoundary`.
- `npm run verify`: pass, 104 tests.
- `beai verify --cwd '/Users/jyp/Documents/Playground 2/gpao-t' --run --scenario --meaning`: ready/pass.

## User Authority

AI does local reversible implementation and verification. The user keeps authority over real provider setup, secrets, external model calls, token spend, connector/model/tool activation, installation, update, rollback, deployment, messenger, recurring automation, and product direction.
