
import { getShortId } from '@nyanyajs/utils';
import md5 from 'blueimp-md5';
import Leaflet, { ControlPosition } from 'leaflet'

export const getZoomDistanceScale = (zoom: number) => {
  const scaleValues: {
    [zoom: number]: number
  } = {
    0: 500000,
    1: 10000,
    2: 4000,
    3: 2000,
    4: 1000,
    5: 400,
    6: 200,
    7: 100,
    8: 60,
    9: 30,
    10: 12,
    11: 8,
    12: 5,
    13: 2,
    14: 1,
    15: 0.5,
    16: 0.2,
    17: 0.1,
    18: 0.05
  };

  const scaleValuesKeys = Object.keys(scaleValues)

  for (let i = 0; i < scaleValuesKeys.length; i++) {
    const k = Number(scaleValuesKeys[i])
    const val = scaleValues[k]
    // console.log("getZoomDistanceScale", k, val)
    if (zoom >= k && zoom < k + 1) {
      return {
        distance: zoom === k ? scaleValues[k] : scaleValues[k + 1],
        percentage: 1 - (zoom - k)
      }
    }

  }


  return {
    distance: scaleValues[1],
    percentage: 1

  }

}


export const createDistanceScaleControl = (map: Leaflet.Map, rulerMaxWidth: number = 100, controlStyle: {
  position: ControlPosition
  x?: string,
  y?: string
}) => {
  const L: typeof Leaflet = (window as any).L
  const customScale = L.control.zoom({
    position: controlStyle.position,
  })

  // console.log("createDistanceScaleControl", map)


  const id = getShortId(9)

  customScale.onAdd = (map) => {
    const div = L.DomUtil.create('div', 'custom-distance-scale')
    div.classList.add(id)
    div.style.transform = `translate(${controlStyle.x || "0px"}, ${controlStyle.y || "0px"})`
    div.innerHTML = '<span class="ds-distance"></span><div class="ds-ruler"></div>'
    return div
  }

  customScale.addTo(map)

  const funcObj = {
    setDistance: (zoom: number) => {
      const dsEl: HTMLElement = document.querySelector('.' + id + '.custom-distance-scale') as any
      if (!dsEl) return
      const disEl = dsEl?.querySelector('.ds-distance')
      const dis = getZoomDistanceScale(zoom || 1)
      console.log("getZoomDistanceScale dis", zoom, dis)
      if (dis) {
        const rulerEl = dsEl?.querySelector('.ds-ruler') as HTMLElement

        if (rulerEl) {
          rulerEl.style.width = rulerMaxWidth * dis.percentage + "px"
        }
      }
      if (disEl) {
        disEl.innerHTML = String(
          dis.distance >= 1 ? dis.distance + "km" : dis.distance * 1000 + "m"
        )
      }

    }
  }
  map.on('zoom', (e) => {
    console.log('zoomEvent1', e.target._zoom)
    funcObj.setDistance(e.target._zoom)
  })
  funcObj.setDistance(map.getZoom())
  return funcObj
}