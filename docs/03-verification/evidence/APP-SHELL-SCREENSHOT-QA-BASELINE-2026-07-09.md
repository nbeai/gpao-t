# App Shell Screenshot QA Baseline - 2026-07-09

Status: ready

Target: `/app-shell` on local loopback preview.

Evidence files:
- Desktop viewport 1440x960: `docs/03-verification/evidence/app-shell-baseline-2026-07-09-desktop-viewport-1440x960.jpg`
- Mobile viewport 390x844: `docs/03-verification/evidence/app-shell-baseline-2026-07-09-mobile-viewport-390x844.jpg`
- Machine-readable report: `docs/03-verification/evidence/app-shell-screenshot-qa-baseline-2026-07-09.json`

Observed baseline signals:
- GET-only/read-mostly shell behavior was represented in the captured shell state.
- No external activation, script, form, or external link was observed.
- POST/non-GET blocking was represented by the serving contract and baseline report.
- Authority boundary, failure/recovery state, screenshot QA, panel navigation, and next safe action were visible.
- Mobile fixed topbar action/panel line was visible without topbar overlap or horizontal overflow.

Desktop result:
```json
{
  "appShellMarker": "browser-local",
  "authorityBoundaryVisible": true,
  "evidenceInspectors": 9,
  "externalLinks": [],
  "failureRecoveryStates": 9,
  "hasForm": false,
  "hasScript": false,
  "interactionMode": "read-mostly-get",
  "label": "desktop",
  "mobileFixedTopbarActionLineVisible": true,
  "nextSafeActionVisible": true,
  "noHorizontalOverflow": true,
  "noTopbarOverlap": true,
  "nonblankViewport": true,
  "panelCount": 9,
  "panelNavigationVisible": true,
  "screenshotQaVisible": true,
  "target": "/app-shell",
  "title": "GPAO-T Browser-Local App Shell",
  "viewport": {
    "height": 960,
    "width": 1440
  },
  "file": "/Users/jyp/Documents/Playground 2/gpao-t/docs/03-verification/evidence/app-shell-baseline-2026-07-09-desktop-viewport-1440x960.jpg"
}
```

Mobile result:
```json
{
  "appShellMarker": "browser-local",
  "authorityBoundaryVisible": true,
  "evidenceInspectors": 9,
  "externalLinks": [],
  "failureRecoveryStates": 9,
  "hasForm": false,
  "hasScript": false,
  "interactionMode": "read-mostly-get",
  "label": "mobile",
  "mobileFixedTopbarActionLineVisible": true,
  "nextSafeActionVisible": true,
  "noHorizontalOverflow": true,
  "noTopbarOverlap": true,
  "nonblankViewport": true,
  "panelCount": 9,
  "panelNavigationVisible": true,
  "screenshotQaVisible": true,
  "target": "/app-shell",
  "title": "GPAO-T Browser-Local App Shell",
  "viewport": {
    "height": 844,
    "width": 390
  },
  "file": "/Users/jyp/Documents/Playground 2/gpao-t/docs/03-verification/evidence/app-shell-baseline-2026-07-09-mobile-viewport-390x844.jpg"
}
```
