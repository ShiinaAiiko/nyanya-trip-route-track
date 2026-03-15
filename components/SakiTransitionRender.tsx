import React from 'react'

import { useSelector } from 'react-redux'
import NoSSR from './NoSSR'
import { RootState } from '../store'

export const SakiTransitionRender = ({
  children,
  mounted,
  show,
  ssr,
  setClassName,
}: {
  children: React.ReactNode
  mounted: boolean
  show: boolean
  ssr: boolean
  setClassName: string
}) => {
  const { config, geo } = useSelector((state: RootState) => state)

  return (
    <>
      {mounted ? (
        <NoSSR>
          <saki-transition
            class-name={setClassName}
            animation-duration="300"
            data-refresh={config.deviceType}
            in={show}
          >
            {children}
          </saki-transition>
        </NoSSR>
      ) : ssr ? (
        children
      ) : (
        ''
      )}
    </>
  )
}
