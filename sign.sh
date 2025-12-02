#!/bin/bash


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
APP_PATH="release/mac/Automation Test Execution.app"
ENTITLEMENTS="build_mac/entitlements.mac.plist"
echo "== Start sign playwright  and electron app"
echo "==signing all executable binaries"
while IFS= read -r file; do
    if [[ "$(file -b "$file")" == *"Mach-O"* ]]; then
       echo "signing: $file"
       codesign --force --options runtime --timestamp --entitlements "$ENTITLEMENTS" --sign "$SIGN_ID" "$file"
    fi
done < <(find "$APP_PATH" -type f \
    \( -name "*.node" -o -name "*.dylib" -o -name "*.so" -o -perm +111 \))
PLAYWRIGHT_DIR="$APP_PATH/Contents/Resources/playwright-browsers"
if [ -d "$PLAYWRIGHT_DIR" ]; then
    echo "===SIGNING PLAWRIGHT CHROMINUM"
    find "$PLAYWRIGHT_DIR" -type f -perm +111 | while read f; do
        echo "signing chromium part: $f"
        codesign --force --options runtime --timestamp --entitlements "$ENTITLEMENTS" --sign "$SIGN_ID" "$f"
    done
fi
echo "sign frameworks"
for fw in "$APP_PATH/Contents/Frameworks/"*.framework; do
  echo "signing framework: $fw"
  codesign --force --options runtime --timestamp --entitlements "$ENTITLEMENTS" --sign "$SIGN_ID" "$fw"
done
APP_EXEC="$APP_PATH/Contents/MacOS/$(basename "$APP_PATH" .app)"
echo "signing main exec: $APP_EXEC"

codesign --deep --force --options runtime --timestamp --entitlements "$ENTITLEMENTS" --sign "$SIGN_ID" "$APP_EXEC"
echo "final signing app bundle"
codesign --deep --force --options runtime --timestamp --entitlements "$ENTITLEMENTS" --sign "$SIGN_ID" "$APP_PATH"
echo "=== app signing is done"
echo "===verify the signature"
codesign --verify --deep --strict --verbose=2 "$APP_PATH"
echo "=== the entire signing process is complete"
