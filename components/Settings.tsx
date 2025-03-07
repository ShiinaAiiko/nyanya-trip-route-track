import React, { useEffect, useState } from 'react'

import { useSelector, useDispatch } from 'react-redux'
import store, { RootState, AppDispatch, methods, layoutSlice } from '../store'
import { useRouter } from 'next/router'

import { sakisso, version } from '../config'

import { bindEvent } from '@saki-ui/core'
// console.log(sakiui.bindEvent)
import { useTranslation } from 'react-i18next'
import {
	configMethods,
	configSlice,
	getSpeedColorSliderRange,
	maps,
	getTrackSpeedColors,
	defaultSpeedColorLimit,
	getTrackRouteColor,
} from '../store/config'
import { Query } from '../plugins/methods'
import { storage, storageMethods } from '../store/storage'
import { byteConvert } from '@nyanyajs/utils'
import { getPositionShareText } from './Vehicle'
import { getSpeed } from 'geolib'
import { protoRoot } from '../protos'

const SettingsComponent = ({
	visible,
	onClose,
}: {
	visible: boolean
	onClose: () => void
}) => {
	const { t, i18n } = useTranslation('settings')
	const layout = useSelector((state: RootState) => state.layout)
	const config = useSelector((state: RootState) => state.config)

	const dispatch = useDispatch<AppDispatch>()
	// const [menuType, setMenuType] = useState('Appearance')
	// const [menuType, setMenuType] = useState(type || 'Account')
	const [closeIcon, setCloseIcon] = useState(true)
	const [showItemPage, setShowItemPage] = useState(false)
	useEffect(() => {
		console.log(layout.settingType)
		if (layout.settingType) {
			if (config.deviceType === 'Mobile') {
				setCloseIcon(false)
				setShowItemPage(true)
				// dispatch(layoutSlice.actions.setSettingType(''))
			}
		} else {
			if (config.deviceType !== 'Mobile') {
				dispatch(layoutSlice.actions.setSettingType('Account'))
			}
			// dispatch(layoutSlice.actions.setSettingType('Account'))
		}

		// setMenuType(type || 'Account')
	}, [layout.settingType])

	return (
		<saki-modal
			ref={bindEvent({
				close() {
					onClose?.()
				},
			})}
			width='100%'
			height='100%'
			max-width={config.deviceType === 'Mobile' ? '100%' : '620px'}
			max-height={config.deviceType === 'Mobile' ? '100%' : '600px'}
			mask
			border-radius={config.deviceType === 'Mobile' ? '0px' : ''}
			border={config.deviceType === 'Mobile' ? 'none' : ''}
			mask-closable='false'
			background-color='#fff'
			visible={visible}
		>
			<div className={'settings-component ' + config.deviceType}>
				<div className='settings-header'>
					<saki-modal-header
						border
						back-icon={!closeIcon}
						close-icon={closeIcon}
						right-width={'56px'}
						ref={bindEvent({
							close() {
								onClose?.()
							},
							back() {
								console.log('back1')
								store.dispatch(layoutSlice.actions.setSettingType(''))
								// setMenuType('')
								setCloseIcon(true)
								setShowItemPage(false)
								console.log('back1')
							},
						})}
						title={
							config.deviceType === 'Mobile'
								? showItemPage
									? t(layout.settingType?.toLocaleLowerCase())
									: t('title')
								: t('title')
						}
					/>
				</div>
				<div className='settings-main'>
					{config.deviceType === 'Mobile' ? (
						<>
							<div className='settings-m-list-page'>
								<SettingsNavList
									menuType={''}
									onMenuType={(menuType: string) => {
										store.dispatch(layoutSlice.actions.setSettingType(menuType))
										// setMenuType(menuType)
										setCloseIcon(false)
										setShowItemPage(true)
									}}
								></SettingsNavList>
							</div>
							<div
								className={
									'settings-m-item-page ' + (showItemPage ? 'active' : '')
								}
							>
								<SettingsItemList
									menuType={layout.settingType}
								></SettingsItemList>
							</div>
						</>
					) : (
						<>
							<div
								className={'settings-m-left ' + (showItemPage ? 'active' : '')}
							>
								<SettingsNavList
									menuType={layout.settingType}
									onMenuType={(menuType: string) => {
										// setMenuType(menuType)
										store.dispatch(layoutSlice.actions.setSettingType(menuType))
									}}
								></SettingsNavList>
							</div>
							<div className='settings-m-main'>
								<SettingsItemList
									menuType={layout.settingType}
								></SettingsItemList>
							</div>
						</>
					)}
				</div>
			</div>
		</saki-modal>
	)
}

const SettingsItemList = ({ menuType }: { menuType: string }) => {
	return (
		<>
			<Account show={menuType === 'Account'} />
			<Language show={menuType === 'Language'} />
			<Maps show={menuType === 'Maps'} />
			{/* 
			<Appearance show={menuType === 'Appearance'} />
			<General show={menuType === 'General'} />
			<SyncAndBackup show={menuType === 'SyncAndBackup'} />
		*/}
			<Cache show={menuType === 'Cache'} />
			<About show={menuType === 'About'} />
		</>
	)
}

