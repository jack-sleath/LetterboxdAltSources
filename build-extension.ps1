$ErrorActionPreference = 'Stop'

$scriptDir = $PSScriptRoot
$srcDir = Join-Path $scriptDir 'alt-sources'
$distDir = Join-Path $scriptDir 'dist'
$archiveDir = Join-Path $distDir 'archive'
New-Item -ItemType Directory -Force -Path $distDir | Out-Null
New-Item -ItemType Directory -Force -Path $archiveDir | Out-Null

# Move any existing zips out of dist/ into dist/archive/ so dist/ always
# holds only the latest chrome-edge + firefox pair.
$existing = Get-ChildItem -Path $distDir -File -Filter '*.zip'
if ($existing) {
    $existing | Move-Item -Destination $archiveDir -Force
    Write-Host "Archived $($existing.Count) old zip(s) to: $archiveDir"
}

$now = Get-Date
$padded = '{0:yy}.{0:MM}.{0:dd}.{0:HHmm}' -f $now
$version = ($padded -split '\.' | ForEach-Object { [int]$_ }) -join '.'
Write-Host "Version: $version (zip: $padded)"

# Stamp the version into the source manifest with a targeted replace, so the
# hand-formatted JSON survives the round trip (ConvertTo-Json would reflow it).
$manifestPath = Join-Path $srcDir 'manifest.json'
$manifestRaw = [System.IO.File]::ReadAllText($manifestPath)
$manifestRaw = [regex]::Replace(
    $manifestRaw,
    '("version"\s*:\s*")[^"]*(")',
    { param($m) $m.Groups[1].Value + $version + $m.Groups[2].Value },
    1
)
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($manifestPath, $manifestRaw, $utf8NoBom)

# AMO rejects zips with backslash separators in entry names. PowerShell's
# Compress-Archive writes native '\' on Windows, so build zips manually
# using ZipArchive with explicit forward-slash entry paths.
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

function New-NormalizedZip {
    param([string]$SourceDir, [string]$ZipPath)
    if (Test-Path $ZipPath) { Remove-Item $ZipPath }
    $sourceFullPath = (Resolve-Path $SourceDir).Path
    $fs = [System.IO.File]::Create($ZipPath)
    $archive = New-Object System.IO.Compression.ZipArchive($fs, [System.IO.Compression.ZipArchiveMode]::Create)
    try {
        Get-ChildItem -Path $sourceFullPath -Recurse -File | ForEach-Object {
            $relative = $_.FullName.Substring($sourceFullPath.Length).TrimStart('\', '/')
            $entryName = $relative -replace '\\', '/'
            $entry = $archive.CreateEntry($entryName, [System.IO.Compression.CompressionLevel]::Optimal)
            $entryStream = $entry.Open()
            $fileStream = [System.IO.File]::OpenRead($_.FullName)
            try { $fileStream.CopyTo($entryStream) }
            finally { $fileStream.Dispose(); $entryStream.Dispose() }
        }
    } finally {
        $archive.Dispose()
        $fs.Dispose()
    }
}

$chromeZip = Join-Path $distDir "$padded-alt-sources-chrome-edge.zip"
New-NormalizedZip -SourceDir $srcDir -ZipPath $chromeZip
Write-Host "Chrome/Edge zip: $chromeZip"

$ffStage = Join-Path $env:TEMP ("las-firefox-" + [guid]::NewGuid().ToString())
New-Item -ItemType Directory -Force -Path $ffStage | Out-Null
try {
    Copy-Item -Recurse -Force -Path (Join-Path $srcDir '*') -Destination $ffStage
    $ffManifestPath = Join-Path $ffStage 'manifest.json'
    $ffManifest = Get-Content $ffManifestPath -Raw | ConvertFrom-Json

    # Firefox MV3 has no background service workers — it runs an event page
    # from background.scripts instead.
    if ($ffManifest.background -and $ffManifest.background.service_worker) {
        $worker = $ffManifest.background.service_worker
        $ffManifest.background = [ordered]@{ scripts = @($worker) }
    }

    $gecko = @{
        gecko = @{
            id = 'letterboxd-alt-sources@jack-sleath.github.io'
            strict_min_version = '109.0'
            data_collection_permissions = @{
                required = @('none')
            }
        }
    }
    $ffManifest | Add-Member -NotePropertyName browser_specific_settings -NotePropertyValue $gecko -Force
    $ffManifest | ConvertTo-Json -Depth 10 | Set-Content $ffManifestPath -Encoding UTF8

    $firefoxZip = Join-Path $distDir "$padded-alt-sources-firefox.zip"
    New-NormalizedZip -SourceDir $ffStage -ZipPath $firefoxZip
    Write-Host "Firefox zip: $firefoxZip"
} finally {
    Remove-Item -Recurse -Force $ffStage
}
