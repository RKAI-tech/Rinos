const os = require('os');

const platform = os.platform(); // 'linux', 'win32', 'darwin'

let config;

if (platform === 'linux') {
  // Cấu hình riêng cho Linux
  config = require('./forge.config.linux');
} else if (platform === 'win32') {
  // Cấu hình riêng cho Windows
  config = require('./forge.config.win');
} else {
  // Mặc định: macOS
  config = require('./forge.config.mac');
}

module.exports = config;
