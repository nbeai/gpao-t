# GPAO-T Runtime Heart - Provider/Auth Gate - 2026-07-13

Status: first Provider/Auth Heart gate added; Heart completion not claimed

## Scope

This pass starts `GPAO-T Runtime Heart Hardening` with the Provider/Auth Heart.

It does not claim full Provider/Auth Heart completion. It adds the first source-level contract, readback, and verification gate that prevents repeating the earlier failure where the dashboard opened but the model reply path failed with `missing-provider-auth`.

## Changed

- Added `src/core/provider-auth-heart.js`
  - Defines canonical GPAO-T auth store.
  - Inspects compatibility stores without reading or printing secret values.
  - Produces a gated repair plan.
  - Blocks completion language until fresh chat, UI, and log evidence exist.
- Added `test/provider-auth-heart.test.js`
  - Covers canonical store contract.
  - Covers repairable split state.
  - Covers metadata drift review instead of unsafe overwrite.
  - Covers CLI and gateway readback.
- Exported Provider/Auth Heart functions from `src/index.js`.
- Added CLI readback:
  - `gpao-t adapters provider-auth-heart`
  - `gpao-t adapters provider-auth-heart-check`
- Added gateway/control readback:
  - `/runtime/provider-auth-heart`
  - `/runtime/provider-auth-heart/verify`
- Added installer health signal:
  - `provider-auth-heart`

## Verification

Passed:

```text
node --check src/core/provider-auth-heart.js
node --check src/index.js
node --check src/core/control-center-serving.js
node --check src/core/gateway.js
node --check bin/gpao-t-full.js
node --check tools/gpao-t-local-install-lib.mjs
node --test test/provider-auth-heart.test.js
npm run check
```

Provider/Auth Heart unit result:

```text
5 tests passed
```

Current runtime readback:

```text
gpao-t adapters provider-auth-heart-check
status: ready
inventoryStatus: ready
repairPlanStatus: no_repair_needed
completionClaimAllowed: false
```

Secret-safety:

- No API key, OAuth token, or auth row value was printed.
- Evidence records only path presence, size, mtime, mode, and status.

## Live Health Note

Sandboxed Node fetch to `127.0.0.1:18799` fails with `EPERM`, so installer health must be run outside the sandbox for live loopback verification.

Escalated installer health showed:

- `health`: ok, HTTP 200
- `provider-auth-heart`: ok, inventory ready
- overall status: unhealthy because distribution verification found `compatibility/gpao-t/dist/probe-RjPH7tPP.js` metadata/SHA drift

This drift is not Provider/Auth Heart failure. It is a Doctor/Recovery Heart item and must be handled before a clean live/install seal.

## Completion Boundary

Allowed claim:

```text
Provider/Auth Heart first source gate and readback are implemented and verified.
```

Forbidden claim:

```text
Provider/Auth Heart is complete.
```

Full Provider/Auth Heart completion still requires:

- install/reinstall/repair scenario evidence
- dashboard opens without manual token
- provider health readback
- fresh chat turn
- post-repair gateway/error log window with no new `missing-provider-auth`

## Next

Continue with Provider/Auth Heart integration into install/reinstall/repair gates, then move into Doctor/Recovery Heart to handle live distribution drift and health signal consistency.
