import React, { use, useCallback, useEffect, useRef, useState } from 'react'

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
  formatAvgPace,
  formatDistance,
  formatTime,
  getTimeLimit,
  isResumeTrip,
} from '../plugins/methods'
import TripItemComponent from './TripItem'
import Chart from 'chart.js/auto'
import { deepCopy } from '@nyanyajs/utils'
import StatisticsComponent from './Statistics'
import FilterComponent from './Filter'
import { getTrips } from '../store/trip'
import { deviceType, eventListener, TabsTripType } from '../store/config'
// import { isCorrectedData } from '../store/trip'

const getMonth = () => {
  let dataArr = []
  let date = new Date()
  date.setMonth(date.getMonth() + 1, 1)
  for (let i = 0; i < 12; i++) {
    date.setMonth(date.getMonth() - 1)
    let m: any = date.getMonth() + 1
    m = m < 10 ? '0' + m : m
    dataArr.push(date.getFullYear() + '-' + m)
  }
  return dataArr.reverse()
}
const getWeeks = () => {
  let dataArr: {
    // s: number
    t: number
    key: string
  }[] = []
  let date = new Date(moment().format('YYYY-MM-DD 0:0:0'))
  let d: any = date.getDate()
  // let s = date.getTime()
  let key = date.getMonth() + 1 + '/' + (d < 10 ? '0' + d : d)
  date.setDate(date.getDate() - (date.getDay() || 7) + 1)
  d = date.getDate()
  let t = Math.floor(date.getTime() / 1000)
  key = date.getMonth() + 1 + '/' + (d < 10 ? '0' + d : d) + ' - ' + key

  dataArr.push({
    // s,
    t,
    key,
  })
  for (let i = 0; i < 11; i++) {
    date.setDate(date.getDate() - 1)
    // s = date.getTime()
    d = date.getDate()
    key = date.getMonth() + 1 + '/' + (d < 10 ? '0' + d : d)

    date.setDate(date.getDate() - 6)

    d = date.getDate()
    t = Math.floor(date.getTime() / 1000)
    key = date.getMonth() + 1 + '/' + (d < 10 ? '0' + d : d) + ' - ' + key
    dataArr.push({
      // s,
      t,
      key,
    })
  }
  return dataArr
}

const getDays = () => {
  let dataArr = []
  let date = new Date()
  date.setDate(date.getDate() + 1)
  for (let i = 0; i < 30; i++) {
    date.setDate(date.getDate() - 1)

    let d: any = date.getDate()
    dataArr.push({
      showText: date.getMonth() + 1 + '/' + (d < 10 ? '0' + d : d),
      val:
        date.getFullYear() +
        '-' +
        (date.getMonth() + 1) +
        '-' +
        (d < 10 ? '0' + d : d),
    })
  }
  return dataArr.reverse()
}

