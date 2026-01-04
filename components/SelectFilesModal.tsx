import React, { useEffect, useState } from 'react'

import { useSelector, useDispatch } from 'react-redux'
import store, {
  RootState,
  AppDispatch,
  useAppDispatch,
  methods,
  configSlice,
  userSlice,
  layoutSlice,
} from '../store'
import { useTranslation } from 'react-i18next'
import { prompt, alert, bindEvent } from '@saki-ui/core'
import { Debounce } from '@nyanyajs/utils'
import { cloudShare, sakisso } from '../config'
import {
  SakiAppPortal,
  SakiAsideModal,
  SakiSso,
} from './saki-ui-react/components'
import { eventListener } from '../store/config'
import { Query } from '../plugins/methods'
import { httpApi } from '../plugins/http/api'
import moment from 'moment'

const loginDebounce = new Debounce()

const SelectFilesModal = ({}) => {
  const { t, i18n } = useTranslation()
  const { config, user } = useSelector((state: RootState) => state)
  const layout = useSelector((state: RootState) => state.layout)
  // const appearance = useSelector((state: RootState) => state.appearance)

  const visible = layout.openSelectFilesModal.visible

  const [appToken, setAppToken] = useState<{
    appToken: string
    baseUrl: string
    deadline: number
  }>()
  const dispatch = useDispatch<AppDispatch>()
  useEffect(() => {
    visible && getAppToken()
  }, [visible])

  const getAppToken = async () => {
    const res = await httpApi.v1.GetAppToken({})
    console.log('getAppToken res', res)
    if (res.code === 200) {
      setAppToken({
        appToken: res.data.appToken || '',
        baseUrl: res.data.baseUrl || '',
        deadline: Number(res.data.deadline) || 0,
      })
    }
  }
  // setTimeout(() => {
  // 	store.dispatch(
  // 		configSlice.actions.setStatus({
  // 			type: 'loginModalStatus',
  // 			v: true,
  // 		})
  // 	)
  // }, 1000)

  console.log('SelectFilesModal1111', layout.openSelectFilesModal.visible)

  return (
    <SakiAsideModal
      ref={
        bindEvent({
          close: () => {
            dispatch(
              layoutSlice.actions.setOpenSelectFilesModal({
                visible: false,
              })
            )
          },
          loaded() {
            eventListener.dispatch('loadModal:SelectFilesModal', true)
          },
        }) as any
      }
      visible={visible}
      width="100%"
      height="100%"
      max-width={
        config.deviceType === 'Mobile'
          ? '100%'
          : Math.min(800, config.deviceWH.w) + 'px'
      }
      max-height={
        config.deviceType === 'Mobile'
          ? '80%'
          : Math.min(700, config.deviceWH.h) + 'px'
      }
      vertical={config.deviceType === 'Mobile' ? 'Bottom' : 'Center'}
      horizontal={config.deviceType === 'Mobile' ? 'Center' : 'Center'}
      offset-x={'0px'}
      offset-y={'0px'}
      mask
      mask-closable={config.deviceType === 'Mobile'}
      maskBackgroundColor={'rgba(0,0,0,0.3)'}
      border-radius={config.deviceType === 'Mobile' ? '10px 10px 0 0' : ''}
      border={config.deviceType === 'Mobile' ? 'none' : ''}
      background-color="#fff"
      overflow="hidden"
    >
      <div className="select-files-modal">
        {visible && (
          <saki-app-portal
            ref={
              bindEvent({
                closeApp: () => {
                  dispatch(
                    layoutSlice.actions.setOpenSelectFilesModal({
                      visible: false,
                    })
                  )
                },
                method(data) {
                  // console.log('SelectFilesModal method', data.detail)
                  eventListener.dispatch(
                    'ModalCallback:SelectFilesModal',
                    data.detail.value
                  )
                  dispatch(
                    layoutSlice.actions.setOpenSelectFilesModal({
                      visible: false,
                    })
                  )
                },
              }) as any
            }
            onCloseApp={() => {
              dispatch(
                layoutSlice.actions.setOpenSelectFilesModal({
                  visible: false,
                })
              )
            }}
            entry-url={Query(cloudShare.url + '/recent', {
              pageType: 'selectFiles',
              filterFileType: '.jpg,.jpeg,.png',
              appToken: appToken?.appToken || '',
              baseUrl: appToken?.baseUrl || '',
              deadline: String(appToken?.deadline || 0),
              uploadRootPath: '/trip/files',
              maxLength: String(layout.openSelectFilesModal.maxLength),
              selectedFiles: JSON.stringify(
                layout.openSelectFilesModal.selectedFiles
              ),
            })}
            // header={false}
          ></saki-app-portal>
        )}
      </div>
    </SakiAsideModal>
  )
}

export default SelectFilesModal