const SettingsNavList = ({
	menuType,
	onMenuType,
}: {
	menuType: string
	onMenuType: (menuType: string) => void
}) => {
	const { t, i18n } = useTranslation('settings')

	const config = useSelector((state: RootState) => state.config)

	return (
		<saki-menu
			ref={bindEvent({
				selectvalue(e) {
					onMenuType(e.detail.value)
				},
			})}
		>
			<saki-menu-item
				active={menuType === 'Account'}
				padding='16px 12px'
				value='Account'
			>
				<div className='settings-menu-item'>
					<svg
						className='icon'
						viewBox='0 0 1024 1024'
						version='1.1'
						xmlns='http://www.w3.org/2000/svg'
						p-id='4758'
					>
						<path
							d='M858.5 763.6c-18.9-44.8-46.1-85-80.6-119.5-34.5-34.5-74.7-61.6-119.5-80.6-0.4-0.2-0.8-0.3-1.2-0.5C719.5 518 760 444.7 760 362c0-137-111-248-248-248S264 225 264 362c0 82.7 40.5 156 102.8 201.1-0.4 0.2-0.8 0.3-1.2 0.5-44.8 18.9-85 46-119.5 80.6-34.5 34.5-61.6 74.7-80.6 119.5C146.9 807.5 137 854 136 901.8c-0.1 4.5 3.5 8.2 8 8.2h60c4.4 0 7.9-3.5 8-7.8 2-77.2 33-149.5 87.8-204.3 56.7-56.7 132-87.9 212.2-87.9s155.5 31.2 212.2 87.9C779 752.7 810 825 812 902.2c0.1 4.4 3.6 7.8 8 7.8h60c4.5 0 8.1-3.7 8-8.2-1-47.8-10.9-94.3-29.5-138.2zM512 534c-45.9 0-89.1-17.9-121.6-50.4S340 407.9 340 362c0-45.9 17.9-89.1 50.4-121.6S466.1 190 512 190s89.1 17.9 121.6 50.4S684 316.1 684 362c0 45.9-17.9 89.1-50.4 121.6S557.9 534 512 534z'
							p-id='4759'
						></path>
					</svg>
					<span className='name'>{t('account')}</span>
				</div>
			</saki-menu-item>

			<saki-menu-item
				active={menuType === 'Language'}
				padding='16px 12px'
				value='Language'
			>
				<div className='settings-menu-item'>
					<svg
						className='icon'
						viewBox='0 0 1024 1024'
						version='1.1'
						xmlns='http://www.w3.org/2000/svg'
						p-id='6662'
						width={'18px'}
						height={'18px'}
					>
						<path
							d='M726 352L492 928h94.48l48.98-116h181.08l48.98 116H960z m-53.38 372L726 559.7 779.38 724zM544 640c-0.5-0.38-41.18-31.54-90.84-85.34 79.16-107.28 124-229.22 142.3-286.66H704V180H428V96h-88v84H64v88h438.5c-19.04 53.9-54.1 139-107.58 216.72-65.36-86.88-94.28-151.76-94.66-152.44L286 304l-76 44 13.74 27.72c1.78 3.12 34.38 75.8 109.42 173.14 1.84 2.42 3.7 4.78 5.56 7.14-99.44 113.72-178.3 158.18-179.32 158.94L128 736l46 72 38.6-22.94c4.4-3.34 82.66-48 184-161.56 49.04 52.56 86.44 81.66 88.6 83.34L510 724z'
							p-id='6663'
						></path>
					</svg>
					<span className='name'>{t('language')}</span>
				</div>
			</saki-menu-item>

			<saki-menu-item
				active={menuType === 'Maps'}
				padding='16px 12px'
				value='Maps'
			>
				<div className='settings-menu-item'>
					<svg
						className='icon'
						viewBox='0 0 1024 1024'
						version='1.1'
						xmlns='http://www.w3.org/2000/svg'
						p-id='2761'
						width={'18px'}
						height={'18px'}
					>
						<path
							d='M960.599015 55.0318a25.596186 25.596186 0 0 0-24.879493-1.126232l-295.687143 147.843571-295.687142-147.843571a25.698571 25.698571 0 0 0-22.882991 0l-307.154234 153.577117a25.596186 25.596186 0 0 0-14.129095 22.882991v767.885585a25.596186 25.596186 0 0 0 37.063278 22.88299l295.687143-147.843571 295.687142 147.843571c7.218124 3.583466 15.716058 3.583466 22.882991 0l307.154234-153.577117a25.596186 25.596186 0 0 0 14.129094-22.88299v-767.885585a25.596186 25.596186 0 0 0-12.132592-21.756759zM307.230767 828.855701l-255.961862 127.98093V246.184119l255.961862-127.980931v710.652513zM358.423139 118.203188l255.961862 127.980931v710.652512l-255.961862-127.98093V118.203188z m563.116096 710.652513l-255.961862 127.98093V246.184119l255.961862-127.980931v710.652513z'
							p-id='2762'
						></path>
					</svg>
					<span className='name'>{t('maps')}</span>
				</div>
			</saki-menu-item>
			{/* <saki-menu-item
				active={menuType === 'Appearance'}
				padding='16px 12px'
				value='Appearance'
			>
				<div className='settings-menu-item'>
					<svg
						className='icon'
						width={'16px'}
						height={'16px'}
						viewBox='0 0 1024 1024'
						version='1.1'
						xmlns='http://www.w3.org/2000/svg'
						p-id='5208'
					>
						<path
							d='M106.096424 807.407299c1.399953 1.099963 3.599879 0.199993 3.799872-1.599946 0.29999-3.099896 0.59998-6.299788 0.699977-9.49968 0.499983-10.699639 1.899936-21.399279 4.299855-31.998921 0.199993-0.89997-0.199993-1.899936-0.89997-2.399919-11.499612-7.799737-19.199353-23.999191-18.299383-40.898622 1.19996-21.699269 13.799535-49.298339 27.699066-61.397931 11.499612-9.899666 29.399009-9.299687 43.598531 0.199994 0.999966 0.699976 2.299922 0.499983 2.999899-0.399987 7.299754-8.499714 15.299484-16.89943 23.899195-25.099154 36.598767-34.798827 71.597587-54.198173 75.497455-56.298103l19.099357-10.399649c0.699976-0.399987 1.099963-1.099963 1.199959-1.899936 1.299956-16.299451 7.799737-31.198949 18.899363-42.598565 15.899464-16.299451 39.098682-23.499208 63.697853-19.699336 5.199825 0.799973 10.39965 2.099929 15.599475 3.899869 1.499949 0.499983 3.099896-0.699976 3.099895-2.299923-0.799973-25.099154 11.999596-42.198578 19.59934-52.298237l1.399953-1.899936c0.099997-0.099997 0.099997-0.199993 0.199993-0.199993l1.599946-1.699943C461.884434 399.221056 539.981802 321.223684 619.979106 243.126316c1.499949-1.499949 0.399987-4.099862-1.699943-3.999865-18.499377 1.19996-40.398639-4.199858-57.298069-15.399481-25.699134-17.099424-45.898453-46.798423-44.698493-66.097772 1.299956-19.399346 32.098918-43.898521 68.397695-54.398167 36.398773-10.599643 71.49759-2.899902 77.997371 17.099424 6.499781 20.099323 12.699572 47.998382 14.099525 62.2979v0.099997c0.199993 1.999933 2.499916 2.899902 3.899868 1.499949 69.197668-66.897745 134.295474-128.49567 176.194062-165.994406 1.399953-1.19996 0.89997-3.399885-0.899969-3.999865-127.795693-38.398706-311.889489 4.899835-493.783359 81.89724C92.696876 210.427418-38.298709 451.519293 9.79967 652.312526c15.899464 66.297766 49.198342 117.596037 96.296754 155.094773z m235.292071-588.080181c16.799434-12.999562 48.498366-14.999494 70.297631-4.599845 21.799265 10.499646 39.798659 31.898925 40.198645 47.698393 0.199993 15.699471-13.599542 33.098885-30.598969 38.598699-17.099424 5.499815-38.698696 9.49968-48.198375 8.699707-9.49968-0.799973-27.399077-16.199454-39.798659-33.998854-12.399582-17.899397-8.699707-43.398537 8.099727-56.3981z m-171.894207 74.597486c0.499983-0.29999 1.099963-0.499983 1.599946-0.399986l7.799737 0.999966 8.099727 0.999966c0.399987 0.099997 0.799973 0.199993 1.099963 0.499984 30.898959 23.999191 55.298136 53.798187 54.098177 66.697752-1.099963 12.999562-12.799569 28.899026-25.899127 35.398807-13.099559 6.499781-35.398807 5.499815-49.498332-2.199926-14.299518-7.699741-25.899127-29.499006-25.899127-48.298372 0-18.599373 12.799569-42.398571 28.599036-53.698191z m-91.39692 183.9938c11.099626-18.39938 33.998854-28.099053 50.498298-21.599272s25.999124 40.298642 20.899296 74.997472c-5.199825 34.698831-20.699302 61.097941-34.398841 58.598025-13.899532-2.499916-32.398908-21.099289-41.198611-41.498601-8.799703-20.399313-6.899767-52.098244 4.199858-70.497624zM830.772002 444.119543c-2.499916-2.599912-4.699842-5.099828-6.699774-7.599744-0.999966-1.19996-2.799906-1.19996-3.699876 0.099996-10.09966 13.799535-20.099323 27.399077-29.998989 40.698629-0.799973 1.099963-0.499983 2.699909 0.699977 3.399885 14.299518 8.29972 25.199151 19.999326 30.798962 34.498838 18.499377 47.798389-25.299147 109.096323-97.796704 136.995383-29.798996 11.499612-59.797985 15.499478-85.997102 12.999562-0.59998-0.099997-1.099963 0.099997-1.599946 0.399986-12.999562 9.19969-29.998989 18.09939-51.098278 19.59934-1.699943 0.099997-2.699909 1.899936-1.899936 3.399885 6.199791 11.699606 9.79967 23.899195 10.799636 35.89879 0.099997 0.999966 0.699976 1.799939 1.599946 1.999933 17.49941 5.599811 29.299013 15.599474 23.199218 31.398942-1.099963 2.799906 0 0-5.499814 10.399649l-5.399818 10.299653s0 0.099997-0.099997 0.099997c-7.899734 18.299383-24.499174 34.098851-37.198746 35.698797-11.299619 1.299956-28.299046-1.099963-39.898656-5.399818-1.599946-0.59998-3.199892 0.59998-3.099895 2.299922 1.099963 21.999259-1.799939 43.098548-8.8997 62.89788-0.59998 1.599946 0.799973 3.299889 2.499915 3.099896 3.999865-0.59998 8.099727-1.19996 12.199589-1.79994C817.272457 832.00647 1003.966165 645.912742 1019.26565 585.114791c6.299788-25.099154 12.999562-56.798086-27.999057-99.496647-40.898622-42.398571-109.296317 11.599609-160.494591-41.498601z'
							p-id='5209'
						></path>
						<path
							d='M288.390281 613.213844s-132.695528 72.09757-137.795356 184.993765c-5.199825 112.896195-112.996192 194.993428-148.894982 205.293082-35.89879 10.299653 524.082338 33.498871 484.383675-206.993024-0.099997-0.499983-0.29999-0.999966-0.699976-1.299956l-196.993361-181.993867zM534.98197 689.811263c20.399313 19.799333 25.599137 47.698393 11.59961 62.097907-14.099525 14.499511-41.998585 10.09966-62.497894-9.699673l-135.295441-128.995653c-20.399313-19.799333-25.599137-47.698393-11.599609-62.097907 14.099525-14.499511 41.998585-10.09966 62.497894 9.699673l135.29544 128.995653z m469.284185-678.377138c-36.598767-24.799164-69.497658-2.599912-83.797176 5.499814-0.099997 0-0.099997 0.099997-0.099997 0.099997-42.698561 28.699033-345.888343 323.389101-477.783898 459.584511l-0.199993 0.199994c-16.099457 21.499275-26.899093 38.398706 50.698292 115.896094 65.497793 65.497793 96.096761 61.297934 129.195645 32.998888 0.099997 0 0.099997-0.099997 0.199994-0.099997 55.398133-55.49813 290.690203-383.487076 377.587275-508.58286 14.199521-20.499309 43.498534-78.897341 4.199858-105.596441z'
							p-id='5210'
						></path>
					</svg>
					<span className='name'>{t('appearance')}</span>
				</div>
			</saki-menu-item>
			<saki-menu-item
				active={menuType === 'SyncAndBackup'}
				padding='16px 12px'
				value='SyncAndBackup'
			>
				<div className='settings-menu-item'>
					<svg
						className='icon'
						width={'17px'}
						height={'17px'}
						viewBox='0 0 1024 1024'
						version='1.1'
						xmlns='http://www.w3.org/2000/svg'
						p-id='16847'
					>
						<path
							d='M512 128a383.018667 383.018667 0 0 0-276.309333 117.333333 42.666667 42.666667 0 1 0 61.44 59.264A298.666667 298.666667 0 0 1 810.666667 509.226667V512a42.666667 42.666667 0 1 0 85.333333 0L896 508.842667V208.597333a42.666667 42.666667 0 1 0-85.333333 0v61.994667A383.274667 383.274667 0 0 0 512 128zM213.333333 512a42.666667 42.666667 0 1 0-85.333333 0v303.402667a42.666667 42.666667 0 1 0 85.333333 0v-62.037334A383.274667 383.274667 0 0 0 512 896a382.890667 382.890667 0 0 0 266.666667-107.690667 42.666667 42.666667 0 0 0-59.264-61.44A298.666667 298.666667 0 0 1 213.333333 512zM565.333333 512a53.333333 53.333333 0 1 1-106.666666 0 53.333333 53.333333 0 0 1 106.666666 0z'
							p-id='16848'
						></path>
					</svg>
					<span className='name'>{t('syncAndBackup')}</span>
				</div>
			</saki-menu-item> */}
			<saki-menu-item
				active={menuType === 'Cache'}
				padding='16px 12px'
				value='Cache'
			>
				<div className='settings-menu-item'>
					<svg
						className='icon'
						width={'16px'}
						height={'16px'}
						viewBox='0 0 1024 1024'
						version='1.1'
						xmlns='http://www.w3.org/2000/svg'
						p-id='23126'
					>
						<path
							d='M511.250625 414.911719a46.545031 46.545031 0 0 1 46.545031 46.545031l0.162908 283.575604a46.545031 46.545031 0 0 1-93.090063 0l-0.162907-283.575604a46.545031 46.545031 0 0 1 46.545031-46.545031z m-50.012636-136.53985a50.035909 50.035909 0 0 1 100.071817 0l0.18618 1.512714a50.035909 50.035909 0 0 1-100.071817 0zM511.995345 1024a508.178653 508.178653 0 0 1-293.233697-93.299515 46.405396 46.405396 0 0 1-34.210598-44.683231l-0.418906-4.305415a46.405396 46.405396 0 0 1 80.592722-31.557531 420.534359 420.534359 0 1 0-132.653339-160.161453l-7.540295 7.540295a46.545031 46.545031 0 0 1 29.020827 43.077426l0.442177 4.328688a46.428669 46.428669 0 0 1-91.088626 12.776611A511.995345 511.995345 0 1 1 511.995345 1024z'
							p-id='23127'
						></path>
					</svg>
					<span className='name'>
						{t('cache', {
							ns: 'settings',
						})}
					</span>
				</div>
			</saki-menu-item>
			<saki-menu-item
				active={menuType === 'About'}
				padding='16px 12px'
				value='About'
			>
				<div className='settings-menu-item'>
					<svg
						className='icon'
						width={'16px'}
						height={'16px'}
						viewBox='0 0 1024 1024'
						version='1.1'
						xmlns='http://www.w3.org/2000/svg'
						p-id='23126'
					>
						<path
							d='M511.250625 414.911719a46.545031 46.545031 0 0 1 46.545031 46.545031l0.162908 283.575604a46.545031 46.545031 0 0 1-93.090063 0l-0.162907-283.575604a46.545031 46.545031 0 0 1 46.545031-46.545031z m-50.012636-136.53985a50.035909 50.035909 0 0 1 100.071817 0l0.18618 1.512714a50.035909 50.035909 0 0 1-100.071817 0zM511.995345 1024a508.178653 508.178653 0 0 1-293.233697-93.299515 46.405396 46.405396 0 0 1-34.210598-44.683231l-0.418906-4.305415a46.405396 46.405396 0 0 1 80.592722-31.557531 420.534359 420.534359 0 1 0-132.653339-160.161453l-7.540295 7.540295a46.545031 46.545031 0 0 1 29.020827 43.077426l0.442177 4.328688a46.428669 46.428669 0 0 1-91.088626 12.776611A511.995345 511.995345 0 1 1 511.995345 1024z'
							p-id='23127'
						></path>
					</svg>
					<span className='name'>
						{t('about', {
							ns: 'settings',
						})}
					</span>
				</div>
			</saki-menu-item>
		</saki-menu>
	)
}

