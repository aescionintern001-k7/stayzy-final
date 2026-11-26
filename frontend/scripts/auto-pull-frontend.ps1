param(
  [string]$Branch = "feature/navbar-redesign",
  [int]$IntervalSeconds = 8,
  [switch]$MirrorFrontend,
  [switch]$RunOnce
)

$ErrorActionPreference = "Stop"
$RepoRoot = (git rev-parse --show-toplevel).Trim()
if (-not $RepoRoot) {
  Write-Error "Not inside a git repository."
  exit 1
}

Set-Location $RepoRoot
Write-Host "[Stayzy Frontend Pull] Listening for 'frontend/' updates on origin/$Branch..." -ForegroundColor Green
if ($MirrorFrontend) {
  Write-Host "[Stayzy Frontend Pull] MirrorFrontend enabled: local uncommitted changes inside frontend/ will mirror remote." -ForegroundColor Yellow
}

function Pull-FrontendOnce {
  git fetch origin $Branch --quiet 2>$null
  if ($LASTEXITCODE -ne 0) { return }

  $behind = (git rev-list --count "HEAD..origin/$Branch" 2>$null).Trim()
  if ([int]$behind -le 0) { return }

  if ($MirrorFrontend) {
    # Reset ONLY uncommitted frontend/ files, never touching backend/ or other folders
    git checkout -- "frontend/" 2>$null
    git clean -fd -- "frontend/" 2>$null
  }

  $frontendDirty = git status --porcelain -- "frontend/" ":!frontend/next-env.d.ts"
  if ($frontendDirty -and -not $MirrorFrontend) {
    git pull --rebase --autostash origin $Branch
  } else {
    git pull --ff-only origin $Branch
    if ($LASTEXITCODE -ne 0 -and $MirrorFrontend) {
      # Fast-forward fallback: apply remote frontend/ files directly without touching backend/
      git checkout "origin/$Branch" -- "frontend/"
    }
  }

  if ($LASTEXITCODE -eq 0) {
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Updated local frontend from origin/$Branch ($behind new commit(s))." -ForegroundColor Cyan
  }
}

do {
  try {
    Pull-FrontendOnce
  } catch {
    Write-Warning "[$(Get-Date -Format 'HH:mm:ss')] Pull error: $_"
  }
  if ($RunOnce) { break }
  Start-Sleep -Seconds $IntervalSeconds
} while ($true)
