import fs from 'fs';
import path from 'path';

export function loadIndex() {
  try {
    const ip = path.join(process.cwd(), 'public', 'file-index.json');
    if (!fs.existsSync(ip)) return null;
    const data = JSON.parse(fs.readFileSync(ip, 'utf-8'));
    if (data.version && data.version !== 1) {
      console.warn('⚠️ 索引版本不兼容');
    }
    return data;
  } catch (e) {
    console.error('读取索引失败:', e.message);
    return null;
  }
}
