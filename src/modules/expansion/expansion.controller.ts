import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { ExpansionServiceUpload } from './expansion.service.upload';
import { createLogger } from '@app/utils/logger';
import { Observable } from 'rxjs';

const logger = createLogger({ scope: 'ExpansionController', time: true });

@Controller()
export class ExpansionController {
  constructor(private readonly uploadService: ExpansionServiceUpload) {}

  /**
   * 文件zip上传(后续可以改成上传到云)
   * @param {any} data - 包含文件和站点ID的数据
   * @return {*} 上传结果
   * @memberof ExpansionController
   */
  @GrpcMethod('ExpansionService', 'uploadZipFile')
  public async uploadZipFile(data: any) {
    logger.info('uploadZipFile', data);
    return await this.uploadService.uploadZip(data.file, data.siteId);
  }

  /**
   * 流式上传大文件 - 将文件分割成多个小块进行传输
   * @param {Observable<any>} fileChunks - 文件块流
   * @return {Promise<any>} 上传结果
   * @memberof ExpansionController
   */
  @GrpcMethod('ExpansionService', 'uploadZipFileStream')
  public async uploadZipFileStream(fileChunks: Observable<any>): Promise<any> {
    logger.info('开始接收文件流');
    return await this.uploadService.uploadZipStream(fileChunks);
  }
}