const SettingsItem = ({
	title,
	subtitle,
	main,
}: {
	title?: () => JSX.Element
	subtitle?: () => JSX.Element
	main?: () => JSX.Element
}) => {
	return (
		<div className='settings-item-component '>
			<div className='pi-title'>{title?.()}</div>
			<div className='pi-subtitle'>
				<slot name='subtitle'>{subtitle?.()}</slot>
			</div>
			<div className='pi-main'>
				<slot name='main'>{main?.()}</slot>
			</div>
		</div>
	)
}

const Account = ({ show }: { show: boolean }) => {
	const { t, i18n } = useTranslation('settings')
	const { isLogin, userInfo } = useSelector((state: RootState) => state.user)

	const dispatch = useDispatch<AppDispatch>()
	const user = useSelector((state: RootState) => state.user)
	const config = useSelector((state: RootState) => state.config)

	const [updateProfile, setUpdateProfile] = useState(false)
	// useEffect(() => {
	// 	setMode(appearance.mode)
	// }, [appearance.mode])
	return (
		<div
			style={{
				display: show ? 'block' : 'none',
			}}
		>
			<div className='s-account'>
				{isLogin ? (
					<div className='s-a-profile'>
						<saki-avatar
							width='80px'
							height='80px'
							border-radius='50%'
							nickname={user.userInfo.nickname}
							src={userInfo.avatar}
						></saki-avatar>
						<div className='s-a-p-nickname'>{userInfo.nickname}</div>

						<div className='s-a-p-item'>
							<saki-card hide-title hide-subtitle>
								<saki-card-item padding='10px 18px' disabled-tap>
									<div slot='title'>
										{t('nickname', {
											ns: 'settings',
										})}
									</div>
									{userInfo.nickname}
								</saki-card-item>
								<saki-card-item padding='10px 18px' disabled-tap>
									<div slot='title'>
										{t('username', {
											ns: 'settings',
										})}
									</div>
									{userInfo.username}
								</saki-card-item>
								<saki-card-item padding='10px 18px' disabled-tap>
									<div slot='title'>
										{t('bio', {
											ns: 'settings',
										})}
									</div>
									{userInfo.bio}
								</saki-card-item>
							</saki-card>
						</div>
					</div>
				) : (
					''
				)}

				<div className='s-a-buttons'>
					{isLogin ? (
						<>
							<saki-button
								ref={bindEvent({
									tap: () => {
										console.log('编辑资料')
										setUpdateProfile(true)
									},
								})}
								margin='20px 0 0'
								width='200px'
								padding='10px 10px'
								type='Primary'
							>
								{t('editProfile', {
									ns: 'settings',
								})}
							</saki-button>

							<saki-button
								ref={bindEvent({
									tap: () => {
										dispatch(methods.user.logout())
									},
								})}
								margin='10px 0 0'
								width='200px'
								padding='10px 10px'
								border='1px solid #eee'
								bg-hover-color='#eee'
								bg-active-color='#ddd'
								border-radius='6px'
							>
								{t('logout', {
									ns: 'common',
								})}
							</saki-button>
						</>
					) : (
						''
					)}

					<saki-button
						style={{
							display: !isLogin ? 'block' : 'none',
						}}
						ref={bindEvent({
							tap: () => {
								dispatch(layoutSlice.actions.setOpenLoginModal(true))
								// CreateAnonymousAccountFunc()
							},
						})}
						width='200px'
						margin='10px 0'
						padding='10px 10px'
						type='Primary'
					>
						{t('addAccount', {
							ns: 'settings',
						})}
					</saki-button>
				</div>
			</div>

			<div className='update-profile-component'>
				<saki-modal
					max-width={config.deviceType === 'Mobile' ? 'auto' : '800px'}
					min-width={config.deviceType === 'Mobile' ? 'auto' : '700px'}
					max-height={config.deviceType === 'Mobile' ? 'auto' : '600px'}
					min-height={config.deviceType === 'Mobile' ? 'auto' : '400px'}
					width='100%'
					height='100%'
					border-radius={config.deviceType === 'Mobile' ? '0px' : ''}
					border={config.deviceType === 'Mobile' ? 'none' : ''}
					mask
					background-color='#fff'
					onClose={() => {
						setUpdateProfile(false)
					}}
					visible={updateProfile}
				>
					<div
						style={{
							width: '100%',
							height: '100%',
							display: 'flex',
							flexDirection: 'column',
							justifyContent: 'space-between',
						}}
					>
						<saki-modal-header
							ref={bindEvent({
								close: (e) => {
									setUpdateProfile(false)
								},
							})}
							closeIcon
							title={t('profile', {
								ns: 'settings',
							})}
						/>
						{updateProfile ? (
							<saki-sso
								ref={bindEvent({
									updateUser: async (e) => {
										// store.dispatch(
										// 	userSlice.actions.login({
										// 		token: e.detail.token,
										// 		deviceId: e.detail.deviceId,
										// 		userInfo: e.detail.userInfo,
										// 	})
										// )
										const res = await dispatch(
											methods.user.checkToken({
												token: user.token,
												deviceId: user.deviceId,
											})
										)
										if (res) {
											// api.updateProfile()
										}
										console.log('更新内容数据,')
									},
								})}
								disable-header
								style={{
									flex: '1',
								}}
								class='disabled-dark'
								app-id={sakisso.appId}
								language={config.language}
								// appearance={appearance.mode}
								// url={"https://aiiko.club"}
								url={sakisso.clientUrl + '/profile'}
							/>
						) : (
							''
						)}
					</div>
				</saki-modal>
			</div>
		</div>
	)
}

