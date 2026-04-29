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
  // ✅ 最佳写法：原子化监听
  const config = useSelector((state: RootState) => state.config)
  // const geo = useSelector((state: RootState) => state.geo)
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
