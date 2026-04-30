// // 定义 GPS 点类型
// interface GPSPoint {
//   lat: number;
//   lng: number;
// }

// // 函数参数类型
// interface GenerateRouteImageOptions {
//   gpsPoints: GPSPoint[];      // GPS 点数组
//   lineColor?: string;         // 线条颜色，默认蓝色
//   lineWidth?: number;         // 线条粗细，默认 2px
//   bgImageUrl?: string;        // 背景图 URL，可选
//   width?: number;             // 画布宽度，默认 300
//   height?: number;            // 画布高度，默认 200
//   padding?: number;           // 边界留白，默认 20
// }

// // 返回值类型
// interface RouteImageResult {
//   base64: string;             // base64 图片字符串
//   blob: Blob;                 // Blob 文件
// }

// /**
//  * 生成行程路线缩略图
//  * @param options 配置参数
//  * @returns Promise 返回 base64 字符串和 Blob 文件
//  */
// async function generateRouteImage({
//   gpsPoints,
//   lineColor = '#007bff',
//   lineWidth = 2,
//   bgImageUrl = '',
//   width = 300,
//   height = 200,
//   padding = 20,
// }: GenerateRouteImageOptions): Promise<RouteImageResult> {
//   // 创建虚拟 canvas
//   const canvas = document.createElement('canvas');
//   canvas.width = width;
//   canvas.height = height;
//   const ctx = canvas.getContext('2d');
//   if (!ctx) {
//     throw new Error('无法获取 Canvas 2D 上下文');
//   }

//   // 计算经纬度范围并映射到画布
//   const lats = gpsPoints.map(p => p.lat);
//   const lngs = gpsPoints.map(p => p.lng);
//   const minLat = Math.min(...lats);
//   const maxLat = Math.max(...lats);
//   const minLng = Math.min(...lngs);
//   const maxLng = Math.max(...lngs);

//   const latRange = maxLat - minLat || 0.001;
//   const lngRange = maxLng - minLng || 0.001;

//   const points = gpsPoints.map(point => ({
//     x: padding + ((point.lng - minLng) / lngRange) * (width - 2 * padding),
//     y: padding + (height - 2 * padding) - ((point.lat - minLat) / latRange) * (height - 2 * padding),
//   }));

//   // 绘制背景
//   const drawBackground = async (): Promise<void> => {
//     return new Promise((resolve) => {
//       if (bgImageUrl) {
//         const bgImage = new Image();
//         bgImage.crossOrigin = 'Anonymous';
//         bgImage.onload = () => {
//           ctx.drawImage(bgImage, 0, 0, width, height);
//           resolve();
//         };
//         bgImage.onerror = () => {
//           ctx.fillStyle = '#f0f0f0';
//           ctx.fillRect(0, 0, width, height);
//           resolve();
//         };
//         bgImage.src = bgImageUrl;
//       } else {
//         ctx.fillStyle = '#f0f0f0';
//         ctx.fillRect(0, 0, width, height);
//         resolve();
//       }
//     });
//   };

//   // 绘制路径
//   const drawPath = () => {
//     ctx.beginPath();
//     ctx.strokeStyle = lineColor;
//     ctx.lineWidth = lineWidth;

//     for (let i = 0; i < points.length - 1; i++) {
//       const p1 = points[i];
//       const p2 = points[i + 1];

//       if (i === 0) {
//         ctx.moveTo(p1.x, p1.y);
//       }

//       const midX = (p1.x + p2.x) / 2;
//       const midY = (p1.y + p2.y) / 2;
//       const cp1X = midX + (p1.y - p2.y) * 0.2;
//       const cp1Y = midY + (p2.x - p1.x) * 0.2;

//       ctx.quadraticCurveTo(cp1X, cp1Y, p2.x, p2.y);
//     }
//     ctx.stroke();
//   };

//   // 执行绘制
//   await drawBackground();
//   drawPath();

//   // 生成 base64 和 Blob
//   const base64 = canvas.toDataURL('image/png');
//   return new Promise((resolve) => {
//     canvas.toBlob((blob) => {
//       if (!blob) {
//         throw new Error('生成 Blob 失败');
//       }
//       resolve({ base64, blob });
//     }, 'image/png');
//   });
// }

// // 使用示例
// async function testGenerateRouteImage() {
//   // 生成 1000 个 GPS 点
//   const gpsPoints: GPSPoint[] = [];
//   let lat = 39.9042; // 北京
//   let lng = 116.4074;
//   for (let i = 0; i < 1000; i++) {
//     lat -= 0.01 + Math.random() * 0.02;
//     lng += 0.01 + Math.random() * 0.02;
//     gpsPoints.push({ lat, lng });
//   }
//   gpsPoints[0] = { lat: 39.9042, lng: 116.4074 }; // 北京
//   gpsPoints[999] = { lat: 31.2304, lng: 121.4737 }; // 上海

//   try {
//     const result = await generateRouteImage({
//       gpsPoints,
//       lineColor: '#ff0000', // 红色
//       lineWidth: 3,
//       bgImageUrl: 'https://via.placeholder.com/300x200', // 示例背景图
//       width: 300,
//       height: 200,
//       padding: 20,
//     });

//     // 打印 base64
//     console.log('Base64:', result.base64);

//     // 显示图片
//     const img = document.createElement('img');
//     img.src = result.base64;
//     document.body.appendChild(img);

//     // 下载 Blob 文件
//     const link = document.createElement('a');
//     link.href = URL.createObjectURL(result.blob);
//     link.download = 'route-thumbnail.png';
//     link.click();
//   } catch (error) {
//     console.error('生成图片失败:', error);
//   }
// }

// // 测试
// testGenerateRouteImage();


export const a = 1