const Language = ({ show }: { show: boolean }) => {
	const { t, i18n } = useTranslation('settings')
	const language = useSelector((state: RootState) => state.config.language)

	const dispatch = useDispatch<AppDispatch>()
	// useEffect(() => {
	// 	setMode(appearance.mode)
	// }, [appearance.mode])
	const router = useRouter()

	useEffect(() => {}, [language])

	const [languages, setLanguages] = useState([
		{
			value: 'zh-CN',
			content: '中文(简体) - Chinese(Simplified)',
		},
		{
			value: 'zh-TW',
			content: '中文(繁體) - Chinese(Traditional)',
		},
		{
			value: 'en-US',
			content: 'English - English',
		},
	])

	let basePathname = router.pathname.replace('/[lang]', '')

	return (
		<div
			style={{
				display: show ? 'block' : 'none',
			}}
		>
			<SettingsItem
				subtitle={() => <div>{t('language')}</div>}
				main={() => (
					<saki-checkbox
						ref={bindEvent({
							async selectvalue(e) {
								localStorage.setItem('language', e.detail.value)

								// router.locale = e.detail
								Object.keys(router.query).forEach((k) => {
									// console.log(k, basePathname.indexOf(`[${k}]`))
									const i = basePathname.indexOf(`[${k}]`)
									if (i >= 0) {
										basePathname = basePathname.replace(
											`[${k}]`,
											String(router.query[k])
										)

										delete router.query[k]
									}
								})
								// console.log('basePathname', basePathname)
								const pathname = Query(
									(e.detail.value === 'system' ? '' : '/' + e.detail.value) +
										basePathname,
									{
										...router.query,
										lang: '',
									}
								)
								console.log('pathname', router, pathname)

								router.replace(pathname || '/')

								// store.dispatch(methods.config.setLanguage(e.detail.value))
							},
						})}
						value={language}
						flex-direction='Column'
						type='Radio'
					>
						<saki-checkbox-item margin='14px 8px 14px 0' value='system'>
							{t('system')}
						</saki-checkbox-item>
						{languages.map((v, i) => {
							return (
								<saki-checkbox-item
									margin='14px 8px 14px 0'
									key={i}
									value={v.value}
								>
									{v.content}
								</saki-checkbox-item>
							)
						})}
					</saki-checkbox>
				)}
			></SettingsItem>
		</div>
	)
}

