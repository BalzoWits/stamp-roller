# Pubblica il sito su GitHub (BalzoWits/stamp-roller) tramite le API Git di GitHub.
# Serve perché "git push" dalla rete aziendale fallisce per SSL: gh api passa, git no.
# Uso: powershell -File publish.ps1 "messaggio del commit"
param([string]$Message = "Aggiorna il sito")
$ErrorActionPreference = 'Stop'
$repo = 'BalzoWits/stamp-roller'
$root = $PSScriptRoot
$tmp = Join-Path $env:TEMP 'stamp-roller-publish.json'
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Api([string]$method, [string]$path, $body) {
  if ($null -ne $body) {
    [IO.File]::WriteAllText($tmp, ($body | ConvertTo-Json -Depth 10 -Compress), $utf8)
    $out = gh api -X $method $path --input $tmp
  } else {
    $out = gh api -X $method $path
  }
  if ($LASTEXITCODE -ne 0) { throw "gh api $method $path fallita" }
  return $out | ConvertFrom-Json
}

# file pubblicati: tutto tranne dipendenze, output dei test e cartelle di servizio
$exclude = '\\(node_modules|out|\.git)\\'
$files = Get-ChildItem $root -Recurse -File | Where-Object { $_.FullName -notmatch $exclude -and $_.Name -ne 'package-lock.json' }

$head = Api GET "repos/$repo/git/ref/heads/main" $null
$parent = $head.object.sha

$tree = @()
foreach ($f in $files) {
  $rel = $f.FullName.Substring($root.Length + 1).Replace('\', '/')
  $b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($f.FullName))
  $blob = Api POST "repos/$repo/git/blobs" @{ content = $b64; encoding = 'base64' }
  $tree += @{ path = $rel; mode = '100644'; type = 'blob'; sha = $blob.sha }
  Write-Host "  $rel"
}
# albero completo (senza base_tree): i file tolti in locale spariscono anche dal repo
$t = Api POST "repos/$repo/git/trees" @{ tree = $tree }
$c = Api POST "repos/$repo/git/commits" @{ message = $Message; tree = $t.sha; parents = @($parent) }
Api PATCH "repos/$repo/git/refs/heads/main" @{ sha = $c.sha } | Out-Null
Remove-Item $tmp -ErrorAction SilentlyContinue
Write-Host "Pubblicato $($c.sha.Substring(0,7)) su $repo ($($files.Count) file)"
