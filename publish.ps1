# Publishes this prototype directory as a NEW public repository.
# No credentials are embedded. No third-party price records are included.
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
foreach ($tool in @('node', 'git', 'gh')) {
  if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
    throw "Install or make $tool available before publishing."
  }
}
if (Test-Path -LiteralPath '.git') {
  throw 'This directory already has Git metadata. Review it before using the new-repository publisher.'
}
gh auth status
if ($LASTEXITCODE -ne 0) { throw 'Authenticate gh with GitHub before publishing.' }
$account = gh api user --jq .login
if ($LASTEXITCODE -ne 0 -or $account -ne 'Fiam-ian') {
  throw 'The CLI must authenticate as the connected GitHub account Fiam-ian.'
}
node scripts/build-preview.mjs
if ($LASTEXITCODE -ne 0) { throw 'Preview generation failed; publication stopped.' }
node --test
if ($LASTEXITCODE -ne 0) { throw 'Tests failed; publication stopped.' }
git init -b main
if ($LASTEXITCODE -ne 0) { throw 'Git initialization failed.' }
git add -- AGENTS.md LICENSE README.md package.json dev-server.mjs .gitignore publish.ps1 index.html offers.html styles.css favicon.svg src tests docs scripts data .github preview.html
if ($LASTEXITCODE -ne 0) { throw 'Staging failed.' }
git commit -m 'Add Münster grocery-planner demonstration prototype'
if ($LASTEXITCODE -ne 0) { throw 'Commit failed. Configure Git author identity and retry manually.' }
gh repo create Fiam-ian/basketwise-muenster --public --description 'Open-source Münster grocery-trip planner prototype; synthetic price demo' --source . --remote origin --push
if ($LASTEXITCODE -ne 0) { throw 'Public repository creation or push failed; local source is preserved.' }
Write-Output 'Published: https://github.com/Fiam-ian/basketwise-muenster'