const Maps = ({ show }: { show: boolean }) => {
	const { t, i18n } = useTranslation('settings')
	const config = useSelector((state: RootState) => state.config)
	const layout = useSelector((state: RootState) => state.layout)

	const dispatch = useDispatch<AppDispatch>()

	const [openMapUrlDowndrop, setOpenMapUrlDowndrop] = useState(false)
	const [speedColorType, setSpeedColorType] = useState(
		Object.keys(config.configure?.speedColorLimit || {})?.[0]
	)
	const [speedColorLimit, setSpeedColorLimit] = useState(
		(config.configure as any)?.speedColorLimit?.[
			speedColorType
		] as protoRoot.configure.Configure.SpeedColorLimit.ISpeedColorLimitItem
	)

	const [openSpeedColorTypeDropdown, setOpenSpeedColorTypeDropdown] =
		useState(false)

	const [openTrackRouteMapUrlDowndrop, setOpenTrackRouteMapUrlDowndrop] =
		useState(false)

	useEffect(() => {
		setSpeedColorLimit(
			(config.configure as any)?.speedColorLimit?.[
				speedColorType
			] as protoRoot.configure.Configure.SpeedColorLimit.ISpeedColorLimitItem
		)
	}, [speedColorType, layout.openSettingsModal])

	const sliderRange = getSpeedColorSliderRange(speedColorType)

	return (
		<div
			style={{
				display: show ? 'block' : 'none',
				height: '100%',
			}}
			className='setting-maps scrollBarHover'
		>
			<SettingsItem
				subtitle={() => <div>{t('basemap')}</div>}
				main={() => (
					// <saki-checkbox
					// 	ref={bindEvent({
					// 		async selectvalue(e) {
					// 			console.log(e)
					// 			dispatch(methods.config.setMapKey(e.detail.value))
					// 		},
					// 	})}
					// 	value={config.mapKey}
					// 	flex-direction='Column'
					// 	type='Radio'
					// >
					// 	{maps.map((v, i) => {
					// 		return (
					// 			<saki-checkbox-item key={i} margin='14px 8px 14px 0' value={v.key}>
					// 				{t(v.key)}
					// 			</saki-checkbox-item>
					// 		)
					// 	})}
					// </saki-checkbox>
					<>
						<div className='sm-basemap'>
							<span>{t('basemap')}</span>
							<saki-dropdown
								visible={openMapUrlDowndrop}
								floating-direction='Left'
								z-index='1000'
								ref={bindEvent({
									close: () => {
										setOpenMapUrlDowndrop(false)
									},
								})}
							>
								<saki-button
									border='none'
									bg-hover-color='transparent'
									bg-active-color='transparent'
									padding='0px'
									ref={bindEvent({
										tap: () => {
											setOpenMapUrlDowndrop(true)
										},
									})}
								>
									<span
										style={{
											color: '#666',
										}}
										className='name'
									>
										{t(
											maps.filter((v) => {
												return v.key === config.configure.baseMap?.mapKey
											})?.[0]?.key
										)}
									</span>
									<saki-icon
										width='12px'
										height='12px'
										color='#999'
										margin='0 0 0 6px'
										type='Bottom'
									></saki-icon>
								</saki-button>
								<div slot='main'>
									<saki-menu
										ref={bindEvent({
											selectvalue: async (e) => {
												console.log(e.detail.value)

												dispatch(
													methods.config.SetConfigure({
														...config.configure,
														baseMap: {
															...config.configure['baseMap'],
															mapKey: e.detail.value,
														},
													})
												)

												setOpenMapUrlDowndrop(false)
											},
										})}
									>
										{maps.map((v, i) => {
											return (
												<saki-menu-item
													key={i}
													// width={dropdownWidth}
													padding='10px 18px'
													value={v.key}
												>
													<div className='note-item'>
														<span className='text-elipsis'>{t(v.key)}</span>
													</div>
												</saki-menu-item>
											)
										})}
									</saki-menu>
								</div>
							</saki-dropdown>
						</div>
						<saki-segmented
							ref={bindEvent({
								changevalue: (e) => {
									console.log('SetConfigure segmented', e)
									dispatch(
										methods.config.SetConfigure({
											...config.configure,
											baseMap: {
												...config.configure['baseMap'],
												mapMode: e.detail,
											},
										})
									)
								},
							})}
							width='100%'
							height='36px'
							border-radius='18px'
							margin='12px 0 0'
							value={config.configure.baseMap?.mapMode || 'Normal'}
							// value={config.configure.baseMap?.mapMode || 'Normal'}
						>
							{['Normal', 'Gray', 'Dark', 'Black'].map((v, i) => {
								return (
									<saki-segmented-item value={v} key={i}>
										<span>{t(v.toLowerCase() + 'Mode')}</span>
									</saki-segmented-item>
								)
							})}
						</saki-segmented>

						<div className='sm-bm-recommend'>
							{config.mapRecommend.baseMap.map((v, i) => {
								return (
									<div
										ref={
											bindEvent({
												click: () => {
													dispatch(
														methods.config.SetConfigure({
															...config.configure,
															baseMap: {
																mapKey: v.mapKey,
																mapMode: v.mapMode,
															},
														})
													)
												},
											}) as any
										}
										key={i}
										className='sm-r-item'
									>
										<span>
											{t(v.mapKey)}
											{v.mapMode !== 'Normal'
												? '-' + t(v.mapMode.toLowerCase() + 'Mode')
												: ''}
										</span>
									</div>
								)
							})}
						</div>

						<div className='sm-basemap'>
							<span>{t('trackRouteBaseMap')}</span>
							<saki-dropdown
								visible={openTrackRouteMapUrlDowndrop}
								floating-direction='Left'
								z-index='1000'
								ref={bindEvent({
									close: () => {
										setOpenTrackRouteMapUrlDowndrop(false)
									},
								})}
							>
								<saki-button
									border='none'
									bg-hover-color='transparent'
									bg-active-color='transparent'
									padding='0px'
									ref={bindEvent({
										tap: () => {
											setOpenTrackRouteMapUrlDowndrop(true)
										},
									})}
								>
									<span
										style={{
											color: '#666',
										}}
										className='name'
									>
										{t(
											maps.filter((v) => {
												return v.key === config.configure.trackRouteMap?.mapKey
											})?.[0]?.key
										)}
									</span>
									<saki-icon
										width='12px'
										height='12px'
										color='#999'
										margin='0 0 0 6px'
										type='Bottom'
									></saki-icon>
								</saki-button>
								<div slot='main'>
									<saki-menu
										ref={bindEvent({
											selectvalue: async (e) => {
												console.log(e.detail.value)

												dispatch(
													methods.config.SetConfigure({
														...config.configure,
														trackRouteMap: {
															...config.configure['trackRouteMap'],
															mapKey: e.detail.value,
														},
													})
												)
												setOpenTrackRouteMapUrlDowndrop(false)
											},
										})}
									>
										{maps.map((v, i) => {
											return (
												<saki-menu-item
													key={i}
													// width={dropdownWidth}
													padding='10px 18px'
													value={v.key}
												>
													<div className='note-item'>
														<span className='text-elipsis'>{t(v.key)}</span>
													</div>
												</saki-menu-item>
											)
										})}
									</saki-menu>
								</div>
							</saki-dropdown>
						</div>
						<saki-segmented
							ref={bindEvent({
                changevalue: (e) => {
                  console.log(e)
									dispatch(
										methods.config.SetConfigure({
											...config.configure,
											trackRouteMap: {
												...config.configure['trackRouteMap'],
												mapMode: e.detail,
											},
										})
									)
								},
							})}
							width='100%'
							height='36px'
							border-radius='18px'
							margin='12px 0 0'
							value={config.configure.trackRouteMap?.mapMode || 'Normal'}
							// value={config.configure.baseMap?.mapMode || 'Normal'}
						>
							{['Normal', 'Gray', 'Dark', 'Black'].map((v, i) => {
								return (
									<saki-segmented-item value={v} key={i}>
										<span>{t(v.toLowerCase() + 'Mode')}</span>
									</saki-segmented-item>
								)
							})}
						</saki-segmented>

						<div className='sm-bm-recommend'>
							{config.mapRecommend.trackRouteMap.map((v, i) => {
								return (
									<div
										ref={
											bindEvent({
												click: () => {
													dispatch(
														methods.config.SetConfigure({
															...config.configure,
															trackRouteMap: {
																mapKey: v.mapKey,
																mapMode: v.mapMode,
															},
														})
													)
												},
											}) as any
										}
										key={i}
										className='sm-r-item'
									>
										<span>
											{t(v.mapKey)}
											{v.mapMode !== 'Normal'
												? '-' + t(v.mapMode.toLowerCase() + 'Mode')
												: ''}
										</span>
									</div>
								)
							})}
						</div>
					</>
				)}
			></SettingsItem>
			<SettingsItem
				subtitle={() => (
					<div>
						{t('roadColorFade', {
							ns: 'settings',
						})}
					</div>
				)}
				main={() => (
					<div className='sm-basemap'>
						<span>
							{t('roadColorFadeTip', {
								ns: 'settings',
								maps: config.mapRecommend.roadColorFadeMap
									.map((v, i) => {
										return (
											t(v.mapKey, {
												ns: 'settings',
											}) +
											(i === config.mapRecommend.roadColorFadeMap.length - 1
												? config.lang === 'en-US'
													? ','
													: ''
												: ',')
										)
									})
									.join(' '),
							})}
						</span>
						<saki-switch
							ref={bindEvent({
								change: (e) => {
									dispatch(
										methods.config.SetConfigure({
											...config.configure,
											roadColorFade: Boolean(e.detail),
										})
									)
								},
							})}
							height='24px'
							value={config.configure.roadColorFade}
						></saki-switch>
					</div>
				)}
			></SettingsItem>

			<SettingsItem
				subtitle={() => (
					<div>
						<span>{t('trackSpeed​Color')}</span>
					</div>
				)}
				main={() => (
					<>
						<saki-checkbox
							ref={bindEvent({
								async selectvalue(e) {
									dispatch(
										methods.config.SetConfigure({
											...config.configure,
											trackSpeedColor: e.detail.value,
										})
									)
								},
							})}
							value={config.configure?.trackSpeedColor || 'RedGreen'}
							flex-direction='Column'
							type='Radio'
						>
							{['RedGreen', 'PinkBlue'].map((v, i) => {
								const rgbs = getTrackSpeedColors(v as any)
								return (
									<saki-checkbox-item
										key={i}
										margin='14px 8px 14px 0'
										value={v}
									>
										<saki-row
											justify-content='space-between'
											align-items='center'
											margin='0 0 0 2px'
										>
											<span>{t(v)}</span>
											<div
												style={{
													flex: 1,
													margin: '0 0 0 8px',
												}}
												className='sm-sc-color'
											>
												<div
													style={{
														background: `linear-gradient(45deg, ${rgbs[0]},${
															rgbs[rgbs.length - 1]
														})`,
													}}
													className='sm-sc-line'
												></div>
											</div>
										</saki-row>
									</saki-checkbox-item>
								)
							})}
						</saki-checkbox>
					</>
				)}
			></SettingsItem>

			<SettingsItem
				subtitle={() => (
					<div>
						{t('speedColorLimit', {
							ns: 'tripPage',
						})}
					</div>
				)}
				main={() => (
					<>
						<div className='sm-speed-color-range'>
							<div className='sm-sc-type'>
								<span
									style={{
										color: '#000',
									}}
								>
									{t('type', {
										ns: 'tripPage',
									})}
								</span>
								<saki-dropdown
									visible={openSpeedColorTypeDropdown}
									floating-direction='Left'
									z-index='1000'
									ref={bindEvent({
										close: () => {
											setOpenSpeedColorTypeDropdown(false)
										},
									})}
								>
									<saki-button
										border='none'
										bg-hover-color='transparent'
										bg-active-color='transparent'
										padding='0px'
										ref={bindEvent({
											tap: () => {
												setOpenSpeedColorTypeDropdown(true)
											},
										})}
									>
										<span
											style={{
												color: '#666',
											}}
											className='name'
										>
											{t(speedColorType, {
												ns: 'tripPage',
											})}
										</span>
										<saki-icon
											width='12px'
											height='12px'
											color='#999'
											margin='0 0 0 6px'
											type='Bottom'
										></saki-icon>
									</saki-button>
									<div slot='main'>
										<saki-menu
											ref={bindEvent({
												selectvalue: async (e) => {
													setSpeedColorType(e.detail.value)
													setOpenSpeedColorTypeDropdown(false)
												},
											})}
										>
											{Object.keys(config.configure.speedColorLimit || {}).map(
												(v, i) => {
													return (
														<saki-menu-item
															key={i}
															padding='10px 18px'
															value={v}
															active={speedColorType === v}
														>
															<div className='note-item'>
																<span className='text-elipsis'>
																	{t(v, {
																		ns: 'tripPage',
																	})}
																</span>
															</div>
														</saki-menu-item>
													)
												}
											)}
										</saki-menu>
									</div>
								</saki-dropdown>
							</div>

							<div className='sm-sc-speed'>
								<span>
									{t('minSpeed', {
										ns: 'tripPage',
									}) +
										' ' +
										Math.round(
											(config.configure.speedColorLimit as any)[speedColorType]
												.minSpeed * 3.6
										)}
									km/h
								</span>
								<span>
									{t('maxSpeed', {
										ns: 'tripPage',
									}) +
										' ' +
										Math.round(
											(config.configure.speedColorLimit as any)[speedColorType]
												.maxSpeed * 3.6
										)}
									km/h
								</span>
							</div>

							<div className='sm-sc-range'>
								<saki-slider
									ref={bindEvent({
										changevalue(e) {
											// console.log('onChangevalue', e)

											if (e.detail?.length === 2) {
												const obj: any = {
													...config.configure.speedColorLimit,
												}
												obj[speedColorType] = {
													minSpeed:
														e.detail?.[0] / 3.6 || speedColorLimit.minSpeed,
													maxSpeed:
														e.detail?.[1] / 3.6 || speedColorLimit.maxSpeed,
												}

												console.log('SetConfigure slider', e)

												dispatch(
													methods.config.SetConfigure({
														...config.configure,
														speedColorLimit: obj,
													})
												)
											}
										},
									})}
									min={sliderRange[0]}
									max={sliderRange[1]}
									value={[
										Math.round((speedColorLimit.minSpeed || 0) * 3.6 * 100) /
											100,
										Math.round((speedColorLimit.maxSpeed || 0) * 3.6 * 100) /
											100,
									].join(';')}
									bg-color='rgb(243,243,243)'
									bg-hover-color='#eee'
									track-color={[
										`linear-gradient(45deg, ${config.speedColorRGBs[0]},${
											config.speedColorRGBs[config.speedColorRGBs.length - 1]
										})`,
									].join(';')}
									marks={[
										{
											val: sliderRange[0],
											text: sliderRange[0] + 'km/h',
											style: {
												color: 'var(--saki-default-color)',
												// fontWeight: 700,
											},
										},
										{
											val:
												Math.round(
													defaultSpeedColorLimit[speedColorType].minSpeed *
														3.6 *
														100
												) / 100,
											// text: speedColorLimit.minSpeed * 3.6 + 'km/h',
											style: {
												color: 'var(--saki-default-color)',
												// fontWeight: 700,
											},
										},
										{
											val:
												Math.round(
													defaultSpeedColorLimit[speedColorType].maxSpeed *
														3.6 *
														100
												) / 100,
											// text: speedColorLimit.maxSpeed * 3.6 + 'km/h',
											style: {
												color: 'var(--saki-default-color)',
												// fontWeight: 700,
											},
										},
										{
											val: sliderRange[1],
											text: sliderRange[1] + 'm/h',
											style: {
												color: 'var(--saki-default-color)',
												// fontWeight: 700,
											},
										},
									]
										.map((v) => JSON.stringify(v))
										.join(';')}
									tool-tip={true}
									disabled={false}
									width={'100%'}
									max-width={'100%'}
									height={'12px'}
									margin='10px 0 16px'
									border-radius='6px'
								></saki-slider>
							</div>
						</div>
					</>
				)}
			></SettingsItem>
			<SettingsItem
				subtitle={() => <div>{t('speedAnimation')}</div>}
				main={() => (
					<div className='sm-basemap'>
						<span>
							{t('speedAnimationTip', {
								ns: 'settings',
							})}
						</span>
						<saki-switch
							ref={bindEvent({
								change: (e) => {
									dispatch(
										methods.config.SetConfigure({
											...config.configure,
											speedAnimation: Boolean(e.detail),
										})
									)
								},
							})}
							height='24px'
							value={config.configure.speedAnimation}
						></saki-switch>
					</div>
				)}
			></SettingsItem>
			<SettingsItem
				subtitle={() => <div>{t('trackRouteColor')}</div>}
				main={() => (
					<saki-checkbox
						ref={bindEvent({
							async selectvalue(e) {
								dispatch(
									methods.config.SetConfigure({
										...config.configure,
										trackRouteColor: e.detail.value,
									})
								)
							},
						})}
						value={config.configure.trackRouteColor || 'Red'}
						flex-direction='Column'
						type='Radio'
					>
						{['Red', 'Blue', 'Pink'].map((v, i) => {
							return (
								<saki-checkbox-item key={i} margin='14px 8px 14px 0' value={v}>
									<div className='sm-trc-item'>
										<span>{t(v.toLowerCase())}</span>
										<div
											className='sm-trc-i-color'
											style={{
												backgroundColor: getTrackRouteColor(v as any, false),
											}}
										></div>
									</div>
								</saki-checkbox-item>
							)
						})}
					</saki-checkbox>
				)}
			></SettingsItem>
			{/* <SettingsItem
				subtitle={() => <div>{t('trackRouteDetailedData')}</div>}
				main={() => (
					<div className='sm-basemap'>
						<span>{t('trackRouteDetailedDataContent')}</span>
						<saki-switch
							ref={bindEvent({
								change: (e) => {
									store.dispatch(
										configSlice.actions.setShowDetailedDataForMultipleHistoricalTrips(
											e.detail
										)
									)
								},
							})}
							height='24px'
							value={config.showDetailedDataForMultipleHistoricalTrips}
						></saki-switch>
					</div>
				)}
			></SettingsItem> */}
			<SettingsItem
				subtitle={() => <div>{t('currentPosition')}</div>}
				main={() => (
					<div className='sm-basemap'>
						<span>
							{t('showAvatarAtCurrentPosition', {
								ns: 'settings',
							})}
						</span>
						<saki-switch
							ref={bindEvent({
								change: (e) => {
									dispatch(
										methods.config.SetConfigure({
											...config.configure,
											showAvatarAtCurrentPosition: Boolean(e.detail),
										})
									)
								},
							})}
							height='24px'
							value={config.configure.showAvatarAtCurrentPosition}
						></saki-switch>
					</div>
				)}
			></SettingsItem>
			<SettingsItem
				subtitle={() => <div>{t('tripTrackWidth')}</div>}
				main={() => (
					<>
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								margin: '16px 0',
							}}
						>
							<span
								style={{
									paddingRight: '6px',
								}}
							>
								{t('ongoingTrip')}
							</span>
							<saki-input
								ref={bindEvent({
									changevalue: (v) => {
										dispatch(
											methods.config.SetConfigure({
												...config.configure,
												polylineWidth: {
													...config.configure.polylineWidth,
													ongoingTrip: Number(v.detail) || 4,
												},
											})
										)
									},
								})}
								style={{
									flex: '1',
								}}
								width='100%'
								type='Range'
								value={config.configure.polylineWidth?.ongoingTrip}
								min='1'
								max='10'
							></saki-input>
							<span
								style={{
									paddingLeft: '6px',
								}}
							>
								{Number(config.configure.polylineWidth?.ongoingTrip) || 0}px
							</span>
						</div>

						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								margin: '16px 0',
							}}
						>
							<span
								style={{
									paddingRight: '6px',
								}}
							>
								{t('historyTripTrack')}
							</span>
							<saki-input
								ref={bindEvent({
									changevalue: (v) => {
										dispatch(
											methods.config.SetConfigure({
												...config.configure,
												polylineWidth: {
													...config.configure.polylineWidth,
													historyTripTrack: Number(v.detail) || 1,
												},
											})
										)
									},
								})}
								style={{
									flex: '1',
								}}
								width='100%'
								type='Range'
								value={config.configure.polylineWidth?.historyTripTrack}
								min='1'
								max='10'
							></saki-input>
							<span
								style={{
									paddingLeft: '6px',
								}}
							>
								{Number(config.configure.polylineWidth?.historyTripTrack) || 0}
								px
							</span>
						</div>

						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								margin: '16px 0',
							}}
						>
							<span
								style={{
									paddingRight: '6px',
								}}
							>
								{t('historyTripTrackSelectedTrip')}
							</span>
							<saki-input
								ref={bindEvent({
									changevalue: (v) => {
										dispatch(
											methods.config.SetConfigure({
												...config.configure,
												polylineWidth: {
													...config.configure.polylineWidth,
													historyTripTrackSelectedTrip: Number(v.detail) || 2,
												},
											})
										)
									},
								})}
								style={{
									flex: '1',
								}}
								width='100%'
								type='Range'
								value={
									config.configure.polylineWidth?.historyTripTrackSelectedTrip
								}
								min='1'
								max='10'
							></saki-input>
							<span
								style={{
									paddingLeft: '6px',
								}}
							>
								{Number(
									config.configure.polylineWidth?.historyTripTrackSelectedTrip
								) || 0}
								px
							</span>
						</div>

						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								margin: '16px 0',
							}}
						>
							<span
								style={{
									paddingRight: '6px',
								}}
							>
								{t('reviewTrip')}
							</span>
							<saki-input
								ref={bindEvent({
									changevalue: (v) => {
										dispatch(
											methods.config.SetConfigure({
												...config.configure,
												polylineWidth: {
													...config.configure.polylineWidth,
													reviewTrip: Number(v.detail) || 6,
												},
											})
										)
									},
								})}
								style={{
									flex: '1',
								}}
								width='100%'
								type='Range'
								value={config.configure.polylineWidth?.reviewTrip}
								min='1'
								max='10'
							></saki-input>
							<span
								style={{
									paddingLeft: '6px',
								}}
							>
								{Number(config.configure.polylineWidth?.reviewTrip) || 0}px
							</span>
						</div>
					</>
				)}
			></SettingsItem>
		</div>
	)
}

