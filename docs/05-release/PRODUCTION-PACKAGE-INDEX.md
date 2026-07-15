# GPAO-T 0.1.0 Production Package Index

## Canonical Files

- Release guide: `docs/05-release/PRODUCTION-README.md`
- Distribution seal: `docs/03-verification/GPAO-T-PRODUCTION-DISTRIBUTION-SEAL-v1.0-ko.md`
- Install guide: `installer/README.md`
- Docker guide: `docs/05-release/INSTALL_DOCKER.md`
- Release contract: `config/gpao-t-release.json`

## Canonical Commands

```bash
npm run package:production
node tools/verify-gpao-t-production-distribution.mjs \
  --archive .gpao-t/releases/gpao-t-0.1.0.zip
npm run verify
npm run seal:identity
npm run seal:namespace
npm run seal:routes
npm run seal:live-patches
npm run seal:final
```

The final accepted status is `production_ready`. Distribution scope is recorded
separately as `internal`; it is never encoded as a test or candidate version.
