#!/bin/bash
 
TARGET_DIR="$PWD/my-browsers/edge-mac"
mkdir -p "$TARGET_DIR"
 
# Link tải trực tiếp bản Stable cho Mac
DOWNLOAD_URL="https://go.microsoft.com/fwlink/?linkid=2069148"
PKG_FILE="edge.pkg"
TEMP_EXPAND="temp_expand"
 
echo "🍎 Đang tải Microsoft Edge cho macOS..."
curl -L -o "$PKG_FILE" "$DOWNLOAD_URL"
 
echo "📦 Đang giải nén file .pkg..."
pkgutil --expand "$PKG_FILE" "$TEMP_EXPAND"
 
# Vào folder Payload để lấy App
cd "$TEMP_EXPAND"/*.pkg || exit
cat Payload | cpio -i
 
# Di chuyển App ra ngoài
rm -rf "$TARGET_DIR/Microsoft Edge.app" 
mv "Microsoft Edge.app" "$TARGET_DIR/"
 
# Dọn dẹp
cd ../..
rm -rf "$PKG_FILE" "$TEMP_EXPAND"
 
# Mở khóa bảo mật (Quan trọng)
echo "🔓 Đang Remove Quarantine..."
xattr -cr "$TARGET_DIR/Microsoft Edge.app"
 
echo "✅ Hoàn tất! Executable path:"
echo "$TARGET_DIR/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"