import { alert } from "@saki-ui/core"
import { t } from "i18next"
import { version } from "../config"


const newVersionAlert = async () => {
  return new Promise((res) => {
    alert({
      title: t('newVersion', {
        ns: 'prompt',
      }),
      content: t('newVersionContent', {
        ns: 'prompt',
        version
      }),
      cancelText: t('cancel', {
        ns: 'prompt',
      }),
      confirmText: t('refresh', {
        ns: 'prompt',
      }),
      onCancel() { },
      onConfirm() {
        res(undefined)
      },
    }).open()
  })
}

export const loadPwaNewVersion = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          newWorker?.addEventListener('statechange', async () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              // 新版本已安装，提示刷新
              if (confirm(t('newVersionContent', {
                ns: 'prompt',
                version
              }))) {


                // await newVersionAlert()

                navigator.serviceWorker.controller?.postMessage({
                  action: "skipWaiting",
                });
                window.location.href = window.location.href;
              }
            }
          })
        })
      })
    })
  }

}