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

## Boundary

Docker is the universal reproducibility lane. macOS LaunchAgent installation is
the local-owner lane. Previous compatibility runtime state must be migrated only
through explicit installer or import tooling, never baked into the image.