// const Appearance = ({ show }: { show: boolean }) => {
// 	const { t, i18n } = useTranslation('settings')
// 	const appearance = useSelector((state: RootState) => state.appearance)

// 	const dispatch = useDispatch<AppDispatch>()
// 	const [mode, setMode] = useState(appearance.mode)
// 	useEffect(() => {
// 		setMode(appearance.mode)
// 	}, [appearance.mode])
// 	return (
// 		<div
// 			style={{
// 				display: show ? 'block' : 'none',
// 			}}
// 		>
// 			<SettingsItem
// 				subtitle={() => <div>{t('modes')}</div>}
// 				main={() => (
// 					<saki-checkbox
// 						ref={bindEvent({
// 							async selectvalue(e) {
// 								console.log(e.detail.value)
// 								await dispatch(
// 									methods.appearance.SetMode(e.detail.value)
// 								).unwrap()
// 								api.updateSetting({
// 									type: 'appearance',
// 								})

// 								api.showNotification({
// 									title: t('appearance', {
// 										ns: 'settings',
// 									}),
// 									content:
// 										t('switchSuccessfully', {
// 											ns: 'settings',
// 										}) + t(e.detail.value),
// 									timeout: 3000,
// 								})
// 							},
// 						})}
// 						value={mode}
// 						flex-direction='Column'
// 						type='Radio'
// 					>
// 						<saki-checkbox-item margin='14px 8px 14px 0'  value='light'>
// 							{t('light')}
// 						</saki-checkbox-item>
// 						<saki-checkbox-item margin='14px 8px 14px 0'  value='dark'>
// 							{t('dark')}
// 						</saki-checkbox-item>
// 						<saki-checkbox-item margin='14px 8px 14px 0'  value='black'>
// 							{t('black')}
// 						</saki-checkbox-item>
// 						<saki-checkbox-item margin='14px 8px 14px 0'  value='system'>
// 							{t('system')}
// 						</saki-checkbox-item>
// 					</saki-checkbox>
// 				)}
// 			></SettingsItem>
// 		</div>
// 	)
// }

