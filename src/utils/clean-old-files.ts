import * as fs from 'fs';
import * as path from 'path';

/**
 * 清除指定目录下最新3个以外的文件
 * @param dir 目录路径
 */
export async function removeFilesExceptLatest3(dir: string): Promise<void> {
  try {
    const files = await fs.promises.readdir(dir);
    const fileStats = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(dir, file);
        const stat = await fs.promises.stat(filePath);
        return { filePath, mtime: stat.mtime };
      }),
    );

    // 按修改时间降序排列，保留最新3个
    const filesToDelete = fileStats
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
      .slice(3);

    for (const { filePath } of filesToDelete) {
      await fs.promises.unlink(filePath);
      console.log(`Deleted: ${filePath}`);
    }
  } catch (err) {
    console.error('removeFilesExceptLatest3 error:', err);
  }
}

// 示例：每小时清理一次
// import cron from 'node-cron';
// cron.schedule('0 * * * *', () => cleanOldFiles('/your/target/dir'));
