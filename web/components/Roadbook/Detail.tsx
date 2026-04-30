import { useTranslation } from 'react-i18next'
import { protoRoot } from '../../protos'
import { useSelector } from 'react-redux'
import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { regeo } from '../../store/city'
import { AppDispatch, methods, RootState } from '../../store'
import { httpApi } from '../../plugins/http/api'
import { AsyncQueue, Debounce, deepCopy, getShortId } from '@nyanyajs/utils'
import {
  SakiAsideModal,
  SakiButton,
  SakiIcon,
  SakiInput,
  SakiScrollLoading,
  SakiTitle,
} from '../saki-ui-react/components'
import NoSSR from '../NoSSR'
import { alert, bindEvent, multiplePrompts, snackbar } from '@saki-ui/core'
import { useRouter } from 'next/router'
import { useDispatch } from 'react-redux'
import axios from 'axios'
import moment from 'moment'
import { formatDurationI18n, stripHtmlTags } from '../../plugins/methods'
import { SearchWaypointModal } from './SearchWaypointModal'
import { DataContext, PolylineItem } from './Context'
import { storage } from '../../store/storage'
import { layoutSlice, loadModal } from '../../store/layout'
import { eventListener } from '../../store/config'

export const RoadBookDetailPage = ({ show }: { show: boolean }) => {
  const { t, i18n } = useTranslation('roadBookPage')

  const config = useSelector((state: RootState) => state.config)
  const user = useSelector((state: RootState) => state.user)

  const router = useRouter()

  const dispatch = useDispatch<AppDispatch>()

  const { state, setState } = useContext(DataContext)

  const d = useRef(new Debounce())

  const [id, setId] = useState('')
  const {
    roadBookItem,
    setRoadBookItem,
    loadStatus,
    setLoadStatus,
    expandTimelineIds,
  } = {
    roadBookItem: state.roadBookItem,
    loadStatus: state.loadDetailStatus,
    setRoadBookItem: (v: typeof state.roadBookItem) => {
      setState({
        roadBookItem: state.formatRB(v),
      })
    },
    setLoadStatus: (v: typeof state.loadDetailStatus) => {
      setState({
        loadDetailStatus: v,
      })
    },
    expandTimelineIds: state.expandTimelineIds,
  }

  const [lastUpdateTime, setLastUpdateTime] = useState(0)

  const [activeTLdDropdown, setActiveTLDropdown] = useState('')
  const [activeWPDropdown, setActiveWPDropdown] = useState('')

  const [expandAllTimelines, setExpandAllTimelines] = useState(false)

  const [navigationSettings, setNavigationSettings] = useState(false)

  const [copyTimelineId, setCopyTimelineId] = useState('')

  const { polylines, setPolylines } = {
    polylines: state.polylines,
    setPolylines: (v: typeof state.polylines) => {
      setState({
        polylines: v,
      })
    },
  }

  useEffect(() => {
    if (router.query?.id) {
      setId(String(router.query?.id))
    }
  }, [router])

  useEffect(() => {
    if (!show) {
      setState({
        roadBookItem: undefined,
      })
      return
    }
  }, [show])

  useEffect(() => {
    if (lastUpdateTime) {
      state.updateRoadbook()

      // setTimeout(() => {
      //   roadBookItem.timelines?.forEach((v) => {
      //     v?.waypoints?.forEach((sv) => {
      //       if (!sv.lastNavigationTime) {
      //         directionsToThisWaypoint(v?.id || '', sv?.id || '')
      //       }
      //     })
      //   })
      // }, 2000)
    }
  }, [lastUpdateTime])

  useEffect(() => {
    if (roadBookItem?.title && show) {
      const init = async () => {
        const aq = new AsyncQueue({
          maxQueueConcurrency: 1,
        })

        let allowLoadPolyline = true

        state.roadBookItem?.timelines?.some((v, i) => {
          allowLoadPolyline &&
            v.waypoints?.some((sv, si, sarr) => {
              const nextSItem = sarr[si + 1]
              if (Number(sv.lastNavigationTime) > 0 || !nextSItem) return

              console.log('polyline1', sv, nextSItem)

              allowLoadPolyline = false

              aq.increase(async () => {
                await directionsToThisWaypoint(v.id || '', sv.id || '')
              })

              return true
            })
        })
        aq.increase(async () => {})

        await aq.wait.waiting()

        allowLoadPolyline && (await loadWaypointsNavigationPolylines())
      }
      init()
    }
  }, [state.roadBookItem, show])

  const { timelineDays } = useMemo(() => {
    return {
      timelineDays: state.initTimelineDays(state.roadBookItem),
    }
  }, [state.roadBookItem])

  useEffect(() => {
    console.log('GetRoadbookDetail show', id, roadBookItem)
    if (show && id && user.isInit) {
      dispatch(
        layoutSlice.actions.setOpenAiChatModalInfo({
          id: id,
          type: 'roadbook',
          subtitle: t('aiModelSubtitle', {
            ns: 'roadBookPage',
          }),
        })
      )

      d.current.increase(() => {
        const f = () => {
          console.log('AIRoadbook update_roadbook')
          getDetail()
        }
        eventListener.on('AIRoadbookAgent:update_roadbook', f)
        eventListener.on('AIRoadbookAgent:"update_roadbook_detail', f)
        eventListener.on('AIRoadbookAgent:update_roadbook_timeline', f)
        getDetail()
      }, 100)
    }
  }, [id, user.isInit, show])

  const {
    straightLineDistanceToNextwaypoint,
    getStraightLineDistanceToNextwaypoint,
  } = useMemo(() => {
    return state.getStraightLineDistanceToNextwaypoint(state.roadBookItem)
  }, [state.roadBookItem?.timelines])

  const aq = useRef(
    new AsyncQueue({
      maxQueueConcurrency: 3,
    })
  )

  const loadWaypointsNavigationPolylinesDeb = useRef(new Debounce())

  const loadWaypointsNavigationPolylines = async () => {
    loadWaypointsNavigationPolylinesDeb.current.increase(async () => {
      let tempPolylines = deepCopy(polylines)

      // console.log('loadWaypointsNavigationPolylines renderPolyline')

      let loadBaseData: ReturnType<typeof snackbar> | undefined
      loadBaseData = snackbar({
        message: i18n.t('renderingTracks', {
          ns: 'roadBookPage',
        }),
        vertical: 'top',
        horizontal: 'center',
        backgroundColor: 'var(--saki-default-color)',
        color: '#fff',
      })

      aq.current.increase(async () => {})

      let renderedNum = 0
      roadBookItem?.timelines?.forEach((v) => {
        v.waypoints?.forEach((sv) => {
          let isexits = false

          tempPolylines.some((ssv) => {
            if (
              ssv.timelineId === v.id &&
              ssv.waypointId === sv.id &&
              ssv.polyline.length
            ) {
              isexits = true
              return true
            }
            return false
          })

          if (
            !isexits &&
            sv.navigation?.duration &&
            sv.navigation?.urls?.domainUrl
          ) {
            // console.log('polyline1 isexits', sv)
            aq.current.increase(async () => {
              renderedNum === 0 && loadBaseData?.open()
              renderedNum++
              loadBaseData?.setMessage(
                i18n.t('tracksRendered', {
                  ns: 'roadBookPage',
                  num: renderedNum,
                })
              )

              let polyline = await storage.navigationPolylines.get(
                sv.navigation?.urls?.shortUrl || ''
              )

              // console.log('res navigationPolylines polylines', polyline)
              if (!polyline) {
                const res = await axios({
                  method: 'GET',
                  url:
                    (sv.navigation?.urls?.domainUrl || '') +
                    sv.navigation?.urls?.shortUrl,
                })
                // console.log(
                //   'res polyline1',
                //   v,
                //   sv,
                //   res.data?.features?.[0]?.geometry?.coordinates?.length
                // )
                polyline = {
                  timelineId: v.id || '',
                  waypointId: sv.id || '',
                  polyline: res.data?.features?.[0]?.geometry?.coordinates?.map(
                    (v: any) => {
                      return {
                        lat: v[1],
                        lng: v[0],
                      }
                    }
                  ),
                }
                await storage.navigationPolylines.set(
                  sv.navigation?.urls?.shortUrl || '',
                  polyline,
                  60 * 15
                )
              }
              // await storage.navigationPolylines.delete(
              //   sv.navigation?.urls?.shortUrl || ''
              // )
              tempPolylines = (tempPolylines || []).concat(polyline)
            })
          }
        })
      })

      await aq.current.wait.waiting()

      tempPolylines = tempPolylines.filter((v) => {
        let isexits = false
        roadBookItem?.timelines?.some((sv) => {
          if (v.timelineId === sv.id) {
            sv.waypoints?.some((ssv) => {
              // console.log('polyline1', ssv)
              if (v.waypointId === ssv.id && ssv.navigation?.distance) {
                isexits = true
                return true
              }
            })

            return true
          }
        })
        return isexits
      })

      setPolylines(tempPolylines)
      loadBaseData?.close()

      // console.log(
      //   'polylines renderPolyline',
      //   tempPolylines,
      //   roadBookItem?.timelines
      // )
    }, 300)
  }

  const expandWaypointsAnimate = (id: string, isExpand: boolean) => {
    const el = document.querySelector(`.rdt-item.${id}`) as HTMLDivElement
    if (!el) return

    const hEl = el?.querySelector('.item-header') as HTMLDivElement
    const hElH = hEl?.clientHeight || 0

    const wEl = el?.querySelector('.rdti-waypoints') as HTMLDivElement

    let wElH = 0
    if (wEl?.children?.length) {
      for (let i = 0; i < wEl?.children?.length; i++) {
        wElH += wEl?.children.item(i)?.clientHeight || 0
      }
    }

    const options = {
      duration: 300,
      easing: 'linear',
      iterations: 1,
      direction: 'normal',
      // fill: 'forwards',
    }

    el?.animate(
      [
        { height: `${isExpand ? hElH + wElH : hElH}px` },
        { height: `${!isExpand ? hElH + wElH : hElH}px` },
      ],
      options as any
    )

    const a2 = wEl?.animate(
      [
        { height: `${isExpand ? wElH : 0}px` },
        { height: `${!isExpand ? wElH : 0}px` },
      ],
      options as any
    )

    if (a2) {
      a2.onfinish = () => {
        if (wEl) {
          // wEl.style
        }
      }
    }
  }

  const getDetail = async () => {
    if (loadStatus === 'loading' || loadStatus === 'noMore') return

    setLoadStatus('loading')

    const res = await httpApi.v1.GetRoadbookDetail({
      id,
    })
    console.log('GetRoadbookDetail res', id, res, router)

    setLoadStatus('loaded')
    if (res.code === 200) {
      if (res.data?.roadbook && location.href.includes(id)) {
        setRoadBookItem(res.data.roadbook)
      }

      // setTimeout(() => {
      //   loadModal('AiChatModal', () => {
      //     dispatch(
      //       layoutSlice.actions.setOpenAiChatModal({
      //         visible: true,
      //         id: id,
      //         // title: t('aiModelTitle', {
      //         //   ns: 'roadBookPage',
      //         // }),
      //         subtitle: t('aiModelSubtitle', {
      //           ns: 'roadBookPage',
      //         }),
      //       })
      //     )
      //     // setTimeout(async () => {
      //     //   const res1 = await httpApi.v1.AIRoadbook(
      //     //     {
      //     //       id,
      //     //       messages: ['SpaceX是什么？'],
      //     //       // messages: ['帮我修改标题为 渝东北自驾游'],
      //     //     },
      //     //     (type, res) => {
      //     //       console.log('AIRoadbook res', type, deepCopy(res))
      //     //     }
      //     //   )

      //     //   console.log('AIRoadbook res1', res1)
      //     // }, 1500)
      //     return
      //   })
      // }, 1000)

      return
    }

    snackbar({
      message: res.msg + ';' + res.error,
      autoHideDuration: 2000,
      vertical: 'top',
      horizontal: 'center',
    }).open()
  }

  const addTimeline = async (id?: string) => {
    const timelines = (roadBookItem?.timelines || []).reduce((t, v, i, arr) => {
      t.push(v)

      if ((!id && i === arr.length - 1) || (id && v.id === id)) {
        t.push({
          id: getShortId(11),
          title: '',
          desc: '',
          days: 1,
          waypoints: [],
        })
      }

      return t
    }, [] as protoRoot.roadbook.IRoadbookTimelineItem[])
    setRoadBookItem({
      ...roadBookItem,
      timelines: timelines.length
        ? timelines
        : [
            {
              id: getShortId(11),
              title: '',
              desc: '',
              days: 1,
              waypoints: [],
            },
          ],
    })

    setLastUpdateTime(new Date().getTime())
  }

  const updateTimelineDays = async (tlId: string) => {
    let days =
      roadBookItem?.timelines?.filter((v) => v.id === tlId)?.[0]?.days || 1

    const d = new Debounce()
    const mp1 = multiplePrompts({
      title: t('setDays'),
      content: '',
      multipleInputs: [
        {
          label: 'Days',
          value: String(days),
          placeholder: `${t('setDays')}`,
          type: 'Text',
          // border: '1px solid #eee',
          placeholderAnimation: 'MoveUp',
          margin: '4px 0',
          borderRadius: '4px',
          closeIcon: false,
          onClear() {
            console.log('clear')
            days = 0
          },
          onChange(value) {
            if (!value) {
              days = 0
              mp1.setInput({
                label: 'Days',
                type: 'value',
                v: 0,
              })
              return
            }
            days = Number(value.trim())

            d.increase(() => {
              days = days < 1 ? 1 : days
              mp1.setInput({
                label: 'Days',
                type: 'value',
                v: days,
              })
            }, 700)

            return
          },
        },
      ],
      closeIcon: true,
      flexButton: false,
      buttons: [
        {
          label: 'Save',
          text: t('save', {
            ns: 'prompt',
          }),
          type: 'Primary',
          async onTap() {
            setRoadBookItem({
              ...roadBookItem,
              timelines: roadBookItem?.timelines?.map((v) => {
                if (v.id === tlId) {
                  return {
                    ...v,
                    days: days,
                  }
                }
                return v
              }),
            })

            setLastUpdateTime(new Date().getTime())

            mp1.close()
          },
        },
      ],
    })
    mp1.open()
  }

  const updateTimelineDesc = async (tlId: string) => {
    let oldDesc =
      roadBookItem?.timelines?.filter((v) => v.id === tlId)?.[0]?.desc || ''

    const mp1 = multiplePrompts({
      title: t(oldDesc ? 'updateDesc' : 'addDesc'),
      content: '',
      multipleInputs: [
        {
          label: 'Desc',
          value: oldDesc,
          placeholder: `${t('todayDesc')}`,
          type: 'Text',
          // border: '1px solid #eee',
          placeholderAnimation: 'MoveUp',
          margin: '4px 0',
          borderRadius: '4px',
          closeIcon: false,
          onClear() {
            console.log('clear')
            oldDesc = ''
          },
          onChange(value) {
            if (!value) {
              oldDesc = ''
              return
            }
            oldDesc = value.trim()

            return
          },
        },
      ],
      closeIcon: true,
      flexButton: false,
      buttons: [
        {
          label: 'Save',
          text: t('save', {
            ns: 'prompt',
          }),
          type: 'Primary',
          async onTap() {
            setRoadBookItem({
              ...roadBookItem,
              timelines: roadBookItem?.timelines?.map((v) => {
                if (v.id === tlId) {
                  return {
                    ...v,
                    desc: oldDesc,
                  }
                }
                return v
              }),
            })

            setLastUpdateTime(new Date().getTime())

            mp1.close()
          },
        },
      ],
    })
    mp1.open()
  }

  const updateWaypointAddress = async (
    title: string,
    tlId: string,
    wpId: string
  ) => {
    const mp1 = multiplePrompts({
      title: t('updateWaypointAddress'),
      content: '',
      multipleInputs: [
        {
          label: 'title',
          value: title,
          placeholder: `${t('updateWaypointAddress')}`,
          type: 'Text',
          // border: '1px solid #eee',
          placeholderAnimation: 'MoveUp',
          margin: '4px 0',
          borderRadius: '4px',
          closeIcon: false,
          onClear() {
            console.log('clear')
            title = ''
          },
          onChange(value) {
            if (!value) {
              title = ''
              return
            }
            title = value.trim()

            return
          },
        },
      ],
      closeIcon: true,
      flexButton: false,
      buttons: [
        {
          label: 'Save',
          text: t('save', {
            ns: 'prompt',
          }),
          type: 'Primary',
          async onTap() {
            setRoadBookItem({
              ...roadBookItem,
              timelines: roadBookItem?.timelines?.map((v) => {
                if (v.id === tlId) {
                  return {
                    ...v,
                    waypoints: v.waypoints?.map((sv) => {
                      if (sv.id === wpId) {
                        return {
                          ...sv,
                          address: title,
                        }
                      }
                      return sv
                    }),
                  }
                }
                return v
              }),
            })

            setLastUpdateTime(new Date().getTime())

            mp1.close()
          },
        },
      ],
    })
    mp1.open()
  }

  const deleteTimeline = async () => {
    alert({
      title: t('deleteTimeline', {
        ns: 'roadBookPage',
      }),
      content: t('deleteTimelineContent', {
        ns: 'roadBookPage',
      }),
      cancelText: t('cancel', {
        ns: 'prompt',
      }),
      confirmText: t('delete', {
        ns: 'prompt',
      }),
      onCancel() {},
      async onConfirm() {
        setRoadBookItem({
          ...roadBookItem,
          timelines: (roadBookItem?.timelines || []).filter(
            (v) => v.id !== activeTLdDropdown
          ),
        })

        setLastUpdateTime(new Date().getTime())

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
      },
    }).open()
  }

  const addWaypoints = async (
    waypoints: protoRoot.roadbook.IRoadbookWaypointItem
  ) => {
    setState({
      roadBookItem: {
        ...roadBookItem,
        timelines: roadBookItem?.timelines?.map((v) => {
          if (v.id === state.selectedTimelineId) {
            const lastWp = v.waypoints?.[Number(v.waypoints?.length) - 1]
            return {
              ...v,
              waypoints: (v.waypoints || [])?.concat({
                ...waypoints,
                navigation: {
                  ...waypoints.navigation,
                  distance: 0,
                },
              }),
            }
          }
          return v
        }),
      },
      selectedTimelineId: '',
    })

    setLastUpdateTime(new Date().getTime())
  }

  const updateWaypoints = async (
    tlId: string,
    wId: string,
    waypoints: protoRoot.roadbook.IRoadbookWaypointItem
  ) => {
    let curIndex = -1
    setState({
      roadBookItem: {
        ...roadBookItem,
        timelines: roadBookItem?.timelines?.map((v) => {
          if (v.id === tlId) {
            return {
              ...v,
              waypoints: (v.waypoints || [])
                ?.map((sv, si, sarr) => {
                  // if (sarr?.[si - 1]) {
                  //   return state.deleteNavigationData(v)
                  // }

                  if (sv.id === wId) {
                    curIndex = si
                    waypoints.navigation = {
                      distance: 0,
                      duration: 0,
                      travelMode: '',
                      urls: {
                        domainUrl: '',
                        shortUrl: '',
                        url: '',
                      },
                    }
                    return waypoints
                  }
                  return sv
                })
                .map((sv, si, sarr) => {
                  if (curIndex > 0 && si === curIndex - 1) {
                    return state.deleteNavigationData(sv)
                  }
                  return sv
                }),
            }
          }
          return v
        }),
      },

      updateWaypointId: '',
      selectedTimelineId: '',
    })

    setLastUpdateTime(new Date().getTime())
  }

  const addNewWaypointAfterThisWaypointId = async (
    tlId: string,
    oldWpId: string,
    waypoints: protoRoot.roadbook.IRoadbookWaypointItem
  ) => {
    setState({
      roadBookItem: {
        ...roadBookItem,
        timelines: roadBookItem?.timelines?.map((v) => {
          if (v.id === tlId) {
            return {
              ...v,
              waypoints: (v.waypoints || [])?.reduce((t, sv, si, sarr) => {
                if (sv.id === oldWpId) {
                  t.push(state.deleteNavigationData(sv))
                  t.push(waypoints)
                } else {
                  t.push(sv)
                }
                return t
              }, [] as protoRoot.roadbook.IRoadbookWaypointItem[]),
            }
          }
          return v
        }),
      },

      updateWaypointId: '',
      selectedTimelineId: '',
    })

    setLastUpdateTime(new Date().getTime())
  }

  const deleteWaypoints = async (tlId: string, wpId: string) => {
    alert({
      title: t('deleteWaypoint', {
        ns: 'roadBookPage',
      }),
      content: t('deleteWaypointContent', {
        ns: 'roadBookPage',
      }),
      cancelText: t('cancel', {
        ns: 'prompt',
      }),
      confirmText: t('delete', {
        ns: 'prompt',
      }),
      onCancel() {},
      async onConfirm() {
        setState({
          ...state,
          roadBookItem: {
            ...roadBookItem,
            timelines: roadBookItem?.timelines?.map((v) => {
              if (v.id === tlId) {
                return {
                  ...v,
                  waypoints: v.waypoints?.reduce((t, sv, si, sarr) => {
                    if (sv.id !== wpId) {
                      t.push(sv)
                    } else {
                      if (t[t.length - 1]) {
                        t[t.length - 1] = state.deleteNavigationData(
                          t[t.length - 1]
                        )
                      }
                    }
                    return t
                  }, [] as protoRoot.roadbook.IRoadbookWaypointItem[]),
                }
              }
              return v
            }),
          },
          polylines: state.polylines.filter(
            (v) => !(v.timelineId === tlId && v.waypointId === wpId)
          ),
        })

        setLastUpdateTime(new Date().getTime())

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
      },
    }).open()
  }

  const [loadNavigationDataConfig, setLoadNavigationDataConfig] = useState({
    timelineId: '',
    waypointId: '',
  })

  const directionsToThisWaypoint = async (tlId: string, wpId: string) => {
    if (
      loadNavigationDataConfig.timelineId ||
      loadNavigationDataConfig.waypointId
    )
      return

    setLoadNavigationDataConfig({
      timelineId: tlId,
      waypointId: wpId,
    })

    const res = await httpApi.v1.GetNavigationData({
      waypoints: roadBookItem?.timelines?.reduce((t, v) => {
        if (v.id === tlId) {
          v.waypoints?.some((sv, si, arr) => {
            if (sv.id === wpId) {
              t.push({
                latitude: arr[si + 1].coords?.latitude,
                longitude: arr[si + 1].coords?.longitude,
              })
              t.push({
                latitude: sv.coords?.latitude,
                longitude: sv.coords?.longitude,
              })

              // console.log('renderPolyline', sv, arr[si + 1], t)
              return true
            }
          })
        }
        return t
      }, [] as protoRoot.navigation.GetNavigationData.Request.ICoords[]),
      routeOptions: config?.configure?.navigation?.routeOptions || [],
      travelOptions:
        config?.configure?.navigation?.travelOptions || 'driving-car',
      preference: config?.configure?.navigation?.preference || 'recommended',
    })

    console.log(
      'GetNavigationData renderPolyline res',
      res,
      config.configure.navigation
    )

    setLoadNavigationDataConfig({
      timelineId: '',
      waypointId: '',
    })

    if (res?.code === 200 && res.data?.navigationData) {
      setState({
        roadBookItem: {
          ...roadBookItem,
          timelines: roadBookItem?.timelines?.map((v) => {
            if (v.id === tlId) {
              return {
                ...v,
                waypoints: (v?.waypoints || []).map((sv) => {
                  if (sv.id === wpId) {
                    return {
                      ...sv,
                      navigation: res.data.navigationData,
                      lastNavigationTime: moment().unix(),
                    }
                  }
                  return sv
                }),
              }
            }
            return v
          }),
        },
        polylines: state.polylines.filter(
          (v) => !(v.timelineId === tlId && v.waypointId === wpId)
        ),
      })
      setLastUpdateTime(new Date().getTime())

      // setTimeout(() => {
      // console.log('res polylines showPolyline', tlId, wpId)
      // state.showPolyline(tlId, wpId)
      // }, 100)
    } else {
      setState({
        roadBookItem: {
          ...roadBookItem,
          timelines: roadBookItem?.timelines?.map((v) => {
            if (v.id === tlId) {
              return {
                ...v,
                waypoints: (v?.waypoints || []).map((sv) => {
                  if (sv.id === wpId) {
                    return {
                      ...sv,
                      lastNavigationTime: moment().unix(),
                    }
                  }
                  return sv
                }),
              }
            }
            return v
          }),
        },
        polylines: state.polylines.filter(
          (v) => !(v.timelineId === tlId && v.waypointId === wpId)
        ),
      })
    }
  }

  const deleteWaypointsNavigation = (tlId: string, wpId: string) => {
    setRoadBookItem({
      ...roadBookItem,
      timelines: roadBookItem?.timelines?.map((v) => {
        if (v.id === tlId) {
          return {
            ...v,
            waypoints: (v?.waypoints || []).map((sv) => {
              // console.log('deleteWaypointsNavigation renderPolyline', sv, wpId)
              if (sv.id === wpId) {
                return {
                  ...state.deleteNavigationData(sv),
                  lastNavigationTime: sv.lastNavigationTime,
                }
              }
              return sv
            }),
          }
        }
        return v
      }),
    })
    setLastUpdateTime(new Date().getTime())
  }

  const [expandDesc, setExpandDesc] = useState(false)
  const descEl = useRef<HTMLDivElement>(null)

  return (
    <div className={`roadbook-detail-page scrollBarHover page-transition`}>
      {state.historyVersion.selectedVersion >= 0 ? (
        <div className="rb-confirmversion">
          <saki-button
            ref={bindEvent({
              tap: () => {
                setState({
                  ...state,
                  roadBookItem: state.historyVersion.oldRB,
                  historyVersion: {
                    ...state.historyVersion,
                    oldRB: undefined,
                    selectedVersion: -1,
                  },
                })
              },
            })}
            height="40px"
            type="Normal"
            bg-color="#eee"
            bg-hover-color="#ddd"
            bg-active-color="#ccc"
            border-radius={'10px 0 0 10px'}
            loading={loadStatus === 'loading'}
          >
            {t('cancel', {
              ns: 'prompt',
            })}
          </saki-button>
          <saki-button
            ref={bindEvent({
              tap: () => {
                setState({
                  ...state,
                  historyVersion: {
                    ...state.historyVersion,
                    oldRB: undefined,
                    selectedVersion: -1,
                  },
                })

                setLastUpdateTime(new Date().getTime())
              },
            })}
            height="40px"
            padding="10px 10px"
            type="Primary"
            border-radius={'0 10px 10px 0'}
            loading={loadStatus === 'loading'}
          >
            <div className="rbc-confirm">
              <span>
                {t('comfirVersion', {
                  ns: 'roadBookPage',
                })}
              </span>
              <span>
                {moment(state.historyVersion.selectedVersion * 1000).format(
                  'YYYY.MM.DD HH:mm:ss'
                )}
              </span>
            </div>
          </saki-button>
        </div>
      ) : (
        ''
      )}

      <div className="rd-header">
        {/* <div className="rdh-date">2026.01.01 - 2026.01.02</div>
        <div className="rdh-title">{roadBookItem?.title}</div> */}
        <div className={`rdh-desc`}>
          <div
            ref={descEl}
            className={`rdhd-desc ${expandDesc ? '' : 'text-three-elipsis'}`}
            dangerouslySetInnerHTML={{
              __html: roadBookItem?.desc || '',
            }}
          ></div>

          {!expandDesc &&
          Number(descEl.current?.scrollHeight) >
            Number(descEl.current?.clientHeight) ? (
            <div
              className="rdhd-expand"
              onClick={() => {
                setExpandDesc(!expandDesc)
              }}
            >
              {t(!expandDesc ? 'expand' : '', {
                ns: 'prompt',
              })}
            </div>
          ) : (
            ''
          )}
        </div>
        <div className="rdh-data">
          <span>
            {t('dataFull', {
              ns: 'roadBookPage',
              day: state.getTimelineDays(timelineDays, roadBookItem?.id || '')
                .daysIntoTrip,
              distance: `${
                Math.round(
                  (roadBookItem?.timelines?.reduce((t, v) => {
                    v.waypoints?.forEach((sv, si, arr) => {
                      t +=
                        Number(sv.navigation?.distance) ||
                        getStraightLineDistanceToNextwaypoint(
                          v.id || '',
                          sv.id || ''
                        )
                    })
                    return t
                  }, 0) || 0) / 10
                ) / 100
              }${t('km', {
                ns: 'unit',
              })}`,
              time: formatDurationI18n(
                roadBookItem?.timelines?.reduce((t, v) => {
                  v.waypoints?.forEach((sv, si, arr) => {
                    t += Number(sv.navigation?.duration) || 0
                  })
                  return t
                }, 0) ||
                  0 ||
                  0,
                false,
                ['h', 'm', 's']
              ),
              waypoints:
                roadBookItem?.timelines?.reduce((t, v) => {
                  v.waypoints?.forEach((sv) => {
                    t += 1
                  })
                  return t
                }, 0) || 0,
            })}
          </span>
        </div>
      </div>

      <div className="rd-timelines ">
        <div className="rdt-header">
          <div className="rdth-left">
            <div className="rdth-title">{t('timeline')}</div>
          </div>
          <div className="rdth-right">
            <NoSSR>
              <SakiButton
                onTap={() => {
                  state.roadBookItem && state.share(state.roadBookItem)
                }}
                type="CircleIconGrayHover"
              >
                <SakiIcon
                  width="14px"
                  height="14px"
                  color={
                    state.roadBookItem?.permissions?.allowShare
                      ? '#999'
                      : '#ccc'
                  }
                  type="Share"
                ></SakiIcon>
              </SakiButton>
              {user.userInfo.uid === roadBookItem?.authorId ? (
                <saki-dropdown
                  visible={navigationSettings}
                  floating-direction="Left"
                  ref={bindEvent({
                    close: () => {
                      setNavigationSettings(false)
                    },
                  })}
                >
                  <saki-button
                    ref={bindEvent({
                      tap: () => {
                        setNavigationSettings(true)
                      },
                    })}
                    type="CircleIconGrayHover"
                  >
                    <saki-icon
                      width="12px"
                      height="12px"
                      color="#999"
                      type="Route"
                    ></saki-icon>
                  </saki-button>
                  <div slot="main">
                    <div className="navigationsettings-dp">
                      {/* <div className="nd-header">
                      <div className="ndh-left">
                        <span>{t('navigationSettings')}</span>
                      </div>
                    </div> */}

                      <SakiTitle margin="0 0 4px 0" level={5} color="default">
                        {t('routeOptions')}
                      </SakiTitle>

                      <div className="nd-list">
                        {[
                          'recommended',
                          'highways',
                          'tollways',
                          'ferries',
                          'fords',
                          'fastest',
                          'shortest',
                        ].map((v, i) => {
                          return (
                            <div
                              ref={
                                bindEvent({
                                  click: () => {
                                    const tempConfigure = {
                                      ...config.configure,
                                      navigation: {
                                        ...config.configure.navigation,
                                      },
                                    }
                                    if (
                                      v === 'recommended' ||
                                      v === 'fastest' ||
                                      v === 'shortest'
                                    ) {
                                      tempConfigure.navigation.routeOptions = []
                                      tempConfigure.navigation.preference = v
                                    } else {
                                      tempConfigure.navigation.preference = ''
                                      tempConfigure.navigation.routeOptions =
                                        !config.configure.navigation?.routeOptions?.includes(
                                          v
                                        )
                                          ? (
                                              config.configure.navigation
                                                ?.routeOptions || []
                                            ).concat(v)
                                          : config.configure.navigation?.routeOptions?.filter(
                                              (sv) => sv !== v
                                            )
                                    }
                                    dispatch(
                                      methods.config.SetConfigure(tempConfigure)
                                    )
                                  },
                                }) as any
                              }
                              className={
                                'ndl-item ' +
                                (config.configure.navigation?.routeOptions?.includes(
                                  v
                                ) ||
                                config.configure.navigation?.preference === v
                                  ? 'active'
                                  : '')
                              }
                              key={i}
                            >
                              {t(v)}
                            </div>
                          )
                        })}
                      </div>

                      <SakiTitle margin="0 0 4px 0" level={5} color="default">
                        {t('travelOptions')}
                      </SakiTitle>

                      <div className="nd-list">
                        {[
                          'driving-car',
                          'driving-hgv',
                          'cycling-regular',
                          'foot-walking',
                          'cycling-electric',
                        ].map((v, i) => {
                          return (
                            <div
                              ref={
                                bindEvent({
                                  click: () => {
                                    dispatch(
                                      methods.config.SetConfigure({
                                        ...config.configure,
                                        navigation: {
                                          ...config.configure.navigation,
                                          travelOptions: v,
                                        },
                                      })
                                    )
                                  },
                                }) as any
                              }
                              className={
                                'ndl-item ' +
                                (config.configure.navigation?.travelOptions ===
                                v
                                  ? 'active'
                                  : '')
                              }
                              key={i}
                            >
                              {t(v)}
                            </div>
                          )
                        })}
                      </div>

                      <div className="nd-buttons">
                        <SakiButton
                          onTap={() => {
                            alert({
                              title: t('resetNavigationRoute', {
                                ns: 'roadBookPage',
                              }),
                              content: t('resetNavigationRouteContent', {
                                ns: 'roadBookPage',
                              }),
                              cancelText: t('cancel', {
                                ns: 'prompt',
                              }),
                              confirmText: t('confirm', {
                                ns: 'prompt',
                              }),
                              onCancel() {},
                              async onConfirm() {
                                setState({
                                  roadBookItem: {
                                    ...roadBookItem,
                                    timelines:
                                      state.roadBookItem?.timelines?.map(
                                        (v) => {
                                          v.waypoints = v.waypoints?.map(
                                            (sv) => {
                                              return {
                                                ...sv,
                                                lastNavigationTime: -1,
                                              }
                                            }
                                          )

                                          return v
                                        }
                                      ),
                                  },
                                })

                                setNavigationSettings(false)
                              },
                            }).open()
                          }}
                          margin="20px 10px 0"
                          padding="6px 18px"
                          height="36px"
                          type="Primary"
                        >
                          <span>
                            {t('reset', {
                              ns: 'prompt',
                            })}
                          </span>
                        </SakiButton>
                        <SakiButton
                          onTap={() => {
                            setNavigationSettings(false)
                          }}
                          margin="20px 0 0"
                          padding="6px 18px"
                          height="36px"
                          type="Normal"
                        >
                          <span>
                            {t('confirm', {
                              ns: 'prompt',
                            })}
                          </span>
                        </SakiButton>
                      </div>
                    </div>
                  </div>
                </saki-dropdown>
              ) : (
                ''
              )}

              <SakiButton
                onTap={() => {
                  if (!expandAllTimelines) {
                    setState({
                      expandTimelineIds:
                        roadBookItem?.timelines?.map((v) => {
                          expandWaypointsAnimate(v.id || '', false)
                          return v.id || ''
                        }) || [],
                    })
                  } else {
                    roadBookItem?.timelines?.forEach((v) => {
                      expandWaypointsAnimate(v.id || '', true)
                      return v.id || ''
                    }) || []
                    setState({
                      expandTimelineIds: [],
                    })
                  }

                  setExpandAllTimelines(!expandAllTimelines)
                }}
                width="30px"
                height="30px"
                bg-color="transparent"
                type="CircleIconGrayHover"
              >
                <div
                  style={{
                    transition: 'all .3s',
                    transform: `rotate(${expandAllTimelines ? '180deg' : '0deg'})`,
                  }}
                >
                  <SakiIcon
                    width="12px"
                    height="12px"
                    color="#999"
                    type="Bottom"
                  ></SakiIcon>
                </div>
              </SakiButton>
            </NoSSR>
          </div>
        </div>

        <div className="rdt-main ">
          {roadBookItem?.timelines?.map((v, i, arr) => {
            let maxCreateTripTime = 0
            let minCreateTripTime = 9999999999

            let shortDesc = stripHtmlTags(v?.desc || '')

            if (shortDesc.length >= 50) {
              shortDesc = shortDesc.slice(0, 50) + '...'
            }

            const cityArr =
              v.waypoints
                ?.reduce((t, sv) => {
                  const city = sv.city?.region || sv.city?.state || ''
                  if (!t.includes(city)) {
                    t.push(city)
                  }

                  return t
                }, [] as string[])
                .reduce((t, sv, si, arr) => {
                  t.push(sv)
                  if (si < arr.length - 1) {
                    t.push('')
                  }

                  return t
                }, [] as string[]) || []

            const isExpand = expandTimelineIds.includes(v?.id || '')

            const tlDistance = v.waypoints?.reduce((t, ssv, i, arr) => {
              t =
                t +
                (ssv?.navigation?.distance ||
                  getStraightLineDistanceToNextwaypoint(
                    v.id || '',
                    ssv.id || ''
                  ))
              return t
            }, 0)

            const timelineDaysItem = state.getTimelineDays(
              timelineDays,
              v.id || ''
            )

            return (
              <div
                className={`rdt-item ${v.id} ${isExpand ? 'expand' : ''}`}
                key={i}
              >
                <div
                  className={
                    'item-header D' +
                    String(timelineDaysItem.daysIntoTrip).length
                  }
                  data-day={`D${timelineDaysItem.daysIntoTrip}`}
                >
                  <div className="ih-left">
                    <span
                      title={`已驶过${Math.round(timelineDaysItem.distanceTraveled / 10) / 100}公里`}
                      className="ihl-date"
                    >
                      {`${timelineDaysItem.startDate}${
                        (v.days || 0) > 1
                          ? ` · ${t('durationInDays', {
                              days: v.days || 1,
                            })}`
                          : ''
                      }${
                        tlDistance
                          ? ` · ${Math.round((tlDistance || 0) / 10) / 100}${t(
                              'km',
                              {
                                ns: 'unit',
                              }
                            )}`
                          : ''
                      }`}
                    </span>
                    <div
                      title={cityArr?.join(' ')}
                      className="ihl-title text-two-elipsis"
                    >
                      {v.title ? (
                        <span>{v.title}</span>
                      ) : (
                        cityArr.map((v, i) => {
                          return v === '' ? (
                            <div
                              style={{
                                display: 'inline-block',
                              }}
                              key={i}
                            >
                              <saki-icon
                                width="12px"
                                height="12px"
                                margin={'0 2px'}
                                color="#999"
                                type="Arrive"
                              ></saki-icon>
                            </div>
                          ) : (
                            <span key={i}>{v}</span>
                          )
                        })
                      )}
                    </div>
                  </div>

                  <div className="ih-right">
                    {user.userInfo.uid === roadBookItem.authorId ? (
                      <saki-dropdown
                        visible={activeTLdDropdown === v.id}
                        floating-direction="Left"
                        ref={bindEvent({
                          close: () => {
                            setActiveTLDropdown('')
                          },
                        })}
                      >
                        <saki-button
                          ref={bindEvent({
                            tap: () => {
                              setActiveTLDropdown(v.id || '')
                            },
                          })}
                          width="30px"
                          height="30px"
                          bg-color="transparent"
                          type="CircleIconGrayHover"
                        >
                          <saki-icon
                            // width='14px'
                            // height='14px'
                            color="#999"
                            type="More"
                          ></saki-icon>
                        </saki-button>
                        <div slot="main">
                          <saki-menu
                            ref={bindEvent({
                              selectvalue: async (e) => {
                                console.log(e.detail.value)
                                switch (e.detail.value) {
                                  case 'AddDays':
                                    updateTimelineDays(activeTLdDropdown)
                                    break
                                  case 'AddDesc':
                                    updateTimelineDesc(activeTLdDropdown)
                                    break
                                  case 'Delete':
                                    deleteTimeline()
                                    break
                                  case 'AddNewDayAfterThisTimeline':
                                    addTimeline(v.id || '')
                                    break
                                  case 'CopyThisTimeline':
                                    setCopyTimelineId(v.id || '')
                                    break
                                  case 'PasteAfterThisTimeline':
                                    let copyItem: protoRoot.roadbook.IRoadbookTimelineItem

                                    setRoadBookItem({
                                      ...roadBookItem,
                                      timelines: (roadBookItem?.timelines || [])
                                        .filter((v) => {
                                          if (v.id === copyTimelineId) {
                                            copyItem = v
                                            return false
                                          }
                                          return true
                                        })
                                        .reduce((t, sv, i, arr) => {
                                          t.push(sv)

                                          if (v.id === sv.id) {
                                            t.push(copyItem)
                                          }

                                          return t
                                        }, [] as protoRoot.roadbook.IRoadbookTimelineItem[]),
                                    })
                                    setLastUpdateTime(new Date().getTime())

                                    break
                                  case 'MoveUp':
                                    const timelines =
                                      state.roadBookItem?.timelines || []
                                    ;[timelines[i], timelines[i - 1]] = [
                                      timelines[i - 1],
                                      timelines[i],
                                    ]
                                    setState({
                                      roadBookItem: {
                                        ...state.roadBookItem,
                                        timelines: [...timelines],
                                      },
                                    })
                                    setLastUpdateTime(new Date().getTime())
                                    break
                                  case 'MoveDown':
                                    const timelines2 =
                                      state.roadBookItem?.timelines || []
                                    ;[timelines2[i], timelines2[i + 1]] = [
                                      timelines2[i + 1],
                                      timelines2[i],
                                    ]
                                    setState({
                                      roadBookItem: {
                                        ...state.roadBookItem,
                                        timelines: [...timelines2],
                                      },
                                    })
                                    setLastUpdateTime(new Date().getTime())
                                    break

                                  default:
                                    break
                                }
                                setActiveTLDropdown('')
                              },
                            })}
                          >
                            <saki-menu-item
                              padding="10px 18px"
                              value={'AddDesc'}
                            >
                              <div className="dp-menu-item">
                                <span>
                                  {v.desc ? t('updateDesc') : t('addDesc')}
                                </span>
                              </div>
                            </saki-menu-item>
                            <saki-menu-item
                              padding="10px 18px"
                              value={'AddDays'}
                            >
                              <div className="dp-menu-item">
                                <span>{t('setDays')}</span>
                              </div>
                            </saki-menu-item>

                            <saki-menu-item
                              padding="10px 18px"
                              value={'AddNewDayAfterThisTimeline'}
                            >
                              <div className="dp-menu-item">
                                <span>
                                  {t('addNewDayAfterThisTimeline', {})}
                                </span>
                              </div>
                            </saki-menu-item>
                            <saki-menu-item
                              padding="10px 18px"
                              value={'CopyThisTimeline'}
                            >
                              <div className="dp-menu-item">
                                <span>{t('copyThisTimeline', {})}</span>
                              </div>
                            </saki-menu-item>
                            {copyTimelineId ? (
                              <saki-menu-item
                                padding="10px 18px"
                                value={'PasteAfterThisTimeline'}
                              >
                                <div className="dp-menu-item">
                                  <span>{t('pasteAfterThisTimeline', {})}</span>
                                </div>
                              </saki-menu-item>
                            ) : (
                              ''
                            )}
                            {i !== 0 ? (
                              <saki-menu-item
                                padding="10px 18px"
                                value={'MoveUp'}
                              >
                                <div className="dp-menu-item">
                                  <span>
                                    {t('moveUp', {
                                      ns: 'prompt',
                                    })}
                                  </span>
                                </div>
                              </saki-menu-item>
                            ) : (
                              ''
                            )}
                            {i !== arr.length - 1 ? (
                              <saki-menu-item
                                padding="10px 18px"
                                value={'MoveDown'}
                              >
                                <div className="dp-menu-item">
                                  <span>
                                    {t('moveDown', {
                                      ns: 'prompt',
                                    })}
                                  </span>
                                </div>
                              </saki-menu-item>
                            ) : (
                              ''
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
                    ) : (
                      ''
                    )}

                    <SakiButton
                      onTap={() => {
                        const ids = isExpand
                          ? expandTimelineIds.filter((sv) => sv !== v.id)
                          : expandTimelineIds.concat(v?.id || '')

                        setState({
                          expandTimelineIds: ids,
                        })

                        setExpandAllTimelines(!!ids.length)

                        expandWaypointsAnimate(v.id || '', isExpand)
                      }}
                      width="30px"
                      height="30px"
                      bg-color="transparent"
                      type="CircleIconGrayHover"
                    >
                      <div
                        style={{
                          transition: 'all .3s',
                          transform: `rotate(${isExpand ? '180deg' : '0deg'})`,
                        }}
                      >
                        <SakiIcon
                          width="12px"
                          height="12px"
                          color="#999"
                          type="Bottom"
                        ></SakiIcon>
                      </div>
                    </SakiButton>
                  </div>
                </div>
                <div className="rdti-waypoints">
                  {v.desc ? <div className="rdti-desc">{v.desc}</div> : ''}

                  {v.waypoints?.map((sv, si, sarr) => {
                    const navigationData = sv?.navigation

                    // const loadingIndex = arr.reduce((t, v, i) => {
                    //   if (v.id === loadNavigationDataConfig.waypointId) {
                    //     t = i - 1
                    //   }
                    //   return t
                    // }, -1)

                    const loadingNavigation =
                      loadNavigationDataConfig.timelineId === v.id &&
                      loadNavigationDataConfig.waypointId === sv.id

                    // console.log('navigationData', sv, navigationData?.distance)

                    return (
                      <div className="rdtiw-item" key={si}>
                        <div
                          onClick={() => {
                            state.openPopup(v.id || '', sv.id || '')
                          }}
                          className={`rdtiw-header`}
                          data-day={`${si + 1}`}
                        >
                          <div className="rdtiwh-left">
                            <span className="rdtiwhl-title text-elipsis">
                              {sv.address}
                            </span>
                            <span className="rdtiwhl-city text-elipsis">
                              {[sv.city?.state, sv.city?.region, sv.city?.city]
                                .filter((sv) => sv)
                                .join('·')}
                            </span>
                          </div>

                          <div
                            className={
                              'rdtiwh-right ' +
                              (activeWPDropdown === sv.id ? 'showButton' : '')
                            }
                          >
                            {user.userInfo.uid === roadBookItem?.authorId ? (
                              <>
                                <SakiButton
                                  onTap={() => {
                                    // deleteWaypoints(v?.id || '', sv?.id || '')

                                    setState({
                                      selectedTimelineId: v?.id || '',
                                      updateWaypointId: sv.id || '',
                                      addNewWaypointAfterThisWaypointId: '',
                                    })
                                  }}
                                  width="30px"
                                  height="30px"
                                  bg-color="transparent"
                                  bgHoverColor="transparent"
                                  bgActiveColor="transparent"
                                  type="CircleIconGrayHover"
                                >
                                  <SakiIcon
                                    width="12px"
                                    height="12px"
                                    color="#999"
                                    type="Magnifier"
                                  ></SakiIcon>
                                </SakiButton>
                                <saki-dropdown
                                  visible={activeWPDropdown === sv.id}
                                  floating-direction="Left"
                                  ref={bindEvent({
                                    close: () => {
                                      setActiveWPDropdown('')
                                    },
                                  })}
                                >
                                  <SakiButton
                                    onTap={() => {
                                      setActiveWPDropdown(sv.id || '')
                                    }}
                                    width="30px"
                                    height="30px"
                                    bg-color="transparent"
                                    bgHoverColor="transparent"
                                    bgActiveColor="transparent"
                                    type="CircleIconGrayHover"
                                  >
                                    <SakiIcon
                                      width="12px"
                                      height="12px"
                                      color="#999"
                                      type="More"
                                    ></SakiIcon>
                                  </SakiButton>
                                  <div slot="main">
                                    <saki-menu
                                      ref={bindEvent({
                                        selectvalue: async (e) => {
                                          console.log(e.detail.value)
                                          switch (e.detail.value) {
                                            case 'UpdateWaypointAddress':
                                              updateWaypointAddress(
                                                sv?.address || '',
                                                v?.id || '',
                                                sv?.id || ''
                                              )
                                              break
                                            case 'Delete':
                                              deleteWaypoints(
                                                v.id || '',
                                                sv.id || ''
                                              )
                                              break
                                            case 'AddNewWaypointAfterThisWaypoint':
                                              setState({
                                                selectedTimelineId: v?.id || '',
                                                addNewWaypointAfterThisWaypointId:
                                                  sv.id || '',
                                              })
                                              break
                                            case 'MoveUp':
                                              const waypoints =
                                                v.waypoints || []
                                              ;[
                                                waypoints[si],
                                                waypoints[si - 1],
                                              ] = [
                                                waypoints[si - 1],
                                                waypoints[si],
                                              ]

                                              waypoints[si] =
                                                state.deleteNavigationData(
                                                  waypoints[si]
                                                )
                                              waypoints[si - 1] =
                                                state.deleteNavigationData(
                                                  waypoints[si - 1]
                                                )
                                              if (waypoints[si - 2]) {
                                                waypoints[si - 2] =
                                                  state.deleteNavigationData(
                                                    waypoints[si - 2]
                                                  )
                                              }
                                              setState({
                                                roadBookItem: {
                                                  ...state.roadBookItem,
                                                  timelines:
                                                    state.roadBookItem?.timelines?.map(
                                                      (ssv) => {
                                                        if (ssv.id === v.id) {
                                                          return {
                                                            ...ssv,
                                                            waypoints: [
                                                              ...waypoints,
                                                            ],
                                                          }
                                                        }

                                                        return ssv
                                                      }
                                                    ),
                                                },
                                              })
                                              break
                                            case 'MoveDown':
                                              const waypoints1 =
                                                v.waypoints || []
                                              ;[
                                                waypoints1[si],
                                                waypoints1[si + 1],
                                              ] = [
                                                waypoints1[si + 1],
                                                waypoints1[si],
                                              ]
                                              waypoints1[si] =
                                                state.deleteNavigationData(
                                                  waypoints1[si]
                                                )
                                              waypoints1[si + 1] =
                                                state.deleteNavigationData(
                                                  waypoints1[si + 1]
                                                )
                                              if (waypoints1[si - 1]) {
                                                waypoints1[si - 1] =
                                                  state.deleteNavigationData(
                                                    waypoints1[si - 1]
                                                  )
                                              }
                                              setState({
                                                roadBookItem: {
                                                  ...state.roadBookItem,
                                                  timelines:
                                                    state.roadBookItem?.timelines?.map(
                                                      (ssv) => {
                                                        if (ssv.id === v.id) {
                                                          return {
                                                            ...ssv,
                                                            waypoints: [
                                                              ...waypoints1,
                                                            ],
                                                          }
                                                        }

                                                        return ssv
                                                      }
                                                    ),
                                                },
                                              })
                                              break

                                            default:
                                              break
                                          }
                                          setActiveWPDropdown('')
                                        },
                                      })}
                                    >
                                      <saki-menu-item
                                        padding="10px 18px"
                                        value={'UpdateWaypointAddress'}
                                      >
                                        <div className="dp-menu-item">
                                          <span>
                                            {t('updateWaypointAddress', {})}
                                          </span>
                                        </div>
                                      </saki-menu-item>
                                      <saki-menu-item
                                        padding="10px 18px"
                                        value={
                                          'AddNewWaypointAfterThisWaypoint'
                                        }
                                      >
                                        <div className="dp-menu-item">
                                          <span>
                                            {t(
                                              'addNewWaypointAfterThisWaypoint',
                                              {}
                                            )}
                                          </span>
                                        </div>
                                      </saki-menu-item>
                                      {si !== 0 ? (
                                        <saki-menu-item
                                          padding="10px 18px"
                                          value={'MoveUp'}
                                        >
                                          <div className="dp-menu-item">
                                            <span>
                                              {t('moveUp', {
                                                ns: 'prompt',
                                              })}
                                            </span>
                                          </div>
                                        </saki-menu-item>
                                      ) : (
                                        ''
                                      )}
                                      {si !== sarr.length - 1 ? (
                                        <saki-menu-item
                                          padding="10px 18px"
                                          value={'MoveDown'}
                                        >
                                          <div className="dp-menu-item">
                                            <span>
                                              {t('moveDown', {
                                                ns: 'prompt',
                                              })}
                                            </span>
                                          </div>
                                        </saki-menu-item>
                                      ) : (
                                        ''
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
                              </>
                            ) : (
                              ''
                            )}
                          </div>
                        </div>
                        {/* navigationData?.distance || */}
                        {si < sarr.length - 1 ? (
                          <div
                            onClick={() => {
                              // if (!navigationData?.duration) {
                              //   directionsToThisWaypoint(
                              //     v?.id || '',
                              //     sv?.id || ''
                              //   )
                              // } else {
                              //   state.showPolyline(v?.id || '', sv?.id || '')
                              // }
                              state.showPolyline(v?.id || '', sv?.id || '')
                            }}
                            className={
                              'rdtiw-navigation ' +
                              (loadingNavigation ? 'showButton' : '')
                            }
                          >
                            <div className="rdtiwn-left">
                              {!navigationData?.duration ? (
                                // <SakiIcon
                                //   width="12px"
                                //   height="12px"
                                //   margin="0 4px 0 0"
                                //   color="#999"
                                //   type={'Route'}
                                // ></SakiIcon>
                                ''
                              ) : (
                                <SakiIcon
                                  width="14px"
                                  height="14px"
                                  margin="0 4px 0 0"
                                  color="#999"
                                  type={
                                    navigationData?.travelMode === 'driving-car'
                                      ? 'Drive'
                                      : navigationData?.travelMode ===
                                          'driving-hgv'
                                        ? 'Truck'
                                        : navigationData?.travelMode ===
                                            'cycling-regular'
                                          ? 'Bike'
                                          : navigationData?.travelMode ===
                                              'foot-walking'
                                            ? 'Walking'
                                            : navigationData?.travelMode ===
                                                'cycling-electric'
                                              ? 'Motorcycle'
                                              : 'Route'
                                  }
                                ></SakiIcon>
                              )}
                              <span className="text-elipsis">
                                {loadingNavigation
                                  ? t('loadingNavigationData', {
                                      ns: 'roadBookPage',
                                    })
                                  : navigationData?.duration
                                    ? `${
                                        Math.round(
                                          (navigationData?.distance || 0) / 10
                                        ) / 100
                                      }${t('km', {
                                        ns: 'unit',
                                      })} · ${t('aboutTime', {
                                        time: formatDurationI18n(
                                          navigationData?.duration || 0,
                                          false,
                                          ['h', 'm', 's']
                                        ),
                                      })}`
                                    : t('loadNavigationData', {
                                        ns: 'roadBookPage',
                                        distance: `${
                                          Math.round(
                                            getStraightLineDistanceToNextwaypoint(
                                              v.id || '',
                                              sv.id || ''
                                            ) / 10
                                          ) / 100
                                        }${t('km', {
                                          ns: 'unit',
                                        })}`,
                                      })}
                              </span>
                            </div>
                            <div className="rdtiwn-right">
                              {(navigationData?.duration ||
                                loadingNavigation ||
                                true) &&
                              user.userInfo.uid === roadBookItem?.authorId ? (
                                <>
                                  <SakiButton
                                    onTap={() => {
                                      directionsToThisWaypoint(
                                        v?.id || '',
                                        sv?.id || ''
                                      )
                                    }}
                                    title={t('directionsToThisWaypoint')}
                                    width="30px"
                                    height="30px"
                                    bg-color="transparent"
                                    bgHoverColor="transparent"
                                    bgActiveColor="transparent"
                                    type="CircleIconGrayHover"
                                    loading={loadingNavigation}
                                  >
                                    <SakiIcon
                                      width="12px"
                                      height="12px"
                                      color="#999"
                                      type="Route"
                                    ></SakiIcon>
                                  </SakiButton>
                                  {navigationData?.duration ? (
                                    <SakiButton
                                      onTap={() => {
                                        deleteWaypointsNavigation(
                                          v?.id || '',
                                          sv?.id || ''
                                        )
                                      }}
                                      width="30px"
                                      height="30px"
                                      bg-color="transparent"
                                      bgHoverColor="transparent"
                                      bgActiveColor="transparent"
                                      type="CircleIconGrayHover"
                                    >
                                      <SakiIcon
                                        width="12px"
                                        height="12px"
                                        color="#999"
                                        type="Close"
                                      ></SakiIcon>
                                    </SakiButton>
                                  ) : (
                                    ''
                                  )}
                                </>
                              ) : (
                                ''
                              )}
                            </div>
                          </div>
                        ) : (
                          ''
                        )}
                      </div>
                    )
                  })}
                  {user.userInfo.uid === roadBookItem?.authorId ? (
                    <div className="rdtiw-item searchbutton">
                      <div className="rdtiw-header" data-day={``}>
                        <div className="rdtiwhlt-icon">
                          <SakiIcon
                            width="12px"
                            height="12px"
                            color="var(--saki-default-color)"
                            type="Magnifier"
                          ></SakiIcon>
                        </div>
                        <div className="rdtiwh-left">
                          <div className="rdtiwhl-title">
                            <SakiButton
                              onTap={() => {
                                setState({
                                  selectedTimelineId: v?.id || '',
                                  addNewWaypointAfterThisWaypointId: '',
                                })
                              }}
                              border="none"
                              color="var(--saki-default-color)"
                              fontSize="12px"
                              type="Normal"
                              bg-color="transparent"
                            >
                              <span>
                                {t(
                                  v.waypoints?.length
                                    ? 'addNextWaypoint'
                                    : 'addStartWaypoint'
                                )}
                              </span>
                            </SakiButton>
                          </div>
                          <span className="rdtiwhl-date"></span>
                        </div>

                        <div className="rdtiwh-right"></div>
                      </div>
                    </div>
                  ) : (
                    ''
                  )}
                </div>
              </div>
            )
          })}
          {roadBookItem?.id && user.userInfo.uid === roadBookItem?.authorId ? (
            <div className="rdt-buttons">
              <SakiButton
                onTap={() => {
                  addTimeline()
                }}
                height="36px"
                margin="30px 0 0px"
                type="Primary"
                loading={loadStatus === 'loading'}
              >
                <SakiIcon
                  // width='14px'
                  // height='14px'
                  // height="30px"
                  color="#fff"
                  margin="0 6px 0 0"
                  type="Add"
                ></SakiIcon>
                <span>{t('addTimeline')}</span>
              </SakiButton>
            </div>
          ) : (
            <div></div>
          )}
        </div>
      </div>
      <SearchWaypointModal
        onWaypoints={(waypoints) => {
          console.log('searchWaypoint1 waypoints', waypoints)

          if (state.addNewWaypointAfterThisWaypointId) {
            addNewWaypointAfterThisWaypointId(
              state.selectedTimelineId,
              state.addNewWaypointAfterThisWaypointId,
              waypoints
            )
            return
          }

          if (state.updateWaypointId) {
            updateWaypoints(
              state.selectedTimelineId,
              state.updateWaypointId,
              waypoints
            )
          } else {
            addWaypoints(waypoints)
          }
        }}
        onLatlng={(lat, lng, address) => {
          state.showLatlng(lat, lng, address, true)
        }}
      />
    </div>
  )
}
