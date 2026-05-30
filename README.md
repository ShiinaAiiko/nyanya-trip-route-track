# nyanya-trip-route-track

行程路线轨迹记录应用，一个完整的多端解决方案。

## 🌐 在线体验

- **Web 应用**：https://trip.aiiko.club/
- **App 下载**：https://trip.aiiko.club/download

## 📱 应用介绍

nyanya-trip-route-track 是一款专业的行程路线轨迹记录应用，支持 Web、iOS、Android 等多平台。实时记录您的出行轨迹，生成精美的旅行足迹地图。

## 🏗️ 项目架构

本项目采用多端分离架构，包含以下子项目：

| 项目 | 技术栈 | 说明 |
|------|--------|------|
| [trip-route-track-web](./trip-route-track-web) | Next.js + React | Web 前端，PWA 支持 |
| [trip-route-track-server](./trip-route-track-server) | Go + Gin | 后端 API 服务 |
| [trip-route-track-flutter-app](./trip-route-track-flutter-app) | Flutter | Android 原生 App |

## ✨ 核心功能

- 🗺️ **行程路线记录** - GPS 实时轨迹记录，精准定位
- 👣 **足迹地图** - 可视化展示去过的城市和地区
- 📖 **路书生成** - 自动生成精美旅行路书
- 🌤️ **海拔水印** - 照片自动添加海拔、天气等信息
- 🚗 **AI 驾驶助手** - 智能驾驶行为分析
- 📊 **数据可视化** - 行程统计、里程、海拔图表
- 🛡️ **隐私保护** - 隐私围栏保护敏感区域
- 🔄 **多端同步** - Web、App 数据实时同步

## 🛠️ 技术栈

### Web 前端
- Next.js 14 + React 18
- Redux Toolkit 状态管理
- Leaflet 地图
- Chart.js 图表
- i18next 国际化

### 后端服务
- Go 1.25 + Gin 框架
- MongoDB + Redis
- Qdrant 向量数据库
- Socket.IO 实时通信

### 移动 App
- Flutter SDK
- GeckoView / 系统 WebView
- 原生 Android 集成

## 🚀 快速开始

### Web 前端

```bash
cd trip-route-track-web
yarn install
yarn dev
```

### 后端服务

```bash
cd trip-route-track-server
go mod download
go run main.go
# 或使用 air 热重载
air
```

### Android App

```bash
cd trip-route-track-flutter-app
flutter pub get
flutter run
```

## 📂 目录结构

```
nyanya-trip-route-track/
├── trip-route-track-web/      # Web 前端
├── trip-route-track-server/   # 后端服务
├── trip-route-track-flutter-app/  # Android App
└── README.md
```

## 🔗 相关链接

- [Web 应用](https://trip.aiiko.club/)
- [App 下载](https://trip.aiiko.club/download)
- [GitHub 仓库](https://github.com/ShiinaAiiko/trip-route-track)

## 📄 License

MIT License
