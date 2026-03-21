import { useTranslation } from 'react-i18next'
import { protoRoot } from '../../protos'
import { useSelector } from 'react-redux'
import { useContext, useEffect, useRef, useState } from 'react'
import { regeo } from '../../store/city'
import { RootState } from '../../store'
import { httpApi } from '../../plugins/http/api'
import { getShortId } from '@nyanyajs/utils'
import {
  SakiAsideModal,
  SakiButton,
  SakiIcon,
  SakiInput,
  SakiScrollLoading,
} from '../saki-ui-react/components'
import NoSSR from '../NoSSR'
import { bindEvent } from '@saki-ui/core'
import { DataContext } from './Context'
import { getLatLng, getLatLngGcj02ToWgs84 } from '../../plugins/methods'
import { getMapLayer } from '../../store/config'

interface Address {
  district: string
  state: string
  'ISO3166-2-lvl4': string
  country: string
  country_code: string
}
export interface NominatimResult {
  place_id: number
  licence: string
  osm_type: string
  osm_id: number
  lat: string
  lon: string
  category: string
  type: string
  place_rank: number
  importance: number
  addresstype: string
  name: string
  display_name: string
  address: Address
  boundingbox: [string, string, string, string]
}

export const SearchWaypointModal = ({
  onWaypoints,
  onLatlng,
}: {
  onWaypoints: (waypoints: protoRoot.roadbook.IRoadbookWaypointItem) => void
  onLatlng: (lat: number, lng: number, address: string) => void
}) => {
  const { t, i18n } = useTranslation('searchWaypointModal')
  const { config, geo, user } = useSelector((state: RootState) => state)

  const { state, setState } = useContext(DataContext)

  const [keywords, setKeywords] = useState('')
  const [loadStatus, setLoadStatus] = useState<'loading' | 'loaded' | 'noMore'>(
    'loaded'
  )

  const [loadIndex, setLoadIndex] = useState(-1)

  const markerRef = useRef<any>()

  const [searchResult, setSearchResult] = useState<NominatimResult[]>([])
  const [cityInfoByCoordinates, setCityInfoByCoordinates] =
    useState<Awaited<ReturnType<typeof regeo>>>()

  useEffect(() => {
    if (state.selectedTimelineId) {
    } else {
      markerRef.current?.close()
      setSearchResult([])
      setCityInfoByCoordinates(undefined)
      setKeywords('')
      setLoadStatus('loaded')
      setLoadIndex(-1)

      setState({
        selectWaypointOnMap: {
          allow: true,
          coordinates: {
            lat: -9999999,
            lng: -9999999,
          },
        },
      })
    }
  }, [state.selectedTimelineId])

  useEffect(() => {
    state.selectWaypointOnMap.coordinates.lat !== -9999999 &&
      searchWaypointsByCoordinates()
  }, [state.selectWaypointOnMap.coordinates])

  const searchWaypoints = async () => {
    if (loadStatus === 'loading') return

    setLoadStatus('loading')
    const res: any = await httpApi.v1.searchWaypoint({
      keywords,
      lang: config.lang,
    })

    console.log('searchWaypoint1 res', res)
    if (res) {
      if (res?.length) {
        setSearchResult(res)
        setLoadStatus('loaded')
      } else {
        setSearchResult([])
        setLoadStatus('noMore')
      }
    }
  }

  const searchWaypointsByCoordinates = async () => {
    if (loadStatus === 'loading') return

    setLoadStatus('loading')

    // const ml = getMapLayer('roadbookPage')

    // let latlng = getLatLng(
    //   ml.mapUrl,
    //   state.selectWaypointOnMap.coordinates.lat,
    //   state.selectWaypointOnMap.coordinates.lng
    // )

    markerRef.current = state.showLatlng(
      state.selectWaypointOnMap.coordinates.lat,
      state.selectWaypointOnMap.coordinates.lng,
      t('loadingData', {
        ns: 'prompt',
      }),
      false
    )

    const res = await regeo({
      lat: state.selectWaypointOnMap.coordinates.lat,
      lng: state.selectWaypointOnMap.coordinates.lng,
    })

    console.log('searchWaypointsByCoordinates res', res)
    setLoadStatus('loaded')
    if (res) {
      setSearchResult([
        {
          place_id: 0,
          licence: '',
          osm_type: '',
          osm_id: 0,
          lat: String(state.selectWaypointOnMap.coordinates.lat),
          lon: String(state.selectWaypointOnMap.coordinates.lng),
          category: '',
          type: '',
          place_rank: 0,
          importance: 0,
          addresstype: res.road
            ? 'road'
            : res.town
              ? 'town'
              : res.city
                ? 'city'
                : '',
          name:
            res.road || res.town || res.city || res.region || res.state || '',
          display_name: [
            // 拼接显示名称
            res.road,
            res.town,
            res.city,
            res.region,
            res.state,
            res.country,
          ]
            .filter(Boolean)
            .join(', '),
          address: {
            district: res.town || res.city || '',
            state: res.state || '',
            'ISO3166-2-lvl4': '',
            country: res.country || '',
            country_code: '',
          },
          boundingbox: ['0', '0', '0', '0'],
        },
      ])
      setCityInfoByCoordinates(res)

      markerRef.current.close()

      markerRef.current = state.showLatlng(
        state.selectWaypointOnMap.coordinates.lat,
        state.selectWaypointOnMap.coordinates.lng,
        res.road || res.town || res.city || res.region || res.state || '',
        false
      )
    }
  }

  const selectResult = async (v: NominatimResult, i: number) => {
    setLoadIndex(i)

    let res = cityInfoByCoordinates

    if (!res) {
      res = await regeo({
        lat: Number(v.lat),
        lng: Number(v.lon),
      })
    }

    if (res) {
      console.log('searchWaypoint1 selectwaypoints res', res)
      onWaypoints({
        id: getShortId(11),
        coords: {
          latitude: Number(v.lat),
          longitude: Number(v.lon),
        },
        city: {
          country: res.country,
          state: res.state,
          region: res.region,
          city: res.city,
          town: res.town,
          road: res.road,
        },
        address: v.name,
        icon: '',
        navigation: {
          distance: 0,
          duration: 0,
          travelMode: '',
          urls: {
            domainUrl: '',
            shortUrl: '',
            url: '',
          },
        },
        lastNavigationTime: -1,
      })
    }
  }

  return (
    <NoSSR>
      <SakiAsideModal
        onClose={() => {
          setState({
            selectedTimelineId: '',
          })
        }}
        width="100%"
        max-width={'400px'}
        border-radius={config.deviceType === 'Mobile' ? '0px' : ''}
        border={config.deviceType === 'Mobile' ? 'none' : ''}
        mask-closable="false"
        background-color="#fff"
        vertical={'Top'}
        horizontal="Center"
        offsetY={config.deviceType === 'Mobile' ? 0 : 20}
        visible={!!state.selectedTimelineId}
      >
        <div
          className={
            'search-waypoint-modal ' +
            config.deviceType +
            (searchResult?.length ? ' results ' : '')
          }
        >
          <div className="sw-header">
            <SakiInput
              onChangevalue={(e) => {
                setKeywords(e.detail)
              }}
              onPressenter={() => {
                searchWaypoints()
              }}
              value={keywords}
              placeholder={t('pageTitle', {
                ns: 'searchWaypointModal',
              })}
              width={'100%'}
              height={'56px'}
              type={'Text'}
              margin="0 0 0"
              placeholder-animation="MoveUp"
              max-length={30}
              // errorColor={v.errorColor}
              // errorFontSize={v.errorFontSize}
            ></SakiInput>
            <div className="swh-right">
              <SakiButton
                onTap={() => {
                  searchWaypoints()
                }}
                margin="20px 4px 0 0"
                type="CircleIconGrayHover"
                loading={loadStatus === 'loading'}
              >
                <SakiIcon
                  // width='14px'
                  // height='14px'
                  color="#666"
                  type="Magnifier"
                ></SakiIcon>
              </SakiButton>
              {/* <SakiButton
                onTap={() => {
                  setState({
                    selectWaypointOnMap: {
                      allow: !state.selectWaypointOnMap.allow,
                      coordinates: {
                        lat: -9999999,
                        lng: -9999999,
                      },
                    },
                  })
                }}
                margin="20px 0 0"
                type="CircleIconGrayHover"
              >
                <SakiIcon
                  // width='14px'
                  // height='14px'
                  color={
                    state.selectWaypointOnMap.allow
                      ? 'var(--saki-default-color)'
                      : '#666'
                  }
                  type="MapFootprints"
                ></SakiIcon>
              </SakiButton> */}
              <SakiButton
                onTap={() => {
                  setState({
                    selectedTimelineId: '',
                  })
                }}
                margin="20px 0 0"
                type="CircleIconGrayHover"
              >
                <SakiIcon
                  // width='14px'
                  // height='14px'
                  color="#666"
                  type="Close"
                ></SakiIcon>
              </SakiButton>
            </div>
          </div>
          <div
            style={{
              maxHeight: config.deviceWH.h - 200 + 'px',
            }}
            className={
              'sw-main scrollBarHover' +
              (searchResult?.length ? ' results ' : '')
            }
          >
            {searchResult.map((v, i) => {
              return (
                <div
                  ref={
                    bindEvent({
                      click: async () => {
                        onLatlng?.(Number(v?.lat), Number(v.lon), v.name || '')
                      },
                    }) as any
                  }
                  className={'wa-m-item'}
                  key={i}
                >
                  <div className="wa-m-i-left">
                    <span>{v.name}</span>
                    <span>{v.display_name}</span>
                  </div>
                  <div className="wa-m-i-right">
                    <SakiButton
                      onTap={async () => {
                        selectResult(v, i)
                      }}
                      margin="0px 0 0"
                      type="CircleIconGrayHover"
                      bg-color="#eee"
                      bgHoverColor="#ddd"
                      bgActiveColor="#ccc"
                      loading={loadIndex === i}
                    >
                      <SakiIcon
                        // width='14px'
                        // height='14px'
                        color="#666"
                        type="Add"
                      ></SakiIcon>
                    </SakiButton>
                  </div>
                </div>
              )
            })}
            {loadStatus !== 'loaded' ? (
              <SakiScrollLoading
                lang={config.lang}
                type={loadStatus}
              ></SakiScrollLoading>
            ) : (
              ''
            )}
          </div>
        </div>
      </SakiAsideModal>
    </NoSSR>
  )
}
