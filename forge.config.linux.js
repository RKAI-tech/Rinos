module.exports = {
  // Cấu hình Forge dùng khi build trên Linux
  makers: [
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          icon: 'images/icon.png',
        },
      },
    },
  ],
};
