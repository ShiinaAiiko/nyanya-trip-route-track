import { useEffect, useRef, useState } from 'react'
import { RootState, AppDispatch, layoutSlice } from '../store'
import { useSelector, useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { bindEvent, snackbar, progressBar } from '@saki-ui/core'

const MapTrackRouteComponent = () => {
	const { t, i18n } = useTranslation('tripHistoryPage')
	const layout = useSelector((state: RootState) => state.layout)
	const config = useSelector((state: RootState) => state.config)
	const trip = useSelector((state: RootState) => state.trip)

	const dispatch = useDispatch<AppDispatch>()
	// const [menuType, setMenuType] = useState('Appearance')
	// const [menuType, setMenuType] = useState(type || 'Account')
	const [closeIcon, setCloseIcon] = useState(true)
	const [uselessData, setUselessData] = useState([] as string[])

	return (
		<div className={'map-track-route-component ' + config.deviceType}>
			<div className='mt-header'>
				<saki-modal-header
					// border
					back-icon={!closeIcon}
					close-icon={closeIcon}
          right-width={'56px'}
					ref={bindEvent({
						close() {
							dispatch(layoutSlice.actions.setOpenTripTrackRoute(false))
						},
						back() {
							setCloseIcon(true)
						},
					})}
					title={t('mapLayer', {
						ns: 'tripPage',
					})}
				></saki-modal-header>
			</div>
			<div className='mt-main'>dsadsads</div>
		</div>
	)
}

export default MapTrackRouteComponent
