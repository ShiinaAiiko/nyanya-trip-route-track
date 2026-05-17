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
} from '../../store'

import { sakisso, version } from '../../config'

import moment from 'moment'

import { alert, snackbar, bindEvent } from '@saki-ui/core'
import { useTranslation } from 'react-i18next'
import { protoRoot } from '../../protos'

import { Debounce, deepCopy, getShortId, NEventListener } from '@nyanyajs/utils'
import Leaflet, { divIcon } from 'leaflet'
import {
  eventListener,
  getMapLayer,
  getTrackRouteColor,
} from '../../store/config'
import {
  SakiAnimationLoading,
  SakiAsideModal,
  SakiButton,
  SakiIcon,
  SakiModalHeader,
  SakiRow,
  SakiTitle,
} from '../saki-ui-react/components'
import { selectFiles } from '../../store/file'
import axios from 'axios'
import { httpApi } from '../../plugins/http/api'
import {
  cleanMarkdown,
  copyText,
  formatDistance,
  newStripHtmlTags,
  SpeechPilot,
  StopVoiceBroadcast,
  WebVoiceBroadcast,
} from '../../plugins/methods'
import { loadModal, TriggerReason } from '../../store/layout'
import { AILiveWave } from './AILiveWave'
import { useRouter } from 'next/router'

