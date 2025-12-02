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

APP="release/mac/Automation Test Execution.app"
ZIP="release/mac/Automation_Test_Execution.zip"
DMG="release/mac/Automation_Test_Execution.dmg"

echo "== Packaging zip from signed app"
rm -f "$ZIP"
ditto -c -k --keepParent "$APP" "$ZIP"
echo "== Zip file is created: $ZIP"

echo "== Uploading zip file to Apple to notarize"
xcrun notarytool submit "$ZIP" --apple-id "$APPLE_ID" --password "$APPLE_PASSWORD" --team-id "$TEAM_ID" --wait > notarize_result.txt

echo "== Notarize is processed"
cat notarize_result.txt

echo "== Stapling ticket into app"
xcrun stapler staple "$APP"

echo "== Stapling ticket into zip"
xcrun stapler staple "$ZIP" || echo "stapling zip failed (often ok if ticket is only for app)"

echo "== Creating dmg from stapled app"
rm -f "$DMG"
hdiutil create -volname "Automation Test Execution" -srcfolder "$APP" -ov -format UDZO "$DMG"
echo "== Dmg file is created: $DMG"

if [ -n "$SIGN_ID" ]; then
  echo "== Signing dmg with SIGN_ID: $SIGN_ID"
  codesign --force --options runtime --timestamp --sign "$SIGN_ID" "$DMG"
else
  echo "SIGN_ID is not set, skip signing dmg (dmg will contain signed/notarized app)"
fi

echo "== Uploading dmg to Apple to notarize"
xcrun notarytool submit "$DMG" --apple-id "$APPLE_ID" --password "$APPLE_PASSWORD" --team-id "$TEAM_ID" --wait > notarize_dmg_result.txt
echo "== Dmg notarize result"
cat notarize_dmg_result.txt

echo "== Stapling ticket into dmg"
xcrun stapler staple "$DMG"

echo "DONE"
