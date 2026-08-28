$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$OutputRoot = Join-Path $Root 'runtime-tools'
$TempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("fuiet-media-tools-" + [guid]::NewGuid().ToString('N'))

$FfmpegVersion = '9.0'
$FfmpegUrl = 'https://github.com/GyanD/codexffmpeg/releases/download/9.0/ffmpeg-9.0-essentials_build.7z'
$FfmpegSha256 = 'ffb866303866995734849995027533b9756971215e8c55ef408073628cdc27a2'
$FfmpegSourceCommit = 'https://github.com/FFmpeg/FFmpeg/commit/d32b387f2b'
$ImageMagickVersion = '7.1.2-30'
$ImageMagickUrl = 'https://github.com/ImageMagick/ImageMagick/releases/download/7.1.2-30/ImageMagick-7.1.2-30-portable-Q16-HDRI-x64.7z'
$ImageMagickSha256 = 'd98471f5ec9d87e222c69c8c28c98fe6665dab76cd3ef752c5e4de785be553be'

function Download-File([string]$Uri, [string]$Destination) {
  Write-Host "Downloading $Uri"
  Invoke-WebRequest -Uri $Uri -OutFile $Destination -UseBasicParsing
  if (!(Test-Path $Destination) -or (Get-Item $Destination).Length -lt 1024) {
    throw "Downloaded file is missing or unexpectedly small: $Destination"
  }
}

function Find-SevenZip {
  $command = Get-Command '7z.exe' -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }
  $candidates = @(
    (Join-Path $env:ProgramFiles '7-Zip\7z.exe'),
    (Join-Path ${env:ProgramFiles(x86)} '7-Zip\7z.exe')
  )
  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path $candidate)) { return $candidate }
  }
  throw '7z.exe is required to unpack the bundled Windows media tool archives.'
}

function Invoke-VersionCheck([string]$Name, [string]$File) {
  # Capture the whole process output first. Piping the live process into
  # Select-Object -First can close stdout early and make a healthy FFmpeg
  # process report a non-zero/broken-pipe exit code.
  $output = & $File -version 2>&1
  $exitCode = $LASTEXITCODE
  if ($exitCode -ne 0) {
    throw "Bundled $Name failed to run (exit $exitCode)."
  }
  @($output) | Select-Object -First 2 | ForEach-Object { Write-Host $_ }
}

