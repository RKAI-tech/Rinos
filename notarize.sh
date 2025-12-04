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

APP="release/mac-universal/Automation Test Execution.app"
ZIP="release/mac-universal/Automation_Test_Execution_2.1.0_universal.zip"
DMG="release/mac-universal/Automation_Test_Execution_2.1.0_universal.dmg"

echo "== Packaging zip from signed app"
rm -f "$ZIP"
ditto -c -k --keepParent "$APP" "$ZIP"
echo "== Zip file is created: $ZIP"

echo "== Uploading zip file to Apple to notarize"
xcrun notarytool submit "$ZIP" --apple-id "$APPLE_ID" --password "$APPLE_PASSWORD" --team-id "$TEAM_ID" --wait > notarize_zip_result.txt
/Users/servermac/Documents/ai_project/rikkei-automation-test-script-app/notarize_Automation Test Execution-2.1.0-mac-x64.zip.txt
echo "== Notarize (zip) is processed"
cat notarize_zip_result.txt

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
xcrun notarytool submit "$DMG" --apple-id "$APPLE_ID" --password "$APPLE_PASSWORD" --team-id "$TEAM_ID" --wait > notarize_dmg_result.txt

echo "== Dmg notarize result"
cat notarize_dmg_result.txt

echo "== Stapling ticket into dmg"
xcrun stapler staple "$DMG"

echo "DONE"
