Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\alipp\.gemini\antigravity-ide\brain\6b8a5575-09cf-406b-8d03-c6d0f8f55967\.user_uploaded\media_1792900608958.jpg"
$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)

$w = $bmp.Width
$h = $bmp.Height

$minX = $w; $maxX = 0; $minY = $h; $maxY = 0

for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
        $pixel = $bmp.GetPixel($x, $y)
        if ($pixel.R -lt 240 -or $pixel.G -lt 240 -or $pixel.B -lt 240) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

$logoW = $maxX - $minX + 1
$logoH = $maxY - $minY + 1
Write-Host "Logo bbox: minX=$minX maxX=$maxX minY=$minY maxY=$maxY (W=$logoW, H=$logoH)"

# Add padding
$pad = 20
$cropX = [Math]::Max(0, $minX - $pad)
$cropY = [Math]::Max(0, $minY - $pad)
$cropW = [Math]::Min($w - $cropX, $logoW + ($pad * 2))
$cropH = [Math]::Min($h - $cropY, $logoH + ($pad * 2))

# 1. Cropped rectangular full logo (PNG with transparent or crisp white background)
$cropRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropW, $cropH)
$croppedBmp = $bmp.Clone($cropRect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

# Save full logo to public/logo.png
$publicDir = "c:\Users\alipp\Desktop\sleepymeerkatglow-main\public"
$croppedBmp.Save("$publicDir\logo.png", [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "Saved $publicDir\logo.png"

# 2. Square icon for app icon & favicon (512x512)
$squareSize = [Math]::Max($cropW, $cropH) + 40
$squareBmp = New-Object System.Drawing.Bitmap(512, 512, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($squareBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.Clear([System.Drawing.Color]::White)

# Center the cropped logo within 512x512 with margin
$destPad = 48
$availW = 512 - ($destPad * 2)
$availH = 512 - ($destPad * 2)

$scale = [Math]::Min([double]$availW / $cropW, [double]$availH / $cropH)
$drawW = [int]($cropW * $scale)
$drawH = [int]($cropH * $scale)
$drawX = [int]((512 - $drawW) / 2)
$drawY = [int]((512 - $drawH) / 2)

$destRect = New-Object System.Drawing.Rectangle($drawX, $drawY, $drawW, $drawH)
$srcRect = New-Object System.Drawing.Rectangle(0, 0, $cropW, $cropH)
$g.DrawImage($croppedBmp, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()

# Save square icons
$squareBmp.Save("$publicDir\pwa-512x512.png", [System.Drawing.Imaging.ImageFormat]::Png)
$squareBmp.Save("$publicDir\pwa-maskable-512x512.png", [System.Drawing.Imaging.ImageFormat]::Png)
$squareBmp.Save("$publicDir\apple-touch-icon.png", [System.Drawing.Imaging.ImageFormat]::Png)

# 192x192 icon
$icon192 = New-Object System.Drawing.Bitmap(192, 192, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g192 = [System.Drawing.Graphics]::FromImage($icon192)
$g192.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g192.DrawImage($squareBmp, 0, 0, 192, 192)
$g192.Dispose()
$icon192.Save("$publicDir\pwa-192x192.png", [System.Drawing.Imaging.ImageFormat]::Png)
$icon192.Dispose()

# Also save a 256x256 source png for png-to-ico
$icon256 = New-Object System.Drawing.Bitmap(256, 256, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g256 = [System.Drawing.Graphics]::FromImage($icon256)
$g256.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g256.DrawImage($squareBmp, 0, 0, 256, 256)
$g256.Dispose()
$icon256.Save("$publicDir\icon-256.png", [System.Drawing.Imaging.ImageFormat]::Png)
$icon256.Dispose()

$squareBmp.Dispose()
$croppedBmp.Dispose()
$bmp.Dispose()
Write-Host "All PNG icons successfully generated!"
