import { vehicleApi } from './vehicle'
import { positionApi } from './position'
import { configureApi } from './configure'
import { tripApi } from './trip'
import { openApi } from './open'
import { cityApi } from './city'
import { journeyMemoryApi } from './journeyMemory'
import { fileApi } from './file'
import { roadApi } from './road'
import { privacyGeofenceApi } from './privacyGeofence'
import { roadbookApi } from './roadbook'
import { navigationApi } from './navigation'
import { geoApi } from './geo'

export const v1 = {
  ...tripApi,
  ...vehicleApi,
  ...positionApi,
  ...configureApi,
  ...openApi,
  ...cityApi,
  ...journeyMemoryApi,
  ...fileApi,
  ...roadApi,
  ...privacyGeofenceApi,
  ...roadbookApi,
  ...navigationApi,
  ...geoApi,
}
