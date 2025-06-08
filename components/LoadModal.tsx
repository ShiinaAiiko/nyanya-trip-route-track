import React, { useEffect, useRef, useState } from 'react'
import { layoutSlice, ModalType } from '../store/layout'
import store, { AppDispatch, RootState } from '../store'
import { useSelector } from 'react-redux'
import { progressBar } from '@saki-ui/core'
import { useTranslation } from 'react-i18next'
import moment from 'moment'
import FindLocationComponent from './FindLocation'
import CreateCustomTripComponent from './CreateCustomTrip'
import VisitedCitiesModal from './VisitedCities'
import JourneyMemoriesModal from './JourneyMemories'
import AddVehicleComponent from './Vehicle'
import ReplayTripComponent from './ReplayTrip'
import TripHistoryComponent from './TripHistory'
import LoginComponent from './Login'
import SettingsComponent from './Settings'
import { useDispatch } from 'react-redux'
import TripEditComponent from './TripEdit'
import NoSSR from './NoSSR'
import { eventListener } from '../store/config'
import { Debounce } from '@nyanyajs/utils'
import ImagesWaterfallComponent from './ImagesWaterfall'
import MapLayerModal from './MapLayer'
import WeatherAppModal from './WeatherApp'

const d = new Debounce()

interface Props {
  children: React.ReactNode
  type: ModalType
  name: string
}
const LoadModalComponent: React.FC<Props> = ({ children, type, name }) => {
  const { t, i18n } = useTranslation('prompt')

  const { loadModals } = useSelector((state: RootState) => {
    const { loadModals } = state.layout
    return { loadModals }
  })

  const [load, setLoad] = useState(false)
  const [isChildLoaded, setIsChildLoaded] = useState(false)
  const loadModalRef = useRef<HTMLSpanElement>(null)
  const pb = useRef(progressBar())
  const timer = useRef<NodeJS.Timeout>()

  useEffect(() => {
    console.log(type, loadModals[type])
    if (loadModals[type]) {
      console.log(type, !load, isChildLoaded)
      if (!load) {
        pb.current.open()
        pb.current.setProgress({
          progress: 0,
          tipText: t('loadComponent', {
            ns: 'prompt',
            name,
          }),
        })

        let progress = 0
        timer.current = setInterval(() => {
          progress = progress + 0.04
          progress = progress >= 0.9 ? 0.9 : progress
          pb.current.setProgress({
            progress: progress,
            tipText: t('loadComponent', {
              ns: 'prompt',
              name,
            }),
          })
        }, 500)

        setLoad(true)
      }
      if (isChildLoaded) {
        loadFunc()
      }
    }
  }, [loadModals, isChildLoaded])

  const openModal = () => {
    loadModals[type]?.forEach((f) => f())

    const results = { ...loadModals }

    delete results[type]
    store.dispatch(layoutSlice.actions.setLoadModals(results))
  }

  const loadFunc = () => {
    console.log(
      type,
      'loadFunc',
      loadModals[type],
      isChildLoaded,
      loadModalRef.current
    )
    if (!isChildLoaded) {
      clearInterval(timer.current)
      pb.current.setProgress({
        progress: 1,
        tipText: t('loadComponent', {
          ns: 'prompt',
          name,
        }),
        onAnimationEnd() {
          pb.current.close()
          setIsChildLoaded(true)
        },
      })
      return
    }
    openModal()
  }
  // useEffect(() => {
  // 	console.log(type, loadModalRef)
  // 	if (loadModalRef.current) {
  // 		// setTimeout(() => {
  // 		console.log(type, '子组件已加载完成', loadModalRef.current)
  // 		loadFunc()
  // 		// }, 2000)
  // 	}
  // }, [loadModalRef.current])

  useEffect(() => {
    eventListener.on('loadModal:' + type, () => {
      console.log(
        type,
        'loadModal1 子组件已加载完成 loadFunc ',
        loadModalRef.current
      )
      // setTimeout(() => {
      loadFunc()
      // d.increase(loadFunc, 300)
      // }, 5000)
    })
    return () => {
      eventListener.removeEvent('loadModal:' + type)
    }
  }, [loadModals])

  return load ? (
    <>
      {/* <span
				ref={loadModalRef}
				className={'loadmodal-' + type}
				style={{ display: 'none' }}
			>
				{type} {isChildLoaded ? '已加载' : '加载中...'}
			</span> */}
      {children}
    </>
  ) : (
    <></>
  )
}

export const LoadModalsComponent = () => {
  const { t, i18n } = useTranslation('prompt')
  const layout = useSelector((state: RootState) => state.layout)

  const dispatch = useDispatch<AppDispatch>()

  const components: {
    type: ModalType
    name: any
    component: React.JSX.Element
  }[] = [
    {
      type: 'TripEdit',
      name: t('editTrip', {
        ns: 'tripPage',
      }),
      component: <TripEditComponent />,
    },
    {
      type: 'Settings',
      name: t('title', {
        ns: 'settings',
      }),
      component: (
        <SettingsComponent
          visible={layout.openSettingsModal}
          // type={openSettingType}
          onClose={() => {
            dispatch(layoutSlice.actions.setOpenSettingsModal(false))
          }}
        />
      ),
    },
    {
      type: 'Login',
      name: t('login', {
        ns: 'common',
      }),
      component: <LoginComponent />,
    },
    {
      type: 'TripHistory',
      name: t('pageTitle', {
        ns: 'tripHistoryPage',
      }),
      component: <TripHistoryComponent />,
    },
    {
      type: 'ReplayTrip',
      name: t('title', {
        ns: 'replayTripPage',
      }),
      component: <ReplayTripComponent />,
    },
    {
      type: 'AddVehicle',
      name: t('pageTitle', {
        ns: 'vehicleModal',
      }),
      component: <AddVehicleComponent />,
    },
    {
      type: 'FindLocation',
      name: t('findLocation', {
        ns: 'vehicleModal',
      }),
      component: <FindLocationComponent />,
    },
    {
      type: 'CreateCustomTrip',
      name: t('title', {
        ns: 'createCustomTripModal',
      }),
      component: <CreateCustomTripComponent />,
    },
    {
      type: 'VisitedCities',
      name: t('title', {
        ns: 'visitedCitiesModal',
      }),
      component: <VisitedCitiesModal />,
    },
    {
      type: 'JourneyMemories',
      name: t('title', {
        ns: 'journeyMemoriesModal',
      }),
      component: <JourneyMemoriesModal />,
    },
    {
      type: 'ImagesWaterfall',
      name: t('title', {
        ns: 'imagesWaterfallModal',
      }),
      component: <ImagesWaterfallComponent />,
    },
    {
      type: 'MapLayer',
      name: t('title', {
        ns: 'mapLayerModal',
      }),
      component: <MapLayerModal />,
    },
    {
      type: 'WeatherApp',
      name: t('title', {
        ns: 'weatherAppModal',
      }),
      component: <WeatherAppModal />,
    },
  ]

  return (
    <>
      {/* <NoSSR>
				<saki-modal></saki-modal>
			</NoSSR> */}
      {components.map((v, i) => {
        return (
          <LoadModalComponent key={i} type={v.type} name={v.name}>
            {v.component}
          </LoadModalComponent>
        )
      })}
    </>
  )
}

export default LoadModalComponent
