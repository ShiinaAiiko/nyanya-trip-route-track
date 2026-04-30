import { bindEvent } from '@saki-ui/core'
import React, { useEffect, useRef, useState } from 'react'
import { SakiButton } from './saki-ui-react/components'
import { useSelector } from 'react-redux'
import { RootState } from '../store'
import { useTranslation } from 'react-i18next'
import { Debounce } from '@nyanyajs/utils'
import { newStripHtmlTags } from '../plugins/methods'

interface WaveConfig {
  y: number
  length: number
  amplitude: number
  speed: number
  color: string
  phase: number
}

export const AILiveWave: React.FC<{
  /** 波动高度系数 (在 110px 高度下，建议 30 - 80) */
  amplitude?: number
  /** 动画速度系数 */
  speed?: number
  message?: string
  className?: string
  opacity?: number
  loadingMessage?: boolean
  onStop?: () => void
  onSend?: (messageRichText?: string) => void
  onClose?: () => void
  onZoomIn?: () => void
  onSpeak?: () => void
  isSpeak?: boolean
  isSend?: boolean
  startAICoDriver?: boolean
  onStartAICoDriver?: () => void
  bottomLeftChildren?: React.FC | undefined | React.JSX.Element
  haveAiMessage?: boolean
  inputMessageRichText?: string
  onInputMessageRichText?: (messageRichText?: string) => void
  onUndo?: () => void
}> = ({
  amplitude = 60,
  speed = 4,
  message = 'Gemini Live · 正在倾听',
  className = '',
  opacity = 0.9,
  loadingMessage = false,
  onStop,
  onSend,
  onClose,
  onZoomIn,
  isSpeak = false,
  onSpeak,
  isSend = false,
  startAICoDriver = true,
  onStartAICoDriver,
  bottomLeftChildren,
  haveAiMessage = false,
  inputMessageRichText,
  onInputMessageRichText,
  onUndo,
}) => {
  const { t, i18n } = useTranslation('aiChatModal')
  const config = useSelector((state: RootState) => state.config)
  const user = useSelector((state: RootState) => state.user)

  const richtextEl = useRef<any>()

  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mkEl = useRef<any>(null)
  const requestRef = useRef<number>()
  const timeRef = useRef<number>(0)

  // 关键：将 y 设为 1.0 或接近 1.0，让波纹基准线死死贴住底部
  const waveConfigs: WaveConfig[] = [
    {
      y: 0.95, // 基准线靠近底部
      length: 0.012,
      amplitude: 1.0,
      speed: 1.0,
      color: `rgba(66, 133, 244, ${opacity})`,
      phase: 0,
    },
    {
      y: 0.98,
      length: 0.015,
      amplitude: 0.8,
      speed: 0.8,
      color: `rgba(161, 66, 244, ${opacity - 0.1})`,
      phase: Math.PI / 2,
    },
    {
      y: 1.0, // 完全从最底部起伏
      length: 0.01,
      amplitude: 1.2,
      speed: 1.2,
      color: `rgba(0, 255, 230, ${opacity - 0.2})`,
      phase: Math.PI,
    },
  ]

  const animate = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)

    const step = speed * 0.02
    timeRef.current += step

    ctx.globalCompositeOperation = 'screen'

    waveConfigs.forEach((config) => {
      ctx.beginPath()

      // 在矮盒子里，amplitude 如果太大容易撞顶，如果太小没感觉
      const currentAmp = config.amplitude * amplitude

      // 调整渐变：确保颜色从波峰最高点一直拉到容器最底部
      const gradient = ctx.createLinearGradient(
        0,
        height * config.y - currentAmp,
        0,
        height
      )
      gradient.addColorStop(0, config.color)
      gradient.addColorStop(0.4, config.color.replace(/0\.[678]/, '0.2'))
      gradient.addColorStop(1, 'rgba(5, 7, 10, 0)')

      ctx.fillStyle = gradient

      for (let x = 0; x <= width; x += 2) {
        const waveBase = Math.sin(x * config.length + config.phase)
        const oscillator = Math.sin(timeRef.current * config.speed + x * 0.002)

        // 核心改动：使用 Math.abs 或者偏移，确保波纹主要是往“上”跑，而不是在基准线上下对称
        // 这样即使盒子只有 110px，波纹也会从底部向上涌动
        const move = waveBase * oscillator
        const y = height * config.y + move * currentAmp - currentAmp * 0.5 // 整体向上提半个振幅

        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }

      ctx.lineTo(width, height)
      ctx.lineTo(0, height)
      ctx.fill()
    })

    requestRef.current = requestAnimationFrame(animate)
  }

  useEffect(() => {
    const updateSize = () => {
      const container = containerRef.current
      const canvas = canvasRef.current
      if (!container || !canvas) return
      const { width, height } = container.getBoundingClientRect()
      canvas.width = width
      canvas.height = height
    }

    const resizeObserver = new ResizeObserver(() => updateSize())
    if (containerRef.current) resizeObserver.observe(containerRef.current)

    updateSize()
    requestRef.current = requestAnimationFrame(animate)

    return () => {
      resizeObserver.disconnect()
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
    }
  }, [amplitude, speed])

  console.log('inputMessageRichText', inputMessageRichText)

  useEffect(() => {
    richtextEl.current?.setValue(inputMessageRichText)
  }, [inputMessageRichText])

  const d = useRef(new Debounce())
  useEffect(() => {
    if (!loadingMessage && message) {
      d.current.increase(() => {
        mkEl.current?.scrollTo('Bottom')
      }, 300)
    }
  }, [message, loadingMessage])

  // console.log('AI领航员a tokenInfo', bottomLeftChildren)

  return (
    <div
      ref={containerRef}
      className={`ai-live-wave-container ${className} ${!loadingMessage && haveAiMessage ? 'column' : ''}`}
      style={{}}
    >
      <canvas ref={canvasRef} />
      <div className="ui-message">
        <div className="message">
          {message ? (
            <saki-markdown-render
              ref={mkEl}
              color="#fff"
              font-size="14px"
              max-height={
                config.deviceType === 'Mobile'
                  ? '110px'
                  : !loadingMessage && message
                    ? '146px'
                    : '180px'
              }
              markdown={message || t('writeMmessage')}
              theme="light"
              keep-position-at={loadingMessage ? 'Bottom' : ''}
            ></saki-markdown-render>
          ) : (
            <saki-richtext
              ref={bindEvent(
                {
                  changevalue: (e) => {
                    // console.log('textarea', e.detail)
                    // e.detail.richText = e.detail.richText.replace(
                    // 	xiao,
                    // 	'😂'
                    // )
                    // console.log('textarea', e.detail)
                    onInputMessageRichText?.(e.detail.richText)
                  },
                  submit: () => {
                    onSend?.(inputMessageRichText)
                  },
                },
                (e) => {
                  richtextEl.current = e
                  richtextEl.current?.setToolbar?.({
                    container: [],
                  })
                }
              )}
              theme="snow"
              toolbar="false"
              editor-padding="0px"
              toolbar-padding="0px"
              max-height="250px"
              width="100%"
              padding="0"
              margin="4px 0"
              font-size="14px"
              border-radius="0"
              min-length="0"
              max-length="100"
              clear-all-styles-when-pasting
              enter={
                config.deviceType === 'PC' ||
                user.userAgent?.os?.name === 'Windows' ||
                user.userAgent?.os?.name === 'Linux x86_64' ||
                user.userAgent?.os?.name === 'Mac OS X'
                  ? 'Submit'
                  : 'NewLine'
              }
              short-enter="NewLine"
              background-color="rgb(243,243,243)"
              value={inputMessageRichText}
              // :value="currentChat.value"
              // @clearvalue="currentChat.value = ''"
              // @pressenter="currentChat.send"
              // @changevalue="(e:CustomEvent)=>currentChat.changevalue(e)"
              placeholder={t('writeMmessage')}
            />
          )}
        </div>

        <div className={`uim-buttons ${message ? 'column' : 'row'}`}>
          <div className="uimb-left">
            {typeof bottomLeftChildren === 'function'
              ? bottomLeftChildren({})
              : bottomLeftChildren}
          </div>
          <div className="uimb-right">
            {!loadingMessage && haveAiMessage ? (
              <saki-button
                ref={bindEvent({
                  tap: () => {
                    onUndo?.()
                  },
                })}
                width="34px"
                height="34px"
                margin="0 0"
                type="CircleIconGrayHover"
                bg-color="transparent"
                bg-hover-color="#666"
                bg-active-color="#888"
              >
                <saki-icon
                  type="Undo"
                  width="18px"
                  height="18px"
                  color="#fff"
                />
              </saki-button>
            ) : (
              ''
            )}
            {loadingMessage ? (
              <saki-button
                ref={bindEvent({
                  tap: () => {
                    onStop?.()
                  },
                })}
                width="34px"
                height="34px"
                margin="0 0"
                type="CircleIconGrayHover"
                bg-color="transparent"
                bg-hover-color="#666"
                bg-active-color="#888"
              >
                <saki-icon
                  type="Stop"
                  width="16px"
                  height="16px"
                  color="var(--default-color)"
                />
              </saki-button>
            ) : isSend ? (
              <saki-button
                ref={bindEvent({
                  tap: () => {
                    onSend?.(inputMessageRichText)
                  },
                })}
                width="34px"
                height="34px"
                margin="0 0"
                type="CircleIconGrayHover"
                bg-color="transparent"
                bg-hover-color="#666"
                bg-active-color="#888"
              >
                <saki-icon
                  type="Send"
                  width="16px"
                  height="16px"
                  color="#fff"
                />
              </saki-button>
            ) : (
              <saki-button
                ref={bindEvent({
                  tap: () => {
                    onSpeak?.()
                  },
                })}
                width="34px"
                height="34px"
                margin="0 0"
                type="CircleIconGrayHover"
                bg-color="transparent"
                bg-hover-color="#666"
                bg-active-color="#888"
              >
                <saki-icon
                  type={isSpeak ? 'MicroPhoneFill' : 'MicroPhone'}
                  width="20px"
                  height="20px"
                  // color="#ccc"
                  color={isSpeak ? 'var(--saki-default-color)' : '#fff'}
                />
              </saki-button>
            )}

            {startAICoDriver ? (
              <saki-button
                ref={bindEvent({
                  tap: () => {
                    onStartAICoDriver?.()
                  },
                })}
                width="34px"
                height="34px"
                margin="0 0"
                type="CircleIconGrayHover"
                bg-color="transparent"
                bg-hover-color="#666"
                bg-active-color="#888"
              >
                <saki-icon
                  type="FlagFill"
                  width="16px"
                  height="16px"
                  color="#fff"
                />
              </saki-button>
            ) : (
              ''
            )}

            {!loadingMessage ? (
              <saki-button
                ref={bindEvent({
                  tap: () => {
                    onZoomIn?.()
                  },
                })}
                width="34px"
                height="34px"
                margin="0 0"
                type="CircleIconGrayHover"
                bg-color="transparent"
                bg-hover-color="#666"
                bg-active-color="#888"
              >
                <saki-icon
                  type="ZoomIn"
                  width="16px"
                  height="16px"
                  color="#fff"
                />
              </saki-button>
            ) : (
              ''
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AILiveWave
