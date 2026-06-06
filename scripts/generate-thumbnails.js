import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imagesDir = path.join(__dirname, '..', 'public', 'images');
const thumbDir = path.join(__dirname, '..', 'public', 'thumbnails');

const ALLOWED_IMG_EXT = ['.jpg','.jpeg','.png','.gif','.webp','.svg','.bmp'];
const THUMB_WIDTH = 400;

async function scanAndGenerate(dir, basePath = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const fp = path.join(dir, e.name);
    const rp = basePath ? basePath + '/' + e.name : e.name;
    if (e.isDirectory()) {
      await scanAndGenerate(fp, rp);
    } else {
      const ext = path.extname(e.name).toLowerCase();
      if (!ALLOWED_IMG_EXT.includes(ext)) continue;
      const outPath = path.join(thumbDir, rp.replace(new RegExp(ext.replace(/./g, '\.') + '$', 'i'), '.webp'));
      const outDir = path.dirname(outPath);
      if (fs.existsSync(outPath)) {
        const srcStat = fs.statSync(fp);
        const thumbStat = fs.statSync(outPath);
        if (srcStat.mtimeMs <= thumbStat.mtimeMs) continue;
      }
      try {
        fs.mkdirSync(outDir, { recursive: true });
        await sharp(fp)
          .resize(THUMB_WIDTH)
          .webp({ quality: 80 })
          .toFile(outPath);
        console.log('🖼️ 缩略图:', rp);
      } catch (err) {
        console.warn('⚠️ 缩略图失败:', rp, err.message);
      }
    }
  }
}

(async () => {
  console.log('🔍 生成缩略图...');
  if (!fs.existsSync(imagesDir)) {
    console.log('⚠️ 无图片目录，跳过');
    process.exit(0);
  }
  await scanAndGenerate(imagesDir);
  console.log('✅ 缩略图生成完成');
})();
