import fs from 'fs';
import path from 'path';
import png2icons from 'png2icons';

const root = process.cwd();
const srcPng = path.join(root, 'app_logo.png');
const outDir = path.join(root, 'build', 'icons');
const outIco = path.join(outDir, 'icon.ico');

if (!fs.existsSync(srcPng)) {
  // console.error('Không tìm thấy app_logo.png ở project root');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

const input = fs.readFileSync(srcPng);

// Chuyển PNG -> ICO với các kích thước tiêu chuẩn Windows
const icoBuffer = png2icons.createICO(input, png2icons.BICUBIC, 0, true, [256, 128, 64, 48, 32, 16]);
if (!icoBuffer || !icoBuffer.length) {
  // console.error('Tạo ICO thất bại');
  process.exit(2);
}

fs.writeFileSync(outIco, icoBuffer);
// console.log('Đã tạo', outIco);


