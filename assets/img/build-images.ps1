# 由原始 unsplash 照片產生網站用的裁切／壓縮圖檔
# 用法： powershell -ExecutionPolicy Bypass -File build-images.ps1
Add-Type -AssemblyName System.Drawing

$src = Join-Path $PSScriptRoot "source"
$dst = $PSScriptRoot

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
    Where-Object { $_.MimeType -eq 'image/jpeg' }

function Export-Crop {
    param(
        [string]$File,      # source 資料夾內的檔名
        [string]$Out,       # 輸出檔名
        [int]$W, [int]$H,
        [double]$FocusX = 0.5,   # 0=靠左 1=靠右
        [double]$FocusY = 0.5,   # 0=靠上 1=靠下
        [int]$Quality = 82
    )
    $img = [System.Drawing.Image]::FromFile((Join-Path $src $File))
    try {
        # 以目標長寬比取出來源中最大的可用區域
        $targetRatio = $W / $H
        $srcRatio = $img.Width / $img.Height
        if ($srcRatio -gt $targetRatio) {
            $cropH = $img.Height
            $cropW = [int]($img.Height * $targetRatio)
        } else {
            $cropW = $img.Width
            $cropH = [int]($img.Width / $targetRatio)
        }
        $sx = [int](($img.Width - $cropW) * $FocusX)
        $sy = [int](($img.Height - $cropH) * $FocusY)

        $bmp = New-Object System.Drawing.Bitmap($W, $H)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.DrawImage($img,
            (New-Object System.Drawing.Rectangle(0, 0, $W, $H)),
            (New-Object System.Drawing.Rectangle($sx, $sy, $cropW, $cropH)),
            [System.Drawing.GraphicsUnit]::Pixel)

        $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
            [System.Drawing.Imaging.Encoder]::Quality, [long]$Quality)
        $bmp.Save((Join-Path $dst $Out), $jpegCodec, $params)

        $g.Dispose(); $bmp.Dispose()
        Write-Output ("{0,-22} {1}x{2}" -f $Out, $W, $H)
    } finally {
        $img.Dispose()
    }
}

$annie   = "annie-spratt-EACvtuV2k2E-unsplash.jpg"      # 甜甜圈拼盤
$charles = "charles-chen-w2ZFjDnUL3w-unsplash.jpg"      # 生吐司切片
$conor   = "conor-brown-sqkXyyj4WdE-unsplash.jpg"       # 可頌
$dani    = "dani-CLtLGfF6mwI-unsplash.jpg"              # 奶油甜點
$joanna  = "joanna-stolowicz-y7x_TQO5XP0-unsplash.jpg"  # 鄉村酸種麵包
$rebecca = "rebecca-matthews-yjWNJRwt8mc-unsplash.jpg"  # 布里歐吐司
$shiho   = "shiho-azuma-DXOdpp9sHMg-unsplash.jpg"       # 貝果疊塔
$vicky   = "vicky-nguyen-fP6pp13SLMU-unsplash.jpg"      # 芝麻餐包
$wesual  = "wesual-click-rsWZ-P9FbQ4-unsplash.jpg"      # 雜糧麵包與麥穗
$youjeen = "youjeen-cho-QpwNft_7ICg-unsplash.jpg"       # 生吐司剖面

# --- 首屏 ---
# 圓形主圖：可頌托盤
Export-Crop -File $conor   -Out "hero-main.jpg"  -W 1000 -H 1100 -FocusY 0.45
# 右側寬幅色塊：暖金色的布里歐，比例對齊版面的 614x450，主體偏左以免被右下大圓角吃掉
Export-Crop -File $rebecca -Out "hero-wheat.jpg" -W 1000 -H 733 -FocusX 0.35 -FocusY 0.45
# 中間矩形：鄉村酸種
Export-Crop -File $joanna  -Out "hero-mid.jpg"   -W 760  -H 560

# --- 品牌故事 ---
Export-Crop -File $annie   -Out "about-main.jpg" -W 1400 -H 820

# --- 商品卡（正方形）---
Export-Crop -File $conor   -Out "p-01.jpg" -W 900 -H 900   # 經典可頌計畫
Export-Crop -File $shiho   -Out "p-03.jpg" -W 900 -H 900   # 原味貝果
Export-Crop -File $joanna  -Out "p-04.jpg" -W 900 -H 900   # 每週麵包箱
Export-Crop -File $dani    -Out "p-05.jpg" -W 900 -H 900 -FocusY 0.62   # 週末早午餐組（主體偏下）
Export-Crop -File $vicky   -Out "p-06.jpg" -W 900 -H 900   # 黑芝麻餐包
Export-Crop -File $youjeen -Out "p-07.jpg" -W 900 -H 900   # 北海道生吐司
Export-Crop -File $annie   -Out "p-08.jpg" -W 900 -H 900 -FocusX 0.18 -FocusY 0.22  # 綜合甜甜圈
Export-Crop -File $charles -Out "p-09.jpg" -W 900 -H 900   # 湯種厚片吐司
Export-Crop -File $wesual  -Out "p-10.jpg" -W 900 -H 900   # 裸麥雜糧麵包

Write-Output "`n完成。"
