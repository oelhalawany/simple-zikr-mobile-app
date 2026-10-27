# Generates app icons from reference/icon-source.png
# Usage: powershell -ExecutionPolicy Bypass -File scripts/make-icons.ps1
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$srcPath = Join-Path $root "reference\icon-source.png"
$assets = Join-Path $root "assets"

$src = [System.Drawing.Image]::FromFile($srcPath)
Write-Output "Source: $srcPath ($($src.Width)x$($src.Height))"

function Resize-Icon {
    param([string]$OutPath, [int]$Size)
    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($src, 0, 0, $Size, $Size)
    $g.Dispose()
    $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Output "Wrote $OutPath ($Size x $Size)"
}

# Main app icon (iOS + Android legacy) - 1024x1024
Resize-Icon -OutPath (Join-Path $assets "icon.png") -Size 1024
# Android adaptive icon foreground - 1024x1024
Resize-Icon -OutPath (Join-Path $assets "android-icon-foreground.png") -Size 1024
# Splash icon - 1024x1024 (Expo scales it)
Resize-Icon -OutPath (Join-Path $assets "splash-icon.png") -Size 1024
# Web favicon - 64x64
Resize-Icon -OutPath (Join-Path $assets "favicon.png") -Size 64

$src.Dispose()
Write-Output "Done."
