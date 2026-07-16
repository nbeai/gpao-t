param(
  [Parameter(Mandatory = $true)][string]$Bundle,
  [Parameter(Mandatory = $true)][string]$TransformersRoot,
  [Parameter(Mandatory = $true)][string]$Receipt
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $Bundle -PathType Leaf)) { throw "Conditional embedding bundle is missing: $Bundle" }
if (-not (Test-Path -LiteralPath $TransformersRoot -PathType Container)) { throw "Transformers runtime root is missing: $TransformersRoot" }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js is required for the Windows native smoke" }
if (-not (Get-Command tar -ErrorAction SilentlyContinue)) { throw "Windows tar support is required for the offline bundle smoke" }

$tool = Join-Path $PSScriptRoot "qualify-mct-r5s1-offline-smoke.mjs"
node $tool --bundle $Bundle --transformers-root $TransformersRoot --receipt $Receipt
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
