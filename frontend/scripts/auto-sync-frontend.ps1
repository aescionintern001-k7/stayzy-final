param(
  [string]$Branch = "feature/navbar-redesign",
  [int]$IntervalSeconds = 8,
  [int]$DebounceSeconds = 3,
  [switch]$RunOnce
)

$ErrorActionPreference = "Stop"
$RepoRoot = (git rev-parse --show-toplevel).Trim()
if (-not $RepoRoot) {
  Write-Error "Not inside a git repository."
  exit 1
}

Set-Location $RepoRoot
Write-Host "[Stayzy Frontend Sync] Watching ONLY 'frontend/' on branch '$Branch'..." -ForegroundColor Green
Write-Host "[Stayzy Frontend Sync] Press Ctrl+C to stop." -ForegroundColor DarkGray

function Sync-Once {
  # 1. Pull remote frontend updates from teammate if any
  git fetch origin $Branch --quiet 2>$null
  if ($LASTEXITCODE -eq 0) {
    $behind = (git rev-list --count "HEAD..origin/$Branch" 2>$null).Trim()
    if ([int]$behind -gt 0) {
      Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Remote has $behind new commit(s). Pulling cleanly..." -ForegroundColor Cyan
      git pull --rebase --autostash origin $Branch
      if ($LASTEXITCODE -ne 0) {
        Write-Warning "[$(Get-Date -Format 'HH:mm:ss')] Rebase conflict detected. Aborting rebase so you can resolve safely."
        git rebase --abort 2>$null
        return
      }
    }
  }

  # 2. Check changes strictly inside frontend/ (skip auto-generated next-env.d.ts noise)
  $statusLines = git status --porcelain -- "frontend/" ":!frontend/next-env.d.ts"
  if (-not $statusLines) {
    return
  }

  # Debounce so multi-file edits finish before committing
  Start-Sleep -Seconds $DebounceSeconds
  $statusConfirm = git status --porcelain -- "frontend/" ":!frontend/next-env.d.ts"
  if (-not $statusConfirm) {
    return
  }

  # 3. Stage ONLY frontend/ files
  git add -- "frontend/"
  git reset --quiet -- "frontend/next-env.d.ts" 2>$null

  $staged = git diff --cached --name-only
  if (-not $staged) {
    return
  }

  # Safety guard: ensure nothing outside frontend/ was staged
  $outsideFrontend = $staged | Where-Object { $_ -notlike "frontend/*" }
  if ($outsideFrontend) {
    Write-Warning "Detected non-frontend paths staged; aborting commit to preserve frontend-only rule."
    git reset --quiet
    return
  }

  $fileCount = ($staged | Measure-Object).Count
  $msg = "chore(frontend): auto-sync $fileCount file(s) ($(Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))"
  git commit -m $msg --quiet
  if ($LASTEXITCODE -ne 0) {
    return
  }

  # 4. Rebase onto remote if teammate pushed during commit, then push
  git pull --rebase --autostash origin $Branch --quiet
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "[$(Get-Date -Format 'HH:mm:ss')] Rebase conflict after commit. Please check git status."
    git rebase --abort 2>$null
    return
  }

  git push origin $Branch
  if ($LASTEXITCODE -eq 0) {
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Pushed $fileCount frontend file(s) to origin/$Branch." -ForegroundColor Green
  } else {
    Write-Warning "[$(Get-Date -Format 'HH:mm:ss')] Push failed; will retry on next cycle."
  }
}

do {
  try {
    Sync-Once
  } catch {
    Write-Warning "[$(Get-Date -Format 'HH:mm:ss')] Sync error: $_"
  }
  if ($RunOnce) { break }
  Start-Sleep -Seconds $IntervalSeconds
} while ($true)
