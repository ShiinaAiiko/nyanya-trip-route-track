const path = require('path')

const { version } = require('./config.temp.json')
const withPWA = require('next-pwa')({
  dest: 'public',
  cacheId: `sa-app-${version}`,
  register: true, // 如果你没有手动注册脚本，保留 true
  skipWaiting: true,
  reloadOnOnline: false,
  runtimeCaching: [
    {
      urlPattern: /\.(?:js|css|html|png|jpg|svg|woff2)$/, // 只缓存特定类型
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: `sa-app-${version}`,
      },
    },
  ],
  publicExcludes: ['manifest*.json', 'testData1.json'],
  buildExcludes: [],
  fallbacks: false,
  cacheStartUrl: true,
  dynamicStartUrl: true,
  disable: process.env.NODE_ENV === 'development',
})
module.exports = withPWA({
  ...(process.env.OUTPUT === 'export'
    ? {
        output: 'export',
      }
    : {}),
  trailingSlash: false,
  reactStrictMode: false,
  swcMinify: false,
  // compiler: {
  //   reactRemoveProperties: true, // 生产环境移除开发属性
  // },
  // productionBrowserSourceMaps: true, // 生产环境启用 Source Map
  experimental: {
    legacyBrowsers: true, // 启用对旧浏览器的支持
    // forceSwcTransforms: false, // 禁用 SWC
  },
  // transpilePackages: [
  //   'problematic-library', // 替换为实际报错的库名
  // ],
  sassOptions: {
    includePaths: [path.join(__dirname, '.')],
    prependData: `@import "./assets/style/base.scss";`,
  },
  env: {
    DEFAULT_LANGUAGE: 'en-US',
    CLIENT_ENV: process.env.CLIENT_ENV,
    DOCKER_LOCALHOST: process.env.DOCKER_LOCALHOST,
  },
})
