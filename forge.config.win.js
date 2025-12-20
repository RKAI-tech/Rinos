module.exports = {
  // Cấu hình Forge dùng khi build trên Windows
  packagerConfig: {
    // Forge sẽ tự lấy icon .ico từ "images/icon.ico"
    icon: 'images/icon',
  },
  makers: [
    // Bạn có thể thêm makers Windows (Squirrel/NSIS) ở đây nếu dùng Forge để build Win
    // Ví dụ:
    // {
    //   name: '@electron-forge/maker-squirrel',
    //   config: { /* ... */ },
    // },
  ],
};
