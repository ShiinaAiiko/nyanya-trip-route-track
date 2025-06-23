import React, {
  createContext,
  Dispatch,
  use,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
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
  IContext,
  reducer,
  vehicleSlice,
} from '../store'

import { sakisso, version } from '../config'

import moment from 'moment'

import { alert, snackbar, bindEvent } from '@saki-ui/core'
// console.log(sakiui.bindEvent)
import { storage } from '../store/storage'
import { useTranslation } from 'react-i18next'
import { httpApi } from '../plugins/http/api'
import { protoRoot } from '../protos'
import { formatAvgPace, formatDistance, formatTime } from '../plugins/methods'
import TripItemComponent from './TripItem'

import { deepCopy, validation } from '@nyanyajs/utils'
import StatisticsComponent from './Statistics'
import FilterComponent from './Filter'
import { eventListener } from '../store/config'
import {
  FilterTrips,
  filterTrips,
  filterTripsForTrackRoutePage,
  getTrips,
} from '../store/trip'
import { loadModal } from '../store/layout'
// import { isCorrectedData } from '../store/trip'

const initValue = {
  pageType: '' as 'AddVehicle' | 'EditVehicle' | 'AddTripHere' | '',
  editVehicle: {} as protoRoot.trip.IVehicleItem,
  addTheVehicleIdOfTripHere: '',
}

const DataContext = createContext<IContext<typeof initValue>>({
  state: initValue,
  setState: () => {},
})

// type UserContextType = {
// 	state: Partial<typeof initValue>
// 	setState: React.Dispatch<React.SetStateAction<Partial<typeof initValue>>>
// }

// const DataContext = createContext<UserContextType>({
// 	state: initValue,
// 	setState: () => {},
// })

export const getPositionShareText = (positionShare: number) => {
  switch (positionShare) {
    case -1:
      return 'notShared'
    case 1:
      return 'onlyMyself'
    case 5:
      return 'all'

    default:
      return ''
  }
}

const VehicleComponent = () => {
  const { t, i18n } = useTranslation('vehicleModal')
  const layout = useSelector((state: RootState) => state.layout)
  const config = useSelector((state: RootState) => state.config)
  const trip = useSelector((state: RootState) => state.trip)

  const dispatch = useDispatch<AppDispatch>()

  // const [menuType, setMenuType] = useState('Appearance')
  // const [menuType, setMenuType] = useState(type || 'Account')

  // const [state, setState] = useState<Partial<typeof initValue>>(initValue)
  const [state, setState] = useReducer(reducer<typeof initValue>, initValue)

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    console.log('reloadtest', mounted, layout.openVehicleModal)
    // mounted && layout.openVehicleModal && location.reload()
    setMounted(true)
  }, [])

  return (
    <DataContext.Provider value={{ state, setState }}>
      <saki-modal
        ref={bindEvent({
          close() {
            dispatch(layoutSlice.actions.setOpenVehicleModal(false))
          },
          loaded() {
            eventListener.dispatch('loadModal:AddVehicle', true)
          },
        })}
        width="100%"
        height="100%"
        max-width={config.deviceType === 'Mobile' ? '100%' : '780px'}
        max-height={config.deviceType === 'Mobile' ? '100%' : '780px'}
        mask
        border-radius={config.deviceType === 'Mobile' ? '0px' : ''}
        border={config.deviceType === 'Mobile' ? 'none' : ''}
        mask-closable="false"
        background-color="#fff"
        visible={layout.openVehicleModal}
      >
        <VehiclePage></VehiclePage>
      </saki-modal>
    </DataContext.Provider>
  )
}

