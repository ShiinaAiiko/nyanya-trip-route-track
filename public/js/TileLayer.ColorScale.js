L.TileLayer.ColorScale = L.TileLayer.extend({
	options: {
		isGrayscale: false,
		isDarkscale: false,
		isBlackscale: false,
	},

	initialize: function (url, options) {
		options = options || {}
		options.crossOrigin = true
		L.TileLayer.prototype.initialize.call(this, url, options)
		L.TileLayer.prototype.setGrayscale = this.setGrayscale
		L.TileLayer.prototype.setDarkscale = this.setDarkscale
		L.TileLayer.prototype.setBlackscale = this.setBlackscale
		this.on('tileload', function (e) {
			if (!e.target.options.key) {
				e.target.options.key = 'colorscale' + e.target._leaflet_id
			}

			this._makeGrayscale(e.tile)
			this._makeDarkscale(e.tile)
			this._makeBlackscale(e.tile)
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
			.querySelectorAll('.tile-color-scale.' + this.options.key + '')
			.forEach((img) => {
				if (state) {
					img.classList.add('tile_grayscale')
				} else {
					img.classList.remove('tile_grayscale')
				}
			})
	},
	setDarkscale: function (state = false) {
		this.options.isDarkscale = state
		this.isDarkscale = state
		document
			.querySelectorAll('.tile-color-scale.' + this.options.key + '')
			.forEach((img) => {
				if (state) {
					img.classList.add('tile_darkscale')
				} else {
					img.classList.remove('tile_darkscale')
				}
			})
	},
	setBlackscale: function (state = false) {
		this.options.isBlackscale = state
		this.isBlackscale = state
		document
			.querySelectorAll('.tile-color-scale.' + this.options.key + '')
			.forEach((img) => {
				if (state) {
					img.classList.add('tile_blackscale')
				} else {
					img.classList.remove('tile_blackscale')
				}
			})
	},

	_makeGrayscale: function (img) {
		img.classList.add(this.options.key)
		img.classList.add('tile-color-scale')
		if (this.options.isGrayscale) {
			img.classList.add('tile_grayscale')
		} else {
			img.classList.remove('tile_grayscale')
		}
	},

	_makeDarkscale: function (img) {
		img.classList.add(this.options.key)
		img.classList.add('tile-color-scale')
		if (this.options.isDarkscale) {
			img.classList.add('tile_darkscale')
		} else {
			img.classList.remove('tile_darkscale')
		}
  },
  
	_makeBlackscale: function (img) {
		img.classList.add(this.options.key)
		img.classList.add('tile-color-scale')
		if (this.options.isBlackscale) {
			img.classList.add('tile_blackscale')
		} else {
			img.classList.remove('tile_blackscale')
		}
	},
})

L.tileLayer.colorScale = function (url, options) {
	return new L.TileLayer.ColorScale(url, options)
}
