# Tegner app-ikonerne (PNG) med .NET System.Drawing. Kør: powershell -File tools\make-icons.ps1
Add-Type -AssemblyName System.Drawing
$root = Split-Path $PSScriptRoot -Parent
New-Item -ItemType Directory -Force (Join-Path $root 'icons') | Out-Null

function New-RoundRect([float]$x,[float]$y,[float]$w,[float]$h,[float]$r){
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r*2
  $p.AddArc($x,$y,$d,$d,180,90); $p.AddArc($x+$w-$d,$y,$d,$d,270,90)
  $p.AddArc($x+$w-$d,$y+$h-$d,$d,$d,0,90); $p.AddArc($x,$y+$h-$d,$d,$d,90,90)
  $p.CloseFigure(); return $p
}

function Draw-Icon([int]$size,[string]$file,[bool]$rounded){
  $bmp = New-Object System.Drawing.Bitmap $size,$size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'; $g.Clear([System.Drawing.Color]::Transparent)
  $blue = [System.Drawing.Color]::FromArgb(58,111,154)
  $s = $size/512.0
  if($rounded){ $bg = New-RoundRect 0 0 $size $size (112*$s); $g.FillPath((New-Object System.Drawing.SolidBrush $blue),$bg) }
  else { $g.Clear($blue) }
  # Pung (hvid) - holdt inden for "safe zone" til maskable ikoner
  $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(251,249,244))
  $g.FillPath($white,(New-RoundRect (126*$s) (168*$s) (260*$s) (190*$s) (34*$s)))
  $flap = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(220,232,242))
  $g.FillPath($flap,(New-RoundRect (146*$s) (138*$s) (200*$s) (56*$s) (22*$s)))
  $g.FillPath($white,(New-RoundRect (126*$s) (168*$s) (260*$s) (190*$s) (34*$s)))
  # Lomme med to prikker: lyserød (Emilie) og blå (Leon)
  $pocket = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(231,225,213))
  $g.FillPath($pocket,(New-RoundRect (276*$s) (226*$s) (110*$s) (74*$s) (24*$s)))
  $g.FillEllipse((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(196,87,127))),(300*$s),(248*$s),(30*$s),(30*$s))
  $g.FillEllipse((New-Object System.Drawing.SolidBrush $blue),(338*$s),(248*$s),(30*$s),(30*$s))
  $bmp.Save((Join-Path $root "icons\$file"),[System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

Draw-Icon 192 'icon-192.png' $true
Draw-Icon 512 'icon-512.png' $true
Draw-Icon 512 'icon-maskable-512.png' $false
Draw-Icon 180 'apple-touch-icon.png' $false
Draw-Icon 64  'favicon.png' $true
Get-ChildItem (Join-Path $root 'icons') | Select-Object Name,Length
