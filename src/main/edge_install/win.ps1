$AppDataDir = "$env:LOCALAPPDATA\AutomationTestExecution" 
$TargetDir = Join-Path $AppDataDir "edge-win"
$MsiFile = Join-Path $AppDataDir "edge.msi"
$Url = "https://go.microsoft.com/fwlink/?LinkID=2093437"
if (-not (Test-Path $AppDataDir)) {
    New-Item -ItemType Directory -Force -Path $AppDataDir | Out-Null
}
try {
    Invoke-WebRequest -Uri $Url -OutFile $MsiFile -ErrorAction Stop
} catch {
    Write-Error "Download failed: $_"
    exit 1
}

$AbsMsi = (Resolve-Path $MsiFile).Path
$AbsTargetDir = $TargetDir # AppData luôn là đường dẫn tuyệt đối rồi

# Tạo thư mục đích để giải nén
if (-not (Test-Path $TargetDir)) {
    New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null
}

# CHẠY MSIEXEC
# /a : Giải nén
# /qn : Hoàn toàn im lặng (Quiet No UI) - Tốt cho App
$Args = "/a `"$AbsMsi`" /qn TARGETDIR=`"$AbsTargetDir`""

$Process = Start-Process -FilePath "msiexec.exe" -ArgumentList $Args -Wait -NoNewWindow -PassThru

if ($Process.ExitCode -ne 0) {
    Write-Error "msiexec failed with exit code $($Process.ExitCode)"
    exit $Process.ExitCode
}

# Dọn dẹp file MSI
Remove-Item $MsiFile -ErrorAction SilentlyContinue

# Trả về đường dẫn exe cho App của bạn sử dụng
Write-Output "$AbsTargetDir\Microsoft\Edge\Application\msedge.exe"