try {
  Remove-Item $OutputRoot -Recurse -Force -ErrorAction SilentlyContinue
  New-Item $OutputRoot -ItemType Directory -Force | Out-Null
  New-Item $TempRoot -ItemType Directory -Force | Out-Null
  $sevenZip = Find-SevenZip

  # FFmpeg / FFprobe: pinned 64-bit static release essentials build.
  $ffmpegArchive = Join-Path $TempRoot 'ffmpeg.7z'
  Download-File $FfmpegUrl $ffmpegArchive
  $actualSha = (Get-FileHash $ffmpegArchive -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actualSha -ne $FfmpegSha256) {
    throw "FFmpeg SHA-256 mismatch. expected=$FfmpegSha256 actual=$actualSha"
  }
  $ffmpegExtract = Join-Path $TempRoot 'ffmpeg-extracted'
  New-Item $ffmpegExtract -ItemType Directory -Force | Out-Null
  & $sevenZip x $ffmpegArchive "-o$ffmpegExtract" -y | Out-Host
  if ($LASTEXITCODE -ne 0) { throw "7-Zip failed to unpack FFmpeg (exit $LASTEXITCODE)." }
  $ffmpegExe = Get-ChildItem $ffmpegExtract -Recurse -File -Filter 'ffmpeg.exe' | Select-Object -First 1
  $ffprobeExe = Get-ChildItem $ffmpegExtract -Recurse -File -Filter 'ffprobe.exe' | Select-Object -First 1
  if (!$ffmpegExe -or !$ffprobeExe) { throw 'FFmpeg archive did not contain ffmpeg.exe and ffprobe.exe.' }

  $ffmpegTarget = Join-Path $OutputRoot 'ffmpeg\bin'
  New-Item $ffmpegTarget -ItemType Directory -Force | Out-Null
  Copy-Item $ffmpegExe.FullName (Join-Path $ffmpegTarget 'ffmpeg.exe') -Force
  Copy-Item $ffprobeExe.FullName (Join-Path $ffmpegTarget 'ffprobe.exe') -Force

  $ffmpegPackageRoot = Split-Path (Split-Path $ffmpegExe.FullName -Parent) -Parent
  Get-ChildItem $ffmpegPackageRoot -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match '^(LICENSE|README)' } |
    ForEach-Object { Copy-Item $_.FullName (Join-Path (Split-Path $ffmpegTarget -Parent) $_.Name) -Force }

  # ImageMagick: pinned official portable Win64 static Q16 HDRI release asset.
  $imageMagickArchive = Join-Path $TempRoot 'imagemagick.7z'
  Download-File $ImageMagickUrl $imageMagickArchive
  $imageMagickArchiveSha = (Get-FileHash $imageMagickArchive -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($imageMagickArchiveSha -ne $ImageMagickSha256) {
    throw "ImageMagick SHA-256 mismatch. expected=$ImageMagickSha256 actual=$imageMagickArchiveSha"
  }
  $imageMagickExtract = Join-Path $TempRoot 'imagemagick-extracted'
  New-Item $imageMagickExtract -ItemType Directory -Force | Out-Null
  & $sevenZip x $imageMagickArchive "-o$imageMagickExtract" -y | Out-Host
  if ($LASTEXITCODE -ne 0) { throw "7-Zip failed to unpack ImageMagick (exit $LASTEXITCODE)." }
  $magickExe = Get-ChildItem $imageMagickExtract -Recurse -File -Filter 'magick.exe' | Select-Object -First 1
  if (!$magickExe) { throw 'ImageMagick archive did not contain magick.exe.' }
  $imageMagickSourceRoot = Split-Path $magickExe.FullName -Parent
  $imageMagickTarget = Join-Path $OutputRoot 'imagemagick'
  New-Item $imageMagickTarget -ItemType Directory -Force | Out-Null
  Copy-Item (Join-Path $imageMagickSourceRoot '*') $imageMagickTarget -Recurse -Force

  @"
Fuiet Infinite Canvas bundled third-party runtime tools

FFmpeg / FFprobe
- Version: $FfmpegVersion
- Windows build: Gyan release essentials, x64 static
- Binary source: $FfmpegUrl
- Upstream source commit: $FfmpegSourceCommit
- Archive SHA-256: $FfmpegSha256
- Gyan Windows builds are distributed under GPLv3. Preserve the license/readme files copied beside the binaries.

ImageMagick
- Version: $ImageMagickVersion
- Build: portable Q16 HDRI x64 static
- Binary source: $ImageMagickUrl
- Archive SHA-256: $ImageMagickSha256
- ImageMagick is distributed under the ImageMagick License. The complete portable distribution is bundled so its license/config/delegate files remain available.
"@ | Set-Content (Join-Path $OutputRoot 'THIRD_PARTY_NOTICES.txt') -Encoding UTF8

  $manifest = [ordered]@{
    generatedAt = (Get-Date).ToUniversalTime().ToString('o')
    platform = 'win32-x64'
    ffmpeg = [ordered]@{
      version = $FfmpegVersion
      source = $FfmpegUrl
      sourceCommit = $FfmpegSourceCommit
      sha256 = $FfmpegSha256
      executable = 'ffmpeg/bin/ffmpeg.exe'
      probeExecutable = 'ffmpeg/bin/ffprobe.exe'
    }
    imagemagick = [ordered]@{
      version = $ImageMagickVersion
      source = $ImageMagickUrl
      sha256 = $ImageMagickSha256
      executable = 'imagemagick/magick.exe'
    }
  }
  $manifest | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $OutputRoot 'tool-manifest.json') -Encoding UTF8

  Write-Host 'Validating downloaded executables...'
  Invoke-VersionCheck 'ffmpeg.exe' (Join-Path $ffmpegTarget 'ffmpeg.exe')
  Invoke-VersionCheck 'ffprobe.exe' (Join-Path $ffmpegTarget 'ffprobe.exe')
  Invoke-VersionCheck 'magick.exe' (Join-Path $imageMagickTarget 'magick.exe')

  Write-Host "Bundled runtime tools prepared under $OutputRoot"
}
finally {
  Remove-Item $TempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
