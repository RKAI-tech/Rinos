$BROWSERS_DIR = ".\playwright-browsers"

# if (Test-Path $BROWSERS_DIR) {
#     Write-Output "[Playwright] Browsers already installed at $BROWSERS_DIR"
# } else {
#     Write-Output "[Playwright] Installing Chromium to $BROWSERS_DIR..."
#     $env:PLAYWRIGHT_BROWSERS_PATH = $BROWSERS_DIR
#     npx playwright install chromium --with-deps
# }

Write-Output "[Playwright] Installing Chromium to $BROWSERS_DIR..."
$env:PLAYWRIGHT_BROWSERS_PATH = $BROWSERS_DIR
npx playwright install chromium --with-deps