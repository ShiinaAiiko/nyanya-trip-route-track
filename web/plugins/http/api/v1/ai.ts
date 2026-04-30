import { protoRoot, PARAMS, Request } from '../../../../protos'
import store from '../../../../store'
import { getUrl } from '..'
import {
  deepCopy,
  networkConnectionStatusDetection,
  networkConnectionStatusDetectionEnum,
} from '@nyanyajs/utils/dist/common/common'
import { R } from '../../../../store/config'
import { openApp, toolApiUrl } from '../../../../config'
import { AES } from '@nyanyajs/utils'
import moment from 'moment'
let RequestType = protoRoot.base.RequestType
let ResponseType = protoRoot.base.ResponseType

// 基础类型定义
export interface StreamResponse {
  type: string // "meta" (指令执行) 或 "text" (AI文案)
  action: string // 比如 "update_title"
  value: any // 设置的新值
  content: string // AI 吐出的字符碎片
}

// 基础类型定义
export interface AIResponse<T = any> {
  status: {
    code: number // 200 成功 / 10001 失败
  }
  meta: {
    model: string
    action: string
    value: string
    status: string
  }
  display: {
    message: string
    warning?: string
  }
  data: T
}

function isCodeAtLastPosition(str: string, searchKey: string): boolean {
  const lastCodeIndex = str.lastIndexOf(searchKey)
  if (lastCodeIndex === -1) return false

  // 检查后面是否还有其他非空内容
  const afterCode = str.substring(lastCodeIndex + searchKey.length) // 7 是 '"code":' 的长度
  return afterCode.trim().length === 0
}

/**
 * 增量解析 AI 流式输出的 JSON 字符串
 * @param fullBuffer 累加的原始字符串碎片
 */
function parseIncrementalResponse(
  fullBuffer: string,
  currentResponse: protoRoot.ai.IAIResponse
): protoRoot.ai.IAIResponse {
  // 1. 提取 status.code
  const codeMatch = fullBuffer.match(/"code":\s*(\d+)/)
  if (codeMatch) currentResponse.code = parseInt(codeMatch[1])

  // 3. 提取 display.message (打字机效果的核心)
  // 匹配 "message": " 之后的所有字符，直到遇到下一个未转义的双引号
  const messageMatch = fullBuffer.match(/"message":\s*"((?:[^"\\]|\\.)*)"?/)
  if (messageMatch) {
    // 处理 JSON 转义字符 (如 \n, \")
    currentResponse.display!.message = messageMatch[1]
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
  }

  const warningMatch = fullBuffer.match(/"warning":\s*"([^"]*)"?/)
  if (warningMatch) currentResponse.display!.warning = warningMatch[1]

  return { ...currentResponse } // 返回新引用触发 UI 更新
}

