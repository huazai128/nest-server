import { Controller, UseInterceptors } from '@nestjs/common';
import { GrpcMethod, GrpcStreamMethod } from '@nestjs/microservices';
import { ExpansionServiceUpload } from './expansion.service.upload';
import { createLogger } from '@app/utils/logger';
import { Observable } from 'rxjs';
import { FileChunk, UploadResponse } from '@app/protos/expansion';
import { LoggingInterceptor } from '@app/interceptors/logging.interceptor';

const logger = createLogger({ scope: 'ExpansionController', time: true });

@Controller()
@UseInterceptors(LoggingInterceptor) // 使用日志拦截器记录请求和响应
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

    // 处理客户端发送的分片文件
    // 客户端使用ReplaySubject将文件分成多个块发送
    // 服务端需要接收这些块并重新组合成完整文件

    const fileChunks = new Map<number, Buffer>();
    let filename = '';
    let totalChunks = 0;
    let fileId = '';

    // 订阅客户端发送的文件块流
    data.chunks$.subscribe({
      next: (chunk: {
        content: Buffer;
        filename: string;
        chunkIndex: number;
        totalChunks: number;
        siteId: string;
      }) => {
        // 保存每个文件块
        fileChunks.set(chunk.chunkIndex, chunk.content);
        filename = chunk.filename;
        totalChunks = chunk.totalChunks;
        fileId = chunk.siteId;

        logger.info(`接收文件块 ${chunk.chunkIndex + 1}/${chunk.totalChunks}`);
      },
      complete: async () => {
        logger.info(`文件 ${filename} 的所有块接收完成，开始合并`);

        // 检查是否收到了所有块
        if (fileChunks.size !== totalChunks) {
          logger.error(`文件块不完整: 收到 ${fileChunks.size}/${totalChunks}`);
          return { success: false, message: '文件传输不完整' };
        }

        // 按顺序合并所有块
        const buffers: Buffer[] = [];
        for (let i = 0; i < totalChunks; i++) {
          const chunk = fileChunks.get(i);
          if (chunk) {
            buffers.push(chunk);
          }
        }
        // 合并成完整的文件
        const completeFile = Buffer.concat(buffers as Uint8Array[]);

        // 调用上传服务处理完整文件
        return await this.uploadService.uploadZip(
          {
            buffer: completeFile,
            originalname: filename,
          },
          fileId,
        );
      },
      error: (err) => {
        logger.error('文件上传流处理错误', err);
        return { success: false, message: '文件上传失败' };
      },
    });

    return { success: true, message: '文件上传处理中' };
  }

  /**
   * 流式上传大文件 - 将文件分割成多个小块进行传输
   * @param {Observable<any>} fileChunks - 文件块流
   * @return {Promise<any>} 上传结果
   * @memberof ExpansionController
   */
  @GrpcStreamMethod('ExpansionService', 'uploadZipFileStream')
  public async uploadZipFileStream(
    fileChunks: Observable<FileChunk>,
  ): Promise<UploadResponse> {
    logger.info('开始接收文件流');

    return new Promise<UploadResponse>((resolve) => {
      const chunks = new Map<number, Buffer>();
      let filename = '';
      let totalChunks = 0;
      let siteId = '';

      // 订阅客户端发送的文件块流
      fileChunks.subscribe({
        next: (chunk) => {
          // 保存每个文件块
          chunks.set(chunk.chunkIndex, Buffer.from(chunk.content));
          filename = chunk.filename;
          totalChunks = chunk.totalChunks;
          siteId = chunk.siteId;

          logger.info(`接收文件块 ${chunk.chunkIndex + 1}/${totalChunks}`);
        },
        complete: async () => {
          logger.info(`文件 ${filename} 的所有块接收完成，开始合并`);

          // 检查是否收到了所有块
          if (chunks.size !== totalChunks) {
            logger.error(`文件块不完整: 收到 ${chunks.size}/${totalChunks}`);
            resolve({
              success: false,
              message: '文件传输不完整',
              fileUrl: '',
              fileId: '',
            });
            return;
          }

          try {
            // 按顺序合并所有块
            const buffers: Uint8Array[] = [];
            for (let i = 0; i < totalChunks; i++) {
              const chunk = chunks.get(i);
              if (!chunk) {
                throw new Error(`缺少文件块 ${i}`);
              }
              buffers.push(new Uint8Array(chunk.buffer.slice(0)));
            }

            // 合并成完整的文件
            const completeFile = Buffer.concat(buffers);

            const result = await this.uploadService.uploadZip(
              {
                buffer: completeFile,
                originalname: filename,
              },
              siteId,
            );

            resolve({
              success: true,
              message: result.msg || '上传成功',
              fileUrl: '',
              fileId: siteId,
            });
          } catch (error) {
            logger.error('文件处理错误', error);
            resolve({
              success: false,
              message: `文件处理失败: ${error.message}`,
              fileUrl: '',
              fileId: '',
            });
          }
        },
        error: (err) => {
          logger.error('文件上传流处理错误', err);
          resolve({
            success: false,
            message: `文件上传失败: ${err.message}`,
            fileUrl: '',
            fileId: '',
          });
        },
      });
    });
  }
}
