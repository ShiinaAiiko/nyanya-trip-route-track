module.exports = {
  // 项目基础配置
  // project: {
  //   // ios: {
  //   //   // iOS 相关配置（自动链接）
  //   //   sourceDir: './ios', // 自定义 iOS 项目路径
  //   //   unstable_reactLegacyComponentNames: ['RNCSafeAreaProvider'], // 兼容旧版组件
  //   // },
  //   android: {
  //     packageName: 'com.rnapp.debug', // 强制使用 debug 包名
  //     // // Android 相关配置（自动链接）
  //     // sourceDir: './android', // 自定义 Android 项目路径
  //     // unstable_reactLegacyComponentNames: ['RNCSafeAreaProvider'],
  //   },
  // },
  // 资源文件配置（字体/图片等）
  // assets: [
  //   // './src/assets/fonts/', // 字体文件目录
  //   // './src/assets/images/', // 图片目录（会复制到原生项目）
  // ],
  // // 自定义依赖配置（覆盖自动链接）
  // dependencies: {
  //   // 'react-native-vector-icons': {
  //   //   platforms: {
  //   //     ios: null, // 禁用 iOS 自动链接（手动配置）
  //   //     android: null, // 禁用 Android 自动链接
  //   //   },
  //   // },
  //   // 'react-native-geolocation-service': {
  //   //   platforms: {
  //   //     android: {
  //   //       packageImportPath: 'import com.agontuk.RNFusedLocationPackage;',
  //   //       packageInstance: 'new RNFusedLocationPackage()',
  //   //     },
  //   //   },
  //   // },
  // },
  // // 自定义命令（可通过 `npx react-native <command>` 调用）
  // commands: [
  //   {
  //     name: 'run-custom',
  //     func: () => {
  //       console.log('执行自定义命令');
  //       // 这里可以写自定义逻辑
  //     },
  //     description: '运行自定义任务',
  //   },
  // ],
  // // Metro 打包配置覆盖
  // metro: {
  //   resolver: {
  //     resolverMainFields: ['react-native', 'browser', 'main'],
  //     extraNodeModules: {
  //       stream: require.resolve('stream-browserify'),
  //     },
  //   },
  //   transformer: {
  //     getTransformOptions: async () => ({
  //       transform: {
  //         experimentalImportSupport: false,
  //         inlineRequires: true,
  //       },
  //     }),
  //   },
  // },
};
