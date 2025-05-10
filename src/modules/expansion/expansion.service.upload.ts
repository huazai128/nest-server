import { Injectable } from '@nestjs/common';
import { resolve, relative, join, dirname } from 'path';
import { createWriteStream, ensureDirSync } from 'fs-extra';
import * as AdmZip from 'adm-zip';
import { Readable } from 'stream';
import { Observable } from 'rxjs';
import { Cron } from '@nestjs/schedule';
import { removeFilesExceptLatest3 } from '@app/utils/clean-old-files';

@Injectable()
export class ExpansionServiceUpload {
  // 上传文件存放目录
  private UPLOAD_DIR: string = resolve(process.cwd(), 'public', 'sourcemap');

  /**
   * 上传 zip 文件
   * @param {*} file
   * @param {string} siteId
   * @memberof ExpansionServiceUpload
   */
  public async uploadZip(file, siteId: string) {
    if (!siteId) {
      throw 'Invalid siteId: siteId is required';
    }

    // 获取文件的后缀
    const fileName = file.originalname;
    const fileExt = fileName.split('.').pop().toLowerCase();
    if (fileExt !== 'zip') {
      throw 'Invalid file format. Only .zip file allowed.';
    }
    const path = `${this.UPLOAD_DIR}/${siteId}`;

    // 直接使用file数据（Uint8Array）创建AdmZip实例
    const zip = new AdmZip(Buffer.from(file.buffer));
    const zipEntries = zip.getEntries();

    // Ensure the directory exists
    ensureDirSync(path);

    for (const zipEntry of zipEntries) {
      if (zipEntry.isDirectory) {
        continue;
      }
      const fileRelativePath = relative('./', zipEntry.entryName);
      const unzipFilePath = join(path, fileRelativePath);

      // Ensure parent directory exists for each file
      ensureDirSync(dirname(unzipFilePath));

      const fileStream = Readable.from(zipEntry.getData());
      const writeStream = createWriteStream(unzipFilePath);
      fileStream.pipe(writeStream);
      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
    }

    // 不再需要删除临时文件，因为没有创建临时文件
    return { msg: '上传成功' };
  }

  uploadZipStream(fileChunks: Observable<any>) {
    return new Observable((observer) => {
      fileChunks.subscribe({
        next: (chunk) => observer.next(chunk),
      });
    });
  }

  /**
   * 清理过期文件
   * @memberof ExpansionServiceUpload
   */
  @Cron('0 0 * * *')
  public async cleanOldFiles() {
    const expansionPath = join(process.cwd(), 'public/expansion');
    try {
      await removeFilesExceptLatest3(expansionPath);
    } catch (error) {
      console.error('Failed to clean old files:', error);
    }
  }
}
