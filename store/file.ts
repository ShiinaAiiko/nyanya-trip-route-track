import {
  createSlice,
  createAsyncThunk,
  combineReducers,
  configureStore,
} from '@reduxjs/toolkit'
import { storage } from './storage'
import { deepCopy, SAaSS, AsyncQueue } from '@nyanyajs/utils'
import { httpApi } from '../plugins/http/api'
import { progressBar } from '@saki-ui/core'
// import { AsyncQueue } from './asyncQueue'
import { protoRoot } from '../protos'
import i18n from '../plugins/i18n/i18n'


export const saass = new SAaSS({})

export const selectFiles = () => {
  return new Promise<FileList | null>((resolve, reject) => {
    try {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.multiple = true

      input.oninput = () => {
        resolve(input.files)

      }
      input.onblur = () => {
        console.log('close')
      }
      input.onfocus = () => {
        console.log('close')
      }
      input.click()
    } catch (error) {
      console.error(error)
      reject(error)
    }
  })

}

export const getSAaSSImageUrl = (url: string, type?: "" | "big" | "mid" | "small" | "thumbnail") => {

  if (url.includes("https://saass.aiiko.club")) {
    if (type === "big") {
      return url + "?x-saass-process=image/resize,1200,70"
    }
    if (type === "mid") {
      return url + "?x-saass-process=image/resize,700,70"
    }
    if (type === "small") {
      return url + "?x-saass-process=image/resize,120,70"
    }
    if (type === "thumbnail") {
      return url + "?x-saass-process=image/resize,80,70"
    }

  }

  return url

}


export interface MediaItem extends protoRoot.journeyMemory.IJourneyMemoryMediaItem {
  file?: File
  id: string
}


export const uploadFiles = async (media: MediaItem[]) => {
  // console.log('uploadFile', media)
  // const mediaList = media.filter((v) => v.file)

  console.log('uploadFile', media)

  let total = media.filter((v) => v.file).length


  if (total) {

    const t = i18n.t

    let count = 0
    const aq = new AsyncQueue({
      maxQueueConcurrency: 3,
    })
    const pb = progressBar()

    pb.open()
    pb.setProgress({
      progress: 0.1,
      tipText: t('filesUploaded', {
        ns: 'prompt',
        count: 0,
      }),
    })


    for (let i = 0; i < media.length; i++) {
      aq.increase(async () => {
        const file = media[i]
        console.log('uploadFile res', i, file)
        if (!file.file) return
        const res = await uploadFile(file.file)
        console.log('uploadFile res', i, file, res)
        if (res) {
          file.url = res
          count++
          pb.setProgress({
            progress: 0.1 + (0.9 / total) * count,
            tipText: t('filesUploaded', {
              ns: 'prompt',
              count: count,
            }),
          })
        }
        return res
      })
    }

    console.log('uploadFile11', media)
    await aq.wait.waiting()
    console.log('uploadFile22', media)

    pb.setProgress({
      progress: 1,
      tipText: t('uploadCompleted', {
        ns: 'prompt',
      }),
      onAnimationEnd() {
        pb.close()
      },
    })
  }

  return media
}

