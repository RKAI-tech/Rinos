#!/bin/bash
 
TARGET_DIR="$PWD/my-browsers/edge-linux"
mkdir -p "$TARGET_DIR"
 
echo "🐧 Đang tìm phiên bản Edge mới nhất cho Linux..."
 
# 1. Lấy tên file .deb mới nhất từ repository của Microsoft
REPO_URL="https://packages.microsoft.com/repos/edge/pool/main/m/microsoft-edge-stable/"
LATEST_FILE=$(curl -s $REPO_URL | grep -o 'href="[^"]*microsoft-edge-stable[^"]*_amd64.deb"' | tail -1 | cut -d'"' -f2)
DOWNLOAD_URL="${REPO_URL}${LATEST_FILE}"
 
echo "⬇️  Đang tải: $LATEST_FILE"
curl -L -o edge.deb "$DOWNLOAD_URL"
 
# 2. Giải nén file .deb (Dùng ar và tar để không cần dpkg/sudo)
echo "📦 Đang giải nén..."
ar x edge.deb
tar -xf data.tar.xz -C "$TARGET_DIR"
 
# 3. Dọn dẹp
rm edge.deb data.tar.xz control.tar.xz debian-binary
mv "$TARGET_DIR/opt/microsoft/msedge" "$TARGET_DIR/final"
rm -rf "$TARGET_DIR/opt" "$TARGET_DIR/usr" "$TARGET_DIR/etc" "$TARGET_DIR/cron.daily"
 
echo "✅ Hoàn tất! Executable path:"
echo "$TARGET_DIR/final/microsoft-edge"