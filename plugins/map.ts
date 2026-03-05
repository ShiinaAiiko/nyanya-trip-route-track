import { getShortId } from '@nyanyajs/utils'
import md5 from 'blueimp-md5'
import Leaflet, { ControlPosition } from 'leaflet'

export const getZoomDistanceScale = (zoom: number) => {
  const scaleValues: {
    [zoom: number]: number
  } = {
    0: 500000,
    1: 10000,
    2: 4000,
    3: 2000,
    4: 1000,
    5: 400,
    6: 200,
    7: 100,
    8: 60,
    9: 30,
    10: 12,
    11: 8,
    12: 5,
    13: 2,
    14: 1,
    15: 0.5,
    16: 0.2,
    17: 0.1,
    18: 0.05,
  }

  const scaleValuesKeys = Object.keys(scaleValues)

  for (let i = 0; i < scaleValuesKeys.length; i++) {
    const k = Number(scaleValuesKeys[i])
    const val = scaleValues[k]
    // console.log("getZoomDistanceScale", k, val)
    if (zoom >= k && zoom < k + 1) {
      return {
        distance: zoom === k ? scaleValues[k] : scaleValues[k + 1],
        percentage: 1 - (zoom - k),
      }
    }
  }

  return {
    distance: scaleValues[1],
    percentage: 1,
  }
}

