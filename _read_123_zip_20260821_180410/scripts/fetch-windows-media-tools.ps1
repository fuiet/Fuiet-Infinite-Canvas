$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$OutputRoot = Join-Path $Root 'runtime-tools'
$TempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("fuiet-media-tools-" + [guid]::NewGuid().ToString('N'))

$FfmpegVersion = '9.0'
$FfmpegUrl = 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip'
$FfmpegSha256 = 'e6b54767a6065919048f1a098eb27211ca4e12b4348a05d88777a5855d0b6e71'
$FfmpegSourceCommit = 'https://github.com/FFmpeg/FFmpeg/commit/d32b387f2b'
$ImageMagickVersion = '7.1.2-30'
$ImageMagickUrl = 'https://download.imagemagick.org/archive/binaries/ImageMagick-7.1.2-30-portable-Q16-HDRI-x64.7z'

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
  throw '7z.exe is required to unpack the official ImageMagick portable archive.'
}

try {
  Remove-Item $OutputRoot -Recurse -Force -ErrorAction SilentlyContinue
  New-Item $OutputRoot -ItemType Directory -Force | Out-Null
  New-Item $TempRoot -ItemType Directory -Force | Out-Null

  # FFmpeg / FFprobe: pinned 64-bit static release essentials build.
  $ffmpegArchive = Join-Path $TempRoot 'ffmpeg.zip'
  Download-File $FfmpegUrl $ffmpegArchive
  $actualSha = (Get-FileHash $ffmpegArchive -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actualSha -ne $FfmpegSha256) {
    throw "FFmpeg SHA-256 mismatch. expected=$FfmpegSha256 actual=$actualSha"
  }
  $ffmpegExtract = Join-Path $TempRoot 'ffmpeg-extracted'
  Expand-Archive -Path $ffmpegArchive -DestinationPath $ffmpegExtract -Force
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

  # ImageMagick: official portable Win64 static Q16 HDRI build.
  $imageMagickArchive = Join-Path $TempRoot 'imagemagick.7z'
  Download-File $ImageMagickUrl $imageMagickArchive
  $imageMagickArchiveSha = (Get-FileHash $imageMagickArchive -Algorithm SHA256).Hash.ToLowerInvariant()
  $imageMagickExtract = Join-Path $TempRoot 'imagemagick-extracted'
  New-Item $imageMagickExtract -ItemType Directory -Force | Out-Null
  $sevenZip = Find-SevenZip
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
- Archive SHA-256 recorded at build time in tool-manifest.json
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
      sha256 = $imageMagickArchiveSha
      executable = 'imagemagick/magick.exe'
    }
  }
  $manifest | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $OutputRoot 'tool-manifest.json') -Encoding UTF8

  Write-Host 'Validating downloaded executables...'
  & (Join-Path $ffmpegTarget 'ffmpeg.exe') -version | Select-Object -First 1 | Write-Host
  if ($LASTEXITCODE -ne 0) { throw 'Bundled ffmpeg.exe failed to run.' }
  & (Join-Path $ffmpegTarget 'ffprobe.exe') -version | Select-Object -First 1 | Write-Host
  if ($LASTEXITCODE -ne 0) { throw 'Bundled ffprobe.exe failed to run.' }
  & (Join-Path $imageMagickTarget 'magick.exe') -version | Select-Object -First 2 | Write-Host
  if ($LASTEXITCODE -ne 0) { throw 'Bundled magick.exe failed to run.' }

  Write-Host "Bundled runtime tools prepared under $OutputRoot"
}
finally {
  Remove-Item $TempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
