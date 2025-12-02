#!/bin/bash
if [ -f ".env.production" ]; then
  export $(grep -v '^#' .env.production | xargs)
else
  echo ".env file not found"
  exit 1
fi

if [ -z "$APPLE_ID" ] || [ -z "$APPLE_PASSWORD" ] || [ -z "$TEAM_ID" ]; then
  echo "missing APPLE_ID, APPLE_PASSWORD or TEAM_ID!"
  exit 1
fi

echo "APPLE_ID=$APPLE_ID"
echo "TEAM_ID=$TEAM_ID"

APP_PATH="$1"
ARCH_LABEL="$2"

if [ -z "$APP_PATH" ] || [ -z "$ARCH_LABEL" ]; then
  echo "Usage: $0 <APP_PATH> <ARCH_LABEL>"
  echo "  Ví dụ: $0 \"release/mac/Automation Test Execution.app\" x64"
  echo "         $0 \"release/mac-arm64/Automation Test Execution.app\" arm64"
  echo "         $0 \"release/mac-universal/Automation Test Execution.app\" universal"
  exit 1
fi

if [ ! -d "$APP_PATH" ]; then
  echo "APP_PATH không tồn tại hoặc không phải thư mục .app: $APP_PATH"
  exit 1
fi

echo "APP_PATH=$APP_PATH"
echo "ARCH_LABEL=$ARCH_LABEL"

# Lấy version & productName từ package.json để đặt tên artifact
VERSION=$(node -p "require('./package.json').version" 2>/dev/null)
if [ -z "$VERSION" ]; then
  echo "Cannot read version from package.json"
  exit 1
fi

PRODUCT_NAME_RAW=$(node -p "require('./package.json').build.productName" 2>/dev/null)
if [ -z "$PRODUCT_NAME_RAW" ]; then
  echo "Cannot read build.productName from package.json"
  exit 1
fi

PRODUCT_NAME="${PRODUCT_NAME_RAW}"
SAFE_PRODUCT_NAME="${PRODUCT_NAME_RAW// / }"

echo "VERSION=$VERSION"
echo "PRODUCT_NAME=$PRODUCT_NAME"

RELEASE_DIR="release"
BASENAME="${PRODUCT_NAME}-${VERSION}-mac-${ARCH_LABEL}"
ZIP_PATH="${RELEASE_DIR}/${BASENAME}.zip"
DMG_PATH="${RELEASE_DIR}/${BASENAME}.dmg"

echo "== Tạo ZIP từ app đã ký: $ZIP_PATH"
rm -f "$ZIP_PATH"
ditto -c -k --keepParent "$APP_PATH" "$ZIP_PATH"

echo "== Tạo DMG từ app đã ký: $DMG_PATH"
rm -f "$DMG_PATH"
hdiutil create -volname "$PRODUCT_NAME" -srcfolder "$APP_PATH" -ov -format UDZO "$DMG_PATH"

for ARTIFACT in "$ZIP_PATH" "$DMG_PATH"; do
  BASENAME_ART="$(basename "$ARTIFACT")"

  echo "== Xử lý artifact: $BASENAME_ART"

  # Ký artifact nếu có SIGN_ID
  if [ -n "$SIGN_ID" ]; then
    echo "== Signing $BASENAME_ART với SIGN_ID: $SIGN_ID"
    codesign --force --options runtime --timestamp --sign "$SIGN_ID" "$ARTIFACT"
  else
    echo "SIGN_ID không được set, bỏ qua bước ký cho $BASENAME_ART (chỉ notarize)"
  fi

  # Notarize
  log_file="notarize_${BASENAME_ART}.txt"
  echo "== Gửi $BASENAME_ART lên Apple để notarize (log: $log_file)"
  xcrun notarytool submit "$ARTIFACT" \
    --apple-id "$APPLE_ID" \
    --password "$APPLE_PASSWORD" \
    --team-id "$TEAM_ID" \
    --wait > "$log_file"

  echo "== Kết quả notarize cho $BASENAME_ART:"
  cat "$log_file"

  # Staple
  echo "== Stapling ticket vào $BASENAME_ART"
  xcrun stapler staple "$ARTIFACT"
done

echo "== Hoàn tất tạo + ký + notarize ZIP/DMG cho $APP_PATH (arch: $ARCH_LABEL)"
echo "DONE"