const TripHistoryComponent = () => {
  const { t, i18n } = useTranslation('tripHistoryPage')
  const layout = useSelector((state: RootState) => state.layout)
  const config = useSelector((state: RootState) => state.config)
  const trip = useSelector((state: RootState) => state.trip)

  const dispatch = useDispatch<AppDispatch>()
  // const [menuType, setMenuType] = useState('Appearance')
  // const [menuType, setMenuType] = useState(type || 'Account')
  const [closeIcon, setCloseIcon] = useState(true)
  const [enlarge, setEnlarge] = useState(false)
  const [uselessData, setUselessData] = useState([] as string[])

  useEffect(() => {
    setCloseIcon(
      !(layout.openStatisticsModal.visible || layout.openTripItemModal.visible)
    )
  }, [layout.openStatisticsModal.visible, layout.openTripItemModal.visible])

  // const [trip, setTrip] = useState<protoRoot.trip.ITrip>()

  // useEffect(() => {
  // 	setTimeout(() => {
  // 		dispatch(layoutSlice.actions.setOpenTripHistoryModal(true))
  // 	}, 500)
  // }, [])

  return (
    <saki-modal
      ref={bindEvent({
        close() {
          dispatch(layoutSlice.actions.setOpenTripHistoryModal(false))
        },
        loaded() {
          eventListener.dispatch('loadModal:TripHistory', true)
        },
      })}
      width="100%"
      height="100%"
      max-width={
        config.deviceType === 'Mobile'
          ? '100%'
          : enlarge && !closeIcon
          ? '100%'
          : '780px'
      }
      max-height={
        config.deviceType === 'Mobile'
          ? '100%'
          : enlarge && !closeIcon
          ? '100%'
          : '780px'
      }
      mask
      border-radius={config.deviceType === 'Mobile' ? '0px' : ''}
      border={config.deviceType === 'Mobile' ? 'none' : ''}
      mask-closable="false"
      background-color="#fff"
      visible={layout.openTripHistoryModal}
    >
      <div
        style={
          {
            '--window-h': config.deviceWH.h + 'px',
          } as any
        }
        className={
          'trip-history-component ' +
          config.deviceType +
          (enlarge ? ' enlarge ' : '')
        }
      >
        <div className="th-header">
          <saki-modal-header
            // border
            back-icon={!closeIcon}
            close-icon={closeIcon}
            right-width={'56px'}
            ref={bindEvent({
              close() {
                // console.log('setOpenTripHistoryModal')
                dispatch(layoutSlice.actions.setOpenTripHistoryModal(false))
              },
              back() {
                // dispatch(tripSlice.actions.setTripForDetailPage(undefined))

                console.log('back')
                // setCloseIcon(true)

                if (
                  !layout.openTripItemModal.visible &&
                  layout.openStatisticsModal.visible
                ) {
                  dispatch(
                    layoutSlice.actions.setOpenStatisticsModal({
                      visible: false,
                      type: layout.openStatisticsModal.type,
                    })
                  )
                }

                dispatch(
                  layoutSlice.actions.setOpenTripItemModal({
                    visible: false,
                    id: '',
                  })
                )
              },
            })}
            title={
              !closeIcon
                ? layout.openStatisticsModal.visible &&
                  !layout.openTripItemModal.visible
                  ? `${t('statistics', {
                      ns: 'tripPage',
                    })} [${t(layout.openStatisticsModal.type.toLowerCase(), {
                      ns: 'tripPage',
                    })}]`
                  : !trip.detailPage.trip?.authorId
                  ? t('loadingData', {
                      ns: 'prompt',
                    })
                  : trip.detailPage.trip?.status === 1
                  ? t((trip.detailPage.trip?.type || '')?.toLowerCase(), {
                      ns: 'tripPage',
                    }) +
                    ' · ' +
                    Math.round(
                      (trip.detailPage.trip?.statistics?.distance || 0) / 10
                    ) /
                      100 +
                    'km'
                  : t('unfinished', {
                      ns: 'tripPage',
                    })
                : t('pageTitle')
            }
          >
            <div
              style={{
                margin: '0 10px 0 0',
              }}
              slot="right"
            >
              {!closeIcon && config.deviceType !== 'Mobile' ? (
                <saki-button
                  ref={bindEvent({
                    tap: () => {
                      setEnlarge(!enlarge)
                      setTimeout(() => {
                        eventListener.dispatch('tripItemResize', undefined)
                      }, 300)
                    },
                  })}
                  type="CircleIconGrayHover"
                >
                  {!enlarge ? (
                    <saki-icon
                      color="#666"
                      width="18px"
                      height="18px"
                      type="ZoomIn"
                    ></saki-icon>
                  ) : (
                    <saki-icon
                      color="#666"
                      width="18px"
                      height="18px"
                      type="ZoomOut"
                    ></saki-icon>
                  )}
                </saki-button>
              ) : (
                ''
              )}
              {closeIcon ? (
                <saki-button
                  ref={bindEvent({
                    tap: () => {
                      // const tripStatistic = tripStatistics.filter(v=>v.)

                      alert({
                        title: t('deleteInvalidTrip', {
                          ns: 'prompt',
                        }),
                        content: t('deleteAllTrip50m', {
                          ns: 'prompt',
                          uselessDataCount: uselessData.length,
                        }),
                        cancelText: t('cancel', {
                          ns: 'prompt',
                        }),
                        confirmText: t('delete', {
                          ns: 'prompt',
                        }),
                        onCancel() {},
                        async onConfirm() {
                          const nPromise: any[] = []
                          uselessData.forEach((v) => {
                            nPromise.push(
                              httpApi.v1.DeleteTrip({
                                id: v,
                              })
                            )
                          })

                          Promise.all(nPromise).then(() => {
                            dispatch(
                              configSlice.actions.setUpdateTimeForTripHistoryList(
                                new Date().getTime()
                              )
                            )
                            snackbar({
                              message: t('deletedSuccessfully', {
                                ns: 'prompt',
                              }),
                              vertical: 'top',
                              horizontal: 'center',
                              backgroundColor: 'var(--saki-default-color)',
                              color: '#fff',
                              autoHideDuration: 2000,
                            }).open()
                          })
                        },
                      }).open()
                    },
                  })}
                  type="CircleIconGrayHover"
                >
                  <saki-icon color="#666" type="ClearFill"></saki-icon>
                </saki-button>
              ) : (
                ''
              )}
            </div>
          </saki-modal-header>
        </div>
        <div className="th-main">
          <TripHistoryPage
            onUselessData={(count) => {
              console.log('onUselessDataCount', count)
              setUselessData(count)
            }}
          />
        </div>
      </div>
    </saki-modal>
  )
}

