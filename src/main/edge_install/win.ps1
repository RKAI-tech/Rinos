# install-edge-win.ps1
 
$TargetDir = Join-Path $PWD "my-browsers\edge-win"
$MsiFile = "edge.msi"
$Url = "https://go.microsoft.com/fwlink/?LinkID=2093504"
 
Write-Host "Downloading Microsoft Edge (Windows)..."
Invoke-WebRequest -Uri $Url -OutFile $MsiFile
if (-not (Test-Path $MsiFile)) {
    Write-Error "Failed to download Edge installer."
    exit 1
}
$AbsMsi = (Resolve-Path $MsiFile).Path
 
# Create target directory (need absolute path for msiexec)
New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null
$AbsTargetDir = (Resolve-Path $TargetDir).Path
 
Write-Host "Extracting MSI..."
# /a : Administrative install (extracts files)
# /qb : Basic UI (shows progress bar then exits)
Write-Host "Running msiexec to unpack (this may take a while)..."
$Args = "/a `"$AbsMsi`" /qb TARGETDIR=`"$AbsTargetDir`""
Start-Process -FilePath "msiexec.exe" -ArgumentList $Args -Wait -NoNewWindow
if ($LASTEXITCODE -ne 0) {
    Write-Error "msiexec failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}
 
# Clean up MSI file
Remove-Item $MsiFile
 
Write-Host "Done! Executable path:"
Write-Host "$AbsTargetDir\Microsoft\Edge\Application\msedge.exe"