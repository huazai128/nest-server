import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import logger from '@app/utils/logger';
import { isProdEnv } from '@app/app.env';
import { ALARM_URL } from '@app/config';

@Injectable()
export class HelperServiceServerAlarm {
  constructor(private readonly httpService: HttpService) {}
  /**
   *  日志上报系统DB连接错误告警
   * @param {title: string; content: string} data
   * @memberof HelperServiceAlarn
   */
  async sendDBConnectAlarm(data: { title: string; content: string }) {
    // 开发环境不上报
    if (!isProdEnv) return;
    this.httpService.axiosRef
      .post(
        ALARM_URL,
        {
          msgtype: 'markdown',
          markdown: {
            content: `>环境:<font color=\"comment\">${isProdEnv ? '正式环境' : '开发环境'}</font>
                    >上报标题:<font color=\"comment\">${data.title}</font>
                    >上报内容:<font color=\"comment\">${data.content}</font>`,
          },
        },
        {
          headers: {
            Connection: 'keep-alive',
            'Keep-Alive': 'timeout=30',
          },
        },
      )
      .catch((error) => {
        logger.error(
          `日志上报系统告警错误:${ALARM_URL}`,
          JSON.stringify(error),
        );
      });
  }
}
