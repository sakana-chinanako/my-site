import fs from 'fs';
import path from 'path';

const SUPPORTED_VERSIONS = [1];

/**
 * 加载文件索引
 * @returns {FileIndex | null}
 */
export function loadIndex() {
  try {
    const ip = path.join(process.cwd(), 'public', 'file-index.json');
    if (!fs.existsSync(ip)) return null;
    const data = JSON.parse(fs.readFileSync(ip, 'utf-8'));
    if (data.version && !SUPPORTED_VERSIONS.includes(data.version)) {
      console.error('❌ 索引版本不兼容: 当前 v' + data.version + '，支持: v' + SUPPORTED_VERSIONS.join(', v'));
      return null;
    }
    return data;
  } catch (e) {
    console.error('读取索引失败:', e.message);
    return null;
  }
}
