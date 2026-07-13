# GPAO-T Docker Install

Status: Phase 2 universal-distribution lane

Docker runs GPAO-T as an isolated local runtime with a dedicated state volume.
It does not migrate or carry a user's macOS live state by default.

## Build And Run

```sh
cp .env.example .env
docker compose up --build gpao-t
```

Runtime:

- port: `18799`
- state volume: `gpao_t_state`
- log volume: `gpao_t_logs`
- state env: `GPAO_T_STATE_DIR=/data/gpao-t`

## Health

```sh
docker compose ps gpao-t
curl -fsS http://127.0.0.1:18799/health
```

## Smoke Verification

Use the repository smoke runner before calling the Docker lane ready:

```sh
npm run docker:smoke
```

The runner checks the Docker contract files first:

- `Dockerfile`
- `docker-compose.yml`
- `.env.example`
- `.dockerignore`

If Docker CLI is available, it then runs:

- `docker compose config --quiet`
- `docker build -t nbeai/gpao-t:local .`
- `docker compose up --detach --build gpao-t`
- `docker compose ps gpao-t`
- `docker compose exec -T gpao-t node bin/gpao-t.js control serve-check`
- `docker compose down`

Status meanings:

| Status | Meaning |
| --- | --- |
| `ready` | Docker contract and runtime smoke passed |
| `blocked_environment` | Docker CLI is missing on the current machine |
| `blocked_contract` | required Docker files are missing |
| `blocked_smoke` | Docker exists, but build/up/health smoke failed |

On 2026-07-13, this Mac reports `blocked_environment` because Docker CLI is not
installed. That is an environment blocker, not a completed Docker runtime pass.

## Boundary

Docker is the universal reproducibility lane. macOS LaunchAgent installation is
the local-owner lane. Previous compatibility runtime state must be migrated only
through explicit installer or import tooling, never baked into the image.
