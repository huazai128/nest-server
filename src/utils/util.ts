import { networkInterfaces } from 'os';
import { Base64 } from 'js-base64';
import { createHash } from 'crypto';
import { Request } from 'express';
import { UAParser, IResult } from 'ua-parser-js';
import { PipelineStage } from 'mongoose';
import { TimeInfo, TimeMatch } from '@app/interfaces/request.interface';
import * as dayjs from 'dayjs';

/**
 * 获取服务端IP
 * @export
 * @return {*}
 */
export function getServerIp(): string | undefined {
  const interfaces = networkInterfaces();
  for (const devName in interfaces) {
    const iface = interfaces[devName] as Array<any>;
    for (let i = 0; i < iface.length; i++) {
      const alias = iface[i];
      if (
        alias.family === 'IPv4' &&
        alias.address !== '127.0.0.1' &&
        !alias.internal
      ) {
        return alias.address;
      }
    }
  }
}

/**
 * 获取客户端IP
 * @export
 * @param {Request} req
 * @return {*}  {string}
 */
export function getClientIp(req: Request): string | undefined {
  const ip =
    (req.headers['x-forwarded-for'] as string) ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    req.ip ||
    req.ips[0];
  return (
    ip.replace('::ffff:', '').replace('::1', '')?.split(',')?.[0] || undefined
  );
}
/**
 * Base64 编码
 * @export
 * @param {string} value
 * @return {*}  {string}
 */
export function decodeBase64(value: string): string {
  return value ? Base64.decode(value) : value;
}

/**
 * md5 编码
 * @export
 * @param {string} value
 * @return {*}  {string}
 */
export function decodeMd5(value: string): string {
  return createHash('md5').update(value).digest('hex');
}

/**
 * 解析UA
 * @export
 * @param {string} ua
 * @return {*}  {IResult}
 */
export function getUaInfo(ua: string): IResult {
  const parser = new UAParser();
  parser.setUA(ua);
  return parser.getResult();
}

/**
 * 处理今天、昨天、7天前Match
 * @private
 * @param {PipelineStage.Match['$match']} matchFilter
 * @param {TimeInfo} { startTime, endTime }
 * @return {*}  {TimeMatch}
 * @memberof PvLogService
 */
export function handleTime(
  matchFilter: PipelineStage.Match['$match'],
  { startTime, endTime }: TimeInfo,
): TimeMatch {
  const nStartTime = startTime
    ? dayjs(startTime).add(8, 'h').valueOf()
    : dayjs().startOf('day').add(8, 'h').valueOf(); // 00:00:00
  const nEndTime = dayjs(endTime).add(8, 'h').valueOf(); // 23:59:59 ,不存在就用当前时间未结束时间
  const curEndTime = dayjs().endOf('day').add(8, 'h').valueOf(); //
  const dMatch = {
    create_at: {
      $gte: new Date(nStartTime),
      $lte: new Date(!!endTime ? nEndTime : curEndTime),
    },
    ...matchFilter,
  };
  const yMatch = {
    create_at: {
      $gte: new Date(nStartTime - 24 * 60 * 60 * 1000),
      $lte: new Date(nEndTime - 24 * 60 * 60 * 1000),
    },
    ...matchFilter,
  };
  const lMatch = {
    create_at: {
      $gte: new Date(nStartTime - 7 * 24 * 60 * 60 * 1000),
      $lte: new Date(nEndTime - 7 * 24 * 60 * 60 * 1000),
    },
    ...matchFilter,
  };
  return { dMatch, yMatch, lMatch };
}
