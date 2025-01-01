import { HttpService } from '@nestjs/axios'
import { Injectable } from '@nestjs/common'
import { lookup } from 'geoip-lite'

type IP = string
export interface IPLocation {
  country: string
  country_code: string
  region: string
  region_code: string
  city: string
  zip: string
  latitude: number
  longitude: number
}

@Injectable()
export class HelperServiceIp {
  constructor(private readonly httpService: HttpService) {}

  /**
   * https://ip-api.com/docs/api:json 获取ip 信息
   * @private
   * @param {string} ip
   * @return {*}
   * @memberof HelperServiceIp
   */
  private queryLocationApi(ip: IP): Promise<IPLocation> {
    return this.httpService.axiosRef
      .get<any>(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip`)
      .then((response) => {
        return response.data?.status !== 'success'
          ? Promise.reject(response.data.message)
          : Promise.resolve({
              country: response.data.country,
              country_code: response.data.countryCode,
              region: response.data.regionName,
              region_code: response.data.region,
              city: response.data.city,
              zip: response.data.zip,
              latitude: response.data.lat,
              longitude: response.data.lon,
            })
      })
      .catch((error) => {
        const message = error?.response?.data || error?.message || error
        // logger.warn('queryLocationByIPAPI failed!', message)
        return Promise.reject(message)
      })
  }

  /**
   * https://ipapi.co/api/#introduction ipapi获取ip 信息
   * @private
   * @param {IP} ip
   * @return {*}  {Promise<IPLocation>}
   * @memberof HelperServiceIp
   */
  private queryLocationByAPICo(ip: IP): Promise<IPLocation> {
    return this.httpService.axiosRef
      .get<any>(`https://ipapi.co/${ip}/json/`)
      .then((response) => {
        return response.data?.error
          ? Promise.reject(response.data.reason)
          : Promise.resolve({
              country: response.data.country_name,
              country_code: response.data.country_code,
              region: response.data.region,
              region_code: response.data.region_code,
              city: response.data.city,
              zip: response.data.postal,
              latitude: response.data.latitude,
              longitude: response.data.longitude,
            })
      })
      .catch((error) => {
        const message = error?.response?.data || error?.message || error
        // logger.warn('queryLocationByAPICo failed!', message)
        return Promise.reject(message)
      })
  }

  /**
   * geoip-lite 获取IP信息
   * @private
   * @param {IP} ip
   * @return {*}  {(Promise<IPLocation | null>)}
   * @memberof HelperServiceIp
   */
  private quertyLocationLite(ip: IP): Promise<IPLocation | null> {
    const res = lookup(ip)
    if (!res) return Promise.resolve(null)
    return Promise.resolve({
      country: res.country,
      country_code: res.country,
      region: res.region,
      region_code: res.region,
      city: res.city,
      zip: res.metro + '',
      latitude: res.ll[0],
      longitude: res.ll[1],
    })
  }

  /**
   * 获取IP
   * @param {IP} ip
   * @return {*}  {(Promise<IPLocation | null>)}
   * @memberof HelperServiceIp
   */
  public queryLocation(ip: IP): Promise<IPLocation | null> {
    return this.queryLocationApi(ip)
      .catch(() => this.queryLocationByAPICo(ip))
      .catch(() => this.quertyLocationLite(ip))
  }
}