const Cache = ({ show }: { show: boolean }) => {
	const { t, i18n } = useTranslation('settings')
	const dispatch = useDispatch<AppDispatch>()

	const layout = useSelector((state: RootState) => state.layout)

	const [size, setSize] = useState(0)

	useEffect(() => {
		if (show) {
			getSize()
		}
	}, [show, layout.settingType])

	const getSize = async () => {
		const tripPositions = await storage.tripPositions.getAll()
		const trips = await storage.trips.getAll()

		// console.log(tripPositions, JSON.stringify(tripPositions).length)
		const s =
			JSON.stringify(tripPositions).length + JSON.stringify(trips).length - 4
		setSize(s <= 0 ? 0 : s)
	}

	return (
		<div
			style={{
				display: show ? 'block' : 'none',
			}}
		>
			<div className='setting-cache'>
				<saki-button
					ref={bindEvent({
						tap: () => {
							storage.trips.deleteAll()
							storage.tripPositions.deleteAll()
							setTimeout(() => {
								getSize()
							}, 300)
						},
					})}
					margin='20px 0 0'
					width='200px'
					padding='10px 10px'
					type='Primary'
				>
					{t('clearCache', {
						ns: 'settings',
						size: byteConvert(size),
					})}
				</saki-button>
			</div>
		</div>
	)
}

