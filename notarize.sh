#!/bin/bash
if [ -f ".env.production" ]; then
  export $(grep -v '^#' .env.production | xargs)
else
  echo ".env file not found"
  exit 1
fi
if [ -z "$APPLE_ID" ] || [ -z "$APPLE_PASSWORD" ] ||[ -z "$TEAM_ID" ]; then
  echo "missing APPLE_ID, APPLE_PASSWORD or TEAM_ID!"
  exit 1
fi

echo "APPLE_ID=$APPLE_ID" 
echo "TEAM_ID=$TEAM_ID"
APP="release/mac/Automation Test Execution.app"
ZIP="release/mac/Automation_Test_Execution.zip"
echo " zip file packaging"

rm -f "$ZIP"
ditto -c -k --keepParent "$APP" "$ZIP"
echo "zip file is created $ZIP"
echo "uploading zip file to apple to notarize"
xcrun notarytool submit "$ZIP" --apple-id "$APPLE_ID" --password "$APPLE_PASSWORD" --team-id "$TEAM_ID" --wait >notarize_result.txt

echo " Notarize is processed"
 cat notarize_result.txt

echo "stapling into app"
xcrun stapler staple "$APP"

echo "DONE"
