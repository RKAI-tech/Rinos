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

# Lấy version từ package.json để lọc đúng artifact
VERSION=$(node -p "require('./package.json').version" 2>/dev/null)
if [ -z "$VERSION" ]; then
  echo "Cannot read version from package.json"
  exit 1
fi
echo "VERSION=$VERSION"

RELEASE_DIR="release"

echo "== Tìm tất cả file mac (dmg/zip) trong $RELEASE_DIR có chứa -${VERSION}-mac-"

found_any=false

find "$RELEASE_DIR" -maxdepth 1 -type f \( -name "*.dmg" -o -name "*.zip" \) -print0 | while IFS= read -r -d '' artifact; do
  basename="$(basename "$artifact")"

  # Chỉ xử lý file có pattern cho mac + đúng version
  case "$basename" in
    *-"$VERSION"-mac-*.dmg|*-"$VERSION"-mac-*.zip)
      echo "== Xử lý artifact: $basename"
      found_any=true

      # Ký artifact nếu có SIGN_ID
      if [ -n "$SIGN_ID" ]; then
        echo "== Signing $basename với SIGN_ID: $SIGN_ID"
        codesign --force --options runtime --timestamp --sign "$SIGN_ID" "$artifact"
      else
        echo "SIGN_ID không được set, bỏ qua bước ký cho $basename (chỉ notarize)"
      fi

      # Notarize
      log_file="notarize_${basename}.txt"
      echo "== Gửi $basename lên Apple để notarize (log: $log_file)"
      xcrun notarytool submit "$artifact" \
        --apple-id "$APPLE_ID" \
        --password "$APPLE_PASSWORD" \
        --team-id "$TEAM_ID" \
        --wait > "$log_file"

      echo "== Kết quả notarize cho $basename:"
      cat "$log_file"

      # Staple
      echo "== Stapling ticket vào $basename"
      xcrun stapler staple "$artifact"
      ;;
    *)
      # Bỏ qua file không phải mac cho version hiện tại
      ;;
  esac
done

if [ "$found_any" = false ]; then
  echo "Không tìm thấy artifact mac nào matching pattern *-${VERSION}-mac-*.dmg|zip trong $RELEASE_DIR"
  exit 1
fi

echo "== Hoàn tất ký + notarize cho tất cả dmg/zip mac"
echo "DONE"
