import { Injectable } from '@nestjs/common';
import { resolve, relative, join } from 'path';
import { existsSync, mkdirSync, createWriteStream, unlinkSync } from 'fs-extra';
import AdmZip from 'adm-zip';
import { Readable } from 'stream';
import { Observable } from 'rxjs';
@Injectable()
export class ExpansionServiceUpload {
  // 上传文件存放目录
  private UPLOAD_DIR: string = resolve(
    __dirname,
    '../../../public',
    'sourcemap',
  );

  /**
   * 上传
   * @param {*} file
   * @param {string} siteId
   * @memberof ExpansionServiceUpload
   */
  public async uploadZip(file, siteId: string) {
    // 获取文件的后缀
    const tempFilePath = file.path;
    const fileName = file.originalname;
    const fileExt = fileName.split('.').pop().toLowerCase();
    if (fileExt !== 'zip') {
      throw 'Invalid file format. Only .zip file allowed.';
    }
    const path = `${this.UPLOAD_DIR}/${siteId}`;
    const zip = new AdmZip(tempFilePath);
    const zipEntries = zip.getEntries();

    if (!existsSync(path)) {
      mkdirSync(path);
    }
    for (const zipEntry of zipEntries) {
      if (zipEntry.isDirectory) {
        continue;
      }
      const fileRelativePath = relative('./', zipEntry.entryName);
      const unzipFilePath = join(path, fileRelativePath);
      const fileStream = Readable.from(zipEntry.getData());
      const writeStream = createWriteStream(unzipFilePath);
      fileStream.pipe(writeStream);
      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
    }
    unlinkSync(tempFilePath);
    return { msg: '上传成功' };
  }

  uploadZipStream(fileChunks: Observable<any>) {
    return new Observable((observer) => {
      fileChunks.subscribe({
        next: (chunk) => observer.next(chunk),
      });
    });
  }
}
