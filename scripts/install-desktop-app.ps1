# Install OceanicOS Desktop Shortcut on Windows
$ErrorActionPreference = "Stop"

$desktopPath = [System.Environment]::GetFolderPath('Desktop')
$repoRoot = (Get-Item -Path $PSScriptRoot).Parent.FullName
$batPath = Join-Path $repoRoot "launch-oceanicos-desktop.bat"
$shortcutPath = Join-Path $desktopPath "OceanicOS Ω∞v.lnk"
$iconPath = Join-Path $repoRoot "apps\web\public\icons\icon-512.png"

Write-Host "Creating Windows Desktop Shortcut for OceanicOS..." -ForegroundColor Cyan
Write-Host "Target: $batPath" -ForegroundColor Gray
Write-Host "Destination: $shortcutPath" -ForegroundColor Gray

$wshShell = New-Object -ComObject WScript.Shell
$shortcut = $wshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $batPath
$shortcut.WorkingDirectory = $repoRoot
$shortcut.Description = "OCEANICOS Ω∞v — Water Intelligence Sovereign Full-Stack Desktop App"
$shortcut.WindowStyle = 7 # Minimized launch window

# If edge or chrome exists, we can also point to app mode directly or use bat
$shortcut.Save()

Write-Host "✓ OceanicOS Desktop Shortcut successfully installed at $shortcutPath!" -ForegroundColor Green

