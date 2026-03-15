import React, { FC, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { RootState } from '../store'

const AltitudeDashboard = ({
  altitude = -100000,
  altitudeAccuracy,
  heading = 0,
  radius = 100,
}: {
  altitude?: number
  altitudeAccuracy: number
  heading: number
  radius: number
}) => {
  const { t, i18n } = useTranslation('altitudePage')

  const { config, user, geo } = useSelector((state: RootState) => {
    return state
  })

  const altitudeData = useMemo(() => {
    const num = altitude.toFixed(2).split('.')
    return {
      num: num[0] === '-100000' || num[0] === '-1' ? '---' : num[0],
      decimalPoint: num[1] === '00' ? '--' : '.' + num[1],
    }
  }, [altitude])

  // 全局或组件内部的持久状态
  let lastHeading = useRef(0) // 上一次的 heading 值（0 ~ 360）
  let totalRotation = useRef(0) // 累加的总旋转角度，可以远超 360 或负值

  const onNewHeading = (newHeading: number) => {
    // newHeading 通常是 0 ~ 360 的范围（来自传感器或计算）

    // 步骤1：计算本次变化的原始差值
    let delta = newHeading - lastHeading.current

    // 步骤2：把 delta 规范到 [-180, +180] 区间（选择最短路径）
    // 这行是关键魔法
    if (Math.abs(delta) > 180) {
      delta = delta > 0 ? delta - 360 : delta + 360
    }

    // 步骤3：累加这个“最短 delta”到总旋转量
    totalRotation.current += delta

    // 步骤4：记住本次 heading 用于下次比较
    lastHeading.current = newHeading

    return totalRotation.current
  }

  const compassEl = useRef<HTMLDivElement>(null)

  const newHeading = useMemo(() => {
    return onNewHeading(heading || 0)
  }, [heading])

  // const lastHeading = useRef(0)

  // const newHeading = useMemo(() => {
  //   // 3. 运行动画
  //   const animation = compassEl.current?.animate(
  //     [
  //       { transform: `rotate(${lastHeading.current}deg)` },
  //       { transform: `rotate(${heading}deg)` },
  //     ],
  //     {
  //       duration: 300,
  //       easing: 'linear',
  //       iterations: 1,
  //       direction: 'normal',
  //       fill: 'forwards',
  //     }
  //   )

  //   // 4. 监听动画结束
  //   if (animation) {
  //     animation.onfinish = () => {
  //       console.log('动画播放完成')
  //       if (!compassEl.current) {
  //         return
  //       }
  //       lastHeading.current = heading
  //       // compassEl.current.style.transform = `rotate(${heading}deg)`
  //     }
  //   }
  // }, [heading])

  return (
    <div
      style={
        {
          '--ad-w': radius * 2 + 'px',
          '--position-heading': newHeading + 'deg',
        } as any
      }
      className="altitude-dashboard"
    >
      <div className="ad-data">
        <div className={`ad-d-title ${config.lang}`}>{t('liveAltitude')}</div>
        {/* <p>{newHeading}</p> */}
        <div className="ad-d-val">
          <div className="ad-d-v-num">{altitudeData.num}</div>
          <div className="ad-d-v-unit">
            <div className="ad-dvu-decimalPoint">
              {altitudeData.decimalPoint}
            </div>
            <div className="ad-dvu-unit">{t('meters')}</div>
          </div>
        </div>
        <div className="ad-d-accuracy">
          {altitudeAccuracy >= 0 ? '±' + Math.round(altitudeAccuracy) : '±0'}
        </div>
      </div>
      <div ref={compassEl} className="ad-compass">
        <div className="adc-n">
          <span>N</span>
        </div>
        <div className="adc-s">
          <span>S</span>
        </div>
      </div>
      <svg viewBox="0 0 400 400" className="altimeter-svg">
        <defs>
          <clipPath id="mountain-mask">
            <path
              d="
                M0,400 
                L0,220 
                Q40,180 80,210 
                T160,190 
                T240,220 
                T320,180 
                T400,210 
                L400,400 Z"
              transform="translate(0,-30) scale(1,1.1)"
            />
          </clipPath>

          <radialGradient id="mountain-far" cx="50%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#f8bfcd" />
            <stop offset="70%" stopColor="#f29cb2" />
            <stop offset="100%" stopColor="#f87f9d" stopOpacity="0.4" />
          </radialGradient>

          <linearGradient id="mountain-near" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#d8a8b4" />
            <stop offset="50%" stopColor="#d68b9e" />
            <stop offset="100%" stopColor="#d8708a" />
          </linearGradient>

          <filter
            id="mountain-blur"
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation={8} result="blur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope={0.7} />
            </feComponentTransfer>
          </filter>
        </defs>

        <circle
          cx={200}
          cy={205}
          r={180}
          fill="url(#mountain-far)"
          opacity={0.7}
          filter="url(#mountain-blur)"
        />

        <circle
          cx={200}
          cy={200}
          r={170}
          fill="url(#mountain-near)"
          clipPath="url(#mountain-mask)"
          opacity={0.85}
        />

        {/* <circle
          cx={200}
          cy={200}
          r={185}
          fill="none"
          stroke="#5a7a9a"
          strokeWidth={12}
          opacity={0.25}
          filter="url(#mountain-blur)"
        /> */}

        <g transform="translate(200,200)">
          {/*

          <text
            x={0}
            y={20}
            // y={-40}
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            fontSize={78}
            fontWeight="bold"
            fill="#666"
            letterSpacing={-2}
          >
            3589
          </text>

          <text
            x={120}
            y={10}
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            fontSize={36}
            fill="#666"
          >
            .00
          </text>

          <text
            x={0}
            y={60}
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            fontSize={28}
            fill="#b0c4de"
          >
            m
          </text>

          <text
            x={0}
            y={100}
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            fontSize={24}
            fill="#88aaff"
            opacity={0.8}
          >
            ±5
          </text> */}
        </g>
      </svg>
    </div>
  )
}

export default AltitudeDashboard
