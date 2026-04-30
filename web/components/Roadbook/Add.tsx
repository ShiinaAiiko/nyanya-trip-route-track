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
  SakiSwitch,
  SakiTitle,
} from '../saki-ui-react/components'
import NoSSR from '../NoSSR'
import { bindEvent, snackbar } from '@saki-ui/core'
import moment from 'moment'
import { DataContext } from './Context'

export const AddRoadBookPage = ({
  onAdded,
}: {
  onAdded: (roadbook: protoRoot.roadbook.IRoadbookItem) => void
}) => {
  const { t, i18n } = useTranslation('roadBookPage')

  const { state, setState } = useContext(DataContext)

  const [title, setTitle] = useState('')
  const [titleErr, setTitleErr] = useState('')
  const [desc, setDesc] = useState('')
  const [startTime, setStartTime] = useState(moment().format('YYYY.MM.DD'))
  const [openStartTimeDatePicker, setOpenStartTimeDatePicker] = useState(false)
  const [allowShare, setAllowShare] = useState(false)

  const richtextEl = useRef<any>()

  const [loadStatus, setLoadStatus] = useState<'loading' | 'loaded' | 'noMore'>(
    'loaded'
  )

  const editPage = state.pageTypes[state.pageTypes.length - 1] === 'Edit'

  useEffect(() => {
    if (editPage) {
      setTitle(state.roadBookItem?.title || '')
      setTitleErr('')
      richtextEl.current?.setValue(state.roadBookItem?.desc || '')
      setDesc(state.roadBookItem?.desc || '')
      setAllowShare(state.roadBookItem?.permissions?.allowShare || false)
      setStartTime(
        moment(Number(state.roadBookItem?.startTime) * 1000).format(
          'YYYY.MM.DD'
        )
      )
    }
  }, [state.pageTypes])

  const addFunc = async () => {
    if (loadStatus === 'loading') return

    setLoadStatus('loading')

    const res = await httpApi.v1.AddRoadbook({
      title,
      desc,
      startTime: moment(startTime).unix(),
    })
    // console.log('AddRoadbook res', res.data.roadbook)

    setLoadStatus('loaded')

    if (res.code === 200 && res.data?.roadbook) {
      onAdded(res.data.roadbook)

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
      return
    }

    snackbar({
      message: res.msg + ';' + res.error,
      autoHideDuration: 2000,
      vertical: 'top',
      horizontal: 'center',
    }).open()
  }

  const editFunc = async () => {
    const roadBookItem = state.roadBookItem
    if (loadStatus === 'loading' || loadStatus === 'noMore') return

    setLoadStatus('loading')
    const res = await httpApi.v1.UpdateRoadbook({
      id: roadBookItem?.id,
      title: title || '',
      desc: desc || '',
      startTime: moment(startTime).unix(),
      timelines: roadBookItem?.timelines,
      permissions: {
        ...roadBookItem?.permissions,
        allowShare,
      },
    })
    // console.log('GetRoadbookDetail res', res, allowShare)

    setLoadStatus('loaded')

    if (res.code === 200) {
      state.backPage()

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

      setState({
        roadBookItem: {
          ...roadBookItem,

          title: title || '',
          desc: desc || '',
          startTime: moment(startTime).unix(),
          permissions: {
            ...roadBookItem?.permissions,
            allowShare,
          },
        },

        list: state.list.map((v) => {
          if (v.id === state.roadBookItem?.id) {
            return {
              ...v,

              title: title || '',
              desc: desc || '',
              startTime: moment(startTime).unix(),
              permissions: {
                ...roadBookItem?.permissions,
                allowShare,
              },
            }
          }
          return v
        }),
      })

      return
    }

    snackbar({
      message: res.msg + ';' + res.error,
      autoHideDuration: 2000,
      vertical: 'top',
      horizontal: 'center',
    }).open()
  }

  return (
    <div className="add-roadbook-page scrollBarHover page-transition">
      <div className="ap-main ">
        <saki-input
          ref={bindEvent({
            changevalue: (e: any) => {
              // console.log(e)
              setTitleErr(
                !e.detail
                  ? t('cannotBeEmpty', {
                      ns: 'prompt',
                    })
                  : ''
              )
              setTitle(e.detail)
            },
          })}
          value={title}
          placeholder={t('titlePlaceholder')}
          width={'100%'}
          height={'56px'}
          type={'Text'}
          margin="0 0 0"
          placeholder-animation="MoveUp"
          max-length={30}
          error={titleErr}
          // errorColor={v.errorColor}
          // errorFontSize={v.errorFontSize}
        ></saki-input>

        <saki-richtext
          ref={bindEvent(
            {
              changevalue: (e) => {
                // console.log('datadata', e.detail.richText)
                setDesc(e.detail.richText || '')
              },
              submit: () => {},
            },
            (e: any) => {
              richtextEl.current = e
              richtextEl.current?.setToolbar?.({
                container: [],
              })
            }
          )}
          theme="snow"
          toolbar="false"
          toolbar-padding="0px"
          // max-height='250px'
          min-height="120px"
          width="100%"
          padding="0px"
          margin="16px 0 16px"
          font-size="14px"
          min-length="0"
          max-length="10000"
          clear-all-styles-when-pasting
          short-enter="NewLine"
          editor-background-color="rgb(243,243,243)"
          editor-border-radius="10px"
          editor-padding="10px"
          value={desc}
          placeholder={t('descPlaceholder')}
        />

        <saki-input
          ref={bindEvent({
            changevalue: (e: any) => {
              // console.log("Dom发生了变化", e)
              if (!e.detail) {
                setStartTime?.('')
                return
              }
              const dateArr = e.detail.split('-')
              const y = Number(dateArr[0])
              const m = Number(dateArr[1])
              const d = Number(dateArr[2])
              const date = new Date(y + '-' + m + '-' + d)
              const t = date.getTime()
              if (!!t && y > 1000 && m >= 0 && m <= 11 && d >= 0 && d <= 31) {
                setStartTime?.(moment(e.detail).format('YYYY.MM.DD'))
              }
            },
            focusfunc: () => {
              console.log('startDate focus', openStartTimeDatePicker)
              setOpenStartTimeDatePicker(true)
            },
          })}
          value={startTime}
          width={'100%'}
          height={'56px'}
          type={'Text'}
          margin="0 0 16px"
          placeholder={t('startDate')}
          text-align="left"
          placeholder-animation="MoveUp"
        ></saki-input>

        <saki-date-picker
          ref={bindEvent({
            close: () => {
              console.log('startDate close', openStartTimeDatePicker)
              setOpenStartTimeDatePicker(false)
            },
            selectdate: (e) => {
              console.log('startDate Dom发生了变化`1111111', e)
              setOpenStartTimeDatePicker(false)

              if (!e.detail.date) {
                setStartTime?.('')
                return
              }
              setStartTime?.(moment(e.detail.date).format('YYYY.MM.DD'))
            },
            cncelSelect: (e) => {
              setOpenStartTimeDatePicker(false)

              setStartTime?.('')
            },
          })}
          date={startTime}
          visible={openStartTimeDatePicker}
          cancel-button
          // time-picker
          mask
          z-index={1300}
        ></saki-date-picker>

        {editPage ? (
          <div className="av-allowshare">
            <SakiTitle margin="0 0 4px 0" level={5} color="default">
              {t('allowShare')}
            </SakiTitle>
            <SakiSwitch
              onChangevalue={(e) => {
                // console.log('GetRoadbookDetail e.detail', e.detail)
                setAllowShare(e.detail)
              }}
              value={allowShare}
            ></SakiSwitch>
          </div>
        ) : (
          ''
        )}

        <div className="av-item av-buttons">
          <SakiButton
            onTap={editPage ? editFunc : addFunc}
            type="Primary"
            loading={loadStatus === 'loading'}
          >
            {!editPage ? (
              <SakiIcon
                // width='14px'
                // height='14px'
                height="30px"
                color="#fff"
                margin="0 6px 0 0"
                type="Add"
              ></SakiIcon>
            ) : (
              ''
            )}
            <span>{editPage ? t('editRoadBook') : t('createRoadBook')}</span>
          </SakiButton>
        </div>
      </div>
    </div>
  )
}