export const createDistanceScaleControl = (
  map: Leaflet.Map,
  rulerMaxWidth: number = 100,
  controlStyle: {
    position: ControlPosition
    x?: string
    y?: string
  }
) => {
  const L: typeof Leaflet = (window as any).L
  const customScale = L.control.zoom({
    position: controlStyle.position,
  })

  // console.log("createDistanceScaleControl", map)

  const id = getShortId(9)

  customScale.onAdd = (map) => {
    const div = L.DomUtil.create('div', 'custom-distance-scale')
    div.classList.add(id)
    div.style.transform = `translate(${controlStyle.x || '0px'}, ${controlStyle.y || '0px'})`
    div.innerHTML =
      '<span class="ds-distance"></span><div class="ds-ruler"></div>'
    return div
  }

  customScale.addTo(map)

  const funcObj = {
    setDistance: (zoom: number) => {
      const dsEl: HTMLElement = document.querySelector(
        '.' + id + '.custom-distance-scale'
      ) as any
      if (!dsEl) return
      const disEl = dsEl?.querySelector('.ds-distance')
      const dis = getZoomDistanceScale(zoom || 1)
      console.log('getZoomDistanceScale dis', zoom, dis)
      if (dis) {
        const rulerEl = dsEl?.querySelector('.ds-ruler') as HTMLElement

        if (rulerEl) {
          rulerEl.style.width = rulerMaxWidth * dis.percentage + 'px'
        }
      }
      if (disEl) {
        disEl.innerHTML = String(
          dis.distance >= 1 ? dis.distance + 'km' : dis.distance * 1000 + 'm'
        )
      }
    },
  }
  map.on('zoom', (e) => {
    console.log('zoomEvent1', e.target._zoom)
    funcObj.setDistance(e.target._zoom)
  })
  funcObj.setDistance(map.getZoom())
  return funcObj
}
export function smoothSetBearing(
  map: any,
  targetBearing: number,
  duration: number = 400,
  easing:
    | 'linear'
    | 'easeInQuad'
    | 'easeOutQuad'
    | 'easeInOutQuad' = 'easeOutQuad',
  // 场景推荐 threshold说明车载导航（高速行驶）10° ~ 15°小抖动不动画，节省 CPU，转向仍平滑步行/慢速移动5° ~ 10°更敏感，但动画频率稍高极致省电/低性能设备20° ~ 30°小角度直接跳，牺牲一点平滑度默认15大多数情况平衡较好
  threshold: number = 3
): void {
  if (
    !map ||
    typeof map.getBearing !== 'function' ||
    typeof map.setBearing !== 'function'
  ) {
    console.warn('smoothSetBearing: map 或 bearing 方法不可用')
    return
  }

  // 当前 bearing
  const startBearing = map.getBearing() ?? 0

  // 目标 bearing（你传入的 -heading，可能负值）
  // const targetBearingInput = targetBearing

  // Step 1: 都规范化到 [0, 360)
  let normStart = ((startBearing % 360) + 360) % 360
  let normTarget = ((targetBearing % 360) + 360) % 360

  // Step 2: 计算两种可能的 delta（正向和反向）
  let delta = normTarget - normStart

  // 强制转成 -180 ~ +180 范围（这是关键步骤，必须严格这样写）
  delta = delta - 360 * Math.round(delta / 360) // 先粗调到 -360 ~ +360
  if (delta > 180) delta -= 360
  if (delta < -180) delta += 360

  // 或者更简洁的经典写法（等价）：
  delta = ((delta + 180) % 360) - 180

  // 现在 delta 一定在 -180 ~ 180 之间
  const absDelta = Math.abs(delta)

  // console.log(
  //   `start raw: ${startBearing.toFixed(2)} → norm: ${normStart.toFixed(2)} | ` +
  //     `target raw: ${targetBearing.toFixed(2)} → norm: ${normTarget.toFixed(2)} | ` +
  //     `delta: ${delta.toFixed(2)}° (abs: ${absDelta.toFixed(2)}°)`
  // )

  // 如果变化很小，直接设置，不动画
  if (absDelta <= threshold) {
    if (absDelta <= 1) {
      // console.log(
      //   `[smoothSetBearing] 过小，不予变化 (${absDelta.toFixed(1)}° ≤ ${threshold}°)，直接设置，targetBearing${targetBearing}, startBearing${startBearing}`
      // )
      return
    }
    map.setBearing(normTarget)
    // console.log(
    //   `[smoothSetBearing] 小角度变化 (${absDelta.toFixed(1)}° ≤ ${threshold}°)，直接设置，targetBearing${targetBearing}, startBearing${startBearing}`
    // )
    return
  }

  // 大于阈值，才做动画
  // console.log(
  //   `[smoothSetBearing] 大角度变化 (${absDelta.toFixed(1)}° > ${threshold}°)，启动动画，targetBearing${targetBearing}, startBearing${startBearing}`
  // )

  // 最终目标（用于日志，不直接用在动画中）
  // const target = startBearing + delta

  let startTime: number | null = null

  const easings: Record<string, (t: number) => number> = {
    linear: (t) => t,
    easeInQuad: (t) => t * t,
    easeOutQuad: (t) => t * (2 - t),
    easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  }

  const easeFn = easings[easing] ?? easings.easeOutQuad

  // 调试日志（建议保留，测试完可删）
  // console.log(
  //   'smoothSetBearing 调用：',
  //   '原始 targetBearing:',
  //   targetBearing,
  //   '规范化后:',
  //   normalizedTarget.toFixed(2),
  //   '当前 bearing:',
  //   startBearing.toFixed(2),
  //   'delta:',
  //   delta.toFixed(2),
  //   '最终目标:',
  //   target.toFixed(2)
  // )

  const animate = (timestamp: number) => {
    if (startTime === null) {
      startTime = timestamp
    }

    const elapsed = timestamp - startTime
    let progress = elapsed / duration
    if (progress >= 1) progress = 1

    // 当前 bearing
    let currentBearing = startBearing + delta * easeFn(progress)

    // 规范化 currentBearing，防止浮点漂移
    currentBearing = ((currentBearing % 360) + 360) % 360

    map.setBearing(currentBearing)

    // 结束条件：progress >=1 或角度已足够接近（防无限帧）
    if (progress < 1) {
      requestAnimationFrame(animate)
    } else {
      // 最后一帧强制设到规范化目标，避免微小误差
      map.setBearing(normTarget)
    }
  }

  requestAnimationFrame(animate)
}
