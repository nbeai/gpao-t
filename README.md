# GPAO-T3 Foundation Runtime

This is the independent production foundation for GPAO-T3. It is not the live
GPAO-T product and must never share its state,
port, provider credentials, channels, or workspace.

Fixed boundaries:

- source: `/Users/jyp/Developer/gpao-t-native-runtime-research/runtime-lab`
- state: `~/.gpao-t3` by default
- default HTTP port: `18899`
- comparison references: external reference copies are read-only

The foundation uses only Node built-ins. It owns the canonical command/event/
outbox state, local owner authentication, bounded worker execution, generation
fencing, principal-scoped reads, progress SSE, and read-only doctor checks.
Providers, tools, MCP, Telegram, Context Mesh, memory, and self-growth are
later adapters and are deliberately not connected at this gate.

Run:

```sh
npm test
npm run check
npm start -- --state-dir "$HOME/.gpao-t3" --port 18899
```

The owner token is generated at first boot and written only to
`~/.gpao-t3/owner.token` with mode `0600`.

Native package verification:

```sh
npm run package:release
npm run release:smoke
```

State is always isolated. Stop the runtime before snapshot, migration, or
restore:

```sh
node src/index.js snapshot --state-dir "$HOME/.gpao-t3" --label before-update
node src/index.js migrate --state-dir "$HOME/.gpao-t3"
node src/index.js restore --state-dir "$HOME/.gpao-t3" --snapshot <snapshot-directory>
```
