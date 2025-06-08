import { ErrorLog } from '@app/modules/error/error.model';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { getSiteCacheKey } from '@app/constants/cache.contant';
import { UserLog } from '@app/modules/user/user.model';
import { CONFIG } from '@app/config';
import { RedisService } from '../redis/redis.service';
import { Site } from '@app/modules/site/site.model';
import { createLogger } from '@app/utils/logger';

const logger = createLogger({ scope: 'HelperServiceAlarn', time: true });

interface Alarm {
  msgtype: string;
  markdown: object;
}

/**
 * 告警服务
 * @export
 * @class HelperServiceAlarn
 */
@Injectable()
export class HelperServiceAlarn {
  constructor(
    private readonly cacheService: RedisService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * 发送错误警告
   * @private
   * @param {*} eventData
   * @memberof HelperServiceAlarn
   */
  public async sendErrorAlarm(eventData: ErrorLog) {
    const data: Alarm = {
      msgtype: 'markdown',
      markdown: {},
    };
    if (eventData.siteId) {
      const errorDetail = eventData.errorDetailList?.[0] || '';
      switch (eventData.reportsType) {
        case 'js':
          data.markdown = {
            content: `用户ID：<font color=\"warning\">${eventData.userId}</font>
                      >环境:<font color=\"comment\">${eventData.mode}</font>
                      >错误类型:<font color=\"comment\">JS错误</font>
                      >错误信息:<font color=\"comment\">${JSON.stringify({
                        value: eventData.value,
                        type: eventData.type,
                        file: eventData.meta?.file,
                      })}</font>
                      >错误解析后堆栈信息:<font color=\"comment\">${JSON.stringify(eventData.stackTrace)}</font>
                      >错误代码详情:<font color=\"comment\">${errorDetail}</font>
                      `,
          };
          break;
        case 'resource':
          data.markdown = {
            content: `用户ID：<font color=\"warning\">${eventData.userId}</font>
                      >环境:<font color=\"comment\">${eventData.mode}</font>
                      >错误类型:<font color=\"comment\">静态资源加载错误</font>
                      >错误信息:<font color=\"comment\">${JSON.stringify(eventData.meta)}</font>`,
          };
          break;
        case 'unhandledrejection':
          data.markdown = {
            content: `用户ID：<font color=\"warning\">${eventData.userId}</font>
                      >环境:<font color=\"comment\">${eventData.mode}</font>
                      >错误类型:<font color=\"comment\">Promise错误</font>
                      >错误信息:<font color=\"comment\">${JSON.stringify({
                        value: eventData.value,
                        type: eventData.type,
                      })}</font>
                      >错误解析后堆栈信息:<font color=\"comment\">${JSON.stringify(eventData.stackTrace)}</font>
                      >错误代码详情:<font color=\"comment\">${errorDetail}</font>`,
          };
          break;
        case 'http-record':
        case 'http':
          data.markdown = {
            content: `用户ID：<font color=\"warning\">${eventData.userId}</font>
                      >环境:<font color=\"comment\">${eventData.mode}</font>
                      >错误类型:<font color=\"comment\">HTTP 请求报错</font>
                      >请求方法:<font color=\"comment\">${eventData.meta.method}</font>
                      >请求接口:<font color=\"comment\">${eventData.meta.url}</font>
                      >请求参数:<font color=\"comment\">${eventData.meta.params}</font>
                      >请求体:<font color=\"comment\">${eventData.meta.body}</font>
                      >状态码:<font color=\"comment\">${eventData.meta.status}</font>
                      >错误信息:<font color=\"comment\">${JSON.stringify(eventData.value || {})}</font>`,
          };
          break;
        case 'cors':
          data.markdown = {
            content: `用户ID：<font color=\"warning\">${eventData.userId}</font>
                      >环境:<font color=\"comment\">${eventData.mode}</font>
                      >错误类型:<font color=\"comment\">跨域报错</font>
                      >错误信息:<font color=\"comment\">${JSON.stringify(eventData.value || {})}</font>`,
          };
          break;
        case 'react':
          data.markdown = {
            content: `用户ID：<font color=\"warning\">${eventData.userId}</font>
                      >环境:<font color=\"comment\">${eventData.mode}</font>
                      >错误类型:<font color=\"comment\">React组件错误</font>
                      >错误信息:<font color=\"comment\">${JSON.stringify({
                        value: eventData.value,
                        type: eventData.type,
                        file: eventData.meta.file,
                        conponentName: eventData.meta.conponentName,
                      })}</font>
                      >错误解析后堆栈信息:<font color=\"comment\">${eventData.stackTrace}</font>
                      >错误代码详情:<font color=\"comment\">${errorDetail}</font>`,
          };
          break;
      }
      this.sendAlarm(eventData.siteId + '', data);
    }
  }

  /**
   * 用户手动上报提示
   * @param {UserLog} userLog
   * @memberof HelperServiceAlarn
   */
  public async sendUserLogAlarm(userLog: UserLog) {
    const siteInfo = await this.cacheService.get<Site>(
      getSiteCacheKey(userLog.siteId as any),
    );
    const data: Alarm = {
      msgtype: 'markdown',
      markdown: {
        content: `上报用户ID：<font color=\"warning\">${userLog.userId}</font>
                  >来源:<font color=\"comment\">${siteInfo.name}</font>
                  >环境:<font color=\"comment\">${userLog.mode}</font>
                  >用户上报内容:<font color=\"comment\">${userLog?.content}</font>
                  >查看详情:<font color=\"info\">${CONFIG.pageUrl}/admin/${userLog.id + ''}/user</font>
                  `,
      },
    };
    this.sendAlarm(userLog.siteId + '', data, true);
  }

  /**
   * 上报告警保存报错告警
   * @param {UserLog} userLog
   * @memberof HelperServiceAlarn
   */
  public async sendErrorSaveAlarm(eventData: {
    content: string;
    userId?: string;
    siteId: ErrorLog['siteId'];
  }) {
    const siteInfo = await this.cacheService.get<Site>(
      getSiteCacheKey(eventData.siteId as any),
    );
    const data: Alarm = {
      msgtype: 'markdown',
      markdown: {
        content: `上报用户ID：<font color=\"warning\">${eventData.userId}</font>
                  >来源:<font color=\"comment\">${siteInfo.name}</font>
                  >上报保存错误信息:<font color=\"comment\">${eventData?.content}</font>
                  `,
      },
    };
    this.sendAlarm(eventData.siteId + '', data);
  }

  /**
   *  总上报请求
   * @param {string} id
   * @param {Alarm} data
   * @memberof HelperServiceAlarn
   */
  private async sendAlarm(id: string, data: Alarm, isUseReport?: boolean) {
    const siteInfo = await this.cacheService.get<Site>(getSiteCacheKey(id));
    logger.info(`告警：`, JSON.stringify(data));
    if ((isUseReport && siteInfo?.feedbackUrl) || siteInfo?.reportUrl) {
      this.httpService.axiosRef
        .post(
          isUseReport && siteInfo?.feedbackUrl
            ? siteInfo.feedbackUrl
            : siteInfo.reportUrl,
          {
            ...data,
          },
          {
            headers: {
              Connection: 'keep-alive',
              'Keep-Alive': 'timeout=30',
            },
          },
        )
        .catch((error) => {
          logger.error(`上报URL:${siteInfo.reportUrl}`, JSON.stringify(error));
        });
    } else {
      logger.error('不存在上报URL', siteInfo);
    }
  }
}
