#!/bin/bash
if [ -f ".env.production" ]; then
  export $(grep -v '^#' .env.production | xargs)
else
  echo ".env.production file not found"
  exit 1
fi

if [ -z "$APPLE_ID" ] || [ -z "$APPLE_PASSWORD" ] || [ -z "$TEAM_ID" ]; then
  echo "missing APPLE_ID, APPLE_PASSWORD or TEAM_ID!"
  exit 1
fi

echo "APPLE_ID=$APPLE_ID"
echo "TEAM_ID=$TEAM_ID"

# Danh sách các thư mục Mac cần notarize
MAC_DIRS=("mac" "mac_arm64" "mac-universal")

# Hàm notarize một app
notarize_app() {
  local DIR="$1"
  local APP="release/$DIR/Automation Test Execution.app"
  local SUFFIX=""

  # Đặt hậu tố tên file theo loại build
  case "$DIR" in
    "mac")
      SUFFIX="macos_x64"
      ;;
    "mac_arm64")
      SUFFIX="macos_arm64"
      ;;
    "mac-universal")
      SUFFIX="macos_universal"
      ;;
    *)
      SUFFIX="$DIR"
      ;;
  esac

  local ZIP="release/$DIR/Automation_Test_Execution_${SUFFIX}.zip"
  local DMG="release/$DIR/Automation_Test_Execution_${SUFFIX}.dmg"
  local ZIP_RESULT="notarize_zip_result_${DIR}.txt"
  local DMG_RESULT="notarize_dmg_result_${DIR}.txt"
  
  if [ ! -d "$APP" ]; then
    echo "=== Skipping $DIR: App not found at $APP"
    return 0
  fi
  
  echo "=========================================="
  echo "== Starting notarization process for $DIR"
  echo "=========================================="
  
  echo "== Packaging zip from signed app"
  rm -f "$ZIP"
  ditto -c -k --keepParent "$APP" "$ZIP"
  echo "== Zip file is created: $ZIP"
  
  echo "== Uploading zip file to Apple to notarize"
  xcrun notarytool submit "$ZIP" --apple-id "$APPLE_ID" --password "$APPLE_PASSWORD" --team-id "$TEAM_ID" --wait > "$ZIP_RESULT"
  
  echo "== Notarize (zip) is processed for $DIR"
  cat "$ZIP_RESULT"
  
  echo "== Stapling ticket into app"
  xcrun stapler staple "$APP"
  
  echo "== Creating dmg from stapled app"
  rm -f "$DMG"
  hdiutil create -volname "Automation Test Execution" -srcfolder "$APP" -ov -format UDZO "$DMG"
  echo "== Dmg file is created: $DMG"
  
  if [ -n "$SIGN_ID" ]; then
    echo "== Signing dmg with SIGN_ID: $SIGN_ID"
    codesign --force --options runtime --timestamp --sign "$SIGN_ID" "$DMG"
  else
    echo "SIGN_ID is not set, skip signing dmg (dmg will chứa app đã ký/notarize)"
  fi
  
  echo "== Uploading dmg to Apple to notarize"
  xcrun notarytool submit "$DMG" --apple-id "$APPLE_ID" --password "$APPLE_PASSWORD" --team-id "$TEAM_ID" --wait > "$DMG_RESULT"
  
  echo "== Dmg notarize result for $DIR"
  cat "$DMG_RESULT"
  
  echo "== Stapling ticket into dmg"
  xcrun stapler staple "$DMG"
  
  echo "=== Notarization process complete for $DIR"
  echo ""
}

# Lặp qua từng thư mục và notarize
for DIR in "${MAC_DIRS[@]}"; do
  notarize_app "$DIR"
done

echo "=========================================="
echo "DONE - All Mac builds have been notarized"
echo "=========================================="
