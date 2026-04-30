import React from 'react'
import dynamic from 'next/dynamic'

const NoSSR = dynamic(
  () =>
    Promise.resolve(({ children }: propsType) => {
      return <React.Fragment>{children}</React.Fragment>
    }),
  {
    ssr: false,
  }
)
export default NoSSR
