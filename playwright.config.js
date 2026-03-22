const { defineConfig } = require('@playwright/test');
const path = require('path');

module.exports = defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'file://' + path.resolve(__dirname, 'shopping-list.html').replace(/\\/g, '/'),
    headless: false,
    screenshot: 'on',
    video: 'off',
  },
  reporter: [['list'], ['html', { open: 'never' }]],
});