const About = ({ show }: { show: boolean }) => {
	const { t, i18n } = useTranslation('settings')
	// const appearance = useSelector((state: RootState) => state.appearance)
	const config = useSelector((state: RootState) => state.config)

	const dispatch = useDispatch<AppDispatch>()
	return (
		<div
			style={{
				display: show ? 'block' : 'none',
			}}
			className='setting-about-page'
		>
			<div className='version-info'>
				<img src='/icons/256x256.png' alt='' />
				<div className='version-code'>
					<span>Version v{version}</span>
				</div>
			</div>

			<SettingsItem
				subtitle={() => (
					<div>
						{t('about') +
							t('appTitle', {
								ns: 'common',
							})}
					</div>
				)}
				main={() => (
					<div className='about-links'>
						<saki-button
							ref={bindEvent({
								tap: () => {
									let url =
										'https://github.com/ShiinaAiiko/nyanya-trip-route-track'

									window.open(url)
								},
							})}
							border='none'
							padding='0'
							bg-hover-color='transparent'
							bg-active-color='transparent'
						>
							<div className='settings-link'>
								<svg
									aria-hidden='true'
									viewBox='0 0 16 16'
									version='1.1'
									width='26'
									height='26'
									data-view-component='true'
									className='icon'
								>
									<path d='M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z'></path>
								</svg>
								<span>Github</span>
							</div>
						</saki-button>
					</div>
				)}
			></SettingsItem>
		</div>
	)
}

export default SettingsComponent