export const AiChatModal = () => {
  const { t, i18n } = useTranslation('aiChatModal')

  const layout = useSelector((state: RootState) => state.layout)
  const config = useSelector((state: RootState) => state.config)
  const user = useSelector((state: RootState) => state.user)

  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()

  const messageMainScrollEl = useRef<any>()
  const richtextEl = useRef<any>()
  const abortControllerRef = useRef<AbortController>()

  const [messageRichText, setMessageRichText] = useState('')
  const [message, setMessage] = useState('')

  const [keepScrollPosition, setKeepScrollPosition] = useState(true)

  const [showSettingsDP, setShowSettingsDP] = useState(false)

  const [openQuickPhrase, setOpenQuickPhrase] = useState(false)

  const pilot = useRef(
    new SpeechPilot({
      autoStopTimeout: 5000,
    })
  )

  const [isSpeak, setIsSpeak] = useState(false)

  const [loadingMessageId, setLoadingMessageId] = useState('')

  const [playVoiceKey, setPlayVoiceKey] = useState('')

  interface AIMessageItem extends protoRoot.ai.IAIMessageItem {
    triggerReason?: TriggerReason
    currentTripData?: protoRoot.ai.IAICoDriverCurrentTripData
    lastTripData?: protoRoot.ai.IAICoDriverCurrentTripData
  }

  const [editMessage, setEditMessage] = useState<AIMessageItem>()

  const [sessionId, setSessionId] = useState('')

  const [messages, setMessages] = useState<AIMessageItem[]>([
    // {
    //   id: 'd76Xwm3FW',
    //   message: 'AI 领航员工作中...',
    //   authorId: '78L2tkleM',
    //   status: 1,
    //   createTime: 1776047305,
    //   triggerReason: 'CHANGE_CITY' ,
    // },
    // {
    //   id: 'F104Yitd4',
    //   message: '我这周跑了多少公里？',
    //   authorId: '78L2tkleM',
    //   status: 1,
    //   createTime: 1776590004,
    //   editTime: 1776592772,
    // },
    // {
    //   id: 'bNU1o5jrN',
    //   message: '我今年总计行驶了多远？',
    //   authorId: '78L2tkleM',
    //   status: 1,
    //   createTime: 1776593516,
    // },
    // {
    //   id: 'bNU1o5jr1',
    //   message: '介绍下北碚区澄江镇',
    //   authorId: '78L2tkleM',
    //   status: -1,
    //   createTime: 1776593516,
    // },
    // {
    //   id: 'bNU1o5jr2',
    //   message: '介绍下洪崖洞',
    //   authorId: '78L2tkleM',
    //   status: -1,
    //   createTime: 1776593516,
    // },
    // {
    //   id: 'pgFR6dsaST',
    //   message: '<p>打开历史行程轨迹</p>',
    //   authorId: '78L2tkleM',
    //   status: 1,
    //   createTime: 1777382954,
    // },
    // {
    //   id: 'vr2RLPmtk',
    //   message: '联系开发者',
    //   authorId: '78L2tkleM',
    //   status: 1,
    //   createTime: 1777377277,
    //   editTime: 1777379005,
    // },
    // {
    //   id: 'pgFR6chST',
    //   message: '<p>打开设置</p>',
    //   authorId: '78L2tkleM',
    //   status: 1,
    //   createTime: 1777382954,
    // },
    // {
    //   id: 'MizM6Q13C',
    //   message: '介绍 重庆市北碚区澄江镇',
    //   authorId: '78L2tkleM',
    //   status: 1,
    //   createTime: 1777432448,
    // },
  ])

  const [aiMessages, setAiMessages] = useState<
    {
      id: string
      aiMessage: protoRoot.ai.IAIResponse
    }[]
  >([
    {
      id: 'd76Xwm3FW',
      aiMessage: {
        status: {
          isRelevant: true,
          isSafetyFenced: true,
        },
        code: 200,
        meta: [],
        reasoning: {
          message:
            '用户正在驾驶中，我需要根据约束条件输出一个 JSON 对象。\n\n分析当前数据：\n- startTrip: true (正在驾驶)\n- 城市：四川省·甘孜藏族自治州·巴塘县·夏邛镇\n- 海拔：2497.73m\n- 速度：8.6 km/h (很慢，可能是堵车或正在查看导航)\n- 天气：多云\n- 温度：13.1℃\n- 道路：S459 巴塘 - 亚丁机场\n- 时间：2026-04-13 10:36:50\n- 距离：5.882m (几乎没动)\n- 平均速度：3.53 km/h\n- 最高海拔：2498.76m\n- 最低海拔：2497.73m\n- 爬升：0.532m\n- 下降：1.027m\n\n驾驶建议：\n1. 速度很慢，可能是正在查看导航或路况\n2. 海拔约2500m，属于高原地区\n3. 天气多云，温度13.1℃，比较舒适\n4. S459是巴塘到亚丁机场的路线，可能正在接近机场或山区\n5. 爬升和下降都很小，说明在平缓路段\n\n根据约束：\n- 行车中回复<80字\n- 需要深度洞察，解释地理/人文/安全意义\n- 输出严格的 JSON 格式\n\n让我构思回复内容：\n\n\n高原驾驶需谨慎，缓慢行驶是明智选择。多云天气下能见度良好，保持平稳车速确保安全。亚丁机场附近路况复杂，需格外小心。',
        },
        display: {
          message:
            '这类话题不是我的强项，咱们还是专注于这段精彩的旅程吧。想了解下附近的特色美食或者地标建筑吗？',
          // message:
          //   'S459正在穿越川西高原腹地，海拔2500m左右，多云天气视野良好。当前低速行驶可能是导航确认路线或避让牲畜，高原行车务必谨慎，注意避让牦牛群。',
          warning:
            '⚠️ **高原驾驶提醒**：海拔2500m属于高原区域，若出现头痛、气短等高反症状请立即停车休息。S459沿线常有牦牛出没，减速慢行确保安全。',
        },
        data: null,
        createTime: 1776047809,
        historyMessages: [],
        model: 'glm-4.7-flash',
        thinkingStartedTime: 1776047816,
        thinkingEndedTime: 1776047821,
        endTime: 1776047824,
      },
    },
    {
      id: 'F104Yitd4',
      aiMessage: {
        status: {
          isRelevant: true,
        },
        code: 200,
        meta: [
          {
            action: 'get_trip_statistics',
            type: 'function',
            status: 'success',
            value:
              '{"count":1469,"time":6583505,"distance":49557065.852000065,"days":500,"maxDistance":{"num":387987.407,"id":"ykMRlTUd2"},"maxSpeed":{"num":49.41,"id":"oVlUDWGVS"},"fastestAverageSpeed":{"num":28.674,"id":"kbZ4vhU21"},"maxAltitude":{"num":5070.875,"id":"bDkFXZVgq"},"minAltitude":{"id":"yNPLv432D"},"maxClimbAltitude":{"num":16711.102,"id":"HjFiAGJwf"},"maxDescendAltitude":{"num":15924.573,"id":"HjFiAGJwf"},"maxTotalTripDuration":{"num":76164,"id":"VnMTKbvWU"},"maxDrivingDuration":{}}',
            createTime: 1776592776,
            endTime: 1776592782,
          },
        ],
        reasoning: {},
        display: {
          message: '你这周跑步总里程是49557.07公里，真是个运动健将！',
        },
        data: null,
        createTime: 1776592785,
        historyMessages: [],
        model: 'gemini-2.5-flash',
        thinkingStartedTime: 1776592785,
        thinkingEndedTime: 1776592785,
        endTime: 1776592785,
      },
    },
    {
      id: 'bNU1o5jrN',
      aiMessage: {
        status: {
          isRelevant: true,
        },
        code: 200,
        meta: [
          {
            action: 'get_trip_statistics',
            type: 'function',
            status: 'success',
            value:
              '{"summary":{"trip_total_count":138,"total_distance_km":4784.89,"total_duration_hours":166.17,"active_days":63},"achievements":{"max_distance_km":375.68,"max_speed_kmh":34.84,"fastest_avg_speed":19.59,"max_altitude_m":1408.27,"min_altitude_m":0,"max_climb_m":12414.33,"max_descend_m":12549.43,"max_total_duration_h":21.16,"max_driving_duration_h":0}}',
            createTime: 1776594513,
            endTime: 1776594519,
          },
        ],
        reasoning: {},
        display: {
          message:
            '朋友，你今年已经累计行驶了 **4784.89 公里**！看来你今年的驾驶里程可不短，又探索了不少地方吧？',
        },
        data: null,
        createTime: 1776594521,
        historyMessages: [],
        model: 'gemini-2.5-flash',
        thinkingStartedTime: 1776594521,
        thinkingEndedTime: 1776594521,
        endTime: 1776594521,
        tokenUsage: {
          tokenUsageHistory: [
            {
              loopCount: 1,
              retryCount: 1,
              promptTokens: 2166,
              completionTokens: 146,
              totalTokens: 2312,
              promptCachedTokens: 1390,
            },
          ],
          totalSessionTokens: 2312,
          contextDataTokens: 380,
        },
      },
    },
    {
      id: 'vr2RLPmtk',
      aiMessage: {
        status: {
          isRelevant: true,
        },
        code: 200,
        meta: [
          {
            action: 'get_app_manifest',
            type: 'function',
            status: 'success',
            value:
              '{"data":[{"type":"AppManifest","data":[{"id":"NAV_CONTACT_DEV","desc":"联系开发者\\n### 开发者寄语\\n我是 **ShiinaAiiko**，一个热爱写代码、更热爱在路上的全栈开发者。如果您有新的功能点子或遇到了奇怪的 Bug，欢迎随时联系我。\\n- **个人博客**: https://aiiko.club/ShiinaAiiko\\n- **官方邮箱**: shiina@aiiko.club"}]}]}',
            createTime: 1777382790,
            endTime: 1777382790,
          },
        ],
        reasoning: {},
        display: {
          message:
            '开发者 ShiinaAiiko 欢迎您联系！\n- **个人博客**: https://aiiko.club/ShiinaAiiko\n- **官方邮箱**: shiina@aiiko.club',
        },
        data: null,
        createTime: 1777382789,
        historyMessages: [],
        tokenUsage: {
          contextDataTokens: 1,
        },
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        thinkingStartedTime: 1777382790,
        thinkingEndedTime: 1777382790,
        actionId: 'NAV_CONTACT_DEV',
        action: {
          title: '联系开发者',
          content:
            '### 开发者寄语\n我是 **ShiinaAiiko**，一个热爱写代码、更热爱在路上的全栈开发者。如果您有新的功能点子或遇到了奇怪的 Bug，欢迎随时联系我。\n- **个人博客**: https://aiiko.club/ShiinaAiiko\n- **官方邮箱**: shiina@aiiko.club',
          paths: [
            {
              type: 'OPEN_LINK',
              title: '发送邮件',
              path: 'mailto:shiina@aiiko.club',
            },
            {
              type: 'OPEN_LINK',
              title: '打开博客',
              path: 'https://aiiko.club/ShiinaAiiko',
            },
          ],
        },
        endTime: 1777382793,
      },
    },
    {
      id: 'pgFR6chST',
      aiMessage: {
        status: {
          isRelevant: true,
        },
        code: 200,
        meta: [],
        reasoning: {},
        display: {
          message:
            '打开 **设置**，可以管理账号、切换语言、调整地图偏好及清理缓存。',
        },
        data: null,
        createTime: 1777382954,
        historyMessages: [],
        tokenUsage: {
          tokenUsageHistory: [
            {
              loopCount: 1,
              retryCount: 1,
              promptTokens: 2166,
              completionTokens: 146,
              totalTokens: 2312,
              promptCachedTokens: 1390,
            },
          ],
          totalSessionTokens: 2312,
          contextDataTokens: 380,
        },
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        thinkingStartedTime: 1777382966,
        thinkingEndedTime: 1777382966,
        actionId: 'NAV_SETTINGS',
        action: {
          title: '系统设置',
          content:
            '### 个性化领航配置\n- **账号登录**：多端数据云端无感同步。\n- **地图引擎**：切换 2D/3D 视角或离线包管理。\n- **多语偏好**：支持多国语切换及缓存深度清理，确保 App 运行流畅。',
          paths: [
            {
              type: 'OPEN_MODAL',
              path: 'modal://settings',
            },
          ],
        },
        endTime: 1777382970,
      },
    },
    {
      id: 'pgFR6dsaST',
      aiMessage: {
        status: {
          isRelevant: true,
        },
        code: 200,
        meta: [],
        reasoning: {},
        display: {
          message:
            '打开 **历史行程轨迹**，深度复盘每一公里\n支持强大的**多维检索系统**。',
        },
        data: null,
        createTime: 1777382954,
        historyMessages: [],
        tokenUsage: {
          tokenUsageHistory: [
            {
              loopCount: 1,
              retryCount: 1,
              promptTokens: 2166,
              completionTokens: 146,
              totalTokens: 2312,
              promptCachedTokens: 1390,
            },
          ],
          totalSessionTokens: 2312,
          contextDataTokens: 380,
        },
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        thinkingStartedTime: 1777382966,
        thinkingEndedTime: 1777382966,
        actionId: 'NAV_SETTINGS',
        action: {
          title: '历史行程轨迹',
          content:
            '### 个性化领航配置\n- **账号登录**：多端数据云端无感同步。\n- **地图引擎**：切换 2D/3D 视角或离线包管理。\n- **多语偏好**：支持多国语切换及缓存深度清理，确保 App 运行流畅。',
          paths: [
            {
              type: 'OPEN_LINK',
              path: '/trackRoute',
            },
          ],
        },
        endTime: 1777382970,
      },
    },
    {
      id: 'MizM6Q13C',
      aiMessage: {
        status: {
          isRelevant: true,
        },
        code: 200,
        meta: [
          {
            action: 'search_place_info',
            type: 'function',
            status: 'success',
            value:
              '{\n  "hints": [\n    "POI_DEEP_INSIGHT: 深度挖掘景观的地理成因，引导用户沉浸式观察。"\n  ],\n  "data": [\n    {\n      "type": "WikiSummary",\n      "data": "北碚（bèi）区是中國重庆市下辖的市辖区，重庆主城九区之一，位于重庆主城区西北部，距市中心41千米。北碚区的现代化开启于1927年，由实业家民生轮船公司创始人卢作孚担任峡防局局长开拓，是中国历史上的第一个事先规划，逐步按计划建设的经济开发区。北碚区背靠缙云山、嘉陵江环城而过。面积约1100平方公里。该区环境较为优美，森林覆盖率达到27.4%，是重庆市的风景旅游区和生态工业基地。"\n    },\n    {\n      "type": "POIs",\n      "data": [\n        {\n          "name": "美龄堂",\n          "dist_m": 655.7\n        },\n        {\n          "name": "重庆自然博物馆",\n          "wiki": "重庆自然博物馆，位于重庆市北碚区北温泉街道金华路398号，是重庆市属自然科学类博物馆。",\n          "dist_m": 5304.3\n        },\n        {\n          "name": "重庆北温泉风景区",\n          "dist_m": 2577.2\n        },\n        {\n          "name": "合川水波洞景区",\n          "dist_m": 7108\n        },\n        {\n          "name": "文笔山公园",\n          "dist_m": 7235.8\n        }\n      ]\n    },\n    {\n      "type": "Weather",\n      "data": {\n        "now_cond": "阴",\n        "now_c": 19,\n        "f1h_cond": "多云",\n        "f1h_c": 20.1\n      }\n    }\n  ]\n}',
            createTime: 1777432456,
            endTime: 1777432460,
          },
        ],
        reasoning: {},
        display: {
          message:
            '重庆市北碚区澄江镇隶属于北碚区，位于重庆主城区西北部。周边景点包括美龄堂、重庆自然博物馆、重庆北温泉风景区等。',
        },
        data: null,
        createTime: 1777432460,
        historyMessages: [],
        tokenUsage: {
          tokenUsageHistory: [
            {
              promptTokens: 920,
              completionTokens: 262,
              totalTokens: 1182,
              loopCount: 1,
              retryCount: 1,
            },
          ],
          totalSessionTokens: 1182,
          contextDataTokens: 1,
        },
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        thinkingStartedTime: 1777432460,
        thinkingEndedTime: 1777432460,
        endTime: 1777432461,
      },
    },
  ])

  useEffect(() => {
    if (layout.openAiChatModal.visible && user.isLogin) {
      messageMainScrollEl.current?.scrollto('bottom')
    }
    if (layout.openAiChatModal.visible && !user.isLogin) {
      dispatch(methods.user.loginAlert())
        .unwrap()
        .then((b) => {
          dispatch(
            layoutSlice.actions.setOpenAiChatModal({
              visible: b,
            })
          )
        })
    }
  }, [layout.openAiChatModal.visible, user.isLogin])

  let [launchAICoDriver, setLaunchAICoDriver] = useState(false)
  let [liveChat, setLiveChat] = useState(false)

  const [aiCoDriverQueue, setAiCoDriverQueue] = [
    useSelector(
      (state: RootState) => state.layout.openAiChatModal.aiCoDriverQueue
    ),
    (aiCoDriverQueue: typeof layout.openAiChatModal.aiCoDriverQueue) => {
      dispatch(layoutSlice.actions.setAiCoDriverQueue({ aiCoDriverQueue }))
    },
  ]

  const autoCloseTimer = useRef<NodeJS.Timeout>()

  const clear = async () => {
    await stopStream({
      id: loadingMessageId,
      tempMessages: messages,
      tempAiMessages: aiMessages,
    })
    setMessage('')
    setMessageRichText('')
    setAiCoDriverQueue([])
    setLoadingMessageId('')
    setShowSettingsDP(false)
    clearTimeout(autoCloseTimer.current)
    pilot.current?.stopManually()
    StopVoiceBroadcast()
    setPlayVoiceKey('')
    setLastMsgId('')
  }

  useEffect(() => {
    if (!layout.openAiChatModal.visible) {
      clear()
      return
    }

    let b = !!(
      layout.openAiChatModal.visible &&
      user.isLogin &&
      layout.openAiChatModal.type === 'coDriver' &&
      layout.openAiChatModal.startTrip &&
      config.configure.ai?.aiCoDriver?.enabled
    )
    console.log('AI领航员 setLaunchAICoDriver', b, layout.openAiChatModal.type)
    setLaunchAICoDriver(b)
    if (
      !launchAICoDriver &&
      b &&
      config.configure.ai?.aiCoDriver?.autoLaunchLiveAfterStartTrip
    ) {
      setLiveChat(true)
      setShowSettingsDP(false)
    }

    if (
      b &&
      !aiCoDriverQueue.some(
        (v) => v.triggerReason === layout.openAiChatModal.triggerReason
      ) &&
      layout.openAiChatModal.currentTripData &&
      layout.openAiChatModal.lastTripData
    ) {
      setAiCoDriverQueue(
        aiCoDriverQueue.concat({
          triggerReason: layout.openAiChatModal.triggerReason,
          currentTripData: layout.openAiChatModal.currentTripData,
          lastTripData: layout.openAiChatModal.lastTripData,
        })
      )
    }

    // setLaunchAICoDriver(true)
  }, [
    layout.openAiChatModal.visible,
    user.isLogin,
    layout.openAiChatModal.type,
    layout.openAiChatModal.currentTripData,
    // config.configure.ai?.aiCoDriver?.enabled,
  ])

  // 队列，只保留最近3条消息
  useEffect(() => {
    // console.log('AI领航员 aiCoDriverQueue', aiCoDriverQueue)
    !loadingMessageId &&
      aiCoDriverQueue.length &&
      launchAICoDriver &&
      sendMessage({
        _messages: messages.slice(-3),
        _aiMessages: aiMessages.slice(-3),
        currentTripData: aiCoDriverQueue[0]?.currentTripData,
        lastTripData: aiCoDriverQueue[0]?.lastTripData,
        triggerReason: aiCoDriverQueue[0]?.triggerReason || '',
      })
  }, [loadingMessageId, aiCoDriverQueue, launchAICoDriver])

  const isResend = useRef(false)
  // 重新发送
  useEffect(() => {
    if (editMessage?.id && messageRichText && message && isResend.current) {
      isResend.current = false
      sendMessage({
        _messages: messages,
        _aiMessages: aiMessages,
        currentTripData: editMessage?.currentTripData,
        lastTripData: editMessage?.lastTripData,
        triggerReason: editMessage?.triggerReason || '',
      })
    }
  }, [editMessage, messageRichText, message])

  useEffect(() => {
    console.log('AIRoadbook messages', messages, aiMessages)
  }, [messages])
  useEffect(() => {
    // console.log('AIRoadbook aiMessages', aiMessages)
  }, [aiMessages])

  const [updateTime, setUpdateTime] = useState(0)
  const updateTimeTimer = useRef<NodeJS.Timeout>()

  useEffect(() => {
    clearInterval(updateTimeTimer.current)
    if (loadingMessageId) {
      updateTimeTimer.current = setInterval(() => {
        setUpdateTime(moment().unix())
      }, 1000)
    } else {
      if (keepScrollPosition) {
        richtextEl.current?.setValue('')
        messageMainScrollEl.current?.scrollto('bottom')
      }
    }
  }, [loadingMessageId, keepScrollPosition])

  const sendMessage = async ({
    _messageRichText,
    _messages,
    _aiMessages,
    triggerReason,
    currentTripData,
    lastTripData,
  }: {
    _messageRichText?: string
    _messages: typeof messages
    _aiMessages: typeof aiMessages
    triggerReason?: TriggerReason
    currentTripData?: protoRoot.ai.IAICoDriverCurrentTripData
    lastTripData?: protoRoot.ai.IAICoDriverCurrentTripData
  }) => {
    if (loadingMessageId) return

    const { geo, trip, city, network } = store.getState()
    const { weatherInfo } = trip
    const { cityInfo } = city

    // console.log('AI领航员 autoCloseTime clearTimeout')
    clearTimeout(autoCloseTimer.current)

    let id = getShortId(9)

    console.log(
      'AI领航员 sendMessage',
      aiCoDriverQueue,
      editMessage,
      layout.openAiChatModal,
      launchAICoDriver
    )

    let _message = editMessage?.message
      ? editMessage?.message
      : _messageRichText || messageRichText

    if (launchAICoDriver && triggerReason) {
      _message = t(
        // 'coDriverMessage6',
        'coDriverMsg_' + triggerReason,
        {
          ns: 'aiChatModal',
          leavingCity: lastTripData?.city?.split('·').slice(-2).join(''),
          enteringCity: currentTripData?.city?.split('·').slice(-2).join(''),
          // city: ['state', 'region', 'city', 'town', 'road']
          //   .map((v) => {
          //     const si: any = cityInfo
          //     let s = si[v]
          //     return s
          //   })
          //   .filter((v) => !!v)
          //   .join(''),
          dist: formatDistance(currentTripData?.statistics?.distance || 0),
          altitude: (
            Math.round((currentTripData?.altitude || 0) * 10) / 10
          ).toFixed(1),
          climbAlt: (
            Math.round((currentTripData?.statistics?.climbAltitude || 0) * 10) /
            10
          ).toFixed(1),
          temp: currentTripData?.temp,
          road_name: currentTripData?.road,
          lastW: lastTripData?.weather,
          curW: currentTripData?.weather,
          time: moment().format('HH:mm'),
        }
      )
    }

    if (!_message) {
      return
    }

    let tempMessages = deepCopy(_messages)
    let tempAiMessages = deepCopy(_aiMessages)
    if (editMessage?.id) {
      id = editMessage?.id || ''
      tempMessages = tempMessages.map((v, i) => {
        if (v.id === id) {
          return {
            ...v,
            message: _message,
            status: 0,
            editTime: moment().unix(),
          }
        }
        return v
      })
      tempAiMessages = tempAiMessages.filter((v) => v.id !== id)
      setAiMessages(tempAiMessages)
    } else {
      tempMessages = tempMessages.concat({
        id: id,
        message: _message,
        authorId: user.userInfo.uid,
        status: 0,
        createTime: moment().unix(),

        triggerReason,
        currentTripData,
        lastTripData,
      })
    }
    setMessages(tempMessages)
    setMessage('')
    setMessageRichText('')
    setEditMessage(undefined)
    richtextEl.current?.setValue('')
    messageMainScrollEl.current?.scrollto('bottom')

    setKeepScrollPosition(true)
    setLoadingMessageId(id)

    setLastMsgId('')

    // 在这里检测是否有网络，没网直接返

    if (network.status !== 'online') {
      tempAiMessages = tempAiMessages.concat({
        id,
        aiMessage: {
          status: { isRelevant: true },
          error: t('networkOffline', {
            ns: 'aiChatModal',
          }),
          code: 10001,
          meta: [],
          reasoning: { message: '' },
          display: { message: '', warning: '' },
          data: null,
          createTime: moment().unix(),
          historyMessages: [],
          tokenUsage: {},
        },
      })

      setAiMessages(tempAiMessages)

      setTimeout(() => {
        stopStream({
          id,
          tempMessages,
          tempAiMessages,
          autoPlayVoice: false,
          autoCloseTime:
            (launchAICoDriver ? layout.openAiChatModal.autoCloseTime : 0) || 0,
        })
      }, 500)
      return
    }

    let isExits = false
    abortControllerRef.current = new AbortController()

    const onStream = (type: string, res: protoRoot.ai.IAIResponse) => {
      if (!isExits) {
        tempAiMessages = tempAiMessages.concat({
          id,
          aiMessage: res,
        })
        isExits = true
      } else {
        tempAiMessages = tempAiMessages.map((v) => {
          if (v.id === id) {
            return {
              ...v,
              aiMessage: res,
            }
          }

          return v
        })
      }

      setAiMessages(tempAiMessages)

      if (type === 'Session' && res.sessionId) {
        setSessionId(res.sessionId)
      }
      if (type !== 'message' && type !== 'reasoning') {
        console.log('AI领航员 onStream', type, deepCopy(res))
      }

      if (type === 'error') {
        tempMessages = tempMessages.map((v, i) => {
          if (v.id === id) {
            return {
              ...v,
              status: -1,
            }
          }
          return v
        })
        setMessages(tempMessages)
        return
      }
      if (type === 'model' || type === 'nextLoop') {
        tempMessages = tempMessages.map((v, i) => {
          if (v.id === id) {
            return {
              ...v,
              status: 1,
            }
          }
          return v
        })
        setMessages(tempMessages)
        return
      }

      if (type === 'final') {
        res.meta?.forEach((v) => {
          if (v.status === 'success') {
            console.log('AI领航员 final ', v.action, tempAiMessages)
            eventListener.dispatch('AIRoadbookAgent:' + v.action, v.value)
          }
        })
        res.action?.paths?.forEach((v) => {
          v.type === 'OPEN_MODAL' && activeClick(v)
        })
      }
    }

    if (layout.openAiChatModal.type === 'coDriver') {
      const params: protoRoot.ai.AICoDriver.IRequest = {
        messageId: id,
        sessionId,
        lang: config.lang,
        startTrip: !!triggerReason,
        triggerReason,
        currentTripData,
        lastTripData,
        message: newStripHtmlTags(_message),
      }

      // if (_messages.length) {
      //   let contexts: protoRoot.ai.IChatContextItem[] = []
      //   _messages.forEach((v) => {
      //     let aiMessage = tempAiMessages?.filter((sv) => sv.id === v.id)?.[0]
      //       ?.aiMessage

      //     if (!v.triggerReason && aiMessage?.display?.message) {
      //       contexts.push({
      //         question: v.message,
      //         answer:
      //           aiMessage?.display?.message +
      //           (aiMessage?.display?.warning
      //             ? '; ' + aiMessage?.display?.warning
      //             : ''),
      //       })
      //     }
      //   })

      //   params.contexts = contexts
      // }

      if (!params.startTrip && !params.currentTripData) {
        params.currentTripData = {
          city: ['state', 'region', 'city', 'town', 'road']
            .map((v) => {
              const si: any = cityInfo
              let s = si[v]
              return s
            })
            .filter((v) => !!v)
            .join('·'),
          altitude: geo.position.coords.altitude,
          speed: geo.position.coords.speed,
          weather: weatherInfo.weather,
          temp: weatherInfo.temperature,
          road: cityInfo?.road || '',
          coords: {
            latitude: Number(geo.position.coords.latitude.toFixed(6)),
            longitude: Number(geo.position.coords.longitude.toFixed(6)),
          },
          time: geo.position.timestamp,
        }
      }
      console.log(
        'AI领航员 params',
        params,
        tempMessages,
        tempAiMessages,
        aiCoDriverQueue
      )

      const onEnd = async () => {
        console.log('AI领航员 onEnd')
        const { config } = store.getState()
        await stopStream({
          id,
          tempMessages,
          tempAiMessages,
          autoPlayVoice: liveChat
            ? true
            : launchAICoDriver
              ? !!layout.openAiChatModal.autoPlayVoice
              : false,
          autoCloseTime:
            (launchAICoDriver ? layout.openAiChatModal.autoCloseTime : 0) || 0,
        })
      }

      await httpApi.v1.AICoDriver({
        params: params,
        abortController: abortControllerRef.current,
        onStream,
        onEnd,
      })
      // return

      // setTimeout(() => {
      //   onEnd()
      // }, 4000)
      return
    }

    await httpApi.v1.AIRoadbook({
      params: {
        id: layout.openAiChatModal.id,
        messages: tempMessages.map((v) => newStripHtmlTags(v?.message || '')),
        // messages: ['帮我修改标题为 渝东北自驾游'],
      },
      abortController: abortControllerRef.current,
      onStream,
      onEnd() {
        console.log('AIRoadbook onEnd')
        setLoadingMessageId('')
      },
    })
  }

  const resendMessage = async (v: AIMessageItem) => {
    await stopStream({
      id: v.id || '',
      tempMessages: messages,
      tempAiMessages: aiMessages,
    })
    setEditMessage(v)
    setMessageRichText(v?.message || '')
    setMessage(newStripHtmlTags(v?.message || ''))
    setLoadingMessageId('')
    pilot.current?.stopManually()
    StopVoiceBroadcast()
    setPlayVoiceKey('')
    isResend.current = true
    clearTimeout(autoCloseTimer.current)
  }

  const { modalConfig } = useMemo(() => {
    let modalConfig = {
      width: '100%',
      height: '100%',
      maxWidth: '360px',
      maxHeight: Math.min(600, config.deviceWH.h - 40) + 'px',
      vertical: 'Bottom',
      horizontal: 'Right',
      offsetX: 20,
      offsetY: config.deviceWH.h > 600 ? 40 : 20,
      borderRadius: config.deviceType === 'Mobile' ? '10px 10px 0 0' : '10px',
      boxShadow: '0 0 10px rgba(0, 0, 0, 0.2)',
      mask: config.deviceType === 'Mobile' || launchAICoDriver || liveChat,
      maskClosable:
        config.deviceType === 'Mobile' || launchAICoDriver || liveChat,
    }

    if (config.deviceType === 'Mobile') {
      modalConfig.maxWidth = '100%'
      modalConfig.maxHeight = '70%'
      modalConfig.horizontal = 'Center'
      modalConfig.offsetX = 0
      modalConfig.offsetY = 0
    }
    if (liveChat) {
      modalConfig.maxWidth = config.deviceWH.w + 'px'
      // modalConfig.maxWidth = Math.min(800, config.deviceWH.w * 1) + 'px'
      // modalConfig.maxWidth = '100%'
      modalConfig.maxHeight = '350px'
      // modalConfig.maxHeight = Math.min(300, config.deviceWH.h) + 'px'
      modalConfig.vertical = 'Bottom'
      modalConfig.horizontal = 'Center'
      // modalConfig.vertical = 'Top'
      // modalConfig.horizontal = 'Right'
      modalConfig.offsetX = 0
      modalConfig.offsetY = -50
      modalConfig.borderRadius = '10px'
      modalConfig.boxShadow = 'none'
    } else {
      if (launchAICoDriver) {
        modalConfig.maxWidth = '360px'
        modalConfig.maxHeight = Math.min(400, config.deviceWH.h) + 'px'
        modalConfig.vertical = 'Top'
        modalConfig.horizontal = 'Right'
        modalConfig.offsetX = 60
        modalConfig.offsetY = 60
        modalConfig.borderRadius = '10px'
        if (config.deviceType === 'Mobile') {
          modalConfig.maxWidth = '300px'
          // modalConfig.maxWidth = '100%'
          // modalConfig.maxHeight = '400px'
          // modalConfig.vertical = 'Bottom'
          // modalConfig.horizontal = 'Center'
          modalConfig.offsetX = 10
          modalConfig.offsetY = 50
        }
      }
    }

    return { modalConfig }
  }, [config.deviceType, config.deviceWH, launchAICoDriver, liveChat])

  const stopStream = async ({
    id,
    tempMessages,
    tempAiMessages,
    autoPlayVoice = false,
    autoCloseTime,
  }: {
    id: string
    tempMessages: typeof messages
    tempAiMessages: typeof aiMessages
    autoPlayVoice?: boolean
    autoCloseTime?: number
  }) => {
    const { config, layout } = store.getState()

    let aiMessage = tempAiMessages?.filter((sv) => sv.id === id)?.[0]?.aiMessage

    const newMessages = tempMessages.map((v, i) => {
      if (v.id === id) {
        return {
          ...v,
          status: v.status === 0 ? -1 : v.status,
        }
      }
      return v
    })
    setMessages(newMessages)

    console.log('AI领航员 stopStream', aiMessage, tempAiMessages, tempMessages)

    abortControllerRef.current?.abort()
    abortControllerRef.current = undefined

    const aiCoDriverQueue =
      store.getState().layout.openAiChatModal.aiCoDriverQueue

    let tempAiCoDriverQueue = aiCoDriverQueue.slice(1)
    if (editMessage?.id !== id) {
      setAiCoDriverQueue(tempAiCoDriverQueue)
    }

    if (
      autoPlayVoice &&
      (aiMessage?.display?.message || aiMessage?.display?.warning)
    ) {
      setPlayVoiceKey(id || '')

      const text = cleanMarkdown(
        (aiMessage.display?.message || '') +
          '; ' +
          (aiMessage.display?.warning || '')
      )
      // console.log('AI领航员 WebVoiceBroadcast', text)
      const res = await WebVoiceBroadcast(
        // t('aiAgentRemindsYou', {
        //   ns: 'aiChatModal',
        // }) +
        text,
        id || '',
        config.lang
      )
      // console.log('AI领航员 WebVoiceBroadcast res', res)
      setPlayVoiceKey('')
    }

    setLoadingMessageId('')

    if (!tempAiCoDriverQueue.length && autoCloseTime) {
      clearTimeout(autoCloseTimer.current)
      autoCloseTimer.current = setTimeout(() => {
        // console.log('AI领航员 autoCloseTime')
        dispatch(layoutSlice.actions.setOpenAiChatModal({ visible: false }))
      }, autoCloseTime)
    }
  }

  const aiMessageHandler = (
    message: AIMessageItem,
    aiMessage: protoRoot.ai.IAIResponse
  ) => {
    let readProgress = 0

    let loadingText = t('thinkReq', {
      ns: 'aiChatModal',
    })

    let status = 0

    if (aiMessage) {
      if (aiMessage?.model) {
        readProgress = 0.1
        loadingText = t('thinkAnalyzing', {
          ns: 'aiChatModal',
          model: aiMessage.model,
        })
        status = 1
      }
      if (aiMessage?.thinkingStartedTime) {
        readProgress = 0.3
      }
      if (aiMessage?.thinkingEndedTime) {
        readProgress = 0.6
      }
      if (aiMessage?.endTime) {
        readProgress = 1
      }

      if (aiMessage?.meta?.length) {
        const lastMeta = aiMessage?.meta[aiMessage?.meta.length - 1]

        if (lastMeta.type === 'function') {
          loadingText = t(
            lastMeta.status === 'failed'
              ? 'callToolChainFaild'
              : lastMeta.status === 'calling'
                ? 'callToolChain'
                : 'callToolChainSuccess',
            {
              ns: 'aiChatModal',
              function: lastMeta?.action,
              model: aiMessage.model,
            }
          )
        }
        if (lastMeta.type === 'rga') {
          loadingText = t(
            lastMeta.status === 'failed'
              ? 'ragActionSearchFailed'
              : lastMeta.status === 'calling'
                ? 'ragActionSearch'
                : 'ragActionSearchSuccess',
            {
              ns: 'aiChatModal',
              function: lastMeta?.action,
              model: aiMessage.model,
            }
          )
        }

        status = 1
      }

      if (aiMessage?.thinkingStartedTime && !aiMessage?.thinkingEndedTime) {
        if (aiMessage.endTime) {
          loadingText = t('thinkRunning', {
            ns: 'aiChatModal',
            model: aiMessage.model,
            seconds: Math.max(
              Number(aiMessage.endTime) - Number(aiMessage.thinkingStartedTime),
              0
            ),
          })
        } else {
          loadingText = t('thinkRunning', {
            ns: 'aiChatModal',
            model: aiMessage.model,
            seconds: Math.max(
              moment().unix() - Number(aiMessage.thinkingStartedTime),
              0
            ),
          })
        }
        status = 2
      }

      if (aiMessage?.thinkingStartedTime && aiMessage?.thinkingEndedTime) {
        loadingText = t('thinkFinished', {
          ns: 'aiChatModal',
          model: aiMessage.model,
          seconds: Math.max(
            Number(aiMessage.thinkingEndedTime) -
              Number(aiMessage.thinkingStartedTime),
            0
          ),
        })
        status = 3
      }

      // if (v.status === -1) {
      //   loadingText = t('thinkFailed', {
      //     ns: 'aiChatModal',
      //   })
      // }

      if (aiMessage.code === 200) {
        status = 4
      }
      if (aiMessage.code === 10001 && !aiMessage.model) {
        status = -1
        loadingText = t('thinkFailed', {
          ns: 'aiChatModal',
        })
      }
    } else {
      if (message.status === -1) {
        status = -1
        loadingText = t('thinkFailed', {
          ns: 'aiChatModal',
        })
      }
    }

    return {
      readProgress,
      loadingText,
      status,
    }
  }

  const [lastMsgId, setLastMsgId] = useState('')
  const liveMessage = useMemo(() => {
    let amplitude = 80
    let speed = 0.2

    if (loadingMessageId && !lastMsgId && loadingMessageId !== lastMsgId) {
      setLastMsgId(loadingMessageId)
    }
    let msg = ''
    let tokenInfo = ''
    // let curMsg = messages[1]
    let curMsg = messages.filter?.(
      (sv) => sv.id === (loadingMessageId || lastMsgId)
    )?.[0]
    // curMsg = messages[messages.length - 1]
    // console.log('AI领航员 lastMsgId', loadingMessageId, lastMsgId)

    if (curMsg) {
      const aiMessage = aiMessages?.filter((sv) => sv.id === curMsg?.id)?.[0]
        ?.aiMessage
      const { loadingText, status } = aiMessageHandler(curMsg, aiMessage)

      const isEnd = loadingMessageId === ''
      const startStream = aiMessage?.code === 9999

      if (curMsg?.status === 0 || startStream) {
        amplitude = 120
        speed = 1
      }

      tokenInfo = aiMessage?.model
        ? `${aiMessage?.model} ( ${aiMessage.tokenUsage?.totalSessionTokens || 0} Tokens )`
        : ''

      // console.log('AI领航员a tokenInfo', tokenInfo)
      console.log('AI领航员a', aiMessage)
      msg = `${
        curMsg?.message && (isEnd || !startStream)
          ? t('isUserSpeaking', {
              ns: 'aiChatModal',
              message: newStripHtmlTags(curMsg?.message),
            })
          : ''
      }

${
  aiMessage?.error !==
    t('networkOffline', {
      ns: 'aiChatModal',
    }) &&
  loadingText &&
  (isEnd || (startStream && !aiMessage?.reasoning?.message))
    ? t('isAISpeaking', {
        ns: 'aiChatModal',
        message: loadingText,
      })
    : ''
}

${
  aiMessage?.error && (isEnd || (startStream && !aiMessage?.reasoning?.message))
    ? t('isAISpeaking', {
        ns: 'aiChatModal',
        message: aiMessage?.error,
      })
    : ''
}

${
  aiMessage?.reasoning?.message &&
  (isEnd || (startStream && !aiMessage?.display?.message))
    ? t('isAISpeaking', {
        ns: 'aiChatModal',
        message: aiMessage?.reasoning?.message,
      })
    : ''
}

${
  aiMessage?.display?.message
    ? t('isAISpeaking', {
        ns: 'aiChatModal',
        message: aiMessage?.display?.message,
      })
    : ''
}

${aiMessage?.display?.warning || ''}
`
    }

    return {
      message: msg.trim(),
      id: curMsg?.id || '',
      amplitude,
      speed,
      tokenInfo,
      bottomLeftChildren: <span className="tokenInfo">{tokenInfo}</span>,
    }
  }, [lastMsgId, loadingMessageId, aiMessages, messages])

  const quickInputKeys = [
    {
      value: 'searchWeather',
    },
    {
      value: 'searchGeo',
    },
    {
      value: 'searchCity',
    },
    {
      value: 'searchPOIs',
    },
    {
      value: 'myTripHistory',
    },
  ]
  const quickInput = (type: string) => {
    const { city } = store.getState()
    const { cityInfo } = city
    sendMessage({
      _messageRichText: t(type === 'searchCity' ? 'searchCityData' : type, {
        ns: 'aiChatModal',
        city: ['state', 'region', 'city', 'town', 'road']
          .map((v) => {
            const si: any = cityInfo
            let s = si[v]
            return s
          })
          .filter((v) => !!v)
          .join(''),
      }),
      _messages: messages,
      _aiMessages: aiMessages,
    })
  }

  const activeClick = (
    v: protoRoot.ai.AIResponse.ActionItem.IActionPathItem
  ) => {
    console.log('AI领航员', v.type, v.path)
    if (v.type === 'OPEN_MODAL') {
      switch (v.path) {
        case 'modal://track_history':
          loadModal('TripHistory', () => {
            dispatch(layoutSlice.actions.setOpenTripHistoryModal(true))
          })
          break
        case 'modal://journeyMemories':
          loadModal('JourneyMemories', () => {
            dispatch(layoutSlice.actions.setOpenJourneyMemoriesModal(true))
          })
          break
        case 'modal://city_footprint':
          loadModal('VisitedCities', () => {
            dispatch(
              layoutSlice.actions.setOpenVisitedCitiesModal({
                visible: true,
              })
            )
          })
          break
        case 'modal://my_vehicle':
          loadModal('AddVehicle', () => {
            dispatch(layoutSlice.actions.setOpenVehicleModal(true))
          })
          break
        case 'modal://privacy_fence':
          loadModal('PrivacyGeofence', () => {
            dispatch(layoutSlice.actions.setOpenPrivacyGeofenceModal(true))
          })
          break
        case 'modal://custom_route':
          loadModal('CreateCustomTrip', () => {
            dispatch(layoutSlice.actions.setOpenCreateCustomTripModal(true))
          })
          break
        case 'modal://settings':
          loadModal('Settings', () => {
            dispatch(layoutSlice.actions.setOpenSettingsModal(true))
          })
          break

        default:
          break
      }
      return
    }
    if (v.type === 'OPEN_LINK') {
      let url = (router.query?.lang ? '/' + router.query?.lang : '') + v.path

      window.open(((v?.path || '')?.slice(0, 1) === '/' ? url : v.path) || '')
      return
    }
  }

  const speakFunc = () => {
    if (isSpeak) {
      pilot.current.stopManually()
    } else {
      setMessage('')
      setMessageRichText('')
      pilot.current = new SpeechPilot({
        autoStopTimeout: 4000,
        onClose() {
          setIsSpeak(false)
        },
      })
      pilot.current.onSpeechUpdate = (text, isFinal) => {
        const rt = `<p>${text}</p>`
        setMessageRichText(rt)
        richtextEl.current?.setValue(rt)
        if (isFinal) {
          setIsSpeak(false)
          setMessage(text)
        }
      }

      pilot.current.start()
    }
    setIsSpeak(!isSpeak)
  }

  return (
    <SakiAsideModal
      ref={
        bindEvent({
          close() {
            dispatch(
              layoutSlice.actions.setOpenAiChatModal({
                visible: false,
              })
            )
          },
          loaded() {
            eventListener.dispatch('loadModal:AiChatModal', true)
          },
        }) as any
      }
      width={modalConfig.width}
      height={modalConfig.height}
      max-width={modalConfig.maxWidth}
      max-height={modalConfig.maxHeight}
      vertical={modalConfig.vertical as any}
      horizontal={modalConfig.horizontal as any}
      offsetX={modalConfig.offsetX}
      offsetY={modalConfig.offsetY}
      mask={modalConfig.mask}
      mask-closable={modalConfig.maskClosable}
      maskBackgroundColor={'rgba(0,0,0,0.3)'}
      border-radius={modalConfig.borderRadius}
      background-color="transparent"
      visible={layout.openAiChatModal.visible}
      boxShadow={modalConfig.boxShadow}
      overflow="hidden"
    >
      <div
        className={
          'ai-chat-modal ' +
          config.deviceType +
          (config.fullScreen ? ' enlarge ' : '')
        }
      >
        {/* &&
        config.configure.ai?.aiCoDriver?.isLiveActive  */}
        {liveChat ? (
          <div
            ref={
              bindEvent({
                click: (e) => {
                  const el = e.target as HTMLDivElement
                  // console.log('ai-codriver-main', el, el.className)

                  if (
                    el?.className?.includes('ai-codriver-main') ||
                    el?.className?.includes('ai-live-wave-container')
                  ) {
                    dispatch(
                      layoutSlice.actions.setOpenAiChatModal({
                        visible: false,
                      })
                    )
                  }
                },
              }) as any
            }
            className="ai-codriver-main"
          >
            <AILiveWave
              inputMessageRichText={messageRichText}
              onInputMessageRichText={(msg) => {
                setMessageRichText(msg || '')
                setMessage(newStripHtmlTags(msg || ''))
              }}
              bottomLeftChildren={
                !loadingMessageId || playVoiceKey
                  ? liveMessage.bottomLeftChildren
                  : undefined
              }
              haveAiMessage={liveMessage.message !== ''}
              amplitude={liveMessage.amplitude}
              speed={liveMessage.speed}
              isSpeak={isSpeak}
              startAICoDriver={
                launchAICoDriver &&
                !message &&
                loadingMessageId == '' &&
                playVoiceKey == ''
              }
              onStartAICoDriver={() => {
                eventListener.dispatch('startAICoDriver', undefined)
              }}
              isSend={!!message}
              playVoiceKey={playVoiceKey}
              onStopVoice={() => {
                StopVoiceBroadcast(playVoiceKey)
                setPlayVoiceKey('')
              }}
              loadingMessage={loadingMessageId != ''}
              onStop={() => {
                if (playVoiceKey) {
                  StopVoiceBroadcast(playVoiceKey)
                  return
                }
                stopStream({
                  id: loadingMessageId,
                  tempMessages: messages,
                  tempAiMessages: aiMessages,
                })
              }}
              onSend={() => {
                if (messageRichText) {
                  sendMessage({
                    _messageRichText: messageRichText,
                    _messages: messages,
                    _aiMessages: aiMessages,
                  })
                }
              }}
              onClose={() => {
                dispatch(
                  layoutSlice.actions.setOpenAiChatModal({
                    visible: false,
                  })
                )
              }}
              onZoomIn={() => {
                // setLaunchAICoDriver(!launchAICoDriver)

                setLiveChat(!liveChat)
                clearTimeout(autoCloseTimer.current)
              }}
              onUndo={() => {
                setLastMsgId('')
              }}
              onSpeak={() => {
                setLastMsgId('')
                speakFunc()
              }}
              message={
                liveMessage.message
                //                 `t('writeMmessage')
                // t('writeMmessage')
                // t('writeMmessage')
                // t('writeMmessage')
                // t('writeMmessage')
                // t('writeMmessage')
                // t('writeMmessage')
                // t('writeMmessage')
                // t('writeMmessage')
                // 结束` ||
              }
              // message="我：帮我查一下今天天气怎么样，帮我查一下今天天气怎么样，帮我查一下今天天气怎么样，帮我查一下今天天气怎么样，帮我查一下今天天气怎么样，帮我查一下今天天气怎么样，帮我查一下今天天气怎么样，"
            ></AILiveWave>
          </div>
        ) : (
          // <div className="gemini-live-wrapper">
          //   {/* 第一层：底部的深色背景光晕 */}
          //   <div className="ambient-glow"></div>

          //   {/* 第二层：核心脉动山峦 */}
          //   <div className="mountain-container">
          //     <div className="gemini-blob b-blue"></div>
          //     <div className="gemini-blob b-cyan"></div>
          //     <div className="gemini-blob b-purple"></div>
          //   </div>

          //   {/* 第三层：半透明遮罩，制造出图二那种“柔焦”效果 */}
          //   <div className="glass-overlay"></div>
          // </div>
          // <div className="codriver-voice-bar">
          //   {/* 声纹容器 */}
          //   <div className="waveform-container">
          //     <div className="wave"></div>
          //     <div className="wave"></div>
          //     <div className="wave"></div>
          //     <div className="wave"></div>
          //   </div>
          //   {/* 字幕区域 */}
          //   <div className="subtitle-text">赶上了，咱们还在赶路。</div>
          // </div>
          <>
            <div className="fw-header">
              <SakiModalHeader
                ref={
                  bindEvent({
                    close: () => {
                      dispatch(
                        layoutSlice.actions.setOpenAiChatModal({
                          visible: false,
                        })
                      )
                    },
                  }) as any
                }
                back-icon={false}
                close-icon={true}
                left-width={'calc(100% - 60px)'}
                center-width={config.deviceType === 'Mobile' ? '0px' : '0px'}
                right-width={''}
                title={
                  layout.openAiChatModal.title ||
                  t('title', {
                    ns: 'aiChatModal',
                  })
                }
              >
                <div className="fwh-left" slot="left">
                  <span className="fwhl-title">
                    {layout.openAiChatModal.title ||
                      t('title', {
                        ns: 'aiChatModal',
                      })}
                  </span>
                  <span className="fwhl-subtitle">
                    {layout.openAiChatModal.subtitle ||
                      t('subtitle', {
                        ns: 'aiChatModal',
                      })}
                  </span>
                </div>
                <div slot="right">
                  <SakiRow>
                    {!launchAICoDriver ? (
                      <>
                        <saki-button
                          ref={bindEvent({
                            tap: async () => {
                              await clear()
                              setMessages([])
                              setAiMessages([])
                            },
                          })}
                          width="36px"
                          height="36px"
                          margin="6px 6px 6px 0"
                          type="CircleIconGrayHover"
                        >
                          <saki-icon
                            type="Add"
                            width="18px"
                            height="18px"
                            color="#666"
                          />
                        </saki-button>
                        <saki-dropdown
                          visible={showSettingsDP}
                          floating-direction="Left"
                          ref={bindEvent({
                            close: () => {
                              setShowSettingsDP(false)
                            },
                          })}
                        >
                          <SakiButton
                            onTap={() => {
                              setShowSettingsDP(true)
                            }}
                            width="36px"
                            height="36px"
                            margin="6px 6px 6px 0"
                            type="CircleIconGrayHover"
                          >
                            <saki-icon
                              color="#666"
                              width="18px"
                              height="18px"
                              type="Settings"
                            ></saki-icon>
                          </SakiButton>
                          <div slot="main">
                            <div
                              style={{
                                width: Math.min(300, config.deviceWH.w) + 'px',
                                maxHeight:
                                  Math.min(400, config.deviceWH.w) + 'px',
                              }}
                              className="aichat-settings scrollBarDefault"
                            >
                              <SakiTitle level={5} color="default">
                                <span>
                                  {t('aiModelTitle', {
                                    ns: 'tripPage',
                                  })}
                                </span>
                              </SakiTitle>

                              <div className="as-item">
                                <span>
                                  {t('aiCoDriver', {
                                    ns: 'aiChatModal',
                                  })}
                                </span>
                                <saki-switch
                                  ref={bindEvent({
                                    change: (e) => {
                                      dispatch(
                                        methods.config.SetConfigure({
                                          ...config.configure,
                                          ai: {
                                            ...config.configure.ai,
                                            aiCoDriver: {
                                              ...config.configure.ai
                                                ?.aiCoDriver,
                                              enabled: Boolean(e.detail),
                                            },
                                          },
                                        })
                                      )
                                    },
                                  })}
                                  height="24px"
                                  value={
                                    !!config.configure?.ai?.aiCoDriver?.enabled
                                  }
                                ></saki-switch>
                              </div>

                              {config.configure?.ai?.aiCoDriver?.enabled ? (
                                <>
                                  <div className="as-item">
                                    <span>
                                      {t('autoPlayVoice', {
                                        ns: 'aiChatModal',
                                      })}
                                    </span>
                                    <saki-switch
                                      ref={bindEvent({
                                        change: (e) => {
                                          dispatch(
                                            methods.config.SetConfigure({
                                              ...config.configure,
                                              ai: {
                                                ...config.configure.ai,
                                                aiCoDriver: {
                                                  ...config.configure.ai
                                                    ?.aiCoDriver,
                                                  autoPlayVoice: Boolean(
                                                    e.detail
                                                  ),
                                                },
                                              },
                                            })
                                          )
                                          dispatch(
                                            methods.config.SetConfigure({
                                              ...config.configure,
                                              ai: {
                                                ...config.configure.ai,
                                                aiCoDriver: {
                                                  ...config.configure.ai
                                                    ?.aiCoDriver,
                                                  autoPlayVoice: Boolean(
                                                    e.detail
                                                  ),
                                                },
                                              },
                                            })
                                          )
                                        },
                                      })}
                                      height="24px"
                                      value={
                                        !!config.configure?.ai?.aiCoDriver
                                          ?.autoPlayVoice
                                      }
                                    ></saki-switch>
                                  </div>

                                  <div className="as-item">
                                    <span>
                                      {t('autoCloseTime', {
                                        ns: 'aiChatModal',
                                      })}
                                    </span>
                                    <saki-switch
                                      ref={bindEvent({
                                        change: (e) => {
                                          dispatch(
                                            methods.config.SetConfigure({
                                              ...config.configure,
                                              ai: {
                                                ...config.configure.ai,
                                                aiCoDriver: {
                                                  ...config.configure.ai
                                                    ?.aiCoDriver,
                                                  autoCloseTime: Boolean(
                                                    e.detail
                                                  )
                                                    ? 5000
                                                    : 0,
                                                },
                                              },
                                            })
                                          )
                                        },
                                      })}
                                      height="24px"
                                      value={
                                        !!config.configure?.ai?.aiCoDriver
                                          ?.autoCloseTime
                                      }
                                    ></saki-switch>
                                  </div>

                                  <SakiTitle level={5} color="default">
                                    <span>
                                      {t('aiCoDriverLive', {
                                        ns: 'aiChatModal',
                                      })}
                                    </span>
                                  </SakiTitle>

                                  <div className="as-item">
                                    <span>
                                      {t('autoLaunchLiveAfterStartTrip', {
                                        ns: 'aiChatModal',
                                      })}
                                    </span>
                                    <saki-switch
                                      ref={bindEvent({
                                        change: (e) => {
                                          dispatch(
                                            methods.config.SetConfigure({
                                              ...config.configure,
                                              ai: {
                                                ...config.configure.ai,
                                                aiCoDriver: {
                                                  ...config.configure.ai
                                                    ?.aiCoDriver,
                                                  autoLaunchLiveAfterStartTrip:
                                                    Boolean(e.detail),
                                                },
                                              },
                                            })
                                          )
                                          dispatch(
                                            methods.config.SetConfigure({
                                              ...config.configure,
                                              ai: {
                                                ...config.configure.ai,
                                                aiCoDriver: {
                                                  ...config.configure.ai
                                                    ?.aiCoDriver,
                                                  autoLaunchLiveAfterStartTrip:
                                                    Boolean(e.detail),
                                                },
                                              },
                                            })
                                          )
                                        },
                                      })}
                                      height="24px"
                                      value={
                                        !!config.configure?.ai?.aiCoDriver
                                          ?.autoLaunchLiveAfterStartTrip
                                      }
                                    ></saki-switch>
                                  </div>

                                  <SakiTitle level={5} color="default">
                                    <span>
                                      {t('aiCoDriverTriggerConfig', {
                                        ns: 'aiChatModal',
                                      })}
                                    </span>
                                  </SakiTitle>

                                  {[
                                    {
                                      felid: 'firstOpenDistance',
                                      min: 5,
                                      max: 500,
                                      default: 100,
                                      unit: t('meters', {
                                        ns: 'unit',
                                      }),
                                    },
                                    {
                                      felid: 'milestoneStep',
                                      min: 500,
                                      max: 10 * 1000,
                                      default: 5000,
                                      unit: t('meters', {
                                        ns: 'unit',
                                      }),
                                    },
                                    {
                                      felid: 'altitudeStep',
                                      min: 50,
                                      max: 500,
                                      default: 150,
                                      unit: t('meters', {
                                        ns: 'unit',
                                      }),
                                    },
                                    {
                                      felid: 'climbMilestone',
                                      min: 100,
                                      max: 1000,
                                      default: 500,
                                      unit: t('meters', {
                                        ns: 'unit',
                                      }),
                                    },
                                    {
                                      felid: 'descendMilestone',
                                      min: 100,
                                      max: 1000,
                                      default: 500,
                                      unit: t('meters', {
                                        ns: 'unit',
                                      }),
                                    },
                                    {
                                      felid: 'tempStep',
                                      min: 1,
                                      max: 10,
                                      default: 5,
                                      unit: '℃',
                                    },
                                  ].map((v, i) => {
                                    const value = (
                                      config.configure.ai?.aiCoDriver
                                        ?.trigger as any
                                    )?.[v.felid]
                                    return (
                                      <div key={i} className="as-item">
                                        <span>
                                          {t(v.felid, {
                                            ns: 'aiChatModal',
                                          })}
                                        </span>

                                        <saki-input
                                          ref={bindEvent({
                                            changevalue: (e) => {
                                              dispatch(
                                                methods.config.SetConfigure({
                                                  ...config.configure,
                                                  ai: {
                                                    ...config.configure.ai,
                                                    aiCoDriver: {
                                                      ...config.configure.ai
                                                        ?.aiCoDriver,
                                                      trigger: {
                                                        ...config.configure.ai
                                                          ?.aiCoDriver?.trigger,
                                                        [v.felid]:
                                                          Number(e.detail) ??
                                                          v.default,
                                                      },
                                                    },
                                                  },
                                                })
                                              )
                                            },
                                          })}
                                          style={{
                                            flex: '1',
                                          }}
                                          width="100%"
                                          type="Range"
                                          value={value ?? v.default}
                                          min={v.min}
                                          max={v.max}
                                          // margin="0 10px"
                                          padding="0 10px"
                                        ></saki-input>
                                        <span className="sm-tw-num">
                                          {value ?? v.default}
                                          {v.unit}
                                        </span>
                                      </div>
                                    )
                                  })}
                                </>
                              ) : (
                                ''
                              )}
                            </div>
                          </div>
                        </saki-dropdown>
                      </>
                    ) : loadingMessageId ? (
                      <saki-button
                        ref={bindEvent({
                          tap: () => {
                            stopStream({
                              id: loadingMessageId,
                              tempMessages: messages,
                              tempAiMessages: aiMessages,
                            })
                          },
                        })}
                        width="36px"
                        height="36px"
                        margin="6px 6px 6px 0"
                        type="CircleIconGrayHover"
                      >
                        <saki-icon
                          type="Stop"
                          width="16px"
                          height="16px"
                          color="var(--default-color)"
                        />
                      </saki-button>
                    ) : (
                      <>
                        <saki-button
                          ref={bindEvent({
                            tap: () => {
                              setLiveChat(!liveChat)
                            },
                          })}
                          margin="6px 6px 6px 0"
                          width="36px"
                          height="36px"
                          type="CircleIconGrayHover"
                        >
                          <saki-icon
                            type="LiveChat"
                            width="18px"
                            height="18px"
                            color="#777"
                          />
                        </saki-button>
                        <saki-button
                          ref={bindEvent({
                            tap: () => {
                              eventListener.dispatch(
                                'startAICoDriver',
                                undefined
                              )
                            },
                          })}
                          width="36px"
                          height="36px"
                          margin="6px 6px 6px 0"
                          type="CircleIconGrayHover"
                        >
                          <saki-icon
                            type="FlagFill"
                            width="16px"
                            height="16px"
                            color="#666"
                          />
                        </saki-button>
                      </>
                    )}

                    {layout.openAiChatModal.visible &&
                    layout.openAiChatModal.type === 'coDriver' &&
                    layout.openAiChatModal.startTrip &&
                    config.configure.ai?.aiCoDriver?.enabled ? (
                      <SakiButton
                        onTap={() => {
                          setLaunchAICoDriver(!launchAICoDriver)
                          clearTimeout(autoCloseTimer.current)
                        }}
                        width="36px"
                        height="36px"
                        // padding="24px"
                        margin="6px 6px 6px 0"
                        type="CircleIconGrayHover"
                      >
                        <saki-icon
                          color="#666"
                          width="18px"
                          height="18px"
                          type="ZoomIn"
                        ></saki-icon>
                      </SakiButton>
                    ) : (
                      ''
                    )}
                  </SakiRow>
                </div>
              </SakiModalHeader>
            </div>
            <div className="ac-main">
              {messages?.length ? (
                <div className="acm-messages">
                  <saki-scroll-view
                    ref={bindEvent(
                      {
                        distancetoborder: (e) => {
                          // console.log(
                          //   'AI领航员 keepScrollPosition',
                          //   e.detail.bottom <= 5,
                          //   e.detail.bottom
                          // )

                          e.detail.bottom <= 5 !== keepScrollPosition &&
                            setKeepScrollPosition(e.detail.bottom <= 5)
                          // console.log('AIRoadbook distancetoborder', e.detail)
                          // setShowGoBottomButton(e.detail.bottom >= 100)
                        },
                        watchscrollto: (e) => {
                          // console.log('AIRoadbook watchscrollto', e.detail)
                        },
                      },
                      (e) => {
                        messageMainScrollEl.current = e
                      }
                    )}
                    mode="Inherit"
                    position="Bottom"
                    keep-scroll-position={
                      !!loadingMessageId && keepScrollPosition
                    }
                    scroll-bar="Auto"
                    // @distancetoborder="currentChat.distanceToborder"
                    // @watchscrollto="currentChat.watchScrollTo"
                    // @scrolltotop="currentChat.scrollToTop"
                    // @mounted="currentChat.getScrollHeight"
                  >
                    <div className="acmm-list">
                      {messages?.map((v, i) => {
                        const aiMessage = aiMessages?.filter(
                          (sv) => sv.id === v.id
                        )?.[0]?.aiMessage

                        const usageItem =
                          aiMessage?.tokenUsage?.tokenUsageHistory?.[
                            aiMessage?.tokenUsage?.tokenUsageHistory?.length - 1
                          ]

                        const { readProgress, loadingText, status } =
                          aiMessageHandler(v, aiMessage)

                        // if (v.id === 'B6jQKwrk2') {
                        //   console.log('AIRoadbook status', v, status, aiMessage)
                        // }
                        return (
                          <div className="acmml-item" key={i}>
                            <div className="acmmli-me">
                              <saki-chat-bubble
                                data-id={v.id}
                                key={i}
                                ref={bindEvent({
                                  sendfailed: () => {
                                    console.log('消息发送失败', v.id, v.message)

                                    // dispatch(
                                    //   messagesSlice.actions.setMessageItem({
                                    //     roomId,
                                    //     messageId: v.id || '',
                                    //     value: {
                                    //       ...v,
                                    //       status: -1,
                                    //     },
                                    //   })
                                    // )
                                  },
                                  resend: () => {
                                    console.log('resend', v.id, v.message)
                                    resendMessage(v)
                                    // if (v.editing) {
                                    //   selectReplyMessage &&
                                    //     setSelectReplyMessage(undefined)
                                    //   setEditMessage(v)
                                    //   setMessageRichText(v.message || '')
                                    //   return
                                    // }
                                    // dispatch(
                                    //   methods.messages.resendMessageToServer({
                                    //     messageId: v.id || '',
                                    //     roomId: roomId,
                                    //     storeOnlyLocally: true,
                                    //     message: {
                                    //       ...v,
                                    //     },
                                    //   })
                                    // )
                                    // resendMessageToServer
                                    // dispatch(methods.tools.developing())
                                  },
                                  tap: (e) => {
                                    // switch (e.detail) {
                                    //   case 'message':
                                    //     if (enbalSelect) {
                                    //       selectMessage(v)
                                    //       return
                                    //     }
                                    //     if (v.call?.type) {
                                    //       call(v.call?.type as any)
                                    //     }
                                    //     break
                                    //   case 'avatar':
                                    //     dispatch(
                                    //       configSlice.actions.setModalUserId(
                                    //         v.authorId || ''
                                    //       )
                                    //     )
                                    //     break
                                    //   default:
                                    //     break
                                    // }
                                  },
                                  opencontextmenu: (e: any) => {
                                    // console.log('opencontextmenu', e)
                                    // const el = e.target?.querySelector(
                                    //   '.saki-richtext-content'
                                    // )
                                    // if (el) {
                                    //   let range = document.createRange()
                                    //   range.selectNodeContents(el)
                                    //   let selection = window.getSelection()
                                    //   selection?.removeAllRanges()
                                    //   selection?.addRange(range)
                                    //   // console.log(range)
                                    // }
                                    // // console.log(el?.setSelectionRange)
                                    // // el?.setSelectionRange?.(0, 10)
                                    // if (enbalSelect) {
                                    //   selectMessage(v)
                                    //   return
                                    // }
                                    // bubbleContextMenuEl.current?.show({
                                    //   x: e.detail.x,
                                    //   y: e.detail.y,
                                    // })
                                    // setBubbleContextMenuIndex(i)
                                  },
                                })}
                                onClick={(e: any) => {}}
                                language={i18n.language}
                                background-color={false ? '#eee' : ''}
                                bubble-background-color={
                                  v?.authorId === user.userInfo.uid
                                    ? '#f6bfcc'
                                    : '#eee'
                                }
                                edit-text={
                                  v.editTime
                                    ? t('edited', {
                                        ns: 'aiChatModal',
                                      })
                                    : ''
                                }
                                selected={false}
                                show-center-time={false}
                                previous-message-uid={''}
                                previous-message-send-time={0}
                                previous-message-type={
                                  // pMessage?.authorId === user.userInfo.uid
                                  //   ? 'sender'
                                  //   : 'receiver'
                                  'sender'
                                }
                                padding={''}
                                border-radius={
                                  v?.authorId === user.userInfo.uid
                                    ? '24px 1px 24px 24px'
                                    : '1px 24px 24px 24px'
                                }
                                border={'2px solid rgba(0,0,0,0)'}
                                send-time={v.createTime}
                                status={v.status}
                                read-stats-icon
                                status-icon={
                                  v.status === -1
                                    ? messages.length - 1 === i
                                    : true
                                }
                                display-time
                                user-info-display-mode="Full"
                                avatar={''}
                                nickname={''}
                                // avatar={user.userInfo.avatar}
                                // nickname={user.userInfo?.nickname?.toUpperCase()}
                                type={
                                  v.authorId === user.userInfo.uid
                                    ? 'sender'
                                    : 'receiver'
                                }
                                call-type={''}
                                call-time={''}
                                call-status={''}
                                read-progress={readProgress}
                                uid={v.authorId}
                                horizontal-margin="46px"
                                vertical-margin="10px"
                                watch-status
                                watch-status-timeout="5"
                                watch-status-count="1"
                              >
                                <>
                                  <div
                                    style={{
                                      padding: '2px 4px',
                                    }}
                                    className="saki-richtext-content"
                                    dangerouslySetInnerHTML={{
                                      __html: v.message || '',
                                    }}
                                  ></div>
                                  {/* {type ? (
                          <saki-chat-bubble-file
                            ref={bindEvent({
                              download: () => {
                                console.log('download')
                              },
                              load: () => {
                                // messageMainScrollEl.current?.keepScrollPosition()
                              },
                            })}
                            file-width={width}
                            file-height={height}
                            width="100%"
                            max-width={maxWidth}
                            type={type}
                            name={name}
                            size={size}
                            suffix={suffix}
                            time={time}
                            expiration-time={expirationTime}
                            progress={progress}
                            src={src}
                          ></saki-chat-bubble-file>
                        ) : (
                          <>
                          </>
                        )} */}
                                </>
                              </saki-chat-bubble>
                              <div className="acmmli-buttons">
                                <SakiButton
                                  onTap={async () => {
                                    copyText(newStripHtmlTags(v?.message || ''))
                                    snackbar({
                                      message: t('copySuccessfully', {
                                        ns: 'prompt',
                                      }),
                                      autoHideDuration: 2000,
                                      vertical: 'top',
                                      horizontal: 'center',
                                      backgroundColor:
                                        'var(--saki-default-color)',
                                      color: '#fff',
                                    }).open()
                                  }}
                                  width="36px"
                                  height="36px"
                                  // padding="24px"
                                  margin="0px 6px 0 0"
                                  type="CircleIconGrayHover"
                                >
                                  <saki-icon
                                    color="#666"
                                    width="16px"
                                    height="16px"
                                    type="Copy"
                                  ></saki-icon>
                                </SakiButton>

                                {i === messages.length - 1 ? (
                                  <SakiButton
                                    onTap={() => {
                                      setEditMessage(v)
                                      setMessageRichText(v?.message || '')
                                      setMessage(
                                        newStripHtmlTags(v?.message || '')
                                      )
                                      richtextEl.current?.setValue(v.message)
                                    }}
                                    width="36px"
                                    height="36px"
                                    // padding="24px"
                                    margin="0px 6px 0 0"
                                    type="CircleIconGrayHover"
                                  >
                                    <saki-icon
                                      color="#666"
                                      width="16px"
                                      height="16px"
                                      type="PenWrite"
                                    ></saki-icon>
                                  </SakiButton>
                                ) : (
                                  ''
                                )}
                              </div>
                            </div>
                            <div className="acmmli-ai">
                              <saki-chat-ai-bubble
                                ref={
                                  bindEvent({
                                    retry: () => {
                                      console.log('AIRoadbook  retry')
                                      resendMessage(v)
                                    },
                                  }) as any
                                }
                                model={aiMessage?.model || ''}
                                loading-text={loadingText}
                                text-type="Markdown"
                                status={status}
                                thinking-message={
                                  aiMessage?.reasoning?.message || ''
                                }
                                error-message={aiMessage?.error || ''}
                                message={aiMessage?.display?.message || ''}
                                warining-message={
                                  aiMessage?.status?.isSafetyFenced
                                    ? `<p>${t('safetyWarning', {
                                        ns: 'aiChatModal',
                                      })}</p>`
                                    : aiMessage?.display?.warning || ''
                                }
                              ></saki-chat-ai-bubble>
                              {aiMessage?.action?.paths?.length ? (
                                <div className="acmmli-action">
                                  {aiMessage?.action?.paths?.map((v, i) => {
                                    const title =
                                      v.title || aiMessage?.action?.title

                                    return (
                                      <div key={i} className="acmmlia-item">
                                        <SakiButton
                                          onTap={() => {
                                            activeClick(v)
                                          }}
                                          padding="8px 14px"
                                          type="Primary"
                                        >
                                          {v.title
                                            ? v.title
                                            : t(
                                                v.type === 'OPEN_MODAL'
                                                  ? 'openModal'
                                                  : 'openLink',
                                                {
                                                  ns: 'aiChatModal',
                                                  title: title,
                                                }
                                              )}
                                        </SakiButton>
                                      </div>
                                    )
                                  })}
                                </div>
                              ) : (
                                ''
                              )}
                              {Number(aiMessage?.code) &&
                              Number(aiMessage?.code) !== 9999 ? (
                                <SakiRow
                                  justifyContent="space-between"
                                  padding="10px 10px 0"
                                >
                                  <SakiRow
                                    justifyContent="flex-start"
                                    alignItems="center"
                                  >
                                    <SakiButton
                                      onTap={async () => {
                                        copyText(
                                          newStripHtmlTags(
                                            `${aiMessage.display?.message}
                                ${aiMessage.display?.warning}` || ''
                                          )
                                        )
                                        snackbar({
                                          message: t('copySuccessfully', {
                                            ns: 'prompt',
                                          }),
                                          autoHideDuration: 2000,
                                          vertical: 'top',
                                          horizontal: 'center',
                                          backgroundColor:
                                            'var(--saki-default-color)',
                                          color: '#fff',
                                        }).open()
                                      }}
                                      width="36px"
                                      height="36px"
                                      // padding="24px"
                                      margin="0px 6px 0 0"
                                      type="CircleIconGrayHover"
                                    >
                                      <saki-icon
                                        color="#666"
                                        width="16px"
                                        height="16px"
                                        type="Copy"
                                      ></saki-icon>
                                    </SakiButton>
                                    <SakiButton
                                      onTap={async () => {
                                        // console.log(
                                        //   'AI领航员 playVoiceKey',
                                        //   playVoiceKey
                                        // )
                                        if (playVoiceKey) {
                                          StopVoiceBroadcast(v.id || '')
                                          setPlayVoiceKey('')
                                          return
                                        }
                                        if (
                                          aiMessage.display?.message ||
                                          aiMessage.display?.warning
                                        ) {
                                          const text = cleanMarkdown(
                                            (aiMessage.display?.message || '') +
                                              '; ' +
                                              (aiMessage.display?.warning || '')
                                          )

                                          setPlayVoiceKey(v.id || '')
                                          await WebVoiceBroadcast(
                                            // t('aiAgentRemindsYou', {
                                            //   ns: 'aiChatModal',
                                            // }) +
                                            text,
                                            v.id || '',
                                            config.lang
                                          )
                                          setPlayVoiceKey('')
                                        }
                                      }}
                                      width="36px"
                                      height="36px"
                                      // padding="24px"
                                      margin="0px 6px 0 0"
                                      type="CircleIconGrayHover"
                                    >
                                      {playVoiceKey === v.id ? (
                                        <saki-animation-loading
                                          width="22px"
                                          height="22px"
                                          margin="7px"
                                        ></saki-animation-loading>
                                      ) : (
                                        <saki-icon
                                          color="#666"
                                          width="18px"
                                          height="18px"
                                          type="Sound"
                                        ></saki-icon>
                                      )}
                                    </SakiButton>

                                    {i === messages.length - 1 ? (
                                      <SakiButton
                                        onTap={() => {
                                          resendMessage(v)
                                        }}
                                        width="36px"
                                        height="36px"
                                        // padding="24px"
                                        margin="0px 6px 0 0"
                                        type="CircleIconGrayHover"
                                      >
                                        <saki-icon
                                          color="#666"
                                          width="18px"
                                          height="18px"
                                          type="Refresh"
                                        ></saki-icon>
                                      </SakiButton>
                                    ) : (
                                      ''
                                    )}
                                  </SakiRow>
                                  <div className="acmmli-right">
                                    {aiMessage?.tokenUsage
                                      ?.totalSessionTokens ? (
                                      <span className="acmmlir-token">
                                        {t(
                                          aiMessage.code === 9999
                                            ? 'loadingTokens'
                                            : 'totalTokens',
                                          {
                                            ns: 'aiChatModal',
                                            loop: usageItem?.loopCount,
                                            tokens:
                                              aiMessage?.tokenUsage
                                                ?.totalSessionTokens || 0,
                                          }
                                        )}
                                      </span>
                                    ) : (
                                      ''
                                    )}
                                  </div>
                                </SakiRow>
                              ) : (
                                ''
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </saki-scroll-view>
                </div>
              ) : (
                <div className="acm-welcome">
                  <h2>{t('welcomeToYou')}</h2>
                  <h1>
                    {t('appTitle', {
                      ns: 'common',
                    })}
                  </h1>
                  {/* <h3>{t('welcomeToYou1', {})}</h3> */}

                  <div className="acmw-buttons">
                    {quickInputKeys.map((v, i) => {
                      return (
                        <SakiButton
                          onTap={() => {
                            quickInput(v.value)
                          }}
                          key={i}
                          height="36px"
                          padding="0 12px"
                          border-radius="18px"
                          border="none"
                          bg-color="#f1f1f1"
                          bg-hover-color="#ddd"
                          bg-active-color="#ccc"
                        >
                          <span>
                            {t(v.value, {
                              ns: 'aiChatModal',
                            })}
                          </span>
                        </SakiButton>
                      )
                    })}
                  </div>
                </div>
              )}

              {!launchAICoDriver ? (
                <div
                  className={`acm-inputbar ${!messages?.length ? 'startPage' : ''}`}
                >
                  {editMessage ? (
                    <saki-chat-edit
                      ref={bindEvent({
                        close: (e) => {
                          setEditMessage(undefined)
                          setMessageRichText('')
                          setMessage('')
                        },
                      })}
                      title={t('editMessage', {
                        ns: 'aiChatModal',
                      })}
                      icon-size={'36px'}
                      padding={'0 0px'}
                      margin={'0 0 10px 0'}
                      message={
                        editMessage?.message?.replace(/<[^>]+>/gi, '') || ''
                      }
                    ></saki-chat-edit>
                  ) : (
                    ''
                  )}
                  <div className="acm-input saki-richtext-content">
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
                            setMessageRichText(e.detail.richText)
                            setMessage(
                              newStripHtmlTags(e.detail.richText || '')
                            )
                          },
                          submit: () => {
                            sendMessage({
                              _messages: messages,
                              _aiMessages: aiMessages,
                            })
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
                      value={messageRichText}
                      // :value="currentChat.value"
                      // @clearvalue="currentChat.value = ''"
                      // @pressenter="currentChat.send"
                      // @changevalue="(e:CustomEvent)=>currentChat.changevalue(e)"
                      placeholder={t('writeMmessage')}
                    />
                  </div>
                  <div className="acm-buttons">
                    <div className="acmb-left">
                      {messages?.length || true ? (
                        <saki-dropdown
                          visible={openQuickPhrase}
                          floating-direction="Left"
                          z-index="1000"
                          ref={bindEvent({
                            close: () => {
                              setOpenQuickPhrase(false)
                            },
                          })}
                        >
                          <saki-button
                            ref={bindEvent({
                              tap: () => {
                                setOpenQuickPhrase(true)
                              },
                            })}
                            margin="0 0 0 -8px"
                            height="36px"
                            border-radius="18px"
                            padding="0 10px"
                            border="none"
                            bg-color="#f1f1f1"
                            bg-hover-color="#ddd"
                            bg-active-color="#ccc"
                          >
                            {t('quickInput', {
                              ns: 'aiChatModal',
                            })}
                          </saki-button>
                          <div slot="main">
                            <saki-menu
                              ref={bindEvent({
                                selectvalue: async (e) => {
                                  quickInput(e.detail.value)

                                  setOpenQuickPhrase(false)
                                },
                              })}
                            >
                              {quickInputKeys.map((v, i) => {
                                return (
                                  <saki-menu-item
                                    key={i}
                                    padding="10px 18px"
                                    value={v.value}
                                    subtitle={i === 0 ? t('quickInput') : ''}
                                  >
                                    <span>
                                      {t(v.value, {
                                        ns: 'aiChatModal',
                                      })}
                                    </span>
                                  </saki-menu-item>
                                )
                              })}

                              {[
                                {
                                  value: 'queryFunction',
                                },
                                {
                                  value: 'aboutMe',
                                },
                                {
                                  value: 'contactDeveloper',
                                },
                              ].map((v, i) => {
                                return (
                                  <saki-menu-item
                                    key={i}
                                    padding="10px 18px"
                                    value={v.value}
                                    subtitle={
                                      i === 0 ? t('learnAboutFeatures') : ''
                                    }
                                  >
                                    <span>
                                      {t(v.value, {
                                        ns: 'aiChatModal',
                                      })}
                                    </span>
                                  </saki-menu-item>
                                )
                              })}
                            </saki-menu>
                          </div>
                        </saki-dropdown>
                      ) : (
                        ''
                      )}
                    </div>
                    <div className="acmb-right">
                      <saki-button
                        ref={bindEvent({
                          tap: () => {
                            setLiveChat(!liveChat)
                          },
                        })}
                        margin="0 4px 0 0px"
                        width="40px"
                        height="40px"
                        type="CircleIconGrayHover"
                      >
                        <saki-icon
                          type="LiveChat"
                          width="20px"
                          height="20px"
                          color="#777"
                        />
                      </saki-button>
                      {loadingMessageId ? (
                        <saki-button
                          ref={bindEvent({
                            tap: () => {
                              stopStream({
                                id: loadingMessageId,
                                tempMessages: messages,
                                tempAiMessages: aiMessages,
                              })
                            },
                          })}
                          margin="0 -5px 0 0px"
                          width="40px"
                          height="40px"
                          type="CircleIconGrayHover"
                        >
                          <saki-icon
                            type="Stop"
                            width="16px"
                            height="16px"
                            color="var(--default-color)"
                          />
                        </saki-button>
                      ) : message && !isSpeak ? (
                        <saki-button
                          ref={bindEvent({
                            tap: () => {
                              sendMessage({
                                _messages: messages,
                                _aiMessages: aiMessages,
                              })
                            },
                          })}
                          margin="0 -5px 0 0px"
                          width="40px"
                          height="40px"
                          type="CircleIconGrayHover"
                        >
                          <saki-icon
                            type="Send"
                            width="18px"
                            height="18px"
                            color="#777"
                          />
                        </saki-button>
                      ) : (
                        <saki-button
                          ref={bindEvent({
                            tap: () => {
                              speakFunc()
                            },
                          })}
                          margin="0 -5px 0 0px"
                          width="40px"
                          height="40px"
                          type="CircleIconGrayHover"
                          // disabled
                        >
                          <saki-icon
                            type={isSpeak ? 'MicroPhoneFill' : 'MicroPhone'}
                            width="20px"
                            height="20px"
                            // color="#ccc"
                            color={
                              isSpeak ? 'var(--saki-default-color)' : '#777'
                            }
                          />
                        </saki-button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                ''
              )}
            </div>
          </>
        )}
      </div>
    </SakiAsideModal>
  )
}
