param(
  [string]$BaseBranch = "develop",
  [string]$Branch = "",
  [switch]$PullUpdates,
  [switch]$PushBranch,
  [switch]$CreatePr,
  [switch]$Watch,
  [int]$IntervalSeconds = 20
)

$ErrorActionPreference = "Stop"
$RepoRoot = (git rev-parse --show-toplevel).Trim()
if (-not $RepoRoot) {
  Write-Error "Not inside a Git repository."
  exit 1
}

Set-Location $RepoRoot

if (-not $Branch) {
  $Branch = (git branch --show-current).Trim()
}

function Show-SyncStatus {
  git fetch origin --prune --quiet
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "[Stayzy Sync] Unable to fetch from origin."
    return
  }

  $dirty = git status --porcelain -- . ":!.agents"
  $behindBase = (git rev-list --count "$Branch..origin/$BaseBranch" 2>$null).Trim()
  $hasRemoteBranch = git ls-remote --heads origin $Branch 2>$null
  $behindSelf = "0"
  $aheadSelf = "0"
  if ($hasRemoteBranch) {
    $behindSelf = (git rev-list --count "$Branch..origin/$Branch" 2>$null).Trim()
    $aheadSelf = (git rev-list --count "origin/$Branch..$Branch" 2>$null).Trim()
  }

  Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Branch: $Branch | Behind origin/${BaseBranch}: $behindBase | Behind origin/${Branch}: $behindSelf | Ahead: $aheadSelf | Uncommitted files: $(($dirty | Measure-Object).Count)" -ForegroundColor Cyan
}

if ($Watch) {
  Write-Host "[Stayzy Sync Watch] Safely monitoring origin/$BaseBranch and origin/$Branch (never overwrites local changes)..." -ForegroundColor Green
  while ($true) {
    Show-SyncStatus
    Start-Sleep -Seconds $IntervalSeconds
  }
}

# 1. Fetch latest remote updates
Write-Host "Fetching updates from origin..." -ForegroundColor Cyan
git fetch origin --prune

# 2. Protect uncommitted work (never overwrite or discard local files)
$uncommitted = git status --porcelain -- . ":!.agents"
if ($PullUpdates) {
  if ($uncommitted) {
    Write-Warning "You have uncommitted local changes. Commit or stash them before pulling updates."
    git status --short -- . ":!.agents"
    exit 1
  }

  if ($Branch -eq $BaseBranch) {
    git pull --ff-only origin $BaseBranch
  } else {
    Write-Host "Fast-forwarding local $BaseBranch and merging/rebasing onto $Branch..." -ForegroundColor Cyan
    git fetch origin "${BaseBranch}:${BaseBranch}" 2>$null
    git merge --no-edit "origin/$BaseBranch"
    if ($LASTEXITCODE -ne 0) {
      Write-Warning "Merge conflict detected while updating $Branch from origin/$BaseBranch. Resolve conflicts manually before continuing."
      exit 1
    }
  }
}

if ($PushBranch) {
  if ($Branch -eq $BaseBranch -or $Branch -eq "main") {
    Write-Error "Direct push to '$Branch' is blocked. Switch to your personal feature/dev branch first (e.g. git checkout -b dev/yourname-topic)."
    exit 1
  }
  if ($uncommitted) {
    Write-Warning "You still have uncommitted changes. Commit your reviewed changes before pushing."
    git status --short -- . ":!.agents"
    exit 1
  }
  git push -u origin $Branch
}

if ($CreatePr) {
  if ($Branch -eq $BaseBranch -or $Branch -eq "main") {
    Write-Error "Cannot create a PR from '$Branch' to itself."
    exit 1
  }
  if (Get-Command gh -ErrorAction SilentlyContinue) {
    gh pr create --base $BaseBranch --head $Branch --fill
  } else {
    Write-Host "Open Pull Request manually: https://github.com/aescionintern001-k7/stayzy/compare/$BaseBranch...$Branch" -ForegroundColor Yellow
  }
}

Show-SyncStatus
