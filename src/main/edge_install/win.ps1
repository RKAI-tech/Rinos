# install-edge-win.ps1
 
$TargetDir = Join-Path $PWD "my-browsers\edge-win"
$MsiFile = "edge.msi"
$Url = "https://go.microsoft.com/fwlink/?linkid=2068605"
 
Write-Host "Downloading Microsoft Edge (Windows)..."
Invoke-WebRequest -Uri $Url -OutFile $MsiFile
 
# Create target directory (need absolute path for msiexec)
New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null
$AbsTargetDir = (Resolve-Path $TargetDir).Path
 
Write-Host "Extracting MSI..."
# /a : Administrative install (extracts files)
# /qb : Basic UI (shows progress bar then exits)
Start-Process msiexec.exe -ArgumentList "/a $MsiFile /qb TARGETDIR=""$AbsTargetDir""" -Wait
 
# Clean up MSI file
Remove-Item $MsiFile
 
Write-Host "Done! Executable path:"
Write-Host "$AbsTargetDir\Microsoft\Edge\Application\msedge.exe"