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
import { prompt, alert, bindEvent, snackbar } from '@saki-ui/core'
import { Debounce, deepCopy } from '@nyanyajs/utils'
import { sakisso } from '../config'
import { eventListener, nyanyaJSBridge } from '../store/config'
import { Query } from '../plugins/methods'
import Router from 'next/router'

const loginDebounce = new Debounce()
const LoginComponent = () => {
  const { t, i18n } = useTranslation()
  const config = useSelector((state: RootState) => state.config)
  const layout = useSelector((state: RootState) => state.layout)
  // const appearance = useSelector((state: RootState) => state.appearance)

  const [noteContextMenuEl, setNoteContextMenuEl] = useState<any>()
  const [openDropDownMenu, setOpenDropDownMenu] = useState(false)
  const [openAddDropDownMenu, setOpenAddDropDownMenu] = useState(false)
  const [openSettingDropDownMenu, setOpenSettingDropDownMenu] = useState(false)
  const [openUserDropDownMenu, setOpenUserDropDownMenu] = useState(false)

  const dispatch = useDispatch<AppDispatch>()
  useEffect(() => {}, [])

  // setTimeout(() => {
  // 	store.dispatch(
  // 		configSlice.actions.setStatus({
  // 			type: 'loginModalStatus',
  // 			v: true,
  // 		})
  // 	)
  // }, 1000)
  return (
    <saki-modal
      ref={bindEvent({
        close() {
          dispatch(layoutSlice.actions.setOpenLoginModal(false))
        },
        loaded() {
          eventListener.dispatch('loadModal:Login', true)
        },
      })}
      max-width={config.deviceType === 'Mobile' ? '100%' : '500px'}
      min-width={config.deviceType === 'Mobile' ? '100%' : '400px'}
      max-height={config.deviceType === 'Mobile' ? '100%' : '500px'}
      min-height={config.deviceType === 'Mobile' ? '100%' : '400px'}
      width="100%"
      height="100%"
      border-radius={config.deviceType === 'Mobile' ? '0px' : ''}
      border={config.deviceType === 'Mobile' ? 'none' : ''}
      mask
      background-color="#fff"
      visible={layout.openLoginModal}
    >
      <div className="login-component">
        <saki-modal-header
          ref={bindEvent({
            close: (e) => {
              dispatch(layoutSlice.actions.setOpenLoginModal(false))
            },
          })}
          right-width={'56px'}
          closeIcon
          title={t('login', {
            ns: 'common',
          })}
        />
        {layout.openLoginModal ? (
          <saki-sso
            ref={bindEvent({
              login: (e) => {
                // console.log('ssssssssssss', e)
                loginDebounce.increase(() => {
                  store.dispatch(
                    userSlice.actions.login({
                      token: e.detail.token,
                      deviceId: e.detail.deviceId,
                      userInfo: e.detail.userInfo,
                    })
                  )
                  dispatch(userSlice.actions.setIsLogin(true))

                  dispatch(layoutSlice.actions.setOpenLoginModal(false))
                }, 100)
              },
              thirdPartyLogin: async (e: any) => {
                console.log('thirdPartyLogin e', e)
                // if (e.detail.type === 'Google') {
                const res = await nyanyaJSBridge?.thirdPartyLogin(
                  e.detail?.type.toLowerCase() as any
                )

                console.log('thirdPartyLogin res', res)
                if (res?.success && res?.data?.user?.id) {
                  e?.target?.setThirdPartyLoginData({
                    type: res.data.type,
                    user: {
                      openId: res.data.user.id,
                      name: res.data.user.name,
                      avatar: res.data.user.avatar,
                      email: res.data.user.email,
                    },
                  })
                } else {
                  // snackbar({
                  //   message: res?.error || '谷歌登录失败',
                  //   autoHideDuration: 2000,
                  //   vertical: 'center',
                  //   horizontal: 'center',
                  // }).open()
                  const res = await nyanyaJSBridge?.openInBrowser(e.detail.url)

                  console.log('thirdPartyLogin res', res)
                }
                // return
                // }
                // if (e.detail.type === 'Github' || e.detail.type === 'QQ') {
                //   return
                // }
              },
            })}
            style={{
              flex: 1,
            }}
            class="disabled-dark"
            redirect-uri={
              nyanyaJSBridge?.isInApp()
                ? `tripapp${config.appConfig?.packageName === 'club.aiiko.trip.dev' ? 'dev' : ''}://oauth`
                : Query(location.origin + location.pathname, {
                    ...Router.query,
                    openLoginModal: '',
                  })
            }
            app-title={t('appTitle', {
              ns: 'common',
            })}
            platform={nyanyaJSBridge?.isInApp() ? 'AndroidApp' : 'Web'}
            language={config.language}
            // appearance={appearance.mode}
            app-id={sakisso.appId}
            url={sakisso.clientUrl + '/login'}
          />
        ) : (
          ''
        )}
      </div>
    </saki-modal>
  )
}

export default LoginComponent
