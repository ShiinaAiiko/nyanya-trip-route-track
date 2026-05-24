import Head from 'next/head'
import Link from 'next/link'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import {
  RootState,
  userSlice,
  AppDispatch,
  layoutSlice,
  methods,
  configSlice,
} from '../store'
import { useTranslation } from 'react-i18next'
import { alert, bindEvent, snackbar } from '@saki-ui/core'
import { useSelector, useStore, useDispatch } from 'react-redux'
import axios from 'axios'
import { appListUrl } from '../config'
import MenuDropdownComponent from '../components/MenuDropdown'
import { loadModal } from '../store/layout'
import {
  SakiButton,
  SakiCol,
  SakiRow,
  SakiTemplateMenuDropdown,
} from './saki-ui-react/components'
import NoSSR from './NoSSR'
import { languages } from '../plugins/i18n/i18n'
import {
  AppVersion,
  downloadAppByUrl,
  getVersionList,
  isNewVersion,
} from '../plugins/methods'
import { eventListener, nyanyaJSBridge } from '../store/config'
import { storage } from '../store/storage'
import moment from 'moment'

const HeaderComponent = ({
  // 暂时仅fixed可用
  visible = true,
  fixed = false,
}: {
  visible: boolean
  fixed: boolean
}) => {
  const { t, i18n } = useTranslation('randomPasswordPage')
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  // const store = useStore()

  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const { redirectUri, deviceId, appId, disableHeader } = router.query
  const layout = useSelector((state: RootState) => state.layout)
  const user = useSelector((state: RootState) => state.user)
  const config = useSelector((state: RootState) => state.config)

  const [openUserDropDownMenu, setOpenUserDropDownMenu] = useState(false)

  const appList = useMemo(() => {
    const titleMap = (key: string, ns: string) => {
      return Object.fromEntries(
        languages.map((lang) => [
          lang,
          t(key, {
            ns: ns,
            lng: lang,
          }),
        ])
      )
    }

    const appList: any = [
      {
        title: titleMap('pageTitle', 'tripPage'),
        url: '/',
        logoText: '',
        icon: 'Route',
        iconSize: '14px',
        active: true,
      },
      {
        title: titleMap('pageTitle', 'trackRoutePage'),
        url: '/trackRoute',
        logoText: '',
        icon: 'TripRoute',
      },
      {
        title: titleMap('title', 'journeyMemoriesModal'),
        url: '/journeyMemories',
        logoText: '',
        icon: 'Camera2Fill',
        method: 'Event',
      },
      {
        title: titleMap('pageTitle', 'roadBookPage'),
        url: '/roadbook',
        logoText: '',
        icon: 'Road',
      },
      {
        title: titleMap('pageTitle', 'altitudePage'),
        url: '/altitude',
        logoText: '',
        icon: 'Mountains',
      },
    ].map((v) => {
      let url = (router.query?.lang ? '/' + router.query?.lang : '') + v.url

      if (url[url.length - 1] === '/') {
        url = url.slice(0, url.length - 1)
      }

      return {
        ...v,
        url: url,
        active: url === router.asPath,
        padding: '0 10px 0 0',
      }
    })
    return appList
  }, [router])

  const [openAppVersionListDP, setOpenAppVersionListDP] = useState(false)

  const [appVersionList, setAppVersionList] = useState([] as AppVersion[])
  useEffect(() => {
    const init = async () => {
      setAppVersionList((await getVersionList('arm64-v8a')).slice(0, 10))
    }
    init()
  }, [])

  const [isNewVersionAvailable, setIsNewVersionAvailable] = useState(false)

  useEffect(() => {
    if (openUserDropDownMenu && nyanyaJSBridge?.isInApp()) {
      storage.global.get('skipVersionCode').then((skipVersionCode) => {
        setIsNewVersionAvailable(
          isNewVersion(config.appConfig?.version, skipVersionCode)
        )
      })
    }
  }, [openUserDropDownMenu, config.appConfig?.version])

  return (
    <div
      className={
        'tb-header ' + (fixed ? ' fixed' : '') + (!visible ? ' hide' : '')
      }
    >
      <div className="tb-h-bg"></div>
      <div
        style={{
          display: config.showIndexPageButton ? 'block' : 'none',
        }}
        className="tb-h-left"
      >
        <div className="logo-text">
          {/* {layout.headerLogoText} */}
          {/* {t('appTitle', {
						ns: 'common',
					})} */}

          {/* <MenuDropdownComponent /> */}
          <NoSSR>
            <SakiTemplateMenuDropdown
              ref={
                bindEvent(
                  {
                    openPage: (e) => {
                      // console.log('openPage', e)

                      if (e.detail.value.includes('/journeyMemories')) {
                        if (!user.isLogin) {
                          dispatch(methods.user.loginAlert())
                          return
                        }
                        loadModal('JourneyMemories', () => {
                          dispatch(
                            layoutSlice.actions.setOpenJourneyMemoriesModal(
                              true
                            )
                          )
                        })
                      }
                    },
                  },
                  (e: any) => {
                    // console.log('routerrr' , router)

                    e?.setAppList?.(appList)
                  }
                ) as any
              }
              openNewPage={true}
              // openNewPage={!nyanyaJSBridge?.isInApp()}
              app-text={layout.headerLogoText}
              app-logo={
                router.pathname.includes('/weather')
                  ? '/weather-icons/128x128.png'
                  : ''
              }
              text-color={'#555'}
              icon-color={'#999'}
              button-bg-color={'rgba(255,255,255,0.7)'}
            ></SakiTemplateMenuDropdown>
          </NoSSR>
        </div>
      </div>
      <div className="tb-h-center"></div>
      <div className="tb-h-right">
        {['/altitude', '/[lang]/altitude'].includes(router.pathname) ? (
          <SakiButton
            onTap={async () => {
              window.open(
                (router.query.lang ? '/' + (router.query.lang || '') : '') + '/'
              )
            }}
            // padding="24px"
            // margin="6px 6px"
            padding="6px 8px"
            border="none"
          >
            <span>
              {t('pageTitle', {
                ns: 'tripPage',
              })}
            </span>
          </SakiButton>
        ) : (
          ''
        )}

        {mounted && (
          <>
            {!nyanyaJSBridge?.isInApp() ? (
              <saki-dropdown
                visible={openAppVersionListDP}
                floating-direction="Left"
                z-index="1000"
                ref={bindEvent({
                  close: () => {
                    setOpenAppVersionListDP(false)
                  },
                })}
              >
                <SakiButton
                  style={{
                    display: config.showIndexPageButton ? 'block' : 'none',
                  }}
                  onTap={async () => {
                    setOpenAppVersionListDP(true)
                  }}
                  padding="6px 8px"
                  borderRadius="6px"
                  margin="0 10px 0 0"
                  fontSize="12px"
                  type="Normal"
                  bg-color="rgba(255,255,255,0.7)"
                >
                  <span>
                    {t('downloadApp', {
                      ns: 'common',
                    })}
                  </span>
                </SakiButton>

                <div slot="main">
                  <saki-menu
                    ref={bindEvent({
                      selectvalue: async (e) => {
                        // quickInput(e.detail.value)

                        downloadAppByUrl(e.detail.value)

                        setOpenAppVersionListDP(false)
                      },
                    })}
                  >
                    {appVersionList.map((v, i) => {
                      return (
                        <saki-menu-item
                          key={i}
                          padding="10px 18px"
                          value={v.url}
                        >
                          <span>v{v.version}</span>
                        </saki-menu-item>
                      )
                    })}
                  </saki-menu>
                </div>
              </saki-dropdown>
            ) : (
              ''
            )}

            <meow-apps-dropdown
              style={{
                display: config.showIndexPageButton ? 'block' : 'none',
              }}
              bg-color="rgba(255,255,255,0.7)"
              language={config.lang}
              z-index="1001"
              weather={false}
            ></meow-apps-dropdown>

            <saki-dropdown
              visible={openUserDropDownMenu}
              floating-direction="Left"
              z-index="1001"
              ref={bindEvent({
                close: (e) => {
                  setOpenUserDropDownMenu(false)
                },
              })}
            >
              <div
                onClick={() => {
                  // onSettings?.('Account')
                  setOpenUserDropDownMenu(!openUserDropDownMenu)
                }}
                className="tb-h-r-user"
              >
                <saki-avatar
                  ref={bindEvent({
                    tap: () => {
                      // onSettings?.()
                      // store.dispatch(userSlice.actions.logout({}))
                    },
                  })}
                  className="qv-h-r-u-avatar"
                  width="34px"
                  height="34px"
                  border-radius="50%"
                  default-icon={'UserLine'}
                  nickname={user.userInfo.nickname}
                  src={user.userInfo.avatar}
                  alt=""
                  // mark
                  mark={!user.isLogin}
                  // mark-background-color={user.isLogin ? '#8ec646' : ''}
                  mark-status={user.isLogin ? 'Online' : 'Offline'}
                  lazyload="false"
                />
              </div>
              <div slot="main">
                <saki-menu
                  ref={bindEvent({
                    selectvalue: async (e) => {
                      console.log(e.detail.value)
                      switch (e.detail.value) {
                        case 'Settings':
                          loadModal('Settings', () => {
                            dispatch(
                              layoutSlice.actions.setOpenSettingsModal(true)
                            )
                          })
                          break
                        case 'Login':
                          loadModal('Login', () => {
                            dispatch(
                              layoutSlice.actions.setOpenLoginModal(true)
                            )
                          })

                          break
                        case 'goBlog':
                          window.open(
                            `https://aiiko.club/${user.userInfo.username}`
                          )
                          break
                        case 'Logout':
                          dispatch(methods.user.logout())
                          break
                        case 'TripHistory':
                          // router.push('/tripHistory')

                          loadModal('TripHistory', () => {
                            dispatch(
                              layoutSlice.actions.setOpenTripHistoryModal(true)
                            )
                          })
                          break
                        case 'Vehicle':
                          if (!user.isLogin) {
                            dispatch(methods.user.loginAlert())
                            return
                          }
                          loadModal('AddVehicle', () => {
                            dispatch(
                              layoutSlice.actions.setOpenVehicleModal(true)
                            )
                          })
                          break
                        case 'PrivacyGeofence':
                          if (!user.isLogin) {
                            dispatch(methods.user.loginAlert())
                            return
                          }
                          loadModal('PrivacyGeofence', () => {
                            dispatch(
                              layoutSlice.actions.setOpenPrivacyGeofenceModal(
                                true
                              )
                            )
                          })
                          break
                        case 'CreateCustomTrip':
                          if (!user.isLogin) {
                            dispatch(methods.user.loginAlert())
                            return
                          }
                          loadModal('CreateCustomTrip', () => {
                            dispatch(
                              layoutSlice.actions.setOpenCreateCustomTripModal(
                                true
                              )
                            )
                          })
                          break
                        case 'JourneyMemories':
                          if (!user.isLogin) {
                            dispatch(methods.user.loginAlert())
                            return
                          }
                          loadModal('JourneyMemories', () => {
                            dispatch(
                              layoutSlice.actions.setOpenJourneyMemoriesModal(
                                true
                              )
                            )
                          })
                          break
                        case 'VisitedCities':
                          if (!user.isLogin) {
                            dispatch(methods.user.loginAlert())
                            return
                          }
                          loadModal('VisitedCities', () => {
                            dispatch(
                              layoutSlice.actions.setOpenVisitedCitiesModal({
                                visible: true,
                              })
                            )
                          })
                          break
                        case 'Account':
                          dispatch(
                            layoutSlice.actions.setSettingType('Account')
                          )
                          dispatch(
                            layoutSlice.actions.setOpenSettingsModal(true)
                          )
                          break
                        case 'Route':
                          location.replace(
                            (router.query.lang
                              ? '/' + (router.query.lang || '')
                              : '') + '/trackRoute'
                          )
                          break
                        case 'IndexPage':
                          location.replace(
                            (router.query.lang
                              ? '/' + (router.query.lang || '')
                              : '') + '/'
                          )
                          break
                        case 'AltitudePage':
                          window.open(
                            (router.query.lang
                              ? '/' + (router.query.lang || '')
                              : '') + '/altitude'
                          )
                          break
                        case 'VConsole':
                          dispatch(
                            configSlice.actions.setVConsole(!config.vConsole)
                          )
                          nyanyaJSBridge?.openAppSettings('location')
                          break
                        // case 'CheckNewVersion':
                        //   nyanyaJSBridge?.checkNewVersion({
                        //     showCheckingNotification: true,
                        //   })
                        //   break
                        // case 'DownloadApp':
                        //   setOpenAppVersionListDP(true)
                        //   break

                        default:
                          break
                      }
                      setOpenUserDropDownMenu(false)
                    },
                  })}
                >
                  {!user.isLogin ? (
                    <saki-menu-item padding="10px 18px" value={'Login'}>
                      <div className="tb-h-r-user-item">
                        <saki-icon color="#666" type="User"></saki-icon>
                        <span>
                          {t('login', {
                            ns: 'common',
                          })}
                        </span>
                      </div>
                    </saki-menu-item>
                  ) : (
                    ''
                  )}
                  {user.isLogin ? (
                    <>
                      <saki-menu-item padding="10px 18px" value={'Account'}>
                        <div className="tb-h-r-user-item">
                          <saki-avatar
                            ref={bindEvent({
                              tap: () => {
                                // onSettings?.()
                                // store.dispatch(userSlice.actions.logout({}))
                              },
                            })}
                            className="qv-h-r-u-avatar"
                            width="20px"
                            height="20px"
                            margin="0 10px 0 0"
                            border-radius="50%"
                            default-icon={'UserLine'}
                            nickname={user.userInfo.nickname}
                            src={user.userInfo.avatar}
                            alt=""
                          />
                          <span className="text-elipsis">
                            {user.userInfo.nickname}
                          </span>
                        </div>
                      </saki-menu-item>
                      <saki-menu-item padding="10px 18px" value={'goBlog'}>
                        <div className="tb-h-r-user-item">
                          <saki-icon color="#666" type="NekoFill"></saki-icon>
                          <span>
                            {t('myBlog', {
                              ns: 'sakiuiBlog',
                            })}
                          </span>
                        </div>
                      </saki-menu-item>
                      <saki-menu-item padding="10px 18px" value={'TripHistory'}>
                        <div className="tb-h-r-user-item">
                          <saki-icon color="#666" type="TripRoute"></saki-icon>
                          <span className="text-elipsis">
                            {t('tripHistory', {
                              ns: 'settings',
                            })}
                          </span>
                        </div>
                      </saki-menu-item>
                      {/* <saki-menu-item padding='10px 18px' value={'MergeTrip'}>
												<div className='tb-h-r-user-item'>
													<saki-icon color='#666' type='TripRoute'></saki-icon>
													<span className='text-elipsis'>
														{t('mergeTrip', {
															ns: 'settings',
														})}
													</span>
												</div>
											</saki-menu-item> */}
                    </>
                  ) : (
                    ''
                  )}

                  <saki-menu-item padding="10px 18px" value={'Vehicle'}>
                    <div className="tb-h-r-user-item">
                      <saki-icon color="#666" type="Drive"></saki-icon>
                      <span>
                        {t('pageTitle', {
                          ns: 'vehicleModal',
                        })}
                      </span>
                    </div>
                  </saki-menu-item>
                  {/* {router.pathname.indexOf('trackRoute') < 0 ? (
                    <saki-menu-item padding="10px 18px" value={'Route'}>
                      <div className="tb-h-r-user-item">
                        <saki-icon color="#666" type="Route"></saki-icon>
                        <span>
                          {t('pageTitle', {
                            ns: 'trackRoutePage',
                          })}
                        </span>
                      </div>
                    </saki-menu-item>
                  ) : (
                    <saki-menu-item padding="10px 18px" value={'IndexPage'}>
                      <div className="tb-h-r-user-item">
                        <saki-icon color="#666" type="TripRoute"></saki-icon>
                        <span className="text-elipsis">
                          {t('pageTitle', {
                            ns: 'tripPage',
                          })}
                        </span>
                      </div>
                    </saki-menu-item>
                  )} */}
                  {user.isLogin ? (
                    <>
                      <saki-menu-item
                        padding="10px 18px"
                        value={'PrivacyGeofence'}
                      >
                        <div className="tb-h-r-user-item">
                          <saki-icon color="#666" type="Geofencing"></saki-icon>
                          <span>
                            {t('title', {
                              ns: 'privacyGeofenceModal',
                            })}
                          </span>
                        </div>
                      </saki-menu-item>
                      <saki-menu-item
                        padding="10px 18px"
                        value={'CreateCustomTrip'}
                      >
                        <div className="tb-h-r-user-item">
                          <saki-icon color="#666" type="Add"></saki-icon>
                          <span>
                            {t('title', {
                              ns: 'createCustomTripModal',
                            })}
                          </span>
                        </div>
                      </saki-menu-item>
                    </>
                  ) : (
                    ''
                  )}
                  {user.isLogin ? (
                    <saki-menu-item padding="10px 18px" value={'VisitedCities'}>
                      <div className="tb-h-r-user-item">
                        <saki-icon
                          color="#666"
                          type="MapFootprints"
                        ></saki-icon>
                        <span>
                          {t('title', {
                            ns: 'visitedCitiesModal',
                          })}
                        </span>
                      </div>
                    </saki-menu-item>
                  ) : (
                    ''
                  )}
                  {/* {!nyanyaJSBridge?.isInApp() ? (
                    <saki-menu-item padding="10px 18px" value={'DownloadApp'}>
                      <div className="tb-h-r-user-item">
                        <saki-icon color="#666" type="Download"></saki-icon>
                        <span>
                          {t('downloadApp', {
                            ns: 'common',
                          })}
                        </span>
                      </div>
                    </saki-menu-item>
                  ) : (
                    ''
                  )} */}
                  {/* {user.isLogin ? (
                    <saki-menu-item
                      padding="10px 18px"
                      value={'JourneyMemories'}
                      disabled={router.pathname.includes(
                        '/journeyMemories/detail'
                      )}
                    >
                      <div className="tb-h-r-user-item">
                        <saki-icon color="#666" type="Camera2Fill"></saki-icon>
                        <span>
                          {t('title', {
                            ns: 'journeyMemoriesModal',
                          })}
                        </span>
                      </div>
                    </saki-menu-item>
                  ) : (
                    ''
                  )} */}
                  {/* <saki-menu-item padding="10px 18px" value={'AltitudePage'}>
                    <div className="tb-h-r-user-item">
                      <saki-icon color="#666" type="Mountains"></saki-icon>
                      <span>
                        {t('pageTitle', {
                          ns: 'altitudePage',
                        })}
                      </span>
                    </div>
                  </saki-menu-item> */}
                  <saki-menu-item padding="10px 18px" value={'Settings'}>
                    <div className="tb-h-r-user-item">
                      <saki-icon color="#666" type="Settings"></saki-icon>
                      <span>
                        {t('title', {
                          ns: 'settings',
                        })}
                      </span>
                      {isNewVersionAvailable ? (
                        <span
                          style={{
                            backgroundColor: 'var(--saki-default-color)',
                            color: '#fff',
                            borderRadius: '8px',
                            margin: '0 0 0 4px',
                            padding: '4px 4px',
                            fontSize: '12px',
                          }}
                        >
                          {t('newVersionAvailable', {
                            ns: 'prompt',
                          })}
                        </span>
                      ) : (
                        ''
                      )}
                    </div>
                  </saki-menu-item>
                  {/* {nyanyaJSBridge?.isInApp() ? (
                    <saki-menu-item
                      padding="10px 18px"
                      value={'CheckNewVersion'}
                    >
                      <div className="tb-h-r-user-item">
                        <saki-icon color="#666" type="Question"></saki-icon>
                        <span>
                          {t('checkNewVersion', {
                            ns: 'prompt',
                          })}
                        </span>
                      </div>
                    </saki-menu-item>
                  ) : (
                    ''
                  )} */}
                  <saki-menu-item padding="10px 18px" value={'VConsole'}>
                    <div className="tb-h-r-user-item">
                      <saki-icon color="#666" type="Code"></saki-icon>
                      <span>
                        {config.vConsole
                          ? t('closeVConsole', {
                              ns: 'settings',
                            })
                          : t('openVConsole', {
                              ns: 'settings',
                            })}
                      </span>
                    </div>
                  </saki-menu-item>
                  {user.isLogin ? (
                    <saki-menu-item padding="10px 18px" value={'Logout'}>
                      <div className="tb-h-r-user-item">
                        <saki-icon color="#666" type="Logout"></saki-icon>
                        <span>
                          {t('logout', {
                            ns: 'common',
                          })}
                        </span>
                      </div>
                    </saki-menu-item>
                  ) : (
                    ''
                  )}
                </saki-menu>
              </div>
            </saki-dropdown>
          </>
        )}
      </div>
    </div>
  )
}

export default HeaderComponent
