import * as nyanyalog from 'nyanyajs-log'
import { Buffer } from 'buffer'
import Long from 'long'
import protoRoot from './proto'
import { ResponseDecode, Request } from './request'
export const PARAMS = <T = any>(data: T, proto: T | any) => {
  try {
    return {
      data: Buffer.from(
        proto.encode(proto.create(data)).finish(),
        'base64'
      ).toString('base64'),
    }
  } catch (error) {
    nyanyalog.error(error)
  }
}

export const LongToNumber = (data: any): number => {
  console.log("LongToNumber", LongToNumber)
  if (data?.hasOwnProperty('low') && typeof data?.low === 'number') {
    const long = new Long(data.low, data.high, data.unsigned)

    return long.toNumber()
  }
  return data
}

export const ForEachLongToNumber = (data: any) => {
  Object.keys(data).forEach((k) => {
    if (typeof data[k] === 'object') {
      if (data[k]?.hasOwnProperty('low')) {
        data[k] = LongToNumber(data[k])
      } else {
        ForEachLongToNumber(data[k])
      }
    } else {
      const num = Number(data[k])
      if (!Number.isNaN(num)) {
        data[k] = num
      }
    }
  })
  return data
}

export { protoRoot, ResponseDecode, Request }
