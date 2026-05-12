import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { RootState, AppDispatch, methods, apiSlice } from '../store'
import { useSelector, useStore, useDispatch } from 'react-redux'

import * as nyanyalog from 'nyanyajs-log'
import { sakiui, meowApps, isDev } from '../config'
import './i18n/i18n'
import { initPublic } from './public'
import { getStaticPath } from '../store/config'
nyanyalog.timer()

const Init = () => {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const api = useSelector((state: RootState) => state.api)
  const store = useStore()

  useEffect(() => {
    const init = async () => {
      document.body.ontouchstart = () => {}
      initPublic()

      // await dispatch(methods.config.init()).unwrap()
    }
    init()
  }, [])

  console.log('isDev', isDev)
  return (
    <>
      <Head>
        <link rel="icon" href={getStaticPath('/favicon.ico')} />
        {/* <link rel='manifest' href={`/manifest.json`} /> */}
        <link
          rel="manifest"
          href={getStaticPath(
            `/manifest${
              router.query.lang && router.query.lang !== 'en-US'
                ? '.' + router.query.lang
                : ''
            }.json`
          )}
        />

        {!isDev ? (
          <>
            <script src="https://cdnjs.cloudflare.com/polyfill/v3/polyfill.min.js?features=IntersectionObserver,ResizeObserver"></script>
            <script
              src={getStaticPath('/js/sw-register.js')}
              defer
              type="module"
            ></script>
          </>
        ) : (
          ''
        )}

        <script noModule src={getStaticPath(sakiui.jsurl)}></script>
        <script type="module" src={getStaticPath(sakiui.esmjsurl)}></script>
        <script noModule src={meowApps.jsurl}></script>
        <script type="module" src={meowApps.esmjsurl}></script>
      </Head>
    </>
  )
}

export default Init
