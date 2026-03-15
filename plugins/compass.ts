export interface CompassData {
  heading: number // 0°=北, 90°=东, 180°=南, 270°=西（磁北方向）
  alpha: number | null // 原始 alpha 值（通常从北顺时针）
  absolute: boolean | null // 是否是绝对方向（相对于地球坐标）
  webkitCompassHeading?: number // iOS 专有字段（最准确的）
  webkitCompassAccuracy?: number // 精度（度，正负值）
  timestamp: number // 事件发生的时间戳
  error?: string // 如果出错
}

type CompassCallback = (data: CompassData) => void

/**
 * 启动指南针监听，并通过回调持续输出方向数据
 * @param onUpdate 每次方向变化时调用的回调
 * @returns 停止监听的函数
 */
export function startCompass(onUpdate: CompassCallback): () => void {
  let isListening = false

  const getHeading = (event: DeviceOrientationEvent): number | null => {
    // iOS Safari 优先使用 webkitCompassHeading（最可靠）
    if (typeof (event as any).webkitCompassHeading === 'number') {
      return (event as any).webkitCompassHeading
    }
    // 其他浏览器（Android/Chrome 等）通常用 360 - alpha
    if (event.alpha !== null) {
      return (360 - event.alpha) % 360
    }
    return null
  }

  const handleOrientation = (event: DeviceOrientationEvent) => {
    const heading = getHeading(event)

    if (heading === null) {
      onUpdate({
        heading: NaN,
        alpha: event.alpha,
        absolute: event.absolute,
        timestamp: event.timeStamp || Date.now(),
        error: '无法获取有效方向值（alpha 和 webkitCompassHeading 都为空）',
      })
      return
    }

    // 保留一位小数，方便显示
    const roundedHeading = Math.round(heading * 10) / 10

    onUpdate({
      heading: roundedHeading,
      alpha: event.alpha,
      absolute: event.absolute,
      webkitCompassHeading: (event as any).webkitCompassHeading,
      webkitCompassAccuracy: (event as any).webkitCompassAccuracy,
      timestamp: event.timeStamp || Date.now(),
    })
  }

  const startListening = () => {
    if (isListening) return
    window.addEventListener('deviceorientation', handleOrientation, true)
    isListening = true
  }

  // 主逻辑：处理权限（主要是 iOS 13+ Safari）
  if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
    // iOS 需要用户交互后请求权限
    ;(DeviceOrientationEvent as any)
      .requestPermission()
      .then((permissionState: PermissionState) => {
        if (permissionState === 'granted') {
          startListening()
          onUpdate({
            heading: 0,
            alpha: null,
            absolute: null,
            timestamp: Date.now(),
            error: '已获得权限，开始监听...',
          })
        } else {
          onUpdate({
            heading: NaN,
            alpha: null,
            absolute: null,
            timestamp: Date.now(),
            error: `权限被拒绝: ${permissionState}`,
          })
        }
      })
      .catch((err: any) => {
        onUpdate({
          heading: NaN,
          alpha: null,
          absolute: null,
          timestamp: Date.now(),
          error: `请求权限失败: ${err.message || err}`,
        })
      })
  } else {
    // 非 iOS，通常直接可用（但仍需 https）
    startListening()
    onUpdate({
      heading: 0,
      alpha: null,
      absolute: null,
      timestamp: Date.now(),
      error: '无需权限请求，已开始监听（非 iOS 环境）',
    })
  }

  // 返回停止函数
  return () => {
    if (isListening) {
      window.removeEventListener('deviceorientation', handleOrientation, true)
      isListening = false
    }
  }
}