export const aiApi = {
  // 1. 合并后的核心私有逻辑
  async _executeAIStreamRequest({
    params,
    requestType,
    apiUrl,
    abortController,
    streamTimeout = 30 * 1000,
    timeout = 2 * 60 * 1000,
    onStream,
    onEnd,
  }: {
    params: any
    requestType: any // Protobuf 请求类
    apiUrl: string
    abortController?: AbortController
    streamTimeout?: number // ms
    timeout?: number // ms
    onStream: (type: string, response: protoRoot.ai.IAIResponse) => void
    onEnd?: () => void
  }) {
    const { api, user } = store.getState()

    // 构造请求数据
    const data = new URLSearchParams()
    data.append(
      'data',
      Buffer.from(
        RequestType.encode(
          RequestType.create({
            token: user.token,
            deviceId: user.deviceId,
            userAgent: user.userAgent,
            data: PARAMS<any>(params, requestType)?.data,
            open: {
              appKey: openApp.apiKey,
              userId: AES.encrypt(user.userInfo.uid, openApp.apiKey).value,
            },
          })
        ).finish() as any,
        'base64'
      ).toString('base64')
    )

    let aiRes: protoRoot.ai.IAIResponse = {
      status: { isRelevant: true },
      code: 0,
      meta: [],
      reasoning: { message: '' },
      display: { message: '', warning: '' },
      data: null,
      createTime: moment().unix(),
      historyMessages: [],
      tokenUsage: {},
    }

    let aiResCopy = deepCopy(aiRes)
    let fullContent = ''
    let fullReasoning = ''

    let isEnd = false
    const end = () => {
      if (!isEnd) {
        onEnd?.()
        isEnd = true
      }
    }

    const timeoutId = setTimeout(() => {
      abortController?.abort()
    }, timeout)
    const streamTimeoutId = setTimeout(() => {
      abortController?.abort()
    }, streamTimeout)

    try {
      const res = await fetch(getUrl(api.apiUrls.v1.baseUrl, apiUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: abortController?.signal,
        body: data,
      })

      if (!res.ok || !res?.body) throw new Error('网络响应错误')

      const contentType = res.headers.get('content-type')
      const isStream =
        contentType === 'text/event-stream' ||
        contentType === 'application/x-ndjson' ||
        res.headers.get('x-stream') === 'true'

      if (!isStream) {
        const dataProto = await res.text()
        const data = protoRoot.base.ResponseType.decode(
          new Uint8Array(Buffer.from(dataProto, 'base64'))
        )
        console.log('AI领航员 data', data)
        return data
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        lines.forEach((line) => {
          if (!line.startsWith('data:')) return

          clearTimeout(streamTimeoutId)

          const content = line.replace('data:', '').trim()
          if (!content || content === 'EOF') return

          let streamData = protoRoot.ai.AIStreamResponse.decode(
            new Uint8Array(Buffer.from(content, 'base64'))
          )

          switch (streamData.type) {
            case 'error':
              aiRes.code = 10001
              aiRes.error = streamData.content
              break
            case 'Session':
              aiRes.code = 9999
              aiRes.sessionId = streamData.value
              break
            case 'nextLoop':
              // console.log(
              //   'streamData.type',
              //   streamData.type,
              //   deepCopy(streamData)
              // )
              aiRes.code = 9999
              if (Number(streamData.value) >= 2) {
                // aiRes.historyMessages?.push(deepCopy(aiRes))
                aiRes = {
                  ...aiRes,
                  code: 9999,
                  historyMessages: aiRes.historyMessages?.concat(
                    deepCopy(aiRes)
                  ),
                  meta: [],
                  reasoning: { message: '' },
                  display: { message: '', warning: '' },
                  createTime: moment().unix(),
                }
              }
              break
            case 'tokenUsage':
              aiRes.code = 9999
              const usage = protoRoot.ai.AITokenUsage.decode(
                new Uint8Array(Buffer.from(streamData.value, 'base64'))
              )
              aiRes.tokenUsage = usage
              break
            case 'model':
              aiRes.code = 9999
              aiRes.model = streamData.value
              break
            case 'meta':
              aiRes.code = 9999
              const meta = protoRoot.ai.AIResponse.Meta.decode(
                new Uint8Array(Buffer.from(streamData.value, 'base64'))
              )
              const index = aiRes.meta?.findIndex(
                (v) => v.action === meta.action
              )
              if (index !== undefined && index !== -1) {
                aiRes.meta![index] = { ...aiRes.meta![index], ...meta }
              } else {
                aiRes.meta?.push(meta)
              }
              break
            case 'reasoning':
              aiRes.code = 9999
              if (!aiRes.thinkingStartedTime)
                aiRes.thinkingStartedTime = moment().unix()
              fullReasoning += streamData.content
              aiRes.reasoning!.message = fullReasoning
              break
            case 'message':
              aiRes.code = 9999
              if (!aiRes.thinkingStartedTime)
                aiRes.thinkingStartedTime = moment().unix()
              if (!aiRes.thinkingEndedTime)
                aiRes.thinkingEndedTime = moment().unix()
              fullContent += streamData.content
              aiResCopy = parseIncrementalResponse(fullContent, aiResCopy)
              aiRes.status!.isRelevant = aiResCopy.status?.isRelevant
              aiRes.display!.message = aiResCopy.display?.message
              aiRes.display!.warning = aiResCopy.display?.warning
              break
            case 'final':
              const finalData = protoRoot.ai.AIResponse.decode(
                new Uint8Array(Buffer.from(streamData.content, 'base64'))
              )
              Object.assign(aiRes, finalData) // 快速合并最终结果
              aiRes.code = finalData.code
              break
          }

          if (streamData.type !== 'final') {
            onStream(streamData.type, aiRes)
          }
        })
      }

      aiRes.endTime = moment().unix()
      if (aiRes.code !== 10001) {
        aiRes.code = 200
      }
      onStream('final', aiRes)
      end()
      console.log('AI领航员 res', res)
      return aiRes
    } catch (error) {
      console.error(error)
      if (!String(error).includes('signal')) {
        aiRes.code = 10001
        aiRes.error = String(error)
        onStream('error', aiRes)
      }
      abortController?.abort()
      end()
      return aiRes
    } finally {
      clearTimeout(timeoutId)
      clearTimeout(streamTimeoutId)
      end()
    }
  },

  // 2. 外部调用的简版函数
  async AICoDriver(args: {
    params: protoRoot.ai.AICoDriver.IRequest
    abortController: AbortController
    onStream: (type: string, response: protoRoot.ai.IAIResponse) => void
    onEnd?: () => void
  }) {
    const { apiUrls } = store.getState().api
    if (!args.abortController) {
      args.abortController = new AbortController()
    }
    return this._executeAIStreamRequest({
      ...args,
      requestType: protoRoot.ai.AICoDriver.Request,
      apiUrl: apiUrls.v1.AICoDriver,
    })
  },

  async AIRoadbook(args: {
    params: protoRoot.ai.AIRoadbook.IRequest
    abortController: AbortController
    onStream: (type: string, response: protoRoot.ai.IAIResponse) => void
    onEnd?: () => void
  }) {
    const { apiUrls } = store.getState().api
    if (!args.abortController) {
      args.abortController = new AbortController()
    }
    return this._executeAIStreamRequest({
      ...args,
      requestType: protoRoot.ai.AIRoadbook.Request,
      apiUrl: apiUrls.v1.AIRoadbook,
    })
  },
}
