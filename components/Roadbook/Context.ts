import React, { createContext } from 'react'
import Leaflet, { map, svg } from 'leaflet'

import { IContext } from '../../store'
import { protoRoot } from '../../protos'
import { getDistance } from '../../plugins/methods'
import moment from 'moment'

export interface PolylineItem {
  timelineId: string
  waypointId: string
  polyline: { lat: number; lng: number }[]
}

export interface TimelineDaysItem {
  id: string
  daysIntoTrip: number
  startDate: string
  endDate: string
  distanceTraveled: number
}

export const initValue = {
  pageTypes: ['List'] as ('Add' | 'List' | 'Detail' | 'Edit' | '')[],
  headerTitle: '',
  headerSubtitle: '',
  pageTitle: '',

  list: [] as protoRoot.roadbook.IRoadbookItem[],
  pageNum: 1,
  pageSize: 10,
  loadStatus: '' as 'loading' | 'loaded' | 'noMore',

  // 详情页
  roadBookItem: undefined as protoRoot.roadbook.IRoadbookItem | undefined,

  formatRB: (v: protoRoot.roadbook.IRoadbookItem | undefined) => {
    return {
      ...v,
      timelines: v?.timelines?.map((v) => {
        v.waypoints = v?.waypoints?.map((sv, si, sarr) => {
          if (sv.navigation?.distance && si === sarr.length - 1) {
            return initValue.deleteNavigationData(sv)
          }

          return sv
        })

        return {
          ...v,
          days: Number(v.days) < 1 ? 1 : v.days,
        }
      }),
    }
  },

  loadDetailStatus: '' as 'loading' | 'loaded' | 'noMore',
  polylines: [] as PolylineItem[],
  updateRoadbook: () => {},
  expandTimelineIds: [] as string[],

  backPage: () => {},
  deleteRoadbook: async (id: string) => {},
  share: (v: protoRoot.roadbook.IRoadbookItem) => {},

  waypointsMakers: [] as {
    tlId: string
    wId: string
    marker: Leaflet.Marker<any>
  }[],
  openPopup: (tlId: string, wId: string) => {},
  showPolyline: (tlId: string, wId: string) => {},
  showLatlng: (
    lat: number,
    lng: number,
    address: string,
    autoZoom: boolean
  ):
    | {
        close: () => void
      }
    | undefined => {
    return {
      close: () => {},
    }
  },

  customMarker: undefined as Leaflet.Marker<any> | undefined,

  selectedTimelineId: '',
  updateWaypointId: '',
  addNewWaypointAfterThisWaypointId: '',
  selectWaypointOnMap: {
    allow: true,
    coordinates: {
      lat: -9999999,
      lng: -9999999,
    },
  },

  getStraightLineDistanceToNextwaypoint(
    roadBookItem: protoRoot.roadbook.IRoadbookItem | undefined
  ) {
    const straightLineDistanceToNextwaypoint = roadBookItem?.timelines?.reduce(
      (t, v, i, arr) => {
        v.waypoints?.forEach((sv, si, sarr) => {
          const nextWP = sarr[si + 1]
          // console.log('getStraightLineDistanceToNextwaypoint', sarr, sv, nextWP)
          if (nextWP) {
            t.push({
              tlId: v.id || '',
              wpId: sv.id || '',
              distance: getDistance(
                Number(sv.coords?.latitude),
                Number(sv.coords?.latitude),
                Number(nextWP?.coords?.latitude),
                Number(nextWP?.coords?.latitude)
              ),
            })
          }
        })

        return t
      },
      [] as {
        tlId: string
        wpId: string
        distance: number
      }[]
    )

    return {
      straightLineDistanceToNextwaypoint,
      getStraightLineDistanceToNextwaypoint: (tlId: string, wpId: string) => {
        return (
          straightLineDistanceToNextwaypoint?.filter((v) => {
            return v.tlId === tlId && v.wpId === wpId
          })?.[0]?.distance || 0
        )
      },
    }
  },

  fullMap: false,
  fullScreen: false,

  // loadedMap: false,

  deleteNavigationData(v: protoRoot.roadbook.IRoadbookWaypointItem) {
    return v
  },

  initTimelineDays(rb: protoRoot.roadbook.IRoadbookItem | undefined) {
    const startTime = Number(rb?.startTime) * 1000
    let daysIntoTrip = 1
    let distanceTraveled = 0
    // let days = 0
    const timelineDays = rb?.timelines?.reduce((t, v, i, arr) => {
      // if (i === 0) {
      //   t.push({
      //     id: v.id || '',
      //     days: 1 + (v.days || 0),
      //     startDate: moment(startTime).add(0, 'days').format('YYYY.M.D'),
      //     endDate: moment(startTime).add(v.days, 'days').format('YYYY.M.D'),
      //   })
      //   return t
      // }
      const startDate = moment(startTime).add(daysIntoTrip - 1, 'days')
      const endDate = moment(startTime).add(
        daysIntoTrip + Number(v.days) - 1,
        'days'
      )
      t.push({
        id: v.id || '',
        daysIntoTrip: daysIntoTrip,
        startDate: startDate.format('YYYY.M.D'),
        endDate: endDate.format('YYYY.M.D'),
        distanceTraveled: distanceTraveled,
      })
      daysIntoTrip = daysIntoTrip + Number(v.days)
      distanceTraveled =
        distanceTraveled +
        (v.waypoints?.reduce((t, sv, si, sarr) => {
          return t + (sv.navigation?.distance || 0)
        }, 0) || 0)

      // days = days + Number(v.days)
      // console.log(
      //   'daysIntoTrip',
      //   daysIntoTrip,
      //   startDate.format('MM.DD'),
      //   endDate.format('MM.DD'),
      //   days
      // )
      if (i === arr.length - 1) {
        const startDate = moment(startTime)
        const endDate = startDate.clone().add(daysIntoTrip - 2, 'days')
        t.push({
          id: rb.id || '',
          daysIntoTrip: daysIntoTrip - 1,
          startDate: startDate.format('YYYY.M.D'),
          endDate: endDate.format('YYYY.M.D'),
          distanceTraveled: distanceTraveled,
        })
      }

      return t
    }, [] as TimelineDaysItem[])

    // console.log('initTimelineDays', timelineDays)

    return timelineDays || []
  },
  getTimelineDays(timelineDays: TimelineDaysItem[], tlId: string) {
    return {
      id: '',
      daysIntoTrip: 0,
      startDate: '',
      endDate: '',
    } as TimelineDaysItem
  },
}

export const DataContext = createContext<IContext<typeof initValue>>({
  state: initValue,
  setState: () => {},
})
