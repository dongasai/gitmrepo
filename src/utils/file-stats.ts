import * as fs from 'fs';
import * as path from 'path';

/**
 * 递归统计目录中的文件数量和总大小
 * 排除 .git 目录
 */
export function countFilesAndSize(dirPath: string): { count: number; size: number; formatted: string } {
  let fileCount = 0;
  let totalSize = 0;

  function walkDirectory(currentPath: string): void {
    if (!fs.existsSync(currentPath)) {
      return;
    }

    const items = fs.readdirSync(currentPath);

    for (const item of items) {
      // 排除 .git 目录
      if (item === '.git') {
        continue;
      }

      const itemPath = path.join(currentPath, item);
      const stats = fs.statSync(itemPath);

      if (stats.isDirectory()) {
        walkDirectory(itemPath);
      } else if (stats.isFile()) {
        fileCount++;
        totalSize += stats.size;
      }
    }
  }

  walkDirectory(dirPath);

  // 格式化大小
  const formatted = formatSize(totalSize);

  return {
    count: fileCount,
    size: totalSize,
    formatted,
  };
}

/**
 * 格式化文件大小（字节转换为 KB/MB/GB）
 */
function formatSize(bytes: number): string {
  if (bytes === 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);

  // 保留两位小数
  return `${size.toFixed(2)} ${units[i]}`;
}