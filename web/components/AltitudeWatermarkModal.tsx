import React, {
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { useSelector, useDispatch } from 'react-redux'
import store, {
  RootState,
  AppDispatch,
  useAppDispatch,
  methods,
  configSlice,
  userSlice,
  layoutSlice,
  tripSlice,
  geoSlice,
} from '../store'

import { sakisso, version } from '../config'

import moment from 'moment'

import { alert, snackbar, bindEvent } from '@saki-ui/core'
// console.log(sakiui.bindEvent)
import { storage } from '../store/storage'
import { useTranslation } from 'react-i18next'
import { httpApi } from '../plugins/http/api'
import { protoRoot } from '../protos'
import {
  exitFullscreen,
  formatAvgPace,
  formatDistance,
  formatTime,
  fullScreen,
  getAngle,
  getLatLng,
  getSpeedColor,
  getZoom,
  isFullScreen,
  isRoadColorFade,
  roadColorFade,
} from '../plugins/methods'
import TripItemComponent from './TripItem'

import { Debounce, deepCopy, NEventListener } from '@nyanyajs/utils'
import StatisticsComponent from './Statistics'
import Leaflet from 'leaflet'
import SpeedMeterComponent from './Dashboard'
import { Statistics } from '../store/trip'
import { eventListener, getMapLayer, getTrackRouteColor } from '../store/config'
import { UserInfo } from '@nyanyajs/utils/dist/sakisso'
import { getIconType } from './Vehicle'
import {
  createMyPositionMarker,
  createOtherPositionMarker,
} from '../store/position'
import { LayerButtons } from './MapLayer'
import { removeLayer } from '../store/map'
import {
  SakiButton,
  SakiIcon,
  SakiModalHeader,
  SakiRow,
} from './saki-ui-react/components'
import { selectFiles } from '../store/file'

export const AltitudeWatermarkModal = () => {
  const { t, i18n } = useTranslation('altitudeWatermarkModal')
  // ✅ 最佳实践：原子化获取
  const layout = useSelector((state: RootState) => state.layout)
  const config = useSelector((state: RootState) => state.config)
  const dispatch = useDispatch<AppDispatch>()

  const cvs = useRef<HTMLCanvasElement>(null)

  const [cvsWh, setCvsWh] = useState({
    w: 0,
    h: 0,
  })

  const [openCameraDevicesDP, setOpenCameraDevicesDP] = useState(false)

  const deb = useRef(new Debounce())

  useEffect(() => {
    if (
      layout.openAltitudeWatermarkModal.visible &&
      layout.openAltitudeWatermarkModal.selectFile
    ) {
      deb.current.increase(() => {
        layout.openAltitudeWatermarkModal.selectFile &&
          drawWatermarkToFile(layout.openAltitudeWatermarkModal.selectFile)
      }, 300)
    }

    if (!layout.openAltitudeWatermarkModal.visible) {
      const canvas = cvs.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.fillStyle = '#202021'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
  }, [
    layout.openAltitudeWatermarkModal.visible,
    layout.openAltitudeWatermarkModal.selectFile,
    config.deviceWH.w,
    config.deviceWH.h,
    config.deviceType,
  ])

  useEffect(() => {
    if (
      layout.openAltitudeWatermarkModal.visible &&
      !layout.openAltitudeWatermarkModal.selectFile
    ) {
      getVideoDevices().then((videoDevices) => {
        if (videoDevices) {
          startCamera(videoDevices.selectedDeviceId)
        }
      })
    }
  }, [layout.openAltitudeWatermarkModal.visible])

  const [watermarkInfo, setWatermarkInfo] = useState({
    model: 'REDMI K80 Ultra',
    focal: '23mm',
    aperture: 'f/1.88',
    shutter: '1/20s',
    iso: 'ISO1000',
    datetime: '2026.03.06  21:52:26',
    location: '23°52\'26"N  108°23\'57"E', // 可选，留空就隐藏
  })

  const altitude = 8848

  const drawWatermarkToFile = (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      if (!ev.target?.result) return
      const img = new Image()
      img.onload = () => {
        drawWatermark(img)
      }
      img.src = ev.target.result as any
    }
    reader.readAsDataURL(file)
  }

  const drawWatermark = (img: HTMLImageElement) => {
    if (!cvs.current) return
    const ctx = cvs.current.getContext('2d')
    if (!ctx) return
    const input = document.getElementById('imageInput')

    // 设置 canvas 尺寸与图片一致
    cvs.current.width = img.width
    cvs.current.height = img.height

    const w = config.deviceWH.w
    const h = config.deviceWH.h - 56
    const barHeight = Math.max(Math.min(Math.round(img.height * 0.1), 410), 180)

    let cvsW = 0
    let cvsH = 0

    if (img.width > img.height) {
      cvsW = w
      cvsH = (w * img.height) / img.width
    } else {
      cvsW = img.width * (h / img.height)
      cvsH = h
    }
    // cvs.current.style.height = cvsH + barHeight + 'px'

    const ratio = (img.height + barHeight) / img.height

    if (img.width > img.height) {
      cvs.current.style.width = cvsW + 'px'
      cvs.current.style.height = cvsH * ratio + 'px'
    } else {
      cvs.current.style.width = cvsW / ratio + 'px'
      cvs.current.style.height = cvsH + 'px'
    }

    cvs.current.height = img.height + barHeight

    // console.log('ccc', img.width, img.height, cvsW, cvsH, barHeight)
    // 画原图
    ctx.drawImage(img, 0, 0)

    // 信息条高度（可调，建议 8%~12%）
    const paddingX = Math.round(barHeight * 0.2)
    // const paddingX = Math.round(img.width * 0.01)
    const halfWidth = img.width / 2 // 左右各一半，中间留缝隙

    // 半透明黑色底条
    ctx.fillStyle = '#fff'
    // ctx.fillStyle = 'rgba(0,0,0,0.65)'
    ctx.fillRect(0, img.height, img.width, barHeight)

    // 基础字体大小
    // const baseFontSize = Math.round(barHeight * 0.24)

    // ---------------- 左边 ----------------
    ctx.font = `bold ${Math.round(barHeight * 0.3)}px system-ui,
      -apple-system,
      BlinkMacSystemFont,
      'Segoe UI',
      Roboto,
      sans-serif`
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'

    const leftText =
      String(
        Number(layout.openAltitudeWatermarkModal.position?.altitude.toFixed(2))
      ) || ''
    ctx.fillStyle = '#000'
    ctx.fillText(
      leftText,
      paddingX,
      img.height + barHeight - barHeight * 0.6 - barHeight * 0.02
    )

    ctx.font = `${Math.round(barHeight * 0.18)}px system-ui,
      -apple-system,
      BlinkMacSystemFont,
      'Segoe UI',
      Roboto,
      sans-serif`
    ctx.fillStyle = '#444' // 淡灰色，可改成 #aaa 或 #bbb
    ctx.fillText(
      `${t('altitude', {
        ns: 'altitudePage',
      })} (${t('meters', {
        ns: 'altitudePage',
      })})`,
      paddingX,
      img.height +
        barHeight -
        barHeight / 2 +
        barHeight * 0.24 -
        barHeight * 0.02
    )

    // ---------------- 右边 ----------------
    // 右边主信息（较大字体，白色）
    ctx.textAlign = 'right'
    ctx.fillStyle = '#ffffff'

    const rightMain = `${moment().format('YYYY.MM.DD')} | ${String(Number(layout.openAltitudeWatermarkModal.position?.latitude.toFixed(4)))}° N | ${String(Number(layout.openAltitudeWatermarkModal.position?.longitude.toFixed(4)))}° S`
    const rightDate = 'trip.aiiko.club/altitude'

    // 测量右边主文字宽度，如果太长则缩小字体
    let mainFontSize = Math.round(barHeight * 0.4)
    ctx.font = `bold ${Math.round(barHeight * 0.2)}px system-ui,
      -apple-system,
      BlinkMacSystemFont,
      'Segoe UI',
      Roboto,
      sans-serif`
    while (ctx.measureText(rightMain).width > halfWidth && mainFontSize > 10) {
      mainFontSize -= 1
      ctx.font = `bold ${mainFontSize}px system-ui,
      -apple-system,
      BlinkMacSystemFont,
      'Segoe UI',
      Roboto,
      sans-serif`
    }

    // 画右边主信息（垂直偏上一点）
    const mainY =
      img.height +
      barHeight -
      barHeight / 2 -
      barHeight * 0.08 -
      barHeight * 0.02
    ctx.fillStyle = '#000' // 淡灰色，可改成 #aaa 或 #bbb
    ctx.fillText(rightMain, img.width - paddingX, mainY)

    // 右边日期（更小字体 + 淡色）
    ctx.font = `${Math.round(barHeight * 0.16)}px system-ui,
      -apple-system,
      BlinkMacSystemFont,
      'Segoe UI',
      Roboto,
      sans-serif`
    ctx.fillStyle = '#444' // 淡灰色，可改成 #aaa 或 #bbb
    const dateY =
      img.height +
      barHeight -
      barHeight / 2 +
      barHeight * 0.2 -
      barHeight * 0.02
    ctx.fillText(rightDate, img.width - paddingX, dateY)
  }

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [isCapturing, setIsCapturing] = useState(false)
  const [error, setError] = useState<string>('')
  const [cameraOrientation, setCameraOrientation] = useState<
    'landscape' | 'portrait' | 'unknown'
  >('unknown')

  const getVideoDevices = useCallback(async () => {
    try {
      // 必须先获取一次权限，否则 label 会为空
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach((track) => track.stop())

      const allDevices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = allDevices.filter(
        (device) => device.kind === 'videoinput'
      )

      setDevices(videoDevices)

      console.log('videoDevices', videoDevices)

      if (videoDevices.length > 0) {
        setSelectedDeviceId(videoDevices[0].deviceId)
      } else {
        setError('未检测到任何摄像头')
      }

      // 监听设备变化（插拔摄像头）
      navigator.mediaDevices.addEventListener('devicechange', getVideoDevices)

      return {
        videoDevices,
        selectedDeviceId: videoDevices?.[0]?.deviceId || '',
      }
    } catch (err) {
      console.error(err)
      setError('获取摄像头列表失败，请检查权限')
    }
  }, [])

  // 组件挂载时获取设备列表
  // useEffect(() => {
  //   if (!navigator.mediaDevices?.getUserMedia) {
  //     setError('您的浏览器不支持 getUserMedia')
  //     return
  //   }

  //   getVideoDevices()

  //   // 监听设备变化（插拔摄像头）
  //   navigator.mediaDevices.addEventListener('devicechange', getVideoDevices)

  //   return () => {
  //     navigator.mediaDevices.removeEventListener(
  //       'devicechange',
  //       getVideoDevices
  //     )
  //     // 清理流
  //     if (streamRef.current) {
  //       streamRef.current.getTracks().forEach((track) => track.stop())
  //     }
  //   }
  // }, [])

  // 开启/切换摄像头
  const startCamera = useCallback(async (deviceId: string) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('您的浏览器不支持 getUserMedia')
      return
    }
    // 先停止旧的流
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: deviceId },
          width: { ideal: 4096 },
          height: { ideal: 2160 },
          resizeMode: 'none',
        } as MediaTrackConstraints,
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setIsCapturing(true)
        setError('')
      }
    } catch (err) {
      console.error('开启摄像头失败:', err)
      setError('无法打开摄像头，请检查权限或设备是否被占用')
      setIsCapturing(false)
    }
  }, [])

  // 拍照 → 画到 canvas 并停止视频
  const takePhoto = () => {
    if (!videoRef.current || !cvs.current || !isCapturing) return
    const video = videoRef.current
    const canvas = cvs.current
    // 设置 canvas 尺寸与视频一致
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    // 画当前帧
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    }
    // 停止视频流
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current.srcObject) {
      videoRef.current.srcObject = null
    }
    setIsCapturing(false)
    // 将canvas转换为File对象
    return new Promise<File | null>((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            // 创建File对象，文件名使用时间戳
            const fileName = `photo_${Date.now()}.jpg`
            const file = new File([blob], fileName, { type: 'image/jpeg' })
            resolve(file)
          } else {
            console.error('Canvas转换为Blob失败')
            resolve(null)
          }
        },
        'image/jpeg',
        0.95
      ) // 使用JPEG格式，质量0.95
    })
  }

  const detectCameraOrientation = useCallback(() => {
    if (!videoRef.current) return 'unknown'

    const video = videoRef.current

    const w = config.deviceWH.w
    const h = config.deviceWH.h - 56

    // 等待视频真正有尺寸（loadedmetadata 后才准确）
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setCvsWh({
        w: w,
        h: (w * video.videoHeight) / video.videoWidth,
      })
      return 'unknown'
    }

    if (video.videoWidth >= video.videoHeight) {
      setCvsWh({
        w: video.videoWidth * (h / video.videoHeight),
        h: h,
      })
      return 'landscape'
    }
    return 'portrait'
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => {
      const ori = detectCameraOrientation()
      setCameraOrientation(ori)
      console.log(
        `摄像头方向：${ori} (${video.videoWidth}×${video.videoHeight})`
      )
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata)

    // 某些手机在旋转后可能分辨率变化（少见），可额外监听 resize 或 timeupdate
    // 但大多数情况下 loadedmetadata 一次就够

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [isCapturing, detectCameraOrientation, selectedDeviceId])
  // 依赖 isCapturing 确保流开启后才检测

  return (
    <saki-modal
      ref={bindEvent({
        close() {
          dispatch(
            layoutSlice.actions.setOpenAltitudeWatermarkModal({
              visible: false,
            })
          )
        },
        loaded() {
          eventListener.dispatch('loadModal:AltitudeWatermarkModal', true)
        },
      })}
      width="100%"
      height="100%"
      max-width={'100%'}
      max-height={'100%'}
      mask
      border-radius={config.deviceType === 'Mobile' ? '0px' : ''}
      border={config.deviceType === 'Mobile' ? 'none' : ''}
      mask-closable="false"
      background-color="#fff"
      visible={layout.openAltitudeWatermarkModal.visible}
    >
      <div
        className={
          'altitude-watermark-modal ' +
          config.deviceType +
          (config.fullScreen ? ' enlarge ' : '')
        }
      >
        <div className="fw-header">
          <SakiModalHeader
            back-icon={true}
            close-icon={false}
            right-width={'104'}
            onBack={() => {
              dispatch(
                layoutSlice.actions.setOpenAltitudeWatermarkModal({
                  visible: false,
                })
              )
            }}
            title={t('pageTitle', {
              ns: 'altitudeWatermarkModal',
            })}
          >
            <div slot="right">
              <SakiRow>
                {/* <saki-dropdown
                  visible={openCameraDevicesDP}
                  floating-direction="Left"
                  ref={bindEvent({
                    close: (e) => {
                      setOpenCameraDevicesDP(false)
                    },
                  })}
                >
                  <div className="md-button">
                    <SakiButton
                      onTap={() => {
                        setOpenCameraDevicesDP(!openCameraDevicesDP)
                      }}
                      width="40px"
                      height="40px"
                      // padding="24px"
                      margin="0px 6px 0"
                      type="CircleIconGrayHover"
                    >
                      <saki-icon
                        color="#666"
                        width="18px"
                        height="18px"
                        type="Refresh"
                      ></saki-icon>
                    </SakiButton>
                  </div>
                  <div className="tool-box-layout-menu-list" slot="main">
                    <saki-menu
                      ref={bindEvent({
                        selectvalue: async (e) => {
                          console.log(e.detail)
                          setOpenCameraDevicesDP(false)
                          setSelectedDeviceId(e.detail.value)
                        },
                      })}
                    >
                      {devices.map((v, i) => {
                        return (
                          <saki-menu-item
                            key={i}
                            padding="10px 16px"
                            value={v.deviceId}
                          >
                            <span>{v.label}</span>
                          </saki-menu-item>
                        )
                      })}
                    </saki-menu>
                  </div>
                </saki-dropdown>

                <SakiButton
                  onTap={async () => {
                    const videoDevices = await getVideoDevices()
                    if (videoDevices) {
                      await startCamera(videoDevices.selectedDeviceId)
                    }
                  }}
                  width="40px"
                  height="40px"
                  // padding="24px"
                  margin="6px 6px"
                  type="CircleIconGrayHover"
                >
                  <saki-icon
                    color="#666"
                    width="18px"
                    height="18px"
                    type="Camera"
                  ></saki-icon>
                </SakiButton> */}
                <SakiButton
                  onTap={async () => {
                    const files = await selectFiles()
                    console.log('files', files)

                    dispatch(
                      layoutSlice.actions.setOpenAltitudeWatermarkModal({
                        visible: true,
                        selectFile: files?.[0],
                        position: layout.openAltitudeWatermarkModal.position,
                      })
                    )
                  }}
                  width="40px"
                  height="40px"
                  // padding="24px"
                  margin="6px 6px"
                  type="CircleIconGrayHover"
                >
                  <saki-icon
                    color="#666"
                    width="18px"
                    height="18px"
                    type="Image"
                  ></saki-icon>
                </SakiButton>
                <SakiButton
                  onTap={async () => {
                    if (!cvs.current) return
                    // toDataURL 可以指定格式和质量
                    const dataURL = cvs.current.toDataURL('image/jpeg', 0.94) // 或 'image/jpeg', 0.92

                    // 创建 a 标签进行下载
                    const link = document.createElement('a')
                    link.href = dataURL
                    link.download = `${moment().format('YYYYMMDD_HHmmss')}_${altitude}.jpg` // 你可以改文件名，例如加时间戳

                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)
                  }}
                  width="40px"
                  height="40px"
                  // padding="24px"
                  margin="6px 6px"
                  type="CircleIconGrayHover"
                >
                  <saki-icon
                    color="#666"
                    width="18px"
                    height="18px"
                    type="Download"
                  ></saki-icon>
                </SakiButton>
              </SakiRow>
            </div>
          </SakiModalHeader>
        </div>
        <div className="fw-main">
          {/* <p>{cameraOrientation}</p> */}
          <div
            style={{
              display: isCapturing ? 'block' : 'none',
              // width: cvsWh.w + 'px',
              // height: cvsWh.h + 'px',
            }}
            className="fw-camera"
          >
            <div
              style={{
                display: error ? 'block' : 'none',
              }}
              className="fwc-error"
            >
              <span> {error}</span>
            </div>

            <video
              ref={videoRef}
              className={'fwc-vid ' + cameraOrientation}
              autoPlay
              playsInline
              muted
              style={{
                display: !error ? 'block' : 'none',
              }}
            />
            <div
              style={{
                display: !error ? 'flex' : 'none',
              }}
              className="fwc-btns"
            >
              <SakiButton
                onTap={() => {
                  devices.some((v, i, arr) => {
                    // console.log('cccc', v, i, selectedDeviceId)
                    if (v.deviceId === selectedDeviceId) {
                      const ci = i + 1 > arr.length - 1 ? 0 : i + 1
                      // console.log('cccc', ci, devices[ci]?.deviceId)
                      setSelectedDeviceId(devices[ci]?.deviceId)
                      startCamera(devices[ci]?.deviceId)
                      return true
                    }
                  })
                }}
                width="40px"
                height="40px"
                // padding="24px"
                margin="0px 6px 0"
                type="CircleIconGrayHover"
                bgColor="rgba(0,0,0,0)"
                bgHoverColor="rgba(0,0,0,0)"
                bgActiveColor="rgba(0,0,0,0)"
              >
                <saki-icon
                  color="#fff"
                  width="32px"
                  height="32px"
                  type="Refresh3"
                ></saki-icon>
              </SakiButton>

              <SakiButton
                onTap={async () => {
                  const file = await takePhoto()

                  file && drawWatermarkToFile(file)
                }}
                width="60px"
                height="60px"
                // padding="24px"
                margin="0px 6px 0"
                type="CircleIconGrayHover"
                bgColor="rgba(255,255,255,1)"
              >
                <saki-icon
                  color="#666"
                  width="32px"
                  height="32px"
                  type="Camera"
                ></saki-icon>
              </SakiButton>

              <div
                style={{
                  width: '40px',
                  height: '40px',
                }}
              ></div>
            </div>
          </div>

          <canvas
            ref={cvs}
            id="fw-cvs"
            style={{
              display: !isCapturing ? 'block' : 'none',
            }}
            // width={config.deviceWH.w}
            // height={config.deviceWH.h - 56}
          ></canvas>
        </div>
      </div>
    </saki-modal>
  )
}
