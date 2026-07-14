# GPAO-T Native Runtime Lab

This is the isolated production-foundation lab for the second-generation GPAO-T
runtime. It is not the live GPAO-T product and must never share its state,
port, provider credentials, channels, or workspace.

Fixed boundaries:

- source: `/Users/jyp/Developer/gpao-t-native-runtime-lab`
- state: `~/.gpao-t-next` by default
- default HTTP port: `18899`
- comparison references: current GPAO-T and OpenClaw copies are read-only

The foundation uses only Node built-ins. It owns the canonical command/event/
outbox state, local owner authentication, bounded worker execution, generation
fencing, principal-scoped reads, progress SSE, and read-only doctor checks.
Providers, tools, MCP, Telegram, Context Mesh, memory, and self-growth are
later adapters and are deliberately not connected at this gate.

Run:

```sh
npm test
npm run check
npm start -- --state-dir "$HOME/.gpao-t-next" --port 18899
```

The owner token is generated at first boot and written only to
`~/.gpao-t-next/owner.token` with mode `0600`.
