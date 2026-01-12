

if [ -f .env.production ]; then
  set -o allexport
  source .env.production
  set +o allexport
else
  echo "env file not found"
  exit 1
fi
if [ -z "$SIGN_ID" ]; then
  echo "missing sign id"
  exit 1
fi
echo "SIGN ID: $SIGN_ID"
ENTITLEMENTS="build_mac/entitlements.mac.plist"

# Danh sách các thư mục Mac cần sign
MAC_DIRS=("mac" "mac-arm64")

# Hàm sign một app
sign_app() {
  local APP_PATH="$1"
  local DIR_NAME="$2"
  
  if [ ! -d "$APP_PATH" ]; then
    echo "=== Skipping $DIR_NAME: App not found at $APP_PATH"
    return 0
  fi
  
  echo "=========================================="
  echo "== Starting signing process for $DIR_NAME"
  echo "=========================================="
  echo "== Start sign playwright and electron app"
  echo "== Signing all executable binaries"
  
  find "$APP_PATH" -type f \( -name "*.node" -o -name "*.dylib" -o -name "*.so" -o -perm +111 \) | while IFS= read -r file; do
    # Kiểm tra xem file có tồn tại không (đề phòng trường hợp find trả về rỗng hoặc lỗi)
    if [ -f "$file" ]; then
        if [[ "$(file -b "$file")" == *"Mach-O"* ]]; then
           echo "signing: $file"
           codesign --force --options runtime --timestamp --entitlements "$ENTITLEMENTS" --sign "$SIGN_ID" "$file"
        fi
    fi
  done
  
  PLAYWRIGHT_DIR="$APP_PATH/Contents/Resources/playwright-browsers"
  if [ -d "$PLAYWRIGHT_DIR" ]; then
      echo "=== SIGNING PLAYWRIGHT CHROMIUM"
      find "$PLAYWRIGHT_DIR" -type f -perm +111 | while read f; do
          echo "signing chromium part: $f"
          codesign --force --options runtime --timestamp --entitlements "$ENTITLEMENTS" --sign "$SIGN_ID" "$f"
      done
  fi
  
  echo "== Signing frameworks"
  for fw in "$APP_PATH/Contents/Frameworks/"*.framework; do
    if [ -d "$fw" ]; then
      echo "signing framework: $fw"
      codesign --force --options runtime --timestamp --entitlements "$ENTITLEMENTS" --sign "$SIGN_ID" "$fw"
    fi
  done
  
  APP_EXEC="$APP_PATH/Contents/MacOS/$(basename "$APP_PATH" .app)"
  echo "== Signing main exec: $APP_EXEC"
  
  codesign --deep --force --options runtime --timestamp --entitlements "$ENTITLEMENTS" --sign "$SIGN_ID" "$APP_EXEC"
  echo "== Final signing app bundle"
  codesign --deep --force --options runtime --timestamp --entitlements "$ENTITLEMENTS" --sign "$SIGN_ID" "$APP_PATH"
  echo "=== App signing is done for $DIR_NAME"
  echo "=== Verifying the signature"
  codesign --verify --deep --strict --verbose=2 "$APP_PATH"
  echo "=== Signing process complete for $DIR_NAME"
  echo ""
}

# Lặp qua từng thư mục và sign
for DIR in "${MAC_DIRS[@]}"; do
  APP_PATH="release/$DIR/Automation Test Execution.app"
  sign_app "$APP_PATH" "$DIR"
done

echo "=========================================="
echo "=== The entire signing process is complete for all Mac builds"
echo "=========================================="
