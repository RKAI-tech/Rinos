#!/bin/bash

# Dùng đường dẫn tuyệt đối để tránh lỗi khi cd qua lại
BASE_DIR="$PWD"
TARGET_DIR="$BASE_DIR/my-browsers/edge-mac"
TEMP_DIR="$BASE_DIR/temp_edge_pkg"
PKG_FILE="$BASE_DIR/edge.pkg"

# Link tải bản Stable mới nhất (Universal cho cả Intel & Apple Silicon)
DOWNLOAD_URL="https://go.microsoft.com/fwlink/?linkid=2069148"

# 1. Dọn dẹp cũ & Tạo thư mục
echo "🧹 Đang dọn dẹp..."
rm -rf "$TARGET_DIR" "$TEMP_DIR" "$PKG_FILE"
mkdir -p "$TARGET_DIR"

# 2. Tải file
echo "🍎 Đang tải Microsoft Edge (macOS pkg)..."
# -L: Follow redirect, -f: Fail on error
if ! curl -L -f -o "$PKG_FILE" "$DOWNLOAD_URL"; then
    echo "❌ Lỗi: Không tải được file."
    exit 1
fi

# 3. Giải nén PKG
echo "📦 Đang bung file .pkg..."
# pkgutil --expand giải nén cấu trúc gói cài đặt
pkgutil --expand "$PKG_FILE" "$TEMP_DIR"

# Tìm file Payload (Nó thường nằm trong thư mục con .pkg bên trong)
# Cấu trúc: temp/MicrosoftEdge-version.pkg/Payload
PAYLOAD_PATH=$(find "$TEMP_DIR" -name "Payload" | head -n 1)

if [ -z "$PAYLOAD_PATH" ]; then
    echo "❌ Lỗi: Không tìm thấy Payload."
    exit 1
fi

# 4. Giải nén Payload (QUAN TRỌNG: Cần gunzip trước khi cpio)
echo "📂 Đang trích xuất Application từ Payload..."
cd "$TARGET_DIR" || exit

# Giải thích: Payload là file cpio đã nén gzip. 
# cpio -i: extract, -d: tạo thư mục nếu cần
cat "$PAYLOAD_PATH" | gunzip -dc | cpio -i -d 2>/dev/null

# 5. Dọn dẹp file rác
echo "🗑️  Đang xóa file tạm..."
cd "$BASE_DIR" || exit
rm -rf "$TEMP_DIR" "$PKG_FILE"

# Kiểm tra kết quả
APP_PATH="$TARGET_DIR/Microsoft Edge.app"
if [ -d "$APP_PATH" ]; then
    # 6. Bypass Gatekeeper (Quan trọng để chạy được dạng portable)
    echo "🔓 Đang mở khóa Gatekeeper (xattr)..."
    xattr -cr "$APP_PATH"

    echo "✅ Hoàn tất!"
    echo "Executable path:"
    echo "$APP_PATH/Contents/MacOS/Microsoft Edge"
else
    echo "❌ Lỗi: Không thấy file .app sau khi giải nén."
    exit 1
fi