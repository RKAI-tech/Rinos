# install-edge-win.ps1
 
$TargetDir = Join-Path $PWD "my-browsers\edge-win"
$MsiFile = "edge.msi"
# Link MSI 64-bit Stable
$Url = "https://go.microsoft.com/fwlink/?linkid=2068605"
 
Write-Host "🪟 Đang tải Microsoft Edge cho Windows..."
Invoke-WebRequest -Uri $Url -OutFile $MsiFile
 
# Tạo thư mục đích (Phải dùng đường dẫn tuyệt đối cho msiexec)
New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null
$AbsTargetDir = (Resolve-Path $TargetDir).Path
 
Write-Host "📦 Đang giải nén MSI..."
# /a : Administrative install (giải nén)
# /qb : Giao diện cơ bản (hiển thị thanh tiến trình nhỏ rồi tắt)
Start-Process msiexec.exe -ArgumentList "/a $MsiFile /qb TARGETDIR=""$AbsTargetDir""" -Wait
 
# Dọn dẹp file msi
Remove-Item $MsiFile
 
Write-Host "✅ Hoàn tất! Executable path:"
Write-Host "$AbsTargetDir\Microsoft\Edge\Application\msedge.exe"