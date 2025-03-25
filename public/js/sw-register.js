const snackbar = (options) => {
	let el
	const api = {
		open() {
			// console.log('state.app.status', el)
			if (el) {
				el.open()
				return
			}
			el = document.createElement('saki-snackbar')
			// console.log('state.app.status', el)
			// console.log(el)
			const { onTap } = options
			Object.keys(options).forEach((k) => {
				if (k != 'onTap' && options[k]) {
					el[k] = options[k]
				}
			})
			if (onTap) {
				el['allowContentClick'] = 'true'
				el.addEventListener('tap', () => {
					onTap()
				})
			}
			el.addEventListener('load', () => {
				el.open()
			})
			el.addEventListener('close', () => {
				document.body.contains(el) && document.body.removeChild(el)
				el = null
			})
			document.body.appendChild(el)
		},
		close() {
			el?.close && el?.close()
		},
		setMessage(msg) {
			console.log('elelelel', el)
			if (el) {
				el['message'] = msg
			} else {
				options.message = msg
			}
		},
	}
	return api
}
if ('serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		navigator.serviceWorker.register('/sw.js').then((registration) => {
			registration.addEventListener('updatefound', () => {
				const newWorker = registration.installing
				newWorker.addEventListener('statechange', () => {
					if (
						newWorker.state === 'installed' &&
						navigator.serviceWorker.controller
					) {
						// 新版本已安装，提示刷新
						snackbar({
							message: 'The new version has been updated! Refresh to use.',
							autoHideDuration: 4000,
							vertical: 'top',
							horizontal: 'center',
							backgroundColor: 'var(--saki-default-color)',
							color: '#fff',
						}).open()
						// if (confirm('New version available. Refresh now?')) {
						// 	console.log('New version available. Refresh now?')
						// 	window.location.reload()
						// }
					}
				})
			})
		})
	})
}
