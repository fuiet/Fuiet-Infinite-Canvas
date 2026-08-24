$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$DestRoot = Join-Path $HOME ".codex\skills"
$Dest = Join-Path $DestRoot "frontend-design"
New-Item -ItemType Directory -Force -Path $DestRoot | Out-Null
if (Test-Path $Dest) { Remove-Item -Recurse -Force $Dest }
Copy-Item -Recurse (Join-Path $Root ".codex\skills\frontend-design") $Dest
Write-Output "已安装: $Dest"