const VehiclePage = () => {
  const { t, i18n } = useTranslation('vehicleModal')
  const layout = useSelector((state: RootState) => state.layout)
  const config = useSelector((state: RootState) => state.config)
  const user = useSelector((state: RootState) => state.user)
  const vehicle = useSelector((state: RootState) => state.vehicle)

  const dispatch = useDispatch<AppDispatch>()

  const { state, setState } = useContext(DataContext)

  const [activeVehicleIdDropdown, setActiveVehicleIdDropdown] = useState('')

  useEffect(() => {
    // setTimeout(() => {
    // 	dispatch(layoutSlice.actions.setOpenVehicleModal(true))
    // 	setTimeout(() => {
    // 		// setPageType('AddVehicle')
    // 	}, 500)
    // }, 500)
  }, [])

  const [trips, setTrips] = useState<protoRoot.trip.ITrip[]>([])

  useEffect(() => {
    if (layout.openVehicleModal && user.isLogin) {
      dispatch(methods.vehicle.Init())

      dispatch(
        methods.vehicle.GetVehicles({
          type: 'All',
          pageNum: 1,
        })
      ).unwrap()

      dispatch(
        methods.trip.GetTripHistoryData({
          loadCloudData: true,
        })
      )
        .unwrap()
        .then(() => {
          const trips = FilterTrips({
            selectedTripTypes: [],
            distanceRange: {
              min: 0,
              max: 500,
            },
            // shortestDistance: 0,
            // longestDistance: 500,
            showCustomTrip: false,
            selectedVehicleIds: [],
            selectedJmIds: [],
            startDate: '',
            endDate: '',
            selectedTripIds: [],
          })
          setTrips(trips)
        })
    }
  }, [layout.openVehicleModal, user])

  const deleteVehicle = (id: string) => {
    alert({
      title: t('deleteThisVehicle'),
      content: t('deleteThisVehicleContent'),
      confirmText: t('delete', {
        ns: 'prompt',
      }),
      cancelText: t('cancel', {
        ns: 'prompt',
      }),
      flexButton: true,
      async onConfirm() {
        const res = await httpApi.v1.DeleteVehicle({
          id: id,
        })
        console.log('DeleteTrip', res)
        if (res.code === 200) {
          dispatch(
            methods.vehicle.GetVehicles({
              type: 'All',
              pageNum: 1,
            })
          )
          snackbar({
            message: t('deletedSuccessfully', {
              ns: 'prompt',
            }),
            autoHideDuration: 2000,
            vertical: 'top',
            horizontal: 'center',
            backgroundColor: 'var(--saki-default-color)',
            color: '#fff',
          }).open()
        }
      },
    }).open()
  }

  // const trips = filterTrips({
  // 	list: [],
  // 	startDate: '',
  // 	endDate: '',
  // 	types: [],
  // })

  // console.log('trips', trips)

  return (
    <div
      style={
        {
          '--window-h': config.deviceWH.h + 'px',
        } as any
      }
      className={'vehicle-component ' + config.deviceType}
    >
      <div className="vc-header">
        <saki-modal-header
          // border
          back-icon={state.pageType !== ''}
          close-icon={state.pageType == ''}
          right-width={'56px'}
          ref={bindEvent({
            close() {
              dispatch(layoutSlice.actions.setOpenVehicleModal(false))
            },
            back() {
              setState({
                pageType: '',
              })
            },
          })}
          title={
            state.pageType === 'AddVehicle'
              ? t('addVehicle')
              : state.pageType === 'EditVehicle'
              ? t('editVehicle')
              : state.pageType === 'AddTripHere'
              ? t('addTripHere')
              : t('pageTitle')
          }
        >
          <div
            className="vc-h-right"
            style={{
              margin: '0 10px 0 0',
            }}
            slot="right"
          >
            {state.pageType === '' ? (
              <saki-button
                ref={bindEvent({
                  tap: () => {
                    setState({
                      pageType: 'AddVehicle',
                    })
                  },
                })}
                padding="6px 10px"
                border="none"
                type="Normal"
              >
                <span
                  style={{
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t('addVehicle')}
                </span>
              </saki-button>
            ) : (
              ''
            )}
          </div>
        </saki-modal-header>
      </div>
      <div className="vc-page">
        <saki-scroll-view mode="Auto">
          <div className="vc-list">
            <saki-card title={''} hide-subtitle>
              {vehicle.vehicles.map((v, i) => {
                return (
                  <saki-card-item
                    key={i}
                    type="Flex"
                    right-width="50px"
                    title=""
                    border="1px dashed var(--saki-default-color)"
                    border-hover="1px dashed var(--saki-default-color)"
                    border-active="1px dashed var(--saki-default-color)"
                    border-radius="10px"
                    background-color="#fff"
                    background-hover-color="#f3f3f3"
                    background-active-color="#eee"
                    margin="0 0 10px"
                    center-content="false"
                    // background-hover-color="rgb(250,250,250)"
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      slot="left"
                    >
                      <div className="vc-left">
                        <VehicleLogo
                          icon={v.type || ''}
                          iconSize="28px"
                          style={{
                            width: '50px',
                            height: '50px',
                            padding: '4px',
                            margin: '0 10px 0 0',
                          }}
                        ></VehicleLogo>
                      </div>
                      <div className="vc-name">
                        <div className="name">
                          {/* <div className='device-icon'>
                                    </div> */}
                          <div>{v.name}</div>
                          <span className="positionShare">
                            {t(
                              getPositionShareText(
                                Number(v?.positionShare) || -1
                              )
                            )}
                          </span>
                          {v.id === vehicle.defaultVehicleId ? (
                            <span className="default">
                              {t('defaultVehicle', {
                                ns: 'vehicleModal',
                              })}
                            </span>
                          ) : (
                            ''
                          )}
                        </div>
                        <div className="desc">
                          <span className="type">
                            {t(v?.type?.toLowerCase() || '')}
                          </span>
                          {v.licensePlate || v.carModel ? <span>,</span> : ''}
                          {v.licensePlate ? (
                            <>
                              <span className="licensePlate">
                                {v.licensePlate}
                              </span>
                              <span>{', '}</span>
                            </>
                          ) : (
                            ''
                          )}
                          {v.carModel ? (
                            <span className="carModel">{v.carModel}</span>
                          ) : (
                            ''
                          )}
                        </div>
                        <div className="info">
                          {v?.position?.timestamp ? (
                            <div
                              style={{
                                margin: '1px 0 0',
                              }}
                              ref={
                                bindEvent({
                                  click: () => {
                                    loadModal('FindLocation', () => {
                                      dispatch(
                                        layoutSlice.actions.setOpenFindLocationModal(
                                          true
                                        )
                                      )
                                      eventListener.dispatch('find-location', {
                                        vehicleId: v.id,
                                        userId: v.authorId,
                                      })
                                    })
                                  },
                                }) as any
                              }
                            >
                              <saki-icon
                                color="#666"
                                type="Position"
                              ></saki-icon>
                            </div>
                          ) : (
                            ''
                          )}
                          <span
                            style={{
                              fontSize: '12px',
                            }}
                          >
                            {v.position?.timestamp
                              ? t('traveledTimes', {
                                  times: trips?.filter(
                                    (sv) => sv.vehicle?.id === v.id
                                  ).length,
                                }) +
                                ', ' +
                                t('lastTravelTime') +
                                ' ' +
                                moment(
                                  Number(v.position?.timestamp || 0)
                                ).calendar({
                                  sameDay: '[Today] HH:mm',
                                  nextDay: '[Tomorrow] HH:mm',
                                  nextWeek: 'dddd',
                                  lastDay: '[Yesterday] HH:mm',
                                  lastWeek: 'YYYY-MM-DD HH:mm',
                                  sameElse: 'YYYY-MM-DD HH:mm',
                                })
                              : t('neverTraveled')}
                          </span>
                          {/* <span>
														{v.position?.latitude !== undefined
															? ', ' +
															  v.position?.latitude +
															  '-' +
															  v.position?.longitude
															: ''}
													</span> */}
                        </div>
                      </div>
                    </div>
                    {/* <div slot='center'>
										</div> */}
                    <div slot="right">
                      <saki-dropdown
                        visible={activeVehicleIdDropdown === v.id}
                        floating-direction="Left"
                        ref={bindEvent({
                          close: () => {
                            setActiveVehicleIdDropdown('')
                          },
                        })}
                      >
                        <saki-button
                          ref={bindEvent({
                            tap: () => {
                              setActiveVehicleIdDropdown(v.id || '')
                            },
                          })}
                          bg-color="transparent"
                          type="CircleIconGrayHover"
                        >
                          <saki-icon color="#555" type="More"></saki-icon>
                        </saki-button>
                        <div slot="main">
                          <saki-menu
                            ref={bindEvent({
                              selectvalue: async (e) => {
                                console.log(e.detail.value)
                                switch (e.detail.value) {
                                  case 'Edit':
                                    setState({
                                      pageType: 'EditVehicle',
                                      editVehicle: v,
                                    })
                                    break
                                  case 'AddTripHere':
                                    setState({
                                      pageType: 'AddTripHere',
                                      addTheVehicleIdOfTripHere: v.id || '',
                                    })
                                    break
                                  case 'FindLocation':
                                    loadModal('FindLocation', () => {
                                      dispatch(
                                        layoutSlice.actions.setOpenFindLocationModal(
                                          true
                                        )
                                      )
                                      eventListener.dispatch('find-location', {
                                        vehicleId: v.id,
                                        userId: v.authorId,
                                      })
                                    })

                                    break
                                  case 'Delete':
                                    deleteVehicle(v.id || '')
                                    break

                                  case 'Default':
                                    dispatch(
                                      vehicleSlice.actions.setDefaultVehicleId(
                                        v?.id || ''
                                      )
                                    )

                                    snackbar({
                                      message: t('defaultVehicleHasBeenSet', {
                                        ns: 'prompt',
                                      }),
                                      autoHideDuration: 2000,
                                      vertical: 'top',
                                      horizontal: 'center',
                                      backgroundColor:
                                        'var(--saki-default-color)',
                                      color: '#fff',
                                    }).open()
                                    break
                                  case 'CancelDefault':
                                    dispatch(
                                      vehicleSlice.actions.setDefaultVehicleId(
                                        ''
                                      )
                                    )

                                    snackbar({
                                      message: t(
                                        'defaultVehicleHasBeenCanceled',
                                        {
                                          ns: 'prompt',
                                        }
                                      ),
                                      autoHideDuration: 2000,
                                      vertical: 'top',
                                      horizontal: 'center',
                                      backgroundColor:
                                        'var(--saki-default-color)',
                                      color: '#fff',
                                    }).open()
                                    break

                                  default:
                                    break
                                }
                                setActiveVehicleIdDropdown('')
                              },
                            })}
                          >
                            <saki-menu-item padding="10px 18px" value={'Edit'}>
                              <div className="dp-menu-item">
                                <span>
                                  {t('edit', {
                                    ns: 'common',
                                  })}
                                </span>
                              </div>
                            </saki-menu-item>
                            {v?.position?.timestamp ? (
                              <saki-menu-item
                                padding="10px 18px"
                                value={'FindLocation'}
                              >
                                <div className="dp-menu-item">
                                  <span>
                                    {t('findLocation', {
                                      ns: 'vehicleModal',
                                    })}
                                  </span>
                                </div>
                              </saki-menu-item>
                            ) : (
                              ''
                            )}
                            <saki-menu-item
                              padding="10px 18px"
                              value={'AddTripHere'}
                            >
                              <div className="dp-menu-item">
                                <span>
                                  {t('addTripHere', {
                                    ns: 'vehicleModal',
                                  })}
                                </span>
                              </div>
                            </saki-menu-item>
                            {vehicle.defaultVehicleId != v?.id ? (
                              <saki-menu-item
                                padding="10px 18px"
                                value={'Default'}
                              >
                                <div className="dp-menu-item">
                                  <span>
                                    {t('setDefault', {
                                      ns: 'vehicleModal',
                                    })}
                                  </span>
                                </div>
                              </saki-menu-item>
                            ) : (
                              <saki-menu-item
                                padding="10px 18px"
                                value={'CancelDefault'}
                              >
                                <div className="dp-menu-item">
                                  <span>
                                    {t('cancelDefault', {
                                      ns: 'vehicleModal',
                                    })}
                                  </span>
                                </div>
                              </saki-menu-item>
                            )}
                            <saki-menu-item
                              padding="10px 18px"
                              value={'Delete'}
                            >
                              <div className="dp-menu-item">
                                <span>
                                  {t('delete', {
                                    ns: 'prompt',
                                  })}
                                </span>
                              </div>
                            </saki-menu-item>
                          </saki-menu>
                        </div>
                      </saki-dropdown>
                    </div>
                  </saki-card-item>
                )
              })}
            </saki-card>
            <saki-scroll-loading
              margin="20px 0 0"
              language={config.lang}
              type={vehicle.loadStatus}
            ></saki-scroll-loading>
          </div>
          {/* <AddVehiclePage></AddVehiclePage> */}
        </saki-scroll-view>
      </div>
      <saki-transition
        class-name={'avp'}
        animation-duration="300"
        in={state.pageType === 'AddVehicle' || state.pageType === 'EditVehicle'}
      >
        <AddVehiclePage />
      </saki-transition>
      <saki-transition
        class-name={'avp'}
        animation-duration="300"
        in={state.pageType === 'AddTripHere'}
      >
        <AddTripHere />
      </saki-transition>
    </div>
  )
}

const AddVehiclePage = () => {
  const { t, i18n } = useTranslation('vehicleModal')
  const layout = useSelector((state: RootState) => state.layout)
  const config = useSelector((state: RootState) => state.config)
  const trip = useSelector((state: RootState) => state.trip)

  const dispatch = useDispatch<AppDispatch>()

  const [openSelectTypeDropdown, setOpenSelectTypeDropdown] = useState(false)
  const [openPositionShareDropdown, setOpenPositionShareDropdown] =
    useState(false)
  const [selectLogo, setSelectLogo] = useState(false)

  const [id, setId] = useState('')
  const [logo, setLogo] = useState('')
  const [name, setName] = useState('')
  const [nameErr, setNameErr] = useState('')
  const [licensePlate, setLicensePlate] = useState('')
  const [licensePlateErr, setLicensePlateErr] = useState('')
  const [carModel, setCarModel] = useState('')
  const [type, setType] = useState('')
  const [positionShare, setPositionShare] = useState(-1)

  const [loadStatus, setLoadStatus] = useState<'loading' | 'loaded' | 'noMore'>(
    'loaded'
  )
  const { state, setState } = useContext(DataContext)

  useEffect(() => {
    if (state.pageType === 'EditVehicle') {
      setId(state.editVehicle.id || '')
      setLogo(state.editVehicle.logo || '')
      setName(state.editVehicle.name || '')
      setNameErr('')
      setLicensePlate(state.editVehicle.licensePlate || '')
      setLicensePlateErr('')
      setCarModel(state.editVehicle.carModel || '')
      setType(state.editVehicle.type || '')
      setPositionShare(Number(state.editVehicle.positionShare) || -1)
      return
    }
    setId('')
    setLogo('')
    setName('')
    setNameErr('')
    setLicensePlate('')
    setLicensePlateErr('')
    setCarModel('')
    setType('')
    setPositionShare(-1)
  }, [state.pageType])

  const addVehicle = async () => {
    if (loadStatus === 'loading') return
    setLoadStatus('loading')
    // const err = validation.Validate(
    // 	vehicleItem || {},
    // 	validation.Parameter('name', validation.Required()),
    // 	validation.Parameter('logo', validation.Required()),
    // 	validation.Parameter('type', validation.Required()),
    // 	validation.Parameter('licensePlate', validation.Required())
    // )
    // console.log(err)

    const res = await httpApi.v1.AddVehicle({
      name,
      logo,
      type,
      licensePlate,
      carModel,
    })
    console.log('addVehicle', res)
    if (res.code === 200) {
      dispatch(
        methods.vehicle.GetVehicles({
          type: 'All',
          pageNum: 1,
        })
      )
      setLoadStatus('loaded')
      setState({
        pageType: '',
      })
      snackbar({
        message: t('createdSuccessfully', {
          ns: 'prompt',
        }),
        autoHideDuration: 2000,
        vertical: 'top',
        horizontal: 'center',
        backgroundColor: 'var(--saki-default-color)',
        color: '#fff',
      }).open()
    }
  }

  const editVehicle = async () => {
    if (loadStatus === 'loading') return
    setLoadStatus('loading')

    const res = await httpApi.v1.UpdateVehicle({
      id,
      name,
      logo,
      type,
      licensePlate,
      positionShare,
      carModel,
    })
    console.log('UpdateVehicle', res)
    if (res.code === 200) {
      dispatch(
        methods.vehicle.GetVehicles({
          type: 'All',
          pageNum: 1,
        })
      )
      setLoadStatus('loaded')
      setState({
        pageType: '',
      })
      snackbar({
        message: t('updatedSuccessfully', {
          ns: 'prompt',
        }),
        autoHideDuration: 2000,
        vertical: 'top',
        horizontal: 'center',
        backgroundColor: 'var(--saki-default-color)',
        color: '#fff',
      }).open()
    }
  }

  return (
    <div className="add-vehicle-page">
      <div className="av-main">
        {id ? (
          <div className="av-item">
            <span>{t('id')}</span>
            <span
              style={{
                color: '#999',
              }}
            >
              {id || ''}
            </span>
          </div>
        ) : (
          ''
        )}
        {/* <div className='av-item'>
					<span>{t('cover') + ' (可选)'}</span>
					<saki-avatar
						ref={bindEvent({
							edit: (e: any) => {
								console.log(e)
								setSelectLogo(true)
							},
						})}
						width='80px'
						height='80px'
						border-radius='50%'
						default-icon='User'
						default-icon-size='24px'
						edit-icon
						src={logo}
					></saki-avatar>
				</div> */}

        <saki-avatar-select
          ref={bindEvent({
            close: () => {
              setSelectLogo(false)
            },
            upload: () => {
              console.log('upload')
            },
            select: (e) => {
              console.log('select', e.detail)
              setLogo(e.detail)
              setSelectLogo(false)
            },
          })}
          src={logo}
          visible={selectLogo}
          full={config.deviceWH.w < 500}
          cancel-text={t('cancel', {
            ns: 'prompt',
          })}
          select-text={t('select', {
            ns: 'prompt',
          })}
          list={[
            'https://saass.aiiko.club/s/Jez3jFxRJI?x-saass-process=image/resize,160,70',
            'http://thirdqq.qlogo.cn/g?b=oidb&k=wyVQQP1M7uoJgZBce8kViaQ&s=100&t=1583993085',
            'https://api.aiiko.club/public/images/upload/52/20200222/img_2ab06a929c4f6a9e88c9bb5d42ee3092.jpg',
            'http://thirdqq.qlogo.cn/g?b=oidb&k=7zbSDJ9huicVRw3yia9icJWLw&kti=Y3kD0AAAAAI&s=100&t=1588307819',
            'https://api.aiiko.club/public/images/upload/1/20240309/img_9def4ab7abeb6014bd51606d20a9852e.jpg',
            'http://thirdqq.qlogo.cn/g?b=oidb&k=WYWSU3Sahe0h66E2tbSHyA&s=100&t=1600904430',
          ].join('////')}
        ></saki-avatar-select>

        <saki-input
          ref={bindEvent({
            changevalue: (e: any) => {
              // console.log(e)
              setNameErr(
                !e.detail
                  ? t('cannotBeEmpty', {
                      ns: 'prompt',
                    })
                  : ''
              )
              setName(e.detail)
            },
          })}
          value={name}
          placeholder={t('vehicleNamePlaceholder')}
          width={'100%'}
          height={'56px'}
          type={'Text'}
          margin="20px 0 0"
          placeholder-animation="MoveUp"
          max-length={30}
          error={nameErr}
          // errorColor={v.errorColor}
          // errorFontSize={v.errorFontSize}
        ></saki-input>
        <saki-input
          ref={bindEvent({
            changevalue: (e: any) => {
              setCarModel(e.detail)
            },
          })}
          value={carModel}
          placeholder={t('carModelPlaceholder')}
          width={'100%'}
          height={'56px'}
          type={'Text'}
          margin="20px 0 0"
          placeholder-animation="MoveUp"
          max-length={30}
          error={''}
          // errorColor={v.errorColor}
          // errorFontSize={v.errorFontSize}
        ></saki-input>

        <saki-input
          ref={bindEvent({
            changevalue: (e: any) => {
              // console.log(e)
              setLicensePlate(e.detail)
            },
          })}
          value={licensePlate}
          placeholder={t('licensePlatePlaceholder')}
          width={'100%'}
          height={'56px'}
          type={'Text'}
          margin="20px 0 0"
          placeholder-animation="MoveUp"
          max-length={15}
          error={licensePlateErr}
          // errorColor={v.errorColor}
          // errorFontSize={v.errorFontSize}
        ></saki-input>

        <div className="av-item">
          <span>{t('vehicleType')}</span>

          <saki-dropdown
            visible={openSelectTypeDropdown}
            floating-direction="Left"
            z-index="1000"
            ref={bindEvent({
              close: () => {
                setOpenSelectTypeDropdown(false)
              },
            })}
          >
            <saki-button
              border="none"
              bg-hover-color="transparent"
              bg-active-color="transparent"
              padding="0px"
              ref={bindEvent({
                tap: () => {
                  setOpenSelectTypeDropdown(true)
                },
              })}
            >
              <span>{t(type?.toLowerCase() || 'vehicleType')}</span>

              <saki-icon
                width="12px"
                height="12px"
                color="#999"
                margin="0 0 0 6px"
                type="Bottom"
              ></saki-icon>
            </saki-button>
            <div slot="main">
              <saki-menu
                ref={bindEvent({
                  selectvalue: async (e) => {
                    setType(e.detail.value)

                    setOpenSelectTypeDropdown(false)
                  },
                })}
              >
                {[
                  'Bike',
                  'Motorcycle',
                  'Car',
                  'Truck',
                  'PublicTransport',
                  'Airplane',
                  // 'Other',
                ].map((v, i) => {
                  return (
                    <saki-menu-item
                      key={i}
                      // width={dropdownWidth}
                      padding="10px 18px"
                      value={v}
                    >
                      <span>{t(v.toLowerCase())}</span>
                    </saki-menu-item>
                  )
                })}
              </saki-menu>
            </div>
          </saki-dropdown>
        </div>

        {state.pageType === 'EditVehicle' ? (
          <div className="av-item">
            <span>{t('positionShare')}</span>

            <saki-dropdown
              visible={openPositionShareDropdown}
              floating-direction="Left"
              z-index="1000"
              ref={bindEvent({
                close: () => {
                  setOpenPositionShareDropdown(false)
                },
              })}
            >
              <saki-button
                border="none"
                bg-hover-color="transparent"
                bg-active-color="transparent"
                padding="0px"
                ref={bindEvent({
                  tap: () => {
                    setOpenPositionShareDropdown(true)
                  },
                })}
              >
                <span>{t(getPositionShareText(positionShare))}</span>

                <saki-icon
                  width="12px"
                  height="12px"
                  color="#999"
                  margin="0 0 0 6px"
                  type="Bottom"
                ></saki-icon>
              </saki-button>
              <div slot="main">
                <saki-menu
                  ref={bindEvent({
                    selectvalue: async (e) => {
                      setPositionShare(Number(e.detail.value))

                      setOpenPositionShareDropdown(false)
                    },
                  })}
                >
                  {[5, 1, -1].map((v, i) => {
                    return (
                      <saki-menu-item
                        key={i}
                        // width={dropdownWidth}
                        padding="10px 18px"
                        value={v}
                      >
                        <span>{t(getPositionShareText(v))}</span>
                      </saki-menu-item>
                    )
                  })}
                </saki-menu>
              </div>
            </saki-dropdown>
          </div>
        ) : (
          ''
        )}
        <div className="av-item av-buttons">
          <saki-button
            ref={bindEvent({
              tap: () => {
                if (!id) {
                  addVehicle()
                  return
                }
                editVehicle()
              },
            })}
            margin="20px 0 0"
            padding="10px 10px"
            type="Primary"
            disabled={!name || !type}
            loading={loadStatus === 'loading'}
          >
            {state.pageType === 'EditVehicle'
              ? t('editVehicle')
              : t('addVehicle')}
          </saki-button>
        </div>
      </div>
    </div>
  )
}

const AddTripHere = () => {
  const { t, i18n } = useTranslation('vehicleModal')
  const config = useSelector((state: RootState) => state.config)
  const trip = useSelector((state: RootState) => state.trip)
  const vehicle = useSelector((state: RootState) => state.vehicle)
  const user = useSelector((state: RootState) => state.user)

  const dispatch = useDispatch<AppDispatch>()

  const [openSelectTypeDropdown, setOpenSelectTypeDropdown] = useState(false)
  const [openPositionShareDropdown, setOpenPositionShareDropdown] =
    useState(false)
  const [selectTripIds, setSelectTripIds] = useState([] as string[])
  const [filter, setFilter] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [types, setTypes] = useState([] as string[])

  const [trips, setTrips] = useState<protoRoot.trip.ITrip[]>([])

  const [openSelectVehicleDropDown, setOpenSelectVehicleDropDown] =
    useState(false)

  const { state, setState } = useContext(DataContext)

  const [loadStatus, setLoadStatus] = useState<'loading' | 'loaded' | 'noMore'>(
    'loaded'
  )

  useEffect(() => {
    if (state.pageType === 'AddTripHere' && user.isLogin) {
      const init = async () => {
        clear()
        setSelectTripIds([])

        loadData(true)

        setTrips(
          filterTrips({
            list: [],
            startDate: '',
            endDate: '',
            types: [],
          })
        )
      }

      init()
    }
  }, [state.pageType, user.isLogin])

  const loadData = async (loadCloudData: boolean) => {
    setLoadStatus('loading')

    await dispatch(
      methods.trip.GetTripHistoryData({
        loadCloudData,
      })
    ).unwrap()

    setLoadStatus('loaded')
  }

  const vehicleItem = vehicle.vehicles?.filter(
    (v) => v.id === state.addTheVehicleIdOfTripHere
  )?.[0]

  // console.log('trips', trips)

  const clear = () => {
    setStartDate('')
    setEndDate('')
    setFilter(false)
    setTypes([])
    setTrips(
      filterTrips({
        list: [],
        startDate: '',
        endDate: '',
        types: [],
      })
    )
  }

  const updateTrips = async (ids: string[], i: number = 0) => {
    if (loadStatus === 'loading') return
    setLoadStatus('loading')

    const newIds = ids.slice(100 * i, 100 * (i + 1))

    const res = await httpApi.v1.UpdateTrips({
      ids: newIds,
      vehicleId: vehicleItem.id || '',
    })

    console.log(
      'res UpdateTrips',
      res,
      newIds.length,
      i,
      newIds.length < 100 && i !== 0
    )
    if (res.code === 200) {
      const promiseAll: any[] = []
      ids.forEach((id) => {
        promiseAll.push(
          storage.trips.getAndSet(id, async (v) => {
            return {
              ...v,
              vehicle:
                state.addTheVehicleIdOfTripHere === 'cancelDefault'
                  ? undefined
                  : vehicleItem,
            }
          })
        )
      })

      await Promise.all(promiseAll)
      if (ids?.length > 100 && newIds.length === 100) {
        await updateTrips(ids, i + 1)
        return
      }

      await loadData(false)

      setTrips(
        filterTrips({
          list: [],
          startDate,
          endDate,
          types,
        })
      )
      snackbar({
        message: t('updatedSuccessfully'),
        vertical: 'top',
        horizontal: 'center',
        backgroundColor: 'var(--saki-default-color)',
        color: '#fff',
        autoHideDuration: 2000,
      }).open()
    }

    setLoadStatus('loaded')
  }

  return (
    <div className="add-trip-here-page">
      <div className="ath-main">
        <div className="ath-m-header">
          <div className="ath-m-h-left">
            <span>{t('setTripsInBatchesTo')}</span>
            {vehicle.vehicles.length ? (
              <saki-dropdown
                visible={openSelectVehicleDropDown}
                floating-direction="Left"
                z-index="1001"
                ref={bindEvent({
                  close: (e) => {
                    setOpenSelectVehicleDropDown(false)
                  },
                })}
              >
                <saki-button
                  ref={bindEvent({
                    tap: () => {
                      setOpenSelectVehicleDropDown(true)
                    },
                  })}
                  bg-color="transparent"
                  bg-hover-color="transparent"
                  bg-active-color="transparent"
                  border="none"
                  type="Normal"
                  padding="4px 4px 4px 0"
                  margin="0 0 0 6px"
                >
                  <saki-row align-items="center">
                    {!vehicleItem?.id ? (
                      <span>
                        {t('deselectVehicle', {
                          ns: 'vehicleModal',
                        })}
                      </span>
                    ) : (
                      <div className="data-vehicle-item-dropdown">
                        <VehicleLogo
                          icon={vehicleItem?.type || ''}
                          style={{
                            width: '28px',
                            height: '28px',
                            margin: '0 6px 0 0',
                          }}
                        ></VehicleLogo>
                        <span className="text-two-elipsis">
                          {vehicleItem?.name}
                        </span>
                      </div>
                    )}

                    <saki-icon
                      width="12px"
                      height="12px"
                      color="#999"
                      margin="2px 0 0 6px"
                      type="Bottom"
                    ></saki-icon>
                  </saki-row>
                </saki-button>
                <div slot="main">
                  <saki-menu
                    ref={bindEvent({
                      selectvalue: async (e) => {
                        console.log(e.detail.value)
                        setState({
                          addTheVehicleIdOfTripHere: e.detail.value,
                        })

                        setOpenSelectVehicleDropDown(false)
                      },
                    })}
                  >
                    {vehicle.vehicles
                      .concat([
                        {
                          id: 'cancelDefault',
                          name: t('deselectVehicle', {
                            ns: 'vehicleModal',
                          }),
                        },
                      ])
                      .map((v, i) => {
                        return (
                          <saki-menu-item
                            width="150px"
                            padding="10px 18px"
                            value={v.id}
                            key={i}
                            active={state.addTheVehicleIdOfTripHere === v.id}
                          >
                            <div
                              style={{
                                justifyContent:
                                  v.id === 'cancelDefault'
                                    ? 'center'
                                    : 'flex-start',
                              }}
                              className="data-vehicle-item-dropdown"
                            >
                              {v.id !== 'cancelDefault' ? (
                                <VehicleLogo
                                  icon={v?.type || ''}
                                  style={{
                                    width: '28px',
                                    height: '28px',
                                    margin: '0 6px 0 0',
                                  }}
                                ></VehicleLogo>
                              ) : (
                                ''
                              )}
                              <span className="text-two-elipsis">{v.name}</span>
                            </div>
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
          <div className="ath-m-h-right">
            <saki-button
              ref={bindEvent({
                tap: () => {
                  console.log(selectTripIds)
                  updateTrips(selectTripIds)
                },
              })}
              margin="0 0 0"
              padding="6px 10px"
              type="Primary"
              disabled={!selectTripIds.length}
              loading={loadStatus === 'loading'}
            >
              <span
                style={{
                  whiteSpace: 'nowrap',
                }}
              >
                {t('editTrip', {
                  ns: 'tripPage',
                })}
              </span>
            </saki-button>
          </div>
        </div>
        <div className="ath-m-list">
          <div className="ftd-l-header">
            <div className="ftd-l-h-left">
              <saki-button
                ref={bindEvent({
                  tap: () => {
                    setSelectTripIds(trips?.map((v) => v?.id || '') || [])
                  },
                })}
              >
                {t('selectAll', {
                  ns: 'trackRoutePage',
                })}
              </saki-button>
              <span className="ftd-l-h-l-count">
                {selectTripIds?.length + '/' + trips?.length}
              </span>
            </div>
            <div className="ftd-l-h-right">
              {selectTripIds?.length ? (
                <saki-button
                  ref={bindEvent({
                    tap: () => {
                      setSelectTripIds([])
                    },
                  })}
                >
                  {t('uncheck', {
                    ns: 'trackRoutePage',
                  })}
                </saki-button>
              ) : (
                ''
              )}
              <saki-button
                ref={bindEvent({
                  tap: () => {
                    setFilter(true)
                  },
                })}
                type="CircleIconGrayHover"
              >
                <div
                  className={
                    'si-t-r-icon ' + (startDate || endDate ? 'active' : '')
                  }
                >
                  <div className="si-t-r-i-dot"></div>
                  <saki-icon
                    color={
                      startDate || endDate
                        ? 'var(--saki-default-color)'
                        : '#666'
                    }
                    width="18px"
                    height="18px"
                    type="Filter"
                  ></saki-icon>
                </div>
              </saki-button>
            </div>
          </div>
          <div className="ftd-list">
            <saki-scroll-view mode="Auto">
              <saki-checkbox
                ref={bindEvent({
                  async selectvalue(e) {
                    console.log(e.detail.values)
                    setSelectTripIds(e.detail.values)
                    // store.dispatch(methods.config.setLanguage(e.detail.value))
                  },
                })}
                value={selectTripIds?.join(',')}
                flex-direction="Column"
                type="Checkbox"
              >
                {trips?.map((v, i) => {
                  // console.log('tripstrips', v)
                  return (
                    // <div key={i} className='ftd-l-item'>
                    // 	{v.id}
                    // </div>
                    <saki-checkbox-item
                      key={i}
                      padding="14px 10px"
                      margin="0px"
                      value={v.id}
                    >
                      <div
                        className={'ftd-l-item ' + v.type + ' ' + config.lang}
                      >
                        <span className="name">
                          {t((v.type || '')?.toLowerCase(), {
                            ns: 'tripPage',
                          }) +
                            ' · ' +
                            formatDistance(v.statistics?.distance || 0)}

                          {v.vehicle?.name ? ' · ' + v.vehicle?.name : ''}
                        </span>
                        <span className="date">
                          {v.status === 1
                            ? moment(Number(v.createTime) * 1000).format(
                                'YYYY.MM.DD'
                              )
                            : t('unfinished', {
                                ns: 'tripPage',
                              })}
                        </span>
                      </div>
                    </saki-checkbox-item>
                  )
                })}
              </saki-checkbox>

              <saki-scroll-loading
                margin="10px 0 30px"
                type={loadStatus}
                language={i18n.language}
                ref={bindEvent({
                  tap: () => {},
                })}
              ></saki-scroll-loading>
            </saki-scroll-view>
          </div>
        </div>
        <FilterComponent
          onclose={() => {
            setFilter(false)
          }}
          onLoad={(fc, trips) => {
            setTypes(fc.selectedTripTypes || [])
            setStartDate(fc.startDate)
            setEndDate(fc.endDate)
          }}
          selectTypes={types}
          // onSelectTypes={(types) => {
          //   setTypes(types)
          // }}
          visible={filter}
          startDate={startDate}
          endDate={endDate}
          // selectStartDate={(date) => {
          //   setStartDate(date)
          // }}
          // selectEndDate={(date) => {
          //   setEndDate(date)
          // }}
          date
          buttons={[
            {
              text: t('clear', {
                ns: 'prompt',
              }),
              type: 'Normal',
              onTap() {
                clear()
                setFilter(false)
              },
            },
            {
              text: t('filter', {
                ns: 'prompt',
              }),
              type: 'Primary',
              onTap() {
                setTrips(
                  filterTrips({
                    list: [],
                    startDate,
                    endDate,
                    types,
                  })
                )
                setFilter(false)
              },
            },
          ]}
        ></FilterComponent>
      </div>
    </div>
  )
}

export const getIconType = (icon: string) => {
  let iconType = icon
  if (icon === 'Car') {
    iconType = 'Drive'
  }
  if (icon === 'Airplane') {
    iconType = 'Plane'
  }
  return iconType
}

export const VehicleLogo = ({
  icon,
  iconSize = '16px',
  style,
}: {
  icon: string
  iconSize?: string
  style: React.CSSProperties | undefined
}) => {
  // console.log('VehicleLogo', icon)

  // 暂时禁止使用上传图片
  /* <saki-avatar
													width='50px'
													height='50px'
													margin='0 10px 0 0'
													border-radius='50%'
													src={v.logo}
												></saki-avatar> */

  if (!icon) return <div></div>
  let iconType = getIconType(icon)
  return (
    <div style={style} className="vehicle-logo-component">
      <saki-icon
        width={iconSize}
        height={iconSize}
        color={style?.color || '#fff'}
        type={iconType}
      ></saki-icon>
    </div>
  )
}

export default VehicleComponent