export const uploadFile = (file: File) => {
  return new Promise<string>((resolve, reject) => {
    let reader = new FileReader()
    reader.onload = async (e) => {
      if (!e.target?.result) return
      const hash = saass.getHash(e.target.result)
      console.log('hash', hash)
      console.log('file', file)

      const res = await httpApi.v1.GetUploadToken({
        fileInfo: {
          name: file.name,
          size: file.size,
          type: file.type,
          suffix: '.' + file.name.substring(file.name.lastIndexOf('.') + 1),
          lastModified: file.lastModified,
          hash: hash,
        },
      })
      console.log('getUploadToken', res)
      if (res.code === 200) {
        saass.setBaseUrl(res.data.urls?.domainUrl || '')
        //         apiUrl: "http://192.168.0.106:16100/api/v1/chunkupload/upload"
        // chunkSize: 262144
        // token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmaWxlSW5mbyI6eyJBcHBJZCI6IjFlODE2OTE0LTY0ZDItNDc3YS04ZTM1LTQyN2Q5NDdlY2Y1MCIsIk5hbWUiOiJQbmdJdGVtXzEyMTExMDgucG5nIiwiRW5jcnlwdGlvbk5hbWUiOiI4NmZlYmJhNTdiY2NkOGExODNhMTkyZWM2OTRmNzUzNSIsIlBhdGgiOiIvRjA5MzVFNENENTkyMEFBNkM3Qzk5NkE1RUU1M0E3MEYvZmlsZXMvIiwiVGVtcEZvbGRlclBhdGgiOiIuL3N0YXRpYy9jaHVjay8wMzJhYzZhMjQ2ZWI3ZTUxZTM3Mzc3YzNhYmE4YjM2NzE1NGZiMTUxMDFhOTI3NzY2NDA0MDRlMDlhZjkwMGJkLyIsIlRlbXBDaHVja0ZvbGRlclBhdGgiOiIuL3N0YXRpYy9jaHVjay8wMzJhYzZhMjQ2ZWI3ZTUxZTM3Mzc3YzNhYmE4YjM2NzE1NGZiMTUxMDFhOTI3NzY2NDA0MDRlMDlhZjkwMGJkLy9jaHVjay8iLCJDaHVua1NpemUiOjEzMTA3MiwiQ3JlYXRlVGltZSI6MTY1OTg5NDkwNCwiRXhwaXJhdGlvblRpbWUiOi0xLCJWaXNpdENvdW50IjotMSwiRmlsZUluZm8iOnsiTmFtZSI6IlBuZ0l0ZW1fMTIxMTEwOCIsIlNpemUiOjExMjAyLCJUeXBlIjoiaW1hZ2UvcG5nIiwiU3VmZml4IjoiLnBuZyIsIkxhc3RNb2RpZmllZCI6MTY1OTgxMzE3NjY0MSwiSGFzaCI6IjAzMmFjNmEyNDZlYjdlNTFlMzczNzdjM2FiYThiMzY3MTU0ZmIxNTEwMWE5Mjc3NjY0MDQwNGUwOWFmOTAwYmQifSwiRmlsZUNvbmZsaWN0IjoiUmVwbGFjZSJ9LCJleHAiOjE2NTk5ODEzMDQsImlzcyI6InNhYXNzIn0.nfwmBNpJAMCK31U_vG4dL3mRvkhKb7EnaAqji29X9Hw"
        // uploadedOffset: []
        // urls: Urls
        // domainUrl: "http://192.168.0.106:16100"
        // encryptionUrl: "/s/86febba57bccd8a183a192ec694f7535"
        // url: "/s/F0935E4CD5920AA6C7
        const data: any = res.data
        if (data.token) {
          saass.uploadFile({
            file: file,
            url: data.apiUrl,
            token: data.token,
            chunkSize: data.chunkSize,
            uploadedOffset: data.uploadedOffset || [],
            uploadedTotalSize: data.uploadedTotalSize || 0,
            async onprogress(options) {
              // console.log('options', options)
              // await store.state.storage.staticFileWS.getAndSet(
              // 	upload.data.urls?.encryptionUrl || '',
              // 	async (v) => {
              // 		return {
              // 			...v,
              // 			fileDataUrl: result || '',
              // 			uploadedSize: options.uploadedSize,
              // 			totalSize: options.totalSize,
              // 		}
              // 	}
              // )
            },
            async onsuccess(options) {
              // console.log('options', options)
              resolve(data.urls?.domainUrl + data.urls?.shortUrl)
              // await store.state.storage.staticFileWS?.getAndSet(
              // 	upload.data.urls?.encryptionUrl || '',
              // 	async (v) => {
              // 		return {
              // 			...v,
              // 			fileDataUrl: result || '',
              // 			encryptionUrl: options.encryptionUrl,
              // 			url: options.url,
              // 			uploadedSize: file.size,
              // 			totalSize: file.size,
              // 		}
              // 	}
              // )
              // store.dispatch('chat/sendMessageWidthSecretChatApi', {
              // 	messageId,
              // 	dialogId,
              // })
            },
            onerror(err) {
              resolve('')
              console.log('error', err)

              // store.dispatch('chat/failedToSendMessage', {
              // 	messageId,
              // 	dialogId,
              // })
            },
          })
        } else {
          resolve(data.urls?.domainUrl + res.data.urls?.shortUrl || '')
        }
      } else {
        resolve('')
      }
    }
    reader.readAsArrayBuffer(file)
  })
}