const TripHistoryPage = ({
  onUselessData,
}: {
  onUselessData: (uselessData: string[]) => void
}) => {
  const { t, i18n } = useTranslation('tripHistoryPage')
  // const [type, setType] = useState<'All' | 'Running' | 'Bike' | 'Drive'>('All')
  const [time, setTime] = useState<'Day' | 'Week' | 'Month' | 'Year' | 'All'>(
    'All'
  )
  const config = useSelector((state: RootState) => state.config)
  const user = useSelector((state: RootState) => state.user)
  const layout = useSelector((state: RootState) => state.layout)
  const type = useSelector((state: RootState) => state.layout.tripHistoryType)
  const trip = useSelector((state: RootState) => state.trip)

  const [pageHeight, setPageHeight] = useState(0)
  const [contentHeight, setContentHeight] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [pageNum, setPageNum] = useState(1)
  const [loadStatus, setLoadStatus] = useState<'loading' | 'loaded' | 'noMore'>(
    'loaded'
  )
  const [trips, setTrips] = useState<protoRoot.trip.ITrip[]>([])
  const [localTrips, setLocalTrips] = useState<protoRoot.trip.ITrip[]>([])

  const [isLoadLocal, setIsLoadLocal] = useState(false)

  // 筛选
  const [openFilterDropdown, setOpenFilterDropdown] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [distanceRange, setDistanceRange] = useState({
    min: 0,
    max: 500,
  })

  const [selectVehicleIds, setSelectVehicleIds] = useState([] as string[])
  const [selectJmIds, setSelectJmIds] = useState([] as string[])
  const [showCustomTrip, setShowCustomTrip] = useState(false)
  const [openStartDateDatePicker, setOpenStartDateDatePicker] = useState(false)
  const [openEndDateDatePicker, setOpenEndDateDatePicker] = useState(false)

  const dispatch = useDispatch<AppDispatch>()

  const speedChart = useRef<{
    [t: string]: Chart<'line', any[], unknown> | undefined
  }>({})

  const [tripStatistics, setTripStatistics] = useState<
    {
      type:
        | 'All'
        | 'Running'
        | 'Bike'
        | 'Drive'
        | 'Motorcycle'
        | 'Walking'
        | 'PowerWalking'
        | 'Train'
        | 'Plane'
        | 'PublicTransport'
        | 'Local'
      // count: number
      // distance: number
      // uselessData: string[]
      // time: number
      list: protoRoot.trip.ITrip[]
      statistics?: protoRoot.trip.ITripHistoricalStatistics
      // speedChart?: Chart<'line', any[], unknown>
    }[]
  >([])

  // useEffect(() => {
  // 	console.log('showTripItemPage', showTripItemPage)
  // 	if (!showTripItemPage) {
  // 		dispatch(
  // 			layoutSlice.actions.setOpenTripItemModal({
  // 				visible: false,
  // 				id: '',
  // 			})
  // 		)
  // 	}
  // }, [showTripItemPage])

  useEffect(() => {
    setTripStatistics(
      ['All', ...config.tripTypes].map((v, i) => {
        return {
          type: v as any,
          list: [],
          statistics: {
            count: 0,
            uselessData: [],
            distance: 0,
            time: 0,
          },
        }
      })
    )
  }, [])

  useEffect(() => {
    if (user.isLogin) {
      dispatch(methods.vehicle.Init())
      dispatch(methods.journeyMemory.GetJMBaseDataList()).unwrap
    }
  }, [user.isLogin])

  useEffect(() => {
    // console.log(
    // 	'openTripHistoryModal loadNewData',
    // 	user.isLogin,
    // 	layout.openTripHistoryModal,
    // 	layout.openTripHistoryModal && !layout.openTripItemModal
    // )
    if (!user.isInit) {
      return
    }
    if (layout.openTripHistoryModal) {
      if (!user.isLogin) {
        dispatch(layoutSlice.actions.setTripHistoryType('Local'))
        return
      }
      const init = async () => {
        const { trip } = store.getState()
        console.log(
          ' t1rip.tripStatistics',
          trip.tripStatistics,
          trip.tripStatistics?.filter((v) => v.type === 'All')?.[0]?.list
            ?.length
        )

        if (
          !trip.tripStatistics?.filter((v) => v.type === 'All')?.[0]?.list
            ?.length
        ) {
          await dispatch(
            methods.trip.GetTripHistoryData({
              loadCloudData: true,
              alert: false,
            })
          ).unwrap()
        }

        loadNewData()
      }

      init()
    }
  }, [user, layout.openTripHistoryModal])

  const clearFilterData = () => {
    setStartDate('')
    setEndDate('')
    setSelectVehicleIds([])
    setSelectJmIds([])
    setDistanceRange({
      min: 0,
      max: 500,
    })
  }

  const loadNewData = () => {
    // console.log('loadNewData', loadNewData)
    setTrips([])
    setPageNum(1)
    setLoadStatus('loaded')
  }

  useEffect(() => {
    if (
      // tripStatistics.length &&
      // layout.tripHistoryType === 'Local' &&
      layout.openTripHistoryModal
    ) {
      getLocalTrips()
    } else {
      setIsLoadLocal(false)
    }
  }, [
    layout.openTripHistoryModal,
    // layout.tripHistoryType,
    // tripStatistics.length,
  ])

  useEffect(() => {
    const init = async () => {
      // console.log(
      // 	'openTripHistoryModal loadNewData',
      // 	user.isLogin,
      // 	layout.openTripHistoryModal,
      // 	layout.openTripItemModal?.visible,
      // 	layout.openTripHistoryModal && !layout.openTripItemModal?.visible
      // )
      if (
        layout.openTripHistoryModal &&
        tripStatistics.length &&
        pageNum === 1 &&
        loadStatus === 'loaded' &&
        trips.length === 0
      ) {
        if (layout.tripHistoryType === 'Local') {
          await getLocalTrips()
          return
        }
        if (user.isLogin && isLoadLocal) {
          await getTripHistory()
          await getTripStatistics()
        }
      }
    }
    init()
  }, [pageNum, loadStatus, trips, tripStatistics.length, isLoadLocal])
  useEffect(() => {
    const init = async () => {
      dispatch(layoutSlice.actions.setTripHistoryType(type))
      loadNewData()
    }
    config.updateTimeForTripHistoryList && init()
  }, [config.updateTimeForTripHistoryList])

  // useEffect(() => {
  // 	// setTrips(list)
  // }, [trips, localTrips, type])

  useEffect(() => {
    // mergeTripStatistics()
    console.log('listlist', tripStatistics)
    outSpeedLineChart()
  }, [tripStatistics])

  const getTripStatistics = async () => {
    let sd = getTimeLimit(time)
    let ed = 32503651200
    if (startDate) {
      sd = Math.floor(new Date(startDate).getTime() / 1000)
    }
    if (endDate) {
      ed = Math.floor(new Date(endDate + ' 23:59:59').getTime() / 1000)
    }
    const res = await httpApi.v1.GetTripStatistics({
      type: type,
      timeLimit: [sd, ed],
      vehicleLimit: selectVehicleIds,
      journeyMemoryLimit: selectJmIds,
      distanceLimit: [distanceRange.min, distanceRange.max],
    })
    console.log(
      'getTripStatistics listlist',
      {
        type: type,
        timeLimit: [getTimeLimit(time), 32503651200],
      },
      res,
      res?.data?.statistics,
      type,
      trip.tripStatistics.filter((v) => v.type === type)?.[0]?.list || []
    )
    if (res.code === 200 && res?.data?.statistics?.count) {
      // console.log('getTripsCloud', trips)
      // const data: {
      // 	type: 'Year'
      // 	key: Number.
      // 	value:
      // }[] = []
      // res?.data?.list?.forEach((v) => {})

      const statistics = res?.data?.statistics

      onUselessData(statistics.uselessData || [])

      const { trip } = store.getState()
      setTripStatistics(
        tripStatistics.map((v) => {
          if (v.type === String(type)) {
            return {
              ...v,
              // count: Number(statistics?.count),
              // distance: Number(statistics?.distance),
              // uselessDataCount: Number(statistics?.uselessData),
              // time: Number(statistics?.time),
              statistics,
              list:
                trip.tripStatistics.filter((v) => v.type === type)?.[0]?.list ||
                [],
            }
          }
          return v
        })
      )
      return
    }
  }

  const outSpeedLineChart = () => {
    try {
      const list =
        tripStatistics.filter((v) => {
          return v.type === type
        })?.[0]?.list || []

      console.log('listlist', time, list, tripStatistics)
      const tripData: {
        [key: string]: number
      } = {}
      switch (time) {
        // 所有时间从2018年开始
        case 'All':
          // console.log("listlist",list)
          list.forEach((v) => {
            let t = moment(Number(v.createTime) * 1000).format('YYYY')
            !tripData[t] && (tripData[t] = 0)

            tripData[t] += Math.round((v.statistics?.distance || 0) / 100) / 10
          })
          if (Object.keys(tripData).length === 1) {
            tripData['2018'] = 0
          }
          break
        // 最近10年
        case 'Year':
          let y = Number(moment().format('YYYY'))
          for (let i = 0; i < 10; i++) {
            tripData[String(y - i)] = 0
          }
          list.forEach((v) => {
            if (
              Number(v.createTime || 0) >=
              Math.floor(new Date(String(y - 9) + '-1-1').getTime() / 1000)
            ) {
              let t = moment(Number(v.createTime) * 1000).format('YYYY')
              !tripData[t] && (tripData[t] = 0)

              tripData[t] +=
                Math.round((v.statistics?.distance || 0) / 100) / 10
            }
          })
          break
        // 最近12个月
        case 'Month':
          const m = getMonth()
          m.forEach((v) => {
            tripData[v] = 0
          })
          list.forEach((v) => {
            if (
              Number(v.createTime || 0) >=
              Math.floor(new Date(m[0]).getTime() / 1000)
            ) {
              let t = moment(Number(v.createTime) * 1000).format('YYYY-MM')
              !tripData[t] && (tripData[t] = 0)

              tripData[t] +=
                Math.round((v.statistics?.distance || 0) / 100) / 10
            }
          })
          break
        // 最近12个周
        case 'Week':
          const weeks = getWeeks()
          weeks.forEach((_, i) => {
            tripData[weeks[weeks.length - 1 - i].key] = 0
          })
          list.forEach((v) => {
            let c = Number(v.createTime)
            weeks.some((sv) => {
              if (c > sv.t) {
                tripData[sv.key] +=
                  Math.round((v.statistics?.distance || 0) / 100) / 10
                return true
              }
            })
          })
          break
        // 最近30天
        case 'Day':
          const d = getDays()
          d.forEach((v) => {
            tripData[v.showText] = 0
          })
          // console.log(
          // 	'new Date(d[0]).getTime() / 1000',
          // 	d,
          // 	new Date(d[0].val).getTime() / 1000
          // )
          list.forEach((v) => {
            if (
              Number(v.createTime || 0) >=
              Math.floor(new Date(d[0].val).getTime() / 1000)
            ) {
              let t = moment(Number(v.createTime) * 1000).format('M/DD')
              !tripData[t] && (tripData[t] = 0)

              tripData[t] +=
                Math.round((v.statistics?.distance || 0) / 100) / 10
            }
          })
          break

        default:
          break
      }
      const tsItem = tripStatistics.filter((v) => {
        return v.type === type
      })?.[0]
      console.log(
        'outSpeedLineChart',
        tripStatistics,
        list,
        // tsItem?.speedChart,
        time,
        tripData
      )

      if (speedChart.current[type]) {
        speedChart.current[type]?.destroy()
        speedChart.current[type] = undefined
        // return
      }
      let labels: any[] = []
      let distanceData: number[] = []
      Object.keys(tripData).forEach((k, i) => {
        labels.push(k)
        distanceData.push(tripData[k])
      })
      console.log(labels, distanceData)
      const data = {
        labels: labels,
        datasets: [
          {
            label:
              t('distance', {
                ns: 'tripPage',
              }) + ' (km)',
            data: distanceData,
            pointBorderWidth: 0,
            borderColor: '#f29cb2',
            backgroundColor: '#f29cb258',
            // fill: true,
            cubicInterpolationMode: 'monotone',
            tension: 0.4,
            yAxisID: 'y',
          },
        ],
      }

      const el = document.querySelector('.si-c-cvs-' + type) as HTMLElement

      console.log('elelelel', el)
      el &&
        setTimeout(() => {
          try {
            const chart = new Chart(el as any, {
              type: 'line',

              data: data as any,
              options: {
                responsive: true,
                plugins: {
                  title: {
                    display: true,
                    text: '',
                  },
                  legend: {
                    display: false,
                  },
                },
                interaction: {
                  intersect: false,
                },
                maintainAspectRatio: false,
                scales: {
                  y: {
                    display: true,
                    title: {
                      display: true,
                      text:
                        t('distance', {
                          ns: 'tripPage',
                        }) + ' (km)',
                    },
                    suggestedMin: 0,
                    // suggestedMax: 200,
                    grid: {
                      color: '#f29cb2',
                      lineWidth: 1,
                      drawOnChartArea: false, // only want the grid lines for one axis to show up
                    },
                  },
                },
              },
            })
            // el.onclick = (e) => {
            // 	// getSegmentsAtEvent(e)
            // 	const activePoints = chart.getElementsAtEventForMode(
            // 		e,
            // 		'nearest',
            // 		{ intersect: true },
            // 		true
            // 	)

            // 	console.log(activePoints)
            // }
            speedChart.current[type] = chart
            // setTripStatistics(tripStatistics)
          } catch (error) {
            console.error(error)
          }
        }, 50)
    } catch (error) {
      console.error(error)
    }
  }

  const getTripHistory = async () => {
    if (loadStatus === 'loading' || loadStatus == 'noMore') return
    setLoadStatus('loading')

    let sd = getTimeLimit(time)
    let ed = 32503651200
    if (startDate) {
      sd = Math.floor(new Date(startDate).getTime() / 1000)
    }
    if (endDate) {
      ed = Math.floor(new Date(endDate + ' 23:59:59').getTime() / 1000)
    }
    const res = await httpApi.v1.GetTrips({
      type: type,
      pageSize,
      pageNum,
      createTimeLimit: [sd, ed],
      vehicleLimit: selectVehicleIds,
      journeyMemoryLimit: selectJmIds,
      distanceLimit: [distanceRange.min, distanceRange.max],
      turnOffCache: true,
    })
    console.log('getTripHistory', res, pageNum)
    if (res.code === 200) {
      setLoadStatus(Number(res.data.total) === pageSize ? 'loaded' : 'noMore')

      let promiseAll: any[] = []
      res.data.list?.forEach((v, i) => {
        promiseAll.push(
          new Promise(async (res) => {
            // v.correctedData = await isCorrectedData(v)
            res(v.correctedData)
          })
        )
      })

      Promise.all(promiseAll).then(() => {
        res.data.list && setTrips(trips.concat(res.data.list))

        setPageNum(pageNum + 1)
      })

      // res.data.list && setTripId(res.data.list[0]?.id || '')
      // res.data.list && onTripItemPage('Show', res.data.list[0])
      return
    }

    setLoadStatus('noMore')
  }

  const getLocalTrips = async () => {
    const trips = (await storage.trips.getAll()).filter((v) =>
      v.key.includes('IDB_')
    )
    console.log('getLocalTrips', trips)
    // if (trips?.length) {
    let distance = 0
    let time = 0
    let uselessDataCount = 0
    trips.sort((a, b) => {
      return Number(b.value.createTime) - Number(a.value.createTime)
    })
    const list = trips
      // .filter((v) => {
      // 	return type === 'Local' ? true : v.value.type === type
      // })
      .map((v) => {
        if (v.value.status !== 1) {
          uselessDataCount += 1
        }
        distance += v.value.statistics?.distance || 0
        time +=
          (Number(v.value.endTime) || 0) - (Number(v.value.startTime) || 0)
        return v.value
      })

    if (type === 'Local') {
      setPageNum(2)
      setTrips(list)
      setLoadStatus('noMore')
    }

    console.log(
      'getLocalTrips1',
      type,
      {
        count: list?.length,
        distance: distance,
        uselessDataCount: uselessDataCount,
        time: time,
        list: list || [],
      }
      // tripStatistics
      // 	.map((v) => {
      // 		if (v.type === 'Local') {
      // 			return {
      // 				...v,
      // 				count: list?.length,
      // 				distance: distance,
      // 				time: time,
      // 				list: list || [],
      // 			}
      // 		}
      // 		return v
      // 	})
      // 	.filter((v) => {
      // 		return user.isLogin
      // 			? v.type === 'Local'
      // 				? !!v.list.length
      // 				: true
      // 			: v.type === 'Local'
      // 	})
    )
    setTripStatistics(
      tripStatistics.map((v) => {
        if (v.type === 'Local') {
          return {
            ...v,
            list: list || [],
            statistics: {
              count: list?.length,
              distance: distance,
              uselessDataCount: uselessDataCount,
              time: time,
            },
          }
        }
        return v
      })
    )
    setIsLoadLocal(true)

    // }
  }

  const onBackTripItemComponent = useCallback(() => {
    dispatch(
      layoutSlice.actions.setOpenTripItemModal({
        visible: false,
        id: '',
      })
    )
  }, [])

  const onDeleteTripItemComponent = useCallback((tripId: string) => {
    // setTrips(trips.filter((v) => v.id !== tripId))

    loadNewData()
    dispatch(
      layoutSlice.actions.setOpenTripItemModal({
        visible: false,
        id: '',
      })
    )
  }, [])

  return (
    <div
      ref={(e) => {
        e &&
          pageHeight !== e?.scrollHeight &&
          setPageHeight(e?.scrollHeight || 0)
      }}
      className="trip-history-page"
    >
      <saki-scroll-view mode="Auto" scroll-bar="Hover">
        <div
          ref={(e) => {
            e &&
              contentHeight !== e?.scrollHeight &&
              setContentHeight(e?.scrollHeight || 0)
          }}
          className={'th-wrap ' + (pageHeight <= contentHeight ? 'scroll' : '')}
        >
          <div className="th-type-tabs">
            <saki-tabs
              type="Flex"
              // header-background-color='rgb(245, 245, 245)'
              // header-max-width='740px'

              header-border-bottom="none"
              header-padding="0 10px"
              header-item-padding={config.lang === 'en-US' ? '0 4px' : '0 14px'}
              more-content-width-difference={-80}
              // header-item-min-width='80px'
              // disable-more-button
              active-tab-label={type}
              ref={bindEvent({
                tap: (e) => {
                  console.log('tap', e)

                  clearFilterData()
                  dispatch(
                    layoutSlice.actions.setTripHistoryType(e.detail.label)
                  )
                  loadNewData()
                },
              })}
            >
              {tripStatistics
                .filter((v) => {
                  // console.log(
                  //   'getLocalTrips1 filter',
                  //   v,
                  //   user.isLogin
                  //     ? v.type === 'Local'
                  //       ? !!v?.statistics?.count
                  //       : true
                  //     : v.type === 'Local'
                  // )
                  return user.isLogin
                    ? // v.type === 'Local'
                      //   ? !!v?.statistics?.count
                      //   :
                      true
                    : v.type === 'Local'
                })
                .map((v, i) => {
                  return true ? (
                    <saki-tabs-item
                      key={i}
                      font-size="14px"
                      label={v.type}
                      name={t(v.type.toLowerCase(), {
                        ns: 'tripPage',
                      })}
                    >
                      <div className="statistics-item">
                        <div className="si-time">
                          <div className="si-t-left"></div>
                          <div className="si-t-center">
                            {['Day', 'Week', 'Month', 'Year', 'All'].map(
                              (v, i) => {
                                return (
                                  <div
                                    ref={(e) => {
                                      e &&
                                        (e.onclick = () => {
                                          setTime(v as any)
                                          loadNewData()
                                        })
                                    }}
                                    className={
                                      'si-t-item ' +
                                      (time === v ? 'active' : '')
                                    }
                                    key={i}
                                  >
                                    {t(v.toLowerCase(), {
                                      ns: 'tripPage',
                                    })}
                                  </div>
                                )
                              }
                            )}
                          </div>
                          <div className="si-t-right">
                            <saki-button
                              ref={bindEvent({
                                tap: () => {
                                  setOpenFilterDropdown(true)
                                },
                              })}
                              type="CircleIconGrayHover"
                            >
                              <div
                                className={
                                  'si-t-r-icon ' +
                                  (startDate ||
                                  endDate ||
                                  selectVehicleIds.length ||
                                  selectJmIds.length ||
                                  distanceRange.min ||
                                  distanceRange.max !== 500
                                    ? 'active'
                                    : '')
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

                        <div className="si-data">
                          <div className="bi-distance">
                            <span className="value">
                              {Math.round(
                                Number(v?.statistics?.distance || 0) / 100
                              ) / 10 || 0}
                            </span>
                            <span className="name">
                              km
                              {/* {t('distance', {
                          ns: 'tripPage',
                        }) + ' (km)'} */}
                            </span>
                          </div>
                          <div className="bi-right">
                            <div className="bi-time">
                              <span className="value">
                                {Number(v?.statistics?.time) <= 0
                                  ? 0
                                  : Math.round(
                                      (Number(v?.statistics?.time) / 3600) * 100
                                    ) / 100 || 0}
                              </span>
                              <span className="name">
                                {' '}
                                {t('duration', {
                                  ns: 'tripPage',
                                }) + ' (h)'}
                              </span>
                            </div>
                            <div className="bi-count">
                              <span className="value">
                                {v?.statistics?.count || 0}
                              </span>
                              <span className="name">
                                {t('trips', {
                                  ns: 'tripPage',
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="si-chart">
                          <canvas className={'si-c-cvs-' + v.type}></canvas>
                        </div>
                        {/* <div className='si-statistics-button'></div> */}
                        <div className="si-buttons">
                          <saki-button
                            ref={bindEvent({
                              tap: () => {
                                dispatch(
                                  layoutSlice.actions.setOpenStatisticsModal({
                                    visible: true,
                                    type: v.type,
                                  })
                                )
                              },
                            })}
                            padding="8px 10px"
                            type="Primary"
                          >
                            {t('statistics', {
                              ns: 'tripPage',
                            })}
                          </saki-button>
                        </div>
                      </div>
                    </saki-tabs-item>
                  ) : (
                    ''
                  )
                })}
            </saki-tabs>
          </div>
          <div className="th-list">
            {trips
              // .concat(localTrips)
              // .concat(trips)
              // .concat(trips)
              // .concat(trips)
              // .concat(trips)
              // .concat(trips)
              // .concat(trips)
              // .concat(trips)
              // .concat(trips)
              .map((v, i) => {
                // console.log(v)

                return (
                  // <saki-button
                  // 	ref={bindEvent({
                  // 		tap: () => {
                  // 			console.log('th-l-item')
                  // 			setShowTripItemPage(true)
                  // 		},
                  // 	})}
                  // 	key={i}
                  // >
                  <TripListItemComponent
                    trip={v}
                    type={type}
                    onTap={(id) => {
                      dispatch(
                        layoutSlice.actions.setOpenTripItemModal({
                          visible: true,
                          id: id || '',
                        })
                      )
                    }}
                    key={i}
                  />
                )
              })}

            <saki-scroll-loading
              margin="20px 0 10px"
              type={loadStatus}
              language={i18n.language}
              ref={bindEvent({
                tap: () => {
                  getTripHistory()
                },
              })}
            ></saki-scroll-loading>
          </div>
        </div>
      </saki-scroll-view>

      <FilterComponent
        visible={openFilterDropdown}
        onclose={() => {
          setOpenFilterDropdown(false)
        }}
        onLoad={(fc, trips) => {
          console.log('FilterTrips onload', fc, trips)

          setStartDate(fc.startDate)
          setEndDate(fc.endDate)
          setSelectVehicleIds(fc.selectedVehicleIds)
          setSelectJmIds(fc.selectedJmIds)
          setDistanceRange(fc.distanceRange)
          setOpenFilterDropdown(false)

          loadNewData()
        }}
        date
        startDate={startDate}
        endDate={endDate}
        // selectStartDate={(date) => {
        //   console.log(date)
        //   setStartDate(date)
        // }}
        // selectEndDate={(date) => {
        //   setEndDate(date)
        // }}
        selectVehicle
        selectVehicleIds={selectVehicleIds}
        // onSelectVehicleIds={(ids) => {
        //   setSelectVehicleIds(ids)
        // }}
        journeyMemory
        selectJmIds={selectJmIds}
        // onSelectVehicleIds={(ids) => {
        //   setSelectVehicleIds(ids)
        // }}
        distanceFilter
        distanceRange={distanceRange}
        // onSelectDistance={(e) => {
        //   console.log('onSelectDistance', e)
        //   setDistanceRange(e)
        // }}
        // buttons={[
        // 	{
        // 		text: t('clear', {
        // 			ns: 'prompt',
        // 		}),
        // 		type: 'Normal',
        // 		onTap() {
        // 			clearFilterData()
        // 			loadNewData()
        // 			setOpenFilterDropdown(false)
        // 		},
        // 	},
        // 	{
        // 		text: t('filter', {
        // 			ns: 'prompt',
        // 		}),
        // 		type: 'Primary',
        // 		onTap() {
        // 			loadNewData()
        // 			setOpenFilterDropdown(false)
        // 		},
        // 	},
        // ]}
        // customTripSwitch
        // showCustomTrip={showCustomTrip}
        // onShowCustomTrip={(showCustomTrip) => {
        // 	setShowCustomTrip(showCustomTrip)
        // }}
      />
      {/*       
			<saki-aside-modal
				ref={bindEvent({
					close: (e) => {
						console.log('setOpenFilterDropdown', e)
						setOpenFilterDropdown(false)
					},
				})}
				visible={openFilterDropdown}
				vertical='Center'
				horizontal='Right'
				mask
				mask-closable
				// height='86%'
				padding='0 0 0px 0'
				margin='0 50px 0 0'
				background-color='#fff'
				border-radius='10px'
				z-index='1010'
			>
				<div>
					<div className='str-main-dropdown' slot='main'>
						<div className='str-date'>
							<div className='str-d-content'>
								<saki-input
									ref={bindEvent({
										changevalue: (e: any) => {
											// console.log("Dom发生了变化", e)
											if (!e.detail) {
												dispatch(
													configSlice.actions.setTrackRouteSelectedStartDate('')
												)
												return
											}
											const dateArr = e.detail.split('-')
											const y = Number(dateArr[0])
											const m = Number(dateArr[1])
											const d = Number(dateArr[2])
											const date = new Date(y + '-' + m + '-' + d)
											const t = date.getTime()
											if (
												!!t &&
												y > 1000 &&
												m >= 0 &&
												m <= 11 &&
												d >= 0 &&
												d <= 31
											) {
												dispatch(
													configSlice.actions.setTrackRouteSelectedStartDate(
														moment(e.detail).format('YYYY-MM-DD')
													)
												)
											}
										},
										focusfunc: () => {
											console.log('focus')
											setOpenStartDateDatePicker(true)
										},
									})}
									width='100px'
									padding='6px 0'
									value={
										startDate ? moment(startDate).format('YYYY-MM-DD') : ''
									}
									border-radius='10px'
									font-size='14px'
									margin='0 0'
									placeholder={t('startDate', {
										ns: 'trackRoutePage',
									})}
									color='#999'
									border='1px solid var(--defaul-color)'
								></saki-input>
								<span>-</span>
								<saki-input
									ref={bindEvent({
										changevalue: (e: any) => {
											console.log(e)
											if (!e.detail) {
												dispatch(
													configSlice.actions.setTrackRouteSelectedEndDate('')
												)
												return
											}
											const dateArr = e.detail.split('-')
											const y = Number(dateArr[0])
											const m = Number(dateArr[1])
											const d = Number(dateArr[2])
											const date = new Date(y + '-' + m + '-' + d)
											const t = date.getTime()
											if (
												!!t &&
												y > 1000 &&
												m >= 0 &&
												m <= 11 &&
												d >= 0 &&
												d <= 31
											) {
												dispatch(
													configSlice.actions.setTrackRouteSelectedEndDate(
														moment(e.detail).format('YYYY-MM-DD')
													)
												)
											}
										},
										focusfunc: () => {
											console.log('focus')
											setOpenEndDateDatePicker(true)
										},
									})}
									width='100px'
									padding='6px 0'
									value={endDate ? moment(endDate).format('YYYY-MM-DD') : ''}
									border-radius='10px'
									font-size='14px'
									margin='0 0'
									placeholder={t('now', {
										ns: 'trackRoutePage',
									})}
									color='#999'
									border='1px solid var(--defaul-color)'
									text-align='right'
								></saki-input>
							</div>
						</div>

						<saki-date-picker
							ref={bindEvent({
								close: () => {
									console.log('setOpenStartDateDatePicker')
									setOpenStartDateDatePicker(false)
								},
								selectdate: (e) => {
									// console.log("Dom发生了变化`1111111", e)
									setOpenStartDateDatePicker(false)

									if (!e.detail.date) {
										setStartDate('')
										return
									}
									setStartDate(moment(e.detail.date).format('YYYY-MM-DD'))
								},
							})}
							date={startDate}
							visible={openStartDateDatePicker}
							cancel-button
							// time-picker
							mask
							z-index={1300}
						></saki-date-picker>
						<saki-date-picker
							ref={bindEvent({
								close: () => {
									setOpenEndDateDatePicker(false)
								},
								selectdate: (e) => {
									setOpenEndDateDatePicker(false)
									if (!e.detail.date) {
										setEndDate('')
										return
									}
									setEndDate(moment(e.detail.date).format('YYYY-MM-DD'))
								},
							})}
							date={endDate}
							visible={openEndDateDatePicker}
							cancel-button
							// time-picker
							mask
							z-index={1300}
						></saki-date-picker>
						<div className='str-buttons'>
							<saki-button
								ref={bindEvent({
									tap: () => {
										clearFilterData()
										loadNewData()
										setOpenFilterDropdown(false)
									},
								})}
								padding='8px 10px'
								margin='0 6px 0 0'
								border='none'
							>
								<span>
									{t('clear', {
										ns: 'prompt',
									})}
								</span>
							</saki-button>
							<saki-button
								ref={bindEvent({
									tap: () => {
										loadNewData()
										setOpenFilterDropdown(false)
									},
								})}
								padding='8px 10px'
								type='Primary'
							>
								<span>
									{t('filter', {
										ns: 'prompt',
									})}
								</span>
							</saki-button>
						</div>
					</div>
				</div>
			</saki-aside-modal> */}

      <div
        className={
          'th-item-page ' + (layout.openTripItemModal.visible ? 'visivle' : '')
        }
      >
        <TripItemComponent
          onBack={onBackTripItemComponent}
          onTrip={() => {}}
          onDelete={onDeleteTripItemComponent}
          isShare={false}
          tripId={layout.openTripItemModal.id}
        />
      </div>
      <div
        className={
          'th-statistics-page ' +
          (layout.openStatisticsModal.visible ? 'visivle' : '')
        }
      >
        <StatisticsComponent
          statistics={
            tripStatistics?.filter((v) => v.type === type)?.[0]?.statistics
          }
        />
        {/* <TripItemComponent
					onBack={onBackTripItemComponent}
					onTrip={() => {}}
					onDelete={onDeleteTripItemComponent}
					isShare={false}
					tripId={tripId}
					shareKey=''
				/> */}
      </div>
    </div>
  )
}

export const TripListItemComponent = ({
  trip,
  type,
  onTap,
}: {
  trip: protoRoot.trip.ITrip
  type: TabsTripType
  onTap: (id: string) => void
}) => {
  const { t, i18n } = useTranslation('tripPage')
  const { config } = useSelector((state: RootState) => {
    const { config } = state
    return {
      config: config,
    }
  })

  const dispatch = useDispatch<AppDispatch>()

  return (
    <div
      ref={(e) => {
        e &&
          (e.onclick = () => {
            if (trip.status === 0) {
              // alert
            }
            onTap?.(trip.id || '')
          })
      }}
      className={'trip-list-item-component ' + config.deviceType}
    >
      <div className="th-l-i-left">
        <div className="th-l-i-l-title">
          <span>
            {t((trip.type || '')?.toLowerCase(), {
              ns: 'tripPage',
            })}
            {' · '}
            {formatDistance(trip.statistics?.distance || 0)}
          </span>

          {isResumeTrip(trip) ? (
            <div className="th-l-i-l-t-local">
              {t('resumeTrip', {
                ns: 'tripPage',
              })}
            </div>
          ) : (
            ''
          )}
          {trip.permissions?.customTrip ? (
            <div className="th-l-i-l-t-customTrip">
              {t('customTrip', {
                ns: 'tripPage',
              })}
            </div>
          ) : (
            ''
          )}
          {(trip.id || '').indexOf('IDB_') >= 0 ? (
            <div className="th-l-i-l-t-local">
              {t('local', {
                ns: 'tripPage',
              })}
            </div>
          ) : (
            ''
          )}
          {/* 
      {v.correctedData === 1 ? (
      ) : (
        ''
      )} */}

          <span
            style={{
              display: 'none',
            }}
            className="ti-d-tip"
          >
            {t('tripDataCanBeCorrected', {
              ns: 'tripPage',
            })}
          </span>
        </div>
        <div className="th-l-i-l-info">
          <span className="info-item">
            {t('duration', {
              ns: 'tripPage',
            })}{' '}
            {Number(trip.endTime || 0) > 0
              ? formatTime(Number(trip.startTime), Number(trip.endTime))
              : t('unfinished', {
                  ns: 'tripPage',
                })}
          </span>
          {/* <div className='info-item'>配速 10'05</div> */}

          {
            type === 'Walking' ||
            type === 'PowerWalking' ||
            type === 'Running' ? (
              <span className="info-item">
                {t('averagePace', {
                  ns: 'tripPage',
                })}{' '}
                {formatAvgPace(
                  trip.statistics?.distance || 0,
                  Number(trip.startTime) || 0,
                  Number(trip.endTime) || 0
                )}
              </span>
            ) : (
              <span className="info-item">
                {t(
                  config.deviceType === 'Mobile' ? 'avgSpeed' : 'averageSpeed',
                  {
                    ns: 'tripPage',
                  }
                )}{' '}
                {(trip?.statistics?.averageSpeed || 0) <= 0
                  ? 0
                  : Math.round(
                      ((trip?.statistics?.averageSpeed || 0) * 3600) / 100
                    ) / 10}{' '}
                km/h
              </span>
            )
            // config.deviceType !== 'Mobile' ? (
            // <div className='info-item'>
            // 	{t('averageSpeed', {
            // 		ns: 'tripPage',
            // 	})}{' '}
            // 	{(v?.statistics?.maxSpeed || 0) <= 0
            // 		? 0
            // 		: Math.round(
            // 				((v?.statistics?.maxSpeed || 0) * 3600) / 100
            // 		  ) / 10}{' '}
            // 	km/h
            // </div>
            // ) : (
            // 	''
            // )
          }

          {config.deviceType !== 'Mobile' ? (
            <span className="info-item">
              {t('maxSpeed', {
                ns: 'tripPage',
              })}{' '}
              {(trip?.statistics?.maxSpeed || 0) <= 0
                ? 0
                : Math.round(((trip?.statistics?.maxSpeed || 0) * 3600) / 100) /
                  10}{' '}
              km/h
            </span>
          ) : (
            ''
          )}

          {/* <div className='info-item'>平均时速 10'05</div> */}
        </div>
      </div>
      <div className="th-l-i-right">
        <div className="th-l-i-r-date">
          {trip.status === 1
            ? moment(Number(trip.createTime) * 1000).format('YYYY.MM.DD')
            : t('unfinished', {
                ns: 'tripPage',
              })}
        </div>
      </div>
      {/* <div className='th-i-header'>
<div className='th-i-h-icon'></div>
<div className='th-i-h-date'>
  {moment(Number(v.createTime) * 1000).format('YYYY-MM')}
</div>
</div>
<div className='th-i-content'>
<div></div>
</div> */}
    </div>
  )
}

export default TripHistoryComponent
