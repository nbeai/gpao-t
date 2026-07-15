# GPAO-T Fresh Config Schema Fix - 2026-07-15

## Trigger

Tester reported that clean macOS install still failed during post-migration plugin verification:

```text
Post-migration plugin verification failed: GPAO-T config is invalid
Problem:
  - <root>: Invalid input
```

Independent reproduction showed that `buildFreshRuntimeConfig()` generated keys not accepted by the bundled runtime validator:

- top-level `gpaoTUpdate`
- `channels.telegram.botTokenRef`
- `channels.telegram.chatIdRef`
- `channels.telegram.userVisible`
- `channels.telegram.setupRoute`

## Fix

- `gpaoTUpdate` is no longer written to `~/.gpao-t/gpao-t.json`.
- GitHub update feed is supplied by LaunchAgent `GPAO_T_UPDATE_FEED_URL`.
- fresh Telegram config is reduced to `channels.telegram.enabled = false`.
- Telegram settings save writes only schema-valid runtime keys: `enabled`, `botToken`, and `chatId`.
- install normalization strips schema-invalid Telegram metadata from existing configs.
- regression test now validates generated fresh config with the packaged `gpao-t config validate` command.

## Verification

- Fresh generated config validated with packaged runtime:
  - `Config valid: <temp>/gpao-t.json`
- `node --test test/macos-installer.test.js test/settings-connection-hub.test.js test/update-boundary.test.js`
  - 20 pass / 0 fail
- `npm run check`
  - pass

## Current Valid Fresh Telegram Shape

```json
{
  "channels": {
    "telegram": {
      "enabled": false
    }
  }
}
```
