param(
  [ValidateSet("Install", "Start", "Stop", "Repair", "Uninstall", "Status")]
  [string]$Mode = "Install",
  [int]$Port = 18799,
  [string]$StateHome = "",
  [string]$UpdateFeedUrl = "",
  [switch]$DryRun,
  [switch]$KeepUserData
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version 2.0

$PackageVersion = "@@PACKAGE_VERSION@@"
$PackageArchitecture = "@@PACKAGE_ARCH@@"
$DefaultUpdateFeedUrl = "https://github.com/nbeai/gpao-t/releases/latest/download/gpao-t-update.json"
$TaskName = "nBeAI GPAO-T"

function Get-EnvOrDefault([string]$Name, [string]$Fallback) {
  $value = [Environment]::GetEnvironmentVariable($Name, "Process")
  if ([string]::IsNullOrWhiteSpace($value)) { return $Fallback }
  return $value
}

function Write-Step([string]$Message) {
  Write-Host "[GPAO-T] $Message"
}

function Fail([string]$Message) {
  Write-Error $Message
  exit 1
}

function Resolve-PackageRoot {
  $root = [Environment]::GetEnvironmentVariable("GPAO_T_PACKAGE_ROOT", "Process")
  if ([string]::IsNullOrWhiteSpace($root)) {
    $root = Join-Path $PSScriptRoot "..\.."
  }
  return (Resolve-Path $root).Path
}

function New-HexToken {
  $bytes = New-Object byte[] 32
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  return ($bytes | ForEach-Object { $_.ToString("x2") }) -join ""
}

function Ensure-Directory([string]$Path) {
  if (!(Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
  }
}

function Copy-DirectoryFresh([string]$Source, [string]$Destination) {
  if (Test-Path -LiteralPath $Destination) {
    Remove-Item -LiteralPath $Destination -Recurse -Force
  }
  Ensure-Directory (Split-Path -Parent $Destination)
  Copy-Item -LiteralPath $Source -Destination $Destination -Recurse -Force
}

function Read-JsonFile([string]$Path) {
  return (Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json)
}

function Write-JsonFile([string]$Path, [object]$Value) {
  $tmp = "$Path.tmp"
  $Value | ConvertTo-Json -Depth 40 | Set-Content -LiteralPath $tmp -Encoding UTF8
  Move-Item -LiteralPath $tmp -Destination $Path -Force
}

function Set-JsonProperty([object]$Object, [string]$Name, [object]$Value) {
  if ($Object.PSObject.Properties[$Name]) {
    $Object.$Name = $Value
    return
  }
  $Object | Add-Member -NotePropertyName $Name -NotePropertyValue $Value
}

function Test-Distribution([string]$DistributionPath) {
  $manifestPath = Join-Path $DistributionPath "GPAO-T-DISTRIBUTION-MANIFEST.json"
  if (!(Test-Path -LiteralPath $manifestPath)) { Fail "Distribution manifest is missing: $manifestPath" }
  $manifest = Read-JsonFile $manifestPath
  if ($manifest.schema -ne "gpao_t.distribution_manifest.v2") { Fail "Unsupported distribution manifest schema." }
  if ($manifest.productId -ne "gpao-t") { Fail "Distribution productId is not gpao-t." }
  if ($manifest.version -ne $PackageVersion) { Fail "Distribution version does not match installer version." }
  if (!(Test-Path -LiteralPath (Join-Path $DistributionPath "gpao-t.mjs"))) { Fail "Distribution entrypoint is missing." }
  return $manifest
}

function Test-PayloadArchive([string]$PackageRoot, [string]$PayloadArchive) {
  $installerManifestPath = Join-Path $PackageRoot "GPAO-T-WINDOWS-INSTALLER-MANIFEST.json"
  if (!(Test-Path -LiteralPath $installerManifestPath)) { return }
  $installerManifest = Read-JsonFile $installerManifestPath
  if ($null -eq $installerManifest.distribution -or [string]::IsNullOrWhiteSpace([string]$installerManifest.distribution.sha256)) { return }
  $actual = (Get-FileHash -LiteralPath $PayloadArchive -Algorithm SHA256).Hash.ToLowerInvariant()
  $expected = ([string]$installerManifest.distribution.sha256).ToLowerInvariant()
  if ($actual -ne $expected) { Fail "Distribution payload SHA-256 mismatch." }
}

function Expand-DistributionPayload([string]$PackageRoot, [string]$PayloadArchive, [string]$Destination) {
  if (Test-Path -LiteralPath $Destination) {
    Remove-Item -LiteralPath $Destination -Recurse -Force
  }
  Ensure-Directory (Split-Path -Parent $Destination)
  Test-PayloadArchive $PackageRoot $PayloadArchive
  Expand-Archive -LiteralPath $PayloadArchive -DestinationPath (Split-Path -Parent $Destination) -Force
  Test-Distribution $Destination | Out-Null
}

function Build-FreshConfig([string]$Root, [int]$GatewayPort, [string]$FeedUrl) {
  return [ordered]@{
    agents = [ordered]@{
      defaults = [ordered]@{
        workspace = (Join-Path $Root "workspace")
        memorySearch = [ordered]@{
          experimental = [ordered]@{ sessionMemory = $true }
          sources = @("memory", "sessions")
        }
      }
    }
    gateway = [ordered]@{
      mode = "local"
      bind = "loopback"
      port = $GatewayPort
      auth = [ordered]@{ mode = "token"; token = (New-HexToken) }
      controlUi = [ordered]@{
        enabled = $true
        allowedOrigins = @("http://127.0.0.1:$GatewayPort", "http://localhost:$GatewayPort")
      }
      tailscale = [ordered]@{ mode = "off"; resetOnExit = $false }
    }
    tools = [ordered]@{
      profile = "coding"
      alsoAllow = @()
      sessions = [ordered]@{ visibility = "agent" }
    }
    update = [ordered]@{
      channel = "github-releases"
      feedUrl = $FeedUrl
      compatibilityUpdaterAllowed = $false
      preserveStateHome = $true
    }
    plugins = [ordered]@{
      entries = [ordered]@{
        openai = [ordered]@{ enabled = $true }
        "memory-core" = [ordered]@{ enabled = $true }
        codex = [ordered]@{ enabled = $false }
      }
      allow = @("openai", "memory-core")
    }
  }
}

function Repair-ExistingConfig([string]$ConfigPath, [string]$Root, [int]$GatewayPort, [string]$FeedUrl) {
  if (!(Test-Path -LiteralPath $ConfigPath)) {
    Write-JsonFile $ConfigPath (Build-FreshConfig $Root $GatewayPort $FeedUrl)
    return
  }
  $config = Read-JsonFile $ConfigPath
  if ($null -eq $config.gateway) { Set-JsonProperty $config "gateway" ([pscustomobject]@{}) }
  Set-JsonProperty $config.gateway "mode" "local"
  Set-JsonProperty $config.gateway "bind" "loopback"
  Set-JsonProperty $config.gateway "port" $GatewayPort
  if ($null -eq $config.gateway.auth) {
    Set-JsonProperty $config.gateway "auth" ([pscustomobject]@{ mode = "token"; token = (New-HexToken) })
  }
  if ([string]::IsNullOrWhiteSpace([string]$config.gateway.auth.token)) {
    Set-JsonProperty $config.gateway.auth "mode" "token"
    Set-JsonProperty $config.gateway.auth "token" (New-HexToken)
  }
  if ($null -eq $config.gateway.controlUi) {
    Set-JsonProperty $config.gateway "controlUi" ([pscustomobject]@{})
  }
  Set-JsonProperty $config.gateway.controlUi "enabled" $true
  Set-JsonProperty $config.gateway.controlUi "allowedOrigins" @("http://127.0.0.1:$GatewayPort", "http://localhost:$GatewayPort")
  if ($null -eq $config.update) { Set-JsonProperty $config "update" ([pscustomobject]@{}) }
  Set-JsonProperty $config.update "channel" "github-releases"
  Set-JsonProperty $config.update "feedUrl" $FeedUrl
  Set-JsonProperty $config.update "compatibilityUpdaterAllowed" $false
  Set-JsonProperty $config.update "preserveStateHome" $true
  Write-JsonFile $ConfigPath $config
}

function New-Snapshot([string]$Root) {
  $stamp = Get-Date -Format "yyyyMMddTHHmmss"
  $snapshotRoot = Join-Path $Root "snapshots\$stamp"
  Ensure-Directory $snapshotRoot
  foreach ($item in @("current", "gpao-t.json", "bin")) {
    $source = Join-Path $Root $item
    if (Test-Path -LiteralPath $source) {
      Copy-Item -LiteralPath $source -Destination (Join-Path $snapshotRoot $item) -Recurse -Force
    }
  }
  return $snapshotRoot
}

function Write-RunCommand([string]$Root, [int]$GatewayPort, [string]$FeedUrl) {
  $bin = Join-Path $Root "bin"
  Ensure-Directory $bin
  $runPath = Join-Path $bin "GPAO-T-Run.cmd"
  $nodePath = Join-Path $Root "runtime\node.exe"
  $entryPath = Join-Path $Root "current\gpao-t.mjs"
  $configPath = Join-Path $Root "gpao-t.json"
  $logPath = Join-Path $Root "logs\gateway.cmd.log"
  $content = @"
@echo off
setlocal
set "GPAO_T_STATE_DIR=$Root"
set "GPAO_T_CONFIG_PATH=$configPath"
set "GPAO_T_RUNTIME=1"
set "GPAO_T_UPDATE_FEED_URL=$FeedUrl"
set "GPAO_T_ENABLE_LEGACY_COMPATIBILITY_NETWORK=0"
set "OPENCLAW_NO_AUTO_UPDATE=1"
set "OPENCLAW_DISABLE_PERSISTED_PLUGIN_REGISTRY=1"
set "OPENCLAW_DISABLE_PLUGIN_REGISTRY_MIGRATION=1"
"$nodePath" "$entryPath" gateway run --bind loopback --port $GatewayPort >> "$logPath" 2>&1
"@
  Set-Content -LiteralPath $runPath -Value $content -Encoding ASCII
  return $runPath
}

function Register-GpaoTask([string]$RunCmd) {
  $quoted = "`"$RunCmd`""
  $args = @("/Create", "/SC", "ONLOGON", "/TN", $TaskName, "/TR", $quoted, "/F")
  $process = Start-Process -FilePath "schtasks.exe" -ArgumentList $args -NoNewWindow -Wait -PassThru
  return ($process.ExitCode -eq 0)
}

function Get-ProcessCommandLine([int]$ProcessId) {
  try {
    $process = Get-CimInstance Win32_Process -Filter "ProcessId=$ProcessId"
    if ($null -eq $process) { return "" }
    return [string]$process.CommandLine
  } catch {
    return ""
  }
}

function Test-GpaoOwnedPid([int]$ProcessId) {
  $commandLine = Get-ProcessCommandLine $ProcessId
  if ([string]::IsNullOrWhiteSpace($commandLine)) { return $false }
  return ($commandLine -match "gpao-t\.mjs" -and $commandLine -match "\\\.gpao-t\\")
}

function Stop-GpaoRuntime([int]$GatewayPort) {
  Start-Process -FilePath "schtasks.exe" -ArgumentList @("/End", "/TN", $TaskName) -NoNewWindow -Wait -PassThru | Out-Null
  $connections = netstat -ano -p tcp | Select-String ":$GatewayPort\s+.*LISTENING\s+(\d+)"
  foreach ($line in $connections) {
    $pidText = $line.Matches[0].Groups[1].Value
    if (![string]::IsNullOrWhiteSpace($pidText)) {
      $pidValue = [int]$pidText
      if (Test-GpaoOwnedPid $pidValue) {
        taskkill.exe /PID $pidValue /F | Out-Null
      } else {
        Write-Step "Port $GatewayPort is used by a non-GPAO-T process ($pidValue). It was not terminated."
      }
    }
  }
}

function Start-GpaoRuntime([string]$RunCmd) {
  if (!(Test-Path -LiteralPath $RunCmd)) { Fail "GPAO-T run command is missing: $RunCmd" }
  Start-Process -FilePath $RunCmd -WindowStyle Hidden | Out-Null
}

function Wait-Health([int]$GatewayPort, [int]$TimeoutSeconds) {
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  do {
    try {
      $response = Invoke-WebRequest -Uri "http://127.0.0.1:$GatewayPort/health" -UseBasicParsing -TimeoutSec 3
      if ($response.StatusCode -eq 200) { return $true }
    } catch {
      Start-Sleep -Seconds 1
    }
  } while ((Get-Date) -lt $deadline)
  return $false
}

function Open-DashboardAndApprove([string]$Root, [int]$GatewayPort) {
  $nodePath = Join-Path $Root "runtime\node.exe"
  $entryPath = Join-Path $Root "current\gpao-t.mjs"
  $env:GPAO_T_STATE_DIR = $Root
  $env:GPAO_T_CONFIG_PATH = Join-Path $Root "gpao-t.json"
  $env:GPAO_T_RUNTIME = "1"
  & $nodePath $entryPath dashboard | Write-Host
  for ($i = 0; $i -lt 12; $i++) {
    try {
      $jsonText = & $nodePath $entryPath devices list --json 2>$null
      $json = $jsonText | ConvertFrom-Json
      if ($json.pending -and $json.pending.Count -gt 0) {
        $pending = @($json.pending) | Sort-Object -Property ts -Descending | Select-Object -First 1
        if ($pending.requestId) {
          & $nodePath $entryPath devices approve $pending.requestId --json | Out-Null
          Write-Step "Browser device pairing approved."
          break
        }
      }
    } catch {
      Start-Sleep -Seconds 1
    }
    Start-Sleep -Seconds 1
  }
  & $nodePath $entryPath dashboard | Write-Host
}

function Install-OrRepair([bool]$IsRepair) {
  $packageRoot = Resolve-PackageRoot
  $root = $StateHome
  if ([string]::IsNullOrWhiteSpace($root)) { $root = Get-EnvOrDefault "GPAO_T_STATE_HOME" (Join-Path $env:USERPROFILE ".gpao-t") }
  $feed = $UpdateFeedUrl
  if ([string]::IsNullOrWhiteSpace($feed)) { $feed = Get-EnvOrDefault "GPAO_T_UPDATE_FEED_URL" $DefaultUpdateFeedUrl }
  if ($env:GPAO_T_DRY_RUN -eq "1") { $DryRun = $true }

  $distribution = Join-Path $packageRoot "gpao-t-$PackageVersion"
  $payloadArchive = Join-Path $packageRoot "payload\gpao-t-$PackageVersion.zip"
  $nodeSource = Join-Path $packageRoot "runtime\node.exe"
  if (Test-Path -LiteralPath $distribution) {
    Test-Distribution $distribution | Out-Null
  } elseif (!(Test-Path -LiteralPath $payloadArchive)) {
    Fail "Distribution payload is missing: $payloadArchive"
  }
  if (!(Test-Path -LiteralPath $nodeSource)) { Fail "Bundled node.exe is missing: $nodeSource" }

  Write-Step "Mode: $Mode"
  Write-Step "Package root: $packageRoot"
  Write-Step "Install root: $root"
  Write-Step "Port: $Port"
  Write-Step "Update feed: $feed"

  if ($DryRun) {
    Write-Step "Dry run passed. No files or services were changed."
    return
  }

  Ensure-Directory $root
  Ensure-Directory (Join-Path $root "logs")
  Ensure-Directory (Join-Path $root "releases")
  Ensure-Directory (Join-Path $root "runtime")
  $snapshot = New-Snapshot $root
  Write-Step "Snapshot created: $snapshot"

  Stop-GpaoRuntime $Port
  Copy-Item -LiteralPath $nodeSource -Destination (Join-Path $root "runtime\node.exe") -Force
  $releaseDest = Join-Path $root "releases\gpao-t-$PackageVersion"
  if (Test-Path -LiteralPath $distribution) {
    Copy-DirectoryFresh $distribution $releaseDest
  } else {
    Expand-DistributionPayload $packageRoot $payloadArchive $releaseDest
  }
  Copy-DirectoryFresh $releaseDest (Join-Path $root "current")
  Repair-ExistingConfig (Join-Path $root "gpao-t.json") $root $Port $feed
  $runCmd = Write-RunCommand $root $Port $feed
  $taskOk = Register-GpaoTask $runCmd
  if ($taskOk) { Write-Step "Windows logon task registered." } else { Write-Step "Windows logon task registration failed; manual start remains available." }
  Start-GpaoRuntime $runCmd
  if (!(Wait-Health $Port 35)) { Fail "GPAO-T health check timed out. Check logs under $root\logs." }
  Open-DashboardAndApprove $root $Port
  Write-Step "GPAO-T Windows installation is ready."
}

function Show-Status {
  $root = $StateHome
  if ([string]::IsNullOrWhiteSpace($root)) { $root = Get-EnvOrDefault "GPAO_T_STATE_HOME" (Join-Path $env:USERPROFILE ".gpao-t") }
  Write-Step "Install root: $root"
  try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/health" -UseBasicParsing -TimeoutSec 3
    Write-Step "Health HTTP: $($response.StatusCode)"
  } catch {
    Write-Step "Health HTTP: unavailable"
  }
  schtasks.exe /Query /TN $TaskName | Out-Host
}

function Uninstall-Gpao {
  $root = $StateHome
  if ([string]::IsNullOrWhiteSpace($root)) { $root = Get-EnvOrDefault "GPAO_T_STATE_HOME" (Join-Path $env:USERPROFILE ".gpao-t") }
  Stop-GpaoRuntime $Port
  schtasks.exe /Delete /TN $TaskName /F | Out-Null
  if (!$KeepUserData) {
    Write-Step "Runtime task removed. User data is preserved by default; pass -KeepUserData only keeps the same behavior explicitly."
    Write-Step "To remove data manually, delete: $root"
  } else {
    Write-Step "Runtime task removed. User data preserved: $root"
  }
}

switch ($Mode) {
  "Install" { Install-OrRepair $false }
  "Repair" { Install-OrRepair $true }
  "Start" {
    $root = $StateHome
    if ([string]::IsNullOrWhiteSpace($root)) { $root = Get-EnvOrDefault "GPAO_T_STATE_HOME" (Join-Path $env:USERPROFILE ".gpao-t") }
    Start-GpaoRuntime (Join-Path $root "bin\GPAO-T-Run.cmd")
    if (Wait-Health $Port 20) { Open-DashboardAndApprove $root $Port }
  }
  "Stop" { Stop-GpaoRuntime $Port }
  "Status" { Show-Status }
  "Uninstall" { Uninstall-Gpao }
}
