L.TileLayer.Grayscale = L.TileLayer.extend({
	options: {
		isGrayscale: false,
	},

	initialize: function (url, options) {
		options = options || {}
		options.crossOrigin = true
		L.TileLayer.prototype.initialize.call(this, url, options)
		L.TileLayer.prototype.setGrayscale = this.setGrayscale
		this.on('tileload', function (e) {
			if (!e.target.options.key)
				e.target.options.key = 'grayscale' + e.target._leaflet_id
			this._makeGrayscale(e.tile)
		})
	},

	_createTile: function () {
		const tile = L.TileLayer.prototype._createTile.call(this)
		tile.crossOrigin = 'Anonymous'
		return tile
	},

	// 设置底图是否灰度---默认取消灰度
	setGrayscale: function (state = false) {
		this.options.isGrayscale = state
		this.isGrayscale = state
		document
			.querySelectorAll('.custom_tile_grayscale.' + this.options.key + '')
			.forEach((img) => {
				if (state) {
					img.classList.add('tile_grayscale')
				} else {
					img.classList.remove('tile_grayscale')
				}
			})
	},

	_makeGrayscale: function (img) {
		img.classList.add(this.options.key)
		img.classList.add('custom_tile_grayscale')
		if (this.options.isGrayscale) {
			img.classList.add('tile_grayscale')
		} else {
			img.classList.remove('tile_grayscale')
		}
	},
})

L.tileLayer.grayscale = function (url, options) {
	return new L.TileLayer.Grayscale(url, options)
}
