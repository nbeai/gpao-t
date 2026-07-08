# Recovery

If verification fails, enter recover mode before broad changes.

## Source Control / Rollback Substrate

GPAO-T is an independent local product repository. The local git repository is the first rollback substrate for source, docs, tests, schemas, fixtures, and command surfaces.

The source-controlled baseline must include product files only:

- `src/`, `bin/`, `test/`, `fixtures/`, `schema/`, and `docs/`
- `package.json`, `README.md`, `AGENTS.md`, and `.gitignore`
- source-controlled design, runtime, authority, verification, and recovery contracts

The baseline must not include local runtime or generated evidence:

- `.gpao-t/` runtime state, generated Control Center HTML, local memory candidates, audit logs, recovery history, growth proposals, install hardening records
- `.beai-harness/` session evidence, route/plan/closeout scratch state, local checkpoints
- `node_modules/`, coverage, build output, logs, and temporary files

Public GitHub push, deployment, package publication, installer execution, update execution, destructive rollback, external account setup, and secret storage remain out of scope until explicit approval.

Before interactive Control Center work, local serving, screenshot verification, packaging, connector activation, or install/update/rollback executors, run the repo checks and commit a known-good source baseline:

```sh
npm run verify
git status --short --ignored
git add .
git commit -m "chore: establish gpao-t local source baseline"
```

Recovery rule:

- If a future change breaks the source tree, inspect `git status` and `git diff` first.
- Revert only Codex-made changes that belong to the broken slice.
- Do not delete `.gpao-t/` local runtime state unless the user explicitly approves local state reset.
